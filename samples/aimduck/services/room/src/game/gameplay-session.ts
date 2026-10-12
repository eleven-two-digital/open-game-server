// SPDX-License-Identifier: Apache-2.0

import type { ClientMessage, RoomSnapshot, ServerMessage } from "@aimduck/shared/messages";
import type { Clock } from "@aimduck/shared";
import { log } from "@aimduck/shared/logging";
import { GameRoom } from "./game-room.js";
import { AIMDUCK_TUNING } from "./tuning.js";
import { ArenaSimulation, type ArenaEvent } from "../simulation/arena.js";
import type { RoomSocketSession } from "../transport/websocket.js";

export type SendRoomMessage = (message: ServerMessage) => Promise<void>;

type SnapshotMessageType =
  | "lobby.updated"
  | "match.started"
  | "round.updated"
  | "round.completed"
  | "match.completed";

type ConnectedPlayer = {
  session: RoomSocketSession;
  send: SendRoomMessage;
  lastClientSequence: number;
  lastInputAt: number;
};

export class GameplaySession {
  readonly room: GameRoom;
  private readonly clients = new Map<string, ConnectedPlayer>();
  private arena: ArenaSimulation | null = null;
  private activeRoundNumber: number | null = null;
  private lastTransition: string | null = null;
  private snapshotCounter = 0;
  private serverSequence = 0;
  private lastSnapshotAt = 0;
  private readonly startedAt: number;

  constructor(
    roomId: string,
    private readonly clock: Clock,
  ) {
    this.room = new GameRoom(roomId, clock);
    this.startedAt = clock.now();
  }

  connect(session: RoomSocketSession, send: SendRoomMessage): void {
    this.room.connectPlayer(session.playerId);
    this.clients.set(session.playerId, {
      session,
      send,
      lastClientSequence: 0,
      lastInputAt: Number.NEGATIVE_INFINITY,
    });
    this.broadcast("lobby.updated");
    this.sendSnapshotTo(session.playerId);
  }

  disconnect(session: RoomSocketSession): void {
    const connected = this.clients.get(session.playerId);
    if (connected?.session.ticketId !== session.ticketId) {
      return;
    }
    this.clients.delete(session.playerId);
    this.room.disconnectPlayer(session.playerId);
    this.broadcast("lobby.updated");
  }

  get connectedPlayers(): number {
    return this.clients.size;
  }

  get connectedPlayerIds(): string[] {
    return [...this.clients.keys()];
  }

  handleMessage(session: RoomSocketSession, message: ClientMessage): void {
    const connected = this.clients.get(session.playerId);
    if (connected === undefined || connected.session.ticketId !== session.ticketId) {
      throw new Error("Gameplay connection is not bound to an active admission.");
    }
    if (message.sequence <= connected.lastClientSequence) {
      throw new Error("Gameplay message sequence must increase.");
    }
    connected.lastClientSequence = message.sequence;

    if (message.type === "player.ready") {
      this.room.setReady(session.playerId, message.payload.ready);
      this.broadcast("lobby.updated");
      this.emitTransitions();
      return;
    }
    if (this.arena === null) {
      throw new Error("Player input is only accepted during an active round.");
    }
    const now = this.clock.now();
    if (now - connected.lastInputAt < 1_000 / AIMDUCK_TUNING.inputRateHz - 1) {
      throw new Error("Player input rate exceeds the room limit.");
    }
    connected.lastInputAt = now;
    this.arena.setInput(session.playerId, message.payload);
  }

  tick(): void {
    this.snapshotCounter += 1;
    this.room.tick();
    this.emitTransitions();
    const round = this.room.getSnapshot().round;
    if (round?.phase === "active" && this.arena !== null) {
      const events = this.arena.step(1_000 / AIMDUCK_TUNING.simulationHz);
      this.applyArenaEvents(events);
    }
    const now = this.clock.now();
    if (now - this.lastSnapshotAt >= 1_000 / AIMDUCK_TUNING.snapshotHz) {
      this.lastSnapshotAt = now;
      this.broadcast("round.updated");
    }
  }

  private emitTransitions(): void {
    const snapshot = this.room.getSnapshot();
    const round = snapshot.round;
    if (round === null) {
      return;
    }
    const transition = `${round.number}:${round.phase}:${snapshot.phase}`;
    if (transition === this.lastTransition) {
      return;
    }
    this.lastTransition = transition;
    if (round.number !== this.activeRoundNumber || round.phase === "active") {
      this.activeRoundNumber = round.number;
      this.arena = round.phase === "active" ? this.createArena(round) : null;
    }
    if (round.number === 1 && round.phase === "countdown") {
      this.broadcast("match.started");
    } else if (round.phase === "countdown" || round.phase === "active") {
      this.broadcast("round.updated");
    }
    if (round.phase === "results") {
      this.arena = null;
      this.broadcast("round.completed");
    }
    if (snapshot.phase === "complete") {
      this.broadcast("match.completed");
    }
  }

  private createArena(round: NonNullable<ReturnType<GameRoom["getSnapshot"]>["round"]>) {
    const snapshot = this.room.getSnapshot();
    const players = snapshot.sessions.map((player) => ({
      playerId: player.playerId,
      role: player.role ?? "duck",
      position:
        player.playerId === round.shooterId
          ? { x: 500, y: 100 }
          : {
              x: 70,
              y: 55 + player.seatNumber * 67,
            },
    }));
    return new ArenaSimulation(players);
  }

  private applyArenaEvents(events: ArenaEvent[]): void {
    for (const event of events) {
      if (event.type === "duck.crossed") {
        this.room.recordOutcome(event.playerId, "crossed");
      } else if (event.type === "duck.hit") {
        this.room.recordOutcome(event.playerId, "hit");
      }
      this.broadcast("round.updated", event);
    }
    this.emitTransitions();
  }

  private createSnapshot(playerId: string): RoomSnapshot {
    const game = this.room.getSnapshot();
    const others = game.sessions
      .filter((player) => player.playerId !== playerId)
      .map((player) => ({ ...player }));
    const arena = this.arena;
    return {
      server: {
        roomId: game.roomId,
        uptimeMs: this.clock.now() - this.startedAt,
        tick: this.snapshotCounter,
        revision: game.revision,
      },
      game: {
        phase: game.phase,
        seats: game.seats,
        round: game.round,
        scoreboard: game.scoreboard,
        revision: game.revision,
      },
      me: this.room.getSession(playerId),
      others,
      arena: {
        players: game.sessions.map((player) => arena?.getPlayer(player.playerId) ?? null),
        projectiles: arena?.getProjectiles() ?? [],
      },
    };
  }

  private sendSnapshotTo(playerId: string): void {
    const client = this.clients.get(playerId);
    if (client !== undefined) {
      void this.deliver(client, {
        version: 1,
        type: "room.snapshot",
        sequence: this.serverSequence++,
        payload: this.createSnapshot(playerId),
      });
    }
  }

  private broadcast(type: SnapshotMessageType, event?: ArenaEvent): void {
    for (const client of this.clients.values()) {
      const sequence = this.serverSequence++;
      const payload = this.createSnapshot(client.session.playerId);
      let message: ServerMessage;
      switch (type) {
        case "lobby.updated":
          message = { version: 1, type, sequence, payload };
          break;
        case "match.started":
          message = { version: 1, type, sequence, payload };
          break;
        case "round.updated":
          message = {
            version: 1,
            type,
            sequence,
            payload: event === undefined ? payload : { ...payload, event },
          };
          break;
        case "round.completed":
          message = { version: 1, type, sequence, payload };
          break;
        case "match.completed":
          message = { version: 1, type, sequence, payload };
          break;
      }
      void this.deliver(client, message);
    }
  }

  private async deliver(client: ConnectedPlayer, message: ServerMessage): Promise<void> {
    try {
      await client.send(message);
    } catch (error) {
      log("warn", "room_gameplay_send_failed", {
        roomId: client.session.roomId,
        playerId: client.session.playerId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
      this.disconnect(client.session);
    }
  }
}

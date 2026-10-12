// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  clientMessageSchema,
  serverMessageSchema,
  type ServerMessage,
} from "@aimduck/shared/messages";
import { GameplaySession } from "../../services/room/src/game/gameplay-session.js";
import type { RoomSocketSession } from "../../services/room/src/transport/websocket.js";

describe("GameplaySession", () => {
  it("sends per-player snapshots and monotonically increasing room revisions", () => {
    let now = 1_000;
    const gameplay = new GameplaySession("aimduck-room-1", { now: () => now });
    const received = new Map<string, ServerMessage[]>();

    for (let index = 0; index < 8; index += 1) {
      const playerId = `player-${index}`;
      const session: RoomSocketSession = {
        playerId,
        displayName: `Player ${index}`,
        roomId: "aimduck-room-1",
        ticketId: `ticket-${index}`,
      };
      const messages: ServerMessage[] = [];
      received.set(playerId, messages);
      gameplay.room.reservePlayer({ playerId, displayName: session.displayName });
      gameplay.connect(session, async (message) => {
        messages.push(serverMessageSchema.parse(message));
      });
    }

    for (let index = 0; index < 8; index += 1) {
      const playerId = `player-${index}`;
      const session: RoomSocketSession = {
        playerId,
        displayName: `Player ${index}`,
        roomId: "aimduck-room-1",
        ticketId: `ticket-${index}`,
      };
      gameplay.handleMessage(session, {
        version: 1,
        type: "player.ready",
        sequence: 1,
        payload: { ready: true },
      });
    }

    const firstPlayerMessages = received.get("player-0") ?? [];
    const snapshot = [...firstPlayerMessages]
      .reverse()
      .find(
        (message): message is Extract<ServerMessage, { type: "lobby.updated" }> =>
          message.type === "lobby.updated",
      );
    expect(snapshot?.payload.me).toMatchObject({ playerId: "player-0" });
    expect(snapshot?.payload.others).toHaveLength(7);
    expect(snapshot?.payload.server).toMatchObject({
      roomId: "aimduck-room-1",
      tick: expect.any(Number),
    });
    expect(snapshot?.payload.server).not.toHaveProperty("phase");
    expect(snapshot?.payload.game).not.toHaveProperty("sessions");
    const otherPlayerMessages = received.get("player-1") ?? [];
    const otherSnapshot = [...otherPlayerMessages]
      .reverse()
      .find(
        (message): message is Extract<ServerMessage, { type: "lobby.updated" }> =>
          message.type === "lobby.updated",
      );
    expect(otherSnapshot?.payload.game).toEqual(snapshot?.payload.game);
    expect(otherSnapshot?.payload.server).toEqual(snapshot?.payload.server);
    expect(otherSnapshot?.payload.me).toMatchObject({ playerId: "player-1" });
    expect(snapshot?.payload.others).toHaveLength(7);
    expect(otherSnapshot?.payload.others).toHaveLength(7);
    expect(otherSnapshot?.payload.others).toEqual(
      expect.arrayContaining([expect.objectContaining({ playerId: "player-0" })]),
    );
    expect(snapshot?.payload.others).not.toEqual(otherSnapshot?.payload.others);
    expect(JSON.stringify(snapshot?.payload)).not.toMatch(
      /accessToken|joinTicket|ticketId|privateKey|sessionKey/i,
    );
    const sequences = firstPlayerMessages.map((message) => message.sequence);
    expect(sequences).toEqual([...sequences].sort((left, right) => left - right));

    now += 3_000;
    gameplay.tick();
    expect(
      firstPlayerMessages.filter((message) => message.type === "round.updated").length,
    ).toBeGreaterThan(0);
  });

  it("accepts only explicit recipient snapshot groups and rejects misplaced or unknown state", () => {
    const validMessage = {
      version: 1,
      type: "room.snapshot",
      sequence: 0,
      payload: {
        server: { roomId: "room-1", uptimeMs: 0, tick: 0, revision: 0 },
        game: {
          phase: "lobby",
          seats: [],
          round: null,
          scoreboard: { scores: {}, winners: [] },
          revision: 0,
        },
        me: null,
        others: [],
        arena: { players: [], projectiles: [] },
      },
    };

    expect(serverMessageSchema.safeParse(validMessage).success).toBe(true);
    expect(
      serverMessageSchema.safeParse({
        ...validMessage,
        payload: {
          ...validMessage.payload,
          game: { ...validMessage.payload.game, sessions: [] },
        },
      }).success,
    ).toBe(false);
    expect(
      serverMessageSchema.safeParse({
        ...validMessage,
        payload: {
          ...validMessage.payload,
          server: { ...validMessage.payload.server, phase: "active" },
        },
      }).success,
    ).toBe(false);
    expect(
      serverMessageSchema.safeParse({
        ...validMessage,
        payload: {
          ...validMessage.payload,
          me: { playerId: "player-1", accessToken: "not-a-game-field" },
        },
      }).success,
    ).toBe(false);
    expect(
      serverMessageSchema.safeParse({
        ...validMessage,
        type: "round.updated",
        payload: {
          ...validMessage.payload,
          event: { type: "duck.hit", playerId: "player-2" },
        },
      }).success,
    ).toBe(true);
    expect(
      serverMessageSchema.safeParse({
        version: 1,
        type: "room.error",
        sequence: 1,
        payload: {
          error: {
            code: "invalid_message",
            message: "The message was invalid.",
            retryable: false,
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects client messages that attempt to declare hits or scores", () => {
    const input = {
      version: 1,
      type: "player.input",
      sequence: 1,
      payload: {
        move_x: 0,
        move_y: 0,
        throw: false,
        aim_x: 0.75,
        aim_y: 0.5,
      },
    };
    for (const forgedFields of [{ outcome: "hit" }, { score: 100 }, { collision: true }]) {
      expect(
        clientMessageSchema.safeParse({
          ...input,
          payload: { ...input.payload, ...forgedFields },
        }).success,
      ).toBe(false);
    }
    expect(
      clientMessageSchema.safeParse({
        version: 1,
        type: "player.score",
        sequence: 1,
        payload: { score: 100 },
      }).success,
    ).toBe(false);
  });

  it("completes three deterministic eight-player matches with consistent results", () => {
    for (let matchNumber = 1; matchNumber <= 3; matchNumber += 1) {
      let now = 1_000;
      const roomId = `aimduck-match-${matchNumber}`;
      const gameplay = new GameplaySession(roomId, { now: () => now });
      const sessions: RoomSocketSession[] = [];
      const received = new Map<string, ServerMessage[]>();
      const clientSequences = new Map<string, number>();

      for (let index = 0; index < 8; index += 1) {
        const playerId = `match-${matchNumber}-player-${index}`;
        const session: RoomSocketSession = {
          playerId,
          displayName: `Match ${matchNumber} Player ${index}`,
          roomId,
          ticketId: `match-${matchNumber}-ticket-${index}`,
        };
        sessions.push(session);
        received.set(playerId, []);
        clientSequences.set(playerId, 0);
        gameplay.room.reservePlayer({ playerId, displayName: session.displayName });
        gameplay.connect(session, async (message) => {
          received.get(playerId)?.push(serverMessageSchema.parse(message));
        });
      }

      for (const session of sessions) {
        const sequence = (clientSequences.get(session.playerId) ?? 0) + 1;
        clientSequences.set(session.playerId, sequence);
        gameplay.handleMessage(session, {
          version: 1,
          type: "player.ready",
          sequence,
          payload: { ready: true },
        });
      }

      const shooterOrder: string[] = [];
      for (let roundNumber = 1; roundNumber <= 8; roundNumber += 1) {
        const countdown = gameplay.room.getSnapshot().round;
        expect(countdown).toMatchObject({ number: roundNumber, phase: "countdown" });
        if (countdown === null) {
          throw new Error(`Match ${matchNumber} did not start round ${roundNumber}.`);
        }
        shooterOrder.push(countdown.shooterId);

        now = countdown.countdownEndsAt ?? now;
        gameplay.tick();
        const activeRound = gameplay.room.getSnapshot().round;
        expect(activeRound?.phase).toBe("active");
        if (activeRound === null) {
          throw new Error(`Match ${matchNumber} lost round ${roundNumber}.`);
        }

        for (const playerId of Object.keys(activeRound.duckOutcomes)) {
          const session = sessions.find((candidate) => candidate.playerId === playerId);
          if (session === undefined) {
            throw new Error(`Duck ${playerId} has no connected client.`);
          }
          const sequence = (clientSequences.get(playerId) ?? 0) + 1;
          clientSequences.set(playerId, sequence);
          gameplay.handleMessage(session, {
            version: 1,
            type: "player.input",
            sequence,
            payload: {
              move_x: 1,
              move_y: 0,
              throw: false,
              aim_x: 0.75,
              aim_y: 0.5,
            },
          });
        }

        for (
          let step = 0;
          step < 200 && gameplay.room.getSnapshot().round?.phase === "active";
          step += 1
        ) {
          now += 1_000 / 30;
          gameplay.tick();
        }

        const result = gameplay.room.getSnapshot();
        expect(result.round).toMatchObject({
          number: roundNumber,
          phase: "results",
          shooterId: shooterOrder[roundNumber - 1],
        });
        expect(Object.values(result.round?.duckOutcomes ?? {})).toEqual(
          Array.from({ length: 7 }, () => "crossed"),
        );
        if (roundNumber < 8) {
          now = result.round?.intermissionEndsAt ?? now;
          gameplay.tick();
        }
      }

      const completed = gameplay.room.getSnapshot();
      expect(completed.phase).toBe("complete");
      expect(gameplay.connectedPlayers).toBe(8);
      expect(shooterOrder).toEqual(sessions.map((session) => session.playerId));
      expect(completed.scoreboard.scores).toEqual(
        Object.fromEntries(sessions.map((session) => [session.playerId, 7])),
      );
      expect(completed.scoreboard.winners).toEqual(sessions.map((session) => session.playerId));
      const completedGameProjection = {
        phase: completed.phase,
        seats: completed.seats,
        round: completed.round,
        scoreboard: completed.scoreboard,
        revision: completed.revision,
      };

      for (const session of sessions) {
        const messages = received.get(session.playerId) ?? [];
        const serverSequences = messages.map((message) => message.sequence);
        expect(serverSequences).toEqual([...serverSequences].sort((left, right) => left - right));
        expect(new Set(serverSequences).size).toBe(serverSequences.length);
        expect(messages.filter((message) => message.type === "round.completed")).toHaveLength(8);
        const completion = [...messages]
          .reverse()
          .find(
            (message): message is Extract<ServerMessage, { type: "match.completed" }> =>
              message.type === "match.completed",
          );
        expect(completion?.payload.game).toEqual(completedGameProjection);
        expect(completion?.payload.me).toMatchObject({ playerId: session.playerId });
        expect(completion?.payload.others).toHaveLength(7);
      }
    }
  });

  it("preserves a reconnected player when a stale socket disconnects later", () => {
    let now = 1_000;
    const gameplay = new GameplaySession("aimduck-room-1", { now: () => now });
    const firstSession: RoomSocketSession = {
      playerId: "player-1",
      displayName: "Player One",
      roomId: "aimduck-room-1",
      ticketId: "ticket-old",
    };
    gameplay.room.reservePlayer({
      playerId: firstSession.playerId,
      displayName: firstSession.displayName,
    });
    gameplay.connect(firstSession, async () => {});
    gameplay.disconnect(firstSession);

    now += 1_000;
    gameplay.room.reservePlayer({
      playerId: firstSession.playerId,
      displayName: firstSession.displayName,
    });
    const reconnectedSession = { ...firstSession, ticketId: "ticket-new" };
    gameplay.connect(reconnectedSession, async () => {});

    gameplay.disconnect(firstSession);

    expect(gameplay.connectedPlayers).toBe(1);
    expect(gameplay.room.getSession(firstSession.playerId)?.connected).toBe(true);
    expect(gameplay.room.getSnapshot().seats[0]).toMatchObject({
      playerId: firstSession.playerId,
      connected: true,
      ready: false,
    });
  });

  it("resets client sequence and snapshots current identity state on reconnect", () => {
    let now = 1_000;
    const gameplay = new GameplaySession("aimduck-room-1", { now: () => now });
    const sent: ServerMessage[] = [];
    const firstSession: RoomSocketSession = {
      playerId: "player-1",
      displayName: "Player One",
      roomId: "aimduck-room-1",
      ticketId: "ticket-old",
    };
    gameplay.room.reservePlayer({
      playerId: firstSession.playerId,
      displayName: firstSession.displayName,
    });
    gameplay.connect(firstSession, async (message) => {
      sent.push(serverMessageSchema.parse(message));
    });
    gameplay.handleMessage(firstSession, {
      version: 1,
      type: "player.ready",
      sequence: 1,
      payload: { ready: true },
    });
    gameplay.disconnect(firstSession);

    now += 1_000;
    gameplay.room.reservePlayer({
      playerId: firstSession.playerId,
      displayName: firstSession.displayName,
    });
    const reconnectedSession = { ...firstSession, ticketId: "ticket-new" };
    gameplay.connect(reconnectedSession, async (message) => {
      sent.push(serverMessageSchema.parse(message));
    });
    gameplay.handleMessage(reconnectedSession, {
      version: 1,
      type: "player.ready",
      sequence: 1,
      payload: { ready: true },
    });

    expect(sent.filter((message) => message.type === "room.snapshot")).toHaveLength(2);
    expect(gameplay.room.getSession(firstSession.playerId)).toMatchObject({
      connected: true,
      role: null,
    });
  });
});

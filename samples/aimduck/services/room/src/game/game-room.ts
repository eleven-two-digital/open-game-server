// SPDX-License-Identifier: Apache-2.0

import type {
  DuckOutcome,
  GameRoomSnapshot,
  LobbySeat,
  MatchRound,
  PlayerSession,
} from "@aimduck/shared";
import type { Clock } from "@aimduck/shared";
import { Scoreboard } from "./scoreboard.js";
import { DEFAULT_GAME_TUNING, type AimduckTuning } from "./tuning.js";

export class GameRoom {
  private readonly seats: LobbySeat[];
  private readonly sessions = new Map<string, PlayerSession>();
  private readonly pendingAdmissions = new Map<string, number>();
  private readonly expiredReservations = new Set<string>();
  private phase: GameRoomSnapshot["phase"] = "lobby";
  private currentRound: MatchRound | null = null;
  private scoreboard: Scoreboard | null = null;
  private revision = 0;
  private nextRoundAt: number | null = null;
  private readonly tuning: AimduckTuning;

  constructor(
    readonly roomId: string,
    private readonly clock: Clock,
    tuning: Partial<AimduckTuning> = {},
  ) {
    this.tuning = { ...DEFAULT_GAME_TUNING, ...tuning };
    this.seats = Array.from({ length: 8 }, (_, seatNumber) => ({
      seatNumber,
      playerId: null,
      displayName: null,
      ready: false,
      connected: false,
      reservationDeadline: null,
    }));
  }

  reservePlayer(identity: { playerId: string; displayName: string }): boolean {
    if (!identity.playerId || !identity.displayName) {
      throw new TypeError("A player reservation requires an authenticated identity.");
    }
    this.expireReservations();
    if (this.expiredReservations.has(identity.playerId)) {
      return false;
    }
    const existingSeat = this.seats.find((seat) => seat.playerId === identity.playerId);
    if (existingSeat !== undefined) {
      if (
        this.phase !== "lobby" ||
        existingSeat.connected ||
        existingSeat.reservationDeadline === null ||
        existingSeat.reservationDeadline <= this.clock.now() ||
        this.pendingAdmissions.has(identity.playerId)
      ) {
        return false;
      }
      existingSeat.ready = false;
      this.pendingAdmissions.set(identity.playerId, existingSeat.reservationDeadline);
      this.revise();
      return true;
    }
    if (this.phase !== "lobby") {
      return false;
    }
    const seat = this.seats.find((candidate) => candidate.playerId === null);
    if (seat === undefined) {
      return false;
    }
    seat.playerId = identity.playerId;
    seat.displayName = identity.displayName;
    seat.ready = false;
    seat.connected = false;
    seat.reservationDeadline = this.clock.now() + this.tuning.lobbyReservationMs;
    this.sessions.set(identity.playerId, {
      playerId: identity.playerId,
      seatNumber: seat.seatNumber,
      displayName: identity.displayName,
      role: null,
      connected: false,
      score: 0,
    });
    this.pendingAdmissions.set(identity.playerId, seat.reservationDeadline);
    this.revise();
    return true;
  }

  connectPlayer(playerId: string): void {
    this.expireReservations();
    const seat = this.findSeat(playerId);
    if (!this.pendingAdmissions.has(playerId) || seat === undefined) {
      throw new Error("Player has no pending room admission.");
    }
    seat.connected = true;
    seat.ready = false;
    seat.reservationDeadline = null;
    this.pendingAdmissions.delete(playerId);
    const session = this.requireSession(playerId);
    session.connected = true;
    this.revise();
  }

  disconnectPlayer(playerId: string): void {
    const seat = this.findSeat(playerId);
    if (seat === undefined) {
      return;
    }
    seat.connected = false;
    seat.ready = false;
    this.pendingAdmissions.delete(playerId);
    const session = this.requireSession(playerId);
    session.connected = false;
    if (this.phase === "lobby") {
      seat.reservationDeadline = this.clock.now() + this.tuning.lobbyReservationMs;
    }
    this.revise();
  }

  setReady(playerId: string, ready: boolean): void {
    if (this.phase !== "lobby") {
      throw new Error("Readiness can only change in the lobby.");
    }
    const seat = this.findSeat(playerId);
    if (seat === undefined || !seat.connected) {
      throw new Error("Player does not own a connected seat.");
    }
    seat.ready = ready;
    this.revise();
    if (
      this.seats.length === 8 &&
      this.seats.every(
        (candidate) => candidate.playerId !== null && candidate.connected && candidate.ready,
      )
    ) {
      this.startMatch();
    }
  }

  recordOutcome(playerId: string, outcome: Exclude<DuckOutcome, "running">): void {
    const round = this.currentRound;
    if (this.phase !== "in_progress" || round?.phase !== "active") {
      throw new Error("Duck outcomes can only be recorded during an active round.");
    }
    if (round.duckOutcomes[playerId] !== "running") {
      return;
    }
    if (outcome !== "hit" && outcome !== "crossed") {
      throw new TypeError("Duck outcome is invalid.");
    }
    round.duckOutcomes[playerId] = outcome;
    if (outcome === "hit") {
      this.scoreboard?.awardHit(round.shooterId);
    } else {
      this.scoreboard?.awardCrossing(playerId);
    }
    this.syncScores();
    this.revise();
    if (Object.values(round.duckOutcomes).every((result) => result !== "running")) {
      this.finishRound();
    }
  }

  tick(): void {
    this.expireReservations();
    const round = this.currentRound;
    const now = this.clock.now();
    if (
      this.phase === "in_progress" &&
      round?.phase === "countdown" &&
      this.nextRoundAt !== null &&
      now >= this.nextRoundAt
    ) {
      round.phase = "active";
      round.deadline = now + this.tuning.roundDeadlineMs;
      round.countdownEndsAt = null;
      this.nextRoundAt = null;
      this.revise();
      return;
    }
    if (
      this.phase === "in_progress" &&
      round?.phase === "active" &&
      round.deadline !== null &&
      now >= round.deadline
    ) {
      this.finishRound();
      return;
    }
    if (
      this.phase === "in_progress" &&
      round?.phase === "results" &&
      this.nextRoundAt !== null &&
      now >= this.nextRoundAt
    ) {
      if (round.number === 8) {
        this.phase = "complete";
        this.scoreboard?.finalize();
        this.currentRound = null;
        this.nextRoundAt = null;
        this.revise();
      } else {
        this.startRound(round.number + 1);
      }
    }
  }

  getSnapshot(): GameRoomSnapshot {
    return {
      roomId: this.roomId,
      phase: this.phase,
      seats: this.seats.map((seat) => ({ ...seat })),
      round:
        this.currentRound === null
          ? null
          : {
              ...this.currentRound,
              duckOutcomes: { ...this.currentRound.duckOutcomes },
            },
      sessions: [...this.sessions.values()].map((session) => ({ ...session })),
      scoreboard: this.scoreboard?.snapshot() ?? { scores: {}, winners: [] },
      revision: this.revision,
    };
  }

  getSession(playerId: string): PlayerSession | null {
    const session = this.sessions.get(playerId);
    return session === undefined ? null : { ...session };
  }

  private startMatch(): void {
    const playerIds = this.seats.map((seat) => seat.playerId);
    const players = playerIds.map((playerId) => {
      if (playerId === null) {
        throw new Error("A match requires eight occupied seats.");
      }
      return playerId;
    });
    this.scoreboard = new Scoreboard(players);
    for (const session of this.sessions.values()) {
      session.score = 0;
      session.role = null;
    }
    this.phase = "in_progress";
    this.startRound(1);
  }

  private startRound(number: number): void {
    const shooterSeat = this.seats[number - 1];
    if (shooterSeat?.playerId === null || shooterSeat === undefined) {
      throw new Error("Shooter seat is not occupied.");
    }
    const shooterId = shooterSeat.playerId;
    const duckOutcomes: Record<string, DuckOutcome> = {};
    for (const seat of this.seats) {
      const playerId = seat.playerId;
      if (playerId === null) {
        throw new Error("All seats must stay occupied during a match.");
      }
      const session = this.requireSession(playerId);
      session.role = playerId === shooterId ? "shooter" : "duck";
      if (playerId !== shooterId) {
        duckOutcomes[playerId] = "running";
      }
    }
    this.currentRound = {
      number,
      shooterId,
      duckOutcomes,
      phase: "countdown",
      deadline: null,
      countdownEndsAt: this.clock.now() + this.tuning.roleCountdownMs,
      intermissionEndsAt: null,
    };
    this.nextRoundAt = this.clock.now() + this.tuning.roleCountdownMs;
    this.revise();
  }

  private finishRound(): void {
    const round = this.currentRound;
    if (round === null) {
      throw new Error("There is no active round to finish.");
    }
    round.phase = "results";
    round.deadline = null;
    if (round.number === 8) {
      round.countdownEndsAt = null;
      round.intermissionEndsAt = null;
      this.phase = "complete";
      this.scoreboard?.finalize();
      this.nextRoundAt = null;
    } else {
      this.nextRoundAt = this.clock.now() + this.tuning.resultIntervalMs;
      round.countdownEndsAt = null;
      round.intermissionEndsAt = this.nextRoundAt;
    }
    this.revise();
  }

  private expireReservations(): void {
    if (this.phase !== "lobby") {
      return;
    }
    const now = this.clock.now();
    for (const [playerId, expiresAt] of this.pendingAdmissions) {
      if (expiresAt <= now) {
        this.pendingAdmissions.delete(playerId);
      }
    }
    for (const seat of this.seats) {
      if (
        seat.playerId !== null &&
        !seat.connected &&
        seat.reservationDeadline !== null &&
        seat.reservationDeadline <= now &&
        !this.pendingAdmissions.has(seat.playerId)
      ) {
        this.expiredReservations.add(seat.playerId);
        this.sessions.delete(seat.playerId);
        seat.playerId = null;
        seat.displayName = null;
        seat.ready = false;
        seat.reservationDeadline = null;
        this.revise();
      }
    }
  }

  private findSeat(playerId: string): LobbySeat | undefined {
    return this.seats.find((seat) => seat.playerId === playerId);
  }

  private requireSession(playerId: string): PlayerSession {
    const session = this.sessions.get(playerId);
    if (session === undefined) {
      throw new Error("Player session does not exist.");
    }
    return session;
  }

  private revise(): void {
    this.revision += 1;
  }

  private syncScores(): void {
    for (const [playerId, score] of Object.entries(this.scoreboard?.snapshot().scores ?? {})) {
      const session = this.sessions.get(playerId);
      if (session !== undefined) {
        session.score = score;
      }
    }
  }
}

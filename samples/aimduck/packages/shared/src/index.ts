// SPDX-License-Identifier: Apache-2.0

// OGS identity, discovery, and room-operational contracts.
export type PlayerIdentity = {
  playerId: string;
  displayName: string;
  issuer: string;
  expiresAt: number;
};

export type RoomOperationalState = "active" | "drain";

export type DiscoveryListing = {
  maskedToken: string;
  displayName: string;
  currentPlayers: number;
  maxPlayers: number;
  state: RoomOperationalState;
  tags: string[];
};

export type RoomResolution = {
  roomId: string;
  host: string;
  port: number;
  protocol: "wss";
  path: "/v1/ws";
  joinTicket: string;
  expiresAt: number;
};

// Shared test seams are utilities, not entity contracts.
export type { Clock, RandomSource } from "./testing.js";

// Aimduck lobby and match-domain contracts.
export type GameRoomPhase = "lobby" | "in_progress" | "complete";
export type PlayerRole = "shooter" | "duck";
export type DuckOutcome = "running" | "crossed" | "hit";

export type LobbySeat = {
  seatNumber: number;
  playerId: string | null;
  displayName: string | null;
  ready: boolean;
  connected: boolean;
  reservationDeadline: number | null;
};

export type PlayerSession = {
  playerId: string;
  seatNumber: number;
  displayName: string;
  role: PlayerRole | null;
  connected: boolean;
  score: number;
};

export type MatchRound = {
  number: number;
  shooterId: string;
  duckOutcomes: Record<string, DuckOutcome>;
  phase: "pending" | "countdown" | "active" | "results";
  deadline: number | null;
  countdownEndsAt: number | null;
  intermissionEndsAt: number | null;
};

export type Scoreboard = {
  scores: Record<string, number>;
  winners: string[];
};

export type GameRoomSnapshot = {
  /** Authoritative internal game state; the client receives a separate RoomSnapshot projection. */
  roomId: string;
  phase: GameRoomPhase;
  seats: LobbySeat[];
  round: MatchRound | null;
  sessions: PlayerSession[];
  scoreboard: Scoreboard;
  revision: number;
};

export type PublicErrorCode =
  | "unauthorized"
  | "room_not_found"
  | "room_unavailable"
  | "room_full"
  | "invalid_ticket"
  | "ticket_expired"
  | "identity_mismatch"
  | "invalid_message"
  | "rate_limited"
  | "protocol_error";

export type PublicError = {
  code: PublicErrorCode;
  message: string;
  retryable: boolean;
};

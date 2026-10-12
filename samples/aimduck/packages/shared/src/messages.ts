// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const normalizedAxis = z.number().finite().min(-1).max(1);
const normalizedCoordinate = z.number().finite().min(0).max(1);
const nonNegativeSafeInteger = z.number().int().nonnegative().safe();
const nonNegativeFinite = z.number().finite().nonnegative();
const sequenceNumber = nonNegativeSafeInteger;

const playerReadyPayloadSchema = z.object({ ready: z.boolean() }).strict();
const playerInputPayloadSchema = z
  .object({
    move_x: normalizedAxis,
    move_y: normalizedAxis,
    throw: z.boolean(),
    aim_x: normalizedCoordinate,
    aim_y: normalizedCoordinate,
  })
  .strict();

export const playerReadyMessageSchema = z
  .object({
    version: z.literal(1),
    type: z.literal("player.ready"),
    sequence: z.number().int().positive().safe(),
    payload: playerReadyPayloadSchema,
  })
  .strict();

export const playerInputMessageSchema = z
  .object({
    version: z.literal(1),
    type: z.literal("player.input"),
    sequence: z.number().int().positive().safe(),
    payload: playerInputPayloadSchema,
  })
  .strict();

export const clientMessageSchema = z.discriminatedUnion("type", [
  playerReadyMessageSchema,
  playerInputMessageSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

const lobbySeatSchema = z
  .object({
    seatNumber: z.number().int().nonnegative().safe(),
    playerId: z.string().nullable(),
    displayName: z.string().nullable(),
    ready: z.boolean(),
    connected: z.boolean(),
    reservationDeadline: nonNegativeFinite.nullable(),
  })
  .strict();

const playerSessionSchema = z
  .object({
    playerId: z.string().min(1),
    seatNumber: z.number().int().nonnegative().safe(),
    displayName: z.string().min(1),
    role: z.enum(["shooter", "duck"]).nullable(),
    connected: z.boolean(),
    score: z.number().finite(),
  })
  .strict();

const matchRoundSchema = z
  .object({
    number: z.number().int().positive().safe(),
    shooterId: z.string().min(1),
    duckOutcomes: z.record(z.enum(["running", "crossed", "hit"])),
    phase: z.enum(["pending", "countdown", "active", "results"]),
    deadline: nonNegativeFinite.nullable(),
    countdownEndsAt: nonNegativeFinite.nullable(),
    intermissionEndsAt: nonNegativeFinite.nullable(),
  })
  .strict();

const scoreboardSchema = z
  .object({
    scores: z.record(z.number().finite()),
    winners: z.array(z.string()),
  })
  .strict();

const positionSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict();

const arenaPlayerSnapshotSchema = z
  .object({
    playerId: z.string().min(1),
    role: z.enum(["shooter", "duck"]),
    position: positionSchema,
    outcome: z.enum(["running", "crossed", "hit"]),
  })
  .strict();

const projectileSnapshotSchema = z
  .object({
    ownerId: z.string().min(1),
    position: positionSchema,
  })
  .strict();

const arenaSnapshotSchema = z
  .object({
    players: z.array(arenaPlayerSnapshotSchema.nullable()),
    projectiles: z.array(projectileSnapshotSchema),
  })
  .strict();

const gameSnapshotSchema = z
  .object({
    phase: z.enum(["lobby", "in_progress", "complete"]),
    seats: z.array(lobbySeatSchema),
    round: matchRoundSchema.nullable(),
    scoreboard: scoreboardSchema,
    revision: nonNegativeSafeInteger,
  })
  .strict();

const serverSnapshotSchema = z
  .object({
    roomId: z.string().min(1),
    uptimeMs: nonNegativeFinite,
    tick: nonNegativeSafeInteger,
    revision: nonNegativeSafeInteger,
  })
  .strict();

/**
 * Recipient-specific Aimduck wire projection. This is a local sample contract,
 * not an OGS entity or protocol requirement.
 */
export const roomSnapshotSchema = z
  .object({
    server: serverSnapshotSchema,
    game: gameSnapshotSchema,
    me: playerSessionSchema.nullable(),
    others: z.array(playerSessionSchema),
    arena: arenaSnapshotSchema,
  })
  .strict();

export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;
export type GameSnapshot = RoomSnapshot["game"];
export type ArenaSnapshot = RoomSnapshot["arena"];

const arenaEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("duck.crossed"), playerId: z.string().min(1) }).strict(),
  z.object({ type: z.literal("duck.hit"), playerId: z.string().min(1) }).strict(),
  z.object({ type: z.literal("rock.thrown"), playerId: z.string().min(1) }).strict(),
]);

const snapshotPayloadSchema = roomSnapshotSchema;

const snapshotMessageFields = {
  version: z.literal(1),
  sequence: sequenceNumber,
};

const roomErrorSchema = z
  .object({
    version: z.literal(1),
    type: z.literal("room.error"),
    sequence: sequenceNumber,
    payload: z
      .object({
        error: z
          .object({
            code: z.enum([
              "unauthorized",
              "room_not_found",
              "room_unavailable",
              "room_full",
              "invalid_ticket",
              "ticket_expired",
              "identity_mismatch",
              "invalid_message",
              "rate_limited",
              "protocol_error",
            ]),
            message: z.string().min(1),
            retryable: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export const serverMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...snapshotMessageFields,
      type: z.literal("room.snapshot"),
      payload: roomSnapshotSchema,
    })
    .strict(),
  z
    .object({
      ...snapshotMessageFields,
      type: z.literal("lobby.updated"),
      payload: snapshotPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...snapshotMessageFields,
      type: z.literal("match.started"),
      payload: snapshotPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...snapshotMessageFields,
      type: z.literal("round.updated"),
      payload: snapshotPayloadSchema.extend({ event: arenaEventSchema.optional() }).strict(),
    })
    .strict(),
  z
    .object({
      ...snapshotMessageFields,
      type: z.literal("round.completed"),
      payload: snapshotPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...snapshotMessageFields,
      type: z.literal("match.completed"),
      payload: snapshotPayloadSchema,
    })
    .strict(),
  roomErrorSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

export function parseClientMessage(value: unknown): ClientMessage {
  return clientMessageSchema.parse(value);
}

export function isClientMessage(value: unknown): value is ClientMessage {
  return clientMessageSchema.safeParse(value).success;
}

export function parseServerMessage(value: unknown): ServerMessage {
  return serverMessageSchema.parse(value);
}

export function isServerMessage(value: unknown): value is ServerMessage {
  return serverMessageSchema.safeParse(value).success;
}

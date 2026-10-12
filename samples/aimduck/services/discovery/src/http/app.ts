// SPDX-License-Identifier: Apache-2.0

import { TLSSocket } from "node:tls";
import type * as https from "node:https";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import type { PlayerIdentity } from "@aimduck/shared";
import { log } from "@aimduck/shared/logging";
import {
  IdentityProviderUnavailableError,
  InvalidIdentityTokenError,
} from "../auth/jwt-verifier.js";
import { listRooms } from "../catalog/list-rooms.js";
import {
  RoomRegistry,
  RoomRegistryError,
  type RoomRegistration,
} from "../catalog/room-registry.js";
import { resolveRoom } from "../resolution/resolve-room.js";

const resolveBodySchema = z.object({ masked_token: z.string().min(1) }).strict();
const registrationBodySchema = z
  .object({
    room_id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
    display_name: z.string().min(1).max(80),
    host: z.string().min(1).max(253),
    port: z.number().int().min(1).max(65_535),
    max_players: z.literal(8),
    current_players: z.number().int().min(0).max(8),
    tags: z.array(z.string().min(1).max(32)).max(16),
  })
  .strict();
const heartbeatBodySchema = z
  .object({
    room_id: z.string().min(1),
    current_players: z.number().int().min(0).max(8),
    connected_player_ids: z.array(z.string().min(1)).max(8).optional(),
    state: z.enum(["active", "drain"]).optional(),
  })
  .strict();

export type DiscoveryAppOptions = {
  registry: RoomRegistry;
  verifyAccessToken(token: string): Promise<PlayerIdentity>;
  issueJoinTicket(input: {
    playerId: string;
    roomId: string;
    ticketSecret: Uint8Array;
  }): Promise<{ ticket: string; expiresAt: number }>;
  ticketTtlMs?: number;
  allowedOrigins?: string[];
  getRoomTicketSecret?(roomId: string): Uint8Array;
  https?: https.ServerOptions;
};

export function buildDiscoveryApp(options: DiscoveryAppOptions): FastifyInstance<https.Server> {
  const app = Fastify<https.Server>({ logger: false, https: options.https ?? null });
  const ticketTtlMs = options.ticketTtlMs ?? 300_000;

  void app.register(cors, {
    origin: options.allowedOrigins ?? false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({ status: "ready" }));

  app.get<{ Querystring: { game_mode?: string } }>("/v1/rooms", async (request, reply) => {
    const identity = await authenticate(request, reply, options.verifyAccessToken);
    if (identity === null) {
      return reply;
    }
    return { rooms: listRooms(options.registry, request.query.game_mode).map(serializeListing) };
  });

  app.post<{ Body: unknown }>("/v1/rooms/resolve", async (request, reply) => {
    const identity = await authenticate(request, reply, options.verifyAccessToken);
    if (identity === null) {
      return reply;
    }
    const body = resolveBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: { code: "invalid_request", message: "Invalid room selection." } });
    }

    try {
      const resolved = await resolveRoom(
        options.registry,
        {
          maskedToken: body.data.masked_token,
          playerId: identity.playerId,
          ticketTtlMs,
        },
        (room, playerId) =>
          options.issueJoinTicket({
            playerId,
            roomId: room.roomId,
            ticketSecret: room.ticketSecret,
          }),
      );
      return {
        status: "resolved",
        room_id: resolved.roomId,
        host: resolved.host,
        port: resolved.port,
        protocol: "wss",
        path: "/v1/ws",
        join_ticket: resolved.ticket,
        ttl_seconds: Math.ceil(ticketTtlMs / 1_000),
      };
    } catch (error) {
      if (error instanceof RoomRegistryError) {
        const status = error.code === "room_not_found" ? 404 : 409;
        return reply.code(status).send({
          error: {
            code: error.code,
            message: error.message,
            retryable: error.code !== "room_not_found",
          },
        });
      }
      log("error", "room_resolution_failed", { error: safeErrorName(error) });
      return reply.code(503).send({
        error: {
          code: "room_unavailable",
          message: "Room resolution is temporarily unavailable.",
          retryable: true,
        },
      });
    }
  });

  app.post<{ Body: unknown }>("/v1/discovery/register", async (request, reply) => {
    const body = registrationBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: { code: "invalid_request", message: "Invalid room registration." } });
    }
    if (!hasValidRoomCertificate(request, body.data.room_id)) {
      return reply
        .code(401)
        .send({ error: { code: "unauthorized", message: "Valid room mTLS is required." } });
    }
    if (options.getRoomTicketSecret === undefined) {
      return reply.code(503).send({
        error: { code: "configuration_error", message: "Room signing material is unavailable." },
      });
    }

    try {
      const room: RoomRegistration = {
        roomId: body.data.room_id,
        displayName: body.data.display_name,
        host: body.data.host,
        port: body.data.port,
        capacity: body.data.max_players,
        currentPlayers: body.data.current_players,
        tags: body.data.tags,
        ticketSecret: options.getRoomTicketSecret(body.data.room_id),
      };
      options.registry.register(room);
      return reply.code(201).send({ status: "registered", room_id: room.roomId });
    } catch (error) {
      log("error", "room_registration_failed", { error: safeErrorName(error) });
      return reply.code(400).send({
        error: { code: "invalid_registration", message: "Room registration was rejected." },
      });
    }
  });

  app.post<{ Body: unknown }>("/v1/discovery/heartbeat", async (request, reply) => {
    const body = heartbeatBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: { code: "invalid_request", message: "Invalid room heartbeat." } });
    }
    if (!hasValidRoomCertificate(request, body.data.room_id)) {
      return reply
        .code(401)
        .send({ error: { code: "unauthorized", message: "Valid room mTLS is required." } });
    }
    try {
      options.registry.heartbeat(
        body.data.room_id,
        body.data.current_players,
        body.data.state,
        body.data.connected_player_ids,
      );
      return { status: "renewed", room_id: body.data.room_id };
    } catch (error) {
      if (error instanceof RoomRegistryError) {
        return reply.code(404).send({ error: { code: error.code, message: error.message } });
      }
      log("error", "room_heartbeat_failed", { error: safeErrorName(error) });
      return reply
        .code(400)
        .send({ error: { code: "invalid_heartbeat", message: "Room heartbeat was rejected." } });
    }
  });

  return app;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  verifyAccessToken: DiscoveryAppOptions["verifyAccessToken"],
): Promise<PlayerIdentity | null> {
  const authorization = request.headers.authorization;
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    reply
      .code(401)
      .send({ error: { code: "unauthorized", message: "A bearer identity token is required." } });
    return null;
  }

  const token = authorization.slice("Bearer ".length);
  if (token.length === 0) {
    reply
      .code(401)
      .send({ error: { code: "unauthorized", message: "A bearer identity token is required." } });
    return null;
  }
  try {
    return await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof InvalidIdentityTokenError) {
      reply.code(401).send({
        error: { code: "unauthorized", message: "Identity token is invalid or expired." },
      });
      return null;
    }
    if (error instanceof IdentityProviderUnavailableError) {
      reply.code(503).send({
        error: {
          code: "identity_provider_unavailable",
          message: "Identity verification is temporarily unavailable.",
        },
      });
      return null;
    }
    log("error", "identity_verification_failed", { error: safeErrorName(error) });
    reply.code(503).send({
      error: {
        code: "identity_verification_unavailable",
        message: "Identity verification is temporarily unavailable.",
      },
    });
    return null;
  }
}

function serializeListing(listing: ReturnType<RoomRegistry["list"]>[number]) {
  return {
    masked_token: listing.maskedToken,
    display_name: listing.displayName,
    current_players: listing.currentPlayers,
    max_players: listing.maxPlayers,
    state: listing.state,
    tags: listing.tags,
  };
}

function hasValidRoomCertificate(request: FastifyRequest, roomId: string): boolean {
  const socket = request.raw.socket;
  if (!(socket instanceof TLSSocket) || !socket.authorized) {
    return false;
  }
  return socket.getPeerCertificate().subject?.CN === roomId;
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

// SPDX-License-Identifier: Apache-2.0

import type * as https from "node:https";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { IdentityProviderUnavailableError } from "@aimduck/shared/auth/jwt-verifier";
import { log } from "@aimduck/shared/logging";
import { RoomAdmissionError, type RoomHandshakeRequest } from "./handshake.js";

const handshakeBodySchema = z
  .object({
    join_ticket: z.string().min(1).max(8_192),
    client_public_key: z.string().min(1).max(256),
    client_nonce: z.string().min(1).max(128),
  })
  .strict();

export type RoomHttpAppOptions = {
  allowedOrigins: string[];
  handshake(request: RoomHandshakeRequest): Promise<{
    sessionId: string;
    sessionExpiresAt: number;
    playerId: string;
    ticketId: string;
    serverPublicKey: string;
    serverNonce: string;
    cipher: "AES-256-GCM";
    protocolVersion: 1;
  }>;
  https?: https.ServerOptions;
};

export function buildRoomHttpApp(options: RoomHttpAppOptions): FastifyInstance<https.Server> {
  const app = Fastify<https.Server>({ logger: false, https: options.https ?? null });
  void app.register(cors, {
    origin: options.allowedOrigins,
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({ status: "ready" }));

  app.post<{ Body: unknown }>("/v1/handshake", async (request, reply) => {
    const body = handshakeBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({
        error: { code: "invalid_request", message: "Handshake request is malformed." },
      });
    }
    const authorization = request.headers.authorization;
    if (authorization === undefined) {
      return reply.code(401).send({
        error: { code: "unauthorized", message: "A bearer identity token is required." },
      });
    }

    try {
      const result = await options.handshake({
        authorization,
        joinTicket: body.data.join_ticket,
        clientPublicKey: body.data.client_public_key,
        clientNonce: body.data.client_nonce,
      });
      return {
        status: "admitted",
        session_id: result.sessionId,
        session_expires_at: result.sessionExpiresAt,
        player_id: result.playerId,
        ticket_id: result.ticketId,
        server_public_key: result.serverPublicKey,
        server_nonce: result.serverNonce,
        cipher: result.cipher,
        protocol_version: result.protocolVersion,
      };
    } catch (error) {
      if (error instanceof RoomAdmissionError) {
        const status =
          error.code === "unauthorized"
            ? 401
            : error.code === "room_full"
              ? 409
              : error.code === "ticket_replayed"
                ? 409
                : 403;
        return reply.code(status).send({
          error: {
            code: error.code,
            message: error.message,
            retryable: error.code === "room_full",
          },
        });
      }
      if (error instanceof IdentityProviderUnavailableError) {
        return reply.code(503).send({
          error: {
            code: "identity_provider_unavailable",
            message: "Identity verification is temporarily unavailable.",
            retryable: true,
          },
        });
      }
      log("error", "room_handshake_failed", {
        roomId: process.env.ROOM_ID ?? "unconfigured",
        error: error instanceof Error ? error.name : "UnknownError",
      });
      return reply.code(503).send({
        error: {
          code: "handshake_unavailable",
          message: "Room admission is temporarily unavailable.",
          retryable: true,
        },
      });
    }
  });

  return app;
}

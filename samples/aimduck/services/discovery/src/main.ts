// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createJoinTicketService } from "./resolution/join-ticket.js";
import { createJwtVerifier } from "./auth/jwt-verifier.js";
import { RoomRegistry } from "./catalog/room-registry.js";
import { buildDiscoveryApp } from "./http/app.js";
import { parseDiscoveryConfig } from "@aimduck/shared/config";

const config = parseDiscoveryConfig({
  host: process.env.HOST ?? "0.0.0.0",
  port: process.env.PORT ?? "8443",
  issuer: required("OIDC_ISSUER"),
  audience: process.env.OIDC_AUDIENCE ?? "aimduck-client",
  jwksUri: required("OIDC_JWKS_URI"),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim()),
  leaseTtlSeconds: Number(process.env.LEASE_TTL_SECONDS ?? 30),
  ticketSecretPath: required("TICKET_SECRET_PATH"),
  tlsCertificatePath: required("TLS_CERT_PATH"),
  tlsKeyPath: required("TLS_KEY_PATH"),
  mtlsCaPath: required("MTLS_CA_PATH"),
});

const roomSecretDirectory = process.env.ROOM_SECRET_DIR ?? "/run/secrets";
const roomIds = (process.env.ROOM_IDS ?? "room-1,room-2")
  .split(",")
  .map((roomId) => roomId.trim())
  .filter(Boolean);
const roomSecrets = new Map(
  await Promise.all(
    roomIds.map(
      async (roomId) =>
        [
          roomId,
          await readFile(
            roomId === roomIds[0]
              ? config.ticketSecretPath
              : join(roomSecretDirectory, `${roomId}.ticket`),
          ),
        ] as const,
    ),
  ),
);
const [certificate, privateKey, ca] = await Promise.all([
  readFile(config.tlsCertificatePath),
  readFile(config.tlsKeyPath),
  readFile(config.mtlsCaPath),
]);
const registry = new RoomRegistry(Date, config.leaseTtlSeconds * 1_000);
const verifyAccessToken = createJwtVerifier({
  issuer: config.issuer,
  audience: config.audience,
  jwksUri: config.jwksUri,
});

const app = buildDiscoveryApp({
  registry,
  verifyAccessToken,
  allowedOrigins: config.allowedOrigins,
  async issueJoinTicket({ playerId, roomId, ticketSecret }) {
    const ticketService = createJoinTicketService(ticketSecret, {
      now: Date.now,
      ttlMs: 300_000,
    });
    return ticketService.issue({ playerId, roomId });
  },
  ticketTtlMs: 300_000,
  getRoomTicketSecret(roomId) {
    const secret = roomSecrets.get(roomId);
    if (secret === undefined) {
      throw new Error("Room-specific ticket secret is not configured.");
    }
    return secret;
  },
  https: { cert: certificate, key: privateKey, ca, requestCert: true, rejectUnauthorized: false },
});

const shutdown = async () => {
  await app.close();
};

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

await app.listen({ host: config.host, port: config.port });

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Required environment variable ${name} is missing.`);
  }
  return value;
}

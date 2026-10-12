// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { createIdentityTokenVerifier } from "@aimduck/shared/auth/jwt-verifier";
import { createJoinTicketService } from "@aimduck/shared/auth/join-ticket";
import { parseRoomConfig } from "@aimduck/shared/config";
import { GameplaySession } from "./game/gameplay-session.js";
import { startRoomRegistration } from "./ogs/discovery-registration.js";
import { createRoomAdmission } from "./transport/handshake.js";
import { buildRoomHttpApp } from "./transport/http-app.js";
import { attachRoomWebSocket } from "./transport/websocket.js";
import { AIMDUCK_TUNING } from "./game/tuning.js";

const config = parseRoomConfig({
  roomId: required("ROOM_ID"),
  host: process.env.HOST ?? "0.0.0.0",
  port: process.env.PORT ?? "8443",
  publicHost: process.env.PUBLIC_HOST ?? "localhost",
  publicPort: process.env.PUBLIC_PORT ?? process.env.PORT ?? "8443",
  discoveryUrl: required("DISCOVERY_URL"),
  issuer: required("OIDC_ISSUER"),
  jwksUri: required("OIDC_JWKS_URI"),
  audience: process.env.OIDC_AUDIENCE ?? "aimduck-client",
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim()),
  capacity: 8,
  heartbeatSeconds: Number(process.env.HEARTBEAT_SECONDS ?? 10),
  leaseTtlSeconds: Number(process.env.LEASE_TTL_SECONDS ?? 30),
  ticketSecretPath: required("TICKET_SECRET_PATH"),
  tlsCertificatePath: required("TLS_CERT_PATH"),
  tlsKeyPath: required("TLS_KEY_PATH"),
  mtlsCaPath: required("MTLS_CA_PATH"),
  mtlsCertificatePath: required("MTLS_CERT_PATH"),
  mtlsKeyPath: required("MTLS_KEY_PATH"),
});

const [certificate, privateKey, mtlsCa, mtlsCertificate, mtlsPrivateKey, ticketSecret] =
  await Promise.all([
    readFile(config.tlsCertificatePath),
    readFile(config.tlsKeyPath),
    readFile(config.mtlsCaPath),
    readFile(config.mtlsCertificatePath),
    readFile(config.mtlsKeyPath),
    readFile(config.ticketSecretPath),
  ]);
const ticketService = createJoinTicketService(ticketSecret, {
  now: Date.now,
  ttlMs: 300_000,
});
const verifyIdentity = createIdentityTokenVerifier({
  issuer: config.issuer,
  audience: config.audience,
  jwksUri: config.jwksUri,
});
const gameplay = new GameplaySession(config.roomId, Date);
const admission = createRoomAdmission({
  roomId: config.roomId,
  verifyIdentity: async (token) => {
    const identity = await verifyIdentity(token);
    return { playerId: identity.playerId, displayName: identity.displayName };
  },
  verifyTicket: (ticket, expected) => ticketService.verify(ticket, expected),
  reserveSeat: (identity) => gameplay.room.reservePlayer(identity),
  now: Date.now,
});
const app = buildRoomHttpApp({
  allowedOrigins: config.allowedOrigins,
  handshake: admission.handshake,
  https: { cert: certificate, key: privateKey },
});
const webSocket = attachRoomWebSocket({
  server: app.server,
  allowedOrigins: config.allowedOrigins,
  consumeSession: admission.consumeSession,
  onConnect: (session, send) => gameplay.connect(session, send),
  onMessage: (session, message) => gameplay.handleMessage(session, message),
  onDisconnect: (session) => gameplay.disconnect(session),
});

await app.listen({ host: config.host, port: config.port });
const registration = await startRoomRegistration({
  discoveryUrl: config.discoveryUrl,
  roomId: config.roomId,
  displayName: `Aimduck ${config.roomId}`,
  host: config.host,
  port: config.port,
  publicHost: config.publicHost,
  publicPort: config.publicPort,
  capacity: config.capacity,
  heartbeatSeconds: config.heartbeatSeconds,
  currentPlayers: () => gameplay.connectedPlayers,
  connectedPlayerIds: () => gameplay.connectedPlayerIds,
  certificate: mtlsCertificate,
  privateKey: mtlsPrivateKey,
  ca: mtlsCa,
});

const simulationTimer = setInterval(() => gameplay.tick(), 1_000 / AIMDUCK_TUNING.simulationHz);
simulationTimer.unref();
let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  clearInterval(simulationTimer);
  await registration.close();
  await webSocket.close();
  await app.close();
};

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Required environment variable ${name} is missing.`);
  }
  return value;
}

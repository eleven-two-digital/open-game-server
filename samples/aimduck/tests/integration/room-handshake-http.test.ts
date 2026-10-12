// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRoomHttpApp } from "../../services/room/src/transport/http-app.js";

describe("room HTTPS handshake contract", () => {
  const apps: Array<{ close(): Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("validates the bounded request and returns the session negotiation", async () => {
    const handshake = vi.fn().mockResolvedValue({
      sessionId: "single-use-session",
      sessionExpiresAt: 20_000,
      playerId: "player-1",
      ticketId: "ticket-1",
      serverPublicKey: "server-public-key",
      serverNonce: "server-nonce",
      cipher: "AES-256-GCM",
      protocolVersion: 1,
    });
    const app = buildRoomHttpApp({ handshake, allowedOrigins: ["http://localhost:5173"] });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/handshake",
      headers: { authorization: "Bearer identity-token" },
      payload: {
        join_ticket: "short-lived-ticket",
        client_public_key: "client-public-key",
        client_nonce: "client-nonce",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "admitted",
      session_id: "single-use-session",
      player_id: "player-1",
      cipher: "AES-256-GCM",
      protocol_version: 1,
    });
    expect(handshake).toHaveBeenCalledWith({
      authorization: "Bearer identity-token",
      joinTicket: "short-lived-ticket",
      clientPublicKey: "client-public-key",
      clientNonce: "client-nonce",
    });
  });

  it("rejects malformed requests before trying admission", async () => {
    const handshake = vi.fn();
    const app = buildRoomHttpApp({ handshake, allowedOrigins: ["http://localhost:5173"] });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/handshake",
      headers: { authorization: "Bearer identity-token" },
      payload: { join_ticket: "ticket", extra: "not accepted" },
    });

    expect(response.statusCode).toBe(400);
    expect(handshake).not.toHaveBeenCalled();
  });

  it("allows preflight only from a configured browser origin", async () => {
    const app = buildRoomHttpApp({
      handshake: vi.fn(),
      allowedOrigins: ["http://localhost:5173"],
    });
    apps.push(app);

    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/v1/handshake",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const denied = await app.inject({
      method: "OPTIONS",
      url: "/v1/handshake",
      headers: {
        origin: "https://unexpected.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

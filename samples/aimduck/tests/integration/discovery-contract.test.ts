// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDiscoveryApp } from "../../services/discovery/src/http/app.js";
import { RoomRegistry } from "../../services/discovery/src/catalog/room-registry.js";

describe("Discovery HTTP contract", () => {
  const apps: Array<{ close(): Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("lists masked rooms without revealing connection addresses", async () => {
    const registry = new RoomRegistry({ now: () => 1_000 }, 30_000);
    registry.register({
      roomId: "aimduck-room-1",
      displayName: "Room One",
      host: "localhost",
      port: 9101,
      capacity: 8,
      currentPlayers: 2,
      tags: ["aimduck"],
      ticketSecret: Buffer.alloc(32, 7),
    });
    const app = buildDiscoveryApp({
      registry,
      verifyAccessToken: vi.fn().mockResolvedValue({
        playerId: "player-1",
        displayName: "Player One",
        issuer: "http://idp.test",
        expiresAt: 90_000,
      }),
      issueJoinTicket: vi.fn(),
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/rooms?game_mode=aimduck",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ rooms: Array<Record<string, unknown>> }>();
    expect(body.rooms).toHaveLength(1);
    expect(body.rooms[0]).toMatchObject({
      display_name: "Room One",
      current_players: 2,
      max_players: 8,
      state: "active",
      tags: ["aimduck"],
    });
    expect(body.rooms[0]).toHaveProperty("masked_token");
    expect(JSON.stringify(body)).not.toContain("localhost");
    expect(JSON.stringify(body)).not.toContain("9101");
  });

  it("resolves the selected room with a player-bound short-lived ticket", async () => {
    const registry = new RoomRegistry({ now: () => 1_000 }, 30_000);
    const registered = registry.register({
      roomId: "aimduck-room-1",
      displayName: "Room One",
      host: "localhost",
      port: 9101,
      capacity: 8,
      currentPlayers: 0,
      tags: ["aimduck"],
      ticketSecret: Buffer.alloc(32, 7),
    });
    const issueJoinTicket = vi.fn().mockResolvedValue({
      ticket: "opaque-ticket",
      expiresAt: 301_000,
    });
    const app = buildDiscoveryApp({
      registry,
      verifyAccessToken: vi.fn().mockResolvedValue({
        playerId: "player-1",
        displayName: "Player One",
        issuer: "http://idp.test",
        expiresAt: 90_000,
      }),
      issueJoinTicket,
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms/resolve",
      headers: { authorization: "Bearer valid-token" },
      payload: { masked_token: registered.maskedToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "resolved",
      room_id: "aimduck-room-1",
      host: "localhost",
      port: 9101,
      protocol: "wss",
      path: "/v1/ws",
      join_ticket: "opaque-ticket",
      ttl_seconds: 300,
    });
    expect(issueJoinTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "player-1",
        roomId: "aimduck-room-1",
      }),
    );
  });

  it("requires a bearer identity token", async () => {
    const app = buildDiscoveryApp({
      registry: new RoomRegistry({ now: () => 1_000 }, 30_000),
      verifyAccessToken: vi.fn(),
      issueJoinTicket: vi.fn(),
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/v1/rooms" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: "unauthorized" } });
  });

  it("requires an authenticated room certificate for infrastructure registration", async () => {
    const app = buildDiscoveryApp({
      registry: new RoomRegistry({ now: () => 1_000 }, 30_000),
      verifyAccessToken: vi.fn(),
      issueJoinTicket: vi.fn(),
      getRoomTicketSecret: () => Buffer.alloc(32, 1),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/discovery/register",
      payload: {
        room_id: "aimduck-room-1",
        display_name: "Room One",
        host: "localhost",
        port: 9101,
        max_players: 8,
        current_players: 0,
        tags: ["aimduck"],
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: "unauthorized" } });
  });
});

// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import {
  DiscoveryApiError,
  DiscoveryClient,
} from "../../../client/src/features/discovery/discovery-client.js";

describe("DiscoveryClient", () => {
  it("requires HTTPS and attaches the bearer identity only to the masked listing request", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          rooms: [
            {
              masked_token: "opaque-selection",
              display_name: "Room One",
              current_players: 1,
              max_players: 8,
              state: "active",
              tags: ["aimduck"],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new DiscoveryClient("https://localhost:8080", fetcher);

    await expect(client.listRooms("identity-token")).resolves.toMatchObject([
      { maskedToken: "opaque-selection", currentPlayers: 1, maxPlayers: 8 },
    ]);
    expect(fetcher.mock.calls[0]?.[0]).toBeInstanceOf(URL);
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer identity-token",
    );
    expect(() => new DiscoveryClient("http://localhost:8080")).toThrow(
      "Discovery requests must use HTTPS.",
    );
  });

  it("provides actionable errors for full rooms and network failures", async () => {
    const fullRoom = new DiscoveryClient(
      "https://localhost:8080",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "room_full",
              message: "Room is full.",
              retryable: true,
            },
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(fullRoom.resolveRoom("token", "masked")).rejects.toMatchObject({
      code: "room_full",
      retryable: true,
      message: "Room is full.",
    });

    const unavailable = new DiscoveryClient(
      "https://localhost:8080",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(unavailable.listRooms("token")).rejects.toBeInstanceOf(DiscoveryApiError);
    await expect(unavailable.listRooms("token")).rejects.toMatchObject({
      code: "network_unavailable",
      retryable: true,
    });
  });
});

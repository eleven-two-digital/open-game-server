// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../../services/discovery/src/catalog/room-registry.js";

function registration(roomId = "aimduck-room-1") {
  return {
    roomId,
    displayName: "Room One",
    host: "localhost",
    port: 9101,
    capacity: 8 as const,
    currentPlayers: 0,
    tags: ["aimduck"],
    ticketSecret: Buffer.alloc(32, 3),
  };
}

describe("RoomRegistry", () => {
  it("removes a registration after its lease expires", () => {
    let now = 10_000;
    const registry = new RoomRegistry({ now: () => now }, 5_000);
    registry.register(registration());

    now += 5_001;

    expect(registry.list("aimduck")).toEqual([]);
  });

  it("masks addresses and filters by game mode", () => {
    const registry = new RoomRegistry({ now: () => 10_000 }, 5_000);
    registry.register(registration());
    registry.register({ ...registration("other-room"), tags: ["other"] });

    const rooms = registry.list("aimduck");

    expect(rooms).toHaveLength(1);
    expect(rooms[0]).not.toHaveProperty("host");
    expect(rooms[0]).not.toHaveProperty("port");
    expect(rooms[0]).toHaveProperty("maskedToken");
  });

  it("reserves the last seat for only one concurrent resolution", () => {
    const registry = new RoomRegistry({ now: () => 10_000 }, 5_000);
    const room = registry.register({ ...registration(), currentPlayers: 7 });

    const winner = registry.reserve(room.maskedToken, "player-1", 5_000);

    expect(winner.roomId).toBe("aimduck-room-1");
    expect(() => registry.reserve(room.maskedToken, "player-2", 5_000)).toThrow("Room is full.");
  });
});

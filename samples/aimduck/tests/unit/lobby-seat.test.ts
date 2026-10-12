// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { GameRoom } from "../../services/room/src/game/game-room.js";

describe("lobby seat ownership and reservation", () => {
  it("reclaims the same player's seat before 30 seconds and requires readiness again", () => {
    let now = 1_000;
    const room = new GameRoom("aimduck-room-1", { now: () => now });
    room.reservePlayer({ playerId: "player-1", displayName: "Player One" });
    room.connectPlayer("player-1");
    room.setReady("player-1", true);
    room.disconnectPlayer("player-1");

    now += 29_999;
    expect(room.reservePlayer({ playerId: "player-1", displayName: "Player One" })).toBe(true);
    room.connectPlayer("player-1");
    expect(room.getSnapshot().seats[0]).toMatchObject({
      playerId: "player-1",
      ready: false,
      connected: true,
      reservationDeadline: null,
    });
  });

  it("expires a disconnected seat at 30 seconds and rejects duplicate ownership", () => {
    let now = 1_000;
    const room = new GameRoom("aimduck-room-1", { now: () => now });
    room.reservePlayer({ playerId: "player-1", displayName: "Player One" });
    room.connectPlayer("player-1");
    room.disconnectPlayer("player-1");
    now += 30_000;

    expect(room.reservePlayer({ playerId: "player-2", displayName: "Player Two" })).toBe(true);
    expect(room.reservePlayer({ playerId: "player-1", displayName: "Player One" })).toBe(false);
    expect(room.getSnapshot().seats[0]?.playerId).toBe("player-2");
  });

  it("does not admit a ninth player or allow a player to ready someone else's seat", () => {
    const room = new GameRoom("aimduck-room-1", { now: () => 1_000 });
    for (let index = 0; index < 8; index += 1) {
      room.reservePlayer({ playerId: `player-${index}`, displayName: `Player ${index}` });
      room.connectPlayer(`player-${index}`);
    }

    expect(room.reservePlayer({ playerId: "player-8", displayName: "Player 8" })).toBe(false);
    expect(() => room.setReady("unknown", true)).toThrow("Player does not own a connected seat.");
  });
});

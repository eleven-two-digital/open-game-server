// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { GameRoom } from "../../services/room/src/game/game-room.js";

function player(index: number) {
  return { playerId: `player-${index}`, displayName: `Player ${index}` };
}

describe("GameRoom", () => {
  it("waits for eight connected ready seats and rotates Shooter by seat", () => {
    let now = 1_000;
    const room = new GameRoom("aimduck-room-1", { now: () => now });
    for (let index = 0; index < 8; index += 1) {
      expect(room.reservePlayer(player(index))).toBe(true);
      room.connectPlayer(`player-${index}`);
      if (index < 7) {
        room.setReady(`player-${index}`, true);
      }
    }
    expect(room.getSnapshot().phase).toBe("lobby");

    room.setReady("player-7", true);
    expect(room.getSnapshot().phase).toBe("in_progress");
    expect(room.getSnapshot().round).toMatchObject({
      number: 1,
      shooterId: "player-0",
      phase: "countdown",
    });

    const shooters = ["player-0"];
    for (let round = 1; round <= 8; round += 1) {
      now += 3_000;
      room.tick();
      expect(room.getSnapshot().round?.phase).toBe("active");
      for (let index = 0; index < 8; index += 1) {
        if (index !== round - 1) {
          room.recordOutcome(`player-${index}`, "crossed");
        }
      }
      if (round < 8) {
        now += 4_000;
        room.tick();
        shooters.push(`player-${round}`);
      }
    }

    expect(shooters).toEqual(Array.from({ length: 8 }, (_, index) => `player-${index}`));
    expect(room.getSnapshot().phase).toBe("complete");
  });

  it("does not award an unresolved Duck at the round deadline", () => {
    let now = 1_000;
    const room = new GameRoom("aimduck-room-1", { now: () => now });
    for (let index = 0; index < 8; index += 1) {
      room.reservePlayer(player(index));
      room.connectPlayer(`player-${index}`);
      room.setReady(`player-${index}`, true);
    }
    now += 3_000;
    room.tick();
    now += 35_000;
    room.tick();

    expect(room.getSnapshot().round?.phase).toBe("results");
    expect(room.getSnapshot().scoreboard.scores).toEqual(
      Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`player-${index}`, 0])),
    );
  });
});

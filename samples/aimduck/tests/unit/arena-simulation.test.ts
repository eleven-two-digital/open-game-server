// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ArenaSimulation } from "../../services/room/src/simulation/arena.js";

describe("ArenaSimulation", () => {
  it("clamps Duck movement to the arena and marks a successful crossing", () => {
    const arena = new ArenaSimulation([
      { playerId: "duck-1", role: "duck", position: { x: 950, y: 300 } },
    ]);

    arena.setInput("duck-1", {
      move_x: 1,
      move_y: 0,
      throw: false,
      aim_x: 0.5,
      aim_y: 0.5,
    });
    const events = arena.step(100);

    expect(arena.getPlayer("duck-1")?.position.x).toBeLessThanOrEqual(1_000);
    expect(events).toContainEqual({ type: "duck.crossed", playerId: "duck-1" });
  });

  it("limits throws by cooldown and allows only one active projectile", () => {
    const arena = new ArenaSimulation([
      { playerId: "shooter", role: "shooter", position: { x: 500, y: 100 } },
      { playerId: "duck-1", role: "duck", position: { x: 700, y: 300 } },
    ]);
    const input = {
      move_x: 0,
      move_y: 0,
      throw: true,
      aim_x: 0.7,
      aim_y: 0.5,
    };
    arena.setInput("shooter", input);
    arena.step(34);
    arena.setInput("shooter", input);
    arena.step(34);

    expect(arena.getProjectiles()).toHaveLength(1);
  });

  it("uses swept collision so a fast rock cannot tunnel through a Duck", () => {
    const arena = new ArenaSimulation(
      [
        { playerId: "shooter", role: "shooter", position: { x: 500, y: 100 } },
        { playerId: "duck-1", role: "duck", position: { x: 650, y: 200 } },
      ],
      { projectileSpeed: 5_000, gravity: 0, throwCooldownMs: 0 },
    );
    arena.setInput("shooter", {
      move_x: 0,
      move_y: 0,
      throw: true,
      aim_x: 0.65,
      aim_y: 0.33,
    });

    const events = arena.step(100);

    expect(events).toContainEqual({ type: "duck.hit", playerId: "duck-1" });
  });

  it("stops a rock at cover before it can hit a Duck behind it", () => {
    const arena = new ArenaSimulation(
      [
        { playerId: "shooter", role: "shooter", position: { x: 500, y: 100 } },
        { playerId: "duck-1", role: "duck", position: { x: 900, y: 300 } },
      ],
      { projectileSpeed: 5_000, gravity: 0, throwCooldownMs: 0 },
    );
    arena.setInput("shooter", {
      move_x: 0,
      move_y: 0,
      throw: true,
      aim_x: 0.9,
      aim_y: 0.5,
    });

    const events = arena.step(100);

    expect(events).not.toContainEqual({ type: "duck.hit", playerId: "duck-1" });
    expect(arena.getProjectiles()).toHaveLength(0);
  });
});

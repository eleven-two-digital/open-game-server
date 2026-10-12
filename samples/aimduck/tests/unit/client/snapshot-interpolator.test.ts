// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { SnapshotInterpolator } from "../../../client/src/game/rendering/snapshot-interpolator.js";

describe("SnapshotInterpolator", () => {
  it("interpolates between ordered states and ignores stale snapshots", () => {
    const interpolator = new SnapshotInterpolator();
    const first = {
      players: [
        {
          playerId: "duck-1",
          role: "duck" as const,
          position: { x: 10, y: 20 },
          outcome: "running" as const,
        },
      ],
      projectiles: [],
    };
    const second = {
      players: [
        {
          playerId: "duck-1",
          role: "duck" as const,
          position: { x: 30, y: 40 },
          outcome: "running" as const,
        },
      ],
      projectiles: [],
    };
    expect(interpolator.push(1, first, 100)).toBe(true);
    expect(interpolator.push(2, second, 200)).toBe(true);
    expect(interpolator.push(1, first, 210)).toBe(false);
    expect(interpolator.sample(150).players[0]?.position).toEqual({ x: 20, y: 30 });
    expect(interpolator.sample(250).players[0]?.position).toEqual({ x: 30, y: 40 });
  });
});

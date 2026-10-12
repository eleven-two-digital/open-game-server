// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { Scoreboard } from "../../services/room/src/game/scoreboard.js";

describe("Scoreboard", () => {
  it("awards three points for each hit and one for each crossing", () => {
    const scoreboard = new Scoreboard(["shooter", "duck-1", "duck-2"]);
    scoreboard.awardHit("shooter");
    scoreboard.awardHit("shooter");
    scoreboard.awardCrossing("duck-1");

    expect(scoreboard.snapshot().scores).toEqual({
      shooter: 6,
      "duck-1": 1,
      "duck-2": 0,
    });
  });

  it("reports every player tied for the highest score", () => {
    const scoreboard = new Scoreboard(["one", "two", "three"]);
    scoreboard.awardCrossing("one");
    scoreboard.awardCrossing("two");

    expect(scoreboard.finalize().winners).toEqual(["one", "two"]);
  });
});

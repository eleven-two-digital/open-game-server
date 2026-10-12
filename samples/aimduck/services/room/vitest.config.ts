// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "room",
    environment: "node",
    include: [
      "../../tests/unit/room-*.test.ts",
      "../../tests/unit/game-room.test.ts",
      "../../tests/unit/lobby-seat.test.ts",
      "../../tests/unit/scoreboard.test.ts",
      "../../tests/unit/arena-simulation.test.ts",
      "../../tests/integration/room-*.test.ts",
      "../../tests/integration/gameplay-*.test.ts",
    ],
  },
});

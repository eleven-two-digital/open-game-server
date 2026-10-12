// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "shared",
    environment: "node",
    include: ["../../tests/unit/shared/**/*.test.ts"],
  },
});

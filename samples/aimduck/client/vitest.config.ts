// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "client",
    environment: "jsdom",
    include: ["../tests/unit/client/**/*.test.ts", "../tests/unit/client/**/*.test.tsx"],
  },
});

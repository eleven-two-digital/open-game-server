// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/shared/vitest.config.ts",
      "client/vitest.config.ts",
      "services/discovery/vitest.config.ts",
      "services/room/vitest.config.ts",
    ],
  },
});

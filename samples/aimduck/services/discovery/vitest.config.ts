// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "discovery",
    environment: "node",
    include: [
      "../../tests/unit/discovery-catalog.test.ts",
      "../../tests/unit/jwt-verifier.test.ts",
      "../../tests/unit/join-ticket.test.ts",
      "../../tests/integration/discovery-*.test.ts",
      "../../tests/integration/compose-*.test.ts",
      "../../tests/integration/security-artifacts.test.ts",
    ],
  },
});

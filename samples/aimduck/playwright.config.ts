// SPDX-License-Identifier: Apache-2.0

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE === undefined
      ? {}
      : { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }),
  },
  webServer: {
    command: "npm run build --workspace @aimduck/shared && npm run dev --workspace @aimduck/client",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: process.env.AIMDUCK_COMPOSE_E2E === "1" || !process.env.CI,
    timeout: 30_000,
  },
});

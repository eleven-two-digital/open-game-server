// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

describe("Compose room restart smoke", () => {
  const contexts: BrowserContext[] = [];
  let browser: Browser | undefined;

  afterAll(async () => {
    await Promise.all(contexts.map((context) => context.close()));
    await browser?.close();
  });

  it.skipIf(process.env.AIMDUCK_COMPOSE_RESTART !== "1")(
    "restarts one room while another stays connected and joinable",
    async () => {
      const playwrightExecutable = chromium.executablePath();
      const executablePath =
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
        (existsSync(playwrightExecutable) ? playwrightExecutable : "/usr/bin/google-chrome");
      if (!existsSync(executablePath)) {
        throw new Error(
          "Install Playwright Chromium or set PLAYWRIGHT_CHROMIUM_EXECUTABLE before running the Compose restart test.",
        );
      }
      const launchOptions = { executablePath };
      browser = await chromium.launch({ headless: true, ...launchOptions });

      const existingPlayer = await connectPlayer(browser, 1);
      execFileSync("docker", ["compose", "restart", "room-1"], {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 90_000,
      });

      await existingPlayer.page
        .getByRole("heading", { name: "Waiting for eight players" })
        .waitFor({ state: "visible", timeout: 20_000 });
      const returningPlayer = await connectPlayer(browser, 2);
      await returningPlayer.page
        .getByRole("heading", { name: "Waiting for eight players" })
        .waitFor({ state: "visible", timeout: 20_000 });

      expect(
        await existingPlayer.page.getByRole("button", { name: "Mark me ready" }).isEnabled(),
      ).toBe(true);
      expect(
        await returningPlayer.page.getByRole("button", { name: "Mark me ready" }).isEnabled(),
      ).toBe(true);
      expect(returningPlayer.availableRooms).toBe(2);
    },
    150_000,
  );

  async function connectPlayer(
    currentBrowser: Browser,
    playerNumber: number,
  ): Promise<{ page: Page; availableRooms: number }> {
    const context = await currentBrowser.newContext({ ignoreHTTPSErrors: true });
    contexts.push(context);
    const page = await context.newPage();
    await page.goto("http://localhost:5173");
    await page.getByRole("button", { name: "Sign in with the local demo identity" }).click();

    const username = `duck${String(playerNumber).padStart(2, "0")}`;
    await page.getByRole("textbox", { name: "Username" }).fill(username);
    await page.getByRole("textbox", { name: "Password" }).fill(`${username}-local`);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.getByRole("region", { name: "PlayerIdentity" }).waitFor({
      state: "visible",
      timeout: 20_000,
    });
    const roomButton = page.getByRole("button", { name: "Resolve and join" }).nth(1);
    await roomButton.waitFor({ state: "visible", timeout: 20_000 });
    const availableRooms = await page.getByRole("button", { name: "Resolve and join" }).count();
    await roomButton.click();
    await page.getByRole("button", { name: "Resolve and connect" }).click();
    await page.getByRole("heading", { name: "Waiting for eight players" }).waitFor({
      state: "visible",
      timeout: 20_000,
    });
    return { page, availableRooms };
  }
});

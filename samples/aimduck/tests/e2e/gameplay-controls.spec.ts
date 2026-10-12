// SPDX-License-Identifier: Apache-2.0

import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

test.skip(
  process.env.AIMDUCK_COMPOSE_E2E !== "1",
  "requires the complete local Docker Compose stack",
);
test.setTimeout(90_000);

test("eight browser players ready up and use role-specific arena controls", async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  try {
    const players = await Promise.all(
      Array.from({ length: 8 }, (_, index) => createPlayer(browser, index + 1, contexts)),
    );

    await Promise.all(
      players.map(async ({ page }) => {
        await expect(
          page.getByRole("heading", { name: "Waiting for eight players" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Mark me ready" }).click();
      }),
    );

    await expect
      .poll(async () => {
        const roleHeadings = await Promise.all(
          players.map((player) =>
            player.page.getByRole("heading", { name: "You are the Shooter" }).count(),
          ),
        );
        return roleHeadings.reduce((total, count) => total + count, 0);
      })
      .toBe(1);
    const shooterIndex = (
      await Promise.all(
        players.map((player) =>
          player.page.getByRole("heading", { name: "You are the Shooter" }).count(),
        ),
      )
    ).findIndex((count) => count === 1);
    const shooter = players[shooterIndex];
    const duck = players.find((_, index) => index !== shooterIndex);
    if (shooter === undefined || duck === undefined) {
      throw new Error("The browser match did not create all eight player pages.");
    }
    await expect(shooter.page.getByRole("heading", { name: "You are the Shooter" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(duck.page.getByRole("heading", { name: "You are a Duck" })).toBeVisible({
      timeout: 10_000,
    });

    const shooterCanvas = shooter.page.getByRole("application", { name: /Aimduck arena/ });
    await expect(shooterCanvas).toBeVisible();
    await shooterCanvas.click();
    const shooterEventLog = shooter.page.getByRole("region", { name: "Match event log" });
    await expect(shooterEventLog.getByText(/Shooter threw a rock/)).toHaveCount(1, {
      timeout: 5_000,
    });
    await shooter.page.waitForTimeout(900);
    await shooterCanvas.focus();
    await shooter.page.keyboard.press("Space");
    await expect(shooterEventLog.getByText(/Shooter threw a rock/)).toHaveCount(2, {
      timeout: 5_000,
    });

    const duckCanvas = duck.page.getByRole("application", { name: /Aimduck arena/ });
    await expect(duckCanvas).toBeVisible();
    await duckCanvas.focus();
    await duck.page.keyboard.down("ArrowRight");
    try {
      await expect(
        duck.page.getByRole("region", { name: "Round outcomes" }).getByText(/crossed/),
      ).toBeVisible({ timeout: 8_000 });
    } finally {
      await duck.page.keyboard.up("ArrowRight");
    }
    await expect(duck.page.getByRole("heading", { name: "Scoreboard" })).toBeVisible();
    await expect(duck.page.getByRole("heading", { name: "Round outcomes" })).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

async function createPlayer(
  browser: Browser,
  playerNumber: number,
  contexts: BrowserContext[],
): Promise<{ page: Page }> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  contexts.push(context);
  const page = await context.newPage();
  const username = `duck${String(playerNumber).padStart(2, "0")}`;
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in with the local demo identity" }).click();
  await page.getByRole("textbox", { name: "Username" }).fill(username);
  await page.getByRole("textbox", { name: "Password" }).fill(`${username}-local`);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("region", { name: "PlayerIdentity" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Resolve and join" }).first().click();
  await page.getByRole("button", { name: "Resolve and connect" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for eight players" })).toBeVisible({
    timeout: 20_000,
  });
  return { page };
}

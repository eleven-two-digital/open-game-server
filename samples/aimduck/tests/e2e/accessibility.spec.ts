// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from "node:child_process";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

test.use({ ignoreHTTPSErrors: true });

test("sign-in entry is keyboard reachable and reduced motion is respected", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aimduck" })).toBeVisible();

  await page.keyboard.press("Tab");
  const signInButton = page.getByRole("button", {
    name: "Sign in with the local demo identity",
  });
  await expect(signInButton).toBeFocused();

  const transitionDuration = await page
    .locator("button")
    .first()
    .evaluate((button) => getComputedStyle(button).transitionDuration);
  expect(transitionDuration).toBe("1e-05s");
});

test("the initial game entry communicates the browser sample purpose", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Join a room, take a role, and play an authoritative multiplayer match."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with the local demo identity" }),
  ).toBeEnabled();
});

test("keyboard users can discover a room, ready in the lobby, and leave", async ({ page }) => {
  test.skip(
    process.env.AIMDUCK_COMPOSE_E2E !== "1",
    "keyboard room admission requires the local Docker Compose stack",
  );
  test.setTimeout(120_000);
  execFileSync("docker", ["compose", "restart", "room-2"], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 90_000,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const signInButton = page.getByRole("button", {
    name: "Sign in with the local demo identity",
  });
  await page.keyboard.press("Tab");
  await expect(signInButton).toBeFocused();
  await page.keyboard.press("Enter");

  const username = "duck08";
  await page.getByRole("textbox", { name: "Username" }).fill(username);
  await page.getByRole("textbox", { name: "Password" }).fill(`${username}-local`);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("region", { name: "PlayerIdentity" })).toBeVisible({
    timeout: 20_000,
  });

  const roomButton = page.getByRole("button", { name: "Resolve and join" }).nth(1);
  await roomButton.focus();
  await page.keyboard.press("Enter");
  const joinButton = page.getByRole("button", { name: "Resolve and connect" });
  await joinButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Waiting for eight players" })).toBeVisible({
    timeout: 20_000,
  });

  const readyButton = page.getByRole("button", { name: "Mark me ready" });
  await readyButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("1 of 8 players ready");
  await expect(page.getByRole("button", { name: "Cancel ready" })).toBeFocused();

  const leaveButton = page.getByRole("button", { name: "Leave room" });
  await leaveButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Choose a room" })).toBeVisible();
});

test("eight keyboard browser sessions complete and agree on every match result", async ({
  browser,
}) => {
  test.skip(
    process.env.AIMDUCK_COMPOSE_E2E !== "1",
    "complete keyboard gameplay requires the local Docker Compose stack",
  );
  test.setTimeout(240_000);
  execFileSync("docker", ["compose", "restart", "room-2"], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 90_000,
  });

  const contexts: BrowserContext[] = [];
  try {
    const players = await Promise.all(
      Array.from({ length: 8 }, (_, index) => createKeyboardPlayer(browser, index + 1, contexts)),
    );
    const shooterCounts = Array.from({ length: 8 }, () => 0);
    await Promise.all(
      players.map(async ({ page }) => {
        const readyButton = page.getByRole("button", { name: "Mark me ready" });
        await readyButton.focus();
        await page.keyboard.press("Enter");
      }),
    );

    for (let round = 1; round <= 8; round += 1) {
      await expect
        .poll(
          async () =>
            (
              await Promise.all(
                players.map(async ({ page }) => {
                  if (
                    (await page.getByRole("heading", { name: "You are the Shooter" }).count()) === 1
                  ) {
                    return "shooter";
                  }
                  if ((await page.getByRole("heading", { name: "You are a Duck" }).count()) === 1) {
                    return "duck";
                  }
                  return "waiting";
                }),
              )
            ).sort(),
          { timeout: 20_000 },
        )
        .toEqual(["duck", "duck", "duck", "duck", "duck", "duck", "duck", "shooter"]);
      const roles = await Promise.all(
        players.map(async ({ page }) =>
          (await page.getByRole("heading", { name: "You are the Shooter" }).count()) === 1
            ? "shooter"
            : "duck",
        ),
      );
      const shooterIndex = roles.indexOf("shooter");
      if (shooterIndex < 0) {
        throw new Error(`Round ${round} did not assign a Shooter.`);
      }
      shooterCounts[shooterIndex] = (shooterCounts[shooterIndex] ?? 0) + 1;

      const ducks = players.filter((_, index) => index !== shooterIndex);
      await Promise.all(
        ducks.map(async ({ page }) => {
          const canvas = page.getByRole("application", { name: /Aimduck arena/ });
          await expect(canvas).toBeVisible({ timeout: 10_000 });
          await canvas.focus();
          await page.keyboard.down("ArrowRight");
        }),
      );
      try {
        await expect
          .poll(
            async () =>
              Promise.all(
                players.map(async ({ page }) => {
                  if ((await page.getByRole("heading", { name: "Round results" }).count()) === 1) {
                    return true;
                  }
                  return (
                    round === 8 &&
                    (await page.getByRole("heading", { name: "Match complete" }).count()) === 1
                  );
                }),
              ),
            { intervals: [100, 250, 500], timeout: 15_000 },
          )
          .toEqual(Array.from({ length: 8 }, () => true));
      } finally {
        await Promise.all(ducks.map(({ page }) => page.keyboard.up("ArrowRight")));
      }

      const outcomes = await Promise.all(
        players.map(async ({ page }) => {
          const list = page.getByRole("region", { name: "Round outcomes" }).locator("li");
          await expect(list).toHaveCount(7);
          return list.allTextContents();
        }),
      );
      for (const result of outcomes) {
        expect(result.every((entry) => entry.includes("crossed"))).toBe(true);
      }
      for (const result of outcomes.slice(1)) {
        expect(result).toEqual(outcomes[0]);
      }
    }

    expect(shooterCounts).toEqual(Array.from({ length: 8 }, () => 1));
    await Promise.all(
      players.map(({ page }) =>
        expect(page.getByRole("heading", { name: "Match complete" })).toBeVisible(),
      ),
    );
    const scoreboards = await Promise.all(
      players.map(({ page }) => page.locator(".scoreboard").innerText()),
    );
    for (const scoreboard of scoreboards.slice(1)) {
      expect(scoreboard).toBe(scoreboards[0]);
    }
    const resultMessages = await Promise.all(
      players.map(({ page }) => page.getByRole("status").first().innerText()),
    );
    for (const resultMessage of resultMessages.slice(1)) {
      expect(resultMessage).toBe(resultMessages[0]);
    }
    expect(resultMessages[0]).toMatch(/wins|Tie between/);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    execFileSync("docker", ["compose", "restart", "room-2"], {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 90_000,
    });
  }
});

async function createKeyboardPlayer(
  browser: Browser,
  playerNumber: number,
  contexts: BrowserContext[],
): Promise<{ page: Page }> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  contexts.push(context);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const signInButton = page.getByRole("button", {
    name: "Sign in with the local demo identity",
  });
  await signInButton.focus();
  await page.keyboard.press("Enter");

  const username = `duck${String(playerNumber).padStart(2, "0")}`;
  await page.getByRole("textbox", { name: "Username" }).fill(username);
  const password = page.getByRole("textbox", { name: "Password" });
  await password.fill(`${username}-local`);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "PlayerIdentity" })).toBeVisible({
    timeout: 20_000,
  });

  const roomButton = page.getByRole("button", { name: "Resolve and join" }).nth(1);
  await roomButton.focus();
  await page.keyboard.press("Enter");
  const joinButton = page.getByRole("button", { name: "Resolve and connect" });
  await joinButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Waiting for eight players" })).toBeVisible({
    timeout: 20_000,
  });
  return { page };
}

// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";

test.skip(
  process.env.AIMDUCK_COMPOSE_E2E !== "1",
  "requires the complete local Docker Compose stack",
);
test.use({ ignoreHTTPSErrors: true });

test("authenticates, discovers masked rooms, and joins a room over WSS", async ({ page }) => {
  const repeatIndex = test.info().repeatEachIndex;
  const playerNumber = (repeatIndex % 8) + 1;
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in with the local demo identity" }).click();
  await page
    .getByRole("textbox", { name: "Username" })
    .fill(`duck${String(playerNumber).padStart(2, "0")}`);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(`duck${String(playerNumber).padStart(2, "0")}-local`);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("region", { name: "PlayerIdentity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a room" })).toBeVisible();
  await expect(page.getByText("Addresses stay hidden until you resolve a room.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolve and join" })).toHaveCount(2);
  await expect(page.getByText(/localhost:910[12]|127\.0\.0\.1:910[12]|room-[12]:8443/)).toHaveCount(
    0,
  );

  const roomIndex = repeatIndex % 2;
  await page.getByRole("button", { name: "Resolve and join" }).nth(roomIndex).click();
  const resolutionResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/v1/rooms/resolve") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Resolve and connect" }).click();
  const resolution = await resolutionResponse;
  expect(resolution.ok()).toBe(true);
  expect(await resolution.json()).toMatchObject({
    host: "localhost",
    port: 9101 + roomIndex,
    protocol: "wss",
  });
  await expect(page.getByRole("heading", { name: "Waiting for eight players" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Mark me ready" })).toBeEnabled();
  await page.getByRole("button", { name: "Leave room" }).click();
  await expect(page.getByRole("heading", { name: "Choose a room" })).toBeVisible();
});

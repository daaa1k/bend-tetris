const { test, expect } = require("@playwright/test");

test("queued announcements finish in order and top out cannot be paused", async ({ page }) => {
  await page.addInitScript(() => { Date.now = () => 592; });
  await page.goto("/");
  await page.locator("#start").click();
  const events = await page.evaluate(async () => {
    const shown = [];
    new MutationObserver(() => shown.push(document.querySelector("#callout").textContent))
      .observe(document.querySelector("#callout"), { childList: true });
    const press = (key, count = 1) => {
      for (let i = 0; i < count; i++) document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    };
    for (const [key, count] of [["ArrowLeft", 2], ["ArrowLeft", 3], ["ArrowRight", 2], ["ArrowLeft", 2]]) {
      press(key, count);
      press(" ");
    }
    press("z");
    press("ArrowDown", 25);
    press("x");
    press(" ");
    press(" ", 25);
    press("p");
    await Promise.resolve();
    return { shown, overlayHidden: document.querySelector("#overlay").classList.contains("hidden"), title: document.querySelector("#overlay-title").textContent };
  });
  expect(events.shown).toContain("T-SPIN");
  expect(events.overlayHidden).toBe(true);
  expect(events.title).not.toBe("PAUSED");
  await expect(page.locator("#overlay-title")).toHaveText("GAME OVER", { timeout: 15000 });
  await expect(page.locator("#player-state")).toHaveText("TOPPED OUT");
});

test("pausing after a delayed interval shows top out instead of paused", async ({ page }) => {
  await page.goto("/");
  const title = await page.evaluate(() => {
    document.querySelector("#start").click();
    Object.defineProperty(performance, "now", { value: () => 1_000_000 });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true }));
    return document.querySelector("#overlay-title").textContent;
  });
  expect(title).not.toBe("PAUSED");
  await expect(page.locator("#overlay-title")).toHaveText("GAME OVER", { timeout: 15000 });
});

test("starts and accepts the core controls", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "READY?" })).toBeVisible();
  await page.getByRole("button", { name: "START GAME" }).click();
  await expect(page.locator("#overlay")).toHaveClass(/hidden/);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("z");
  await page.keyboard.press("x");
  await page.keyboard.press("Space");
  await expect(page.locator("#score")).not.toHaveText("000000");
  expect(errors).toEqual([]);
});

test("pause and resume work through the existing keyboard and button controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "START GAME" }).click();
  await page.keyboard.press("p");
  await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();
  await page.getByRole("button", { name: "RESUME" }).click();
  await expect(page.locator("#overlay")).toHaveClass(/hidden/);
  await page.keyboard.press("p");
  await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();
  await page.keyboard.press("p");
  await expect(page.locator("#overlay")).toHaveClass(/hidden/);
});

test("starts VS JEV and applies a typed Jev choice", async ({ page }) => {
  await page.route("**/api/jev/status", route => route.fulfill({ json: { configured: true } }));
  await page.route("**/api/jev/move", async route => {
    const request = route.request().postDataJSON();
    const choice = Object.keys(request.candidates)[0];
    await route.fulfill({ json: { choice, confidence: 0.82 } });
  });

  await page.goto("/");
  await expect(page.locator("#jev-status")).toHaveText("JEV ONLINE");
  await page.getByRole("button", { name: "VS JEV" }).click();
  await page.getByRole("button", { name: "START GAME" }).click();

  await expect(page.locator("#jev-board-wrap")).toBeVisible();
  await expect(page.locator("#jev-confidence")).toHaveText("82%");
  await expect(page.locator("#jev-score")).not.toHaveText("000000");
});

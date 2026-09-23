const { test, expect } = require("@playwright/test");

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

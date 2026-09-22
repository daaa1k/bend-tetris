const { test, expect } = require("@playwright/test");

test("starts and accepts the core controls", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "READY?" })).toBeVisible();
  await page.getByRole("button", { name: "START GAME" }).click();
  await expect(page.locator("#overlay")).toHaveClass(/hidden/);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await expect(page.locator("#score")).not.toHaveText("000000");
  expect(errors).toEqual([]);
});

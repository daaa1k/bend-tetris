const { test, expect } = require("@playwright/test");

test("browser-built Bend rules drive the public progression interface", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const progression = window.createActualProgression(1, 0);
    const start = progression.view();
    const moved = progression.dispatch("left", 10).state;
    const rotated = progression.dispatch("rotate-right", 20).state;
    const landed = progression.dispatch("drop", 30);
    return { start, moved, rotated, landed };
  });
  expect(actual.start.active.piece).toBe(2);
  expect(actual.moved.active.x).toBe(2);
  expect(actual.rotated.active.rotation).toBe(1);
  expect(actual.landed.state.score).toBe(36);
  expect(actual.landed.state.board.flat().filter(cell => cell !== -1)).toHaveLength(4);
  expect(actual.landed.state.board[19][3]).toBe(2);
  expect(actual.landed.events).toEqual([{ type: "lock" }]);
});

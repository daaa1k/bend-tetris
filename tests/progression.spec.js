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

test("browser-built rules expose held, next, and active pieces through a hold swap", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const progression = window.createActualProgression(1, 0);
    const start = progression.view();
    const firstHold = progression.dispatch("hold", 10).state;
    const blockedHold = progression.dispatch("hold", 20).state;
    progression.dispatch("drop", 30);
    const beforeSwap = progression.view();
    const swapped = progression.dispatch("hold", 40).state;
    return { start, firstHold, blockedHold, beforeSwap, swapped };
  });
  expect(actual.firstHold.held).toBe(actual.start.active.piece);
  expect(actual.firstHold.active.piece).toBe(actual.start.queue[0]);
  expect(actual.firstHold.queue.slice(0, 2)).toEqual(actual.start.queue.slice(1));
  expect(actual.blockedHold).toEqual(actual.firstHold);
  expect(actual.swapped.held).toBe(actual.beforeSwap.active.piece);
  expect(actual.swapped.active.piece).toBe(actual.start.active.piece);
  expect(actual.swapped.queue).toEqual(actual.beforeSwap.queue);
});

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

test("pause preserves the remaining gravity interval through inputs and time updates", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(1, 0);
    const before = play.tick(300).state;
    play.pause(300);
    const input = play.dispatch("down", 1000);
    const elapsed = play.tick(5000);
    const resumed = play.resume(5000);
    const early = play.tick(5484);
    const fall = play.tick(5485);
    return { before, input, elapsed, resumed, early, fall };
  });
  expect(actual.input.events).toEqual([]);
  expect(actual.input.state).toEqual(actual.before);
  expect(actual.elapsed.state).toEqual(actual.before);
  expect(actual.resumed.state.active.y).toBe(-1);
  expect(actual.early.state.active.y).toBe(-1);
  expect(actual.fall.state.active.y).toBe(0);
});

test("pause preserves the remaining contact delay", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(1, 0);
    while (!play.view().grounded) play.dispatch("down", 0);
    const before = play.tick(200).state;
    play.pause(200);
    const input = play.dispatch("left", 1000);
    const elapsed = play.tick(5000);
    const resumed = play.resume(5000);
    const early = play.tick(5299);
    const locked = play.tick(5300);
    return { before, input, elapsed, resumed, early, locked };
  });
  expect(actual.before.lockRemainingMs).toBe(300);
  expect(actual.input.state).toEqual(actual.before);
  expect(actual.elapsed.state).toEqual(actual.before);
  expect(actual.resumed.state.lockRemainingMs).toBe(300);
  expect(actual.early.events).toEqual([]);
  expect(actual.early.state.lockRemainingMs).toBe(1);
  expect(actual.locked.events).toEqual([{ type: "lock" }]);
});

test("a rotated T with only two blocked corners is not a T spin", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(14, 0);
    const piece = play.view().active.piece;
    play.dispatch("rotate-left", 0);
    for (let i = 0; i < 4; i++) play.dispatch("left", 0);
    while (!play.view().grounded) play.dispatch("down", 0);
    const before = play.view();
    const landed = play.dispatch("drop", 0);
    return { piece, before, landed };
  });
  expect(actual.piece).toBe(5);
  expect(actual.before.active).toMatchObject({ x: -1, rotation: 3 });
  expect(actual.landed.events).toEqual([{ type: "lock" }]);
  expect(actual.landed.state.score).toBe(actual.before.score);
});

test("ground contact grants 500ms and at most fifteen maneuver renewals", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(1, 0);
    while (!play.view().grounded) play.dispatch("down", 0);
    const contacted = play.view(0);
    const early = play.tick(399);
    for (let i = 0; i < 15; i++) play.dispatch(i % 2 ? "left" : "right", 400 + i);
    const renewed = play.view(414);
    play.dispatch("left", 700);
    const capped = play.view(700);
    const beforeExpiry = play.tick(913);
    const expired = play.tick(914);
    return { contacted, early, renewed, capped, beforeExpiry, expired };
  });
  expect(actual.contacted.lockRemainingMs).toBe(500);
  expect(actual.early.events).toEqual([]);
  expect(actual.renewed.lockRemainingMs).toBe(500);
  expect(actual.capped.lockRemainingMs).toBe(214);
  expect(actual.beforeExpiry.events).toEqual([]);
  expect(actual.expired.events).toEqual([{ type: "lock" }]);
});

test("a rotated T spin awards Bend points and announces the result", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(592, 0);
    const place = (horizontal, count) => {
      for (let i = 0; i < count; i++) play.dispatch(horizontal, 0);
      while (!play.view().grounded) play.dispatch("down", 0);
      return play.dispatch("drop", 0);
    };
    place("left", 2);
    place("left", 3);
    place("right", 2);
    place("left", 2);
    play.dispatch("rotate-left", 0);
    while (!play.view().grounded) play.dispatch("down", 0);
    const before = play.view().score;
    play.dispatch("rotate-right", 0);
    const spin = play.dispatch("drop", 0);
    return { before, spin };
  });
  expect(actual.spin.events).toContainEqual({ type: "t-spin", lines: 0 });
  expect(actual.spin.state.score - actual.before).toBe(400);
  expect(actual.spin.state.score).toBe(485);
});

test("a T placement without rotation does not earn a spin award", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(592, 0);
    for (const [direction, count] of [["left", 2], ["left", 3], ["right", 2], ["left", 2]]) {
      for (let i = 0; i < count; i++) play.dispatch(direction, 0);
      play.dispatch("drop", 0);
    }
    return play.dispatch("drop", 0);
  });
  expect(actual.events).not.toContainEqual(expect.objectContaining({ type: "t-spin" }));
  expect(actual.state.score).toBeLessThan(400);
});

test("moving off a stack clears the former lock deadline", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(1, 0);
    play.dispatch("drop", 0);
    while (!play.view().grounded) play.dispatch("down", 100);
    const onStack = play.view(100);
    for (let i = 0; i < 4 && play.view().grounded; i++) play.dispatch("left", 200);
    const offStack = play.view(200);
    const oldDeadline = play.tick(600);
    return { onStack, offStack, oldDeadline };
  });
  expect(actual.onStack.lockRemainingMs).toBe(500);
  expect(actual.offStack.grounded).toBe(false);
  expect(actual.offStack.lockRemainingMs).toBeNull();
  expect(actual.oldDeadline.events).toEqual([]);
});

test("a completed row uses Bend scoring through the progression interface", async ({ page }) => {
  await page.goto("/progression.html");
  const actual = await page.evaluate(() => {
    const play = window.createActualProgression(4, 0);
    const settle = () => {
      while (!play.view().grounded) play.dispatch("down", 0);
      return play.dispatch("drop", 0);
    };
    play.dispatch("left", 0);
    settle();
    for (let i = 0; i < 4; i++) play.dispatch("right", 0);
    play.dispatch("rotate-left", 0);
    while (!play.view().grounded) play.dispatch("down", 0);
    play.dispatch("rotate-right", 0);
    play.dispatch("drop", 0);
    for (let i = 0; i < 3; i++) play.dispatch("left", 0);
    settle();
    play.dispatch("right", 0);
    while (!play.view().grounded) play.dispatch("down", 0);
    const before = play.view().score;
    const cleared = play.dispatch("drop", 0);
    return { before, cleared };
  });
  expect(actual.cleared.events).toContainEqual({ type: "line-clear", lines: 1 });
  expect(actual.cleared.state.lines).toBe(1);
  expect(actual.cleared.state.score - actual.before).toBe(100);
});

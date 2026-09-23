import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerProgression } from "../player-progression.mjs";

// A fixed horizontal I is enough to exercise the progression interface independently.
const rules = {
  mask: () => 0x0f00,
  next_seed: seed => (seed * 1664525 + 1013904223) >>> 0,
  level: lines => Math.floor(lines / 10),
  gravity_ms: () => 785,
  line_score: (lines, level) => [0, 100, 300, 500, 800][lines] * (level + 1),
  t_spin_score: () => 0
};

test("same seed, operations and time produce the same state and events", () => {
  const play = () => {
    const progression = createPlayerProgression(rules, 42, 0);
    return [
      progression.dispatch("left", 10),
      progression.dispatch("rotate-right", 20),
      progression.tick(785),
      progression.dispatch("down", 800),
      progression.dispatch("drop", 900)
    ];
  };
  assert.deepEqual(play(), play());
});

test("view cannot change the internal board or active piece", () => {
  const progression = createPlayerProgression(rules, 42, 0);
  const view = progression.view();
  view.board[0][0] = 6;
  view.active.x = 999;
  view.queue[0] = 99;
  assert.equal(progression.view().board[0][0], -1);
  assert.equal(progression.view().active.x, 3);
  assert.notEqual(progression.view().queue[0], 99);
});

test("soft and hard drops award points and spawn the next piece", () => {
  const progression = createPlayerProgression(rules, 42, 0);
  const first = progression.view().active.piece;
  assert.equal(progression.dispatch("down", 10).state.score, 1);
  const landed = progression.dispatch("drop", 20);
  assert.equal(landed.state.score, 37);
  assert.deepEqual(landed.events, [{ type: "lock" }]);
  assert.notEqual(landed.state.active.piece, first);
  assert.equal(landed.state.board[19].filter(cell => cell !== -1).length, 4);
});

test("gravity and contact delay use supplied time", () => {
  const progression = createPlayerProgression(rules, 42, 0);
  assert.equal(progression.tick(784).state.active.y, -1);
  assert.equal(progression.tick(785).state.active.y, 0);
  const landed = progression.dispatch("drop", 800);
  assert.equal(landed.events[0].type, "lock");
});

test("hold shows the held, next, and active pieces and permits one hold per piece", () => {
  const progression = createPlayerProgression(rules, 42, 0);
  const start = progression.view();
  const first = progression.dispatch("hold", 10);
  assert.equal(first.state.held, start.active.piece);
  assert.equal(first.state.active.piece, start.queue[0]);
  assert.deepEqual(first.state.queue.slice(0, 2), start.queue.slice(1));
  assert.equal(first.state.canHold, false);
  assert.deepEqual(progression.dispatch("hold", 20).state, first.state);

  progression.dispatch("drop", 30);
  const beforeExchange = progression.view();
  const exchanged = progression.dispatch("hold", 40);
  assert.equal(exchanged.state.active.piece, first.state.held);
  assert.equal(exchanged.state.held, beforeExchange.active.piece);
  assert.deepEqual(exchanged.state.queue, beforeExchange.queue);
  assert.deepEqual(exchanged.state.active, { piece: first.state.held, rotation: 0, x: 3, y: -1 });
  assert.equal(exchanged.state.canHold, false);
});

test("hold exchange starts a fresh contact delay and gravity interval", () => {
  const progression = createPlayerProgression(rules, 42, 0);
  progression.dispatch("hold", 10);
  progression.dispatch("drop", 20);
  for (let i = 0; i < 18; i++) progression.dispatch("down", 100 + i);
  const contact = progression.tick(200);
  assert.equal(contact.state.grounded, true);
  assert.equal(contact.state.lockRemainingMs, 500);
  const exchanged = progression.dispatch("hold", 600);
  assert.equal(exchanged.state.lockRemainingMs, null);
  assert.equal(exchanged.state.grounded, false);
  assert.equal(progression.tick(800).state.active.y, -1);
});

test("holding into an obstructed spawn position tops out", () => {
  const progression = createPlayerProgression({
    ...rules,
    mask: piece => piece === 6 ? 0x0f00 : 0xf000
  }, 2, 0);
  assert.equal(progression.view().active.piece, 6);
  progression.dispatch("hold", 1);
  for (let i = 0; i < 20; i++) {
    const landed = progression.dispatch("drop", i + 2);
    assert.equal(landed.state.running, true);
  }
  const before = progression.view();
  assert.notEqual(before.active.piece, 6);
  assert.notEqual(before.board[0][3], -1);
  const exchanged = progression.dispatch("hold", 30);
  assert.deepEqual(exchanged.events, [{ type: "top-out" }]);
  assert.equal(exchanged.state.running, false);
  assert.equal(exchanged.state.active.piece, 6);
});

test("a held piece spawning on the stack receives the full contact delay", () => {
  const progression = createPlayerProgression({
    ...rules,
    mask: piece => piece === 6 ? 0x0f00 : 0xf000
  }, 2, 0);
  progression.dispatch("hold", 1);
  for (let i = 0; i < 19; i++) progression.dispatch("drop", i + 2);
  const exchanged = progression.dispatch("hold", 100);
  assert.equal(exchanged.state.running, true);
  assert.equal(exchanged.state.grounded, true);
  assert.equal(exchanged.state.lockRemainingMs, null);
  assert.equal(progression.tick(100).state.lockRemainingMs, 500);
  assert.equal(progression.tick(599).state.running, true);
  const landed = progression.tick(600);
  assert.deepEqual(landed.events, [{ type: "lock" }]);
});

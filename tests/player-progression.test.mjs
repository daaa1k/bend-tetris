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

import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  createLockState,
  observeGround,
  resetAfterManeuver
} from "../lock-delay.mjs";

test("starts a delay on contact and locks only after 500ms", () => {
  const state = createLockState();
  assert.equal(observeGround(state, true, 1000), false);
  assert.equal(observeGround(state, true, 1000 + LOCK_DELAY_MS - 1), false);
  assert.equal(observeGround(state, true, 1000 + LOCK_DELAY_MS), true);
});

test("a grounded maneuver renews the lock delay", () => {
  const state = createLockState();
  observeGround(state, true, 1000);
  resetAfterManeuver(state, true, true, 1300);
  assert.equal(state.startedAt, 1300);
  assert.equal(state.resets, 1);
  assert.equal(observeGround(state, true, 1700), false);
});

test("leaving the ground clears the active timer", () => {
  const state = createLockState();
  observeGround(state, true, 1000);
  resetAfterManeuver(state, true, false, 1200);
  assert.equal(state.startedAt, null);
});

test("the reset cap prevents infinite stalling", () => {
  const state = createLockState();
  observeGround(state, true, 1000);
  for (let i = 0; i < MAX_LOCK_RESETS; i++) {
    resetAfterManeuver(state, true, true, 1100 + i);
  }
  const cappedAt = state.startedAt;
  resetAfterManeuver(state, true, true, 9999);
  assert.equal(state.startedAt, cappedAt);
  assert.equal(state.resets, MAX_LOCK_RESETS);
});

import test from "node:test";
import assert from "node:assert/strict";
import { isTSpinPosition } from "../t-spin.mjs";

const emptyBoard = () => Array.from({ length: 20 }, () => Array(10).fill(-1));
const t = (overrides = {}) => ({ piece: 5, x: 3, y: 16, lastActionWasRotation: true, ...overrides });

test("recognizes a rotated T piece surrounded on three corners", () => {
  const board = emptyBoard();
  board[16][3] = 0;
  board[16][5] = 0;
  board[18][3] = 0;
  assert.equal(isTSpinPosition(board, t()), true);
});

test("rejects a position with only two occupied corners", () => {
  const board = emptyBoard();
  board[16][3] = 0;
  board[18][5] = 0;
  assert.equal(isTSpinPosition(board, t()), false);
});

test("requires rotation to be the last successful action", () => {
  const board = emptyBoard();
  board[16][3] = 0;
  board[16][5] = 0;
  board[18][3] = 0;
  assert.equal(isTSpinPosition(board, t({ lastActionWasRotation: false })), false);
});

test("does not classify another tetromino as a T-spin", () => {
  assert.equal(isTSpinPosition(emptyBoard(), t({ piece: 3, x: -1, y: -1 })), false);
});

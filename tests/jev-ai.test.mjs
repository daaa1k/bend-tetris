import test from "node:test";
import assert from "node:assert/strict";
import { candidateCriteria, enumeratePlacements, fallbackPlacement, landingY } from "../jev-ai.mjs";

const emptyBoard = () => Array.from({ length: 20 }, () => Array(10).fill(-1));

test("finds the floor landing for a horizontal I piece", () => {
  assert.equal(landingY(emptyBoard(), [[0, 1], [1, 1], [2, 1], [3, 1]], 0), 18);
});

test("enumerates legal placements with stable choice ids", () => {
  const rotations = [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]]
  ];
  const candidates = enumeratePlacements(emptyBoard(), rotations);
  assert.equal(candidates.length, 17);
  assert.equal(candidates[0].id, "r0x0");
  assert.ok(candidateCriteria(candidates).r0x0);
});

test("fallback prefers completing a line without holes", () => {
  const candidates = [
    { id: "bad", metrics: { lines: 0, holes: 2, aggregateHeight: 8, bumpiness: 4 } },
    { id: "clear", metrics: { lines: 1, holes: 0, aggregateHeight: 4, bumpiness: 0 } }
  ];
  assert.equal(fallbackPlacement(candidates).id, "clear");
});

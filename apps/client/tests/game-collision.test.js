import test from "node:test";
import assert from "node:assert/strict";
import { blocksColliderMove } from "../src/world/game.js";

const wall = { x: 0, z: 0, hx: 1, hz: 1 };

test("player slides along a wall instead of sticking at contact", () => {
  assert.equal(blocksColliderMove(1.3, 0.2, 1.3, 0, wall), false);
  assert.equal(blocksColliderMove(1.3, 0.2, 1.3, 0.2, wall), false);
});

test("player cannot push farther into a wall but can move away", () => {
  assert.equal(blocksColliderMove(1.25, 0, 1.3, 0, wall), true);
  assert.equal(blocksColliderMove(1.4, 0, 1.3, 0, wall), false);
});

test("a restored overlap may move toward the nearest free side", () => {
  assert.equal(blocksColliderMove(1.25, 1.2, 1.2, 1.2, wall), false);
});

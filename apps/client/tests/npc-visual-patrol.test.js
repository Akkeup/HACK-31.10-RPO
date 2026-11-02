import test from "node:test";
import assert from "node:assert/strict";
import { NpcVisualPatrol } from "../src/world/npc-visual-patrol.js";

test("visual patrol follows a broad, smooth route and pauses in place for dialogue", () => {
  const patrol = new NpcVisualPatrol(
    [
      { x: 0, z: 0 },
      { x: 4, z: -3 },
      { x: 6, z: 1 },
      { x: 2, z: 5 },
      { x: -4, z: 3 },
      { x: -3, z: -2 },
    ],
    { speed: 0.8, phase: 0.17, initialPause: 0.2, pause: 0.4 },
  );
  const positions = Array.from({ length: 1000 }, (_, i) =>
    patrol.sample(i * 0.1),
  ).filter((pose) => pose.state === "walking");
  const xs = positions.map((pose) => pose.position.x);
  const zs = positions.map((pose) => pose.position.z);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 7);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 6);

  const frozenAt = 18;
  patrol.freeze(frozenAt);
  const frozenPose = patrol.sample(frozenAt).position;
  for (const time of [20, 25, 34]) {
    const pose = patrol.sample(time).position;
    assert.ok(pose.distanceTo(frozenPose) < 1e-9);
  }
  patrol.resume(34);
  assert.ok(patrol.sample(34).position.distanceTo(frozenPose) < 1e-9);
  assert.ok(patrol.sample(35).position.distanceTo(frozenPose) > 0.01);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HumanoidGait } from "../src/world/humanoid-gait.js";
import { LocalArt } from "../src/world/local-art.js";
import config from "../src/config/local-art.json" with { type: "json" };
import walk from "../src/world/animation/polyfork-walk.json" with { type: "json" };

const keys = [
  "player",
  "guide",
  "examiner",
  "teacher-mathematics",
  "teacher-informatics",
  "teacher-history",
  "teacher-flags",
];
async function actor(key) {
  const bytes = await readFile(
    new URL("../public" + config[key].path, import.meta.url),
  );
  const template = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const art = new LocalArt({}, () => {});
  art.templates.set(key, template);
  return art.instance(key);
}
function near(actual, expected, tolerance = 2e-6) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, i) =>
    assert.ok(
      Math.abs(value - expected[i]) < tolerance,
      `${i}: ${value} != ${expected[i]}`,
    ),
  );
}

test("reference Walk is the unmodified 30-frame source clip from the Polyfork viewer", () => {
  assert.equal(
    createHash("sha256").update(JSON.stringify(walk)).digest("hex"),
    "998692f3049ba00fb658ea89584f3fc80b6d75ead013887edad7e37c71f6152c",
  );
  assert.equal(walk.times.length, 30);
  assert.equal(walk.times.at(-1), 0.9667);
});

test("all seven actual character assets reproduce source leg/torso/hip keyframes", async () => {
  for (const key of keys) {
    const model = await actor(key);
    const root = new THREE.Group();
    root.position.set(80, 0, 84);
    root.add(model);
    const gait = new HumanoidGait(model);
    const hip = gait.joints.get("Hips").position;
    assert.equal(gait.joints.size, 20, key);
    // Independent baseline: the viewer uses AnimationMixer with these source
    // tracks. Compare against it, including interpolation between keyframes.
    const reference = model.clone(true);
    const bodyBones = [
      "Hips",
      "Spine",
      "Spine1",
      "Spine2",
      "Neck",
      "Head",
      "LeftUpLeg",
      "LeftLeg",
      "LeftFoot",
      "RightUpLeg",
      "RightLeg",
      "RightFoot",
    ];
    const mixer = new THREE.AnimationMixer(reference);
    mixer
      .clipAction(
        new THREE.AnimationClip(
          "reference",
          -1,
          bodyBones.map(
            (name) =>
              new THREE.QuaternionKeyframeTrack(
                name + ".quaternion",
                walk.times,
                walk.tracks[name],
              ),
          ),
        ),
      )
      .play();
    for (const frame of [0, 3, 9, 15, 21, 28]) {
      gait.weight = 1;
      gait.time = walk.times[frame];
      gait.update("walking", 1.1, 0);
      mixer.setTime(gait.time);
      for (const name of bodyBones)
        near(
          model.getObjectByName(name).quaternion.toArray(),
          reference.getObjectByName(name).quaternion.toArray(),
        );
      near(
        model.getObjectByName("Hips").position.toArray(),
        walk.hips
          .slice(frame * 3, frame * 3 + 3)
          .map(
            (offset, axis) => hip.getComponent(axis) + (offset * hip.y) / 0.95,
          ),
      );
    }
    near(root.position.toArray(), [80, 0, 84]);
    near(model.position.toArray(), gait.origin.toArray());
    for (const time of [0.017, 0.184, 0.572, 0.944]) {
      gait.time = time;
      gait.update("walking", 1.1, 0);
      mixer.setTime(time);
      for (const name of bodyBones)
        near(
          model.getObjectByName(name).quaternion.toArray(),
          reference.getObjectByName(name).quaternion.toArray(),
        );
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(reference);
  }
});

test("reference Walk has the same pose and cadence at 30, 60 and 144 FPS", async () => {
  const results = [];
  for (const fps of [30, 60, 144]) {
    const model = await actor("player");
    const gait = new HumanoidGait(model);
    for (let frame = 0; frame < 2 * fps; frame++)
      gait.update("walking", 1.1, 1 / fps);
    results.push({
      time: gait.time,
      joints: [...gait.joints.values()].map(({ bone }) =>
        bone.quaternion.toArray(),
      ),
    });
  }
  for (const result of results.slice(1)) {
    assert.ok(Math.abs(result.time - results[0].time) < 1e-12);
    result.joints.forEach((q, i) => near(q, results[0].joints[i]));
  }
  const model = await actor("player");
  const gait = new HumanoidGait(model);
  for (let i = 0; i < 120; i++) gait.update("walking", 0.55, 1 / 60);
  assert.ok(Math.abs(gait.time - (1 % gait.duration)) < 1e-12);
});

test("reference animation returns every bone to rest and respects animation-off and sitting", async () => {
  const model = await actor("player");
  const gait = new HumanoidGait(model);
  for (let i = 0; i < 120; i++) gait.update("walking", 1.1, 1 / 60);
  for (let i = 0; i < 120; i++) gait.update("idle", 0, 1 / 60);
  for (const joint of gait.joints.values()) {
    near(joint.bone.quaternion.toArray(), joint.rest.toArray());
    near(joint.bone.position.toArray(), joint.position.toArray());
  }
  const time = gait.time;
  for (let i = 0; i < 60; i++) gait.update("walking", 1.1, 1 / 60, false);
  assert.equal(gait.time, time);
  assert.equal(gait.weight, 0);
  gait.update("sitting", 0, 1 / 60, false);
  assert.equal(gait.seated, 1);
  near(model.position.toArray(), [
    gait.origin.x,
    gait.origin.y - 0.43,
    gait.origin.z,
  ]);
  gait.update("idle", 0, 1 / 60, false);
  near(model.position.toArray(), gait.origin.toArray());
});

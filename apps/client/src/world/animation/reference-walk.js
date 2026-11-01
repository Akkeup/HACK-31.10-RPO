import * as THREE from "three";
import walk from "./polyfork-walk.json" with { type: "json" };
import { heldClip } from "./polyfork-carry.js";

// The reference viewer plays this clip at 1x. At the academy's 1.1m/s patrol
// speed we use that cadence; other speeds change playback, never physics.
export const REFERENCE_WALK_SPEED = 1.1;

export function referenceWalk(model) {
  const bones = new Map();
  model.traverse((node) => {
    if (node.isBone) bones.set(node.name, node);
  });
  const hips = bones.get("Hips");
  let carry = {};
  for (let root = hips?.parent; root; root = root.parent) {
    if (Object.hasOwn(root.userData, "carry")) {
      carry = root.userData;
      break;
    }
  }
  const source = heldClip(walk, "Walk", carry);
  const tracks = [];
  for (const [name, values] of Object.entries(source.tracks)) {
    // The reference viewer drives 20 body bones; its toe joints stay at rest.
    if (!bones.has(name) || name.endsWith("ToeBase")) continue;
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        name + ".quaternion",
        source.times,
        values,
      ),
    );
  }
  if (hips) {
    const rest = hips.position;
    const ratio = (rest.y || 0.95) / 0.95;
    const values = source.hips.map(
      (value, index) => rest.getComponent(index % 3) + value * ratio,
    );
    tracks.push(
      new THREE.VectorKeyframeTrack("Hips.position", source.times, values),
    );
  }
  return new THREE.AnimationClip("Polyfork Walk", -1, tracks);
}

import * as THREE from "three";
import {
  referenceWalk,
  referenceIdle,
  REFERENCE_WALK_SPEED,
} from "./animation/reference-walk.js";
import { actorPhase } from "./actor-seed.js";

// Exact reference keyframes, sampled locally on each independent skeleton.
// Only visual bones move: world position, navigation and collisions stay server-owned.
// Authored GLB animations still take priority in LocalArt.
export class HumanoidGait {
  constructor(model, identity = "") {
    this.model = model;
    this.origin = model.position.clone();
    this.seated = 0;
    const phase = identity ? actorPhase(identity) : 0;
    // Small stable per-character cadence differences make a crowd feel less synchronized.
    this.speedScale = identity ? 0.92 + phase * 0.16 : 1;
    this.time = 0;
    this.idleTime = 0;
    this.weight = 0;
    this.idleWeight = 0;
    this.joints = new Map();
    const clip = referenceWalk(model);
    this.duration = clip.duration;
    this.time = this.duration * phase;
    const bind = (track) => {
      const [name, property] = track.name.split(".");
      const bone = model.getObjectByName(name);
      if (!this.joints.has(name))
        this.joints.set(name, {
          bone,
          rest: bone.quaternion.clone(),
          position: bone.position.clone(),
        });
      return { bone, property, sample: track.createInterpolant() };
    };
    this.bindings = clip.tracks.map(bind);
    const idle = referenceIdle(model);
    this.idleDuration = idle.duration;
    this.idleTime = this.idleDuration * phase;
    this.idleBindings = idle.tracks.map(bind);
    this.sitting = new Map();
    for (const [name, joint] of this.joints) {
      const angle = name.endsWith("UpLeg")
        ? -Math.PI / 2
        : /^(Left|Right)Leg$/.test(name)
          ? Math.PI / 2
          : /^(Left|Right)Arm$/.test(name)
            ? -0.25
            : name.endsWith("ForeArm")
              ? -0.8
              : 0;
      if (angle)
        this.sitting.set(
          name,
          joint.rest
            .clone()
            .multiply(
              new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1, 0, 0),
                angle,
              ),
            ),
        );
    }
    this.rotation = new THREE.Quaternion();
    this.position = new THREE.Vector3();
  }

  update(state, speed, dt, enabled = true) {
    dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    speed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
    const walking = enabled && state === "walking" && speed > 0.02;
    const sitting = state === "sitting" ? 1 : 0;
    this.seated = enabled
      ? THREE.MathUtils.damp(this.seated, sitting, 14, dt)
      : sitting;
    this.weight = enabled
      ? THREE.MathUtils.damp(this.weight, walking ? 1 : 0, 12, dt)
      : 0;
    this.idleWeight = enabled
      ? THREE.MathUtils.damp(this.idleWeight, sitting ? 0 : 1, 12, dt)
      : 0;
    if (this.weight < 1e-5) this.weight = 0;
    if (1 - this.weight < 1e-5) this.weight = 1;
    if (this.idleWeight < 1e-5) this.idleWeight = 0;
    if (1 - this.idleWeight < 1e-5) this.idleWeight = 1;
    if (this.seated < 1e-5) this.seated = 0;
    if (1 - this.seated < 1e-5) this.seated = 1;
    if (walking && this.duration > 0)
      this.time =
        (this.time + (dt * speed * this.speedScale) / REFERENCE_WALK_SPEED) %
        this.duration;
    if (enabled && !sitting && this.idleDuration > 0)
      this.idleTime = (this.idleTime + dt) % this.idleDuration;

    for (const joint of this.joints.values()) {
      joint.bone.quaternion.copy(joint.rest);
      joint.bone.position.copy(joint.position);
    }
    // Same quaternion slerp / linear hip interpolation as AnimationMixer.
    // Direct sampling keeps idle/sitting blends independent of previous poses
    // and allocates nothing inside the animation loop.
    if (this.weight < 1)
      this.sample(this.idleBindings, this.idleTime, this.idleWeight);
    this.sample(this.bindings, this.time, this.weight);
    if (this.seated)
      for (const [name, joint] of this.joints) {
        joint.bone.quaternion.slerp(
          this.sitting.get(name) || joint.rest,
          this.seated,
        );
        joint.bone.position.lerp(joint.position, this.seated);
      }
    this.model.position.y = this.origin.y - 0.43 * this.seated;
  }

  sample(bindings, time, weight) {
    if (!weight) return;
    for (const binding of bindings) {
      const values = binding.sample.evaluate(time);
      if (binding.property === "quaternion")
        binding.bone.quaternion.slerp(this.rotation.fromArray(values), weight);
      else binding.bone.position.lerp(this.position.fromArray(values), weight);
    }
  }
}

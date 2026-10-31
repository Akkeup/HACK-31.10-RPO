import * as THREE from "three";

// Distance-driven fallback for the supplied humanoid skeletons with no animation clips.
// Idle never adds noise or moves the actor root. Authored clips take priority in LocalArt.
export class HumanoidGait {
  constructor(model) {
    this.model = model;
    this.origin = model.position.clone();
    this.seated = 0;
    this.phase = 0;
    this.weight = 0;
    this.joints = new Map();
    for (const name of [
      "LeftUpLeg",
      "RightUpLeg",
      "LeftLeg",
      "RightLeg",
      "LeftFoot",
      "RightFoot",
      "LeftArm",
      "RightArm",
      "LeftForeArm",
      "RightForeArm",
    ]) {
      const bone = model.getObjectByName(name);
      if (bone) this.joints.set(name, { bone, rest: bone.quaternion.clone() });
    }
    this.delta = new THREE.Quaternion();
    this.axis = new THREE.Vector3(1, 0, 0);
  }
  update(state, speed, dt, enabled = true) {
    const walking = enabled && state === "walking" && speed > 0.02;
    const sitting = state === "sitting" ? 1 : 0;
    this.seated = enabled
      ? THREE.MathUtils.damp(this.seated, sitting, 14, dt)
      : sitting;
    this.model.position.y = this.origin.y - 0.43 * this.seated;
    this.weight = THREE.MathUtils.damp(
      this.weight,
      walking ? Math.min(1, speed / 1.1) : 0,
      12,
      dt,
    );
    if (walking) this.phase += ((speed * dt) / 1.15) * Math.PI * 2;
    for (const [name, joint] of this.joints)
      joint.bone.quaternion.copy(joint.rest);
    for (const [side, offset] of [
      ["Left", 0],
      ["Right", Math.PI],
    ]) {
      const swing = Math.sin(this.phase + offset),
        w = this.weight;
      const angles = {
        UpLeg: THREE.MathUtils.lerp(
          swing * 0.32 * w,
          -Math.PI / 2,
          this.seated,
        ),
        Leg: THREE.MathUtils.lerp(
          Math.max(0, -swing) * 0.48 * w,
          Math.PI / 2,
          this.seated,
        ),
        Foot: -swing * 0.1 * w * (1 - this.seated),
        Arm: THREE.MathUtils.lerp(-swing * 0.22 * w, -0.25, this.seated),
        ForeArm: THREE.MathUtils.lerp(
          (0.08 + Math.max(0, swing) * 0.12) * w,
          -0.8,
          this.seated,
        ),
      };
      for (const [part, angle] of Object.entries(angles)) {
        const joint = this.joints.get(side + part);
        if (joint)
          joint.bone.quaternion.multiply(
            this.delta.setFromAxisAngle(this.axis, angle),
          );
      }
    }
  }
}

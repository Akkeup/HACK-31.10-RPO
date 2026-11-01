import * as THREE from "three";

// Presentation-only routes for LAN servers that publish static NPC snapshots.
// The server still owns NPC identity, interaction state, and range validation.
export class NpcVisualPatrol {
  constructor(points, options = {}) {
    if (typeof options === "number") options = { speed: options };
    this.points = points.map((point) => new THREE.Vector3(point.x, 0, point.z));
    this.speed = options.speed ?? 0.85;
    this.phase = options.phase ?? 0;
    this.initialPause = options.initialPause ?? 1.2;
    this.pause = options.pause ?? 1.6;
    this.segments = [];
    this.cycle = this.initialPause;
    for (let i = 0; i < this.points.length; i++) {
      const from = this.points[i];
      const to = this.points[(i + 1) % this.points.length];
      const duration = from.distanceTo(to) / this.speed;
      this.segments.push({ from, to, duration });
      this.cycle += duration + this.pause;
    }
  }

  sample(time) {
    if (this.points.length < 2 || !this.cycle) return null;
    const offset = this.cycle * this.phase;
    let t = (((time + offset) % this.cycle) + this.cycle) % this.cycle;
    if (t < this.initialPause)
      return { position: this.points[0], heading: 0, state: "idle" };
    t -= this.initialPause;
    for (const segment of this.segments) {
      if (t <= segment.duration) {
        const alpha = segment.duration > 0 ? t / segment.duration : 1;
        return {
          position: segment.from.clone().lerp(segment.to, alpha),
          heading: Math.atan2(
            segment.to.x - segment.from.x,
            segment.to.z - segment.from.z,
          ),
          state: "walking",
        };
      }
      t -= segment.duration;
      if (t <= this.pause)
        return { position: segment.to, heading: 0, state: "idle" };
      t -= this.pause;
    }
    return { position: this.points[0], heading: 0, state: "idle" };
  }
}

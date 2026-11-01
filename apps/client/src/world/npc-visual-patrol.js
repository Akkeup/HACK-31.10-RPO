import * as THREE from "three";

// Presentation-only routes for LAN servers that publish static NPC snapshots.
// The server still owns NPC identity, interaction state, and range validation.
export class NpcVisualPatrol {
  constructor(points, speed = 0.85) {
    this.points = points.map((point) => new THREE.Vector3(point.x, 0, point.z));
    this.speed = speed;
    this.initialPause = 1.2;
    this.pause = 1.6;
    this.segments = [];
    this.cycle = this.initialPause;
    for (let i = 0; i < this.points.length; i++) {
      const from = this.points[i];
      const to = this.points[(i + 1) % this.points.length];
      const duration = from.distanceTo(to) / speed;
      this.segments.push({ from, to, duration });
      this.cycle += duration + this.pause;
    }
  }

  sample(time) {
    if (this.points.length < 2 || !this.cycle) return null;
    let t = ((time % this.cycle) + this.cycle) % this.cycle;
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

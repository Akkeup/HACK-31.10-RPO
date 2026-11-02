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
    this.timeOffset = 0;
    this.frozenAt = null;
    this.curve = new THREE.CatmullRomCurve3(
      this.points,
      true,
      "centripetal",
      0.35,
    );
    this.segments = [];
    this.cycle = this.initialPause;
    for (let i = 0; i < this.points.length; i++) {
      const from = this.points[i];
      const to = this.points[(i + 1) % this.points.length];
      const duration = from.distanceTo(to) / this.speed;
      const pause = this.pause * (0.72 + ((i * 37 + 13) % 7) * 0.09);
      this.segments.push({ from, to, duration, pause, index: i });
      this.cycle += duration + pause;
    }
  }

  sample(time) {
    if (this.points.length < 2 || !this.cycle) return null;
    time = this.frozenAt == null ? time - this.timeOffset : this.frozenAt;
    const offset = this.cycle * this.phase;
    let t = (((time + offset) % this.cycle) + this.cycle) % this.cycle;
    if (t < this.initialPause)
      return { position: this.points[0], heading: 0, state: "idle" };
    t -= this.initialPause;
    for (const segment of this.segments) {
      if (t <= segment.duration) {
        const raw = segment.duration > 0 ? t / segment.duration : 1;
        // Gentle acceleration and deceleration keep turns from looking mechanical.
        const alpha = raw * raw * (3 - 2 * raw);
        const curveT = (segment.index + alpha) / this.points.length;
        const heading = this.curve.getTangent(curveT);
        return {
          position: this.curve.getPoint(curveT),
          heading: Math.atan2(heading.x, heading.z),
          state: "walking",
        };
      }
      t -= segment.duration;
      if (t <= segment.pause)
        return { position: segment.to, heading: 0, state: "idle" };
      t -= segment.pause;
    }
    return { position: this.points[0], heading: 0, state: "idle" };
  }

  freeze(time) {
    if (this.frozenAt == null) this.frozenAt = time - this.timeOffset;
  }

  resume(time) {
    if (this.frozenAt == null) return;
    this.timeOffset += Math.max(0, time - this.frozenAt - this.timeOffset);
    this.frozenAt = null;
  }
}

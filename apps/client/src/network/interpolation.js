export class SnapshotBuffer {
  constructor(delay = 120) {
    this.delay = delay;
    this.frames = [];
    this.lastTick = -1;
  }
  push(position, heading, time, tick) {
    if (tick <= this.lastTick) return;
    this.lastTick = tick;
    this.frames.push({ position: [...position], heading, time });
    if (this.frames.length > 24) this.frames.shift();
  }
  sample(now) {
    if (!this.frames.length) return null;
    const target = now - this.delay;
    while (this.frames.length > 2 && this.frames[1].time < target)
      this.frames.shift();
    const a = this.frames[0],
      b = this.frames[1] || a;
    const alpha = Math.max(
      0,
      Math.min(1, (target - a.time) / Math.max(1, b.time - a.time)),
    );
    const angle = Math.atan2(
      Math.sin(b.heading - a.heading),
      Math.cos(b.heading - a.heading),
    );
    return {
      position: a.position.map((v, i) => v + (b.position[i] - v) * alpha),
      heading: a.heading + angle * alpha,
    };
  }
}

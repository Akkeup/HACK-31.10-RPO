import { inside } from "./collision.js";

const MIN = 66.5,
  MAX = 93.5,
  STEP = 0.5;
const SIZE = Math.round((MAX - MIN) / STEP) + 1;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = (key) => ({
  x: MIN + (key % SIZE) * STEP,
  y: 0,
  z: MIN + Math.floor(key / SIZE) * STEP,
});
const keyOf = (p) =>
  Math.round((p.x - MIN) / STEP) + Math.round((p.z - MIN) / STEP) * SIZE;

// A small four-neighbour grid is planned only on reaching a waypoint or leaving
// a seat. It keeps return paths around the table and the new library rows.
function pathTo(start, goal, boxes) {
  const blocked = (p) => boxes.some((box) => inside(p, box));
  const first = keyOf(start),
    last = keyOf(goal);
  if (blocked(point(first)) || blocked(point(last))) return [];
  const parents = new Map([[first, null]]),
    queue = [first];
  for (let cursor = 0; cursor < queue.length && !parents.has(last); cursor++) {
    const current = queue[cursor],
      x = current % SIZE,
      z = Math.floor(current / SIZE);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE) continue;
      const next = nx + nz * SIZE;
      if (parents.has(next) || blocked(point(next))) continue;
      parents.set(next, current);
      queue.push(next);
    }
  }
  if (!parents.has(last)) return [];
  const path = [];
  for (let key = last; key !== null; key = parents.get(key))
    path.push(point(key));
  path.reverse();
  path.push({ ...goal });
  // Verify off-grid connections as well; a rounded endpoint must not cut a corner.
  let previous = start;
  for (const next of path) {
    const steps = Math.max(1, Math.ceil(gap(previous, next) / 0.1));
    for (let i = 1; i <= steps; i++)
      if (
        blocked({
          x: previous.x + ((next.x - previous.x) * i) / steps,
          z: previous.z + ((next.z - previous.z) * i) / steps,
        })
      )
        return [];
    previous = next;
  }
  return path;
}

export class HallPatrol {
  constructor(route, config, delay = 0) {
    this.points = route.map(([x, z]) => ({ x, y: 0, z }));
    this.position = { ...this.points[0] };
    this.config = config;
    this.target = 1;
    this.wait = delay;
    this.path = [];
    this.yawRad = 0;
    this.state = "idle";
  }
  adopt(position) {
    if (this.position === position) return;
    this.position = position;
    this.path = [];
    this.wait = 0;
  }
  tick(dt, player, occupied, boxes) {
    this.state = "idle";
    if (occupied) {
      this.path = [];
      return;
    }
    if (gap(player, this.position) < this.config.stopDistanceM) return;
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    if (!this.path.length) {
      this.path = pathTo(this.position, this.points[this.target], boxes);
      if (!this.path.length) {
        this.wait = 1;
        return;
      }
    }
    const goal = this.path[0],
      distance = gap(goal, this.position);
    const step = Math.min(distance, this.config.speedMps * dt);
    if (distance > 0.00001) {
      const dx = goal.x - this.position.x,
        dz = goal.z - this.position.z;
      this.position.x += (dx / distance) * step;
      this.position.z += (dz / distance) * step;
      this.yawRad = Math.atan2(dx, dz);
      this.state = "walking";
    }
    if (distance <= step + 0.00001) {
      this.path.shift();
      if (!this.path.length) {
        this.target = (this.target + 1) % this.points.length;
        this.wait = this.config.pauseSeconds;
      }
    }
  }
}

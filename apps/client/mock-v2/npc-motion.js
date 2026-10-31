// Demo authority only. Real NPC positions continue to come from the server.
export class RoomNpcMotion {
  constructor(room, role = "teacher") {
    this.points = room[role + "Route"].map(([x, z]) => ({
      x: room.center.x + x,
      y: 0,
      z: room.center.z + z,
    }));
    this.position = { ...this.points[0] };
    this.target = 1;
    this.wait = 1;
    this.yawRad = 0;
    this.state = "idle";
  }
  tick(dt, player, occupied) {
    this.state = "idle";
    if (
      occupied ||
      Math.hypot(player.x - this.position.x, player.z - this.position.z) < 2.8
    )
      return;
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const goal = this.points[this.target];
    const dx = goal.x - this.position.x,
      dz = goal.z - this.position.z;
    const distance = Math.hypot(dx, dz),
      step = Math.min(distance, 1.1 * dt);
    if (distance > 0.001) {
      this.position.x += (dx / distance) * step;
      this.position.z += (dz / distance) * step;
      this.yawRad = Math.atan2(dx, dz);
      this.state = "walking";
    }
    if (distance <= step + 0.001) {
      this.target = (this.target + 1) % this.points.length;
      this.wait = 1.5;
    }
  }
}

export const inside = (point, box) =>
  Math.abs(point.x - box.x) < box.hx && Math.abs(point.z - box.z) < box.hz;

export function hubCollisionBoxes(objects = [], includeChairs = false) {
  return [
    ...[72, 88].flatMap((x) =>
      [83, 88].map((z) => ({ x, z, hx: 1.45, hz: 0.9 })),
    ),
    { x: 74, z: 90.5, hx: 2.65, hz: 0.8 },
    ...objects
      .filter(
        (o) =>
          o.collidable && (includeChairs || o.modelId !== "competition-chair"),
      )
      .map((o) => {
        const shelf = o.modelId === "reading-shelf",
          scale = o.scale ?? 1;
        const cos = Math.abs(Math.cos(o.yawRad)),
          sin = Math.abs(Math.sin(o.yawRad));
        return {
          x: o.position.x,
          z: o.position.z,
          hx: shelf
            ? scale * (cos + sin / 2) + 0.35
            : o.modelId === "competition-table"
              ? 1.8
              : o.modelId === "competition-chair"
                ? 0.65
                : 1.45,
          hz: shelf
            ? scale * (sin + cos / 2) + 0.35
            : o.modelId === "competition-table"
              ? 1.8
              : o.modelId === "competition-chair"
                ? 0.65
                : 0.85,
        };
      }),
    // Botanical pots along the walls.
    ...[67.3, 92.7].flatMap((x) =>
      [68, 91].map((z) => ({ x, z, hx: 0.65, hz: 0.65 })),
    ),
  ];
}

// A restored position can overlap newly placed furniture. Permit steps out of
// that overlap, while still rejecting entry into any other solid object.
export function moveWithCollisions(position, target, boxes) {
  for (const axis of ["x", "z"]) {
    if (target[axis] === position[axis]) continue;
    const next = { ...position, [axis]: target[axis] };
    const blocked = boxes.some((box) => {
      if (!inside(next, box)) return false;
      if (!inside(position, box)) return true;
      return (
        Math.abs(next[axis] - box[axis]) <= Math.abs(position[axis] - box[axis])
      );
    });
    if (!blocked) position[axis] = target[axis];
  }
}

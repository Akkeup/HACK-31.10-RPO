// All bays of a published thematic row share the existing library book IDs.
export const matchesShelf = (placement, shelfId) =>
  placement.modelId === "reading-shelf" &&
  (placement.id === shelfId || placement.id.startsWith(shelfId + "-stack-"));

export function closestShelfPoint(placement, point) {
  const scale = placement.scale ?? 1;
  const yaw = placement.yawRad ?? 0;
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  const dx = point.x - placement.position.x;
  const dz = point.z - placement.position.z;
  const x = Math.max(-scale, Math.min(scale, dx * cos - dz * sin));
  const z = Math.max(-scale / 2, Math.min(scale / 2, dx * sin + dz * cos));
  return {
    x: placement.position.x + x * cos + z * sin,
    y: placement.position.y,
    z: placement.position.z - x * sin + z * cos,
  };
}

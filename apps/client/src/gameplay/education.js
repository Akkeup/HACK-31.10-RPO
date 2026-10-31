// Modules sharing a position use one visible examiner and the existing per-module quiz targets.
export function examinerGroups(stations) {
  const groups = new Map();
  for (const station of stations) {
    const p = station.examinerPosition,
      key = [p.x, p.y, p.z].join(":");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(station);
  }
  return [...groups.values()];
}

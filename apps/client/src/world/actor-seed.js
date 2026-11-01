// Stable variation keeps NPC movement distinct while matching across clients.
export function actorPhase(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

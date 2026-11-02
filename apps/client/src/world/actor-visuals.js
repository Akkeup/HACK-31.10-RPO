// Rendering choice only. Player identity, activity and pose remain server-owned.
export function actorVisualKey(root, config) {
  if (root.userData.actorKind === "player") return "player";
  const profile = root.userData.npcProfile;
  if (profile?.npcId === "npc-guide") return "guide";
  if (profile?.role === "examiner") return "examiner";
  if (profile?.role === "teacher" && config[profile.npcId])
    return profile.npcId;
  return null;
}

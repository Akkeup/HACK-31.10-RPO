// GLB extras define available outfits; the authorized snapshot supplies role/module.
// Plain custom models remain compatible with CharacterVisualConfig.npcModelId.
export function selectNpcAppearance(body, profile = {}) {
  const variants = [];
  body.traverse((node) => {
    const spec = node.userData.npcAppearance;
    if (
      spec &&
      typeof spec.role === "string" &&
      typeof spec.moduleId === "string"
    )
      variants.push(node);
  });
  if (!variants.length) return;
  const selected =
    variants.find(
      (node) =>
        node.userData.npcAppearance.npcId === profile.npcId && profile.npcId,
    ) ||
    variants.find((node) => {
      const spec = node.userData.npcAppearance;
      return spec.role === profile.role && spec.moduleId === profile.moduleId;
    }) ||
    variants.find((node) => {
      const spec = node.userData.npcAppearance;
      return spec.role === profile.role && !spec.moduleId;
    }) ||
    variants.find((node) => node.userData.npcAppearance.role === "guide") ||
    variants[0];
  for (const node of variants) node.visible = node === selected;
}

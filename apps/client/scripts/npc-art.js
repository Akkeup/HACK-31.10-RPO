// Original low-poly costumes. One shared atlas, no textures or runtime geometry.
import * as THREE from "three";
export function npcArt() {
  const atlas = new THREE.Group();
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    round: new THREE.SphereGeometry(1, 10, 7),
    tube: new THREE.CylinderGeometry(1, 1, 1, 10),
    taper: new THREE.CylinderGeometry(0.72, 1, 1, 10),
  };
  const materials = new Map();
  function part(root, name, shape, color, position, scale, rotation = 0) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.8,
          metalness: color === 0xd9ac4c ? 0.45 : 0,
        }),
      );
    const mesh = new THREE.Mesh(geometries[shape], materials.get(color));
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    mesh.rotation.z = rotation;
    root.add(mesh);
    return mesh;
  }
  const gold = 0xd9ac4c,
    ivory = 0xeee6d3,
    ink = 0x283e48,
    skin = 0xc68e65;
  function person(name, role, moduleId, coat, trousers = ink) {
    const root = new THREE.Group();
    root.name = name;
    root.userData.npcAppearance = { role, moduleId };
    atlas.add(root);
    part(root, "torso", "taper", coat, [0, 1.18, 0], [0.29, 0.65, 0.19]);
    for (const side of [-1, 1]) {
      part(
        root,
        side < 0 ? "left_leg" : "right_leg",
        "tube",
        trousers,
        [side * 0.145, 0.44, 0],
        [0.105, 0.72, 0.115],
      );
      part(
        root,
        "shoe",
        "round",
        ink,
        [side * 0.145, 0.1, -0.045],
        [0.13, 0.105, 0.21],
      );
      part(
        root,
        "sleeve",
        "tube",
        coat,
        [side * 0.34, 1.21, 0],
        [0.105, 0.49, 0.11],
        side * 0.12,
      );
      part(
        root,
        "hand",
        "round",
        skin,
        [side * 0.37, 0.91, -0.035],
        [0.09, 0.12, 0.085],
      );
    }
    part(root, "neck", "tube", skin, [0, 1.57, 0], [0.085, 0.15, 0.085]);
    part(root, "head", "round", skin, [0, 1.84, 0], [0.215, 0.265, 0.2]);
    part(root, "nose", "round", skin, [0, 1.82, -0.194], [0.045, 0.055, 0.052]);
    for (const side of [-1, 1]) {
      part(
        root,
        "eye",
        "round",
        ink,
        [side * 0.078, 1.89, -0.183],
        [0.022, 0.028, 0.018],
      );
      part(
        root,
        "ear",
        "round",
        skin,
        [side * 0.209, 1.83, 0],
        [0.045, 0.075, 0.045],
      );
    }
    return root;
  }
  function book(root, x, color) {
    part(
      root,
      "book-cover",
      "box",
      color,
      [x, 1, -0.24],
      [0.24, 0.34, 0.085],
      -0.12,
    );
    part(
      root,
      "book-pages",
      "box",
      ivory,
      [x, 1, -0.29],
      [0.2, 0.29, 0.018],
      -0.12,
    );
  }
  function hair(root, color) {
    part(root, "hair", "round", color, [0, 2.025, 0.01], [0.224, 0.115, 0.205]);
  }
  function glasses(root) {
    for (const side of [-1, 1]) {
      part(
        root,
        "spectacle-frame",
        "round",
        gold,
        [side * 0.08, 1.895, -0.195],
        [0.073, 0.06, 0.027],
      );
      part(
        root,
        "spectacle-lens",
        "round",
        ivory,
        [side * 0.08, 1.895, -0.218],
        [0.053, 0.042, 0.009],
      );
    }
    part(
      root,
      "spectacle-bridge",
      "box",
      gold,
      [0, 1.9, -0.222],
      [0.05, 0.018, 0.018],
    );
  }
  const pharaoh = person("Pharaoh", "teacher", "history-basics", ivory, ivory);
  part(
    pharaoh,
    "linen-kilt",
    "taper",
    ivory,
    [0, 0.76, 0],
    [0.36, 0.64, 0.235],
  );
  part(pharaoh, "royal-belt", "tube", gold, [0, 1.08, 0], [0.31, 0.1, 0.205]);
  part(
    pharaoh,
    "nemes-crown",
    "round",
    0x255c86,
    [0, 2.02, 0.025],
    [0.29, 0.24, 0.23],
  );
  for (const side of [-1, 1]) {
    part(
      pharaoh,
      "nemes-drape",
      "box",
      0x255c86,
      [side * 0.255, 1.78, 0.035],
      [0.145, 0.53, 0.24],
      side * -0.08,
    );
    for (let i = 0; i < 6; i++)
      part(
        pharaoh,
        "nemes-gold-stripe",
        "box",
        gold,
        [side * 0.255, 1.55 + i * 0.08, -0.095],
        [0.145, 0.025, 0.025],
      );
  }
  part(
    pharaoh,
    "broad-collar",
    "tube",
    gold,
    [0, 1.49, -0.015],
    [0.31, 0.09, 0.22],
  );
  part(
    pharaoh,
    "lapis-collar",
    "tube",
    0x255c86,
    [0, 1.45, -0.02],
    [0.27, 0.045, 0.235],
  );
  part(
    pharaoh,
    "ceremonial-beard",
    "taper",
    gold,
    [0, 1.55, -0.19],
    [0.045, 0.23, 0.04],
  );
  part(
    pharaoh,
    "uraeus",
    "round",
    gold,
    [0, 2.13, -0.22],
    [0.037, 0.09, 0.035],
  );
  part(
    pharaoh,
    "sceptre",
    "tube",
    gold,
    [-0.47, 0.86, -0.13],
    [0.025, 1.6, 0.025],
  );
  part(
    pharaoh,
    "sceptre-top",
    "round",
    gold,
    [-0.47, 1.72, -0.13],
    [0.07, 0.11, 0.06],
  );

  const math = person("Geometer", "teacher", "math-basics", 0x685887, 0x454459);
  hair(math, 0xe1d6c4);
  glasses(math);
  part(math, "waistcoat", "box", ivory, [0, 1.26, -0.162], [0.19, 0.4, 0.04]);
  part(math, "bow-tie", "box", gold, [0, 1.48, -0.2], [0.13, 0.055, 0.04]);
  book(math, -0.36, 0x76588d);
  // A gold drafting triangle is immediately readable from the front.
  for (const [x, y, angle, length] of [
    [0.38, 1.2, 0, 0.3],
    [0.48, 1.07, Math.PI / 2, 0.22],
    [0.48, 1.2, -0.64, 0.37],
  ])
    part(
      math,
      "drafting-triangle",
      "box",
      gold,
      [x, y, -0.22],
      [0.025, length, 0.025],
      angle,
    );

  const coder = person(
    "Technologist",
    "teacher",
    "informatics-basics",
    0x245b64,
  );
  hair(coder, ink);
  part(coder, "headset-band", "box", ink, [0, 2.1, 0], [0.48, 0.05, 0.09]);
  for (const side of [-1, 1])
    part(
      coder,
      "headset",
      "round",
      0x48b9b0,
      [side * 0.24, 1.88, 0],
      [0.065, 0.11, 0.09],
    );
  part(
    coder,
    "tablet",
    "box",
    ink,
    [-0.33, 1.04, -0.25],
    [0.3, 0.38, 0.065],
    -0.12,
  );
  part(
    coder,
    "tablet-screen",
    "box",
    0x83d9c5,
    [-0.33, 1.04, -0.29],
    [0.25, 0.3, 0.01],
    -0.12,
  );
  for (let i = 0; i < 3; i++)
    part(
      coder,
      "code-line",
      "box",
      ivory,
      [-0.34, 0.97 + i * 0.065, -0.3],
      [0.14 - i * 0.025, 0.015, 0.012],
      -0.12,
    );
  part(
    coder,
    "jacket-zip",
    "box",
    0x83d9c5,
    [0, 1.25, -0.185],
    [0.025, 0.43, 0.025],
  );

  const guide = person("Sofia", "guide", "", 0x9a5944, 0x4e6254);
  guide.userData.npcAppearance.npcId = "npc-guide";
  hair(guide, 0x553b30);
  part(
    guide,
    "hair-bun",
    "round",
    0x553b30,
    [0, 1.99, 0.2],
    [0.14, 0.14, 0.14],
  );
  part(guide, "scarf", "tube", gold, [0, 1.53, 0], [0.14, 0.12, 0.14]);
  part(
    guide,
    "scarf-tail",
    "box",
    gold,
    [0.09, 1.32, -0.2],
    [0.12, 0.36, 0.04],
    -0.2,
  );
  part(
    guide,
    "satchel",
    "box",
    0x786448,
    [0.32, 0.83, 0.06],
    [0.25, 0.3, 0.17],
  );
  book(guide, -0.36, 0x4e6254);

  const examiner = person("Examiner", "examiner", "", 0x304b55);
  hair(examiner, 0xb6b1a3);
  part(
    examiner,
    "academic-gown",
    "taper",
    0x304b55,
    [0, 0.88, 0.025],
    [0.36, 0.72, 0.235],
  );
  part(examiner, "academic-cap", "box", ink, [0, 2.13, 0], [0.56, 0.055, 0.49]);
  part(
    examiner,
    "cap-tassel",
    "tube",
    gold,
    [0.25, 1.99, -0.1],
    [0.018, 0.26, 0.018],
  );
  for (const side of [-1, 1])
    part(
      examiner,
      "academic-stole",
      "box",
      gold,
      [side * 0.14, 1.24, -0.2],
      [0.065, 0.52, 0.035],
      side * -0.1,
    );
  book(examiner, -0.36, ink);
  return atlas;
}

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Graybox assets are authored at publication time, then loaded as budgeted GLB.
export function readingArt(kind) {
  const root = new THREE.Group(),
    unit = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const add = (w, h, d, color, x = 0, y = 0, z = 0) => {
    if (!mats.has(color))
      mats.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
      );
    const m = new THREE.Mesh(unit, mats.get(color));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };
  const wood = 0xccab7d,
    trim = 0x78634d,
    paper = 0xf5ecd6,
    sage = 0x6a897b;
  if (kind === "shell") {
    add(29, 0.18, 29, 0xdfc9a7, 80, -0.1, 80);
    for (let i = 0; i < 29; i++) add(0.025, 0.006, 29, 0xc2a781, 66 + i, 0, 80);
    add(29, 4.4, 0.25, paper, 80, 2.2, 65.5);
    for (const x of [65.5, 94.5]) {
      add(0.25, 0.9, 29, wood, x, 0.45, 80);
      add(0.25, 1.1, 29, paper, x, 3.85, 80);
      for (const z of [66, 72, 78, 84, 90, 94])
        add(0.32, 3.6, 0.24, trim, x, 2.2, z);
      for (const y of [1, 3.3]) add(0.32, 0.15, 29, trim, x, y, 80);
    }
    // Wide southern entrance and open roof keep first-person routes and light clear.
    for (const x of [71, 89]) add(11, 4.4, 0.25, paper, x, 2.2, 94.5);
    for (const z of [66, 73, 80, 87, 94]) add(29, 0.22, 0.22, wood, 80, 4.5, z);
    add(8, 0.012, 10, 0x8c9f8c, 80, 0.012, 83);
    add(7.7, 0.016, 9.7, 0xc7cfb7, 80, 0.018, 83);
    for (const x of [67, 93])
      for (const z of [79, 91]) {
        add(0.65, 0.55, 0.65, wood, x, 0.28, z);
        const plant = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.48, 1),
          new THREE.MeshStandardMaterial({ color: sage }),
        );
        plant.position.set(x, 0.95, z);
        root.add(plant);
      }
  } else if (kind === "shelf") {
    for (const x of [-1.3, 1.3]) add(0.12, 2.5, 0.55, trim, x, 1.25, 0);
    add(2.7, 2.5, 0.07, wood, 0, 1.25, 0.25);
    for (const y of [0.12, 0.85, 1.6, 2.45]) add(2.7, 0.1, 0.62, trim, 0, y, 0);
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 12; i++) {
        const color = [sage, 0xad755c, 0xc5ab64, 0x667b91][(i + row) % 4];
        add(
          0.13,
          0.4 + (i % 3) * 0.055,
          0.27,
          color,
          -1.13 + i * 0.2,
          0.4 + row * 0.75,
          -0.08,
        );
      }
  } else if (kind === "desk") {
    add(2.3, 0.12, 1.15, wood, 0, 0.88, 0);
    for (const x of [-1, 1])
      for (const z of [-0.43, 0.43]) add(0.1, 0.85, 0.1, trim, x, 0.43, z);
  } else if (kind === "notebook") {
    add(0.65, 0.035, 0.46, sage, 0, 0, 0);
    add(0.62, 0.02, 0.42, paper, 0, 0.026, 0);
    add(0.012, 0.025, 0.42, trim, 0, 0.04, 0);
    for (let i = 0; i < 5; i++)
      for (const x of [-0.16, 0.16])
        add(0.22, 0.002, 0.008, 0xc2bc9e, x, 0.04, -0.14 + i * 0.065);
    add(0.015, 0.02, 0.36, 0xae7655, 0.37, 0.035, 0);
  } else if (kind === "book") {
    add(0.38, 0.52, 0.075, sage, 0, 0.26, 0);
    add(0.32, 0.45, 0.079, paper, 0.015, 0.26, 0);
    add(0.04, 0.52, 0.09, trim, -0.17, 0.26, 0);
  }
  // Batch static shapes by material: detailed shelves do not cost a draw call per book.
  const batches = new Map();
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    if (!n.isMesh) return;
    const id = n.material.color.getHex();
    if (!batches.has(id)) batches.set(id, { material: n.material, geos: [] });
    batches
      .get(id)
      .geos.push(
        (n.geometry.index
          ? n.geometry.toNonIndexed()
          : n.geometry.clone()
        ).applyMatrix4(n.matrixWorld),
      );
  });
  const result = new THREE.Group();
  for (const { material, geos } of batches.values()) {
    result.add(new THREE.Mesh(mergeGeometries(geos), material));
    geos.forEach((g) => g.dispose());
  }
  return result;
}

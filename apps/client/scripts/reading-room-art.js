import * as THREE from "three";
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
    const stone = 0xe9dec9, oak = 0x9e7954, frame = 0x6f5a46;
    add(29, 0.18, 29, 0xd0b994, 80, -0.1, 80);
    for (let i = 0; i < 29; i++) {
      add(0.96, 0.018, 28.8, i % 3 ? 0xc4a37a : 0xd2b188, 66 + i, 0.005, 80);
      add(0.012, 0.02, 28.8, 0x937653, 66.49 + i, 0.018, 80);
    }
    // Full coffered ceiling with warm inset panels; its underside remains above the eye.
    add(29, 0.23, 29, 0xe7dac0, 80, 4.57, 80);
    for (const x of [66, 72, 78, 84, 90, 94])
      add(0.18, 0.22, 29, frame, x, 4.38, 80);
    for (const z of [66, 72, 78, 84, 90, 94])
      add(29, 0.22, 0.18, frame, 80, 4.38, z);
    for (const x of [69, 75, 81, 87, 92])
      for (const z of [69, 75, 81, 87, 92])
        add(4.5, 0.015, 4.5, 0xf5e9cc, x, 4.255, z);
    // Northern classroom doors are openings in a continuous stone wall.
    for (let x = 66; x <= 94; x++) {
      const door = [69, 76, 83, 90].some((center) => Math.abs(x - center) <= 1);
      if (!door) add(0.99, 4.3, 0.24, stone, x, 2.15, 65.5);
    }
    for (const x of [69, 76, 83, 90]) {
      add(3.05, 1.15, 0.24, stone, x, 3.73, 65.5);
      for (const side of [-1.48, 1.48]) add(0.22, 3.3, 0.34, frame, x + side, 1.65, 65.53);
      add(3.14, 0.2, 0.34, frame, x, 3.28, 65.53);
    }
    // Southern entrance and two side façades are closed around framed windows.
    for (let x = 66; x <= 94; x++) {
      if (Math.abs(x - 80) > 1.5) add(0.99, 4.3, 0.24, stone, x, 2.15, 94.5);
    }
    add(3.25, 1.18, 0.24, stone, 80, 3.72, 94.5);
    for (const x of [65.5, 94.5]) {
      for (let z = 66; z <= 94; z++) {
        const window = [72, 80, 88].some((center) => Math.abs(z - center) <= 1);
        if (window) {
          add(0.24, 1.1, 0.99, stone, x, 0.55, z);
          add(0.24, 1.12, 0.99, stone, x, 3.74, z);
          add(0.09, 2.1, 0.99, 0xb9d4c8, x + (x < 80 ? 0.17 : -0.17), 2.2, z);
        } else add(0.24, 4.3, 0.99, stone, x, 2.15, z);
      }
      add(0.35, 0.12, 29, oak, x + (x < 80 ? 0.12 : -0.12), 1.08, 80);
      for (const z of [68, 76, 84, 92]) {
        add(0.52, 4.2, 0.58, 0xd4c09c, x + (x < 80 ? 0.23 : -0.23), 2.1, z);
        add(0.7, 0.26, 0.72, frame, x + (x < 80 ? 0.23 : -0.23), 4.13, z);
      }
      for (const z of [72, 80, 88]) {
        const fx = x + (x < 80 ? 0.23 : -0.23);
        for (const offset of [-1.53, 1.53]) add(0.1, 2.4, 0.1, frame, fx, 2.2, z + offset);
        add(0.1, 2.4, 0.09, frame, fx, 2.2, z);
        for (const y of [1.04, 3.35]) add(0.1, 0.1, 3.16, frame, fx, y, z);
        add(0.35, 0.14, 3.35, oak, fx + (x < 80 ? 0.13 : -0.13), 1.01, z);
      }
    }
    for (const z of [65.65, 94.35]) {
      add(29, 0.76, 0.08, oak, 80, 0.38, z);
      add(29, 0.1, 0.12, frame, 80, 0.79, z);
    }
    // Reading islands frame the competition table without blocking its five seats.
    for (const x of [72, 88]) for (const z of [83, 88]) {
      add(2.35, 0.12, 1.24, oak, x, 0.82, z);
      for (const dx of [-1.03, 1.03]) for (const dz of [-0.45, 0.45])
        add(0.1, 0.75, 0.1, frame, x + dx, 0.38, z + dz);
      add(1.1, 0.04, 0.44, paper, x, 0.91, z);
      add(0.2, 0.02, 0.42, sage, x, 0.95, z);
    }
    // Information desk and botanical accents guide the player from spawn.
    add(4.6, 0.9, 0.9, oak, 74, 0.45, 90.5);
    add(4.8, 0.12, 1.05, frame, 74, 0.95, 90.5);
    for (const x of [67.3, 92.7]) for (const z of [68, 91]) {
      add(0.65, 0.54, 0.65, oak, x, 0.27, z);
      const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: sage }));
      plant.position.set(x, 0.96, z);
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
  // EXT_mesh_gpu_instancing keeps repeated architectural modules compact in GLB.
  const batches = new Map();
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    if (!n.isMesh) return;
    const id = `${n.geometry.uuid}:${n.material.color.getHex()}`;
    if (!batches.has(id)) batches.set(id, { geometry: n.geometry, material: n.material, matrices: [] });
    batches.get(id).matrices.push(n.matrixWorld.clone());
  });
  const result = new THREE.Group();
  for (const { geometry, material, matrices } of batches.values()) {
    if (matrices.length === 1) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.applyMatrix4(matrices[0]);
      result.add(mesh);
    } else {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      result.add(mesh);
    }
  }
  return result;
}

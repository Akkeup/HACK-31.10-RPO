import * as THREE from "three";
export const palette = {
  sand: 0xe5d5b5,
  stone: 0xeae1cc,
  roof: 0xb87859,
  green: 0x718462,
  dark: 0x3e5145,
};
export function mesh(geometry, color, x = 0, y = 0, z = 0) {
  const obj = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  obj.position.set(x, y, z);
  obj.castShadow = true;
  obj.receiveShadow = true;
  return obj;
}
export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z);
}
export function cylinder(a, b, h, color, x = 0, y = 0, z = 0, sides = 32) {
  return mesh(new THREE.CylinderGeometry(a, b, h, sides), color, x, y, z);
}
export function landmark(kind) {
  const root = new THREE.Group();
  if (kind === "observatory") {
    root.add(cylinder(5.7, 6, 0.8, palette.stone, 0, 0.4, 0));
    root.add(cylinder(4.7, 4.7, 4, palette.stone, 0, 2.6, 0));
    root.add(
      mesh(
        new THREE.SphereGeometry(4.85, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        palette.green,
        0,
        4.6,
        0,
      ),
    );
    root.add(cylinder(5, 5, 0.3, palette.sand, 0, 4.55, 0));
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const window = box(
        0.8,
        1.5,
        0.16,
        palette.dark,
        Math.sin(angle) * 4.7,
        2.9,
        Math.cos(angle) * 4.7,
      );
      window.rotation.y = angle;
      root.add(window);
    }
    root.add(box(1.4, 2.4, 0.2, palette.dark, 0, 1.7, 4.8));
    const telescope = cylinder(0.3, 0.4, 3, 0x56695c, 1, 7.7, 0.2);
    telescope.rotation.z = -0.65;
    root.add(telescope);
  } else {
    root.add(box(10, 0.5, 7, palette.stone, 0, 0.25, 0));
    for (const x of [-4, 4])
      for (const z of [-2.5, 2.5]) {
        root.add(cylinder(0.24, 0.3, 4, palette.stone, x, 2.5, z));
      }
    const roof = mesh(
      new THREE.ConeGeometry(7.1, 2.4, 4),
      palette.roof,
      0,
      5.4,
      0,
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.8;
    root.add(roof);
    root.add(box(6, 1.8, 0.7, 0xa88b63, 0, 1.4, -2));
    for (let i = 0; i < 12; i++)
      root.add(
        box(
          0.28,
          1.3,
          0.4,
          [0x788772, 0xab7457, 0xc7ad77][i % 3],
          -2.2 + i * 0.4,
          1.6,
          -1.5,
        ),
      );
  }
  return root;
}

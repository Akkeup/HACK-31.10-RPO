import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile } from "node:fs/promises";

// The supplied central-table GLB is oblong. Keep a genuinely round five-seat table in the prototype.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
const root = new THREE.Group();
const wood = new THREE.MeshStandardMaterial({
  color: 0xcaa36f,
  roughness: 0.85,
});
const trim = new THREE.MeshStandardMaterial({
  color: 0x465b4c,
  roughness: 0.82,
});
for (const [radius, height, y, material] of [
  [1.55, 0.14, 0.85, wood],
  [1.57, 0.035, 0.76, trim],
  [0.24, 0.72, 0.38, wood],
  [0.85, 0.1, 0.06, wood],
]) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 48),
    material,
  );
  mesh.position.y = y;
  root.add(mesh);
}
const bytes = Buffer.from(
  await new GLTFExporter().parseAsync(root, { binary: true }),
);
await writeFile(
  new URL("../public/assets/models/furniture/round-table.glb", import.meta.url),
  bytes,
);

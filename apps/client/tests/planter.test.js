import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LocalArt } from "../src/world/local-art.js";
const load = async (bytes) =>
  new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
test("supplied planter replaces both instanced pots and separate foliage even when loaded after the world", async () => {
  const bytes = await readFile(
    new URL(
      "../public/assets/models/furniture/campus-planter-box.glb",
      import.meta.url,
    ),
  );
  assert.deepEqual(
    bytes,
    await readFile(
      new URL(
        "../../../assets/models/imported/furniture/campus-planter-box.glb",
        import.meta.url,
      ),
    ),
  );
  const catalog = JSON.parse(
    await readFile(
      new URL(
        "../../../assets/world/catalog.server-only.json",
        import.meta.url,
      ),
    ),
  );
  const asset = catalog.assets.find((a) => a.resourceId === "terrain-2-2");
  const root = (
    await load(
      await readFile(
        new URL(
          "../../../assets/world/resources/" + asset.sha256 + ".glb",
          import.meta.url,
        ),
      ),
    )
  ).scene;
  root.position.set(64, 0, 64);
  root.userData.placement = { modelId: "terrain-2-2" };
  root.updateMatrixWorld(true);
  const oldLeaves = [];
  const oldPots = [];
  root.traverse((node) => {
    if (node.isInstancedMesh) {
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < node.count; i++) {
        node.getMatrixAt(i, matrix);
        const at = new THREE.Vector3().setFromMatrixPosition(
          matrix.clone().premultiply(node.matrixWorld),
        );
        if (
          [67.3, 92.7].some((x) => Math.abs(x - at.x) < 0.01) &&
          [68, 91].some((z) => Math.abs(z - at.z) < 0.01) &&
          Math.abs(at.y - 0.27) < 0.01
        )
          oldPots.push({ node, index: i });
      }
    }
    if (!node.isMesh || node.isInstancedMesh) return;
    const at = node.getWorldPosition(new THREE.Vector3());
    if (
      [67.3, 92.7].some((x) => Math.abs(x - at.x) < 0.01) &&
      [68, 91].some((z) => Math.abs(z - at.z) < 0.01)
    )
      oldLeaves.push(node);
  });
  assert.equal(oldLeaves.length, 4);
  assert.equal(oldPots.length, 4);
  const art = new LocalArt(
    {
      actors: new Map(),
      resources: { roots: new Map([["hub", { roots: [root] }]]) },
    },
    () => {},
  );
  art.applyWorld();
  assert.ok(oldLeaves.every((n) => n.visible));
  art.templates.set("planter", await load(bytes));
  art.applyWorld();
  assert.ok(oldLeaves.every((n) => !n.visible));
  for (const { node, index } of oldPots) {
    const matrix = new THREE.Matrix4();
    node.getMatrixAt(index, matrix);
    assert.equal(matrix.determinant(), 0);
  }
  const model = art.instance("planter");
  assert.equal(model.getObjectByName("coffee-cup"), undefined);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(model).min.y) < 0.0001);
  art.dispose();
});

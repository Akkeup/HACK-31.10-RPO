// Build-time artwork. Geometry is published as budgeted GLB, never embedded in the game bundle.
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readingArt } from "./reading-room-art.js";
import { mesh, box, cylinder } from "./art.js";
import { validate, validate as check } from "../src/network/protocol.js";
const root = new URL("../../../assets/", import.meta.url);
await mkdir(new URL("world/resources/", root), { recursive: true });
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const exporter = new GLTFExporter();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assets = [];
const chunks = [];
const contents = new Map();
async function asset(resourceId, bytes, mediaType = "model/gltf-binary") {
  const sha256 = hash(bytes);
  await writeFile(
    new URL(
      `world/resources/${sha256}.${mediaType === "image/svg+xml" ? "svg" : "glb"}`,
      root,
    ),
    bytes,
  );
  contents.set(sha256, bytes.length);
  const descriptor = {
    resourceId,
    sha256,
    byteSize: bytes.length,
    mediaType,
    url: `/api/v2/worlds/discovery-campus/assets/${sha256}`,
  };
  assets.push(descriptor);
  return descriptor;
}
await asset("explorer", await readFile(new URL("models/explorer.glb", root)));
const config = JSON.parse(
  await readFile(
    new URL("../apps/client/mock-v2/public-config.json", root),
    "utf8",
  ),
);
const gameplayLayout = config.values;
const { placements } = JSON.parse(
  await readFile(new URL("world/reading-room-layout.json", root), "utf8"),
);
for (const kind of ["shelf", "book", "desk", "notebook"]) {
  const imported = ["shelf", "desk"].includes(kind);
  await asset(
    "reading-" + kind,
    imported
      ? await readFile(
          new URL(`models/imported/reading-${kind}-runtime.glb`, root),
        )
      : Buffer.from(
          await exporter.parseAsync(readingArt(kind), { binary: true }),
        ),
  );
}
// Shared unit geometry keeps furniture and costumes inside the real streaming budget.
const furnitureBox = new THREE.BoxGeometry(1, 1, 1);
const furnitureMaterials = new Map();
function furniture(shape, color, position, scale) {
  if (!furnitureMaterials.has(color))
    furnitureMaterials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
  const object = new THREE.Mesh(shape, furnitureMaterials.get(color));
  object.position.fromArray(position);
  object.scale.fromArray(scale);
  return object;
}
const flag = await asset(
  "demo-flag-01",
  await readFile(new URL("textures/reading-flag.svg", root)),
  "image/svg+xml",
);
const chairArt = new THREE.Group();
chairArt.add(
  furniture(furnitureBox, 0xb99567, [0, 0.45, 0], [0.62, 0.12, 0.65]),
  furniture(furnitureBox, 0x415b50, [0, 0.8, 0.3], [0.62, 0.6, 0.09]),
);
for (const x of [-0.24, 0.24])
  for (const z of [-0.24, 0.24])
    chairArt.add(
      furniture(furnitureBox, 0x735b40, [x, 0.22, z], [0.07, 0.45, 0.07]),
    );
await asset(
  "competition-table",
  await readFile(
    new URL(
      "../apps/client/public/assets/models/furniture/round-table.glb",
      root,
    ),
  ),
);
await asset(
  "competition-chair",
  Buffer.from(await exporter.parseAsync(chairArt, { binary: true })),
);
for (let z = 0; z < 10; z++)
  for (let x = 0; x < 10; x++) {
    const group = new THREE.Group();
    let seed = (x + 11) * 1973 + (z + 7) * 9277;
    const rand = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const ground = box(
      32,
      0.2,
      32,
      new THREE.Color().setHSL(
        0.21 + rand() * 0.015,
        0.18,
        0.57 + rand() * 0.02,
      ),
      16,
      -0.2,
      16,
    );
    ground.name = "terrain";
    group.add(ground);
    if (x === 2) group.add(box(6, 0.12, 32, 0xdad0b2, 16, -0.02, 16));
    if (z === 2) group.add(box(32, 0.12, 6, 0xdad0b2, 16, -0.01, 16));
    const trunkGeo = new THREE.CylinderGeometry(0.13, 0.2, 2, 5),
      topGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b7958 }),
      topMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.24, 0.18, 0.44 + rand() * 0.08),
      });
    for (let i = 0; i < 32; i++) {
      const wx = x * 32 + rand() * 32,
        wz = z * 32 + rand() * 32;
      if (
        Math.hypot(wx - 80, wz - 80) < 26 ||
        Math.abs(wx - 80) < 4 ||
        Math.abs(wz - 80) < 4
      )
        continue;
      const tree = new THREE.Group();
      tree.name = "decor-" + i;
      const scale = 0.65 + rand() * 0.8;
      tree.position.set(wx - x * 32, 0, wz - z * 32);
      tree.scale.setScalar(scale);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1;
      const crown = new THREE.Mesh(topGeo, topMat);
      crown.position.y = 3;
      crown.scale.y = 1.15;
      crown.name = "lod-near-" + i;
      const far = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), topMat);
      far.position.copy(crown.position);
      far.scale.copy(crown.scale);
      far.name = "lod-far-" + i;
      far.visible = false;
      tree.add(trunk, crown, far);
      group.add(tree);
    }
    if (x === 2 && z === 2) {
      const hall = readingArt("shell");
      hall.position.set(-x * 32, 0, -z * 32);
      group.add(hall);
    }
    const geometries = new Map(),
      materials = new Map();
    group.traverse((object) => {
      object.userData = {};
      if (object.geometry) {
        const g = object.geometry;
        const key = createHash("sha256");
        for (const a of Object.values(g.attributes))
          key.update(
            Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength),
          );
        if (g.index) key.update(Buffer.from(g.index.array.buffer));
        const id = key.digest("hex");
        if (geometries.has(id)) object.geometry = geometries.get(id);
        else geometries.set(id, g);
      }
      if (object.material?.isMeshStandardMaterial) {
        const m = object.material;
        const id = [m.color.getHex(), m.roughness, m.metalness].join(":");
        if (materials.has(id)) object.material = materials.get(id);
        else materials.set(id, m);
      }
    });
    const buffer = Buffer.from(
      await exporter.parseAsync(group, { binary: true, onlyVisible: false }),
    );
    if (buffer.length > 1048576) throw Error("Asset exceeds 1MiB");
    const model = await asset(`terrain-${x}-${z}`, buffer);
    const chunk = {
      worldId: "discovery-campus",
      worldRevision: 1,
      chunkId: `c-${x}-${z}`,
      x,
      z,
      objects: [
        {
          id: `terrain-${x}-${z}`,
          modelId: model.resourceId,
          position: { x: x * 32, y: 0, z: z * 32 },
          yawRad: 0,
          scale: 1,
          collidable: false,
        },
      ],
      npcIds:
        x === 2 && z === 2
          ? [
              ...gameplayLayout.gameplay.education.stations.flatMap((s) => [
                s.teacherId,
                s.examinerId,
              ]),
            ]
          : [],
    };
    for (const object of placements) {
      if (
        Math.floor(object.position.x / 32) !== x ||
        Math.floor(object.position.z / 32) !== z
      )
        continue;
      const { chunkId, ...placement } = object;
      chunk.objects.push({ ...placement, scale: 1 });
    }
    validate("chunk", chunk);
    const bytes = Buffer.from(JSON.stringify(chunk) + "\n");
    const sha256 = hash(bytes);
    await writeFile(new URL(`world/resources/${sha256}.json`, root), bytes);
    contents.set(sha256, bytes.length);
    chunks.push({
      chunkId: chunk.chunkId,
      x,
      z,
      sha256,
      byteSize: bytes.length,
      url: `/api/v2/worlds/discovery-campus/chunks/${chunk.chunkId}/${sha256}`,
      assetIds: [
        ...new Set(chunk.objects.map((o) => o.modelId)),
        "explorer",
        ...(x === 2 && z === 2 ? ["demo-flag-01"] : []),
      ],
    });
  }
const totalWorldBytes = [...contents.values()].reduce((a, b) => a + b, 0);
const manifest = {
  worldId: "discovery-campus",
  worldRevision: 1,
  totalWorldBytes,
  cacheBudgetBytes: Math.floor(totalWorldBytes / 10),
  accounting: "unique-uncompressed-resource-bytes",
  maxResourceBytes: 1048576,
  maxChunkBytes: 262144,
};
validate("streaming", manifest, "manifest");
for (const chunk of chunks) {
  const ids = new Set(chunk.assetIds);
  const requiredBytes =
    chunk.byteSize +
    assets
      .filter((a) => ids.has(a.resourceId))
      .reduce((n, a) => n + a.byteSize, 0);
  if (requiredBytes > manifest.cacheBudgetBytes)
    throw Error(
      `Cannot publish ${chunk.chunkId}: ${requiredBytes}>${manifest.cacheBudgetBytes}`,
    );
}
await writeFile(
  new URL("world/catalog.server-only.json", root),
  JSON.stringify({ manifest, chunks, assets }, null, 2),
);
console.log(
  JSON.stringify({
    ...manifest,
    largestAsset: Math.max(...assets.map((a) => a.byteSize)),
  }),
);

const keep = new Set([...contents.keys()]);
for (const file of await readdir(new URL("world/resources/", root))) {
  if (!keep.has(file.split(".")[0]))
    await unlink(new URL("world/resources/" + file, root));
}

const chosen = chunks.filter((c) => c.x === 2 && c.z === 2);
const ids = new Set(chosen.flatMap((c) => c.assetIds));
const initialAssets = assets.filter((a) => ids.has(a.resourceId));
const requiredBytes = [
  ...new Map(
    [...chosen, ...initialAssets].map((d) => [d.sha256, d.byteSize]),
  ).values(),
].reduce((a, b) => a + b, 0);
if (requiredBytes > manifest.cacheBudgetBytes)
  throw Error("Demo interest exceeds budget");
const interest = {
  worldRevision: 1,
  interestRevision: 1,
  chunks: chosen,
  assets: initialAssets,
  requiredBytes,
};
validate("streaming", interest, "interest");
await writeFile(
  new URL("../apps/client/mock-v2/published.json", root),
  JSON.stringify({ manifest, interest, flag }, null, 2),
);

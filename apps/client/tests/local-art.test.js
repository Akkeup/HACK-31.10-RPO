import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import config from "../src/config/local-art.json" with { type: "json" };

test("available demo models load locally, stand on the floor, and need no remote resources", async () => {
  const loader = new GLTFLoader();
  for (const [key, entry] of Object.entries(config)) {
    assert.ok(entry.path.startsWith("/assets/models/"));
    if (!entry.available) continue;
    const bytes = await readFile(
      new URL("../public" + entry.path, import.meta.url),
    );
    const jsonLength = bytes.readUInt32LE(12);
    const document = JSON.parse(bytes.subarray(20, 20 + jsonLength));
    for (const item of [
      ...(document.buffers || []),
      ...(document.images || []),
    ])
      assert.ok(
        !item.uri || item.uri.startsWith("data:"),
        `${key} has external dependencies`,
      );
    if (document.images?.length) {
      const positions = document.accessors.filter((accessor) => accessor.type === "VEC3" && accessor.min && accessor.max);
      assert.ok(positions.length, `${key} has no bounded geometry`);
      assert.ok(positions.some((accessor) => accessor.max[1] - accessor.min[1] > 0.05));
    } else {
      const model = await loader.parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        "",
      );
      const box = new THREE.Box3().setFromObject(model.scene);
      assert.ok(Number.isFinite(box.min.y) && Number.isFinite(box.max.y));
      assert.ok(box.max.y - box.min.y > 0.05, `${key} has no visible height`);
      assert.ok(box.max.y - box.min.y < 4, `${key} is too tall for the room`);
    }
  }
});

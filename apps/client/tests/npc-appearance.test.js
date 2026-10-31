import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { selectNpcAppearance } from "../src/world/npc-appearance.js";

test("published nested GLB selects exactly one costume for each NPC, including guide override", async () => {
  const bytes = await readFile(
    new URL("../../../assets/models/scholar.glb", import.meta.url),
  );
  const { scene } = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const variants = [];
  scene.traverse((node) => {
    if (node.userData.npcAppearance) variants.push(node);
  });
  assert.equal(variants.length, 5);
  for (const [profile, name] of [
    [{ role: "teacher", moduleId: "history-basics" }, "Pharaoh"],
    [{ role: "teacher", moduleId: "math-basics" }, "Geometer"],
    [{ role: "teacher", moduleId: "informatics-basics" }, "Technologist"],
    [{ role: "examiner", moduleId: "math-basics" }, "Examiner"],
    [{ npcId: "npc-guide", role: "teacher", moduleId: "math-basics" }, "Sofia"],
    [{ role: "unknown" }, "Sofia"],
  ]) {
    selectNpcAppearance(scene, profile);
    assert.deepEqual(
      variants.filter((n) => n.visible).map((n) => n.name),
      [name],
    );
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import config from "../src/config/local-art.json" with { type: "json" };
import { actorVisualKey } from "../src/world/actor-visuals.js";
import { LocalArt } from "../src/world/local-art.js";

const source = new URL(
  "../../../assets/models/imported/pack-2/",
  import.meta.url,
);
const load = async (file) => {
  const bytes = await readFile(new URL(file, source));
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
};

test("all eight supplied GLBs are byte-identical to the import manifest and public copies", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", source)));
  assert.equal(manifest.entries.length, 8);
  for (const entry of manifest.entries) {
    const bytes = await readFile(new URL(entry.file, source));
    assert.equal(bytes.length, entry.byteSize);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
    );
    assert.deepEqual(
      await readFile(
        new URL(
          "../public/assets/models/pack-2/" + entry.file,
          import.meta.url,
        ),
      ),
      bytes,
    );
    const document = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)),
    );
    assert.ok(!(document.buffers || []).some((b) => b.uri));
    assert.ok(!(document.images || []).some((b) => b.uri));
    const model = await load(entry.file);
    const box = new THREE.Box3().setFromObject(model.scene);
    assert.ok(Number.isFinite(box.min.y) && !box.isEmpty());
    assert.equal(model.animations.length, 0);
    if (entry.file === "floor-module.glb")
      assert.ok(
        box.min.y >= 2.99,
        "The supplied 'floor' is a ceiling module at y=3",
      );
  }
});

test("LAN player visuals are selected by actor kind, independently of NPC teaching role", () => {
  const root = (userData) => ({ userData });
  assert.equal(actorVisualKey(root({ actorKind: "player" }), config), "player");
  assert.equal(
    actorVisualKey(
      root({
        actorKind: "npc",
        npcProfile: { npcId: "npc-guide", role: "teacher" },
      }),
      config,
    ),
    "guide",
  );
  assert.equal(
    actorVisualKey(
      root({
        actorKind: "npc",
        npcProfile: { npcId: "teacher-history", role: "teacher" },
      }),
      config,
    ),
    "teacher-history",
  );
  assert.equal(
    actorVisualKey(
      root({
        actorKind: "npc",
        npcProfile: { npcId: "examiner-flags", role: "examiner" },
      }),
      config,
    ),
    "examiner",
  );
  assert.equal(actorVisualKey(root({ actorKind: "npc" }), config), null);
});

test("connected players get independent skeletons, walking and seated poses without changing network coordinates", async () => {
  const actors = new Map();
  for (const id of ["player:lan-1", "player:lan-2", "self"]) {
    const root = new THREE.Group();
    root.position.set(80, 0, 85);
    root.userData = { actorKind: "player", body: new THREE.Group() };
    if (id === "self") root.visible = false;
    actors.set(id, root);
  }
  const art = new LocalArt(
    { actors, configs: { render: { animationEnabled: true } } },
    (message) => {
      throw Error(message);
    },
  );
  art.templates.set("player", await load("player.glb"));
  art.applyActors();
  const first = actors.get("player:lan-1"),
    second = actors.get("player:lan-2");
  const one = first.userData.localArt.model,
    two = second.userData.localArt.model;
  assert.notEqual(
    one.getObjectByName("LeftUpLeg"),
    two.getObjectByName("LeftUpLeg"),
  );
  assert.equal(first.userData.body.visible, false);
  assert.equal(actors.get("self").visible, false);
  for (let i = 0; i < 40; i++) art.updateActor(first, "walking", 1 / 60, 1.1);
  assert.ok(
    one
      .getObjectByName("LeftUpLeg")
      .quaternion.angleTo(two.getObjectByName("LeftUpLeg").quaternion) > 0.05,
  );
  for (let i = 0; i < 120; i++) art.updateActor(first, "sitting", 1 / 60, 0);
  assert.ok(one.position.y < -0.4);
  assert.ok(
    Math.abs(one.getObjectByName("LeftUpLeg").rotation.x + Math.PI / 2) < 0.01,
  );
  assert.deepEqual(first.position.toArray(), [80, 0, 85]);
  assert.ok(Math.abs(two.position.y) < 0.01);
  art.releaseActor(first);
  assert.equal(first.userData.localArt, null);
  assert.equal(one.children.length, 0);
  art.dispose();
});

test("computer and clean study desks share the supplied asset without extra computers or loose books", async () => {
  const art = new LocalArt({ actors: new Map() }, () => {});
  const template = await load("computer-desk.glb");
  art.templates.set("computer-desk", template);
  art.templates.set("study-desk", template);
  const computer = art.instance("computer-desk"),
    study = art.instance("study-desk");
  assert.ok(computer.getObjectByName("equipment"));
  assert.equal(study.getObjectByName("equipment"), undefined);
  assert.equal(study.getObjectByName("dressing"), undefined);
  assert.equal(computer.getObjectByName("dressing"), undefined);
  const box = new THREE.Box3().setFromObject(study);
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(box.max.y - 0.8925) < 0.001);
  art.dispose();
});

test("visual variants load and parse a shared GLB only once", async () => {
  const calls = new Map();
  const art = new LocalArt(
    {
      actors: new Map(),
      resources: { roots: new Map() },
      academyArt: { applyModel() {} },
    },
    (message) => {
      throw Error(message);
    },
  );
  art.loader.loadAsync = async (path) => {
    calls.set(path, (calls.get(path) || 0) + 1);
    return { scene: new THREE.Group(), animations: [] };
  };
  await art.preload();
  assert.equal(calls.get(config["computer-desk"].path), 1);
  assert.equal(
    art.templates.get("computer-desk"),
    art.templates.get("study-desk"),
  );
  art.dispose();
});

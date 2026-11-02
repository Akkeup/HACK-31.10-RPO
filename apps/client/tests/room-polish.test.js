import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFile } from "node:fs/promises";
import { ACADEMY_ROOMS } from "../src/world/academy-locations.js";
import { RoomNpcMotion } from "../mock-v2/npc-motion.js";
import { LocalMockAdapter } from "../mock-v2/adapter.js";
import { HumanoidGait } from "../src/world/humanoid-gait.js";
import { Game } from "../src/world/game.js";
import { lessonBlocks } from "../src/ui/reading-cards.js";

test("lesson summary removes repeated examples but preserves unique key points", async () => {
  const material = JSON.parse(
    await readFile(
      new URL("../mock-v2/material-informatics-basics.json", import.meta.url),
    ),
  );
  assert.deepEqual(
    lessonBlocks(material).map((b) => b.heading),
    ["Основные понятия", "Примеры"],
  );
  material.keyPoints.push("Уникальное дополнение.");
  assert.equal(lessonBlocks(material).at(-1).text, "1. Уникальное дополнение.");
});

test("all room patrols walk at 1.1m/s, avoid furniture and stop near a learner", () => {
  for (const room of ACADEMY_ROOMS)
    for (const role of ["teacher", "examiner"]) {
      const motion = new RoomNpcMotion(room, role),
        far = { x: room.center.x + 5, z: room.center.z + 5 };
      let walked = 0;
      for (let i = 0; i < 2000; i++) {
        const previous = { ...motion.position };
        motion.tick(0.05, far, false);
        const step = Math.hypot(
          previous.x - motion.position.x,
          previous.z - motion.position.z,
        );
        assert.ok(step <= 1.1 * 0.05 + 1e-8);
        walked += step;
        assert.equal(motion.position.y, 0);
        for (const c of room.colliders)
          assert.ok(
            Math.abs(motion.position.x - c.x) >= c.hx + 0.25 ||
              Math.abs(motion.position.z - c.z) >= c.hz + 0.25,
          );
      }
      assert.ok(walked > 25);
      const stopped = { ...motion.position };
      for (let i = 0; i < 40; i++) motion.tick(0.05, stopped, false);
      assert.deepEqual(motion.position, stopped);
      assert.equal(motion.state, "idle");
      for (let i = 0; i < 40; i++) motion.tick(0.05, far, true);
      assert.deepEqual(motion.position, stopped);
    }
});

test("each classroom has a 2x2 pupil grid with one notebook, solid desks and a clear entry", () => {
  for (const room of ACADEMY_ROOMS) {
    const desks = room.objects.filter((object) => object.student);
    assert.equal(desks.length, 4);
    const columns = [...new Set(desks.map((desk) => desk.x))].sort(
      (a, b) => a - b,
    );
    const rows = [...new Set(desks.map((desk) => desk.z))].sort(
      (a, b) => a - b,
    );
    assert.equal(columns.length, 2);
    assert.equal(rows.length, 2);
    assert.equal(columns[1] - columns[0], rows[1] - rows[0]);
    assert.equal(new Set(desks.map(({ x, z }) => `${x},${z}`)).size, 4);
    const interactive = desks.filter((desk) => desk.study);
    assert.equal(interactive.length, 1);
    assert.equal(room.notebook.x, room.center.x + interactive[0].x);
    assert.equal(room.notebook.z, room.center.z + interactive[0].z);
    const objects = Game.prototype.readingObjects.call({
      locationId: room.roomId,
      configs: { readingRoom: { shelves: [] } },
    });
    assert.equal(
      objects.filter((object) => object.kind === "notebook").length,
      1,
    );
    for (const desk of desks)
      assert.ok(
        room.colliders.some(
          (box) =>
            box.x === room.center.x + desk.x &&
            box.z === room.center.z + desk.z,
        ),
      );
    for (const point of [
      room.entry,
      room.exit,
      room.examinerSeat.position,
      room.examinerSeat.exitPosition,
    ])
      for (const box of room.colliders)
        assert.ok(
          Math.abs(point.x - box.x) >= box.hx ||
            Math.abs(point.z - box.z) >= box.hz,
        );
  }
});

test("room shelf opens its lesson via the v2 library contract, including after teacher patrol", async () => {
  const a = new LocalMockAdapter({ storage: null, latency: 0 });
  try {
    await a.initialize();
    await a.connect();
    clearInterval(a.interval);
    a.ready = true;
    const room = ACADEMY_ROOMS[1];
    a.user.player.position = { ...room.door };
    await a.enterLocation(room.roomId);
    for (let i = 0; i < 100; i++) a.tick();
    const teacher = a.teacherPose(
      a.publicConfig.values.gameplay.education.stations[1],
    );
    a.user.player.position = { ...teacher.position };
    const opened = await a.execute("lesson.open", { npcId: room.teacherId }, [
      "lesson.opened",
    ]);
    await a.execute("lesson.close", { lessonId: opened.lessonId }, [
      "activity.changed",
    ]);
    const objects = Game.prototype.readingObjects.call({
      locationId: room.roomId,
      configs: a.publicConfig.values,
    });
    assert.equal(objects.length, 2);
    const shelf = objects.find((o) => o.kind === "shelf");
    a.user.player.position = { ...shelf.position };
    const lesson = await a.execute(
      "library.open",
      { bookId: shelf.shelf.bookIds[0] },
      ["library.opened"],
    );
    assert.equal(lesson.material.module.moduleId, room.moduleId);
  } finally {
    a.close();
  }
});

test("reference gait alternates legs and restores the bind pose when animation is off", () => {
  const model = new THREE.Group();
  for (const name of [
    "LeftUpLeg",
    "RightUpLeg",
    "LeftLeg",
    "RightLeg",
    "LeftArm",
    "RightArm",
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    model.add(bone);
  }
  const gait = new HumanoidGait(model);
  for (let i = 0; i < 120; i++) gait.update("idle", 0, 1 / 60, false);
  for (const { bone, rest } of gait.joints.values())
    assert.ok(bone.quaternion.equals(rest));
  for (let i = 0; i < 20; i++) gait.update("walking", 1.1, 1 / 60);
  const left = model.getObjectByName("LeftUpLeg").rotation.x;
  const right = model.getObjectByName("RightUpLeg").rotation.x;
  assert.ok(Math.abs(left) > 0.05 && left * right < 0);
  for (let i = 0; i < 240; i++) gait.update("idle", 0, 1 / 60, false);
  for (const { bone, rest } of gait.joints.values())
    assert.ok(bone.quaternion.angleTo(rest) < 1e-6);
  assert.deepEqual(model.position.toArray(), [0, 0, 0]);
});

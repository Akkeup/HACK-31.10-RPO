import * as THREE from "three";
import { ACADEMY_ROOMS, ACADEMY_HUB } from "../src/world/academy-locations.js";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export async function runRoomChecks({ game, adapter }) {
  if (!adapter.isMock) return;
  const report = { suite: "room-assets-pack-2", checks: [], errors: [] };
  const check = (condition, name) => {
    if (!condition) throw Error(name);
    report.checks.push(name);
  };
  try {
    const canvas = game.renderer.domElement;
    let shortcuts = 0;
    const shortcut = (event) => {
      shortcuts++;
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", shortcut, true);
    try {
      canvas.focus();
      for (const [code, key] of [
        ["KeyW", "ц"],
        ["KeyA", "ф"],
        ["KeyS", "ы"],
        ["KeyD", "в"],
      ]) {
        canvas.dispatchEvent(
          new KeyboardEvent("keydown", {
            code,
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
        check(
          game.keys.has(code),
          code +
            ": physical movement key wins over page shortcuts in Russian layout",
        );
        canvas.dispatchEvent(
          new KeyboardEvent("keyup", {
            code,
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
        check(!game.keys.has(code), code + ": release clears movement");
      }
      check(
        shortcuts === 0,
        "movement keys do not reach competing page handlers",
      );
    } finally {
      document.removeEventListener("keydown", shortcut, true);
      game.keys.clear();
    }
    const beforeRight = { ...adapter.user.player.position };
    game.yaw = 0;
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyD",
        key: "в",
        bubbles: true,
        cancelable: true,
      }),
    );
    try {
      await pause(200);
      check(
        adapter.user.player.position.x > beforeRight.x + 0.1,
        "D moves right on clear floor through authoritative mock input",
      );
    } finally {
      canvas.dispatchEvent(
        new KeyboardEvent("keyup", {
          code: "KeyD",
          key: "в",
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    game.setBlocked(true, "roomqa");
    const deadline = performance.now() + 15000;
    while (
      !adapter.ready ||
      ![
        "player",
        "guide",
        "examiner",
        "door",
        "computer-desk",
        "study-desk",
        "ceiling",
        "chair",
        ...ACADEMY_ROOMS.map((r) => r.teacherId),
      ].every((key) => game.localArt?.templates.has(key))
    ) {
      if (performance.now() > deadline)
        throw Error("Timed out loading world/models");
      await pause(100);
    }
    check(
      game.others.size > 0 &&
        [...game.others.values()].every((o) => o.root.userData.localArt?.model),
      "remote player snapshots render the supplied player GLB",
    );
    check(!game.player.visible, "local first-person avatar remains hidden");
    check(
      game.npcs.get("npc-guide")?.root.userData.localArt?.model,
      "Sophia uses the supplied GLB",
    );
    for (const room of ACADEMY_ROOMS) {
      if (game.locationId !== ACADEMY_HUB) {
        const old = ACADEMY_ROOMS.find((r) => r.roomId === game.locationId);
        adapter.user.player.position = { ...old.exit };
        await game.enterLocation(ACADEMY_HUB);
      }
      adapter.user.player.position = { ...room.door };
      await game.enterLocation(room.roomId);
      await pause(200);
      const group = game.academyArt.groups.get(room.roomId);
      check(
        group.visible && group.getObjectByName("exit-door"),
        room.roomId + ": visible room and exit door",
      );
      const slots = game.academyArt.modelSlots.filter((s) => s.group === group);
      check(
        slots.filter((s) => s.key === "shelf").length === 1 &&
          slots.filter((s) => s.key === "chair").length === 1,
        room.roomId + ": one shelf and chair",
      );
      const exit = group.getObjectByName("exit-door");
      check(
        game.academyArt.modelSlots.some(
          (s) => s.key === "door" && s.group === exit && s.model,
        ),
        room.roomId + ": supplied door loaded",
      );
      check(
        group.getObjectByName("classroom-board")?.visible,
        room.roomId + ": classic wall board visible",
      );
      check(
        slots
          .filter((s) => s.key === "ceiling")
          .every(
            (s) => s.model && s.model.children.every((c) => c.isInstancedMesh),
          ),
        room.roomId + ": ceiling tiles share instanced geometry",
      );
      if (room.exhibit === "computers")
        check(
          slots.filter((s) => s.key === "computer-desk" && s.model).length ===
            1,
          "one supplied computer desk replaces its fallback",
        );
      check(
        slots.filter((s) => s.key === "study-desk" && s.model).length === 1,
        room.roomId +
          ": clean study desk reuses the supplied desk without equipment",
      );
      const objects = game.readingObjects();
      check(
        objects.length === 2 && objects.some((o) => o.kind === "shelf"),
        room.roomId + ": shelf and table interactions",
      );
      const teacher = game.npcs.get(room.teacherId);
      check(
        teacher?.root.userData.localArt?.model,
        room.roomId + ": teacher model loaded",
      );
      const tag = teacher.root.userData.tag.material.map.image;
      check(
        tag.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 0,
        room.roomId + ": transparent name background",
      );
      const heading = teacher.root.rotation.y;
      adapter.snapshot();
      check(
        teacher.root.rotation.y === heading,
        room.roomId + ": snapshot does not reset visual yaw",
      );
      const exitSign = group.children.find(
        (n) =>
          n.isMesh && n.material?.map && n.position.z > 6 && n.position.y > 3,
      );
      check(
        exitSign &&
          new THREE.Vector3(0, 0, 1).applyQuaternion(exitSign.quaternion).z <
            -0.99,
        room.roomId + ": exit text faces inward",
      );
    }
    const last = ACADEMY_ROOMS.at(-1);
    adapter.user.player.position = { ...last.exit };
    await game.enterLocation(ACADEMY_HUB);
    game.applyWorld();
    const roots = [...game.resources.roots.values()].flatMap((c) => c.roots);
    check(
      roots
        .filter((r) => r.userData.placement?.modelId === "reading-book")
        .every((r) => !r.visible),
      "standalone book props stay hidden after returning to hub",
    );
    // Let uploads/shader compilation from the four room transitions settle before timing.
    for (let i = 0; i < 60; i++)
      await new Promise((resolve) => requestAnimationFrame(resolve));
    const frames = [];
    let previous = performance.now();
    for (let i = 0; i < 90; i++)
      await new Promise((resolve) =>
        requestAnimationFrame((now) => {
          frames.push(now - previous);
          previous = now;
          resolve();
        }),
      );
    frames.sort((a, b) => a - b);
    report.frameMs = { median: frames[45], p95: frames[85] };
    report.drawCalls = game.renderer.info.render.calls;
    report.resources = game.resources.metrics;
    check(
      report.resources.resident + report.resources.reserved <=
        report.resources.budget,
      "streaming cache remains within 10% budget",
    );
  } catch (error) {
    report.errors.push(error.stack || error.message);
  } finally {
    game.setBlocked(false, "roomqa");
  }
  const panel = document.createElement("output");
  panel.id = "roomqa-result";
  panel.style.cssText =
    "position:fixed;top:100px;right:12px;z-index:9999;background:#17241be8;color:white;padding:12px;font:14px system-ui;pointer-events:none";
  panel.textContent = report.errors.length
    ? "ROOM QA FAIL: " + report.errors.join("; ")
    : `ROOM QA PASS · ${report.checks.length} checks · p95 ${report.frameMs.p95.toFixed(1)} ms`;
  document.body.append(panel);
  await fetch("/__qa/report/browser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
}

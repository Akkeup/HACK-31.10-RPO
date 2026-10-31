// DEV-only focused regressions for NPC cards, dismissal/focus and the shared examiner.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, timeout = 12000) {
  const start = performance.now();
  while (!fn()) {
    if (performance.now() - start > timeout) throw Error("Timeout");
    await pause(40);
  }
}
const assert = (value, message) => {
  if (!value) throw Error(message);
};
export async function runEducationChecks({ game, ui, adapter }) {
  if (!adapter.isMock) return;
  const panel = document.createElement("section");
  panel.style.cssText =
    "pointer-events:none;position:fixed;right:12px;top:86px;z-index:999;background:#f7f8efee;color:#304532;padding:16px;max-width:420px;max-height:28vh;overflow:auto;font:11px/1.6 monospace;border-radius:12px";
  panel.innerHTML = "<b>NPC cards / PC regression</b><p>RUNNING</p>";
  document.body.append(panel);
  const results = [],
    errors = [];
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) =>
    errors.push(String(e.reason)),
  );
  const click = (selector) => {
    const b = document.querySelector(selector);
    assert(b && !b.disabled, "Missing/disabled " + selector);
    b.click();
  };
  const key = (code) =>
    (document.activeElement || document.body).dispatchEvent(
      new KeyboardEvent("keydown", { code, bubbles: true }),
    );
  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (e) {
      results.push({ name, passed: false, error: e.message });
    }
    const line = document.createElement("p");
    line.textContent =
      (results.at(-1).passed ? "PASS " : "FAIL ") +
      name +
      (results.at(-1).error ? " — " + results.at(-1).error : "");
    panel.append(line);
  }
  async function walkTo(x, z, radius = 0.25) {
    const timer = setInterval(() => {
      const p = game.authoritative,
        dx = x - p.x,
        dz = z - p.z,
        n = Math.hypot(dx, dz);
      adapter.sendInput(n > radius ? [dx / n, dz / n] : [0, 0], 0);
    }, 50);
    try {
      await until(
        () =>
          Math.hypot(game.authoritative.x - x, game.authoritative.z - z) <
          radius + 0.15,
        20000,
      );
    } finally {
      clearInterval(timer);
      adapter.sendInput([0, 0], 0);
    }
  }
  async function assertWalk() {
    const before = game.authoritative.clone();
    key("KeyD");
    try {
      await until(() => game.authoritative.distanceTo(before) > 0.45, 2500);
    } finally {
      (document.activeElement || document.body).dispatchEvent(
        new KeyboardEvent("keyup", { code: "KeyD", bubbles: true }),
      );
    }
    assert(!game.inputBlocked, "input still locked");
  }
  async function assertClosed() {
    await until(
      () =>
        !ui.education.open &&
        !ui.education.busy &&
        game.activity.mode === "exploring",
    );
    assert(
      document.activeElement === game.renderer.domElement,
      "focus not returned",
    );
    await assertWalk();
  }
  await check(
    "One examiner, three unchanged teachers, shared chair and budget",
    async () => {
      await until(
        () => adapter.ready && ui.education.online && game.npcs.size === 5,
      );
      assert(
        [...game.npcs.values()].filter((n) => n.role === "examiner").length ===
          1,
        "examiner count",
      );
      assert(
        [...game.npcs.values()].filter(
          (n) => n.role === "teacher" && n.id !== "npc-guide",
        ).length === 3,
        "teachers",
      );
      ui.toggleSettings(false);
    },
  );
  await check("Every NPC renders its own single themed costume", async () => {
    const expected = {
      "npc-guide": "Sofia",
      "teacher-mathematics": "Geometer",
      "teacher-informatics": "Technologist",
      "teacher-history": "Pharaoh",
      "examiner-mathematics": "Examiner",
    };
    for (const [id, name] of Object.entries(expected)) {
      const visible = [];
      game.npcs.get(id).root.userData.body.traverse((node) => {
        if (node.userData.npcAppearance && node.visible)
          visible.push(node.name);
      });
      assert(visible.length === 1 && visible[0] === name, id + ": " + visible);
    }
  });
  await check(
    "Lesson has ≤4 full lines per card, no scroll, working arrows",
    async () => {
      await walkTo(86, 83.2);
      await ui.openDialogue("teacher-mathematics");
      await until(() => ui.education.lesson && !ui.education.busy);
      const first = ui.education.page,
        text = document.querySelector(".lesson-card-lines").textContent;
      assert(
        document.querySelectorAll("#education .lesson-card-line").length <= 4,
        "line count",
      );
      const body = document.querySelector("#education .competition-body");
      assert(
        body.scrollHeight <= body.clientHeight + 1,
        "vertical lesson scroll",
      );
      click("[data-education=card-next]");
      assert(ui.education.page === first + 1, "next");
      assert(
        document.querySelector(".lesson-card-lines").textContent !== text,
        "unchanged text",
      );
      click("[data-education=card-prev]");
      assert(ui.education.page === first, "back");
    },
  );
  await check(
    "E closes after arrow-button focus; movement works without another click",
    async () => {
      document.querySelector("[data-education=card-next]").focus();
      key("KeyE");
      await assertClosed();
    },
  );
  await check(
    "Reopen and Escape close server activity and restore WASD",
    async () => {
      await ui.openDialogue("teacher-mathematics");
      await until(() => ui.education.open && !ui.education.busy);
      key("Escape");
      await assertClosed();
    },
  );
  await check(
    "Close during pending lesson.open does not leave a hidden active lesson",
    async () => {
      const opening = ui.openDialogue("teacher-mathematics");
      await ui.education.dismiss();
      await opening;
      await assertClosed();
      await pause(300);
      assert(!ui.education.open, "late reopen");
    },
  );
  await check(
    "Sofia replies are paged; close restores world focus and movement",
    async () => {
      await walkTo(86, 84.3);
      await ui.openDialogue("npc-guide");
      await ui.sendMessage("Как путешествует свет?");
      assert(
        document.querySelectorAll("#messages .lesson-card-line").length <= 4,
        "reply not paged",
      );
      click("#close-dialogue");
      await assertWalk();
    },
  );
  await check(
    "Shared examiner lets the player choose all three topics",
    async () => {
      await walkTo(89, 87.8);
      const modules = ["math-basics", "informatics-basics", "history-basics"];
      for (const moduleId of modules) {
        await ui.openDialogue("examiner-mathematics");
        await until(() => !!ui.education.chooser && !ui.education.busy);
        assert(
          document.querySelectorAll("[data-education=subject]").length === 3,
          "topic choices",
        );
        click(`[data-education=subject][data-module="${moduleId}"]`);
        await until(
          () =>
            ui.education.attempt?.moduleId === moduleId && !ui.education.busy,
        );
        assert(game.inputBlocked, "quiz input not blocked");
        click("[data-education=answer]");
        await until(
          () =>
            ui.education.attempt.status === "feedback" && !ui.education.busy,
        );
        click("#education [data-education=hide]");
        await assertClosed();
        await walkTo(89, 87.8);
      }
    },
  );
  await check(
    "An open help panel keeps its own input lock when a lesson closes",
    async () => {
      await walkTo(86, 83.2);
      await ui.openDialogue("teacher-mathematics");
      await until(() => ui.education.open && !ui.education.busy);
      click("#help");
      await ui.education.dismiss();
      assert(game.inputBlocked, "other panel lock lost");
      click("#close-info");
      assert(!game.inputBlocked, "help lock leaked");
      await assertClosed();
    },
  );
  await check(
    "History lesson is translucent and retains readable cards",
    async () => {
      await walkTo(92, 79.7);
      game.yaw = Math.PI;
      game.pitch = 0;
      await ui.openDialogue("teacher-history");
      await until(() => ui.education.open && !ui.education.busy);
      const color = getComputedStyle(ui.education.root).backgroundColor;
      const alpha = Number(
        color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1],
      );
      assert(alpha >= 0.6 && alpha <= 0.8, "Panel alpha: " + color);
      assert(
        document.querySelectorAll("#education .lesson-card-line").length > 0,
        "Reading card missing",
      );
    },
  );
  await check("No uncaught browser errors", () =>
    assert(errors.length === 0, errors.join("; ")),
  );
  const times = [];
  let previous = performance.now();
  for (let i = 0; i < 60; i++) {
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    times.push(now - previous);
    previous = now;
  }
  times.sort((a, b) => a - b);
  const report = {
    results,
    errors,
    median: times[30],
    p95: times[57],
    metrics: game.resources.metrics,
  };
  panel.children[1].textContent = `COMPLETE ${results.filter((r) => r.passed).length}/${results.length} · median ${report.median.toFixed(1)}ms p95 ${report.p95.toFixed(1)}ms`;
  await fetch("/__qa/report/education", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
}

// DEV only: exercise mousedown/up gaps, live network updates and native control identity.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, timeout = 15000) {
  const t = performance.now();
  while (!fn()) {
    if (performance.now() - t > timeout) throw Error("Timeout");
    await pause(30);
  }
}
const assert = (v, m) => {
  if (!v) throw Error(m);
};
export async function runControlChecks({ game, ui, adapter }) {
  if (!adapter.isMock) return;
  const results = [],
    errors = [];
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) =>
    errors.push(String(e.reason)),
  );
  const panel = document.createElement("section");
  panel.style.cssText =
    "pointer-events:none;position:fixed;right:10px;top:84px;z-index:999;max-width:330px;max-height:20vh;overflow:auto;background:#f6f8ecee;color:#304532;border:1px solid #a4b798;border-radius:10px;padding:12px;font:10px/1.6 monospace";
  panel.innerHTML = "<b>Live pointer controls regression</b><p>RUNNING</p>";
  document.body.append(panel);
  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (e) {
      results.push({ name, passed: false, error: e.message });
    }
    const p = document.createElement("p");
    p.textContent =
      (results.at(-1).passed ? "PASS " : "FAIL ") +
      name +
      (results.at(-1).error ? " — " + results.at(-1).error : "");
    panel.append(p);
  }
  async function holdClick(selector) {
    const b = document.querySelector(selector);
    assert(b && !b.disabled, "Missing/disabled " + selector);
    b.scrollIntoView({ block: "nearest" });
    const r = b.getBoundingClientRect(),
      hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    assert(hit === b || b.contains(hit), "Control is covered: " + selector);
    b.dispatchEvent(
      new MouseEvent("mousedown", { button: 0, buttons: 1, bubbles: true }),
    );
    await pause(650);
    assert(
      b.isConnected && document.querySelector(selector) === b,
      "Control replaced while mouse held: " + selector,
    );
    b.dispatchEvent(new MouseEvent("mouseup", { button: 0, bubbles: true }));
    b.dispatchEvent(new MouseEvent("click", { button: 0, bubbles: true }));
  }
  async function walkTo(x, z) {
    const timer = setInterval(() => {
      const p = game.authoritative,
        dx = x - p.x,
        dz = z - p.z,
        n = Math.hypot(dx, dz);
      adapter.sendInput(n > 0.25 ? [dx / n, dz / n] : [0, 0], 0);
    }, 50);
    try {
      await until(
        () =>
          Math.hypot(game.authoritative.x - x, game.authoritative.z - z) < 0.4,
        20000,
      );
    } finally {
      clearInterval(timer);
      adapter.sendInput([0, 0], 0);
    }
  }
  await until(
    () => adapter.ready && ui.competition.client.online && ui.education.online,
  );
  ui.toggleSettings(false);
  const c = ui.competition.client;
  await check(
    "Lobby select, typed stake, focus and button survive snapshots and real readiness events",
    async () => {
      await until(() => !!ui.competition.table);
      ui.competition.interact();
      await until(() => c.value?.participants.length === 2 && !c.pending);
      const select = document.querySelector("[name=subject]"),
        stake = document.querySelector("[name=stake]"),
        button = document.querySelector("[data-competition=configure]");
      select.focus();
      select.value = "informatics";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      stake.value = "7";
      stake.dispatchEvent(new Event("input", { bubbles: true }));
      // Existing participant readiness produces a meaningful competition.state too.
      await pause(2000);
      assert(
        document.querySelector("[name=subject]") === select,
        "select replaced",
      );
      assert(document.activeElement === select, "select focus lost");
      assert(
        select.value === "informatics" && stake.value === "7",
        "draft reset",
      );
      assert(button.isConnected, "button replaced");
      await holdClick("[data-competition=configure]");
      await until(
        () =>
          !c.pending &&
          c.value.subject === "informatics" &&
          c.value.stakeAura === 7,
      );
    },
  );
  await check(
    "Ready/start/answer buttons work with real time between mouse down and up",
    async () => {
      await holdClick("[data-competition=ready]");
      await until(
        () => !c.pending && c.value.participants.every((p) => p.ready),
      );
      await holdClick("[data-competition=start]");
      await until(() => c.value.status === "running" && !c.pending);
      await holdClick("[data-competition=answer]");
      await until(() => !!c.accepted && !c.pending);
    },
  );
  await check(
    "Exit confirmation stays clickable while snapshots arrive",
    async () => {
      await holdClick("[data-competition=leave]");
      assert(ui.competition.confirmLeave, "no leave confirmation");
      await holdClick("[data-competition=confirm-leave]");
      await until(() => game.activity.mode === "exploring" && !c.pending);
    },
  );
  await check(
    "Teacher arrows and close control retain their DOM nodes during network traffic",
    async () => {
      await walkTo(84, 95);
      await walkTo(86, 83.2);
      await ui.openDialogue("teacher-mathematics");
      await until(() => !!ui.education.lesson && !ui.education.busy);
      const root = ui.education.root,
        next = root.querySelector("[data-education=card-next]"),
        close = root.querySelector("[data-education=hide]");
      let removals = 0;
      const observer = new MutationObserver((changes) => {
        removals += changes.reduce((n, m) => n + m.removedNodes.length, 0);
      });
      observer.observe(root, { subtree: true, childList: true });
      await pause(1200);
      observer.disconnect();
      assert(removals === 0, "snapshot DOM churn");
      assert(next.isConnected && close.isConnected, "controls replaced");
      const page = ui.education.page;
      await holdClick("[data-education=card-next]");
      assert(ui.education.page === page + 1, "next failed");
      await holdClick("[data-education=card-prev]");
      assert(ui.education.page === page, "back failed");
      await holdClick("#education [data-education=hide]");
      await until(
        () => game.activity.mode === "exploring" && !ui.education.busy,
      );
    },
  );
  await check(
    "Examiner topic and answer controls remain clickable",
    async () => {
      await walkTo(89, 87.8);
      await ui.openDialogue("examiner-mathematics");
      await until(() => !!ui.education.chooser && !ui.education.busy);
      await holdClick('[data-education=subject][data-module="history-basics"]');
      await until(
        () =>
          ui.education.attempt?.moduleId === "history-basics" &&
          !ui.education.busy,
      );
      await holdClick("[data-education=answer]");
      await until(
        () => ui.education.attempt.status === "feedback" && !ui.education.busy,
      );
      await holdClick("[data-education=next]");
      await until(
        () => ui.education.attempt.status === "active" && !ui.education.busy,
      );
      await holdClick("#education [data-education=hide]");
      await until(
        () => game.activity.mode === "exploring" && !ui.education.busy,
      );
    },
  );
  await check("No uncaught errors", () =>
    assert(errors.length === 0, errors.join("; ")),
  );
  panel.children[1].textContent = `COMPLETE ${results.filter((r) => r.passed).length}/${results.length}`;
  const link = document.createElement("a");
  link.href = "/";
  link.style.pointerEvents = "auto";
  link.textContent = "Вернуться в обычный мир";
  panel.append(link);
  await fetch("/__qa/report/controls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, errors, metrics: game.resources.metrics }),
  });
}

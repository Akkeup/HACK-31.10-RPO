// DEV-only browser-native QA. Uses real DOM controls and the shared adapter against local mock.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, timeout = 15000) {
  const start = performance.now();
  while (!fn()) {
    if (performance.now() - start > timeout) throw Error("Timeout");
    await pause(40);
  }
}
const assert = (v, m) => {
  if (!v) throw Error(m);
};
export async function runBrowserChecks({ game, ui, adapter, configs }) {
  if (!adapter.isMock) return;
  const panel = document.createElement("section");
  panel.id = "qa-report";
  panel.style.cssText =
    "pointer-events:none;position:fixed;right:10px;top:84px;max-height:25vh;overflow:auto;z-index:999;background:#fafbf5ed;color:#31422f;padding:12px;border:1px solid #7e9468;border-radius:12px;font:10px/1.5 monospace;max-width:440px";
  panel.innerHTML =
    "<b>Discovery Protocol 1.1.0 / browser checks</b><p>RUNNING</p>";
  document.body.append(panel);
  const results = [],
    errors = [];
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) =>
    errors.push(String(e.reason)),
  );
  const c = ui.competition.client;
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
  const click = (selector) => {
    const b = document.querySelector(selector);
    assert(b && !b.disabled, "Missing/disabled " + selector);
    b.click();
  };
  async function moveTo(x, z, radius = 0.4) {
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
  await check(
    "First-person WebGL, shared GLB, actors, chunks and ≤10% budget",
    async () => {
      await until(() => adapter.ready && game.resources.roots.size && c.online);
      assert(
        game.camera.fov === 70 && !game.player.visible,
        "camera/self body",
      );
      assert(
        Math.abs(
          game.camera.position.y -
            game.player.position.y -
            configs.firstPerson.standingEyeHeightM,
        ) < 0.1,
        "standing eye",
      );
      assert(game.renderer.info.render.triangles > 100, "geometry");
      assert(game.others.size >= 2, "players");
      assert(
        game.resources.metrics.used <= game.resources.metrics.budget,
        "budget",
      );
    },
  );
  await check("Live local graphics settings", () => {
    click('[data-quality="low"]');
    assert(
      game.renderer.getPixelRatio() <= 0.75 && !game.renderer.shadowMap.enabled,
      "preset",
    );
  });
  await check(
    "Player cannot read admin settings or private content",
    async () => {
      assert(!("npcBehavior" in adapter.publicConfig.values), "private config");
      let denied = false;
      try {
        await adapter.getAdminConfig();
      } catch (e) {
        denied = e.status === 403;
      }
      assert(denied, "admin allowed");
    },
  );
  await check(
    "E targets competition, seat and seated camera confirmed by server",
    async () => {
      const t = configs.gameplay.competition.tables[0];
      game.yaw = Math.PI;
      await until(() => ui.competition.table);
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }),
      );
      await until(
        () =>
          c.value?.participants.length >= 2 &&
          game.activity.mode === "seated_competition",
      );
      await pause(600);
      assert(
        Math.abs(
          game.camera.position.y - configs.firstPerson.seatedEyeHeightM,
        ) < 0.15,
        "seated eye",
      );
      assert(
        [...game.others.values()].some((o) => o.root.userData.seated),
        "no seated player",
      );
      assert(c.wallet.reservedAura === 0, "joined with automatic stake");
      assert(
        game.resources.assets.has("competition-table") &&
          game.resources.assets.has("competition-chair"),
        "furniture not budgeted",
      );
    },
  );
  await check(
    "Lobby UI edits conditions, explicitly reserves and resets readiness",
    async () => {
      await until(() => !c.pending);
      document.querySelector("[name=subject]").value = "informatics";
      document.querySelector("[name=stake]").value = "5";
      click("[data-competition=configure]");
      await until(() => !c.pending && c.value.stakeAura === 5);
      click("[data-competition=ready]");
      await until(() => !c.pending && c.wallet.reservedAura === 5);
      document.querySelector("[name=stake]").value = "6";
      click("[data-competition=configure]");
      await until(
        () =>
          !c.pending && c.value.stakeAura === 6 && c.wallet.reservedAura === 0,
      );
      assert(
        !c.value.participants.find((p) => p.playerId === adapter.playerId)
          .ready,
        "readiness retained",
      );
      click("[data-competition=ready]");
      await until(
        () => !c.pending && c.value.participants.every((p) => p.ready),
      );
      click("[data-competition=start]");
      await until(() => c.value.status === "running" && !c.pending);
      assert(
        c.wallet.balanceAura === 94 && c.wallet.reservedAura === 0,
        "stake ledger",
      );
    },
  );
  await check(
    "Answer UI blocks repeat; reconnect restores private accepted answer and wallet",
    async () => {
      const q = c.value.round.question.questionId;
      click("[data-competition=answer]");
      assert(
        [...document.querySelectorAll("[data-competition=answer]")].every(
          (b) => b.disabled,
        ),
        "repeat while pending",
      );
      await until(() => c.accepted?.questionId === q && !c.pending);
      assert(
        document
          .querySelector("#competition")
          .textContent.includes("Ответ принят"),
        "ack UI",
      );
      adapter.socket.close(1000, "QA reconnect");
      await until(() => !c.online);
      assert(
        [...document.querySelectorAll("[data-competition=answer]")].every(
          (b) => b.disabled,
        ),
        "offline answer allowed",
      );
      await until(() => c.online);
      assert(c.wallet.balanceAura === 94, "automatic restake");
      assert(
        c.accepted?.questionId === q || !c.value.round,
        "private recovery",
      );
    },
  );
  await check(
    "Five rounds, closed explanations, scores and server settlement",
    async () => {
      for (let ordinal = 1; ordinal <= c.value.questionCount; ordinal++) {
        if (ordinal > 1) {
          await until(() => c.value.round?.ordinal === ordinal && !c.pending);
          click("[data-competition=answer]");
          await until(() => !!c.accepted && !c.pending);
        }
        await until(
          () =>
            c.roundResult?.ordinal === ordinal ||
            ["finished", "cancelled"].includes(c.value.status),
          25000,
        );
        assert(
          document
            .querySelector("#competition")
            .textContent.includes("Правильный ответ"),
          "closed explanation",
        );
      }
      await until(
        () => c.value.status === "finished" && c.value.settlement && c.online,
        10000,
      );
      assert(
        c.wallet.balanceAura === (await adapter.getWallet()).balanceAura,
        "unconfirmed wallet",
      );
      assert(
        document
          .querySelector("#competition")
          .textContent.includes("ВЫПЛАТА") ||
          document
            .querySelector("#competition")
            .textContent.includes("ВОЗВРАТ"),
        "settlement UI",
      );
    },
  );
  await check(
    "Rematch requires fresh confirmation; running leave confirmation; no immediate refund",
    async () => {
      click("[data-competition=again]");
      await until(() => c.value.status === "lobby" && !c.pending);
      assert(
        !c.value.participants.find((p) => p.playerId === adapter.playerId)
          .ready && c.wallet.reservedAura === 0,
        "automatic readiness",
      );
      click("[data-competition=ready]");
      await until(
        () => !c.pending && c.value.participants.every((p) => p.ready),
      );
      click("[data-competition=start]");
      await until(() => c.value.status === "running" && !c.pending);
      const balance = c.wallet.balanceAura;
      click("[data-competition=leave]");
      assert(
        document
          .querySelector("#competition")
          .textContent.includes("Оставшиеся вопросы будут пропущены"),
        "missing warning",
      );
      assert(
        game.activity.mode === "seated_competition",
        "left before confirmation",
      );
      click("[data-competition=confirm-leave]");
      await until(() => game.activity.mode === "exploring" && !c.pending);
      assert(c.wallet.balanceAura === balance, "optimistic refund");
    },
  );
  await check(
    "Teacher lesson and examiner quiz use mandatory 1.1 events",
    async () => {
      await moveTo(84, 95, 1);
      await moveTo(86, 83.2, 0.25);
      await until(
        () => game.npcs.has("teacher-mathematics") && ui.education.online,
      );
      await ui.openDialogue("teacher-mathematics");
      await until(() => !!ui.education.lesson);
      assert(
        document
          .querySelector("#education")
          .textContent.includes("Основные понятия"),
        "material",
      );
      click("#education [data-education=hide]");
      await until(() => game.activity.mode === "exploring");
      await moveTo(89, 87.8, 0.25);
      await ui.openDialogue("examiner-mathematics");
      await until(() => !!ui.education.chooser && !ui.education.busy);
      click('[data-education=subject][data-module="math-basics"]');
      await until(() => !!ui.education.attempt && !ui.education.busy);
      click("[data-education=answer]");
      await until(() => ui.education.attempt.status === "feedback");
      assert(
        document
          .querySelector("#education")
          .textContent.includes("Следующий вопрос"),
        "quiz feedback",
      );
      click("#education [data-education=hide]");
      await until(() => game.activity.mode === "exploring");
    },
  );
  await check(
    "Chunk transition unloads resources under the same cache budget",
    async () => {
      const before = adapter.interest.interestRevision;
      await moveTo(98, 88, 0.5);
      await until(
        () => adapter.ready && adapter.interest.interestRevision > before,
      );
      assert(
        game.resources.metrics.used <=
          Math.floor(game.resources.metrics.total / 10),
        "cache",
      );
      assert(game.resources.metrics.reserved === 0, "reservations");
    },
  );
  await check(
    "Admin configuration still uses authorized API with ETag",
    async () => {
      await adapter.loginDemoAdmin();
      ui.setRole("admin");
      await until(() => adapter.ready);
      await ui.reloadAdmin();
      ui.tab = "world";
      ui.adminDraft.world.timeOfDayHours = 11;
      await ui.saveServer();
      await until(() => configs.world.timeOfDayHours === 11);
    },
  );
  await check("No uncaught browser errors", () =>
    assert(!errors.length, errors.join("; ")),
  );
  const times = [];
  let last = performance.now();
  for (let i = 0; i < 90; i++) {
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    times.push(now - last);
    last = now;
  }
  times.sort((a, b) => a - b);
  const report = {
    results,
    errors,
    median: times[45],
    p95: times[85],
    metrics: game.resources.metrics,
    calls: game.renderer.info.render.calls,
    viewport: [innerWidth, innerHeight],
  };
  window.discoveryQA = report;
  panel.children[1].textContent = `COMPLETE ${results.filter((r) => r.passed).length}/${results.length} · median ${report.median.toFixed(1)}ms p95 ${report.p95.toFixed(1)}ms`;
  await fetch("/__qa/report/browser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  ui.tab = "local";
  ui.renderSettings();
  panel.addEventListener("dblclick", () => panel.remove());
}

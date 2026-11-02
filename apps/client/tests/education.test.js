import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readingCards, lessonBlocks } from "../src/ui/reading-cards.js";
import { examinerGroups } from "../src/gameplay/education.js";
import { EducationUI } from "../src/ui/education-ui.js";
import { Game } from "../src/world/game.js";
const layout = JSON.parse(
  await readFile(
    new URL("../../../assets/world/gameplay.json", import.meta.url),
  ),
);
const pack = JSON.parse(
  await readFile(new URL("../mock/content/math-basics.json", import.meta.url)),
);
test("reading cards preserve all content, have at most four fitted lines, including long words", () => {
  for (const width of [12, 35, 70]) {
    const blocks = [
      ...lessonBlocks(pack.material),
      { heading: "Длинное слово", text: "Длинноеслово".repeat(20) },
    ];
    const cards = readingCards(blocks, (s) => Array.from(s).length, width);
    assert.ok(cards.length > 1);
    assert.equal(
      cards
        .flatMap((c) => c.lines)
        .join("")
        .replace(/\s/g, ""),
      blocks
        .map((b) => b.text)
        .join("")
        .replace(/\s/g, ""),
    );
    assert.ok(
      cards.every(
        (c) =>
          c.lines.length <= 4 &&
          c.lines.every((l) => Array.from(l).length <= width),
      ),
    );
  }
});
test("one physical examiner exposes all three configured topic targets; teachers remain separate", () => {
  const stations = layout.gameplay.education.stations,
    groups = examinerGroups(stations);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 3);
  assert.equal(new Set(stations.map((s) => s.teacherId)).size, 3);
  assert.equal(new Set(stations.map((s) => s.examinerId)).size, 3);
  assert.deepEqual(
    stations.map((s) => s.teacherPosition),
    [
      { x: 86, y: 0, z: 82 },
      { x: 89, y: 0, z: 82 },
      { x: 92, y: 0, z: 82 },
    ],
  );
});
function controller() {
  const calls = [],
    locks = new Set();
  let focused = 0;
  const c = Object.assign(Object.create(EducationUI.prototype), {
    game: {
      setBlocked(v, id) {
        if (v) locks.add(id);
        else locks.delete(id);
      },
      focusControls() {
        focused++;
      },
    },
    ui: { toast() {} },
    render() {},
    generation: 0,
    open: true,
    busy: false,
    online: true,
  });
  c.adapter = {
    ready: true,
    lastStatus: "connected",
    async execute(type, payload) {
      calls.push({ type, payload });
      c.event({
        type: "activity.changed",
        payload: {
          activity: { mode: "exploring" },
          lessonId: null,
          attemptId: null,
          revision: 2,
        },
      });
    },
  };
  return { c, calls, locks, focused: () => focused };
}
test("closing a lesson releases the server activity before restoring controls; late events do not reopen it", async () => {
  const t = controller(),
    c = t.c;
  c.activity = {
    activity: { mode: "learning" },
    lessonId: "lesson",
    revision: 1,
  };
  c.lesson = { lessonId: "lesson" };
  t.locks.add("education");
  await c.dismiss();
  assert.deepEqual(t.calls, [
    { type: "lesson.close", payload: { lessonId: "lesson" } },
  ]);
  assert.equal(c.open, false);
  assert.equal(c.hasActivity, false);
  assert.equal(t.locks.size, 0);
  assert.ok(t.focused() > 0);
  c.event({
    type: "quiz.state",
    payload: { attemptId: "past", revision: 1, status: "interrupted" },
  });
  assert.equal(c.open, false);
});
test("close pressed while lesson opens is queued and executed once after the acknowledgement", async () => {
  const t = controller(),
    c = t.c;
  let finish;
  c.adapter.execute = (type, payload) => {
    t.calls.push({ type, payload });
    if (type === "lesson.open")
      return new Promise((resolve) => {
        finish = () => {
          c.event({
            type: "lesson.opened",
            payload: { lessonId: "new", material: pack.material },
          });
          c.event({
            type: "activity.changed",
            payload: {
              activity: { mode: "learning" },
              lessonId: "new",
              revision: 1,
            },
          });
          resolve();
        };
      });
    c.event({
      type: "activity.changed",
      payload: {
        activity: { mode: "exploring" },
        lessonId: null,
        attemptId: null,
        revision: 2,
      },
    });
    return Promise.resolve();
  };
  const opening = c.send("lesson.open", { npcId: "teacher" }, [
    "lesson.opened",
  ]);
  await c.dismiss();
  assert.equal(c.closeRequested, true);
  finish();
  await opening;
  assert.deepEqual(
    t.calls.map((x) => x.type),
    ["lesson.open", "lesson.close"],
  );
  assert.equal(c.open, false);
  assert.equal(c.hasActivity, false);
});
test("closing a quiz sends quiz.leave rather than just hiding a still-seated activity", async () => {
  const t = controller(),
    c = t.c;
  c.activity = {
    activity: { mode: "seated_quiz" },
    attemptId: "attempt",
    revision: 1,
  };
  c.attempt = { attemptId: "attempt" };
  await c.dismiss();
  assert.equal(t.calls[0].type, "quiz.leave");
  assert.equal(c.open, false);
  assert.equal(c.hasActivity, false);
});
test("independent UI locks cannot unlock each other", () => {
  const previous = globalThis.document;
  globalThis.document = { exitPointerLock() {} };
  try {
    const g = { keys: new Set(), adapter: { sendInput() {} }, yaw: 0 };
    Game.prototype.setBlocked.call(g, true, "education");
    Game.prototype.setBlocked.call(g, true, "info");
    Game.prototype.setBlocked.call(g, false, "education");
    assert.equal(g.inputBlocked, true);
    Game.prototype.setBlocked.call(g, false, "info");
    assert.equal(g.inputBlocked, false);
  } finally {
    globalThis.document = previous;
  }
});

test("different quiz topics cannot occupy the same physical examiner chair concurrently", async () => {
  const { CompetitionServer } = await import("../mock/competition.js");
  const { EducationServer } = await import("../mock/education.js");
  const { command } = await import("../src/network/protocol.js");
  const { randomUUID } = await import("node:crypto");
  const config = JSON.parse(
    await readFile(new URL("../mock/config-v1.1.0.json", import.meta.url)),
  ).values;
  const engine = new CompetitionServer({
    config: () => config,
    connections: new Set(),
    emit() {},
    players: () => [],
  });
  engine.packs = Object.fromEntries(
    await Promise.all(
      config.gameplay.education.stations.map(async (s) => [
        s.moduleId,
        JSON.parse(
          await readFile(
            new URL(`../mock/content/${s.moduleId}.json`, import.meta.url),
          ),
        ),
      ]),
    ),
  );
  const education = new EducationServer(engine),
    clients = [0, 1].map((i) => ({
      ready: true,
      user: {
        id: randomUUID(),
        player: {
          playerId: randomUUID(),
          displayName: "Игрок " + i,
          position: { x: 89, y: 0, z: 88 },
        },
      },
    }));
  clients.forEach((c) => engine.init(c.user));
  const [math, informatics] = config.gameplay.education.stations;
  education.handle(
    clients[0],
    command("quiz.start", { npcId: math.examinerId }),
  );
  assert.throws(
    () =>
      education.handle(
        clients[1],
        command("quiz.start", { npcId: informatics.examinerId }),
      ),
    (e) => e.code === "SEAT_OCCUPIED",
  );
  education.handle(
    clients[0],
    command("quiz.leave", { attemptId: clients[0].user.own.attemptId }),
  );
  education.handle(
    clients[1],
    command("quiz.start", { npcId: informatics.examinerId }),
  );
  assert.equal(
    education.ownAttempt(clients[1].user, clients[1].user.own.attemptId).value
      .moduleId,
    informatics.moduleId,
  );
});

test("world snapshots, pongs and unrelated events never redraw NPC controls", () => {
  const t = controller();
  let renders = 0;
  t.c.render = () => renders++;
  for (let i = 0; i < 200; i++)
    for (const type of [
      "world.snapshot",
      "server.pong",
      "competition.state",
      "wallet.updated",
    ])
      t.c.event({ type, payload: { tick: i, revision: i } });
  assert.equal(renders, 0);
  t.c.event({
    type: "quiz.state",
    payload: { attemptId: "current", revision: 1 },
  });
  assert.equal(renders, 1);
  t.c.event({
    type: "quiz.state",
    payload: { attemptId: "current", revision: 1 },
  });
  assert.equal(renders, 1);
});

test("world snapshots and repeated revisions never redraw competition controls", async () => {
  const { CompetitionClient } = await import("../src/gameplay/competition.js");
  let renders = 0;
  const adapter = {
    onEvent() {
      return () => {};
    },
    onStatus() {
      return () => {};
    },
    onReady() {
      return () => {};
    },
  };
  const c = new CompetitionClient(adapter, () => renders++);
  const state = JSON.parse(
    await readFile(
      new URL("./fixtures/v1.1.0/http/competition-lobby.json", import.meta.url),
    ),
  );
  c.event({ type: "competition.state", payload: state });
  assert.equal(renders, 1);
  for (let i = 0; i < 200; i++) {
    c.event({ type: "world.snapshot", payload: { tick: i } });
    c.event({ type: "server.pong", payload: { nonce: i } });
    c.event({ type: "competition.state", payload: structuredClone(state) });
  }
  assert.equal(renders, 1);
  c.dispose();
});

test("HTTP recovery restores the private answer even if the same state revision arrived first over WS", async () => {
  const { CompetitionClient } = await import("../src/gameplay/competition.js");
  const recovery = JSON.parse(
    await readFile(
      new URL(
        "./fixtures/v2.0.0/http/competition-recovery.json",
        import.meta.url,
      ),
    ),
  );
  recovery.answerAccepted = true;
  recovery.submittedAnswer = {
    kind: "single_choice",
    value: recovery.state.round.question.options[0].optionId,
  };
  const adapter = {
    ready: true,
    lastStatus: "connected",
    onEvent() {
      return () => {};
    },
    onStatus() {
      return () => {};
    },
    onReady() {
      return () => {};
    },
    async getActivity() {
      return {
        activity: { mode: "seated_competition" },
        matchId: recovery.state.matchId,
        lobbyId: recovery.state.lobbyId,
        revision: 1,
      };
    },
    async getMatch() {
      return structuredClone(recovery);
    },
    async getWallet() {
      return {
        balanceAura: 99,
        reservedAura: 0,
        availableAura: 99,
        revision: 1,
      };
    },
  };
  const c = new CompetitionClient(adapter);
  c.event({
    type: "competition.state",
    payload: structuredClone(recovery.state),
  });
  assert.equal(c.accepted, null);
  await c.recover();
  assert.deepEqual(c.accepted.answer, recovery.submittedAnswer);
  assert.equal(c.online, true);
  c.dispose();
});

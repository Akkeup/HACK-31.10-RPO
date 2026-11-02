// Tests the local contract server and actual HTTP/WebSocket adapter, not UI automation.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import WS from "ws";
import { Group } from "three";
import { createMockServer } from "../mock/server.js";
import { DiscoveryAdapter } from "./legacy-adapter.js";
import { WorldResources } from "../src/world/resources.js";
import { CompetitionClient } from "../src/gameplay/competition.js";
import { validate, command } from "../src/network/legacy-protocol.js";
const http = createServer((req, res) =>
  mock.middleware(req, res, () => {
    res.statusCode = 404;
    res.end();
  }),
);
const mock = await createMockServer(http);
await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + http.address().port;
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => originalFetch(new URL(url, base), options);
globalThis.location = { origin: base, protocol: "http:" };
globalThis.WebSocket = class extends WS {
  constructor(url, protocol) {
    super(url, protocol, { origin: base });
  }
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, timeout = 8000) => {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw Error("Timeout");
    await pause(20);
  }
};
const client = new DiscoveryAdapter({ mock: true }),
  admin = new DiscoveryAdapter({ mock: true });
let resources;
const competitionClient = new CompetitionClient(client);
const errors = [];
client.onStatus((s) => {
  if (s.startsWith("error:")) console.error(s);
});
try {
  await client.initialize({ username: "explorer", password: "discovery-demo" });
  assert.equal(client.role, "player");
  assert.ok(!("npcBehavior" in client.publicConfig.values));
  assert.ok(!("placements" in client.publicConfig.values.world));
  console.log(
    "PASS bootstrap, login, public config privacy, manifest, membership",
  );
  await assert.rejects(client.getAdminConfig(), (e) => e.status === 403);
  console.log("PASS player admin API denied");
  const scene = new Group();
  resources = new WorldResources(client, scene, {
    beforeChange: () => {},
    onLoaded: () => {},
    onError: (e) => {
      errors.push(e);
      console.error(e);
    },
  });
  let lastSnapshot,
    events = 0;
  client.onEvent((event) => {
    events++;
    validate("server-message", event);
    if (event.type === "world.interest") resources.accept(event.payload);
    if (event.type === "world.snapshot") lastSnapshot = event.payload;
  });
  await client.connect();
  await until(() => client.ready && lastSnapshot);
  assert.equal(errors.length, 0, errors.join(";"));
  assert.ok(lastSnapshot.players.length >= 3);
  assert.ok(scene.children.length > 0);
  assert.ok(resources.ledger.usedBytes <= resources.ledger.budget);
  assert.equal(resources.ledger.reservedBytes, 0);
  console.log(
    "PASS ticket + discovery.v1, ordered envelopes, SHA256 resources, GLB decode, ready, snapshots",
  );
  const root = resources.instantiate("explorer", "test-actor");
  assert.ok(root);
  const hash = resources.assets.get("explorer").sha256;
  assert.equal(resources.ledger.evict(hash), false);
  root.clear();
  resources.ledger.releaseOwner("test-actor");
  console.log("PASS shared-model reference pins");
  let denial;
  try {
    await client.fetchResource(
      {
        ...client.interest.chunks[0],
        url: client.interest.chunks[0].url.replace(/c-\d-\d/, "c-9-9"),
      },
      client.interest.interestRevision,
      new AbortController().signal,
    );
  } catch (e) {
    denial = e;
  }
  assert.equal(denial.code, "OUT_OF_INTEREST");
  console.log("PASS server denies out-of-interest resource");
  const player = () =>
    lastSnapshot.players.find((p) => p.playerId === client.playerId);
  const initial = structuredClone(player().position);
  const move = setInterval(() => client.sendInput([1, 0], 0), 50);
  await pause(800);
  clearInterval(move);
  client.sendInput([0, 0], 0);
  await pause(150);
  assert.ok(player().position.x > initial.x + 1);
  assert.ok(player().position.x < initial.x + 6);
  console.log(
    "PASS fixed-tick authoritative movement, no message-count speedup",
  );
  const radius = client.publicConfig.values.character.interactionRadiusM;
  const walking = setInterval(() => {
    const p = player().position;
    const dx = 86 - p.x,
      dz = 87 - p.z,
      n = Math.hypot(dx, dz);
    client.sendInput(n > 0.2 ? [dx / n, dz / n] : [0, 0], 0);
  }, 50);
  await until(
    () =>
      Math.hypot(player().position.x - 86, player().position.z - 85) <
      radius - 0.2,
  );
  clearInterval(walking);
  client.sendInput([0, 0], 0);
  await pause(150);
  const reply = await client.talk("npc-guide", "Как путешествует свет?");
  assert.match(reply.text, /8 минут/);
  validate("interaction", reply);
  console.log("PASS accepted/result dialogue via canonical envelope");
  const table = client.publicConfig.values.gameplay.competition.tables[0];
  const toward = setInterval(() => {
    const p = player().position,
      dx = table.position.x - p.x,
      dz = table.position.z - p.z,
      n = Math.hypot(dx, dz);
    client.sendInput(n > 0.3 ? [dx / n, dz / n] : [0, 0], 0);
  }, 50);
  await until(
    () =>
      Math.hypot(
        player().position.x - table.position.x,
        player().position.z - table.position.z,
      ) < 2.8,
  );
  clearInterval(toward);
  client.sendInput([0, 0], 0);
  await until(() => competitionClient.online);
  await competitionClient.join(table.tableId);
  await until(() => competitionClient.value?.participants.length === 2);
  assert.equal(competitionClient.activity.activity.mode, "seated_competition");
  await until(() => player().activity.mode === "seated_competition");
  const confirmedPosition = structuredClone(player().position);
  const seatedMove = setInterval(() => client.sendInput([1, 0], 0), 50);
  await pause(200);
  clearInterval(seatedMove);
  client.sendInput([0, 0], 0);
  assert.ok(
    Math.hypot(
      player().position.x - confirmedPosition.x,
      player().position.z - confirmedPosition.z,
    ) < 0.01,
  );
  await competitionClient.configure("mathematics", 101);
  await competitionClient.ready();
  assert.match(competitionClient.error, /ауры/);
  assert.equal((await client.getWallet()).reservedAura, 0);
  await competitionClient.configure("mathematics", 5);
  await competitionClient.ready();
  await until(() => competitionClient.value.participants.every((p) => p.ready));
  assert.equal((await client.getWallet()).reservedAura, 5);
  await competitionClient.start();
  assert.equal(competitionClient.value.status, "running");
  const questionId = competitionClient.value.round.question.questionId;
  await competitionClient.answer(
    competitionClient.value.round.question.options[0].optionId,
  );
  assert.equal(competitionClient.accepted.questionId, questionId);
  assert.equal((await client.getWallet()).balanceAura, 95);
  client.socket.terminate();
  await until(() => !competitionClient.online);
  await until(() => competitionClient.online, 10000);
  assert.equal(competitionClient.accepted?.questionId, questionId);
  assert.equal((await client.getWallet()).balanceAura, 95);
  await until(() => competitionClient.roundResult?.questionId === questionId);
  const running = mock.competition.matches.get(competitionClient.value.matchId);
  mock.competition.settle(running, "operator");
  await until(
    () =>
      competitionClient.value.status === "cancelled" &&
      competitionClient.wallet.balanceAura === 100,
  );
  assert.equal(competitionClient.value.settlement.outcome, "cancelled");
  await until(() => competitionClient.online);
  await competitionClient.join(table.tableId);
  await until(() => competitionClient.value.status === "lobby");
  assert.equal(
    competitionClient.value.participants.find(
      (p) => p.playerId === client.playerId,
    ).ready,
    false,
  );
  assert.equal((await client.getWallet()).reservedAura, 0);
  await competitionClient.leave();
  assert.equal((await client.getActivity()).activity.mode, "exploring");
  console.log(
    "PASS competition seat, authoritative wallet, insufficient aura, explicit readiness, answer privacy, actual WS reconnect, recovery, cancellation/refund and rematch",
  );
  async function walkTo(x, z, radius = 1) {
    const timer = setInterval(() => {
      const p = player().position,
        dx = x - p.x,
        dz = z - p.z,
        n = Math.hypot(dx, dz);
      client.sendInput(n > radius ? [dx / n, dz / n] : [0, 0], 0);
    }, 50);
    try {
      await until(
        () =>
          Math.hypot(player().position.x - x, player().position.z - z) <
          radius + 0.15,
        12000,
      );
    } finally {
      clearInterval(timer);
      client.sendInput([0, 0], 0);
    }
  }
  const station = client.publicConfig.values.gameplay.education.stations[0];
  await walkTo(84, 95);
  await walkTo(
    station.teacherPosition.x,
    station.teacherPosition.z + 1.2,
    0.25,
  );
  const lesson = await client.execute(
    "lesson.open",
    { npcId: station.teacherId },
    ["lesson.opened"],
  );
  validate("education", lesson, "lesson");
  assert.ok(lesson.material.sections.length);
  await client.execute("lesson.close", { lessonId: lesson.lessonId }, [
    "activity.changed",
  ]);
  await walkTo(
    station.examinerPosition.x,
    station.examinerPosition.z - 1.2,
    0.25,
  );
  let attempt = await client.execute(
    "quiz.start",
    { npcId: station.examinerId },
    ["quiz.state"],
  );
  const balanceBefore = (await client.getWallet()).balanceAura;
  for (let i = 0; i < attempt.questionCount; i++) {
    attempt = await client.execute(
      "quiz.answer",
      {
        attemptId: attempt.attemptId,
        questionId: attempt.question.questionId,
        optionId: attempt.question.options[0].optionId,
      },
      ["quiz.state"],
    );
    assert.equal(attempt.status, "feedback");
    const recovered = await client.gameplayGet(
      `/api/v1/education/attempts/${attempt.attemptId}`,
      "education",
      "attempt",
    );
    assert.deepEqual(recovered, attempt);
    attempt = await client.execute(
      "quiz.next",
      { attemptId: attempt.attemptId, expectedRevision: attempt.revision },
      ["quiz.state"],
    );
  }
  assert.equal(attempt.status, "completed");
  assert.equal(typeof attempt.result.passed, "boolean");
  await client.execute("quiz.leave", { attemptId: attempt.attemptId }, [
    "activity.changed",
  ]);
  assert.equal((await client.getWallet()).balanceAura, balanceBefore);
  const educationProgress = await client.gameplayGet(
    `/api/v1/worlds/${client.worldId}/education/progress/me`,
    "education",
    "progress",
  );
  assert.equal(educationProgress.modules[0].completedAttempts, 1);
  console.log(
    "PASS mandatory 1.1 lesson/quiz lifecycle, private attempt recovery and separate education progress",
  );
  await admin.login("admin", "discovery-demo");
  const loaded = await admin.getAdminConfig();
  const values = structuredClone(loaded.value.values);
  values.world.timeOfDayHours = 11;
  const saved = await admin.saveAdminConfig(values, loaded.etag);
  assert.equal(saved.value.revision, loaded.value.revision + 1);
  await pause(100);
  await assert.rejects(
    admin.saveAdminConfig(values, loaded.etag),
    (e) => e.status === 412,
  );
  values.world.spawn.x++;
  await assert.rejects(
    admin.saveAdminConfig(values, saved.etag),
    (e) => e.code === "RESTART_REQUIRED",
  );
  console.log(
    "PASS admin full replacement + ETag, 412 conflict, structural RESTART_REQUIRED",
  );
  assert.equal(errors.length, 0, errors.join(";"));
  assert.ok(events > 5);
  console.log("INTEGRATION COMPLETE");
} finally {
  competitionClient.dispose();
  client.close();
  admin.close();
  await resources?.dispose();
  mock.close();
  await new Promise((resolve) => http.close(resolve));
  globalThis.fetch = originalFetch;
}

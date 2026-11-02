import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { CompetitionServer } from "../mock/competition.js";
import { validate, command, VERSION } from "../src/network/legacy-protocol.js";
const config = JSON.parse(
  await readFile(new URL("../mock/config-v1.1.0.json", import.meta.url)),
).values;
Object.assign(
  config,
  JSON.parse(
    await readFile(
      new URL("../../../assets/world/gameplay.json", import.meta.url),
    ),
  ),
);
const packs = Object.fromEntries(
  await Promise.all(
    ["math-basics", "informatics-basics", "history-basics"].map(async (id) => [
      id,
      JSON.parse(
        await readFile(new URL(`../mock/content/${id}.json`, import.meta.url)),
      ),
    ]),
  ),
);
function setup(count = 2) {
  let time = 1000000;
  const events = [],
    connections = new Set(),
    users = [];
  const engine = new CompetitionServer({
    config: () => config,
    connections,
    players: () => users,
    now: () => time,
    emit(c, type, payload, requestId = null) {
      validate("server-message", {
        protocolVersion: VERSION,
        type,
        payload,
        requestId,
        serverSeq: 1,
        serverTime: new Date(time).toISOString(),
      });
      events.push({
        user: c.user,
        type,
        payload: structuredClone(payload),
        requestId,
      });
    },
  });
  engine.packs = packs;
  for (let i = 0; i < count; i++) {
    const u = {
      id: randomUUID(),
      player: {
        playerId: randomUUID(),
        displayName: "Игрок " + i,
        position: { x: 80, y: 0, z: 94 },
        yawRad: 0,
      },
    };
    const c = { user: u, hello: true, ready: true };
    u.connection = c;
    engine.init(u);
    users.push(u);
    connections.add(c);
  }
  const call = (u, type, payload, id = randomUUID()) =>
    engine.handle(u.connection, command(type, payload, id));
  const tableId = config.gameplay.competition.tables[0].tableId;
  const join = (u) => call(u, "competition.join", { tableId });
  const terms = () => {
    const s = engine.lobbies.get(tableId).state;
    return { tableId, lobbyId: s.lobbyId, expectedRevision: s.revision };
  };
  const ready = (u) =>
    call(u, "competition.ready", { ...terms(), ready: true });
  const advance = (ms) => {
    time += ms;
    engine.tick();
  };
  return { engine, events, users, call, join, terms, ready, advance, tableId };
}
test("five atomic seats; full table, activity conflict, owner transfer and full pre-match refund", () => {
  const t = setup(6);
  for (const u of t.users.slice(0, 5)) t.join(u);
  assert.equal(t.engine.summaries()[0].occupiedSeats.length, 5);
  assert.throws(
    () => t.join(t.users[5]),
    (e) => e.code === "SEAT_OCCUPIED",
  );
  t.ready(t.users[0]);
  assert.equal(t.users[0].wallet.reservedAura, 1);
  t.call(t.users[0], "competition.leave", { tableId: t.tableId });
  assert.equal(t.users[0].wallet.availableAura, 100);
  assert.equal(t.users[0].player.activity.mode, "exploring");
  assert.equal(
    t.engine.lobbies.get(t.tableId).state.ownerPlayerId,
    t.users[1].player.playerId,
  );
});
test("conditions reset all readiness/reserves; insufficient aura and stale CAS never reserve", () => {
  const t = setup();
  t.users.forEach(t.join);
  t.users.forEach(t.ready);
  const old = t.terms();
  t.call(t.users[0], "competition.configure", {
    ...old,
    subject: "history",
    stakeAura: 101,
  });
  assert.ok(
    t.users.every(
      (u) => u.wallet.availableAura === 100 && u.wallet.reservedAura === 0,
    ),
  );
  assert.ok(
    t.engine.lobbies.get(t.tableId).state.participants.every((p) => !p.ready),
  );
  assert.throws(
    () => t.call(t.users[1], "competition.ready", { ...old, ready: true }),
    (e) => e.code === "LOBBY_CHANGED",
  );
  assert.throws(
    () => t.ready(t.users[0]),
    (e) => e.code === "INSUFFICIENT_AURA",
  );
});
test("command idempotency precedes CAS; changed request payload rejected; direct response not duplicated", () => {
  const t = setup();
  t.users.forEach(t.join);
  const payload = { ...t.terms(), ready: true },
    id = randomUUID();
  t.call(t.users[0], "competition.ready", payload, id);
  t.call(t.users[0], "competition.ready", payload, id);
  assert.equal(t.users[0].wallet.reservedAura, 1);
  assert.equal(
    t.events.filter((e) => e.requestId === id && e.type === "competition.state")
      .length,
    2,
  );
  assert.throws(
    () =>
      t.call(t.users[0], "competition.ready", { ...payload, ready: false }, id),
    (e) => e.code === "REQUEST_ID_REUSED",
  );
});
for (const outcome of ["winner", "loss", "draw", "cancelled"])
  test(`server settles ${outcome}; private answers, closed results, conserved aura and no double payout`, () => {
    const t = setup(5);
    t.users.forEach(t.join);
    t.users.forEach(t.ready);
    t.call(t.users[0], "competition.start", t.terms());
    const l = t.engine.lobbies.get(t.tableId),
      matchId = l.state.matchId;
    assert.equal(l.state.potAura, 5);
    assert.ok(
      t.users.every(
        (u) => u.wallet.balanceAura === 99 && u.wallet.reservedAura === 0,
      ),
    );
    if (outcome === "cancelled") t.engine.settle(l, "operator");
    else
      for (let ordinal = 1; ordinal <= l.state.questionCount; ordinal++) {
        const q = l.state.round.question;
        for (let i = 0; i < t.users.length; i++) {
          const key = l.pack.questions[ordinal - 1].correctOptionId;
          const wrong = q.options.find((o) => o.optionId !== key).optionId;
          const optionId =
            outcome === "draw" || (outcome === "winner" ? i === 0 : i === 1)
              ? key
              : wrong;
          t.call(t.users[i], "competition.answer", {
            matchId,
            questionId: q.questionId,
            optionId,
          });
          const recovery = t.engine.recovery(t.users[i], matchId);
          assert.equal(recovery.selectedOptionId, optionId);
          assert.ok(recovery.answerAccepted);
          const published = JSON.stringify(l.state);
          assert.ok(!published.includes("correctOptionId"));
          assert.ok(!published.includes("selectedOptionId"));
          if (i === 0) {
            assert.throws(
              () =>
                t.call(t.users[i], "competition.answer", {
                  matchId,
                  questionId: q.questionId,
                  optionId: optionId === "option-1" ? "option-2" : "option-1",
                }),
              (e) => e.code === "ANSWER_ALREADY_ACCEPTED",
            );
          }
        }
        t.advance(1);
        assert.ok(
          t.events.some(
            (e) =>
              e.type === "competition.round.closed" &&
              e.payload.ordinal === ordinal,
          ),
        );
        t.advance(3500);
      }
    const balances = t.users.map((u) => u.wallet.balanceAura);
    if (outcome === "winner") assert.deepEqual(balances, [104, 99, 99, 99, 99]);
    if (outcome === "loss") assert.deepEqual(balances, [99, 104, 99, 99, 99]);
    if (["draw", "cancelled"].includes(outcome))
      assert.deepEqual(balances, [100, 100, 100, 100, 100]);
    assert.equal(
      balances.reduce((a, b) => a + b),
      500,
    );
    t.engine.settle(l);
    assert.deepEqual(
      t.users.map((u) => u.wallet.balanceAura),
      balances,
    );
    validate(
      "competition",
      t.engine.recovery(t.users[0], matchId),
      "ownRecovery",
    );
  });
test("deadline remains server-owned, reconnect restores accepted answer and does not reserve again; running leave keeps stake", () => {
  const t = setup();
  t.users.forEach(t.join);
  t.users.forEach(t.ready);
  t.call(t.users[0], "competition.start", t.terms());
  const l = t.engine.lobbies.get(t.tableId),
    matchId = l.state.matchId,
    q = l.state.round.question;
  t.call(t.users[0], "competition.answer", {
    matchId,
    questionId: q.questionId,
    optionId: "option-1",
  });
  t.engine.disconnect(t.users[0]);
  t.advance(1000);
  t.engine.reconnect(t.users[0]);
  assert.ok(t.engine.recovery(t.users[0], matchId).answerAccepted);
  assert.equal(t.users[0].wallet.balanceAura, 99);
  t.call(t.users[0], "competition.leave", { tableId: t.tableId });
  assert.equal(t.users[0].wallet.balanceAura, 99);
  assert.equal(t.users[0].own.matchId, matchId);
  t.advance(20000);
  assert.throws(
    () =>
      t.call(t.users[1], "competition.answer", {
        matchId,
        questionId: q.questionId,
        optionId: "option-1",
      }),
    (e) => e.code === "QUESTION_CLOSED",
  );
  t.engine.settle(l, "server_restart");
  assert.equal(t.users[0].wallet.balanceAura, 100);
});
test("lobby disconnect immediately releases reserve, grace expiry releases physical seat", () => {
  const t = setup();
  t.users.forEach(t.join);
  t.ready(t.users[0]);
  t.engine.disconnect(t.users[0]);
  assert.equal(t.users[0].wallet.availableAura, 100);
  t.advance(60001);
  assert.equal(t.engine.summaries()[0].occupiedSeats.length, 1);
});

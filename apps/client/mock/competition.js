// Authoritative LOCAL server simulation. This module is never imported by the client.
import { randomUUID } from "node:crypto";
const exploring = () => ({ mode: "exploring", targetId: null, seatId: null });
const copy = structuredClone;
const canonical = (value) => JSON.stringify(value, Object.keys(value).sort());
export class CompetitionServer {
  constructor({ config, emit, connections, players, now, uuid = randomUUID }) {
    Object.assign(this, { config, emit, connections, players, now, uuid });
    const wall = Date.now(),
      mono = performance.now();
    this.now = now || (() => wall + performance.now() - mono);
    this.lobbies = new Map();
    this.matches = new Map();
    this.requests = new Map();
  }
  fail(code, message) {
    throw Object.assign(Error(message), { code });
  }
  init(user) {
    user.player.activity ||= exploring();
    user.own ||= {
      activity: copy(user.player.activity),
      lessonId: null,
      attemptId: null,
      matchId: null,
      lobbyId: null,
      revision: 1,
    };
    user.wallet ||= {
      balanceAura: this.config().economy.initialBalanceAura,
      reservedAura: 0,
      availableAura: this.config().economy.initialBalanceAura,
      revision: 1,
    };
    if (!user.ledger)
      user.ledger = [
        {
          entryId: this.uuid(),
          transactionId: this.uuid(),
          kind: "initial",
          amountAura: user.wallet.balanceAura,
          reservedDeltaAura: 0,
          balanceAfterAura: user.wallet.balanceAura,
          reservedAfterAura: 0,
          matchId: null,
          lobbyId: null,
          createdAt: new Date(this.now()).toISOString(),
        },
      ];
    return user;
  }
  wallet(user, amount, reserved, kind, lobby) {
    this.init(user);
    const w = user.wallet;
    if (
      w.balanceAura + amount > this.config().economy.maxBalanceAura ||
      w.balanceAura + amount < 0 ||
      w.reservedAura + reserved < 0 ||
      w.reservedAura + reserved > w.balanceAura + amount
    )
      this.fail("INSUFFICIENT_AURA", "Недостаточно доступной ауры");
    w.balanceAura += amount;
    w.reservedAura += reserved;
    w.availableAura = w.balanceAura - w.reservedAura;
    w.revision++;
    user.ledger.push({
      entryId: this.uuid(),
      transactionId: this.uuid(),
      kind,
      amountAura: amount,
      reservedDeltaAura: reserved,
      balanceAfterAura: w.balanceAura,
      reservedAfterAura: w.reservedAura,
      matchId: lobby?.state.matchId || null,
      lobbyId: lobby?.state.lobbyId || null,
      createdAt: new Date(this.now()).toISOString(),
    });
    this.private(user, "wallet.updated", w);
  }
  private(user, type, payload, requestId = null) {
    for (const c of this.connections)
      if (c.user === user && c.hello)
        this.emit(c, type, copy(payload), requestId);
  }
  activity(user, lobby, seat, requestId = null) {
    this.init(user);
    user.player.activity = seat
      ? {
          mode: "seated_competition",
          targetId: lobby.state.tableId,
          seatId: seat.seatId,
        }
      : exploring();
    if (seat) {
      user.player.position = copy(seat.position);
      user.player.yawRad = seat.yawRad;
    } else {
      const previous = lobby?.layout.seats.find(
        (s) => s.seatId === user.own.activity.seatId,
      );
      if (previous) user.player.position = copy(previous.exitPosition);
    }
    Object.assign(user.own, {
      activity: copy(user.player.activity),
      lessonId: null,
      attemptId: null,
      lobbyId: seat ? lobby.state.lobbyId : null,
      matchId: lobby?.state.matchId || null,
      revision: user.own.revision + 1,
    });
    this.private(user, "activity.changed", user.own, requestId);
  }
  broadcast(lobby, except = null, requestId = null) {
    for (const c of this.connections)
      if (c.hello && lobby.members.has(c.user.player.playerId) && c !== except)
        this.emit(c, "competition.state", copy(lobby.state), null);
    if (except)
      this.emit(except, "competition.state", copy(lobby.state), requestId);
  }
  bump(lobby) {
    lobby.state.revision++;
    if (lobby.state.status === "lobby")
      lobby.state.potAura =
        lobby.state.participants.filter((p) => p.ready).length *
        lobby.state.stakeAura;
  }
  table(id) {
    const t = this.config().gameplay.competition.tables.find(
      (t) => t.tableId === id,
    );
    if (!t) this.fail("NOT_FOUND", "Стол не найден");
    return t;
  }
  find(user, id) {
    const l = this.lobbies.get(id);
    if (!l || !l.members.has(user.player.playerId))
      this.fail("NOT_FOUND", "Лобби не найдено");
    return l;
  }
  current(user, p) {
    const l = this.find(user, p.tableId);
    if (
      p.lobbyId !== l.state.lobbyId ||
      p.expectedRevision !== l.state.revision
    )
      this.fail(
        "LOBBY_CHANGED",
        "Условия изменились. Проверьте их и подтвердите заново.",
      );
    if (l.state.status !== "lobby")
      this.fail("MATCH_STARTED", "Матч уже начался");
    return l;
  }
  join(user, id, { trusted = false } = {}) {
    this.init(user);
    const layout = this.table(id);
    if (
      !trusted &&
      (!user.connection?.ready ||
        Math.hypot(
          user.player.position.x - layout.position.x,
          user.player.position.z - layout.position.z,
        ) > layout.interactionRadiusM)
    )
      this.fail("OUT_OF_RANGE", "Подойдите к столу");
    let l = this.lobbies.get(id);
    if (
      user.player.activity.mode !== "exploring" &&
      !(
        l &&
        ["finished", "cancelled"].includes(l.state.status) &&
        user.player.activity.targetId === id
      )
    ) {
      if (
        user.player.activity.targetId === id &&
        l?.members.has(user.player.playerId)
      )
        return l;
      this.fail("ACTIVITY_CONFLICT", "Сначала завершите текущее занятие");
    }
    if (l?.state.status === "running")
      this.fail("MATCH_STARTED", "За столом уже идёт матч");
    if (!l || ["finished", "cancelled"].includes(l.state.status)) {
      if (l)
        for (const u of l.members.values())
          if (u.player.activity.targetId === id) this.activity(u, l, null);
      const rules = this.config().gameplay.competition;
      l = {
        layout: copy(layout),
        members: new Map(),
        answers: new Map(),
        closed: false,
        state: {
          tableId: id,
          lobbyId: this.uuid(),
          matchId: null,
          ownerPlayerId: user.player.playerId,
          revision: 1,
          status: "lobby",
          subject: layout.subjects[0],
          moduleId: "math-basics",
          contentVersion: "v1",
          stakeAura: rules.minStakeAura,
          potAura: 0,
          questionCount: rules.questionCount,
          roundSeconds: rules.roundSeconds,
          participants: [],
          round: null,
          settlement: null,
        },
      };
      this.lobbies.set(id, l);
    }
    const seat = layout.seats.find(
      (s) => !l.state.participants.some((p) => p.seatId === s.seatId),
    );
    if (!seat) this.fail("SEAT_OCCUPIED", "Все пять мест заняты");
    l.members.set(user.player.playerId, user);
    l.state.participants.push({
      playerId: user.player.playerId,
      displayName: user.player.displayName,
      seatId: seat.seatId,
      ready: false,
      connected: true,
      left: false,
      score: 0,
    });
    this.activity(user, l, seat);
    this.bump(l);
    return l;
  }
  configure(user, p) {
    const l = this.current(user, p);
    if (l.state.ownerPlayerId !== user.player.playerId)
      this.fail("FORBIDDEN", "Условия выбирает создатель");
    const rules = this.config().gameplay.competition;
    if (
      !l.layout.subjects.includes(p.subject) ||
      p.stakeAura < rules.minStakeAura ||
      p.stakeAura > rules.maxStakeAura
    )
      this.fail("INVALID_REQUEST", "Недопустимая тема или ставка");
    for (const row of l.state.participants)
      if (row.ready) {
        this.wallet(
          l.members.get(row.playerId),
          0,
          -l.state.stakeAura,
          "release",
          l,
        );
        row.ready = false;
      }
    l.state.subject = p.subject;
    l.state.moduleId = {
      mathematics: "math-basics",
      informatics: "informatics-basics",
      history: "history-basics",
    }[p.subject];
    l.state.stakeAura = p.stakeAura;
    this.bump(l);
    return l;
  }
  ready(user, p) {
    const l = this.current(user, p),
      row = l.state.participants.find(
        (v) => v.playerId === user.player.playerId,
      );
    if (
      p.ready &&
      user.wallet.balanceAura + l.state.stakeAura * 4 >
        this.config().economy.maxBalanceAura
    )
      this.fail(
        "INSUFFICIENT_AURA",
        "Недостаточно места для возможного выигрыша",
      );
    if (row.ready !== p.ready) {
      this.wallet(
        user,
        0,
        p.ready ? l.state.stakeAura : -l.state.stakeAura,
        p.ready ? "reserve" : "release",
        l,
      );
      row.ready = p.ready;
      this.bump(l);
    }
    return l;
  }
  start(user, p) {
    const l = this.current(user, p);
    if (l.state.ownerPlayerId !== user.player.playerId)
      this.fail("FORBIDDEN", "Запускает создатель");
    if (
      l.state.participants.length < 2 ||
      !l.state.participants.every((v) => v.ready && v.connected)
    )
      this.fail("NOT_READY", "Нужно 2–5 подключённых и готовых участников");
    const pack = this.packs[l.state.moduleId];
    if (!pack || pack.questions.length < l.state.questionCount)
      this.fail("CONTENT_VERSION_UNAVAILABLE", "Вопросы недоступны");
    l.pack = copy(pack);
    l.state.contentVersion = pack.module.contentVersion;
    l.state.matchId = this.uuid();
    l.state.status = "running";
    l.state.potAura = l.state.participants.length * l.state.stakeAura;
    this.matches.set(l.state.matchId, l);
    for (const u of l.members.values()) {
      this.wallet(u, -l.state.stakeAura, -l.state.stakeAura, "stake", l);
      u.own.matchId = l.state.matchId;
      u.own.revision++;
      this.private(u, "activity.changed", u.own);
    }
    this.nextRound(l, 1);
    return l;
  }
  nextRound(l, ordinal) {
    l.closed = false;
    l.lastResult = null;
    l.ordinal = ordinal;
    l.answers = new Map();
    l.nextAt = null;
    l.state.round = {
      ordinal,
      question: copy(l.pack.questions[ordinal - 1].question),
      deadlineAt: new Date(
        this.now() + l.state.roundSeconds * 1000,
      ).toISOString(),
      answeredPlayerIds: [],
    };
    this.bump(l);
  }
  answer(user, p) {
    const l = this.matches.get(p.matchId),
      id = user.player.playerId,
      row = l?.state.participants.find((v) => v.playerId === id);
    if (!l || !row) this.fail("NOT_FOUND", "Матч не найден");
    const r = l.state.round;
    if (
      l.state.status !== "running" ||
      !r ||
      r.question.questionId !== p.questionId ||
      l.closed ||
      this.now() >= Date.parse(r.deadlineAt)
    )
      this.fail("QUESTION_CLOSED", "Вопрос закрыт");
    if (row.left) this.fail("FORBIDDEN", "Вы вышли из матча");
    if (!r.question.options.some((o) => o.optionId === p.optionId))
      this.fail("INVALID_REQUEST", "Вариант не найден");
    const accepted = l.answers.get(id);
    if (accepted && accepted.optionId !== p.optionId)
      this.fail("ANSWER_ALREADY_ACCEPTED", "Ответ уже принят");
    const value = accepted || {
      matchId: p.matchId,
      questionId: p.questionId,
      optionId: p.optionId,
      acceptedAt: new Date(this.now()).toISOString(),
    };
    if (!accepted) {
      l.answers.set(id, value);
      r.answeredPlayerIds.push(id);
      this.bump(l);
    }
    return { l, value };
  }
  closeRound(l) {
    if (l.closed) return;
    l.closed = true;
    const r = l.state.round,
      key = l.pack.questions[r.ordinal - 1];
    const scores = l.state.participants.map((p) => {
      const correct =
        l.answers.get(p.playerId)?.optionId === key.correctOptionId;
      if (correct) p.score++;
      return { playerId: p.playerId, score: p.score, correct };
    });
    const last = r.ordinal >= l.state.questionCount;
    l.nextAt = this.now() + 3000;
    l.state.round = null;
    this.bump(l);
    l.lastResult = {
      matchId: l.state.matchId,
      ordinal: r.ordinal,
      questionId: r.question.questionId,
      correctOptionId: key.correctOptionId,
      explanation: key.explanation,
      scores,
      nextRoundStartsAt: last ? null : new Date(l.nextAt).toISOString(),
    };
    for (const u of l.members.values())
      this.private(u, "competition.round.closed", l.lastResult);
    this.broadcast(l);
  }
  settle(l, reason = null) {
    if (l.state.settlement) return;
    const best = Math.max(...l.state.participants.map((p) => p.score)),
      leaders = l.state.participants.filter((p) => p.score === best),
      winner = reason
        ? null
        : leaders.length === 1
          ? leaders[0].playerId
          : null;
    const outcome = reason ? "cancelled" : winner ? "winner" : "draw";
    const payouts = l.state.participants.map((p) => ({
      playerId: p.playerId,
      amountAura:
        reason || !winner
          ? l.state.stakeAura
          : p.playerId === winner
            ? l.state.potAura
            : 0,
    }));
    const settlement = {
      settlementId: this.uuid(),
      matchId: l.state.matchId,
      outcome,
      winnerPlayerId: winner,
      potAura: l.state.potAura,
      payouts,
      reason,
    };
    l.state.status = reason ? "cancelled" : "finished";
    l.state.round = null;
    l.state.settlement = settlement;
    this.bump(l);
    for (const p of payouts) {
      const u = l.members.get(p.playerId);
      this.wallet(
        u,
        p.amountAura,
        0,
        outcome === "winner" ? "payout" : "refund",
        l,
      );
      this.private(u, "competition.settled", settlement);
    }
    this.broadcast(l);
  }
  leave(user, id, requestId = null) {
    const l = this.find(user, id),
      row = l.state.participants.find(
        (p) => p.playerId === user.player.playerId,
      );
    if (l.state.status === "lobby") {
      if (row.ready) this.wallet(user, 0, -l.state.stakeAura, "release", l);
      l.state.participants = l.state.participants.filter((p) => p !== row);
      l.members.delete(user.player.playerId);
      if (l.state.ownerPlayerId === user.player.playerId)
        l.state.ownerPlayerId = l.state.participants[0]?.playerId;
    } else row.left = true;
    l.disconnected?.delete(user.player.playerId);
    this.activity(user, l, null, requestId);
    this.bump(l);
    if (!l.state.participants.length) this.lobbies.delete(id);
    else this.broadcast(l);
    return copy(user.own);
  }
  disconnect(user) {
    for (const l of this.lobbies.values()) {
      const row = l.state.participants.find(
        (p) => p.playerId === user.player.playerId,
      );
      if (!row || row.left) continue;
      row.connected = false;
      (l.disconnected ||= new Map()).set(row.playerId, this.now());
      if (l.state.status === "lobby") {
        if (row.ready) {
          this.wallet(user, 0, -l.state.stakeAura, "release", l);
          row.ready = false;
        }
      }
      this.bump(l);
      this.broadcast(l);
    }
  }
  reconnect(user) {
    for (const l of this.lobbies.values()) {
      const row = l.state.participants.find(
        (p) => p.playerId === user.player.playerId,
      );
      if (!row || row.left) continue;
      row.connected = true;
      l.disconnected?.delete(row.playerId);
      this.bump(l);
      this.broadcast(l);
    }
  }
  tick() {
    for (const l of this.lobbies.values()) {
      if (["lobby", "running"].includes(l.state.status)) {
        for (const p of [...l.state.participants])
          if (
            !p.left &&
            !p.connected &&
            this.now() - (l.disconnected?.get(p.playerId) || this.now()) >=
              60000
          )
            this.leave(l.members.get(p.playerId), l.state.tableId);
      }
      if (l.state.status !== "running") continue;
      if (
        !l.closed &&
        (this.now() >= Date.parse(l.state.round.deadlineAt) ||
          l.state.participants.every(
            (p) => p.left || l.answers.has(p.playerId),
          ))
      )
        this.closeRound(l);
      if (l.closed && this.now() >= l.nextAt) {
        if (l.ordinal >= l.state.questionCount) this.settle(l);
        else {
          this.nextRound(l, l.ordinal + 1);
          this.broadcast(l);
        }
      }
    }
  }
  summaries() {
    return this.config().gameplay.competition.tables.map((t) => {
      const l = this.lobbies.get(t.tableId),
        s = l?.state;
      return {
        tableId: t.tableId,
        status: !s
          ? "available"
          : s.status === "cancelled"
            ? "finished"
            : s.status,
        lobbyId: s?.lobbyId || null,
        matchId: s?.matchId || null,
        subject: s?.subject || null,
        stakeAura: s?.stakeAura ?? null,
        occupiedSeats: s
          ? s.participants
              .filter((p) => !p.left)
              .map((p) => ({ seatId: p.seatId, playerId: p.playerId }))
          : [],
      };
    });
  }
  recovery(user, id) {
    const l = this.matches.get(id);
    if (!l?.members.has(user.player.playerId))
      this.fail("NOT_FOUND", "Матч не найден");
    const a = l.state.round ? l.answers.get(user.player.playerId) : null;
    return {
      state: copy(l.state),
      selectedOptionId: a?.optionId || null,
      answerAccepted: !!a,
    };
  }
  handle(c, m) {
    if (!m.type.startsWith("competition.")) return false;
    this.init(c.user);
    const key = c.user.id + ":" + m.requestId,
      signature = m.type + canonical(m.payload),
      prior = this.requests.get(key);
    if (prior) {
      if (prior.signature !== signature)
        this.fail(
          "REQUEST_ID_REUSED",
          "requestId использован для другой команды",
        );
      this.emit(c, prior.type, copy(prior.value), m.requestId);
      return true;
    }
    if (!c.ready) this.fail("NOT_READY", "Загрузите область мира");
    const u = c.user,
      p = m.payload;
    let l,
      value,
      type = "competition.state";
    if (m.type === "competition.join") l = this.join(u, p.tableId);
    if (m.type === "competition.configure") l = this.configure(u, p);
    if (m.type === "competition.ready") l = this.ready(u, p);
    if (m.type === "competition.start") l = this.start(u, p);
    if (m.type === "competition.answer") {
      const result = this.answer(u, p);
      l = result.l;
      value = result.value;
      type = "competition.answer.accepted";
    }
    if (m.type === "competition.leave") {
      value = this.leave(u, p.tableId, m.requestId);
      type = "activity.changed";
    }
    value ||= copy(l.state);
    this.requests.set(key, {
      signature,
      type,
      value: copy(value),
      at: this.now(),
    });
    if (type !== "activity.changed") this.emit(c, type, value, m.requestId);
    if (l)
      for (const other of this.connections)
        if (
          other !== c &&
          other.hello &&
          l.members.has(other.user.player.playerId)
        )
          this.emit(other, "competition.state", copy(l.state));
    return true;
  }
}

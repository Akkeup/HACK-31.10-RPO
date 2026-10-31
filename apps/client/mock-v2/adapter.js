// DEMO ONLY. This chunk (including keys) is deliberately excluded when VITE_TRANSPORT=real.
import { DiscoveryAdapter } from "../src/network/adapters.js";
import {
  command,
  parseEvent,
  safeDigestSha256,
  safeRandomUUID,
  validate,
} from "../src/network/protocol.js";
import { RoomNpcMotion } from "./npc-motion.js";
import { CompetitionServer } from "./competition.js";
import { makePacks, grade, materials } from "./questions.js";
import publicConfig from "./public-config.json" with { type: "json" };
import published from "./published.json" with { type: "json" };
import country from "./country.json" with { type: "json" };
import {
  ACADEMY_HUB,
  ACADEMY_ROOMS,
  roomById,
} from "../src/world/academy-locations.js";
const clone = structuredClone,
  uuid = () => safeRandomUUID(),
  exploring = () => ({ mode: "exploring", targetId: null, seatId: null });
const STORE = "discovery:reading-room:demo:2.0.0:v1";
export class LocalMockAdapter extends DiscoveryAdapter {
  constructor({ storage, latency = 65, now } = {}) {
    super({ mock: true });
    this.latency = latency;
    this.now = now || (() => Date.now());
    try {
      this.storage = storage === undefined ? globalThis.localStorage : storage;
    } catch {
      this.storage = null;
    }
    this.packs = makePacks(published.flag);
    this.attempts = new Map();
    this.journal = new Map();
    this.tickCount = 0;
    this.scenario = "win";
    this.botCount = 1;
    this.botTimers = new Set();
    this.inputs = [0, 0];
    this.locationId = ACADEMY_HUB;
    this.npcMotion = new Map(
      ACADEMY_ROOMS.flatMap((room) =>
        ["teacher", "examiner"].map((role) => [
          room[role + "Id"],
          new RoomNpcMotion(room, role),
        ]),
      ),
    );
  }
  async initialize() {
    const locationConfig = clone(publicConfig);
    for (const station of locationConfig.values.gameplay.education.stations) {
      const room = ACADEMY_ROOMS.find(
        (item) => item.moduleId === station.moduleId,
      );
      if (!room) continue;
      station.teacherPosition = clone(room.teacherPosition);
      station.examinerPosition = clone(room.examinerPosition);
      station.examinerSeat = clone(room.examinerSeat);
    }
    this.publicConfig = validate("config", locationConfig, "publicDocument");
    this.manifest = validate(
      "streaming",
      clone(published.manifest),
      "manifest",
    );
    this.interest = validate(
      "streaming",
      clone(published.interest),
      "interest",
    );
    this.playerId = "22222222-2222-4222-8222-222222222222";
    this.sessionId = "11111111-1111-4111-8111-111111111111";
    this.user = {
      id: this.playerId,
      player: {
        playerId: this.playerId,
        displayName: "Исследователь",
        position: clone(publicConfig.values.world.spawn),
        yawRad: 0,
        connected: true,
        lastProcessedInputSeq: 0,
        activity: exploring(),
      },
    };
    this.bots = Array.from({ length: 4 }, (_, i) => ({
      id: `0000000${i + 2}-1234-4234-8234-00000000000${i + 2}`,
      player: {
        playerId: `0000000${i + 2}-1234-4234-8234-00000000000${i + 2}`,
        displayName: [
          "Мира · Демо",
          "Алекс · Демо",
          "Лея · Демо",
          "Марк · Демо",
        ][i],
        position: { x: 85 + i, y: 0, z: 90 },
        yawRad: 0,
        connected: true,
        lastProcessedInputSeq: 0,
        activity: exploring(),
      },
    }));
    this.connection = { user: this.user, hello: true, ready: false };
    this.user.connection = this.connection;
    this.competition = new CompetitionServer({
      config: () => ({
        ...this.publicConfig.values,
        economy: { initialBalanceAura: 100, maxBalanceAura: 1000000 },
      }),
      emit: (_c, type, payload, id = null) => this.emit(type, payload, id),
      connections: new Set([this.connection]),
      players: () => [this.user, ...this.bots],
      now: () => this.now(),
    });
    this.competition.packs = Object.fromEntries(
      Object.entries(this.packs).map(([id, pack]) => {
        const questions = pack.questions.filter(
          (q) => q.question.kind !== "explanation",
        );
        if (questions.length < 5)
          questions.push({
            question: {
              questionId: id + "-competition-5",
              kind: "numeric",
              prompt: "Демо: сколько вопросов в этой проверке?",
            },
            expectedAnswer: "5",
            explanation: "В этой демонстрации пять вопросов.",
          });
        return [id, { ...pack, questions }];
      }),
    );
    this.competition.init(this.user);
    this.bots.forEach((b) => this.competition.init(b));
    this.progress = {
      playerId: this.playerId,
      revision: 1,
      modules: [],
      updatedAt: new Date(this.now()).toISOString(),
    };
    this.restore();
    this.userData = {
      userId: this.playerId,
      username: "explorer",
      displayName: "Исследователь",
      role: "player",
    };
    return {
      publicConfig: this.publicConfig,
      manifest: this.manifest,
      user: this.userData,
    };
  }
  restore() {
    try {
      const saved = JSON.parse(this.storage?.getItem(STORE));
      if (!saved || saved.version !== "2.0.0") return;
      validate("wallet", saved.wallet, "balance");
      validate("education", { attempts: saved.attempts }, "attempts");
      validate("education", saved.progress, "progress");
      if (
        saved.wallet.availableAura !==
        saved.wallet.balanceAura - saved.wallet.reservedAura
      )
        throw Error("wallet");
      for (const a of saved.attempts) {
        const pack = this.packs[a.moduleId];
        if (
          !pack ||
          pack.module.contentVersion !== a.contentVersion ||
          a.passScore > a.scoredQuestionCount ||
          a.score > a.scoredQuestionCount
        )
          throw Error("attempt");
        if (["active", "feedback"].includes(a.status)) {
          a.resumeState = a.status;
          a.status = "suspended";
          a.suspendedAt = new Date(this.now()).toISOString();
          a.revision++;
        }
        this.attempts.set(a.attemptId, a);
      }
      this.progress = saved.progress;
      this.user.wallet = saved.wallet;
      // A closed browser is a demo host restart: cancel escrow once, release lobby holds.
      const refund =
        Number.isInteger(saved.escrow) && saved.escrow >= 0 ? saved.escrow : 0;
      if (this.user.wallet.balanceAura + refund > 1000000)
        throw Error("wallet");
      this.user.wallet.balanceAura += refund;
      this.user.wallet.reservedAura = 0;
      this.user.wallet.availableAura = this.user.wallet.balanceAura;
      this.user.wallet.revision++;
      this.restartRefund = refund;
      this.persist();
    } catch {
      this.attempts.clear();
      this.competition.init(this.user);
      this.storageWarning = "Некорректное демосохранение пропущено.";
    }
  }
  persist() {
    const running = [...this.competition.lobbies.values()].find(
      (l) => l.state.status === "running" && l.members.has(this.playerId),
    );
    try {
      this.storage?.setItem(
        STORE,
        JSON.stringify({
          version: "2.0.0",
          wallet: this.user.wallet,
          attempts: [...this.attempts.values()],
          progress: this.progress,
          escrow: running?.state.stakeAura || 0,
        }),
      );
    } catch {
      this.storageWarning =
        "Сохранение недоступно: продолжение работает до закрытия страницы.";
    }
  }
  emit(type, payload, requestId = null) {
    if (this.closed) return;
    const e = parseEvent({
      protocolVersion: "2.0.0",
      type,
      requestId,
      payload: clone(payload),
      serverSeq: ++this.serverSeq,
      serverTime: new Date(this.now()).toISOString(),
    });
    const waiting = this.commands.get(requestId);
    if (waiting && (type === "server.error" || waiting.types.includes(type))) {
      clearTimeout(waiting.timer);
      this.commands.delete(requestId);
      type === "server.error"
        ? waiting.reject(Object.assign(Error(payload.message), payload))
        : waiting.resolve(clone(payload));
    }
    this.listeners.forEach((fn) => fn(e));
    return e;
  }
  async connect() {
    this.closed = false;
    this.serverSeq = 0;
    this.status("connected");
    const session = {
      sessionId: this.sessionId,
      worldId: this.worldId,
      worldRevision: 1,
      status: "active",
      maxPlayers: 5,
      players: [this.user, ...this.bots].map((u) => u.player),
    };
    this.emit("server.welcome", {
      connectionId: uuid(),
      serverInstanceId: uuid(),
      session,
      playerId: this.playerId,
      configRevision: 1,
      manifest: this.manifest,
      heartbeatIntervalMs: 10000,
      heartbeatTimeoutMs: 30000,
    });
    this.emit("world.interest", this.interest);
    this.interval = setInterval(() => {
      try {
        this.tick();
      } catch (e) {
        this.status("error:" + e.message);
      }
    }, 50);
    return {
      id: this.playerId,
      role: "player",
      position: Object.values(this.user.player.position),
    };
  }
  tick() {
    if (!this.ready) return;
    this.tickCount++;
    const p = this.user.player;
    if (
      p.activity.mode === "exploring" &&
      this.now() - this.lastInputAt < 250
    ) {
      let [x, z] = this.inputs;
      const n = Math.hypot(x, z);
      if (n > 1) {
        x /= n;
        z /= n;
      }
      const speed = this.publicConfig.values.character.walkSpeedMps * 0.05;
      const room = roomById(this.locationId);
      const bounds = room?.bounds || {
        minX: 66.5,
        maxX: 93.5,
        minZ: 66.5,
        maxZ: 93.5,
      };
      const pos = {
        x: Math.min(
          bounds.maxX,
          Math.max(bounds.minX, p.position.x + x * speed),
        ),
        y: 0,
        z: Math.min(
          bounds.maxZ,
          Math.max(bounds.minZ, p.position.z + z * speed),
        ),
      };
      // Demo collision bounds belong to the adapter, never local graphics settings.
      const blocked = (v) =>
        room
          ? room.colliders.some(
              (o) => Math.abs(v.x - o.x) < o.hx && Math.abs(v.z - o.z) < o.hz,
            )
          : [
              ...[72, 88].flatMap((x) =>
                [83, 88].map((z) => ({ x, z, hx: 1.2, hz: 0.65 })),
              ),
              { x: 74, z: 90.5, hx: 2.4, hz: 0.55 },
            ].some(
              (o) =>
                Math.abs(v.x - o.x) < o.hx + 0.25 &&
                Math.abs(v.z - o.z) < o.hz + 0.25,
            ) ||
            this.interestObjects?.some(
              (o) =>
                o.collidable &&
                o.modelId !== "competition-chair" &&
                Math.abs(v.x - o.position.x) <
                  (o.modelId === "competition-table"
                    ? 1.8
                    : o.modelId === "reading-shelf" && Math.abs(o.yawRad) > 1
                      ? 0.88
                      : 1.45) &&
                Math.abs(v.z - o.position.z) <
                  (o.modelId === "reading-shelf"
                    ? Math.abs(o.yawRad) > 1
                      ? 1.6
                      : 0.65
                    : o.modelId === "competition-table"
                      ? 1.8
                      : 0.85),
            );
      if (!blocked({ ...pos, z: p.position.z })) p.position.x = pos.x;
      if (!blocked({ ...pos, x: p.position.x })) p.position.z = pos.z;
    }
    const currentRoom = roomById(this.locationId);
    if (currentRoom)
      for (const role of ["teacher", "examiner"])
        this.npcMotion
          .get(currentRoom[role + "Id"])
          .tick(0.05, p.position, p.activity.mode !== "exploring");
    this.competition.tick();
    this.botAnswers();
    if (this.tickCount % 2 === 0) this.snapshot();
  }
  snapshot() {
    this.emit("world.snapshot", {
      tick: this.tickCount,
      interestRevision: 1,
      configRevision: 1,
      sessionStatus: "active",
      players: [this.user, ...this.bots].map((u) => u.player),
      tables: this.competition.summaries(),
      npcs: [
        ...(!roomById(this.locationId)
          ? [
              {
                npcId: "npc-guide",
                displayName: "София · Проводник",
                position: { x: 83, y: 0, z: 90 },
                yawRad: 0,
                state: "idle",
                subject: "Читальный зал · Демо",
                role: "teacher",
                moduleId: "math-basics",
              },
            ]
          : []),
        ...this.publicConfig.values.gameplay.education.stations
          .filter((s) => roomById(this.locationId)?.moduleId === s.moduleId)
          .flatMap((s) =>
            ["teacher", "examiner"].map((role) => ({
              npcId: s[role + "Id"],
              displayName:
                role === "teacher"
                  ? roomById(this.locationId)?.teacherName ||
                    this.packs[s.moduleId].module.title
                  : "Экзаменатор",
              position: this.stationPose(s, role).position,
              yawRad: this.stationPose(s, role).yawRad,
              state: this.stationPose(s, role).state,
              subject: this.packs[s.moduleId].module.subject,
              role,
              moduleId: s.moduleId,
            })),
          ),
      ],
    });
  }
  stationPose(station, role) {
    const room = ACADEMY_ROOMS.find(
      (room) => room.moduleId === station.moduleId,
    );
    return room && this.locationId === room.roomId
      ? this.npcMotion.get(station[role + "Id"])
      : { position: station[role + "Position"], yawRad: 0, state: "idle" };
  }
  teacherPose(station) {
    return this.stationPose(station, "teacher");
  }
  async enterLocation(roomId) {
    const room = roomById(roomId);
    this.free();
    if (room) {
      if (this.locationId !== ACADEMY_HUB)
        this.fail("ACTIVITY_CONFLICT", "Сначала выйдите из кабинета.");
      this.near(room.door, 3.2);
      this.locationId = room.roomId;
      this.user.player.position = clone(room.entry);
    } else if (roomId === ACADEMY_HUB) {
      const current = roomById(this.locationId);
      if (!current) return;
      this.near(current.exit, 3.2);
      this.locationId = ACADEMY_HUB;
      this.user.player.position = clone(current.hubReturn);
    } else this.fail("NOT_FOUND", "Кабинет не найден.");
    this.inputs = [0, 0];
    this.tickCount++;
    this.snapshot();
  }
  send(packet) {
    validate("client-message", packet);
    if (packet.type === "player.input") {
      this.inputs = [packet.payload.moveX, packet.payload.moveZ];
      this.lastInputAt = this.now();
      this.user.player.yawRad = packet.payload.yawRad;
      this.user.player.lastProcessedInputSeq = packet.payload.inputSeq;
      return;
    }
    if (packet.type === "world.ready") {
      this.connection.ready = true;
      this.snapshot();
      return;
    }
    if (["client.hello", "client.metrics"].includes(packet.type)) return;
    this.queue = (this.queue || Promise.resolve()).then(async () => {
      await new Promise((r) => setTimeout(r, this.latency));
      if (this.closed) return;
      try {
        await this.handle(packet);
        this.persist();
        this.snapshot();
      } catch (e) {
        this.emit(
          "server.error",
          {
            code: e.code || "INVALID_REQUEST",
            message: e.message.slice(0, 300),
            retryable: false,
            requestId: packet.requestId,
            details: [],
          },
          packet.requestId,
        );
      }
    });
  }
  own(mode, targetId = null, seatId = null, extra = {}, requestId = null) {
    this.user.player.activity = { mode, targetId, seatId };
    Object.assign(this.user.own, {
      activity: clone(this.user.player.activity),
      lessonId: null,
      attemptId: null,
      matchId: null,
      lobbyId: null,
      ...extra,
      revision: this.user.own.revision + 1,
    });
    this.emit("activity.changed", this.user.own, requestId);
  }
  fail(code, message) {
    throw Object.assign(Error(message), { code });
  }
  near(position, radius = 3) {
    if (
      Math.hypot(
        this.user.player.position.x - position.x,
        this.user.player.position.z - position.z,
      ) > radius
    )
      this.fail("OUT_OF_RANGE", "Подойдите к выбранному объекту.");
  }
  free() {
    if (this.user.player.activity.mode !== "exploring")
      this.fail("ACTIVITY_CONFLICT", "Сначала встаньте или закройте материал.");
  }
  async handle(m) {
    const p = m.payload,
      id = m.requestId;
    if (m.type.startsWith("competition.")) {
      if (m.type === "competition.join" && this.scenario === "occupied")
        this.fail(
          "SEAT_OCCUPIED",
          "Демо: все места заняты. Выберите другой сценарий.",
        );
      this.competition.handle(this.connection, m);
      const lobby = this.competition.lobbies.get(p.tableId);
      if (
        lobby &&
        ["competition.join", "competition.configure"].includes(m.type)
      ) {
        for (const bot of this.bots.slice(0, this.botCount)) {
          if (!lobby.members.has(bot.player.playerId))
            this.competition.join(bot, p.tableId, { trusted: true });
          this.competition.ready(bot, {
            tableId: p.tableId,
            lobbyId: lobby.state.lobbyId,
            expectedRevision: lobby.state.revision,
            ready: true,
          });
        }
        this.competition.broadcast(lobby);
      }
      return;
    }
    const previous = this.journal.get(id);
    if (previous) {
      if (previous.signature !== JSON.stringify(m))
        this.fail("REQUEST_ID_REUSED", "Команда уже использована.");
      this.emit(previous.type, previous.payload, id);
      return;
    }
    const reply = (type, payload) => {
      this.emit(type, payload, id);
      this.journal.set(id, {
        signature: JSON.stringify(m),
        type,
        payload: clone(payload),
      });
    };
    const stations = this.publicConfig.values.gameplay.education.stations;
    if (m.type === "library.open" || m.type === "lesson.open") {
      this.free();
      let pack;
      if (p.bookId) {
        const b = this.books().books.find((b) => b.bookId === p.bookId);
        if (b) {
          pack = this.packs[b.moduleId];
          const current = roomById(this.locationId);
          if (current) {
            if (current.moduleId !== b.moduleId)
              this.fail("OUT_OF_RANGE", "Полка находится в другом кабинете.");
            this.near({ x: current.center.x - 4.75, z: current.center.z + 1 });
          } else {
            const shelf = this.publicConfig.values.readingRoom.shelves.find(
              (s) => s.bookIds.includes(b.bookId),
            );
            this.near(
              this.interestObjects.find((o) => o.id === shelf.shelfId).position,
            );
          }
        }
      } else {
        const s = stations.find((s) => s.teacherId === p.npcId);
        if (s) {
          pack = this.packs[s.moduleId];
          this.near(this.teacherPose(s).position);
        }
      }
      if (!pack) this.fail("NOT_FOUND", "Материал не найден.");
      const lessonId = uuid();
      this.lesson = { lessonId, material: pack.material };
      this.own("learning", p.bookId || p.npcId, null, { lessonId });
      reply(
        m.type === "library.open" ? "library.opened" : "lesson.opened",
        this.lesson,
      );
      return;
    }
    if (m.type === "lesson.close") {
      if (p.lessonId !== this.user.own.lessonId)
        this.fail("NOT_FOUND", "Материал уже закрыт.");
      this.viewed(this.lesson.material.module.moduleId);
      this.lesson = null;
      this.own("exploring", null, null, {}, id);
      return;
    }
    if (m.type === "country.describe") {
      const s = stations.find(
        (s) => s.teacherId === p.teacherId && s.moduleId === "flags-demo",
      );
      if (!s || p.countryId !== country.countryId)
        this.fail("NOT_FOUND", "Карточка страны не найдена.");
      this.near(this.teacherPose(s).position);
      if (this.user.player.activity.mode === "seated_quiz")
        this.fail(
          "ACTIVITY_CONFLICT",
          "Карточка не открывается как подсказка к проверке.",
        );
      reply("country.description", country);
      return;
    }
    if (m.type === "quiz.start" || m.type === "quiz.resume") {
      this.free();
      const s = stations.find((s) => s.examinerId === p.npcId);
      if (!s) this.fail("NOT_FOUND", "Тетрадь не найдена.");
      // The physical notebook is an alternative interaction point for the same examiner contract.
      const nearNotebook =
        Math.hypot(
          this.user.player.position.x - s.examinerSeat.position.x,
          this.user.player.position.z - s.examinerSeat.position.z,
        ) <= 3;
      if (!nearNotebook) this.near(this.stationPose(s, "examiner").position);
      let a;
      if (m.type === "quiz.resume") {
        a = this.attempts.get(p.attemptId);
        if (!a || a.status !== "suspended" || a.moduleId !== s.moduleId)
          this.fail("NOT_FOUND", "Попытка недоступна.");
        a.status = a.resumeState;
        a.resumeState = null;
        a.suspendedAt = null;
        a.revision++;
      } else {
        if (
          [...this.attempts.values()].some(
            (a) =>
              a.moduleId === s.moduleId &&
              ["active", "feedback", "suspended"].includes(a.status),
          )
        )
          this.fail(
            "ACTIVITY_CONFLICT",
            "Есть незавершённая попытка. Продолжите или откажитесь от неё.",
          );
        const pack = this.packs[s.moduleId],
          scored = pack.questions.filter(
            (q) => q.question.kind !== "explanation",
          ).length;
        a = {
          attemptId: uuid(),
          moduleId: s.moduleId,
          contentVersion: pack.module.contentVersion,
          npcId: s.examinerId,
          seatId: s.examinerSeat.seatId,
          status: "active",
          revision: 1,
          ordinal: 1,
          questionCount: 5,
          passScore: Math.min(4, scored),
          scoredQuestionCount: scored,
          score: 0,
          question: clone(pack.questions[0].question),
          feedback: null,
          result: null,
          interruptionReason: null,
          suspendedAt: null,
          resumeState: null,
        };
        this.attempts.set(a.attemptId, a);
      }
      this.user.player.position = clone(s.examinerSeat.position);
      this.user.player.yawRad = s.examinerSeat.yawRad;
      this.own("seated_quiz", s.examinerId, s.examinerSeat.seatId, {
        attemptId: a.attemptId,
      });
      reply("quiz.state", a);
      return;
    }
    if (m.type.startsWith("quiz.")) {
      const a = this.attempts.get(p.attemptId);
      if (!a) this.fail("NOT_FOUND", "Попытка не найдена.");
      const active =
        this.user.own.attemptId === a.attemptId &&
        this.user.player.activity.mode === "seated_quiz";
      if (!active && m.type !== "quiz.abandon")
        this.fail("ACTIVITY_CONFLICT", "Сначала продолжите проверку.");
      const pack = this.packs[a.moduleId];
      if (m.type === "quiz.answer") {
        if (a.status !== "active" || a.question.questionId !== p.questionId)
          this.fail(
            "ANSWER_ALREADY_ACCEPTED",
            "Ответ уже принят или вопрос сменился.",
          );
        const key = pack.questions[a.ordinal - 1],
          evaluation = grade(key, p.answer);
        if (evaluation.correct) a.score++;
        a.feedback = {
          questionId: p.questionId,
          submittedAnswer: p.answer,
          ...evaluation,
          expectedAnswer: key.expectedAnswer,
          explanation: key.explanation,
        };
        a.question = null;
        a.status = "feedback";
        a.revision++;
        reply("quiz.state", a);
        return;
      }
      if (m.type === "quiz.next") {
        if (a.status !== "feedback" || a.revision !== p.expectedRevision)
          this.fail("LOBBY_CHANGED", "Состояние проверки изменилось.");
        a.feedback = null;
        a.revision++;
        if (a.ordinal === a.questionCount) {
          a.status = "completed";
          a.result = {
            score: a.score,
            maximumScore: a.scoredQuestionCount,
            passed: a.score >= a.passScore,
            reviewTopics: a.score < a.passScore ? [pack.module.title] : [],
          };
          this.viewed(a.moduleId, a);
        } else {
          a.ordinal++;
          a.status = "active";
          a.question = clone(pack.questions[a.ordinal - 1].question);
        }
        reply("quiz.state", a);
        return;
      }
      if (m.type === "quiz.leave" || m.type === "quiz.abandon") {
        if (m.type === "quiz.abandon") {
          a.status = "interrupted";
          a.question = null;
          a.feedback = null;
          a.result = null;
          a.resumeState = null;
          a.suspendedAt = null;
          a.interruptionReason = "left";
        } else if (["active", "feedback"].includes(a.status)) {
          a.resumeState = a.status;
          a.status = "suspended";
          a.suspendedAt = new Date(this.now()).toISOString();
        }
        a.revision++;
        this.emit("quiz.state", a);
        if (active) {
          const s = stations.find((s) => s.moduleId === a.moduleId);
          this.user.player.position = clone(s.examinerSeat.exitPosition);
          this.own(
            "exploring",
            null,
            null,
            { attemptId: a.status === "suspended" ? a.attemptId : null },
            id,
          );
        } else reply("quiz.state", a);
        return;
      }
    }
    if (m.type === "client.ping") {
      reply("server.pong", { nonce: p.nonce });
      return;
    }
    if (m.type === "npc.interact") {
      if (p.npcId !== "npc-guide")
        this.fail("NOT_FOUND", "Собеседник недоступен.");
      this.near({ x: 83, z: 90 });
      reply("npc.result", {
        interaction: {
          requestId: id,
          npcId: p.npcId,
          status: "completed",
          text: "Добро пожаловать в демо-читальный зал. Выберите книгу на полке, поговорите с преподавателем или сядьте за тетрадь. Незавершённую проверку можно сохранить и продолжить позже.",
          source: "rules",
          knowledgeIds: [],
          progressRevision: 1,
          error: null,
        },
      });
      return;
    }
    this.fail("INVALID_REQUEST", "Демо-команда не поддерживается.");
  }
  viewed(moduleId, a) {
    let row = this.progress.modules.find((m) => m.moduleId === moduleId);
    if (!row) {
      row = {
        moduleId,
        contentVersion: this.packs[moduleId].module.contentVersion,
        viewed: true,
        completedAttempts: 0,
        bestScore: 0,
        maximumScore: a?.scoredQuestionCount || 4,
        passed: false,
      };
      this.progress.modules.push(row);
    }
    row.viewed = true;
    if (a) {
      row.completedAttempts++;
      row.bestScore = Math.max(row.bestScore, a.score);
      row.maximumScore = a.scoredQuestionCount;
      row.passed ||= a.result.passed;
    }
    this.progress.revision++;
    this.progress.updatedAt = new Date(this.now()).toISOString();
    this.emit("education.progress.updated", this.progress);
  }
  books() {
    return {
      books: materials.map((m) => ({
        bookId: "book-" + m.module.moduleId,
        shelfId: this.publicConfig.values.readingRoom.shelves.find((s) =>
          s.bookIds.includes("book-" + m.module.moduleId),
        ).shelfId,
        moduleId: m.module.moduleId,
        contentVersion: m.module.contentVersion,
        title: m.module.title,
      })),
    };
  }
  async gameplayGet(path, schema, definition) {
    const { value } = await this.request(path);
    return validate(schema, value, definition);
  }
  async request(path) {
    await new Promise((r) => setTimeout(r, this.latency));
    let value;
    if (path === "/api/v2/activity/me") value = this.user.own;
    else if (path === "/api/v2/wallet/me") value = this.user.wallet;
    else if (path.endsWith("/attempts/me?status=suspended"))
      value = {
        attempts: [...this.attempts.values()].filter(
          (a) => a.status === "suspended",
        ),
      };
    else if (path.includes("/education/attempts/"))
      value = this.attempts.get(path.split("/").at(-1));
    else if (path.includes("/competition/lobbies/"))
      value = [...this.competition.lobbies.values()].find(
        (l) => l.state.lobbyId === path.split("/").at(-1),
      )?.state;
    else if (path.includes("/competition/matches/"))
      value = this.competition.recovery(this.user, path.split("/").at(-2));
    else if (path.endsWith("/library/books")) value = this.books();
    else if (path.endsWith("/education/modules"))
      value = { modules: materials.map((m) => m.module) };
    else if (path.includes("/versions/"))
      value = this.packs[path.split("/").at(-3)]?.material;
    else if (path.endsWith("/education/progress/me")) value = this.progress;
    else if (path.includes("/countries/")) value = country;
    else if (path.endsWith("/config")) value = this.publicConfig;
    if (value === undefined)
      this.fail("NOT_FOUND", "Демонстрационные данные недоступны.");
    return { value: clone(value), etag: '"demo-1"' };
  }
  async fetchResource(d, _revision, signal) {
    const known = [...this.interest.chunks, ...this.interest.assets].find(
      (a) => a.sha256 === d.sha256,
    );
    if (!known || known.byteSize !== d.byteSize)
      this.fail("OUT_OF_INTEREST", "Ресурс вне демо-interest.");
    const extension = d.chunkId
      ? "json"
      : d.mediaType === "image/svg+xml"
        ? "svg"
        : "glb";
    const response = await fetch(`/demo/resources/${d.sha256}.${extension}`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok)
      throw Error("Не удалось загрузить локальный ресурс: " + response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const hash = await safeDigestSha256(bytes);
    if (bytes.byteLength !== d.byteSize || hash !== d.sha256)
      throw Error("Неверные размер или SHA-256 локального ресурса.");
    if (d.chunkId) {
      const chunk = validate(
        "chunk",
        JSON.parse(new TextDecoder().decode(bytes)),
      );
      this.interestObjects = chunk.objects;
    }
    return bytes;
  }
  botAnswers() {
    for (const l of this.competition.lobbies.values()) {
      if (l.state.status !== "running" || !l.state.round || l.closed) continue;
      if (
        this.now() <
        Date.parse(l.state.round.deadlineAt) -
          l.state.roundSeconds * 1000 +
          1200
      )
        continue;
      for (const bot of this.bots) {
        if (
          !l.members.has(bot.player.playerId) ||
          l.answers.has(bot.player.playerId)
        )
          continue;
        if (this.scenario === "draw" && !l.answers.has(this.playerId)) continue;
        const key = l.pack.questions[l.ordinal - 1];
        const own = l.answers.get(this.playerId)?.answer;
        const value =
          this.scenario === "draw"
            ? own.value
            : this.scenario === "loss"
              ? key.expectedAnswer
              : key.question.kind === "single_choice"
                ? key.question.options.find(
                    (o) => o.optionId !== key.expectedAnswer,
                  ).optionId
                : "демо неверно";
        this.competition.answer(bot, {
          matchId: l.state.matchId,
          questionId: key.question.questionId,
          answer: { kind: key.question.kind, value },
        });
      }
    }
  }
  async demoScenario(scenario, count = 2) {
    if (this.user.player.activity.mode !== "exploring")
      throw Error("Сначала встаньте из-за стола.");
    this.scenario = scenario;
    this.botCount = Math.min(4, Math.max(1, count - 1));
    for (const l of this.competition.lobbies.values()) {
      if (l.state.status === "running") this.competition.settle(l, "operator");
      for (const b of this.bots)
        if (
          l.members.has(b.player.playerId) &&
          b.player.activity.mode === "seated_competition"
        )
          this.competition.leave(b, l.state.tableId);
    }
    this.competition.lobbies.clear();
    this.competition.wallet(
      this.user,
      100 - this.user.wallet.balanceAura,
      -this.user.wallet.reservedAura,
      "refund",
    );
    this.persist();
    this.snapshot();
  }
  async demoCancel() {
    for (const l of this.competition.lobbies.values())
      if (l.state.status === "running") this.competition.settle(l, "operator");
    this.persist();
  }
  async talk(npcId, text, requestId = uuid()) {
    return (
      await this.execute(
        "npc.interact",
        { npcId, action: "talk", text },
        ["npc.result"],
        requestId,
      )
    ).interaction;
  }
  cancelPending() {}
  async loginDemoAdmin() {
    throw Error(
      "Администрирование подключается с сетевым сервером. В демо доступны только локальные настройки.",
    );
  }
  async logout() {
    this.close();
  }
  close() {
    clearInterval(this.interval);
    this.persist();
    super.close();
  }
}

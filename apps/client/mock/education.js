// Required 1.1 education commands, separate from competitive scores and aura.
export class EducationServer {
  constructor(engine) {
    this.engine = engine;
    this.attempts = new Map();
    this.lessons = new Map();
  }
  progress(u) {
    return (u.educationProgress ||= {
      playerId: u.player.playerId,
      revision: 1,
      modules: [],
      updatedAt: new Date(this.engine.now()).toISOString(),
    });
  }
  record(u, pack, attempt = null) {
    const p = this.progress(u);
    let row = p.modules.find((m) => m.moduleId === pack.module.moduleId);
    if (!row) {
      row = {
        moduleId: pack.module.moduleId,
        contentVersion: pack.module.contentVersion,
        viewed: false,
        completedAttempts: 0,
        bestScore: 0,
        maximumScore: this.engine.config().gameplay.education.questionCount,
        passed: false,
      };
      p.modules.push(row);
    }
    if (attempt) {
      row.completedAttempts++;
      row.bestScore = Math.max(row.bestScore, attempt.score);
      row.passed ||= attempt.result.passed;
    } else row.viewed = true;
    p.revision++;
    p.updatedAt = new Date(this.engine.now()).toISOString();
    this.engine.private(u, "education.progress.updated", p);
  }
  station(u, npcId, role) {
    const e = this.engine,
      s = e
        .config()
        .gameplay.education.stations.find(
          (s) => s[role === "teacher" ? "teacherId" : "examinerId"] === npcId,
        );
    if (!s) e.fail("INVALID_REQUEST", "NPC не поддерживает это действие");
    if (u.player.activity.mode !== "exploring")
      e.fail("ACTIVITY_CONFLICT", "Завершите текущее занятие");
    const p = s[role === "teacher" ? "teacherPosition" : "examinerPosition"];
    if (
      Math.hypot(p.x - u.player.position.x, p.z - u.player.position.z) >
      e.config().character.interactionRadiusM
    )
      e.fail("OUT_OF_RANGE", "Подойдите к NPC");
    return s;
  }
  activity(u, mode, targetId, seat = null, requestId = null) {
    const e = this.engine;
    e.init(u);
    u.player.activity = { mode, targetId, seatId: seat?.seatId || null };
    if (seat) {
      u.player.position = structuredClone(seat.position);
      u.player.yawRad = seat.yawRad;
    }
    u.own.activity = structuredClone(u.player.activity);
    u.own.revision++;
    e.private(u, "activity.changed", u.own, requestId);
  }
  ownAttempt(u, id) {
    const a = this.attempts.get(id);
    if (!a || a.user !== u) this.engine.fail("NOT_FOUND", "Попытка не найдена");
    return a;
  }
  handle(c, m) {
    if (!m.type.startsWith("lesson.") && !m.type.startsWith("quiz."))
      return false;
    const e = this.engine,
      u = c.user,
      p = m.payload,
      key = u.id + ":" + m.requestId,
      signature = m.type + JSON.stringify(p),
      prior = e.requests.get(key);
    if (prior) {
      if (prior.signature !== signature)
        e.fail("REQUEST_ID_REUSED", "requestId уже использован");
      e.emit(c, prior.type, prior.value, m.requestId);
      return true;
    }
    if (!c.ready) e.fail("NOT_READY", "Область мира загружается");
    let type, value;
    if (m.type === "lesson.open") {
      const s = this.station(u, p.npcId, "teacher"),
        lesson = {
          lessonId: e.uuid(),
          material: structuredClone(e.packs[s.moduleId].material),
        };
      this.lessons.set(lesson.lessonId, { user: u, lesson });
      u.own.lessonId = lesson.lessonId;
      type = "lesson.opened";
      value = lesson;
      e.emit(c, type, value, m.requestId);
      this.activity(u, "learning", p.npcId);
      e.requests.set(key, { signature, type, value });
      return true;
    }
    if (m.type === "lesson.close") {
      const l = this.lessons.get(p.lessonId);
      if (l?.user !== u) e.fail("NOT_FOUND", "Занятие не найдено");
      this.record(u, e.packs[l.lesson.material.module.moduleId]);
      u.own.lessonId = null;
      type = "activity.changed";
      this.activity(u, "exploring", null, null, m.requestId);
      value = structuredClone(u.own);
    }
    if (m.type === "quiz.start") {
      const s = this.station(u, p.npcId, "examiner");
      if (
        [...this.attempts.values()].some(
          (a) =>
            a.user.player.activity.mode === "seated_quiz" &&
            (a.user.player.activity.seatId === s.examinerSeat.seatId ||
              ["x", "y", "z"].every(
                (axis) =>
                  a.station.examinerSeat.position[axis] ===
                  s.examinerSeat.position[axis],
              )),
        )
      )
        e.fail("SEAT_OCCUPIED", "Место проверки занято");
      const pack = structuredClone(e.packs[s.moduleId]),
        rules = e.config().gameplay.education;
      value = {
        attemptId: e.uuid(),
        moduleId: s.moduleId,
        contentVersion: pack.module.contentVersion,
        npcId: p.npcId,
        seatId: s.examinerSeat.seatId,
        status: "active",
        revision: 1,
        ordinal: 1,
        questionCount: rules.questionCount,
        passScore: rules.passScore,
        score: 0,
        question: pack.questions[0].question,
        feedback: null,
        result: null,
        interruptionReason: null,
      };
      this.attempts.set(value.attemptId, {
        user: u,
        value,
        pack,
        station: structuredClone(s),
      });
      u.own.attemptId = value.attemptId;
      type = "quiz.state";
      this.activity(u, "seated_quiz", p.npcId, s.examinerSeat);
    }
    if (m.type === "quiz.answer") {
      const a = this.ownAttempt(u, p.attemptId);
      value = a.value;
      const previous = a.pack.questions[value.ordinal - 1];
      if (value.status !== "active") {
        if (
          value.feedback?.questionId !== p.questionId ||
          value.feedback?.selectedOptionId !== p.optionId
        )
          e.fail("ANSWER_ALREADY_ACCEPTED", "Ответ принят");
      } else {
        if (value.question.questionId !== p.questionId)
          e.fail("QUESTION_CLOSED", "Другой вопрос");
        if (!value.question.options.some((o) => o.optionId === p.optionId))
          e.fail("INVALID_REQUEST", "Нет варианта");
        const correct = previous.correctOptionId === p.optionId;
        if (correct) value.score++;
        value.feedback = {
          questionId: p.questionId,
          selectedOptionId: p.optionId,
          correctOptionId: previous.correctOptionId,
          correct,
          explanation: previous.explanation,
        };
        value.question = null;
        value.status = "feedback";
        value.revision++;
      }
      type = "quiz.state";
    }
    if (m.type === "quiz.next") {
      const a = this.ownAttempt(u, p.attemptId);
      value = a.value;
      if (value.revision !== p.expectedRevision)
        e.fail("CONFIG_CONFLICT", "Попытка изменена");
      if (value.status !== "feedback")
        e.fail("INVALID_REQUEST", "Сначала ответьте");
      value.feedback = null;
      value.revision++;
      if (value.ordinal === value.questionCount) {
        value.status = "completed";
        value.result = {
          score: value.score,
          maximumScore: value.questionCount,
          passed: value.score >= value.passScore,
          reviewTopics: [],
        };
        this.record(u, a.pack, value);
      } else {
        value.ordinal++;
        value.status = "active";
        value.question = structuredClone(
          a.pack.questions[value.ordinal - 1].question,
        );
      }
      type = "quiz.state";
    }
    if (m.type === "quiz.leave") {
      const a = this.ownAttempt(u, p.attemptId);
      value = a.value;
      if (!["completed", "interrupted"].includes(value.status)) {
        value.status = "interrupted";
        value.question = null;
        value.feedback = null;
        value.result = null;
        value.interruptionReason = "left";
        value.revision++;
        e.private(u, "quiz.state", value);
      }
      u.player.position = structuredClone(a.station.examinerSeat.exitPosition);
      u.own.attemptId = null;
      type = "activity.changed";
      this.activity(u, "exploring", null, null, m.requestId);
      value = structuredClone(u.own);
    }
    e.requests.set(key, { signature, type, value: structuredClone(value) });
    if (type !== "activity.changed") e.emit(c, type, value, m.requestId);
    return true;
  }
  http(path, u) {
    const prefix = "/api/v1/worlds/discovery-campus/education";
    if (path === prefix + "/modules")
      return { modules: Object.values(this.engine.packs).map((p) => p.module) };
    if (path === prefix + "/progress/me") return this.progress(u);
    const material = path.match(
      /\/education\/modules\/([^/]+)\/versions\/([^/]+)$/,
    );
    if (material) {
      const p = this.engine.packs[material[1]];
      if (!p || p.module.contentVersion !== material[2])
        this.engine.fail("NOT_FOUND", "Материал не найден");
      return p.material;
    }
    if (path.startsWith("/api/v1/education/attempts/"))
      return this.ownAttempt(u, path.split("/").at(-1)).value;
  }
}

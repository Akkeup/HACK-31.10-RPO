import { updatePanel } from "./panel-dom.js";
import { readingCards, lessonBlocks } from "./reading-cards.js";
import { examinerGroups } from "../gameplay/education.js";
import { answerControls, safe } from "./answer-controls.js";
const subjects = {
  mathematics: "Математика",
  informatics: "Информатика",
  history: "История",
  geography_flags: "Страны и флаги",
};
export class EducationUI {
  constructor(ui, game, adapter) {
    Object.assign(this, { ui, game, adapter });
    this.busy = false;
    this.open = false;
    this.generation = 0;
    this.page = 0;
    this.drafts = new Map();
    this.root = document.createElement("section");
    this.root.className = "competition hidden";
    this.root.id = "education";
    this.root.setAttribute("aria-label", "Обучение и проверка");
    document.querySelector(".discovery").append(this.root);
    this.root.addEventListener("click", (e) => this.action(e));
    this.root.addEventListener("input", (e) => {
      if (e.target.name === "written-answer")
        this.drafts.set(e.target.dataset.question, e.target.value);
    });
    this.offReady = adapter.onReady(() =>
      this.recover().catch((e) => {
        this.error = e.message;
        this.render();
      }),
    );
    this.off = adapter.onEvent((e) => this.event(e));
    this.offStatus = adapter.onStatus((s) => {
      if (s !== "connected") {
        this.online = false;
        this.generation++;
        this.render();
      }
    });
    this.measure = document.createElement("canvas").getContext("2d");
    this.measure.font = "16px system-ui";
    this.resizeObserver = new ResizeObserver(() => {
      const w = this.root.clientWidth;
      if (this.open && w && w !== this.width) {
        this.width = w;
        this.render();
      }
    });
    this.resizeObserver.observe(this.root);
  }
  get hasActivity() {
    return ["learning", "seated_quiz"].includes(this.activity?.activity.mode);
  }
  show() {
    this.open = true;
    this.ui.toggleSettings?.(false);
    this.game.setBlocked(true, "education");
    this.render();
  }
  hide() {
    this.open = false;
    this.closing = false;
    this.closeRequested = false;
    this.generation++;
    this.game.setBlocked(false, "education");
    this.render();
    this.game.focusControls();
  }
  setLesson(lesson) {
    const key =
      lesson.material.module.moduleId +
      ":" +
      lesson.material.module.contentVersion;
    if (key !== this.materialKey) this.page = 0;
    this.materialKey = key;
    this.lesson = lesson;
    this.attempt = null;
    this.chooser = null;
    this.shelf = null;
    this.country = null;
  }
  event(e) {
    const p = e.payload;
    let changed = false;
    if (
      ["lesson.opened", "library.opened"].includes(e.type) &&
      p.lessonId !== this.lesson?.lessonId
    ) {
      this.setLesson(p);
      changed = true;
    }
    if (e.type === "country.description") {
      this.country = p;
      this.page = 0;
      changed = true;
    }
    if (
      e.type === "quiz.state" &&
      (!this.attempt ||
        p.attemptId !== this.attempt.attemptId ||
        p.revision > this.attempt.revision)
    ) {
      this.attempt = p;
      this.lesson = null;
      this.chooser = null;
      this.shelf = null;
      this.country = null;
      changed = true;
      if (p.status === "suspended") {
        this.resumables = [
          ...(this.resumables || []).filter((a) => a.attemptId !== p.attemptId),
          p,
        ];
      }
    }
    if (e.type === "education.progress.updated") this.ui.educationProgress = p;
    if (
      e.type === "activity.changed" &&
      (!this.activity || p.revision > this.activity.revision)
    ) {
      this.activity = p;
      changed = true;
      if (
        !this.hasActivity &&
        this.open &&
        !this.chooser &&
        !this.shelf &&
        !this.opening
      ) {
        this.hide();
        return;
      }
    }
    if (changed) this.render();
  }
  async recover() {
    const generation = ++this.generation;
    this.online = false;
    this.render();
    const own = await this.adapter.getActivity();
    const { attempts } = await this.adapter.gameplayGet(
      "/api/v2/education/attempts/me?status=suspended",
      "education",
      "attempts",
    );
    let attempt, lesson;
    if (own.attemptId && own.activity.mode === "seated_quiz")
      attempt = await this.adapter.gameplayGet(
        "/api/v2/education/attempts/" + own.attemptId,
        "education",
        "attempt",
      );
    if (own.lessonId) {
      const { modules } = await this.adapter.gameplayGet(
        `/api/v2/worlds/${this.adapter.worldId}/education/modules`,
        "education",
        "modules",
      );
      const station = this.game.configs.gameplay.education.stations.find(
        (s) => s.teacherId === own.activity.targetId,
      );
      let module = modules.find((m) => m.moduleId === station?.moduleId);
      if (!module) {
        const { books } = await this.adapter.gameplayGet(
          `/api/v2/worlds/${this.adapter.worldId}/library/books`,
          "knowledge",
          "books",
        );
        const book = books.find((b) => b.bookId === own.activity.targetId);
        module = modules.find((m) => m.moduleId === book?.moduleId);
      }
      if (module)
        lesson = {
          lessonId: own.lessonId,
          material: await this.adapter.gameplayGet(
            `/api/v2/worlds/${this.adapter.worldId}/education/modules/${module.moduleId}/versions/${module.contentVersion}`,
            "education",
            "material",
          ),
        };
    }
    if (generation !== this.generation) return;
    this.resumables = attempts;
    this.activity = own;
    if (lesson) this.setLesson(lesson);
    if (attempt) {
      this.attempt = attempt;
      this.lesson = null;
    }
    this.online = this.adapter.ready && this.adapter.lastStatus === "connected";
    if (this.hasActivity) this.show();
    else if (this.open && !this.chooser && !this.shelf) this.hide();
    this.render();
  }
  async loadChoices(stations) {
    this.attempt = null;
    this.lesson = null;
    this.shelf = null;
    this.country = null;
    this.chooser = stations;
    this.show();
    this.busy = true;
    this.render();
    try {
      const [m, a] = await Promise.all([
        this.adapter.gameplayGet(
          `/api/v2/worlds/${this.adapter.worldId}/education/modules`,
          "education",
          "modules",
        ),
        this.adapter.gameplayGet(
          "/api/v2/education/attempts/me?status=suspended",
          "education",
          "attempts",
        ),
      ]);
      this.modules = m.modules;
      this.resumables = a.attempts;
      this.error = null;
    } catch (e) {
      this.error = e.message;
    } finally {
      this.busy = false;
      this.render();
    }
  }
  async openObject(object) {
    if (this.busy || !this.online) return;
    if (this.hasActivity) {
      this.show();
      return;
    }
    if (object.kind === "notebook") {
      const s = this.game.configs.gameplay.education.stations.find(
        (s) => s.moduleId === object.notebook.moduleId,
      );
      await this.loadChoices([s]);
      return;
    }
    this.lesson = null;
    this.attempt = null;
    this.chooser = null;
    this.country = null;
    this.shelf = object.shelf;
    this.show();
    this.busy = true;
    this.render();
    try {
      const result = await this.adapter.gameplayGet(
        `/api/v2/worlds/${this.adapter.worldId}/library/books`,
        "knowledge",
        "books",
      );
      this.books = result.books.filter((b) =>
        this.shelf?.bookIds.includes(b.bookId),
      );
      this.error = null;
    } catch (e) {
      this.error = e.message;
    } finally {
      this.busy = false;
      this.render();
    }
  }
  async openNPC(npc) {
    if (this.busy || !this.online) return;
    if (this.hasActivity) {
      this.show();
      return;
    }
    this.closeRequested = false;
    this.closing = false;
    this.attempt = null;
    this.lesson = null;
    this.country = null;
    this.shelf = null;
    if (npc.role === "examiner") {
      const group = examinerGroups(
        this.game.configs.gameplay.education.stations,
      ).find((g) => g.some((s) => s.examinerId === npc.id));
      await this.loadChoices(group || []);
      return;
    }
    this.chooser = null;
    this.opening = true;
    this.show();
    await this.send("lesson.open", { npcId: npc.id }, ["lesson.opened"]);
    this.opening = false;
    if (!this.lesson && !this.hasActivity) this.hide();
  }
  async send(type, payload, replies) {
    this.busy = true;
    this.error = null;
    this.render();
    let success = false;
    try {
      await this.adapter.execute(type, payload, replies);
      success = true;
    } catch (e) {
      this.error = e.message;
      this.ui.toast(e.message);
    } finally {
      this.busy = false;
      this.render();
    }
    if (this.closeRequested && !this.closing) {
      this.closeRequested = false;
      await this.dismiss();
    }
    return success;
  }
  async dismiss() {
    if (!this.open && !this.hasActivity) return;
    if (this.closing) return;
    if (this.busy) {
      this.closeRequested = true;
      this.render();
      return;
    }
    if (
      this.chooser ||
      this.shelf ||
      (!this.hasActivity && !this.lesson && !this.attempt)
    ) {
      this.chooser = null;
      this.shelf = null;
      this.hide();
      return;
    }
    this.closing = true;
    this.generation++;
    const lessonId = this.activity?.lessonId || this.lesson?.lessonId,
      attemptId = this.activity?.attemptId || this.attempt?.attemptId;
    const ok = lessonId
      ? await this.send("lesson.close", { lessonId }, ["activity.changed"])
      : attemptId
        ? await this.send("quiz.leave", { attemptId }, ["activity.changed"])
        : true;
    if (ok) this.hide();
    else {
      this.closing = false;
      this.render();
    }
  }
  cards() {
    this.measure.font = "16px system-ui";
    return readingCards(
      this.country
        ? [
            {
              heading:
                this.country.nameRu + (this.country.synthetic ? " · Демо" : ""),
              text: this.country.descriptionSentences.join(" "),
            },
          ]
        : lessonBlocks(this.lesson.material),
      (s) => this.measure.measureText(s).width,
      Math.max(
        140,
        (this.root.clientWidth || Math.min(740, innerWidth - 32)) - 88,
      ),
    );
  }
  flag(question) {
    const hash = question?.image?.sha256;
    if (this.flagHandle?.hash !== hash) {
      this.flagHandle?.release();
      this.flagHandle = null;
      if (hash) {
        try {
          this.flagHandle = {
            ...this.game.resources.image(question.image, "education:flag"),
            hash,
          };
        } catch (e) {
          this.error = e.message;
        }
      }
    }
    return this.flagHandle?.url;
  }
  async action(e) {
    const b = e.target.closest("[data-education]");
    if (!b || b.disabled) return;
    const action = b.dataset.education,
      a = this.attempt;
    if (["close", "hide"].includes(action)) {
      await this.dismiss();
      return;
    }
    if (["card-prev", "card-next"].includes(action)) {
      this.page += action === "card-next" ? 1 : -1;
      this.render();
      return;
    }
    if (this.busy || !this.online) return;
    if (action === "retry") {
      await this.recover();
      return;
    }
    if (action === "book") {
      this.opening = true;
      await this.send("library.open", { bookId: b.dataset.book }, [
        "library.opened",
      ]);
      this.opening = false;
      return;
    }
    if (action === "country" && this.adapter.isMock) {
      await this.send(
        "country.describe",
        {
          countryId: "demo-country-a",
          teacherId: this.lesson.material.module.teacherId,
        },
        ["country.description"],
      );
      return;
    }
    if (action === "subject" || action === "resume") {
      const station = this.chooser?.find(
        (s) => s.moduleId === b.dataset.module,
      );
      if (!station) return;
      this.opening = true;
      await this.send(
        action === "resume" ? "quiz.resume" : "quiz.start",
        action === "resume"
          ? { attemptId: b.dataset.attempt, npcId: station.examinerId }
          : { npcId: station.examinerId },
        ["quiz.state"],
      );
      this.opening = false;
      return;
    }
    if (action === "abandon") {
      if (!this.confirmAbandon) {
        this.confirmAbandon = b.dataset.attempt;
        this.render();
        return;
      }
      await this.send("quiz.abandon", { attemptId: b.dataset.attempt }, [
        "quiz.state",
        "activity.changed",
      ]);
      this.resumables = this.resumables.filter(
        (a) => a.attemptId !== b.dataset.attempt,
      );
      this.confirmAbandon = null;
      this.render();
      return;
    }
    if (!a) return;
    if (action === "again") {
      await this.dismiss();
      const station = this.game.configs.gameplay.education.stations.find(
        (s) => s.moduleId === a.moduleId,
      );
      await this.loadChoices([station]);
      return;
    }
    if (action === "answer") {
      const value =
        a.question.kind === "single_choice"
          ? b.dataset.option
          : this.root.querySelector("[name=written-answer]").value;
      if (!value.trim()) {
        this.error = "Введите ответ.";
        this.render();
        return;
      }
      await this.send(
        "quiz.answer",
        {
          attemptId: a.attemptId,
          questionId: a.question.questionId,
          answer: { kind: a.question.kind, value },
        },
        ["quiz.state"],
      );
    }
    if (action === "next")
      await this.send(
        "quiz.next",
        { attemptId: a.attemptId, expectedRevision: a.revision },
        ["quiz.state"],
      );
  }
  render() {
    this.root.classList.toggle("hidden", !this.open);
    if (!this.open) {
      this.flag(null);
      return;
    }
    const a = this.attempt,
      l = this.lesson,
      d = this.busy || !this.online ? "disabled" : "";
    this.root.classList.toggle(
      "education-reading",
      !!l || !!this.chooser || !!this.shelf,
    );
    let content = '<p role="status">Загружаем материал…</p>';
    if (this.shelf)
      content = `<h3>${safe(subjects[this.shelf.subject])} · Книги</h3>${this.books?.length ? `<div class="education-subjects">${this.books.map((b) => `<button data-education="book" data-book="${safe(b.bookId)}" ${d}>${safe(b.title)} <span>→</span></button>`).join("")}</div>` : this.busy ? "<p>Загружаем книги…</p>" : "<p>На этой полке пока нет доступных книг.</p>"}`;
    if (this.chooser)
      content = `<h3>Письменная проверка · 5 вопросов</h3><p>Уход сохранит текущую попытку. Четыре типа оцениваются по демо-ключу; объяснения — без балла.</p><div class="education-subjects">${this.chooser
        .map((s) => {
          const old = this.resumables?.find((a) => a.moduleId === s.moduleId),
            title =
              subjects[
                this.modules?.find((m) => m.moduleId === s.moduleId)?.subject
              ] || s.moduleId;
          return old
            ? `<div><b>${safe(title)}</b><p>Сохранено: вопрос ${old.ordinal}/${old.questionCount}${old.resumeState === "feedback" ? " · ответ уже принят" : ""}</p><button data-education="resume" data-module="${safe(s.moduleId)}" data-attempt="${old.attemptId}" ${d}>Продолжить</button><button data-education="abandon" data-attempt="${old.attemptId}" ${d}>${this.confirmAbandon === old.attemptId ? "Подтвердить отказ от попытки" : "Отказаться от попытки"}</button></div>`
            : `<button data-education="subject" data-module="${safe(s.moduleId)}" ${d}>${safe(title)} <span>Начать →</span></button>`;
        })
        .join(
          "",
        )}</div>${this.confirmAbandon ? '<p class="competition-note">Отказ завершит попытку без зачёта. Для нового теста потребуется отдельное действие.</p>' : ""}`;
    if (l) {
      const cards = this.cards();
      this.page = Math.min(cards.length - 1, Math.max(0, this.page));
      const card = cards[this.page];
      content = `<article class="lesson-card"><span class="eyebrow">${safe(l.material.module.title)}${this.adapter.isMock ? " · Демо" : ""}</span><h3>${safe(card.heading)}</h3><div class="lesson-card-lines" aria-live="polite">${card.lines.map((line) => `<span class="lesson-card-line">${safe(line)}</span>`).join("")}</div></article><nav class="lesson-navigation" aria-label="Карточки материала"><button data-education="card-prev" aria-label="Предыдущая карточка" ${this.page === 0 ? "disabled" : ""}>←</button><span>Карточка ${this.page + 1} из ${cards.length}</span><button data-education="card-next" aria-label="Следующая карточка" ${this.page === cards.length - 1 ? "disabled" : ""}>→</button></nav><p class="lesson-instruction">${this.page === cards.length - 1 ? "Материал прочитан. Можно вернуться в зал." : "Нажмите → для следующей карточки."}</p>${this.adapter.isMock && l.material.module.subject === "geography_flags" && !this.country ? `<button data-education="country" ${d}>Демо: преподаватель расскажет о стране</button>` : ""}`;
    }
    const imageUrl = this.flag(a?.status === "active" ? a.question : null);
    if (a) {
      content = `<p>Вопрос ${a.ordinal}/${a.questionCount} · Счёт ${a.score}/${a.scoredQuestionCount}</p>`;
      if (a.status === "active" && a.question)
        content += `<h3>${safe(a.question.prompt)}</h3>${answerControls(a.question, { scope: "education", disabled: !!d, value: this.drafts.get(a.question.questionId) || "", imageUrl })}`;
      if (a.feedback)
        content += `<h3>${a.feedback.correct === null ? "Учебная обратная связь · без оценки" : a.feedback.correct ? "Верно" : "Разберём ответ"}</h3><p>Ваш ответ: ${safe(a.feedback.submittedAnswer.value)}</p>${a.feedback.expectedAnswer !== null ? `<p>Ожидаемый ответ: ${safe(a.feedback.expectedAnswer)}</p>` : ""}<p>${safe(a.feedback.explanation)}</p><button data-education="next" ${d}>${a.ordinal === a.questionCount ? "Показать итог" : "Следующий вопрос"}</button>`;
      if (a.result)
        content += `<h3>${a.result.passed ? "Проверка пройдена" : "Есть темы для повторения"}</h3><p>${a.result.score}/${a.result.maximumScore} оценённых заданий</p><button data-education="again" ${d}>Повторить</button>`;
      if (a.status === "suspended")
        content +=
          "<p>Попытка сохранена. Продолжите её у тетради или экзаменатора.</p>";
      if (a.status === "interrupted")
        content += "<p>От попытки отказались. Можно начать новую проверку.</p>";
    }
    updatePanel(
      this.root,
      `<header><div><span class="eyebrow">DISCOVERY / ЧИТАЛЬНЫЙ ЗАЛ ${this.adapter.isMock ? "· ДЕМО" : ""}</span><h2>${l ? "Изучение" : this.shelf ? "Библиотека" : this.chooser ? "Тетрадь" : "Проверка знаний"}</h2></div><button data-education="hide" ${this.closing || this.closeRequested ? "disabled" : ""}>${this.closing ? "Сохраняем…" : a ? "Встать и сохранить" : "Вернуться в зал"} ×</button></header>${!this.online ? '<p role="status">Восстанавливаем состояние…</p>' : ""}<div class="competition-body">${this.error ? `<p class="competition-error" role="alert">${safe(this.error)}</p><button data-education="retry" ${d}>Обновить состояние</button>` : ""}${content}</div><footer><span>Esc — меню · E — вернуться в зал${a ? " · незавершённая попытка сохранится" : ""}</span></footer>`,
    );
  }
  dispose() {
    this.flagHandle?.release();
    this.resizeObserver.disconnect();
    this.offReady();
    this.off();
    this.offStatus();
    this.root.remove();
  }
}

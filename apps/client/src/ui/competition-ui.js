import { answerControls } from "./answer-controls.js";
import { updatePanel } from "./panel-dom.js";
import { CompetitionClient } from "../gameplay/competition.js";
const html = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const subjects = {
  mathematics: "Математика",
  informatics: "Информатика",
  history: "История",
  geography_flags: "Страны и флаги",
};
export class CompetitionUI {
  constructor(ui, game, adapter) {
    Object.assign(this, { ui, game, adapter });
    this.open = false;
    this.answerDrafts = new Map();
    this.root = document.createElement("section");
    this.root.id = "competition";
    this.root.className = "competition hidden";
    this.root.setAttribute("aria-label", "Соревнование");
    this.root.setAttribute("aria-live", "polite");
    this.hint = document.createElement("button");
    this.hint.className = "competition-hint hidden";
    this.hint.onclick = () => this.interact();
    this.crosshair = document.createElement("div");
    this.crosshair.className = "crosshair";
    this.crosshair.setAttribute("aria-hidden", "true");
    document
      .querySelector(".discovery")
      .append(this.root, this.hint, this.crosshair);
    this.client = new CompetitionClient(adapter, () => this.render());
    this.root.addEventListener("click", (e) => this.action(e));
    const rememberDraft = (e) => {
      if (e.target.name === "written-answer")
        this.answerDrafts.set(e.target.dataset.question, e.target.value);
      if (!this.conditionDraft) return;
      if (e.target.name === "subject")
        this.conditionDraft.subject = e.target.value;
      if (e.target.name === "stake") this.conditionDraft.stake = e.target.value;
    };
    this.root.addEventListener("input", rememberDraft);
    this.root.addEventListener("change", rememberDraft);
    this.timer = setInterval(() => this.updateClock(), 100);
  }
  update(stats) {
    this.table = stats.table;
    const seated = stats.activity?.mode === "seated_competition";
    const show = !!this.table || seated;
    this.hint.classList.toggle("hidden", !show || this.open);
    this.crosshair.classList.toggle(
      "hidden",
      !this.game.configs.firstPerson.crosshair || this.open,
    );
    if (seated) this.hint.textContent = "E — панель соревнования · F — встать";
    else if (this.table) {
      const s = this.table.summary;
      this.hint.textContent = `E — занять место · Соревнование · ${s?.occupiedSeats.length || 0}/${this.table.seats.length} · ${s?.status === "running" ? "Идёт матч" : s?.status === "lobby" ? "Лобби" : "Свободен"}${s?.subject ? " · " + subjects[s.subject] + " · " + s.stakeAura + " ауры" : ""}`;
    }
  }
  interact() {
    if (this.game.activity.mode === "seated_competition") {
      this.show();
      return true;
    }
    if (!this.table) return false;
    if (!this.client.online) {
      this.ui.toast("Восстанавливаем состояние…");
      return true;
    }
    this.show();
    this.client.join(this.table.tableId);
    return true;
  }
  show() {
    this.open = true;
    this.game.setBlocked(true, "competition");
    this.ui.toggleSettings(false);
    this.render();
  }
  hide() {
    this.confirmLeave = false;
    this.open = false;
    this.game.setBlocked(false, "competition");
    this.game.focusControls();
    this.render();
  }
  requestLeave() {
    const c = this.client;
    if (this.game.activity.mode !== "seated_competition" || !c.value)
      return false;
    this.show();
    if (!c.online || c.pending) {
      this.ui.toast(
        "Дождитесь подтверждения сервера или восстановления связи.",
      );
      return true;
    }
    if (c.value.status === "running") {
      this.confirmLeave = true;
      this.render();
    } else this.leaveConfirmed();
    return true;
  }
  async leaveConfirmed() {
    await this.client.leave();
    if (!this.client.error) this.hide();
  }
  async action(e) {
    const b = e.target.closest("[data-competition]");
    if (!b || b.disabled) return;
    const c = this.client,
      s = c.value;
    switch (b.dataset.competition) {
      case "hide":
        this.hide();
        return;
      case "recover":
        await c.recover().catch((e) => this.ui.toast(e.message));
        return;
      case "configure": {
        const stake = Number(this.root.querySelector("[name=stake]").value),
          subject = this.root.querySelector("[name=subject]").value;
        const limits = this.game.configs.gameplay.competition;
        if (
          !Number.isInteger(stake) ||
          stake < limits.minStakeAura ||
          stake > limits.maxStakeAura
        ) {
          this.ui.toast("Ставка вне разрешённого сервером диапазона");
          return;
        }
        await c.configure(subject, stake);
        break;
      }
      case "ready":
        await c.ready();
        break;
      case "start":
        await c.start();
        break;
      case "answer": {
        const q = s?.round?.question;
        if (!q) return;
        const value =
          q.kind === "single_choice"
            ? b.dataset.option
            : this.root.querySelector("[name=written-answer]").value;
        if (!value.trim()) {
          this.ui.toast("Введите ответ.");
          return;
        }
        await c.answer({ kind: q.kind, value });
        break;
      }
      case "again":
        await c.join(s.tableId);
        break;
      case "leave":
        this.requestLeave();
        break;
      case "stay":
        this.confirmLeave = false;
        this.render();
        return;
      case "confirm-leave":
        this.confirmLeave = false;
        await this.leaveConfirmed();
        break;
    }
  }
  updateClock() {
    const el = this.root.querySelector("[data-deadline]");
    if (el)
      el.textContent =
        Math.max(
          0,
          Math.ceil(
            (Number(el.dataset.deadline) - this.adapter.serverNow) / 1000,
          ),
        ) + " с";
  }
  render() {
    if (!this.client) return;
    const c = this.client,
      s = c.value,
      w = c.wallet,
      me = this.adapter.playerId;
    // Open only on a confirmed seat change or explicit interaction; reconnect never joins a new lobby.
    if (
      c.activity?.activity.mode === "seated_competition" &&
      this.activityRevision !== c.activity.revision
    ) {
      this.activityRevision = c.activity.revision;
      this.open = true;
      this.game.setBlocked(true, "competition");
    }
    this.root.classList.toggle("hidden", !this.open);
    this.hint.classList.toggle(
      "hidden",
      this.open ||
        (!this.table && this.game.activity.mode !== "seated_competition"),
    );
    if (!this.open) {
      this.flagHandle?.release();
      this.flagHandle = null;
      return;
    }
    const enabled = c.online && !c.pending,
      disabled = enabled ? "" : "disabled",
      row = s?.participants.find((p) => p.playerId === me),
      owner = s?.ownerPlayerId === me;
    if (
      s &&
      (!this.conditionDraft ||
        this.conditionDraft.lobbyId !== s.lobbyId ||
        this.conditionDraft.serverSubject !== s.subject ||
        this.conditionDraft.serverStake !== s.stakeAura)
    ) {
      this.conditionDraft = {
        lobbyId: s.lobbyId,
        subject: s.subject,
        stake: String(s.stakeAura),
        serverSubject: s.subject,
        serverStake: s.stakeAura,
      };
    }
    const draft = this.conditionDraft;
    const wallet = w
      ? `<span>Доступно <b>${w.availableAura}</b></span><span>Резерв <b>${w.reservedAura}</b></span><span>Баланс <b>${w.balanceAura}</b> ауры</span>`
      : "Получаем подтверждённый баланс…";
    let body = "Подтверждаем место на сервере…";
    if (this.confirmLeave)
      body = `<h3>Встать во время матча?</h3><p>Оставшиеся вопросы будут пропущены. Ставка продолжает участвовать в расчёте результата.</p><div class="competition-actions"><button data-competition="stay">Остаться</button><button data-competition="confirm-leave" ${disabled}>Подтвердить выход</button></div>`;
    else if (s) {
      const people = `<div class="competition-people">${s.participants.map((p) => `<span class="${p.playerId === me ? "self" : ""}"><b>${html(p.displayName)}</b><small>${p.left ? "Вышел" : !p.connected ? "Нет связи" : s.status === "lobby" ? (p.ready ? "Готов · ставка подтверждена" : "Ожидает подтверждения") : c.roundResult || s.status === "finished" ? p.score + " баллов" : "За столом"}</small></span>`).join("")}</div>`;
      if (s.status === "lobby")
        body = `<div class="competition-terms"><span>ТЕМА <b>${subjects[s.subject]}</b></span><span>СТАВКА КАЖДОГО <b>${s.stakeAura} ауры</b></span><span>ОБЩИЙ БАНК <b>${s.potAura} ауры</b></span></div>${people}${
          owner
            ? `<div class="competition-config"><label>Тема<select name="subject" ${disabled}>${Object.entries(
                subjects,
              )
                .map(
                  ([k, v]) =>
                    `<option value="${k}" ${draft.subject === k ? "selected" : ""}>${v}</option>`,
                )
                .join(
                  "",
                )}</select></label><label>Ставка<input name="stake" type="number" min="${this.game.configs.gameplay.competition.minStakeAura}" max="${this.game.configs.gameplay.competition.maxStakeAura}" value="${html(draft.stake)}" ${disabled}></label><button data-competition="configure" ${disabled}>Изменить условия</button></div>`
            : ""
        }<p class="competition-note">При смене условий готовность всех снимается, резерв возвращается. Победитель получает банк; при ничьей ставки возвращаются всем.</p><div class="competition-actions"><button class="primary-btn" data-competition="ready" ${!enabled || row?.ready ? "disabled" : ""}>${row?.ready ? "Ставка и готовность подтверждены" : "Подтвердить ставку и готовность"}</button>${owner ? `<button data-competition="start" ${!enabled || s.participants.length < 2 || !s.participants.every((p) => p.ready && p.connected) ? "disabled" : ""}>Начать соревнование</button>` : ""}<button data-competition="leave" ${disabled}>F — Встать · полный возврат ставки</button></div>`;
      else if (s.status === "running") {
        const r = s.round || c.lastRound,
          result =
            c.roundResult?.questionId === r?.question.questionId
              ? c.roundResult
              : null;
        const accepted =
          !!r && c.accepted?.questionId === r.question.questionId;
        const hash = r?.question.image?.sha256;
        if (this.flagHandle?.hash !== hash) {
          this.flagHandle?.release();
          this.flagHandle = null;
          if (hash)
            try {
              this.flagHandle = {
                ...this.game.resources.image(
                  r.question.image,
                  "competition:flag",
                ),
                hash,
              };
            } catch (error) {
              this.ui.toast(error.message);
            }
        }
        body = `<div class="competition-round"><span>${subjects[s.subject]} · Вопрос ${r?.ordinal || "—"} / ${s.questionCount}</span><strong data-deadline="${s.round ? Date.parse(s.round.deadlineAt) : 0}"></strong></div>${r ? `<h3>${html(r.question.prompt)}</h3>${answerControls(r.question, { scope: "competition", disabled: !enabled || accepted || !!result || !s.round || row?.left, value: this.answerDrafts.get(r.question.questionId) || "", imageUrl: this.flagHandle?.url })}` : ""}<p class="answer-status" role="status">${!s.round ? "Раунд закрыт. Ждём следующего вопроса…" : accepted ? "Ответ принят, ждём остальных" : c.pending ? "Отправляем ответ. Ждём подтверждения…" : "Отправьте один ответ до окончания времени."}</p>${result ? `<div class="round-explanation"><b>Ожидаемый ответ: ${html(r?.question.options?.find((o) => o.optionId === result.expectedAnswer)?.text || result.expectedAnswer)}</b><p>${html(result.explanation)}</p></div>${people}` : ""}<div class="competition-actions"><button data-competition="leave" ${disabled}>F — Встать</button></div>`;
      } else {
        const settled = s.settlement || c.settlement,
          payout = settled?.payouts.find((p) => p.playerId === me),
          winner = s.participants.find(
            (p) => p.playerId === settled?.winnerPlayerId,
          );
        const title = !settled
          ? "Ожидаем подтверждения выплаты…"
          : settled.outcome === "cancelled"
            ? "Соревнование отменено"
            : settled.outcome === "draw"
              ? "Ничья · возврат всем"
              : `Победитель — ${winner?.displayName || "участник"}`;
        body = `<h3>${html(title)}</h3>${people}<div class="competition-terms"><span>ВАША СТАВКА <b>${s.stakeAura} ауры</b></span><span>${settled?.outcome === "winner" ? "ВЫПЛАТА" : "ВОЗВРАТ"} <b>${payout ? payout.amountAura + " ауры" : "Ожидание сервера"}</b></span></div>${settled?.reason ? `<p>Причина отмены: ${html({ operator: "решение оператора", server_restart: "перезапуск сервера", content_error: "ошибка учебного материала" }[settled.reason])}</p>` : ""}<p>Баланс обновляется только после подтверждения сервера. Новое соревнование требует нового подтверждения ставки.</p><div class="competition-actions"><button class="primary-btn" data-competition="again" ${!enabled || !settled ? "disabled" : ""}>Ещё соревнование</button><button data-competition="leave" ${disabled}>F — Встать</button></div>`;
      }
    }
    if (s?.status !== "running") {
      this.flagHandle?.release();
      this.flagHandle = null;
    }
    updatePanel(
      this.root,
      `<header><div><span class="eyebrow">DISCOVERY / ОБЩИЙ СТОЛ ${this.adapter.isMock ? "· ДЕМО" : ""}</span><h2>Соревнование <small>до ${this.game.configs.gameplay.competition.maxPlayers} игроков</small></h2></div><div class="competition-header-actions"><button data-competition="leave" ${disabled}>F — Встать</button><button data-competition="hide" aria-label="Свернуть панель">Свернуть</button></div></header><div class="competition-wallet">${wallet}</div>${!c.online ? '<p class="connection-warning" role="status">Восстанавливаем соединение и фактическое состояние… Ответы и ставки заблокированы.</p>' : ""}${c.error ? `<p class="competition-error" role="alert">${html(c.error)}</p>` : ""}<div class="competition-body">${body}</div><footer><span>${this.adapter.isMock ? "Демо · виртуальные участники и тестовая аура" : "Сервер Discovery"} · подтверждённое состояние адаптера</span><button data-competition="recover" ${c.pending ? "disabled" : ""}>Обновить состояние</button></footer>`,
    );
    this.updateClock();
  }
  dispose() {
    this.flagHandle?.release();
    clearInterval(this.timer);
    this.client.dispose();
    this.root.remove();
    this.hint.remove();
    this.crosshair.remove();
  }
}

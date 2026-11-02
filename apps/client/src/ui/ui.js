import { readingCards } from "./reading-cards.js";
import { EducationUI } from "./education-ui.js";
import { CompetitionUI } from "./competition-ui.js";
import { AdminDashboard } from "./admin-dashboard.js";
import { icon } from "./icons.js";
import { ACADEMY_ROOMS, roomById } from "../world/academy-locations.js";
import {
  presets,
  validateConfig,
  validateAdmin,
  saveLocal,
} from "../config/config.js";
const kb = (n) => (n / 1024).toFixed(1) + " КБ";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const get = (obj, path) => path.split(".").reduce((v, k) => v?.[k], obj);
const set = (obj, path, value) => {
  const keys = path.split("."),
    last = keys.pop();
  get(obj, keys.join("."))[last] = value;
};
export class UI {
  constructor(configs, adapter) {
    this.configs = configs;
    this.adapter = adapter;
    this.tab = "local";
    this.revisions = {};
    this.isMock = adapter.isMock;
    this.drafts = {};
    this.dialogueGeneration = 0;
    document.querySelector("#app").innerHTML = `
 <main class="discovery"><header class="topbar"><a class="brand" href="./" aria-label="Discovery — главная"><span class="brand-mark">${icon("compass")}</span>discovery<span class="brand-dot">®</span></a><span class="header-divider"></span><span class="edition">МИР, ПОЛНЫЙ ОТКРЫТИЙ</span><nav class="main-nav" aria-label="Навигация"><button class="nav-item" id="home-nav">Главная</button><button class="nav-item" id="examples-nav">Примеры</button><button class="nav-item selected" id="world-nav">${icon("world")} Академия</button><button class="nav-item" id="teachers-nav">Преподаватели</button><button class="nav-item" id="journal">${icon("book")} Дневник</button></nav><div class="header-right"><span class="connection" id="connection"><i></i> Подключение</span><button class="icon-btn" id="help" aria-label="Как играть">${icon("help")}</button><button class="profile" id="profile" aria-label="Профиль исследователя"><span>И</span><span class="profile-label">Исследователь<small id="role-label">Локальный сеанс</small></span>${icon("chevron")}</button></div></header>
 <div id="world" class="world-viewport"></div>
 <div class="world-heading"><div class="eyebrow"><span class="live-dot"></span> DISCOVERY ACADEMY <span> / </span> ${this.adapter.previewProfile ? "ДЕМО · 4 МЕСТА" : "PROTOCOL 2.0"}</div><h1 id="location-title">Читальный зал<span id="location-subtitle">Выберите кабинет или откройте книгу.</span></h1><div class="region-meta">${icon("pin")} <span id="location-meta">Четыре кабинета · Демо</span> <span class="meta-dot">·</span> <span id="world-time">15:00</span></div></div><div class="route-guide hidden" id="route-guide"></div>
 <div class="left-tools"><button class="tool active" id="map-toggle" aria-label="Показать карту" title="Карта кампуса">${icon("world")}</button><button class="tool" id="npc-tool" aria-label="Найти собеседника" title="Познакомиться с Софией">${icon("chat")}</button><button class="tool" id="admin-toggle" aria-label="Панель администратора" title="Панель администратора Вселенной [~]">${icon("spark")}</button><span></span><button class="tool" id="settings-toggle" aria-label="Показать настройки" title="Настройки мира">${icon("settings")}</button></div>

 <aside class="quest-card" id="quest"><div class="quest-top"><span class="quest-icon">${icon("spark")}</span><span>СЛЕДУЮЩИЙ ШАГ</span></div><h2>Начните исследование</h2><p>Откройте каталог преподавателей и выберите кабинет.</p><button id="meet-npc">Найти Софию ${icon("arrow")}</button><div class="quest-progress"><i></i><i></i><i></i></div></aside>
 <div class="controls-hint"><div><kbd>W</kbd><span class="keys-bottom"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div><span>Движение</span><b></b><span class="mouse-symbol">↔</span><span>Камера</span><b></b><kbd>E</kbd><span>Взаимодействие</span></div>
 <div class="world-status"><span class="live-dot"></span><span id="players">3 исследователя</span><span class="status-separator">/</span><span id="fps">— FPS</span><span class="status-separator">/</span><span id="coords">0, 7</span><button id="fullscreen" aria-label="Полноэкранный режим">${icon("expand")}</button></div>
 <aside class="settings-panel" id="settings"><div class="panel-head"><div><span class="eyebrow">ВАШ МИР — ВАШИ ПРАВИЛА</span><h2>Настройки мира</h2></div><button class="icon-btn" id="close-settings" aria-label="Закрыть настройки">${icon("close")}</button></div><div class="settings-tabs" role="tablist" aria-label="Раздел настроек"><button role="tab" aria-selected="true" data-tab="local">Графика</button><button role="tab" aria-selected="false" data-tab="world">Мир</button><button role="tab" aria-selected="false" data-tab="behavior">Поведение</button></div><div class="settings-content" id="settings-content"></div><div class="panel-footer"><span id="save-state">${icon("check")} Изменения сохраняются автоматически</span><button id="reset-settings">${icon("reset")} Сбросить настройки</button></div></aside>
 <div class="minimap hidden" id="minimap"><div>ЧИТАЛЬНЫЙ ЗАЛ <span>С ↑</span></div><svg id="map-svg" viewBox="0 0 128 128" aria-label="Мини-карта текущего interest"><rect id="map-background" x="0" y="0" width="128" height="128" fill="#b1bb97"/><g id="map-chunks"></g><g id="map-npcs"></g><circle id="map-player" r="2" fill="#455a43" stroke="#fff" stroke-width="1"/></svg><small>Щелчок в мире — захват мыши · Esc — курсор</small></div>
 <div class="nearby hidden" id="nearby"><span class="live-dot"></span><span id="nearby-name"></span><button id="talk-nearby"><kbd>E</kbd> Поговорить</button></div>
 <div class="modal-backdrop hidden" id="dialogue-overlay"><section class="dialogue" role="dialog" aria-modal="true" aria-labelledby="dialogue-name"><div class="dialogue-heading"><span class="npc-avatar">С</span><div><span class="eyebrow" id="dialogue-title">ХРАНИТЕЛЬНИЦА ЗНАНИЙ</span><h2 id="dialogue-name">София</h2></div><button class="icon-btn" id="close-dialogue" aria-label="Закрыть диалог">${icon("close")}</button></div><div class="messages" id="messages" aria-live="polite"></div><div class="suggestions"><button data-message="Почему свету нужно время, чтобы добраться до Земли?">Как путешествует свет?</button><button data-message="С чего начать исследование?">С чего начать?</button></div><form id="dialogue-form"><input id="dialogue-input" aria-label="Сообщение для NPC" placeholder="Каждое открытие начинается с вопроса…" maxlength="2000" autocomplete="off" required/><button type="submit" aria-label="Отправить сообщение">${icon("arrow")}</button></form><div class="dialogue-note">${this.isMock ? "Локальная демонстрация · Discovery Protocol 2.0.0" : "Диалог обрабатывается сервером"}</div></section></div>
 <div class="modal-backdrop hidden" id="info-overlay"><section class="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title"><button class="icon-btn" id="close-info" aria-label="Закрыть">${icon("close")}</button><span class="eyebrow">DISCOVERY / ПУТЕВОДИТЕЛЬ</span><h2 id="info-title"></h2><div id="info-body"></div></section></div>
 <div class="toast hidden" id="toast" role="status"></div><div class="loading" id="loading"><span class="brand-mark">${icon("compass")}</span><h2>Ваше открытие совсем рядом</h2><p>Собираем мир по кусочкам…</p></div></main>`;
    this.bind();
    this.renderSettings();
  }
  attach(game) {
    this.game = game;
    this.competition = new CompetitionUI(this, game, this.adapter);
    this.education = new EducationUI(this, game, this.adapter);
    this.adminDashboard = new AdminDashboard(this, game, this.adapter);
    const adminToggleBtn = document.querySelector("#admin-toggle");
    if (adminToggleBtn && !this.adminDashboard.isAdmin) {
      adminToggleBtn.style.display = "none";
    }
    if (this.adapter.isMock && this.adapter.demoScenario) {
      const demo = document.createElement("details");
      demo.className = "demo-tools";
      demo.innerHTML = `<summary>Демо-сценарии</summary><p>Виртуальные участники · тестовый баланс</p><label>Исход<select name="demo-scenario"><option value="win">Боты ошибаются · победа при верных ответах</option><option value="loss">Боты отвечают верно · поражение при ошибках</option><option value="draw">Ничья · бот повторяет ваш результат</option><option value="occupied">Стол занят</option></select></label><label>Участники<select name="demo-count"><option value="2">2</option><option value="${this.configs.gameplay.competition.maxPlayers}">${this.configs.gameplay.competition.maxPlayers}</option></select></label><button data-demo-apply>Применить и сбросить демо-баланс</button><button data-demo-cancel>Отменить текущий матч</button><small>Для недостатка ауры выберите ставку выше 100. Смена сценария доступна стоя.</small>`;
      demo.querySelector("[data-demo-apply]").onclick = async () => {
        try {
          await this.adapter.demoScenario(
            demo.querySelector("[name=demo-scenario]").value,
            Number(demo.querySelector("[name=demo-count]").value),
          );
          this.toast("Демо-сценарий применён. Баланс: 100 ауры.");
        } catch (e) {
          this.toast(e.message);
        }
      };
      demo.querySelector("[data-demo-cancel]").onclick = () =>
        this.adapter.demoCancel();
      document.querySelector(".discovery").append(demo);
    }
    game.disposeUI = () => {
      this.competition.dispose();
      this.education.dispose();
    };
    game.onProgress = (value) => {
      this.progress = value;
    };
  }
  showHome() {
    const rows =
      this.educationProgress?.modules || this.progress?.modules || [];
    const completed = rows.filter((row) => row.passed).length;
    this.info(
      "Добро пожаловать в Discovery Academy",
      `<p>Исследуйте четыре учебных направления в уютной академии: читайте материалы, говорите с преподавателями и проходите письменные проверки.</p><p><strong>Ваш прогресс:</strong> ${completed} из 4 направлений пройдено.</p><p>Следующий шаг — выбрать кабинет в каталоге или открыть книгу в читальном зале.</p><button class="primary-btn" data-home-enter>Войти в академию</button>`,
    );
  }
  showExamples() {
    const rows = this.isMock
      ? [
          [
            "Математика",
            "Числовой ответ",
            "Сколько получится: 3 × 4?",
            "room-mathematics",
          ],
          [
            "Информатика",
            "Короткий текст",
            "Как называется последовательность шагов решения задачи?",
            "room-informatics",
          ],
          [
            "История",
            "Выбор варианта",
            "Какой источник является вещественным?",
            "room-history",
          ],
          [
            "Страны и флаги",
            "Демонстрационная карточка",
            "Какой вымышленной стране принадлежит учебный флаг?",
            "room-geography",
          ],
        ]
      : [];
    this.info(
      "Примеры заданий",
      rows.length
        ? `<p>Это вопросы из локальной демонстрации. В кабинете преподавателя доступны объяснение, проверка из пяти вопросов и обратная связь.</p><div class="academy-cards">${rows.map(([subject, kind, prompt, id]) => `<article><small>${escape(subject)} · ${escape(kind)}</small><h3>${escape(prompt)}</h3><button data-show-room="${id}">Показать кабинет →</button></article>`).join("")}</div>`
        : `<p>Примеры заданий появятся после подключения учебных материалов сервера. Доступные модули можно открыть в академии.</p>`,
    );
  }
  showTeachers() {
    this.info(
      "Каталог преподавателей",
      `<p>Выберите дисциплину. Маркер укажет дверь кабинета на северной стене читального зала.</p><div class="academy-cards">${ACADEMY_ROOMS.map((room) => `<article><small>КАБИНЕТ ${room.number} · ${escape(room.subject)}</small><h3>${escape(room.teacherName)}</h3><p>Материал, объяснение и письменная проверка.</p><button data-show-room="${room.roomId}">Показать кабинет →</button></article>`).join("")}</div>`,
    );
  }
  chooseCabinet(roomId) {
    const room = roomById(roomId);
    if (!room) return;
    this.game.guideRoomId = roomId;
    this.$("#info-overlay").classList.add("hidden");
    this.game.setBlocked(false, "info");
    this.game.focusControls();
    this.$("#route-guide").textContent =
      `${room.number} · ${room.subject} — дверь на северной стене`;
    this.$("#route-guide").classList.remove("hidden");
    this.toast(`Кабинет ${room.number} отмечен. Идите к северной стене.`);
  }
  bind() {
    const $ = (s) => document.querySelector(s);
    this.$ = $;
    $("#home-nav").onclick = () => this.showHome();
    $("#examples-nav").onclick = () => this.showExamples();
    $("#teachers-nav").onclick = () => this.showTeachers();
    $(".brand").onclick = (event) => {
      event.preventDefault();
      this.showHome();
    };
    $("#close-settings").onclick = () => this.toggleSettings(false);
    $("#settings-toggle").onclick = () =>
      this.toggleSettings($("#settings").classList.contains("hidden"));
    $("#admin-toggle").onclick = () => {
      if (this.adminDashboard?.isAdmin) {
        this.adminDashboard.toggle();
      }
    };
    $("#world-nav").onclick = () => {
      $("#info-overlay").classList.add("hidden");
      this.game?.setBlocked(false, "info");
      this.game?.focusControls();
    };
    document.querySelectorAll("[data-tab]").forEach(
      (button) =>
        (button.onclick = async () => {
          this.tab = button.dataset.tab;
          document
            .querySelectorAll("[data-tab]")
            .forEach((b) =>
              b.setAttribute("aria-selected", String(b === button)),
            );
          if (
            this.tab !== "local" &&
            this.adapter.role === "admin" &&
            !this.adminDraft
          )
            await this.reloadAdmin();
          this.renderSettings();
        }),
    );
    $("#settings-content").addEventListener("input", (e) => this.onSetting(e));
    $("#settings-content").addEventListener("click", async (e) => {
      try {
        const quality = e.target.closest("[data-quality]");
        if (quality) {
          this.configs.render = {
            ...this.configs.render,
            ...presets[quality.dataset.quality],
          };
          this.applyLocal();
          this.renderSettings();
        }
        if (e.target.closest("#demo-admin")) {
          await this.adapter.loginDemoAdmin();
          this.setRole("admin");
          await this.reloadAdmin();
          this.renderSettings();
          this.toast("Демо-администратор: вход через /api/v2/auth/login");
        }
        if (e.target.closest("#save-server")) await this.saveServer();
        if (e.target.closest("#reload-server")) {
          await this.reloadAdmin();
          this.renderSettings();
        }
        if (e.target.closest("#clear-cache")) {
          this.game.resources.ledger.clearCache();
          this.toast("Неиспользуемый LRU-кеш очищен");
        }
      } catch (error) {
        this.toast(error.message);
      }
    });
    $("#reset-settings").onclick = () => {
      if (this.tab === "local") {
        const values = this.adapter.publicConfig.values;
        this.configs.render = structuredClone(values.renderDefaults);
        this.configs.characterVisual = structuredClone(
          values.characterVisualDefaults,
        );
        this.applyLocal();
        this.renderSettings();
        this.toast("Восстановлены серверные графические defaults");
      } else if (this.adminLoaded) {
        this.adminDraft = structuredClone(this.adminLoaded.values);
        this.renderSettings();
        this.toast(
          "Правки отменены. Восстановлена загруженная серверная версия.",
        );
      }
    };
    $("#map-toggle").onclick = () => $("#minimap").classList.toggle("hidden");
    $("#fullscreen").onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        this.toast("Полноэкранный режим недоступен");
      }
    };
    $("#meet-npc").onclick = $("#npc-tool").onclick = () => {
      const npc = this.game?.npcs.values().next().value;
      if (!npc) {
        this.toast("Дождитесь загрузки NPC текущего interest");
        return;
      }
      this.game.approachNPC(npc.id);
      this.approaching = null;
      this.toast(
        "София впереди. Щёлкните в мире для обзора и подойдите с WASD.",
      );
    };
    $("#talk-nearby").onclick = () => this.openDialogue(this.nearest?.id);
    $("#close-dialogue").onclick = () => this.closeDialogue();
    $("#messages").addEventListener("click", (e) => {
      const b = e.target.closest("[data-dialogue-page]");
      if (!b || b.disabled) return;
      this.dialogueCard += Number(b.dataset.dialoguePage);
      this.renderDialogueCards();
    });
    $("#dialogue-form").onsubmit = (e) => {
      e.preventDefault();
      this.sendMessage($("#dialogue-input").value);
    };
    document
      .querySelectorAll("[data-message]")
      .forEach((b) => (b.onclick = () => this.sendMessage(b.dataset.message)));
    $("#help").onclick = () =>
      this.info(
        "Следуйте за любопытством",
        "<p><kbd>W A S D</kbd> / стрелки — движение. Движение относительно направления взгляда.</p><p>Щелчок в мире — захват мыши; мышь — обзор. <kbd>E</kbd> рядом с NPC — диалог; Esc — меню; уход из проверки — кнопкой «Встать и сохранить».</p><p>Клиент получает только разрешённый сервером interest. Во время загрузки движение заморожено.</p>",
      );
    $("#journal").onclick = () =>
      this.info(
        "Дневник исследователя",
        `<p class="journal-date">ГЛАВА 01 / ЧИТАЛЬНЫЙ ЗАЛ</p><h3>Каждый вопрос — начало пути.</h3><p>${this.discovered ? "Вы поговорили с Софией. Продолжайте исследование." : "Найдите Софию и задайте первый вопрос."}</p><p class="muted">Учебная отметка сеанса. Постоянный прогресс меняется только по серверному progress.updated.</p>`,
      );
    $("#profile").onclick = () =>
      this.info(
        "Исследователь",
        `<p>Роль из авторизованного API: <strong>${this.adapter.role === "admin" ? "администратор" : "игрок"}</strong>.</p><p>${this.isMock ? "Мира и Алекс — синтетические участники локального mock-сервера." : "Многопользовательский сеанс на сервере Discovery."}</p><p class="muted">Protocol 2.0.0 · токен хранится только в памяти браузера.</p><button id="logout-client" class="primary-btn">Выйти из сеанса</button>`,
      );
    $("#info-body").addEventListener("click", async (e) => {
      if (e.target.closest("[data-home-enter]")) {
        $("#info-overlay").classList.add("hidden");
        this.game.setBlocked(false, "info");
        this.game.focusControls();
      }
      const roomButton = e.target.closest("[data-show-room]");
      if (roomButton) this.chooseCabinet(roomButton.dataset.showRoom);
      if (e.target.id === "logout-client") {
        try {
          await this.adapter.logout();
        } finally {
          await this.game.dispose();
          location.reload();
        }
      }
    });
    $("#close-info").onclick = () => {
      $("#info-overlay").classList.add("hidden");
      this.game?.setBlocked(false, "info");
      this.game?.focusControls();
    };
    window.addEventListener("keydown", (e) => {
      if (
        e.code === "KeyF" &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.isComposing &&
        !e.target.closest?.("input,textarea,select,[contenteditable=true]") &&
        this.competition?.requestLeave()
      ) {
        e.preventDefault();
        return;
      }
      if (e.code === "Escape") {
        if (this.competition?.open) {
          this.competition.hide();
          return;
        }
        if (this.education?.open || this.education?.hasActivity) {
          this.info(
            "Меню",
            "<p>Проверка продолжается в текущем состоянии. Закройте это меню, чтобы вернуться к карточке. Для ухода используйте «Встать и сохранить».</p>",
          );
          return;
        }
        this.closeDialogue();
        $("#info-overlay").classList.add("hidden");
        this.game?.setBlocked(false, "info");
        this.game?.focusControls();
      }
      if (
        e.code === "KeyE" &&
        !e.repeat &&
        this.education?.open &&
        !e.target.closest?.("input,textarea,select,[contenteditable=true]")
      ) {
        e.preventDefault();
        this.education.dismiss();
        return;
      }
      if (
        e.code === "KeyE" &&
        !e.repeat &&
        !e.target.closest?.("input,textarea,select,button") &&
        this.competition?.interact()
      ) {
        e.preventDefault();
        return;
      }
      const maxRadius = Math.max(3.5, this.configs?.character?.interactionRadiusM || 3.0);
      if (
        e.code === "KeyE" &&
        !e.repeat &&
        !e.target.closest?.("input,textarea,select") &&
        this.nearest &&
        this.nearest.kind !== "door" &&
        this.nearest.distance <= maxRadius &&
        $("#info-overlay").classList.contains("hidden")
      )
        this.openDialogue(this.nearest.id);
    });
    for (const id of ["dialogue-overlay", "info-overlay"])
      $("#" + id).addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        const items = [
            ...e.currentTarget.querySelectorAll(
              "button:not(:disabled),input:not(:disabled)",
            ),
          ],
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
  }
  toggleSettings(open) {
    this.$("#settings").classList.toggle("hidden", !open);
    document.body.classList.toggle("settings-closed", !open);
  }
  setRole(role) {
    this.$("#role-label").textContent = this.isMock
      ? role === "admin"
        ? "Демо-администратор"
        : "Автономный демо-зал"
      : role === "admin"
        ? "Администратор"
        : "Авторизованный игрок";
  }
  setConnection(status) {
    const node = this.$("#connection");
    node.classList.toggle("disconnected", status !== "connected");
    node.innerHTML = `<i></i> ${status === "connected" ? (this.isMock ? "Локальный мир" : "На связи") : { connecting: "Подключение", reconnecting: "Переподключение", "auth-expired": "Войдите снова", replaced: "Сеанс заменён", closed: "Отключён" }[status] || "Ошибка связи"}`;
    if (status.startsWith("error:")) this.toast(status.slice(6));
    if (["auth-expired", "replaced"].includes(status))
      this.info(
        "Сеанс завершён",
        "<p>Нужно заново авторизоваться. Перезагрузите страницу для входа.</p>",
      );
  }
  field(
    path,
    label,
    { min = 0, max = 1, step = 0.1, type = "range", options } = {},
  ) {
    const local = path.startsWith("local."),
      value = get(
        local ? this.configs : this.adminDraft,
        path.replace(/^(local|admin)\./, ""),
      );
    const disabled = !local && this.adapter.role !== "admin";
    const data = `data-path="${path}" ${disabled ? "disabled" : ""}`;
    if (type === "toggle")
      return `<label class="toggle-row"><span>${label}</span><input type="checkbox" ${data} ${value ? "checked" : ""}/><span class="switch"></span></label>`;
    if (options)
      return `<label class="select-label">${label}<select ${data}>${options
        .map((o) => {
          const [v, title] = Array.isArray(o) ? o : [o, o];
          return `<option value="${escape(v)}" ${v === value ? "selected" : ""}>${escape(title)}</option>`;
        })
        .join("")}</select></label>`;
    if (type === "textarea" || type === "text")
      return `<label class="select-label">${label}${type === "textarea" ? `<textarea rows="4" ${data}>${escape(value || "")}</textarea>` : `<input type="text" ${data} value="${escape(value || "")}"/>`}</label>`;
    return `<label class="range-label"><span>${label}<output data-output="${path}">${escape(value)}</output></span><input type="${type}" min="${min}" max="${max}" step="${step}" value="${value}" ${data} aria-label="${escape(label)}"/><span class="range-extremes"><small>${min}</small><small>${max}</small></span></label>`;
  }
  renderSettings() {
    let html = "";
    const f = (...args) => this.field(...args);
    if (this.tab === "local") {
      const modelIds = this.game?.resources.assets
        ? [...this.game.resources.assets.values()]
            .filter(
              (d) =>
                d.mediaType.startsWith("model/") &&
                !d.resourceId.startsWith("terrain-"),
            )
            .map((d) => d.resourceId)
        : [this.configs.characterVisual.playerModelId];
      html = `<div class="scope-note">${icon("user")} Только на вашем устройстве <span class="scope-dot"></span></div><div class="section-title">Качество графики <span>01</span></div><div class="quality-options">${[
        ["low", "leaf", "Экономное"],
        ["medium", "sun", "Баланс"],
        ["high", "spark", "Высокое"],
      ]
        .map(
          ([v, i, label]) =>
            `<button data-quality="${v}" aria-pressed="${this.configs.render.quality === v}" class="quality ${this.configs.render.quality === v ? "selected" : ""}">${icon(i)}<span>${label}</span>${this.configs.render.quality === v ? "<i>✓</i>" : ""}</button>`,
        )
        .join(
          "",
        )}</div><p class="setting-note">Параметры меняются без перезагрузки.<br>Дальность не расширяет серверный interest.</p>${f("local.render.drawDistanceM", "Дальность прорисовки, м", { min: 30, max: 200, step: 5 })}${f("local.render.pixelRatio", "Масштаб разрешения", { min: 0.5, max: 2, step: 0.25 })}<div class="section-rule"></div><div class="section-title">Свет и детали <span>02</span></div>${f("local.render.shadows", "Мягкие тени", { type: "toggle" })}${f("local.render.lod", "LOD по расстоянию", { type: "toggle" })}${f("local.render.animationEnabled", "Анимации мира", { type: "toggle" })}<details class="settings-details"><summary>${icon("user")} Персонажи ${icon("chevron")}</summary>${f("local.characterVisual.playerModelId", "Модель игрока", { options: [...new Set([this.configs.characterVisual.playerModelId, ...modelIds])] })}${f("local.characterVisual.npcModelId", "Модель NPC", { options: [...new Set([this.configs.characterVisual.npcModelId, ...modelIds])] })}${f("local.characterVisual.modelScale", "Визуальный масштаб", { min: 0.1, max: 5, step: 0.1 })}${f("local.characterVisual.animationRate", "Скорость анимации", { min: 0.25, max: 3, step: 0.25 })}${f("local.characterVisual.showNames", "Отображать имена", { type: "toggle" })}${f(
        "local.characterVisual.materialStyle",
        "Материалы",
        {
          options: [
            ["standard", "Стандартные"],
            ["flat", "Плоское затенение"],
          ],
        },
      )}${f(
        "local.characterVisual.interactionReaction",
        "Реакция на взаимодействие",
        {
          options: [
            ["nod", "Кивок"],
            ["wave", "Взмах рукой"],
            ["none", "Без реакции"],
          ],
        },
      )}</details><details class="settings-details"><summary>${icon("settings")} Освещение и отображение ${icon("chevron")}</summary>${f("local.render.exposure", "Экспозиция", { min: 0.1, max: 4, step: 0.1 })}<label class="toggle-row"><span>Показывать модели мира</span><input type="checkbox" data-view="modelsVisible" ${this.game?.modelsVisible === false ? "" : "checked"}/><span class="switch"></span></label><label class="toggle-row"><span>Границы чанков на карте</span><input type="checkbox" data-view="showChunks" ${this.showChunks ? "checked" : ""}/><span class="switch"></span></label></details><div class="resource-card"><div>${icon("leaf")} БЮДЖЕТ ДЕМО <span id="resource-active">—</span></div><div class="resource-bar"><i id="resource-bar"></i></div><p>Удержано <strong id="resource-cache">—</strong> / <span id="resource-limit">—</span><span>≤10% W</span></p><small id="resource-detail">Потоковые ресурсы; локальные модели /assets/models/ вне этого показателя. Не production-замер.</small></div><details class="settings-details"><summary>Диагностика ${icon("chevron")}</summary><div id="diagnostics">Ожидание сцены…</div><button class="secondary-btn" id="clear-cache">Очистить неактивный LRU</button></details>`;
    } else {
      html = `<div class="scope-note">${icon("shield")} Авторизованный серверный API <span class="scope-dot server"></span></div>`;
      if (this.adapter.role !== "admin") {
        html += `<div class="permission-note">${icon("shield")}<div>Доступно администратору<small>Роль проверяется сервером. Закрытые параметры NPC игроку не выдаются.</small></div></div>${this.isMock ? '<p class="setting-note">В автономном прототипе серверные параметры недоступны.</p>' : ""}<p class="setting-note">Текущий мир: ${escape(this.configs.world.worldId)} · время ${this.configs.world.timeOfDayHours}:00 · погода ${escape(this.configs.world.weather)}</p>`;
      } else if (!this.adminDraft) {
        html +=
          '<button class="secondary-btn full" id="reload-server">Загрузить параметры администратора</button>';
      } else {
        if (this.tab === "world") {
          html += `<div class="section-title">Окружение <span>01</span></div>${f("admin.world.timeOfDayHours", "Время суток", { min: 0, max: 24, step: 0.5 })}${f(
            "admin.world.weather",
            "Погода",
            {
              options: [
                ["clear", "Ясно"],
                ["cloudy", "Облачно"],
                ["rain", "Дождь"],
              ],
            },
          )}${f("admin.world.decorDensity", "Плотность декора", { min: 0, max: 1, step: 0.1 })}<details class="settings-details"><summary>Расположение объектов ${icon("chevron")}</summary><p class="setting-note">Структурные изменения требуют остановленных комнат и опубликованного каталога. При активной комнате сервер вернёт RESTART_REQUIRED.</p>${this.adminDraft.world.placements
            .slice(0, 8)
            .map(
              (o, i) =>
                `<div class="object-editor"><strong>${escape(o.id)}</strong>${["x", "y", "z"].map((axis) => f(`admin.world.placements.${i}.position.${axis}`, axis.toUpperCase(), { type: "number", min: -100000, max: 100000, step: 1 })).join("")}${f(`admin.world.placements.${i}.yawRad`, "Поворот, рад", { min: -3.14, max: 3.14, step: 0.01 })}</div>`,
            )
            .join("")}</details>`;
        } else {
          html += `<div class="section-title">Правила персонажей <span>01</span></div><p class="setting-note">Эти правила исполняет сервер. Доступны только администратору.</p>${f("admin.character.walkSpeedMps", "Серверная скорость ходьбы, м/с", { min: 1, max: 10, step: 0.25 })}${f("admin.character.runMultiplier", "Множитель бега", { min: 1, max: 3, step: 0.1 })}${f("admin.character.interactionRadiusM", "Радиус диалога, м", { min: 1, max: 10, step: 0.5 })}<div class="section-rule"></div><div class="section-title">Поведение NPC <span>02</span></div>${this.adminDraft.npcBehavior.profiles
            .map(
              (p, i) =>
                `<details class="settings-details" ${i === 0 ? "open" : ""}><summary>${escape(p.displayName)} ${icon("chevron")}</summary>${f(`admin.npcBehavior.profiles.${i}.personality`, "Характер", { type: "textarea" })}${f(`admin.npcBehavior.profiles.${i}.subject`, "Учебная тема", { type: "text" })}${f(
                  `admin.npcBehavior.profiles.${i}.difficulty`,
                  "Сложность",
                  {
                    options: [
                      ["simple", "Начальная"],
                      ["adaptive", "Адаптивная"],
                      ["advanced", "Продвинутая"],
                    ],
                  },
                )}${f(`admin.npcBehavior.profiles.${i}.memoryTurns`, "Память, реплик", { min: 0, max: 40, step: 1 })}${f(`admin.npcBehavior.profiles.${i}.timeoutMs`, "Тайм-аут, мс", { min: 500, max: 30000, step: 500 })}${f(`admin.npcBehavior.profiles.${i}.fallbackText`, "Резервный ответ", { type: "textarea" })}<p class="setting-note">Provider: ${escape(p.provider)} · knowledge pack: ${escape(p.knowledgePackId)}. Исполнение остаётся на сервере.</p></details>`,
            )
            .join("")}`;
        }
        html +=
          '<button class="primary-btn full" id="save-server">Применить через API</button><button class="text-btn full" id="reload-server">Загрузить актуальную версию</button><p class="setting-note">Полная замена adminValues · If-Match: ' +
          escape(this.adminEtag) +
          " · изменения на серверном тике.</p>";
      }
    }
    this.$("#settings-content").innerHTML = html;
    this.$("#save-state").innerHTML =
      this.tab === "local"
        ? `${icon("check")} Изменения сохраняются автоматически`
        : `${icon("shield")} ${this.adapter.role === "admin" ? "Сервер проверяет права и ревизию" : "Режим просмотра"}`;
    this.$("#reset-settings").innerHTML =
      icon("reset") +
      (this.tab === "local" ? " Сбросить настройки" : " Отменить правки");
  }
  onSetting(e) {
    const el = e.target;
    if (el.dataset.view) {
      if (typeof el.checked !== "boolean") return;
      if (el.dataset.view === "modelsVisible") {
        this.game.modelsVisible = el.checked;
        for (const { roots } of this.game.resources.roots.values())
          roots.forEach((root) => (root.visible = el.checked));
      } else {
        this.showChunks = el.checked;
      }
      return;
    }
    const path = el.dataset.path;
    if (!path) return;
    try {
      const value =
        el.type === "checkbox"
          ? el.checked
          : ["range", "number"].includes(el.type)
            ? Number(el.value)
            : el.value;
      if (el.type === "number" && el.value === "") throw Error("Введите число");
      const local = path.startsWith("local.");
      if (local) {
        const [kind, ...keys] = path.slice(6).split(".");
        const candidate = structuredClone(this.configs[kind]);
        set({ value: candidate }, "value." + keys.join("."), value);
        this.configs[kind] = validateConfig(kind, candidate);
        this.applyLocal();
      } else {
        if (this.adapter.role !== "admin") throw Error("FORBIDDEN");
        const candidate = structuredClone(this.adminDraft);
        set(candidate, path.slice(6), value);
        this.adminDraft = validateAdmin(candidate);
      }
      const output = this.$(`[data-output="${path}"]`);
      if (output) output.value = String(value);
    } catch (error) {
      this.toast(error.message);
    }
  }
  applyLocal() {
    try {
      validateConfig("render", this.configs.render);
      validateConfig("characterVisual", this.configs.characterVisual);
      this.game?.hydrateActors();
      this.game?.applyRender();
      if (!saveLocal(localStorage, this.configs))
        this.toast("Настройки применены; localStorage недоступен");
    } catch (error) {
      this.toast(error.message);
    }
  }
  async reloadAdmin() {
    try {
      const result = await this.adapter.getAdminConfig();
      this.adminLoaded = structuredClone(result.value);
      this.adminDraft = structuredClone(result.value.values);
      this.adminEtag = result.etag || `"config-${result.value.revision}"`;
    } catch (error) {
      this.toast(error.message);
    }
  }
  async saveServer() {
    try {
      if (this.adapter.role !== "admin") throw Error("FORBIDDEN");
      const button = this.$("#save-server");
      if (button) {
        button.disabled = true;
        button.textContent = "Сохранение…";
      }
      const result = await this.adapter.saveAdminConfig(
        validateAdmin(this.adminDraft),
        this.adminEtag,
      );
      this.adminLoaded = structuredClone(result.value);
      this.adminDraft = structuredClone(result.value.values);
      this.adminEtag = result.etag || `"config-${result.value.revision}"`;
      this.toast("Сервер принял конфигурацию. Применение на следующем тике.");
    } catch (error) {
      this.toast(
        error.code === "CONFIG_CONFLICT"
          ? "Конфликт версии. Загрузите актуальные параметры; автоматической перезаписи нет."
          : error.message,
      );
    } finally {
      this.renderSettings();
    }
  }
  update(stats) {
    this.lastStats = stats;
    this.competition?.update(stats);
    this.nearest = stats.nearest;
    const currentRoom = roomById(stats.locationId);
    this.$("#location-title").firstChild.textContent =
      currentRoom?.title || "Читальный зал";
    this.$("#location-subtitle").textContent = currentRoom
      ? "Учитесь у преподавателя и проходите проверку."
      : "Выберите кабинет или откройте книгу.";
    this.$("#location-meta").textContent = currentRoom
      ? `${currentRoom.subject} · Демо`
      : "Четыре кабинета · Демо";
    this.$("#quest").classList.toggle("hidden", Boolean(currentRoom));
    this.$("#fps").textContent = stats.fps + " FPS";
    this.$("#players").textContent = stats.players + " исследователя";
    this.$("#coords").textContent =
      `${stats.position[0].toFixed(0)}, ${stats.position[2].toFixed(0)}`;
    const time = this.configs.world.timeOfDayHours;
    this.$("#world-time").textContent =
      String(Math.floor(time)).padStart(2, "0") +
      ":" +
      (time % 1 ? "30" : "00");
    const maxRadius = Math.max(3.5, this.configs?.character?.interactionRadiusM || 3.0);
    const nearby =
      this.nearest &&
      this.nearest.distance <= maxRadius;
    this.$("#nearby").classList.toggle("hidden", !nearby);
    this.$("#nearby-name").textContent = this.nearest?.name || "";
    this.$("#talk-nearby").innerHTML =
      this.nearest?.kind === "door"
        ? "Пройдите через открытую дверь"
        : "<kbd>E</kbd> " +
      (this.nearest?.kind === "shelf"
        ? "Выбрать книгу"
        : this.nearest?.kind === "notebook"
            ? "Начать проверку"
            : this.nearest?.role === "examiner"
              ? "Выбрать тему"
              : this.nearest?.id === "npc-guide"
                ? "Поговорить"
                : "Изучить материал");
    const x = stats.position[0],
      z = stats.position[2],
      size = this.configs.world.chunkSizeM;
    this.$("#map-svg").setAttribute("viewBox", `${x - 64} ${z - 64} 128 128`);
    this.$("#map-background").setAttribute("x", x - 64);
    this.$("#map-background").setAttribute("y", z - 64);
    this.$("#map-chunks").innerHTML = (this.adapter.interest?.chunks || [])
      .map(
        (d) =>
          `<rect x="${d.x * size}" y="${d.z * size}" width="${size}" height="${size}" fill="#d3d9bb" stroke="${this.showChunks ? "#83956f" : "none"}" stroke-width=".5"/>`,
      )
      .join("");
    this.$("#map-npcs").innerHTML = [...this.game.npcs.values()]
      .map(
        (n) =>
          `<circle cx="${n.root.position.x}" cy="${n.root.position.z}" r="1.5" fill="#b87859"/>`,
      )
      .join("");
    this.$("#map-player").setAttribute("cx", x);
    this.$("#map-player").setAttribute("cy", z);
    const ids = [...(this.game.resources.assets?.keys() || [])].join(",");
    if (ids && ids !== this.modelList) {
      this.modelList = ids;
      if (this.tab === "local") this.renderSettings();
    }
    if (this.$("#resource-cache")) {
      this.$("#resource-cache").textContent = kb(stats.used);
      this.$("#resource-limit").textContent = kb(stats.budget);
      this.$("#resource-active").textContent = stats.chunks + " чанков";
      this.$("#resource-bar").style.width =
        Math.min(100, (stats.used / stats.budget) * 100) + "%";
      this.$("#resource-detail").textContent =
        `Резидентно ${kb(stats.resident)} · резерв ${kb(stats.reserved)} · W ${kb(stats.total)}`;
    }
    if (this.$("#diagnostics"))
      this.$("#diagnostics").textContent =
        `${stats.calls} draw calls · ${stats.triangles.toLocaleString("ru")} треугольников · оценка RAM/VRAM ${(stats.physical / 1048576).toFixed(1)}/256 МиБ · выгрузок ${stats.evictions} · ${stats.ready ? "world.ready" : "загрузка interest"}`;
    if (this.approaching && this.game.keys.size) this.approaching = null;
    if (
      this.approaching &&
      this.nearest &&
      this.approaching === this.nearest.id &&
      this.nearest.distance <= maxRadius
    ) {
      this.approaching = null;
      this.openDialogue(this.nearest.id);
    }
    if (stats.error && stats.error !== this.lastError) {
      this.toast(stats.error);
      this.lastError = stats.error;
    }
  }
  async openDialogue(id) {
    if (!id || !this.$("#dialogue-overlay").classList.contains("hidden"))
      return;
    const object = this.game.readingObjects().find((o) => o.id === id);
    if (object) {
      await this.education.openObject(object);
      return;
    }
    const npc = this.game.npcs.get(id);
    if (!npc) return;
    if (id !== "npc-guide") {
      await this.education.openNPC(npc);
      return;
    }
    this.dialogueNPC = id;
    this.game.setNpcDialogueFrozen(id, true);
    this.returnFocus = document.activeElement;
    this.game.setBlocked(true, "dialogue");
    this.dialogueGeneration++;
    this.$("#dialogue-name").textContent = npc.name;
    this.$("#dialogue-title").textContent = npc.title;
    this.$("#messages").innerHTML = "";

    this.dialogueHistories ||= new Map();
    const storageKey = `discovery_dialogue_${this.adapter?.userId ? this.adapter.userId + "_" : ""}${id}`;
    let saved = this.dialogueHistories.get(id);
    if (!saved || saved.length === 0) {
      try {
        const stored = localStorage.getItem(storageKey) || localStorage.getItem(`discovery_dialogue_${id}`);
        if (stored) {
          saved = JSON.parse(stored);
        }
      } catch (_) {}
    }

    if (saved && saved.length > 0) {
      this.dialogueHistory = [...saved];
      this.dialogueHistories.set(id, this.dialogueHistory);
      this.dialogueCard = Infinity;
      this.renderDialogueCards();
    } else {
      this.dialogueHistory = [];
      this.dialogueHistories.set(id, this.dialogueHistory);
      this.dialogueCard = 0;
      this.appendMessage(
        `Привет! Я ${npc.name}. Моя тема — ${npc.title.toLowerCase()}. Какой вопрос исследуем?`,
        false,
      );
    }

    this.$("#dialogue-overlay").classList.remove("hidden");
    this.$("#dialogue-input").focus();
    const reaction = this.configs.characterVisual.interactionReaction;
    if (this.game.player.userData.body && reaction !== "none")
      this.game.player.userData.body.rotation.z =
        reaction === "wave" ? 0.15 : 0.07;
  }
  closeDialogue() {
    if (!this.$("#dialogue-overlay")) return;
    const open = !this.$("#dialogue-overlay").classList.contains("hidden");
    if (open) this.adapter.cancelPending();
    this.$("#dialogue-overlay").classList.add("hidden");
    if (this.dialogueNPC) this.game?.setNpcDialogueFrozen(this.dialogueNPC, false);
    this.dialogueNPC = null;
    this.dialogueGeneration++;
    this.busy = false;
    this.$("#dialogue-form button").disabled = false;
    this.game?.setBlocked(false, "dialogue");
    if (this.game?.player.userData.body)
      this.game.player.userData.body.rotation.z = 0;
    if (open) this.game?.focusControls();
  }
  appendMessage(text, mine) {
    this.dialogueHistory ||= [];
    this.dialogueHistory.push({
      heading: mine ? "Вы" : this.$("#dialogue-name").textContent,
      text:
        typeof text === "string" ? text : "Сервер вернул некорректный ответ",
    });
    if (this.dialogueNPC) {
      this.dialogueHistories ||= new Map();
      this.dialogueHistories.set(this.dialogueNPC, this.dialogueHistory);
      try {
        const storageKey = `discovery_dialogue_${this.adapter?.userId ? this.adapter.userId + "_" : ""}${this.dialogueNPC}`;
        localStorage.setItem(storageKey, JSON.stringify(this.dialogueHistory));
      } catch (_) {}
    }
    this.dialogueCard = Infinity;
    this.renderDialogueCards();
  }
  renderDialogueCards() {
    const element = this.$("#messages"),
      context = document.createElement("canvas").getContext("2d");
    context.font = "16px system-ui";
    const cards = readingCards(
      this.dialogueHistory,
      (s) => context.measureText(s).width,
      Math.max(140, element.clientWidth - 44),
    );
    this.dialogueCard = Math.max(
      0,
      Math.min(cards.length - 1, this.dialogueCard),
    );
    const card = cards[this.dialogueCard];
    if (!card) return;
    element.innerHTML = `<div class="dialogue-reading-card"><b>${escape(card.heading)}</b><div class="lesson-card-lines">${card.lines.map((line) => `<span class="lesson-card-line">${escape(line)}</span>`).join("")}</div></div><nav class="lesson-navigation" aria-label="Карточки диалога"><button data-dialogue-page="-1" aria-label="Предыдущая карточка диалога" ${this.dialogueCard === 0 ? "disabled" : ""}>←</button><span>${this.dialogueCard + 1} / ${cards.length}</span><button data-dialogue-page="1" aria-label="Следующая карточка диалога" ${this.dialogueCard === cards.length - 1 ? "disabled" : ""}>→</button></nav>`;
  }
  async sendMessage(message) {
    message = message.trim();
    if (!message || message.length > 2000 || this.busy) return;
    this.busy = true;
    const generation = this.dialogueGeneration;
    this.$("#dialogue-input").value = "";
    this.$("#dialogue-form button").disabled = true;
    this.appendMessage(message, true);
    try {
      const result = await this.adapter.talk(this.dialogueNPC, message);
      if (generation === this.dialogueGeneration) {
        this.appendMessage(result.text, false);
        this.discovered = true;
        this.$("#quest").classList.add("complete");
      }
    } catch (error) {
      if (generation === this.dialogueGeneration)
        this.appendMessage(error.message, false);
    } finally {
      if (generation === this.dialogueGeneration) {
        this.busy = false;
        this.$("#dialogue-form button").disabled = false;
      }
    }
  }
  info(title, body) {
    this.game?.setBlocked(true, "info");
    this.$("#info-title").textContent = title;
    this.$("#info-body").innerHTML = body;
    this.$("#info-overlay").classList.remove("hidden");
    this.$("#close-info").focus();
  }
  toast(message) {
    const node = this.$("#toast");
    node.textContent = String(message);
    node.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => node.classList.add("hidden"), 6000);
  }
  ready() {
    this.$("#loading").classList.add("hidden");
  }
}

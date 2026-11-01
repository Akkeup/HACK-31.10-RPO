import { icon } from "./icons.js";

export class AdminDashboard {
  constructor(ui, game, adapter) {
    this.ui = ui;
    this.game = game;
    this.adapter = adapter;
    this.visible = false;
    this.activeTab = "telemetry";
    this.selectedNpcId = null;
    this.telemetryData = null;
    this.frameTimeHistory = [];
    this.pingHistory = [];
    this.lastRenderTime = 0;
    this.throttleMs = 330; // 3 Hz refresh rate for smooth FPS

    this.container = document.createElement("div");
    this.container.id = "admin-dashboard";
    this.container.className = "admin-dashboard hidden";
    this.container.innerHTML = this.getTemplate();
    document.querySelector(".discovery")?.appendChild(this.container);

    this.bindEvents();
    this.subscribeTelemetry();
  }

  getTemplate() {
    return `
      <div class="admin-panel-window">
        <header class="admin-panel-header">
          <div class="admin-brand">
            <span class="admin-badge">GOD-MODE</span>
            <h2>Панель Администратора Вселенной</h2>
            <span class="admin-live-pulse"></span>
          </div>
          <div class="admin-header-tabs">
            <button class="admin-tab-btn active" data-tab="telemetry">${icon("spark")} Телеметрия и Сеть</button>
            <button class="admin-tab-btn" data-tab="universe">${icon("world")} Редактор Вселенной</button>
            <button class="admin-tab-btn" data-tab="agents">${icon("chat")} Инспектор Агентов</button>
          </div>
          <button class="icon-btn admin-close-btn" id="admin-close-btn" aria-label="Закрыть">${icon("close")}</button>
        </header>

        <div class="admin-quick-status-bar">
          <div class="admin-stat-chip"><span>Сервер TPS:</span> <b id="adm-chip-tps">20.0</b></div>
          <div class="admin-stat-chip"><span>Frame Time:</span> <b id="adm-chip-frametime">16.6 ms</b></div>
          <div class="admin-stat-chip"><span>FPS (1% Low):</span> <b id="adm-chip-fps">60 (58)</b></div>
          <div class="admin-stat-chip"><span>RTT Ping:</span> <b id="adm-chip-ping">12 ms</b></div>
          <div class="admin-stat-chip"><span>Jitter:</span> <b id="adm-chip-jitter">1.5 ms</b></div>
          <div class="admin-stat-chip"><span>Шкала времени:</span> <b id="adm-chip-timescale">1.0x</b></div>
        </div>

        <main class="admin-panel-body">
          <section class="admin-tab-content active" id="tab-telemetry"></section>
          <section class="admin-tab-content" id="tab-universe"></section>
          <section class="admin-tab-content" id="tab-agents"></section>
        </main>
      </div>
    `;
  }

  get isAdmin() {
    return (
      this.adapter?.role === "admin" ||
      this.adapter?.user?.role === "admin" ||
      this.adapter?.user?.username === "admin"
    );
  }

  bindEvents() {
    this.container.querySelector("#admin-close-btn").onclick = () => this.toggle(false);

    this.container.querySelectorAll(".admin-tab-btn").forEach((btn) => {
      btn.onclick = () => {
        this.container.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
        this.container.querySelectorAll(".admin-tab-content").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        this.activeTab = btn.dataset.tab;
        this.container.querySelector(`#tab-${this.activeTab}`)?.classList.add("active");
        this.renderActiveTab(true);
      };
    });

    // Close on Escape, toggle on Backquote / F12 only for admin users
    window.addEventListener("keydown", (e) => {
      if (e.code === "Backquote" || e.code === "F12") {
        if (!this.isAdmin) return;
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          this.toggle(!this.visible);
        }
      } else if (e.key === "Escape" && this.visible) {
        this.toggle(false);
      }
    });
  }

  toggle(show = !this.visible) {
    if (!this.isAdmin) {
      this.visible = false;
      this.container.classList.add("hidden");
      return;
    }
    this.visible = show;
    if (this.visible) {
      this.container.classList.remove("hidden");
      this.subscribeTelemetry();
      this.renderActiveTab(true);
    } else {
      this.container.classList.add("hidden");
    }
  }

  subscribeTelemetry() {
    if (this.adapter?.ready) {
      this.adapter.subscribeAdminTelemetry((snapshot) => {
        this.handleTelemetrySnapshot(snapshot);
      });
    }
  }

  handleTelemetrySnapshot(snapshot) {
    this.telemetryData = snapshot;
    const now = performance.now();
    if (now - this.lastRenderTime < this.throttleMs) return;
    this.lastRenderTime = now;

    // Update chips
    const s = snapshot.server || {};
    const chipTps = this.container.querySelector("#adm-chip-tps");
    if (chipTps) chipTps.textContent = `${s.actualTps ?? 20} / 20`;
    const chipTs = this.container.querySelector("#adm-chip-timescale");
    if (chipTs) chipTs.textContent = s.paused ? "ПАУЗА" : `${s.timeScale ?? 1}x`;

    const myClient = snapshot.clients?.find((c) => c.playerId === this.adapter.playerId) || snapshot.clients?.[0];
    if (myClient) {
      const chipFt = this.container.querySelector("#adm-chip-frametime");
      if (chipFt) chipFt.textContent = `${myClient.frameTimeMs ?? 16.6} ms`;
      const chipFps = this.container.querySelector("#adm-chip-fps");
      if (chipFps) chipFps.textContent = `${myClient.fps ?? 60} (${myClient.fpsLow1Pct ?? 60})`;
      const chipPing = this.container.querySelector("#adm-chip-ping");
      if (chipPing) chipPing.textContent = `${myClient.pingRttMs ?? 0} ms`;
      const chipJitter = this.container.querySelector("#adm-chip-jitter");
      if (chipJitter) chipJitter.textContent = `${myClient.jitterMs ?? 0} ms`;

      this.frameTimeHistory.push(myClient.frameTimeMs ?? 16.6);
      if (this.frameTimeHistory.length > 50) this.frameTimeHistory.shift();
      this.pingHistory.push(myClient.pingRttMs ?? 0);
      if (this.pingHistory.length > 50) this.pingHistory.shift();
    }

    if (this.visible) {
      this.renderActiveTab(false);
    }
  }

  renderActiveTab(force = false) {
    if (this.activeTab === "telemetry") {
      this.renderTelemetryTab();
    } else if (this.activeTab === "universe") {
      if (force) this.renderUniverseTab();
    } else if (this.activeTab === "agents") {
      this.renderAgentsTab();
    }
  }

  renderTelemetryTab() {
    const el = this.container.querySelector("#tab-telemetry");
    if (!el) return;
    const s = this.telemetryData?.server || {};
    const clients = this.telemetryData?.clients || [];

    el.innerHTML = `
      <div class="admin-grid-2">
        <div class="admin-card">
          <div class="admin-card-head">
            <h3>Ядро сервера и симуляция</h3>
            <span class="badge-success">LIVE</span>
          </div>
          <div class="admin-kpi-row">
            <div class="kpi-box"><small>Server TPS</small><b>${s.actualTps ?? 20}</b><span>Цель: 20 TPS</span></div>
            <div class="kpi-box"><small>Tick Duration</small><b>${(s.tickDurationMs ?? 1).toFixed(2)} ms</b><span>Бюджет: 50 ms</span></div>
            <div class="kpi-box"><small>Active Sessions</small><b>${s.activeSessions ?? 1}</b><span>Комнат</span></div>
            <div class="kpi-box"><small>Живых сущностей</small><b>${s.totalDynamicEntities ?? 8}</b><span>Игроки + NPC</span></div>
          </div>
          <div class="admin-sparkline-wrap">
            <small>График сетевой задержки RTT Ping (мс, последние 50 замеров):</small>
            <canvas id="adm-ping-canvas" width="460" height="60"></canvas>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <h3>Рендер и статтеры клиента (Three.js)</h3>
            <span class="badge-info">WEBGL</span>
          </div>
          <div class="admin-kpi-row">
            <div class="kpi-box"><small>Frame Time</small><b>${this.game.currentFrameTimeMs || 16.6} ms</b><span>Целевое: 16.6 ms</span></div>
            <div class="kpi-box"><small>1% Low FPS</small><b>${this.game.fpsLow1Pct || 60}</b><span>Стабильность</span></div>
            <div class="kpi-box"><small>Draw Calls</small><b>${this.game.renderer.info.render.calls || 0}</b><span>Three.js</span></div>
            <div class="kpi-box"><small>Triangles</small><b>${(this.game.renderer.info.render.triangles || 0).toLocaleString()}</b><span>Полигоны</span></div>
          </div>
          <div class="admin-sparkline-wrap">
            <small>График времени кадра Frame Time (мс, последние 50 кадров):</small>
            <canvas id="adm-ft-canvas" width="460" height="60"></canvas>
          </div>
        </div>
      </div>

      <div class="admin-card full-width">
        <div class="admin-card-head">
          <h3>Подключенные клиенты (Сеть, FPS, Ping, Ресурсы)</h3>
          <span class="badge-count">${clients.length} online</span>
        </div>
        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Игрок</th>
                <th>Роль</th>
                <th>FPS (1% Low)</th>
                <th>Frame Time</th>
                <th>Ping RTT</th>
                <th>Jitter</th>
                <th>Память Heap</th>
                <th>Битрейт RX / TX</th>
                <th>Uptime</th>
              </tr>
            </thead>
            <tbody>
              ${clients.map((c) => `
                <tr class="${c.playerId === this.adapter.playerId ? 'highlight-me' : ''}">
                  <td><b>${escapeHtml(c.displayName || 'Исследователь')}</b><small>${c.playerId}</small></td>
                  <td><span class="role-pill ${c.role || 'player'}">${c.role || 'player'}</span></td>
                  <td><span class="${(c.fps || 60) < 30 ? 'text-danger' : 'text-success'}">${c.fps || 60}</span> <small>(${c.fpsLow1Pct || 60})</small></td>
                  <td>${c.frameTimeMs || 16.6} ms</td>
                  <td><span class="${(c.pingRttMs || 0) > 100 ? 'text-warning' : 'text-success'}">${c.pingRttMs || 0} ms</span></td>
                  <td>${c.jitterMs || 0} ms</td>
                  <td>${c.heapMemoryMb || 80} МБ</td>
                  <td>${c.rxBitrateKbps || 0} / ${c.txBitrateKbps || 0} Кб/с</td>
                  <td>${formatUptime(c.uptimeSec || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.drawSparkline("adm-ping-canvas", this.pingHistory, "#7d9b76", 0, 100);
    this.drawSparkline("adm-ft-canvas", this.frameTimeHistory, "#60a5fa", 0, 40);
  }

  renderUniverseTab() {
    const el = this.container.querySelector("#tab-universe");
    if (!el) return;
    const s = this.telemetryData?.server || {};
    const isPaused = s.paused;
    const timeScale = s.timeScale ?? 1.0;

    el.innerHTML = `
      <div class="admin-grid-2">
        <div class="admin-card">
          <div class="admin-card-head">
            <h3>Управление временем симуляции</h3>
            <span class="badge-${isPaused ? 'danger' : 'success'}">${isPaused ? 'ОСТАНОВЛЕНО' : 'РАБОТАЕТ'}</span>
          </div>
          <div class="admin-time-controls">
            <button class="primary-btn ${isPaused ? 'btn-resume' : 'btn-pause'}" id="adm-btn-pause">
              ${isPaused ? '▶ Возобновить тики (Resume)' : '⏸ Пауза симуляции (Pause)'}
            </button>
            <button class="secondary-btn" id="adm-btn-step" ${!isPaused ? 'disabled title="Доступно только на паузе"' : ''}>
              ⏭ Шаг (+1 Tick)
            </button>
          </div>
          <div class="admin-slider-group">
            <div class="slider-head">
              <label>Шкала скорости времени (Time Scale):</label>
              <b id="adm-val-timescale">${timeScale}x</b>
            </div>
            <input type="range" id="adm-range-timescale" min="0.1" max="10.0" step="0.1" value="${timeScale}"/>
            <div class="admin-scale-presets">
              <button data-ts="0.25">0.25x</button>
              <button data-ts="0.5">0.5x</button>
              <button data-ts="1.0">1.0x (Норма)</button>
              <button data-ts="2.0">2.0x</button>
              <button data-ts="5.0">5.0x</button>
              <button data-ts="10.0">10.0x</button>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <h3>Параметры среды и физики Вселенной</h3>
            <span class="badge-info">HOT-UPDATE</span>
          </div>
          <div class="admin-form-group">
            <label>Базовая скорость ходьбы (Walk Speed, м/с):</label>
            <input type="number" id="adm-walk-speed" value="4.0" step="0.5" min="1.0" max="20.0"/>
          </div>
          <div class="admin-form-group">
            <label>Множитель бега (Run Multiplier):</label>
            <input type="number" id="adm-run-mul" value="1.5" step="0.1" min="1.0" max="5.0"/>
          </div>
          <div class="admin-form-group">
            <label>Гравитация среды (м/с²):</label>
            <input type="number" id="adm-gravity" value="${s.gravity ?? 9.81}" step="0.5" min="0" max="30.0"/>
          </div>
          <div class="admin-form-group">
            <label>Время суток (Time of Day):</label>
            <select id="adm-timeofday">
              <option value="09:00" ${s.timeOfDay === '09:00' ? 'selected' : ''}>09:00 (Утро)</option>
              <option value="15:00" ${s.timeOfDay === '15:00' || !s.timeOfDay ? 'selected' : ''}>15:00 (День)</option>
              <option value="20:00" ${s.timeOfDay === '20:00' ? 'selected' : ''}>20:00 (Закат)</option>
              <option value="00:00" ${s.timeOfDay === '00:00' ? 'selected' : ''}>00:00 (Ночь)</option>
            </select>
          </div>
          <button class="primary-btn mt-2" id="adm-btn-apply-env">Применить параметры к миру</button>
        </div>
      </div>

      <div class="admin-card full-width">
        <div class="admin-card-head">
          <h3>Управление состоянием и Снепшоты мира</h3>
        </div>
        <div class="admin-snapshot-actions">
          <button class="danger-btn" id="adm-btn-reset-universe">🔄 Сбросить Вселенную (Reset Universe)</button>
          <button class="secondary-btn" id="adm-btn-export-snapshot">💾 Экспорт снепшота мира</button>
        </div>
      </div>
    `;

    this.bindUniverseEvents();
  }

  bindUniverseEvents() {
    const el = this.container.querySelector("#tab-universe");
    if (!el) return;
    const s = this.telemetryData?.server || {};

    const btnPause = el.querySelector("#adm-btn-pause");
    if (btnPause) {
      btnPause.onclick = () => {
        this.adapter.sendAdminUniverseControl({ action: s.paused ? "resume" : "pause" });
      };
    }

    const btnStep = el.querySelector("#adm-btn-step");
    if (btnStep) {
      btnStep.onclick = () => {
        this.adapter.sendAdminUniverseControl({ action: "step" });
      };
    }

    const rangeTs = el.querySelector("#adm-range-timescale");
    const valTs = el.querySelector("#adm-val-timescale");
    if (rangeTs && valTs) {
      rangeTs.oninput = () => {
        valTs.textContent = `${rangeTs.value}x`;
      };
      rangeTs.onchange = () => {
        this.adapter.sendAdminUniverseControl({
          action: "setTimeScale",
          timeScale: parseFloat(rangeTs.value),
        });
      };
    }

    el.querySelectorAll(".admin-scale-presets button").forEach((btn) => {
      btn.onclick = () => {
        const ts = parseFloat(btn.dataset.ts);
        this.adapter.sendAdminUniverseControl({ action: "setTimeScale", timeScale: ts });
      };
    });

    const btnEnv = el.querySelector("#adm-btn-apply-env");
    if (btnEnv) {
      btnEnv.onclick = () => {
        const ws = parseFloat(el.querySelector("#adm-walk-speed")?.value || "4.0");
        const rm = parseFloat(el.querySelector("#adm-run-mul")?.value || "1.5");
        const grav = parseFloat(el.querySelector("#adm-gravity")?.value || "9.81");
        const tod = el.querySelector("#adm-timeofday")?.value || "15:00";
        this.adapter.sendAdminUniverseControl({
          action: "setEnvironment",
          walkSpeedMps: ws,
          runMultiplier: rm,
          gravity: grav,
          timeOfDay: tod,
        });
        this.ui.toast("Параметры среды успешно обновлены.");
      };
    }

    const btnReset = el.querySelector("#adm-btn-reset-universe");
    if (btnReset) {
      btnReset.onclick = () => {
        if (confirm("Вы уверены, что хотите сбросить состояние симуляции Вселенной?")) {
          this.adapter.sendAdminUniverseControl({ action: "resetUniverse" });
          this.ui.toast("Вселенная сброшена к исходному состоянию.");
        }
      };
    }
  }

  renderAgentsTab() {
    const el = this.container.querySelector("#tab-agents");
    if (!el) return;
    const npcs = this.telemetryData?.npcs || [];
    if (!this.selectedNpcId && npcs.length > 0) {
      this.selectedNpcId = npcs[0].npcId;
    }
    const current = npcs.find((n) => n.npcId === this.selectedNpcId) || npcs[0];

    el.innerHTML = `
      <div class="admin-agents-layout">
        <aside class="admin-agents-sidebar">
          <div class="admin-search-box">
            <input type="text" id="adm-npc-search" placeholder="Поиск агента по имени / ID..."/>
          </div>
          <ul class="admin-npc-list" id="adm-npc-list">
            ${npcs.map((n) => `
              <li class="admin-npc-item ${n.npcId === this.selectedNpcId ? 'selected' : ''}" data-id="${n.npcId}">
                <div class="npc-item-title">
                  <b>${escapeHtml(n.displayName)}</b>
                  <span class="status-dot ${n.controlMode}"></span>
                </div>
                <small>${n.role} · ${n.subject || 'Общий'}</small>
                <div class="npc-item-meta">
                  <span>Режим: <b>${n.controlMode}</b></span>
                  <span>(${n.x.toFixed(1)}, ${n.z.toFixed(1)})</span>
                </div>
              </li>
            `).join('')}
          </ul>
        </aside>

        <section class="admin-agent-inspector">
          ${current ? this.getAgentInspectorHtml(current) : '<div class="admin-empty-state">Нет доступных агентов</div>'}
        </section>
      </div>
    `;

    this.bindAgentEvents(current);
  }

  getAgentInspectorHtml(n) {
    const logs = n.decisionLog || [];
    return `
      <div class="admin-inspector-card">
        <div class="inspector-header">
          <div>
            <span class="eyebrow">${n.role.toUpperCase()} · ${n.subject || 'DISCOVERY'}</span>
            <h2>${escapeHtml(n.displayName)} <small>(${n.npcId})</small></h2>
          </div>
          <div class="inspector-coords">
            <span>X: <b>${n.x.toFixed(2)}</b></span>
            <span>Y: <b>${n.y.toFixed(2)}</b></span>
            <span>Z: <b>${n.z.toFixed(2)}</b></span>
            <span>Состояние: <b class="state-chip">${n.state}</b></span>
          </div>
        </div>

        <div class="inspector-section">
          <h4>Режим контроля поведения (Dynamic Override)</h4>
          <div class="admin-mode-selector">
            <button class="mode-btn ${n.controlMode === 'autonomous' ? 'active' : ''}" data-mode="autonomous">
              🤖 Autonomous (ИИ)
            </button>
            <button class="mode-btn ${n.controlMode === 'frozen' ? 'active' : ''}" data-mode="frozen">
              ❄️ Frozen (Заморожен)
            </button>
            <button class="mode-btn ${n.controlMode === 'manual' ? 'active' : ''}" data-mode="manual">
              🎮 Manual (Принудительный)
            </button>
          </div>
        </div>

        <div class="inspector-section">
          <h4>Инъекция команд агенту (God-Mode Command Injection)</h4>
          <div class="admin-command-row">
            <button class="secondary-btn" id="adm-cmd-teleport-me">⚡ Телепортировать к игроку</button>
            <button class="secondary-btn" id="adm-cmd-move-hub">📍 Идти в центр зала (80, 90)</button>
            <select id="adm-cmd-set-state">
              <option value="">Сменить состояние...</option>
              <option value="idle">idle (Покой)</option>
              <option value="walking">walking (Ходьба)</option>
              <option value="talking">talking (Разговор)</option>
            </select>
          </div>
        </div>

        <div class="inspector-section">
          <h4>Системный промпт LLM агента (Qwen2.5 Persona Directives)</h4>
          <textarea id="adm-npc-prompt" rows="3" placeholder="Введите индивидуальные директивы или характер для этого агента...">${escapeHtml(n.personalityPrompt || '')}</textarea>
          <button class="primary-btn mt-1" id="adm-save-prompt">💾 Сохранить промпт агента</button>
        </div>

        <div class="inspector-section">
          <h4>Поток решений и лог мыслей агента (Decision & Interaction Log)</h4>
          <div class="admin-thought-log">
            ${logs.slice(-15).reverse().map((l) => `
              <div class="thought-entry">
                <span class="thought-time">${new Date(l.time).toLocaleTimeString()}</span>
                <span class="thought-text">${escapeHtml(l.message)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindAgentEvents(current) {
    if (!current) return;
    const el = this.container.querySelector("#tab-agents");
    if (!el) return;

    el.querySelectorAll(".admin-npc-item").forEach((item) => {
      item.onclick = () => {
        this.selectedNpcId = item.dataset.id;
        this.renderAgentsTab();
      };
    });

    el.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;
        this.adapter.sendAdminAgentOverride({
          npcId: current.npcId,
          controlMode: mode,
        });
        this.ui.toast(`Режим агента ${current.displayName} изменен на ${mode}`);
      };
    });

    const btnTeleport = el.querySelector("#adm-cmd-teleport-me");
    if (btnTeleport) {
      btnTeleport.onclick = () => {
        const pos = this.game.player.position;
        this.adapter.sendAdminAgentCommand({
          npcId: current.npcId,
          command: "teleport",
          target: { x: pos.x, y: pos.y, z: pos.z },
        });
        this.ui.toast(`Агент ${current.displayName} телепортирован к игроку.`);
      };
    }

    const btnMove = el.querySelector("#adm-cmd-move-hub");
    if (btnMove) {
      btnMove.onclick = () => {
        this.adapter.sendAdminAgentCommand({
          npcId: current.npcId,
          command: "moveTo",
          target: { x: 80.0, y: 0.0, z: 90.0 },
        });
        this.ui.toast(`Агент ${current.displayName} направлен в центр зала.`);
      };
    }

    const selState = el.querySelector("#adm-cmd-set-state");
    if (selState) {
      selState.onchange = () => {
        if (!selState.value) return;
        this.adapter.sendAdminAgentCommand({
          npcId: current.npcId,
          command: "setState",
          state: selState.value,
        });
        this.ui.toast(`Состояние ${current.displayName} изменено на ${selState.value}.`);
      };
    }

    const btnSavePrompt = el.querySelector("#adm-save-prompt");
    if (btnSavePrompt) {
      btnSavePrompt.onclick = () => {
        const promptText = el.querySelector("#adm-npc-prompt")?.value || "";
        this.adapter.sendAdminAgentOverride({
          npcId: current.npcId,
          personalityPrompt: promptText,
        });
        this.ui.toast(`Системный промпт агента ${current.displayName} сохранен.`);
      };
    }
  }

  drawSparkline(canvasId, data, strokeColor, minY = 0, maxY = 100) {
    const canvas = this.container.querySelector(`#${canvasId}`);
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = w / (data.length - 1);
    const range = Math.max(1, maxY - minY);
    data.forEach((val, i) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      const y = h - ((clamped - minY) / range) * (h - 8) - 4;
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

function formatUptime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

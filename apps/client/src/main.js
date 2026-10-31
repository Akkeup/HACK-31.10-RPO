import "./styles.css";
import { loadLocal } from "./config/config.js";
import { createAdapter } from "./network/adapters.js";
import { Game } from "./world/game.js";
import { UI } from "./ui/ui.js";
let game;
async function credentials(adapter) {
  if (adapter.isMock)
    return {
      username: "explorer",
      password: "discovery-demo",
      sessionId: import.meta.env.VITE_SESSION_ID || undefined,
    };
  return new Promise((resolve) => {
    document.querySelector("#app").innerHTML =
      '<main class="fatal"><h1>Добро пожаловать в Discovery</h1><p>Локальный сервер · Protocol 2.0.0</p><form id="login-form"><label class="select-label">Имя пользователя<input name="username" autocomplete="username" required maxlength="40"/></label><label class="select-label">Пароль<input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128"/></label><label class="select-label">ID комнаты (пусто — создать)<input name="sessionId" placeholder="UUID комнаты"/></label><button type="submit">Войти в мир</button></form></main>';
    document.querySelector("#login-form").onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const values = {
        username: String(data.get("username")),
        password: String(data.get("password")),
        sessionId: String(data.get("sessionId")) || undefined,
      };
      e.currentTarget.reset();
      resolve(values);
    };
  });
}
async function start() {
  let adapter;
  try {
    adapter = await createAdapter();
    const login = await credentials(adapter);
    const { publicConfig } = await adapter.initialize(login);
    login.password = "";
    let storage;
    try {
      storage = localStorage;
    } catch {
      storage = { getItem: () => null };
    }
    const serverDefaults = {
      render: publicConfig.values.renderDefaults,
      characterVisual: publicConfig.values.characterVisualDefaults,
    };
    const local = loadLocal(storage, serverDefaults);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      local.render.animationEnabled = false;
    const configs = {
      ...local,
      world: publicConfig.values.world,
      character: publicConfig.values.character,
      firstPerson: publicConfig.values.firstPersonDefaults,
      gameplay: publicConfig.values.gameplay,
      readingRoom: publicConfig.values.readingRoom,
      revision: publicConfig.revision,
    };
    const ui = new UI(configs, adapter);
    adapter.onStatus((status) => ui.setConnection(status));
    game = new Game(
      document.querySelector("#world"),
      adapter,
      configs,
      (stats) => ui.update(stats),
      (message) => ui.toast(message),
    );
    ui.attach(game);
    await game.start();
    ui.setRole(adapter.role);
    ui.ready();
    ui.toggleSettings(false);
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() =>
          ui.toast(
            "Оболочка пока не сохранена для автономной загрузки. Локальный сервер доступен без интернета.",
          ),
        );
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("legacy-controlsqa")
    ) {
      const { runControlChecks } =
        await import("../tests/ui-controls-browser.js");
      runControlChecks({ game, ui, adapter, configs });
    }
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("legacy-educationqa")
    ) {
      const { runEducationChecks } =
        await import("../tests/education-browser.js");
      runEducationChecks({ game, ui, adapter, configs });
    }
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("legacy-qa")
    ) {
      const { runBrowserChecks } = await import("../tests/browser-suite.js");
      runBrowserChecks({ game, ui, adapter, configs });
    }
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("roomqa")
    ) {
      const { runRoomChecks } =
        await import("../tests/reading-room-browser.js");
      runRoomChecks({ game, ui, adapter, configs });
    }
    window.discovery = Object.freeze({
      mode: adapter.isMock ? "mock" : "real",
      diagnostics: () => structuredClone(ui.lastStats || {}),
    });
    window.addEventListener("pagehide", () => game.dispose(), { once: true });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) location.reload();
    });
  } catch (error) {
    await game?.dispose();
    adapter?.close();
    document.querySelector("#app").innerHTML =
      '<div class="fatal"><h1>Миру нужна небольшая пауза</h1><p></p><button>Попробовать снова</button></div>';
    document.querySelector(".fatal p").textContent = error.message;
    document.querySelector(".fatal button").onclick = () => location.reload();
    console.error(error);
  }
}
start();

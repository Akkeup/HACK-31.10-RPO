import {
  command,
  parseEvent,
  parseJSON,
  validate,
  VERSION,
} from "./protocol.js";
import { validateAdmin } from "../config/config.js";
export class DiscoveryAdapter {
  async enterLocation() {
    throw new Error("Переход между кабинетами доступен в локальном демо-мире.");
  }
  #token;
  constructor({ mock = false } = {}) {
    this.isMock = mock;
    this.listeners = new Set();
    this.readyListeners = new Set();
    this.statusListeners = new Set();
    this.pending = new Map();
    this.commands = new Map();
    this.clockOffsetMs = 0;
    this.pingSent = new Map();
    this.role = "player";
    this.closed = false;
    this.ready = false;
    this.serverSeq = 0;
    this.inputSeq = 0;
    this.worldId = "discovery-campus";
    this.lastStatus = "connecting";
  }
  onReady(fn) {
    this.readyListeners.add(fn);
    return () => this.readyListeners.delete(fn);
  }
  onEvent(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  onStatus(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
  status(value) {
    this.lastStatus = value;
    this.statusListeners.forEach((fn) => fn(value));
  }
  async request(
    path,
    { method = "GET", body, headers = {}, signal, maxBytes = 65536 } = {},
  ) {
    const response = await fetch(path, {
      method,
      signal: signal || AbortSignal.timeout(10000),
      cache: "no-store",
      credentials: "omit",
      headers: {
        "X-Discovery-Protocol": VERSION,
        ...(this.#token ? { Authorization: "Bearer " + this.#token } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return null;
    const value = parseJSON(await response.text(), maxBytes);
    if (!response.ok) {
      validate("error", value);
      throw Object.assign(new Error(value.message), value, {
        status: response.status,
      });
    }
    return { value, etag: response.headers.get("ETag") };
  }
  async bootstrap() {
    const { value } = await this.request("/api/v2/bootstrap");
    validate("http", value, "bootstrap");
    if (!value.protocolVersions.includes(VERSION))
      throw Error("VERSION_UNSUPPORTED");
    return value;
  }
  async login(username, password) {
    validate("http", { username, password }, "loginRequest");
    const { value } = await this.request("/api/v2/auth/login", {
      method: "POST",
      body: { username, password },
    });
    validate("http", value, "loginResponse");
    this.#token = value.accessToken;
    this.role = value.user.role;
    this.user = value.user;
    return value.user;
  }
  async initialize({
    username,
    password,
    sessionId,
    worldId = "discovery-campus",
  }) {
    const bootstrap = await this.bootstrap();
    if (!bootstrap.worldIds.includes(worldId))
      throw Error("Мир не опубликован");
    this.worldId = worldId;
    await this.login(username, password);
    const { value: publicConfig } = await this.request(
      `/api/v2/worlds/${worldId}/config`,
    );
    validate("config", publicConfig, "publicDocument");
    this.publicConfig = publicConfig;
    const { value: manifest } = await this.request(
      `/api/v2/worlds/${worldId}/manifest`,
    );
    validate("streaming", manifest, "manifest");
    this.manifest = manifest;
    if (sessionId) validate("common", sessionId, "uuid");
    const { value: session } = sessionId
      ? await this.request(`/api/v2/sessions/${sessionId}/members/me`, {
          method: "PUT",
        })
      : await this.request("/api/v2/sessions", {
          method: "POST",
          body: { worldId },
        });
    validate("http", session, "session");
    this.session = session;
    this.sessionId = session.sessionId;
    return { publicConfig, manifest, user: this.user };
  }
  async listSessions() {
    const { value } = await this.request("/api/v2/sessions");
    validate("http", value, "sessions");
    return value.sessions;
  }
  async connect() {
    this.closed = false;
    return new Promise((resolve, reject) => {
      this.initialResolve = resolve;
      this.initialReject = reject;
      this.openSocket().catch(reject);
    });
  }
  async openSocket() {
    if (this.closed) return;
    this.ready = false;
    this.status("connecting");
    await this.bootstrap();
    const { value: ticket } = await this.request(
      `/api/v2/sessions/${this.sessionId}/ws-ticket`,
      { method: "POST", body: { protocolVersion: VERSION } },
    );
    validate("http", ticket, "ticketResponse");
    const url = new URL(ticket.wsPath, location.origin);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("ticket", ticket.ticket);
    const socket = new WebSocket(url, ticket.subprotocol);
    this.socket = socket;
    this.serverSeq = 0;
    this.inputSeq = 0;
    socket.onopen = () =>
      this.send(
        command("client.hello", { clientName: "Discovery JavaScript client" }),
      );
    socket.onmessage = (e) => {
      if (this.socket !== socket) return;
      try {
        if (typeof e.data !== "string")
          throw Error("Binary WebSocket не поддерживается");
        const event = parseEvent(e.data);
        if (event.serverSeq !== this.serverSeq + 1)
          throw Error("Разрыв serverSeq — нужна полная синхронизация");
        this.serverSeq = event.serverSeq;
        // Server UTC is corrected by the midpoint of a ping/pong round trip.
        if (event.type === "server.welcome")
          this.clockOffsetMs = Date.parse(event.serverTime) - Date.now();
        if (event.type === "server.pong") {
          const sent = this.pingSent.get(event.payload.nonce);
          if (sent !== undefined) {
            const sample =
              Date.parse(event.serverTime) - (sent + Date.now()) / 2;
            this.clockOffsetMs = this.clockOffsetMs * 0.5 + sample * 0.5;
            this.pingSent.delete(event.payload.nonce);
          }
        }
        const waiting = this.commands.get(event.requestId);
        if (
          waiting &&
          (event.type === "server.error" || waiting.types.includes(event.type))
        ) {
          clearTimeout(waiting.timer);
          this.commands.delete(event.requestId);
          if (event.type === "server.error")
            waiting.reject(
              Object.assign(Error(event.payload.message), event.payload),
            );
          else waiting.resolve(event.payload);
        }
        const p = event.payload;
        if (event.type === "server.welcome") {
          this.playerId = p.playerId;
          this.manifest = p.manifest;
          this.session = p.session;
          this.retry = 0;
          clearInterval(this.heartbeat);
          this.heartbeat = setInterval(
            () => this.ping(),
            p.heartbeatIntervalMs,
          );
          this.status("connected");
          this.initialResolve?.({
            id: p.playerId,
            role: this.role,
            position: Object.values(
              p.session.players.find((v) => v.playerId === p.playerId)
                ?.position || this.publicConfig.values.world.spawn,
            ),
          });
          this.initialResolve = null;
          this.recoverPending();
        }
        if (event.type === "world.interest") {
          this.interest = p;
          this.ready = false;
        }
        if (event.type === "world.snapshot") {
          this.sessionStatus = p.sessionStatus;
        }
        if (event.type === "server.error") {
          const pending = this.pending.get(event.requestId);
          if (pending) {
            pending.reject(Object.assign(Error(p.message), p));
            this.pending.delete(event.requestId);
          } else if (!waiting)
            this.status("error:" + p.code + ": " + p.message);
        }
        if (["npc.result", "npc.cancelled"].includes(event.type)) {
          const result = p.interaction;
          const pending = this.pending.get(result.requestId);
          if (pending) {
            this.pending.delete(result.requestId);
            if (result.status === "completed") pending.resolve(result);
            else
              pending.reject(Error(result.error?.message || "Запрос отменён"));
          }
        }
        if (event.type === "session.closed") {
          this.closed = true;
          this.status("closed");
        }
        this.listeners.forEach((fn) => fn(event));
      } catch (error) {
        this.status("error:VERSION_UNSUPPORTED: " + error.message);
        socket.close(1002, "Protocol validation failed");
      }
    };
    socket.onerror = () => socket.close();
    socket.onclose = (e) => {
      if (this.socket !== socket) return;
      clearInterval(this.heartbeat);
      this.ready = false;
      if (this.closed) return;
      if ([4001, 4003].includes(e.code)) {
        this.closed = true;
        this.status(e.code === 4003 ? "auth-expired" : "replaced");
        this.initialReject?.(Error("Сеанс завершён. Войдите снова."));
        return;
      }
      for (const p of this.commands.values()) {
        clearTimeout(p.timer);
        p.reject(
          Error(
            "Соединение прервано. Восстанавливаем состояние; команда не повторяется.",
          ),
        );
      }
      this.commands.clear();
      this.status("reconnecting");
      clearTimeout(this.reconnect);
      this.reconnect = setTimeout(
        async () => {
          try {
            await this.request(
              `/api/v2/sessions/${this.sessionId}/members/me`,
              { method: "PUT" },
            );
            await this.openSocket();
          } catch (error) {
            if (error.status === 401) {
              this.status("auth-expired");
              return;
            }
            this.status("error:" + error.message);
            this.reconnect = setTimeout(
              () =>
                this.openSocket().catch((e) =>
                  this.status("error:" + e.message),
                ),
              8000,
            );
          }
        },
        Math.min(
          8000,
          500 * 2 ** Math.min((this.retry = (this.retry || 0) + 1), 4),
        ) +
          Math.random() * 250,
      );
    };
  }
  ping() {
    const nonce = crypto.randomUUID();
    this.pingSent.clear();
    this.pingSent.set(nonce, Date.now());
    this.send(command("client.ping", { nonce }));
  }
  send(packet) {
    validate("client-message", packet);
    if (
      this.socket?.readyState === WebSocket.OPEN &&
      this.socket.bufferedAmount < 256 * 1024
    )
      this.socket.send(JSON.stringify(packet));
  }
  sendInput(input, yawRad, running = false) {
    if (!this.ready || !this.interest) return;
    this.send(
      command("player.input", {
        inputSeq: ++this.inputSeq,
        moveX: input[0],
        moveZ: input[1],
        yawRad,
        running,
        interestRevision: this.interest.interestRevision,
      }),
    );
  }
  markReady(interest, hashes) {
    if (
      !this.interest ||
      this.interest.worldRevision !== interest.worldRevision ||
      this.interest.interestRevision !== interest.interestRevision
    )
      return;
    this.send(
      command("world.ready", {
        interestRevision: interest.interestRevision,
        resourceHashes: hashes,
      }),
    );
    this.ready = true;
    this.readyListeners.forEach((fn) => fn());
  }
  get serverNow() {
    return Date.now() + this.clockOffsetMs;
  }
  execute(
    type,
    payload,
    types = ["competition.state"],
    requestId = crypto.randomUUID(),
  ) {
    if (!this.ready || this.lastStatus !== "connected")
      return Promise.reject(Error("Восстанавливаем соединение…"));
    const packet = command(type, payload, requestId);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.commands.delete(requestId);
        reject(
          Error(
            "Нет подтверждения. Обновите состояние; ставка автоматически не повторяется.",
          ),
        );
      }, 10000);
      this.commands.set(requestId, { resolve, reject, types, timer });
      this.send(packet);
    });
  }
  async gameplayGet(path, schema, definition) {
    const { value } = await this.request(path);
    return validate(schema, value, definition);
  }
  getActivity() {
    return this.gameplayGet("/api/v2/activity/me", "activity", "own");
  }
  getWallet() {
    return this.gameplayGet("/api/v2/wallet/me", "wallet", "balance");
  }
  getLobby(id) {
    return this.gameplayGet(
      `/api/v2/competition/lobbies/${id}`,
      "competition",
      "state",
    );
  }
  getMatch(id) {
    return this.gameplayGet(
      `/api/v2/competition/matches/${id}/me`,
      "competition",
      "ownRecovery",
    );
  }
  async fetchResource(descriptor, revision, signal) {
    const response = await fetch(descriptor.url, {
      signal,
      cache: "no-store",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + this.#token,
        "X-Interest-Revision": String(revision),
        "X-Discovery-Protocol": VERSION,
      },
    });
    if (!response.ok) {
      let error;
      try {
        error = validate("error", parseJSON(await response.text()));
      } catch {
        throw Error("SERVICE_UNAVAILABLE");
      }
      throw Object.assign(Error(error.message), error);
    }
    if (
      response.headers.get("Content-Encoding") &&
      !["identity"].includes(response.headers.get("Content-Encoding"))
    )
      throw Error("Ресурс должен использовать identity encoding");
    const reader = response.body.getReader();
    let buffer = new Uint8Array(descriptor.byteSize),
      offset = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (offset + value.byteLength > buffer.byteLength)
          throw Error("INVALID_REQUEST: лишние байты");
        buffer.set(value, offset);
        offset += value.byteLength;
      }
      if (offset !== descriptor.byteSize)
        throw Error("INVALID_REQUEST: неполный ресурс");
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      ]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== descriptor.sha256) throw Error("INVALID_REQUEST: SHA-256");
      return buffer;
    } catch (error) {
      buffer = null;
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
  async getPublicConfig() {
    const { value } = await this.request(
      `/api/v2/worlds/${this.worldId}/config`,
    );
    validate("config", value, "publicDocument");
    this.publicConfig = value;
    return value;
  }
  async getAdminConfig() {
    const result = await this.request(
      `/api/v2/admin/worlds/${this.worldId}/config`,
      { maxBytes: 1048576 },
    );
    validate("config", result.value, "adminDocument");
    return result;
  }
  async saveAdminConfig(value, etag) {
    validateAdmin(value);
    const result = await this.request(
      `/api/v2/admin/worlds/${this.worldId}/config`,
      {
        method: "PUT",
        body: value,
        headers: { "If-Match": etag },
        maxBytes: 1048576,
      },
    );
    validate("config", result.value, "adminDocument");
    return result;
  }
  talk(npcId, text, requestId = crypto.randomUUID()) {
    if (!this.ready) return Promise.reject(Error("Мир ещё загружается"));
    const packet = command(
      "npc.interact",
      { npcId, action: "talk", text },
      requestId,
    );
    if (this.pending.has(requestId))
      return Promise.reject(Error("Запрос уже ожидает ответа"));
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, {
        resolve,
        reject,
        npcId,
        text,
        sessionId: this.sessionId,
      });
      this.send(packet);
    });
  }
  async recoverPending() {
    for (const [id, pending] of this.pending) {
      try {
        const { value } = await this.request(
          `/api/v2/sessions/${pending.sessionId}/interactions/${id}`,
        );
        validate("interaction", value);
        if (value.status === "completed") {
          pending.resolve(value);
          this.pending.delete(id);
        } else if (value.status !== "pending") {
          pending.reject(Error(value.error?.message || "Запрос отменён"));
          this.pending.delete(id);
        }
      } catch (e) {
        pending.reject(e);
        this.pending.delete(id);
      }
    }
  }
  cancelPending() {
    for (const id of this.pending.keys())
      this.send(command("npc.cancel", { targetRequestId: id }));
  }
  async loginDemoAdmin() {
    if (!this.isMock) throw Error("Демо-вход недоступен");
    const sessionId = this.sessionId;
    this.closed = true;
    clearInterval(this.heartbeat);
    clearTimeout(this.reconnect);
    await this.request(`/api/v2/sessions/${sessionId}/members/me`, {
      method: "DELETE",
    });
    await this.request("/api/v2/auth/logout", { method: "POST" });
    this.socket?.close();
    await this.login("admin", "discovery-demo");
    await this.request(`/api/v2/sessions/${sessionId}/members/me`, {
      method: "PUT",
    });
    this.closed = false;
    await this.connect();
    return this.user;
  }
  async logout() {
    this.cancelPending();
    await this.request(`/api/v2/sessions/${this.sessionId}/members/me`, {
      method: "DELETE",
    });
    await this.request("/api/v2/auth/logout", { method: "POST" });
    this.#token = undefined;
    this.close();
  }
  close() {
    this.closed = true;
    this.ready = false;
    clearInterval(this.heartbeat);
    clearTimeout(this.reconnect);
    this.socket?.close();
    for (const p of this.commands.values()) {
      clearTimeout(p.timer);
      p.reject(Error("Соединение закрыто"));
    }
    this.commands.clear();
    for (const p of this.pending.values())
      p.reject(Error("Соединение закрыто"));
    this.pending.clear();
    this.#token = undefined;
  }
}
export async function createAdapter() {
  if (import.meta.env.VITE_TRANSPORT === "real") return new DiscoveryAdapter();
  const { LocalMockAdapter } = await import("../../mock-v2/adapter.js");
  return new LocalMockAdapter();
}

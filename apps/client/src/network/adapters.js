import {
  command,
  parseEvent,
  parseJSON,
  safeDigestSha256,
  safeRandomUUID,
  validate,
  VERSION,
  API_ROOT,
  WS_SUBPROTOCOL,
} from "./protocol.js";
import { validateAdmin } from "../config/config.js";
export class DiscoveryAdapter {
  async enterLocation(roomId) {
    if (!this.sessionId) throw Error("Сначала подключитесь к игровой сессии");
    const { value } = await this.request(
      `/api/v2/sessions/${this.sessionId}/location`,
      { method: "PUT", body: { roomId }, maxBytes: 16384 },
    );
    if (!value || value.roomId !== roomId || !value.position)
      throw Error("Сервер не подтвердил переход в кабинет");
    this.locationId = roomId;
    return value;
  }
  #token;
  constructor({ mock = false } = {}) {
    this.isMock = mock;
    this.listeners = new Set();
    this.readyListeners = new Set();
    this.statusListeners = new Set();
    this.adminListeners = new Set();
    this.pending = new Map();
    this.commands = new Map();
    this.clockOffsetMs = 0;
    this.pingSent = new Map();
    this.pingRttMs = 0;
    this.jitterMs = 0;
    this.lastRtt = 0;
    this.rxBytes = 0;
    this.txBytes = 0;
    this.connectedAt = Date.now();
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
    const target = new URL(path, "https://discovery.invalid");
    if (
      !path.startsWith(API_ROOT + "/") ||
      target.origin !== "https://discovery.invalid" ||
      !target.pathname.startsWith(API_ROOT + "/")
    )
      throw Error("VERSION_UNSUPPORTED: клиент поддерживает только /api/v2/");
    const response = await fetch(path, {
      method,
      signal: signal || AbortSignal.timeout(10000),
      cache: "no-store",
      redirect: "error",
      credentials: "omit",
      headers: {
        ...(this.#token ? { Authorization: "Bearer " + this.#token } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
        "X-Discovery-Protocol": VERSION,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return null;
    const value = parseJSON(await response.text(), maxBytes);
    if (!response.ok) {
      validate("error", value);
      if (response.status === 401 && this.#token) {
        this.close();
        this.status("auth-expired");
      }
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
    let session;
    if (sessionId) {
      const res = await this.request(
        `/api/v2/sessions/${sessionId}/members/me`,
        {
          method: "PUT",
        },
      );
      session = res.value;
    } else {
      const storageKey = this.user?.userId
        ? `discovery:session:${this.user.userId}`
        : null;
      let existingSessionId = null;
      try {
        if (storageKey) existingSessionId = localStorage.getItem(storageKey);
        if (existingSessionId) validate("common", existingSessionId, "uuid");
      } catch {
        existingSessionId = null;
      }

      if (existingSessionId) {
        try {
          const res = await this.request(
            `/api/v2/sessions/${existingSessionId}/members/me`,
            {
              method: "PUT",
            },
          );
          session = res.value;
        } catch (error) {
          // A transient outage or denied access must not create another room.
          if (!["NOT_FOUND", "SESSION_CLOSED"].includes(error.code))
            throw error;
          try {
            if (storageKey) localStorage.removeItem(storageKey);
          } catch {}
          existingSessionId = null;
        }
      }

      if (!session && !existingSessionId) {
        try {
          const listRes = await this.request("/api/v2/sessions", { method: "GET" });
          const allSessions = listRes.value?.sessions || listRes.sessions || [];
          const openSession = allSessions.find(
            (s) =>
              s.worldId === worldId &&
              (s.status?.toLowerCase() === "active" ||
                s.status?.toLowerCase() === "waiting" ||
                s.status === "ACTIVE" ||
                s.status === "WAITING_FOR_PLAYERS") &&
              (s.players?.length || 0) < (s.maxPlayers || 5),
          );
          if (openSession?.sessionId) {
            const joinRes = await this.request(
              `/api/v2/sessions/${openSession.sessionId}/members/me`,
              { method: "PUT" },
            );
            session = joinRes.value;
          }
        } catch (_) {}
      }

      if (!session) {
        try {
          const res = await this.request("/api/v2/sessions", {
            method: "POST",
            body: { worldId },
          });
          session = res.value;
        } catch (err) {
          if (err.code === "ALREADY_IN_SESSION") {
            const sid = err.details?.find(
              (d) => d.path === "sessionId",
            )?.reason;
            const targetSessionId = sid;
            if (targetSessionId) {
              const res = await this.request(
                `/api/v2/sessions/${targetSessionId}/members/me`,
                {
                  method: "PUT",
                },
              );
              session = res.value;
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
    }
    validate("http", session, "session");
    this.session = session;
    this.sessionId = session.sessionId;
    try {
      if (this.user?.userId) {
        localStorage.setItem(
          `discovery:session:${this.user.userId}`,
          session.sessionId,
        );
      }
    } catch {}
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
    const socket = new WebSocket(url, WS_SUBPROTOCOL);
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
        this.rxBytes += e.data.length;
        const event = parseEvent(e.data);
        if (event.serverSeq <= this.serverSeq) {
          return;
        }
        if (event.serverSeq > this.serverSeq + 1) {
          console.warn(
            `[adapters] serverSeq jump: expected ${this.serverSeq + 1}, got ${event.serverSeq}`,
          );
        }
        this.serverSeq = event.serverSeq;
        // Server UTC is corrected by the midpoint of a ping/pong round trip.
        if (event.type === "server.welcome")
          this.clockOffsetMs = Date.parse(event.serverTime) - Date.now();
        if (event.type === "server.pong") {
          const sent = this.pingSent.get(event.payload.nonce);
          if (sent !== undefined) {
            const now = Date.now();
            const rtt = Math.max(0, now - sent);
            const prev = this.pingRttMs || rtt;
            this.jitterMs = Math.round(Math.abs(rtt - prev) * 10) / 10;
            this.pingRttMs = rtt;
            const sample =
              Date.parse(event.serverTime) - (sent + now) / 2;
            this.clockOffsetMs = this.clockOffsetMs * 0.5 + sample * 0.5;
            this.pingSent.delete(event.payload.nonce);
          }
        }
        if (event.type === "admin.telemetry.snapshot") {
          for (const fn of this.adminListeners) fn(event.payload);
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
        this.close();
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
    const nonce = safeRandomUUID();
    this.pingSent.clear();
    this.pingSent.set(nonce, Date.now());
    this.send(command("client.ping", { nonce }));
  }
  send(packet) {
    if (!packet.type?.startsWith("admin.") && packet.type !== "client.telemetry") {
      validate("client-message", packet);
    }
    if (
      this.socket?.readyState === WebSocket.OPEN &&
      this.socket.bufferedAmount < 256 * 1024
    ) {
      const data = JSON.stringify(packet);
      this.txBytes += data.length;
      this.socket.send(data);
    }
  }
  onAdminTelemetry(fn) {
    this.adminListeners.add(fn);
    return () => this.adminListeners.delete(fn);
  }
  subscribeAdminTelemetry(fn) {
    if (fn) this.adminListeners.add(fn);
    this.send(command("admin.telemetry.subscribe", { subscribe: true }));
  }
  sendAdminUniverseControl(payload) {
    this.send(command("admin.universe.control", payload));
  }
  sendAdminAgentOverride(payload) {
    this.send(command("admin.agent.override", payload));
  }
  sendAdminAgentCommand(payload) {
    this.send(command("admin.agent.command", payload));
  }
  sendClientTelemetry(payload) {
    this.send(command("client.telemetry", payload));
  }
  getNetworkStats() {
    const elapsedSec = Math.max(1, (Date.now() - this.connectedAt) / 1000);
    return {
      pingRttMs: this.pingRttMs,
      jitterMs: this.jitterMs,
      rxKbps: Math.round(((this.rxBytes * 8) / elapsedSec / 1024) * 10) / 10,
      txKbps: Math.round(((this.txBytes * 8) / elapsedSec / 1024) * 10) / 10,
      uptimeSec: Math.round(elapsedSec),
    };
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
    requestId = safeRandomUUID(),
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
    validate(
      "streaming",
      descriptor,
      descriptor.chunkId ? "chunkDescriptor" : "asset",
    );
    if (!descriptor.url.startsWith(`/api/v2/worlds/${this.worldId}/`))
      throw Error("INVALID_REQUEST: resource belongs to another world");
    const response = await fetch(descriptor.url, {
      signal,
      cache: "no-store",
      redirect: "error",
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
      const hash = await safeDigestSha256(buffer);
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
  talk(npcId, text, requestId = safeRandomUUID()) {
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
    if (this.sessionId) {
      try {
        await this.request(`/api/v2/sessions/${this.sessionId}/members/me`, {
          method: "DELETE",
        });
      } catch {}
    }
    try {
      if (this.user?.userId) {
        localStorage.removeItem(`discovery:session:${this.user.userId}`);
      }
    } catch {}
    try {
      await this.request("/api/v2/auth/logout", { method: "POST" });
    } finally {
      this.sessionId = undefined;
      this.close();
    }
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
  if (
    import.meta.env.VITE_TRANSPORT === "mock" ||
    (import.meta.env.DEV && import.meta.env.VITE_TRANSPORT !== "real")
  ) {
    const { LocalMockAdapter } = await import("../../mock-v2/adapter.js");
    return new LocalMockAdapter();
  }
  return new DiscoveryAdapter();
}

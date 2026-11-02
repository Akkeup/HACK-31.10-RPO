// Local development/preview mock only. Never imported into the browser bundle.
import { WebSocketServer } from "ws";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  validate,
  parseJSON,
  VERSION,
} from "../src/network/legacy-protocol.js";
import { validateAdmin } from "../src/config/legacy-config.js";
import { EducationServer } from "./education.js";
import { CompetitionServer } from "./competition.js";
const clone = structuredClone;
const makeError = (code, message, details = []) => ({
  code,
  message: message.slice(0, 300),
  retryable: ["SERVICE_UNAVAILABLE", "NPC_BUSY", "RATE_LIMITED"].includes(code),
  requestId: randomUUID(),
  details,
});
export async function createMockServer(httpServer) {
  const assetRoot = new URL("../../../assets/world/", import.meta.url);
  const catalog = JSON.parse(
    await readFile(new URL("catalog.server-only.json", assetRoot), "utf8"),
  );
  const seed = JSON.parse(
    await readFile(new URL("./config-v1.1.0.json", import.meta.url), "utf8"),
  );
  let doc = seed;
  const layout = JSON.parse(
    await readFile(new URL("gameplay.json", assetRoot), "utf8"),
  );
  Object.assign(doc.values, layout);
  Object.assign(doc.values.world, {
    spawn: { x: 80, y: 0, z: 90 },
    timeOfDayHours: 15,
    decorDensity: 0.7,
    interestRadiusChunks: 1,
    maxResidentChunks: 9,
    activeChunkIds: catalog.chunks.map((c) => c.chunkId),
    placements: catalog.chunks.map((c) => ({
      id: "terrain-" + c.x + "-" + c.z,
      chunkId: c.chunkId,
      modelId: "terrain-" + c.x + "-" + c.z,
      position: { x: c.x * 32, y: 0, z: c.z * 32 },
      yawRad: 0,
      collidable: false,
    })),
  });
  Object.assign(doc.values.characterVisualDefaults, {
    playerModelId: "explorer",
    npcModelId: "scholar",
  });
  doc.values.npcBehavior.profiles[0].displayName = "София";
  validateAdmin(doc.values);
  let tick = 0,
    pendingConfig = null;
  const instanceId = randomUUID(),
    sessionId = randomUUID();
  const tokens = new Map(),
    tickets = new Map(),
    users = new Map(),
    connections = new Set(),
    interactions = new Map();
  const bots = [
    {
      playerId: randomUUID(),
      displayName: "Мира",
      position: { x: 72, y: 0, z: 75 },
      yawRad: 0,
      connected: true,
      lastProcessedInputSeq: 0,
    },
    {
      playerId: randomUUID(),
      displayName: "Алекс",
      position: { x: 91, y: 0, z: 87 },
      yawRad: 0,
      connected: true,
      lastProcessedInputSeq: 0,
    },
  ];
  const botUsers = bots.map((player, i) => ({
    id: randomUUID(),
    player,
    isBot: true,
    member: true,
  }));
  const competition = new CompetitionServer({
    config: () => doc.values,
    emit,
    connections,
    players: () => [...users.values(), ...botUsers],
  });
  competition.packs = Object.fromEntries(
    await Promise.all(
      ["math-basics", "informatics-basics", "history-basics"].map(
        async (id) => [
          id,
          JSON.parse(
            await readFile(
              new URL(`./content/${id}.json`, import.meta.url),
              "utf8",
            ),
          ),
        ],
      ),
    ),
  );
  botUsers.forEach((u) => competition.init(u));
  const education = new EducationServer(competition);
  function session() {
    return {
      sessionId,
      worldId: "discovery-campus",
      worldRevision: 1,
      status: "active",
      maxPlayers: 5,
      players: [
        ...bots,
        ...[...users.values()].filter((u) => u.member).map((u) => u.player),
      ],
    };
  }
  function publicConfig() {
    const { placements, activeChunkIds, npcIds, ...world } = doc.values.world;
    return {
      revision: doc.revision,
      values: {
        world: clone(world),
        character: clone(doc.values.character),
        renderDefaults: clone(doc.values.renderDefaults),
        characterVisualDefaults: clone(doc.values.characterVisualDefaults),
        firstPersonDefaults: clone(doc.values.firstPersonDefaults),
        gameplay: clone(doc.values.gameplay),
      },
    };
  }
  function emit(c, type, payload, requestId = null) {
    if (c.ws.readyState !== 1) return;
    const m = {
      protocolVersion: VERSION,
      type,
      requestId,
      payload,
      serverSeq: ++c.seq,
      serverTime: new Date().toISOString(),
    };
    validate("server-message", m);
    if (c.ws.bufferedAmount > 256 * 1024) {
      c.ws.close(1013);
      return;
    }
    c.ws.send(JSON.stringify(m));
  }
  function error(c, code, message, requestId) {
    const e = makeError(code, message);
    e.requestId = requestId;
    emit(c, "server.error", e, requestId);
  }
  function interest(
    c,
    x = Math.floor(c.user.player.position.x / 32),
    z = Math.floor(c.user.player.position.z / 32),
  ) {
    const candidates = catalog.chunks
      .filter((v) => Math.abs(v.x - x) <= 1 && Math.abs(v.z - z) <= 1)
      .sort(
        (a, b) =>
          Math.abs(a.x - x) +
          Math.abs(a.z - z) -
          (Math.abs(b.x - x) + Math.abs(b.z - z)),
      );
    const chosen = [];
    let assets = [],
      requiredBytes = 0;
    for (const chunk of candidates) {
      const ids = new Set([...chosen, chunk].flatMap((v) => v.assetIds));
      const nextAssets = catalog.assets.filter((a) => ids.has(a.resourceId));
      const unique = new Map(
        [...chosen, chunk, ...nextAssets].map((d) => [d.sha256, d.byteSize]),
      );
      const size = [...unique.values()].reduce((a, b) => a + b, 0);
      if (size <= catalog.manifest.cacheBudgetBytes) {
        chosen.push(chunk);
        assets = nextAssets;
        requiredBytes = size;
      }
    }
    if (!chosen.some((v) => v.x === x && v.z === z)) {
      error(
        c,
        "RESOURCE_TOO_LARGE",
        "Обязательный чанк не помещается в бюджет",
        null,
      );
      return;
    }
    c.center = [x, z];
    c.ready = false;
    c.interest = {
      worldRevision: 1,
      interestRevision: (c.interest?.interestRevision || 0) + 1,
      chunks: chosen,
      assets,
      requiredBytes,
    };
    validate("streaming", c.interest, "interest");
    emit(c, "world.interest", c.interest);
  }
  function snapshot(c) {
    if (!c.hello || (!c.ready && !c.initialReady)) return;
    emit(c, "world.snapshot", {
      tick,
      interestRevision: c.interest.interestRevision,
      configRevision: doc.revision,
      sessionStatus: "active",
      players: session().players,
      tables: competition.summaries(),
      npcs: c.interest.chunks.some((d) => d.x === 2 && d.z === 2)
        ? [
            {
              npcId: "npc-guide",
              displayName: "София",
              position: { x: 86, y: 0, z: 85 },
              yawRad: 0,
              state: c.pending ? "talking" : "idle",
              subject: doc.values.npcBehavior.profiles[0].subject,
              role: "teacher",
              moduleId: "math-basics",
            },
            ...doc.values.gameplay.education.stations.flatMap((s, i) =>
              ["teacher", "examiner"].map((role) => ({
                npcId: s[role + "Id"],
                displayName:
                  (role === "teacher" ? "Учитель" : "Экзаменатор") +
                  " · " +
                  ["Математика", "Информатика", "История"][i],
                position: s[role + "Position"],
                yawRad: 0,
                state: "idle",
                subject: competition.packs[s.moduleId].module.subject,
                role,
                moduleId: s.moduleId,
              })),
            ),
          ]
        : [],
    });
  }
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 65536,
    perMessageDeflate: false,
  });
  const upgrade = (req, socket, head) => {
    if (!req.url?.startsWith("/api/v1/ws")) return;
    const url = new URL(req.url, "http://local"),
      ticket = tickets.get(url.searchParams.get("ticket"));
    tickets.delete(url.searchParams.get("ticket"));
    if (
      !ticket ||
      ticket.expires < Date.now() ||
      !tokens.has(ticket.token) ||
      req.headers.origin !== ticket.origin ||
      req.headers["sec-websocket-protocol"] !== "discovery.v1"
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const user = ticket.user;
      for (const old of connections) if (old.user === user) old.ws.close(4001);
      user.player.connected = true;
      competition.reconnect(user);
      const c = {
        ws,
        user,
        seq: 0,
        hello: false,
        ready: false,
        input: null,
        lastInput: 0,
        lastPing: Date.now(),
        inputSeq: 0,
        token: ticket.token,
      };
      connections.add(c);
      user.connection = c;
      ws.on("message", (data, binary) => {
        let m;
        try {
          if (binary) {
            ws.close(1003);
            return;
          }
          m = validate("client-message", parseJSON(data.toString()));
          const p = m.payload;
          if (!c.hello && m.type !== "client.hello")
            throw Error("Сначала client.hello");
          if (m.type === "client.hello") {
            if (c.hello) throw Error("Повторный hello");
            c.hello = true;
            emit(
              c,
              "server.welcome",
              {
                connectionId: randomUUID(),
                serverInstanceId: instanceId,
                session: session(),
                playerId: user.player.playerId,
                configRevision: doc.revision,
                manifest: catalog.manifest,
                heartbeatIntervalMs: 10000,
                heartbeatTimeoutMs: 30000,
              },
              m.requestId,
            );
            interest(c);
          } else if (m.type === "world.ready") {
            const expected = [
              ...new Set(
                [...c.interest.chunks, ...c.interest.assets].map(
                  (d) => d.sha256,
                ),
              ),
            ].sort();
            if (p.interestRevision !== c.interest.interestRevision) {
              error(c, "STALE_INTEREST", "Устаревший interest", m.requestId);
              return;
            }
            if (
              JSON.stringify([...p.resourceHashes].sort()) !==
              JSON.stringify(expected)
            )
              throw Error("Неполное множество resourceHashes");
            c.ready = true;
            c.initialReady = true;
            snapshot(c);
            for (const l of competition.lobbies.values())
              if (l.members.has(user.player.playerId)) {
                emit(c, "competition.state", clone(l.state));
                if (l.closed && l.lastResult)
                  emit(c, "competition.round.closed", clone(l.lastResult));
              }
          } else if (m.type === "player.input") {
            if (p.inputSeq <= c.inputSeq) return;
            if (p.interestRevision !== c.interest.interestRevision) return;
            c.inputSeq = p.inputSeq;
            c.input = p;
            c.lastInput = Date.now();
            user.player.lastProcessedInputSeq = p.inputSeq;
          } else if (m.type === "client.ping") {
            c.lastPing = Date.now();
            emit(c, "server.pong", { nonce: p.nonce }, m.requestId);
          } else if (m.type === "client.metrics") {
            if (
              p.budgetBytes !== catalog.manifest.cacheBudgetBytes ||
              p.residentBytes + p.reservedBytes > p.budgetBytes
            )
              throw Error("Бюджет телеметрии");
          } else if (education.handle(c, m)) {
          } else if (competition.handle(c, m)) {
            if (m.type === "competition.join") {
              // Synthetic PLAYERS, never NPCs, use the same authoritative lobby transitions.
              const desired = Math.max(
                2,
                Math.min(5, Number(process.env.DISCOVERY_MOCK_PLAYERS) || 2),
              );
              while (botUsers.length < desired - 1) {
                const player = {
                  ...clone(bots[0]),
                  playerId: randomUUID(),
                  displayName: "Участник " + (botUsers.length + 2),
                };
                bots.push(player);
                const u = {
                  id: randomUUID(),
                  player,
                  isBot: true,
                  member: true,
                };
                competition.init(u);
                botUsers.push(u);
              }
              const l = competition.lobbies.get(m.payload.tableId);
              for (const b of botUsers.slice(0, desired - 1))
                if (!l.members.has(b.player.playerId))
                  competition.join(b, l.state.tableId, { trusted: true });
              competition.broadcast(l);
            }
          } else if (m.type === "npc.interact") {
            const key = user.id + ":" + m.requestId;
            const prior = interactions.get(key);
            if (prior) {
              if (prior.payload !== JSON.stringify(p)) {
                error(
                  c,
                  "REQUEST_ID_REUSED",
                  "requestId уже использован",
                  m.requestId,
                );
                return;
              }
              emit(
                c,
                prior.value.status === "pending"
                  ? "npc.accepted"
                  : "npc.result",
                { interaction: prior.value },
                m.requestId,
              );
              return;
            }
            if (
              !c.ready ||
              !doc.values.character.allowedActions.includes(p.action)
            ) {
              error(c, "FORBIDDEN", "Действие недоступно", m.requestId);
              return;
            }
            if (
              p.npcId !== "npc-guide" ||
              !c.interest.chunks.some((d) => d.x === 2 && d.z === 2)
            ) {
              error(c, "NOT_FOUND", "NPC вне области интереса", m.requestId);
              return;
            }
            if (
              Math.hypot(
                user.player.position.x - 86,
                user.player.position.z - 85,
              ) > doc.values.character.interactionRadiusM
            ) {
              error(c, "OUT_OF_RANGE", "Подойдите ближе к Софии", m.requestId);
              return;
            }
            if (c.pending) {
              error(c, "NPC_BUSY", "Дождитесь ответа", m.requestId);
              return;
            }
            if (Date.now() - (user.lastNPC || 0) < 2000) {
              error(
                c,
                "RATE_LIMITED",
                "Подождите 2 секунды между вопросами",
                m.requestId,
              );
              return;
            }
            user.lastNPC = Date.now();
            const value = {
              requestId: m.requestId,
              npcId: p.npcId,
              status: "pending",
              text: "",
              source: "none",
              knowledgeIds: [],
              progressRevision: 1,
              error: null,
            };
            const record = {
              payload: JSON.stringify(p),
              value,
              userId: user.id,
            };
            interactions.set(key, record);
            c.pending = m.requestId;
            emit(c, "npc.accepted", { interaction: value }, m.requestId);
            const acceptedProfile = clone(doc.values.npcBehavior.profiles[0]);
            record.timer = setTimeout(() => {
              if (value.status !== "pending") return;
              const profile = acceptedProfile;
              Object.assign(value, {
                status: "completed",
                source: "rules",
                text: p.text.toLowerCase().includes("свет")
                  ? "Свет от Солнца достигает Земли примерно за 8 минут. Какое наблюдение помогло бы измерить это расстояние?"
                  : profile.difficulty === "simple"
                    ? "Начни с наблюдения. Затем сформулируй гипотезу и проверь её экспериментом."
                    : profile.fallbackText,
              });
              c.pending = null;
              emit(c, "npc.result", { interaction: value }, m.requestId);
            }, 400);
          } else if (m.type === "npc.cancel") {
            const record = interactions.get(user.id + ":" + p.targetRequestId);
            if (!record) {
              error(c, "NOT_FOUND", "Запрос не найден", m.requestId);
              return;
            }
            if (record.value.status === "pending") {
              clearTimeout(record.timer);
              record.value.status = "cancelled";
              c.pending = null;
              emit(
                c,
                "npc.cancelled",
                { interaction: record.value },
                m.requestId,
              );
            } else
              emit(c, "npc.result", { interaction: record.value }, m.requestId);
          }
        } catch (e) {
          error(
            c,
            e.code || "INVALID_REQUEST",
            e.message,
            m?.requestId || null,
          );
        }
      });
      ws.on("close", () => {
        connections.delete(c);
        if (user.connection === c) {
          user.player.connected = false;
          competition.disconnect(user);
          user.connection = null;
        }
      });
    });
  };
  httpServer.on("upgrade", upgrade);
  const timer = setInterval(() => {
    tick++;
    competition.tick();
    for (const l of competition.lobbies.values()) {
      for (const b of botUsers) {
        const row = l.state.participants.find(
          (p) => p.playerId === b.player.playerId,
        );
        if (!row || row.left) continue;
        if (
          l.state.status === "lobby" &&
          !row.ready &&
          b.wallet.availableAura >= l.state.stakeAura &&
          tick % 30 === 0
        ) {
          competition.ready(b, {
            tableId: l.state.tableId,
            lobbyId: l.state.lobbyId,
            expectedRevision: l.state.revision,
            ready: true,
          });
          competition.broadcast(l);
        }
        if (
          l.state.status === "running" &&
          !l.closed &&
          !l.answers.has(b.player.playerId) &&
          Date.now() >
            Date.parse(l.state.round.deadlineAt) -
              l.state.roundSeconds * 1000 +
              2500
        ) {
          const q = l.state.round.question;
          const key =
            l.pack.questions[l.state.round.ordinal - 1].correctOptionId;
          const option =
            (l.state.round.ordinal + botUsers.indexOf(b)) % 3 === 0
              ? q.options.find((o) => o.optionId !== key)
              : q.options.find((o) => o.optionId === key);
          competition.answer(b, {
            matchId: l.state.matchId,
            questionId: q.questionId,
            optionId: option.optionId,
          });
          competition.broadcast(l);
        }
      }
    }
    if (pendingConfig) {
      doc = pendingConfig;
      pendingConfig = null;
      for (const c of connections)
        if (c.hello)
          emit(c, "config.changed", {
            revision: doc.revision,
            effectiveTick: tick,
            publicConfig: publicConfig(),
          });
    }
    for (const c of connections) {
      if (Date.now() - c.lastPing > 30000) {
        c.ws.close(4000);
        continue;
      }
      const p = c.input;
      if (
        !c.ready ||
        c.user.player.activity.mode !== "exploring" ||
        !p ||
        Date.now() - c.lastInput > doc.values.character.maxInputSilenceMs
      )
        continue;
      const magnitude = Math.max(1, Math.hypot(p.moveX, p.moveZ)),
        speed =
          doc.values.character.walkSpeedMps *
          (p.running ? doc.values.character.runMultiplier : 1) *
          0.05;
      const before = c.user.player.position,
        next = {
          x: Math.min(
            319.5,
            Math.max(0.5, before.x + (p.moveX / magnitude) * speed),
          ),
          y: 0,
          z: Math.min(
            319.5,
            Math.max(0.5, before.z + (p.moveZ / magnitude) * speed),
          ),
        };
      if (
        Math.hypot(next.x - 80, next.z - 80) < 4.5 ||
        Math.hypot(next.x - 66, next.z - 63) < 5.2 ||
        doc.values.gameplay.competition.tables.some(
          (t) =>
            Math.hypot(next.x - t.position.x, next.z - t.position.z) < 1.85,
        )
      )
        continue;
      const center = [Math.floor(next.x / 32), Math.floor(next.z / 32)];
      if (center[0] !== c.center[0] || center[1] !== c.center[1]) {
        interest(c, ...center);
        continue;
      }
      c.user.player.position = next;
      c.user.player.yawRad = p.yawRad;
    }
    const t = tick / 20;
    if (bots[0].activity.mode === "exploring")
      bots[0].position = {
        x: 72 + Math.sin(t * 0.2) * 4,
        y: 0,
        z: 75 + Math.cos(t * 0.2) * 4,
      };
    if (bots[1].activity.mode === "exploring")
      bots[1].position = {
        x: 92 + Math.sin(t * 0.14) * 3,
        y: 0,
        z: 87 + Math.cos(t * 0.14) * 3,
      };
    if (tick % 2 === 0) for (const c of connections) snapshot(c);
  }, 50);
  timer.unref();
  async function middleware(req, res, next) {
    if (!req.url.startsWith("/api/v1/")) return next();
    const path = new URL(req.url, "http://local").pathname;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    const reply = (status, value) => {
      res.statusCode = status;
      res.end(value === null ? "" : JSON.stringify(value));
    };
    const reject = (status, code, message) =>
      reply(status, makeError(code, message));
    let user,
      token = req.headers.authorization?.replace(/^Bearer /, "");
    if (token) {
      const entry = tokens.get(token);
      if (entry && entry.expires > Date.now()) user = entry.user;
    }
    try {
      let body;
      if (["POST", "PUT"].includes(req.method)) {
        const parts = [];
        let size = 0;
        for await (const part of req) {
          size += part.length;
          if (size > 1048576)
            return reject(413, "INVALID_REQUEST", "Слишком большое тело");
          parts.push(part);
        }
        const raw = Buffer.concat(parts).toString();
        if (raw) body = parseJSON(raw, 1048576);
      }
      if (path === "/api/v1/bootstrap")
        return reply(200, {
          protocolVersions: [VERSION],
          serverInstanceId: instanceId,
          worldIds: ["discovery-campus"],
          offline: true,
        });
      if (path === "/api/v1/health")
        return reply(200, { status: "ok", protocolVersion: VERSION });
      if (req.headers["x-discovery-protocol"] !== VERSION)
        return reject(
          409,
          "VERSION_UNSUPPORTED",
          "Нужен X-Discovery-Protocol: " + VERSION,
        );
      if (path === "/api/v1/auth/login" && req.method === "POST") {
        validate("http", body, "loginRequest");
        if (
          !["explorer", "admin"].includes(body.username) ||
          body.password !== "discovery-demo"
        )
          return reject(401, "UNAUTHORIZED", "Неверные демо-данные");
        let u = users.get(body.username);
        if (!u) {
          u = {
            id: randomUUID(),
            role: body.username === "admin" ? "admin" : "player",
            member: false,
            player: {
              playerId: randomUUID(),
              displayName:
                body.username === "admin" ? "Администратор" : "Исследователь",
              position: clone(doc.values.world.spawn),
              yawRad: 0,
              connected: false,
              lastProcessedInputSeq: 0,
            },
          };
          competition.init(u);
          users.set(body.username, u);
        }
        const accessToken = randomBytes(32).toString("base64url");
        tokens.set(accessToken, { user: u, expires: Date.now() + 3600000 });
        return reply(200, {
          accessToken,
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          user: {
            userId: u.id,
            displayName: u.player.displayName,
            role: u.role,
          },
        });
      }
      if (!user) return reject(401, "UNAUTHORIZED", "Нужна авторизация");
      if (path === "/api/v1/auth/logout" && req.method === "POST") {
        tokens.delete(token);
        for (const c of connections) if (c.token === token) c.ws.close(4003);
        return reply(204, null);
      }
      const educational = education.http(path, user);
      if (educational) return reply(200, educational);
      if (path === "/api/v1/activity/me")
        return reply(200, competition.init(user).own);
      if (path === "/api/v1/wallet/me")
        return reply(200, competition.init(user).wallet);
      if (path === "/api/v1/wallet/me/ledger")
        return reply(200, {
          entries: competition.init(user).ledger.slice(-100).reverse(),
          nextCursor: null,
        });
      if (path.startsWith("/api/v1/competition/lobbies/")) {
        const l = [...competition.lobbies.values()].find(
          (l) => l.state.lobbyId === path.split("/").at(-1),
        );
        if (!l?.members.has(user.player.playerId))
          return reject(404, "NOT_FOUND", "Лобби не найдено");
        return reply(200, l.state);
      }
      if (/^\/api\/v1\/competition\/matches\/[^/]+\/me$/.test(path))
        return reply(200, competition.recovery(user, path.split("/").at(-2)));
      if (path === "/api/v1/auth/me")
        return reply(200, {
          userId: user.id,
          displayName: user.player.displayName,
          role: user.role,
        });
      if (path === "/api/v1/worlds/discovery-campus/config")
        return reply(200, publicConfig());
      if (path === "/api/v1/worlds/discovery-campus/manifest")
        return reply(200, catalog.manifest);
      if (path === "/api/v1/admin/worlds/discovery-campus/config") {
        if (user.role !== "admin")
          return reject(403, "FORBIDDEN", "Требуется администратор");
        if (req.method === "PUT") {
          if (!req.headers["if-match"])
            return reject(428, "CONFIG_CONFLICT", "Нужен If-Match");
          if (
            req.headers["if-match"] !== `"config-${doc.revision}"` ||
            pendingConfig
          )
            return reject(412, "CONFIG_CONFLICT", "Конфигурация изменена");
          validateAdmin(body);
          const previous = clone(doc.values),
            candidate = clone(body);
          for (const key of ["timeOfDayHours", "weather", "decorDensity"]) {
            previous.world[key] = candidate.world[key];
          }
          for (const key of [
            "renderDefaults",
            "characterVisualDefaults",
            "npcBehavior",
          ])
            previous[key] = candidate[key];
          for (const key of [
            "walkSpeedMps",
            "runMultiplier",
            "interactionRadiusM",
            "allowedActions",
            "maxInputSilenceMs",
          ])
            previous.character[key] = candidate.character[key];
          if (JSON.stringify(previous) !== JSON.stringify(candidate))
            return reject(
              409,
              "RESTART_REQUIRED",
              "Структурные изменения требуют остановленных комнат и опубликованного каталога",
            );
          pendingConfig = { revision: doc.revision + 1, values: clone(body) };
          res.setHeader("ETag", `"config-${pendingConfig.revision}"`);
          return reply(200, pendingConfig);
        }
        res.setHeader("ETag", `"config-${doc.revision}"`);
        return reply(200, doc);
      }
      if (path === "/api/v1/sessions") {
        if (req.method === "GET") return reply(200, { sessions: [session()] });
        validate("http", body, "createSession");
        user.member = true;
        return reply(201, session());
      }
      if (path === `/api/v1/sessions/${sessionId}`)
        return reply(200, session());
      if (path === `/api/v1/sessions/${sessionId}/members/me`) {
        if (req.method === "DELETE") {
          user.member = false;
          user.connection?.ws.close(1000);
          return reply(204, null);
        }
        if (session().players.length >= 5 && !user.member)
          return reject(409, "SESSION_FULL", "Комната заполнена");
        user.member = true;
        return reply(200, session());
      }
      if (path === `/api/v1/sessions/${sessionId}/ws-ticket`) {
        validate("http", body, "ticketRequest");
        if (!user.member) return reject(403, "FORBIDDEN", "Нет членства");
        const ticket = randomBytes(32).toString("base64url");
        tickets.set(ticket, {
          user,
          token,
          origin: req.headers.origin || `http://${req.headers.host}`,
          expires: Date.now() + 30000,
        });
        return reply(200, {
          ticket,
          expiresInSeconds: 30,
          wsPath: "/api/v1/ws",
          subprotocol: "discovery.v1",
        });
      }
      if (path.startsWith(`/api/v1/sessions/${sessionId}/interactions/`)) {
        const record = interactions.get(user.id + ":" + path.split("/").at(-1));
        return record
          ? reply(200, record.value)
          : reject(404, "NOT_FOUND", "Запрос не найден");
      }
      if (
        path.startsWith("/api/v1/worlds/discovery-campus/chunks/") ||
        path.startsWith("/api/v1/worlds/discovery-campus/assets/")
      ) {
        const c = user.connection;
        if (!c?.interest) return reject(403, "OUT_OF_INTEREST", "Нет interest");
        if (
          String(c.interest.interestRevision) !==
          req.headers["x-interest-revision"]
        )
          return reject(409, "STALE_INTEREST", "Устаревший interest");
        const descriptor = [...c.interest.chunks, ...c.interest.assets].find(
          (d) => d.url === path,
        );
        if (!descriptor)
          return reject(403, "OUT_OF_INTEREST", "Ресурс вне interest");
        const bytes = await readFile(
          new URL(
            "resources/" +
              descriptor.sha256 +
              (descriptor.chunkId ? ".json" : ".glb"),
            assetRoot,
          ),
        );
        res.setHeader(
          "Content-Type",
          descriptor.mediaType || "application/json",
        );
        res.setHeader("Content-Length", bytes.length);
        res.setHeader("Content-Encoding", "identity");
        res.end(bytes);
        return;
      }
      return reject(404, "NOT_FOUND", "Маршрут не найден");
    } catch (e) {
      return reject(
        e.code === "NOT_FOUND" ? 404 : 400,
        e.code || "INVALID_REQUEST",
        e.message,
      );
    }
  }
  return {
    middleware,
    competition,
    close() {
      clearInterval(timer);
      httpServer.off("upgrade", upgrade);
      for (const c of connections) c.ws.terminate();
      wss.close();
    },
  };
}

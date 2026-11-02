// Opt-in integration audit. Never prints passwords, tokens, tickets or payloads.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import WebSocket from "ws";
import {
  command,
  parseEvent,
  validate,
  VERSION,
  WS_SUBPROTOCOL,
} from "../src/network/protocol.js";
const base = new URL(
  process.env.DISCOVERY_AUDIT_URL || "http://127.0.0.1:8080",
);
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.pathname !== "/" ||
  base.username ||
  base.password
)
  throw Error("DISCOVERY_AUDIT_URL must be an HTTP(S) origin");
const report = {
  at: new Date().toISOString(),
  origin: base.origin,
  checks: [],
  blocked: [],
};
const record = (name, ok, details = {}) =>
  report.checks.push({ name, ok, ...details });
const req = async (path, method = "GET", body, token) => {
  const r = await fetch(new URL(path, base), {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(5000),
    headers: {
      "X-Discovery-Protocol": VERSION,
      Origin: base.origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};
const check = async (name, fn) => {
  try {
    await fn();
  } catch (error) {
    record(name, false, { error: error.code || error.name });
  }
};
await check("health and v2 bootstrap", async () => {
  const health = await req("/health/ready"),
    bootstrap = await req("/api/v2/bootstrap");
  validate("http", bootstrap.body, "bootstrap");
  record(
    "health and v2 bootstrap",
    health.status === 200 && bootstrap.status === 200,
  );
});
await check(
  "protected endpoints reject missing or invalid bearer",
  async () => {
    for (const token of [undefined, "audit-invalid-token"]) {
      const r = await req("/api/v2/auth/me", "GET", undefined, token);
      validate("error", r.body);
      record("protected auth/me", r.status === 401, { status: r.status });
    }
  },
);
await check("wrong password rejected", async () => {
  const r = await req("/api/v2/auth/login", "POST", {
    username: process.env.DISCOVERY_AUDIT_USERNAME || "player6",
    password: "audit-deliberately-wrong-password-7e1d",
  });
  record("wrong password rejected", r.status === 401, { status: r.status });
  if (r.body?.accessToken)
    await req("/api/v2/auth/logout", "POST", undefined, r.body.accessToken);
});
await check("world resources require authentication", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../mock-v2/published.json", import.meta.url)),
  );
  const asset = catalog.interest.assets[0];
  const r = await fetch(new URL(asset.url, base), {
    signal: AbortSignal.timeout(5000),
    redirect: "error",
  });
  await r.body?.cancel();
  record(
    "world resources require authentication",
    [401, 403].includes(r.status),
    { status: r.status },
  );
});
await check("static response has one Content-Length", async () => {
  const count = await new Promise((resolve, reject) => {
    const request = (base.protocol === "https:" ? httpsGet : httpGet)(
      base,
      (r) => {
        const count = r.rawHeaders.filter(
          (h, i) => i % 2 === 0 && h.toLowerCase() === "content-length",
        ).length;
        r.resume();
        resolve(count);
      },
    );
    request.on("error", reject);
    request.setTimeout(4000, () => request.destroy(Error("timeout")));
  });
  record("static response has one Content-Length", count === 1, { count });
});
await check("WebSocket rejects invalid ticket", async () => {
  const url = new URL("/api/v2/ws?ticket=audit-invalid-ticket", base);
  url.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const status = await new Promise((resolve, reject) => {
    const socket = new WebSocket(url, WS_SUBPROTOCOL, {
      origin: base.origin,
      handshakeTimeout: 4000,
    });
    socket.on("error", () => {});
    socket.on("unexpected-response", (_req, r) => {
      r.resume();
      socket.terminate();
      resolve(r.statusCode);
    });
    socket.on("open", () => {
      socket.close();
      resolve(101);
    });
    socket.on("close", () => resolve(0));
    setTimeout(() => {
      socket.terminate();
      reject(Error("timeout"));
    }, 4500).unref();
  });
  record("WebSocket rejects invalid ticket", status === 401, { status });
});

let token, sessionId;
try {
  if (!process.env.DISCOVERY_AUDIT_PASSWORD) {
    report.blocked.push(
      "Authenticated HTTP/WS, streaming and reconnect require dedicated test-account credentials; no password was supplied.",
    );
  } else {
    const login = await req("/api/v2/auth/login", "POST", {
      username: process.env.DISCOVERY_AUDIT_USERNAME || "player6",
      password: process.env.DISCOVERY_AUDIT_PASSWORD,
    });
    if (login.status !== 200) throw Error("LOGIN_FAILED");
    validate("http", login.body, "loginResponse");
    token = login.body.accessToken;
    const room = await req(
      "/api/v2/sessions",
      "POST",
      { worldId: "discovery-campus" },
      token,
    );
    if (room.status !== 201) throw Error("DEDICATED_TEST_ACCOUNT_REQUIRED");
    validate("http", room.body, "session");
    sessionId = room.body.sessionId;
    await check("authenticated config and manifest", async () => {
      validate(
        "config",
        (
          await req(
            "/api/v2/worlds/discovery-campus/config",
            "GET",
            undefined,
            token,
          )
        ).body,
        "publicDocument",
      );
      validate(
        "streaming",
        (
          await req(
            "/api/v2/worlds/discovery-campus/manifest",
            "GET",
            undefined,
            token,
          )
        ).body,
        "manifest",
      );
      record("authenticated config and manifest", true);
    });
    const runSocket = async () => {
      const ticket = await req(
        `/api/v2/sessions/${sessionId}/ws-ticket`,
        "POST",
        { protocolVersion: VERSION },
        token,
      );
      validate("http", ticket.body, "ticketResponse");
      const url = new URL(ticket.body.wsPath, base);
      url.protocol = base.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("ticket", ticket.body.ticket);
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(url, WS_SUBPROTOCOL, {
          origin: base.origin,
          handshakeTimeout: 4000,
        });
        const timer = setTimeout(() => {
          socket.terminate();
          reject(Error("WS_TIMEOUT"));
        }, 8000);
        let seq = 0,
          chain = Promise.resolve(),
          finished = false;
        const done = (error) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          socket.close();
          error ? reject(error) : resolve();
        };
        socket.on("error", done);
        socket.on("open", () =>
          socket.send(
            JSON.stringify(
              command("client.hello", {
                clientName: "Discovery integration audit",
              }),
            ),
          ),
        );
        socket.on("message", (data) => {
          chain = chain
            .then(async () => {
              const event = parseEvent(data.toString());
              if (event.serverSeq !== ++seq) throw Error("SERVER_SEQ_GAP");
              if (event.type === "server.welcome")
                record(
                  "server UTC is current",
                  Math.abs(Date.parse(event.serverTime) - Date.now()) < 10000,
                );
              if (event.type === "world.interest") {
                // Fetch, size-check and hash every announced resource with the shared protocol helpers.
                const hashes = [];
                for (const descriptor of [
                  ...event.payload.chunks,
                  ...event.payload.assets,
                ]) {
                  const r = await fetch(new URL(descriptor.url, base), {
                    headers: {
                      Authorization: "Bearer " + token,
                      "X-Interest-Revision": String(
                        event.payload.interestRevision,
                      ),
                      "X-Discovery-Protocol": VERSION,
                    },
                    redirect: "error",
                    signal: AbortSignal.timeout(5000),
                  });
                  const bytes = new Uint8Array(await r.arrayBuffer());
                  const { safeDigestSha256 } =
                    await import("../src/network/protocol.js");
                  if (
                    !r.ok ||
                    bytes.length !== descriptor.byteSize ||
                    (await safeDigestSha256(bytes)) !== descriptor.sha256
                  )
                    throw Error("RESOURCE_INTEGRITY_FAILED");
                  hashes.push(descriptor.sha256);
                }
                socket.send(
                  JSON.stringify(
                    command("world.ready", {
                      interestRevision: event.payload.interestRevision,
                      resourceHashes: [...new Set(hashes)],
                    }),
                  ),
                );
              }
              if (event.type === "world.snapshot")
                socket.send(
                  JSON.stringify(
                    command("client.ping", { nonce: crypto.randomUUID() }),
                  ),
                );
              if (event.type === "server.pong") done();
            })
            .catch(done);
        });
      });
    };
    await check("authenticated WS and reconnect with new ticket", async () => {
      await runSocket();
      await runSocket();
      record("authenticated WS and reconnect with new ticket", true);
    });
  }
} catch (error) {
  record("authenticated flow", false, { error: error.message });
} finally {
  if (token) {
    if (sessionId)
      await req(
        `/api/v2/sessions/${sessionId}/members/me`,
        "DELETE",
        undefined,
        token,
      ).catch(() => {});
    await req("/api/v2/auth/logout", "POST", undefined, token).catch(() => {});
    const revoked = await req("/api/v2/auth/me", "GET", undefined, token).catch(
      () => ({ status: 0 }),
    );
    record("logout revokes bearer", revoked.status === 401, {
      status: revoked.status,
    });
  }
}
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/backend-smoke.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
process.exitCode =
  report.checks.some((c) => !c.ok) || report.blocked.length ? 1 : 0;

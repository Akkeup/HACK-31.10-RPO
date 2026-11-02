import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DiscoveryAdapter } from "../src/network/adapters.js";
const fixture = async (name) =>
  JSON.parse(
    await readFile(
      new URL(`./fixtures/v2.0.0/http/${name}.json`, import.meta.url),
    ),
  );
const errorBody = (code) => ({
  code,
  message: "Audit test",
  retryable: false,
  requestId: null,
  details: [],
});

test("authenticated 401 clears bearer and rejects pending commands instead of reconnecting with expired credentials", async () => {
  const saved = globalThis.fetch;
  const login = await fixture("login-response");
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push(options);
    return new Response(
      JSON.stringify(
        path.endsWith("/login") ? login : errorBody("UNAUTHORIZED"),
      ),
      { status: path.endsWith("/login") ? 200 : 401 },
    );
  };
  const a = new DiscoveryAdapter();
  try {
    await a.login("player6", "test-password");
    a.ready = true;
    a.status("connected");
    const pending = a.execute(
      "competition.leave",
      { tableId: "competition-central" },
      ["activity.changed"],
    );
    const rejected = assert.rejects(pending, /закрыто/);
    await assert.rejects(a.request("/api/v2/auth/me"), { status: 401 });
    await rejected;
    assert.equal(a.lastStatus, "auth-expired");
    assert.equal(a.ready, false);
    await assert.rejects(a.request("/api/v2/auth/me"));
    assert.equal(calls.at(-1).headers.Authorization, undefined);
    assert.ok(calls.every((c) => c.redirect === "error"));
  } finally {
    a.close();
    globalThis.fetch = saved;
  }
});

test("logout clears local authentication even if the server cannot confirm revocation", async () => {
  const saved = globalThis.fetch,
    login = await fixture("login-response");
  globalThis.fetch = async (path) => {
    if (path.endsWith("/login")) return new Response(JSON.stringify(login));
    throw Error("network down");
  };
  const a = new DiscoveryAdapter();
  try {
    await a.login("player6", "test-password");
    a.ready = true;
    await assert.rejects(a.logout(), /network down/);
    assert.equal(a.closed, true);
    assert.equal(a.ready, false);
    assert.equal(a.sessionId, undefined);
  } finally {
    a.close();
    globalThis.fetch = saved;
  }
});

test("restoring a saved session never creates another room after a network/server outage", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const session = await fixture("session");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => session.sessionId },
  });
  const a = new DiscoveryAdapter();
  let created = false;
  a.request = async (path, options) => {
    if (path.endsWith("/bootstrap"))
      return { value: await fixture("bootstrap") };
    if (path.endsWith("/login"))
      return { value: await fixture("login-response") };
    if (path.endsWith("/config"))
      return { value: await fixture("public-config") };
    if (path.endsWith("/manifest")) return { value: await fixture("manifest") };
    if (options.method === "PUT")
      throw Object.assign(Error("outage"), {
        status: 500,
        code: "INTERNAL_ERROR",
      });
    created = true;
    return { value: session };
  };
  try {
    await assert.rejects(
      a.initialize({ username: "player6", password: "test-password" }),
      /outage/,
    );
    assert.equal(created, false);
  } finally {
    a.close();
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});

test("resource URLs are validated before a bearer token can be sent to an external origin", async () => {
  const a = new DiscoveryAdapter(),
    saved = globalThis.fetch;
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    throw Error("unexpected fetch");
  };
  try {
    await assert.rejects(
      a.fetchResource(
        {
          resourceId: "x",
          sha256: "a".repeat(64),
          byteSize: 1,
          mediaType: "application/octet-stream",
          url:
            "https://other.invalid/api/v2/worlds/discovery-campus/assets/" +
            "a".repeat(64),
        },
        1,
      ),
    );
    assert.equal(fetched, false);
  } finally {
    a.close();
    globalThis.fetch = saved;
  }
});

test("HTTPS pages connect over same-origin WSS with the approved subprotocol", async () => {
  const oldLocation = globalThis.location,
    oldSocket = globalThis.WebSocket;
  let opened;
  globalThis.location = {
    origin: "https://discovery.example",
    protocol: "https:",
  };
  globalThis.WebSocket = class {
    constructor(url, protocol) {
      opened = { url: new URL(url), protocol };
    }
    close() {}
  };
  const a = new DiscoveryAdapter();
  a.sessionId = (await fixture("session")).sessionId;
  a.bootstrap = async () => {};
  a.request = async () => ({ value: await fixture("ticket-response") });
  try {
    await a.openSocket();
    assert.equal(opened.url.protocol, "wss:");
    assert.equal(opened.url.host, "discovery.example");
    assert.equal(opened.url.pathname, "/api/v2/ws");
    assert.equal(opened.protocol, "discovery.v2");
  } finally {
    a.close();
    globalThis.location = oldLocation;
    globalThis.WebSocket = oldSocket;
  }
});

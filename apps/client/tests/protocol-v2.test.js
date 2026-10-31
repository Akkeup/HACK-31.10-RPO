import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomFillSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { DiscoveryAdapter } from "../src/network/adapters.js";
import { protocolSchemas } from "../src/protocol/schemas.js";
import {
  VERSION,
  API_ROOT,
  WS_SUBPROTOCOL,
  command,
  parseEvent,
  validate,
} from "../src/network/protocol.js";
import {
  safeRandomUUID,
  safeSha256Hex,
  safeDigestSha256,
} from "../src/network/crypto.js";
import { resolveTransport } from "../src/config/transport.js";

const fixture = async (path) =>
  JSON.parse(
    await readFile(new URL("./fixtures/v2.0.0/" + path, import.meta.url)),
  );

test("active protocol contains only released v2 schemas and rejects legacy wire shapes", async () => {
  assert.equal(VERSION, "2.0.0");
  assert.equal(API_ROOT, "/api/v2");
  assert.equal(WS_SUBPROTOCOL, "discovery.v2");
  assert.equal(protocolSchemas.length, 27);
  assert.ok(
    protocolSchemas.every((s) =>
      s.$id.startsWith("https://discovery.invalid/protocol/2.0.0/"),
    ),
  );
  const event = await fixture("ws/competition.answer.accepted.json");
  parseEvent(JSON.stringify(event));
  assert.throws(() =>
    parseEvent(JSON.stringify({ ...event, protocolVersion: "1.1.0" })),
  );
  assert.throws(() =>
    parseEvent(
      JSON.stringify({
        ...event,
        payload: { ...event.payload, optionId: "option-1" },
      }),
    ),
  );
  assert.throws(() =>
    command("competition.answer", {
      matchId: event.payload.matchId,
      questionId: event.payload.questionId,
      optionId: "option-1",
    }),
  );
  const recovery = await fixture("http/competition-recovery.json");
  validate("competition", recovery, "ownRecovery");
  assert.throws(() =>
    validate(
      "competition",
      { ...recovery, selectedOptionId: "option-1" },
      "ownRecovery",
    ),
  );
  assert.throws(() => validate("education", [], "attempts"));
  validate("education", { attempts: [] }, "attempts");
  const ticket = {
    ticket: "a".repeat(32),
    expiresInSeconds: 30,
    wsPath: API_ROOT + "/ws",
    subprotocol: WS_SUBPROTOCOL,
  };
  validate("http", ticket, "ticketResponse");
  assert.throws(() =>
    validate(
      "http",
      { ...ticket, wsPath: "/api/v1/ws", subprotocol: "discovery.v1" },
      "ticketResponse",
    ),
  );
});

test("HTTP adapter rejects v1 and non-API destinations before fetch; v2 sends version header", async () => {
  const saved = globalThis.fetch,
    calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return new Response("{}", { status: 200 });
  };
  const adapter = new DiscoveryAdapter();
  try {
    for (const path of [
      "/api/v1/bootstrap",
      "/api/v2/../v1/bootstrap",
      "https://example.com/api/v2/bootstrap",
      "https://discovery.invalid/api/v2/bootstrap",
      "/demo/resources/example",
    ])
      await assert.rejects(adapter.request(path), /VERSION_UNSUPPORTED/);
    assert.equal(calls.length, 0);
    await adapter.request("/api/v2/bootstrap");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers["X-Discovery-Protocol"], "2.0.0");
    assert.equal(calls[0].options.cache, "no-store");
    await assert.rejects(adapter.enterLocation("room-math"), /только в демо/);
    assert.equal(adapter.locationId, undefined);
  } finally {
    globalThis.fetch = saved;
    adapter.close();
  }
});

test("build transport defaults to real and rejects misspelled modes", () => {
  assert.equal(resolveTransport(undefined), "real");
  assert.equal(resolveTransport(""), "real");
  assert.equal(resolveTransport("real"), "real");
  assert.equal(resolveTransport("mock"), "mock");
  assert.throws(() => resolveTransport("demo"));
});

test("LAN UUID fallback is cryptographic, valid v4, does not recurse or modify Crypto", () => {
  const provider = Object.freeze({
    randomUUID: safeRandomUUID,
    getRandomValues: randomFillSync,
  });
  const ids = new Set(
    Array.from({ length: 64 }, () => safeRandomUUID(provider)),
  );
  assert.equal(ids.size, 64);
  for (const id of ids)
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  assert.equal(provider.randomUUID, safeRandomUUID);
  assert.throws(() => safeRandomUUID({}), /random generator unavailable/);
});

test("LAN SHA-256 fallback matches Node for padding boundaries, binary data and offset views", async () => {
  for (const length of [0, 1, 3, 55, 56, 63, 64, 65, 127, 128, 1024, 65536]) {
    const data = Uint8Array.from({ length }, (_, i) => (i * 17 + 63) % 256);
    const expected = createHash("sha256").update(data).digest("hex");
    assert.equal(safeSha256Hex(data), expected);
    assert.equal(await safeDigestSha256(data, {}), expected);
    assert.equal(
      await safeDigestSha256(data, {
        subtle: {
          digest: async () => {
            throw Error("unavailable");
          },
        },
      }),
      expected,
    );
  }
  const data = new Uint8Array([99, 97, 98, 99, 99]);
  const expected =
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  assert.equal(safeSha256Hex(new DataView(data.buffer, 1, 3)), expected);
  assert.equal(await safeDigestSha256(data.subarray(1, 4)), expected);
});

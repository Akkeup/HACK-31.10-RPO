import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  validate,
  parseEvent,
  parseJSON,
  command,
  movement,
} from "../src/network/legacy-protocol.js";
import {
  defaults,
  validateConfig,
  validateAdmin,
  loadLocal,
} from "../src/config/legacy-config.js";
import { ResourceLedger } from "../src/world/resources.js";
import { SnapshotBuffer } from "../src/network/interpolation.js";
const fixture = async (path) =>
  JSON.parse(
    await readFile(
      new URL(
        "./fixtures/" +
          (path.startsWith("invalid/") || path === "schema-checksums.json"
            ? ""
            : "v1.1.0/") +
          path,
        import.meta.url,
      ),
      "utf8",
    ),
  );
test("all released WS fixtures validate against unmodified official schemas", async () => {
  for (const file of await readdir(
    new URL("./fixtures/v1.1.0/ws/", import.meta.url),
  )) {
    const value = await fixture("ws/" + file);
    validate(
      Object.hasOwn(value, "serverSeq") ? "server-message" : "client-message",
      value,
    );
  }
});
test("released HTTP public/admin config and defaults validate", async () => {
  validate(
    "config",
    await fixture("http/public-config.json"),
    "publicDocument",
  );
  validate("config", await fixture("http/admin-config.json"), "adminDocument");
  validateAdmin((await fixture("http/admin-config.json")).values);
  for (const [kind, value] of Object.entries(defaults))
    validateConfig(kind, value);
});
test("negative official fixtures and gameplay injection are rejected", async () => {
  for (const name of [
    "client-bad-version",
    "client-extra-field",
    "input-range",
  ]) {
    const value = await fixture("invalid/" + name + ".json");
    assert.throws(() => validate("client-message", value));
  }
  for (const name of ["config-speed", "config-extra"]) {
    const value = await fixture("invalid/" + name + ".json");
    assert.throws(() =>
      validate(
        name === "config-speed" ? "character-config" : "render-config",
        value,
      ),
    );
  }
  assert.throws(() =>
    validateConfig("render", { ...defaults.render, walkSpeedMps: 999 }),
  );
  assert.throws(() => movement(1, [NaN, 0], 0, 1));
  assert.equal(movement(1, [0, 1], 0, 0).payload.interestRevision, 0);
});
test("JSON rejects duplicate keys, BOM, oversize payloads", () => {
  assert.throws(() => parseJSON('{"a":1,"a":2}'));
  assert.throws(() => parseJSON("\ufeff{}"));
  assert.throws(() => parseJSON(" ".repeat(65537)));
  assert.deepEqual(parseJSON('{"a":{"x":1},"b":{"x":2}}'), {
    a: { x: 1 },
    b: { x: 2 },
  });
});
test("invalid/unavailable storage falls back to server defaults", () => {
  for (const getItem of [
    () => "{bad",
    () => '{"render":{"speed":3}}',
    () => {
      throw Error("blocked");
    },
  ])
    assert.deepEqual(loadLocal({ getItem }, defaults), defaults);
});
test("120ms interpolation, shortest rotation, stale ticks and no unlimited extrapolation", () => {
  const b = new SnapshotBuffer(120);
  b.push([0, 0, 0], 3.1, 0, 1);
  b.push([10, 0, 0], -3.1, 100, 2);
  b.push([999, 0, 0], 0, 110, 1);
  assert.equal(b.sample(170).position[0], 5);
  assert.ok(Math.abs(b.sample(170).heading - Math.PI) < 0.01);
  assert.equal(b.sample(99999).position[0], 10);
});
test("normative C union R accounting, dedup, pinned resources, eviction and world revision", async () => {
  const m = await fixture("http/manifest.json");
  const pool = new ResourceLedger(m);
  const descriptor = { sha256: "a".repeat(64), byteSize: 1000 };
  pool.reserve(descriptor);
  assert.equal(pool.reservedBytes, 1000);
  assert.equal(pool.usedBytes, 1000);
  assert.equal(pool.reserve(descriptor), pool.records.get(descriptor.sha256));
  pool.commit(descriptor.sha256, new Uint8Array(1000));
  assert.equal(pool.residentBytes, 1000);
  assert.equal(pool.reservedBytes, 0);
  pool.records.get(descriptor.sha256).refs.add("model");
  assert.throws(() => pool.reserve({ sha256: "b".repeat(64), byteSize: 1500 }));
  assert.throws(() => pool.setManifest({ ...m, worldRevision: 2 }));
  pool.releaseOwner("model");
  pool.reserve({ sha256: "b".repeat(64), byteSize: 1500 });
  assert.equal(pool.usedBytes, 1500);
  assert.equal(pool.evictions, 1);
  pool.fail("b".repeat(64));
  assert.equal(pool.usedBytes, 0);
  assert.throws(
    () =>
      new ResourceLedger({ ...m, cacheBudgetBytes: m.cacheBudgetBytes + 1 }),
  );
});
test("physical memory reservation is independently bounded", async () => {
  const m = await fixture("http/manifest.json");
  const pool = new ResourceLedger(m, 100);
  assert.throws(
    () => pool.reserve({ sha256: "a".repeat(64), byteSize: 101 }),
    /256/,
  );
  assert.equal(pool.usedBytes, 0);
});
test("published art catalog hashes/byte sizes, exact W/B, unique real content and all single chunks fit", async () => {
  const root = new URL("../../../assets/world/", import.meta.url);
  const catalog = JSON.parse(
    await readFile(new URL("catalog.server-only.json", root)),
  );
  let total = 0;
  const hashes = new Set();
  for (const d of [...catalog.chunks, ...catalog.assets]) {
    const bytes = await readFile(
      new URL(
        "resources/" +
          d.sha256 +
          (d.chunkId
            ? ".json"
            : d.mediaType === "image/svg+xml"
              ? ".svg"
              : ".glb"),
        root,
      ),
    );
    assert.equal(bytes.length, d.byteSize);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), d.sha256);
    if (!hashes.has(d.sha256)) {
      hashes.add(d.sha256);
      total += bytes.length;
    }
  }
  assert.equal(catalog.manifest.totalWorldBytes, total);
  assert.equal(catalog.manifest.cacheBudgetBytes, Math.floor(total / 10));
  for (const c of catalog.chunks) {
    const required =
      c.byteSize +
      catalog.assets
        .filter((a) => c.assetIds.includes(a.resourceId))
        .reduce((n, a) => n + a.byteSize, 0);
    assert.ok(required <= Math.floor(total / 10));
  }
  assert.equal(catalog.chunks.length, 100);
});
test("released 1.0.0 schemas remain byte-identical to the supplied archive", async () => {
  const checks = await fixture("schema-checksums.json");
  for (const [file, expected] of Object.entries(checks)) {
    const bytes = await readFile(
      new URL("../src/protocol/v1.0.0/" + file, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expected,
      file,
    );
  }
});
test("texture dimensions are checked before decoded-image allocation", async () => {
  const { imageMemory } = await import("../src/world/image-budget.js");
  const png = new Uint8Array(24),
    view = new DataView(png.buffer);
  view.setUint32(0, 0x89504e47);
  view.setUint32(4, 0x0d0a1a0a);
  view.setUint32(16, 512);
  view.setUint32(20, 512);
  assert.ok(imageMemory(png) < 3 * 1048576);
  view.setUint32(16, 100000);
  assert.throws(() => imageMemory(png), /RESOURCE_TOO_LARGE/);
});

test("released 1.1.0 schemas remain byte-identical to the supplied archive", async () => {
  const checks = JSON.parse(
    await readFile(
      new URL("./fixtures/v1.1.0/schema-checksums.json", import.meta.url),
    ),
  );
  for (const [file, expected] of Object.entries(checks)) {
    const bytes = await readFile(
      new URL("../src/protocol/v1.1.0/" + file, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expected,
      file,
    );
  }
});

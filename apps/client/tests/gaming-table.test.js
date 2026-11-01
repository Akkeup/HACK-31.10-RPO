import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LocalMockAdapter } from "../mock-v2/adapter.js";
import { validate as released } from "../src/network/protocol.js";
import { validate as preview } from "../mock-v2/four-seat-contract.js";
import { hubCollisionBoxes, inside } from "../mock-v2/collision.js";
import published from "../mock-v2/published.json" with { type: "json" };
import art from "../src/config/local-art.json" with { type: "json" };

const sha = (b) => createHash("sha256").update(b).digest("hex");
async function setup() {
  let clock = 1000;
  const a = new LocalMockAdapter({
    storage: null,
    latency: 0,
    now: () => clock,
  });
  await a.initialize();
  await a.connect();
  clearInterval(a.interval);
  a.ready = true;
  a.connection.ready = true;
  a.advance = (ms) => {
    clock += ms;
    a.tick();
  };
  return a;
}

test("gaming table is the supplied GLB and is streamed once through the budgeted catalog", async () => {
  const bytes = await readFile(
    new URL(
      "../public/assets/models/furniture/gaming-table.glb",
      import.meta.url,
    ),
  );
  assert.deepEqual(
    bytes,
    await readFile(
      new URL(
        "../../../assets/models/imported/furniture/gaming-table.glb",
        import.meta.url,
      ),
    ),
  );
  const descriptor = published.interest.assets.find(
    (item) => item.resourceId === "competition-table",
  );
  assert.equal(descriptor.sha256, sha(bytes));
  assert.equal(descriptor.byteSize, bytes.length);
  assert.equal(
    art["round-table"].available,
    false,
    "no duplicate unbudgeted LocalArt table",
  );
  const model = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const bounds = new THREE.Box3().setFromObject(model.scene);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x - 1.8) < 1e-5 && Math.abs(size.z - 1.2) < 1e-5);
  assert.ok(Math.abs(size.y - 0.76) < 1e-5 && bounds.min.y === 0);
  assert.ok(
    published.interest.requiredBytes <= published.manifest.cacheBudgetBytes,
  );
  const worldRoot = new URL("../../../assets/world/", import.meta.url);
  const catalog = JSON.parse(
    await readFile(
      new URL("catalog.four-seat-draft.server-only.json", worldRoot),
    ),
  );
  const unique = new Map();
  for (const item of [...catalog.chunks, ...catalog.assets]) {
    const extension = item.chunkId
      ? "json"
      : item.mediaType === "image/svg+xml"
        ? "svg"
        : "glb";
    const data = await readFile(
      new URL(`resources/${item.sha256}.${extension}`, worldRoot),
    );
    assert.equal(sha(data), item.sha256);
    assert.equal(data.byteLength, item.byteSize);
    unique.set(item.sha256, item.byteSize);
  }
  assert.equal(
    [...unique.values()].reduce((sum, size) => sum + size, 0),
    catalog.manifest.totalWorldBytes,
  );
  assert.equal(
    catalog.manifest.cacheBudgetBytes,
    Math.floor(catalog.manifest.totalWorldBytes / 10),
  );
  for (const chunk of catalog.chunks)
    assert.ok(
      chunk.byteSize +
        catalog.assets
          .filter((asset) => chunk.assetIds.includes(asset.resourceId))
          .reduce((sum, asset) => sum + asset.byteSize, 0) <=
        catalog.manifest.cacheBudgetBytes,
    );
});

test("four-seat mock validation does not relax or mutate the released network contract", async () => {
  const a = await setup();
  try {
    assert.equal(a.previewProfile, "competition-four-seat-draft");
    const config = await a.getPublicConfig();
    assert.equal(config.values.gameplay.competition.maxPlayers, 4);
    preview("config", config, "publicDocument");
    assert.throws(() => released("config", config, "publicDocument"));
    const old = JSON.parse(
      await readFile(
        new URL("./fixtures/v2.0.0/http/public-config.json", import.meta.url),
      ),
    );
    released("config", old, "publicDocument");
    assert.throws(() => preview("config", old, "publicDocument"));
  } finally {
    a.close();
  }
});

test("all four chairs match confirmed seats, face the table and have clear exits", async () => {
  const a = await setup();
  try {
    const table = a.publicConfig.values.gameplay.competition.tables[0];
    const chunk = JSON.parse(
      await readFile(
        new URL(
          "../../../assets/world/resources/" +
            a.interest.chunks[0].sha256 +
            ".json",
          import.meta.url,
        ),
      ),
    );
    const chairs = chunk.objects.filter(
      (o) => o.modelId === "competition-chair",
    );
    assert.equal(chairs.length, 4);
    assert.equal(table.seats.length, 4);
    const tableBox = hubCollisionBoxes(chunk.objects).find(
      (box) => box.x === table.position.x && box.z === table.position.z,
    );
    const solids = hubCollisionBoxes(chunk.objects, true);
    for (const seat of table.seats) {
      const chair = chairs.find((c) => c.id === seat.seatId);
      assert.deepEqual(chair.position, seat.position);
      assert.equal(chair.yawRad, seat.yawRad);
      const dx = table.position.x - seat.position.x,
        dz = table.position.z - seat.position.z;
      assert.ok(
        (-Math.sin(seat.yawRad) * dx - Math.cos(seat.yawRad) * dz) /
          Math.hypot(dx, dz) >
          0.999,
      );
      assert.ok(!inside(seat.position, tableBox));
      assert.ok(
        !solids.some((box) => inside(seat.exitPosition, box)),
        seat.seatId + " exit blocked",
      );
    }
  } finally {
    a.close();
  }
});

test("four participants complete a match with confirmed payouts; a fifth cannot sit", async () => {
  const a = await setup();
  try {
    await a.demoScenario("win", 4);
    const table = a.publicConfig.values.gameplay.competition.tables[0];
    a.user.player.position = { ...table.position, z: table.position.z + 2.5 };
    const send = (type, payload, replies = ["competition.state"]) =>
      a.execute(type, payload, replies);
    await send("competition.join", { tableId: table.tableId });
    const lobby = a.competition.lobbies.get(table.tableId);
    assert.equal(lobby.state.participants.length, 4);
    assert.throws(
      () => a.competition.join(a.bots[3], table.tableId, { trusted: true }),
      { code: "SEAT_OCCUPIED" },
    );
    const conditions = () => ({
      tableId: table.tableId,
      lobbyId: lobby.state.lobbyId,
      expectedRevision: lobby.state.revision,
    });
    await send("competition.configure", {
      ...conditions(),
      subject: "mathematics",
      stakeAura: 10,
    });
    await send("competition.ready", { ...conditions(), ready: true });
    await send("competition.start", conditions());
    for (const key of lobby.pack.questions) {
      await send(
        "competition.answer",
        {
          matchId: lobby.state.matchId,
          questionId: lobby.state.round.question.questionId,
          answer: { kind: key.question.kind, value: key.expectedAnswer },
        },
        ["competition.answer.accepted"],
      );
      a.advance(1300);
      a.advance(1);
      a.advance(3001);
    }
    assert.equal(lobby.state.status, "finished");
    assert.equal(lobby.state.settlement.outcome, "winner");
    assert.equal(a.user.wallet.balanceAura, 130);
    assert.equal(a.user.wallet.reservedAura, 0);
    assert.equal(lobby.state.settlement.payouts.length, 4);
  } finally {
    a.close();
  }
});

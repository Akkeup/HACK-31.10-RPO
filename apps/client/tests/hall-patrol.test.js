import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LocalMockAdapter } from "../mock-v2/adapter.js";
import { hubCollisionBoxes, inside } from "../mock-v2/collision.js";

async function setup() {
  const a = new LocalMockAdapter({
    storage: null,
    latency: 0,
    now: () => 1000,
  });
  await a.initialize();
  await a.connect();
  clearInterval(a.interval);
  a.ready = true;
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
  a.interestObjects = chunk.objects;
  return a;
}

test("Sophia and four demo players walk at human speed around shelves, tables and chairs, then stop near the learner", async () => {
  const a = await setup();
  try {
    const motions = [a.guideMotion, ...a.botMotion];
    const walked = motions.map(() => 0);
    const boxes = hubCollisionBoxes(a.interestObjects, true);
    for (let i = 0; i < 2400; i++) {
      const previous = motions.map((m) => ({ ...m.position }));
      a.tick();
      motions.forEach((m, index) => {
        const step = Math.hypot(
          m.position.x - previous[index].x,
          m.position.z - previous[index].z,
        );
        assert.ok(
          step <= 0.055001,
          "no snapshot teleport or faster-than-walking step",
        );
        assert.equal(m.position.y, 0);
        if (index > 0 && step > 0.0001) {
          const facing = a.bots[index - 1].player.yawRad + Math.PI;
          const alignment =
            (Math.sin(facing) * (m.position.x - previous[index].x) +
              Math.cos(facing) * (m.position.z - previous[index].z)) /
            step;
          assert.ok(
            alignment > 0.999,
            "demo players face their walking direction",
          );
        }
        assert.ok(
          !boxes.some((box) => inside(m.position, box)),
          "never enters furniture",
        );
        walked[index] += step;
      });
    }
    assert.ok(
      walked.every((distance) => distance > 8),
      JSON.stringify(walked),
    );
    a.user.player.position = { ...a.guideMotion.position };
    const stopped = { ...a.guideMotion.position };
    for (let i = 0; i < 40; i++) a.tick();
    assert.deepEqual(a.guideMotion.position, stopped);
    await a.talk("npc-guide", "Привет");
  } finally {
    a.close();
  }
});

test("a seated bot stays in its confirmed seat and walks back to a patrol after leaving", async () => {
  const a = await setup();
  try {
    const bot = a.bots[0];
    const table = a.publicConfig.values.gameplay.competition.tables[0];
    a.competition.join(bot, table.tableId, { trusted: true });
    const seated = { ...bot.player.position };
    for (let i = 0; i < 100; i++) a.tick();
    assert.deepEqual(bot.player.position, seated);
    assert.equal(bot.player.activity.mode, "seated_competition");
    a.competition.leave(bot, table.tableId);
    const origin = { ...bot.player.position };
    const boxes = hubCollisionBoxes(a.interestObjects, true);
    let walked = 0;
    for (let i = 0; i < 500; i++) {
      const previous = { ...bot.player.position };
      a.tick();
      const step = Math.hypot(
        bot.player.position.x - previous.x,
        bot.player.position.z - previous.z,
      );
      assert.ok(step <= 0.055001);
      assert.ok(!boxes.some((box) => inside(bot.player.position, box)));
      walked += step;
    }
    assert.ok(
      walked > 4,
      JSON.stringify({ origin, at: bot.player.position, walked }),
    );
  } finally {
    a.close();
  }
});

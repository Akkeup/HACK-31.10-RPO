import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LocalMockAdapter } from "../mock-v2/adapter.js";
import { Game } from "../src/world/game.js";
import { moveWithCollisions } from "../mock-v2/collision.js";

test("all 24 shelf faces open their existing subject through library.open; distant access stays rejected", async () => {
  const a = new LocalMockAdapter({ storage: null, latency: 0 });
  try {
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
    const objects = Game.prototype.readingObjects
      .call({
        locationId: "reading-room-main",
        configs: a.publicConfig.values,
        resources: {
          roots: new Map([
            [
              "hub",
              {
                roots: chunk.objects.map((placement) => ({
                  userData: { placement },
                })),
              },
            ],
          ]),
        },
      })
      .filter((o) => o.kind === "shelf");
    assert.equal(objects.length, 24);
    for (const object of objects) {
      const offset = object.scale / 2 + 0.55;
      a.user.player.position = {
        x: object.position.x + Math.sin(object.yawRad) * offset,
        y: 0,
        z: object.position.z + Math.cos(object.yawRad) * offset,
      };
      const opened = await a.execute(
        "library.open",
        { bookId: object.shelf.bookIds[0] },
        ["library.opened"],
      );
      assert.equal(
        opened.material.module.moduleId,
        object.shelf.bookIds[0].slice(5),
      );
      await a.execute("lesson.close", { lessonId: opened.lessonId }, [
        "activity.changed",
      ]);
    }
    a.user.player.position = { x: 80, y: 0, z: 92 };
    await assert.rejects(
      a.execute("library.open", { bookId: "book-math-basics" }, [
        "library.opened",
      ]),
      { code: "OUT_OF_RANGE" },
    );
  } finally {
    a.close();
  }
});

test("furniture allows escape from restored overlaps and sliding, while preventing entry on every side", () => {
  const boxes = [{ x: 0, z: 0, hx: 1, hz: 1 }];
  for (const sign of [-1, 1]) {
    const overlap = { x: sign * 0.9, y: 0, z: 0 };
    moveWithCollisions(overlap, { ...overlap, x: sign * 0.95 }, boxes);
    assert.equal(overlap.x, sign * 0.95);
    for (const axis of ["x", "z"]) {
      const outside = { x: 0, z: 0, [axis]: sign * 1.1 };
      moveWithCollisions(outside, { ...outside, [axis]: sign * 0.9 }, boxes);
      assert.equal(outside[axis], sign * 1.1);
    }
  }
  const sliding = { x: 1.1, z: 0 };
  moveWithCollisions(sliding, { x: 0.9, z: 0.2 }, boxes);
  assert.deepEqual(sliding, { x: 1.1, z: 0.2 });
});

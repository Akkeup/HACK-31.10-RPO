import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(process.argv[2] || "dist");
const exists = async (path) =>
  access(resolve(root, path)).then(
    () => true,
    () => false,
  );
const mock = await exists("demo-mode.json");
const sw = await readFile(resolve(root, "sw.js"), "utf8");
const assets = JSON.parse(sw.match(/const ASSETS = (\[[^;]+\]);/)[1]);
assert.ok(assets.includes("/index.html"));
for (const path of assets) {
  assert.ok(
    !/^\/(api|world|models|textures|tests|demo)\//.test(path) &&
      !path.startsWith("/assets/models/") &&
      path !== "/demo-mode.json",
    "World/test content in service worker: " + path,
  );
  await access(resolve(root, path === "/" ? "index.html" : path.slice(1)));
}
let code = "";
for (const file of await readdir(resolve(root, "assets")))
  if (file.endsWith(".js"))
    code += await readFile(resolve(root, "assets", file), "utf8");
for (const forbidden of [
  "catalog.server-only.json",
  "Discovery Protocol 1.1.0 / browser checks",
  "NPC cards / PC regression",
  "Live pointer controls regression",
  "terrain-9-9",
  "localhost:11434",
  "/api/v1/",
  "discovery.v1",
  "https://discovery.invalid/protocol/1.1.0/",
  "https://discovery.invalid/protocol/1.0.0/",
])
  assert.ok(
    !code.includes(forbidden),
    "Legacy/private/test content in bundle: " + forbidden,
  );
assert.ok(
  code.includes("discovery.v2") && code.includes("/api/v2/"),
  "Missing v2 transport",
);
if (mock) {
  const marker = JSON.parse(
    await readFile(resolve(root, "demo-mode.json"), "utf8"),
  );
  assert.equal(marker.protocolVersion, "2.0.0");
  assert.equal(marker.productionMultiplayer, false);
  assert.ok(await exists("demo/resources"), "Missing demo resources");
} else {
  assert.ok(!(await exists("demo")), "Demo resources in real build");
  for (const privateText of [
    "discovery-basics",
    "discovery:reading-room:demo:2.0.0:v1",
    "Сложение объединяет количества: два и три дают пять.",
    "Ветвление позволяет выбрать действие в зависимости от условия.",
  ])
    assert.ok(
      !code.includes(privateText),
      "Demo knowledge in real build: " + privateText,
    );
}
console.log(
  `PASS ${mock ? "mock" : "real"}: v2-only wire schemas; shell-only precache; no legacy/QA/full catalog; demo data isolated by build mode.`,
);

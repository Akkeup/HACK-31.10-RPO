import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(process.argv[2] || "dist");
const sw = await readFile(resolve(root, "sw.js"), "utf8");
const assets = JSON.parse(sw.match(/const ASSETS = (\[[^;]+\]);/)[1]);
assert.ok(assets.includes("/index.html"));
for (const path of assets) {
  assert.ok(
    !/^\/(api|world|models|textures|tests)\//.test(path),
    "World/test content in service worker",
  );
  await access(resolve(root, path === "/" ? "index.html" : path.slice(1)));
}
let code = "";
for (const file of await readdir(resolve(root, "assets")))
  if (file.endsWith(".js"))
    code += await readFile(resolve(root, "assets", file), "utf8");
for (const privateText of [
  "catalog.server-only.json",
  "discovery-basics",
  "Discovery Protocol 1.1.0 / browser checks",
  "NPC cards / PC regression",
  "Live pointer controls regression",
  "Сложение объединяет количества: два и три дают пять.",
  "Ветвление позволяет выбрать действие в зависимости от условия.",
  "terrain-9-9",
])
  assert.ok(
    !code.includes(privateText),
    "Private catalog/test content in browser build: " + privateText,
  );
assert.ok(!code.includes("localhost:11434"), "AI internals leaked");
console.log(
  "PASS shell-only precache; all shell files present; no full catalog, private knowledge fixtures or QA code in browser bundle.",
);

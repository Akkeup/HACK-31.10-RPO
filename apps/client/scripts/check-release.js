import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
const run = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
};
// Explicit modes keep a developer's .env.local from publishing a mock build.
run([
  "--test",
  ...(await readdir("tests"))
    .filter((name) => name.endsWith(".test.js"))
    .map((name) => "tests/" + name),
]);
for (const transport of ["real", "mock"]) {
  run(["scripts/build-client.js", transport]);
  run(["tests/verify-bundle.js", transport === "real" ? "dist" : "dist-mock"]);
}

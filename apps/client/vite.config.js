import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  async function configure(server) {
    if (server.watcher)
      server.middlewares.use(async (req, res, next) => {
        const kind = {
          "/__qa/report/browser": "browser",
          "/__qa/report/mobile": "mobile",
          "/__qa/report/education": "education",
          "/__qa/report/controls": "controls",
        }[req.url];
        if (!kind || req.method !== "POST") return next();
        try {
          let body = "";
          for await (const part of req) {
            body += part.toString();
            if (body.length > 16000) throw Error("large report");
          }
          const report = JSON.parse(body);
          await mkdir(resolve("test-results"), { recursive: true });
          await writeFile(
            resolve("test-results", kind + ".json"),
            JSON.stringify(report, null, 2),
          );
          res.statusCode = 204;
          res.end();
        } catch {
          res.statusCode = 400;
          res.end();
        }
      });

    if (env.VITE_TRANSPORT === "real") return;
    const data = JSON.parse(
      await readFile(resolve("mock-v2/published.json"), "utf8"),
    );
    const resources = new Map(
      [...data.interest.chunks, ...data.interest.assets].map((d) => {
        const ext = d.chunkId
          ? "json"
          : d.mediaType === "image/svg+xml"
            ? "svg"
            : "glb";
        return [
          `/demo/resources/${d.sha256}.${ext}`,
          {
            name: d.sha256 + "." + ext,
            type: d.chunkId ? "application/json" : d.mediaType,
          },
        ];
      }),
    );
    server.middlewares.use(async (req, res, next) => {
      const pathname = new URL(req.url, "http://local").pathname;
      const resource = resources.get(pathname);
      if (!resource) return next();
      try {
        const bytes = await readFile(
          resolve("../../assets/world/resources", resource.name),
        );
        res.setHeader("Content-Type", resource.type);
        res.setHeader("Cache-Control", "no-store");
        res.end(bytes);
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
  }

  return {
    publicDir: "public",
    plugins: [
      {
        name: "discovery-mock",
        configureServer: configure,
        configurePreviewServer: configure,
      },
      {
        name: "discovery-offline",
        async generateBundle(_, bundle) {
          if (env.VITE_TRANSPORT !== "real") {
            const data = JSON.parse(
              await readFile(resolve("mock-v2/published.json"), "utf8"),
            );
            for (const d of [
              ...data.interest.chunks,
              ...data.interest.assets,
            ]) {
              const ext = d.chunkId
                ? "json"
                : d.mediaType === "image/svg+xml"
                  ? "svg"
                  : "glb";
              const name = d.sha256 + "." + ext;
              this.emitFile({
                type: "asset",
                fileName: "demo/resources/" + name,
                source: await readFile(
                  resolve("../../assets/world/resources", name),
                ),
              });
            }
            this.emitFile({
              type: "asset",
              fileName: "demo-mode.json",
              source: JSON.stringify({
                protocolVersion: "2.0.0",
                mode: "demo",
                productionMultiplayer: false,
              }),
            });
          }
          const assets = [
            "/",
            "/index.html",
            ...Object.keys(bundle)
              .filter((x) => !x.startsWith("demo/") && x !== "demo-mode.json")
              .map((x) => "/" + x),
          ];
          const source = readFileSync(resolve("scripts/sw-template.js"), "utf8")
            .replace("__ASSETS__", JSON.stringify(assets))
            .replace("__VERSION__", Date.now().toString());
          this.emitFile({ type: "asset", fileName: "sw.js", source });
        },
      },
    ],
    server:
      env.VITE_TRANSPORT === "real" && env.DISCOVERY_BACKEND_URL
        ? {
            proxy: {
              "/api": {
                target: env.DISCOVERY_BACKEND_URL,
                ws: true,
                changeOrigin: false,
              },
            },
          }
        : undefined,
    build: {
      target: "es2022",
      rollupOptions: { output: { manualChunks: { three: ["three"] } } },
    },
  };
});

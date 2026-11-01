import { build } from "vite";
const transport = process.argv[2];
if (!["real", "mock"].includes(transport)) throw Error("Expected real or mock");
process.env.VITE_TRANSPORT = transport;
await build({ build: { outDir: transport === "real" ? "dist" : "dist-mock" } });

// Runs corrections-validate.mjs against a REAL-library server (so it can load the
// already-saved Chaîne idée→IMP). Isolated port; real library/ is only read + a
// throwaway test brick that the validator creates and deletes itself.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_C_PORT"] ?? "3202";
const BASE = `http://localhost:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready(ms = 25000) { const dl = Date.now() + ms; while (Date.now() < dl) { try { const r = await fetch(`${BASE}/api/library`); if (r.ok) return true; } catch {} await wait(200); } return false; }
const server = spawn(process.execPath, ["demo-server.ts"], { cwd: __dirname, env: { ...process.env, PORT }, stdio: ["ignore", "pipe", "pipe"] });
let err = ""; server.stderr.on("data", (d) => (err += d)); server.stdout.on("data", () => {});
let code = 1;
try {
  if (!(await ready())) throw new Error("server not ready\n" + err);
  const r = spawnSync(process.execPath, ["corrections-validate.mjs"], { cwd: __dirname, env: { ...process.env, BASE }, encoding: "utf-8", timeout: 180000, stdio: "inherit" });
  code = r.status ?? 1;
} finally { server.kill(); await wait(600); }
process.exit(code);

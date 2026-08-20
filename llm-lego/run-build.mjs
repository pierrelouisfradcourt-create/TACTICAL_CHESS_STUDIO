// run-build.mjs — orchestrates the mouse-built construction against the REAL library/.
//
// Unlike run-validators.mjs (which isolates onto library-test/), this passe DELIBERATELY
// targets the real library/: the Profil LM brick and the Chaîne idée→IMP must PERSIST
// there. It also needs the 12 autopilot bricks present in library/ so the import panel
// can attach the real prompts/oracle. Server runs on an isolated PORT so it doesn't
// collide with a dev server.
import { spawn, spawnSync } from "node:child_process";
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_BUILD_PORT"] ?? "3200";
const BASE = `http://localhost:${PORT}`;
const REAL_LIB = path.join(__dirname, "library");
const snapshot = () => existsSync(REAL_LIB) ? readdirSync(REAL_LIB).filter((f) => f.endsWith(".json")).sort() : [];

async function waitReady(ms = 25000) {
  const dl = Date.now() + ms;
  while (Date.now() < dl) {
    try { const r = await fetch(`${BASE}/api/library`); if (r.ok) { const j = await r.json(); if (j && j.isTestLibrary === false) return true; } } catch {}
    await new Promise((res) => setTimeout(res, 200));
  }
  return false;
}

const before = snapshot();
console.log(`Real library/ before construction: ${before.length} bricks`);

// REAL library (no LEGO_LIBRARY_DIR) so the new bricks persist where they belong.
const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname, env: { ...process.env, PORT }, stdio: ["ignore", "pipe", "pipe"],
});
let serverErr = ""; server.stderr.on("data", (d) => (serverErr += d.toString())); server.stdout.on("data", () => {});

let buildExit = 1;
try {
  if (!(await waitReady())) throw new Error(`server not ready on ${BASE}\n${serverErr}`);
  console.log(`Real-library server ready on ${BASE}\n`);
  const r = spawnSync(process.execPath, ["build-idea-pipeline.mjs"], {
    cwd: __dirname, env: { ...process.env, BASE }, encoding: "utf-8", timeout: 180000, stdio: "inherit",
  });
  buildExit = r.status ?? 1;
} finally {
  server.kill();
  await new Promise((res) => setTimeout(res, 800));
}

const after = snapshot();
const added = after.filter((f) => !before.includes(f));
const removed = before.filter((f) => !after.includes(f));
const summary = {
  when: new Date().toISOString(), port: PORT, buildExit,
  before: before.length, after: after.length, added, removed,
  autopilotIntact: before.filter((f) => f.startsWith("autopilot-")).every((f) => after.includes(f)),
};
writeFileSync(path.join(__dirname, "build_run_result.json"), JSON.stringify(summary, null, 2), "utf-8");
console.log(`\nReal library/ after: ${after.length} bricks  (+${added.length} added, -${removed.length} removed)`);
console.log(`Added: ${added.join(", ") || "none"}`);
console.log(`Removed: ${removed.join(", ") || "none"}`);
console.log(`Autopilot bricks intact: ${summary.autopilotIntact ? "✅" : "❌"}`);
console.log(`Build script exit: ${buildExit}`);
process.exit(buildExit);

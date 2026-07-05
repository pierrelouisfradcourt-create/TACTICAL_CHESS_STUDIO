// memory-recall-validate.mjs — preuve fail-soft brique 2, serveur+racines temp, embed URL mort.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_RECALL_PORT"] ?? "3119";
const BASE = `http://localhost:${PORT}`;
const brain = mkdtempSync(path.join(tmpdir(), "rv-brain-"));
const facts = mkdtempSync(path.join(tmpdir(), "rv-facts-"));
writeFileSync(path.join(brain, "chess.md"), "# Chess engine\n\nRocky ELO.", "utf-8");
writeFileSync(path.join(facts, "belote.md"), "# Belote\n\nlabo.", "utf-8");

let pass = 0, fail = 0;
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };
const j = (p) => fetch(BASE + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// embed URL mort → force le fail-soft ; racines temp → n'écrit rien de réel.
const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname,
  env: { ...process.env, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, TCS_EMBED_URL: "http://127.0.0.1:59999", PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
let done = false;
function finish(code) { if (done) return; done = true; try { rmSync(brain, { recursive: true, force: true }); } catch {} try { rmSync(facts, { recursive: true, force: true }); } catch {} process.exit(code); }
function shutdown(code) {
  if (server.exitCode !== null || server.signalCode !== null) return finish(code);
  server.once("exit", () => finish(code));
  try { if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" }); else server.kill(); } catch { return finish(code); }
  setTimeout(() => finish(code), 3000);
}

let exitCode = 0;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE + "/api/memory"); if (r.ok) { ready = true; break; } } catch {} await new Promise((r) => setTimeout(r, 250)); }
  if (!ready) throw new Error(`serveur pas prêt sur ${BASE}`);

  const kw = await j("/api/memory/search?q=elo");
  check("keyword (défaut) → mode keyword", kw.status === 200 && kw.body.mode === "keyword");
  const sem = await j("/api/memory/search?q=elo&mode=semantic");
  check("semantic + embed mort → keyword-fallback", sem.status === 200 && sem.body.mode === "keyword-fallback" && !!sem.body.degraded);
  check("fallback renvoie quand même des hits (jamais cassé)", Array.isArray(sem.body.hits));

  console.log(`\n  memory-recall-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);

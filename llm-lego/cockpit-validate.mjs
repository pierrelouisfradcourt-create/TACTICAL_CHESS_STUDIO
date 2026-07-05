// cockpit-validate.mjs — preuve brique 4b, serveur + ledger temp + racines temp.
// Anti-mensonge DYNAMIQUE : total+skipped == comptage indépendant des lignes "- id: IMP-".
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_COCKPIT_PORT"] ?? "3121";
const BASE = `http://localhost:${PORT}`;
const wdir = mkdtempSync(path.join(tmpdir(), "cv-"));
const brain = mkdtempSync(path.join(tmpdir(), "cvb-"));
const facts = mkdtempSync(path.join(tmpdir(), "cvf-"));
const ledger = path.join(wdir, "LEDGER.yaml");
const LEDGER_TEXT = [
  "- id: IMP-001", "  title: A", "  status: CLOSED", "  lane: SAFE_AUTO",
  "- id: IMP-002", "  title: B", "  status: OPEN", "  lane: AUDIT_REQUIRED",
  "- id: IMP-003", "  title: malformé sans status", "  lane: SAFE_AUTO",
].join("\n");
writeFileSync(ledger, LEDGER_TEXT, "utf-8");
writeFileSync(path.join(facts, "n.md"), "# N\n\nx.", "utf-8");
const ID_LINES = LEDGER_TEXT.split("\n").filter((l) => /^- id:\s*IMP-/.test(l)).length; // comptage indépendant

let pass = 0, fail = 0;
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };
const j = (p) => fetch(BASE + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname, env: { ...process.env, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, TCS_LEDGER_PATH: ledger, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
let done = false;
function finish(code) { if (done) return; done = true; for (const d of [wdir, brain, facts]) { try { rmSync(d, { recursive: true, force: true }); } catch {} } process.exit(code); }
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
  if (!ready) throw new Error(`serveur pas pret sur ${BASE}`);

  const c = await j("/api/cockpit");
  check("cockpit 200 + forme {ledger,byLane,openImps,recentNotes}", c.status === 200 && c.body.ledger && c.body.byLane && Array.isArray(c.body.openImps) && Array.isArray(c.body.recentNotes));
  check("agrégats : total=2 closed=1 open=1", c.body.ledger.total === 2 && c.body.ledger.closed === 1 && c.body.ledger.open === 1);
  check("bloc malformé → skipped=1", c.body.ledger.skipped === 1);
  // ANTI-MENSONGE dynamique : total + skipped == comptage indépendant des lignes "- id: IMP-"
  check(`anti-mensonge : total+skipped (${c.body.ledger.total + c.body.ledger.skipped}) == lignes IMP (${ID_LINES})`, c.body.ledger.total + c.body.ledger.skipped === ID_LINES);
  check("byLane dynamique (AUDIT_REQUIRED présent, seulement les lanes vues)", !!c.body.byLane.AUDIT_REQUIRED && !c.body.byLane.HUMAN_REQUIRED);

  console.log(`\n  cockpit-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);

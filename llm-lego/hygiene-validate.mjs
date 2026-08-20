// hygiene-validate.mjs — preuve du capteur d'hygiène (endpoint /api/hygiene + fonction pure).
// Anti-mensonge : total Rust affiché == Σ byCode ; rapport absent/corrompu → available=false
// (jamais un panneau qui ment) ; l'endpoint sert bien la sortie de buildHygieneBoard.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHygieneBoard } from "./hygiene-board.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_HYGIENE_PORT"] ?? "3123";
const BASE = `http://localhost:${PORT}`;
const wdir = mkdtempSync(path.join(tmpdir(), "hy-"));
const facts = mkdtempSync(path.join(tmpdir(), "hyf-"));
const goodReport = path.join(wdir, "hygiene_report.json");
const badReport = path.join(wdir, "corrupt.json");
const missingReport = path.join(wdir, "does_not_exist.json");

// Corpus temp : rust total (6) == Σ byCode (4+2) ; todo avec topFiles + samples.
const GOOD = {
  generated: "2026-01-01T00:00:00Z", trigger: "test", writesLedger: false,
  sources: { rust: "cargo …", todo: "git ls-files …" },
  rust: { available: true, total: 6, byCode: { dead_code: 4, unused_imports: 2 },
    topFiles: [{ file: "src/a.rs", n: 4 }, { file: "src/b.rs", n: 2 }],
    samples: [{ file: "src/a.rs", line: 10, code: "dead_code", message: "function `foo` is never used" }] },
  todo: { gitOk: true, orphans: 3, filesScanned: 100,
    topFiles: [{ file: "x.py", n: 2 }, { file: "y.sh", n: 1 }],
    samples: [{ file: "x.py", line: 5, text: "# TODO real one" }] },
};
// Rapport MENTEUR : total 99 mais byCode ne somme qu'à 6 → l'invariant doit le détecter.
const LIAR = { ...GOOD, rust: { ...GOOD.rust, total: 99 } };
writeFileSync(goodReport, JSON.stringify(GOOD), "utf-8");
writeFileSync(badReport, "{ not json", "utf-8");
writeFileSync(path.join(facts, "n.md"), "# N\n\nx.", "utf-8");

let pass = 0, fail = 0;
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };
const j = (p) => fetch(BASE + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// --- 1. Fonction pure (pas de serveur) : cas absent / corrompu / bon / menteur ------------
const vMissing = buildHygieneBoard({ reportPath: missingReport });
check("rapport absent → available=false + raison (pas de panneau qui ment)", vMissing.available === false && !!vMissing.reason);
const vCorrupt = buildHygieneBoard({ reportPath: badReport });
check("rapport corrompu → available=false + raison", vCorrupt.available === false && !!vCorrupt.reason);
const vGood = buildHygieneBoard({ reportPath: goodReport });
check("rapport valide → available=true + forme rust/todo/integrity", vGood.available === true && !!vGood.rust && !!vGood.todo && !!vGood.integrity);
check("anti-mensonge : total Rust (6) == Σ byCode (4+2)", vGood.integrity.rustTotalMatchesByCode === true && vGood.integrity.rustByCodeSum === 6);
check("writesLedger === false (le capteur ne crée jamais d'IMP)", vGood.writesLedger === false);
const vLiar = buildHygieneBoard({ reportPath: (() => { writeFileSync(path.join(wdir, "liar.json"), JSON.stringify(LIAR), "utf-8"); return path.join(wdir, "liar.json"); })() });
check("anti-mensonge DÉTECTE le mensonge : total 99 ≠ Σ byCode 6 → flag false", vLiar.integrity.rustTotalMatchesByCode === false);

// --- 2. Endpoint HTTP : le serveur sert bien la sortie de buildHygieneBoard ---------------
const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname, env: { ...process.env, TCS_MEMORY_DIR: facts, TCS_HYGIENE_REPORT: goodReport, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
let done = false;
function finish(code) { if (done) return; done = true; for (const d of [wdir, facts]) { try { rmSync(d, { recursive: true, force: true }); } catch {} } process.exit(code); }
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

  const c = await j("/api/hygiene");
  check("hygiene 200 + available=true", c.status === 200 && c.body.available === true);
  check("endpoint : rust.total=6 + byCode servis", c.body.rust && c.body.rust.total === 6 && c.body.rust.byCode.dead_code === 4);
  check("endpoint : todo.orphans=3 + samples servis", c.body.todo && c.body.todo.orphans === 3 && c.body.todo.samples.length === 1);
  check("endpoint : integrity.rustTotalMatchesByCode=true", c.body.integrity && c.body.integrity.rustTotalMatchesByCode === true);

  console.log(`\n  hygiene-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);

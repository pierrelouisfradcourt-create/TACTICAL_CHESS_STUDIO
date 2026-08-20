// impboard-validate.mjs — preuve du board IMP (endpoint /api/imp-board), serveur + ledger temp.
// Anti-mensonge : (Σ cartes affichées) == nonClosed, et (total+skipped) == comptage indépendant "- id: IMP-".
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_IMPBOARD_PORT"] ?? "3122";
const BASE = `http://localhost:${PORT}`;
const wdir = mkdtempSync(path.join(tmpdir(), "iv-"));
const brain = mkdtempSync(path.join(tmpdir(), "ivb-"));
const facts = mkdtempSync(path.join(tmpdir(), "ivf-"));
const ledger = path.join(wdir, "LEDGER.yaml");
// Corpus temp : croise project / lane / statut / blocage / notes multi-lignes / malformé.
const LEDGER_TEXT = [
  "- id: IMP-001", "  title: A", "  status: OPEN", "  lane: SAFE_AUTO", "  project: factory", "  theme: infra", "  blocked_by: []",
  "- id: IMP-002", "  title: B", "  status: OPEN", "  lane: AUDIT_REQUIRED", "  project: factory", "  theme: gouvernance", "  blocked_by:", "  - IMP-001",
  "- id: IMP-003", "  title: C", "  status: OPEN", "  lane: HUMAN_REQUIRED", "  project: rocky", "  theme: moteur", "  blocked_by: []",
  "- id: IMP-004", "  title: D closed", "  status: CLOSED", "  lane: SAFE_AUTO", "  project: factory", "  theme: infra", "  blocked_by: []",
  "- id: IMP-005", "  title: E", "  status: OPEN", "  lane: AUDIT_REQUIRED", "  project: chess_tcg", "  theme: gameplay", "  blocked_by: []", "  notes: 'ligne un", "    suite de la note'",
  "- id: IMP-007", "  title: G gelé", "  status: FROZEN", "  lane: HUMAN_REQUIRED", "  project: rocky", "  theme: moteur", "  blocked_by: []",
  "- id: IMP-006", "  title: malformé sans status", "  lane: SAFE_AUTO", "  project: factory",
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

  const c = await j("/api/imp-board");
  check("imp-board 200 + forme {lanes,projects,counts}", c.status === 200 && Array.isArray(c.body.lanes) && Array.isArray(c.body.projects) && c.body.counts);
  const b = c.body;
  const allCards = b.projects.flatMap((p) => b.lanes.flatMap((ln) => p.lanes[ln] || []));

  check("counts : total=6 nonClosed=5 skipped=1", b.counts.total === 6 && b.counts.nonClosed === 5 && b.counts.skipped === 1);
  // ANTI-MENSONGE 1 : le parser a vu tous les blocs → total+skipped == lignes "- id: IMP-"
  check(`anti-mensonge parser : total+skipped (${b.counts.total + b.counts.skipped}) == lignes IMP (${ID_LINES})`, b.counts.total + b.counts.skipped === ID_LINES);
  // ANTI-MENSONGE 2 : ce qui est AFFICHÉ (Σ cartes) == ce qui est ANNONCÉ (nonClosed)
  check(`anti-mensonge affichage : Σ cartes (${allCards.length}) == nonClosed (${b.counts.nonClosed})`, allCards.length === b.counts.nonClosed);
  check("CLOSED exclu du board (IMP-004 absent)", !allCards.some((x) => x.id === "IMP-004"));

  // SÉMANTIQUE déployable = OPEN + non bloqué (robuste, pas de nombre figé fragile aux statuts futurs)
  check(`compteur deployable (${b.counts.deployable}) == flags cartes (${allCards.filter((c) => c.deployable).length})`, b.counts.deployable === allCards.filter((c) => c.deployable).length);
  check("invariant : tout déployable est OPEN ET non bloqué", allCards.filter((c) => c.deployable).every((c) => c.status === "OPEN" && c.blocked_by.length === 0));
  const c7 = allCards.find((x) => x.id === "IMP-007");
  check("FROZEN non bloqué → NON déployable (IMP-007, blocked_by vide mais statut≠OPEN)", !!c7 && c7.blocked_by.length === 0 && c7.status === "FROZEN" && c7.deployable === false);

  const order = b.projects.map((p) => p.project);
  check(`ordre projets factory→rocky→chess_tcg (${order.join(",")})`, JSON.stringify(order) === JSON.stringify(["factory", "rocky", "chess_tcg"]));

  const c2 = allCards.find((x) => x.id === "IMP-002");
  check("blocked_by liste-bloc parsé (IMP-002 → [IMP-001]) + non déployable", !!c2 && JSON.stringify(c2.blocked_by) === JSON.stringify(["IMP-001"]) && c2.deployable === false);
  const c1 = allCards.find((x) => x.id === "IMP-001");
  check("blocked_by [] → déployable (IMP-001)", !!c1 && c1.deployable === true);
  const c5 = allCards.find((x) => x.id === "IMP-005");
  check("notes multi-lignes recollées + dé-quotées (IMP-005)", !!c5 && c5.notes === "ligne un suite de la note");
  // groupement project × lane
  const fac = b.projects.find((p) => p.project === "factory");
  check("groupement : factory a SAFE_AUTO(1)+AUDIT_REQUIRED(1)", !!fac && (fac.lanes.SAFE_AUTO || []).length === 1 && (fac.lanes.AUDIT_REQUIRED || []).length === 1);
  check("why dérivé présent + mentionne le bloqueur (IMP-002)", !!c2 && /IMP-001/.test(c2.why));

  // Phase 2 — capteur strategic_feedback (déterministe, lecture seule)
  check("feedback présent sur chaque carte (observation/risk/recommendation/impact)",
    allCards.every((c) => c.feedback && c.feedback.observation && c.feedback.risk && Array.isArray(c.feedback.impact)));
  check("arête inverse : IMP-001.feedback.impact == [IMP-002] (IMP-002 dépend de IMP-001)",
    !!c1 && JSON.stringify(c1.feedback.impact) === JSON.stringify(["IMP-002"]));
  check("IMP-002 (bloqué) : impact vide + risk ≥ medium + reasons mentionne le bloqueur",
    !!c2 && c2.feedback.impact.length === 0 && c2.feedback.risk.score >= 1 && /IMP-001/.test(c2.feedback.risk.reasons.join(" ")));
  check("reasons jamais vide (toujours explicites)", allCards.every((c) => c.feedback.risk.reasons.length > 0));

  console.log(`\n  impboard-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);

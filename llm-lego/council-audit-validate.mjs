// council-audit-validate.mjs — preuve UI du bouton « Auditer via council » sur le board Accueil.
//
// Playwright + page.route (hermétique, AUCUN LLM requis) : on intercepte /api/imp-board (board
// contrôlé : 1 carte AUDIT_REQUIRED + 1 SAFE_AUTO), /api/cockpit (stub), et /api/execute (sorties
// de voix canned). On prouve :
//   - bouton présent SEULEMENT sur AUDIT_REQUIRED (contrainte : audit ciblé) ;
//   - confirmation OBLIGATOIRE avant tout POST /api/execute (contrainte #1) ;
//   - RÈGLE DÉTERMINISTE de synthèse (APPROUVE / BLOQUE l'emporte / mixte→ESCALADE / sans token→ESCALADE) ;
//   - AJOUT #2 : une voix indisponible → « audit partiel », JAMAIS de verdict sur 2/3 ;
//   - le board ne POSTe QUE /api/execute (aucune écriture ledger / gate-log — contrainte #2).
// NB : ceci NE teste PAS le mode live réel (Qwen :1234) — c'est le test manuel séparé. Ici on prouve
// le câblage UI + la règle, de façon déterministe en CI.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

// --- Fixtures ---------------------------------------------------------------
const cardA = { id: "IMP-A2", title: "Carte audit", project: "factory", theme: "gouvernance",
  lane: "AUDIT_REQUIRED", status: "OPEN", blocked_by: [], deployable: true, why: "audit requis", notes: "note test" };
const cardS = { id: "IMP-S1", title: "Carte safe", project: "factory", theme: "infra",
  lane: "SAFE_AUTO", status: "OPEN", blocked_by: [], deployable: true, why: "safe", notes: "" };
const BOARD = {
  lanes: ["SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED"],
  projects: [{ project: "factory", lanes: { SAFE_AUTO: [cardS], AUDIT_REQUIRED: [cardA] }, total: 2, deployable: 2 }],
  counts: { total: 2, nonClosed: 2, deployable: 2, skipped: 0 },
};
const COCKPIT = { ledger: { total: 2, closed: 0, open: 2, skipped: 0 }, byLane: {}, openImps: [], recentNotes: [] };

// voix ok / indisponible → forme réelle renvoyée par l'adaptateur agent (output/text | unavailable)
const okVoice = (id, text) => [id, { type: "agent", agent: id, model: "qwen", output: text, text }];
const downVoice = (id) => [id, { type: "agent", unavailable: true, text: "[lm-studio indisponible] LM Studio unreachable" }];
const execFrom = (entries) => JSON.stringify({ state: { nodes: Object.fromEntries(entries) }, trace: [], status: "ok" });

let execResponse = execFrom([okVoice("PLAN_REVIEW", "ok APPROUVE"), okVoice("RED_TEAM", "ok APPROUVE"), okVoice("DIVERGENCE", "ok APPROUVE")]);
let execCount = 0;
const postUrls = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("request", (r) => { if (r.method() === "POST") postUrls.push(r.url()); });

// Interceptions AVANT navigation (home-view fetch au montage).
await page.route("**/api/imp-board", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BOARD) }));
await page.route("**/api/cockpit", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(COCKPIT) }));
await page.route("**/api/execute", (route) => { execCount++; route.fulfill({ status: 200, contentType: "application/json", body: execResponse }); });

async function openCard(id) { await page.click(`[data-testid="impboard-card-${id}"]`); await page.waitForSelector('[data-testid="impboard-detail"]'); }
async function closeDetail() { await page.click('[data-testid="impboard-detail-close"]'); await page.waitForSelector('[data-testid="impboard-detail"]', { state: "detached" }); }

// Ouvre la carte AUDIT, confirme, lance, renvoie le résultat rendu. Reset execCount/response par appel.
async function audit(response) {
  execResponse = response; execCount = 0;
  await openCard("IMP-A2");
  await page.waitForSelector('[data-testid="council-audit-btn"]');
  await page.click('[data-testid="council-audit-btn"]');
  await page.waitForSelector('[data-testid="council-audit-confirm"]');
  const beforeGo = execCount; // DOIT être 0 : rien lancé avant confirmation
  await page.click('[data-testid="council-audit-go"]');
  await page.waitForSelector('[data-testid="council-audit-verdict"], [data-testid="council-audit-error"]', { timeout: 15000 });
  const verdict = await page.locator('[data-testid="council-audit-verdict-value"]').textContent().catch(() => null);
  const detail = await page.locator('[data-testid="council-audit-verdict"]').textContent().catch(() => "");
  const errVisible = await page.locator('[data-testid="council-audit-error"]').isVisible().catch(() => false);
  const errText = errVisible ? await page.locator('[data-testid="council-audit-error"]').textContent().catch(() => "") : "";
  await closeDetail();
  return { verdict, detail, errVisible, errText, beforeGo, execCount };
}

let exitCode = 0;
try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-home"]', { timeout: 20000 });
  await page.click('[data-testid="tab-home"]');
  await page.waitForSelector('[data-testid="home-view"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="impboard-card-IMP-A2"]', { timeout: 10000 });

  // 1. Bouton présent sur AUDIT_REQUIRED
  await openCard("IMP-A2");
  check("bouton « Auditer via council » présent sur AUDIT_REQUIRED", await page.locator('[data-testid="council-audit-btn"]').isVisible());
  check("label honnête présent (déterministe + Qwen :1234)", /règle déterministe/.test(await page.locator('[data-testid="impboard-detail"]').textContent()));
  await closeDetail();

  // 2. Bouton ABSENT sur SAFE_AUTO
  await openCard("IMP-S1");
  check("bouton ABSENT sur SAFE_AUTO", (await page.locator('[data-testid="council-audit-btn"]').count()) === 0);
  await closeDetail();

  // 3. Confirmation avant tout POST + un seul appel ; règle 3×APPROUVE → APPROUVE
  const s1 = await audit(execFrom([okVoice("PLAN_REVIEW", "ok APPROUVE"), okVoice("RED_TEAM", "ok APPROUVE"), okVoice("DIVERGENCE", "ok APPROUVE")]));
  check("contrainte #1 : 0 POST /api/execute avant confirmation", s1.beforeGo === 0);
  check("un seul POST /api/execute par audit", s1.execCount === 1);
  check("règle : 3×APPROUVE → APPROUVE", (s1.verdict || "").trim() === "APPROUVE");

  // 4. Un BLOQUE l'emporte
  const s2 = await audit(execFrom([okVoice("PLAN_REVIEW", "ok APPROUVE"), okVoice("RED_TEAM", "risque BLOQUE"), okVoice("DIVERGENCE", "ESCALADE possible")]));
  check("règle : un BLOQUE l'emporte → BLOQUE", (s2.verdict || "").trim() === "BLOQUE");

  // 5. Mixte sans BLOQUE → ESCALADE
  const s3 = await audit(execFrom([okVoice("PLAN_REVIEW", "ok APPROUVE"), okVoice("RED_TEAM", "ESCALADE"), okVoice("DIVERGENCE", "DIVERGENCE")]));
  check("règle : mixte sans BLOQUE → ESCALADE", (s3.verdict || "").trim() === "ESCALADE");

  // 6. Voix sans token reconnu → ESCALADE, marqué explicitement (jamais supposition silencieuse)
  const s4 = await audit(execFrom([okVoice("PLAN_REVIEW", "ok APPROUVE"), okVoice("RED_TEAM", "ok APPROUVE"), okVoice("DIVERGENCE", "rien de clair ici")]));
  check("règle : voix sans token → ESCALADE", (s4.verdict || "").trim() === "ESCALADE");
  check("voix sans token marquée « aucun token trouvé »", /aucun token trouvé/.test(s4.detail));

  // 6bis. Anti-auto-référence : verdict réel APPROUVE puis mention TARDIVE du nom de rôle « DIVERGENCE ».
  // AVANT le fix (last-token nu) → capterait DIVERGENCE → ESCALADE (faux). APRÈS (ancre VERDICT:) → APPROUVE.
  const s6 = await audit(execFrom([okVoice("PLAN_REVIEW", "VERDICT: APPROUVE"), okVoice("RED_TEAM", "VERDICT: APPROUVE"),
    okVoice("DIVERGENCE", "VERDICT: APPROUVE.\nNote: je suis la voix DIVERGENCE du council.")]));
  check("parse ancré sur ligne VERDICT: (ignore l'auto-référence tardive au rôle) → APPROUVE", (s6.verdict || "").trim() === "APPROUVE");

  // 7. AJOUT #2 : une voix indisponible → audit partiel, JAMAIS de verdict sur 2/3
  const s5 = await audit(execFrom([okVoice("PLAN_REVIEW", "ok APPROUVE"), downVoice("RED_TEAM"), okVoice("DIVERGENCE", "ok APPROUVE")]));
  check("AJOUT #2 : voix indisponible → « audit partiel » affiché", s5.errVisible && /audit partiel/i.test(s5.errText));
  check("AJOUT #2 : AUCUN verdict rendu sur 2/3 voix", s5.verdict === null);

  // 8. Contrainte #2 : le board ne POSTe QUE /api/execute (aucune écriture)
  check(`board ne poste QUE /api/execute (${postUrls.length} POST)`, postUrls.length > 0 && postUrls.every((u) => u.includes("/api/execute")));

  const green = Object.values(out.checks).every(Boolean);
  out.pass = green;
  log(`\n  council-audit-validate: ${green ? `✅ ${Object.keys(out.checks).length}/${Object.keys(out.checks).length} PASS` : `❌ FAIL (${out.failed})`}`);
  if (consoleErrors.length) log(`  (console errors: ${consoleErrors.length})`);
  exitCode = green ? 0 : 1;
} catch (e) {
  check(`exception: ${String((e && e.message) || e)}`, false);
  exitCode = 1;
} finally {
  writeFileSync(path.join(__dirname, "council_audit_validation_result.json"), JSON.stringify(out, null, 2), "utf-8");
  await browser.close();
  process.exit(exitCode);
}

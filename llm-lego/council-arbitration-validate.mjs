// council-arbitration-validate.mjs — preuve UI de l'« Arbitrage multi-objectifs (council) ».
//
// Playwright + page.route (hermétique, AUCUN LLM). On intercepte /api/imp-board (1 carte AUDIT_REQUIRED
// + 1 SAFE_AUTO), /api/cockpit (stub), /api/execute (4 stances objectives canned). On prouve :
//   - bouton présent SEULEMENT sur AUDIT_REQUIRED, séparé de council-audit ;
//   - confirmation OBLIGATOIRE avant tout POST /api/execute ;
//   - RÈGLE DÉTERMINISTE : consensus favorable → RECOMMANDE · consensus défavorable → DECONSEILLE ·
//     tension → CONFLIT (+ axes) · stance non lue → CONFLIT (marquée, jamais NEUTRE silencieux) ;
//   - une voix indisponible → « arbitrage partiel », pas de reco ;
//   - le board ne POSTe QUE /api/execute (aucune écriture ledger/gate-log).
// NE teste PAS le live réel (Qwen) — c'est le test manuel séparé. Ici : câblage UI + règle, déterministe.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

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
const OBJ = ["COUT", "QUALITE", "VITESSE", "ARCHITECTURE"];

const okObj = (id, text) => [id, { type: "agent", agent: id, model: "qwen", output: text, text }];
const downObj = (id) => [id, { type: "agent", unavailable: true, text: "[lm-studio indisponible] LM Studio unreachable" }];
// texts = { COUT:'…STANCE: FAVORABLE', … } ; les ids absents → non fournis (mais on fournit toujours les 4).
const execFrom = (entries) => JSON.stringify({ state: { nodes: Object.fromEntries(entries) }, trace: [], status: "ok" });
const allStance = (map) => execFrom(OBJ.map((id) => (map[id] === "DOWN" ? downObj(id) : okObj(id, map[id]))));

let execResponse = allStance({ COUT: "STANCE: NEUTRE", QUALITE: "STANCE: NEUTRE", VITESSE: "STANCE: NEUTRE", ARCHITECTURE: "STANCE: NEUTRE" });
let execCount = 0;
const postUrls = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("request", (r) => { if (r.method() === "POST") postUrls.push(r.url()); });

await page.route("**/api/imp-board", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BOARD) }));
await page.route("**/api/cockpit", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(COCKPIT) }));
await page.route("**/api/execute", (route) => { execCount++; route.fulfill({ status: 200, contentType: "application/json", body: execResponse }); });
await page.route("**/api/council-verdict-log", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })); // Phase 4 — capture verdict (non gouverne)

async function openCard(id) { await page.click(`[data-testid="impboard-card-${id}"]`); await page.waitForSelector('[data-testid="impboard-detail"]'); }
async function closeDetail() { await page.click('[data-testid="impboard-detail-close"]'); await page.waitForSelector('[data-testid="impboard-detail"]', { state: "detached" }); }

async function arbitrate(response) {
  execResponse = response; execCount = 0;
  await openCard("IMP-A2");
  await page.waitForSelector('[data-testid="council-arb-btn"]');
  await page.click('[data-testid="council-arb-btn"]');
  await page.waitForSelector('[data-testid="council-arb-confirm"]');
  const beforeGo = execCount; // DOIT être 0
  await page.click('[data-testid="council-arb-go"]');
  await page.waitForSelector('[data-testid="council-arb-result"], [data-testid="council-arb-error"]', { timeout: 15000 });
  const reco = await page.locator('[data-testid="council-arb-reco"]').textContent().catch(() => null);
  const result = await page.locator('[data-testid="council-arb-result"]').textContent().catch(() => "");
  const errVis = await page.locator('[data-testid="council-arb-error"]').isVisible().catch(() => false);
  const errText = errVis ? await page.locator('[data-testid="council-arb-error"]').textContent().catch(() => "") : "";
  await closeDetail();
  return { reco, result, errVis, errText, beforeGo, execCount };
}

let exitCode = 0;
try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-home"]', { timeout: 20000 });
  await page.click('[data-testid="tab-home"]');
  await page.waitForSelector('[data-testid="home-view"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="impboard-card-IMP-A2"]', { timeout: 10000 });

  // 1. Bouton présent AUDIT_REQUIRED (+ council-audit toujours là = 2 boutons distincts), absent SAFE_AUTO.
  await openCard("IMP-A2");
  check("bouton « Arbitrage multi-objectifs » présent sur AUDIT_REQUIRED", await page.locator('[data-testid="council-arb-btn"]').isVisible());
  check("council-audit intact (2 boutons distincts sur la carte)", await page.locator('[data-testid="council-audit-btn"]').isVisible());
  check("label honnête (déterministe consensus/conflit)", /consensus\/conflit/.test(await page.locator('[data-testid="impboard-detail"]').textContent()));
  await closeDetail();
  await openCard("IMP-S1");
  check("bouton arbitrage ABSENT sur SAFE_AUTO", (await page.locator('[data-testid="council-arb-btn"]').count()) === 0);
  await closeDetail();

  // 2. Confirmation avant POST + un seul appel ; consensus favorable → RECOMMANDE.
  const s1 = await arbitrate(allStance({ COUT: "ok STANCE: FAVORABLE", QUALITE: "ok STANCE: FAVORABLE", VITESSE: "ok STANCE: FAVORABLE", ARCHITECTURE: "ok STANCE: FAVORABLE" }));
  check("0 POST /api/execute avant confirmation", s1.beforeGo === 0);
  check("un seul POST /api/execute par arbitrage", s1.execCount === 1);
  check("règle : 4×FAVORABLE → RECOMMANDE", (s1.reco || "").includes("RECOMMANDE"));

  // 3. Consensus défavorable → DECONSEILLE.
  const s2 = await arbitrate(allStance({ COUT: "STANCE: DEFAVORABLE", QUALITE: "STANCE: DEFAVORABLE", VITESSE: "STANCE: NEUTRE", ARCHITECTURE: "STANCE: DEFAVORABLE" }));
  check("règle : défavorable(+neutre) sans favorable → DECONSEILLE", (s2.reco || "").includes("DECONSEILLE"));

  // 4. Tension favorable×défavorable → CONFLIT + axes en tension nommés.
  const s3 = await arbitrate(allStance({ COUT: "STANCE: FAVORABLE", QUALITE: "STANCE: DEFAVORABLE", VITESSE: "STANCE: NEUTRE", ARCHITECTURE: "STANCE: FAVORABLE" }));
  check("règle : tension FAV×DEF → CONFLIT", (s3.reco || "").includes("CONFLIT"));
  check("CONFLIT nomme les axes (favorables COUT/ARCHITECTURE, défavorable QUALITE)", /COUT/.test(s3.result) && /QUALITE/.test(s3.result) && /ARCHITECTURE/.test(s3.result));

  // 5. Stance non lue → CONFLIT (marquée « non lue »), jamais NEUTRE silencieux.
  const s4 = await arbitrate(allStance({ COUT: "STANCE: FAVORABLE", QUALITE: "STANCE: FAVORABLE", VITESSE: "STANCE: FAVORABLE", ARCHITECTURE: "rien de clair, pas de token ici" }));
  check("règle : une stance non lue → CONFLIT (pas de consensus supposé)", (s4.reco || "").includes("CONFLIT"));
  check("stance non lue marquée explicitement", /non lue/.test(s4.result));

  // 6. Une voix indisponible → arbitrage partiel, PAS de reco.
  const s5 = await arbitrate(allStance({ COUT: "STANCE: FAVORABLE", QUALITE: "DOWN", VITESSE: "STANCE: FAVORABLE", ARCHITECTURE: "STANCE: FAVORABLE" }));
  check("voix indisponible → « arbitrage partiel » affiché", s5.errVis && /arbitrage partiel/i.test(s5.errText));
  check("AUCUNE reco sur 3/4 objectifs", s5.reco === null);

  // 7. Le board ne POSTe QUE /api/execute (aucune écriture gouvernée).
  check(`board ne poste QUE /api/execute + verdict-log (${postUrls.length} POST)`, postUrls.length > 0 && postUrls.every((u) => u.includes("/api/execute") || u.includes("/api/council-verdict-log")));

  const green = Object.values(out.checks).every(Boolean);
  out.pass = green;
  log(`\n  council-arbitration-validate: ${green ? `✅ ${Object.keys(out.checks).length}/${Object.keys(out.checks).length} PASS` : `❌ FAIL (${out.failed})`}`);
  if (consoleErrors.length) log(`  (console errors: ${consoleErrors.length})`);
  exitCode = green ? 0 : 1;
} catch (e) {
  check(`exception: ${String((e && e.message) || e)}`, false);
  exitCode = 1;
} finally {
  writeFileSync(path.join(__dirname, "council_arbitration_validation_result.json"), JSON.stringify(out, null, 2), "utf-8");
  await browser.close();
  process.exit(exitCode);
}

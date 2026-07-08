// telemetry-read-validate.mjs — Phase 3.5 : (A) readLastVerdicts filtre/ordonne/limite (fichier temp) ;
// (B) GET /api/council-verdict-last : 400 param invalide + available:false si aucun verdict (wiring, no LLM) ;
// (C) le board ré-affiche "Dernier audit" sur TOUTES lanes (carte SAFE_AUTO) + "Préparer session" copie le prompt.
// Déterministe, aucun appel LLM.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

let pass = 0, fail = 0; const check = (n, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${n}`); };

// (A) readLastVerdicts — fichier temp. TCS_TELEMETRY_DIR AVANT les imports (write+read partagent TELEMETRY_DIR).
const TEL = mkdtempSync(path.join(tmpdir(), "vread-"));
process.env["TCS_TELEMETRY_DIR"] = TEL;
const { appendVerdict } = await import("./telemetry.mjs");
const { readLastVerdicts } = await import("./telemetry-read.mjs");
appendVerdict({ feature: "council-audit", imp: "IMP-R1", verdict: "APPROUVE", voices: [] });
appendVerdict({ feature: "arbitration",  imp: "IMP-R2", verdict: "RECOMMANDE", voices: [] });
appendVerdict({ feature: "council-audit", imp: "IMP-R1", verdict: "ESCALADE", voices: [] }); // plus récent pour R1
check("filtre par imp + prend le plus récent", (() => { const r = readLastVerdicts("IMP-R1", 1);
  return r.length === 1 && r[0].verdict === "ESCALADE" && r[0].feature === "council-audit"; })());
check("n=2 → 2 verdicts de R1, plus récent d'abord", (() => { const r = readLastVerdicts("IMP-R1", 2);
  return r.length === 2 && r[0].verdict === "ESCALADE" && r[1].verdict === "APPROUVE"; })());
check("imp inconnu → []", readLastVerdicts("IMP-NOPE", 1).length === 0);
check("imp vide → []", readLastVerdicts("", 1).length === 0);
try { rmSync(TEL, { recursive: true, force: true }); } catch {}

// (B) endpoint wiring — BASE (serveur isolé). Ne dépend d'aucune donnée réelle précise.
const BASE = process.env["BASE"] ?? "http://localhost:3000";
try {
  const bad = await fetch(`${BASE}/api/council-verdict-last?imp=../etc`);
  check("param invalide → 400", bad.status === 400);
  const none = await fetch(`${BASE}/api/council-verdict-last?imp=IMP-ZZ99999`);
  const nj = await none.json();
  check("aucun verdict → 200 available:false", none.status === 200 && nj && nj.available === false && nj.imp === "IMP-ZZ99999");
} catch (e) { check(`endpoint exception: ${String((e && e.message) || e)}`, false); }

// (C) le board — ré-affichage TOUTES lanes + copie. Carte SAFE_AUTO (≠ AUDIT_REQUIRED) → prouve adj #2.
const cardS = { id: "IMP-S9", title: "Carte hors audit", project: "factory", theme: "x", lane: "SAFE_AUTO", status: "OPEN", blocked_by: [], deployable: true, why: "w", notes: "note-ctx" };
const BOARD = { lanes: ["SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED"], projects: [{ project: "factory", lanes: { SAFE_AUTO: [cardS] }, total: 1, deployable: 1 }], counts: { total: 1, nonClosed: 1, deployable: 1, skipped: 0 } };
const CANNED = { ts: "2026-07-08T10:37:00.000Z", feature: "council-audit", imp: "IMP-S9", verdict: "CONFLIT", voices: [] };
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  await page.route("**/api/imp-board", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BOARD) }));
  await page.route("**/api/cockpit", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ledger: {}, byLane: {}, openImps: [], recentNotes: [] }) }));
  await page.route("**/api/hygiene", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ available: false }) }));
  await page.route("**/api/knowledge**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ available: false }) }));
  await page.route("**/api/council-verdict-last**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ imp: "IMP-S9", available: true, verdict: CANNED }) }));
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="tab-home"]', { timeout: 20000 });
  await page.click('[data-testid="tab-home"]');
  await page.waitForSelector('[data-testid="impboard-card-IMP-S9"]', { timeout: 10000 });
  await page.click('[data-testid="impboard-card-IMP-S9"]');
  await page.waitForSelector('[data-testid="council-last-verdict"]', { timeout: 8000 });
  const lv = await page.textContent('[data-testid="council-last-verdict"]');
  check("Dernier audit affiché sur lane SAFE_AUTO (toutes lanes)", !!lv && lv.includes("CONFLIT") && lv.includes("council-audit"));
  check("aucun bouton 'Auditer via council' sur SAFE_AUTO (ligne découplée du bloc audit)", (await page.locator('[data-testid="council-audit-btn"]').count()) === 0);
  await page.click('[data-testid="prep-session-btn"]');
  await page.waitForSelector('[data-testid="prep-session-copied"]', { timeout: 5000 });
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("Préparer session copie le prompt (contexte IMP + dernier verdict)",
    !!clip && clip.includes("IMP-S9") && clip.includes("note-ctx") && clip.includes("CONFLIT") && clip.includes("gate humaine"));
} catch (e) { check(`ui exception: ${String((e && e.message) || e)}`, false); }
finally { await browser.close(); }

console.log(`\n  telemetry-read-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
process.exit(fail === 0 ? 0 : 1);

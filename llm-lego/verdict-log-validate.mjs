// verdict-log-validate.mjs — Phase 4 v0 : (A) appendVerdict écrit le bon record (fichier temp) ;
// (B) le board POST /api/council-verdict-log avec le bon body après un arbitrage. Déterministe, no LLM.
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

let pass = 0, fail = 0; const check = (n, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${n}`); };

// (A) appendVerdict — fichier temp. On fixe TCS_TELEMETRY_DIR AVANT l'import dynamique de telemetry.mjs.
const TEL = mkdtempSync(path.join(tmpdir(), "verd-"));
process.env["TCS_TELEMETRY_DIR"] = TEL;
const { appendVerdict, VERDICTS_FILE } = await import("./telemetry.mjs");
const n1 = appendVerdict({ feature: "arbitration", imp: "IMP-206", verdict: "CONFLIT",
  voices: [{ id: "COUT", stance: "DEFAVORABLE", parsed: true }], conflict: { favs: ["QUALITE"], defs: ["COUT"], unparsed: [] } });
const n2 = appendVerdict({ feature: "council-audit", imp: "IMP-X", voices: [] }); // pas de verdict → skip
check("appendVerdict : 1 avec verdict, 0 sans verdict", n1 === 1 && n2 === 0);
const lines = existsSync(VERDICTS_FILE) ? readFileSync(VERDICTS_FILE, "utf-8").trim().split("\n").filter(Boolean) : [];
check("1 seule ligne écrite (le skip n'écrit rien)", lines.length === 1);
const rec = lines.length ? JSON.parse(lines[0]) : {};
check("record complet (ts/feature/imp/verdict/voices/conflict)",
  !!rec.ts && rec.feature === "arbitration" && rec.imp === "IMP-206" && rec.verdict === "CONFLIT" &&
  Array.isArray(rec.voices) && rec.voices[0] && rec.voices[0].id === "COUT" && rec.conflict && rec.conflict.favs[0] === "QUALITE");
try { rmSync(TEL, { recursive: true, force: true }); } catch {}

// (B) le board POST le verdict — Playwright + interception (canned execute → CONFLIT).
const BASE = process.env["BASE"] ?? "http://localhost:3000";
const cardA = { id: "IMP-A2", title: "Carte audit", project: "factory", theme: "gouvernance", lane: "AUDIT_REQUIRED", status: "OPEN", blocked_by: [], deployable: true, why: "audit", notes: "" };
const BOARD = { lanes: ["SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED"], projects: [{ project: "factory", lanes: { AUDIT_REQUIRED: [cardA] }, total: 1, deployable: 1 }], counts: { total: 1, nonClosed: 1, deployable: 1, skipped: 0 } };
const OBJ = ["COUT", "QUALITE", "VITESSE", "ARCHITECTURE"];
const stanceOf = (id) => id === "QUALITE" ? "STANCE: FAVORABLE" : "STANCE: DEFAVORABLE"; // mixte → CONFLIT
const execBody = JSON.stringify({ state: { nodes: Object.fromEntries(OBJ.map((id) => [id, { type: "agent", model: "qwen", output: stanceOf(id), text: stanceOf(id) }])) }, trace: [], status: "ok" });
let posted = null;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.route("**/api/imp-board", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BOARD) }));
  await page.route("**/api/cockpit", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ledger: {}, byLane: {}, openImps: [], recentNotes: [] }) }));
  await page.route("**/api/execute", (r) => r.fulfill({ status: 200, contentType: "application/json", body: execBody }));
  await page.route("**/api/council-verdict-log", (r) => { try { posted = JSON.parse(r.request().postData() || "{}"); } catch {} r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="tab-home"]', { timeout: 20000 });
  await page.click('[data-testid="tab-home"]');
  await page.waitForSelector('[data-testid="impboard-card-IMP-A2"]', { timeout: 10000 });
  await page.click('[data-testid="impboard-card-IMP-A2"]');
  await page.waitForSelector('[data-testid="council-arb-btn"]');
  await page.click('[data-testid="council-arb-btn"]');
  await page.waitForSelector('[data-testid="council-arb-go"]');
  await page.click('[data-testid="council-arb-go"]');
  await page.waitForSelector('[data-testid="council-arb-result"]', { timeout: 15000 });
  await page.waitForTimeout(400); // laisse le POST fire-and-forget partir
  check("board POST /api/council-verdict-log apres arbitrage", !!posted);
  check("body correct (feature=arbitration, imp=IMP-A2, verdict=CONFLIT, 4 voix)",
    !!posted && posted.feature === "arbitration" && posted.imp === "IMP-A2" && posted.verdict === "CONFLIT" && Array.isArray(posted.voices) && posted.voices.length === 4);
} catch (e) { check(`exception: ${String((e && e.message) || e)}`, false); }
finally { await browser.close(); }

console.log(`\n  verdict-log-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
process.exit(fail === 0 ? 0 : 1);

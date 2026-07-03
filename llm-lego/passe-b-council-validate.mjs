// Passe B — Council ⊂ Chaîne : "Sauver comme chaîne" pour un sous-graphe Council posé
// depuis la palette. Prouve : capture fidèle (rôles/params ROLE_PRESETS, positions,
// edge de boucle), catégorie « council » pré-remplie, badge honnête (real gate v1 /
// target vision), et rechargement fidèle depuis la Bibliothèque.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { assertTestLibrary } from "./_test-guard.mjs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const createdIds = [];
// Pose a Council subgraph from the PALETTE (add-council → council-gate|council-looped),
// then save it as a chain through the modal. Returns the saved brick summary.
async function poseAndSave(paletteTestId, name) {
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-council").click();
  await page.getByTestId(paletteTestId).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).some((n) => n.type === "agent" && n.data?.role), null, { timeout: 4000 });
  await page.getByTestId("btn-save-chain").click();
  await page.waitForSelector('[data-testid="chain-save-modal"]', { timeout: 4000 });
  const councilHint = await page.$('[data-testid="chain-council-detected"]');
  const catVal = await page.getByTestId("chain-category").inputValue();
  await page.getByTestId("chain-name").fill(name);
  await page.getByTestId("chain-save-submit").click();
  await page.waitForFunction((n) => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("« " + n + " » sauvegardée"), name, { timeout: 6000 });
  const b = (await api("/api/library")).json.bricks.find((x) => x.name === name);
  if (b) createdIds.push(b.id);
  return { brick: b, hintPresent: !!councilHint, catVal };
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-council"]', { timeout: 20000 });
  assertTestLibrary((await api("/api/library")).json, "library");

  // ── 1) Council GATE v1 : pose palette → save ────────────────────────────────
  const gate = await poseAndSave("council-gate", "Council Gate v1 E2E");
  check("gate: sous-graphe Council détecté (hint affiché)", gate.hintPresent);
  check("gate: catégorie pré-remplie « council »", gate.catVal === "council");
  const gdoc = gate.brick ? (await api("/api/library/" + gate.brick.id)).json : null;
  check("gate: brique kind=chain", gdoc?.kind === "chain");
  check("gate: badge honnête = 'real' (gate v1 pur)", gdoc?.badge === "real");
  check("gate: payload.category = 'council'", gdoc?.payload?.category === "council");
  const groles = (gdoc?.payload?.nodes || []).filter((n) => n.type === "agent").map((n) => n.data?.role).sort();
  check("gate: 3 rôles v1 capturés (PLAN_REVIEW/RED_TEAM/DIVERGENCE)", JSON.stringify(groles) === JSON.stringify(["DIVERGENCE", "PLAN_REVIEW", "RED_TEAM"]));
  const redteam = (gdoc?.payload?.nodes || []).find((n) => n.data?.role === "RED_TEAM");
  check("gate: params ROLE_PRESETS préservés (RED_TEAM model qwen2.5-14b + temp 0.2)", /qwen2\.5-14b/.test(redteam?.data?.model || "") && redteam?.data?.temperature === 0.2);
  check("gate: positions (x,y) préservées", (gdoc?.payload?.nodes || []).every((n) => typeof n.x === "number" && typeof n.y === "number"));

  // reload gate v1 from library → canvas reproduces roles + positions
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-chain-" + gate.brick.id).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).filter((n) => n.type === "agent").length === 3, null, { timeout: 5000 });
  const reloadedGate = await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").map((n) => ({ role: n.data.role, x: n.x, y: n.y })));
  check("gate: rechargement fidèle (3 agents, rôles v1 → badges 'réel' dérivés)", reloadedGate.length === 3 && reloadedGate.every((n) => ["PLAN_REVIEW", "RED_TEAM", "DIVERGENCE"].includes(n.role)));

  // ── 2) Council LOOPED (vision) : pose palette → save ────────────────────────
  const looped = await poseAndSave("council-looped", "Council Looped E2E");
  check("looped: catégorie pré-remplie « council »", looped.catVal === "council");
  const ldoc = looped.brick ? (await api("/api/library/" + looped.brick.id)).json : null;
  check("looped: badge honnête = 'target' (vision non implémentée)", ldoc?.badge === "target");
  check("looped: payload.category = 'council'", ldoc?.payload?.category === "council");
  check("looped: 6 nœuds agent capturés", (ldoc?.payload?.nodes || []).filter((n) => n.type === "agent").length === 6);
  const loopEdge = (ldoc?.payload?.edges || []).find((ed) => ed.loop === true);
  check("looped: edge de BOUCLE préservé (loop:true, maxIterations:5, condition NOK)", !!loopEdge && loopEdge.maxIterations === 5 && loopEdge.condition === "NOK");
  const reviewer = (ldoc?.payload?.nodes || []).find((n) => n.data?.role === "claude-reviewer");
  check("looped: okAfter du reviewer préservé (boucle déterministe)", reviewer?.data?.okAfter === 2);

  // reload looped → loop edge reproduced on canvas
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-chain-" + looped.brick.id).click();
  await page.waitForFunction(() => (window.__ui?.edges || []).some((e) => e.loop === true), null, { timeout: 5000 });
  const reloadedLoop = await page.evaluate(() => { const e = window.__ui.edges.find((x) => x.loop === true); return e ? { max: e.maxIterations, cond: e.condition } : null; });
  check("looped: rechargement fidèle (boucle reproduite max=5, NOK)", reloadedLoop?.max === 5 && reloadedLoop?.cond === "NOK");

  // ── 3) Filtre/tri F1 : catégorie 'council' isole (via recherche texte) ──────
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("chain");
  await page.getByTestId("lib-search").fill("Council");
  await page.waitForTimeout(200);
  const councilRows = await page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.length);
  check("F1: recherche « Council » isole les chaînes Council (>=2)", councilRows >= 2);

  check("aucune erreur console pendant la passe", consoleErrors.length === 0);
  if (consoleErrors.length) log("console errors: " + consoleErrors.slice(0, 3).join(" | "));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL PASSE-B COUNCIL CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  try { assertTestLibrary((await api("/api/library")).json, "library"); for (const id of createdIds) await api("/api/library/" + id, { method: "DELETE" }); } catch {}
  writeFileSync("passe_b_council_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

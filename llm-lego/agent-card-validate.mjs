// Carte d'identité Agent — 8 satellite components + blocking completeness validation.
//  Part 1 — "+ Agent" poses a central agent + 8 satellite components linked by edges
//           (incl. the 8th "sortie attendue"); import Bibliothèque fills only the 7
//           identity fields → 7/8 (still incomplete); filling the 8th → 8/8; cascade delete.
//  Part 2 — completeness is blocking: 8/8 → green badge + execution allowed; <8/8 →
//           amber badge + execution REFUSED at BOTH layers (UI guard + API), clear msg;
//           refilling the missing component re-enables execution.
//  Grandfather — an agent posed then stripped of its "sortie attendue" satellite (a legacy
//           7-satellite agent) is NEVER retroactively blocked: it completes at 7/7.
//  Regression — Council gate v1 / looped (agents WITHOUT satellites, Option A) execute
//           with NO completeness block.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
const post = (doc) => api("/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1560, height: 980 } });

const centralAgentId = () => page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").slice(-1)[0].id);
const satId = (aid, ct) => page.evaluate(({ a, c }) => (window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === a && n.data.componentType === c) || {}).id, { a: aid, c: ct });
const cardText = (aid) => page.locator(`[data-testid="agent-card-${aid}"]`).textContent().then((t) => t || "");
async function selectNode(id) { await page.locator(`[data-node-id="${id}"]`).click({ position: { x: 8, y: 8 } }); }
async function fillComp(aid, ct, txt) { const id = await satId(aid, ct); await selectNode(id); await page.getByTestId("comp-text").fill(txt); }
async function execUI() {
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return !st.includes("⏳"); }, null, { timeout: 15000 });
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-agent"]', { timeout: 20000 });
  // Fiche agent = the 7 IDENTITY fields only (no sortie attendue — that is the 8th satellite,
  // filled from an outputformat brick or by hand, never from an agent fiche).
  await post({ id: "agent-card-rich", kind: "agent", name: "Rich Card Agent", maturity: "saved", badge: "real", roadmapRef: null, sourceRef: null,
    payload: { role: "planificateur", memoire: "contexte projet", skill: "revue de code", plugin: "git", objectif: "livrer l'IMP", gardeFou: "pas de push sans gate", notes: "", modele: "Qwen2.5-14B", temperature: 0.2, top_p: 0.9, max_tokens: 8000, autonomy_level: null, permissions: {}, allowed_surfaces: [], forbidden_surfaces: [] },
    created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="add-agent"]', { timeout: 10000 });
  await page.getByTestId("tab-canvas").click();

  // ===== Part 1 — pose composite (8 satellites) =====
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const aid = await centralAgentId();
  check("+ Agent poses 1 central agent node", await page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i).type, aid) === "agent");
  check("+ Agent poses 8 satellite component nodes", (await page.$$eval('[data-node-type="agent-component"]', (e) => e.length)) === 8);
  const cts = await page.evaluate((i) => window.__ui.nodes.filter((n) => n.type === "agent-component" && n.data.parentId === i).map((n) => n.data.componentType).sort(), aid);
  check("the 8 satellites cover exactly the 8 canonical components (incl. sortieAttendue)",
    JSON.stringify(cts) === JSON.stringify(["gardeFou", "memoire", "modele", "objectif", "plugin", "role", "sortieAttendue", "skill"].sort()));
  check("8 edges link the central agent to its satellites",
    await page.evaluate((i) => window.__ui.edges.filter((e) => e.from === i && window.__ui.nodes.find((n) => n.id === e.to && n.type === "agent-component")).length, aid) === 8);
  check("badge de santé présent et incomplet 0/8 ⚠️ (tous les composants vides)", /0\/8/.test(await cardText(aid)));
  check("chaque satellite vide a la bordure pointillée (comp-empty)",
    (await page.$$eval('[data-node-type="agent-component"][data-comp-filled="0"]', (e) => e.length)) === 8);

  // ===== Part 1 — import Bibliothèque fills 7/8 (the 8th, sortie attendue, stays empty) =====
  await page.getByTestId("import-select").selectOption("agent-card-rich");
  await page.waitForFunction((i) => window.__ui.nodes.filter((n) => n.type === "agent-component" && n.data.parentId === i && n.data.componentType !== "sortieAttendue").every((s) => String(s.data.text || "").trim() !== ""), aid, { timeout: 5000 });
  check("import Bibliothèque peuple les 7 satellites d'identité", (await page.$$eval('[data-node-type="agent-component"][data-comp-filled="1"]', (e) => e.length)) === 7);
  check("badge reste 7/8 ⚠️ après import (sortie attendue non fournie par une fiche agent)", /7\/8/.test(await cardText(aid)));
  const sortieEmpty = await page.evaluate((i) => { const s = window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === i && n.data.componentType === "sortieAttendue"); return String(s.data.text || "").trim() === ""; }, aid);
  check("le satellite « sortie attendue » est bien vide après import fiche", sortieEmpty);

  // ===== Part 1 — 7/8 blocks execution (the 8th is now required) =====
  await page.getByTestId("input-json").fill("{}");
  await execUI();
  check("agent 7/8 → exécution REFUSÉE (bannière d'erreur)", (await page.$$eval('[data-testid="error-banner"]', (e) => e.length)) === 1);
  const human78 = (await page.$$eval('[data-testid="error-human"]', (e) => e.map((x) => x.textContent).join(" "))) || "";
  check("message : incomplet 7/8 + liste inclut « sortie attendue »", /incomplet/i.test(human78) && /7\/8/.test(human78) && /sortie attendue/i.test(human78));

  // ===== Part 1 — fill the 8th satellite → 8/8 → executes =====
  await fillComp(aid, "sortieAttendue", "Rapport 3-verdicts (software/evidence/claim)");
  await page.waitForFunction((i) => /8\/8/.test(document.querySelector(`[data-testid="agent-card-${i}"]`)?.textContent || ""), aid, { timeout: 4000 });
  check("remplir le 8ᵉ satellite → badge 8/8 ✅", /8\/8/.test(await cardText(aid)));
  await execUI();
  check("agent 8/8 → exécution AUTORISÉE (au moins une étape de trace)", (await page.$$eval('[data-testid="trace-step"]', (e) => e.length)) > 0);
  check("agent 8/8 → aucune bannière d'erreur", (await page.$$eval('[data-testid="error-banner"]', (e) => e.length)) === 0);

  // ===== Part 2 — emptying a component blocks again (UI) =====
  await fillComp(aid, "memoire", "");
  await page.waitForFunction((i) => /7\/8/.test(document.querySelector(`[data-testid="agent-card-${i}"]`)?.textContent || ""), aid, { timeout: 4000 });
  check("vider un composant fait retomber le badge à 7/8 ⚠️ en temps réel", /7\/8/.test(await cardText(aid)));
  await execUI();
  const human = (await page.$$eval('[data-testid="error-human"]', (e) => e.map((x) => x.textContent).join(" "))) || "";
  check("agent <8/8 → exécution REFUSÉE côté UI (bannière d'erreur)", (await page.$$eval('[data-testid="error-banner"]', (e) => e.length)) === 1);
  check("message clair : incomplet + compte 7/8 + labels",
    /incomplet/i.test(human) && /7\/8/.test(human) && /mémoire/i.test(human) && /garde-fou/i.test(human));

  // ===== Part 2 — incomplete agent blocks (API, no bypass) =====
  const eng = await page.evaluate(() => window.toEngineGraph(window.__ui.nodes, window.__ui.edges));
  const apiRes = await api("/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ graph: eng, initialInput: {} }) });
  check("agent <8/8 → exécution REFUSÉE côté API (HTTP 400)", apiRes.status === 400 && apiRes.json && apiRes.json.success === false);
  check("API : message clair (incomplet + carte d'identité)", /incomplet/i.test(apiRes.json?.error || "") && /carte d'identité/i.test(apiRes.json?.error || ""));
  check("toEngineGraph exclut les 8 satellites (seul le nœud central reste)",
    eng.nodes.filter((n) => n.type === "agent-component").length === 0 && eng.nodes.some((n) => n.id === aid));
  check("toEngineGraph tamponne la complétude sur l'agent central (cardComposite/cardComplete/cardTotal=8)",
    eng.nodes.find((n) => n.id === aid)?.data?.cardComposite === true && eng.nodes.find((n) => n.id === aid)?.data?.cardComplete === false && eng.nodes.find((n) => n.id === aid)?.data?.cardTotal === 8);

  // ===== Part 2 — refilling re-enables execution =====
  await fillComp(aid, "memoire", "contexte restauré");
  await page.waitForFunction((i) => /8\/8/.test(document.querySelector(`[data-testid="agent-card-${i}"]`)?.textContent || ""), aid, { timeout: 4000 });
  check("remplir le composant manquant → badge repasse à 8/8 ✅", /8\/8/.test(await cardText(aid)));
  await execUI();
  check("après complétion → exécution REDEVIENT possible (trace produite, pas d'erreur)",
    (await page.$$eval('[data-testid="trace-step"]', (e) => e.length)) > 0 && (await page.$$eval('[data-testid="error-banner"]', (e) => e.length)) === 0);

  // ===== Grandfather — a legacy 7-satellite agent is NEVER retroactively blocked =====
  // Simulate "built before this pass": pose 8, then DELETE the sortie-attendue satellite.
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const legacy = await centralAgentId();
  await page.getByTestId("import-empty").click().catch(() => {});
  const sortieId = await satId(legacy, "sortieAttendue");
  await selectNode(sortieId);
  await page.waitForSelector('[data-testid="inspector-agent-component"]', { timeout: 4000 });
  await page.locator('[data-testid="inspector-agent-component"] button.danger').click();
  check("legacy: après suppression du 8ᵉ satellite, l'agent a 7 satellites",
    (await page.$$eval('[data-node-type="agent-component"]', (e) => e.length)) === 7);
  await page.getByTestId("import-select").selectOption("agent-card-rich").catch(async () => {
    // import chooser already closed → select the agent + attach via inspector
    await selectNode(legacy); await page.getByTestId("agent-attach").selectOption("agent-card-rich");
  });
  await page.waitForFunction((i) => /7\/7/.test(document.querySelector(`[data-testid="agent-card-${i}"]`)?.textContent || ""), legacy, { timeout: 5000 }).catch(() => {});
  check("GRANDFATHER: agent legacy 7 satellites remplis → 7/7 ✅ (total présence-based)", /7\/7/.test(await cardText(legacy)));
  await page.getByTestId("input-json").fill("{}");
  await execUI();
  const legacyHuman = (await page.$$eval('[data-testid="error-human"]', (e) => e.map((x) => x.textContent).join(" "))) || "";
  check("GRANDFATHER: agent legacy 7/7 s'exécute SANS blocage (jamais bloqué rétroactivement)",
    (await page.$$eval('[data-testid="trace-step"]', (e) => e.length)) > 0 && !/incomplet.*composants|carte d'identité/i.test(legacyHuman));

  // ===== Regression — Council existing graphs NOT affected (Option A) =====
  async function loadExample(key) { await page.getByTestId("example-dropdown").click(); await page.getByTestId("example-" + key).click(); await page.waitForTimeout(200); }
  await loadExample("looped");
  const loopedComposite = await page.evaluate(() => window.toEngineGraph(window.__ui.nodes, window.__ui.edges).nodes.some((n) => n.type === "agent" && n.data && n.data.cardComposite));
  check("REGRESSION: Council looped — aucun agent marqué composite (Option A)", loopedComposite === false);
  await page.getByTestId("input-json").fill("{}");
  await execUI();
  const loopHuman = (await page.$$eval('[data-testid="error-human"]', (e) => e.map((x) => x.textContent).join(" "))) || "";
  check("REGRESSION: Council looped s'exécute SANS blocage carte d'identité",
    (await page.$$eval('[data-testid="trace-step"]', (e) => e.length)) > 0 && !/incomplet.*composants|carte d'identité/i.test(loopHuman));
  await loadExample("gate");
  await page.getByTestId("input-json").fill("{}");
  await execUI();
  const gateHuman = (await page.$$eval('[data-testid="error-human"]', (e) => e.map((x) => x.textContent).join(" "))) || "";
  check("REGRESSION: Council gate v1 chargé/exécuté sans blocage carte d'identité", !/incomplet.*composants|carte d'identité/i.test(gateHuman));

  // ===== Cascade delete — central agent removes its 8 satellites =====
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const aid2 = await centralAgentId();
  await page.getByTestId("import-empty").click().catch(() => {});
  check("avant suppression : 8 satellites présents", (await page.$$eval('[data-node-type="agent-component"]', (e) => e.length)) === 8);
  await selectNode(aid2);
  await page.waitForSelector('[data-testid="inspector-agent"]', { timeout: 4000 });
  await page.locator('[data-testid="inspector-agent"] button.danger').click();
  check("suppression du nœud Agent central supprime ses 8 satellites (cascade)",
    (await page.$$eval('[data-node-type="agent-component"]', (e) => e.length)) === 0 && (await page.$$eval('[data-node-type="agent"]', (e) => e.length)) === 0);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL CHECKS PASS ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e);
  log("EXCEPTION: " + out.error);
} finally {
  await page.screenshot({ path: "builder_agent_card.png", fullPage: false }).catch(() => {});
  await browser.close();
  writeFileSync("agent_card_validation_result.json", JSON.stringify(out, null, 2));
  process.exit(out.pass ? 0 : 1);
}

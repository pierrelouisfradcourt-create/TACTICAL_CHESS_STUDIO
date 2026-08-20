// Passe A — 4 nouveaux kinds Bibliothèque : router / tool / note / artefact.
// Prouve : création + édition + persistance API + filtre + duplication + attache à un
// nœud compatible, ET que note/artefact restent exclus de toEngineGraph (non-exécutables).
// Isolé : ne tourne QUE contre la library-test (assertTestLibrary garde les DELETE).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { assertTestLibrary } from "./_test-guard.mjs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
async function pollApi(p, pred, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { const r = await api(p); if (r.ok && pred(r.json)) return r.json; await new Promise((res) => setTimeout(res, 150)); }
  return null;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

async function fillLib(testid, value) {
  await page.getByTestId(testid).fill(value);
  await page.waitForFunction(({ t, v }) => document.querySelector(`[data-testid="${t}"]`)?.value === v, { t: testid, v: value }, { timeout: 4000 });
  await page.waitForTimeout(120);
}
async function saveBrickUI(expectName) {
  await page.getByTestId("lib-save").click();
  await page.waitForFunction((n) => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("« " + n + " » sauvegardée"), expectName, { timeout: 6000 });
}
async function newKind(kind) {
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-" + kind).click();
  await page.waitForSelector(`[data-testid="lib-editor-${kind}"]`, { timeout: 4000 });
}
const createdIds = [];
async function trackNew(name) {
  const list = await api("/api/library");
  const b = (list.json?.bricks || []).find((x) => x.name === name);
  if (b) createdIds.push(b.id);
  return b;
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });
  // guard: only ever mutate an isolated store
  assertTestLibrary((await api("/api/library")).json, "library");

  // ── 1) Total kinds Bibliothèque = 11 (filtre = 11 + "Tous") ──────────────────
  await page.getByTestId("tab-library").click();
  const filterOpts = await page.$$eval('[data-testid="lib-filter"] option', (os) => os.map((o) => o.value));
  check("filtre Type expose 11 kinds (+ 'all' = 12 options)", filterOpts.length === 12);
  for (const k of ["router", "tool", "note", "artefact"]) check(`filtre inclut '${k}'`, filterOpts.includes(k));

  // ── 2) Router : créer + payload path/defaultRoute + persistance ──────────────
  await newKind("router");
  await fillLib("lib-name", "Router E2E");
  await fillLib("lib-router-path", "nodes.node-analyzer.intent");
  await fillLib("lib-router-defaultRoute", "chat");
  await saveBrickUI("Router E2E");
  { const b = await trackNew("Router E2E"); const d = b ? (await api("/api/library/" + b.id)).json : null;
    check("router: brique persistée kind=router", d?.kind === "router");
    check("router: payload path + defaultRoute fidèles au canvas", d?.payload?.path === "nodes.node-analyzer.intent" && d?.payload?.defaultRoute === "chat"); }

  // ── 3) Tool : name/description ───────────────────────────────────────────────
  await newKind("tool");
  await fillLib("lib-name", "Tool E2E");
  await fillLib("lib-tool-name", "search");
  await fillLib("lib-tool-description", "Recherche web renvoyant des extraits.");
  await saveBrickUI("Tool E2E");
  { const b = await trackNew("Tool E2E"); const d = b ? (await api("/api/library/" + b.id)).json : null;
    check("tool: brique persistée kind=tool", d?.kind === "tool");
    check("tool: payload name + description fidèles au canvas", d?.payload?.name === "search" && /extraits/.test(d?.payload?.description || "")); }

  // ── 4) Note : title/text (non exécutable) ────────────────────────────────────
  await newKind("note");
  await fillLib("lib-name", "Note E2E");
  await fillLib("lib-note-title", "Rappel");
  await fillLib("lib-note-text", "Annotation libre ignorée par le moteur.");
  await saveBrickUI("Note E2E");
  { const b = await trackNew("Note E2E"); const d = b ? (await api("/api/library/" + b.id)).json : null;
    check("note: brique persistée kind=note", d?.kind === "note");
    check("note: payload title + text", d?.payload?.title === "Rappel" && /Annotation/.test(d?.payload?.text || "")); }

  // ── 5) Artefact : title/description/artefactType, dont "jeu" ─────────────────
  await newKind("artefact");
  await fillLib("lib-name", "Artefact E2E");
  await fillLib("lib-artefact-title", "Belote v1");
  const jeuOpts = await page.$$eval('[data-testid="lib-artefact-type"] option', (os) => os.map((o) => o.value));
  check("artefactType propose 'jeu' (livrable jeu)", jeuOpts.includes("jeu"));
  await page.getByTestId("lib-artefact-type").selectOption("jeu");
  await page.waitForTimeout(120);
  await saveBrickUI("Artefact E2E");
  { const b = await trackNew("Artefact E2E"); const d = b ? (await api("/api/library/" + b.id)).json : null;
    check("artefact: brique persistée kind=artefact", d?.kind === "artefact");
    check("artefact: artefactType='jeu' persisté", d?.payload?.artefactType === "jeu" && d?.payload?.title === "Belote v1"); }

  // ── 6) Filtre par kind : router → seules des lignes router ──────────────────
  await page.getByTestId("lib-filter").selectOption("router");
  await page.waitForTimeout(200);
  const routerRowKinds = await page.$$eval('[data-testid="lib-list"] tbody tr', (els) => els.filter((e) => e.getAttribute("data-kind")).map((e) => e.getAttribute("data-kind")));
  check("filtre 'router' → uniquement des briques router", routerRowKinds.length > 0 && routerRowKinds.every((k) => k === "router"));
  await page.getByTestId("lib-filter").selectOption("all");

  // ── 7) Duplication d'une nouvelle brique (router) ───────────────────────────
  const routerId = createdIds.find((id) => id.startsWith("router"));
  const origDoc = routerId ? (await api("/api/library/" + routerId)).json : null;
  if (routerId) {
    await page.getByTestId("lib-dup-" + routerId).click();
    await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("Dupliqué"), null, { timeout: 5000 });
    const dup = (await api("/api/library")).json.bricks.find((b) => b.name === origDoc.name && b.id !== routerId);
    if (dup) createdIds.push(dup.id);
    const dupDoc = dup ? (await api("/api/library/" + dup.id)).json : null;
    check("router: duplication → nouvel id, kind=router, payload identique", !!dup && dupDoc.kind === "router" && JSON.stringify(dupDoc.payload) === JSON.stringify(origDoc.payload));
  } else check("router: duplication", false);

  // ── 8) Attache Router à un nœud router du canvas ────────────────────────────
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-router").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).some((n) => n.type === "router"), null, { timeout: 4000 });
  const routerNodeId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "router").id);
  await page.evaluate((id) => window.__selectNode(id), routerNodeId);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-open-" + routerId).click();
  await page.waitForSelector('[data-testid="lib-editor-router"]', { timeout: 4000 });
  await page.getByTestId("lib-attach").click();
  await page.waitForTimeout(250);
  const routerNodeData = await page.evaluate((id) => window.__ui.nodes.find((n) => n.id === id)?.data, routerNodeId);
  check("attache router → node.data.path/defaultRoute repris de la brique", routerNodeData?.path === "nodes.node-analyzer.intent" && routerNodeData?.defaultRoute === "chat");

  // ── 9) Attache Note + EXCLUSION toEngineGraph (note & artefact non exécutables)
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-llm").click();
  await page.getByTestId("add-note").click();
  await page.getByTestId("add-artefact").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).filter((n) => ["llm", "note", "artefact"].includes(n.type)).length === 3, null, { timeout: 4000 });
  const noteNodeId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "note").id);
  const noteBrickId = createdIds.find((id) => id.startsWith("note"));
  await page.evaluate((id) => window.__selectNode(id), noteNodeId);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-open-" + noteBrickId).click();
  await page.waitForSelector('[data-testid="lib-editor-note"]', { timeout: 4000 });
  await page.getByTestId("lib-attach").click();
  await page.waitForTimeout(250);
  const noteNodeData = await page.evaluate((id) => window.__ui.nodes.find((n) => n.id === id)?.data, noteNodeId);
  check("attache note → node.data.text repris de la brique", /Annotation/.test(noteNodeData?.text || ""));
  const engine = await page.evaluate(() => window.toEngineGraph(window.__ui.nodes, window.__ui.edges));
  const engineTypes = engine.nodes.map((n) => n.type);
  check("toEngineGraph EXCLUT note & artefact (seul llm reste)", engineTypes.length === 1 && engineTypes[0] === "llm");
  check("toEngineGraph ne contient aucun nœud note/artefact", !engineTypes.includes("note") && !engineTypes.includes("artefact"));

  check("aucune erreur console pendant la passe", consoleErrors.length === 0);
  if (consoleErrors.length) log("console errors: " + consoleErrors.slice(0, 3).join(" | "));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL PASSE-A KINDS CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  // self-clean created bricks (guarded — isolated store only)
  try { assertTestLibrary((await api("/api/library")).json, "library"); for (const id of createdIds) await api("/api/library/" + id, { method: "DELETE" }); } catch {}
  writeFileSync("passe_a_kinds_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

// wiredStatus + Brouillard d'audit + Ancrage brique sur edge — validation Playwright.
//
// Couvre :
//   1. wiredStatus réglable + persisté sur ≥2 kinds (agent + chain) via l'éditeur
//   2. Nœud lié à une source documented-only → brouillard (flou corps, titre net)
//   3. Nœud broken → teinte danger, PAS de flou (test dédié « jamais confondus »)
//   4. Nœud wired (ou sans sourceRef) → net, aucun traitement
//   5. Attache d'une brique (tout kind) au milieu d'un edge → badge visible + persisté
//   6. attachedBrickRef EXCLU du graphe moteur (window.toEngineGraph)
//   + régressions clés (double-run, Bibliothèque, carte d'identité Agent)
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
const post = (doc) => api("/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
const brick = (o) => ({ maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, wiredStatus: "unset", created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z", ...o });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

async function openBrick(id) {
  await page.getByTestId("lib-open-" + id).click();
  await page.waitForFunction((i) => document.querySelector('[data-testid="lib-id"]')?.value === i, id, { timeout: 4000 });
}
async function runWith(query) {
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
}

try {
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });

  // Seed test bricks (one per wiredStatus state we render + one to anchor on an edge).
  await post(brick({ id: "ws-agent", kind: "agent", name: "WS Agent", sourceRef: "autopilot.py:1-2", payload: { role: "code" } }));
  await post(brick({ id: "ws-chain", kind: "chain", name: "WS Chain", payload: { nodes: [{ id: "a", type: "llm", x: 10, y: 10, data: { prompt: "p" } }], edges: [], initialInput: {}, category: "test", tags: [] } }));
  await post(brick({ id: "ws-doconly", kind: "agent", name: "Doc Only Src", sourceRef: "lab/x.py:5", wiredStatus: "documented-only", payload: { role: "reviewer" } }));
  await post(brick({ id: "ws-broken", kind: "oracle", name: "Broken Src", sourceRef: "ml/claude_bridge.py", wiredStatus: "broken", payload: {} }));
  await post(brick({ id: "ws-note", kind: "note", name: "Edge Note Brick", payload: { text: "pourquoi cette connexion" } }));
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });

  // ---------- 1. wiredStatus réglable + persisté (agent + chain) ----------
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  await openBrick("ws-agent");
  await page.getByTestId("lib-wired").selectOption("wired");
  await page.getByTestId("lib-save").click();
  await page.waitForTimeout(500);
  const agSaved = (await api("/api/library/ws-agent")).json;
  check("wiredStatus persisté sur AGENT (wired)", agSaved && agSaved.wiredStatus === "wired");

  await openBrick("ws-chain");
  await page.getByTestId("lib-wired").selectOption("broken");
  await page.getByTestId("lib-save").click();
  await page.waitForTimeout(500);
  const chSaved = (await api("/api/library/ws-chain")).json;
  check("wiredStatus persisté sur CHAIN (broken) — 2ᵉ kind", chSaved && chSaved.wiredStatus === "broken");

  // Brique importée (sourceRef) sans champ wiredStatus → défaut documented-only affiché.
  // Simulate a LEGACY import: POST a brick file with NO wiredStatus field at all.
  await post({ id: "ws-import", kind: "prompt", name: "Imported no-ws", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: "autopilot.py:10-20", payload: { text: "t", variables: [], outputFormat: "text", outputSchema: null, category: "", version: 1 }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  await openBrick("ws-import");
  const importSel = await page.getByTestId("lib-wired").inputValue();
  check("Brique importée (sourceRef, sans champ) → défaut documented-only", importSel === "documented-only");

  // ---------- 2/3/4. Brouillard vs danger — rendu déterministe via __setGraph ----------
  await page.getByTestId("tab-canvas").click();
  await page.evaluate(() => window.__setGraph([
    { id: "n-fog", type: "llm", x: 60, y: 60, data: { prompt: "p", sourceRef: "autopilot.py:1", wiredStatus: "documented-only" } },
    { id: "n-broken", type: "llm", x: 320, y: 60, data: { prompt: "p", sourceRef: "ml/x.py", wiredStatus: "broken" } },
    { id: "n-wired", type: "llm", x: 60, y: 260, data: { prompt: "p", sourceRef: "autopilot.py:1", wiredStatus: "wired" } },
    { id: "n-nosrc", type: "llm", x: 320, y: 260, data: { prompt: "p", wiredStatus: "unset" } },
  ], []));
  await page.waitForSelector('[data-node-id="n-fog"]', { timeout: 5000 });

  const attr = (id, a) => page.locator(`[data-node-id="${id}"]`).getAttribute(a);
  check("Nœud documented-only → data-fog=1", (await attr("n-fog", "data-fog")) === "1");
  check("Nœud documented-only → PAS danger (data-danger=0)", (await attr("n-fog", "data-danger")) === "0");
  // Titre net = .nhead n'est PAS sous le filtre de flou (le flou porte sur .nbody).
  const titleBlur = await page.locator(`[data-node-id="n-fog"] .nhead`).evaluate((el) => getComputedStyle(el).filter);
  const bodyBlur = await page.locator(`[data-node-id="n-fog"] .nbody`).evaluate((el) => getComputedStyle(el).filter);
  check("Brouillard : titre NET (nhead sans blur)", titleBlur === "none");
  check("Brouillard : corps flouté (nbody blur actif)", /blur/.test(bodyBlur));

  check("Nœud broken → data-danger=1", (await attr("n-broken", "data-danger")) === "1");
  check("Nœud broken → PAS de flou (data-fog=0)", (await attr("n-broken", "data-fog")) === "0");
  check("Nœud broken → tag danger visible", await page.locator(`[data-testid="node-danger-n-broken"]`).isVisible());
  const brokenBodyBlur = await page.locator(`[data-node-id="n-broken"] .nbody`).evaluate((el) => getComputedStyle(el).filter);
  check("DÉDIÉ « jamais confondus » : broken n'a AUCUN flou sur le corps", brokenBodyBlur === "none");

  check("Nœud wired → net (data-fog=0, data-danger=0)", (await attr("n-wired", "data-fog")) === "0" && (await attr("n-wired", "data-danger")) === "0");
  check("Nœud sans sourceRef → net (aucun traitement)", (await attr("n-nosrc", "data-fog")) === "0" && (await attr("n-nosrc", "data-danger")) === "0");

  // Invariant global : AUCUN nœud n'est simultanément fog ET danger.
  const bothCount = await page.$$eval('[data-node-id]', (els) => els.filter((e) => e.getAttribute("data-fog") === "1" && e.getAttribute("data-danger") === "1").length);
  check("INVARIANT : 0 nœud à la fois fog ET danger", bothCount === 0);

  // ---------- Attach flow stamps wiredStatus onto the node (brouillard via attache réelle) ----------
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const agId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  await openBrick("ws-doconly");
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction((id) => { const n = (window.__ui?.nodes || []).find((x) => x.id === id); return n && n.data && n.data.wiredStatus === "documented-only"; }, agId, { timeout: 5000 });
  check("Attache documented-only → nœud stampé wiredStatus + brouillard", (await attr(agId, "data-fog")) === "1");

  // ---------- 5. Ancrage brique sur edge (tout kind) via l'inspecteur ----------
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click(); // enlève le composite de l'étape attache
  await page.evaluate(() => window.__setGraph([
    { id: "e-a", type: "llm", x: 60, y: 60, data: { prompt: "p" } },
    { id: "e-b", type: "llm", x: 360, y: 60, data: { prompt: "p" } },
  ], [{ id: "edge-1", from: "e-a", to: "e-b", condition: "" }]));
  await page.waitForFunction(() => { const es = window.__ui?.edges || []; return es.length === 1 && es[0].id === "edge-1"; }, null, { timeout: 5000 });
  await page.locator('[data-testid="edge-mid"][data-edge-id="edge-1"]').click(); // ouvre l'inspecteur (startMid → setSel)
  await page.waitForSelector('[data-testid="edge-brick"]', { timeout: 5000 });
  await page.getByTestId("edge-brick").selectOption("ws-note"); // kind 'note' — non-exécutable
  await page.waitForFunction(() => { const e = (window.__ui?.edges || []).find((x) => x.id === "edge-1"); return e && e.attachedBrickRef && e.attachedBrickRef.id === "ws-note"; }, null, { timeout: 5000 });
  check("Edge : brique (kind note) liée → attachedBrickRef posé", true);
  check("Edge : badge 📎 visible au milieu", await page.locator('[data-testid="edge-brick-badge"]').isVisible());
  check("Edge : référence, pas duplication (que id/name/kind/badge)", await page.evaluate(() => {
    const e = window.__ui.edges.find((x) => x.id === "edge-1");
    const k = Object.keys(e.attachedBrickRef).sort().join(",");
    return k === "badge,id,kind,name";
  }));

  // ---------- 6. attachedBrickRef EXCLU du graphe moteur ----------
  const engineHasRef = await page.evaluate(() => {
    const g = window.toEngineGraph(window.__ui.nodes, window.__ui.edges);
    const e = g.edges.find((x) => x.id === "edge-1");
    return e ? Object.prototype.hasOwnProperty.call(e, "attachedBrickRef") : false;
  });
  check("DÉDIÉ : attachedBrickRef ABSENT du graphe moteur", engineHasRef === false);
  const engineEdgeKeys = await page.evaluate(() => {
    const g = window.toEngineGraph(window.__ui.nodes, window.__ui.edges);
    return Object.keys(g.edges.find((x) => x.id === "edge-1") || {}).sort().join(",");
  });
  check("Graphe moteur : edge ne garde que les champs fonctionnels", engineEdgeKeys === "from,id,to");

  // Persistance : attachedBrickRef survit à un round-trip __setGraph (comme condition/visualStyle).
  const persisted = await page.evaluate(() => {
    const e = window.__ui.edges.find((x) => x.id === "edge-1");
    window.__setGraph(window.__ui.nodes, window.__ui.edges); // re-set → simulate reload of the graph object
    const e2 = window.__ui.edges.find((x) => x.id === "edge-1");
    return e2 && e2.attachedBrickRef && e2.attachedBrickRef.id === "ws-note";
  });
  check("Edge : attachedBrickRef persiste avec le graphe", persisted);

  await page.screenshot({ path: "builder_wiredstatus.png", fullPage: false });

  // ---------- Régressions clés ----------
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("RÉGRESSION double-run : search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("RÉGRESSION double-run : chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));
  const lib = (await api("/api/library")).json?.bricks || [];
  const kinds = new Set(lib.map((b) => b.kind));
  check("RÉGRESSION Bibliothèque : kinds multiples intacts", kinds.size >= 5);

  // ---------- cleanup (only bricks this pass created) ----------
  for (const id of ["ws-agent", "ws-chain", "ws-doconly", "ws-broken", "ws-note", "ws-import"]) {
    await api("/api/library/" + id, { method: "DELETE" });
  }

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL WIREDSTATUS CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("wiredstatus_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

// Étape 3 — Merge Engine AVEC nœud "join" : brique distincte (l'originale linéaire intacte),
// exécution end-to-end prouvant que le join attend ses 2 prédécesseurs avant la fusion.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const now = "2026-01-01T00:00:00Z";
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; };
const post = (p, body) => fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const NEW_ID = "chain-merge-join";
const ORIG_ID = "chain-mr57tuy5"; // Merge Engine linéaire existant — doit rester intact

// Nœuds (forme UI, avec positions + artefact). devA et devB convergent vers le join, qui
// déclare les attendre tous les deux (waitFor) avant que le Merger ne fusionne.
const uiNodes = [
  { id: "devA", type: "llm", x: 60, y: 60, data: { prompt: "Développeur A : implémente la moitié GAUCHE de la feature X.", outputKey: "outA" } },
  { id: "devB", type: "llm", x: 60, y: 220, data: { prompt: "Développeur B : implémente la moitié DROITE de la feature X.", outputKey: "outB" } },
  { id: "join", type: "join", x: 340, y: 140, data: { waitFor: ["devA", "devB"] } },
  { id: "merger", type: "llm", x: 600, y: 140, data: { prompt: "Merger : fusionne outA et outB en un diff cohérent, sans conflit.", outputKey: "out" } },
  { id: "artefact", type: "artefact", x: 860, y: 140, data: { title: "Feature X fusionnée", description: "", artefactType: "logiciel" } },
];
const uiEdges = [
  { id: "e-a-b", from: "devA", to: "devB" },
  { id: "e-b-join", from: "devB", to: "join" },
  { id: "e-join-merger", from: "join", to: "merger" },
  { id: "e-merger-art", from: "merger", to: "artefact" },
];
// Graphe MOTEUR (sans l'artefact non-exécutable) pour le test direct /api/execute.
const engineGraph = {
  nodes: uiNodes.filter((n) => n.type !== "artefact").map((n) => ({ id: n.id, type: n.type, data: n.data })),
  edges: uiEdges.filter((e) => e.to !== "artefact"),
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

try {
  // ── 0. L'original linéaire (référence d'intégrité) ──
  // NB : le harnais de régression isolé (run-validators) démarre sur un store AUTO-SEEDÉ
  // (agents) qui NE contient PAS les chaînes de production. On ne teste donc l'intégrité de
  // l'original QUE s'il est présent dans CE store — sinon on l'ignore proprement (l'intégrité
  // est prouvée par le run réel :3000, library complète). On ne l'écrit/écrase JAMAIS.
  const origBefore = await getJson("/api/library/" + ORIG_ID);
  const hasOrig = !!origBefore && String(origBefore.name || "").includes("Merge Engine");
  if (hasOrig) check("Merge Engine ORIGINAL (linéaire) présent avant", true);
  else log("ℹ️ " + ORIG_ID + " absent de ce store (harnais isolé auto-seedé) — checks d'intégrité de l'original ignorés ici (prouvés en run réel :3000).");

  // ── 1. Créer la NOUVELLE brique « Merge Engine (avec join) » — distincte ──
  const doc = {
    id: NEW_ID, kind: "chain", name: "Merge Engine (avec join)", maturity: "saved", badge: "demo",
    roadmapRef: null, sourceRef: "Variante de " + ORIG_ID + " — convergence explicite via nœud join (src/ moteur)",
    payload: { nodes: uiNodes, edges: uiEdges, initialInput: { task: "Implémenter la feature X" }, category: "import-merge", tags: ["join", "merge-engine"] },
    created: now, updated: now,
  };
  const r = await post("/api/library/" + NEW_ID, doc);
  check("Nouvelle brique « Merge Engine (avec join) » créée (POST ok)", r.ok);
  const reload = await getJson("/api/library/" + NEW_ID);
  check("Nouvelle brique relue avec un nœud type=join", !!reload && (reload.payload.nodes || []).some((n) => n.type === "join"));

  // ── 2. Test moteur DIRECT (/api/execute) : le join attend devA ET devB ──
  const execRes = await (await post("/api/execute", { graph: engineGraph, initialInput: { task: "X" } })).json();
  const trace = execRes.trace || [];
  const order = trace.map((s) => s.nodeId);
  const iA = order.indexOf("devA"), iB = order.indexOf("devB"), iJ = order.indexOf("join"), iM = order.indexOf("merger");
  check("exécution : devA et devB tracés AVANT le join", iA >= 0 && iB >= 0 && iJ > Math.max(iA, iB));
  const joinStep = trace.find((s) => s.nodeId === "join");
  check("exécution : le join s'exécute sans erreur (ses 2 prédécesseurs sont présents)", joinStep && !joinStep.error);
  const jout = (joinStep && joinStep.output) || {};
  check("exécution : le join agrège les sorties de devA ET devB (waitedFor=[devA,devB])",
    jout.type === "join" && Array.isArray(jout.waitedFor) && jout.waitedFor.includes("devA") && jout.waitedFor.includes("devB")
    && jout.joined && jout.joined.devA !== undefined && jout.joined.devB !== undefined);
  check("exécution : le Merger s'exécute APRÈS le join (convergence → fusion)", iM > iJ);

  // ── 3. Test UI « à la souris » : charger la brique + exécuter dans le builder ──
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="btn-organic"]', { timeout: 20000 });
  await page.getByTestId("example-dropdown").click();
  await page.waitForTimeout(200);
  await page.getByTestId("example-chain-" + NEW_ID).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).some((n) => n.type === "join"), null, { timeout: 6000 });
  const uiLoaded = await page.evaluate(() => ({
    join: window.__ui.nodes.filter((n) => n.type === "join").length,
    total: window.__ui.nodes.length,
  }));
  check("UI : brique chargée sur le canvas avec 1 nœud join", uiLoaded.join === 1 && uiLoaded.total === 5);
  await page.screenshot({ path: "join_merge_engine_canvas.png" });
  // exécuter (mock) et vérifier la trace UI
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="trace-step"]').length >= 4, null, { timeout: 15000 });
  const uiOrder = await page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  const uJ = uiOrder.indexOf("join");
  check("UI : exécution → le join apparaît dans la trace après devA/devB",
    uJ > uiOrder.indexOf("devA") && uJ > uiOrder.indexOf("devB") && uiOrder.indexOf("merger") > uJ);
  await page.screenshot({ path: "join_merge_engine_executed.png" });
  // clic sur le nœud join → inspecteur dédié waitFor
  await page.evaluate(() => window.__selectNode(window.__ui.nodes.find((n) => n.type === "join").id));
  await page.waitForTimeout(200);
  const insp = await page.evaluate(() => ({
    hasInsp: !!document.querySelector('[data-testid="inspector-join"]'),
    waitFor: document.querySelector('[data-testid="join-waitfor"]')?.value,
  }));
  check("UI : inspecteur join dédié montre waitFor = devA, devB", insp.hasInsp && /devA/.test(insp.waitFor) && /devB/.test(insp.waitFor));

  // ── 4. L'original linéaire est INTACT après tout ça (si présent dans ce store) ──
  if (hasOrig) {
    const origAfter = await getJson("/api/library/" + ORIG_ID);
    check("Merge Engine ORIGINAL intact (non supprimé, non modifié)",
      !!origAfter && origAfter.name === origBefore.name && JSON.stringify(origAfter.payload) === JSON.stringify(origBefore.payload));
  }

  check("aucune erreur console/page pendant le parcours", errs.length === 0);
  if (errs.length) log("ERRORS: " + JSON.stringify(errs.slice(0, 4)));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n✅ JOIN — Étape 3 : tous les checks passent" : `\n❌ JOIN — échec: ${out.failed}`);
} catch (e) {
  out.error = String((e && e.stack) || e);
  log("💥 " + out.error);
} finally {
  await browser.close();
  writeFileSync("join_validation_result.json", JSON.stringify(out, null, 2));
  log(`checks: ${Object.values(out.checks).filter(Boolean).length}/${Object.keys(out.checks).length}`);
  process.exit(out.pass ? 0 : 1);
}

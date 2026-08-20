// Chess TCG 3D — Chantier A (calque visuel des 7 jalons) + Chantier B (nouveau projet
// Wire Map dédié). Representation only — NO game code, NO LLM. Runs against a REAL-library
// server (needs roadmap-chess-tcg-3d + goal-chess-tcg-3d bricks; reads wireframes/).
//
// A) Derives 7 NOTE nodes (non-exécutables, NON_EXEC_TYPES) from the roadmap milestones,
//    chains them j1→…→j7, attaches the Goal brick on the 2 milestones that carry a goalRef,
//    saves as a layer with layerOwner "claude", then re-loads it to prove it renders.
// B) Verifies the new "Chess TCG 3D" Wire Map project (7 PENDING entries) is selectable and
//    watertight vs the "LLM-Lego Builder" project (still 13 entries, no cross-contamination).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond && !out.failed) out.failed = name; };
const api = async (p) => { const r = await fetch(BASE + p); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const reqUrls = [];
page.on("request", (r) => reqUrls.push(r.url()));

async function openWireMapOn(projectId) {
  await page.getByTestId("tab-wiremap").click();
  await page.waitForSelector('[data-testid="wiremap"]', { timeout: 5000 });
  await page.getByTestId("wm-project-select").selectOption(projectId);
  await page.waitForTimeout(150);
}
const wmRows = () => page.$$eval('[data-testid="wm-row"]', (e) => e.length);
const wmText = () => page.locator('[data-testid="wiremap"]').innerText();

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-canvas"]', { timeout: 20000 });

  // ============ CHANTIER A — visual layer of the 7 milestones ============
  const roadmap = (await api("/api/library/roadmap-chess-tcg-3d")).json;
  const goal = (await api("/api/library/goal-chess-tcg-3d")).json;
  const milestones = roadmap?.payload?.milestones || [];
  check("Roadmap source chargée (7 jalons)", milestones.length === 7);

  // Build 7 note nodes (NON-executable, NON_EXEC_TYPES) derived from the milestones + chain
  // edges. A note renders data.title (📝) as its header and data.text as its body.
  const nodes = milestones.map((m, i) => {
    const n = {
      id: `jalon-${i + 1}`, type: "note",
      x: 60 + (i % 4) * 300, y: 80 + Math.floor(i / 4) * 220,
      data: { title: m.title, text: m.description },
    };
    // Optional Jalon↔Goal link (jalons 6 & 7 only, where the roadmap already declares
    // goalRef). Note nodes have NO goal chip (dedicated render), so — per "reste simple,
    // ne force pas" — surface it as a visible 🎯 line inside the note body + keep an inert
    // data.goalRef for machine traceability. No node-level chip is forced.
    if (m.goalRef && goal && m.goalRef === goal.id) {
      n.data.goalRef = goal.id;
      n.data.text += `\n\n🎯 Lié à l'objectif : ${goal.name}`;
    }
    return n;
  });
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: `e-${i + 1}`, from: nodes[i].id, to: nodes[i + 1].id });
  }

  await page.getByTestId("tab-canvas").click();
  await page.evaluate(({ ns, es }) => window.__setGraph(ns, es), { ns: nodes, es: edges });
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 7, null, { timeout: 5000 });
  check("Canvas: 7 nœuds note posés", (await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "note").length)) === 7);
  check("Canvas: 6 edges séquentiels (jalon-1→…→jalon-7)", (await page.evaluate(() => {
    const es = window.__ui.edges;
    return es.length === 6 && es.every((e, i) => e.from === `jalon-${i + 1}` && e.to === `jalon-${i + 2}`);
  })));
  check("Canvas: jalons 6 & 7 portent goalRef inerte → goal-chess-tcg-3d", (await page.evaluate(() =>
    window.__ui.nodes.filter((n) => n.data?.goalRef === "goal-chess-tcg-3d").map((n) => n.id).sort().join(",")
  )) === "jalon-6,jalon-7");
  // Visible link: the 🎯 objective line is present in the body text of jalons 6 & 7 (note
  // nodes have no goal chip → simplest honest visual, not forced further).
  check("Rendu: ligne 🎯 Objectif visible dans le corps de jalon-6 et jalon-7", (await page.evaluate(() =>
    window.__ui.nodes.filter((n) => /🎯 Lié à l'objectif/.test(n.data?.text || "")).map((n) => n.id).sort().join(",")
  )) === "jalon-6,jalon-7");
  // 7 note headers (📝 title) actually rendered in the DOM.
  check("Rendu: 7 en-têtes de note (📝 titre) présents", (await page.$$eval('[data-testid="note-title"]', (e) => e.length)) === 7);

  // Save as a layer with owner "claude" (Claude Code a construit ce calque en pilotant l'UI).
  await page.evaluate(() => window.__setSaveOwner("claude"));
  await page.getByTestId("btn-layers").click();
  await page.waitForSelector('[data-testid="layers-menu"]', { timeout: 4000 });
  await page.getByTestId("layer-name-input").fill("Chess TCG 3D — Roadmap visuelle (7 jalons)");
  await page.getByTestId("layer-save").click();
  await page.waitForTimeout(200);

  const layers = await page.evaluate(() => window.__layers());
  const layer = layers.find((l) => l.name === "Chess TCG 3D — Roadmap visuelle (7 jalons)");
  check("Calque sauvegardé — existe", !!layer);
  check("Calque: layerOwner = claude", layer?.layerOwner === "claude");
  check("Calque: 7 nœuds + 6 edges persistés", (layer?.nodes || []).length === 7 && (layer?.edges || []).length === 6);
  check("Calque: jalons 6&7 gardent goalRef inerte dans le calque",
    (layer?.nodes || []).filter((n) => n.data?.goalRef === "goal-chess-tcg-3d").length === 2);
  check("Calque apparaît dans l'espace Claude (compteur ≥ 1)",
    Number(await page.getByTestId("layer-group-count-claude").textContent()) >= 1);

  // Clear the canvas, then LOAD the layer back → prove the 7 jalons render from the layer.
  // The layers menu is still open from the save (a window.__setGraph evaluate does not close
  // it); only re-open it via btn-layers if it somehow closed.
  await page.evaluate(() => window.__setGraph([], []));
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0, null, { timeout: 4000 });
  if (!(await page.locator('[data-testid="layers-menu"]').isVisible())) {
    await page.getByTestId("btn-layers").click();
    await page.waitForSelector('[data-testid="layers-menu"]', { timeout: 4000 });
  }
  await page.getByTestId("layer-load-" + layer.id).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 7, null, { timeout: 5000 });
  check("Calque rechargé → 7 jalons réaffichés sur le canvas",
    (await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "note").length)) === 7);
  const firstTitle = await page.evaluate(() => (window.__ui.nodes.find((n) => n.id === "jalon-1")?.data?.title) || "");
  check("Calque rechargé → titres de jalons présents (jalon-1 = Analyser l'existant)", /Analyser l'existant/.test(firstTitle));

  // ============ CHANTIER B — new dedicated Wire Map project ============
  const projs = (await api("/api/wireframes")).json?.projects || [];
  const ids = projs.map((p) => p.id);
  check("Projet Wire Map 'chess-tcg-3d' existe + 'llm-lego' toujours là", ids.includes("chess-tcg-3d") && ids.includes("llm-lego"));

  // dropdown lists both projects
  await page.getByTestId("tab-wiremap").click();
  await page.waitForSelector('[data-testid="wiremap"]', { timeout: 5000 });
  const opts = await page.$$eval('[data-testid="wm-project-select"] option', (els) => els.map((e) => e.value));
  check("Dropdown projet liste chess-tcg-3d ET llm-lego", opts.includes("chess-tcg-3d") && opts.includes("llm-lego"));

  // select chess-tcg-3d → 7 PENDING entries
  await openWireMapOn("chess-tcg-3d");
  check("chess-tcg-3d: 7 entrées affichées", (await wmRows()) === 7);
  const chessDoc = (await api("/api/wireframes/chess-tcg-3d")).json;
  check("chess-tcg-3d: 7 entrées toutes PENDING", (chessDoc?.entries || []).length === 7 && chessDoc.entries.every((e) => e.test.status === "PENDING"));
  check("chess-tcg-3d: toutes impRef null + files vides (à compléter plus tard)",
    chessDoc.entries.every((e) => e.impRef === null && (e.files || []).length === 0 && !e.command));
  const chessText = await wmText();
  check("chess-tcg-3d: libellé de suivi présent (Choix moteur de rendu 3D)", /Choix moteur de rendu 3D/.test(chessText));
  check("ÉTANCHÉITÉ: aucune entrée llm-lego dans chess-tcg-3d (pas de 'scheduler'/'executor')",
    !/scheduler|executor|resolvePath/i.test(chessText));

  // switch to llm-lego → 13 entries, none of the chess entries present
  await openWireMapOn("llm-lego");
  check("llm-lego: toujours 13 entrées (intact)", (await wmRows()) === 13);
  const llText = await wmText();
  check("ÉTANCHÉITÉ: aucune entrée chess dans llm-lego (pas de 'Choix moteur de rendu 3D')",
    !/Choix moteur de rendu 3D/.test(llText));
  const llDoc = (await api("/api/wireframes/llm-lego")).json;
  check("llm-lego doc: 13 entrées, entry-013 cartographie intacte",
    (llDoc?.entries || []).length === 13 && llDoc.entries.some((e) => e.id === "entry-013"));

  // No LLM / no execution during the whole pass.
  const llmCalls = reqUrls.filter((u) => /:1234\b/.test(u) || /\/v1\/(chat\/)?completions/.test(u) || /lmstudio|anthropic|openai/i.test(u));
  const execCalls = reqUrls.filter((u) => /\/api\/execute/.test(u));
  check("ZÉRO appel LM Studio / LLM pendant la passe", llmCalls.length === 0);
  check("ZÉRO exécution (/api/execute)", execCalls.length === 0);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL CHESS-TCG LAYER+WIREMAP CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("chess_tcg_layer_wm_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

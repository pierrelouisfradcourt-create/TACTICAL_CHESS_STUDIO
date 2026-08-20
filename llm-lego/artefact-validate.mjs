// Artefact node + LLM/Agent inversion validation.
//  P1: + Agent = composite (7 components visible on node) + import fills them; + LLM simple.
//  P2: + Artefact poses a non-exec node accepting in/out edges; excluded from toEngineGraph
//      (node + touching edges), like Note.
//  Critical regression: the 3 fixed examples still load/execute identically.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
const post = (doc) => api("/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

async function dragHandle(aId, side, bId) {
  const h = await page.locator(`[data-node-id="${aId}"] .handle.${side}`).boundingBox();
  const b = await page.locator(`[data-node-id="${bId}"]`).boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}
async function runWith(query) {
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
}
const lastId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-artefact"]', { timeout: 20000 });
  await post({ id: "agent-rich", kind: "agent", name: "Rich Agent", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { role: "r", memoire: "m", skill: "s", plugin: "pl", objectif: "o", gardeFou: "gf", modele: "md", temperature: 0.2, top_p: 0.9, max_tokens: 1000, autonomy_level: null, permissions: {}, allowed_surfaces: [], forbidden_surfaces: [] }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="add-artefact"]', { timeout: 10000 });
  await page.getByTestId("tab-canvas").click();

  // ---- Part 1: + Agent = central + 8 SATELLITE components / + LLM simple ----
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const agId = await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").slice(-1)[0].id);
  check("+ Agent poses a central agent node (NodeType 'agent' unchanged)",
    await page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i).type, agId) === "agent");
  check("+ Agent poses 8 SATELLITE component nodes (incl. sortie attendue)",
    (await page.$$eval('[data-node-type="agent-component"]', (e) => e.length)) === 8);
  check("the 8 satellites are linked to the central agent by edges",
    await page.evaluate((i) => window.__ui.edges.filter((e) => e.from === i && window.__ui.nodes.find((n) => n.id === e.to && n.type === "agent-component")).length, agId) === 8);
  const agData = await page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i).data, agId);
  check("+ Agent central node NO LONGER carries the component fields (moved to satellites)",
    !("memoire" in agData) && !("gardeFou" in agData));
  check("pastilles compressées retirées (no agent-components pill block on the node)",
    (await page.$$eval(`[data-testid="agent-components-${agId}"]`, (e) => e.length)) === 0);
  check("badge de santé présent, incomplet 0/8 (tous vides)",
    /0\/8/.test((await page.locator(`[data-testid="agent-card-${agId}"]`).textContent()) || ""));
  // import a rich agent fiche → fills the 7 identity satellites (sortie attendue stays empty).
  await page.getByTestId("import-select").selectOption("agent-rich");
  await page.waitForFunction((i) => {
    const sats = window.__ui.nodes.filter((n) => n.type === "agent-component" && n.data.parentId === i);
    return sats.find((s) => s.data.componentType === "memoire" && s.data.text === "m");
  }, agId, { timeout: 5000 });
  const satTexts = await page.evaluate((i) => {
    const sats = window.__ui.nodes.filter((n) => n.type === "agent-component" && n.data.parentId === i);
    const m = {}; sats.forEach((s) => { m[s.data.componentType] = s.data.text; }); return m;
  }, agId);
  check("import Agent fiche fills the 7 identity satellites at once",
    satTexts.role === "r" && satTexts.memoire === "m" && satTexts.skill === "s" && satTexts.plugin === "pl" && satTexts.objectif === "o" && satTexts.gardeFou === "gf" && satTexts.modele === "md");
  check("badge reste 7/8 ⚠️ après import fiche (sortie attendue non fournie par une fiche agent)",
    /7\/8/.test((await page.locator(`[data-testid="agent-card-${agId}"]`).textContent()) || ""));

  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-llm").click();
  const llmId = await lastId();
  check("+ LLM has NO sub-menu (simple monobloc)", (await page.$$eval('[data-testid="llm-menu"]', (e) => e.length)) === 0);
  check("+ LLM poses NO satellite components (simple)", (await page.$$eval('[data-node-type="agent-component"]', (e) => e.length)) === 0);
  const llmData = await page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i).data, llmId);
  check("+ LLM node is a plain llm with a prompt", typeof llmData.prompt === "string" && !("memoire" in llmData));

  // ---- Part 2: Artefact ----
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-artefact").click();
  const artId = await lastId();
  check("+ Artefact poses an artefact node", await page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i).type, artId) === "artefact");
  await page.locator(`[data-node-id="${artId}"] .nhead`).click();
  check("Artefact inspector (title/description/type) shown", await page.getByTestId("inspector-artefact").isVisible() && await page.getByTestId("artefact-title").isVisible());

  // Accepts incoming AND outgoing edges — place non-overlapping and draw both.
  await page.evaluate(() => window.__setGraph(
    [{ id: "src", type: "llm", x: 60, y: 140, data: { prompt: "p", outputKey: "src" } },
     { id: "art", type: "artefact", x: 360, y: 140, data: { title: "Livrable", artefactType: "logiciel" } },
     { id: "dst", type: "tool", x: 640, y: 360, data: { name: "t" } }],
    []));
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 3, null, { timeout: 3000 });
  await dragHandle("src", "right", "art");   // incoming to artefact
  await page.mouse.click(700, 600);          // deselect (reset any draw state)
  await page.waitForTimeout(200);
  await dragHandle("art", "right", "dst");   // outgoing from artefact
  await page.mouse.click(700, 600);
  await page.waitForTimeout(200);
  const edges = await page.evaluate(() => window.__ui.edges.map((e) => e.from + "->" + e.to));
  check("Artefact accepts an INCOMING edge (src → art)", edges.includes("src->art"));
  check("Artefact accepts an OUTGOING edge (art → dst)", edges.includes("art->dst"));

  // toEngineGraph excludes the artefact node AND both edges touching it (like Note).
  const eg = await page.evaluate(() => window.toEngineGraph(window.__ui.nodes, window.__ui.edges));
  check("toEngineGraph EXCLUDES the artefact node", !eg.nodes.some((n) => n.type === "artefact") && !eg.nodes.some((n) => n.id === "art"));
  check("toEngineGraph DROPS every edge touching the artefact", !eg.edges.some((e) => e.from === "art" || e.to === "art"));
  check("toEngineGraph keeps the real nodes (src, dst)", eg.nodes.some((n) => n.id === "src") && eg.nodes.some((n) => n.id === "dst"));
  await page.screenshot({ path: "builder_artefact.png", fullPage: false });

  // ---- CRITICAL REGRESSION: the 3 fixed examples load + execute identically ----
  for (const key of ["routing", "gate", "looped"]) {
    await page.getByTestId("example-dropdown").click();
    await page.getByTestId("example-" + key).click();
    await page.waitForFunction(() => (window.__ui?.nodes || []).length > 0, null, { timeout: 5000 });
    check(`fixed example '${key}' loads (nodes present)`, (await page.evaluate(() => window.__ui.nodes.length)) > 0);
  }
  // routing double-run must be byte-identical behaviour.
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("CRITICAL double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("CRITICAL double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));
  // Council looped still executes (loop runs).
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-looped").click();
  await page.waitForSelector('[data-node-id="reviewer"]', { timeout: 8000 });
  const rl = await runWith("go");
  check("Council looped still executes (reviewer runs, multiple iterations)", rl.filter((x) => x === "coder").length >= 2);

  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 13 entries", (wm.json?.entries || []).length === 13);

  await api("/api/library/agent-rich", { method: "DELETE" });

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL ARTEFACT/INVERSION CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("artefact_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

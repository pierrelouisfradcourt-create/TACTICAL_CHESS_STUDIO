// Palette completeness (+ Prompt / + Oracle / + Goal, + import-at-pose on + Agent)
// and Bibliothèque fluidity (big graph round-trip with multiple attaches; filter at
// scale). Reuses the existing attach fns. Plus regressions.
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
page.on("dialog", (d) => d.accept()); // any overwrite confirm → accept

async function runWith(query) {
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
}
const lastNodeId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);
const nodeData = (id) => page.evaluate((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return { data: n.data, attachedBrick: n.attachedBrick, attachedPrompt: n.attachedPrompt, attachedOracle: n.attachedOracle, attachedGoal: n.attachedGoal }; }, id);

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-prompt"]', { timeout: 20000 });

  // Need one brick of each kind to import. Only agent bricks are guaranteed present
  // (the 5 seeds), so this suite seeds its OWN prompt/oracle/goal fixtures — it must
  // not depend on other bricks living in the (now isolated) library. See _test-guard.
  await post({ id: "prompt-imp", kind: "prompt", name: "Prompt Import", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { text: "Résume: {input}", variables: ["input"], outputFormat: "text", outputSchema: null, category: "meta", version: 1 }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await post({ id: "oracle-imp", kind: "oracle", name: "Oracle Import", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { prompt: "check", verdictField: "verdict", expectedValues: ["PASS", "FAIL"], rule: "r", category: "meta", attachableTo: ["agent", "llm", "tool"], model: "", temperature: null }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await post({ id: "goal-imp", kind: "goal", name: "Goal Import", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { text: "objectif importé", category: "meta" }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="add-prompt"]', { timeout: 10000 });
  const lib = (await api("/api/library")).json?.bricks || [];
  const idOf = (k) => (lib.find((b) => b.kind === k) || {}).id;
  const promptId = idOf("prompt"), oracleId = idOf("oracle"), agentId = idOf("agent");
  log(`import ids: prompt=${promptId} oracle=${oracleId} agent=${agentId} goal=goal-imp`);

  await page.getByTestId("tab-canvas").click();

  // ---- Part 1: each new palette button poses a node + import chooser ----
  // + Prompt → llm node + import a prompt.
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-prompt").click();
  const pNode = await lastNodeId();
  check("+ Prompt poses a node (llm)", /^llm-/.test(pNode));
  check("+ Prompt opens the import chooser", await page.getByTestId("import-chooser").isVisible());
  await page.getByTestId("import-select").selectOption(promptId);
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && n.attachedPrompt; }, pNode, { timeout: 5000 });
  const pInfo = await nodeData(pNode);
  check("+ Prompt import → node populated (data.prompt + attachedPrompt)", !!pInfo.attachedPrompt && pInfo.attachedPrompt.id === promptId && typeof pInfo.data.prompt === "string" && pInfo.data.prompt.length > 0);

  // + Oracle → agent node + import an oracle guardian.
  await page.getByTestId("add-oracle").click();
  const oNode = await lastNodeId();
  check("+ Oracle poses a node (agent)", /^agent-/.test(oNode));
  await page.getByTestId("import-select").selectOption(oracleId);
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && n.attachedOracle; }, oNode, { timeout: 5000 });
  const oInfo = await nodeData(oNode);
  check("+ Oracle import → node populated (data.oracleRef + attachedOracle)", oInfo.data.oracleRef === oracleId && !!oInfo.attachedOracle);

  // + Goal → agent node + import a goal.
  await page.getByTestId("add-goal").click();
  const gNode = await lastNodeId();
  await page.getByTestId("import-select").selectOption("goal-imp");
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && n.attachedGoal; }, gNode, { timeout: 5000 });
  const gInfo = await nodeData(gNode);
  check("+ Goal poses a node + import → data.goalRef + attachedGoal", /^agent-/.test(gNode) && gInfo.data.goalRef === "goal-imp" && !!gInfo.attachedGoal);

  // + Agent → CENTRAL agent node (+ 8 satellites) + import chooser (agent fiche).
  // lastNodeId() would now return a satellite — grab the central agent explicitly.
  await page.getByTestId("add-agent").click();
  const aNode = await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").slice(-1)[0].id);
  check("+ Agent now opens the import chooser too", await page.getByTestId("import-chooser").isVisible());
  await page.getByTestId("import-select").selectOption(agentId);
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && n.attachedBrick; }, aNode, { timeout: 5000 });
  const aInfo = await nodeData(aNode);
  check("+ Agent import → node populated (attachedBrick + producerRef)", aInfo.attachedBrick && aInfo.attachedBrick.id === agentId && aInfo.data.producerRef === agentId);

  // "Créer vide" dismisses the chooser, node stays empty.
  await page.getByTestId("add-prompt").click();
  const emptyNode = await lastNodeId();
  await page.getByTestId("import-empty").click();
  check("'Créer vide' dismisses the chooser (node kept, no import)", (await page.$$eval('[data-testid="import-chooser"]', (e) => e.length)) === 0 && (await page.evaluate((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return !n.attachedPrompt; }, emptyNode)));

  // ---- Part 2: big graph with multiple attaches → save as Chain → reload faithfully ----
  await page.getByTestId("btn-clear").click();
  const bigNodes = [];
  for (let i = 0; i < 11; i++) bigNodes.push({ id: "n" + i, type: i === 5 ? "router" : (i % 2 ? "tool" : "llm"), x: 80 + (i % 5) * 180, y: 80 + Math.floor(i / 5) * 160, data: { k: i } });
  // attach 4 different bricks onto 4 different nodes (simulate the attached state).
  bigNodes[1] = { ...bigNodes[1], type: "agent", data: { producerRef: agentId, role: "x" }, attachedBrick: { id: agentId, name: "A", badge: "real" } };
  bigNodes[2] = { ...bigNodes[2], type: "llm", data: { prompt: "hi", producerRef: promptId }, attachedPrompt: { id: promptId, name: "P", badge: "demo" } };
  bigNodes[3] = { ...bigNodes[3], type: "agent", data: { oracleRef: oracleId }, attachedOracle: { id: oracleId, name: "O", badge: "demo" } };
  bigNodes[4] = { ...bigNodes[4], type: "agent", data: { goalRef: "goal-imp" }, attachedGoal: { id: "goal-imp", name: "G", badge: "demo" } };
  const bigEdges = [];
  for (let i = 0; i < 10; i++) bigEdges.push({ id: "e" + i, from: "n" + i, to: "n" + (i + 1) });
  bigEdges.push({ id: "loop", from: "n9", to: "n5", loop: true, condition: "NOK", maxIterations: 3 });
  await page.evaluate(({ n, e }) => window.__setGraph(n, e), { n: bigNodes, e: bigEdges });
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 11, null, { timeout: 3000 });
  const beforeNodes = await page.evaluate(() => JSON.stringify(window.__ui.nodes));
  const beforeEdges = await page.evaluate(() => JSON.stringify(window.__ui.edges));
  // Save as chain.
  await page.getByTestId("btn-save-chain").click();
  await page.getByTestId("chain-name").fill("Big Archi E2E");
  await page.getByTestId("chain-save-submit").click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 6000 });
  const chainId = (await api("/api/library")).json.bricks.find((b) => b.name === "Big Archi E2E").id;
  // Clear then reload from the view selector.
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-chain-" + chainId).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 11, null, { timeout: 5000 });
  const afterNodes = await page.evaluate(() => JSON.stringify(window.__ui.nodes));
  const afterEdges = await page.evaluate(() => JSON.stringify(window.__ui.edges));
  check("big graph (11 nodes) reloads with identical nodes (positions + attaches)", afterNodes === beforeNodes);
  check("big graph reloads with identical edges (incl. loop edge)", afterEdges === beforeEdges);
  const attachesOk = await page.evaluate(() => {
    const g = (id) => window.__ui.nodes.find((n) => n.id === id);
    return !!(g("n1").attachedBrick && g("n2").attachedPrompt && g("n3").attachedOracle && g("n4").attachedGoal &&
      g("n3").data.oracleRef && g("n4").data.goalRef);
  });
  check("all 4 different attaches (Agent/Prompt/Oracle/Goal) preserved in the reload", attachesOk);
  const loopOk = await page.evaluate(() => window.__ui.edges.some((e) => e.loop === true && e.condition === "NOK"));
  check("loop edge preserved in the reloaded big graph", loopOk);
  await page.screenshot({ path: "builder_palette_big.png", fullPage: false });
  await api("/api/library/" + chainId, { method: "DELETE" });

  // ---- Part 2: filter at scale (17+ bricks) ----
  // reload so the client list reflects server truth (the chain was deleted via API).
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });
  await page.getByTestId("tab-library").click();
  const total = (await api("/api/library")).json.bricks.length;
  log(`library total bricks: ${total}`);
  const rowsForFilter = async (f) => { await page.getByTestId("lib-filter").selectOption(f); await page.waitForTimeout(150); return page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.map((e) => e.getAttribute("data-kind"))); };
  const allRows = await rowsForFilter("all");
  check(`filter Tous shows all ${total} bricks (no truncation/pagination hiding rows)`, allRows.length === total);
  const oracleRows = await rowsForFilter("oracle");
  check("filter Oracle isolates only oracle rows at scale", oracleRows.length >= 1 && oracleRows.every((k) => k === "oracle"));
  const promptRows = await rowsForFilter("prompt");
  check("filter Prompt isolates only prompt rows at scale", promptRows.length >= 1 && promptRows.every((k) => k === "prompt"));

  // cleanup this suite's own fixtures
  await api("/api/library/prompt-imp", { method: "DELETE" });
  await api("/api/library/oracle-imp", { method: "DELETE" });
  await api("/api/library/goal-imp", { method: "DELETE" });

  // ---- Regressions ----
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));
  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 12 entries", (wm.json?.entries || []).length === 12);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL PALETTE CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("palette_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

// Phase 2 — Builder <-> Engine wiring validation (real UX, DOM-level).
//
// Proves the DRAWING drives the REAL engine, not a simulation:
//   - load the example graph (analyzer -> router -> search|chat) in the React builder
//   - run with a "search" query   -> trace must show node-search / reason=exact-match
//   - run with a "chat" query     -> trace must FLIP to node-chat
//   - feed an invalid graph        -> engine 400 surfaced as a readable error banner
// A fake simulation could hardcode one branch; only the real engine flips on input.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// Load a pre-written example via the central selector dropdown (replaces the old
// fixed routing/gate/looped buttons). key: 'routing' | 'gate' | 'looped'.
async function loadExample(page, key) {
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-" + key).click();
}

async function runWith(query) {
  // Set the input JSON (controlled React textarea) then click Exécuter.
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  // Wait until at least one trace step rendered AND status is no longer busy.
  await page.waitForFunction(() => {
    const steps = document.querySelectorAll('[data-testid="trace-step"]');
    const st = document.querySelector('[data-testid="status"]')?.textContent || "";
    return steps.length > 0 && !st.includes("⏳");
  }, null, { timeout: 15000 });
  const stepNodeIds = await page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  const reasons = await page.$$eval('[data-testid="route-reason"]', (els) => els.map((e) => e.textContent));
  return { stepNodeIds, reasons };
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);

  // React + Babel compile the inline JSX at runtime; wait for the app to mount.
  await page.waitForSelector('[data-testid="example-dropdown"]', { timeout: 20000 });
  log("React app mounted (palette + toolbar present)");

  // --- toEngineGraph edge cases, exercised on the REAL in-page function ---
  const tg = await page.evaluate(() => {
    const f = window.toEngineGraph;
    return {
      // drops position/styles, keeps id/type/data
      strip: f(
        [{ id: 'a', type: 'llm', x: 10, y: 20, color: 'red', data: { k: 1 } }],
        [],
      ),
      // node with NO data -> data defaults to {}
      noData: f([{ id: 'a', type: 'tool' }], []),
      // condition kept only when non-empty / non-whitespace
      cond: f(
        [{ id: 'a', type: 'router' }, { id: 'b', type: 'llm' }, { id: 'c', type: 'llm' }],
        [
          { id: 'e1', from: 'a', to: 'b', condition: 'search' },
          { id: 'e2', from: 'a', to: 'c', condition: '   ' },
          { id: 'e3', from: 'a', to: 'c' },
        ],
      ),
      // null inputs don't throw
      nullSafe: f(null, undefined),
    };
  });
  check("toEngineGraph drops x/y/color, keeps id/type/data",
    JSON.stringify(tg.strip.nodes[0]) === JSON.stringify({ id: 'a', type: 'llm', data: { k: 1 } }));
  check("toEngineGraph defaults missing data to {}",
    JSON.stringify(tg.noData.nodes[0].data) === '{}');
  check("toEngineGraph keeps non-empty condition", tg.cond.edges[0].condition === 'search');
  check("toEngineGraph drops whitespace-only condition", !('condition' in tg.cond.edges[1]));
  check("toEngineGraph drops absent condition", !('condition' in tg.cond.edges[2]));
  check("toEngineGraph null-safe", tg.nullSafe.nodes.length === 0 && tg.nullSafe.edges.length === 0);

  // Load the visual example graph (nodes appear on the canvas).
  await loadExample(page, "routing");
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const nodeCount = await page.$$eval('.node', (els) => els.length);
  const edgeCount = await page.$$eval('svg.edges path[marker-end]', (els) => els.length);
  log(`example graph drawn: ${nodeCount} nodes, ${edgeCount} edges on canvas`);
  check("example renders 4 nodes", nodeCount === 4);
  check("example renders 3 edges", edgeCount === 3);

  // --- RUN 1: search ---
  log('--- RUN 1: query="Search for climate news" ---');
  const r1 = await runWith("Search for climate news");
  log(`run1 trace: ${r1.stepNodeIds.join(" -> ")}`);
  log(`run1 reasons: ${JSON.stringify(r1.reasons)}`);
  check("run1 executed node-search", r1.stepNodeIds.includes("node-search"));
  check("run1 did NOT execute node-chat", !r1.stepNodeIds.includes("node-chat"));
  check("run1 routing reason=exact-match", r1.reasons.some((t) => /reason=exact-match/.test(t)));
  await page.screenshot({ path: "builder_run1_search.png", fullPage: false });
  log("screenshot -> builder_run1_search.png");

  // --- RUN 2: chat (same drawn graph, different input -> branch must flip) ---
  log('--- RUN 2: query="Tell me a story about a cat" ---');
  const r2 = await runWith("Tell me a story about a cat");
  log(`run2 trace: ${r2.stepNodeIds.join(" -> ")}`);
  log(`run2 reasons: ${JSON.stringify(r2.reasons)}`);
  check("run2 executed node-chat", r2.stepNodeIds.includes("node-chat"));
  check("run2 did NOT execute node-search", !r2.stepNodeIds.includes("node-search"));
  check("run2 routing reason=exact-match", r2.reasons.some((t) => /reason=exact-match/.test(t)));
  await page.screenshot({ path: "builder_run2_chat.png", fullPage: false });
  log("screenshot -> builder_run2_chat.png");

  // The KEY proof: same graph, the executed branch flipped with the input.
  check("BRANCH FLIPPED search->chat (real engine routing, not a sim)",
    r1.stepNodeIds.includes("node-search") && r2.stepNodeIds.includes("node-chat"));

  // === COUNCIL LOOP: prove a real, bounded feedback loop runs in the engine ===
  log("--- COUNCIL looped: load, inspect serialization, run, assert iterations ---");
  await loadExample(page, "looped");
  await page.waitForSelector('[data-node-id="reviewer"]', { timeout: 8000 });

  // (a) serialization fidelity: note excluded, loop edge + agent params present.
  const eg = JSON.parse(await page.locator('[data-testid="engine-graph"]').textContent());
  const noteInGraph = eg.nodes.some((n) => n.type === "note") || JSON.stringify(eg).includes("note-loop");
  check("note EXCLUDED from engine graph", !noteInGraph);
  const loopEdge = eg.edges.find((e) => e.loop);
  check("loop edge serialized (loop+condition+maxIterations)",
    !!loopEdge && loopEdge.condition === "NOK" && loopEdge.maxIterations === 5 && loopEdge.from === "reviewer" && loopEdge.to === "coder");
  const reviewerData = (eg.nodes.find((n) => n.id === "reviewer") || {}).data || {};
  check("agent params serialized (role+model+temperature+top_p+max_tokens)",
    reviewerData.role === "claude-reviewer" && reviewerData.temperature === 0.3 &&
    reviewerData.top_p === 0.9 && reviewerData.max_tokens === 4500 && !!reviewerData.model);

  // (b) inspector shows an agent's params when selected.
  await page.locator('[data-node-id="reviewer"] .nhead').click();
  const inspRole = await page.getByTestId("agent-role").inputValue();
  const inspTemp = await page.getByTestId("agent-temperature").inputValue();
  check("inspector shows agent role + temperature", inspRole === "claude-reviewer" && inspTemp === "0.3");

  // (c) run it — the example already sets input {task:...}.
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => {
    const steps = document.querySelectorAll('[data-testid="trace-step"]');
    const st = document.querySelector('[data-testid="status"]')?.textContent || "";
    return steps.length > 0 && !st.includes("⏳");
  }, null, { timeout: 15000 });

  const loopTrace = await page.$$eval('[data-testid="trace-step"]', (els) =>
    els.map((e) => ({
      nodeId: e.getAttribute("data-node-id"),
      iteration: Number(e.getAttribute("data-iteration")),
      reason: (e.querySelector('[data-testid="route-reason"]')?.textContent || ""),
      decision: (e.querySelector('[data-testid="decision"]')?.textContent || ""),
    })));
  const coderIters = loopTrace.filter((s) => s.nodeId === "coder").map((s) => s.iteration);
  const reviewerIters = loopTrace.filter((s) => s.nodeId === "reviewer").map((s) => s.iteration);
  const loopFires = loopTrace.filter((s) => /loop-iteration/.test(s.reason)).length;
  log(`coder iterations: ${JSON.stringify(coderIters)}`);
  log(`reviewer iterations: ${JSON.stringify(reviewerIters)}`);
  log(`loop-iteration decisions: ${loopFires}`);

  // The real engine looped: coder/reviewer ran 3 passes (iter 1,2,3), 2 loop-backs.
  check("loop ran MULTIPLE iterations of coder (1,2,3)", JSON.stringify(coderIters) === "[1,2,3]");
  check("loop ran MULTIPLE iterations of reviewer (1,2,3)", JSON.stringify(reviewerIters) === "[1,2,3]");
  check("loop fired exactly twice (NOK,NOK) then stopped", loopFires === 2);
  check("loop stopped on reviewer decision OK", loopTrace.filter((s) => s.nodeId === "reviewer").pop()?.decision.includes("OK"));
  check("note never appears in the trace", !loopTrace.some((s) => s.nodeId === "note-loop"));

  // --- execution-order NUMBERING: follow who runs 1st, 2nd, ... ---
  const flux = (await page.getByTestId("flux").textContent()) || "";
  log(`flux: ${flux.replace(/\s+/g, " ").slice(0, 140)}`);
  check("flux shows the ordered sequence (1.planner … 7.coder …)",
    /1\s*\.\s*planner/.test(flux) && /7\s*\.\s*coder/.test(flux) && /12\s*\.\s*reviewer/.test(flux));
  const coderOrders = await page.getAttribute('[data-node-id="coder"]', "data-node-orders");
  check("coder node numbered by execution order (4,7,10)", coderOrders === "4,7,10");
  const loopOrderLabel = await page.$$eval('[data-edge-id="e-loop"] [data-testid="edge-order"]', (els) => els.map((e) => e.textContent));
  check("loop edge numbered with the moves that traversed it (6·9)", loopOrderLabel.join("") === "6·9");
  await page.screenshot({ path: "builder_council_loop.png", fullPage: false });
  log("screenshot -> builder_council_loop.png");

  // === COUNCIL gate v1 (fidelity example, no loop) ===
  await loadExample(page, "gate");
  await page.waitForSelector('[data-node-id="PLAN_REVIEW"]', { timeout: 8000 });
  const egGate = JSON.parse(await page.locator('[data-testid="engine-graph"]').textContent());
  check("gate v1 has the 3 real roles + no loop",
    egGate.nodes.some((n) => n.id === "PLAN_REVIEW") && egGate.nodes.some((n) => n.id === "RED_TEAM") &&
    egGate.nodes.some((n) => n.id === "DIVERGENCE") && !egGate.edges.some((e) => e.loop));
  await page.screenshot({ path: "builder_council_gate.png", fullPage: false });

  // === DECORATIVE edge: draw agent-side → note-side; displays but engine-excluded ===
  log("--- NOTE handles: draw coder(out) → note-loop(left handle), decorative only ---");
  await loadExample(page, "looped");
  await page.waitForSelector('[data-node-id="note-loop"]', { timeout: 8000 });

  // the note exposes 4 handles, same style as node handles
  const noteHandles = await page.$$eval('[data-node-id="note-loop"] .handle', (els) => els.length);
  check("note has 4 connection handles", noteHandles === 4);

  const pathsBefore = await page.$$eval('svg.edges path[marker-end]', (els) => els.length);
  const src = await page.locator('[data-handle-node="coder"][data-handle-side="right"]').boundingBox();
  const dst = await page.locator('[data-testid="note-handle-left"]').boundingBox();
  // draw: from coder's right handle to the note's LEFT handle
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 10 });
  await page.mouse.up();

  const pathsAfter = await page.$$eval('svg.edges path[marker-end]', (els) => els.length);
  check("decorative edge is DRAWN (a new edge path appears)", pathsAfter === pathsBefore + 1);

  const ui = await page.evaluate(() => window.__ui);
  const decoEdge = ui.edges.find((e) => e.from === "coder" && e.to === "note-loop");
  check("UI edge coder→note-loop exists in the canvas state", !!decoEdge);

  // The engine graph must exclude BOTH the note and the edge touching it.
  const egNote = JSON.parse(await page.locator('[data-testid="engine-graph"]').textContent());
  check("engine graph EXCLUDES the note node", !egNote.nodes.some((n) => n.id === "note-loop"));
  check("engine graph EXCLUDES the edge touching the note",
    !egNote.edges.some((e) => e.from === "note-loop" || e.to === "note-loop") &&
    (decoEdge ? !egNote.edges.some((e) => e.id === decoEdge.id) : false));
  await page.screenshot({ path: "builder_note_edge.png", fullPage: false });
  log("screenshot -> builder_note_edge.png");

  // === HANDLE-TO-HANDLE: connect any side to any side ===
  log("--- HANDLE→HANDLE: fresh canvas, draw agentA(bottom) → agentB(top) ---");
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  await page.getByTestId("add-agent").click();
  const ids = await page.$$eval('[data-node-type="agent"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  const [A, B] = ids;
  check("each node exposes 4 handles (top/bottom/left/right)",
    (await page.$$eval(`[data-node-id="${A}"] .handle`, (e) => e.length)) === 4);
  // Fresh nodes spawn overlapping — drag B clear so the handle drag is unambiguous.
  const bHead = await page.locator(`[data-node-id="${B}"] .nhead`).boundingBox();
  await page.mouse.move(bHead.x + bHead.width / 2, bHead.y + bHead.height / 2);
  await page.mouse.down();
  await page.mouse.move(700, 460, { steps: 10 });
  await page.mouse.up();
  const hFrom = await page.locator(`[data-handle-node="${A}"][data-handle-side="bottom"]`).boundingBox();
  const hTo = await page.locator(`[data-handle-node="${B}"][data-handle-side="top"]`).boundingBox();
  await page.mouse.move(hFrom.x + hFrom.width / 2, hFrom.y + hFrom.height / 2);
  await page.mouse.down();
  await page.mouse.move(hTo.x + hTo.width / 2, hTo.y + hTo.height / 2, { steps: 10 });
  await page.mouse.up();
  const ui2 = await page.evaluate(() => window.__ui);
  const h2h = ui2.edges.find((e) => e.from === A && e.to === B);
  check("edge connects the chosen sides (fromHandle=bottom, toHandle=top)",
    !!h2h && h2h.fromHandle === "bottom" && h2h.toHandle === "top");
  const eg2 = JSON.parse(await page.locator('[data-testid="engine-graph"]').textContent());
  const eng2 = eg2.edges.find((e) => e.from === A && e.to === B);
  check("engine edge drops UI-only fromHandle/toHandle",
    !!eng2 && !("fromHandle" in eng2) && !("toHandle" in eng2));
  await page.screenshot({ path: "builder_handle_to_handle.png", fullPage: false });

  // === LEGIBILITY: 8+ connected nodes with many crossing edges ===
  log("--- DENSE canvas: 8 nodes, 12 crossing edges — casing must keep it legible ---");
  await page.evaluate(() => {
    const roles = ['claude-planner', 'qwen-redteam', 'gemini-explorer', 'qwen-coder', 'tester', 'claude-reviewer', 'PLAN_REVIEW', 'RED_TEAM'];
    const pos = [[80, 70], [370, 70], [660, 70], [950, 70], [80, 360], [370, 360], [660, 360], [950, 360]];
    const nodes = pos.map((p, i) => ({ id: 'n' + (i + 1), type: 'agent', x: p[0], y: p[1], data: { role: roles[i] } }));
    // deliberately crossing edges (top row <-> bottom row, plus long diagonals)
    const pairs = [[1, 8], [2, 7], [3, 6], [4, 5], [1, 6], [2, 5], [3, 8], [4, 7], [1, 4], [5, 8], [2, 8], [3, 5]];
    const edges = pairs.map((pr, i) => ({ id: 'x' + i, from: 'n' + pr[0], to: 'n' + pr[1],
      fromHandle: pr[0] <= 4 ? 'bottom' : 'top', toHandle: pr[1] <= 4 ? 'bottom' : 'top' }));
    window.__setGraph(nodes, edges);
  });
  await page.waitForSelector('[data-node-id="n8"]', { timeout: 8000 });
  const denseNodes = await page.$$eval('.node', (els) => els.length);
  const denseLines = await page.$$eval('svg.edges path[marker-end]', (els) => els.length);
  const denseCasings = await page.$$eval('svg.edges path.edge-casing', (els) => els.length);
  log(`dense: ${denseNodes} nodes, ${denseLines} edges, ${denseCasings} casings`);
  check("dense canvas renders 8+ connected nodes", denseNodes >= 8);
  check("every edge has an occluding casing (crossing legibility)", denseCasings === denseLines && denseLines === 12);
  await page.screenshot({ path: "builder_dense_legible.png", fullPage: false });
  log("screenshot -> builder_dense_legible.png");

  // === DRAG: whole node is the drag surface (not just the header icon) ===
  log("--- DRAG whole node by its BODY + snap-to-grid ---");
  await loadExample(page, "looped");
  await page.waitForSelector('[data-node-id="planner"]', { timeout: 8000 });
  const before = (await page.evaluate(() => window.__ui.nodes)).find((n) => n.id === "planner");
  const body = await page.locator('[data-node-id="planner"] .nbody').boundingBox();
  await page.mouse.move(body.x + body.width / 2, body.y + body.height / 2);
  await page.mouse.down();
  await page.mouse.move(body.x + 180, body.y + 150, { steps: 12 });
  await page.mouse.up();
  const afterDrag = (await page.evaluate(() => window.__ui.nodes)).find((n) => n.id === "planner");
  check("node moves when dragged by its BODY (whole-node drag surface)",
    afterDrag.x !== before.x || afterDrag.y !== before.y);

  // snap-to-grid: toggle on, drag again, final position must land on the 24px grid.
  await page.getByTestId("btn-snap").click();
  check("snap toggle reflects ON state", (await page.getByTestId("btn-snap").getAttribute("aria-pressed")) === "true");
  const body2 = await page.locator('[data-node-id="planner"] .nbody').boundingBox();
  await page.mouse.move(body2.x + body2.width / 2, body2.y + body2.height / 2);
  await page.mouse.down();
  await page.mouse.move(body2.x + 133, body2.y + 97, { steps: 12 });
  await page.mouse.up();
  const snapped = (await page.evaluate(() => window.__ui.nodes)).find((n) => n.id === "planner");
  log(`snapped position: (${snapped.x}, ${snapped.y})`);
  check("snap-to-grid aligns node to 24px grid", snapped.x % 24 === 0 && snapped.y % 24 === 0);

  // ========================= UX PASS — 6 items =========================

  // Ensure snap is OFF for predictable geometry in the following checks.
  if ((await page.getByTestId("btn-snap").getAttribute("aria-pressed")) === "true") await page.getByTestId("btn-snap").click();

  // === ITEM 1 — Resize a node; handles stay glued to the corners ===
  log("--- ITEM 1: resize node, handles follow ---");
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const rid = (await page.evaluate(() => window.__ui.nodes))[0].id;
  const box0 = await page.locator(`[data-node-id="${rid}"]`).boundingBox();
  const rh = await page.locator(`[data-node-id="${rid}"] .resize-handle`).boundingBox();
  check("resize handle is visible (bottom-right)", !!rh);
  await page.mouse.move(rh.x + rh.width / 2, rh.y + rh.height / 2);
  await page.mouse.down();
  await page.mouse.move(rh.x + 130, rh.y + 90, { steps: 12 });
  await page.mouse.up();
  const box1 = await page.locator(`[data-node-id="${rid}"]`).boundingBox();
  check("node grows when resize handle is dragged", box1.width > box0.width + 80 && box1.height > box0.height + 50);
  const rHandle = await page.locator(`[data-handle-node="${rid}"][data-handle-side="right"]`).boundingBox();
  const bHandle = await page.locator(`[data-handle-node="${rid}"][data-handle-side="bottom"]`).boundingBox();
  const rCx = rHandle.x + rHandle.width / 2, bCy = bHandle.y + bHandle.height / 2;
  check("right handle stays glued to the resized right edge",
    Math.abs(rCx - (box1.x + box1.width)) < 10);
  check("bottom handle stays glued to the resized bottom edge",
    Math.abs(bCy - (box1.y + box1.height)) < 10);

  // === ITEM 2 — Note title editable inline ===
  log("--- ITEM 2: note title inline edit ---");
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-note").click();
  const noteId = (await page.evaluate(() => window.__ui.nodes))[0].id;
  await page.locator(`[data-node-id="${noteId}"] [data-testid="note-title"]`).dblclick();
  check("double-click title shows an inline input", await page.locator('[data-testid="note-title-input"]').isVisible());
  await page.locator('[data-testid="note-title-input"]').fill("Titre édité");
  await page.locator('[data-testid="note-title-input"]').press("Enter");
  const titleText = await page.locator(`[data-node-id="${noteId}"] [data-testid="note-title"]`).textContent();
  check("Enter commits the new title in the block", /Titre édité/.test(titleText || ""));
  const inspTitle = await page.getByTestId("note-title-field").inputValue();
  check("inspector stays in sync with the inline title", inspTitle === "Titre édité");

  // === ITEM 3 — Inspector: router panel + gate v1 agent panel ===
  log("--- ITEM 3: router inspector + council gate v1 inspector ---");
  await loadExample(page, "routing"); // routing example has a router
  await page.waitForSelector('[data-node-id="node-router"]', { timeout: 8000 });
  await page.locator('[data-node-id="node-router"] .nhead').click();
  check("router selected → dedicated router inspector", await page.locator('[data-testid="inspector-router"]').isVisible());
  check("router inspector shows path", (await page.getByTestId("router-path").inputValue()).includes("node-analyzer.intent"));
  check("router inspector shows defaultRoute", (await page.getByTestId("router-defaultRoute").inputValue()) === "chat");
  await loadExample(page, "gate");
  await page.waitForSelector('[data-node-id="PLAN_REVIEW"]', { timeout: 8000 });
  const voices = await page.$$eval('[data-node-type="agent"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  check("gate v1 exposes the 3 real voices on canvas",
    ["PLAN_REVIEW", "RED_TEAM", "DIVERGENCE"].every((v) => voices.includes(v)));
  await page.locator('[data-node-id="PLAN_REVIEW"] .nhead').click();
  check("gate v1 agent → agent inspector with RÉEL badge",
    (await page.locator('[data-testid="inspector-agent"]').isVisible()) &&
    (await page.getByTestId("agent-group").textContent()) === "RÉEL");

  // === ITEM 4 — Palette: + LLM simple (no sub-menu now) + Council subgraph ===
  log("--- ITEM 4: + LLM simple + Council subgraph ---");
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-llm").click();
  check("+ LLM has NO sub-menu anymore (composite moved to + Agent)", (await page.locator('[data-testid="llm-menu"]').count()) === 0);
  const llmNode = (await page.evaluate(() => window.__ui.nodes)).find((n) => n.type === "llm");
  check("+ LLM poses a single simple llm node (with a prompt)", !!llmNode && typeof llmNode.data.prompt === "string");
  const nBefore = (await page.evaluate(() => window.__ui.nodes)).length;
  await page.getByTestId("add-council").click();
  check("Council ▸ opens a selector with RÉEL + CIBLE badges",
    (await page.locator('[data-testid="council-menu"] .badge-real').count()) === 1 &&
    (await page.locator('[data-testid="council-menu"] .badge-target').count()) === 1);
  await page.getByTestId("council-gate").click();
  const nAfter = (await page.evaluate(() => window.__ui.nodes)).length;
  check("Council/Gate v1 poses a 3-node subgraph on the canvas", nAfter - nBefore === 3);

  // === ITEM 5 — Midpoint handle bends the edge (stores controlPoint) ===
  log("--- ITEM 5: midpoint handle → controlPoint ---");
  await loadExample(page, "routing");
  await page.waitForSelector('[data-testid="edge-mid"]', { timeout: 8000 });
  const midEdgeId = (await page.evaluate(() => window.__ui.edges))[0].id;
  check("midpoint handle is visible on an edge", await page.locator(`[data-testid="edge-mid"][data-edge-id="${midEdgeId}"]`).isVisible());
  const mid = await page.locator(`[data-testid="edge-mid"][data-edge-id="${midEdgeId}"]`).boundingBox();
  await page.mouse.move(mid.x + mid.width / 2, mid.y + mid.height / 2);
  await page.mouse.down();
  await page.mouse.move(mid.x + 60, mid.y + 70, { steps: 12 });
  await page.mouse.up();
  const bentEdge = (await page.evaluate(() => window.__ui.edges)).find((e) => e.id === midEdgeId);
  check("dragging the midpoint stores edge.controlPoint",
    !!bentEdge.controlPoint && typeof bentEdge.controlPoint.x === "number");

  // === ITEM 6 — handle safety ===
  log("--- ITEM 6: top→bottom edge valid + resize keeps edges + delete cleans edges ---");
  // 6b — top→bottom edge produces a valid (non-null from/to) edge.
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  await page.getByTestId("add-agent").click();
  const two = await page.$$eval('[data-node-type="agent"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  const bh = await page.locator(`[data-node-id="${two[1]}"] .nhead`).boundingBox();
  await page.mouse.move(bh.x + bh.width / 2, bh.y + bh.height / 2);
  await page.mouse.down(); await page.mouse.move(720, 480, { steps: 8 }); await page.mouse.up();
  const tFrom = await page.locator(`[data-handle-node="${two[0]}"][data-handle-side="top"]`).boundingBox();
  const bTo = await page.locator(`[data-handle-node="${two[1]}"][data-handle-side="bottom"]`).boundingBox();
  await page.mouse.move(tFrom.x + tFrom.width / 2, tFrom.y + tFrom.height / 2);
  await page.mouse.down();
  await page.mouse.move(bTo.x + bTo.width / 2, bTo.y + bTo.height / 2, { steps: 10 });
  await page.mouse.up();
  const topBottom = (await page.evaluate(() => window.__ui.edges)).find((e) => e.from === two[0] && e.to === two[1]);
  check("6b: top→bottom edge is valid (from/to both non-null)",
    !!topBottom && topBottom.from != null && topBottom.to != null && topBottom.fromHandle === "top" && topBottom.toHandle === "bottom");
  // 6c: resize a connected node — no orphan edges (all from/to still resolve).
  await loadExample(page, "looped");
  await page.waitForSelector('[data-node-id="coder"] .resize-handle', { timeout: 8000 });
  const crh = await page.locator('[data-node-id="coder"] .resize-handle').boundingBox();
  await page.mouse.move(crh.x + crh.width / 2, crh.y + crh.height / 2);
  await page.mouse.down(); await page.mouse.move(crh.x + 120, crh.y + 90, { steps: 10 }); await page.mouse.up();
  const orphan = await page.evaluate(() => {
    const ids = new Set(window.__ui.nodes.map((n) => n.id));
    return window.__ui.edges.some((e) => !ids.has(e.from) || !ids.has(e.to));
  });
  check("6c: resizing a connected node creates NO orphan edges", orphan === false);
  // delete a node → its edges are removed.
  const edgesBeforeDel = (await page.evaluate(() => window.__ui.edges)).length;
  await page.locator('[data-node-id="coder"] .nhead').click();
  await page.getByRole("button", { name: /Supprimer le nœud/ }).click();
  const afterDel = await page.evaluate(() => ({
    hasCoder: window.__ui.nodes.some((n) => n.id === "coder"),
    danglers: window.__ui.edges.filter((e) => e.from === "coder" || e.to === "coder").length,
    edges: window.__ui.edges.length,
  }));
  check("deleting a node removes it and all its edges",
    !afterDel.hasCoder && afterDel.danglers === 0 && afterDel.edges < edgesBeforeDel);
  await page.screenshot({ path: "builder_ux_pass.png", fullPage: false });

  // ========================= WIRE MAP — traceability =========================
  log("--- WIRE MAP: tab, projects, compact, audit-coherence, colour dropdown, no bidir link ---");

  // (1) tab visible + clickable
  check("Wire Map tab present", await page.getByTestId("tab-wiremap").isVisible());
  await page.getByTestId("tab-wiremap").click();
  check("Wire Map view opens", await page.locator('[data-testid="wiremap"]').isVisible());

  // (2) project dropdown loaded from GET /api/wireframes (>=1)
  const projOpts = await page.$$eval('[data-testid="wm-project-select"] option', (els) => els.map((e) => e.value));
  check("projects dropdown lists >=1 project (llm-lego)", projOpts.includes("llm-lego"));
  check("12 entries loaded for llm-lego (8 historiques + selector/library/wiremap-corr/recenter)", (await page.$$eval('[data-testid="wm-row"]', (e) => e.length)) === 12);

  // Compact layout: the feature names must be readable with NO horizontal scroll.
  const wmScroll = await page.$eval('[data-testid="wm-scroll"]', (el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  check("compact table: no horizontal scroll", wmScroll.sw <= wmScroll.cw + 2);
  const nodeNames = await page.$$eval('[data-testid="wm-row"] [data-testid="wm-node"]', (els) => els.map((e) => e.textContent.trim()));
  check("all 12 feature names present & non-empty", nodeNames.length === 12 && nodeNames.every((n) => n.length > 0));
  const nodeCellsOk = await page.$$eval('[data-testid="wm-row"] .wm-node-name', (els) => els.every((e) => e.scrollWidth <= e.clientWidth + 1));
  check("Nœud column not truncated (fits its cell)", nodeCellsOk);
  const collapsedByDefault = await page.$$eval('[data-testid="wm-detail"]', (e) => e.length);
  check("compact by default (no detail rows open on mapped entries)", collapsedByDefault === 0);
  const firstEid = await page.$eval('[data-testid="wm-row"]', (el) => el.getAttribute("data-entry-id"));
  await page.getByTestId("wm-expand-" + firstEid).click();
  check("clicking ▸ Détails reveals a 2-col detail row", (await page.$$eval('[data-testid="wm-detail"]', (e) => e.length)) === 1);
  await page.getByTestId("wm-expand-" + firstEid).click(); // collapse again

  // CORRECTION 1 — audit counts the PROJECT's entries, not the canvas. Canvas is
  // empty here, yet llm-lego has 12 mapped entries → report must say 12/12,
  // coherent with the table above it.
  await page.getByTestId("wm-audit").click();
  const auditLL = await page.locator('[data-testid="wm-audit-report"]').textContent();
  check("Corr1: audit coherent with table — 12/12 mapped (not canvas-derived)", /Nœuds mappés\s*:\s*12\/12/.test(auditLL));
  await page.screenshot({ path: "builder_wiremap_compact.png", fullPage: false });
  log("screenshot -> builder_wiremap_compact.png");

  // CORRECTION 2 — no canvas↔WireMap bidirectional link.
  check("Corr2: no canvas-selecting node link in the table (removed)", (await page.$$eval('[data-testid="wm-node-link"]', (e) => e.length)) === 0);

  // CORRECTION 3 — the snap-to-grid toggle is NOT in the toolbar's view cluster.
  check("Corr3: snap toggle removed from toolbar", (await page.$$eval('.toolbar [data-testid="btn-snap"]', (e) => e.length)) === 0);
  check("Corr3: snap toggle lives in a canvas-settings area", await page.getByTestId("btn-snap").isVisible());

  // (10) path traversal guard — do it now via same-origin fetch
  const travStatus = await page.evaluate(async () => (await fetch('/api/repo/file?path=../package.json')).status);
  check("path traversal outside llm-lego is rejected (403)", travStatus === 403);

  // (3) create a new project via the modal → server file created
  await page.getByTestId("wm-new-project").click();
  await page.getByTestId("wm-new-name").fill("Test Project");
  await page.getByTestId("wm-new-submit").click();
  await page.waitForFunction(() => {
    const s = document.querySelector('[data-testid="wm-project-select"]');
    return s && s.value === "test-project";
  }, null, { timeout: 6000 });
  const listAfter = await page.evaluate(async () => (await (await fetch('/api/wireframes')).json()).projects.map((p) => p.id));
  check("new project 'test-project' created server-side", listAfter.includes("test-project"));

  // RECENTER — put a real graph on the canvas. The Wire Map is a software
  // roadmap, NOT a canvas mirror: it must stay completely independent of `nodes`.
  await page.getByTestId("tab-canvas").click();
  await loadExample(page, "looped");
  await page.getByTestId("tab-wiremap").click();
  check("recenter: canvas graph produces ZERO NON MAPPÉ rows", (await page.$$eval('[data-testid="wm-unmapped-row"]', (e) => e.length)) === 0);
  check("recenter: no '+ mapper' buttons anywhere", (await page.$$eval('[data-testid^="wm-map-"]', (e) => e.length)) === 0);
  const tpRows0 = await page.$$eval('[data-testid="wm-row"]', (e) => e.length); // test-project rows (unrelated to canvas)
  check("recenter: test-project table unaffected by canvas graph", tpRows0 === 0);

  // (4) add an entry — MANUAL and BLANK; NEVER derived from the canvas selection.
  await page.getByTestId("tab-canvas").click();
  await page.locator('[data-node-id="coder"] .nhead').click(); // select coder on the canvas
  await page.getByTestId("tab-wiremap").click();
  await page.getByTestId("wm-add-entry").click();
  const rowsAfterAdd = await page.$$eval('[data-testid="wm-row"]', (e) => e.length);
  check("adding an entry inserts a row in the table", rowsAfterAdd === tpRows0 + 1);
  const eid = await page.$eval('[data-testid="wm-row"]', (el) => el.getAttribute("data-entry-id"));
  const addedNodeId = await page.$eval(`[data-testid="wm-row"][data-entry-id="${eid}"]`, (el) => el.getAttribute("data-node-id"));
  check("recenter: added entry is NOT canvas-derived (blank nodeId, not 'coder')", (addedNodeId || "") === "");

  // CORRECTION 4 — colour is a closed 3-choice dropdown (green/orange/red),
  // purely informative (changes the badge only). Exercised on the manual entry.
  const colorSel = page.locator(`[data-testid="wm-color-${eid}"]`);
  check("Corr4: colour cell is a <select>", (await colorSel.evaluate((el) => el.tagName)) === "SELECT");
  const colorOpts = await colorSel.locator("option").evaluateAll((os) => os.map((o) => o.value));
  check("Corr4: exactly 3 colour choices (green/orange/red)", JSON.stringify(colorOpts) === JSON.stringify(["green", "orange", "red"]));
  await colorSel.selectOption("red");
  const badgeBg = await page.$eval(`[data-testid="wm-row"][data-entry-id="${eid}"] [data-testid="wm-badge"]`, (el) => getComputedStyle(el).backgroundColor);
  check("Corr4: choosing red turns the badge red", /239,\s*68,\s*68/.test(badgeBg));

  // CORRECTION 2 — selecting a canvas node must NOT highlight any Wire Map row.
  await page.getByTestId("tab-canvas").click();
  await page.locator('[data-node-id="coder"] .nhead').click();
  await page.getByTestId("tab-wiremap").click();
  check("Corr2: selecting a canvas node highlights NO Wire Map row", (await page.$$eval('table.wm-t tr.hl', (e) => e.length)) === 0);

  // (9) audit report
  await page.getByTestId("wm-audit").click();
  const auditVisible = await page.locator('[data-testid="wm-audit-report"]').isVisible();
  const auditText = auditVisible ? await page.locator('[data-testid="wm-audit-report"]').textContent() : "";
  check("audit produces a coverage report", auditVisible && /Couverture/.test(auditText) && /Nœuds mappés/.test(auditText));
  await page.screenshot({ path: "builder_wiremap_validated.png", fullPage: false });
  log("screenshot -> builder_wiremap_validated.png");

  // back to canvas for the remaining (canvas-based) checks
  await page.getByTestId("tab-canvas").click();

  // --- Invalid graph: two start nodes -> engine 400 -> readable banner ---
  log("--- INVALID: clear, add two unconnected tool nodes -> engine must 400 ---");
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-tool").click();
  await page.getByTestId("add-tool").click();
  await page.getByTestId("btn-execute").click();
  await page.waitForSelector('[data-testid="error-banner"]', { timeout: 8000 });
  const bannerText = await page.getByTestId("error-banner").textContent();
  log(`error banner: ${JSON.stringify(bannerText)}`);
  check("invalid graph shows engine 400 (one start node)", /one start node/i.test(bannerText || ""));
  await page.screenshot({ path: "builder_run3_invalid.png", fullPage: false });

  // The invalid-graph test deliberately triggers a 400; the browser logs that
  // network response as a console "error". That is EXPECTED, not a JS fault — so
  // filter it out and only fail on genuine uncaught JS / page errors.
  const realErrors = consoleErrors.filter(
    (e) => !/Failed to load resource/.test(e) && !/status of 400/.test(e),
  );
  check("no uncaught JS/page errors (expected 400 ignored)", realErrors.length === 0);
  if (consoleErrors.length) log(`console messages (incl. expected 400): ${JSON.stringify(consoleErrors.slice(0, 5))}`);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL CHECKS PASSED ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  log(`THROWN: ${e.message}`);
  out.error = e.message;
} finally {
  await browser.close();
  writeFileSync("builder_validation_result.json", JSON.stringify(out, null, 2), "utf-8");
  log("wrote builder_validation_result.json");
  process.exit(out.pass ? 0 : 1);
}

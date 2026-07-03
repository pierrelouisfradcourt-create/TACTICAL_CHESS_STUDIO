// Onboarding-wall fixes validation:
//  #1 edge discoverability (bigger hit zone, hover halo, contextual hint, edge draw)
//  #2 humanized graph-validation error (+ technical detail preserved)
//  #3 anti-superposition cascade on palette pose
// Plus regression: double-run search/chat.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

async function dragHandleToNode(aId, side, bId) {
  const h = await page.locator(`[data-node-id="${aId}"] .handle.${side}`).boundingBox();
  const b = await page.locator(`[data-node-id="${bId}"]`).boundingBox();
  if (!h || !b) return false;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  return true;
}
async function runWith(query) {
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-tool"]', { timeout: 20000 });
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();

  // ---- Friction #3: cascade positions (pose 3 nodes) ----
  await page.getByTestId("add-tool").click();
  await page.getByTestId("add-llm").click();
  await page.getByTestId("add-router").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 3, null, { timeout: 4000 });
  const pos = await page.evaluate(() => window.__ui.nodes.map((n) => n.x + "," + n.y));
  const distinct = new Set(pos).size === pos.length;
  check("#3 anti-superposition: 3 posed nodes have distinct positions", distinct);
  log("  positions: " + JSON.stringify(pos));

  // ---- Friction #1: connect-hint visible (nodes present, no edge yet) ----
  check("#1 connect-hint shown when nodes exist but no edge (cascade nodes)", await page.getByTestId("connect-hint").isVisible());

  // Place two NON-overlapping nodes so handles aren't occluded (isolate the fix from
  // the overlap confound; edge-draw itself is exercised by dragging a real handle).
  await page.evaluate(() => window.__setGraph(
    [{ id: "A", type: "tool", x: 100, y: 140, data: { name: "search" } },
     { id: "B", type: "llm", x: 620, y: 140, data: { prompt: "p" } }],
    [],
  ));
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 2, null, { timeout: 3000 });
  check("#1 connect-hint still shown (2 nodes, 0 edge)", await page.getByTestId("connect-hint").isVisible());

  // Hit zone: the enlarged ::before ring exists on a draggable handle.
  const hitRing = await page.evaluate(() => {
    const h = document.querySelector('[data-node-id="A"] .handle.right');
    const before = h ? getComputedStyle(h, "::before") : null;
    return before ? { content: before.content, inset: before.inset || before.top } : null;
  });
  check("#1 handle has an enlarged hit ring (::before present)", !!hitRing && (hitRing.content === '""' || hitRing.content === "\"\""));

  // Hover feedback: box-shadow halo + crosshair on the (now unoccluded) handle.
  const hbox = await page.locator('[data-node-id="A"] .handle.right').boundingBox();
  await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + hbox.height / 2);
  await page.waitForTimeout(200);
  const hover = await page.evaluate(() => {
    const h = document.querySelector('[data-node-id="A"] .handle.right');
    const cs = getComputedStyle(h);
    return { boxShadow: cs.boxShadow, cursor: cs.cursor };
  });
  check("#1 hover feedback: halo (box-shadow) on handle hover", hover.boxShadow && hover.boxShadow !== "none");
  check("#1 handle cursor is crosshair (connect affordance)", hover.cursor === "crosshair");

  // Edge draw from a handle → edge created (mechanism regression), hint then disappears.
  const beforeEdges = await page.$$eval("svg.edges path[marker-end]", (e) => e.length);
  await dragHandleToNode("A", "right", "B");
  await page.waitForTimeout(250);
  const afterEdges = await page.$$eval("svg.edges path[marker-end]", (e) => e.length);
  check("#1 dragging FROM a handle to a node creates an edge", afterEdges === beforeEdges + 1);
  check("#1 connect-hint disappears once an edge exists", (await page.$$eval('[data-testid="connect-hint"]', (e) => e.length)) === 0);
  await page.screenshot({ path: "builder_onboarding.png", fullPage: false });

  // ---- Friction #2: humanized error (3 disconnected nodes → many start nodes) ----
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-tool").click();
  await page.getByTestId("add-llm").click();
  await page.getByTestId("add-router").click();
  await page.getByTestId("input-json").fill("{}");
  await page.getByTestId("btn-execute").click();
  await page.waitForSelector('[data-testid="error-banner"]', { timeout: 8000 });
  const human = (await page.getByTestId("error-human").textContent()) || "";
  log("  human error: " + JSON.stringify(human));
  check("#2 'start node' error is humanized (actionable French, not raw)",
    /nœuds de départ|point de départ/i.test(human) && !/exactly one start node/i.test(human));
  check("#2 technical detail preserved (collapsible)", await page.getByTestId("error-technical").isVisible());
  const tech = (await page.getByTestId("error-technical").textContent()) || "";
  check("#2 technical detail still contains the raw engine message", /exactly one start node/i.test(tech));

  // Bonus #2: multiple-outgoing-on-non-router → node-named humanized message.
  // Inject the exact invalid shape (agent 'x' → two tools) so the engine emits the
  // "Node x ... Only router" error; we verify the UI humanizes it (mentions Routeur).
  await page.evaluate(() => window.__setGraph(
    [{ id: "x", type: "agent", x: 100, y: 100, data: {} },
     { id: "t1", type: "tool", x: 100, y: 320, data: { name: "a" } },
     { id: "t2", type: "tool", x: 400, y: 320, data: { name: "b" } }],
    [{ id: "ex1", from: "x", to: "t1" }, { id: "ex2", from: "x", to: "t2" }],
  ));
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 3, null, { timeout: 3000 });
  await page.getByTestId("input-json").fill("{}");
  await page.getByTestId("btn-execute").click();
  await page.waitForSelector('[data-testid="error-banner"]', { timeout: 8000 });
  const human2 = (await page.getByTestId("error-human").textContent()) || "";
  log("  human error 2: " + JSON.stringify(human2));
  check("#2 multi-output non-router error humanized (mentions Routeur/flèches sortantes)", /Routeur|flèches sortantes/i.test(human2));

  // ---- Regression: double-run search/chat ----
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL ONBOARDING CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("onboarding_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

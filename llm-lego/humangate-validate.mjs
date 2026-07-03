// HumanGate UI validation — palette + inspector, pause panel (with/without rule),
// approve completes the trace, reject stops with a rejected state, and the node
// shows its state. Plus regressions (double-run, Wire Map 12, library 11 kinds).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p) => { const r = await fetch(BASE + p); return r.json().catch(() => null); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

// Inject a gated graph via the existing __setGraph test seam (reliable vs drag-drawing edges).
async function injectGate(gateData) {
  await page.evaluate((gd) => {
    window.__setGraph(
      [
        { id: "a", type: "llm", x: 40, y: 60, data: { prompt: "p", outputKey: "a" } },
        { id: "g", type: "humangate", x: 300, y: 60, data: gd },
        { id: "t", type: "llm", x: 560, y: 60, data: { prompt: "tail", outputKey: "t" } },
      ],
      [{ id: "e1", from: "a", to: "g" }, { id: "e2", from: "g", to: "t" }],
    );
  }, gateData);
  await page.getByTestId("input-json").fill('{"q":"x"}');
}
async function runToPause() {
  await page.getByTestId("btn-execute").click();
  await page.waitForSelector('[data-testid="humangate-pause"]', { timeout: 8000 });
}
async function loadExample(key) { await page.getByTestId("example-dropdown").click(); await page.getByTestId("example-" + key).click(); }
async function runWith(query) {
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-humangate"]', { timeout: 20000 });

  // 1) Palette + inspector: pose a HumanGate, toggle actsAsOracle → node 🛡️ badge.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-humangate").click();
  const gid = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "humangate").id);
  check("palette '+ HumanGate' poses a humangate node", !!gid);
  await page.locator(`[data-node-id="${gid}"] .nhead`).click();
  check("dedicated HumanGate inspector shown (message/rule/context)", await page.getByTestId("inspector-humangate").isVisible() && await page.getByTestId("hg-message").isVisible() && await page.getByTestId("hg-rule").isVisible());
  await page.getByTestId("hg-actsAsOracle").check();
  check("actsAsOracle → node shows 🛡️ badge", /🛡️/.test((await page.locator(`[data-testid="node-gate-${gid}"]`).textContent()) || ""));

  // 2) Pause flow WITHOUT rule (simple stop) → generic pause, no rule shown, buttons active.
  await injectGate({ message: "Valide-t-on la sortie ?", rule: "", context: [], actsAsOracle: false });
  await runToPause();
  check("pause panel shows the message", /Valide-t-on la sortie/.test((await page.getByTestId("humangate-pause").textContent()) || ""));
  check("no-rule gate → no rule line shown", (await page.$$eval('[data-testid="hg-rule-shown"]', (e) => e.length)) === 0);
  check("approve/reject buttons active", !(await page.getByTestId("hg-approve").isDisabled()) && !(await page.getByTestId("hg-reject").isDisabled()));
  check("gate node shows '⏸️ en attente' during pause", /en attente/.test((await page.locator('[data-testid="node-gate-state-g"]').textContent()) || ""));

  // 3) Approve → trace completes to the end, pause panel gone.
  await page.getByTestId("hg-approve").click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="trace-step"]').length === 3, null, { timeout: 8000 });
  const traceAfterApprove = await page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  check("approve → full trace a,g,t", JSON.stringify(traceAfterApprove) === JSON.stringify(["a", "g", "t"]));
  check("approve → pause panel gone", (await page.$$eval('[data-testid="humangate-pause"]', (e) => e.length)) === 0);
  check("approve → gate node shows '✅ approuvé'", /approuvé/.test((await page.locator('[data-testid="node-gate-state-g"]').textContent()) || ""));

  // 4) Pause flow WITH rule (actsAsOracle) → badge + rule shown; Reject → stops.
  await injectGate({ message: "Sortie conforme au schéma ?", rule: "doit être un JSON avec intent", context: ["a"], actsAsOracle: true });
  await runToPause();
  check("rule gate → 🛡️ oracle badge shown in pause panel", await page.getByTestId("hg-oracle-badge").isVisible());
  check("rule gate → rule text shown in pause panel", /doit être un JSON avec intent/.test((await page.getByTestId("hg-rule-shown").textContent()) || ""));
  await page.screenshot({ path: "builder_humangate_pause.png", fullPage: false });
  await page.getByTestId("hg-note").fill("non conforme");
  await page.getByTestId("hg-reject").click();
  await page.waitForSelector('[data-testid="humangate-rejected"]', { timeout: 8000 });
  const traceAfterReject = await page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  check("reject → trace stops at gate (a,g — tail NOT run)", JSON.stringify(traceAfterReject) === JSON.stringify(["a", "g"]));
  check("reject → 'rejeté' banner + gate node state", /rejeté/.test((await page.locator('[data-testid="node-gate-state-g"]').textContent()) || ""));

  // 5) REGRESSION: double-run search/chat (NO humangate) unchanged.
  await page.getByTestId("btn-clear").click();
  await loadExample("routing");
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("REGRESSION double-run: search → node-search (no pause)", r1.includes("node-search") && !r1.includes("node-chat") && (await page.$$eval('[data-testid="humangate-pause"]', (e) => e.length)) === 0);
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  // 6) REGRESSION: Wire Map 12, library 11 kinds reachable.
  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 12 entries", (wm?.entries || []).length === 12);
  await page.getByTestId("tab-library").click();
  const kinds = await page.$$eval('[data-testid="lib-filter"] option', (els) => els.map((e) => e.value));
  check("REGRESSION: library filter offers all 11 kinds + Tous", JSON.stringify(kinds) === JSON.stringify(["all", "agent", "prompt", "chain", "oracle", "roadmap", "goal", "outputformat", "router", "tool", "note", "artefact"]));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL HUMANGATE UI CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("humangate_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

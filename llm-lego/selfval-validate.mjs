// No-self-validation (Oracle) validation — UI blocks attaching an Oracle to a node
// whose producerRef === that Oracle's brick id (same brick produces AND judges);
// legit cross-validation still works; the API refuses a self-validating graph too;
// HumanGate is untouched. Plus regressions.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { assertTestLibrary } from "./_test-guard.mjs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
const post = (doc) => api("/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

async function openBrick(id) {
  await page.getByTestId("lib-open-" + id).click();
  await page.waitForFunction((i) => document.querySelector('[data-testid="lib-id"]')?.value === i, id, { timeout: 4000 });
}
async function selectNodeWithProducer(nodeId, producerRef) {
  await page.getByTestId("tab-canvas").click();
  await page.evaluate(({ id, pr }) => window.__setGraph([{ id, type: "agent", x: 120, y: 140, data: pr ? { producerRef: pr } : {} }], []), { id: nodeId, pr: producerRef });
  await page.waitForFunction((id) => (window.__ui?.nodes || []).some((n) => n.id === id), nodeId, { timeout: 3000 });
  await page.locator(`[data-node-id="${nodeId}"] .nhead`).click();
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
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });
  { const cur = await api("/api/library"); assertTestLibrary(cur.json, "selfval"); for (const b of (cur.json?.bricks || [])) if (b.kind === "oracle") await api("/api/library/" + b.id, { method: "DELETE" }); }
  await post({ id: "oracle-selftest", kind: "oracle", name: "Oracle Selftest", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { prompt: "check", verdictField: "verdict", expectedValues: ["PASS", "FAIL"], rule: "r", category: "", attachableTo: ["agent", "llm", "tool"], model: "qwen", temperature: 0.2 }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });

  // 1) SELF-VALIDATION (producerRef === oracle brick id) → attach DISABLED + message.
  await selectNodeWithProducer("nodeSelf", "oracle-selftest");
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("oracle");
  await openBrick("oracle-selftest");
  check("self-validation → attach button DISABLED", await page.getByTestId("lib-attach").isDisabled());
  check("self-validation → explicit message shown", await page.getByTestId("oracle-selfval-msg").isVisible());
  const msg = (await page.getByTestId("oracle-selfval-msg").textContent()) || "";
  check("self-validation message is the governance text", /nœud DIFFÉRENT|agent indépendant/i.test(msg));
  check("self-validation → NO cross-validation confirmation shown", (await page.$$eval('[data-testid="oracle-crossval"]', (e) => e.length)) === 0);

  // 2) LEGIT CROSS-VALIDATION (producer differs) → attach ENABLED + confirmation, works.
  await selectNodeWithProducer("nodeIndep", "agent-independent");
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("oracle");
  await openBrick("oracle-selftest");
  check("cross-validation → attach button ENABLED", !(await page.getByTestId("lib-attach").isDisabled()));
  check("cross-validation → confirmation shown", await page.getByTestId("oracle-crossval").isVisible());
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction(() => { const n = (window.__ui?.nodes || []).find((x) => x.id === "nodeIndep"); return n && n.data && n.data.oracleRef === "oracle-selftest"; }, null, { timeout: 5000 });
  check("cross-validation → oracle actually attached (node.data.oracleRef set)", true);

  // 2b) Also legit: a raw node (producerRef falls back to node id) ≠ oracle id → allowed.
  await selectNodeWithProducer("nodeRaw", null);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("oracle");
  await openBrick("oracle-selftest");
  check("raw node (producerRef=node id) → attach ENABLED (not self-validation)", !(await page.getByTestId("lib-attach").isDisabled()));

  // 3) API refuses a self-validating graph (no bypass), accepts a cross-validating one.
  const apiSelf = await page.evaluate(async () => {
    const r = await fetch("/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ graph: { nodes: [{ id: "n", type: "agent", data: { producerRef: "b", oracleRef: "b" } }], edges: [] }, initialInput: {} }) });
    return { status: r.status, json: await r.json() };
  });
  check("API blocks self-validating graph (400 + success:false)", apiSelf.status === 400 && apiSelf.json.success === false && /Auto-validation interdite/.test(apiSelf.json.error));
  const apiCross = await page.evaluate(async () => {
    const r = await fetch("/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ graph: { nodes: [{ id: "n", type: "agent", data: { producerRef: "prod", oracleRef: "orac" } }], edges: [] }, initialInput: {} }) });
    return { status: r.status, json: await r.json() };
  });
  check("API allows cross-validating graph (success:true)", apiCross.status === 200 && apiCross.json.success === true);

  // 4) HumanGate untouched: a gated graph still pauses (behaviour unchanged).
  await page.getByTestId("tab-canvas").click();
  await page.evaluate(() => window.__setGraph(
    [{ id: "a", type: "llm", x: 40, y: 60, data: { prompt: "p", outputKey: "a" } },
     { id: "g", type: "humangate", x: 300, y: 60, data: { message: "ok?" } },
     { id: "t", type: "llm", x: 560, y: 60, data: { prompt: "tail" } }],
    [{ id: "e1", from: "a", to: "g" }, { id: "e2", from: "g", to: "t" }]));
  await page.getByTestId("input-json").fill('{"q":"x"}');
  await page.getByTestId("btn-execute").click();
  await page.waitForSelector('[data-testid="humangate-pause"]', { timeout: 8000 });
  check("HumanGate untouched: gated graph still pauses (approve/reject shown)", await page.getByTestId("hg-approve").isVisible());
  await page.getByTestId("hg-approve").click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="trace-step"]').length === 3, null, { timeout: 8000 });
  check("HumanGate untouched: approve completes the run", true);

  // cleanup
  await api("/api/library/oracle-selftest", { method: "DELETE" });

  // 5) Regression: double-run search/chat.
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
  log(out.pass ? "\n=== ALL SELF-VALIDATION CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("selfval_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

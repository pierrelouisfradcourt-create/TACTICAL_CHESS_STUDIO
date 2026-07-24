// Library Passe 4 validation — kind "oracle": multi-kind list/filter/editor, the
// "🛡️ Attacher comme gardien" action (active/disabled + attachableTo compatibility),
// oracleRef transmitted inert in the engine graph while attachedOracle is dropped,
// duplication. Plus regressions (double-run, Wire Map 12, other kinds' attach).
// (Named *oracle-brick* to avoid the pre-existing oracle-validate.mjs Qwen harness.)
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { assertTestLibrary } from "./_test-guard.mjs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

async function fillLib(testid, value) {
  await page.getByTestId(testid).fill(value);
  await page.waitForFunction(({ t, v }) => document.querySelector(`[data-testid="${t}"]`)?.value === v, { t: testid, v: value }, { timeout: 4000 });
  await page.waitForTimeout(120);
}
async function saveBrickUI(expectName) {
  await page.getByTestId("lib-save").click();
  await page.waitForFunction((n) => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("« " + n + " » sauvegardée"), expectName, { timeout: 6000 });
}
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
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });
  { const cur = await api("/api/library"); assertTestLibrary(cur.json, "oracle-brick"); for (const b of (cur.json?.bricks || [])) if (b.kind === "oracle") await api("/api/library/" + b.id, { method: "DELETE" }); }
  await page.getByTestId("tab-library").click();

  // 1) Create an oracle via + Nouveau ▾ → Oracle → conditional editor.
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-oracle").click();
  await page.waitForSelector('[data-testid="lib-editor-oracle"]', { timeout: 4000 });
  check("editor is oracle-specific (lib-editor-oracle)", (await page.$$eval('[data-testid="lib-editor-agent"], [data-testid="lib-editor-prompt"], [data-testid="lib-editor-chain"]', (e) => e.length)) === 0);
  check("oracle editor exposes all payload fields", await page.getByTestId("lib-oracle-prompt").isVisible() && await page.getByTestId("lib-oracle-rule").isVisible() && await page.getByTestId("lib-oracle-verdictField").isVisible() && await page.getByTestId("lib-oracle-expected").isVisible() && await page.getByTestId("lib-oracle-model").isVisible() && await page.getByTestId("lib-oracle-temperature").isVisible());
  check("attachableTo checkboxes present (llm/tool/agent/router)", await page.getByTestId("lib-oracle-attach-llm").isVisible() && await page.getByTestId("lib-oracle-attach-router").isVisible());
  await fillLib("lib-name", "Test Oracle E2E");
  await fillLib("lib-oracle-rule", "output must be valid JSON {intent: string}");
  await fillLib("lib-category", "structural");
  await saveBrickUI("Test Oracle E2E");

  const list1 = await api("/api/library");
  const oSummary = (list1.json?.bricks || []).find((b) => b.name === "Test Oracle E2E");
  check("oracle appears in GET /api/library with kind=oracle", !!oSummary && oSummary.kind === "oracle");
  const oid = oSummary?.id;
  const odoc = oid ? (await api("/api/library/" + oid)).json : null;
  check("oracle file has payload (rule, verdictField, expectedValues, attachableTo, model)",
    odoc?.payload?.rule === "output must be valid JSON {intent: string}" &&
    odoc?.payload?.verdictField === "verdict" &&
    JSON.stringify(odoc?.payload?.expectedValues) === JSON.stringify(["PASS", "FAIL"]) &&
    Array.isArray(odoc?.payload?.attachableTo) && odoc?.payload?.attachableTo.includes("agent") &&
    typeof odoc?.payload?.model === "string");

  // 2) Filter "Oracle" isolates.
  await page.getByTestId("lib-filter").selectOption("oracle");
  await page.waitForTimeout(150);
  const oracleRows = await page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.map((e) => e.getAttribute("data-kind")));
  check("filter Oracle → only oracle rows", oracleRows.length >= 1 && oracleRows.every((k) => k === "oracle"));

  // 3) Attach as guardian to a COMPATIBLE node (agent ∈ attachableTo).
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click(); // auto-selected; agent is in attachableTo
  const agId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("oracle");
  await openBrick(oid);
  const label = await page.getByTestId("lib-attach").textContent();
  check("guardian attach ACTIVE for compatible node, names it", !(await page.getByTestId("lib-attach").isDisabled()) && /gardien/.test(label) && label.includes(agId));
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction((id) => { const n = (window.__ui?.nodes || []).find((x) => x.id === id); return n && n.data && n.data.oracleRef; }, agId, { timeout: 5000 });
  const nodeInfo = await page.evaluate((id) => { const n = window.__ui.nodes.find((x) => x.id === id); return { oracleRef: n.data.oracleRef, attached: n.attachedOracle }; }, agId);
  check("attach → node.data.oracleRef = brick id", nodeInfo.oracleRef === oid);
  check("attach → node shows guardian badge", await page.locator(`[data-testid="node-oracle-${agId}"]`).isVisible());
  check("attach → switched to Canvas view", await page.getByTestId("tab-canvas").evaluate((el) => !el.classList.contains("ghost")));

  // 4) toEngineGraph: oracleRef TRANSMITTED (inert), attachedOracle DROPPED.
  const eg = await page.evaluate(() => JSON.stringify(window.toEngineGraph(window.__ui.nodes, window.__ui.edges)));
  check("oracleRef transmitted inert in engine graph (documented choice)", eg.includes("oracleRef"));
  check("attachedOracle (UI label) excluded from engine graph", !eg.includes("attachedOracle"));

  // 5) Incompatible node (router ∉ attachableTo) → guardian button DISABLED.
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-router").click(); // auto-selected; router NOT in default attachableTo
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("oracle");
  await openBrick(oid);
  check("guardian attach DISABLED for incompatible node (router)", await page.getByTestId("lib-attach").isDisabled());
  check("disabled guardian has explicit hint + Canvas link", /Sélectionne un nœud/.test((await page.getByTestId("lib-attach").textContent()) || "") && await page.getByTestId("lib-attach-goto").isVisible());

  // 6) Duplicate oracle → new id, draft, payload identical.
  const origPayload = (await api("/api/library/" + oid)).json?.payload;
  await page.getByTestId("lib-dup-" + oid).click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("Dupliqué"), null, { timeout: 5000 });
  const list2 = await api("/api/library");
  const dup = (list2.json?.bricks || []).find((b) => b.name === "Test Oracle E2E" && b.id !== oid && b.kind === "oracle");
  check("duplicate oracle → new id + draft + payload identical", !!dup && dup.maturity === "draft" && JSON.stringify((await api("/api/library/" + dup.id)).json?.payload) === JSON.stringify(origPayload));

  await page.screenshot({ path: "builder_library_oracle.png", fullPage: false });

  // cleanup
  if (oid) await api("/api/library/" + oid, { method: "DELETE" });
  if (dup) await api("/api/library/" + dup.id, { method: "DELETE" });

  // 7) REGRESSION: other kinds' attach still renders in their editor.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("agent");
  await openBrick("agent-code-001");
  check("REGRESSION: Agent editor attach button present", await page.getByTestId("lib-attach").isVisible());

  // 8) REGRESSION: CRITICAL double-run + Wire Map 12.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));
  const lib = (await api("/api/library")).json?.bricks || [];
  check("REGRESSION: 5 agent bricks intact", lib.filter((b) => b.kind === "agent").length >= 5);
  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 13 entries", (wm.json?.entries || []).length === 13);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL ORACLE-BRICK CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("oracle_brick_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

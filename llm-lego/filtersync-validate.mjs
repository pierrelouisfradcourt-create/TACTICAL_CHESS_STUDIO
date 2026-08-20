// UX fix validation — Library filter/editor desync. Changing the "Type :" filter
// must close the open editor if the edited brick's kind no longer matches (and
// keep it if it still matches or the filter is "Tous"). Plus regressions.
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

const editorVisible = () => page.$$eval('[data-testid="lib-editor"]', (e) => e.length).then((n) => n === 1);
const editorKind = () => page.$eval('[data-testid="lib-editor"]', (e) => e.getAttribute("data-kind")).catch(() => null);
async function setFilter(v) { await page.getByTestId("lib-filter").selectOption(v); await page.waitForTimeout(200); }
async function openBrick(id) {
  await page.getByTestId("lib-open-" + id).click();
  // wait until the editor actually reflects THIS brick (loadBrick is async — the
  // previous editor may still be mounted for a tick otherwise).
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

  // Seed a prompt + a chain brick (fixed ids) so all three kinds exist. Agents seeded.
  await post({ id: "prompt-fs", kind: "prompt", name: "FS Prompt", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { text: "x", variables: [], outputFormat: "text", outputSchema: null, category: "", version: 1 }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await post({ id: "chain-fs", kind: "chain", name: "FS Chain", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { nodes: [{ id: "a", type: "llm", x: 10, y: 10, data: { prompt: "p" } }], edges: [], initialInput: {}, category: "test", tags: [] }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });
  await page.getByTestId("tab-library").click();

  // Case 1 — chain open, filter → Prompt (mismatch) → editor CLOSES.
  await setFilter("all");
  await openBrick("chain-fs");
  check("chain editor open (data-kind=chain)", (await editorKind()) === "chain");
  await setFilter("prompt");
  check("filter → Prompt closes the mismatched chain editor", !(await editorVisible()));

  // Case 2 — agent open, filter → Agent (same type) → editor STAYS.
  await setFilter("all");
  await openBrick("agent-code-001");
  check("agent editor open (data-kind=agent)", (await editorKind()) === "agent");
  await setFilter("agent");
  check("filter → Agent keeps the matching agent editor open", (await editorVisible()) && (await editorKind()) === "agent");

  // Case 3 — prompt open, filter → Tous → editor STAYS.
  await setFilter("all");
  await openBrick("prompt-fs");
  check("prompt editor open (data-kind=prompt)", (await editorKind()) === "prompt");
  await setFilter("all");
  check("filter → Tous keeps the prompt editor open", (await editorVisible()) && (await editorKind()) === "prompt");

  // Case 4 — no residue: chain open, filter → Prompt (closes), click a prompt row → prompt editor.
  await setFilter("all");
  await openBrick("chain-fs");
  await setFilter("prompt");
  check("editor closed after mismatch (pre-condition)", !(await editorVisible()));
  await openBrick("prompt-fs");
  check("clicking a new-filter row shows the new brick (no residue of the old)", (await editorKind()) === "prompt");

  await page.screenshot({ path: "builder_filtersync.png", fullPage: false });

  // Regression — the 3 kinds' action controls still work in their own context.
  await setFilter("chain");
  await openBrick("chain-fs");
  check("Chaîne action « Charger sur le canvas » present", await page.getByTestId("lib-load-canvas").isVisible());
  await page.getByTestId("lib-load-canvas").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 1, null, { timeout: 5000 });
  check("Chaîne « Charger sur le canvas » repopulates the canvas", (await page.evaluate(() => window.__ui.nodes.length)) === 1);

  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const agId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id);
  await page.locator(`[data-node-id="${agId}"] .nhead`).click();
  check("Agent action « Attacher une fiche » present", await page.getByTestId("agent-attach").isVisible());

  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-llm").click();
  const llmId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "llm").id);
  await page.locator(`[data-node-id="${llmId}"] .nhead`).click();
  check("Prompt action « Attacher un prompt » present", await page.getByTestId("llm-attach-prompt").isVisible());

  // Regression — CRITICAL double-run + Wire Map 12.
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));
  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 13 entries", (wm.json?.entries || []).length === 13);

  // cleanup
  await api("/api/library/prompt-fs", { method: "DELETE" });
  await api("/api/library/chain-fs", { method: "DELETE" });

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL FILTER-SYNC CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("filtersync_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

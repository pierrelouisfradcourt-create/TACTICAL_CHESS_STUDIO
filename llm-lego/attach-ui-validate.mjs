// UX fix validation — visible/discoverable attach action for Agent & Prompt in the
// Library editor (mirroring Chaîne's load button). Active when a compatible node is
// selected; disabled + explicit hint otherwise (with a "→ Canvas" link). Reuses the
// existing attach functions (incl. prompt overwrite confirm). Plus regressions.
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

  await post({ id: "prompt-fs", kind: "prompt", name: "FS Prompt", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { text: "PROMPT-TEXT", variables: [], outputFormat: "text", outputSchema: null, category: "", version: 1 }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await post({ id: "chain-fs", kind: "chain", name: "FS Chain", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { nodes: [{ id: "a", type: "llm", x: 10, y: 10, data: { prompt: "p" } }], edges: [], initialInput: {}, category: "test", tags: [] }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });

  // ---------- AGENT: attach button ACTIVE with a selected agent node ----------
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click(); // auto-selected
  const agId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id);
  await page.getByTestId("tab-library").click();
  await openBrick("agent-code-001");
  const agLabel = await page.getByTestId("lib-attach").textContent();
  check("Agent editor: attach button ACTIVE, names the selected node", !(await page.getByTestId("lib-attach").isDisabled()) && agLabel.includes(agId));
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction((id) => { const n = (window.__ui?.nodes || []).find((x) => x.id === id); return n && n.data && n.data.role === "code"; }, agId, { timeout: 5000 });
  check("Agent attach button → node gets payload (role=code)", true);
  check("Agent attach → switched to Canvas view", await page.getByTestId("tab-canvas").evaluate((el) => !el.classList.contains("ghost")));
  check("Agent attach → confirmation shown", ((await page.getByTestId("status").textContent()) || "").includes("attachée"));
  check("Agent attach → node shows attached-fiche badge", await page.locator(`[data-testid="node-brick-${agId}"]`).isVisible());

  // ---------- PROMPT: attach button ACTIVE with a selected llm node (overwrite accept) ----------
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-llm").click();
  const llmId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "llm").id);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  await openBrick("prompt-fs");
  const pLabel = await page.getByTestId("lib-attach").textContent();
  check("Prompt editor: attach button ACTIVE, names the selected llm node", !(await page.getByTestId("lib-attach").isDisabled()) && pLabel.includes(llmId));
  page.once("dialog", (d) => d.accept()); // existing non-empty prompt → overwrite confirm
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction((id) => { const n = (window.__ui?.nodes || []).find((x) => x.id === id); return n && n.data && n.data.prompt === "PROMPT-TEXT"; }, llmId, { timeout: 5000 });
  check("Prompt attach button → node.data.prompt updated (overwrite CONFIRMED)", true);
  check("Prompt attach → node shows attached-prompt badge", await page.locator(`[data-testid="node-prompt-${llmId}"]`).isVisible());

  // ---------- Overwrite confirm CANCELLED (regression Passe 2, via the button) ----------
  await page.evaluate((id) => window.__setGraph(window.__ui.nodes.map((x) => x.id === id ? { ...x, data: { ...x.data, prompt: "HAND-EDITED" } } : x), window.__ui.edges), llmId);
  await page.locator(`[data-node-id="${llmId}"] .nhead`).click(); // reselect (setGraph cleared sel)
  await page.getByTestId("tab-library").click();
  await openBrick("prompt-fs");
  page.once("dialog", (d) => d.dismiss());
  await page.getByTestId("lib-attach").click();
  await page.waitForTimeout(400);
  const afterCancel = await page.evaluate((id) => (window.__ui.nodes.find((x) => x.id === id) || {}).data?.prompt, llmId);
  check("Prompt attach overwrite CANCELLED → hand-edited prompt preserved", afterCancel === "HAND-EDITED");

  // ---------- DISABLED state: no compatible node selected ----------
  await page.getByTestId("btn-clear").click(); // clearAll sets sel=null
  await page.getByTestId("tab-library").click();
  await openBrick("agent-code-001");
  check("Agent editor: attach button DISABLED when no agent node selected", await page.getByTestId("lib-attach").isDisabled());
  check("Agent editor: disabled attach has explicit hint text", ((await page.getByTestId("lib-attach").textContent()) || "").includes("Sélectionne un nœud agent"));
  check("Agent editor: '→ Canvas' guide link present", await page.getByTestId("lib-attach-goto").isVisible());
  await page.getByTestId("lib-attach-goto").click();
  check("'→ Canvas' link switches to Canvas view", await page.getByTestId("tab-canvas").evaluate((el) => !el.classList.contains("ghost")));

  // Incompatible node selected (agent node) → Prompt editor attach still disabled.
  await page.getByTestId("add-agent").click();
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  await openBrick("prompt-fs");
  check("Prompt editor: attach DISABLED when selected node is not llm (agent selected)", await page.getByTestId("lib-attach").isDisabled());

  // ---------- Chaîne unchanged ----------
  await page.getByTestId("lib-filter").selectOption("chain");
  await openBrick("chain-fs");
  check("Chaîne: load button unchanged + present", await page.getByTestId("lib-load-canvas").isVisible());
  await page.getByTestId("lib-load-canvas").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 1, null, { timeout: 5000 });
  check("Chaîne: '📂 Charger sur le canvas' still repopulates canvas", (await page.evaluate(() => window.__ui.nodes.length)) === 1);

  // ---------- List tooltip legend ----------
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  const tips = await page.evaluate(() => ({
    agent: document.querySelector('[data-testid="lib-open-agent-code-001"]')?.getAttribute("title"),
    prompt: document.querySelector('[data-testid="lib-open-prompt-fs"]')?.getAttribute("title"),
    chain: document.querySelector('[data-testid="lib-open-chain-fs"]')?.getAttribute("title"),
  }));
  check("List legend: per-kind behaviour tooltip present", /attache/.test(tips.agent || "") && /attache/.test(tips.prompt || "") && /charge/.test(tips.chain || ""));

  await page.screenshot({ path: "builder_attach_ui.png", fullPage: false });

  // ---------- Regressions ----------
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

  // cleanup (only the two test bricks this pass created)
  await api("/api/library/prompt-fs", { method: "DELETE" });
  await api("/api/library/chain-fs", { method: "DELETE" });

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL ATTACH-UI CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("attach_ui_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

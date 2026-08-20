// Library Passe 2 validation — kind "prompt": multi-kind list + filter, conditional
// editor, attach to an LLM node's data.prompt (with overwrite confirm), duplicate,
// version. Plus regressions: double-run search/chat, agents CRUD, Wire Map 12.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { assertTestLibrary } from "./_test-guard.mjs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
async function pollApi(p, pred, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { const r = await api(p); if (r.ok && pred(r.json)) return r.json; await new Promise((res) => setTimeout(res, 150)); }
  return null;
}

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
async function loadExample(key) { await page.getByTestId("example-dropdown").click(); await page.getByTestId("example-" + key).click(); }

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });

  // clean any leftover prompt test bricks (isolated store only — never real library/)
  {
    const cur = await api("/api/library");
    assertTestLibrary(cur.json, "prompt");
    for (const b of (cur.json?.bricks || [])) if (b.kind === "prompt" || b.id === "prompt-e2e") await api("/api/library/" + b.id, { method: "DELETE" });
  }
  await page.getByTestId("tab-library").click();

  // 1) Create a PROMPT via the UI (+ Nouveau ▾ → Prompt) → conditional editor.
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-prompt").click();
  await page.waitForSelector('[data-testid="lib-editor-prompt"]', { timeout: 4000 });
  check("editor is prompt-specific (lib-editor-prompt), not agent", (await page.$$eval('[data-testid="lib-editor-agent"]', (e) => e.length)) === 0);
  await fillLib("lib-name", "Test Prompt E2E");
  await fillLib("lib-text", "Analyze intent. JSON only.");
  await fillLib("lib-variables", "query\ncontext");
  await page.getByTestId("lib-outputFormat").selectOption("json");
  await page.waitForSelector('[data-testid="lib-outputSchema"]', { timeout: 3000 }); // appears only for json
  check("outputSchema textarea appears when format=json", await page.getByTestId("lib-outputSchema").isVisible());
  await fillLib("lib-outputSchema", '{"intent":"string"}');
  await fillLib("lib-category", "routing");
  const vBefore = await page.getByTestId("lib-version").inputValue();
  await page.getByTestId("lib-version-inc").click(); // 1 -> 2
  await page.waitForFunction(() => document.querySelector('[data-testid="lib-version"]')?.value === "2", null, { timeout: 3000 });
  check("version increment (1 → 2)", vBefore === "1");
  await saveBrickUI("Test Prompt E2E");

  const list1 = await api("/api/library");
  const promptSummary = (list1.json?.bricks || []).find((b) => b.name === "Test Prompt E2E");
  check("created prompt appears in GET /api/library with kind=prompt", !!promptSummary && promptSummary.kind === "prompt");
  const pid = promptSummary?.id;
  const pdoc = pid ? (await api("/api/library/" + pid)).json : null;
  check("prompt file has kind=prompt + payload fields",
    pdoc?.kind === "prompt" && pdoc?.payload?.text === "Analyze intent. JSON only." &&
    JSON.stringify(pdoc?.payload?.variables) === JSON.stringify(["query", "context"]) &&
    pdoc?.payload?.outputFormat === "json" && pdoc?.payload?.outputSchema === '{"intent":"string"}' &&
    pdoc?.payload?.category === "routing" && pdoc?.payload?.version === 2);

  // 2) Edit + save round-trip on the prompt (change category).
  await fillLib("lib-category", "analyse");
  await saveBrickUI("Test Prompt E2E");
  const edited = await pollApi("/api/library/" + pid, (j) => j?.payload?.category === "analyse");
  check("edit prompt → server reflects (category=analyse)", !!edited);

  // 3) Filter list by kind (Tous / Agent / Prompt).
  const rowsByFilter = async (f) => {
    await page.getByTestId("lib-filter").selectOption(f);
    await page.waitForTimeout(150);
    return page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.map((e) => e.getAttribute("data-kind")));
  };
  const promptRows = await rowsByFilter("prompt");
  check("filter Prompt → only prompt rows", promptRows.length >= 1 && promptRows.every((k) => k === "prompt"));
  const agentRows = await rowsByFilter("agent");
  check("filter Agent → only agent rows (5 seeded)", agentRows.length >= 5 && agentRows.every((k) => k === "agent"));
  const allRows = await rowsByFilter("all");
  check("filter Tous → agents + prompts", allRows.includes("agent") && allRows.includes("prompt"));

  // 4) Attach the prompt to an LLM node on the canvas (overwrite confirm accepted).
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-llm").click();               // open LLM ▸ submenu
  await page.waitForFunction(() => (window.__ui?.nodes || []).some((n) => n.type === "llm"), null, { timeout: 4000 });
  const llmId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "llm").id);
  await page.locator(`[data-node-id="${llmId}"] .nhead`).click();
  await page.waitForSelector('[data-testid="llm-attach-prompt"]', { timeout: 4000 });
  page.once("dialog", (d) => d.accept());                  // existing prompt non-empty → confirm overwrite
  await page.getByTestId("llm-attach-prompt").selectOption(pid);
  await page.waitForSelector(`[data-testid="node-prompt-${llmId}"]`, { timeout: 5000 });
  const llmData = await page.evaluate((id) => {
    const n = window.__ui.nodes.find((x) => x.id === id);
    return { prompt: n.data.prompt, attached: n.attachedPrompt };
  }, llmId);
  check("attach prompt → node.data.prompt = prompt text", llmData.prompt === "Analyze intent. JSON only.");
  check("node shows attached-prompt badge", !!llmData.attached && llmData.attached.id === pid);
  const engineHasPrompt = await page.evaluate(() => JSON.stringify(window.toEngineGraph(window.__ui.nodes, window.__ui.edges)).includes("attachedPrompt"));
  check("attachedPrompt excluded from engine graph (data.prompt kept)", !engineHasPrompt);

  // 4b) Overwrite confirm CANCELLED → hand-edited prompt preserved.
  await page.getByTestId("llm-attach-prompt").selectOption(""); // detach (no dialog)
  await page.evaluate((id) => {
    window.__setGraph(
      window.__ui.nodes.map((x) => x.id === id ? { ...x, data: { ...x.data, prompt: "HAND-EDITED" } } : x),
      window.__ui.edges,
    );
  }, llmId);
  await page.locator(`[data-node-id="${llmId}"] .nhead`).click(); // reselect (setGraph cleared sel)
  await page.waitForSelector('[data-testid="llm-attach-prompt"]', { timeout: 4000 });
  page.once("dialog", (d) => d.dismiss());
  await page.getByTestId("llm-attach-prompt").selectOption(pid);
  await page.waitForTimeout(400);
  const afterCancel = await page.evaluate((id) => window.__ui.nodes.find((x) => x.id === id).data.prompt, llmId);
  check("attach cancel (dismiss confirm) → hand-edited prompt preserved", afterCancel === "HAND-EDITED");

  // 5) Duplicate the prompt → new id, draft, payload identical.
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("all");
  const origPayload = (await api("/api/library/" + pid)).json?.payload;
  await page.getByTestId("lib-dup-" + pid).click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("Dupliqué"), null, { timeout: 5000 });
  const list2 = await api("/api/library");
  const dup = (list2.json?.bricks || []).find((b) => b.name === "Test Prompt E2E" && b.id !== pid && b.kind === "prompt");
  check("duplicate prompt → new id", !!dup && dup.id !== pid);
  const dupDoc = dup ? (await api("/api/library/" + dup.id)).json : null;
  check("duplicate prompt is draft + payload identical", dupDoc?.maturity === "draft" && JSON.stringify(dupDoc?.payload) === JSON.stringify(origPayload));

  await page.screenshot({ path: "builder_library_prompt.png", fullPage: false });
  log("screenshot -> builder_library_prompt.png");

  // cleanup prompt test bricks
  if (pid) await api("/api/library/" + pid, { method: "DELETE" });
  if (dup) await api("/api/library/" + dup.id, { method: "DELETE" });

  // 6) REGRESSION: double-run search/chat flips.
  await page.getByTestId("tab-canvas").click();
  await loadExample("routing");
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  async function runWith(query) {
    await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
    await page.getByTestId("btn-execute").click();
    await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
    return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  }
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  // 7) REGRESSION: agents intact (5 seeded), Wire Map 12.
  const lib = await api("/api/library");
  check("REGRESSION: 5 agent bricks intact", (lib.json?.bricks || []).filter((b) => b.kind === "agent").length >= 5);
  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 13 entries", (wm.json?.entries || []).length === 13);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL PROMPT CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("prompt_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

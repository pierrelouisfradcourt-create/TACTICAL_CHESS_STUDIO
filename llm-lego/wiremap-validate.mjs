// Wire Map recenter validation — the Wire Map is a SOFTWARE roadmap / patch-note
// journal, fully independent of the canvas. Proves: no NON MAPPÉ rows for any
// canvas graph, entries are manual-only, the new software entries exist, and the
// Wire Map never reads library/*.json (étanchéité). Plus the critical regressions.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p) => { const r = await fetch(BASE + p); return r.json().catch(() => null); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const reqLog = []; // every network request URL (for the étanchéité assertion)
page.on("request", (r) => reqLog.push(r.url()));

async function loadExample(key) {
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-" + key).click();
}
async function openWireMapOn(projectId) {
  await page.getByTestId("tab-wiremap").click();
  await page.waitForSelector('[data-testid="wiremap"]', { timeout: 5000 });
  await page.getByTestId("wm-project-select").selectOption(projectId);
}
const unmappedRows = () => page.$$eval('[data-testid="wm-unmapped-row"]', (e) => e.length);
const mapButtons = () => page.$$eval('[data-testid^="wm-map-"]', (e) => e.length);
const wmRows = () => page.$$eval('[data-testid="wm-row"]', (e) => e.length);

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-wiremap"]', { timeout: 20000 });

  // A) The 4 new software entries exist in wireframes/llm-lego.json.
  const doc = await api("/api/wireframes/llm-lego");
  const ids = (doc?.entries || []).map((e) => e.nodeId);
  check("llm-lego has 12 entries", (doc?.entries || []).length === 12);
  for (const need of ["view-selector", "library", "wiremap-corrections", "wiremap-recenter"]) {
    check(`entry '${need}' present`, ids.includes(need));
  }
  check("all new entries PASS", (doc?.entries || []).filter((e) => ["view-selector", "library", "wiremap-corrections", "wiremap-recenter"].includes(e.nodeId)).every((e) => e.test.status === "PASS"));

  // B) For EVERY canvas graph, the Wire Map shows ZERO NON MAPPÉ rows and the
  //    llm-lego table stays at 12 (independent of the canvas).
  for (const key of ["routing", "gate", "looped"]) {
    await page.getByTestId("tab-canvas").click();
    await loadExample(key);
    await openWireMapOn("llm-lego");
    const u = await unmappedRows(), m = await mapButtons(), r = await wmRows();
    check(`graph '${key}': 0 NON MAPPÉ rows`, u === 0);
    check(`graph '${key}': 0 '+ mapper' buttons`, m === 0);
    check(`graph '${key}': llm-lego still 12 rows (canvas-independent)`, r === 12);
  }

  // C) Pose an Agent node manually (+ attach a library brick) → still no effect
  //    on the Wire Map. This is the exact confusion the recenter removes.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const agentId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id);
  await page.locator(`[data-node-id="${agentId}"] .nhead`).click();
  await page.getByTestId("agent-attach").selectOption("agent-qa-001"); // attach a fiche
  await page.waitForSelector(`[data-testid="node-brick-${agentId}"]`, { timeout: 5000 });
  await openWireMapOn("llm-lego");
  check("posed Agent node (with attached fiche) → 0 NON MAPPÉ rows", (await unmappedRows()) === 0);
  check("posed Agent node → llm-lego still 12 rows", (await wmRows()) === 12);

  // D) ÉTANCHÉITÉ: Wire Map interactions must NEVER request /api/library.
  //    Reset the request log AFTER mount (mount legitimately loads the library
  //    once for the Bibliothèque panel), then drive ONLY the Wire Map.
  reqLog.length = 0;
  await openWireMapOn("llm-lego");
  const firstEid = await page.$eval('[data-testid="wm-row"]', (el) => el.getAttribute("data-entry-id"));
  await page.getByTestId("wm-expand-" + firstEid).click();          // expand a detail row
  await page.getByTestId("wm-audit").click();                        // run the local audit
  await page.getByTestId("wm-status-" + firstEid).selectOption("PASS");
  await page.getByTestId("wm-add-entry").click();                    // add a manual entry
  await page.waitForTimeout(300);
  const libCalls = reqLog.filter((u) => u.includes("/api/library"));
  check("Wire Map made ZERO /api/library requests (étanchéité)", libCalls.length === 0);
  if (libCalls.length) log(`  leaked calls: ${JSON.stringify(libCalls)}`);
  // restore llm-lego (the add-entry above targeted llm-lego — undo it to keep the seed at 12)
  {
    const d = await api("/api/wireframes/llm-lego");
    if ((d?.entries || []).length > 12) {
      d.entries = d.entries.filter((e) => /^entry-0(0[1-9]|1[0-2])$/.test(e.id)); // keep the 12 canonical
      await fetch(BASE + "/api/wireframes/llm-lego", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    }
  }
  const restored = await api("/api/wireframes/llm-lego");
  check("llm-lego restored to 12 entries after test", (restored?.entries || []).length === 12);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-wiremap"]', { timeout: 10000 });
  await openWireMapOn("llm-lego");
  await page.screenshot({ path: "builder_wiremap_recenter.png", fullPage: false });
  log("screenshot -> builder_wiremap_recenter.png");

  // E) REGRESSION: double-run search/chat still flips.
  await page.getByTestId("tab-canvas").click();
  await loadExample("routing");
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  async function runWith(query) {
    await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
    await page.getByTestId("btn-execute").click();
    await page.waitForFunction(() => {
      const steps = document.querySelectorAll('[data-testid="trace-step"]');
      const st = document.querySelector('[data-testid="status"]')?.textContent || "";
      return steps.length > 0 && !st.includes("⏳");
    }, null, { timeout: 15000 });
    return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  }
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  log(`run1: ${r1.join(" -> ")} | run2: ${r2.join(" -> ")}`);
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  // F) REGRESSION: Bibliothèque still functional (>=5 bricks).
  const lib = await api("/api/library");
  check("Bibliothèque still functional (>=5 agent bricks)", (lib?.bricks || []).filter((b) => b.kind === "agent").length >= 5);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL WIRE MAP RECENTER CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("wiremap_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

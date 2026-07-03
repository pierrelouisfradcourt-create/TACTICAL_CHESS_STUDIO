// Library Passe 6 validation — kind "goal": deliberately MINIMAL (payload = {text,
// category} only). Multi-kind list/filter/editor, "🎯 Attacher comme objectif" to
// ANY canvas node (no attachableTo restriction), goalRef transmitted inert while
// attachedGoal is dropped, duplication. Plus regressions.
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
  { const cur = await api("/api/library"); assertTestLibrary(cur.json, "goal"); for (const b of (cur.json?.bricks || [])) if (b.kind === "goal") await api("/api/library/" + b.id, { method: "DELETE" }); }
  await page.getByTestId("tab-library").click();

  // 1) Create a Goal via + Nouveau ▾ → Goal → MINIMAL editor.
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-goal").click();
  await page.waitForSelector('[data-testid="lib-editor-goal"]', { timeout: 4000 });
  check("editor is goal-specific (lib-editor-goal)", (await page.$$eval('[data-testid="lib-editor-agent"], [data-testid="lib-editor-prompt"], [data-testid="lib-editor-oracle"], [data-testid="lib-editor-chain"]', (e) => e.length)) === 0);
  check("goal editor is MINIMAL: text + category only (no variables/outputFormat/attachableTo)",
    await page.getByTestId("lib-goal-text").isVisible() && await page.getByTestId("lib-category").isVisible() &&
    (await page.$$eval('[data-testid="lib-variables"], [data-testid="lib-outputFormat"], [data-testid="lib-oracle-attach-llm"]', (e) => e.length)) === 0);
  await fillLib("lib-name", "Créer une roadmap");
  await fillLib("lib-goal-text", "Analyse le contexte et produis une roadmap structurée en jalons.");
  await fillLib("lib-category", "meta");
  await saveBrickUI("Créer une roadmap");

  const list1 = await api("/api/library");
  const gSummary = (list1.json?.bricks || []).find((b) => b.name === "Créer une roadmap");
  check("goal appears in GET /api/library with kind=goal", !!gSummary && gSummary.kind === "goal");
  const gid = gSummary?.id;
  const gdoc = gid ? (await api("/api/library/" + gid)).json : null;
  check("goal payload = exactly {text, category} (not over-built)",
    gdoc && JSON.stringify(Object.keys(gdoc.payload).sort()) === JSON.stringify(["category", "text"]) &&
    gdoc.payload.text.startsWith("Analyse le contexte") && gdoc.payload.category === "meta");

  // 2) Filter "Goal" isolates.
  await page.getByTestId("lib-filter").selectOption("goal");
  await page.waitForTimeout(150);
  const goalRows = await page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.map((e) => e.getAttribute("data-kind")));
  check("filter Goal → only goal rows", goalRows.length >= 1 && goalRows.every((k) => k === "goal"));

  // 3) Attach to ANY canvas node — use a ROUTER (Oracle rejected it; Goal must accept).
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-router").click(); // any type — no attachableTo restriction
  const rId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "router").id);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("goal");
  await openBrick(gid);
  const label = await page.getByTestId("lib-attach").textContent();
  check("goal attach ACTIVE for ANY node type (router), names it", !(await page.getByTestId("lib-attach").isDisabled()) && /objectif/.test(label) && label.includes(rId));
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction((id) => { const n = (window.__ui?.nodes || []).find((x) => x.id === id); return n && n.data && n.data.goalRef; }, rId, { timeout: 5000 });
  const nodeInfo = await page.evaluate((id) => { const n = window.__ui.nodes.find((x) => x.id === id); return { goalRef: n.data.goalRef, attached: n.attachedGoal }; }, rId);
  check("attach → node.data.goalRef = brick id", nodeInfo.goalRef === gid);
  check("attach → node shows 🎯 goal badge", await page.locator(`[data-testid="node-goal-${rId}"]`).isVisible());

  // 4) toEngineGraph: goalRef transmitted inert, attachedGoal dropped.
  const eg = await page.evaluate(() => JSON.stringify(window.toEngineGraph(window.__ui.nodes, window.__ui.edges)));
  check("goalRef transmitted inert in engine graph (like oracleRef)", eg.includes("goalRef"));
  check("attachedGoal (UI label) excluded from engine graph", !eg.includes("attachedGoal"));

  // 5) Duplicate goal → new id, draft, payload identical.
  await page.getByTestId("tab-library").click(); // attach switched to Canvas — go back
  await page.getByTestId("lib-filter").selectOption("goal");
  await page.waitForSelector('[data-testid="lib-dup-' + gid + '"]', { timeout: 4000 });
  const origPayload = (await api("/api/library/" + gid)).json?.payload;
  await page.getByTestId("lib-dup-" + gid).click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("Dupliqué"), null, { timeout: 5000 });
  const list2 = await api("/api/library");
  const dup = (list2.json?.bricks || []).find((b) => b.name === "Créer une roadmap" && b.id !== gid && b.kind === "goal");
  check("duplicate goal → new id + draft + payload identical", !!dup && dup.maturity === "draft" && JSON.stringify((await api("/api/library/" + dup.id)).json?.payload) === JSON.stringify(origPayload));

  await page.screenshot({ path: "builder_library_goal.png", fullPage: false });

  // cleanup
  if (gid) await api("/api/library/" + gid, { method: "DELETE" });
  if (dup) await api("/api/library/" + dup.id, { method: "DELETE" });

  // 6) REGRESSION: the 4 prior kinds' editors still render.
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("agent");
  await openBrick("agent-code-001");
  check("REGRESSION: Agent editor still renders", await page.getByTestId("lib-editor-agent").isVisible());

  // 7) REGRESSION: CRITICAL double-run + Wire Map 12.
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
  check("REGRESSION: Wire Map llm-lego still 12 entries", (wm.json?.entries || []).length === 12);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL GOAL CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("goal_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

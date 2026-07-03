// Library Passe 3 validation — kind "chain": save canvas as chain, chain editor
// (summary + load-to-canvas + metadata), extended view-selector (3 fixed examples
// FIRST + saved chains below), and the explicit "fixed examples NOT migrated" check.
// Plus the CRITICAL double-run regression + Wire Map 12 + agents/prompts intact.
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

async function runWith(query) {
  await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const s = document.querySelectorAll('[data-testid="trace-step"]'); const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return s.length > 0 && !st.includes("⏳"); }, null, { timeout: 15000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="example-dropdown"]', { timeout: 20000 });

  // clean any leftover chain test bricks
  { const cur = await api("/api/library"); assertTestLibrary(cur.json, "chain"); for (const b of (cur.json?.bricks || [])) if (b.kind === "chain") await api("/api/library/" + b.id, { method: "DELETE" }); }

  // 1) Put a real positioned graph on the canvas (routing = 4 nodes / 3 edges) then
  //    "💾 chaîne" → save. Captures nodes WITH positions.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const canvasNodes = await page.evaluate(() => window.__ui.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, type: n.type })));
  await page.getByTestId("btn-save-chain").click();
  await page.getByTestId("chain-name").fill("Test Chain E2E");
  await page.getByTestId("chain-category").fill("routing");
  await page.getByTestId("chain-tags").fill("demo, e2e");
  await page.getByTestId("chain-save-submit").click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 6000 });

  const list1 = await api("/api/library");
  const chainSummary = (list1.json?.bricks || []).find((b) => b.name === "Test Chain E2E");
  check("saved chain appears in GET /api/library with kind=chain", !!chainSummary && chainSummary.kind === "chain");
  const cid = chainSummary?.id;
  const cdoc = cid ? (await api("/api/library/" + cid)).json : null;
  check("chain payload has nodes+edges+initialInput+category+tags",
    (cdoc?.payload?.nodes || []).length === 4 && (cdoc?.payload?.edges || []).length === 3 &&
    cdoc?.payload?.category === "routing" && JSON.stringify(cdoc?.payload?.tags) === JSON.stringify(["demo", "e2e"]));
  check("chain nodes keep POSITIONS (x/y) — layout not lost",
    (cdoc?.payload?.nodes || []).every((n) => typeof n.x === "number" && typeof n.y === "number"));
  check("chain file lives in library/ (POST route), kind=chain", cdoc?.id === cid);

  // 2) Chain shows in the Library list, filterable by kind "chain".
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("chain");
  await page.waitForTimeout(150);
  const chainRows = await page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.map((e) => e.getAttribute("data-kind")));
  check("filter Chaîne → only chain rows", chainRows.length >= 1 && chainRows.every((k) => k === "chain"));

  // 3) Chain editor: summary + metadata edit round-trip.
  await page.getByTestId("lib-open-" + cid).click();
  await page.waitForSelector('[data-testid="lib-editor-chain"]', { timeout: 4000 });
  const summary = await page.getByTestId("lib-chain-summary").textContent();
  check("chain editor shows a read-only graph summary (4 nœuds · 3 edges)", /4 nœud/.test(summary) && /3 edge/.test(summary));
  await page.getByTestId("lib-tags").fill("demo, e2e, refined");
  await page.getByTestId("lib-save").click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 6000 });
  const cdoc2 = (await api("/api/library/" + cid)).json;
  check("chain metadata edit → server reflects (tags updated, graph intact)",
    JSON.stringify(cdoc2?.payload?.tags) === JSON.stringify(["demo", "e2e", "refined"]) && (cdoc2?.payload?.nodes || []).length === 4);

  // 4) "📂 Charger sur le canvas" → canvas repopulated faithfully (ids + positions).
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0, null, { timeout: 3000 });
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-open-" + cid).click();
  await page.getByTestId("lib-load-canvas").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 4, null, { timeout: 5000 });
  const reloaded = await page.evaluate(() => window.__ui.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, type: n.type })));
  check("load-to-canvas switches to Canvas view", await page.getByTestId("tab-canvas").evaluate((el) => !el.classList.contains("ghost")));
  check("load-to-canvas repopulates same nodes + positions", JSON.stringify(reloaded) === JSON.stringify(canvasNodes));

  // 5) View selector: 3 FIXED examples FIRST, separator, then saved chains.
  await page.getByTestId("example-dropdown").click();
  await page.waitForSelector('[data-testid="example-menu"]', { timeout: 4000 });
  const order = await page.$$eval('[data-testid="example-menu"] [data-testid^="example-"]', (els) => els.map((e) => e.getAttribute("data-testid")));
  const idxRouting = order.indexOf("example-routing");
  const idxGate = order.indexOf("example-gate");
  const idxLooped = order.indexOf("example-looped");
  const idxChain = order.indexOf("example-chain-" + cid);
  check("selector shows the 3 fixed examples", idxRouting >= 0 && idxGate >= 0 && idxLooped >= 0);
  check("selector shows a 'chaînes sauvegardées' separator", (await page.$$eval('[data-testid="example-chains-sep"]', (e) => e.length)) === 1);
  check("selector: fixed examples come BEFORE saved chains", idxChain > idxRouting && idxChain > idxGate && idxChain > idxLooped);

  // 6) Load the chain FROM the view selector → same result as editor load.
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0, null, { timeout: 3000 }).catch(() => {});
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-chain-" + cid).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 4, null, { timeout: 5000 });
  const fromSelector = await page.evaluate(() => window.__ui.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, type: n.type })));
  check("load chain from view-selector === load from editor", JSON.stringify(fromSelector) === JSON.stringify(canvasNodes));

  // 7) DEDICATED: the 3 fixed examples were NOT migrated to library/ (stay in code).
  const allBricks = (await api("/api/library")).json?.bricks || [];
  const chains = allBricks.filter((b) => b.kind === "chain");
  const fixedLabels = ["routing (search|chat)", "Council gate v1", "Council ↻ looped"];
  check("fixed examples NOT present as chain bricks in library/", !chains.some((b) => fixedLabels.includes(b.name)));
  check("only the test chain exists as a chain brick (no migrated fixtures)", chains.length === 1 && chains[0].id === cid);

  await page.screenshot({ path: "builder_library_chain.png", fullPage: false });
  log("screenshot -> builder_library_chain.png");

  // 8) CRITICAL REGRESSION: the FIXED routing example still double-runs search/chat.
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-routing").click();
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  log(`run1: ${r1.join(" -> ")} | run2: ${r2.join(" -> ")}`);
  check("⚠️ CRITICAL double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("⚠️ CRITICAL double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  // 9) REGRESSION: agents + prompts store intact, Wire Map 12.
  const lib = (await api("/api/library")).json?.bricks || [];
  check("REGRESSION: 5 agent bricks intact", lib.filter((b) => b.kind === "agent").length >= 5);
  const wm = await api("/api/wireframes/llm-lego");
  check("REGRESSION: Wire Map llm-lego still 12 entries", (wm.json?.entries || []).length === 12);

  // cleanup
  if (cid) await api("/api/library/" + cid, { method: "DELETE" });

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL CHAIN CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("chain_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

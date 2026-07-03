// Library Passe 1 validation — store + agent brick, CRUD, attach to node.
// Also re-checks the two critical regressions: double-run search/chat + Wire Map.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { assertTestLibrary } from "./_test-guard.mjs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
// Poll the API until predicate(json) is true (avoids racing on shared status text).
async function pollApi(p, pred, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await api(p);
    if (r.ok && pred(r.json)) return r.json;
    await new Promise((res) => setTimeout(res, 150));
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

// Fill a controlled input and wait until its DOM value reflects the typed text —
// a deterministic signal that React committed the state update before we click.
async function fillLib(testid, value) {
  await page.getByTestId(testid).fill(value);
  await page.waitForFunction(
    ({ t, v }) => document.querySelector(`[data-testid="${t}"]`)?.value === v,
    { t: testid, v: value },
    { timeout: 4000 },
  );
  // fill() sets the DOM value directly; give React's onChange a tick to commit
  // the state update before any subsequent save reads it.
  await page.waitForTimeout(150);
}

// Click Save and wait for THIS brick's save to fully complete (status names the
// brick). Gating on completion prevents the next edit from racing saveBrick's
// own post-await setLibEditing (which would clobber it).
async function saveBrickUI(expectName) {
  await page.getByTestId("lib-save").click();
  await page.waitForFunction(
    (n) => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("« " + n + " » sauvegardée"),
    expectName,
    { timeout: 6000 },
  );
}

async function loadExample(key) { // via the central selector dropdown
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-" + key).click();
}
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

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });

  // Reset the store to a pristine seed (prior runs may have left drafts/edits).
  // SAFETY: this deletes EVERY brick — it must ONLY ever run against an isolated
  // test library. assertTestLibrary throws otherwise, protecting the real library/.
  {
    const cur = await api("/api/library");
    assertTestLibrary(cur.json, "library");
    for (const b of (cur.json?.bricks || [])) await api("/api/library/" + b.id, { method: "DELETE" });
    await api("/api/library"); // GET with empty dir re-seeds the 5 from agent_registry
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });
  }

  // 1) GET /api/library returns >= 5 bricks (seeded from agent_registry).
  const list = await api("/api/library");
  const seeded = (list.json?.bricks || []).filter((b) => b.kind === "agent");
  check("GET /api/library returns >= 5 agent bricks", seeded.length >= 5);
  check("seeded bricks are maturity=saved badge=real", seeded.length > 0 && seeded.every((b) => b.maturity === "saved" && b.badge === "real"));

  // 2) UI: open Library tab, list shows the 5 bricks.
  await page.getByTestId("tab-library").click();
  await page.waitForSelector('[data-testid="library"]', { timeout: 5000 });
  const rowCount = await page.$$eval('[data-testid="lib-list"] tbody tr', (els) => els.filter((e) => e.getAttribute("data-testid")?.startsWith("lib-row-")).length);
  check("library UI lists >= 5 rows", rowCount >= 5);

  // 3) Create a new agent brick via the UI (+ Nouveau ▾ → Agent) → list + server.
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-agent").click();
  await page.waitForSelector('[data-testid="lib-editor-agent"]', { timeout: 4000 });
  await fillLib("lib-name", "Test Agent E2E");
  await fillLib("lib-role", "e2e");
  await saveBrickUI("Test Agent E2E");
  const after = await api("/api/library");
  const created = (after.json?.bricks || []).find((b) => b.name === "Test Agent E2E");
  check("created brick appears in GET /api/library", !!created);
  const createdDoc = created ? await api("/api/library/" + created.id) : { ok: false };
  check("created brick file exists on server (payload.role=e2e, maturity=draft)",
    createdDoc.ok && createdDoc.json?.payload?.role === "e2e" && createdDoc.json?.maturity === "draft");
  if (created) await api("/api/library/" + created.id, { method: "DELETE" }); // self-cleanup

  // 4) Edit an existing seeded brick, save, server reflects — then revert.
  await page.getByTestId("lib-open-agent-code-001").click();
  await page.waitForFunction(() => document.querySelector('[data-testid="lib-name"]')?.value === "Code Agent", null, { timeout: 4000 });
  await fillLib("lib-name", "Code Agent EDITED");
  await saveBrickUI("Code Agent EDITED");
  const edited = await pollApi("/api/library/agent-code-001", (j) => j?.name === "Code Agent EDITED");
  check("edited brick reflects new name on server", !!edited);
  // revert so the seed stays pristine for the screenshot
  await fillLib("lib-name", "Code Agent");
  await saveBrickUI("Code Agent");
  const reverted = await pollApi("/api/library/agent-code-001", (j) => j?.name === "Code Agent");
  check("edit revert restores original name", !!reverted);

  // 5) Duplicate a brick → new id, maturity draft, payload identical.
  const origDoc = (await api("/api/library/agent-review-001")).json;
  await page.getByTestId("lib-dup-agent-review-001").click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("Dupliqué"), null, { timeout: 5000 });
  const listAfterDup = await api("/api/library");
  const dupSummary = (listAfterDup.json?.bricks || []).find((b) => b.name === "Review Agent" && b.id !== "agent-review-001");
  check("duplicate created a new brick id", !!dupSummary && dupSummary.id !== "agent-review-001");
  const dupDoc = dupSummary ? (await api("/api/library/" + dupSummary.id)).json : null;
  check("duplicate is maturity=draft", dupDoc?.maturity === "draft");
  check("duplicate payload is identical to original", JSON.stringify(dupDoc?.payload) === JSON.stringify(origDoc?.payload));
  // cleanup the duplicate
  if (dupSummary) await api("/api/library/" + dupSummary.id, { method: "DELETE" });
  check("duplicate cleaned up (DELETE)", true);

  // 5b) DETTE 1 — saveBrick race: two saves of the SAME brick fired in the SAME
  //     tick must SERIALIZE via the queue → final state (server AND client) = the
  //     LAST save, both POSTs executed (none dropped), no stale intermediate.
  {
    const raceId = "agent-racetest";
    await api("/api/library/" + raceId, { method: "DELETE" }); // clean slate
    await page.getByTestId("tab-library").click(); // editor visible → can read client state
    const posts = [];
    const onReq = (r) => { if (r.method() === "POST" && r.url().includes("/api/library/" + raceId)) posts.push(r.url()); };
    page.on("request", onReq);
    const base = {
      id: raceId, kind: "agent", name: "RACE-BASE", maturity: "draft", badge: "demo",
      roadmapRef: null, sourceRef: null,
      payload: { role: "", memoire: "", skill: "", plugin: "", objectif: "", gardeFou: "", modele: "", temperature: null, top_p: null, max_tokens: null, autonomy_level: null, permissions: {}, allowed_surfaces: [], forbidden_surfaces: [] },
      created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z",
    };
    await page.evaluate((b) => {
      window.__enqueueSave({ ...b, name: "RACE-A" });        // save #1 — same tick
      return window.__enqueueSave({ ...b, name: "RACE-B" });  // save #2 — same tick, resolves last
    }, base);
    const finalDoc = await pollApi("/api/library/" + raceId, (j) => j?.name === "RACE-B");
    page.off("request", onReq);
    const clientName = await page.getByTestId("lib-name").inputValue().catch(() => null);
    check("Dette1: rapid double-save → server final = LAST save (RACE-B)", !!finalDoc && finalDoc.name === "RACE-B");
    check("Dette1: rapid double-save → client editor final = LAST save (RACE-B, no stale clobber)", clientName === "RACE-B");
    check("Dette1: both saves executed, none dropped (2 POSTs)", posts.length === 2);
    await api("/api/library/" + raceId, { method: "DELETE" }); // cleanup
  }

  // 6) Attach a brick to an agent node on the canvas.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).some((n) => n.type === "agent"), null, { timeout: 4000 });
  const agentNodeId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id);
  // select the node (click its header) so the inspector shows the attach dropdown
  await page.locator(`[data-node-id="${agentNodeId}"] .nhead`).click();
  await page.waitForSelector('[data-testid="agent-attach"]', { timeout: 4000 });
  await page.getByTestId("agent-attach").selectOption("agent-qa-001");
  await page.waitForSelector(`[data-testid="node-brick-${agentNodeId}"]`, { timeout: 5000 });
  const nodeData = await page.evaluate((id) => {
    const n = window.__ui.nodes.find((x) => x.id === id);
    return { data: n.data, attached: n.attachedBrick };
  }, agentNodeId);
  check("attach applied payload fields onto node.data (role=qa)", nodeData.data.role === "qa");
  check("attach applied governance onto node.data (allowed_surfaces present)", Array.isArray(nodeData.data.allowed_surfaces) && nodeData.data.allowed_surfaces.length > 0);
  check("node shows attached-brick badge", !!nodeData.attached && nodeData.attached.id === "agent-qa-001");
  // attachedBrick must NOT leak into the engine graph (top-level, dropped by toEngineGraph)
  const engineHasBrick = await page.evaluate(() => JSON.stringify(window.toEngineGraph(window.__ui.nodes, window.__ui.edges)).includes("attachedBrick"));
  check("attachedBrick excluded from engine graph", !engineHasBrick);
  await page.screenshot({ path: "builder_library_attached.png", fullPage: false });

  // 7) Screenshot of the library list + editor open (reload → clean list of 5).
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-open-agent-code-001").click();
  await page.waitForSelector('[data-testid="lib-editor"]', { timeout: 4000 });
  await page.screenshot({ path: "builder_library_list_editor.png", fullPage: false });
  log("screenshots -> builder_library_attached.png, builder_library_list_editor.png");

  // 8) REGRESSION: double-run search/chat still flips.
  await page.getByTestId("tab-canvas").click();
  await loadExample("routing");
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  log(`run1: ${r1.join(" -> ")} | run2: ${r2.join(" -> ")}`);
  check("REGRESSION double-run: search → node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION double-run: chat → node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  // 9) REGRESSION: Wire Map still functional (12 entries after recenter) + audit.
  await page.getByTestId("tab-wiremap").click();
  await page.waitForSelector('[data-testid="wiremap"]', { timeout: 5000 });
  await page.getByTestId("wm-project-select").selectOption("llm-lego");
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="wm-scroll"] tbody tr').length >= 12, null, { timeout: 5000 }).catch(() => {});
  const wmDoc = await api("/api/wireframes/llm-lego");
  check("Wire Map llm-lego has 12 entries", (wmDoc.json?.entries || []).length === 12);
  await page.getByTestId("wm-audit").click();
  const auditText = await page.locator('[data-testid="wm-audit-report"] pre').first().textContent().catch(() => "");
  check("Wire Map audit runs (coverage report)", (auditText || "").includes("Couverture") || (auditText || "").includes("mappés"));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL LIBRARY CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("library_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

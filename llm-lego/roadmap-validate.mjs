// Library Passe 5 (Roadmap) + Passe 6 completion (Goal→milestone attach) validation.
// Roadmap = ordered milestones (jalons) with title/description/status and an OPTIONAL
// goalRef per milestone (links a Goal brick). Plus multi-kind list/filter/editor,
// duplication, and full regressions (double-run, Wire Map 12, all other kinds).
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
  { const cur = await api("/api/library"); assertTestLibrary(cur.json, "roadmap"); for (const b of (cur.json?.bricks || [])) if (b.kind === "roadmap" || b.kind === "goal") await api("/api/library/" + b.id, { method: "DELETE" }); }
  // Seed Goal bricks (before reload so the client list includes them).
  await post({ id: "goal-fs", kind: "goal", name: "Créer un logiciel complet", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { text: "Produis un logiciel complet à partir de la roadmap.", category: "produit" }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await post({ id: "goal-fs2", kind: "goal", name: "Goal Canvas", maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, payload: { text: "x", category: "" }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 10000 });
  await page.getByTestId("tab-library").click();

  // 0) "+ Nouveau ▾" now lists all 11 kinds.
  await page.getByTestId("lib-new").click();
  const menu = await page.$$eval('[data-testid="lib-new-menu"] .pal-menu-i', (els) => els.map((e) => e.textContent));
  check("+ Nouveau lists all 11 kinds (7 + Router/Tool/Note/Artefact)", JSON.stringify(menu) === JSON.stringify(["Agent", "Prompt", "Chaîne", "Oracle", "Roadmap", "Goal", "Sortie attendue", "Router", "Tool", "Note", "Artefact"]));

  // 1) Create a Roadmap → milestone editor.
  await page.getByTestId("lib-new-roadmap").click();
  await page.waitForSelector('[data-testid="lib-editor-roadmap"]', { timeout: 4000 });
  await fillLib("lib-name", "Roadmap Studio E2E");
  await fillLib("lib-category", "produit");
  await page.getByTestId("lib-add-milestone").click();
  await page.waitForSelector('[data-testid="ms-0"]', { timeout: 3000 });
  check("roadmap editor: add milestone → jalon row appears", await page.getByTestId("ms-0").isVisible());
  await fillLib("ms-title-0", "Jalon 1 — MVP");
  await page.getByTestId("ms-status-0").selectOption("doing");
  await fillLib("ms-desc-0", "Livrer le socle minimal.");
  await saveBrickUI("Roadmap Studio E2E");

  const list1 = await api("/api/library");
  const rSummary = (list1.json?.bricks || []).find((b) => b.name === "Roadmap Studio E2E");
  check("roadmap appears in GET /api/library with kind=roadmap", !!rSummary && rSummary.kind === "roadmap");
  const rid = rSummary?.id;
  const rdoc = rid ? (await api("/api/library/" + rid)).json : null;
  const m0 = rdoc?.payload?.milestones?.[0];
  check("roadmap milestone persisted (title/status/description, goalRef null)",
    (rdoc?.payload?.milestones || []).length === 1 && m0?.title === "Jalon 1 — MVP" && m0?.status === "doing" && m0?.description === "Livrer le socle minimal." && (m0?.goalRef === null || m0?.goalRef === undefined));

  // 2) GOAL → MILESTONE attach: select the goal in the milestone's goal dropdown.
  await page.getByTestId("ms-goal-0").selectOption("goal-fs");
  await page.waitForSelector('[data-testid="ms-goal-label-0"]', { timeout: 3000 });
  check("milestone goal dropdown → label shows the linked goal", /Créer un logiciel complet/.test((await page.getByTestId("ms-goal-label-0").textContent()) || ""));
  await saveBrickUI("Roadmap Studio E2E");
  const rdoc2 = (await api("/api/library/" + rid)).json;
  check("Goal attached to milestone → milestone.goalRef persisted on server", rdoc2?.payload?.milestones?.[0]?.goalRef === "goal-fs");

  // 3) Filter "Roadmap" isolates.
  await page.getByTestId("lib-filter").selectOption("roadmap");
  await page.waitForTimeout(150);
  const roadmapRows = await page.$$eval('[data-testid="lib-list"] tbody tr[data-testid^="lib-row-"]', (els) => els.map((e) => e.getAttribute("data-kind")));
  check("filter Roadmap → only roadmap rows", roadmapRows.length >= 1 && roadmapRows.every((k) => k === "roadmap"));

  // 4) Duplicate roadmap → new id, draft, milestones (incl. goalRef) identical.
  const origPayload = (await api("/api/library/" + rid)).json?.payload;
  await page.getByTestId("lib-dup-" + rid).click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("Dupliqué"), null, { timeout: 5000 });
  const list2 = await api("/api/library");
  const dup = (list2.json?.bricks || []).find((b) => b.name === "Roadmap Studio E2E" && b.id !== rid && b.kind === "roadmap");
  check("duplicate roadmap → new id + draft + milestones identical (goalRef kept)",
    !!dup && dup.maturity === "draft" && JSON.stringify((await api("/api/library/" + dup.id)).json?.payload) === JSON.stringify(origPayload));

  await page.screenshot({ path: "builder_library_roadmap.png", fullPage: false });

  // 5) Remove-milestone works.
  await page.getByTestId("lib-filter").selectOption("roadmap");
  await openBrick(rid);
  await page.getByTestId("ms-remove-0").click();
  await page.waitForTimeout(150);
  check("remove milestone → row gone from editor", (await page.$$eval('[data-testid="ms-0"]', (e) => e.length)) === 0);

  // cleanup
  if (rid) await api("/api/library/" + rid, { method: "DELETE" });
  if (dup) await api("/api/library/" + dup.id, { method: "DELETE" });
  await api("/api/library/goal-fs", { method: "DELETE" });

  // 6) REGRESSION: the 5 prior editors still render + Goal attach to canvas node.
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-router").click();
  const rNode = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "router").id);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("goal");
  await openBrick("goal-fs2");
  check("REGRESSION Passe 6: Goal editor attach button present for selected node", !(await page.getByTestId("lib-attach").isDisabled()));
  await page.getByTestId("lib-attach").click();
  await page.waitForFunction((id) => { const n = (window.__ui?.nodes || []).find((x) => x.id === id); return n && n.data && n.data.goalRef; }, rNode, { timeout: 5000 });
  check("REGRESSION Passe 6: Goal still attaches to a canvas node", (await page.evaluate((id) => window.__ui.nodes.find((x) => x.id === id).data.goalRef, rNode)) === "goal-fs2");
  await api("/api/library/goal-fs2", { method: "DELETE" });

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
  log(out.pass ? "\n=== ALL ROADMAP+GOAL CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("roadmap_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

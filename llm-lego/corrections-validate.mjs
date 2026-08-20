// corrections-validate.mjs — validates the 3 canvas corrections:
//   1) scrollable content-sized canvas, handles never disabled at edges
//   2) multi-selection (marquee, shift-click toggle, group drag, deselect)
//   3) editable sourceRef + notes on the Agent fiche
// Plus: the already-saved Chaîne idée→IMP still reloads and executes faithfully.
// Runs against a REAL-library server (default :3202) so it can load the saved chain.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3202";
// La chaîne idée→IMP a été renommée plusieurs fois (autopilot → prompt_chain_map / marquée
// « ANCIEN »). Au lieu d'un nom exact fragile (cause de l'échec pendant plusieurs passes), on
// la retrouve par un SOUS-CHAÎNE stable + la FORME qui exerce reload+HumanGate (6 nœuds, 1 gate).
const CHAIN_NAME_MATCH = "idée→IMP";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("dialog", (d) => d.accept());
const perr = [];
page.on("pageerror", (e) => perr.push(String(e)));

const lastNodeId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);
const nodePos = (id) => page.evaluate((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return { x: n.x, y: n.y }; }, id);
const scrollTo = (x) => page.locator("[data-testid=\"canvas-active\"] .canvas").evaluate((el, v) => { el.scrollLeft = Math.max(0, v); }, x);

async function dragBodyTo(id, tx, ty) {
  const b = await page.locator(`[data-node-id="${id}"] .nbody`).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 12 }); await page.mouse.up();
}
async function drawEdge(from, to, fs, ts) {
  const before = await page.evaluate(() => window.__ui.edges.length);
  const hf = await page.locator(`[data-handle-node="${from}"][data-handle-side="${fs}"]`).boundingBox();
  const ht = await page.locator(`[data-handle-node="${to}"][data-handle-side="${ts}"]`).boundingBox();
  await page.mouse.move(hf.x + hf.width / 2, hf.y + hf.height / 2);
  await page.mouse.down();
  await page.mouse.move(hf.x + hf.width / 2 + 15, hf.y + hf.height / 2, { steps: 3 });
  await page.mouse.move(ht.x + ht.width / 2, ht.y + ht.height / 2, { steps: 12 });
  await page.mouse.up();
  if (await page.evaluate(() => window.__ui.edges.length) === before) {
    // fallback: drop on the target node BODY (its onMouseUp also finishes a draw)
    const bb = await page.locator(`[data-node-id="${to}"] .nbody`).boundingBox();
    await page.mouse.move(hf.x + hf.width / 2, hf.y + hf.height / 2);
    await page.mouse.down();
    await page.mouse.move(hf.x + hf.width / 2 + 15, hf.y + hf.height / 2, { steps: 3 });
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 });
    await page.mouse.up();
  }
}
async function posePrompt(importId, tx, ty) {
  await page.getByTestId("add-prompt").click();
  const id = await lastNodeId();
  await page.waitForSelector('[data-testid="import-chooser"]');
  await page.getByTestId("import-select").selectOption(importId);
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && n.attachedPrompt; }, id, { timeout: 6000 });
  await dragBodyTo(id, tx, ty);
  return id;
}
// Scroll-aware edge draw: bring the source node ~60px from the left so BOTH the
// source and the (adjacent) target handles sit inside the viewport, then draw.
async function drawEdgeSmart(from, to, fs, ts) {
  const fx = (await nodePos(from)).x;
  await page.locator("[data-testid=\"canvas-active\"] .canvas").evaluate((el, x) => { el.scrollLeft = Math.max(0, x - 60); }, fx);
  await wait(60);
  await drawEdge(from, to, fs, ts);
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-prompt"]', { timeout: 20000 });
  check("builder rendered (no Babel/JSX crash)", perr.length === 0);

  // ══ Correction 1 — scroll + handles jamais désactivés ══════════════════════
  log("=== Correction 1 — canvas scrollable / handles actifs ===");
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0);
  // 6 nœuds en UNE rangée horizontale. Le canvas visible commence à ~x=160px et fait
  // ~989px de large ; on pose sur toute la bande draggable (screen 200→1100), ce qui
  // porte le CONTENU au-delà du viewport (scroll) et aurait, sous l'ancien code, désactivé
  // le handle droit du dernier nœud. Toutes les poignées utiles restent dans la vue.
  const ap = "autopilot-prompt-";
  // 5 nœuds espacés (200px, gap ~28px) posés à scroll=0 (centres écran 266..1066),
  // puis un 6e placé AU-DELÀ du viewport en deux temps (drag jusqu'au bord → scroll →
  // drag plus loin) — impossible sous l'ancien code (handle droit désactivé au bord).
  const ids = [];
  ids.push(await posePrompt(ap + "roadmap-001", 266, 250));  // canvas n.x ≈ 20
  ids.push(await posePrompt(ap + "redteam-001", 466, 250));  // ≈ 220
  ids.push(await posePrompt(ap + "fusion-001", 666, 250));   // ≈ 420
  ids.push(await posePrompt(ap + "extract-001", 866, 250));  // ≈ 620
  ids.push(await posePrompt(ap + "roadmap-001", 1066, 250)); // ≈ 820 (bord → active le scroll)
  // 6e nœud: hop1 jusqu'au bord droit (canvas ≈854), puis scroll et hop2 vers canvas ≈1040.
  const id6 = await posePrompt(ap + "redteam-001", 1100, 250);
  await scrollTo(200); await wait(60);
  await dragBodyTo(id6, 1086, 250); // toCanvas(1086)@200 = 1126 (centre) → n.x ≈ 1040
  await scrollTo(0); await wait(60);
  ids.push(id6);
  check("6 nœuds posés en une rangée horizontale", ids.length === 6);
  const scrollState = await page.locator("[data-testid=\"canvas-active\"] .canvas").evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  check("canvas devient scrollable horizontalement (scrollWidth > clientWidth)", scrollState.sw > scrollState.cw + 2);
  const disabledHandles = await page.$$eval(".handle.clipped", (els) => els.length);
  check("AUCUN handle désactivé au bord (.handle.clipped === 0)", disabledHandles === 0);
  const anyNonInteractive = await page.$$eval(".handle.draggable", (els) => els.filter((e) => getComputedStyle(e).pointerEvents === "none").length);
  check("tous les handles restent interactifs (pointer-events != none)", anyNonInteractive === 0);
  check("indice de défilement affiché quand ça dépasse", await page.locator('[data-testid="canvas-scroll-hint"]').count() > 0);
  // Tracer les 5 edges de la rangée — scroll-aware (chaque nœud éloigné reste connectable).
  for (let i = 0; i < 5; i++) await drawEdgeSmart(ids[i], ids[i + 1], "right", "left");
  await scrollTo(0);
  const edgeCount = await page.evaluate(() => window.__ui.edges.length);
  log(`node canvas X: ${JSON.stringify(await page.evaluate(() => window.__ui.nodes.map((n) => Math.round(n.x))))} — edges=${edgeCount}`);
  check("Chaîne 6 nœuds / 5 edges tracée SANS layout multi-rangées (single row naturel)", edgeCount === 5);
  await page.screenshot({ path: "builder_c1_scroll.png" });

  // ══ Correction 2 — sélection multiple ═════════════════════════════════════
  log("=== Correction 2 — sélection multiple ===");
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0);
  const a = await posePrompt(ap + "roadmap-001", 240, 250);
  const b = await posePrompt(ap + "redteam-001", 460, 250);
  const c = await posePrompt(ap + "fusion-001", 680, 250);
  // Marquee: glisser depuis un coin VIDE du canvas (x>160, au-dessus des nœuds) couvrant les 3.
  await page.mouse.move(190, 110);
  await page.mouse.down();
  await page.mouse.move(860, 340, { steps: 16 });
  const marqueeVisible = await page.locator('[data-testid="marquee"]').count();
  await page.mouse.up();
  const selAfter = await page.evaluate(() => window.__ui.selectedIds);
  check("marquee dessiné pendant le glisser", marqueeVisible > 0);
  check("marquee sélectionne les 3 nœuds intersectés", selAfter.length === 3 && [a, b, c].every((id) => selAfter.includes(id)));
  const selectedClass = await page.$$eval(".node.selected", (els) => els.length);
  check("les 3 nœuds sélectionnés portent l'indicateur visuel .selected", selectedClass === 3);
  await page.screenshot({ path: "builder_c2_marquee.png" });
  // Déplacement groupé: glisser UN des sélectionnés → les 3 bougent ensemble.
  const before = { a: await nodePos(a), b: await nodePos(b), c: await nodePos(c) };
  await dragBodyTo(b, 460, 470); // move node b down ~220px
  const after = { a: await nodePos(a), b: await nodePos(b), c: await nodePos(c) };
  const dyB = after.b.y - before.b.y;
  const groupMoved = dyB > 100
    && Math.abs((after.a.y - before.a.y) - dyB) < 8 && Math.abs((after.c.y - before.c.y) - dyB) < 8
    && Math.abs(after.a.x - before.a.x) < 8 && Math.abs(after.c.x - before.c.x) < 8;
  check("déplacement groupé: les 3 nœuds bougent du même delta (positions relatives conservées)", groupMoved);
  // Shift+clic ajoute puis retire un 4e nœud. posePrompt laisse son nouveau nœud
  // sélectionné → on repart d'une sélection simple propre (clic vide + clic simple).
  const dnode = await posePrompt(ap + "extract-001", 900, 250);
  await page.mouse.click(190, 110);                      // deselect all
  await page.locator(`[data-node-id="${a}"]`).click();  // single-select a
  await page.locator(`[data-node-id="${dnode}"]`).click({ modifiers: ["Shift"] });
  let sel = await page.evaluate(() => window.__ui.selectedIds);
  check("Shift+clic AJOUTE un nœud à la sélection (sans perdre l'autre)", sel.includes(dnode) && sel.includes(a) && sel.length === 2);
  await page.locator(`[data-node-id="${dnode}"]`).click({ modifiers: ["Shift"] });
  sel = await page.evaluate(() => window.__ui.selectedIds);
  check("Shift+clic RETIRE le nœud de la sélection (l'autre reste)", !sel.includes(dnode) && sel.includes(a));
  // Désélection: clic sur zone vide du canvas.
  await page.mouse.click(190, 110);
  sel = await page.evaluate(() => window.__ui.selectedIds);
  check("clic sur zone vide → désélection totale", sel.length === 0);
  // Sélection simple inchangée: clic sans modificateur sur un seul nœud.
  await page.locator(`[data-node-id="${a}"]`).click();
  const single = await page.evaluate(() => window.__ui.selectedIds);
  const oneSelectedVisual = await page.$$eval(".node.selected", (els) => els.length);
  check("sélection simple inchangée (1 nœud sélectionné + inspecté)", single.length === 1 && single[0] === a && oneSelectedVisual === 1);

  // ══ Correction 3 — sourceRef + notes sur fiche Agent ══════════════════════
  log("=== Correction 3 — sourceRef + notes (Agent) ===");
  await page.getByTestId("tab-library").click();
  await page.waitForSelector('[data-testid="library"]');
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-agent").click();
  await page.waitForSelector('[data-testid="lib-editor-agent"]');
  await page.getByTestId("lib-name").fill("TEST sourceRef+notes (à supprimer)");
  await page.getByTestId("lib-sourceref").fill("autopilot.py:393-406");
  await page.getByTestId("lib-notes").fill("Note libre: routage CEO qwen3.6-27b; incohérence Devstral signalée.");
  await page.getByTestId("lib-save").click();
  await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 6000 });
  const created = ((await getJson("/api/library"))?.bricks || []).find((x) => x.name === "TEST sourceRef+notes (à supprimer)");
  const cdoc = created ? await getJson("/api/library/" + created.id) : null;
  check("sourceRef éditable persisté sur la fiche Agent", cdoc?.sourceRef === "autopilot.py:393-406");
  check("notes éditable persisté sur la fiche Agent (payload.notes)", /Devstral/.test(cdoc?.payload?.notes || ""));
  if (created) await api("/api/library/" + created.id, { method: "DELETE" }); // cleanup test brick

  // ══ Non-régression: la Chaîne idée→IMP existante recharge + s'exécute ══════
  log("=== Non-régression — Chaîne idée→IMP existante ===");
  // Parmi les chaînes « idée→IMP », prendre celle dont la forme exerce reload + HumanGate
  // (6 nœuds dont 1 humangate). Robuste aux renommages futurs (métadonnées → payload fetch).
  const candidates = ((await getJson("/api/library"))?.bricks || []).filter((x) => x.kind === "chain" && (x.name || "").includes(CHAIN_NAME_MATCH));
  let chain = null;
  for (const c of candidates) {
    const full = await getJson("/api/library/" + c.id);
    const ns = (full && full.payload && full.payload.nodes) || [];
    if (ns.length === 6 && ns.some((n) => n.type === "humangate")) { chain = c; break; }
  }
  check("Chaîne idée→IMP (forme HumanGate) toujours présente dans library/", !!chain);
  if (chain) {
    await page.getByTestId("tab-canvas").click();
    await page.getByTestId("btn-clear").click();
    await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0);
    await page.getByTestId("example-dropdown").click();
    await page.getByTestId("example-chain-" + chain.id).click();
    await page.waitForFunction(() => (window.__ui?.nodes || []).length === 6, null, { timeout: 6000 });
    const rel = await page.evaluate(() => ({
      nodes: window.__ui.nodes.length, edges: window.__ui.edges.length,
      prompts: window.__ui.nodes.filter((n) => n.attachedPrompt).length,
      oracles: window.__ui.nodes.filter((n) => n.attachedOracle).length,
      gates: window.__ui.nodes.filter((n) => n.type === "humangate").length,
    }));
    check("Chaîne rechargée fidèlement (6 nœuds/5 edges/4 prompts/1 oracle/1 gate)",
      rel.nodes === 6 && rel.edges === 5 && rel.prompts === 4 && rel.oracles === 1 && rel.gates === 1);
    // Exécution: doit atteindre le HumanGate puis se compléter après approbation.
    await page.getByTestId("btn-execute").click();
    let reached = true;
    try { await page.waitForSelector('[data-testid="humangate-pause"]', { timeout: 20000 }); } catch { reached = false; }
    check("Chaîne existante s'exécute jusqu'au HumanGate (pause)", reached);
    if (reached) {
      await page.getByTestId("hg-approve").click();
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="trace-step"]').length > 0 && !((document.querySelector('[data-testid="status"]')?.textContent || "").includes("⏳")), null, { timeout: 15000 });
      const order = await page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
      check("Chaîne existante s'exécute de bout en bout (≥6 étapes tracées)", order.length >= 6);
    }
  }

  check("aucune erreur JS pendant toute la passe", perr.length === 0);
  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL CORRECTION CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (err) {
  log(`💥 ${err && err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : err}`);
  if (perr.length) log("pageerrors: " + perr.slice(0, 3).join(" || "));
  try { await page.screenshot({ path: "builder_corrections_error.png" }); } catch {}
  out.error = String(err);
} finally {
  writeFileSync("corrections_validation_result.json", JSON.stringify(out, null, 2), "utf-8");
  await browser.close();
}
process.exit(out.pass ? 0 : 1);

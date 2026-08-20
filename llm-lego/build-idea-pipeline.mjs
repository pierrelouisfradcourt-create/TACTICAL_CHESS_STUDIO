// build-idea-pipeline.mjs — Profil LM + Chaîne idée→IMP, CONSTRUITS À LA SOURIS.
//
// HARD CONSTRAINT of this passe: every piece of FINAL CONTENT (the Profil LM brick,
// every node, every edge, the saved Chain) is created through the builder UI via
// simulated user gestures (click / type / drag). NO POST /api/library, NO
// window.__setGraph, NO generator script for content. The only API calls here are
// read-only GETs used to VERIFY persistence after the UI did the work.
//
// Friction discovered while building by mouse is recorded in out.frictions, never
// worked around with a shortcut.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3200";
const out = { steps: [], checks: {}, frictions: [], pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const friction = (where, observed, expected) => { out.frictions.push({ where, observed, expected }); log(`⚠ FRICTION [${where}] ${observed} | attendu: ${expected}`); };
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; }; // read-only verification

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("dialog", (d) => d.accept());

const lastNodeId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);
const edgeCount = () => page.evaluate(() => window.__ui.edges.length);

async function dragNodeTo(id, tx, ty) {
  const b = await page.locator(`[data-node-id="${id}"] .nbody`).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 14 });
  await page.mouse.up();
}
// Draw an edge by dragging from the source handle. Falls back to dropping on the
// target node BODY (the node's own onMouseUp also finishes a draw) if the tiny
// target handle was missed — then verifies the edge actually registered.
async function drawEdge(from, to, fromSide, toSide) {
  const before = await edgeCount();
  const hf = await page.locator(`[data-handle-node="${from}"][data-handle-side="${fromSide}"]`).boundingBox();
  const ht = await page.locator(`[data-handle-node="${to}"][data-handle-side="${toSide}"]`).boundingBox();
  await page.mouse.move(hf.x + hf.width / 2, hf.y + hf.height / 2);
  await page.mouse.down();
  await page.mouse.move(hf.x + hf.width / 2 + 15, hf.y + hf.height / 2, { steps: 3 }); // activate draw
  await page.mouse.move(ht.x + ht.width / 2, ht.y + ht.height / 2, { steps: 12 });
  await page.mouse.up();
  if (await edgeCount() === before) {
    const bb = await page.locator(`[data-node-id="${to}"] .nbody`).boundingBox();
    await page.mouse.move(hf.x + hf.width / 2, hf.y + hf.height / 2);
    await page.mouse.down();
    await page.mouse.move(hf.x + hf.width / 2 + 15, hf.y + hf.height / 2, { steps: 3 });
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 });
    await page.mouse.up();
  }
}
async function poseImportPark(addTestId, importId, attachedKind, tx, ty) {
  await page.getByTestId(addTestId).click();
  const id = await lastNodeId();
  await page.waitForSelector('[data-testid="import-chooser"]', { timeout: 5000 });
  await page.getByTestId("import-select").selectOption(importId);
  await page.waitForFunction(
    ({ i, k }) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && !!n[k]; },
    { i: id, k: attachedKind }, { timeout: 6000 },
  );
  await dragNodeTo(id, tx, ty);
  return id;
}

const PROFIL_NAME = "Profil d'appel LM — autopilot (Director)";
const CHAIN_NAME = "Pipeline idée→IMP (autopilot)";

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });

  // ══════════════════════════════════════════════════════════════════════════
  // PARTIE 1 — Profil LM, à la souris (+ Nouveau → Agent → formulaire → Sauver)
  // ══════════════════════════════════════════════════════════════════════════
  log("=== PARTIE 1 — Profil LM (à la souris) ===");
  const existingProfil = ((await getJson("/api/library"))?.bricks || []).find((b) => b.kind === "agent" && b.name === PROFIL_NAME);
  if (existingProfil) {
    log(`Profil LM déjà présent (${existingProfil.id}) — construit à la souris lors d'un run précédent, réutilisé (pas de doublon).`);
  } else {
    await page.getByTestId("tab-library").click();
    await page.waitForSelector('[data-testid="library"]', { timeout: 5000 });
    await page.getByTestId("lib-new").click();                    // "＋ Nouveau ▾"
    await page.getByTestId("lib-new-agent").click();              // → Agent
    await page.waitForSelector('[data-testid="lib-editor-agent"]', { timeout: 5000 });
    await page.getByTestId("lib-name").fill(PROFIL_NAME);
    await page.getByTestId("lib-role").fill("director");
    await page.getByTestId("lib-memoire").fill("Injecte 04_STUDIO.md[:2000] en préfixe de tout system prompt (build_system_prompt, autopilot.py:393-406).");
    await page.getByTestId("lib-gardeFou").fill("Routage CEO → qwen3.6-27b pour ceo_brief/fusion_deep (_route_model autopilot.py:420). ⚠ Nom 'Devstral' obsolète dans l'UI (modèle réel = Qwen2.5-14B) — signalé, non corrigé.");
    await page.getByTestId("lib-modele").fill("qwen2.5-14b-instruct");
    await page.getByTestId("lib-temperature").fill("0.4");
    friction("Partie 1 — formulaire Agent", "aucun champ sourceRef éditable ni champ 'notes' (sourceRef seulement AFFICHÉ s'il existe déjà, builder.html:1529)", "un champ sourceRef + un champ notes ; source documentée inline dans mémoire/garde-fou en attendant");
    await page.getByTestId("lib-save").click();
    await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 6000 });
    await page.screenshot({ path: "builder_profil_lm.png", fullPage: false });
  }

  const lib1 = (await getJson("/api/library"))?.bricks || [];
  const profSummary = lib1.find((b) => b.kind === "agent" && b.name === PROFIL_NAME);
  check("Profil LM présent dans la Bibliothèque (kind=agent)", !!profSummary);
  const profDoc = profSummary ? await getJson("/api/library/" + profSummary.id) : null;
  check("Profil LM: modèle=qwen2.5-14b-instruct + temperature=0.4",
    !!profDoc && profDoc.payload.modele === "qwen2.5-14b-instruct" && profDoc.payload.temperature === 0.4);
  check("Profil LM: mémoire renseigne l'injection 04_STUDIO.md", !!profDoc && /04_STUDIO\.md/.test(profDoc.payload.memoire || ""));
  check("Profil LM: notes mentionnent routage CEO qwen3.6-27b + Devstral",
    !!profDoc && /qwen3\.6-27b/.test(profDoc.payload.gardeFou || "") && /Devstral/.test(profDoc.payload.gardeFou || ""));
  log(`Profil LM id: ${profSummary?.id}`);

  // ══════════════════════════════════════════════════════════════════════════
  // PARTIE 2 — Chaîne idée→IMP, à la souris sur le Canvas
  // ══════════════════════════════════════════════════════════════════════════
  log("=== PARTIE 2 — Chaîne idée→IMP (à la souris) ===");
  // UX finding: the canvas is ~989px wide (right ~350px is the inspector); nodes whose
  // left/right handle reaches a canvas edge get that handle disabled (pointer-events:none,
  // .clipped). A 6-node horizontal pipeline doesn't fit — laid out on 2 rows inside the
  // usable band. Documented as a legitimate layout constraint, not worked around.
  friction("Partie 2 — largeur canvas", "canvas utile ≈989px (panneau inspecteur à droite) ; handles au bord = désactivés (.clipped)", "canvas plus large ou auto-scroll ; contourné par un layout sur 2 rangées à l'intérieur de la bande utile");

  await page.getByTestId("tab-canvas").click();
  await page.waitForSelector('[data-testid="add-prompt"]', { timeout: 10000 });
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0, null, { timeout: 4000 });

  // Row 1 (y=230): the 4 pipeline steps as llm nodes, real autopilot prompts attached via import.
  const roadmap = await poseImportPark("add-prompt", "autopilot-prompt-roadmap-001", "attachedPrompt", 310, 230);
  const redteam = await poseImportPark("add-prompt", "autopilot-prompt-redteam-001", "attachedPrompt", 525, 230);
  const fusion  = await poseImportPark("add-prompt", "autopilot-prompt-fusion-001",  "attachedPrompt", 740, 230);
  const extract = await poseImportPark("add-prompt", "autopilot-prompt-extract-001", "attachedPrompt", 955, 230);
  check("4 nœuds d'étape posés depuis la palette (llm) + prompts attachés via import",
    /^llm-/.test(roadmap) && /^llm-/.test(redteam) && /^llm-/.test(fusion) && /^llm-/.test(extract));

  // Row 2 (y=470): needs_human Oracle (guard after EXTRACT) + terminal HumanGate.
  const oracle = await poseImportPark("add-oracle", "autopilot-oracle-needs-human-001", "attachedOracle", 955, 470);
  await page.getByTestId("add-humangate").click();               // HumanGate = addNode (no import)
  const gate = await lastNodeId();
  await dragNodeTo(gate, 740, 470);
  check("Oracle needs_human + HumanGate posés aux points de garde-fou",
    /^agent-/.test(oracle) && /^humangate-/.test(gate));

  const attachOk = await page.evaluate(({ ids }) => {
    const g = (id) => window.__ui.nodes.find((n) => n.id === id);
    return ids.every((id) => { const n = g(id); return n && n.attachedPrompt && typeof n.data.prompt === "string" && n.data.prompt.length > 0; });
  }, { ids: [roadmap, redteam, fusion, extract] });
  check("prompts attachés via le panneau d'import (data.prompt peuplé, pas retapé)", attachOk);

  // Draw the pipeline edges BY MOUSE (handle → handle), in real pipeline order.
  await drawEdge(roadmap, redteam, "right", "left");
  await drawEdge(redteam, fusion, "right", "left");
  await drawEdge(fusion, extract, "right", "left");
  await drawEdge(extract, oracle, "bottom", "top");
  await drawEdge(oracle, gate, "left", "right");
  const edges = await page.evaluate(() => window.__ui.edges.map((e) => ({ from: e.from, to: e.to })));
  const hasEdge = (a, b) => edges.some((e) => e.from === a && e.to === b);
  const allEdges = hasEdge(roadmap, redteam) && hasEdge(redteam, fusion) && hasEdge(fusion, extract) && hasEdge(extract, oracle) && hasEdge(oracle, gate);
  check("5 edges tracés à la souris dans l'ordre du pipeline", edges.length === 5 && allEdges);
  log(`edges: ${edges.map((e) => e.from + "→" + e.to).join(", ")}`);
  await page.screenshot({ path: "builder_pipeline_built.png", fullPage: false });

  // Execute end-to-end on mockAdapters → run pauses at the HumanGate → approve to finish.
  await page.getByTestId("btn-execute").click();
  let reachedGate = true;
  try {
    await page.waitForSelector('[data-testid="humangate-pause"]', { timeout: 20000 });
  } catch {
    reachedGate = false;
    const st = await page.locator('[data-testid="status"]').textContent().catch(() => "");
    friction("Partie 2 — exécution", `le run n'a pas atteint le HumanGate (status: ${st})`, "pause paused_humangate au gate terminal");
  }
  check("exécution atteint le HumanGate et met en pause (paused_humangate)", reachedGate);
  if (reachedGate) {
    await page.getByTestId("hg-approve").click();
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="trace-step"]').length > 0 && !((document.querySelector('[data-testid="status"]')?.textContent || "").includes("⏳")),
      null, { timeout: 15000 },
    );
    const order = await page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
    const pos = (id) => order.indexOf(id);
    const ordered = pos(roadmap) >= 0 && pos(roadmap) < pos(redteam) && pos(redteam) < pos(fusion) && pos(fusion) < pos(extract) && pos(extract) < pos(oracle);
    check("exécution de bout en bout dans le bon ordre (roadmap→redteam→fusion→extract→oracle)", ordered);
    log(`ordre trace: ${order.join(" → ")}`);
  }
  await page.screenshot({ path: "builder_pipeline_exec.png", fullPage: false });

  // Save as Chain via "💾 chaîne" — fill the modal by hand (skip if it already exists).
  const chainExists = ((await getJson("/api/library"))?.bricks || []).find((b) => b.kind === "chain" && b.name === CHAIN_NAME);
  if (!chainExists) {
    await page.getByTestId("btn-save-chain").click();
    await page.waitForSelector('[data-testid="chain-name"]', { timeout: 5000 });
    await page.getByTestId("chain-name").fill(CHAIN_NAME);
    await page.getByTestId("chain-category").fill("autopilot-import");
    await page.getByTestId("chain-tags").fill("pipeline, roadmap, production-réel");
    await page.getByTestId("chain-save-submit").click();
    await page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 6000 });
  } else {
    log(`Chaîne "${CHAIN_NAME}" déjà présente (${chainExists.id}) — réutilisée.`);
  }

  const lib2 = (await getJson("/api/library"))?.bricks || [];
  const chainSummary = lib2.find((b) => b.kind === "chain" && b.name === CHAIN_NAME);
  check("Chaîne sauvegardée présente dans la Bibliothèque (kind=chain)", !!chainSummary);
  const chainDoc = chainSummary ? await getJson("/api/library/" + chainSummary.id) : null;
  const gNodes = chainDoc?.payload?.nodes || [];
  const gEdges = chainDoc?.payload?.edges || [];
  check("Chaîne persistée: 6 nœuds + 5 edges + catégorie autopilot-import",
    gNodes.length === 6 && gEdges.length === 5 && chainDoc?.payload?.category === "autopilot-import");
  log(`Chaîne id: ${chainSummary?.id} (nodes=${gNodes.length} edges=${gEdges.length})`);

  // Reload from the Library view-selector → must reproduce what we drew.
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0, null, { timeout: 4000 });
  await page.getByTestId("example-dropdown").click();
  await page.getByTestId("example-chain-" + chainSummary.id).click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 6, null, { timeout: 6000 });
  const reloaded = await page.evaluate(() => ({
    nodes: window.__ui.nodes.length,
    edges: window.__ui.edges.length,
    prompts: window.__ui.nodes.filter((n) => n.attachedPrompt).length,
    oracles: window.__ui.nodes.filter((n) => n.attachedOracle).length,
    gates: window.__ui.nodes.filter((n) => n.type === "humangate").length,
  }));
  check("Chaîne rechargée reproduit fidèlement (6 nœuds, 5 edges, 4 prompts, 1 oracle, 1 gate)",
    reloaded.nodes === 6 && reloaded.edges === 5 && reloaded.prompts === 4 && reloaded.oracles === 1 && reloaded.gates === 1);
  await page.screenshot({ path: "builder_pipeline_reloaded.png", fullPage: false });

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== CONSTRUCTION À LA SOURIS: ALL CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (err) {
  log(`💥 ${err && err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : err}`);
  try { await page.screenshot({ path: "builder_pipeline_error.png", fullPage: false }); } catch {}
  out.error = String(err);
} finally {
  writeFileSync("build_idea_pipeline_result.json", JSON.stringify(out, null, 2), "utf-8");
  await browser.close();
}
process.exit(out.pass ? 0 : 1);

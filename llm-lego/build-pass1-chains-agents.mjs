// build-pass1-chains-agents.mjs — Import Passe 1, CONSTRUIT À LA SOURIS (Playwright UI).
//
// HARD CONSTRAINT (identique à build-idea-pipeline.mjs) : tout le CONTENU FINAL (briques
// prompt/agent, graphes de chaîne, sauvegardes) est créé par gestes UI simulés
// (click/type/selectOption/drag). AUCUN POST /api/library direct, AUCUN window.__setGraph
// pour le contenu. Les seuls appels réseau ici sont : (a) des GET read-only de vérification,
// (b) la LECTURE locale de run_chain.py / prompt_chain_map.json pour SOURCER le texte exact
//    — ce texte entre ensuite dans les briques uniquement via .fill() (geste UI).
// Idempotent : toute brique déjà présente (par nom) est réutilisée, jamais dupliquée.
// Friction découverte en construisant = enregistrée dans out.frictions, jamais contournée par raccourci.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env["BASE"] ?? "http://localhost:3200";
const out = { steps: [], checks: {}, frictions: [], correspondences: [], pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const friction = (where, observed, expected) => { out.frictions.push({ where, observed, expected }); log(`⚠ FRICTION [${where}] ${observed} | attendu: ${expected}`); };
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; };

// ── SOURCING (lecture locale, fidèle) ───────────────────────────────────────
const runChainSrc = readFileSync(path.join(__dirname, "..", "lab", "chains", "run_chain.py"), "utf-8");
const grabSystem = (name) => {
  const m = runChainSrc.match(new RegExp(name + ' = """([\\s\\S]*?)"""'));
  if (!m) throw new Error("SYSTEM prompt introuvable: " + name);
  return m[1].trim();
};
const SYS = {
  translator: grabSystem("SYSTEM_TRANSLATOR"),
  engineer: grabSystem("SYSTEM_ENGINEER"),
  redteam: grabSystem("SYSTEM_REDTEAM"),
  formatter: grabSystem("SYSTEM_CLAUDE_CODE_FORMATTER"),
};
const chainMap = JSON.parse(readFileSync(path.join(__dirname, "..", "lab", "chains", "prompt_chain_map.json"), "utf-8"));
const AGENTS = chainMap.agents_a_creer;   // 6
const LM = chainMap.lm_config;
log(`Sourcé : 4 SYSTEM_* (${SYS.translator.length}/${SYS.engineer.length}/${SYS.redteam.length}/${SYS.formatter.length} chars), ${AGENTS.length} agents_a_creer, lm_config(${LM.LM_MODEL}/${LM.LM_MODEL_CEO}).`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("dialog", (d) => d.accept());

// ── HELPERS UI (repris de build-idea-pipeline.mjs) ──────────────────────────
const lastNodeId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);
const edgeCount = () => page.evaluate(() => window.__ui.edges.length);
const bricks = async () => (await getJson("/api/library"))?.bricks || [];
const byName = async (name) => (await bricks()).find((b) => b.name === name);

async function dragNodeTo(id, tx, ty) {
  const b = await page.locator(`[data-node-id="${id}"] .nbody`).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 14 });
  await page.mouse.up();
}
async function drawEdge(from, to, fromSide, toSide) {
  const before = await edgeCount();
  const hf = await page.locator(`[data-handle-node="${from}"][data-handle-side="${fromSide}"]`).boundingBox();
  const ht = await page.locator(`[data-handle-node="${to}"][data-handle-side="${toSide}"]`).boundingBox();
  await page.mouse.move(hf.x + hf.width / 2, hf.y + hf.height / 2);
  await page.mouse.down();
  await page.mouse.move(hf.x + hf.width / 2 + 15, hf.y + hf.height / 2, { steps: 3 });
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
    { i: id, k: attachedKind }, { timeout: 6000 });
  await dragNodeTo(id, tx, ty);
  return id;
}
const waitSaved = () => page.waitForFunction(
  () => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"),
  null, { timeout: 8000 });
async function setIfPresent(testid, value, kind = "fill") {
  const loc = page.getByTestId(testid);
  if (await loc.count() === 0) return false;
  if (kind === "select") await loc.selectOption(value); else await loc.fill(value);
  return true;
}

async function openLibrary() {
  await page.getByTestId("tab-library").click();
  await page.waitForSelector('[data-testid="library"]', { timeout: 5000 });
}
async function newBrick(kind) {
  await openLibrary();
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-" + kind).click();
  await page.waitForSelector(`[data-testid="lib-editor-${kind}"]`, { timeout: 5000 });
}

// Idempotent prompt-brick creation. Returns the brick id.
async function ensurePrompt({ name, text, category, sourceRef, maturity = "saved", badge = "real" }) {
  const existing = await byName(name);
  if (existing) { log(`   prompt réutilisé (déjà présent): ${existing.id} « ${name} »`); return existing.id; }
  await newBrick("prompt");
  await page.getByTestId("lib-name").fill(name);
  await page.getByTestId("lib-text").fill(text);
  await setIfPresent("lib-category", category);
  if (!(await setIfPresent("lib-sourceref", sourceRef))) friction("prompt", "champ lib-sourceref absent", "sourceRef éditable");
  await setIfPresent("lib-maturity", maturity, "select");
  await setIfPresent("lib-badge", badge, "select");
  await page.getByTestId("lib-save").click();
  await waitSaved();
  const id = (await byName(name))?.id;
  log(`   prompt créé à la souris: ${id} « ${name} »`);
  return id;
}

// Idempotent agent-brick creation. Returns the brick id.
async function ensureAgent({ name, role, modele, temperature, top_p, max_tokens, memoire, gardeFou, notes, sourceRef, maturity = "saved", badge = "real" }) {
  const existing = await byName(name);
  if (existing) { log(`   agent réutilisé (déjà présent): ${existing.id} « ${name} »`); return existing.id; }
  await newBrick("agent");
  await page.getByTestId("lib-name").fill(name);
  await setIfPresent("lib-role", role || "");
  await setIfPresent("lib-modele", modele || "");
  if (temperature != null) await setIfPresent("lib-temperature", String(temperature));
  if (top_p != null) await setIfPresent("lib-top_p", String(top_p));
  if (max_tokens != null) await setIfPresent("lib-max_tokens", String(max_tokens));
  if (memoire) await setIfPresent("lib-memoire", memoire);
  if (gardeFou) await setIfPresent("lib-gardeFou", gardeFou);
  if (notes) { if (!(await setIfPresent("lib-notes", notes))) friction("agent", "champ lib-notes absent", "notes éditable"); }
  if (!(await setIfPresent("lib-sourceref", sourceRef))) friction("agent", "champ lib-sourceref absent", "sourceRef éditable");
  await setIfPresent("lib-maturity", maturity, "select");
  await setIfPresent("lib-badge", badge, "select");
  await page.getByTestId("lib-save").click();
  await waitSaved();
  const id = (await byName(name))?.id;
  log(`   agent créé à la souris: ${id} « ${name} »`);
  return id;
}

// Build a chain from ordered prompt-brick attaches, run it on mockAdapters, save it.
async function buildRunSaveChain({ chainName, promptIds, category, tags, sourceRef }) {
  const existing = await byName(chainName);
  if (existing) { log(`   chaîne déjà présente (${existing.id}) — réutilisée, pas de doublon.`); return existing.id; }
  await page.getByTestId("tab-canvas").click();
  await page.waitForSelector('[data-testid="add-prompt"]', { timeout: 5000 });
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => window.__ui && window.__ui.nodes.length === 0, null, { timeout: 5000 });
  const pos = [[170, 180], [470, 180], [170, 340], [470, 340]];
  const nodeIds = [];
  for (let i = 0; i < promptIds.length; i++) {
    nodeIds.push(await poseImportPark("add-prompt", promptIds[i], "attachedPrompt", pos[i][0], pos[i][1]));
  }
  // edges: 1.right→2.left, 2.bottom→3.top, 3.right→4.left
  await drawEdge(nodeIds[0], nodeIds[1], "right", "left");
  await drawEdge(nodeIds[1], nodeIds[2], "bottom", "top");
  await drawEdge(nodeIds[2], nodeIds[3], "right", "left");
  const edges = await edgeCount();
  // LIEN, pas copie : chaque nœud doit porter attachedPrompt + producerRef
  const linked = await page.evaluate((ids) => ids.every((id) => {
    const n = window.__ui.nodes.find((x) => x.id === id);
    return n && n.attachedPrompt && n.data.producerRef && typeof n.data.prompt === "string" && n.data.prompt.length > 0;
  }), nodeIds);
  check(`chain « ${chainName} » : 4 prompts attachés (lien producerRef) + ${edges} edges`, linked && edges >= 3);
  // RUN on mockAdapters (chaîne 4×llm, pas de gate → complétion directe)
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="trace-step"]').length > 0
    && !((document.querySelector('[data-testid="status"]')?.textContent || "").includes("⏳")), null, { timeout: 25000 });
  const traceLen = await page.$$eval('[data-testid="trace-step"]', (els) => els.length);
  check(`chain « ${chainName} » : exécutée mockAdapters (${traceLen} trace-steps)`, traceLen >= promptIds.length);
  // SAVE via modal 💾 chaîne
  await page.getByTestId("btn-save-chain").click();
  await page.waitForSelector('[data-testid="chain-name"]', { timeout: 5000 });
  await page.getByTestId("chain-name").fill(chainName);
  await setIfPresent("chain-category", category);
  await setIfPresent("chain-tags", tags);
  await page.getByTestId("chain-save-submit").click();
  await waitSaved();
  const id = (await byName(chainName))?.id;
  // sourceRef n'est pas exposé au save → l'éditer après (header lib-sourceref)
  await openLibrary();
  await page.getByTestId("lib-open-" + id).click();
  await page.waitForSelector('[data-testid="lib-editor-chain"]', { timeout: 5000 });
  if (!(await setIfPresent("lib-sourceref", sourceRef))) friction("chain", "lib-sourceref absent à l'édition chaîne", "sourceRef éditable");
  await page.getByTestId("lib-save").click();
  await waitSaved();
  log(`   chaîne créée à la souris: ${id} « ${chainName} » (sourceRef=${sourceRef})`);
  return id;
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });
  const libMeta = await getJson("/api/library");
  check("cible = vraie library (isTestLibrary===false)", libMeta && libMeta.isTestLibrary === false);
  const countBefore = (libMeta?.bricks || []).length;
  log(`Briques avant: ${countBefore}`);

  // ══ CORRECTION 1a — Déprécier l'ancienne chaîne fictive (ne pas supprimer) ══
  log("=== Correction 1a — dépréciation ancienne chaîne fictive ===");
  const OLD_ID = "chain-mr3kt9sj";
  const oldBrick = await getJson("/api/library/" + OLD_ID);
  if (!oldBrick || oldBrick.error) {
    friction("dépréciation", `brique ${OLD_ID} introuvable`, "brique fictive présente à déprécier");
    check("ancienne chaîne dépréciée", false);
  } else {
    const DEP_NAME = "⚠️ Pipeline idée→IMP (ANCIEN — fictif, voir versions réelles ci-dessous)";
    await openLibrary();
    await page.getByTestId("lib-open-" + OLD_ID).click();
    await page.waitForSelector('[data-testid="lib-editor-chain"]', { timeout: 5000 });
    await page.getByTestId("lib-name").fill(DEP_NAME);
    await setIfPresent("lib-maturity", "draft", "select");
    await setIfPresent("lib-badge", "demo", "select");
    await page.getByTestId("lib-save").click();
    await waitSaved();
    const after = await getJson("/api/library/" + OLD_ID);
    check("ancienne chaîne dépréciée (nom+maturity, PAS supprimée)", after && after.name === DEP_NAME && after.maturity === "draft");
  }

  // ══ CORRECTION 2 — Profils LM : Director (confirmer) + CEO (créer) ══════════
  log("=== Correction 2 — Profils LM ===");
  const director = await getJson("/api/library/agent-mr3kk79n");
  const dirOK = director && director.payload && director.payload.role === "director"
    && director.payload.modele === "qwen2.5-14b-instruct" && Number(director.payload.temperature) === 0.4;
  check("Director (agent-mr3kk79n) cohérent Director-only (role/modele/temp) — inchangé", dirOK);
  if (!dirOK) friction("Director", "contenu incohérent avec Director", "role=director, qwen2.5-14b, temp 0.4");
  const ceoId = await ensureAgent({
    name: "Profil d'appel LM — autopilot (CEO)",
    role: "ceo",
    modele: LM.LM_MODEL_CEO,                       // qwen3.6-27b
    temperature: LM.temperature_global,            // 0.4 (temperature_per_step:false)
    max_tokens: 1200,                              // per-role ceo (autopilot.py, cf AUTOPILOT_MINING_REPORT)
    memoire: "Profil d'appel LM du routage CEO. " + LM.system_prompt_builder,
    gardeFou: "Routing: " + LM.routing + ". Profil distinct du Director (Qwen2.5). temperature_per_step=" + LM.temperature_per_step + ".",
    notes: "Scindé du Profil Director suite audit ALL_CHAINS_AUDIT (lm_config révèle 2 profils).",
    sourceRef: "prompt_chain_map.json (lm_config) + autopilot.py (_route_model, LM_MODEL_CEO)",
    maturity: "draft", badge: "demo",              // parité avec le Director existant (démo/draft)
  });
  check("Profil CEO créé comme brique séparée", !!ceoId);
  out.correspondences.push("Profil LM (CEO) ↔ agents_a_creer 'agent-ceo' (CEO Director) : concepts proches (preset d'appel vs rôle agent) — NON fusionnés, à trancher en passe future.");

  // ══ CORRECTION 3 — 6 agents de agents_a_creer ══════════════════════════════
  log("=== Correction 3 — 6 agents (agents_a_creer) ===");
  const agentIds = [];
  for (const a of AGENTS) {
    const tempTarget = a.calibration ? (a.calibration.match(/→\s*([0-9.]+)/)?.[1] ?? null) : null;
    const id = await ensureAgent({
      name: a.name,
      role: a.role,
      modele: a.model,
      temperature: tempTarget,
      notes: `chaine: ${a.chaine} | statut: ${a.statut}${a.calibration ? " | calibration: " + a.calibration : ""} | source_id: ${a.id}`,
      sourceRef: "prompt_chain_map.json (agents_a_creer / " + a.id + ")",
      maturity: "saved", badge: "real",
    });
    agentIds.push(id);
  }
  check(`6 agents agents_a_creer créés (distincts des 5 seeds)`, agentIds.filter(Boolean).length === 6);
  // Correspondances potentielles seeds ↔ agents_a_creer (signalées, NON fusionnées)
  out.correspondences.push("agents_a_creer 'agent-worker' (Worker Claude Code, exécution) ↔ seed 'Code Agent'/'Producer Agent' : chevauchement faible sur l'exécution — NON fusionné.");
  out.correspondences.push("Les 4 rôles pipeline (roadmap/redteam/fusion/extract) n'ont AUCUN équivalent 1:1 clair parmi les 5 seeds dev-team (code/docs/producer/qa/review) — NON fusionnés.");

  // ══ CORRECTION 1b — Chaîne A (prompt_chain_map) : attacher les 4 prompts réels ══
  log("=== Correction 1b — Chaîne A (prompt_chain_map, prompts RÉELS attachés) ===");
  const need = ["autopilot-prompt-roadmap-001", "autopilot-prompt-redteam-001", "autopilot-prompt-fusion-001", "autopilot-prompt-extract-001"];
  const have = new Set((await bricks()).map((b) => b.id));
  const missing = need.filter((id) => !have.has(id));
  check("4 prompts réels roadmap/redteam/fusion/extract présents en Bibliothèque", missing.length === 0);
  if (missing.length) friction("Chaîne A", "prompts manquants: " + missing.join(","), "les 4 prompts autopilot présents");
  const chainAId = await buildRunSaveChain({
    chainName: "Pipeline idée→IMP (prompt_chain_map)",
    promptIds: need,
    category: "autopilot-import",
    tags: "pipeline, roadmap, architecture-ideale",
    sourceRef: "prompt_chain_map.json",
  });
  check("Chaîne A construite/attachée/exécutée/sauvée", !!chainAId);

  // ══ Chaîne B (run_chain) : créer 4 prompts SYSTEM_* puis les attacher ══════
  log("=== Chaîne B (run_chain Translator→Engineer→RedTeam→Formatter) ===");
  const pTr = await ensurePrompt({ name: "Rôle: Traducteur (run_chain, Translator)", text: SYS.translator, category: "autopilot-import", sourceRef: "run_chain.py (SYSTEM_TRANSLATOR)" });
  const pEn = await ensurePrompt({ name: "Rôle: Ingénieur (run_chain, Engineer)", text: SYS.engineer, category: "autopilot-import", sourceRef: "run_chain.py (SYSTEM_ENGINEER)" });
  const pRt = await ensurePrompt({ name: "Rôle: Red Team (run_chain, RedTeam)", text: SYS.redteam, category: "autopilot-import", sourceRef: "run_chain.py (SYSTEM_REDTEAM)" });
  const pFo = await ensurePrompt({ name: "Rôle: Formateur Claude Code (run_chain, Formatter)", text: SYS.formatter, category: "autopilot-import", sourceRef: "run_chain.py (SYSTEM_CLAUDE_CODE_FORMATTER)" });
  check("4 prompts run_chain créés/présents", [pTr, pEn, pRt, pFo].every(Boolean));
  const chainBId = await buildRunSaveChain({
    chainName: "Pipeline run_chain (Translator→Engineer→RedTeam→Formatter)",
    promptIds: [pTr, pEn, pRt, pFo],
    category: "autopilot-import",
    tags: "pipeline, translator-engineer-redteam",
    sourceRef: "run_chain.py",
  });
  check("Chaîne B construite/attachée/exécutée/sauvée", !!chainBId);

  // ══ VÉRIFICATION FINALE ════════════════════════════════════════════════════
  const finalBricks = await bricks();
  out.countAfter = finalBricks.length;
  log(`Briques après: ${out.countAfter} (avant: ${countBefore})`);
  // Le lien (producerRef) doit survivre à la persistance sur la Chaîne A
  const chainAdoc = await getJson("/api/library/" + chainAId);
  const linkedPersisted = chainAdoc?.payload?.nodes?.filter((n) => n.data && n.data.producerRef).length || 0;
  check("Chaîne A persistée avec liens producerRef (pas juste copie)", linkedPersisted >= 4);
  // Anti-copie : le texte du 1er prompt de la chaîne doit référencer une brique, pas être orphelin
  const dup = chainAdoc?.payload?.nodes?.[0]?.data?.producerRef;
  check("1er nœud Chaîne A référence bien une brique prompt (producerRef non vide)", !!dup);

  out.pass = !out.failed;
  out.summary = { countBefore, countAfter: out.countAfter, chainAId, chainBId, ceoId, agentIds };
} catch (e) {
  out.error = String(e && e.stack || e);
  log("❌ EXCEPTION: " + out.error);
} finally {
  await page.screenshot({ path: "pass1_final.png", fullPage: false }).catch(() => {});
  await browser.close();
  writeFileSync(path.join(__dirname, "build_pass1_result.json"), JSON.stringify(out, null, 2), "utf-8");
  log(`\nRésultat écrit: build_pass1_result.json — pass=${out.pass}`);
  process.exit(out.pass ? 0 : 1);
}

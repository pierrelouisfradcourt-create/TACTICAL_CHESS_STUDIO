// build-merge-validation-of.mjs — Import "Merge Engine / Validation Loop / Schémas de sortie"
// CONSTRUIT À LA SOURIS (Playwright UI). Persiste dans la VRAIE library/ (comme les briques
// autopilot/openclaw), self-launch demo-server sur un port isolé pointé sur library/.
//
// DISCIPLINE (identique à build-pass1 / build-outputformats) :
//  - CONTENU créé par gestes UI (click/fill/selectOption/drag/attach). Aucun POST direct
//    /api/library, aucun window.__setGraph pour le contenu. Seuls appels réseau = GET
//    read-only de vérification.
//  - Idempotent par NOM : une brique/chaîne déjà présente est réutilisée, jamais dupliquée.
//  - Prompts/oracles ATTACHÉS par référence (producerRef / oracleRef), pas copiés inline (F7).
//  - src/ (moteur) INCHANGÉ — on réutilise routing, boucle (loop edge + maxIterations +
//    okAfter reviewer du preset council-looped), Oracle (gardien inerte), Artefact, outputformat.
//
// 3 concepts importés :
//   1. Merge Engine   → prompt "fusion diff-based" + oracle "Merge Validator" + Chaîne
//      (2 producteurs → Merger[prompt fusion + oracle gardien] → Artefact fusionné).
//   2. Validation Loop → prompt "critique structurée" + oracle "complétude correction" +
//      Chaîne bouclée (Generate → Critique[prompt] → Verdict[reviewer okAfter, loop NOK] →
//      Validated), réutilise EXACTEMENT le mécanisme de boucle council-looped.
//   3. Schémas de sortie → 2 briques outputformat (Developer files+diff / QA verdict+issues)
//      attachées au 8ᵉ satellite d'un Agent composite.
//
// Usage:  node build-merge-validation-of.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_MV_PORT"] ?? "3212";
const BASE = `http://localhost:${PORT}`;
const out = { steps: [], checks: {}, phase0: [], ids: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; };
const bricks = async () => (await getJson("/api/library"))?.bricks || [];
const byName = async (name) => (await bricks()).find((b) => b.name === name);
async function ready(ms = 25000) { const dl = Date.now() + ms; while (Date.now() < dl) { try { const r = await fetch(`${BASE}/api/library`); if (r.ok) return true; } catch {} await wait(200); } return false; }

// ── brick content (SOURCED from the external AI-Studio spec, mapped to TCS bricks) ──
const MERGE_PROMPT = `Tu es le Merger d'une chaîne multi-agents. Tu reçois les sorties de plusieurs producteurs (ex: Developer A, Developer B) et tu produis UN artefact cohérent unique.

REPRÉSENTE CHAQUE CHANGEMENT EN DIFF (format +/-/~) :
  + <ligne>   = AJOUT (contenu nouveau introduit par la fusion)
  - <ligne>   = SUPPRESSION (contenu retiré / abandonné)
  ~ <ligne>   = REFACTOR (contenu réécrit — donne l'avant → après)

RÈGLES DE FUSION :
1. Deux producteurs qui modifient la même zone → réconcilie, ne duplique pas.
2. Contradiction entre deux sorties → signale-la explicitement avant de trancher.
3. Chaque décision de fusion doit être justifiable et exprimable en +/-/~.
4. Sortie finale = artefact fusionné + un résumé des conflits résolus.

Ne prétends jamais qu'un résultat est prouvé. claim_verdict: NO_CLAIM_ALLOWED.`;

const MERGE_ORACLE_RULE = `Gardien de cohérence AVANT fusion (Merge Engine). Vérifie sur les sorties des producteurs, DANS L'ORDRE, toutes bloquantes :
1. Pas de conflit de fichiers : deux sorties ne modifient pas la même ligne de façon contradictoire.
2. Pas de contradiction sémantique : les décisions des producteurs sont réconciliables (pas d'affirmations mutuellement exclusives).
3. Chaque changement est exprimable en diff +/-/~ (add / remove / refactor).
Verdict PASS seulement si une fusion cohérente est possible ; sinon FAIL en listant le conflit. claim_verdict: NO_CLAIM_ALLOWED.`;

const CRITIQUE_PROMPT = `Tu es le Critique d'une boucle Generate → Critique → Fix → Re-validate.
Tu reçois une sortie produite à l'étape Generate et tu la critiques de façon STRUCTURÉE.

FORMAT DE RETOUR OBLIGATOIRE — une liste de problèmes, chacun :
  - sévérité   : BLOCKER | MAJOR | MINOR
  - problème   : description précise et localisée (fichier / zone / ligne)
  - correction : suggestion concrète et actionnable pour corriger CE point

RÈGLES :
1. Un problème = une correction proposée. Pas de critique sans piste de correction.
2. Si AUCUN problème → retourne un verdict OK explicite (la boucle s'arrête).
3. Sinon → verdict NOK + la liste ; l'étape Fix devra adresser CHAQUE point.

Ne prétends jamais qu'un résultat est prouvé. claim_verdict: NO_CLAIM_ALLOWED.`;

const COMPLETENESS_ORACLE_RULE = `Gardien de complétude de correction (Validation Loop). Vérifie qu'une correction (étape Fix) adresse BIEN tous les points soulevés par la critique précédente :
1. Chaque problème listé par la critique a une modification correspondante dans la correction.
2. Aucune régression introduite sur un point déjà validé.
Verdict PASS si TOUS les points de la critique sont adressés ; FAIL s'il en reste au moins un non traité (la boucle doit repartir). claim_verdict: NO_CLAIM_ALLOWED.`;

const OF_DEV_SCHEMA = '{"files": [{"path": "string", "diff": "string"}], "notes": "string"}';
const OF_QA_SCHEMA = '{"verdict": "PASS|FAIL", "issues": [{"severity": "string", "message": "string", "suggestion": "string"}]}';

const SRC_MERGE = "Spec AI Studio externe (Merge Engine) — représenté avec briques TCS existantes (routing/oracle/artefact)";
const SRC_LOOP = "Spec AI Studio externe (Validation Loop) — réutilise la boucle council-looped (loop edge + maxIterations + okAfter)";
const SRC_OF = "Spec AI Studio externe (schémas de sortie par rôle) — enrichit le kind outputformat existant";

// ── launch server on the REAL library ──────────────────────────────────────
const server = spawn(process.execPath, ["demo-server.ts"], { cwd: __dirname, env: { ...process.env, PORT }, stdio: ["ignore", "pipe", "pipe"] });
let serverErr = ""; server.stderr.on("data", (d) => (serverErr += d)); server.stdout.on("data", () => {});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1520, height: 960 } });
page.on("dialog", (d) => d.accept());
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// ── UI helpers ──────────────────────────────────────────────────────────────
const lastNodeId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);
const edgeCount = () => page.evaluate(() => window.__ui.edges.length);
const nodeById = (id) => page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i), id);
const findNodeIdByRole = (role) => page.evaluate((r) => (window.__ui.nodes.find((n) => n.data && n.data.role === r) || {}).id, role);

async function dragNodeTo(id, tx, ty) {
  const b = await page.locator(`[data-node-id="${id}"] .nbody`).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 14 });
  await page.mouse.up();
  await wait(120);
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
  await wait(120);
  return (await edgeCount()) > before;
}
async function poseImportPark(addTestId, importId, attachedKind, tx, ty) {
  await page.getByTestId(addTestId).click();
  const id = await lastNodeId();
  await page.waitForSelector('[data-testid="import-chooser"]', { timeout: 5000 });
  await page.getByTestId("import-select").selectOption(importId);
  await page.waitForFunction(({ i, k }) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && !!n[k]; }, { i: id, k: attachedKind }, { timeout: 6000 });
  await dragNodeTo(id, tx, ty);
  return id;
}
async function selectNode(id) { await page.locator(`[data-node-id="${id}"]`).click({ position: { x: 8, y: 8 } }); await wait(120); }
async function deleteNode(id) {
  await selectNode(id);
  await page.getByRole("button", { name: /Supprimer le nœud/ }).first().click();
  await page.waitForFunction((i) => !window.__ui.nodes.some((n) => n.id === i), id, { timeout: 4000 });
  await wait(80);
}
const waitSaved = () => page.waitForFunction(() => (document.querySelector('[data-testid="status"]')?.textContent || "").includes("sauvegardée"), null, { timeout: 8000 });

async function newBrick(kind) {
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-" + kind).click();
  await page.waitForSelector(`[data-testid="lib-editor-${kind}"]`, { timeout: 5000 });
}
async function setIf(testid, value, kind = "fill") {
  const loc = page.getByTestId(testid);
  if (await loc.count() === 0) return false;
  if (kind === "select") await loc.selectOption(value); else await loc.fill(String(value));
  return true;
}
async function libSave() { await page.getByTestId("lib-save").click(); await wait(400); }

// Idempotent prompt brick. Returns id.
async function ensurePrompt({ name, text, category, sourceRef }) {
  const ex = await byName(name); if (ex) { log(`↺ prompt « ${name} » réutilisé (${ex.id})`); return ex.id; }
  await newBrick("prompt");
  await setIf("lib-name", name);
  await setIf("lib-text", text);
  await setIf("lib-category", category);
  await setIf("lib-sourceref", sourceRef);
  await setIf("lib-maturity", "saved", "select");
  await setIf("lib-badge", "demo", "select");
  await libSave();
  const id = (await byName(name))?.id; log(`＋ prompt créé à la souris: ${id} « ${name} »`); return id;
}
// Idempotent oracle brick. Returns id.
async function ensureOracle({ name, rule, category, sourceRef, attach = ["llm", "agent", "tool", "router"] }) {
  const ex = await byName(name); if (ex) { log(`↺ oracle « ${name} » réutilisé (${ex.id})`); return ex.id; }
  await newBrick("oracle");
  await setIf("lib-name", name);
  await setIf("lib-oracle-rule", rule);
  await setIf("lib-oracle-verdictField", "verdict");
  await setIf("lib-oracle-expected", "PASS\nFAIL");
  await setIf("lib-category", category);
  await setIf("lib-sourceref", sourceRef);
  for (const t of attach) { const cb = page.getByTestId("lib-oracle-attach-" + t); if (await cb.count() && !(await cb.isChecked())) await cb.check().catch(() => {}); }
  await setIf("lib-maturity", "saved", "select");
  await setIf("lib-badge", "demo", "select");
  await libSave();
  const id = (await byName(name))?.id; log(`＋ oracle créé à la souris: ${id} « ${name} »`); return id;
}
// Idempotent outputformat brick (structured/json). Returns id.
async function ensureOutputFormat({ name, schema, sourceRef }) {
  const ex = await byName(name); if (ex) { log(`↺ outputformat « ${name} » réutilisé (${ex.id})`); return ex.id; }
  await newBrick("outputformat");
  await setIf("lib-name", name);
  await setIf("lib-of-formatType", "structured", "select");
  await setIf("lib-of-outputFormat", "json", "select");
  await setIf("lib-of-schema", schema);
  await setIf("lib-sourceref", sourceRef);
  await setIf("lib-maturity", "saved", "select");
  await setIf("lib-badge", "demo", "select");
  await libSave();
  const id = (await byName(name))?.id; log(`＋ outputformat créé à la souris: ${id} « ${name} »`); return id;
}
// Attach an oracle brick as guardian to a currently-existing canvas node.
async function attachOracleToNode(nodeId, oracleId) {
  await selectNode(nodeId);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("oracle");
  await page.getByTestId("lib-open-" + oracleId).click();
  await page.waitForSelector('[data-testid="lib-editor-oracle"]', { timeout: 5000 });
  const btn = page.getByTestId("lib-attach");
  const enabled = await btn.isEnabled();
  if (enabled) await btn.click();
  await page.getByTestId("tab-canvas").click();
  await wait(200);
  return enabled;
}
async function saveChain(name, category, tags) {
  await page.getByTestId("btn-save-chain").click();
  await page.waitForSelector('[data-testid="chain-name"]', { timeout: 5000 });
  await page.getByTestId("chain-name").fill(name);
  await setIf("chain-category", category);
  await setIf("chain-tags", tags);
  await page.getByTestId("chain-save-submit").click();
  await waitSaved();
  return (await byName(name))?.id;
}
async function executeAndTrace() {
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="trace-step"]').length > 0
    && !((document.querySelector('[data-testid="status"]')?.textContent || "").includes("⏳")), null, { timeout: 25000 });
  return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => ({ nodeId: e.getAttribute("data-node-id"), iter: Number(e.getAttribute("data-iteration")), reason: (e.querySelector('[data-testid="route-reason"]')?.textContent || ""), decision: (e.querySelector('[data-testid="decision"]')?.textContent || "") })));
}

try {
  if (!(await ready())) throw new Error("server not ready\n" + serverErr);
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-council"]', { timeout: 20000 });

  // ═══ PHASE 0 — vérifications avant de coder ═════════════════════════════════
  const lib0 = await getJson("/api/library");
  const countBefore = (lib0?.bricks || []).length;
  check("PHASE0 cible = VRAIE library (isTestLibrary===false)", lib0 && lib0.isTestLibrary === false);
  out.countBefore = countBefore;
  out.phase0.push(`Bibliothèque avant: ${countBefore} briques (attendu ~45).`);
  const ofBefore = (lib0?.bricks || []).filter((b) => b.kind === "outputformat");
  out.phase0.push(`kind outputformat déjà présent: ${ofBefore.length} briques (${ofBefore.map((b) => b.name).join(", ")}). Nouveaux modèles ajoutés de façon cohérente (structured/json).`);
  // Confirm the loop mechanism to REUSE (council-looped: loop edge + maxIterations + okAfter).
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-council").click();
  await page.getByTestId("council-looped").click();
  await page.waitForFunction(() => (window.__ui?.edges || []).some((e) => e.loop === true), null, { timeout: 5000 });
  const probeLoop = await page.evaluate(() => { const e = window.__ui.edges.find((x) => x.loop === true); const rev = window.__ui.nodes.find((n) => n.data && n.data.okAfter !== undefined); return { cond: e?.condition, max: e?.maxIterations, okAfter: rev?.data?.okAfter }; });
  check("PHASE0 mécanisme de boucle réutilisable présent (loop NOK, maxIterations, okAfter reviewer)", probeLoop.cond === "NOK" && probeLoop.max === 5 && probeLoop.okAfter === 2);
  out.phase0.push(`Mécanisme boucle réutilisé: loop edge condition=${probeLoop.cond} maxIterations=${probeLoop.max}, reviewer okAfter=${probeLoop.okAfter}. Aucun nouveau mécanisme inventé.`);
  out.phase0.push("Collision d'id: nulle — briques créées via UI (ids générés mrXXXX), chaînes via 💾 (ids chain-XXXX). Idempotence par NOM: réutilisation si déjà présent.");
  await page.getByTestId("btn-clear").click();

  // ═══ Briques (6) — à la souris ═════════════════════════════════════════════
  log("=== Briques : 2 prompts + 2 oracles + 2 outputformats (à la souris) ===");
  const mergePromptId = await ensurePrompt({ name: "Instructions de fusion diff-based", text: MERGE_PROMPT, category: "import-merge", sourceRef: SRC_MERGE });
  const mergeOracleId = await ensureOracle({ name: "Merge Validator", rule: MERGE_ORACLE_RULE, category: "structural", sourceRef: SRC_MERGE });
  const critiquePromptId = await ensurePrompt({ name: "Instructions de critique structurée", text: CRITIQUE_PROMPT, category: "import-validation-loop", sourceRef: SRC_LOOP });
  const completenessOracleId = await ensureOracle({ name: "Vérificateur de complétude de correction", rule: COMPLETENESS_ORACLE_RULE, category: "structural", sourceRef: SRC_LOOP });
  const ofDevId = await ensureOutputFormat({ name: "Sortie Developer (files+diff)", schema: OF_DEV_SCHEMA, sourceRef: SRC_OF });
  const ofQaId = await ensureOutputFormat({ name: "Sortie QA (verdict+issues)", schema: OF_QA_SCHEMA, sourceRef: SRC_OF });
  const brickIds = { mergePromptId, mergeOracleId, critiquePromptId, completenessOracleId, ofDevId, ofQaId };
  out.ids.bricks = brickIds;
  check("6 briques présentes (2 prompt / 2 oracle / 2 outputformat)", Object.values(brickIds).every(Boolean));

  // ═══ CONCEPT 1 — Merge Engine : Chaîne (2 producteurs → Merger → Artefact) ═══
  log("=== Concept 1 — Merge Engine (chaîne à la souris) ===");
  const MERGE_CHAIN = "Merge Engine (Developer A+B → Merger → Artefact)";
  let mergeChainId = (await byName(MERGE_CHAIN))?.id;
  if (mergeChainId) { log(`↺ chaîne Merge déjà présente (${mergeChainId})`); }
  else {
    await page.getByTestId("tab-canvas").click();
    await page.getByTestId("btn-clear").click();
    await page.waitForFunction(() => window.__ui && window.__ui.nodes.length === 0, null, { timeout: 5000 });
    // 2 producteurs (llm), 1 Merger (llm + prompt fusion), 1 Artefact
    await page.getByTestId("add-llm").click(); const devA = await lastNodeId(); await dragNodeTo(devA, 260, 175);
    await page.getByTestId("add-llm").click(); const devB = await lastNodeId(); await dragNodeTo(devB, 540, 175);
    const merger = await poseImportPark("add-prompt", mergePromptId, "attachedPrompt", 400, 320);
    await page.getByTestId("add-artefact").click(); const artefact = await lastNodeId(); await dragNodeTo(artefact, 680, 320);
    // wiring LINÉAIRE (le moteur exige exactement 1 nœud racine — findStartNode) :
    //   DevA → DevB → Merger → Artefact. Les 2 producteurs s'exécutent, leurs sorties
    //   s'accumulent dans l'état, le Merger les fusionne, la chaîne converge vers l'Artefact.
    await drawEdge(devA, devB, "right", "left");
    await drawEdge(devB, merger, "bottom", "top");
    await drawEdge(merger, artefact, "right", "left");
    const mEdges = await edgeCount();
    // oracle "Merge Validator" attaché au Merger comme gardien (pas inline)
    const attached = await attachOracleToNode(merger, mergeOracleId);
    check("Merge: oracle « Merge Validator » attaché au Merger (gardien, pas inline)", attached);
    const mergerDoc = await nodeById(merger);
    check("Merge: Merger porte producerRef (prompt fusion) + oracleRef (gardien)", !!mergerDoc?.data?.producerRef && !!mergerDoc?.data?.oracleRef);
    // exécution mock — converge (se termine) en atteignant l'Artefact
    const mTrace = await executeAndTrace();
    out.mergeTrace = mTrace.map((t) => t.nodeId);
    const reachedMerger = mTrace.some((t) => t.nodeId === merger);
    const ran = mTrace.length;
    check(`Merge: exécutée mockAdapters (${ran} steps), converge en atteignant le Merger`, reachedMerger && ran >= 3);
    mergeChainId = await saveChain(MERGE_CHAIN, "import-merge", "merge, diff, fusion");
    check("Merge: chaîne sauvegardée", !!mergeChainId);
  }
  out.ids.mergeChainId = mergeChainId;

  // ═══ CONCEPT 2 — Validation Loop : Chaîne bouclée ═══════════════════════════
  log("=== Concept 2 — Validation Loop (chaîne bouclée à la souris) ===");
  const LOOP_CHAIN = "Validation Loop (Generate→Critique→Fix→Re-validate)";
  let loopChainId = (await byName(LOOP_CHAIN))?.id;
  if (loopChainId) { log(`↺ chaîne Validation Loop déjà présente (${loopChainId})`); }
  else {
    await page.getByTestId("tab-canvas").click();
    await page.getByTestId("btn-clear").click();
    await page.waitForFunction(() => window.__ui && window.__ui.nodes.length === 0, null, { timeout: 5000 });
    // Pose council-looped puis TRIM → réutilise EXACTEMENT la boucle existante
    // (reviewer okAfter=2 + loop edge NOK/maxIterations). On garde coder(Generate) et
    // reviewer(Verdict), on supprime planner/redteam/explorer/tester, on insère un
    // nœud llm "Critique" (prompt critique attaché) entre Generate et Verdict.
    await page.getByTestId("add-council").click();
    await page.getByTestId("council-looped").click();
    await page.waitForFunction(() => (window.__ui?.edges || []).some((e) => e.loop === true), null, { timeout: 5000 });
    const coder = await findNodeIdByRole("qwen-coder");        // Generate / Fix
    const reviewer = await findNodeIdByRole("claude-reviewer"); // Verdict (okAfter=2, source de la boucle)
    for (const role of ["claude-planner", "qwen-redteam", "gemini-explorer", "tester"]) {
      const id = await findNodeIdByRole(role); if (id) await deleteNode(id);
    }
    // reposition survivors on-screen for clean wiring
    await dragNodeTo(coder, 250, 175);
    await dragNodeTo(reviewer, 760, 175);
    // Critique = llm node + prompt "critique structurée" attaché (attach prompt cible llm)
    const critique = await poseImportPark("add-prompt", critiquePromptId, "attachedPrompt", 500, 175);
    // Validated = artefact
    await page.getByTestId("add-artefact").click(); const validated = await lastNodeId(); await dragNodeTo(validated, 760, 330);
    // wiring : Generate → Critique → Verdict ; Verdict --loop(NOK)--> Generate (déjà là) ; Verdict → Validated
    await drawEdge(coder, critique, "right", "left");
    await drawEdge(critique, reviewer, "right", "left");
    await drawEdge(reviewer, validated, "bottom", "top");
    // oracle "complétude de correction" attaché au nœud Generate (le Fix doit adresser la critique)
    const attachedC = await attachOracleToNode(coder, completenessOracleId);
    check("Loop: oracle « complétude » attaché au nœud Generate (gardien)", attachedC);
    // sanity: exactement 1 racine + loop edge conservé
    const loopEdgeOk = await page.evaluate((r) => window.__ui.edges.some((e) => e.loop === true && e.from === r && e.condition === "NOK"), reviewer);
    check("Loop: edge de boucle reviewer→coder (NOK, maxIterations) conservé après trim", loopEdgeOk);
    // exécution mock — la boucle DOIT tourner (plusieurs itérations, stop sur OK)
    const lTrace = await executeAndTrace();
    out.loopTrace = lTrace;
    const reviewerRuns = lTrace.filter((t) => t.nodeId === reviewer);
    const coderRuns = lTrace.filter((t) => t.nodeId === coder);
    const loopIters = lTrace.filter((t) => /loop-iteration/.test(t.reason));
    const maxIter = Math.max(0, ...lTrace.map((t) => t.iter));
    check(`Loop: itérations réelles (reviewer ×${reviewerRuns.length}, coder ×${coderRuns.length}, ≥2 passes)`, reviewerRuns.length >= 2 && coderRuns.length >= 2);
    check(`Loop: edge de boucle réellement suivi (${loopIters.length} routing loop-iteration observés)`, loopIters.length >= 1);
    check(`Loop: s'arrête (dernier verdict reviewer = OK, itér max=${maxIter} < borne)`, /OK/.test(reviewerRuns[reviewerRuns.length - 1]?.decision || "") && maxIter <= 5);
    loopChainId = await saveChain(LOOP_CHAIN, "validation-loop", "generate, critique, fix, revalidate, loop");
    check("Loop: chaîne bouclée sauvegardée", !!loopChainId);
    // persistence: loop edge survives save
    const ldoc = loopChainId ? await getJson("/api/library/" + loopChainId) : null;
    check("Loop: chaîne persistée avec edge de boucle (loop:true, maxIterations)", (ldoc?.payload?.edges || []).some((e) => e.loop === true && e.maxIterations));
  }
  out.ids.loopChainId = loopChainId;

  // ═══ CONCEPT 3 — Schémas de sortie : attache 8ᵉ satellite d'un Agent ════════
  log("=== Concept 3 — outputformat attachés au 8ᵉ satellite d'un Agent ===");
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => window.__ui && window.__ui.nodes.length === 0, null, { timeout: 5000 });
  await page.getByTestId("add-agent").click();
  await page.getByTestId("import-empty").click().catch(() => {});
  const aid = await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").slice(-1)[0].id);
  const sortie = await page.evaluate((a) => (window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === a && n.data.componentType === "sortieAttendue") || {}).id, aid);
  check("Concept3: Agent composite posé avec satellite « sortie attendue »", !!sortie);
  const attachOF = async (ofId, label) => {
    await selectNode(sortie);
    await page.waitForSelector('[data-testid="comp-outputformat-select"]', { timeout: 4000 });
    await page.getByTestId("comp-outputformat-select").selectOption(ofId);
    await page.waitForFunction((a) => { const s = window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === a && n.data.componentType === "sortieAttendue"); return String(s?.data?.text || "").trim() !== ""; }, aid, { timeout: 4000 });
    const txt = await page.evaluate((a) => window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === a && n.data.componentType === "sortieAttendue").data.text, aid);
    check(`Concept3: « ${label} » attaché au 8ᵉ satellite (contrat rendu)`, txt.trim().length > 0);
    return txt;
  };
  const devTxt = await attachOF(ofDevId, "Sortie Developer (files+diff)");
  check("Concept3: contrat Developer contient le schéma files/diff", /files/.test(devTxt) && /diff/.test(devTxt));
  const qaTxt = await attachOF(ofQaId, "Sortie QA (verdict+issues)");
  check("Concept3: contrat QA contient verdict + issues", /verdict/.test(qaTxt) && /issues/.test(qaTxt));
  const cardBadge = await page.locator(`[data-testid="agent-card-${aid}"]`).textContent().catch(() => "");
  check("Concept3: carte d'identité progresse (X/8)", /\/8/.test(cardBadge || (await page.locator('[data-card-filled]').first().textContent().catch(() => ""))));

  // ═══ Bilan ══════════════════════════════════════════════════════════════════
  const finalBricks = await bricks();
  out.countAfter = finalBricks.length;
  log(`Bibliothèque après: ${out.countAfter} (avant: ${countBefore})`);
  check("aucune erreur console pendant la passe", consoleErrors.length === 0);
  if (consoleErrors.length) log("console errors: " + consoleErrors.slice(0, 3).join(" | "));

  out.pass = !out.failed;
  log(out.pass ? "\n=== IMPORT MERGE/VALIDATION/OUTPUTFORMAT — TOUT VERT ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e);
  log("EXCEPTION: " + out.error);
} finally {
  await page.screenshot({ path: path.join(__dirname, "builder_merge_validation.png"), fullPage: false }).catch(() => {});
  await browser.close();
  server.kill();
  await wait(700);
  writeFileSync(path.join(__dirname, "merge_validation_of_result.json"), JSON.stringify(out, null, 2), "utf-8");
  log(`\nRésultat: merge_validation_of_result.json — pass=${out.pass}`);
  process.exit(out.pass ? 0 : 1);
}

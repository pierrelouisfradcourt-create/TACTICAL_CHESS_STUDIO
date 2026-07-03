// Composition automatique du prompt LLM depuis les 8 satellites Agent.
//  - remplir les 8 satellites → prompt système composé en phrases naturelles
//  - le 8ᵉ satellite "sortie attendue" → section "Format de sortie attendu : X"
//  - édition d'un satellite → recalcul temps réel
//  - composant vide → section absente (pas de placeholder)
//  - import Bibliothèque → composition immédiate
//  - divergence (Option A) : édition manuelle → badge + prompt figé ; recompose → dérivé
//  - "modèle" DOUBLE écriture : section "Modèle : X" DANS le prompt + champ technique data.model
//  - exécution 8/8 → le graphe envoyé au moteur porte bien le prompt composé
//  - régression : Councils (sans satellites) non affectés
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };
const api = async (p, opts) => { const r = await fetch(BASE + p, opts); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };
const post = (doc) => api("/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1560, height: 980 } });

const centralAgentId = () => page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").slice(-1)[0].id);
const satId = (aid, ct) => page.evaluate(({ a, c }) => (window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === a && n.data.componentType === c) || {}).id, { a: aid, c: ct });
// Click the node body near its top-left corner — avoids the centered edge handles that
// otherwise intercept pointer events on the small satellites.
async function selectNode(id) { await page.locator(`[data-node-id="${id}"]`).click({ position: { x: 10, y: 7 } }); }
async function fillComp(aid, ct, txt) { const id = await satId(aid, ct); await selectNode(id); await page.getByTestId("comp-text").fill(txt); }
async function agentPromptValue(aid) { await selectNode(aid); await page.waitForSelector('[data-testid="agent-prompt"]', { timeout: 4000 }); return page.getByTestId("agent-prompt").inputValue(); }
const agentData = (aid) => page.evaluate((i) => window.__ui.nodes.find((n) => n.id === i).data, aid);

// capture the last /api/execute request body (proof the moteur receives the prompt)
let lastExecBody = null;
page.on("request", (req) => { if (req.url().endsWith("/api/execute") && req.method() === "POST") { try { lastExecBody = JSON.parse(req.postData() || "null"); } catch { lastExecBody = null; } } });
async function execUI() {
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => { const st = document.querySelector('[data-testid="status"]')?.textContent || ""; return !st.includes("⏳"); }, null, { timeout: 15000 });
}

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-agent"]', { timeout: 20000 });
  await post({ id: "agent-prompt-rich", kind: "agent", name: "Prompt Rich", maturity: "saved", badge: "real", roadmapRef: null, sourceRef: null,
    payload: { role: "réviseur", memoire: "historique IMP", skill: "analyse statique", plugin: "cargo", objectif: "trouver les bugs", gardeFou: "aucune modif de tests", notes: "", modele: "Claude-Opus", temperature: 0.3, top_p: 0.9, max_tokens: 4000, autonomy_level: null, permissions: {}, allowed_surfaces: [], forbidden_surfaces: [] },
    created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="add-agent"]', { timeout: 10000 });
  await page.getByTestId("tab-canvas").click();

  // ===== 1. Compose automatiquement au remplissage des 7 satellites =====
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  await page.getByTestId("import-empty").click().catch(() => {});
  const aid = await centralAgentId();
  const vals = { role: "planificateur", objectif: "livrer l'IMP", memoire: "contexte projet", skill: "revue de code", plugin: "git", gardeFou: "pas de push sans gate", modele: "Qwen2.5-14B", sortieAttendue: "Rapport 3-verdicts (software/evidence/claim)" };
  for (const [ct, txt] of Object.entries(vals)) await fillComp(aid, ct, txt);
  const prompt1 = await agentPromptValue(aid);
  log("  composé:\n" + prompt1.split("\n").map((l) => "    " + l).join("\n"));
  check("intro rôle+objectif en phrase naturelle", /Tu es planificateur\. Ton objectif est livrer l'IMP\./.test(prompt1));
  check("section mémoire", /Mémoire et contexte : contexte projet/.test(prompt1));
  check("section compétences (skill)", /Compétences disponibles : revue de code/.test(prompt1));
  check("section outils (plugin)", /Outils\/plugins : git/.test(prompt1));
  check("section garde-fous", /Contraintes et garde-fous : pas de push sans gate/.test(prompt1));
  check("section modèle DANS le texte du prompt", /Modèle : Qwen2\.5-14B/.test(prompt1));
  check("8ᵉ satellite : section « Format de sortie attendu » DANS le prompt", /Format de sortie attendu : Rapport 3-verdicts \(software\/evidence\/claim\)/.test(prompt1));
  check("« Format de sortie attendu » est la DERNIÈRE section (après Modèle)", prompt1.lastIndexOf("Format de sortie attendu") > prompt1.lastIndexOf("Modèle :"));
  check("prompt = phrases (pas une liste étiquetée brute type 'role:')", !/^\s*role\s*:/im.test(prompt1));
  const d1 = await agentData(aid);
  check("DOUBLE écriture : composant modèle alimente aussi le champ technique data.model", d1.model === "Qwen2.5-14B");
  check("data.prompt du nœud = le prompt composé", d1.prompt === prompt1 && prompt1.length > 0);
  check("badge 'composé automatiquement' (dérivé, non divergé)", await page.getByTestId("agent-prompt-derived").isVisible());

  // ===== 2. Recalcul temps réel à l'édition d'un seul satellite =====
  await fillComp(aid, "role", "auditeur sécurité");
  const prompt2 = await agentPromptValue(aid);
  check("éditer le rôle → prompt recomposé en temps réel (nouveau rôle)", /Tu es auditeur sécurité\./.test(prompt2) && !/planificateur/.test(prompt2));

  // ===== 3. Omission propre d'un composant vidé =====
  await fillComp(aid, "plugin", "");
  const prompt3 = await agentPromptValue(aid);
  check("vider 'plugin' → sa section disparaît (pas de placeholder)", !/Outils\/plugins/.test(prompt3) && !/\[vide\]/.test(prompt3));
  check("les autres sections restent présentes", /Mémoire et contexte/.test(prompt3) && /Modèle : Qwen2\.5-14B/.test(prompt3));
  await fillComp(aid, "plugin", "git"); // restore for later
  // vider le 8ᵉ satellite → sa section disparaît aussi (même comportement que les 7 autres)
  await fillComp(aid, "sortieAttendue", "");
  const prompt3b = await agentPromptValue(aid);
  check("vider 'sortie attendue' → sa section disparaît (omission propre)", !/Format de sortie attendu/.test(prompt3b));
  await fillComp(aid, "sortieAttendue", "Rapport 3-verdicts (software/evidence/claim)"); // restore

  // ===== 4. Import Bibliothèque → composition immédiate =====
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const aid2 = await centralAgentId();
  await page.getByTestId("import-select").selectOption("agent-prompt-rich");
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && /réviseur/.test(n.data.prompt || ""); }, aid2, { timeout: 5000 });
  const prompt4 = await agentPromptValue(aid2);
  check("import fiche → prompt composé immédiatement (sans édition supplémentaire)",
    /Tu es réviseur\. Ton objectif est trouver les bugs\./.test(prompt4) && /Modèle : Claude-Opus/.test(prompt4));
  check("import → data.model technique renseigné depuis le composant modèle", (await agentData(aid2)).model === "Claude-Opus");

  // ===== 5. Divergence (Option A) : édition manuelle → badge + gel, recompose → dérivé =====
  await selectNode(aid2);
  await page.getByTestId("agent-prompt-edit").click();
  await page.getByTestId("agent-prompt").fill("PROMPT MANUEL — override ponctuel");
  check("édition manuelle → badge de divergence affiché", await page.getByTestId("agent-prompt-diverged").isVisible());
  check("édition manuelle → promptManual=true sur le nœud", (await agentData(aid2)).promptManual === true);
  // éditer un satellite ne doit PLUS écraser le prompt manuel
  await fillComp(aid2, "role", "rôle changé après divergence");
  const prompt5 = await agentPromptValue(aid2);
  check("après divergence : éditer un satellite N'écrase PAS le prompt manuel", prompt5 === "PROMPT MANUEL — override ponctuel");
  // recompose → revient à la version dérivée (reflète le satellite changé)
  await page.getByTestId("agent-prompt-recompose").click();
  const prompt6 = await agentPromptValue(aid2);
  check("🔄 Recomposer → prompt redevient dérivé des satellites", /Tu es rôle changé après divergence\./.test(prompt6));
  check("après recompose : badge dérivé de retour (divergence effacée)",
    await page.getByTestId("agent-prompt-derived").isVisible() && (await agentData(aid2)).promptManual === false);

  // ===== 6. Exécution 8/8 → le moteur reçoit le prompt composé =====
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  const aid3 = await centralAgentId();
  await page.getByTestId("import-select").selectOption("agent-prompt-rich");
  await page.waitForFunction((i) => { const n = window.__ui.nodes.find((x) => x.id === i); return n && /réviseur/.test(n.data.prompt || ""); }, aid3, { timeout: 5000 });
  // Fiche fills 7/8 → fill the 8th (sortie attendue) so the composite is complete (8/8).
  await fillComp(aid3, "sortieAttendue", "Rapport structuré JSON");
  const composed3 = await agentPromptValue(aid3);
  check("prompt composé inclut la section sortie attendue (8ᵉ)", /Format de sortie attendu : Rapport structuré JSON/.test(composed3));
  // preuve côté "graphe envoyé au moteur" (panneau engine-graph = sortie toEngineGraph)
  const eg = JSON.parse(await page.locator('[data-testid="engine-graph"]').textContent());
  const agNode = eg.nodes.find((n) => n.id === aid3);
  check("toEngineGraph : le nœud agent porte data.prompt = prompt composé", !!agNode && agNode.data.prompt === composed3);
  check("toEngineGraph : le nœud agent porte data.model composé", !!agNode && agNode.data.model === "Claude-Opus");
  await page.getByTestId("input-json").fill("{}");
  await execUI();
  check("agent 8/8 s'exécute (trace produite)", (await page.$$eval('[data-testid="trace-step"]', (e) => e.length)) > 0);
  check("le corps POST /api/execute reçu par le moteur contient le prompt composé",
    !!lastExecBody && (lastExecBody.graph.nodes.find((n) => n.id === aid3)?.data?.prompt === composed3));

  // ===== 7. Régression : Councils (sans satellites) non affectés =====
  async function loadExample(key) { await page.getByTestId("example-dropdown").click(); await page.getByTestId("example-" + key).click(); await page.waitForTimeout(200); }
  await loadExample("looped");
  const loopedNoCompose = await page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").every((n) => window.__ui.nodes.filter((x) => x.type === "agent-component" && x.data.parentId === n.id).length === 0));
  check("REGRESSION: Council looped — agents sans satellites (aucune composition à appliquer)", loopedNoCompose);
  // ces agents n'ont pas de section prompt système composé dans l'inspecteur
  await selectNode(await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "agent").id));
  check("REGRESSION: agent legacy sans satellites → pas de section prompt composé",
    (await page.$$eval('[data-testid="agent-prompt-section"]', (e) => e.length)) === 0);

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL PROMPT-COMPOSE CHECKS PASS ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e);
  log("EXCEPTION: " + out.error);
} finally {
  await page.screenshot({ path: "builder_agent_prompt.png", fullPage: false }).catch(() => {});
  await browser.close();
  writeFileSync("agent_prompt_validation_result.json", JSON.stringify(out, null, 2));
  process.exit(out.pass ? 0 : 1);
}

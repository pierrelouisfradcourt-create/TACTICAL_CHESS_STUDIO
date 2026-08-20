// outputformat-validate.mjs — kind:"outputformat" brick (8ᵉ satellite "sortie attendue").
//  1. ＋ Nouveau → Sortie attendue crée une brique (éditeur visible, kind=outputformat)
//  2. les 3 modèles (free-text / structured / structured-verdicts) — le 3-verdicts
//     auto-sème software/evidence/claim ; sauvegarde persistée
//  3. filtre « Sortie attendue » ne montre que les briques outputformat
//  4. sur le canvas : satellite « sortie attendue » → dropdown importe une brique
//     outputformat → le satellite se remplit du contrat rendu → badge X/8
//  5. le prompt composé inclut « Format de sortie attendu : … »
//  6. bouton « Appliquer » de l'éditeur applique au satellite sélectionné
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; };
const bricks = async () => (await getJson("/api/library"))?.bricks || [];
const byName = async (name) => (await bricks()).find((b) => b.name === name);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1520, height: 960 } });
page.on("dialog", (d) => d.accept());

const centralAgentId = () => page.evaluate(() => window.__ui.nodes.filter((n) => n.type === "agent").slice(-1)[0].id);
const satId = (aid, ct) => page.evaluate(({ a, c }) => (window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === a && n.data.componentType === c) || {}).id, { a: aid, c: ct });
const cardText = (aid) => page.locator(`[data-testid="agent-card-${aid}"]`).textContent().then((t) => t || "");
async function selectNode(id) { await page.locator(`[data-node-id="${id}"]`).click({ position: { x: 8, y: 8 } }); }
async function agentPromptValue(aid) { await selectNode(aid); await page.waitForSelector('[data-testid="agent-prompt"]', { timeout: 4000 }); return page.getByTestId("agent-prompt").inputValue(); }

async function newOutputFormat() {
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-new").click();
  await page.getByTestId("lib-new-outputformat").click();
  await page.waitForSelector('[data-testid="lib-editor-outputformat"]', { timeout: 5000 });
}
async function save() { await page.getByTestId("lib-save").click(); await page.waitForTimeout(400); }

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-agent"]', { timeout: 20000 });

  // ===== 1. ＋ Nouveau → Sortie attendue → éditeur outputformat =====
  await newOutputFormat();
  check("＋ Nouveau → Sortie attendue ouvre l'éditeur kind=outputformat",
    (await page.getByTestId("lib-kind").inputValue()) === "outputformat");
  check("l'éditeur outputformat propose le sélecteur de modèle", await page.getByTestId("lib-of-formatType").isVisible());

  // ===== 2a. modèle Texte libre =====
  await page.getByTestId("lib-name").fill("OF Texte libre");
  await page.getByTestId("lib-of-formatType").selectOption("free-text");
  await page.getByTestId("lib-of-description").fill("Un rapport en prose du résultat.");
  await save();
  const ftBrick = await byName("OF Texte libre");
  check("brique free-text persistée (kind=outputformat)", !!ftBrick && ftBrick.kind === "outputformat");

  // ===== 2b. modèle 3-Verdicts (auto-sème les champs canoniques) =====
  await newOutputFormat();
  await page.getByTestId("lib-name").fill("OF 3-Verdicts");
  await page.getByTestId("lib-of-formatType").selectOption("structured-verdicts");
  await page.waitForSelector('[data-testid="lib-of-verdicts"]', { timeout: 4000 });
  check("structured-verdicts auto-sème le champ software_verdict", await page.getByTestId("lib-of-field-software_verdict").isVisible());
  check("structured-verdicts auto-sème le champ claim_verdict", await page.getByTestId("lib-of-field-claim_verdict").isVisible());
  const previewV = await page.getByTestId("lib-of-preview").inputValue();
  check("aperçu 3-verdicts rend les 3 verdicts", /software_verdict/.test(previewV) && /evidence_verdict/.test(previewV) && /claim_verdict/.test(previewV) && /NO_CLAIM_ALLOWED/.test(previewV));
  await save();
  const vBrick = await byName("OF 3-Verdicts");
  check("brique 3-verdicts persistée avec fields", !!vBrick);
  const vFull = vBrick ? await getJson("/api/library/" + vBrick.id) : null;
  check("3-verdicts payload.fields contient les 3 verdicts",
    (vFull?.payload?.fields || []).map((f) => f.name).sort().join(",") === "claim_verdict,evidence_verdict,software_verdict");

  // ===== 3. filtre « Sortie attendue » ne montre que les outputformat =====
  await page.getByTestId("lib-filter").selectOption("outputformat");
  await page.waitForTimeout(200);
  const rowKinds = await page.$$eval('[data-testid="lib-list"] tr[data-kind]', (rows) => rows.map((r) => r.getAttribute("data-kind")));
  check("filtre outputformat : toutes les lignes sont kind=outputformat", rowKinds.length >= 2 && rowKinds.every((k) => k === "outputformat"));
  await page.getByTestId("lib-filter").selectOption("all");

  // ===== 4. Canvas : le satellite « sortie attendue » importe une brique =====
  await page.getByTestId("tab-canvas").click();
  await page.getByTestId("btn-clear").click();
  await page.getByTestId("add-agent").click();
  await page.getByTestId("import-empty").click().catch(() => {});
  const aid = await centralAgentId();
  const sortie = await satId(aid, "sortieAttendue");
  await selectNode(sortie);
  await page.waitForSelector('[data-testid="comp-outputformat-select"]', { timeout: 4000 });
  check("le satellite « sortie attendue » expose le dropdown d'import outputformat", true);
  const options = await page.$$eval('[data-testid="comp-outputformat-select"] option', (os) => os.map((o) => o.value).filter(Boolean));
  check("le dropdown liste les briques outputformat", options.includes(vBrick.id));
  await page.getByTestId("comp-outputformat-select").selectOption(vBrick.id);
  await page.waitForFunction((i) => { const s = window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === i && n.data.componentType === "sortieAttendue"); return String(s?.data?.text || "").trim() !== ""; }, aid, { timeout: 4000 });
  const satText = await page.evaluate((i) => window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === i && n.data.componentType === "sortieAttendue").data.text, aid);
  check("importer la brique remplit le satellite avec le contrat rendu (3 verdicts)",
    /software_verdict/.test(satText) && /claim_verdict/.test(satText));
  check("remplir le satellite fait progresser le badge (au moins 1/8)", /\/8/.test(await cardText(aid)));

  // ===== 5. le prompt composé inclut la section « Format de sortie attendu » =====
  const composed = await agentPromptValue(aid);
  check("prompt composé inclut « Format de sortie attendu : » + le contenu rendu",
    /Format de sortie attendu :/.test(composed) && /software_verdict/.test(composed));

  // ===== 6. bouton « Appliquer » de l'éditeur (satellite sélectionné) =====
  await selectNode(sortie);
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-filter").selectOption("outputformat");
  await page.getByTestId("lib-open-" + ftBrick.id).click();
  await page.waitForSelector('[data-testid="lib-editor-outputformat"]', { timeout: 4000 });
  const attachBtn = page.getByTestId("lib-attach");
  check("éditeur : bouton « Appliquer » actif quand un satellite sortie attendue est sélectionné", await attachBtn.isEnabled());
  await attachBtn.click();
  await page.waitForFunction((i) => { const s = window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === i && n.data.componentType === "sortieAttendue"); return /prose/.test(String(s?.data?.text || "")); }, aid, { timeout: 4000 });
  const satText2 = await page.evaluate((i) => window.__ui.nodes.find((n) => n.type === "agent-component" && n.data.parentId === i && n.data.componentType === "sortieAttendue").data.text, aid);
  check("« Appliquer » écrit le contrat free-text sur le satellite", /prose/.test(satText2));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL OUTPUTFORMAT CHECKS PASS ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e);
  log("EXCEPTION: " + out.error);
} finally {
  await page.screenshot({ path: "builder_outputformat.png", fullPage: false }).catch(() => {});
  await browser.close();
  writeFileSync("outputformat_validation_result.json", JSON.stringify(out, null, 2));
  process.exit(out.pass ? 0 : 1);
}

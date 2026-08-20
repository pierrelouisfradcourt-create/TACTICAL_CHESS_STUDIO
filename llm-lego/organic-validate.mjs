// Vue organique « mini-planète » de l'Agent — validation Playwright.
//
// Couvre (cf. cadrage Idée 1) :
//   1. Toggle vue technique ↔ organique (défaut = technique, satellites visibles)
//   2. Agent 8/8 → 8 créatures illustrées ; 4/8 → 4 créatures, 4 secteurs vides
//   3. Clic sur une créature → inspecteur du satellite correspondant (même édition)
//   4. Cours d'eau : saine (texte riche) / polluée (placeholder) / asséchée (aucun texte)
//   5. Brouillard scène entière (documented-only) — réutilise nodeAudit (data-fog=1)
//   6. Danger scène entière (broken) — data-danger=1 ET data-fog=0 (jamais les deux)
//   7. Score X/total toujours visible ; « Humain » absent (réservé HumanGate)
//   8. Régressions clés : vue technique inchangée, toEngineGraph exclut les satellites,
//      pas d'erreur console.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };

const CT = ["memoire", "skill", "plugin", "role", "objectif", "gardeFou", "modele", "sortieAttendue"];
// Build a composite agent + its 8 satellites from a fill map {componentType: text}.
function agentGraph(id, x, y, fill, agentData = {}) {
  const nodes = [{ id, type: "agent", x, y, data: { role: "analyste", ...agentData } }];
  CT.forEach((ct, i) => {
    nodes.push({ id: `${id}-${ct}`, type: "agent-component", x: x + (i % 4) * 100, y: y - 90 + Math.floor(i / 4) * 50,
      data: { componentType: ct, text: fill[ct] || "", parentId: id } });
  });
  return nodes;
}

const RICH = {
  role: "un analyste tactique senior des finales d'echecs",
  objectif: "identifier le meilleur coup et le justifier clairement",
  memoire: "les parties precedentes et les ouvertures de l'adversaire",
  skill: "le calcul de variantes profondes et l'evaluation positionnelle",
  plugin: "le moteur Stockfish et la base Syzygy branches",
  gardeFou: "ne jamais proposer un coup illegal ni ignorer un echec",
  modele: "qwen2.5-14b",
  sortieAttendue: "un coup au format UCI avec une explication en francais",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

const sceneInfo = (aid) => page.evaluate((id) => {
  const scene = document.querySelector(`[data-testid="organic-scene-${id}"]`);
  if (!scene) return { hasScene: false };
  const els = [...scene.querySelectorAll("[data-organic-el]")].map((e) => e.getAttribute("data-organic-el"));
  const score = document.querySelector(`[data-testid="organic-score-${id}"]`);
  const nodeEl = document.querySelector(`[data-testid="node-${id}"]`);
  return {
    hasScene: true,
    water: scene.getAttribute("data-water"),
    fog: scene.getAttribute("data-fog"),
    danger: scene.getAttribute("data-danger"),
    els,
    elCount: els.length,
    hasHuman: !!scene.querySelector('[data-organic-el="human"]'),
    hasVeil: !!scene.querySelector('[data-testid="scene-fog-veil"]'),
    hasStorm: !!scene.querySelector('[data-testid="scene-storm"]'),
    scoreText: score ? score.textContent : null,
    scoreVisible: !!score && score.offsetParent !== null,
    nodeFog: nodeEl ? nodeEl.classList.contains("node-fog") : null,
    nodeDanger: nodeEl ? nodeEl.classList.contains("node-danger") : null,
  };
}, aid);

try {
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="btn-organic"]', { timeout: 20000 });

  // ---------- Inject a deterministic set of composite agents ----------
  const all = [
    ...agentGraph("a-full", 40, 150, RICH),                                        // 8/8, healthy
    ...agentGraph("a-half", 340, 150, { role: RICH.role, objectif: RICH.objectif, // 4/8, healthy
      memoire: RICH.memoire, skill: RICH.skill }),
    ...agentGraph("a-dry", 40, 470, { modele: "qwen2.5-14b" }),                    // only modele → dry
    ...agentGraph("a-poll", 340, 470, { objectif: "Your prompt here",             // placeholder → polluted
      memoire: "TODO", role: "lorem ipsum", skill: "tbd" }),
    ...agentGraph("a-doc", 700, 150, RICH, { sourceRef: "lib-x", wiredStatus: "documented-only" }), // fog
    ...agentGraph("a-brk", 700, 470, RICH, { sourceRef: "lib-y", wiredStatus: "broken" }),          // danger
  ];
  await page.evaluate((ns) => window.__setGraph(ns, []), all);
  await page.waitForTimeout(400);

  // ---------- 1. Vue technique par défaut : satellites visibles, pas de scène ----------
  const techBefore = await page.evaluate(() => ({
    sats: document.querySelectorAll('[data-node-type="agent-component"]').length,
    scenes: document.querySelectorAll('[data-testid^="organic-scene-"]').length,
    cardBadge: !!document.querySelector('[data-testid="agent-card-a-full"]'),
  }));
  check("technique par défaut : satellites rendus (48)", techBefore.sats === 48);
  check("technique par défaut : aucune scène organique", techBefore.scenes === 0);
  check("technique par défaut : badge carte d'identité présent", techBefore.cardBadge);

  // ---------- 2. Toggle → vue organique ----------
  await page.getByTestId("btn-organic").click();
  await page.waitForTimeout(400);
  const techAfter = await page.evaluate(() => ({
    sats: document.querySelectorAll('[data-node-type="agent-component"]').length,
    scenes: document.querySelectorAll('[data-testid^="organic-scene-"]').length,
  }));
  check("toggle ON : satellites masqués", techAfter.sats === 0);
  check("toggle ON : 6 scènes organiques rendues", techAfter.scenes === 6);
  await page.screenshot({ path: "organic_all_scenes.png" });

  // ---------- 3. 8/8 → 8 créatures ----------
  const full = await sceneInfo("a-full");
  check("8/8 → 8 créatures visibles", full.elCount === 8);
  check("8/8 → les 8 types présents", CT.every((t) => full.els.includes(t)));
  check("8/8 → eau saine", full.water === "healthy");
  check("8/8 → score 8/8 visible", full.scoreVisible && /8\/8/.test(full.scoreText));

  // ---------- 4. 4/8 → 4 créatures, secteurs vides ----------
  const half = await sceneInfo("a-half");
  check("4/8 → exactement 4 créatures", half.elCount === 4);
  const present4 = ["role", "objectif", "memoire", "skill"];
  check("4/8 → les 4 bonnes créatures présentes", present4.every((t) => half.els.includes(t)));
  check("4/8 → les 4 autres secteurs vides", ["plugin", "gardeFou", "modele", "sortieAttendue"].every((t) => !half.els.includes(t)));
  check("4/8 → score 4/8 visible", half.scoreVisible && /4\/8/.test(half.scoreText));

  // ---------- 5. Clic créature → inspecteur du satellite ----------
  await page.locator('[data-testid="organic-scene-a-full"] [data-organic-el="objectif"]').dispatchEvent('mousedown');
  await page.waitForTimeout(250);
  const insp = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="inspector-agent-component"]');
    const ta = document.querySelector('[data-testid="comp-text"]');
    return { open: !!panel, text: ta ? ta.value : null };
  });
  check("clic oiseau (objectif) → inspecteur satellite ouvert", insp.open);
  check("clic oiseau → inspecteur montre le texte du satellite objectif", insp.text === RICH.objectif);
  // même comportement que la vue technique : on peut cliquer un autre élément
  await page.locator('[data-testid="organic-scene-a-full"] [data-organic-el="gardeFou"]').dispatchEvent('mousedown');
  await page.waitForTimeout(200);
  const insp2 = await page.evaluate(() => document.querySelector('[data-testid="comp-text"]')?.value);
  check("clic chien (garde-fou) → inspecteur bascule sur ce satellite", insp2 === RICH.gardeFou);

  // ---------- 6. Cours d'eau : dry / polluted ----------
  const dry = await sceneInfo("a-dry");
  check("agent sans prose (modèle seul) → eau asséchée", dry.water === "dry");
  check("agent asséché → 1 seule créature (arbre/modèle)", dry.elCount === 1 && dry.els[0] === "modele");
  const poll = await sceneInfo("a-poll");
  check("agent texte placeholder → eau polluée", poll.water === "polluted");

  // ---------- 7. Brouillard scène (documented-only) ----------
  const doc = await sceneInfo("a-doc");
  check("documented-only → scène brumeuse (data-fog=1)", doc.fog === "1");
  check("documented-only → voile de brume rendu", doc.hasVeil);
  check("documented-only → classe node-fog réutilisée (cohérence vue technique)", doc.nodeFog === true);
  check("documented-only → PAS d'orage", doc.danger === "0" && !doc.hasStorm);

  // ---------- 8. Danger scène (broken) — jamais confondu avec la brume ----------
  const brk = await sceneInfo("a-brk");
  check("broken → scène teinte danger (data-danger=1)", brk.danger === "1");
  check("broken → ciel orageux rendu", brk.hasStorm);
  check("broken → classe node-danger réutilisée", brk.nodeDanger === true);
  check("broken → PAS de brume (jamais les deux, garde-fou nodeAudit)", brk.fog === "0" && !brk.hasVeil && brk.nodeFog === false);
  await page.screenshot({ path: "organic_fog_vs_danger.png" });

  // ---------- 9. « Humain » absent de toute scène ----------
  const humans = await page.evaluate(() => document.querySelectorAll('[data-organic-el="human"]').length);
  check("« Humain » absent des scènes (réservé HumanGate)", humans === 0 && !full.hasHuman && !doc.hasHuman);

  // ---------- 10. Régression : toEngineGraph exclut toujours les satellites ----------
  const eng = await page.evaluate(() => {
    const g = window.toEngineGraph(window.__ui.nodes, window.__ui.edges);
    return {
      hasComponent: g.nodes.some((n) => n.type === "agent-component"),
      full: g.nodes.find((n) => n.id === "a-full"),
    };
  });
  check("régression : toEngineGraph n'expose aucun satellite", !eng.hasComponent);
  check("régression : complétude stampée sur l'agent (cardComplete)", eng.full && eng.full.data.cardComplete === true);

  // ---------- 11. Toggle OFF → vue technique inchangée ----------
  await page.getByTestId("btn-organic").click();
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({
    sats: document.querySelectorAll('[data-node-type="agent-component"]').length,
    scenes: document.querySelectorAll('[data-testid^="organic-scene-"]').length,
    cardBadge: !!document.querySelector('[data-testid="agent-card-a-full"]'),
  }));
  check("toggle OFF : satellites de nouveau visibles (48)", back.sats === 48);
  check("toggle OFF : plus aucune scène (vue technique restaurée)", back.scenes === 0);
  check("toggle OFF : carte d'identité technique intacte", back.cardBadge);

  check("aucune erreur console pendant tout le parcours", errors.length === 0);
  if (errors.length) log("CONSOLE ERRORS: " + JSON.stringify(errors.slice(0, 5)));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n✅ ORGANIC — tous les checks passent" : `\n❌ ORGANIC — échec: ${out.failed}`);
} catch (e) {
  out.error = String(e && e.stack || e);
  log("💥 " + out.error);
} finally {
  await browser.close();
  writeFileSync("organic_validation_result.json", JSON.stringify(out, null, 2));
  log(`checks: ${Object.values(out.checks).filter(Boolean).length}/${Object.keys(out.checks).length}`);
  process.exit(out.pass ? 0 : 1);
}

// Planète étendue + Sélecteur rapide calques + Confirmations suppression — validation Playwright.
//
// Chantier A : sphère centrale + créatures en orbite ; étendu à tout agent (composite +
//   withRole) ; fantômes cliquables → inspecteur satellite avec le SÉLECTEUR DE CHAMP (pioche
//   la valeur homonyme chez les agents existants), pas le dropdown « fiche entière » du nœud central.
// Chantier B : panneau gauche des calques ACTIFS ; clic → isole un seul calque (édition).
// Chantier C : modale DOM de confirmation avant suppression (canvas / nœud / fiche) ;
//   l'annulation ne supprime RIEN (vérifié).
//
// Seam confirmations : sous automation (navigator.webdriver) la modale est court-circuitée
// par défaut → le SETUP (btn-clear) marche. On pose window.__autoConfirm=false pour FORCER
// la modale quand on la teste, puis =true pour la suite.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const CT = ["memoire", "skill", "plugin", "role", "objectif", "gardeFou", "modele", "sortieAttendue"];
const now = "2026-01-01T00:00:00Z";
const RICH = { role: "analyste tactique senior", objectif: "trouver le meilleur coup",
  memoire: "parties precedentes du joueur", skill: "calcul de variantes profondes",
  plugin: "Stockfish branche", gardeFou: "jamais un coup illegal", modele: "qwen2.5-14b",
  sortieAttendue: "un coup UCI explique" };
const post = (doc) => fetch(BASE + "/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
const brick = (o) => ({ maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null, wiredStatus: "unset", created: now, updated: now, ...o });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
const setAuto = (v) => page.evaluate((x) => { window.__autoConfirm = x; }, v);
const md = (sel) => page.locator(sel).dispatchEvent("mousedown"); // organic el = onMouseDown

const sceneInfo = (id) => page.evaluate((aid) => {
  const sc = document.querySelector(`[data-testid="organic-scene-${aid}"]`);
  if (!sc) return { hasScene: false };
  return { hasScene: true, composite: sc.getAttribute("data-composite"), water: sc.getAttribute("data-water"),
    creatures: [...sc.querySelectorAll("[data-organic-el]")].map((e) => e.getAttribute("data-organic-el")),
    ghosts: [...sc.querySelectorAll("[data-organic-ghost]")].map((e) => e.getAttribute("data-organic-ghost")),
    sphere: !!sc.querySelector("circle[r='46']"),
    score: document.querySelector(`[data-testid="organic-score-${aid}"]`)?.textContent };
}, id);

try {
  // seed a fiche agent (has a plugin field) + a goal fiche + a deletable brick
  await post(brick({ id: "fx-agent", kind: "agent", name: "Fiche Coder", payload: { role: "", memoire: "", skill: "", plugin: "Stockfish + Syzygy", objectif: "", gardeFou: "", modele: "" } }));
  await post(brick({ id: "fx-del", kind: "goal", name: "Fiche jetable", payload: { text: "à supprimer", category: "produit" } }));

  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="btn-organic"]', { timeout: 20000 });

  // ============ CHANTIER A ============
  await page.evaluate((data) => {
    const CT = ["memoire", "skill", "plugin", "role", "objectif", "gardeFou", "modele", "sortieAttendue"];
    const mk = (id, x, y, fill) => [{ id, type: "agent", x, y, data: { role: "analyste" } },
      ...CT.map((ct, i) => ({ id: `${id}-${ct}`, type: "agent-component", x: x + (i % 4) * 90, y: y - 80 + ((i / 4) | 0) * 44, data: { componentType: ct, text: fill[ct] || "", parentId: id } }))];
    const half = { role: data.RICH.role, objectif: data.RICH.objectif, memoire: data.RICH.memoire, skill: data.RICH.skill };
    const withRole = { id: "coder-9", type: "agent", x: 720, y: 170, data: { role: "qwen-coder", model: "Qwen-Coder" } };
    window.__setGraph([...mk("a-full", 40, 180, data.RICH), ...mk("a-half", 380, 180, half), withRole], []);
  }, { RICH });
  await page.waitForTimeout(300);
  await page.getByTestId("btn-organic").click();
  await page.waitForTimeout(400);

  const full = await sceneInfo("a-full");
  check("A: sphère centrale = le nœud (composite)", full.sphere && full.composite === "1");
  check("A: composite 8/8 → 8 créatures en orbite", full.creatures.length === 8 && CT.every((t) => full.creatures.includes(t)));
  await page.screenshot({ path: "organic_ext_composite.png" });

  const coder = await sceneInfo("coder-9");
  check("A: agent withRole affiche une sphère", coder.hasScene && coder.sphere && coder.composite === "0");
  check("A: withRole → SEULEMENT caméléon (rôle) + arbre (modèle)", coder.creatures.sort().join(",") === "modele,role");
  check("A: withRole → aucune autre créature ni fantôme", coder.ghosts.length === 0);
  const nodeEl = await page.$('[data-testid="node-coder-9"]'); if (nodeEl) await nodeEl.screenshot({ path: "organic_ext_withrole.png" });

  const half = await sceneInfo("a-half");
  check("A: composite 4/8 → 4 créatures + 4 fantômes", half.creatures.length === 4 && half.ghosts.length === 4);
  check("A: fantômes = les 4 satellites vides", ["plugin", "gardeFou", "modele", "sortieAttendue"].every((t) => half.ghosts.includes(t)));
  const halfEl = await page.$('[data-testid="node-a-half"]'); if (halfEl) await halfEl.screenshot({ path: "organic_ext_ghost.png" });

  // Fantôme cliquable → inspecteur satellite + SÉLECTEUR DE CHAMP (mécanisme #2), et
  // JAMAIS l'ancien dropdown « fiche entière » (mécanisme #1, réservé au nœud central).
  await md('[data-testid="organic-scene-a-half"] [data-organic-ghost="plugin"]');
  await page.waitForTimeout(250);
  const gi = await page.evaluate(() => ({
    insp: !!document.querySelector('[data-testid="inspector-agent-component"]'),
    field: !!document.querySelector('[data-testid="comp-field-select"]'),
    fieldName: document.querySelector('[data-testid="comp-field-select"]')?.getAttribute("data-field"),
    oldAttach: !!document.querySelector('[data-testid="comp-attach-select"]'),
  }));
  check("A: clic fantôme plugin → inspecteur satellite ouvert", gi.insp);
  check("A: clic fantôme plugin → sélecteur de CHAMP (comp-field-select), PAS l'ancien dropdown fiche", gi.field && gi.fieldName === "plugin" && !gi.oldAttach);
  await page.screenshot({ path: "organic_ext_ghost_click.png" });
  // garde-fou → même sélecteur de champ (uniforme sur les 7 satellites)
  await md('[data-testid="organic-scene-a-half"] [data-organic-ghost="gardeFou"]');
  await page.waitForTimeout(200);
  const gk = await page.evaluate(() => ({
    field: document.querySelector('[data-testid="comp-field-select"]')?.getAttribute("data-field"),
    oldAttach: !!document.querySelector('[data-testid="comp-attach-select"]'),
  }));
  check("A: fantôme garde-fou → sélecteur de CHAMP (comp-field-select), pas l'ancien dropdown", gk.field === "gardeFou" && !gk.oldAttach);
  // piocher la valeur 'plugin' d'un agent existant (fiche fx-agent) → satellite rempli, fantôme → créature
  await md('[data-testid="organic-scene-a-half"] [data-organic-ghost="plugin"]');
  await page.waitForTimeout(200);
  await page.selectOption('[data-testid="comp-field-select"]', "Stockfish + Syzygy");
  await page.waitForTimeout(300);
  const afterAttach = await page.evaluate(() => ({
    text: window.__ui.nodes.find((n) => n.id === "a-half-plugin")?.data.text,
    nowCreature: !!document.querySelector('[data-testid="organic-scene-a-half"] [data-organic-el="plugin"]'),
  }));
  check("A: piocher un champ → satellite plugin rempli (fantôme → créature)", afterAttach.text === "Stockfish + Syzygy" && afterAttach.nowCreature);

  // ============ CHANTIER B ============
  await page.getByTestId("btn-organic").click(); // back to technical for clean layer setup
  await page.waitForTimeout(200);
  const saveLayer = async (name, add) => {
    await page.getByTestId("btn-clear").click(); await page.waitForTimeout(120);
    await page.getByTestId(add).click(); await page.waitForTimeout(120);
    await page.getByTestId("btn-layers").click();
    await page.getByTestId("layer-name-input").fill(name);
    await page.getByTestId("layer-save").click();
    await page.getByTestId("btn-layers").click(); await page.waitForTimeout(120);
  };
  await saveLayer("Alpha", "add-llm");
  await saveLayer("Beta", "add-tool");
  await page.getByTestId("btn-layers").click();
  const layerIds = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="layer-toggle-"]')].map((e) => e.getAttribute("data-testid").replace("layer-toggle-", "")));
  for (const id of layerIds) await page.getByTestId("layer-toggle-" + id).click();
  await page.getByTestId("btn-layers").click(); await page.waitForTimeout(200);
  const b1 = await page.evaluate(() => ({
    quick: !!document.querySelector('[data-testid="active-layers-quick"]'),
    btns: document.querySelectorAll('[data-testid^="quick-layer-"]').length,
    readonly: !!document.querySelector('[data-testid="layers-readonly"]'),
  }));
  check("B: panneau calques actifs liste les 2 superposés", b1.quick && b1.btns === 2);
  check("B: bannière lecture seule présente (2 superposés)", b1.readonly);
  await page.screenshot({ path: "layers_quick_2active.png" });
  const firstQuick = await page.evaluate(() => document.querySelector('[data-testid^="quick-layer-"]').getAttribute("data-testid"));
  await page.getByTestId(firstQuick).click();
  await page.waitForTimeout(250);
  const b2 = await page.evaluate(() => ({
    quick: !!document.querySelector('[data-testid="active-layers-quick"]'),
    readonly: !!document.querySelector('[data-testid="layers-readonly"]'),
  }));
  check("B: clic → un seul calque actif (panneau masqué)", !b2.quick);
  check("B: édition restaurée (bannière lecture seule disparue)", !b2.readonly);
  await page.screenshot({ path: "layers_quick_isolated.png" });

  // ============ CHANTIER C ============
  await setAuto(false); // FORCER la modale
  // C.1 poubelle canvas
  await page.evaluate(() => window.__setGraph([{ id: "n1", type: "llm", x: 100, y: 100, data: {} }, { id: "n2", type: "tool", x: 300, y: 100, data: {} }], []));
  await page.waitForTimeout(150);
  await page.getByTestId("btn-clear").click(); await page.waitForTimeout(200);
  const cvModal = await page.evaluate(() => document.querySelector('[data-testid="confirm-message"]')?.textContent || "");
  check("C: poubelle canvas → modale de confirmation affichée", /Vider le canvas/.test(cvModal));
  await page.screenshot({ path: "confirm_canvas.png" });
  // annulation ne supprime rien
  await page.getByTestId("confirm-cancel").click(); await page.waitForTimeout(150);
  const afterCancel = await page.evaluate(() => window.__ui.nodes.length);
  check("C: ANNULER → aucune suppression (2 nœuds intacts)", afterCancel === 2);
  // confirmer vide bien
  await page.getByTestId("btn-clear").click(); await page.waitForTimeout(120);
  await page.getByTestId("confirm-ok").click(); await page.waitForTimeout(200);
  check("C: CONFIRMER → canvas vidé", (await page.evaluate(() => window.__ui.nodes.length)) === 0);

  // C.2 suppression nœud
  await page.evaluate(() => { window.__setGraph([{ id: "solo", type: "llm", x: 150, y: 150, data: {} }], []); window.__selectNode("solo"); });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /Supprimer le nœud/ }).click();
  await page.waitForTimeout(200);
  const ndModal = await page.evaluate(() => document.querySelector('[data-testid="confirm-message"]')?.textContent || "");
  check("C: « Supprimer le nœud » → modale affichée", /Supprimer cet élément/.test(ndModal));
  await page.screenshot({ path: "confirm_node.png" });
  await page.getByTestId("confirm-cancel").click(); await page.waitForTimeout(150);
  check("C: ANNULER suppression nœud → nœud toujours là", (await page.evaluate(() => window.__ui.nodes.length)) === 1);

  // C.3 suppression fiche Bibliothèque
  await page.getByTestId("tab-library").click(); await page.waitForTimeout(300);
  await page.getByTestId("lib-open-fx-del").click(); await page.waitForTimeout(250);
  await page.getByTestId("lib-delete").click(); await page.waitForTimeout(200);
  const brModal = await page.evaluate(() => document.querySelector('[data-testid="confirm-message"]')?.textContent || "");
  check("C: « Supprimer » fiche Bibliothèque → modale affichée", /Supprimer cette fiche/.test(brModal));
  await page.screenshot({ path: "confirm_brick.png" });
  await page.getByTestId("confirm-cancel").click(); await page.waitForTimeout(200);
  const stillThere = await fetch(BASE + "/api/library/fx-del").then((r) => r.ok).catch(() => false);
  check("C: ANNULER suppression fiche → fiche toujours en Bibliothèque", stillThere === true);

  check("aucune erreur console pendant tout le parcours", errs.length === 0);
  if (errs.length) log("CONSOLE ERRORS: " + JSON.stringify(errs.slice(0, 5)));
  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n✅ EXT — tous les checks passent" : `\n❌ EXT — échec: ${out.failed}`);
} catch (e) {
  out.error = String((e && e.stack) || e);
  log("💥 " + out.error);
} finally {
  await fetch(BASE + "/api/library/fx-agent", { method: "DELETE" }).catch(() => {});
  await fetch(BASE + "/api/library/fx-del", { method: "DELETE" }).catch(() => {});
  await browser.close();
  writeFileSync("organic_ext_validation_result.json", JSON.stringify(out, null, 2));
  log(`checks: ${Object.values(out.checks).filter(Boolean).length}/${Object.keys(out.checks).length}`);
  process.exit(out.pass ? 0 : 1);
}

// Bibliothèque de calques par espace (Système/Pierre/Claude/Qwen) + note humaine + lien roadmap,
// et Menu Roadmap projet (lecture seule) — validation Playwright.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const now = "2026-01-01T00:00:00Z";
const post = (doc) => fetch(BASE + "/api/library/" + doc.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });

const openLayers = async () => {
  const isOpen = await page.evaluate(() => !!document.querySelector('[data-testid="layers-menu"]'));
  if (!isOpen) { await page.getByTestId("btn-layers").click(); await page.waitForTimeout(150); }
};
const ensureGroupOpen = async (owner) => {
  const open = await page.evaluate((o) => !!document.querySelector(`[data-testid="layer-new-${o}"]`), owner);
  if (!open) { await page.click(`[data-testid="layer-group-h-${owner}"]`); await page.waitForTimeout(120); }
};
// pose 2 nœuds simples sur l'Actif pour avoir un calque non vide
const seedCanvas = (tag) => page.evaluate((t) => {
  window.__setGraph([
    { id: "n1-" + t, type: "llm", x: 80, y: 90, data: { model: "m", prompt: "p", outputKey: "out" } },
    { id: "n2-" + t, type: "tool", x: 320, y: 90, data: { name: "search", description: "d" } },
  ], []);
}, tag);

try {
  // Seed une roadmap avec jalons variés (todo/doing/done) pour la vue Roadmap + progression.
  await post({ id: "rm-tarot", kind: "roadmap", name: "Roadmap Jeu de Tarot", maturity: "draft", badge: "demo",
    roadmapRef: null, sourceRef: null, wiredStatus: "unset", created: now, updated: now,
    payload: { category: "produit", milestones: [
      { id: "ms-1", title: "Règles de base", description: "moteur de plis", status: "done", goalRef: null },
      { id: "ms-2", title: "IA adversaire", description: "enchères + jeu", status: "doing", goalRef: null },
      { id: "ms-3", title: "Mode tournoi", description: "classement ELO", status: "todo", goalRef: null },
    ] } });

  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="btn-organic"]', { timeout: 20000 });

  // ============ CHANTIER A ============
  // 1. Sauvegarde manuelle (Pierre actif, pas de run) → espace Pierre.
  await page.evaluate(() => window.__setSaveOwner && window.__setSaveOwner("pierre"));
  seedCanvas("a");
  await page.waitForTimeout(200);
  await openLayers();
  await page.fill('[data-testid="layer-name-input"]', "Mon plan manuel");
  await page.click('[data-testid="layer-save"]');
  await page.waitForTimeout(250);
  const pierreLayer = await page.evaluate(() => {
    const ls = window.__layers();
    return { count: ls.length, owner: ls[0] && ls[0].layerOwner, name: ls[0] && ls[0].name };
  });
  check("A1: calque sauvegardé manuellement → layerOwner 'pierre'", pierreLayer.count === 1 && pierreLayer.owner === "pierre");
  // le groupe Pierre affiche 1, les autres 0
  const counts1 = await page.evaluate(() => ({
    systeme: document.querySelector('[data-testid="layer-group-count-systeme"]').textContent,
    pierre: document.querySelector('[data-testid="layer-group-count-pierre"]').textContent,
    claude: document.querySelector('[data-testid="layer-group-count-claude"]').textContent,
    qwen: document.querySelector('[data-testid="layer-group-count-qwen"]').textContent,
  }));
  check("A1: groupe Pierre compte 1, autres 0", counts1.pierre === "1" && counts1.systeme === "0" && counts1.claude === "0" && counts1.qwen === "0");

  // 2. Menu compact = 4 groupes dépliables présents.
  const groups = await page.evaluate(() => ["systeme", "pierre", "claude", "qwen"].map((o) => ({
    o, hasHeader: !!document.querySelector(`[data-testid="layer-group-h-${o}"]`), hasGroup: !!document.querySelector(`[data-testid="layer-group-${o}"]`),
  })));
  check("A2: menu affiche les 4 groupes (Système/Pierre/Claude/Qwen)", groups.every((g) => g.hasHeader && g.hasGroup));
  await page.locator('[data-testid="layers-menu"]').screenshot({ path: "lr_menu_4groups.png" });
  // dépliable : Système est fermé par défaut (compact) → cliquer l'ouvre
  const sysBodyBefore = await page.evaluate(() => !!document.querySelector('[data-testid="layer-new-systeme"]'));
  await page.click('[data-testid="layer-group-h-systeme"]');
  await page.waitForTimeout(120);
  const sysBodyAfter = await page.evaluate(() => !!document.querySelector('[data-testid="layer-new-systeme"]'));
  check("A2: groupe repliable (Système fermé par défaut, s'ouvre au clic)", sysBodyBefore === false && sysBodyAfter === true);

  // Ajoute 2 calques Claude (pilotage Claude Code) pour tester la multi-sélection cross-groupe.
  await page.evaluate(() => window.__setSaveOwner("claude"));
  seedCanvas("b"); await page.waitForTimeout(150);
  await openLayers();
  await page.fill('[data-testid="layer-name-input"]', "Roadmap tarot (Claude)");
  await page.click('[data-testid="layer-save"]'); await page.waitForTimeout(200);
  seedCanvas("c"); await page.waitForTimeout(150);
  await openLayers();
  await page.fill('[data-testid="layer-name-input"]', "Système optimisé (Claude)");
  await page.click('[data-testid="layer-save"]'); await page.waitForTimeout(200);
  const claudeCount = await page.evaluate(() => document.querySelector('[data-testid="layer-group-count-claude"]').textContent);
  check("A: calques construits par Claude Code (pilotage) → espace 'claude'", claudeCount === "2");

  // 3. Multi-sélection / superposition depuis le nouveau menu (cocher 2 calques cross-groupe).
  await openLayers();
  await ensureGroupOpen("pierre"); await ensureGroupOpen("claude");
  const pierreIds = await page.evaluate(() => window.__layers().filter((l) => l.layerOwner === "pierre").map((l) => l.id));
  const claudeIds = await page.evaluate(() => window.__layers().filter((l) => l.layerOwner === "claude").map((l) => l.id));
  const ids = pierreIds;
  await page.check(`[data-testid="layer-toggle-${pierreIds[0]}"]`); await page.waitForTimeout(120);
  await page.check(`[data-testid="layer-toggle-${claudeIds[0]}"]`); await page.waitForTimeout(200);
  const superposed = await page.evaluate(() => ({
    active: document.querySelector('[data-testid="btn-layers"]').textContent,
    ro: !!document.querySelector('[data-testid="layers-menu-ro"]'),
  }));
  check("A3: multi-sélection cross-groupe → superposition active (2)", /\(2\)/.test(superposed.active) && superposed.ro);
  await page.locator('[data-testid="layers-menu"]').screenshot({ path: "lr_multiselect.png" });
  // désélectionne pour la suite
  await page.uncheck(`[data-testid="layer-toggle-${ids[0]}"]`); await page.waitForTimeout(100);
  await page.uncheck(`[data-testid="layer-toggle-${claudeIds[0]}"]`); await page.waitForTimeout(150);

  // Note humaine + lien roadmap sur le calque Claude "Roadmap tarot".
  await openLayers();
  await ensureGroupOpen("claude");
  const tarotLayer = await page.evaluate(() => window.__layers().find((l) => l.name === "Roadmap tarot (Claude)").id);
  await page.click(`[data-testid="layer-note-btn-${tarotLayer}"]`); await page.waitForTimeout(150);
  await page.fill(`[data-testid="layer-note-input-${tarotLayer}"]`, "Pierre : bonne piste, manque le HumanGate à l'étape 3");
  await page.selectOption(`[data-testid="layer-milestone-${tarotLayer}"]`, "ms-2");
  await page.waitForTimeout(200);
  // re-ouvre pour voir la note + le lien rendus
  await page.click(`[data-testid="layer-note-btn-${tarotLayer}"]`); await page.waitForTimeout(100); // ferme l'éditeur
  const noteState = await page.evaluate(({ id }) => {
    const l = window.__layers().find((x) => x.id === id);
    return { note: l.humanNote, ms: l.roadmapMilestoneRef,
      noteShown: !!document.querySelector(`[data-testid="layer-note-${id}"]`),
      msShown: !!document.querySelector(`[data-testid="layer-ms-${id}"]`) };
  }, { id: tarotLayer });
  check("A: humanNote ajoutée et persistée", /HumanGate/.test(noteState.note || ""));
  check("A: humanNote visible à côté du calque dans la liste", noteState.noteShown);
  check("A: lien calque↔jalon (roadmapMilestoneRef) posé et affiché", noteState.ms === "ms-2" && noteState.msShown);
  await page.locator('[data-testid="layers-menu"]').screenshot({ path: "lr_humannote.png" });

  // Charger un calque Claude sur l'Actif (test/édition) — réutilise loadInto.
  await openLayers();
  await ensureGroupOpen("claude");
  await page.click(`[data-testid="layer-load-${tarotLayer}"]`); await page.waitForTimeout(250);
  const loaded = await page.evaluate(() => ({ nodes: window.__ui.nodes.length, active: window.__zones().active.nodes.length }));
  check("Précision: charger calque Claude sur l'Actif (mécanisme existant) → nœuds chargés, éditables", loaded.nodes >= 1);

  // Copier-coller depuis le calque chargé vers propre espace (réutilise Ctrl+C/V existant).
  await page.evaluate(() => { const g = window.__ui.nodes; window.__selectNode(g[0].id); });
  await page.waitForTimeout(100);
  const beforePaste = await page.evaluate(() => window.__ui.nodes.length);
  const copied = await page.evaluate(() => window.__copySelection());
  const pasted = await page.evaluate(() => window.__pasteClipboard());
  await page.waitForTimeout(150);
  const afterPaste = await page.evaluate(() => window.__ui.nodes.length);
  check("Précision: copier-coller depuis calque chargé (mécanisme existant) fonctionne", copied && pasted && afterPaste > beforePaste);

  // ============ CHANTIER B — Vue Roadmap ============
  await page.getByTestId("btn-roadmap").click();
  await page.waitForTimeout(300);
  const rmView = await page.evaluate(() => ({
    modal: !!document.querySelector('[data-testid="roadmap-modal"]'),
    card: !!document.querySelector('[data-testid="roadmap-card-rm-tarot"]'),
    pct: document.querySelector('[data-testid="roadmap-pct-rm-tarot"]')?.textContent,
    ms1: !!document.querySelector('[data-testid="roadmap-ms-ms-1"]'),
    ms2: !!document.querySelector('[data-testid="roadmap-ms-ms-2"]'),
    ms3: !!document.querySelector('[data-testid="roadmap-ms-ms-3"]'),
  }));
  check("B: bouton Roadmap ouvre la vue avec la brique roadmap + ses jalons", rmView.modal && rmView.card && rmView.ms1 && rmView.ms2 && rmView.ms3);
  // done=100, doing=50, todo=0 → moyenne = 50%
  check("B: progression calculée correcte (done+doing+todo → 50%)", rmView.pct === "50%");
  // lien calque↔jalon affiché dans la vue (ms-2 a le calque tarot associé)
  const msLayers = await page.evaluate(() => document.querySelector('[data-testid="roadmap-ms-layers-ms-2"]')?.textContent || "");
  check("B: lien calque↔jalon visible dans la vue Roadmap (jalon ms-2)", /calques associés/.test(msLayers) && /Roadmap tarot/.test(msLayers));
  await page.locator('[data-testid="roadmap-modal"] .roadmap-box').screenshot({ path: "lr_roadmap_view.png" });
  // lecture seule : pas d'input d'édition de jalon dans la vue
  const editable = await page.evaluate(() => document.querySelectorAll('[data-testid="roadmap-modal"] input, [data-testid="roadmap-modal"] textarea, [data-testid="roadmap-modal"] select').length);
  check("B: vue Roadmap en lecture seule (aucun champ d'édition)", editable === 0);
  await page.click('[data-testid="roadmap-close"]'); await page.waitForTimeout(150);

  // ============ RÉGRESSION : menu « Charger : » (chaînes/exemples) intact et séparé ============
  await page.getByTestId("example-dropdown").click(); await page.waitForTimeout(150);
  const loader = await page.evaluate(() => ({
    menu: !!document.querySelector('[data-testid="example-menu"]'),
    ex: document.querySelectorAll('[data-testid^="example-"]').length,
  }));
  check("Régression: menu « Charger : » (exemples/chaînes) toujours présent et séparé", loader.menu && loader.ex >= 3);

  check("aucune erreur console pendant tout le parcours", errs.length === 0);
  if (errs.length) log("CONSOLE ERRORS: " + JSON.stringify(errs.slice(0, 5)));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n✅ LAYERS+ROADMAP — tous les checks passent" : `\n❌ LAYERS+ROADMAP — échec: ${out.failed}`);
} catch (e) {
  out.error = String((e && e.stack) || e);
  log("💥 " + out.error);
} finally {
  await browser.close();
  writeFileSync("layers_roadmap_validation_result.json", JSON.stringify(out, null, 2));
  log(`checks: ${Object.values(out.checks).filter(Boolean).length}/${Object.keys(out.checks).length}`);
  process.exit(out.pass ? 0 : 1);
}

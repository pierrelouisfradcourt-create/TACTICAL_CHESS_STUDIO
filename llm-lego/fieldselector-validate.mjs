// Sélecteur de CHAMP par satellite (mécanisme #2) vs « attacher une fiche entière » sur le
// NŒUD CENTRAL (mécanisme #1) — validation Playwright.
//
// Reproduit le scénario de Pierre : cliquer un satellite (mémoire, plugin, …) doit ouvrir le
// SÉLECTEUR DE CHAMP (comp-field-select), qui pioche la valeur homonyme chez les agents
// existants (étiquetée par agent source) + « Nouveau » — et JAMAIS le dropdown des 18 fiches
// agent. Le nœud central, lui, garde « Attacher une fiche » (agent-attach) qui remplit les 8.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };

const CT = ["memoire", "skill", "plugin", "role", "objectif", "gardeFou", "modele", "sortieAttendue"];
const SEVEN = ["memoire", "skill", "plugin", "role", "objectif", "gardeFou", "modele"];
const LABEL = { memoire: "mémoire", skill: "skill", plugin: "plugin", role: "rôle", objectif: "objectif", gardeFou: "garde-fou", modele: "modèle" };

// Deux agents SOURCES sur le canvas, aux champs distincts et reconnaissables : leurs valeurs
// doivent apparaître dans le sélecteur de champ d'un TROISIÈME agent (la cible, vide).
const SRC_A = {
  role: "analyste tactique alpha", memoire: "parties alpha mémorisées", skill: "calcul profond alpha",
  plugin: "stockfish alpha", objectif: "gagner la finale alpha", gardeFou: "jamais coup illégal alpha",
  modele: "qwen2.5-14b-alpha", sortieAttendue: "UCI alpha",
};
const SRC_B = {
  role: "avocat du diable beta", memoire: "ouvertures beta", skill: "évaluation beta",
  plugin: "syzygy beta", objectif: "réfuter le plan beta", gardeFou: "signaler risque beta",
  modele: "qwen3-beta", sortieAttendue: "JSON beta",
};
function agentGraph(id, x, y, fill, agentData = {}) {
  const nodes = [{ id, type: "agent", x, y, data: { role: "analyste", ...agentData } }];
  CT.forEach((ct, i) => nodes.push({ id: `${id}-${ct}`, type: "agent-component",
    x: x + (i % 4) * 100, y: y - 90 + Math.floor(i / 4) * 50,
    data: { componentType: ct, text: fill[ct] || "", parentId: id } }));
  return nodes;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

// Open the satellite inspector by selecting the component node directly (same target the
// ghost/satellite click reaches via setSel(satId)); returns the field-selector state.
const openSat = (targetId, ct) => page.evaluate(({ targetId, ct }) => {
  window.__selectNode && window.__selectNode(`${targetId}-${ct}`);
  return true;
}, { targetId, ct });

const fieldSelInfo = () => page.evaluate(() => {
  const insp = document.querySelector('[data-testid="inspector-agent-component"]');
  const fieldSel = document.querySelector('[data-testid="comp-field-select"]');
  const attachSel = document.querySelector('[data-testid="comp-attach-select"]'); // ancien mécanisme (doit être ABSENT)
  const opts = fieldSel ? [...fieldSel.options].map((o) => ({ value: o.value, text: o.textContent })) : [];
  return {
    inspOpen: !!insp,
    hasFieldSel: !!fieldSel,
    hasOldAttach: !!attachSel,
    field: fieldSel ? fieldSel.getAttribute("data-field") : null,
    optCount: opts.length,
    hasNew: opts.some((o) => o.value === "__new__"),
    // valeurs harvestées = options hors placeholder ('') et hors '__new__'
    harvested: opts.filter((o) => o.value && o.value !== "__new__").map((o) => o.text),
    values: opts.filter((o) => o.value && o.value !== "__new__").map((o) => o.value),
  };
});

try {
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="btn-organic"]', { timeout: 20000 });

  // Deux sources (A,B) + une cible VIDE (T) — tous composites.
  const all = [
    ...agentGraph("src-a", 40, 160, SRC_A),
    ...agentGraph("src-b", 360, 160, SRC_B),
    ...agentGraph("tgt", 700, 160, {}), // cible : tous satellites vides
  ];
  await page.evaluate((ns) => window.__setGraph(ns, []), all);
  await page.waitForTimeout(500);

  // ---------- 1. Les 7 satellites de la cible → sélecteur de CHAMP (pas l'ancien dropdown) ----------
  for (const ct of SEVEN) {
    await openSat("tgt", ct);
    await page.waitForTimeout(150);
    const info = await fieldSelInfo();
    check(`${LABEL[ct]} : inspecteur satellite ouvert`, info.inspOpen);
    check(`${LABEL[ct]} : sélecteur de CHAMP présent (comp-field-select, data-field=${ct})`, info.hasFieldSel && info.field === ct);
    check(`${LABEL[ct]} : ANCIEN dropdown « fiche entière » ABSENT (comp-attach-select)`, !info.hasOldAttach);
    check(`${LABEL[ct]} : option « ＋ Nouveau » présente`, info.hasNew);
    // les valeurs des 2 sources (A,B) pour CE champ doivent être proposées, étiquetées par source
    const wantA = SRC_A[ct], wantB = SRC_B[ct];
    check(`${LABEL[ct]} : propose la valeur de la source A (${wantA})`, info.values.includes(wantA));
    check(`${LABEL[ct]} : propose la valeur de la source B (${wantB})`, info.values.includes(wantB));
    check(`${LABEL[ct]} : valeurs étiquetées par nom d'agent source ([role])`, info.harvested.every((t) => /^\[.+\]/.test(t)));
    // screenshot dédié du panneau inspecteur pour CE satellite
    const insp = page.locator('[data-testid="inspector-agent-component"]');
    await insp.screenshot({ path: `fieldsel_${ct}.png` });
  }

  // ---------- 2. Sélectionner une valeur harvestée → remplit UNIQUEMENT ce champ ----------
  await openSat("tgt", "memoire");
  await page.waitForTimeout(150);
  await page.selectOption('[data-testid="comp-field-select"]', SRC_A.memoire);
  await page.waitForTimeout(200);
  const afterPick = await page.evaluate(() => {
    const g = window.__ui.nodes;
    const mem = g.find((n) => n.id === "tgt-memoire");
    const others = ["skill", "plugin", "role", "objectif", "gardeFou", "modele"]
      .map((ct) => g.find((n) => n.id === `tgt-${ct}`));
    return { memText: mem ? mem.data.text : null, othersEmpty: others.every((n) => !String(n.data.text || "").trim()) };
  });
  check("sélection valeur mémoire → satellite mémoire rempli avec CETTE valeur", afterPick.memText === SRC_A.memoire);
  check("sélection valeur mémoire → les 6 autres satellites INTACTS (vides)", afterPick.othersEmpty);

  // ---------- 3. « Nouveau » → focus le textarea, ne remplit rien ----------
  await openSat("tgt", "plugin");
  await page.waitForTimeout(150);
  await page.selectOption('[data-testid="comp-field-select"]', "__new__");
  await page.waitForTimeout(150);
  const afterNew = await page.evaluate(() => ({
    focused: document.activeElement === document.querySelector('[data-testid="comp-text"]'),
    pluginText: (window.__ui.nodes.find((n) => n.id === "tgt-plugin") || {}).data?.text || "",
  }));
  check("« Nouveau » sur plugin → textarea focalisé (saisie manuelle)", afterNew.focused);
  check("« Nouveau » sur plugin → aucun texte injecté", afterNew.pluginText === "");

  // ---------- 4. RÉGRESSION CRITIQUE : nœud CENTRAL garde « Attacher une fiche » (18 fiches) ----------
  await page.evaluate(() => window.__selectNode && window.__selectNode("tgt"));
  await page.waitForTimeout(200);
  const central = await page.evaluate(() => {
    const insp = document.querySelector('[data-testid="inspector-agent"]');
    const attach = document.querySelector('[data-testid="agent-attach"]');
    const agentOpts = attach ? [...attach.options].filter((o) => o.value) : [];
    return { inspOpen: !!insp, hasAttach: !!attach, agentFicheCount: agentOpts.length };
  });
  check("nœud central : inspecteur agent ouvert", central.inspOpen);
  check("nœud central : « Attacher une fiche » (agent-attach) TOUJOURS présent", central.hasAttach);
  check("nœud central : liste bien les fiches agent entières (≥1)", central.agentFicheCount >= 1);
  await page.locator('[data-testid="inspector-agent"]').screenshot({ path: "fieldsel_central_node.png" });

  // Le mécanisme #1 remplit-il bien les 8 satellites ? Attache la 1ʳᵉ fiche agent et vérifie.
  const firstFiche = await page.evaluate(() => {
    const attach = document.querySelector('[data-testid="agent-attach"]');
    const o = attach ? [...attach.options].find((x) => x.value) : null;
    return o ? o.value : null;
  });
  if (firstFiche) {
    await page.selectOption('[data-testid="agent-attach"]', firstFiche);
    await page.waitForTimeout(400);
    const filled = await page.evaluate(() => {
      const g = window.__ui.nodes;
      const sats = ["role", "memoire", "skill", "plugin", "objectif", "gardeFou", "modele"]
        .map((ct) => g.find((n) => n.id === `tgt-${ct}`));
      return sats.filter((n) => String(n.data.text || "").trim()).length;
    });
    check("nœud central : attacher une fiche remplit ≥1 satellite d'un coup (mécanisme #1 intact)", filled >= 1);
  } else {
    check("nœud central : au moins une fiche agent disponible pour tester le remplissage", false);
  }

  check("aucune erreur console pendant tout le parcours", errors.length === 0);
  if (errors.length) log("CONSOLE ERRORS: " + JSON.stringify(errors.slice(0, 5)));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n✅ FIELD-SELECTOR — tous les checks passent" : `\n❌ FIELD-SELECTOR — échec: ${out.failed}`);
} catch (e) {
  out.error = String((e && e.stack) || e);
  log("💥 " + out.error);
} finally {
  await browser.close();
  writeFileSync("fieldselector_validation_result.json", JSON.stringify(out, null, 2));
  log(`checks: ${Object.values(out.checks).filter(Boolean).length}/${Object.keys(out.checks).length}`);
  process.exit(out.pass ? 0 : 1);
}

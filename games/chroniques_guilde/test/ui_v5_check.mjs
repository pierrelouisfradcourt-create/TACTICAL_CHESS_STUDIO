// Banc Playwright de la V5 T4 « écran Raid ». Usage : node test/ui_v5_check.mjs
// 1) le moteur sous node (mêmes 5 managers que la page, lus dans index.html) cherche la graine dont le raid s'ouvre le plus tôt
//    avec un passage jouable par p1 ; 2) la page rejoue la saison jusqu'à ce jour et joue le passage à la main dans Chromium.
// Ce qui est vérifié : onglet Raid (apparition + écran par défaut), grille dessinée conforme à VM.raid (boss, unités, pixels),
// aperçu d'un sort cohérent avec previewCast, coup envoyé au moteur et journal mis à jour, sort hors de portée refusé avec la
// raison du moteur, « Fin de passage » qui verrouille, « Fin de journée » → section Raid de la chronique + jauge du boss,
// export → import → Rejouer IDENTIQUE avec des raid_pass humains, 400 px sans défilement horizontal, sombre, reduced-motion.
// Horloge simulée via page.clock (aucune attente réelle). Captures : test/out/v5_*.png. Code de sortie 1 si un contrôle échoue.
// V5 T3 (2026-09-18) : bloc E ajouté — le choix de spécialisation (deux cartes, verbe, sorts, « utile contre », pastille de
// recommandation), la spécialisation acquise et le bloc de reconversion sur l'écran « Mon héros », en 400 px.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const pw = require('/opt/node22/lib/node_modules/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const URL_FILE = pathToFileURL(path.join(ROOT, 'index.html')).href;
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MANAGERS = new Function('return [' + /var MANAGERS = \[([\s\S]*?)\];/.exec(html)[1] + '];')();

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const note = msg => console.log('NOTE  ' + msg);
const shot = async (page, name) => { await page.clock.runFor(1200); await page.screenshot({ path: path.join(OUT, `v5_${name}.png`), fullPage: false }); };
const tableau = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableau)));
const view = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__raidView())));
const draw = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__raidDraw)));
const preview = page => page.evaluate(() => window.__raidPreview ? JSON.parse(JSON.stringify(window.__raidPreview)) : null);
const text = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const count = async (page, sel) => (await page.$$(sel)).length;
const toasts = page => page.$$eval('#toasts .toast', els => els.map(e => e.textContent));
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/* ---- 1. Moteur sous node : la graine dont le raid s'ouvre le plus tôt, p1 apte à jouer ---- */
const allDefaults = s => { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; };
function firstRaid(seed) {
  let s = sim.newGame(seed, data, { managers: MANAGERS });
  for (let d = 0; d < 30; d++) {
    const vm = sim.viewModel(s, 'p1'); if (vm.is_season_over) break;
    if (vm.raid && vm.raid.active && vm.day === vm.raid.day_start && vm.raid.me && vm.raid.me.can_play) {
      return { seed, day: vm.day, raid: vm.raid };
    }
    s = sim.resolveDay(s, allDefaults(s)).state;
  }
  return null;
}
// V5 T5 : le bloc A se joue sur un raid du SYLVAIN. Son fouet se pointe « vers ta case » et se recalcule à chaque
// pas — c'est ce que vérifie le contrôle du télégraphe qui suit le héros. Le souffle du Drake, lui, est annoncé au
// premier tour et RETIENT ses cases (T3b, `pending_breath`) : il ne bouge plus, par conception. Depuis le correctif
// de `preferredBiome` (T5) le premier dragon d'une graine n'est plus toujours le Sylvain, et le bloc tombait sur un
// Drake. Repli sur le premier raid venu si aucune graine ne donne un Sylvain jouable.
let target = null, targetAny = null;
for (let seed = 1; seed <= 60 && !(target && target.day <= 11); seed++) {
  const r = firstRaid(seed);
  if (!r) continue;
  if (!targetAny || r.day < targetAny.day) targetAny = r;
  if (r.raid.id === 'raid_forest' && (!target || r.day < target.day)) target = r;
}
if (!target) target = targetAny;
if (!target) { console.log('FAIL  aucune graine avec un raid jouable par p1 (1..60)'); process.exit(1); }
const R0 = target.raid;
console.log('moteur : graine ' + target.seed + ', raid le jour ' + target.day + ' — ' + R0.name +
  ' · boss (' + R0.boss.x + ',' + R0.boss.y + ') ' + R0.boss.w + 'x' + R0.boss.h + ' · ' + R0.hp_label +
  ' · phase ' + R0.phase + ' · riposte « ' + R0.boss.next_riposte.label + ' » · ' +
  R0.me.spells.length + ' sorts · ' + R0.me.reachable.length + ' cases atteignables · classe ' + R0.me.class_id);

/* ---- 1b. V5 T2b (§B5, §B6, §B8) : ce que la page ne doit plus figer dans son code ---- */
{
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('§B5 : les PA par tour du raid viennent des données (PA_PER_TURN = DATA.raid.pa_per_turn), plus de « 6 » figé',
    /var PA_PER_TURN = \(DATA\.raid && DATA\.raid\.pa_per_turn\)/.test(src) && !/paMax: 6/.test(src) && !/pass\.pa_max : 6/.test(src),
    (src.match(/paMax[^,;]*/g) || []).join(' | '));
  check('§B6 : le nombre de créneaux n’est plus plafonné à 4 (Math.min(4, h.ap_today) a disparu)',
    !/Math\.min\(4, h\.ap_today\)/.test(src) && /function slotCount\(h\) \{ return Math\.max\(3, h\.ap_today \|\| 0,/.test(src),
    (src.match(/function slotCount[^\n]*/) || [''])[0]);
  check('§B8 : les marqueurs du tableau vivant passent par les identifiants de la chronique (summary.injury_ids / level_up_ids / construction_id, threat.defender_ids, expedition.participant_ids)',
    /managersOf\(sum\.injury_ids, sum\.injuries\)/.test(src) && /managersOf\(sum\.level_up_ids, sum\.level_ups\)/.test(src) && /managersOf\(m\.threat\.defender_ids, m\.threat\.defenders\)/.test(src) && /managersOf\(e\.participant_ids, e\.participants\)/.test(src) && /sum\.construction_id/.test(src) && /m\.threat\.building_hit_id/.test(src));
  check('§B1 : la page ne reconstruit plus l’ordre de passage du moteur (plus de tri par identifiant de manager dans raidForecast)',
    !/mid >= mine/.test(src) && /validateRaidPass\(app\.state, rd\.hero, rd\.actions, rd\.env\)/.test(src));
}

/* ---- 2. Page ---- */
async function newPage(browser, width, colorScheme = 'light', ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, ...ctxOpts });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const T0 = new Date('2026-09-18T08:00:00Z'); await page.clock.install({ time: T0 }); await page.clock.pauseAt(T0);
  await page.goto(URL_FILE); await page.waitForSelector('[data-testid="btn-launch"]');
  return { ctx, page, errors };
}
async function newGameSeed(page, seed) {
  await page.click('[data-testid="tab-journal"]'); await page.fill('#seed-input', String(seed)); await page.click('#btn-new-game'); await page.keyboard.press('Escape');
}
// Jusqu'au matin du jour demandé : « Fin de journée » puis « Jour suivant » (le soir d'un jour de raid revient au tableau).
async function playToMorning(page, day) {
  for (let guard = 0; guard < 60; guard++) {
    const t = await tableau(page);
    if (!t.evening && t.day === day) return t;
    if (t.defeat) throw new Error('guilde dispersée avant le jour ' + day);
    if (t.evening) await page.click('#btn-next-day');
    else await page.click('[data-testid="btn-launch"]');
  }
  throw new Error('playToMorning : trop de journées');
}
const geo = page => page.evaluate(() => {
  const c = document.getElementById('raid-grid'), r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, cell: window.__rdcell(), pad: window.__rdpad(), dpr: c.width / c.clientWidth };
});
async function tapCell(page, x, y) {
  await page.$eval('#raid-grid', e => e.scrollIntoView({ block: 'center' }));
  const g = await geo(page);
  await page.mouse.click(g.x + g.pad + (x + 0.5) * g.cell, g.y + 1 + (y + 0.5) * g.cell);
}
// Lecture de pixels : la grille est recopiee dans un canvas hors ecran `willReadFrequently`
// (le canvas de la page n'est pas touche et Chromium n'emet aucun avertissement de relecture).
// fx/fy = position dans la case ; 0,3/0,45 vise le disque d'une figurine sans tomber sur son initiale blanche.
const pixel = (page, x, y, fx = 0.5, fy = 0.5) => page.evaluate(([x, y, fx, fy]) => {
  const c = document.getElementById('raid-grid'), dpr = c.width / c.clientWidth, cell = window.__rdcell(), pad = window.__rdpad();
  const off = document.createElement('canvas'); off.width = c.width; off.height = c.height;
  const o = off.getContext('2d', { willReadFrequently: true }); o.drawImage(c, 0, 0);
  const d = o.getImageData(Math.round((pad + (x + fx) * cell) * dpr), Math.round((1 + (y + fy) * cell) * dpr), 1, 1).data;
  return [d[0], d[1], d[2], d[3]].join(',');
}, [x, y, fx, fy]);
// Cases jouables d'un sort selon previewCast, recalculées dans la page sur la vue courante.
const castable = (page, sid) => page.evaluate(sid => {
  const v = window.__raidView(), T = window.GuildeTactic, ok = [], why = {};
  v.grid.cells.forEach(c => { const p = T.previewCast(v, sid, { x: c.x, y: c.y }); if (p.valid) ok.push({ x: c.x, y: c.y }); else why[c.x + ',' + c.y] = p.reason; });
  return { ok, why };
}, sid);

const browser = await pw.chromium.launch();

/* ---- A. 1280 px : le passage joué à la main ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, target.seed);
  check('avant le raid : onglet Raid absent (VM.raid null)', !(await page.isVisible('[data-testid="tab-raid"]')) && (await tableau(page)).raid === null);

  await playToMorning(page, target.day);
  let t = await tableau(page);
  check('jour ' + target.day + ' : onglet Raid visible et sélectionné par défaut',
    (await page.isVisible('[data-testid="tab-raid"]')) && (await page.getAttribute('[data-testid="tab-raid"]', 'aria-pressed')) === 'true' && (await page.isVisible('#panel-raid')),
    'jour ' + t.day);
  check('__tableau.raid = {active, boss_pct, day, my_pass_done, spells, ap, pm}',
    t.raid && t.raid.active === true && t.raid.day === target.day && t.raid.my_pass_done === false &&
    Array.isArray(t.raid.spells) && t.raid.spells.length === R0.me.spells.length && Number.isInteger(t.raid.boss_pct), JSON.stringify(t.raid));

  const v0 = await view(page), d0 = await draw(page);
  const expectUnits = v0.units.filter(u => u.id !== (v0.me && v0.me.hero_id)).length + (v0.me && v0.me.cell && v0.me.can_play ? 1 : 0);
  check('grille : dimensions et boss dessinés comme dans le modèle de vue',
    d0.w === v0.grid.w && d0.h === v0.grid.h && d0.w === 9 && d0.h === 11 &&
    d0.boss.x === v0.boss.x && d0.boss.y === v0.boss.y && d0.boss.w === v0.boss.w && d0.boss.h === v0.boss.h,
    `grille ${d0.w}x${d0.h}, boss (${d0.boss.x},${d0.boss.y}) ${d0.boss.w}x${d0.boss.h}`);
  check('grille : autant d’unités peintes que d’unités du modèle (mon héros compris)',
    d0.units.length === expectUnits && d0.units.some(u => u.mine), `peintes ${d0.units.length} / attendues ${expectUnits}`);
  check('grille : télégraphe de la riposte et cases atteignables peints depuis le modèle',
    d0.riposte.length === v0.boss.next_riposte.cells.length && d0.riposte.length > 0 && d0.reachable === v0.me.reachable.length && d0.reachable > 0,
    `riposte ${d0.riposte.length} cases · atteignables ${d0.reachable}`);
  const empty = v0.grid.cells.filter(c => !c.zone && !c.boss && c.kind === 'floor' &&
    !v0.me.reachable.some(r => r.x === c.x && r.y === c.y) && !v0.boss.next_riposte.cells.some(r => r.x === c.x && r.y === c.y))[0];
  const pxBoss = await pixel(page, v0.boss.x, v0.boss.y, 0.3, 0.45), pxMe = await pixel(page, v0.me.cell.x, v0.me.cell.y, 0.3, 0.45), pxEmpty = empty ? await pixel(page, empty.x, empty.y, 0.3, 0.45) : 'n/a';
  check('grille : le boss et mon héros sont réellement peints (pixels ≠ case vide)',
    pxBoss !== pxEmpty && pxMe !== pxEmpty && pxBoss !== pxMe, `boss ${pxBoss} · moi ${pxMe} · vide ${pxEmpty}`);
  check('bandeau boss : nom, PV, phase, nuit et riposte en clair',
    (await text(page, '[data-testid="raid-boss"]')).includes(v0.boss.name) && (await text(page, '[data-testid="raid-boss"]')).includes(v0.hp_label) &&
    (await text(page, '[data-testid="raid-boss"]')).includes('nuit 1 / ' + v0.max_nights) && (await text(page, '[data-testid="raid-riposte"]')).includes(v0.boss.next_riposte.label),
    await text(page, '[data-testid="raid-boss"]'));
  check('barre de sorts : un bouton par sort de VM.raid, coût en PA et portée',
    await count(page, '.spell-btn') === v0.me.spells.length && (await text(page, '#spell-' + v0.me.spells[0].id)).includes(v0.me.spells[0].cost_pa + ' PA'),
    await text(page, '#spell-' + v0.me.spells[0].id));
  await shot(page, 'grille');

  // --- déplacement : aperçu du chemin et du coût, puis confirmation
  // V5 T5 : on vise une case atteignable qui CHANGE D'AXE. Depuis le correctif de `preferredBiome` (T5), le premier
  // dragon de la graine n'est plus toujours le Sylvain : le télégraphe du Drake tient une ligne complète depuis son
  // corps, et avancer dans cette ligne ne la déplace pas d'une case — le contrôle du télégraphe qui suit le héros
  // n'aurait alors rien mesuré. Repli sur la case la plus haute si aucune case d'un autre axe n'est atteignable.
  const reachSorted = v0.me.reachable.slice().sort((a, b) => a.y - b.y || a.cost - b.cost);
  const far = reachSorted.filter(c => c.x !== v0.me.cell.x)[0] || reachSorted[0];
  await tapCell(page, far.x, far.y);
  let d = await draw(page);
  check('tap sur une case atteignable : chemin et coût en aperçu (aucun coup joué)',
    !!d.move && d.move.x === far.x && d.move.y === far.y && d.move.cost === far.cost && d.move.cells > 0 &&
    (await text(page, '#raid-hint')).includes(far.cost + ' PM'), await text(page, '#raid-hint'));
  // Le premier tap a ouvert le passage : le moteur a déjà écrit « … entre sur la grille … » dans le journal.
  check('premier geste : le passage est ouvert par le moteur, sa ligne d’entrée est au journal',
    /entre sur la grille/.test(await text(page, '#raid-journal li.mine')) && (await tableau(page)).raid.ap > 0,
    await text(page, '#raid-journal li.mine'));
  const pmBefore = (await tableau(page)).raid.pm;
  await tapCell(page, far.x, far.y);
  t = await tableau(page);
  check('deuxième tap : déplacement joué par le moteur (PM consommés, aperçu effacé)',
    t.raid.pm === pmBefore - far.cost && (await draw(page)).move === null,
    `PM ${pmBefore} → ${t.raid.pm} (coût ${far.cost})`);
  // Le télégraphe de la riposte est annoncé « autour de ta case finale » : il doit suivre mon déplacement.
  const vRip = await view(page), dRip = await draw(page);
  // V5 T5 : « et pas ma case d'entrée » était un raccourci. Depuis le correctif de `preferredBiome` (T5), le premier
  // dragon de la graine n'est plus toujours le Sylvain, et un télégraphe en LIGNE peut couvrir la case d'entrée ET la
  // case d'arrivée quand on avance dans l'axe du coup — sans rien dire de faux. Ce qui doit être vrai, et qui l'est
  // dans les deux cas : le télégraphe couvre ma case courante, il a CHANGÉ depuis ma case d'entrée, et la grille
  // peint exactement les cases du modèle.
  const cellsOf = v => v.boss.next_riposte.cells.map(c => c.x + ',' + c.y).join(' ');
  check('riposte télégraphiée depuis ma case courante (et non depuis ma case d’entrée)',
    vRip.boss.next_riposte.cells.some(c => c.x === far.x && c.y === far.y) &&
    !vRip.boss.next_riposte.cells.some(c => c.x === v0.me.cell.x && c.y === v0.me.cell.y) &&
    cellsOf(vRip) !== cellsOf(v0) &&
    dRip.riposte.length === vRip.boss.next_riposte.cells.length,
    `entrée (${v0.me.cell.x},${v0.me.cell.y}) [${cellsOf(v0)}] → case (${far.x},${far.y}) [${cellsOf(vRip)}]`);
  // Le passage a commencé : mon héros est maintenant une unité du moteur, la grille doit suivre le modèle exactement.
  const v0b = await view(page), d0b = await draw(page);
  check('grille en cours de passage : unités peintes = unités du modèle, à leur case',
    d0b.units.length === v0b.units.length && v0b.units.every(u => d0b.units.some(p => p.id === u.id && p.x === u.x && p.y === u.y)) &&
    d0b.units.some(p => p.mine && p.x === far.x && p.y === far.y),
    `${d0b.units.length} unités : ` + d0b.units.map(p => p.id + '(' + p.x + ',' + p.y + ')').join(' '));

  // --- armer un sort : aperçu peint et cohérent avec previewCast
  const v1 = await view(page);
  let armed = null;
  for (const s of v1.me.spells) { if (!s.castable) continue; const c = await castable(page, s.id); if (c.ok.length) { armed = { s, c }; break; } }
  if (!armed) { check('un sort au moins est jouable depuis la case atteinte', false); }
  else {
    const before = await pixel(page, armed.c.ok[0].x, armed.c.ok[0].y);
    await page.click('#spell-' + armed.s.id);
    const p = await preview(page), after = await pixel(page, armed.c.ok[0].x, armed.c.ok[0].y);
    const keys = new Set(armed.c.ok.map(c => c.x + ',' + c.y));
    check('tap sur un sort : __raidPreview non vide et exactement les cases de previewCast',
      !!p && p.spell === armed.s.id && p.cells.length === armed.c.ok.length && p.cells.every(c => keys.has(c.x + ',' + c.y)) && !!p.aim,
      `${armed.s.id} : ${p ? p.cells.length : 0} cases, ${p ? p.zone.length : 0} de zone, ${p ? p.targets.length : 0} cible(s)`);
    check('aperçu peint sur la grille (pixel de case jouable modifié) et bouton pressé',
      before !== after && (await page.getAttribute('#spell-' + armed.s.id, 'aria-pressed')) === 'true' &&
      (await draw(page)).preview.cells === armed.c.ok.length, `${before} → ${after}`);
    check('bandeau d’aide : le sort armé, son coût, sa portée et le nombre de cases',
      (await text(page, '#raid-hint')).includes(armed.s.name) && (await text(page, '#raid-hint')).includes(String(armed.c.ok.length)),
      await text(page, '#raid-hint'));
    await shot(page, 'sort_arme');

    // --- sort hors de portée : refus avec la raison du moteur
    const bad = v1.grid.cells.filter(c => !keys.has(c.x + ',' + c.y) && armed.c.why[c.x + ',' + c.y])[0];
    const expected = armed.c.why[bad.x + ',' + bad.y];
    await tapCell(page, bad.x, bad.y);
    check('sort hors de portée : refusé, raison du moteur en clair, aperçu annulé',
      (await toasts(page)).some(x => x === expected) && (await preview(page)) === null && !!expected,
      `(${bad.x},${bad.y}) → « ${expected} » · toasts ${JSON.stringify(await toasts(page))}`);

    // --- confirmer le sort sur la case visée
    const apBefore = (await tableau(page)).raid.ap, log2 = await count(page, '#raid-journal li.mine');
    await page.click('#spell-' + armed.s.id);
    const aim = (await preview(page)).aim;
    await tapCell(page, aim.x, aim.y);
    t = await tableau(page);
    check('tap sur une case de l’aperçu : coup envoyé au moteur (PA consommés, journal enrichi)',
      t.raid.ap === apBefore - armed.s.cost_pa && (await count(page, '#raid-journal li.mine')) > log2 && (await preview(page)) === null,
      `PA ${apBefore} → ${t.raid.ap} (coût ${armed.s.cost_pa}) · mes lignes ${log2} → ${await count(page, '#raid-journal li.mine')}`);
    await shot(page, 'apres_coup');
    check('journal du passage : les lignes du moteur, les miennes mises en avant',
      await count(page, '#raid-journal li.mine') >= 2 && /passage|héros attendu/.test(await text(page, '#raid-journal-count')),
      await text(page, '#raid-journal-count'));
    await page.$eval('#raid-journal', e => e.scrollIntoView({ block: 'center' }));
    await shot(page, 'journal');
    await page.$eval('#raid-grid', e => e.scrollIntoView({ block: 'center' }));
  }

  // --- fin de passage : écran en lecture seule
  await page.click('[data-testid="btn-end-pass"]');
  t = await tableau(page);
  check('« Fin de passage » : passage transmis, écran verrouillé, sorts grisés',
    t.raid.my_pass_done === true && (await page.isVisible('[data-testid="raid-locked"]')) &&
    await count(page, '.spell-btn:not([disabled])') === 0 && await count(page, '[data-testid="btn-end-pass"]') === 0,
    await text(page, '[data-testid="raid-locked"]'));
  const lockedLog = await count(page, '#raid-journal li.mine'), lockedAp = t.raid.ap;
  await tapCell(page, target.raid.boss.x, target.raid.boss.y);
  check('écran verrouillé : un tap sur la grille ne joue plus rien',
    await count(page, '#raid-journal li.mine') === lockedLog && (await preview(page)) === null && (await tableau(page)).raid.ap === lockedAp);
  await shot(page, 'passage_termine');

  // --- tableau vivant : jauge du boss + widget
  await page.click('[data-testid="tab-tableau"]');
  const gauge = await text(page, '[data-testid="raid-gauge"]'), widget = await text(page, '#widget-l2');
  check('tableau : jauge du boss sous la scène (nom + %) et aperçu widget « ⚔️ Raid jour N · boss X % »',
    (await page.isVisible('[data-testid="raid-gauge"]')) && gauge.includes(R0.name) && /\d+ %/.test(gauge) &&
    new RegExp('⚔️ Raid jour ' + target.day + ' · boss \\d+ % · \\d+/\\d+ ont joué').test(widget), gauge + ' | ' + widget);
  check('tableau : mon héros est sur la route du raid (aura)', (await tableau(page)).placed.p1 === 'raid' && (await tableau(page)).targets.p1.x > 430,
    JSON.stringify((await tableau(page)).targets.p1));
  check('tableau : bandeau de siège nommant le boss et la nuit',
    /tient la clairière/.test(await text(page, '[data-testid="banner-raid"]')) && (await text(page, '[data-testid="banner-raid"]')).includes(R0.name),
    await text(page, '[data-testid="banner-raid"]'));
  await shot(page, 'tableau');

  // --- fin de journée : section Raid de la chronique
  await page.click('[data-testid="btn-launch"]');
  t = await tableau(page);
  check('« Fin de journée » : le soir revient au tableau (Jour suivant accessible)', t.evening === true && await page.isVisible('#btn-next-day'));
  check('chronique : une section Raid avec les passages de chacun (mon passage compris)',
    await count(page, '[data-testid="chronicle"] .chron-section.is-raid') === 1 &&
    (await text(page, '#chron-raid-passes')).includes('Vous') && /Sève restante : \d+ %/.test(await text(page, '[data-testid="chronicle"] .chron-section.is-raid')),
    (await text(page, '#chron-raid-passes')).slice(0, 140));
  check('soir : jauge du boss toujours sur le tableau', await page.isVisible('[data-testid="raid-gauge"]'), await text(page, '[data-testid="raid-gauge"]'));
  await shot(page, 'soir');

  // --- journal : raid_pass humain, export → import → Rejouer IDENTIQUE
  await page.click('[data-testid="tab-journal"]');
  await page.click('#btn-export');
  const json = await page.inputValue('#journal-json');
  const doc = JSON.parse(json);
  const rp = doc.days.flatMap(d => d.actions).filter(a => a.type === 'raid_pass');
  check('journal : une action raid_pass de p1 avec mes coups (move + cast + end_pass)',
    rp.length === 1 && rp[0].manager_id === 'p1' && rp[0].payload.actions.some(a => a.type === 'move') &&
    rp[0].payload.actions.some(a => a.type === 'cast') && rp[0].payload.actions[rp[0].payload.actions.length - 1].type === 'end_pass',
    rp.length ? rp[0].payload.actions.map(a => a.type).join('+') : 'aucune');
  const hashBefore = await text(page, '[data-testid="state-hash"]');
  await page.click('#btn-import');
  check('import : rejoué, même empreinte', /Importé/.test(await text(page, '#import-result')) && (await text(page, '[data-testid="state-hash"]')) === hashBefore, hashBefore);
  await page.click('[data-testid="btn-replay"]');
  check('export → import → Rejouer : IDENTIQUE avec des raid_pass humains', /IDENTIQUE/.test(await text(page, '[data-testid="replay-result"]')), await text(page, '[data-testid="replay-result"]'));
  await page.keyboard.press('Escape');
  const notices = await page.$$eval('#notices-list li', els => els.map(e => e.textContent));
  if (notices.some(n => /interrompu/.test(n))) note('passage interrompu au rejeu (la grille change avant mon tour) : ' + notices.filter(n => /interrompu/.test(n))[0]);
  check('1280 px : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- B. 400 px : écran Raid au doigt ---- */
{
  const { ctx, page, errors } = await newPage(browser, 400);
  await newGameSeed(page, target.seed);
  await playToMorning(page, target.day);
  check('mobile 400 px : écran Raid ouvert, pas de défilement horizontal',
    (await page.isVisible('#panel-raid')) && await noHScroll(page),
    JSON.stringify(await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))));
  const g = await geo(page);
  check('mobile : grille entière à l’écran, cases ≥ 34 px (tap au doigt)', g.cell >= 34 && g.cell * 11 + 2 <= 900, 'case ' + g.cell + ' px');
  const v = await view(page);
  const sp = v.me.spells[0];
  await page.click('#spell-' + sp.id);
  check('mobile : un sort s’arme et peint son aperçu sans défilement horizontal',
    ((await preview(page)) !== null || (await toasts(page)).length > 0) && await noHScroll(page));
  await shot(page, 'mobile');
  check('mobile : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- C. Thème sombre ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'dark');
  await newGameSeed(page, target.seed);
  await playToMorning(page, target.day);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const v = await view(page), d = await draw(page);
  const empty = v.grid.cells.filter(c => !c.zone && !c.boss && c.kind === 'floor' && !v.me.reachable.some(r => r.x === c.x && r.y === c.y) &&
    !v.boss.next_riposte.cells.some(r => r.x === c.x && r.y === c.y))[0];
  check('sombre : fond sombre et grille dessinée avec les jetons du thème',
    /rgb\(2\d, /.test(bg) && d.units.length > 0 && (await pixel(page, v.boss.x, v.boss.y, 0.3, 0.45)) !== (empty ? await pixel(page, empty.x, empty.y, 0.3, 0.45) : ''), bg);
  await shot(page, 'sombre');
  check('sombre : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- D. prefers-reduced-motion ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', { reducedMotion: 'reduce' });
  await newGameSeed(page, target.seed);
  await playToMorning(page, target.day);
  const v = await view(page);
  let ok = false;
  for (const s of v.me.spells) { if (!s.castable) continue; const c = await castable(page, s.id); if (!c.ok.length) continue; await page.click('#spell-' + s.id); ok = (await preview(page)) !== null; break; }
  if (!ok) { const far = v.me.reachable.slice().sort((a, b) => a.y - b.y)[0]; await tapCell(page, far.x, far.y); ok = !!(await draw(page)).move; }
  check('reduced-motion : écran Raid rendu, aperçu jouable, aucune erreur', ok && errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- E. V5 T3 : le choix de spécialisation et la reconversion sur l'écran « Mon héros » ---- */
{
  // graine où le héros de p1 reçoit sa proposition de spécialisation (VM.choice de type 'spec')
  let spec = null;
  for (let seed = 1; seed <= 40 && !spec; seed++) {
    let st = sim.newGame(seed, data, { managers: MANAGERS });
    for (let d = 0; d < 26 && !spec; d++) {
      st = sim.resolveDay(st, allDefaults(st)).state;
      const vm = sim.viewModel(st, 'p1');
      if (vm.choice && vm.choice.kind === 'spec') spec = { seed: seed, day: vm.day, choice: vm.choice };
    }
  }
  if (!spec) check('(T3) une graine propose une spécialisation à p1 en moins de 26 jours', false, 'aucune graine 1..40');
  else {
    const { ctx, page, errors } = await newPage(browser, 420);
    await newGameSeed(page, spec.seed);
    await playToMorning(page, spec.day);
    await page.click('[data-testid="tab-heros"]');
    await page.clock.runFor(300);
    const cards = await count(page, '#spec-cards .spec-card');
    const reco = await count(page, '#spec-cards .spec-card.is-reco');
    const lead = await text(page, '#spec-lead');
    check('(T3) écran Mon héros : deux cartes de spécialisation côte à côte, une seule pastille « Recommandé », l\'échéance annoncée',
      cards === 2 && reco === 1 && /jour \d+/.test(lead), cards + ' carte(s), ' + reco + ' pastille(s) — ' + lead.slice(0, 90));
    const cardTxt = await text(page, '#spec-' + spec.choice.options[0].id);
    const o = spec.choice.options[0];
    check('(T3) une carte porte le verbe, les deux sorts chiffrés et « Utile contre »',
      cardTxt.indexOf(o.verb) >= 0 && o.spells.every(sp => cardTxt.indexOf(sp.name) >= 0 && cardTxt.indexOf(sp.cost_pa + ' PA') >= 0) && cardTxt.indexOf('Utile contre') >= 0,
      cardTxt.slice(0, 120));
    await page.click('#spec-' + o.id);
    await page.clock.runFor(300);
    const pressed = await page.getAttribute('#spec-' + o.id, 'aria-pressed');
    await shot(page, 't3_choix_spec');
    await page.click('[data-testid="tab-tableau"]');
    await playToMorning(page, spec.day + 1);
    await page.click('[data-testid="tab-heros"]');
    await page.clock.runFor(300);
    const have = await text(page, '#spec-have');
    check('(T3) le choix part avec les ordres du soir : le lendemain, la spécialisation acquise et ses sorts sont affichés',
      pressed === 'true' && have.indexOf(o.name) >= 0 && o.spells.every(sp => have.indexOf(sp.name) >= 0), 'pressée=' + pressed + ' · ' + have.slice(0, 110));
    const rb = await count(page, '#respec-box');
    const rbTxt = rb ? await text(page, '#respec-box') : '';
    check('(T3) la reconversion est offerte avec son coût et son échéance (ou refusée avec sa raison)',
      rb === 1 && (/\d+ or de guilde/.test(rbTxt) || /indisponible/.test(rbTxt)), rbTxt.slice(0, 120));
    check('(T3) 400 px : aucun défilement horizontal, aucune erreur de page', (await noHScroll(page)) && errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

/* ---- F. V5 T8 : les cinq emplacements de sorts sur l'écran « Mon héros » ----
   L'écran doit montrer les CINQ emplacements et le VIVIER, groupés par origine, avec pour chaque sort son coût en
   points d'action, sa portée, sa forme et son verbe ; un tap remplit ou vide un emplacement ; le refus passe par la
   validation du moteur avec sa raison en français ; et l'écran Raid n'affiche plus que les cinq sorts emportés. */
{
  // graine où le héros de p1 a un VIVIER plus large que ses cinq emplacements (sinon il n'y a rien à choisir)
  let found = null;
  for (let seed = 1; seed <= 40 && !found; seed++) {
    let st = sim.newGame(seed, data, { managers: MANAGERS });
    for (let d = 0; d < 20 && !found; d++) {
      st = sim.resolveDay(st, allDefaults(st)).state;
      const vm = sim.viewModel(st, 'p1'), me = vm.roster.filter(h => h.is_mine)[0];
      if (me && me.loadout && me.loadout.pool_size > me.loadout.slots) found = { seed: seed, day: vm.day, vm: me.loadout };
    }
  }
  if (!found) check('(T8) une graine donne à p1 un vivier plus large que ses cinq emplacements', false, 'aucune graine 1..40');
  else {
    const { ctx, page, errors } = await newPage(browser, 420);
    await newGameSeed(page, found.seed);
    await playToMorning(page, found.day);
    await page.click('[data-testid="tab-heros"]');
    await page.click('[data-testid="fold-loadout"] summary');
    await page.clock.runFor(300);
    const L = found.vm;
    const slots = await count(page, '[data-testid="loadout-slots"] .ld-slot');
    const filled = await count(page, '[data-testid="loadout-slots"] .ld-slot.is-full');
    const pool = await count(page, '#loadout .ld-btn');
    const groups = await count(page, '#loadout .ld-group');
    check('(T8) écran Mon héros : cinq emplacements affichés, tous remplis, et le vivier entier au-dessous',
      slots === L.slots && slots === 5 && filled === L.slots && pool === L.pool_size && pool > L.slots,
      slots + ' emplacements (' + filled + ' remplis) · vivier ' + pool + ' sorts · ' + groups + ' groupes d\'origine');
    check('(T8) le vivier est groupé par origine : première classe, deuxième classe, voie, pointe',
      groups === L.groups.length && groups >= 2 &&
      (await text(page, '#loadout')).indexOf('Première classe') >= 0 && (await text(page, '#loadout')).indexOf('Deuxième classe') >= 0,
      L.groups.map(g => g.label).join(' | '));
    const one = L.groups[0].spells[0];
    const card = await text(page, '[data-testid="pool-' + one.id + '"]');
    check('(T8) chaque sort du vivier porte son coût en PA, sa portée, sa forme et son verbe (tout vient du moteur)',
      card.indexOf(one.name) >= 0 && card.indexOf(one.cost_pa + ' PA') >= 0 && card.indexOf('portée ' + one.range_label) >= 0 && card.indexOf(one.verb) >= 0,
      card.slice(0, 120));
    // un tap vide un emplacement : le moteur refuse un chargement à quatre, sa raison s'affiche
    const carried0 = L.carried.map(x => x.id);
    await page.click('[data-testid="pool-' + carried0[0] + '"]');
    await page.clock.runFor(300);
    const why = await text(page, '[data-testid="loadout-why"]');
    const toast1 = (await toasts(page)).slice(-1)[0] || '';
    check('(T8) un tap vide un emplacement : le moteur refuse les quatre sorts restants et sa raison est affichée en français',
      /il faut exactement 5 sorts emport/.test(why) && /il faut exactement 5 sorts emport/.test(toast1) &&
      (await count(page, '[data-testid="loadout-slots"] .ld-slot.is-full')) === 4,
      why + ' · toast « ' + toast1 + ' »');
    // un tap remplit l'emplacement vide avec un sort du vivier non emporté : le moteur accepte
    const spare = L.groups.reduce((a, g) => a.concat(g.spells), []).filter(sp => carried0.indexOf(sp.id) < 0)[0];
    await page.click('[data-testid="pool-' + spare.id + '"]');
    await page.clock.runFor(300);
    const cnt = await text(page, '[data-testid="loadout-count"]');
    const pressed = await page.getAttribute('[data-testid="pool-' + spare.id + '"]', 'aria-pressed');
    check('(T8) un tap remplit l\'emplacement vide : cinq sorts de nouveau, chargement accepté par le moteur',
      cnt === '5/5' && pressed === 'true' && (await count(page, '[data-testid="loadout-slots"] .ld-slot.is-full')) === 5,
      cnt + ' · ' + spare.name + ' pressé=' + pressed);
    // le choix part avec les ordres du jour et se garde le lendemain
    await page.click('[data-testid="tab-tableau"]');
    await playToMorning(page, found.day + 1);
    await page.click('[data-testid="tab-heros"]');
    await page.click('[data-testid="fold-loadout"] summary');
    await page.clock.runFor(300);
    const after = await page.evaluate(() => window.__loadout());
    const want = carried0.slice(1).concat([spare.id]).sort().join(',');
    check('(T8) le choix se garde : le lendemain le héros emporte encore les cinq sorts choisis, marqués comme un choix',
      !!after && after.kind === 'choice' && after.ids.slice().sort().join(',') === want,
      after ? after.kind + ' · ' + after.ids.join(' ') : 'aucun chargement');
    check('(T8) 400 px : aucun défilement horizontal, aucune erreur de page', (await noHScroll(page)) && errors.length === 0, errors.slice(0, 2).join(' | '));
    await shot(page, 't8_cinq_sorts');
    await ctx.close();
  }
}

await browser.close();
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} contrôles passés`);
if (bad.length) { console.log('ÉCHECS : ' + bad.map(r => r.name).join(' | ')); process.exit(1); }

// Banc Playwright du tableau vivant « LE DOMAINE QUI GRANDIT » (CHATEAU_SPEC §9). Usage : node test/ui_chateau_check.mjs
// Date : 2026-09-18. Source : CHATEAU_SPEC.md (§1 caméra, §2 ancrages, §3 verticalité, §4 enceinte et pont-levis,
// §5 soldats, §6 niveaux de détail, §7 jour/nuit, §8 chantiers) + AUDIT_ARCHI §2/§10 (la section de dessin s'étend, ne se refond pas).
//
// 1) Sous node, le moteur joue la politique de la page (mêmes 5 managers lus dans index.html, planDefaults de chacun)
//    pour TROUVER une graine dont la saison traverse les cinq âges, et les jours où chaque âge est atteint, plus un jour
//    de raid (dragon) et un jour de chantier. Les journées qui précèdent sont exportées en JOURNAL et importées dans la
//    page : la page se retrouve au matin du jour voulu sans qu'aucune règle soit rejouée à l'écran.
// 2) La page rend le tableau dans Chromium (page.clock : l'heure simulée est pilotée, aucune attente réelle) et publie
//    `window.__scene`, image en lecture seule de ce qui vient d'être dessiné (âge, caméra, boîtes des bâtiments, enceinte,
//    hauteur de silhouette, pont-levis, soldats). Les contrôles portent sur __scene et sur des pixels, jamais sur l'état.
// Captures : test/out/dom_*.png. Code de sortie 1 si un contrôle échoue.
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
// Tables de la spec, relues dans la page pour que le banc et la page ne puissent pas diverger en silence.
const MAXSIL = new Function('return [' + /var MAXSIL = \[([^\]]*)\]/.exec(html)[1] + '];')();
const CAM = new Function('return [' + /var CAM = \[([\s\S]*?)\];/.exec(html)[1] + '];')();
const GUARDS = data.village_ages.map(a => a.guards | 0);
const AGE_NAMES = data.village_ages.map(a => a.name);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const note = (msg) => console.log('NOTE  ' + msg);
const scene = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__scene)));
const tableau = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableau)));
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/* ---- 1. Moteur sous node : graine qui traverse les cinq âges, jours d'âge, de dragon et de chantier ---- */
const allDefaults = s => { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; };
function season(seed) {
  let s = sim.newGame(seed, data, { managers: MANAGERS });
  const ages = {}, days = [], ev = { raid: null, works: null, trophy: null };
  for (let d = 0; d < 30; d++) {
    const vm = sim.viewModel(s, 'p1'); if (vm.is_season_over || vm.defeat) break;
    const age = vm.village.age_index;
    if (ages[age] === undefined) ages[age] = { day: vm.day, days: days.slice() };
    if (!ev.raid && vm.threat && vm.threat.phase === 'raid') ev.raid = { day: vm.day, age: age, name: vm.threat.name, days: days.slice() };
    if (vm.construction && (!ev.works || age > ev.works.age)) ev.works = { day: vm.day, age: age, id: vm.construction.building_id, progress: vm.construction.progress, needed: vm.construction.needed, days: days.slice() };
    if (!ev.trophy && vm.village.trophies.length) ev.trophy = { day: vm.day, age: age };
    const acts = allDefaults(s), r = sim.resolveDay(s, acts);
    days.push({ day: vm.day, actions: acts }); s = r.state;
  }
  return { seed, ages, ev };
}
let found = null;
for (let seed = 1; seed <= 60 && !found; seed++) {
  const r = season(seed);
  if ([0, 1, 2, 3, 4].every(a => r.ages[a]) && r.ev.raid && r.ev.works) found = r;
}
if (!found) { console.log('FAIL  aucune graine 1..60 ne traverse les cinq âges'); process.exit(1); }
const SEED = found.seed;
const journalOf = days => JSON.stringify({ seed: SEED, managers: MANAGERS, days: days.map(d => ({ day: d.day, actions: d.actions })) });
console.log('moteur : graine ' + SEED + ' — âges ' + JSON.stringify(Object.keys(found.ages).map(a => a + ':j' + found.ages[a].day)) +
  ' · raid j' + found.ev.raid.day + ' (âge ' + found.ev.raid.age + ') · chantier j' + found.ev.works.day + ' (âge ' + found.ev.works.age + ', ' + found.ev.works.id + ' ' + found.ev.works.progress + '/' + found.ev.works.needed + ')');

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
// Importe le journal des journées qui précèdent : la page se retrouve au matin du jour visé, tableau à l'écran.
async function loadDay(page, days) {
  await page.click('[data-testid="tab-journal"]');
  await page.fill('#journal-json', journalOf(days)); await page.click('#btn-import');   // même graine à tous les âges, y compris jour 1
  await page.keyboard.press('Escape');
  await page.click('[data-testid="tab-tableau"]');
  await page.clock.runFor(1600);          // la caméra d'âge a fini son glissement de 1 200 ms
  return scene(page);
}
// L'horloge simulée n'avance que dans un sens : on la pousse de l'heure courante jusqu'à l'heure visée.
const setHour = async (page, h) => { const cur = (await tableau(page)).hour; await page.clock.runFor(Math.max(0, Math.round((h - cur) / 0.25) * 250) + 40); return scene(page); };
const shot = async (page, name, sel) => {
  await page.clock.runFor(200);
  const target = sel ? await page.$(sel) : page;
  await target.screenshot({ path: path.join(OUT, `dom_${name}.png`) });
};
// Heure « calme » : aucune bulle de révélation à l'écran (les heures de jeu des amis sont déterministes,
// mêmes formules que la page : 8 h + fnv1a(graine:jour:manager) % 12, bulle visible 2,5 h).
function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const FRIENDS = MANAGERS.filter(m => m.id !== 'p1').map(m => m.id);
function quietHour(day) {
  const hs = FRIENDS.map(id => 8 + fnv1a(SEED + ':' + day + ':' + id) % 12);
  for (const h of [15, 14, 16, 13, 17, 12, 11, 18, 10, 19, 9]) if (hs.every(x => !(x > h - 2.5 && x <= h))) return h;
  return 15;
}
const inside = (b, w) => b.x >= w.x - 1 && b.x + b.w <= w.x + w.w + 1 && b.y + b.h >= w.y - 1 && b.y + b.h <= w.y + w.h + 1;

const browser = await pw.chromium.launch();
const sil = {};
/* ---- A. Les cinq âges : caméra, silhouette, enceinte, captures ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  for (const age of [0, 1, 2, 3, 4]) {
    const sc = await loadDay(page, found.ages[age].days);
    const t = await tableau(page);
    sil[age] = sc.silhouette_h;
    check(`âge ${age} (${AGE_NAMES[age]}, jour ${found.ages[age].day}) rendu : __scene.age = VM, caméra du §1 (zoom ${CAM[age][0]}, sol ${CAM[age][1]})`,
      sc.age === age && t.age === age && sc.camera.zoom === CAM[age][0] && Math.round(sc.camera.ground) === CAM[age][1],
      JSON.stringify(sc.camera) + ' age=' + sc.age);
    check(`âge ${age} : silhouette mesurée ${sc.silhouette_h} ≤ plafond ${MAXSIL[age]} du §3`, sc.silhouette_h > 0 && sc.silhouette_h <= MAXSIL[age], String(sc.silhouette_h));
    check(`âge ${age} : ${GUARDS[age]} soldat(s) dessiné(s) = gardes de l'âge (§5)`, sc.soldiers.length === GUARDS[age], sc.soldiers.length + ' / ' + GUARDS[age]);
    if (age >= 2) check(`âge ${age} : enceinte présente et bâtiments à l'intérieur (§2)`, !!sc.wall && sc.buildings.length > 0);
    if (age >= 3) {
      const outs = sc.buildings.filter(b => !inside(b, sc.wall));
      check(`âge ${age} : les ${sc.buildings.length} bâtiments bâtis sont DANS l'enceinte (test de boîtes)`, outs.length === 0, outs.map(b => b.id).join(', '));
      const over = sc.buildings.filter(b => b.id !== 'hall' && b.y < sc.wall.crest - 1);
      check(`âge ${age} : les bâtiments de cour restent sous la ligne des créneaux, le donjon au-dessus (§3)`,
        over.length === 0 && sc.buildings.filter(b => b.id === 'hall').every(b => b.y < sc.wall.crest), over.map(b => b.id).join(', '));
    }
    await setHour(page, quietHour(found.ages[age].day));
    await shot(page, 'age' + age, '#scene');
  }
  const suite = [0, 1, 2, 3, 4].map(a => sil[a]);
  check('la silhouette grandit à chaque âge : ' + suite.join(' → ') + ' (§3, de 60 à 300 unités)',
    suite.every((v, i) => i === 0 || v > suite[i - 1]) && suite[4] >= 0.6 * MAXSIL[4], suite.join(' → '));
  check('cinq âges : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
/* ---- B. Château : heure simulée, pont-levis, nuit, soldats déterministes ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  let sc = await loadDay(page, found.ages[4].days);
  check('château : enceinte fermée, quatre tours d\'angle et pont-levis publiés (§4)', !!sc.wall && !!sc.drawbridge, JSON.stringify(sc.drawbridge));
  sc = await setHour(page, 12);
  check('château à 12 h : pont-levis ABAISSÉ (§4 : 8 h → 20 h)', sc.hour === 12 && sc.drawbridge.down === true && sc.drawbridge.a === 1, JSON.stringify(sc.drawbridge));
  await page.clock.runFor(60);            // nouvelles images rendues, heure simulée inchangée
  const s12b = await scene(page);
  check('château : deux rendus à la même heure simulée donnent la MÊME scène (déterminisme, §5)',
    s12b.hour === sc.hour && JSON.stringify(s12b.soldiers) === JSON.stringify(sc.soldiers) && s12b.silhouette_h === sc.silhouette_h && JSON.stringify(s12b.buildings) === JSON.stringify(sc.buildings),
    JSON.stringify(s12b.soldiers) + ' vs ' + JSON.stringify(sc.soldiers));
  await shot(page, 'chateau_jour', '#scene');
  const s19 = await setHour(page, 19.75);
  check('château à 19 h 45 : pont-levis encore abaissé', s19.drawbridge.down === true, JSON.stringify(s19.drawbridge));
  // Le soir de la journée = la nuit de la scène (heure simulée 23 h) : le pont se relève.
  await page.click('[data-testid="btn-launch"]');
  await page.clock.runFor(1800);
  const night = await scene(page);
  check('château la nuit (soir, heure simulée 23 h) : pont-levis RELEVÉ et scène en gamme de nuit (§4, §7)',
    night.hour === 23 && night.night === true && night.drawbridge.down === false && night.drawbridge.a === 0, JSON.stringify(night.drawbridge));
  check('château la nuit : les soldats restent au nombre des gardes', night.soldiers.length === GUARDS[4], String(night.soldiers.length));
  await shot(page, 'chateau_nuit', '#scene');
  check('château : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
/* ---- B'. Le passage d'âge : la caméra recule et les murs se referment sur le village en 1 200 ms (§1, §2) ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  const before = await loadDay(page, found.ages[3].days.slice(0, -1));   // matin de la veille du jour où la ville se fortifie
  const bx = {}; before.buildings.forEach(b => { bx[b.id] = b.x; });
  check('veille de la ville fortifiée : scène à l\'âge ' + before.age + ', caméra ' + before.camera.zoom, before.age === 2 && before.camera.zoom === CAM[2][0], JSON.stringify(before.camera));
  await page.click('[data-testid="btn-launch"]');                        // la journée se résout : le village change d'âge
  await page.clock.runFor(400);
  const mid = await scene(page);
  const moving = mid.buildings.filter(b => bx[b.id] !== undefined && Math.abs(b.x - bx[b.id]) > 2);
  check('pendant le passage : la caméra GLISSE (zoom strictement entre ' + CAM[2][0] + ' et ' + CAM[3][0] + ')',
    mid.age === 3 && mid.camera.zoom < CAM[2][0] && mid.camera.zoom > CAM[3][0], JSON.stringify(mid.camera));
  check('pendant le passage : les bâtiments GLISSENT vers leur ancrage de cour (' + moving.length + ' en mouvement)', moving.length >= 4,
    moving.map(b => b.id).join(', '));
  await page.clock.runFor(1400);
  const after = await scene(page);
  const still = after.buildings.filter(b => !!b);
  check('1 200 ms plus tard : la caméra est posée sur l\'âge atteint et les bâtiments sont DANS l\'enceinte',
    after.camera.zoom === CAM[3][0] && Math.round(after.camera.ground) === CAM[3][1] && !!after.wall && still.every(b => inside(b, after.wall)),
    JSON.stringify(after.camera) + ' · ' + still.filter(b => !inside(b, after.wall)).map(b => b.id).join(','));
  await shot(page, 'passage_age', '#scene');
  check('passage d\'âge : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
/* ---- C. Déterminisme fort : deux chargements indépendants, même heure, mêmes pixels ---- */
{
  const grab = async () => {
    const { ctx, page } = await newPage(browser, 1280, 'light', { reducedMotion: 'reduce' });
    await loadDay(page, found.ages[4].days);
    await setHour(page, 14);
    const sc = await scene(page);
    const png = await page.$eval('#scene', c => c.toDataURL('image/png'));
    await ctx.close();
    return { sc, png };
  };
  const a = await grab(), b = await grab();
  check('deux chargements indépendants à 14 h : __scene identique au caractère près', JSON.stringify(a.sc) === JSON.stringify(b.sc));
  check('deux chargements indépendants à 14 h : pixels du canvas identiques (aucun tirage aléatoire à l\'affichage)', a.png === b.png,
    a.png.length + ' vs ' + b.png.length);
}
/* ---- D. Trois niveaux de détail : la silhouette ne change pas (§6) ---- */
{
  const at = async (width) => {
    const { ctx, page } = await newPage(browser, width, 'light', { reducedMotion: 'reduce' });
    await loadDay(page, found.ages[4].days);
    await setHour(page, 14);
    const sc = await scene(page);
    const w = await page.$eval('#scene', c => c.clientWidth);
    const over = await noHScroll(page);
    if (width <= 420) await shot(page, width === 400 ? '400px' : 'etroit');
    if (width === 400) await shot(page, 'vignette160', '#widget-tile');
    await ctx.close();
    return { sc, w, over };
  };
  const big = await at(1280), mid = await at(400), small = await at(240);
  check('LOD : bureau = 0 (canvas 584 px), mobile = 1 (332 px), vignette = 2 (172 px) selon la largeur du canvas (§6)',
    big.sc.lod === 0 && mid.sc.lod === 1 && small.sc.lod === 2, [big.sc.lod, mid.sc.lod, small.sc.lod].join(','));
  check('la SILHOUETTE est la même aux trois niveaux de détail (§6 : on ajoute du détail, jamais on ne change la forme)',
    big.sc.silhouette_h === mid.sc.silhouette_h && mid.sc.silhouette_h === small.sc.silhouette_h,
    [big.sc.silhouette_h, mid.sc.silhouette_h, small.sc.silhouette_h].join(' / '));
  check('les bâtiments occupent les mêmes boîtes aux trois niveaux de détail',
    JSON.stringify(big.sc.buildings) === JSON.stringify(mid.sc.buildings) && JSON.stringify(mid.sc.buildings) === JSON.stringify(small.sc.buildings));
  check('lisible à 400 px et à 240 px : canvas dans la page, aucun débordement horizontal',
    mid.over && small.over && mid.w > 300 && mid.w <= 400 && small.w > 150 && small.w <= 240, JSON.stringify([mid.w, small.w]));
  check('vignette du widget : 160 px, même scène que l\'écran (silhouette identique)', small.sc.silhouette_h === big.sc.silhouette_h);
}
/* ---- E. Chantier visible et jour de dragon (§8, §7) ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  const sc = await loadDay(page, found.ev.works.days);
  await setHour(page, quietHour(found.ev.works.day));
  check('jour de chantier : __scene.construction suit le bâtiment en travaux et son avancement (§8)',
    !!sc.construction && sc.construction.id === found.ev.works.id && sc.construction.ratio > 0 && sc.construction.ratio <= 1,
    JSON.stringify(sc.construction));
  await shot(page, 'chantier', '#scene');
  const sc2 = await loadDay(page, found.ev.raid.days);
  await setHour(page, quietHour(found.ev.raid.day));
  check('jour de dragon : la scène est rendue à l\'âge du jour, ciel du biome (aucune erreur)', sc2.age === found.ev.raid.age, 'âge ' + sc2.age);
  await shot(page, 'dragon', '#scene');
  check('chantier et dragon : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
/* ---- F. Thème sombre et mouvement réduit ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'dark');
  const sc = await loadDay(page, found.ages[4].days);
  check('thème sombre : le château est rendu, silhouette identique au thème clair', sc.silhouette_h === sil[4], sc.silhouette_h + ' vs ' + sil[4]);
  await shot(page, 'sombre', '#scene');
  check('thème sombre : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', { reducedMotion: 'reduce' });
  const sc = await loadDay(page, found.ages[4].days);
  check('prefers-reduced-motion : caméra posée d\'emblée sur l\'âge (aucune animation), aucune erreur',
    sc.camera.zoom === CAM[4][0] && Math.round(sc.camera.ground) === CAM[4][1] && errors.length === 0,
    JSON.stringify(sc.camera) + ' ' + errors.slice(0, 2).join(' | '));
  await ctx.close();
}
await browser.close();
const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);

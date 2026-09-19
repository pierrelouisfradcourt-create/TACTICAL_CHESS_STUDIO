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
const r1 = v => Math.round(v * 10) / 10;
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

/* ---- outils de la tranche « le château qu'on habite » : repère logique 800 × 460 de __scene ---- */
const LOGW = 800, LOGH = 460;
// aire d'un polygone (lacet) — sert au taux de couverture du sol de cour
const area = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
// point dans le quadrilatère de l'enceinte (fond, face, murs latéraux en fuite)
const spanAt = (wall, y) => {
  const [bl, br, fr, fl] = wall.poly, u = (y - bl[1]) / Math.max(1e-6, fl[1] - bl[1]);
  return { u, x0: bl[0] + (fl[0] - bl[0]) * u, x1: br[0] + (fr[0] - br[0]) * u };
};
const inEnc = (wall, x, y, pad = 0) => {
  if (y < wall.poly[0][1] - pad || y > wall.poly[3][1] + pad) return false;
  const s = spanAt(wall, y); return x >= s.x0 - pad && x <= s.x1 + pad;
};
// bâtiment ENTOURÉ : sa base est entre le mur de fond et le mur de face, et sa boîte entre les murs latéraux
const encircled = (b, wall) => {
  const base = b.y + b.h;
  if (base < wall.back.y - 1 || base > wall.front.y + 1) return false;
  const s = spanAt(wall, base);
  return b.x >= s.x0 - 1 && b.x + b.w <= s.x1 + 1;
};
const boxesHit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rgbOf = str => (String(str).match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// pixels du canevas du tableau, lus aux points donnés en repère logique 800 × 460
const pixels = (page, pts) => page.evaluate(([pts, LW, LH]) => {
  const c = document.getElementById('scene');                  // copie hors écran : la page garde son contexte intact
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
  const ctx = o.getContext('2d', { willReadFrequently: true }); ctx.drawImage(c, 0, 0);
  const kx = c.width / LW, ky = c.height / LH, d = ctx.getImageData(0, 0, c.width, c.height).data;
  return pts.map(([x, y]) => {
    const X = Math.max(0, Math.min(c.width - 1, Math.round(x * kx))), Y = Math.max(0, Math.min(c.height - 1, Math.round(y * ky)));
    const i = (Y * c.width + X) * 4; return [d[i], d[i + 1], d[i + 2]];
  });
}, [pts, LOGW, LOGH]);
// grille de points strictement dans la cour, hors des boîtes de bâtiments et hors de l'épaisseur des murs
function courtSamples(sc) {
  const w = sc.wall, out = [], y0 = w.back.y + 10, y1 = w.front.crest - 6;
  for (let i = 1; i <= 14; i++) for (let j = 1; j <= 9; j++) {
    const y = y0 + (y1 - y0) * (j / 10), s = spanAt(w, y), x = s.x0 + 14 + (s.x1 - s.x0 - 28) * (i / 15);
    if (sc.buildings.some(b => x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2)) continue;
    out.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }
  return out;
}

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
/* ---- G. LE CHÂTEAU QU'ON HABITE : enceinte fermée, sol de cour, douve qui entoure, héros dedans, étiquettes ----
   Tout se lit dans __scene (repère logique 800 × 460, étiquettes et figurines en pixels du canevas) et, pour le
   sol et la douve, dans les PIXELS du canevas : le banc ne fait confiance ni aux intentions ni au code. */
for (const age of [3, 4]) {
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', { deviceScaleFactor: 2 });
  await loadDay(page, found.ages[age].days);
  let sc = await setHour(page, 13);                 // plein jour : les teintes et les pixels se lisent sans ambiguïté
  const w = sc.wall, kx = sc.canvas.w / LOGW, ky = sc.canvas.h / LOGH;

  // 1. le mur de face existe, il est plus bas que le mur du fond, et la porte y est percée
  check(`âge ${age} : MUR DE FACE présent, plus bas que le mur de fond (crête ${w.front.crest} sous ${w.back.crest})`,
    !!w.front && w.front.h > 6 && w.front.crest > w.back.crest + 20 && w.front.y > w.back.y + 40,
    JSON.stringify({ front: w.front.h, back: w.back.h, crestF: w.front.crest, crestB: w.back.crest }));
  check(`âge ${age} : la PORTE est percée dans le mur de face (deux pans, ouverture ${r1(w.gate.x1 - w.gate.x0)} px entre eux)`,
    w.gate.x1 - w.gate.x0 > 14 && w.front.segs.length === 2 &&
    w.front.segs[0][0] <= w.front.x0 + 1 && w.front.segs[0][1] <= w.gate.x0 + 1 &&
    w.front.segs[1][0] >= w.gate.x1 - 1 && w.front.segs[1][1] >= w.front.x1 - 1,
    JSON.stringify(w.front.segs) + ' porte ' + JSON.stringify([w.gate.x0, w.gate.x1]));
  check(`âge ${age} : le mur de face est PLUS LARGE que le mur de fond (murs latéraux en fuite)`,
    w.front.x1 - w.front.x0 > (w.back.x1 - w.back.x0) + 20,
    r1(w.front.x1 - w.front.x0) + ' vs ' + r1(w.back.x1 - w.back.x0));

  // 2. chaque bâtiment de cour est ENTOURÉ par les quatre murs (pas seulement au-dessus d'une ligne)
  const notIn = sc.buildings.filter(b => !encircled(b, w));
  check(`âge ${age} : les ${sc.buildings.length} bâtiments de cour sont ENTOURÉS (entre face et fond, entre les murs latéraux)`,
    sc.buildings.length >= 5 && notIn.length === 0, notIn.map(b => b.id + JSON.stringify([b.x, b.y + b.h])).join(' '));
  const masked = sc.buildings.filter(b => b.y + b.h > w.front.crest + 2);
  check(`âge ${age} : au moins un bâtiment de cour passe DERRIÈRE le mur de face (bas masqué)`, masked.length >= 1,
    masked.map(b => b.id).join(', '));
  // AJOUT V5 T5 (2026-09-19) : AUCUN CHEVAUCHEMENT entre deux bâtiments de cour. Limite écrite en T3b et levée ici :
  // `BCOURT` laissait 4 paires qui se mordaient à l'âge 3 et 5 à l'âge 4 (pire cas entrepôt × forge, 9 % de l'aire du
  // plus petit). Les ancrages de la chapelle, de la forge, de l'entrepôt, de l'infirmerie et du marché ont été
  // repris ; le donjon, le terrain d'entraînement et la taverne n'ont pas bougé.
  {
    const bs = sc.buildings, hits = [];
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) hits.push(a.id + '×' + b.id + ' ' + Math.round(100 * ox * oy / Math.min(a.w * a.h, b.w * b.h)) + '%');
    }
    check(`âge ${age} : aucune paire de bâtiments de cour ne se chevauche (${bs.length} bâtiments)`, hits.length === 0, hits.join(' · '));
  }

  // 3. le sol de cour : couverture ≥ 60 % de l'intérieur, et ce n'est pas la couleur de la prairie
  const ratio = area(sc.courtyard.poly) / area(w.poly);
  check(`âge ${age} : le SOL DE COUR couvre ${Math.round(ratio * 100)} % de l'intérieur de l'enceinte (≥ 60 %)`, ratio >= 0.6, r1(ratio));
  const grass = rgbOf(sc.palette.grass), cb = rgbOf(sc.courtyard.back), cf = rgbOf(sc.courtyard.front);
  check(`âge ${age} : la teinte du sol de cour n'est pas celle de la prairie (Δ ${Math.round(dist(cb, grass))} et ${Math.round(dist(cf, grass))})`,
    dist(cb, grass) > 40 && dist(cf, grass) > 40, JSON.stringify([sc.courtyard.back, sc.courtyard.front, sc.palette.grass]));
  const pts = courtSamples(sc), cols = await pixels(page, pts);
  const green = cols.filter(c => dist(c, grass) < 18).length;
  const earth = cols.filter(c => Math.min(dist(c, cb), dist(c, cf)) < 42).length;
  check(`âge ${age} : aucun pixel de PRAIRIE dans la cour (${green}/${cols.length}), et le sol battu domine (${earth}/${cols.length})`,
    cols.length >= 30 && green === 0 && earth >= Math.round(cols.length * 0.45), `vert ${green} · terre ${earth} · points ${cols.length}`);

  // 4. la douve entoure et n'est jamais tranchée par le bas de l'image
  if (age === 4) {
    check('château : la DOUVE n\'est pas coupée par le bord inférieur (bas ' + sc.moat.bottom + ' < ' + LOGH + ')',
      sc.moat.bottom <= LOGH - 6, JSON.stringify(sc.moat));
    check('château : la douve SORT DU CADRE par les deux bords latéraux', sc.moat.left < 0 && sc.moat.right > LOGW, JSON.stringify([sc.moat.left, sc.moat.right]));
    check('château : la douve REVIENT sur les deux côtés (langues d\'eau le long des murs latéraux)',
      sc.moat.sides.length === 2 && sc.moat.sides.every(sd => sd.top < w.front.y - 24 && sd.bottom > w.front.y - 4),
      JSON.stringify(sc.moat.sides));
    const water = rgbOf(sc.palette.water);
    const bottom = await pixels(page, Array.from({ length: 40 }, (_, i) => [10 + i * 20, LOGH - 2]));
    check('château : aucune eau sur la dernière ligne de pixels du canevas', bottom.every(c => dist(c, water) > 46),
      JSON.stringify(bottom.filter(c => dist(c, water) <= 46).slice(0, 3)));
  }

  // captures cadrées sur la cour : plein jour puis lumière rasante
  const el = await page.$('#scene'), bb = await el.boundingBox();
  const xs = w.poly.map(p => p[0]), ys = w.poly.map(p => p[1]);
  const top = Math.max(0, w.back.crest - 54), bot = Math.min(LOGH, Math.max(...ys) + (age === 4 ? 46 : 22));
  const clip = { x: bb.x + Math.max(0, Math.min(...xs) - 30) * (bb.width / LOGW), y: bb.y + top * (bb.height / LOGH),
    width: Math.min(LOGW, Math.max(...xs) - Math.min(...xs) + 60) * (bb.width / LOGW), height: (bot - top) * (bb.height / LOGH) };
  if (age === 4) {
    await page.screenshot({ path: path.join(OUT, 'dom_cour_jour.png'), clip });
    const gold = await setHour(page, 18.5);
    check('château à 18 h 30 : gamme du soir, lumière rasante sur les tours (pas encore la nuit)',
      gold.hour === 18.5 && gold.night === false, JSON.stringify([gold.hour, gold.night]));
    await page.screenshot({ path: path.join(OUT, 'dom_cour_soir.png'), clip });
  }

  // 5. les figurines : au village = DANS la cour ; parti en expédition ou en raid = dehors ou sur le pont
  await page.click('#btn-skip');                    // toutes les activités révélées : héros au village ET héros partis
  await page.clock.runFor(300);
  sc = await scene(page);
  const figs = sc.figures.map(f => ({ ...f, lx: f.x / kx, ly: f.y / ky }));
  const home = figs.filter(f => !f.out), away = figs.filter(f => f.out);
  const homeOut = home.filter(f => !inEnc(w, f.lx, f.ly, 2));
  check(`âge ${age} : les ${home.length} héros en activité au village sont DANS la cour`, home.length >= 1 && homeOut.length === 0,
    homeOut.map(f => f.id + ':' + f.act + JSON.stringify([r1(f.lx), r1(f.ly)])).join(' '));
  const onBridge = f => f.lx > w.gate.x0 - 10 && f.lx < w.gate.x1 + 10 && f.ly > w.front.y - 6 && f.ly < w.front.y + 46;
  const awayBad = away.filter(f => inEnc(w, f.lx, f.ly, -2) && !onBridge(f));
  // ADAPTÉ V5 T3 (2026-09-18, devenu faux par conception) : la saison a changé de trajectoire (spécialisations au J20,
  // Derby des Lames aux J26-28), et le jour où le village atteint un âge n'a plus forcément un héros parti. La propriété
  // vérifiée reste la même — un héros parti n'est jamais DANS la cour — mais si personne n'est parti ce jour-là, elle est
  // rejouée sur le jour de raid de la graine, où les héros sont certainement dehors.
  let awayList = away, awayOut = awayBad, awayDay = found.ages[age].day;
  if (!awayList.length && found.ev.raid) {
    await loadDay(page, found.ev.raid.days);
    await page.click('#btn-skip');
    await page.clock.runFor(300);
    const sc2 = await scene(page);
    const figs2 = sc2.figures.map(f => ({ ...f, lx: f.x / kx, ly: f.y / ky }));
    awayList = figs2.filter(f => f.out);
    awayOut = awayList.filter(f => inEnc(w, f.lx, f.ly, -2) && !onBridge(f));
    awayDay = found.ev.raid.day;
  }
  check(`âge ${age} : les ${awayList.length} héros partis (${awayList.map(f => f.act).join(',') || '-'}, jour ${awayDay}) sont hors les murs ou sur le pont`,
    awayList.length >= 1 && awayOut.length === 0, awayOut.map(f => f.id + ':' + f.act + JSON.stringify([r1(f.lx), r1(f.ly)])).join(' '));

  // 6. les étiquettes : aucune sur une autre, aucune hors du cadre
  const L = sc.labels, overlaps = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (boxesHit(L[i], L[j])) overlaps.push(L[i].id + ' × ' + L[j].id);
  const outOfFrame = L.filter(l => l.x < 0 || l.y < 0 || l.x + l.w > sc.canvas.w || l.y + l.h > sc.canvas.h);
  check(`âge ${age} : les ${L.length} étiquettes ne se recouvrent pas (noms, plaques, bulles)`, L.length >= 4 && overlaps.length === 0, overlaps.join(' | '));
  check(`âge ${age} : aucune étiquette ne sort du cadre ${sc.canvas.w} × ${sc.canvas.h}`, outOfFrame.length === 0,
    outOfFrame.map(l => l.id + JSON.stringify([l.x, l.y, l.w, l.h])).join(' '));
  // et le placeur préfère le sol : aucune étiquette ne se pose sur un toit (boîtes des bâtiments, en pixels)
  const bbx = sc.buildings.map(b => ({ x: b.x * kx, y: b.y * ky, w: b.w * kx, h: b.h * ky }));
  const cover = L.map(l => {
    let a = 0; bbx.forEach(b => { const ox = Math.min(l.x + l.w, b.x + b.w) - Math.max(l.x, b.x), oy = Math.min(l.y + l.h, b.y + b.h) - Math.max(l.y, b.y); if (ox > 0 && oy > 0) a += ox * oy; });
    return { id: l.id, r: a / (l.w * l.h) };
  });
  const worst = cover.reduce((m, c) => c.r > m.r ? c : m, { id: '-', r: 0 });
  check(`âge ${age} : aucune étiquette ne recouvre un bâtiment (pire recouvrement ${Math.round(worst.r * 100)} %)`,
    worst.r <= 0.02, worst.id + ' ' + r1(worst.r));
  // AJOUT V5 T3b (2026-09-19) : une parcelle à bâtir n'est pas un bâtiment (elle ne compte ni dans la silhouette ni
  // dans les contrôles de cour), mais on ne lit pas « Chapelle à bâtir » posé sur l'assise de la chapelle absente.
  // __scene.lots publie l'assise réellement dessinée (tente au campement, assise de pierre ensuite).
  const lbx = (sc.lots || []).map(b => ({ id: b.id, x: b.x * kx, y: b.y * ky, w: b.w * kx, h: b.h * ky }));
  const lcover = L.map(l => {
    let a = 0; lbx.forEach(b => { const ox = Math.min(l.x + l.w, b.x + b.w) - Math.max(l.x, b.x), oy = Math.min(l.y + l.h, b.y + b.h) - Math.max(l.y, b.y); if (ox > 0 && oy > 0) a += ox * oy; });
    return { id: l.id, r: a / (l.w * l.h) };
  });
  const lworst = lcover.reduce((m, c) => c.r > m.r ? c : m, { id: '-', r: 0 });
  check(`âge ${age} : aucune étiquette ne recouvre une parcelle à bâtir (${lbx.length} parcelles, pire recouvrement ${Math.round(lworst.r * 100)} %)`,
    lworst.r <= 0.02, lworst.id + ' ' + r1(lworst.r));
  // AJOUT V5 T5 (2026-09-19) : AUCUNE ÉTIQUETTE ENTIÈREMENT DANS LE CIEL. Limite écrite en T3b : la parcelle de la
  // chapelle était collée au mur du fond, il n'y avait que le ciel au-dessus d'elle, et la plaque « Chapelle à bâtir »
  // s'y posait (mesuré : âge 2 à 458,9/208,1 et âge 3 à 500/172,5 dans le repère logique, au-dessus de la crête du
  // mur de fond). La parcelle a été descendue ; la règle vérifie la conséquence, pas l'ancrage.
  const skyLab = L.filter(l => (l.y + l.h) / ky < w.back.crest);
  check(`âge ${age} : aucune étiquette n'est posée entièrement dans le ciel (au-dessus de la crête du mur de fond, ${r1(w.back.crest)})`,
    skyLab.length === 0, skyLab.map(l => l.text + '@' + r1(l.x / kx) + ',' + r1(l.y / ky)).join(' '));

  // AJOUT V5 T3b (2026-09-19) : OCCLUSION du mur de face. Les figurines sont dessinées APRÈS le monde ; une figurine
  // dont les pieds tombent dans la bande de pierre (de la crête au pied du mur), hors de l'ouverture de la porte, se
  // tient DERRIÈRE le mur et doit être repassée par lui. La page publie le couple mesuré dans __scene.front_occlusion.
  // Mesure du 2026-09-19 : avec les ancrages actuels (FCOURT/FNEAR tous au-dessus de la crête, sortie par la porte)
  // AUCUNE figurine ne tombe dans la bande — behind vaut 0 et le repassage reste désarmé, donc strictement neutre
  // (0 pixel changé, mesuré). Le contrôle garde l'implication : si un ancrage descend un jour dans la bande, le
  // repassage DOIT s'armer. Preuve positive faite hors banc sur une copie aux ancrages forcés (behind 3, 1 297 pixels).
  const fo = sc.front_occlusion || { behind: 0, repaint: false };
  check(`âge ${age} : occlusion — toute figurine dans la bande du mur de face est repassée par la pierre (${fo.behind} derrière le mur, repassage ${fo.repaint ? 'armé' : 'désarmé'})`,
    fo.behind === 0 || fo.repaint === true, JSON.stringify(fo));
  check(`âge ${age} : enceinte habitée — aucune erreur console/page`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);

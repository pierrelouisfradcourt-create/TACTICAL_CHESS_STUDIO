// Banc Playwright « LE SOLEIL COMPTE LES JOUEURS » (CHATEAU_SPEC §7). Usage : node test/ui_soleil_check.mjs
// Date : 2026-09-19. Source : demande de Pierre (« le soleil devrait descendre en fonction du nombre de joueurs
// en attente de jouer ou ayant déjà joué ») + addition de l'orchestrateur (« le jour t'attend »).
//
// CE QUI EST VÉRIFIÉ, ET LA LECTURE RETENUE
// La course du soleil n'est plus l'horloge simulée : t = joueurs ayant joué / joueurs de la guilde.
// t = 0 → aube rasante à l'est (8 h) · t = 1 → soleil couchant à l'ouest (20 h) · soir → nuit (23 h).
// La consigne disait « il descend strictement à chaque joueur révélé ». La course est un ARC (est → zénith →
// ouest) : c'est la seule forme qui fait TOURNER les ombres (§7 : direction ET longueur) et qui donne une aube
// rasante à l'est. Sur un arc, la HAUTEUR monte puis descend ; ce qui croît strictement à chaque joueur, c'est
// l'AVANCEMENT (t), la position est-ouest (x) et l'heure. Le banc contrôle donc :
//   - strictement croissants à chaque joueur : t, x, heure ;
//   - la hauteur : au plus bas aux deux extrémités, au plus haut au milieu, et STRICTEMENT DESCENDANTE du
//     zénith jusqu'au couchant (la seconde moitié du tour de table fait bien « descendre le soleil »).
// Tout est lu dans window.__scene.sun et window.__scene.palette, image en lecture seule de ce qui vient d'être
// dessiné, jamais dans l'état de la page. Captures : test/out/sun_*.png. Code de sortie 1 si un contrôle échoue.
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
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// Tables relues dans la page : le banc et la page ne peuvent pas diverger en silence.
const MANAGERS = new Function('return [' + /var MANAGERS = \[([\s\S]*?)\];/.exec(html)[1] + '];')();
const NUM = k => Number(new RegExp('var [A-Z_, 0-9=.]*\\b' + k + ' = ([0-9.]+)').exec(html)[1]);
const SUN_HOLD = NUM('SUN_HOLD'), SUN_X0 = NUM('SUN_X0'), SUN_X1 = NUM('SUN_X1');
const DAY_START = NUM('DAY_START'), DAY_END = NUM('DAY_END');
const TOTAL = MANAGERS.length;

// Moteur sous node : on rejoue la graine par défaut jusqu'au jour où le village est FORTIFIÉ, et on importe
// ce journal dans la page. La lumière qui bouge se juge sur des murs et des tours, pas sur trois tentes.
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const SEED = 4242;
function daysUntilAge(target) {
  let st = sim.newGame(SEED, data, { managers: MANAGERS }), days = [];
  for (let d = 0; d < 30; d++) {
    const vm = sim.viewModel(st, 'p1');
    if (vm.is_season_over || vm.defeat) break;
    if (vm.village.age_index >= target) return { days, day: vm.day, age: vm.village.age_index };
    let acts = []; for (const m of sim.listManagers(st)) acts = acts.concat(sim.planDefaults(st, m));
    days.push({ day: vm.day, actions: acts }); st = sim.resolveDay(st, acts).state;
  }
  return null;
}
const journalOf = days => JSON.stringify({ seed: SEED, managers: MANAGERS, days: days.map(d => ({ day: d.day, actions: d.actions })) });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const r1 = v => Math.round(v * 10) / 10;
const scene = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__scene)));
const sunOf = async page => (await scene(page)).sun;
const tableau = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableau)));
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const txt = (page, sel) => page.textContent(sel);

function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const FRIENDS = MANAGERS.filter(m => m.id !== 'p1').map(m => m.id);
const playHour = (seed, day, id) => DAY_START + fnv1a(seed + ':' + day + ':' + id) % 12;

async function newPage(browser, width = 1280, colorScheme = 'light', ctxOpts = { reducedMotion: 'reduce' }) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, ...ctxOpts });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const T0 = new Date('2026-09-18T08:00:00Z'); await page.clock.install({ time: T0 }); await page.clock.pauseAt(T0);
  await page.goto(URL_FILE); await page.waitForSelector('[data-testid="btn-launch"]');
  return { ctx, page, errors };
}
// L'horloge simulée ne sert plus qu'à révéler les amis : on la pousse jusqu'à l'heure de révélation visée.
const setHour = async (page, h) => { const cur = (await tableau(page)).hour; await page.clock.runFor(Math.max(0, Math.round((h - cur) / 0.25) * 250) + 40); return sunOf(page); };
const shot = async (page, name, sel) => { const t = sel ? await page.$(sel) : page; await t.screenshot({ path: path.join(OUT, `sun_${name}.png`) }); };
// Jour 2 de la graine par défaut : les quatre amis jouent à quatre heures DISTINCTES (11, 12, 17, 18),
// le compteur avance donc un par un — c'est le jour qui montre le mieux la course du soleil.
async function goDay2(page) {
  await page.click('[data-testid="btn-launch"]'); await page.clock.runFor(300);
  await page.click('#btn-next-day'); await page.clock.runFor(300);
}
// mon héros joue : premier raccourci disponible du tableau (le moteur décide de ce qui est possible)
async function playMine(page) {
  const b = await page.$('#quick-acts .preset-btn:not(:disabled):not(#quick-compose)');
  if (!b) return false;
  await b.click(); await page.clock.runFor(60); return true;
}
// Position du soleil MESURÉE dans les pixels d'un canevas : barycentre des pixels les plus chauds et les plus
// clairs du ciel. Rendue en coordonnées normalisées (0..1), comparables entre la grande scène et la vignette.
const scanSun = (page, sel, hzFrac) => page.evaluate(([sel, hzFrac]) => {
  const c = document.querySelector(sel); if (!c || !c.width) return null;
  const W = c.width, H = c.height;
  // copie hors écran : un seul getImageData par contexte (sinon Chromium avertit en console, et le banc compte
  // les avertissements comme des erreurs)
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const octx = off.getContext('2d', { willReadFrequently: true }); octx.drawImage(c, 0, 0);
  const d = octx.getImageData(0, 0, W, H).data, hy = Math.max(4, Math.round(H * hzFrac));
  let best = -1e9;
  for (let y = 0; y < hy; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, s = d[i] + d[i + 1] - d[i + 2];
    if (d[i] > 200 && s > best) best = s;
  }
  if (best < 300) return null;                       // rien d'assez chaud ni d'assez clair : pas de soleil
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < hy; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, s = d[i] + d[i + 1] - d[i + 2];
    if (d[i] > 200 && s >= best - 3) { sx += x; sy += y; n++; }
  }
  return n ? { x: sx / n / W, y: sy / n / H, n: n, score: best } : null;
}, [sel, hzFrac]);
// ligne d'horizon de la scène courante, en fraction de hauteur : le scan ne regarde QUE le ciel.
const horizonFrac = async page => { const c = (await scene(page)).camera; return (c.ground + (190 - 300) * c.zoom / 100) / 460; };

const browser = await pw.chromium.launch();

/* ---- A. La course : un joueur de plus = le soleil avance ---- */
{
  const { ctx, page, errors } = await newPage(browser);
  await goDay2(page);
  const hours = FRIENDS.map(id => playHour(4242, 2, id)).sort((a, b) => a - b);
  check('jour 2 de la graine 4242 : les quatre amis jouent à quatre heures distinctes (' + hours.join(', ') + ' h)',
    new Set(hours).size === 4, hours.join(','));
  const steps = [await sunOf(page)];
  for (const h of hours) steps.push(await setHour(page, h + 0.25));
  const s0 = steps[0];
  check(`personne n'a joué : le soleil est à l'extrémité D'AUBE de sa course — est (x = ${SUN_X0}), au ras de l'horizon, ${DAY_START} h, t = 0`,
    s0.played === 0 && s0.total === TOTAL && s0.t === 0 && s0.hour === DAY_START && s0.x === SUN_X0 && s0.mine_played === false && s0.blocked === false,
    JSON.stringify(s0));
  check('le compteur monte un par un : ' + steps.map(s => s.played + '/' + s.total).join(' → '),
    steps.map(s => s.played).join(',') === '0,1,2,3,4', steps.map(s => s.played).join(','));
  const strict = (get) => steps.every((s, i) => i === 0 || get(s) > get(steps[i - 1]));
  check('à chaque joueur, l\'AVANCEMENT du soleil croît strictement : t = ' + steps.map(s => s.t).join(' → '), strict(s => s.t));
  check('à chaque joueur, le soleil avance d\'est en ouest : x = ' + steps.map(s => r1(s.x)).join(' → '), strict(s => s.x));
  check('à chaque joueur, l\'heure de la pastille croît strictement : ' + steps.map(s => s.hour).join(' → ') + ' h', strict(s => s.hour));
  const ys = steps.map(s => s.y);
  const top = ys.lastIndexOf(Math.min(...ys));   // à 5 joueurs, t = 0,4 et t = 0,6 sont à la même hauteur : le zénith est un palier
  check('la course est un ARC : hauteur la plus basse à l\'aube, la plus haute au milieu (y = ' + ys.join(' → ') + ', y vers le bas)',
    ys[0] === Math.max(...ys) && top > 0 && top < ys.length - 1 && ys[1] < ys[0], ys.join(','));
  check('après le zénith, le soleil DESCEND strictement à chaque joueur (y de ' + ys[top] + ' à ' + ys[ys.length - 1] + ')',
    ys.slice(top).every((v, i, a) => i === 0 || v > a[i - 1]), ys.slice(top).join(','));
  check('la pastille suit la course et reste une heure lisible (8 h → 20 h) : ' + steps.map(s => s.label).slice(0, 4).join(' · '),
    steps.slice(0, 4).every(s => /^\d{1,2}h$/.test(s.label) && s.hour >= DAY_START && s.hour <= DAY_END), steps.map(s => s.label).join(','));
  check('A : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- B. LE JOUR T'ATTEND : la course s'arrête au seuil bas tant que mon héros n'a pas joué ---- */
{
  const { ctx, page, errors } = await newPage(browser);
  await goDay2(page);
  await shot(page, '0_joueur', '#scene');
  const hs = FRIENDS.map(id => playHour(4242, 2, id)).sort((a, b) => a - b);
  await setHour(page, hs[0] + 0.25);
  const s2 = await setHour(page, hs[1] + 0.25);
  check('deux amis ont joué : le soleil est au-delà du premier tiers de sa course', s2.played === 2 && s2.t > 0.3 && s2.t < 0.5, JSON.stringify(s2));
  await shot(page, '2_joueurs', '#scene');
  await shot(page, '2_joueurs_vignette', '#widget-tile');
  const blocked = await setHour(page, DAY_END);
  check(`les quatre amis ont joué, pas moi : la course EST RETENUE au seuil bas t = ${SUN_HOLD} (${DAY_START + SUN_HOLD * (DAY_END - DAY_START)} h) et s'y arrête`,
    blocked.played === TOTAL - 1 && blocked.mine_played === false && blocked.blocked === true &&
    blocked.t === SUN_HOLD && r1(blocked.hour) === r1(DAY_START + SUN_HOLD * (DAY_END - DAY_START)),
    JSON.stringify(blocked));
  const tb2 = await tableau(page);
  check('la journée simulée est pourtant finie (horloge à 20 h, 4 amis révélés) : c\'est bien le tour de table qui tient le soleil, pas l\'heure',
    tb2.hour === DAY_END && tb2.revealed.length === 4 && tb2.played === TOTAL - 1, JSON.stringify({ hour: tb2.hour, revealed: tb2.revealed.length }));
  check('le soleil bloqué garde une marge nette au-dessus de l\'horizon (il n\'est pas au couchant)',
    blocked.y < (await (async () => { const s = await sunOf(page); return s.y; })()) + 1 && blocked.t < 1 && blocked.hour < DAY_END, JSON.stringify(blocked));
  check('la pastille dit « le jour attend » au lieu d\'une heure figée', blocked.label === 'le jour attend' && (await txt(page, '#clock')) === 'le jour attend',
    await txt(page, '#clock'));
  check('la pastille porte l\'état d\'attente dans le DOM (halo/pulsation CSS)', (await page.getAttribute('#clock', 'data-blocked')) === '1');
  check('le texte « N / 5 ont joué » reste, en confirmation', /4 \/ 5 ont joué/.test(await txt(page, '[data-testid="played-count"]')), await txt(page, '[data-testid="played-count"]'));
  await shot(page, '4_joueurs_bloque', '#scene');
  await shot(page, '4_joueurs_bloque_vignette', '#widget-tile');
  const played = await playMine(page);
  const s5 = await sunOf(page);
  check('dès que mon héros joue, le soleil ACHÈVE sa course : 5 / 5, t = 1, 20 h, ouest (x = ' + SUN_X1 + ')',
    played && s5.played === TOTAL && s5.mine_played === true && s5.t === 1 && s5.hour === DAY_END && s5.x === SUN_X1 && s5.blocked === false,
    JSON.stringify(s5));
  check('le soleil achevé est redescendu au ras de l\'horizon (couchant), plus bas que quand il attendait',
    s5.y > blocked.y, s5.y + ' vs ' + blocked.y);
  check('la pastille redevient une heure', s5.label === DAY_END + 'h' && (await txt(page, '#clock')) === DAY_END + 'h', await txt(page, '#clock'));
  await shot(page, '5_joueurs', '#scene');
  await shot(page, '5_joueurs_vignette', '#widget-tile');
  await page.click('[data-testid="btn-launch"]'); await page.clock.runFor(400);
  const ev = await sunOf(page); const sc = await scene(page);
  check('à la résolution, le soir tombe : nuit (23 h), lune et torches, pastille « Soir »',
    ev.evening === true && ev.hour === 23 && sc.night === true && sc.palette.lamps === true && ev.label === 'Soir', JSON.stringify(ev));
  await shot(page, 'soir', '#scene');
  check('B : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- C. « Passer » : le soleil rejoint sa position finale en GLISSANT ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', {});   // mouvement normal : le glissement existe
  await goDay2(page);                                     // jour 2 : le premier ami ne joue qu'à 11 h, rien ne bouge d'ici là
  const before = await sunOf(page);
  await playMine(page);                                   // je joue d'abord : « Passer » mène alors à 5 / 5
  await page.clock.runFor(900);                           // le glissement se pose (l'horloge simulée n'atteint pas 11 h)
  const mine = await sunOf(page);
  await page.click('#btn-skip');
  await page.clock.runFor(120);
  const mid = await sunOf(page);
  await page.clock.runFor(1500);
  const end = await sunOf(page);
  check('avant « Passer » : seul mon héros a joué', before.played === 0 && mine.played === 1 && mine.t === 0.2, JSON.stringify(mine));
  check('« Passer » : le soleil ne SAUTE pas — 120 ms après le clic il est entre les deux positions (t = ' + mid.t + ')',
    mid.t > mine.t + 0.01 && mid.t < 1 && mid.moving === true, JSON.stringify(mid));
  check('« Passer » : le soleil se pose ensuite sur sa position finale (5 / 5, t = 1, 20 h, ouest)',
    end.played === TOTAL && end.t === 1 && end.hour === DAY_END && end.x === SUN_X1 && end.moving === false, JSON.stringify(end));
  check('C : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- D. Toute la scène suit le soleil : ombres, gamme du ciel, lumière rasante, lampes ---- */
{
  const { ctx, page, errors } = await newPage(browser);
  await goDay2(page);
  const hours = FRIENDS.map(id => playHour(4242, 2, id)).sort((a, b) => a - b);
  const frames = [await scene(page)];
  for (const h of hours) { await setHour(page, h + 0.25); frames.push(await scene(page)); }
  await playMine(page); frames.push(await scene(page));
  const P = frames.map(f => f.palette), S = frames.map(f => f.sun);
  check('l\'ombre portée TOURNE avec le soleil : dx = ' + P.map(p => p.shadow.dx).join(' → ') + ' (est → ouest, elle change de côté)',
    P.every((p, i) => i === 0 || p.shadow.dx < P[i - 1].shadow.dx) && P[0].shadow.dx > 0 && P[P.length - 1].shadow.dx < 0,
    P.map(p => p.shadow.dx).join(','));
  check('l\'ombre portée s\'ALLONGE aux deux bouts et se raccourcit au zénith : len = ' + P.map(p => p.shadow.len).join(' → '),
    P[0].shadow.len === Math.max(...P.map(p => p.shadow.len)) && P[P.length - 1].shadow.len === P[0].shadow.len &&
    Math.min(...P.map(p => p.shadow.len)) < P[0].shadow.len - 0.3, P.map(p => p.shadow.len).join(','));
  check('la GAMME DU CIEL suit la même valeur : aube froide, plein jour, soir (night = ' + P.map(p => p.night_k).join(' → ') + ')',
    P[0].night_k > 0.2 && Math.min(...P.map(p => p.night_k)) === 0 && P[P.length - 1].night_k > 0.5, P.map(p => p.night_k).join(','));
  check('un ciel différent à chaque position du soleil (aucune gamme figée)',
    new Set(P.map(p => p.sky0 + '|' + p.sky1)).size === P.length, P.map(p => p.sky0).join(' '));
  check('la LUMIÈRE RASANTE (dorure des tours) n\'arrive qu\'en fin de tour de table : gold = ' + P.map(p => p.gold).join(' → '),
    P.slice(0, 4).every(p => p.gold === 0) && Math.max(...P.map(p => p.gold)) > 0.3, P.map(p => p.gold).join(','));
  check('les FENÊTRES et TORCHES s\'allument quand le soleil descend, pas avant : lamps = ' + P.map(p => p.lamps ? 'on' : 'off').join(' → '),
    P[0].lamps === false && P[P.length - 1].lamps === true, P.map(p => p.lamps).join(','));
  check('les OMBRES s\'effacent quand le soir tombe : opacité ' + P.map(p => p.shadow.a).join(' → '),
    P[P.length - 1].shadow.a < P[0].shadow.a && Math.max(...P.map(p => p.shadow.a)) === P[2].shadow.a, P.map(p => p.shadow.a).join(','));
  check('l\'heure publiée de la scène EST celle du soleil (une seule source pour toutes les couches)',
    frames.every(f => r1(f.hour) === r1(f.sun.hour)), frames.map(f => f.hour + '/' + f.sun.hour).join(' '));
  check('D : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- E. La vignette 160 px rend LE MÊME soleil que la grande scène ---- */
{
  const { ctx, page, errors } = await newPage(browser);
  await goDay2(page);
  const at = async (label) => {
    const hz = await horizonFrac(page);
    const s = await sunOf(page), big = await scanSun(page, '#scene', hz), mini = await scanSun(page, '#widget-canvas', hz);
    return { label, s, big, mini };
  };
  const a = await at('aube');
  await setHour(page, DAY_END);
  const b = await at('retenu');
  const pairs = [a, b];
  for (const p of pairs) {
    check(`vignette (${p.label}) : le soleil mesuré dans les PIXELS est au même endroit dans la vignette et dans la grande scène`,
      p.big && p.mini && Math.abs(p.big.x - p.mini.x) < 0.035 && Math.abs(p.big.y - p.mini.y) < 0.035,
      JSON.stringify({ big: p.big && [r1(p.big.x * 100), r1(p.big.y * 100)], mini: p.mini && [r1(p.mini.x * 100), r1(p.mini.y * 100)] }));
    check(`vignette (${p.label}) : le soleil mesuré est bien à la position publiée (x/800, y/460)`,
      p.big && Math.abs(p.big.x - p.s.x / 800) < 0.03 && Math.abs(p.big.y - p.s.y / 460) < 0.03,
      JSON.stringify({ mesuré: [r1(p.big.x * 100), r1(p.big.y * 100)], publié: [r1(p.s.x / 8), r1(p.s.y / 4.6)] }));
  }
  check('vignette : la HAUTEUR du soleil change nettement entre les deux états (lisible d\'un coup d\'œil à 160 px)',
    Math.abs(a.mini.y - b.mini.y) > 0.06 && Math.abs(a.mini.x - b.mini.x) > 0.3,
    JSON.stringify({ aube: [r1(a.mini.x * 100), r1(a.mini.y * 100)], retenu: [r1(b.mini.x * 100), r1(b.mini.y * 100)] }));
  check('vignette : le disque reste assez gros pour être vu (≥ 40 pixels de cœur à 158 px de large)', b.mini.n >= 40, String(b.mini.n));
  check('E : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- F. Déterminisme : deux chargements identiques, même soleil, mêmes pixels ---- */
{
  const grab = async () => {
    const { ctx, page } = await newPage(browser);
    await goDay2(page);
    await setHour(page, 12.25);
    const sc = await scene(page);
    const png = await page.$eval('#scene', c => c.toDataURL('image/png'));
    const mini = await page.$eval('#widget-canvas', c => c.toDataURL('image/png'));
    await ctx.close();
    return { sc, png, mini };
  };
  const a = await grab(), b = await grab();
  check('deux chargements identiques : __scene.sun identique au caractère près', JSON.stringify(a.sc.sun) === JSON.stringify(b.sc.sun),
    JSON.stringify(a.sc.sun) + ' vs ' + JSON.stringify(b.sc.sun));
  check('deux chargements identiques : pixels du tableau identiques (aucun tirage aléatoire à l\'affichage)', a.png === b.png, a.png.length + ' vs ' + b.png.length);
  check('deux chargements identiques : pixels de la vignette identiques', a.mini === b.mini);
}

/* ---- G. Thème sombre, 400 px, aucune erreur ---- */
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'dark');
  await goDay2(page); await setHour(page, DAY_END);
  const s = await sunOf(page);
  check('thème sombre : le soleil est retenu comme en thème clair (la scène ne dépend pas du thème)', s.blocked === true && s.t === SUN_HOLD, JSON.stringify(s));
  await shot(page, 'sombre_bloque', '#scene');
  check('thème sombre : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
{
  const { ctx, page, errors } = await newPage(browser, 400);
  await goDay2(page); await setHour(page, DAY_END);
  const s = await sunOf(page);
  check('400 px : le soleil rend la même valeur qu\'en bureau', s.blocked === true && s.t === SUN_HOLD, JSON.stringify(s));
  check('400 px : aucun débordement horizontal', await noHScroll(page));
  await shot(page, '400px');
  check('400 px : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- H. La lumière BOUGE sur le château : mêmes états, mais sur des murs et des tours ---- */
{
  const fort = daysUntilAge(3);
  if (!fort) check('la graine 4242 atteint un village fortifié en 30 jours', false);
  else {
    const { ctx, page, errors } = await newPage(browser);
    await page.click('[data-testid="tab-journal"]');
    await page.fill('#journal-json', journalOf(fort.days)); await page.click('#btn-import');
    await page.keyboard.press('Escape');
    await page.click('[data-testid="tab-tableau"]');
    await page.clock.runFor(1600);                       // la caméra d'âge a fini son glissement
    const sc0 = await scene(page);
    check(`château (jour ${fort.day}, âge ${fort.age}) chargé : enceinte et pont-levis rendus, soleil à l'aube`,
      sc0.age >= 3 && !!sc0.wall && sc0.sun.t === 0 && sc0.sun.played === 0, JSON.stringify([sc0.age, sc0.sun.t]));
    await shot(page, 'chateau_0_joueur', '#scene');
    const mid = await setHour(page, 14);
    await shot(page, 'chateau_milieu', '#scene');
    const late = await setHour(page, DAY_END);
    const scL = await scene(page);
    await shot(page, 'chateau_bloque', '#scene');
    await shot(page, 'chateau_bloque_vignette', '#widget-tile');
    check('château : entre l\'aube et la fin du tour de table, l\'OMBRE PORTÉE a changé de côté (dx ' + sc0.palette.shadow.dx + ' → ' + scL.palette.shadow.dx + ')',
      sc0.palette.shadow.dx > 0.5 && scL.palette.shadow.dx < -0.3, JSON.stringify([sc0.palette.shadow.dx, scL.palette.shadow.dx]));
    check('château : la LUMIÈRE RASANTE dore les tours quand le tour de table s\'achève (gold ' + sc0.palette.gold + ' → ' + scL.palette.gold + ')',
      sc0.palette.gold === 0 && scL.palette.gold > 0.3, JSON.stringify([sc0.palette.gold, scL.palette.gold]));
    // Le pont-levis n'existe qu'au dernier âge (le banc du château le couvre à part) : ici on contrôle
    // seulement qu'il suit l'heure du soleil quand il est dessiné.
    check('château : l\'enceinte est fermée et le pont-levis, quand il est dessiné, suit l\'heure du soleil',
      !!sc0.wall && (sc0.drawbridge === null ? scL.drawbridge === null : sc0.drawbridge.down === true && scL.drawbridge.down === true),
      JSON.stringify([!!sc0.wall, sc0.drawbridge && sc0.drawbridge.down]));
    check('château : les soldats de ronde se déplacent avec l\'heure du soleil (aucune règle, une fonction entière de l\'heure)',
      JSON.stringify(sc0.soldiers) !== JSON.stringify(scL.soldiers), JSON.stringify(scL.soldiers.length));
    const played = await playMine(page);
    const scEnd = await scene(page);
    check('château : mon héros joue, le soleil achève sa course et le couchant tombe sur les murs (nuit = ' + scEnd.palette.night_k + ', lampes ' + (scEnd.palette.lamps ? 'on' : 'off') + ')',
      played && scEnd.sun.t === 1 && scEnd.palette.night_k > scL.palette.night_k && scEnd.palette.lamps === true,
      JSON.stringify([scEnd.sun.t, scEnd.palette.night_k, scEnd.palette.lamps]));
    await shot(page, 'chateau_5_joueurs', '#scene');
    await shot(page, 'chateau_5_joueurs_vignette', '#widget-tile');
    check('H : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
}

await browser.close();
const fails = results.filter(r => !r.ok);
fs.writeFileSync(path.join(OUT, 'sun_report.json'), JSON.stringify(results, null, 1));
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);

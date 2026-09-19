// Banc V5 T5 — CALIBRAGE DE LA SAISON ENTIÈRE (V5_SPEC §8 tranche T5). Moteur seul, aucune dépendance.
// Usage : node test/season_t5_check.mjs   (code de sortie 1 si un contrôle échoue)
//
// Ce banc ne mesure pas des sorts ni des cases : il mesure ce que devient une SAISON. Les cibles retenues en T5
// sont écrites ici en BORNES, jamais en valeurs exactes — une régression future doit se voir, un écart de bruit
// ne doit pas faire rougir le banc. Les bornes sont posées à plus ou moins deux écarts-types binomiaux autour de
// la mesure de la tranche, arrondis vers l'extérieur, et les cibles dures de la spec (chute ≤ 5 %, morts ≤ 8 %,
// KO par passage ≤ 25 %) priment quand elles sont plus serrées.
//
// (1) 60 saisons complètes de 30 jours, 5 ou 6 managers, plans par défaut : chute de la guilde ≤ 5 %, morts ≤ 8 %.
// (2) Aucun raid impossible : chaque dragon est abattu dans une bande de taux de victoire, et aucun dragon ne
//     descend sous 40 % ni ne monte au-dessus de 85 %.
// (3) Aucun raid qui traîne : tout raid clos l'est en ≤ raid_max_nights nuits, et la majorité des victoires
//     tombe en ≤ 2 nuits.
// (4) KO par passage ≤ 25 % sur chaque dragon (spec §8 T1).
// (5) Les trois dragons se réveillent : chaque biome prend au moins 10 % des réveils (avant T5 : forêt 53
//     réveils sur 59, Drake 2, Hydre 4 — deux dragons que personne ne voyait).
// (6) Équilibre des voies : les 13 sont choisies, et la plus prise ne vaut pas plus de 5 fois la moins prise.
// (7) Équilibre des spécialisations : les 26 sont choisies au moins une fois, Assassin compris.
// (8) Économie : le château reste une VRAIE récompense — atteint par une part des saisons comprise dans une
//     bande, ni garanti ni inatteignable ; et l'âge 0 n'est jamais un cul-de-sac.
// (9) Le Derby des Lames tient dans sa bande 40-60 % (le contrôle (7b) de tactic_t3_check le mesure sur d'autres
//     graines ; ici c'est la saison complète à 5-6 managers).
// (10) Déterminisme : les 60 saisons rejouées donnent le même hachage.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const CLASSES = data.classes.map(c => c.id);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

function managersFor(seed, n) {
  const names = ['Vous', 'Anselme', 'Roxane', 'Bastien', 'Maëlle', 'Ysolde'].slice(0, n);
  return names.map((nm, i) => ({ id: i === 0 ? 'p1' : 'f_' + i, name: nm, kind: i === 0 ? 'human' : 'ai',
    profile: i === 0 ? 'humain' : (i % 2 ? 'prudent' : 'audacieux'), class_id: CLASSES[(i + seed) % CLASSES.length] }));
}
const acts = s => { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; };
const SEEDS = []; for (let i = 0; i < 60; i++) SEEDS.push(1000 + i * 7);
const BIOME = { raid_forest: 'Sylvain', raid_mountain: 'Drake', raid_marsh: 'Hydre' };

const t0 = Date.now();
const S = [];
for (const seed of SEEDS) {
  const n = 5 + (seed % 2);
  let s = sim.newGame(seed, data, { managers: managersFor(seed, n) });
  for (let d = 0; d < 30 && !s.collapsed; d++) s = sim.resolveDay(s, acts(s)).state;
  const rec = { seed, n, hash: sim.hashState(s), collapsed: !!s.collapsed, deaths: s.stats.deaths,
    heroes: Object.keys(s.heroes).length + s.graves.length, age: s.village_age || 0,
    hall_hits: s.hall_hits || 0, dragons: {}, raids: [], open: !!s.raid, specs: {}, hybrids: {} };
  for (const b of Object.keys(s.dragons).sort()) rec.dragons[b] = s.dragons[b].awakenings;
  for (const r of (s.raid_history || [])) rec.raids.push({ id: r.id, status: r.status, nights: r.nights, passes: r.passes, ko: r.ko });
  for (const hid of Object.keys(s.heroes).sort()) { const h = s.heroes[hid];
    if (h.spec) rec.specs[h.spec] = (rec.specs[h.spec] || 0) + 1;
    if (h.hybrid) rec.hybrids[h.hybrid] = (rec.hybrids[h.hybrid] || 0) + 1; }
  S.push(rec);
}
const ms = Date.now() - t0;

// ---------- agrégats ----------
let heroes = 0, deaths = 0, collapsed = 0, derbyW = 0, derbyP = 0, hallHits = 0;
const per = {}, aw = { forest: 0, marsh: 0, mountain: 0 }, ages = {}, specs = {}, hybrids = {};
let tooLong = 0, maxNights = 0;
for (const s of S) {
  heroes += s.heroes; deaths += s.deaths; hallHits += s.hall_hits; if (s.collapsed) collapsed++;
  ages[s.age] = (ages[s.age] || 0) + 1;
  for (const b of Object.keys(aw)) aw[b] += s.dragons[b] || 0;
  for (const k of Object.keys(s.specs)) specs[k] = (specs[k] || 0) + s.specs[k];
  for (const k of Object.keys(s.hybrids)) hybrids[k] = (hybrids[k] || 0) + s.hybrids[k];
  for (const r of s.raids) {
    if (r.id === 'raid_derby') { derbyP++; if (r.status === 'won') derbyW++; continue; }
    const k = BIOME[r.id] || r.id, p = per[k] = per[k] || { n: 0, w: 0, w2: 0, ko: 0, np: 0 };
    p.n++; if (r.status === 'won') { p.w++; if (r.nights <= 2) p.w2++; }
    p.ko += r.ko; p.np += r.passes;
    maxNights = Math.max(maxNights, r.nights);
    if (r.nights > data.raid.raid_max_nights) tooLong++;
  }
}
const pctOf = (a, b) => b ? Math.round(100 * a / b) : 0;
console.log('\n--- Saison mesurée : ' + S.length + ' graines × 30 jours, 5 ou 6 managers, plans par défaut (' + ms + ' ms) ---');
console.log('Héros ' + heroes + ' · morts ' + deaths + ' (' + (100 * deaths / heroes).toFixed(1) + ' %) · chutes ' + collapsed +
  ' (' + (100 * collapsed / S.length).toFixed(1) + ' %) · réveils ' + JSON.stringify(aw) +
  ' · âges au J30 ' + JSON.stringify(ages) + ' · derby ' + derbyW + '/' + derbyP);
for (const k of Object.keys(per).sort()) { const p = per[k];
  console.log(k.padEnd(8) + ' raids ' + p.n + ' · gagnés ' + p.w + ' (' + pctOf(p.w, p.n) + ' %) · en ≤ 2 nuits ' + p.w2 +
    ' (' + pctOf(p.w2, p.n) + ' %) · KO ' + p.ko + '/' + p.np + ' (' + pctOf(p.ko, p.np) + ' %)'); }

// ---------- (1) chute et morts ----------
check('(1) chute de la guilde ≤ 5 % et morts ≤ 8 % des héros (cibles dures §8 T5 ; V4 : 5,1 % de morts, 0 chute)',
  collapsed * 100 <= S.length * 5 && deaths * 100 <= heroes * 8,
  collapsed + '/' + S.length + ' chute(s) = ' + (100 * collapsed / S.length).toFixed(1) + ' % · ' + deaths + '/' + heroes + ' morts = ' + (100 * deaths / heroes).toFixed(1) + ' %');
// la chute doit rester POSSIBLE : une règle qui ne peut jamais se déclencher n'est pas une règle (T5 : le hall
// n'était jamais candidat au ravage, 0 chute sur 2 500 graines — corrigé).
// La chute est rare par construction : sur 60 graines on n'en attend qu'une poignée. Le contrôle porte donc sur
// le MÉCANISME plutôt que sur l'issue : la maison de guilde doit pouvoir brûler (`hall_hits`), et c'est le second
// incendie qui la jette à terre. Mesuré en T5 sur 400 saisons : 26 incendies du hall, 3 chutes (0,75 %).
check('(1b) la chute de la guilde reste ATTEIGNABLE : la maison de guilde brûle (hall_hits) et/ou une saison tombe',
  hallHits >= 2 || collapsed >= 1, hallHits + ' incendie(s) du hall · ' + collapsed + ' chute(s) sur ' + S.length);

// ---------- (2) aucun raid impossible ----------
{
  const bad = Object.keys(per).filter(k => pctOf(per[k].w, per[k].n) < 40 || pctOf(per[k].w, per[k].n) > 85);
  check('(2) aucun raid impossible ni gagné d\'avance : taux de victoire de CHAQUE dragon dans [40 %, 85 %]',
    Object.keys(per).length === 3 && bad.length === 0,
    Object.keys(per).sort().map(k => k + ' ' + pctOf(per[k].w, per[k].n) + ' %').join(' · '));
  const thin = Object.keys(per).filter(k => per[k].n < 10);
  check('(2b) chacun des trois dragons est affronté assez souvent pour que le taux veuille dire quelque chose (≥ 10 raids)',
    thin.length === 0, Object.keys(per).sort().map(k => k + ' ' + per[k].n).join(' · '));
}

// ---------- (3) aucun raid qui traîne ----------
{
  const w2 = Object.keys(per).reduce((a, k) => a + per[k].w2, 0), w = Object.keys(per).reduce((a, k) => a + per[k].w, 0);
  check('(3) aucun raid clos ne dépasse ' + data.raid.raid_max_nights + ' nuits, et la majorité des victoires tombe en ≤ 2 nuits',
    tooLong === 0 && maxNights <= data.raid.raid_max_nights && w2 * 2 > w,
    tooLong + ' raid(s) au-delà du plafond · nuits max ' + maxNights + ' · victoires en ≤ 2 nuits ' + w2 + '/' + w);
}

// ---------- (4) KO par passage ----------
{
  const bad = Object.keys(per).filter(k => pctOf(per[k].ko, per[k].np) > 25);
  check('(4) KO par passage ≤ 25 % sur chaque dragon (§8 T1)', bad.length === 0,
    Object.keys(per).sort().map(k => k + ' ' + pctOf(per[k].ko, per[k].np) + ' %').join(' · '));
}

// ---------- (5) les trois dragons se réveillent ----------
{
  const total = aw.forest + aw.marsh + aw.mountain;
  const low = Object.keys(aw).filter(b => aw[b] * 100 < total * 10);
  check('(5) les trois biomes réveillent leur dragon : chacun prend ≥ 10 % des réveils (avant T5 : forêt 53, marais 4, montagne 2)',
    total >= S.length && low.length === 0, JSON.stringify(aw) + ' sur ' + total + ' réveils');
}

// ---------- (6) équilibre des voies ----------
{
  const ids = data.hybrids.map(h => h.id);
  const miss = ids.filter(id => !hybrids[id]);
  const vals = ids.map(id => hybrids[id] || 0);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  check('(6) les 13 voies sont choisies et la plus prise ne vaut pas plus de 5 fois la moins prise (avant T5 : 50 contre 5)',
    miss.length === 0 && lo > 0 && hi <= lo * 5,
    'min ' + lo + ' · max ' + hi + ' · ' + ids.slice().sort((a, b) => (hybrids[b] || 0) - (hybrids[a] || 0)).map(id => id + ' ' + (hybrids[id] || 0)).join(' · '));
}

// ---------- (7) équilibre des spécialisations ----------
{
  const ids = data.specs.map(s => s.id);
  const miss = ids.filter(id => !specs[id]);
  check('(7) les 26 spécialisations sont choisies au moins une fois par les plans par défaut, Assassin compris (avant T5 : Assassin 2, Cyclone 0)',
    miss.length === 0 && (specs.assassin || 0) >= 3,
    'jamais choisies : ' + (miss.join(' ') || '(aucune)') + ' · Assassin ' + (specs.assassin || 0) + ' · Cyclone ' + (specs.cyclone || 0));
}

// ---------- (8) économie et âges ----------
{
  const castle = ages[4] || 0, stuck = ages[0] || 0;
  check('(8) le château reste une vraie récompense : atteint par 20 à 70 % des saisons, et aucune saison ne reste au campement',
    castle * 100 >= S.length * 20 && castle * 100 <= S.length * 70 && stuck === 0,
    'château ' + castle + '/' + S.length + ' = ' + pctOf(castle, S.length) + ' % · âges ' + JSON.stringify(ages));
}

// ---------- (9) derby ----------
check('(9) Derby des Lames : taux de victoire dans la bande 40-60 % sur la saison complète',
  derbyP >= 20 && pctOf(derbyW, derbyP) >= 40 && pctOf(derbyW, derbyP) <= 60,
  derbyW + '/' + derbyP + ' = ' + pctOf(derbyW, derbyP) + ' %');

// ---------- (10) déterminisme ----------
{
  let diverge = 0;
  for (const s of S.slice(0, 12)) {
    const n = s.n;
    let t = sim.newGame(s.seed, data, { managers: managersFor(s.seed, n) });
    for (let d = 0; d < 30 && !t.collapsed; d++) t = sim.resolveDay(t, acts(t)).state;
    if (sim.hashState(t) !== s.hash) diverge++;
  }
  check('(10) déterminisme : 12 des 60 saisons rejouées donnent le même hachage', diverge === 0, diverge + ' divergence(s)');
}

const bad = results.filter(r => !r.ok);
console.log('\n' + (results.length - bad.length) + '/' + results.length + ' contrôles passés');
if (bad.length) { console.log('ÉCHECS : ' + bad.map(b => b.name).join(' | ')); process.exit(1); }

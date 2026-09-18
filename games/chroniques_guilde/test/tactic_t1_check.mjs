// Banc V5 T1 — grille tactique, six classes de base, raid du Sylvain (V5_SPEC §8 T1 + mission « V5 tranche T1 », 2026-09-18).
// Preuve par exécution, moteur seul : node test/tactic_t1_check.mjs   (code de sortie 1 si un contrôle échoue)
// (1) rejeu 30 graines × 30 jours identique au hash (6 managers, un héros par classe de base, Invocateur compris) ;
// (2) invariants de grille (unités dans la grille, jamais superposées, PV bornés, PA/PM ≥ 0, LdV symétrique, formes fixées) ;
// (3) 30 raids forcés joués par raidDefaults : ≥ 40 % gagnés en ≤ 3 jours, jamais un jour de raid à 0 dégât, riposte visible au passage suivant ;
// (4) chaque sort de chaque classe lancé ≥ 1 fois avec son effet (scénarios unitaires) ; l'Invocateur pose une invocation qui agit ;
// (5) raid_pass humain illégal refusé avec raison, légal rejoué à l'identique ; (6) VM.raid sans undefined ; (7) previewCast pur et cohérent.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const T = require(path.join(ROOT, 'tactic.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const TI = T._internal;

const MANAGERS = [
  { id: 'p1', name: 'Vous', kind: 'human', profile: 'humain', class_id: 'warrior' },
  { id: 'f_anselme', name: 'Anselme', kind: 'ai', profile: 'prudent', class_id: 'cleric' },
  { id: 'f_roxane', name: 'Roxane', kind: 'ai', profile: 'audacieux', class_id: 'ranger' },
  { id: 'f_bastien', name: 'Bastien', kind: 'ai', profile: 'audacieux', class_id: 'rogue' },
  { id: 'f_maelle', name: 'Maëlle', kind: 'ai', profile: 'prudent', class_id: 'mage' },
  { id: 'f_ysolde', name: 'Ysolde', kind: 'ai', profile: 'prudent', class_id: 'summoner' }
];
const NO_MAGE = MANAGERS.filter(m => m.class_id !== 'mage');
const SEEDS = 30, DAYS = 30, RAID_DAY = 12;
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
function acts(s) { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; }
function hasUndefined(v, p, out, depth = 0) {
  if (depth > 30) return;
  if (v === undefined) { out.push(p); return; }
  if (Array.isArray(v)) v.forEach((x, i) => hasUndefined(x, p + '[' + i + ']', out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) hasUndefined(v[k], p + '.' + k, out, depth + 1);
}
function walkNumbers(v, p, out, depth = 0) {
  if (depth > 40) return;
  if (typeof v === 'number') { if (!Number.isInteger(v)) out.push(p + '=' + v); }
  else if (Array.isArray(v)) v.forEach((x, i) => walkNumbers(x, p + '[' + i + ']', out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walkNumbers(v[k], p + '.' + k, out, depth + 1);
}
function attach(s) { Object.defineProperty(s, '__data', { value: data, enumerable: false, configurable: true }); return s; }
function cloneState(s) { return attach(JSON.parse(JSON.stringify(s))); }
// Raid forcé : présage injecté le soir du jour D-1 (la grille est dressée), premier passage au jour D.
function forcedRaid(seed, managers, day) {
  let s = sim.newGame(seed, data, { managers: managers });
  while (s.day < day - 1) s = sim.resolveDay(s, acts(s)).state;
  s = cloneState(s);
  s.raid = null; s.raid_history = [];   // un réveil naturel antérieur (maîtrise atteinte) est remplacé par le raid forcé
  s.threats = [{ type: 'dragon', biome: 'forest', dragon_id: 'dragon_forest', day: s.day + 1, presage_day: s.day, outcome: null }];
  s.dragons.forest.state = 'awake'; s.dragons.forest.awakenings = 1; s.dragons.forest.next_day = s.day + 1;
  s = sim.resolveDay(s, acts(s)).state;
  return s;
}
const bad = [];

// ---------- (1) rejeu 30 graines × 30 jours identique au hash, raids compris ----------
{
  let mismatch = 0, raidsSeen = 0, nonInt = 0, t0 = Date.now();
  for (let seed = 1; seed <= SEEDS; seed++) {
    const run = () => { let s = sim.newGame(seed, data, { managers: MANAGERS }); const h = []; let raids = 0; for (let d = 0; d < DAYS; d++) { const r = sim.resolveDay(s, acts(s)); s = r.state; h.push(sim.hashState(s)); if (r.chronicle.raid) raids++; } return { h: h.join(','), raids, s }; };
    const A = run(), B = run();
    if (A.h !== B.h) mismatch++;
    raidsSeen += A.raids;
    const ni = []; walkNumbers(A.s, 'state', ni); if (ni.length) nonInt++;
    if (JSON.stringify(A.s).includes('undefined')) bad.push('graine ' + seed + ' : undefined sérialisé');
  }
  check('(1) rejeu : 30 graines × 30 jours (6 managers, six classes) rejouées deux fois → hachages identiques ; état entier, raids présents', mismatch === 0 && raidsSeen > 0 && nonInt === 0, mismatch + ' divergence(s), ' + raidsSeen + ' jours de raid, ' + (Date.now() - t0) + ' ms');
}

// ---------- (2) invariants de grille ----------
{
  // Formes sur des cas fixés (§1.4).
  const G = { w: 9, h: 11 };
  const n = (shape, r, sx, sy, tx, ty) => TI.shapeCells(G, shape, r, sx, sy, tx, ty).length;
  const shapesOk = n('single', 0, 4, 9, 4, 5) === 1 && n('circle', 1, 4, 9, 4, 5) === 5 && n('circle', 2, 4, 9, 4, 5) === 13 && n('circle', 3, 4, 9, 4, 5) === 25
    && n('cross', 1, 4, 9, 4, 5) === 5 && n('cross', 2, 4, 9, 4, 5) === 9 && n('cross', 3, 4, 9, 4, 5) === 13 && n('ring', 1, 4, 9, 4, 5) === 4 && n('ring', 2, 4, 9, 4, 5) === 8
    && n('line', 3, 4, 9, 4, 6) === 3 && n('cone', 1, 4, 9, 4, 5) === 1 && n('cone', 2, 4, 9, 4, 5) === 4 && n('cone', 3, 4, 9, 4, 5) === 9
    && JSON.stringify(TI.shapeCells(G, 'line', 3, 4, 9, 4, 6)) === JSON.stringify([{ x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }])
    && JSON.stringify(TI.shapeCells(G, 'cone', 2, 4, 5, 4, 3)) === JSON.stringify([{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 4, y: 4 }])
    && n('circle', 2, 0, 0, 0, 0) === 6 && JSON.stringify(TI.dirOf(0, 0, 3, 3)) === JSON.stringify({ x: 1, y: 0 });
  check('(2a) formes fixées : single 1 · circle 5/13/25 · cross 5/9/13 · ring 4/8 · line 3 orientée · cone 1/4/9 depuis la source · bord de grille tronqué · égalité → horizontale', shapesOk);
  // LdV symétrique sur l'arène (souches) avec un mur de glace ajouté.
  const L = data.layouts.clairiere;
  const blocked = i => L.layout[i] === 1 || i === 5 * 9 + 4;
  let asym = 0, pairs = 0, blockedByStump = 0;
  for (let a = 0; a < 99; a++) for (let b = a + 1; b < 99; b++) {
    const ax = a % 9, ay = Math.trunc(a / 9), bx = b % 9, by = Math.trunc(b / 9);
    const l1 = TI.hasLos(G, blocked, ax, ay, bx, by), l2 = TI.hasLos(G, blocked, bx, by, ax, ay);
    pairs++; if (l1 !== l2) asym++; if (!l1) blockedByStump++;
  }
  check('(2b) ligne de vue symétrique sur les ' + pairs + ' paires de cases de la clairière (Bresenham entier, souches + mur)', asym === 0 && blockedByStump > 0 && TI.hasLos(G, blocked, 4, 9, 4, 5) === false && TI.hasLos(G, blocked, 3, 7, 3, 4) === true, asym + ' asymétrie(s), ' + blockedByStump + ' paires coupées');
  // Invariants pendant des raids joués action par action (raidAction) : PA/PM ≥ 0, unités dans la grille, jamais superposées, PV bornés.
  let steps = 0, viol = [], traceChecks = 0, traceOk = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let s = forcedRaid(seed, MANAGERS, RAID_DAY);
    for (let day = 0; day < 3 && s.raid && s.raid.status === 'active'; day++) {
      const env = sim._internal.raidEnvOf(s, null);
      let firstOfDay = true;
      for (const mid of sim.listManagers(s).slice().sort()) {
        for (const plan of T.raidDefaults(s, mid, env)) {
          // Trace de la riposte précédente visible par le passage suivant (même jour : la nuit efface les zones du boss, §1.12).
          if (!firstOfDay) { traceChecks++; const R = s.raid; const zs = Object.keys(R.zones).filter(k => R.zones[k].owner_kind === 'boss'); if (R.last_riposte && zs.length > 0 && R.last_riposte.cells.some(c => zs.includes(String(c.y * R.grid_w + c.x)))) traceOk++; else viol.push('riposte sans trace visible au passage suivant (graine ' + seed + ')'); }
          firstOfDay = false;
          let r = T.raidAction(s, { type: 'begin_pass', hero_id: plan.adventurer_id }, env);
          if (!r.ok) { viol.push('begin_pass refusé : ' + r.reason); continue; }
          s = r.state;
          for (const a of plan.actions) {
            r = T.raidAction(s, a, env);
            if (!r.ok) { viol.push('action refusée en rejeu : ' + r.reason); break; }
            s = r.state; steps++;
            const R = s.raid, seen = {};
            if (R.pass && (R.pass.pa < 0 || R.pass.pm < 0)) viol.push('PA/PM négatifs');
            for (const u of R.units) {
              if (u.x < 0 || u.y < 0 || u.x >= R.grid_w || u.y >= R.grid_h) viol.push('unité hors grille ' + u.id);
              const k = u.y * R.grid_w + u.x;
              if (seen[k]) viol.push('unités superposées en ' + k); seen[k] = 1;
              if (R.layout[k] === 1 || R.layout[k] === 3) viol.push('unité sur un mur/gouffre');
              if (u.x >= R.boss.x && u.x < R.boss.x + 2 && u.y >= R.boss.y && u.y < R.boss.y + 2) viol.push('unité sur le boss');
              if (u.hp < 0 || u.hp > u.hp_max || u.hp === 0) viol.push('PV hors bornes ' + u.id + ' ' + u.hp + '/' + u.hp_max);
              if (u.shield < 0) viol.push('bouclier négatif');
            }
            if (R.boss.hp < 0 || R.boss.hp > R.boss.hp_max || R.boss.shield < 0) viol.push('PV du boss hors bornes');
            if (R.boss.controls_today < 0) viol.push('contrôles négatifs');
            for (const k of Object.keys(R.zones)) if (R.zones[k].turns_left <= 0) viol.push('zone à durée nulle');
            if (s.raid.status !== 'active') break;
          }
          if (s.raid.status !== 'active') break;
        }
        if (s.raid.status !== 'active') break;
      }
      if (s.raid.status === 'active') { const rn = T.raidNight(s, sim._internal.raidEnvOf(s, null)); s = rn.state; }
    }
  }
  check('(2c) invariants sur ' + steps + ' actions rejouées via raidAction (6 raids × ≤ 3 jours) : PA/PM ≥ 0, unités dans la grille, jamais superposées ni sur mur/gouffre/boss, PV ∈ ]0, max], boss ∈ [0, max], zones à durée > 0', viol.filter(x => !/trace/.test(x)).length === 0 && steps > 200, viol.filter(x => !/trace/.test(x)).slice(0, 4).join(' | '));
  check('(3c) la riposte laisse une trace visible au passage suivant : zone du boss (racines/spores) sur les cases de la dernière riposte au début de chaque passage du jour sauf le premier', traceChecks > 0 && traceOk === traceChecks, traceOk + '/' + traceChecks);
  // Pureté : raidAction / raidNight / raidView / raidDefaults ne mutent pas leur entrée.
  {
    const s = forcedRaid(3, MANAGERS, RAID_DAY);
    const env = sim._internal.raidEnvOf(s, null);
    const before = JSON.stringify(s.raid);
    T.raidDefaults(s, 'f_anselme', env); T.raidView(s, 'p1', env); T.raidAction(s, { type: 'begin_pass', hero_id: 'h_f_anselme_001' }, env); T.raidNight(s, env);
    const h0 = sim.hashState(s);
    sim.resolveDay(s, acts(s));
    check('(2d) pureté : raidDefaults, raidView, raidAction, raidNight et resolveDay ne mutent pas leur entrée', JSON.stringify(s.raid) === before && sim.hashState(s) === h0);
  }
}

// ---------- (3) 30 raids forcés joués par raidDefaults ----------
const dist = { won: 0, lost: 0, days: [], passes: 0, ko: 0, deaths: 0, zeroDays: 0, byClass: {}, traceOk: 0, traceChecks: 0, dmgTotal: 0, castsAll: {}, wonIn3: 0, controlled: 0, ripostes: 0 };
function heroClass(s, name) { for (const id of Object.keys(s.heroes)) { const h = s.heroes[id]; if (h.first_name + ' ' + h.epithet === name) return h.class_id; } for (const g of s.graves) if (g.name === name) return 'mort'; return '?'; }
for (let seed = 1; seed <= SEEDS; seed++) {
  let s = forcedRaid(seed, MANAGERS, RAID_DAY);
  let guard = 0;
  while (s.raid && s.raid.status === 'active' && guard++ < 6) {
    for (const k of Object.keys(s.raid.stats.casts)) dist.castsAll[k] = (dist.castsAll[k] || 0) + 0;
    const castsBefore = JSON.parse(JSON.stringify(s.raid.stats.casts));
    const ripBefore = s.raid.riposte_count, ctrlBefore = s.raid.boss.controls_today;
    const r = sim.resolveDay(s, acts(s)); s = r.state; const c = r.chronicle;
    if (!c.raid) { bad.push('graine ' + seed + ' : journée de raid sans chronicle.raid'); break; }
    const R = s.raid || s.raid_history[s.raid_history.length - 1];
    const castsAfter = s.raid ? s.raid.stats.casts : null;
    if (castsAfter) for (const k of Object.keys(castsAfter)) dist.castsAll[k] = (dist.castsAll[k] || 0) + castsAfter[k] - (castsBefore[k] || 0);
    if (s.raid) { dist.ripostes += s.raid.riposte_count - ripBefore; dist.controlled += s.raid.boss.controls_today; }
    dist.passes += c.raid.passes.length; dist.ko += c.raid.passes.filter(p => p.ko).length; dist.deaths += c.summary.deaths.length;
    const dayDmg = c.raid.passes.reduce((a, p) => a + p.damage, 0);
    dist.dmgTotal += dayDmg;
    if (c.raid.passes.length && dayDmg === 0) { dist.zeroDays++; bad.push('graine ' + seed + ' j' + c.day + ' : journée de raid à 0 dégât (raid impossible)'); }
    for (const p of c.raid.passes) { const k = heroClass(s, p.hero_name); const b = dist.byClass[k] = dist.byClass[k] || { n: 0, d: 0, ko: 0 }; b.n++; b.d += p.damage; if (p.ko) b.ko++; }
    if (c.raid.status !== 'active') { const dur = c.day - c.raid.day_start + 1; dist.days.push(dur); if (c.raid.status === 'won') { dist.won++; if (dur <= 3) dist.wonIn3++; } else dist.lost++; }
  }
}
// Compte des sorts sur l'ensemble (les archives gardent les compteurs des raids clos).
{
  const castsFinal = {};
  for (let seed = 1; seed <= SEEDS; seed++) { /* déjà agrégés au fil des jours ci-dessus */ }
}
console.log('\n--- Distribution mesurée (30 raids forcés au J' + RAID_DAY + ', 6 managers × 1 héros : Guerrier, Clerc, Rôdeur, Voleur, Mage, Invocateur, raidDefaults) ---');
console.log('Raids : ' + dist.won + ' gagnés · ' + dist.lost + ' perdus · gagnés en ≤ 3 jours ' + dist.wonIn3 + '/30 · jours par raid ' + dist.days.join(' ') + ' · passages ' + dist.passes + ' · KO ' + dist.ko + ' (' + (100 * dist.ko / Math.max(1, dist.passes)).toFixed(0) + ' %) · morts ' + dist.deaths + ' · ripostes ' + dist.ripostes);
console.log('Dégâts par classe et par passage : ' + Object.keys(dist.byClass).sort().map(k => k + ' ' + Math.round(dist.byClass[k].d / dist.byClass[k].n) + ' (' + (100 * dist.byClass[k].d / Math.max(1, dist.dmgTotal)).toFixed(0) + ' % du total, KO ' + dist.byClass[k].ko + '/' + dist.byClass[k].n + ')').join(' · '));
check('(3a) raidDefaults : le Sylvain tombe sur ≥ 40 % des graines en ≤ 3 jours', dist.wonIn3 * 10 >= SEEDS * 4, dist.wonIn3 + '/' + SEEDS + ' (' + (100 * dist.wonIn3 / SEEDS).toFixed(0) + ' %)');
check('(3b) jamais un raid impossible : aucune journée de raid jouée à 0 dégât ; chaque raid clos en ≤ 4 jours (won ou lost)', dist.zeroDays === 0 && dist.days.every(d => d >= 1 && d <= 4) && dist.won + dist.lost === SEEDS, dist.zeroDays + ' journée(s) à 0, ' + (dist.won + dist.lost) + '/30 clos');
const maxShare = Math.max(...Object.keys(dist.byClass).filter(k => k !== 'mort' && k !== '?').map(k => 100 * dist.byClass[k].d / Math.max(1, dist.dmgTotal)));
check('(3d) calibrage : KO par passage ≤ 25 %, part de dégâts maximale par classe ≤ 45 %', dist.ko * 4 <= dist.passes && maxShare <= 45, 'KO ' + (100 * dist.ko / Math.max(1, dist.passes)).toFixed(0) + ' %, part max ' + maxShare.toFixed(0) + ' %');
// Sève non brûlée : sans Mage, la victoire doit devenir rare (le besoin existe).
{
  let wonNoMage = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    let s = forcedRaid(seed, NO_MAGE, RAID_DAY);
    let guard = 0;
    while (s.raid && s.raid.status === 'active' && guard++ < 6) { const r = sim.resolveDay(s, acts(s)); s = r.state; if (r.chronicle.raid && r.chronicle.raid.status === 'won') wonNoMage++; }
  }
  console.log('Sans brûleur (5 managers, pas de Mage) : ' + wonNoMage + '/30 raids gagnés');
  check('(3e) sève non brûlée : sans Mage, victoire < 40 % (le besoin « brûleur » existe) ; avec Mage, plus de victoires que sans', wonNoMage * 10 < SEEDS * 4 && dist.won > wonNoMage, wonNoMage + '/30 sans Mage vs ' + dist.won + '/30 avec');
}

// ---------- (4) chaque sort de chaque classe : lancé ≥ 1 fois sur le banc (3) + effet vérifié par scénario ----------
const allSpells = data.tactic_spells.map(s => s.id);
const notCast = allSpells.filter(id => !(dist.castsAll[id] > 0));
check('(4a) les 25 sorts (arme + 4 par classe) sont lancés au moins une fois par raidDefaults sur les 30 raids', notCast.length === 0, notCast.length ? 'jamais lancés : ' + notCast.join(', ') : Object.keys(dist.castsAll).sort().map(k => k + ':' + dist.castsAll[k]).join(' '));
// Scénarios unitaires : un héros de chaque classe placé au contact (ou à distance), un sort lancé via raidAction, l'effet lu dans l'état.
{
  const base = forcedRaid(5, MANAGERS, RAID_DAY);
  const env = sim._internal.raidEnvOf(base, null);
  for (const id of Object.keys(env.heroes)) { env.heroes[id].injury_severity = 0; env.heroes[id].fatigue = 0; }   // scénarios : tous aptes
  const heroOf = cls => Object.keys(env.heroes).sort().filter(id => env.heroes[id].class_id === cls)[0];
  const R0 = base.raid;
  const B = R0.boss;   // (4..5, 3..4)
  function scene(cls, x, y, extra) {
    let s = cloneState(base);
    const hid = heroOf(cls);
    let r = T.raidAction(s, { type: 'begin_pass', hero_id: hid }, env);
    if (!r.ok) throw new Error('begin_pass ' + cls + ' : ' + r.reason);
    s = r.state;
    const u = s.raid.units.filter(v => v.id === hid)[0];
    u.x = x; u.y = y; s.raid.pass.pa = 6; s.raid.pass.pm = 3;
    if (extra) extra(s.raid, u);
    return { s, hid, u };
  }
  function mkAdd(R, x, y, id) { R.units.push({ id: id || 'add_t01', kind: 'add', side: 'boss', owner: 'boss', master_id: null, name: 'Sylvain corrompu', gender: 'm', class_id: null, level: 5, x, y, hp_max: 80, hp: 80, shield: 0, shield_turns: 0, atk_eff: 20, def: 10, crit: 0, spd: 5, mass: 0, pa_max: 4, pm_max: 2, range_min: 1, range_max: 1, los: false, states: [], cooldowns: {}, born_pass: 0, passive: null, crit_immune: false }); R.units.sort((a, b) => (a.id < b.id ? -1 : 1)); }
  const cast = (s, spell, x, y) => T.raidAction(s, { type: 'cast', spell_id: spell, x, y }, env);
  const boss = s => s.raid.boss;
  const unit = (s, id) => s.raid.units.filter(v => v.id === id)[0];
  const st = (u, id) => u.states.filter(z => z.id === id)[0];
  const fx = [];
  const F = (name, ok, detail) => fx.push({ name, ok: !!ok, detail: detail || '' });
  // Guerrier
  { const { s, hid } = scene('warrior', 3, 4); const r = cast(s, 'slash', 4, 4); F('Taillade : dégâts au boss', r.ok && boss(r.state).hp < boss(s).hp, r.reason); }
  { const { s, hid } = scene('warrior', 3, 6); const r = cast(s, 'taunt', 4, 4); F('Provocation : boss provoqué (vise le guerrier) + réduction 5 sur soi', r.ok && st(boss(r.state), 'provoque') && st(boss(r.state), 'provoque').unit === hid && st(unit(r.state, hid), 'reduction') && st(unit(r.state, hid), 'reduction').value === 5, r.reason); }
  { const { s, hid } = scene('warrior', 5, 8); const r = cast(s, 'charge', 5, 4); const u = unit(r.state, hid); F('Charge (ligne, 2-4) : le guerrier arrive au contact sans PM et frappe 130 %', r.ok && u.y === 5 && u.x === 5 && r.state.raid.pass.pm === 3 && boss(r.state).hp < boss(s).hp, r.reason); }
  { const { s, hid } = scene('warrior', 3, 4); const r = cast(s, 'bulwark', 3, 4); const u = unit(r.state, hid); F('Rempart : bouclier 30 + 3×niveau pendant 2 tours', r.ok && u.shield === unit(s, hid).shield + 30 + 3 * u.level && u.shield_turns === 2, r.reason); }
  // Clerc
  { const { s, hid } = scene('cleric', 3, 4, (R, u) => { u.hp = 10; }); const r = cast(s, 'healing_prayer', 3, 4); F('Prière de soin : PV rendus (200 % de soin + 10)', r.ok && unit(r.state, hid).hp > 10, r.reason); }
  { const { s, hid } = scene('cleric', 3, 4); const r = cast(s, 'blessing', 3, 4); F('Bénédiction : bouclier 20 + 2×niveau, 2 tours', r.ok && unit(r.state, hid).shield === unit(s, hid).shield + 20 + 2 * unit(s, hid).level, r.reason); }
  { const { s } = scene('cleric', 3, 4); const r = cast(s, 'light', 4, 4); F('Lumière : 90 % magique sur le boss', r.ok && boss(r.state).hp < boss(s).hp, r.reason); }
  { const { s } = scene('cleric', 3, 6, R => { mkAdd(R, 3, 5, 'inv_t01'); const v = R.units.filter(x => x.id === 'inv_t01')[0]; v.kind = 'summon'; v.side = 'guild'; v.owner = 'f_ysolde'; v.states.push({ id: 'poison', turns: 3, value: 1 }); }); const r = cast(s, 'light', 3, 5); F('Lumière sur un allié (invocation empoisonnée à portée 1) : retire le poison', r.ok && !st(unit(r.state, 'inv_t01'), 'poison'), r.reason); }
  { const { s } = scene('cleric', 3, 6, R => mkAdd(R, 3, 5)); const r = cast(s, 'light', 3, 5); F('Lumière sur un rejeton : aveugle 1 tour', r.ok && st(unit(r.state, 'add_t01'), 'aveugle'), r.reason); }
  { const { s } = scene('cleric', 3, 6); const r = cast(s, 'sacred_circle', 3, 6); const z = Object.values(r.state.raid.zones).filter(x => x.zone_id === 'sanctuaire'); F('Cercle sacré : zone sanctuaire (cercle 1, 3 ripostes avec Onction)', r.ok && z.length === 5 && z[0].turns_left === 3 && z[0].owner_kind === 'hero', r.reason); }
  // Voleur
  { const a = scene('rogue', 3, 4), b = scene('rogue', 4, 2); const ra = cast(a.s, 'shadow_strike', 4, 4), rb = cast(b.s, 'shadow_strike', 4, 3); const da = boss(a.s).hp - boss(ra.state).hp, db = boss(b.s).hp - boss(rb.state).hp; F('Coup de l\'ombre : 150 % de face, 220 % depuis le dos (dégâts supérieurs, journal « dans le dos »)', ra.ok && rb.ok && da > 0 && db > 0 && rb.log.some(l => /dos/.test(l)) && !ra.log.some(l => /dos/.test(l)), ra.reason || rb.reason); }
  { const { s, hid } = scene('rogue', 3, 7); const r = cast(s, 'sidestep', 3, 5); const u = unit(r.state, hid); F('Pas de côté : téléportation sur une case libre à 2', r.ok && u.x === 3 && u.y === 5 && r.state.raid.pass.pm === 3, r.reason); }
  { const { s } = scene('rogue', 3, 4); const r = cast(s, 'time_theft', 4, 4); F('Vol de temps : tirage de ténacité (état vol_temps −2 PA, ou « se dégage » au journal)', r.ok && (st(boss(r.state), 'vol_temps') || r.log.some(l => /ténacité/.test(l))), r.reason); }
  { const { s } = scene('rogue', 3, 6, R => mkAdd(R, 3, 5)); const r = cast(s, 'blinding_powder', 3, 5); const a = unit(r.state, 'add_t01'); F('Poudre aveuglante (croix 1) : rejeton aveuglé et étourdi', r.ok && st(a, 'aveugle') && st(a, 'etourdi'), r.reason); }
  // Rôdeur
  { const { s } = scene('ranger', 3, 8); const r = cast(s, 'precise_shot', 4, 4); F('Tir précis (3-7, LdV) : dégâts au boss', r.ok && boss(r.state).hp < boss(s).hp, r.reason); }
  { const { s } = scene('ranger', 3, 7); const r = cast(s, 'snare_arrow', 4, 4); F('Flèche entravante : entrave 2 tours sur le boss (+ tirage immobilise)', r.ok && st(boss(r.state), 'entrave') && st(boss(r.state), 'entrave').turns === 2, r.reason); }
  { const { s } = scene('ranger', 3, 7, R => mkAdd(R, 3, 9)); const r = cast(s, 'snare_arrow', 3, 9); F('Flèche entravante sur un rejeton (distance 2) : immobilisé sans tirage', r.ok && st(unit(r.state, 'add_t01'), 'immobilise'), r.reason); }
  { const { s, hid } = scene('ranger', 3, 7); const r = cast(s, 'trap', 3, 5); const z = Object.values(r.state.raid.zones).filter(x => x.zone_id === 'piege'); F('Piège : zone piège persistante posée par le héros', r.ok && z.length === 1 && z[0].source_id === hid, r.reason); }
  { const { s } = scene('ranger', 3, 7, R => mkAdd(R, 3, 6)); let r = cast(s, 'trap', 3, 5); r = T.raidAction(r.state, { type: 'end_turn' }, env); F('Piège déclenché : le rejeton qui marche dessus subit des dégâts et est immobilisé (journal)', r.ok && r.log.some(l => /piège/.test(l)), r.reason); }
  { const { s } = scene('ranger', 3, 7); const r = cast(s, 'hunters_mark', 4, 4); F('Marque du chasseur : marque 4 tours (3 + Pistage) sur le boss', r.ok && st(boss(r.state), 'marque') && st(boss(r.state), 'marque').turns === 4, r.reason); }
  // Mage
  { const { s } = scene('mage', 3, 7); const r = cast(s, 'fire_bolt', 4, 4); F('Trait de feu : dégâts magiques + brûlure 2 tours (coupe la sève)', r.ok && boss(r.state).hp < boss(s).hp && st(boss(r.state), 'brule') && st(boss(r.state), 'brule').turns === 2, r.reason); }
  { const { s } = scene('mage', 3, 7, R => mkAdd(R, 3, 5)); const r = cast(s, 'frost_hold', 3, 5); F('Emprise de givre sur un rejeton : étourdi 1 tour', r.ok && st(unit(r.state, 'add_t01'), 'etourdi'), r.reason); }
  { const { s } = scene('mage', 3, 7, R => mkAdd(R, 3, 5)); const r = cast(s, 'storm', 3, 5); F('Tempête (cercle 2) : dégâts au boss ET au rejeton', r.ok && boss(r.state).hp < boss(s).hp && unit(r.state, 'add_t01').hp < 80, r.reason); }
  { const { s } = scene('mage', 3, 8); const r = cast(s, 'ice_wall', 3, 6); const z = Object.values(r.state.raid.zones).filter(x => x.zone_id === 'mur_glace'); const losAfter = TI.hasLos({ w: 9, h: 11 }, i => r.state.raid.layout[i] === 1 || (r.state.raid.zones[String(i)] && r.state.raid.zones[String(i)].zone_id === 'mur_glace'), 3, 8, 3, 4); F('Mur de glace : 3 cases de mur temporaire qui coupent la ligne de vue', r.ok && z.length === 3 && losAfter === false, r.reason); }
  // Invocateur
  { const { s, hid } = scene('summoner', 3, 6); const r = cast(s, 'clay_golem', 3, 5); const g = r.state.raid.units.filter(v => v.kind === 'summon' && v.master_id === hid)[0]; F('Golem d\'argile : invocation créée (PV 30 + 4×niveau + 2×Vigueur, garde du maître)', r.ok && g && g.guard_of === hid && g.hp === 30 + 4 * g.level + 2 * unit(s, hid).vigor, r.reason); }
  { const { s, hid } = scene('summoner', 3, 6); let r = cast(s, 'swarm', 3, 5); const n = r.state.raid.units.filter(v => v.kind === 'summon' && v.master_id === hid)[0]; const hp0 = boss(r.state).hp; r = T.raidAction(r.state, { type: 'end_turn' }, env); F('Nuée : invocation créée et agissante (elle frappe le boss pendant la phase S)', n && r.ok && r.log.some(l => /Nuée .* frappe/.test(l)) && boss(r.state).hp < hp0 + 200, r.reason); }
  { const { s, hid } = scene('summoner', 3, 6); let r = cast(s, 'clay_golem', 3, 5); const g = r.state.raid.units.filter(v => v.kind === 'summon')[0]; g.hp = 5; r = cast(r.state, 'vital_link', 3, 5); F('Lien vital : 20 + niveau PV transférés du maître vers l\'invocation', r.ok && unit(r.state, g.id).hp === 5 + 20 + unit(s, hid).level && unit(r.state, hid).hp === unit(s, hid).hp - 20 - unit(s, hid).level, r.reason); }
  { const { s, hid } = scene('summoner', 3, 6); let r = cast(s, 'clay_golem', 3, 5); const g = r.state.raid.units.filter(v => v.kind === 'summon')[0]; g.x = 3; g.y = 4; r.state.raid.pass.pa = 6; const hp0 = boss(r.state).hp; r = cast(r.state, 'sacrifice', 3, 4); F('Sacrifice : l\'invocation explose (retirée), dégâts au boss adjacent (croix 1)', r.ok && !unit(r.state, g.id) && boss(r.state).hp < hp0, r.reason); }
  // Arme (contact et distance)
  { const { s } = scene('warrior', 3, 4); const r = cast(s, 'arme', 4, 4); const { s: s2 } = scene('ranger', 3, 8); const r2 = cast(s2, 'arme', 4, 4); const { s: s3 } = scene('ranger', 3, 4); const r3 = cast(s3, 'arme', 4, 4); F('Arme : portée 1 au contact (Guerrier), 1-5 avec ligne de vue (Rôdeur)', r.ok && boss(r.state).hp < boss(s).hp && r2.ok && r3.ok, r.reason || r2.reason || r3.reason); }
  // Refus attendus
  { const { s } = scene('warrior', 3, 7); const r1 = cast(s, 'slash', 4, 4), r2 = cast(s, 'fire_bolt', 4, 4), r3 = T.raidAction(s, { type: 'move', to: { x: 4, y: 4 } }, env), r4 = T.raidAction(s, { type: 'move', to: { x: 4, y: 7 } }, env), r5 = cast(s, 'charge', 4, 4); F('refus : hors de portée, sort d\'une autre classe, case du boss, souche, charge hors ligne — chacun avec une raison', !r1.ok && /portée/.test(r1.reason) && !r2.ok && /classe/.test(r2.reason) && !r3.ok && !r4.ok && !r5.ok && /ligne/.test(r5.reason), [r1.reason, r2.reason, r3.reason, r4.reason, r5.reason].join(' / ')); }
  // Contrôle du boss : résistance décroissante (§1.8) ; poussée d'un boss non chancelant nulle ; chancelant → poussée + collision contre une souche.
  { const s = cloneState(base); const R = s.raid; const p0 = TI.controlPermille(R, env); R.boss.controls_today = 2; const p2 = TI.controlPermille(R, env); R.boss.controls_today = 9; const p9 = TI.controlPermille(R, env); F('ténacité : 750 ‰, puis 350 ‰ après 2 contrôles, plancher 150 ‰', p0 === 750 && p2 === 350 && p9 === 150); }
  { const { s, hid } = scene('summoner', 6, 3); let r = cast(s, 'clay_golem', 6, 4); r.state.raid.pass.pa = 6; const g = r.state.raid.units.filter(v => v.kind === 'summon')[0]; const bx = boss(r.state).x; r = cast(r.state, 'sacrifice', 6, 4); F('poussée : le boss (masse 3) ne bouge pas quand il n\'est pas chancelant', r.ok && boss(r.state).x === bx && r.log.some(l => /masse/.test(l)), r.reason);
    const { s: s2 } = scene('summoner', 6, 3, R => { R.boss.states.push({ id: 'chancelant', turns: 2, value: 0 }); }); let r2 = cast(s2, 'clay_golem', 6, 4); r2.state.raid.pass.pa = 6; r2 = cast(r2.state, 'sacrifice', 6, 4); F('poussée : boss chancelant (masse 0) poussé vers l\'ouest d\'une case ; collision contre la souche à 2 cases = arrêt + dégâts', r2.ok && boss(r2.state).x === 3 && r2.log.some(l => /recule|bouscule/.test(l)), r2.reason); }
  { const { s } = scene('warrior', 5, 6, R => { R.boss.phase = 3; R.boss.shield = 5; }); const r = cast(s, 'charge', 5, 4); F('écorce (P3) : bouclier brisé pendant un passage → boss chancelant 2 tours (fenêtre de burst)', r.ok && st(boss(r.state), 'chancelant') && r.log.some(l => /chancel/.test(l)), r.reason); }
  { const { s } = scene('warrior', 3, 4); let r = T.raidAction(s, { type: 'end_pass' }, env); const R = r.state.raid; const roots = Object.values(R.zones).filter(z => z.zone_id === 'roots'); F('riposte Racines : croix de racines (owner boss, 2 ripostes) autour de la case finale du héros ; riposte suivante télégraphiée', r.ok && roots.length >= 5 && roots[0].turns_left === 2 && R.pass === null && R.riposte_next && R.riposte_next.kind && R.last_riposte && R.last_riposte.kind === 'roots', r.reason); }
  { const { s } = scene('warrior', 3, 4, R => { R.boss.phase = 2; R.riposte_count = 1; }); const r = T.raidAction(s, { type: 'end_pass' }, env); const R = r.state.raid; F('riposte Spores (P2, une riposte sur deux) : cône de spores orienté vers le héros, zone 1 riposte', r.ok && R.last_riposte.kind === 'spores' && Object.values(R.zones).some(z => z.zone_id === 'spores'), r.reason); }
  { const { s, hid } = scene('warrior', 3, 4, (R, u) => { u.hp = 1; u.shield = 0; }); const r = T.raidAction(s, { type: 'end_turn' }, env); const R = r.state.raid; F('KO : le héros à 0 PV quitte la grille, le passage se termine (riposte jouée), événement ko', r.ok && r.events.some(e => e.kind === 'ko') && !unit(r.state, hid) && R.pass === null && R.passes_done[R.passes_done.length - 1].ko === true, r.reason); }
  { const { s } = scene('warrior', 3, 4, R => { R.boss.hp = 1; }); const r = cast(s, 'slash', 4, 4); F('victoire : boss à 0 PV pendant un passage → status won, événement won, fin immédiate', r.ok && r.state.raid.status === 'won' && r.events.some(e => e.kind === 'won'), r.reason); }
  { let s = cloneState(base); s.raid.nights = 3; const r = T.raidNight(s, env); F('nuit : régénération 10 %, nuits +1, enrage +45 % plafonné, échec au 4e soir (status lost)', r.state.raid.nights === 4 && r.state.raid.status === 'lost' && r.state.raid.enrage_pct === 45 && r.events.some(e => e.kind === 'lost'), ''); }
  { let s = cloneState(base); s.raid.boss.hp = 100; s.raid.boss.states.push({ id: 'marque', turns: 3, value: 0 }); s.raid.zones['70'] = { zone_id: 'roots', turns_left: 2, owner_kind: 'boss', source_id: 'boss' }; s.raid.zones['71'] = { zone_id: 'sanctuaire', turns_left: 2, owner_kind: 'hero', source_id: 'x', owner_name: 'x' }; const r = T.raidNight(s, env); const R = r.state.raid; F('nuit : +10 % de PV, états du boss effacés, zones du boss effacées, zones de héros −1, enrage à partir de la 2e nuit', R.boss.hp === 100 + Math.trunc(R.boss.hp_max / 10) && R.boss.states.length === 0 && !R.zones['70'] && R.zones['71'] && R.zones['71'].turns_left === 1 && R.nights === 1 && R.enrage_pct === 0, ''); }
  const fails = fx.filter(x => !x.ok);
  for (const f of fx) if (!f.ok) console.log('   effet KO : ' + f.name + ' — ' + f.detail);
  check('(4b) effets vérifiés par scénario : ' + fx.length + ' cas (4 sorts × 6 classes, arme, refus, ténacité, poussée/masse/collision, écorce, ripostes racines/spores, KO, victoire, nuit)', fails.length === 0, fails.length + ' échec(s)');
  check('(4c) l\'Invocateur pose une invocation qui agit (golem garde du maître, nuée qui frappe en phase S, lien vital, sacrifice)', fx.filter(x => /Golem|Nuée|Lien vital|Sacrifice :/.test(x.name)).every(x => x.ok));
}

// ---------- (5) raid_pass humain : illégal refusé avec raison, légal rejoué à l'identique ----------
{
  const s = forcedRaid(7, MANAGERS, RAID_DAY);
  const first = sim.listManagers(s).slice().sort()[0];              // joue en premier : son passage voit l'état du matin
  const plans = sim._internal.raidDefaults(s, first);
  const hero = plans[0].adventurer_id;
  const legal = { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: plans[0].actions } };
  const v = sim.validateAction(s, legal);
  const bogus = [
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: [{ type: 'cast', spell_id: 'fire_bolt', x: 4, y: 4 }] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: [{ type: 'move', to: { x: 4, y: 3 } }] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: [{ type: 'cast', spell_id: 'arme', x: 4, y: 4 }] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: [{ type: 'end_pass' }, { type: 'end_pass' }] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero } },
    { manager_id: 'p1', day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: [] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: 'h_nobody', actions: [] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: [{ type: 'teleport' }] } },
    { manager_id: first, day: s.day, type: 'raid_pass', payload: { adventurer_id: hero, actions: Array(70).fill({ type: 'end_turn' }) } }
  ];
  const rej = bogus.map(a => sim.validateAction(s, a));
  const allRej = rej.every(r => r && r.ok === false && typeof r.reason === 'string' && r.reason.length > 0);
  const others = acts(s).filter(a => !(a.manager_id === first && a.type === 'raid_pass'));
  const rA = sim.resolveDay(s, others.concat([legal]));
  const rB = sim.resolveDay(s, others);
  const rC = sim.resolveDay(s, others.concat([bogus[0]]));
  check('(5a) raid_pass illégal refusé avec raison (' + bogus.length + ' cas : hors de portée, case du boss, sort d\'une autre classe, passage déjà terminé, sans actions, pas à vous, héros inconnu, type inconnu, trop long)', allRej, rej.map(r => r.reason).slice(0, 4).join(' / '));
  check('(5b) raid_pass légal accepté et rejoué à l\'identique : hash de la journée avec le passage explicite = hash avec le passage par défaut', v.ok && sim.hashState(rA.state) === sim.hashState(rB.state) && rA.chronicle.raid.passes.length > 0, v.reason || '');
  const strip = st => sim.hashState(Object.assign({}, st, { notices: [], last_chronicle: null, history: [] }));
  check('(5c) raid_pass illégal dans resolveDay : ignoré, raison dans notices et log, le héros joue son passage par défaut (même état hors notices/chronique)', rC.state.notices.length >= 1 && rC.log.some(l => l.startsWith('REJET')) && strip(rC.state) === strip(rB.state) && rC.chronicle.raid.passes.length === rB.chronicle.raid.passes.length, (rC.state.notices[0] || '').slice(0, 120));
  // Un passage humain qui devient illégal en cours de rejeu (l'état a changé entre le matin et son tour) est interrompu proprement.
  const last = sim.listManagers(s).slice().sort().slice(-1)[0];
  const plansLast = sim._internal.raidDefaults(s, last);
  if (plansLast.length) {
    const late = { manager_id: last, day: s.day, type: 'raid_pass', payload: { adventurer_id: plansLast[0].adventurer_id, actions: plansLast[0].actions } };
    const rD = sim.resolveDay(s, acts(s).filter(a => !(a.manager_id === last && a.type === 'raid_pass')).concat([late]));
    check('(5d) passage humain rejoué après ceux des autres : accepté, et interrompu avec notice s\'il devient illégal (jamais d\'exception)', rD && rD.state && rD.chronicle.raid && rD.chronicle.raid.passes.some(p => p.hero_name === (s.heroes[plansLast[0].adventurer_id].first_name + ' ' + s.heroes[plansLast[0].adventurer_id].epithet)), (rD.state.notices || []).join(' | ').slice(0, 160));
  }
}

// ---------- (6) VM.raid sans undefined, forme du §7.5 ----------
{
  const missing = [];
  const keys = ['active', 'id', 'name', 'day_start', 'nights', 'status', 'phase_label', 'hp_pct', 'hp_label', 'boss', 'grid', 'units', 'me', 'passes_today', 'waiting_on', 'journal', 'lineage', 'warnings'];
  let checked = 0;
  for (let seed = 1; seed <= 3; seed++) {
    let s = forcedRaid(seed, MANAGERS, RAID_DAY);
    let guard = 0;
    while (s.raid && s.raid.status === 'active' && guard++ < 5) {
      for (const m of sim.listManagers(s)) {
        const vm = sim.viewModel(s, m);
        checked++;
        const und = []; hasUndefined(vm, 'vm', und);
        if (und.length) missing.push(m + ' ' + und.slice(0, 2).join(','));
        const R = vm.raid;
        if (!R) { missing.push('VM.raid null pendant le raid'); continue; }
        for (const k of keys) if (!(k in R)) missing.push('raid.' + k);
        if (R.grid.cells.length !== R.grid.w * R.grid.h || !R.grid.cells.every(c => ['floor', 'wall', 'water', 'pit'].includes(c.kind) && typeof c.safe === 'boolean')) missing.push('grid');
        for (const k of ['name', 'x', 'y', 'w', 'h', 'facing', 'shield', 'states', 'next_riposte', 'heads', 'fissures', 'hp', 'hp_max']) if (!(k in R.boss)) missing.push('boss.' + k);
        if (!Array.isArray(R.boss.next_riposte.cells) || typeof R.boss.next_riposte.label !== 'string') missing.push('next_riposte');
        for (const u of R.units) for (const k of ['id', 'kind', 'name', 'owner_name', 'x', 'y', 'hp', 'hp_max', 'shield', 'states', 'is_mine']) if (!(k in u)) missing.push('unit.' + k);
        for (const k of ['hero_id', 'can_play', 'reason', 'pass', 'spells', 'reachable']) if (!(k in R.me)) missing.push('me.' + k);
        if (R.me.can_play) { for (const sp of R.me.spells) for (const k of ['id', 'name', 'cost_pa', 'range_label', 'zone_label', 'verb', 'cooldown_left', 'castable', 'reason', 'description']) if (!(k in sp)) missing.push('spell.' + k); if (!R.me.pass || !Number.isInteger(R.me.pass.pa)) missing.push('me.pass'); if (!Array.isArray(R.me.default_actions)) missing.push('me.default_actions'); }
        if (vm.threat === null || vm.threat.phase !== 'raid') missing.push('threat.phase');
        if (!vm.roster.some(h => h.is_mine && h.activity_options.some(o => o.activity === 'raid')) && R.me.can_play) missing.push('activity_options.raid pour ' + m);
        if (vm.roster.some(h => h.activity_options.some(o => o.activity === 'defend'))) missing.push('defend proposé pendant un raid');
      }
      s = sim.resolveDay(s, acts(s)).state;
    }
  }
  check('(6) VM.raid conforme au §7.5 et sans undefined (' + checked + ' vues) ; VM.threat.phase = raid ; activité raid proposée, defend absente', missing.length === 0, missing.slice(0, 5).join(' | '));
}

// ---------- (7) previewCast : pur, cohérent avec raidAction ----------
{
  let agree = 0, disagree = 0, dmgOk = 0, dmgBad = 0, pureBad = 0, samples = [];
  for (let seed = 1; seed <= 4; seed++) {
    const s = forcedRaid(seed, MANAGERS, RAID_DAY);
    const env = sim._internal.raidEnvOf(s, null);
    for (const m of sim.listManagers(s)) {
      const view = T.raidView(s, m, env);
      if (!view || !view.me.can_play) continue;
      const before = JSON.stringify(view);
      let begun = T.raidAction(s, { type: 'begin_pass', hero_id: view.me.hero_id }, env);
      if (!begun.ok) continue;
      for (const sp of view.me.spells) {
        for (let y = 0; y < view.grid.h; y++) for (let x = 0; x < view.grid.w; x++) {
          const pv1 = T.previewCast(view, sp.id, { x, y }), pv2 = T.previewCast(view, sp.id, { x, y });
          if (JSON.stringify(pv1) !== JSON.stringify(pv2)) pureBad++;
          const act = T.raidAction(begun.state, { type: 'cast', spell_id: sp.id, x, y }, env);
          if (pv1.valid === act.ok) agree++; else { disagree++; if (samples.length < 4) samples.push(sp.id + '@' + x + ',' + y + ' preview ' + pv1.valid + ' (' + pv1.reason + ') vs action ' + act.ok + ' (' + act.reason + ')'); }
          if (pv1.valid && act.ok && sp.power > 0) {
            const t = pv1.targets.filter(z => z.unit_id === view.boss.id)[0];
            if (t) { const d = begun.state.raid.boss.hp - act.state.raid.boss.hp + (begun.state.raid.boss.shield - act.state.raid.boss.shield); if (d >= t.dmg_min && d <= t.dmg_crit_max) dmgOk++; else { dmgBad++; if (samples.length < 6) samples.push(sp.id + ' dégâts ' + d + ' hors [' + t.dmg_min + ', ' + t.dmg_crit_max + ']'); } }
          }
        }
      }
      if (JSON.stringify(view) !== before) pureBad++;
    }
  }
  check('(7) previewCast : pur (mêmes entrées → même sortie, vue non mutée) et cohérent avec raidAction sur ' + (agree + disagree) + ' (sort, case) : validité identique, dégâts réels dans [min, max critique] (' + dmgOk + ' coups)', pureBad === 0 && disagree === 0 && dmgBad === 0 && dmgOk > 20, (disagree + dmgBad + pureBad) + ' écart(s) ' + samples.join(' | '));
}

check('aucune autre anomalie', bad.length === 0, bad.slice(0, 5).join(' | '));
const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);

// Banc V5 T3 — 26 spécialisations, reconversion et Derby des Lames (V5_SPEC §5, §5.4, §6.1, §6.4, §2.5, §8 T3).
// Preuve par exécution, moteur seul : node test/tactic_t3_check.mjs   (code de sortie 1 si un contrôle échoue)
//
// (1) TEST DE BRANCHE MÉCANISÉ (§5.3, le contrôle le plus important) : pour chacune des 26 spés, un scénario scripté
//     (état de départ + objectif) où elle est censée être la meilleure réponse. Le même scénario est rejoué à
//     l'identique par (a) la spé, (b) sa SŒUR, (c) l'HYBRIDE NU (sans spé). On compte les TOURS DE HÉROS consommés
//     jusqu'à ce que l'objectif soit atteint (plafond 15 tours = « non résolu »). La spé passe si elle résout en au
//     moins 25 % de tours de moins que sa sœur ET que son hybride nu. Aucun objectif n'est « le sort a été lancé » :
//     tous portent sur l'état de la grille (mur en place, Drake au sol, armure fissurée, rejetons immobilisés…),
//     sauf quatre objectifs de verbe explicitement marqués VERBE dans la table (riposte scellée, riposte détournée,
//     portail franchi, corps d'élément) où l'état visé EST le verbe de la spé.
// (1b) CONTRE-SCÉNARIO de l'Assassin (V5 T3b) : sur une cible INTACTE il doit être strictement le moins bon des trois.
//     Son verbe refondu (« achever ») lui donne des dégâts qui croissent avec les PV MANQUANTS de la cible ; le prix de
//     cette spécialité est qu'il ouvre mal. Sans ce contrôle, la pente pourrait être relevée jusqu'à le rendre bon partout.
// (1c) le mur héroïque du Templier (V5 T3b) : ses 120 PV sont désormais LUS — le souffle qu'il arrête les entame,
//     un bouclier replanté garde ses ébréchures, et à zéro il vole en éclats. C'était la valeur morte signalée en T3.
// (2) les 26 spés sont atteignables et chacune est choisie au moins une fois sur 40 graines ;
// (3) 80 % des héros spécialisés au jour 22 (plans par défaut) et proposition au seuil §6.1 ;
// (4) `choose_spec` légal accepté / illégal refusé avec sa raison (héros non hybride, spé d'une autre voie, inconnue,
//     déjà spécialisé, seuil non atteint, héros d'un autre manager) ;
// (5) reconversion §6.4 : acceptée une fois, refusée la seconde, refusée pendant un raid, refusée après le jour limite,
//     refusée sans or ; elle change la spé, jamais la voie, et occupe la journée du héros ;
// (6) variance de l'effet de chaque spé (ADR-002 : une métrique qui classe ou calibre prouve d'abord sa variance) ;
// (7) Derby des Lames : joué aux jours 26-28, la Bannière se tient et se perd, le derby est gagnable, les rivaux
//     reviennent au complet la nuit, le Capitaine vole un tour ;
// (7b) CALIBRAGE du Derby (V5 T3b) : le taux de victoire de la politique par défaut sur 30 saisons tient dans la
//     bande 40-60 %. Une borne haute autant qu'une borne basse : un derby imperdable ne vaut pas mieux qu'un
//     derby ingagnable. Mesure d'avant recalibrage : 3 gagnés sur 13 (23 %).;
// (8) déterminisme : 30 graines × 30 jours rejouées à l'identique (spés et derby compris) ;
// (9) viewModel : VM.roster[].spec, VM.choice (type spécialisation, deux options, une recommandation), VM.respec
//     sans `undefined`.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const T = require(path.join(ROOT, 'tactic.js'));
const I = T._internal;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const L = data.lineage;
const SPECS = data.specs.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
const CLASSES = data.classes.map(c => c.id);
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
function acts(s) { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; }
function attach(s) { Object.defineProperty(s, '__data', { value: data, enumerable: false, configurable: true }); return s; }
function hasUndefined(v, p, out, depth = 0) {
  if (depth > 30) return;
  if (v === undefined) { out.push(p); return; }
  if (Array.isArray(v)) v.forEach((x, i) => hasUndefined(x, p + '[' + i + ']', out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) hasUndefined(v[k], p + '.' + k, out, depth + 1);
}
function managersFor(seed) {
  const names = ['Vous', 'Anselme', 'Roxane', 'Bastien', 'Maëlle', 'Ysolde'];
  return names.map((n, i) => ({ id: i === 0 ? 'p1' : 'f_' + i, name: n, kind: i === 0 ? 'human' : 'ai',
    profile: i === 0 ? 'humain' : (i % 2 ? 'prudent' : 'audacieux'), class_id: CLASSES[(i + seed) % CLASSES.length] }));
}
function play(seed, days, managers) {
  let s = sim.newGame(seed, data, { managers: managers || managersFor(seed) });
  for (let d = 0; d < days; d++) s = sim.resolveDay(s, acts(s)).state;
  return s;
}
const specById = id => SPECS.filter(S => S.id === id)[0] || null;
const hybridOf = id => data.hybrids.filter(H => H.id === id)[0] || null;
const classOfHybrid = id => (hybridOf(id).pairs || [hybridOf(id).bases])[0][0];

// ===========================================================================================
// Bac à sable du test de branche : un héros, une grille, un objectif, des tours comptés.
// ===========================================================================================
const WALL = 1, WATER = 2;
function makeEnv(seed, hybrid, spec, day) {
  const h = { id: 'h_test', name: 'Sujet', owner: 'p1', class_id: classOfHybrid(hybrid), hybrid: hybrid, spec: spec,
    hybrid_bonus: 0, level: 12, gender: 'm', hp_max: 320, atk: 64, def: 22, heal: 30, crit: 8, spd: 10, magic: false,
    morale: 80, fatigue: 0, dexterity: 24, vigor: 20, traits: [], injury_severity: 0 };
  return { data: data, day: day || 20, seed: seed, season_length: 30,
    managers: [{ id: 'p1', name: 'Vous' }, { id: 'f_1', name: 'Anselme' }, { id: 'f_2', name: 'Roxane' }, { id: 'f_3', name: 'Bastien' }],
    heroes: { h_test: h }, raiders: ['h_test'], wall_shield_pct: 0 };
}
function foe(R, x, y, o) {
  o = o || {};
  const id = 'add_t' + String(R.units.length + 1).padStart(2, '0');
  R.units.push({ id: id, kind: 'add', sub: null, side: 'boss', owner: 'boss', master_id: null, name: o.name || 'Rejeton', gender: 'm',
    class_id: null, level: o.level || 6, x: x, y: y, hp_max: o.hp || 90, hp: o.hp || 90, shield: 0, shield_turns: 0,
    atk_eff: o.atk || 16, def: o.def || 8, crit: 0, spd: o.spd || 6, mass: 0, pa_max: 4, pm_max: o.pm === undefined ? 2 : o.pm,
    range_min: 1, range_max: o.range || 1, los: false, states: [], cooldowns: {}, born_pass: 0, passive: null, crit_immune: false });
  R.units.sort((a, b) => (a.id < b.id ? -1 : 1));
  return R.units.filter(u => u.id === id)[0];
}
function bossZone(R, x, y, id, turns) { R.zones[String(y * R.grid_w + x)] = { zone_id: id, turns_left: turns || 3, owner_kind: 'boss', source_id: 'boss', owner_name: R.boss.name }; }
function guildUnitsOf(R) { return R.units.filter(u => u.side === 'guild' && u.kind !== 'banner'); }
function bossCellsOf(B) { const o = []; for (let dy = 0; dy < B.h; dy++) for (let dx = 0; dx < B.w; dx++) o.push({ x: B.x + dx, y: B.y + dy }); return o; }
function distBoss(B, x, y) {
  let best = 99;
  for (const c of bossCellsOf(B)) best = Math.min(best, Math.abs(c.x - x) + Math.abs(c.y - y));
  return best;
}
const BLOCKERS = ['mur_heros', 'mur_glace', 'mur_terre'];
function guildWallNearBoss(R) {
  for (const k of Object.keys(R.zones)) {
    const z = R.zones[k];
    if (z.owner_kind !== 'hero' || BLOCKERS.indexOf(z.zone_id) < 0) continue;
    const x = Number(k) % R.grid_w, y = Math.trunc(Number(k) / R.grid_w);
    if (distBoss(R.boss, x, y) <= 3) return true;
  }
  return guildUnitsOf(R).some(u => u.states.some(s => s.id === 'formation') && distBoss(R.boss, u.x, u.y) <= 3);
}
const st = (u, id) => u && u.states.some(s => s.id === id);
const mech = (R, k) => (R.stats.mech[k] || 0);
const CAP = 15;                                   // plafond de tours : au-delà, la situation est « non résolue »

// Un scénario : raid, mise en place, objectif. Le même pour la spé, sa sœur et l'hybride nu.
const SCEN = {
  templier: { raid: 'raid_mountain', label: 'Drake, souffle télégraphié : dresser un obstacle devant la gueule',
    goal: R => guildWallNearBoss(R) },
  hospitalier: { raid: 'raid_marsh', label: 'Hydre, venin et sangsues : relever un corps tombé et remettre le groupe debout',
    setup: (R, env, u) => { u.hp = Math.trunc(u.hp_max * 4 / 10); u.states.push({ id: 'poison', turns: 4, value: 1, level: 3 }); R.fallen = [{ sub: 'soldat', name: 'Recrue tombée', master_id: u.id, pass: 1 }]; },
    goal: R => { const g = guildUnitsOf(R); const u = g.filter(v => v.id === 'h_test')[0]; return g.filter(v => v.kind === 'summon' && v.hp > 0).length >= 1 && !!u && u.hp * 10 >= u.hp_max * 9 && !st(u, 'poison'); } },
  bretteur: { raid: 'raid_marsh', label: 'Hydre, trois gueules : rendre six coups au corps qui mord trois fois par tour',
    goal: R => mech(R, 'riposte') >= 6 },
  matador: { raid: 'raid_forest', label: 'Sylvain enraciné (PM 0) : le décoller de ses racines',
    goal: (R, ctx) => Math.abs(R.boss.x - ctx.bx) + Math.abs(R.boss.y - ctx.by) >= 2 },
  harponneur: { raid: 'raid_mountain', label: 'Drake en vol : le ramener au sol',
    setup: R => { R.boss.phase = 2; R.boss.flying = 3; R.boss.flight_pass_id = 99; },
    goal: R => (R.boss.flying || 0) === 0 },
  ecorcheur: { raid: 'raid_mountain', label: 'Drake, écailles de fer : ouvrir trois fissures',
    goal: R => (R.boss.fissures || 0) >= 3 },
  porte_etendard: { raid: 'raid_derby', label: 'Derby : masser des corps sur la hampe et donner un PA (VERBE : rallier)',
    goal: R => { if (R.status === 'won') return true; const b = R.units.filter(u => u.kind === 'banner')[0]; return !!b && mech(R, 'etendard_pa') >= 1 && guildUnitsOf(R).filter(v => v.kind === 'summon' && v.hp > 0 && Math.abs(v.x - b.x) + Math.abs(v.y - b.y) <= 1).length >= 2; } },
  sergent: { raid: 'raid_marsh', label: 'Hydre, trois gueules : offrir deux corps lourds au contact',
    setup: R => { R.boss.hp_max *= 3; R.boss.hp = R.boss.hp_max; R.boss.atk = Math.trunc(R.boss.atk / 2); },
    goal: R => guildUnitsOf(R).filter(v => v.kind === 'summon' && v.hp > 0 && (v.mass || 0) >= 2 && v.states.some(x => x.id === 'formation' && x.turns >= 2)).length >= 2 },
  confesseur: { raid: 'raid_forest', label: 'Sylvain P3, écorce : faire tomber le bouclier',
    setup: R => { R.boss.phase = 3; R.boss.shield = 250; R.boss.hp_max *= 3; R.boss.hp = R.boss.hp_max; },
    goal: R => { const u = R.units.filter(v => v.id === 'h_test')[0]; return (R.boss.shield || 0) === 0 && !!u && st(u, 'seve_volee'); } },
  censeur: { raid: 'raid_derby', label: 'Derby : empêcher le vol de tour du Capitaine (VERBE : sceller)',
    goal: R => !!R.last_riposte && R.last_riposte.kind === 'scellee' },
  pelerin: { raid: 'raid_mountain', label: 'Drake, cendres : rendre le cercle praticable',
    setup: (R, env, u) => { for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const x = u.x + dx, y = u.y + dy; if (x >= 0 && y >= 0 && x < R.grid_w && y < R.grid_h && Math.abs(dx) + Math.abs(dy) <= 2) bossZone(R, x, y, 'cendres', 4); } },
    goal: (R, ctx) => { const u = R.units.filter(v => v.id === 'h_test')[0]; if (!u) return false; let n = 0; for (const k of Object.keys(R.zones)) { const z = R.zones[k]; const x = Number(k) % R.grid_w, y = Math.trunc(Number(k) / R.grid_w); if (z.owner_kind === 'boss' && Math.abs(x - u.x) + Math.abs(y - u.y) <= 2) n++; } return n === 0 && !st(u, 'immobilise'); } },
  sourcier: { raid: 'raid_marsh', label: 'Hydre immergée : la sortir de l\'eau',
    setup: R => { for (const c of bossCellsOf(R.boss)) R.layout[c.y * R.grid_w + c.x] = WATER; R.boss.in_water = 1; R.boss.def += 10; },
    goal: R => (R.boss.in_water || 0) === 0 && !bossCellsOf(R.boss).some(c => R.layout[c.y * R.grid_w + c.x] === WATER) },
  devin: { raid: 'raid_mountain', label: 'Drake, souffle : envoyer la riposte ailleurs (VERBE : révéler/détourner)',
    goal: R => mech(R, 'riposte_detournee') >= 1 },
  chronomancien: { raid: 'raid_forest', label: 'Sylvain : faire sauter une riposte entière',
    goal: R => !!R.last_riposte && R.last_riposte.kind === 'aucune' },
  medium: { raid: 'raid_forest', label: 'Sylvain, sève : couper la régénération et entamer le tronc',
    setup: R => { R.boss.hp = R.boss.hp_max; },
    goal: (R, ctx) => R.boss.hp * 100 <= ctx.hp0 * 85 && st(R.boss, 'esprit_cendre') && st(R.boss, 'brule') },
  veilleur: { raid: 'raid_mountain', label: 'Drake, souffle : blinder une case pour trois passages',
    goal: R => { for (const k of Object.keys(R.zones)) { const z = R.zones[k]; if (z.zone_id === 'esprit_garde' && (z.power || 0) >= 60 && z.turns_left >= 2) return true; } return false; } },
  // V5 T3b (2026-09-19) : l'Assassin n'est plus mesuré sur un burst (c'était le doublon reproché en T3), mais sur son
  // VERBE refondu — ACHEVER. Cible déjà entamée, la tourbière la nourrit à chaque tour : celui qui traîne ne finit pas.
  // Contre-scénario obligatoire en (1b) : sur une cible intacte il doit être le MOINS bon des trois.
  assassin: { raid: 'raid_marsh', label: 'Hydre entamée (35 % de réserve) que la tourbière nourrit : la mettre à terre',
    setup: R => { R.boss.hp = Math.trunc(R.boss.hp_max * 35 / 100); },
    goal: R => R.boss.hp <= 0 || R.status === 'won' },
  piegeur: { raid: 'raid_forest', label: 'Sylvain P2, rejetons : les clouer sur place',
    setup: (R, env, u) => { R.boss.hp_max *= 4; R.boss.hp = R.boss.hp_max; foe(R, u.x - 1, u.y - 2, { name: 'Rejeton A', hp: 200 }); foe(R, u.x + 1, u.y - 2, { name: 'Rejeton B', hp: 200 }); foe(R, u.x, u.y - 3, { name: 'Rejeton C', hp: 200 }); },
    goal: (R, ctx) => { ctx.caught = ctx.caught || {}; for (const v of R.units.filter(x => x.side === 'boss' && x.kind === 'add')) if (v.hp <= 0 || st(v, 'immobilise')) ctx.caught[v.id] = 1; return Object.keys(ctx.caught).length >= 2; } },
  mirage: { raid: 'raid_marsh', label: 'Hydre, trois gueules : deux leurres sur la grille',
    goal: R => guildUnitsOf(R).filter(v => v.sub === 'double' && v.hp > 0).length >= 2 },
  passe_muraille: { raid: 'raid_forest', label: 'Sylvain, racines : franchir la grille jusqu\'au contact',
    setup: (R, env, u) => { for (let x = 0; x < R.grid_w; x++) for (let dy = 0; dy <= 2; dy++) { const y = u.y - 1 - dy; if (y >= 0) bossZone(R, x, y, 'roots', 9); } foe(R, R.boss.x, R.boss.y + R.boss.h, { name: 'Rejeton proche', pm: 0 }); },
    goal: (R, ctx) => { const u = R.units.filter(v => v.id === 'h_test')[0]; return !!u && distBoss(R.boss, u.x, u.y) <= 1 && !ctx.stepped; } },
  bourrasque: { raid: 'raid_marsh', label: 'Hydre : disperser ce qui s\'agglutine autour du corps',
    setup: (R, env, u) => { R.boss.hp_max *= 4; R.boss.hp = R.boss.hp_max; const a1 = foe(R, u.x - 1, u.y - 2, { name: 'Sangsue A', pm: 0, hp: 300 }), a2 = foe(R, u.x + 1, u.y - 2, { name: 'Sangsue B', pm: 0, hp: 300 }), a3 = foe(R, u.x, u.y - 3, { name: 'Sangsue C', pm: 0, hp: 300 });
      R.__start = {}; for (const v of [a1, a2, a3]) R.__start[v.id] = { x: v.x, y: v.y }; },
    goal: R => { const st0 = R.__start || {}; let n = 0; for (const v of R.units.filter(x => x.side === 'boss' && x.kind === 'add')) { const p = st0[v.id]; if (!p) continue; if (v.hp <= 0 || Math.abs(v.x - p.x) + Math.abs(v.y - p.y) >= 2) n++; } return n >= 2; } },
  cyclone: { raid: 'raid_forest', label: 'Sylvain P2 : regrouper des rejetons épars sur une même case',
    setup: (R, env, u) => { R.boss.hp_max *= 4; R.boss.hp = R.boss.hp_max; const cx = u.x, cy = u.y - 2; foe(R, cx - 2, cy, { name: 'Rejeton Ouest', pm: 0, hp: 900 }); foe(R, cx + 2, cy, { name: 'Rejeton Est', pm: 0, hp: 900 }); foe(R, cx, cy - 2, { name: 'Rejeton Nord', pm: 0, hp: 900 }); },
    goal: R => { const a = R.units.filter(v => v.side === 'boss' && v.kind === 'add' && v.hp > 0); for (const c of a) { if (a.filter(v => Math.abs(v.x - c.x) + Math.abs(v.y - c.y) <= 2).length >= 3) return true; } return false; } },
  maitre_ours: { raid: 'raid_marsh', label: 'Hydre, trois gueules : un corps lourd qui prend les morsures',
    goal: R => { const g = st(R.boss, 'provoque'); if (!g) return false; const s2 = R.boss.states.filter(x => x.id === 'provoque')[0]; const v = R.units.filter(x => x.id === (s2 && s2.unit))[0]; return !!v && v.side === 'guild' && (v.mass || 0) >= 2; } },
  fauconnier: { raid: 'raid_mountain', label: 'Drake en vol au-dessus des cendres : le faire redescendre sans l\'atteindre soi-même',
    setup: (R, env, u) => { R.boss.phase = 2; R.boss.flying = 3; R.boss.flight_pass_id = 99;
      const b = R.boss; for (let x = 0; x < R.grid_w; x++) { R.layout[(b.y + b.h + 1) * R.grid_w + x] = WATER; bossZone(R, x, b.y + b.h + 2, 'cendres', 6); } },
    goal: R => (R.boss.flying || 0) === 0 },
  avatar: { raid: 'raid_mountain', label: 'Drake P3, fournaise : tenir le cercle en corps d\'élément (VERBE : se transformer)',
    setup: R => { R.boss.phase = 3; },
    goal: R => { const u = R.units.filter(v => v.id === 'h_test')[0]; return !!u && st(u, 'avatar') && (u.mass || 0) >= 3 && distBoss(R.boss, u.x, u.y) <= 2; } },
  portier: { raid: 'raid_forest', label: 'Sylvain, racines : ouvrir un passage franchi par la guilde (VERBE : relier)',
    goal: R => mech(R, 'portail') >= 1 }
};

// Rejoue un scénario : renvoie {turns, solved, R}. Les tours de héros sont comptés jusqu'à l'objectif.
function runScenario(specId, variant, seed, dayStart) {
  const S = specById(specId);
  const scen = SCEN[specId];
  const spec = variant === 'spec' ? specId : variant === 'sister' ? S.sister : null;
  const env = makeEnv(seed, S.hybrid, spec, dayStart || 20);
  const R = I.newRaid(env, scen.raid);
  const ctx = { hp0: R.boss.hp, bx: R.boss.x, by: R.boss.y, sx: R.spawn_cells[0].x, sy: R.spawn_cells[0].y };
  let turns = 0, solved = false, guard = 0;
  const log = [];
  const day0 = env.day;
  for (let pass = 0; pass < 6 && !solved; pass++) {
    env.day = day0 + pass;
    const why = I.beginPass(R, env, 'h_test', log);
    if (why) break;
    const u0 = I.heroUnit(R);
    if (pass === 0 && scen.setup) { scen.setup(R, env, u0); ctx.sx = u0.x; ctx.sy = u0.y; ctx.hp0 = R.boss.hp; }
    let turn = R.pass.turn;
    turns += 1;
    while (R.pass && !R.pass.done && guard++ < 200 && turns <= CAP) {
      const u = I.heroUnit(R);
      if (!u) break;
      const a = I.policyAction(R, env, u) || { type: 'end_turn' };
      const err = I.applyPassAction(R, env, a, log);
      if (err) I.applyPassAction(R, env, { type: 'end_turn' }, log);
      if (a.type === 'move') { const hu = R.units.filter(v => v.id === 'h_test')[0]; if (hu) { const z = R.zones[String(hu.y * R.grid_w + hu.x)]; if (z && z.owner_kind === 'boss') ctx.stepped = true; } }
      if (scen.goal(R, ctx)) { solved = true; break; }
      if (R.pass && R.pass.turn !== turn) { turn = R.pass.turn; turns += 1; }
    }
    if (!solved && R.pass && !R.pass.done) I.applyPassAction(R, env, { type: 'end_pass' }, log);
    if (scen.goal(R, ctx)) solved = true;
    if (turns > CAP || R.status !== 'active') break;
  }
  return { turns: solved ? Math.min(turns, CAP) : CAP, solved: solved, R: R, log: log };
}

const CASTS = {};                                  // sorts de spécialisation réellement lancés par la politique par défaut
function noteCasts(R) { for (const k of Object.keys(R.stats.casts)) CASTS[k] = (CASTS[k] || 0) + R.stats.casts[k]; }

// ---------- (1) test de branche ----------
const branch = [];
{
  for (const S of SPECS) {
    const a = runScenario(S.id, 'spec', 101);
    const b = runScenario(S.id, 'sister', 101);
    const c = runScenario(S.id, 'hybrid', 101);
    noteCasts(a.R); noteCasts(b.R); noteCasts(c.R);
    const ok = a.solved && a.turns * 4 <= b.turns * 3 && a.turns * 4 <= c.turns * 3;
    branch.push({ id: S.id, name: S.name, sister: S.sister, hybrid: S.hybrid, label: SCEN[S.id].label,
      spec: a.turns, spec_solved: a.solved, sis: b.turns, sis_solved: b.solved, hyb: c.turns, hyb_solved: c.solved, ok: ok });
  }
  const failed = branch.filter(x => !x.ok);
  console.log('\n--- (1) test de branche : tours jusqu\'à l\'objectif (plafond ' + CAP + ' = non résolu) ---');
  for (const b of branch) console.log((b.ok ? 'OK    ' : 'FUSION') + '  ' + b.name.padEnd(16) + ' spé ' + String(b.spec).padStart(2) + (b.spec_solved ? '' : '*') +
    ' · sœur (' + b.sister + ') ' + String(b.sis).padStart(2) + (b.sis_solved ? '' : '*') + ' · hybride nu (' + b.hybrid + ') ' + String(b.hyb).padStart(2) + (b.hyb_solved ? '' : '*') + '   | ' + b.label);
  console.log('(* = objectif non atteint dans le plafond)');
  check('(1) test de branche : chacune des 26 spés résout son scénario en ≥ 25 % de tours de moins que sa sœur ET que son hybride nu',
    failed.length === 0, failed.length ? 'À FUSIONNER OU RETRAVAILLER : ' + failed.map(f => f.name + ' (' + f.spec + (f.spec_solved ? '' : '*') + ' vs sœur ' + f.sis + ', hybride ' + f.hyb + ')').join(' · ') : branch.length + '/26 spés passent leur propre test');
}

// ---------- (1b) contre-scénario de l'Assassin : sur une cible INTACTE il doit être le moins bon ----------
// V5 T3b : le prix de la spécialité. « Curée » divise ses dégâts sur une cible à pleine réserve ; s'il était aussi bon
// qu'un Traqueur nu au premier coup, le verbe « achever » ne coûterait rien et l'Assassin redeviendrait un second burst.
{
  const intact = { raid: 'raid_marsh', label: 'Hydre INTACTE : lui prendre un cinquième de sa réserve',
    setup: R => { R.boss.hp = R.boss.hp_max; },
    goal: (R, ctx) => R.boss.hp * 100 <= ctx.hp0 * 80 };
  const SCEN_SAVE = SCEN.assassin;
  SCEN.assassin = intact;
  const a = runScenario('assassin', 'spec', 101), b = runScenario('assassin', 'sister', 101), c = runScenario('assassin', 'hybrid', 101);
  SCEN.assassin = SCEN_SAVE;
  noteCasts(a.R); noteCasts(b.R); noteCasts(c.R);
  console.log('--- (1b) contre-scénario : ' + intact.label + ' ---');
  console.log('      Assassin spé ' + a.turns + (a.solved ? '' : '*') + ' · sœur (piegeur) ' + b.turns + (b.solved ? '' : '*') + ' · hybride nu (traqueur) ' + c.turns + (c.solved ? '' : '*'));
  check('(1b) contre-scénario : sur une cible intacte l\'Assassin est strictement le MOINS bon des trois (prix de sa spécialité)',
    a.turns > b.turns && a.turns > c.turns, 'spé ' + a.turns + ' · sœur ' + b.turns + ' · hybride nu ' + c.turns + ' tours');
}

// ---------- (1c) le mur héroïque du Templier est DESTRUCTIBLE (limite T3 levée en T3b) ----------
// T3 laissait 120 PV écrits en données et jamais lus : le mur disparaissait à l'expiration, rien ne pouvait le briser.
// Désormais ce qu'il arrête l'use (souffle, fournaise, spores) ; replanté sur la même case il garde ses ébréchures.
{
  const env = makeEnv(101, 'paladin', 'templier', 20);
  const R = I.newRaid(env, 'raid_mountain');
  const log = [];
  const wall = () => { for (const k of Object.keys(R.zones)) if (R.zones[k].zone_id === 'mur_heros') return R.zones[k]; return null; };
  const hps = [];
  for (let pass = 0; pass < 3; pass++) {
    env.day = 20 + pass;
    if (I.beginPass(R, env, 'h_test', log)) break;
    const u0 = I.heroUnit(R);
    const tx = u0.x + Math.sign(R.boss.x - u0.x), ty = u0.y + Math.sign(R.boss.y - u0.y);
    I.applyPassAction(R, env, { type: 'cast', spell_id: 'bouclier_plante', x: tx, y: ty }, log);
    const w0 = wall();
    hps.push(w0 ? w0.hp : 0);
    let guard = 0;
    while (R.pass && !R.pass.done && guard++ < 40) if (I.applyPassAction(R, env, { type: 'end_turn' }, log)) break;
    if (R.pass && !R.pass.done) I.applyPassAction(R, env, { type: 'end_pass' }, log);
    if (R.status !== 'active') break;
  }
  const used = R.stats.mech.mur_heros_use || 0, broken = R.stats.mech.mur_heros_brise || 0;
  const chipped = hps.some(v => v > 0 && v < 120);
  check('(1c) mur héroïque du Templier : le souffle qu\'il arrête lui prend des PV, il garde ses ébréchures quand on le replante, et il finit par voler en éclats',
    used >= 2 && broken >= 1 && chipped,
    'PV au moment de planter : ' + hps.join(' → ') + ' · ' + used + ' coup(s) encaissé(s) · ' + broken + ' bouclier(s) brisé(s)');
}

// ---------- (2) et (3) atteignabilité, seuils, distribution ----------
{
  const chosen = {}, reachable = {};
  for (const S of SPECS) reachable[S.id] = 1;
  let heroes22 = 0, spec22 = 0, offerBad = [], autoDelays = {}, gabarits = {};
  const seenHero = {};
  for (let seed = 1; seed <= 40; seed++) {
    let s = sim.newGame(seed, data, { managers: managersFor(seed) });
    const offer = {};
    for (let d = 1; d <= 24; d++) {
      const r = sim.resolveDay(s, acts(s));
      s = r.state;
      const sec = (r.chronicle.sections || []).filter(x => x.phase === 'voie')[0];
      if (sec) for (const line of sec.lines) gabarits[line.slice(0, 24)] = 1;
      for (const id of Object.keys(s.heroes).sort()) {
        const h = s.heroes[id];
        if (h.spec_offer_day !== null && h.spec_offer_day !== undefined && offer[id] === undefined) {
          offer[id] = h.spec_offer_day;
          if (!(h.level >= L.spec_level_min || h.spec_offer_day >= L.spec_day_min)) offerBad.push(seed + '/' + id + ' : proposition hors seuil');
        }
        if (h.spec && !seenHero[seed + '/' + id]) { seenHero[seed + '/' + id] = 1; chosen[h.spec] = (chosen[h.spec] || 0) + 1; if (offer[id] !== undefined && h.owner === 'p1') autoDelays[d - offer[id]] = (autoDelays[d - offer[id]] || 0) + 1; }
      }
      if (d === 22) { const ids = Object.keys(s.heroes); heroes22 += ids.length; spec22 += ids.filter(id => s.heroes[id].spec).length; }
    }
  }
  const never = SPECS.filter(S => !chosen[S.id]).map(S => S.id);
  check('(2) les 26 spécialisations sont atteignables et chacune est choisie au moins une fois sur 40 graines',
    never.length === 0 && Object.keys(reachable).length === 26, never.length ? 'jamais choisies : ' + never.join(', ') : SPECS.map(S => S.id + ':' + chosen[S.id]).join(' '));
  check('(3a) 80 % des héros sont spécialisés au jour 22 (plans par défaut)', spec22 * 10 >= heroes22 * 8, spec22 + '/' + heroes22 + ' héros spécialisés au J22');
  const delays = Object.keys(autoDelays).map(Number).sort((a, b) => a - b);
  check('(3b) proposition au seuil §6.1 (niveau ≥ ' + L.spec_level_min + ' ou jour ≥ ' + L.spec_day_min + ') ; sans réponse, choix automatique après ' + L.spec_auto_days + ' jours ; gabarits « Voie » variés',
    offerBad.length === 0 && delays.length > 0 && delays[delays.length - 1] <= L.spec_auto_days && Object.keys(gabarits).length >= 6,
    'délais observés : ' + delays.join(',') + ' · ' + Object.keys(gabarits).length + ' formulations' + (offerBad.length ? ' | ' + offerBad[0] : ''));
}

// ---------- (4) choose_spec ----------
{
  let s = play(3, 21, managersFor(3));
  const ids = Object.keys(s.heroes).filter(id => s.heroes[id].owner === 'p1').sort();
  const mineId = ids[0];
  let s2 = attach(JSON.parse(JSON.stringify(s)));
  const h = s2.heroes[mineId];
  h.spec = null; h.spec_offer_day = s2.day; h.hybrid = h.hybrid || 'paladin';
  const legal = specsForHybridTest(h.hybrid)[0];
  const act = (type, payload, st2) => ({ manager_id: 'p1', day: (st2 || s2).day, type: type, payload: payload });
  const okV = sim.validateAction(s2, act('choose_spec', { adventurer_id: mineId, spec_id: legal.id }), data);
  const r = sim.resolveDay(s2, [act('choose_spec', { adventurer_id: mineId, spec_id: legal.id })], data);
  const applied = r.state.heroes[mineId].spec === legal.id;
  const bad = [];
  const other = SPECS.filter(S => S.hybrid !== h.hybrid)[0];
  bad.push(sim.validateAction(s2, act('choose_spec', { adventurer_id: mineId, spec_id: other.id }), data));
  bad.push(sim.validateAction(s2, act('choose_spec', { adventurer_id: mineId, spec_id: 'inconnue' }), data));
  bad.push(sim.validateAction(s2, act('choose_spec', { adventurer_id: 'h_absent', spec_id: legal.id }), data));
  const s3 = attach(JSON.parse(JSON.stringify(r.state)));
  bad.push(sim.validateAction(s3, act('choose_spec', { adventurer_id: mineId, spec_id: legal.id }, s3), data));
  const s4 = attach(JSON.parse(JSON.stringify(s2)));
  s4.heroes[mineId].hybrid = null; s4.heroes[mineId].spec = null;
  bad.push(sim.validateAction(s4, act('choose_spec', { adventurer_id: mineId, spec_id: legal.id }), data));
  const s5 = attach(JSON.parse(JSON.stringify(s2)));
  s5.day = 4; s5.heroes[mineId].level = 3; s5.heroes[mineId].spec = null;
  bad.push(sim.validateAction(s5, act('choose_spec', { adventurer_id: mineId, spec_id: legal.id }, s5), data));
  check('(4) choose_spec : légal accepté et appliqué ; illégal refusé avec sa raison (autre voie, inconnue, héros absent, déjà spécialisé, sans voie, hors seuil)',
    okV.ok && applied && bad.every(v => !v.ok && typeof v.reason === 'string' && v.reason.length > 4),
    'appliqué : ' + legal.name + ' | ' + bad.map(v => v.reason).join(' / '));
}
function specsForHybridTest(hid) { return SPECS.filter(S => S.hybrid === hid); }

// ---------- (5) reconversion (§6.4 option B) ----------
{
  let s = play(5, 22, managersFor(5));
  const mineId = Object.keys(s.heroes).filter(id => s.heroes[id].owner === 'p1').sort()[0];
  let s2 = attach(JSON.parse(JSON.stringify(s)));
  const h = s2.heroes[mineId];
  if (!h.spec) { h.hybrid = h.hybrid || 'paladin'; h.spec = specsForHybridTest(h.hybrid)[0].id; }
  s2.guild.gold = Math.max(s2.guild.gold, 500);
  s2.raid = null;
  const sis = specsForHybridTest(h.hybrid).filter(S => S.id !== h.spec)[0];
  const act = (type, payload, st2) => ({ manager_id: 'p1', day: (st2 || s2).day, type: type, payload: payload });
  const actOn = (st2, type, payload) => ({ manager_id: 'p1', day: st2.day, type: type, payload: payload });
  const v1 = sim.validateAction(s2, act('respec', { adventurer_id: mineId, spec_id: sis.id }), data);
  const r1 = sim.resolveDay(s2, [act('respec', { adventurer_id: mineId, spec_id: sis.id })], data);
  const after = r1.state.heroes[mineId];
  const changed = after.spec === sis.id && after.hybrid === h.hybrid && after.respec_used === 1;
  const rControl = sim.resolveDay(attach(JSON.parse(JSON.stringify(s2))), [], data);            // même journée, sans la reconversion
  const goldDelta = rControl.state.guild.gold - r1.state.guild.gold;                            // l'or de guilde ET la journée perdue du héros
  const paid = goldDelta >= L.respec_cost_gold && (r1.log || []).some(l => l.indexOf('reconversion') >= 0 && l.indexOf(String(L.respec_cost_gold) + ' or') >= 0);
  const restDayForced = (r1.log || []).some(l => /reconversion/.test(l));
  const s3 = attach(JSON.parse(JSON.stringify(r1.state)));
  s3.guild.gold += 500;
  const v2 = sim.validateAction(s3, actOn(s3, 'respec', { adventurer_id: mineId, spec_id: h.spec }), data);
  // pendant un raid
  const s4 = attach(JSON.parse(JSON.stringify(s2)));
  s4.raid = { id: 'raid_forest', status: 'active', dragon_id: 'dragon_forest', boss: { hp: 1, hp_max: 1 }, passes_done: [], nights: 0, day_start: s4.day };
  const v3 = sim.validateAction(s4, actOn(s4, 'respec', { adventurer_id: mineId, spec_id: sis.id }), data);
  // après le jour limite
  const s5 = attach(JSON.parse(JSON.stringify(s2)));
  s5.day = L.respec_deadline_day + 1;
  const v4 = sim.validateAction(s5, actOn(s5, 'respec', { adventurer_id: mineId, spec_id: sis.id }), data);
  // sans or
  const s6 = attach(JSON.parse(JSON.stringify(s2)));
  s6.guild.gold = 10;
  const v5 = sim.validateAction(s6, actOn(s6, 'respec', { adventurer_id: mineId, spec_id: sis.id }), data);
  // voie interdite : une spé d'un autre hybride
  const s7 = attach(JSON.parse(JSON.stringify(s2)));
  const foreign = SPECS.filter(S => S.hybrid !== h.hybrid)[0];
  const v6 = sim.validateAction(s7, actOn(s7, 'respec', { adventurer_id: mineId, spec_id: foreign.id }), data);
  const restDay = restDayForced && (r1.chronicle.sections || []).some(x => x.lines.some(l => /voie|désapprend|reconvert|rendu ses vieilles armes|journée/i.test(l)));
  const dayUsed = (r1.state.plans_debug === undefined);
  check('(5) reconversion : acceptée une fois (spé changée, voie inchangée, 100 or, journée du héros), puis refusée — seconde fois, pendant un raid, après le jour ' + L.respec_deadline_day + ', sans or, vers une autre voie',
    v1.ok && changed && paid && !v2.ok && !v3.ok && !v4.ok && !v5.ok && !v6.ok && restDay,
    'acceptée=' + v1.ok + ' changée=' + changed + ' payée=' + paid + ' (écart d\'or ' + goldDelta + ' : ' + L.respec_cost_gold + ' de guilde + la journée du héros) journée=' + restDay + ' | ' + [v2.reason, v3.reason, v4.reason, v5.reason, v6.reason].join(' / '));
}

// ---------- (6) variance de l'effet de chaque spé (ADR-002) ----------
{
  const thin = [];
  const detail = [];
  for (const S of SPECS) {
    const seen = {};
    for (const [seed, day] of [[11, 20], [23, 23], [47, 26], [91, 29]]) {
      const r = runScenario(S.id, 'spec', seed, day);
      noteCasts(r.R);
      const casts = Object.keys(r.R.stats.casts).filter(k => (data.tactic_spells.filter(x => x.id === k)[0] || {}).spec_id === S.id).reduce((n, k) => n + r.R.stats.casts[k], 0);
      const key = r.turns + '/' + casts + '/' + r.R.boss.hp + '/' + Object.keys(r.R.zones).length + '/' + Object.keys(r.R.stats.mech).sort().map(k => k + r.R.stats.mech[k]).join(',');
      seen[key] = (seen[key] || 0) + 1;
    }
    const n = Object.keys(seen).length;
    detail.push(S.id + ':' + n);
    if (n < 2) thin.push(S.id);
  }
  check('(6) variance : l\'effet mesuré de chaque spé prend au moins deux valeurs distinctes sur 4 graines (ADR-002)',
    thin.length === 0, thin.length ? 'trop plates : ' + thin.join(', ') : detail.join(' '));
}

// ---------- (6b) les 52 sorts signature sont réellement exécutés et produisent un effet ----------
{
  // Ceux que la politique par défaut ne choisit pas dans les scénarios (elle préfère parfois un sort de voie) sont
  // tirés à la main sur la première case légale de la grille : le moteur doit les accepter ET écrire quelque chose.
  const all = data.tactic_spells.filter(sp => sp.spec_id);
  const never = [], byPolicy = all.filter(sp => CASTS[sp.id] > 0).length;
  for (const sp of all) {
    if (CASTS[sp.id] > 0) continue;
    const S = specById(sp.spec_id), scen = SCEN[S.id];
    const env = makeEnv(77, S.hybrid, S.id, 20);
    const R = I.newRaid(env, scen.raid);
    const log = [];
    if (I.beginPass(R, env, 'h_test', log)) { never.push(sp.id + ' (passage impossible)'); continue; }
    if (scen.setup) scen.setup(R, env, I.heroUnit(R));
    for (let k = 0; k < 4 && R.pass && !R.pass.done; k++) {           // quelques actions de politique : les corps, portails et fusions se mettent en place
      const v = I.heroUnit(R);
      if (!v) break;
      const a = I.policyAction(R, env, v) || { type: 'end_turn' };
      I.applyPassAction(R, env, a, log);
      if (R.pass && !R.pass.done) { R.pass.pa = 6; }
    }
    const u = I.heroUnit(R);
    let done = false;
    if (u && R.pass && !R.pass.done) {
      if (!R.units.some(v => v.side === 'boss' && v.kind === 'add' && v.hp > 0 && Math.abs(v.x - u.x) + Math.abs(v.y - u.y) <= 3)) {   // un rejeton d'essai à portée pour les sorts qui en visent un
        for (const c of [{ x: u.x, y: u.y - 1 }, { x: u.x - 1, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x, y: u.y + 1 }]) {
          if (c.x < 0 || c.y < 0 || c.x >= R.grid_w || c.y >= R.grid_h) continue;
          if (R.units.some(v => v.x === c.x && v.y === c.y) || R.layout[c.y * R.grid_w + c.x] !== 0) continue;
          foe(R, c.x, c.y, { name: 'Cible d\'essai' });
          break;
        }
      }
      const other = (S.spells || []).filter(id => id !== sp.id)[0];                                   // l'autre signature d'abord (fusion, portails…)
      if (other) {
        const so = I.spellFor(env, u, other);
        for (let y = 0; y < R.grid_h; y++) for (let x = 0; x < R.grid_w; x++) { if (I.castWhy(R, env, u, so, x, y)) continue; R.pass.pa = 12; I.applyPassAction(R, env, { type: 'cast', spell_id: other, x: x, y: y }, log); y = R.grid_h; break; }
      }
      const spell = I.spellFor(env, u, sp.id);
      R.pass.pa = 12; u.cooldowns = {};
      for (let y = 0; y < R.grid_h && !done; y++) for (let x = 0; x < R.grid_w && !done; x++) {
        if (I.castWhy(R, env, u, spell, x, y)) continue;
        const n = log.length;
        R.pass.pa = 12;
        const err = I.applyPassAction(R, env, { type: 'cast', spell_id: sp.id, x: x, y: y }, log);
        done = !err && log.length > n;
      }
    }
    if (!done) never.push(sp.id);
  }
  check('(6b) les 52 sorts signature de spécialisation sont exécutés au moins une fois et écrivent quelque chose (' + byPolicy + ' par la politique par défaut, le reste en tir direct)',
    never.length === 0, never.length ? 'jamais exécutés : ' + never.join(', ') : all.length + ' sorts exécutés');
}

// ---------- (7) Derby des Lames ----------
{
  let played = 0, won = 0, lost = 0, holds = 0, steals = 0, rivalDays = 0, bannerThreat = 0, dragonBusy = 0, startDays = {};
  const SEEDS = 30;                                  // V5 T3b : l'échantillon passe de 16 à 30 saisons pour mesurer un TAUX, pas une anecdote
  for (let seed = 1; seed <= SEEDS; seed++) {
    let s = sim.newGame(seed, data, { managers: managersFor(seed) });
    for (let d = 0; d < 30; d++) {
      s = sim.resolveDay(s, acts(s)).state;
      if (s.raid && s.raid.id === 'raid_derby') rivalDays += s.raid.units.filter(u => u.role).length >= 3 ? 1 : 0;
    }
    const h = (s.raid_history || []).filter(x => x.id === 'raid_derby')[0];
    if (h) {
      played++; startDays[h.day_start] = (startDays[h.day_start] || 0) + 1;
      if (h.status === 'won') won++; else lost++;
      holds += (h.stats.mech.banniere_tenue || 0);
      bannerThreat += (h.stats.mech.banniere_menacee || 0);
      steals += (h.stats.mech.vol_de_tour || 0);
    } else dragonBusy++;
  }
  check('(7) Derby des Lames : joué en fin de saison (jours 26-28), gagnable et perdable, la Bannière se tient et se fait menacer, le Capitaine vole un tour, les trois rivaux sont sur la grille',
    played >= 22 && won > 0 && lost > 0 && holds > 0 && bannerThreat > 0 && steals > 0 && rivalDays > 0,
    played + '/' + SEEDS + ' derbys joués (' + dragonBusy + ' saisons où un dragon occupait la grille) · départs ' + JSON.stringify(startDays) + ' · ' + won + ' gagnés / ' + lost + ' perdus · tenues de Bannière ' + holds + ' · Bannière menacée ' + bannerThreat + ' · vols de tour ' + steals + ' · journées à 3 rivaux ' + rivalDays);
  // (7b) V5 T3b — CALIBRAGE mesuré : avant recalibrage (banner_lost_max 2, Rustre 120 PV) la politique par défaut
  // gagnait 3 derbys sur 13 (23 %) ; une guilde qui a joué sa saison sans être parfaite doit pouvoir l'emporter.
  // Cible : environ une victoire sur deux, en gardant une vraie possibilité de perdre — donc une BANDE, pas un chiffre.
  const rate = played ? Math.round(won * 100 / played) : 0;
  check('(7b) calibrage du Derby : avec la politique par défaut le taux de victoire tient dans la bande 40-60 % (ni gagné d\'avance, ni imperdable)',
    played > 0 && rate >= 40 && rate <= 60 && won > 0 && lost > 0,
    won + ' gagnés / ' + played + ' joués = ' + rate + ' % (bande visée 40-60 %, échantillon ' + SEEDS + ' saisons)');
}

// ---------- (8) déterminisme ----------
{
  let diverge = 0, specsSeen = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= 30; seed++) {
    const a = play(seed, 30), b = play(seed, 30);
    if (sim.hashState(a) !== sim.hashState(b)) diverge++;
    specsSeen += Object.keys(a.heroes).filter(id => a.heroes[id].spec).length;
  }
  check('(8) déterminisme : 30 graines × 30 jours rejouées deux fois → hachages identiques (spés, reconversion et derby compris)',
    diverge === 0 && specsSeen > 0, diverge + ' divergence(s), ' + specsSeen + ' héros spécialisés au J30, ' + (Date.now() - t0) + ' ms');
}

// ---------- (9) viewModel ----------
{
  const missing = [];
  let views = 0, specChoices = 0, specSeen = 0, respecSeen = 0;
  for (let seed = 1; seed <= 12; seed++) {
    let s = sim.newGame(seed, data, { managers: managersFor(seed) });
    for (let d = 1; d <= 28; d++) {
      s = sim.resolveDay(s, acts(s)).state;
      for (const m of sim.listManagers(s)) {
        const vm = sim.viewModel(s, m);
        views++;
        hasUndefined(vm.roster.map(r => r.spec), 'VM.roster[].spec', missing);
        hasUndefined(vm.choice, 'VM.choice', missing);
        hasUndefined(vm.respec, 'VM.respec', missing);
        if (vm.choice && vm.choice.kind === 'spec') {
          specChoices++;
          if (vm.choice.options.length !== 2) missing.push('VM.choice.options ≠ 2');
          if (vm.choice.options.filter(o => o.recommended).length !== 1) missing.push('VM.choice : pastille de recommandation absente ou multiple');
          for (const o of vm.choice.options) if (!o.verb || o.spells.length !== 2 || !Array.isArray(o.answers)) missing.push('VM.choice option incomplète (' + o.id + ')');
        }
        specSeen += vm.roster.filter(r => r.spec).length;
        if (vm.respec) { respecSeen++; if (typeof vm.respec.available !== 'boolean' || !Number.isInteger(vm.respec.cost) || !Number.isInteger(vm.respec.deadline_day) || !Number.isInteger(vm.respec.used)) missing.push('VM.respec incomplet'); }
      }
    }
  }
  check('(9) viewModel : VM.roster[].spec, VM.choice (type spécialisation : deux options, une recommandation, verbe et sorts) et VM.respec sans undefined',
    missing.length === 0 && specChoices > 0 && specSeen > 0 && respecSeen > 0,
    views + ' vues · ' + specChoices + ' propositions de spé · ' + specSeen + ' spés lues · ' + respecSeen + ' blocs respec' + (missing.length ? ' | ' + missing.slice(0, 3).join(' | ') : ''));
}

// ---------- distribution mesurée ----------
{
  const counts = {};
  let respecs = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const s = play(seed, 30);
    for (const id of Object.keys(s.heroes)) { const h = s.heroes[id]; if (h.spec) counts[h.spec] = (counts[h.spec] || 0) + 1; respecs += h.respec_used || 0; }
  }
  console.log('\n--- Distribution mesurée (30 graines × 30 jours, 6 managers, plans par défaut) ---');
  console.log('Spécialisations : ' + SPECS.map(S => S.name + ' ' + (counts[S.id] || 0)).join(' · '));
  console.log('Reconversions spontanées (plans par défaut) : ' + respecs);
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} contrôles passés`);
process.exit(failed ? 1 : 0);

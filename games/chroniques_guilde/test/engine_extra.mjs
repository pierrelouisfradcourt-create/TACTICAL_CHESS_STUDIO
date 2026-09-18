// Banc d'invariants du moteur « Chroniques de Guilde » — preuve par exécution, moteur seul.
// Usage : node test/engine_extra.mjs   (code de sortie 1 si un contrôle échoue)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));

const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
function allHeroes(state) { return Object.keys(state.heroes).sort().map(id => state.heroes[id]); }
function defaultActions(state) { let a = []; for (const m of sim.listManagers(state)) a = a.concat(sim.planDefaults(state, m)); return a; }
function stepDay(state) { return sim.resolveDay(state, defaultActions(state)); }

// ---- 1. Invariants d'état sur 12 graines × 30 jours ----
const bad = [];
let chronicleLines = [];
for (let seed = 11; seed <= 22; seed++) {
  let state = sim.newGame(seed, data, {});
  for (let d = 0; d < 30; d++) {
    const before = sim.hashState(state);
    const r = stepDay(state);
    if (sim.hashState(state) !== before) bad.push(`graine ${seed} jour ${d + 1} : resolveDay a muté son entrée`);
    state = r.state;
    if (state.guild.gold < 0) bad.push(`graine ${seed} j${state.day} : or de guilde négatif`);
    for (const m of Object.keys(state.purses)) if (state.purses[m] < 0) bad.push(`graine ${seed} j${state.day} : bourse ${m} négative`);
    for (const rid of Object.keys(state.warehouse)) if (state.warehouse[rid] < 0) bad.push(`graine ${seed} : entrepôt ${rid} négatif`);
    for (const m of Object.keys(state.inventories)) for (const rid of Object.keys(state.inventories[m].resources)) if (state.inventories[m].resources[rid] < 0) bad.push(`graine ${seed} : inventaire ${m}/${rid} négatif`);
    const used = Object.values(state.warehouse).reduce((a, b) => a + b, 0);
    const cap = data.constants.warehouse_capacity[state.buildings.warehouse];
    if (used > cap) bad.push(`graine ${seed} j${state.day} : entrepôt ${used} > capacité ${cap}`);
    for (const h of allHeroes(state)) {
      if (h.fatigue < 0 || h.fatigue > 100) bad.push(`${h.id} fatigue ${h.fatigue}`);
      if (h.morale < 0 || h.morale > 100) bad.push(`${h.id} moral ${h.morale}`);
      if (h.form < 0 || h.form > 100) bad.push(`${h.id} forme ${h.form}`);
      if (h.injury.days_left < 0 || (h.injury.severity === 0) !== (h.injury.days_left === 0)) bad.push(`${h.id} blessure incohérente ${JSON.stringify(h.injury)}`);
      if (h.level < 1 || h.level > 20) bad.push(`${h.id} niveau ${h.level}`);
      if (h.xp < data.xp_table[h.level]) bad.push(`${h.id} xp ${h.xp} < seuil du niveau ${h.level}`);
      if (h.level < 20 && h.xp >= data.xp_table[h.level + 1]) bad.push(`${h.id} xp ${h.xp} >= seuil du niveau ${h.level + 1} sans montée`);
      for (const slot of Object.keys(h.equipment)) { const uid = h.equipment[slot]; if (uid && !state.inventories[h.owner].items.some(x => x.uid === uid)) bad.push(`${h.id} porte un objet absent (${uid})`); }
    }
    const c = r.chronicle;
    const n = c.sections.reduce((s, x) => s + x.lines.length, 0);
    chronicleLines.push(n);
    if (n < 25 || n > 60) bad.push(`graine ${seed} j${c.day} : ${n} lignes de chronique`);
    if (!c.headline || !c.title) bad.push(`graine ${seed} j${c.day} : chronique sans titre/instant`);
    if (c.expedition && !['succès', 'échec', 'retraite', 'aucune'].includes(c.expedition.outcome)) bad.push(`issue d'expédition invalide ${c.expedition.outcome}`);
    if (JSON.stringify(state).includes('undefined')) bad.push(`graine ${seed} : undefined sérialisé`);
  }
  if (!state.season_report || !state.season_report.lines.length) bad.push(`graine ${seed} : pas de bilan de saison au jour 30`);
  if (!state.derby.last || state.derby.last.day !== 28) bad.push(`graine ${seed} : derby du jour 28 absent`);
}
check('or, bourses, entrepôt et inventaires jamais négatifs ; fatigue/moral/forme dans [0,100]', bad.length === 0, bad.slice(0, 6).join(' | '));
check('xp cohérent avec le niveau (12 graines × 30 jours)', !bad.some(x => x.includes('xp')), bad.filter(x => x.includes('xp')).slice(0, 3).join(' | '));
check('resolveDay ne mute jamais son entrée', !bad.some(x => x.includes('muté')));
check('chronique : 25 à 60 lignes chaque jour', !bad.some(x => x.includes('lignes de chronique')), `min ${Math.min(...chronicleLines)} max ${Math.max(...chronicleLines)}`);
check('bilan de saison au jour 30 et derby au jour 28', !bad.some(x => x.includes('bilan') || x.includes('derby')));

// ---- 2. PV jamais négatifs ni au-dessus du max pendant les combats (sonde interne pure) ----
let hpBad = 0, probes = 0, outcomes = {};
for (let seed = 1; seed <= 40; seed++) {
  let state = sim.newGame(seed, data, {});
  for (let d = 0; d < 6; d++) state = stepDay(state).state;
  for (let q = 0; q < 3; q++) {
    const probe = sim._internal.probeExpedition(state, q, seed * 100 + q);
    if (!probe) continue;
    probes++;
    outcomes[probe.outcome] = (outcomes[probe.outcome] || 0) + 1;
    for (const f of probe.party) if (f.hp < 0 || f.hp > f.hp_max || f.fatigue < 0 || f.fatigue > 100 || f.morale < 0 || f.morale > 100 || (f.ko && f.hp !== 0)) hpBad++;
    if (probe.counters.rooms_visited > probe.counters.rooms_total || probe.counters.rooms_cleared > probe.counters.rooms_visited) hpBad++;
  }
}
check('PV dans [0, max], KO ⇔ PV 0, compteurs de salles cohérents (' + probes + ' expéditions sondées)', hpBad === 0, JSON.stringify(outcomes));

// ---- 3. Déterminisme : 200 graines × 3 jours rejouées deux fois ----
function run3(seed) { let s = sim.newGame(seed, data, {}); const h = []; for (let d = 0; d < 3; d++) { s = stepDay(s).state; h.push(sim.hashState(s)); } return h.join(','); }
let diverge = 0;
const t0 = Date.now();
for (let seed = 1000; seed < 1200; seed++) if (run3(seed) !== run3(seed)) diverge++;
check('200 graines × 3 jours rejouées deux fois : hachages identiques', diverge === 0, `${diverge} divergence(s), ${Date.now() - t0} ms`);
check('deux graines voisines divergent', run3(1000) !== run3(1001));

// ---- 4. Robustesse de validateAction (jamais d'exception) ----
const s0 = sim.newGame(5, data, {});
const garbage = [null, undefined, 42, 'x', {}, { manager_id: 'p1' }, { manager_id: 'p1', day: 1, type: 'assign' }, { manager_id: 'p1', day: 1, type: 'assign', payload: null },
  { manager_id: 'p1', day: 1, type: 'buy', payload: { item_id: 'nope' } }, { manager_id: 'p1', day: 1, type: 'deposit', payload: { resource_id: 'wood', qty: 1.5 } },
  { manager_id: 'p1', day: 1, type: 'decorate', payload: { decoration_id: 'banc', x: -1, y: 0 } }, { manager_id: 'ai_prudent', day: 2, type: 'vote_quest', payload: {} }];
let threw = 0, shaped = 0;
for (const g of garbage) { try { const v = sim.validateAction(s0, g); if (v && v.ok === false && typeof v.reason === 'string' && v.reason.length) shaped++; } catch (e) { threw++; } }
check('validateAction : 12 actions pourries → {ok:false, reason} sans exception', threw === 0 && shaped === garbage.length, `${shaped}/${garbage.length}`);
const badAct = { manager_id: 'p1', day: 1, type: 'buy', payload: { item_id: 'w_marteau_ancetres' } };
const rr = sim.resolveDay(s0, [badAct]);
check('action invalide dans resolveDay : ignorée, raison dans notices et log', rr.state.notices.length >= 1 && rr.log.some(l => l.startsWith('REJET')));

// ---- 5. Forme du modèle de vue (tous les champs du contrat présents) ----
const vmKeys = ['day', 'season_length', 'seed', 'hash', 'is_season_over', 'manager', 'managers', 'guild', 'roster', 'quest_board', 'buildings', 'construction', 'forge', 'tavern', 'quarter', 'market', 'inventory', 'chronicle', 'history', 'derby', 'season_report', 'notices'];
const rosterKeys = ['id', 'name', 'class_id', 'class_name', 'class_glyph', 'manager_id', 'manager_name', 'level', 'xp', 'xp_next', 'attributes', 'form', 'fatigue', 'morale', 'injury', 'traits', 'skills', 'equipment', 'activity_options', 'planned', 'status_label', 'is_available', 'is_mine'];
const questKeys = ['id', 'name', 'type_label', 'biome_name', 'difficulty', 'days', 'party_min', 'party_max', 'rewards_label', 'votes', 'voted_by_me', 'expires_in'];
const buildingKeys = ['id', 'name', 'level', 'max_level', 'description', 'decor', 'effect_label', 'next_cost', 'upgrade_gold', 'upgradable', 'votes', 'voted_by_me'];
const missing = [];
let st = sim.newGame(4242, data, {});
for (let d = 0; d < 8; d++) st = stepDay(st).state;
for (const m of sim.listManagers(st)) {
  const vm = sim.viewModel(st, m);
  for (const k of vmKeys) if (!(k in vm)) missing.push(m + ':' + k);
  for (const h of vm.roster) for (const k of rosterKeys) if (!(k in h)) missing.push('roster.' + k);
  for (const q of vm.quest_board) for (const k of questKeys) if (!(k in q)) missing.push('quest.' + k);
  for (const b of vm.buildings) { for (const k of buildingKeys) if (!(k in b)) missing.push('building.' + k); for (const k of ['glyph', 'color', 'size', 'smoke', 'light']) if (!(k in b.decor)) missing.push('decor.' + k); }
  for (const k of ['level', 'capacity', 'queue', 'recipes']) if (!(k in vm.forge)) missing.push('forge.' + k);
  for (const k of ['grid_w', 'grid_h', 'placed', 'catalog']) if (!(k in vm.quarter)) missing.push('quarter.' + k);
  for (const k of ['next_day', 'last']) if (!(k in vm.derby)) missing.push('derby.' + k);
  for (const k of ['gold', 'prestige', 'upkeep_per_day', 'storage_capacity', 'storage_used', 'storage']) if (!(k in vm.guild)) missing.push('guild.' + k);
  if (JSON.stringify(vm).includes('undefined')) missing.push('undefined dans le VM de ' + m);
  if (vm.roster.some(h => h.is_mine && !h.planned)) missing.push('planned manquant pour un héros de ' + m);
  if (vm.hash !== sim.hashState(st)) missing.push('hash du VM différent de hashState');
}
check('viewModel : forme exacte du contrat pour les 3 managers (aucun champ manquant, aucun undefined)', missing.length === 0, missing.slice(0, 5).join(' | '));
check('listManagers : p1 en premier puis les deux IA', JSON.stringify(sim.listManagers(st)) === JSON.stringify(['p1', 'ai_prudent', 'ai_audacieux']));
check('hashState : hexadécimal 8 caractères', /^[0-9a-f]{8}$/.test(sim.hashState(st)));

const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);

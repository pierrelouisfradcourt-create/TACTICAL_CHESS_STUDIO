// Banc V4 du moteur « Chroniques de Guilde » : dragons de biome (maîtrise), points d'action et journées composées,
// savoir-faire, missions solo, mort/héritier, défaite — preuve par exécution, moteur seul. Remplace engine_v3_check.mjs
// (le dragon n'est plus calendaire). Usage : node test/engine_v4_check.mjs   (code de sortie 1 si un contrôle échoue)
// 30 graines × 30 jours, 5 managers (un héros chacun), plans par défaut.
// Adaptation V5 T1 (2026-09-18, mission « V5 tranche T1 ») — SEULS les contrôles devenus faux par conception ont changé :
// le dragon de la forêt (Sylvain, fiche data.raids) se joue désormais en raid tactique persistant (state.raid, plusieurs jours) :
//   · VM.threat vaut phase 'raid' tant que le raid est actif (au lieu de 'today' le jour d'attaque puis null) ;
//   · l'activité `defend` est refusée pendant un raid (« le village est en raid ») et remplacée par `raid` ;
//   · l'issue de la menace (threat.outcome, chronicle.threat, retour du dragon) n'est connue que le jour où le raid se clôt
//     (won → 'vaincu', lost → 'ravage' au 4e soir), et la chronique porte une section « Raid » à la place de « Menace ».
// Les dragons du mont et du marais restent en auto-combat V4 : leurs contrôles sont inchangés.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));

const MANAGERS = [
  { id: 'p1', name: 'Vous', kind: 'human', profile: 'humain', class_id: 'warrior' },
  { id: 'f_anselme', name: 'Anselme', kind: 'ai', profile: 'prudent', class_id: 'cleric' },
  { id: 'f_roxane', name: 'Roxane', kind: 'ai', profile: 'audacieux', class_id: 'ranger' },
  { id: 'f_bastien', name: 'Bastien', kind: 'ai', profile: 'audacieux', class_id: 'rogue' },
  { id: 'f_maelle', name: 'Maëlle', kind: 'ai', profile: 'prudent', class_id: 'mage' }
];
const SEEDS = 30, DAYS = 30, WAKE_DAY_MIN = data.constants.dragon_wake_day_min;
const DRAGON_MATS = data.resources.filter(r => r.dragon).map(r => r.id);
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
function defaultActions(state) { let a = []; for (const m of sim.listManagers(state)) a = a.concat(sim.planDefaults(state, m)); return a; }
function heroes(state) { return Object.keys(state.heroes).sort().map(id => state.heroes[id]); }
function hasUndefined(v, p, out, depth = 0) {
  if (depth > 30) return;
  if (v === undefined) { out.push(p); return; }
  if (Array.isArray(v)) v.forEach((x, i) => hasUndefined(x, p + '[' + i + ']', out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) hasUndefined(v[k], p + '.' + k, out, depth + 1);
}
function walkNumbers(v, p, out, depth = 0) {
  if (depth > 40) return;
  if (typeof v === 'number') { if (!Number.isInteger(v) || Number.isNaN(v)) out.push(p + '=' + v); }
  else if (Array.isArray(v)) v.forEach((x, i) => walkNumbers(x, p + '[' + i + ']', out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walkNumbers(v[k], p + '.' + k, out, depth + 1);
}
function dragonMats(state) {
  let n = 0;
  for (const r of DRAGON_MATS) { n += state.warehouse[r] || 0; for (const m of Object.keys(state.inventories)) n += state.inventories[m].resources[r] || 0; }
  return n;
}
function threatOn(state, day) { return state.threats.filter(t => t.day === day && t.outcome === null)[0] || null; }

const bad = [];
const outcomes = { vaincu: 0, 'repoussé': 0, ravage: 0 };
const wakesPerSeed = [], firstAttackDays = [], attackDays = [], agesAtEnd = [];
let hashMismatch = 0, presageOk = 0, presageExpected = 0, defendOk = 0, defendRefused = 0, defendTried = 0;
let vmOk = 0, vmChecked = 0, chronicleTotals = [], menaceLines = [];
let raidDays = 0, raidsStarted = 0, raidsWon = 0, raidsLost = 0, raidPasses = 0, raidKo = 0, raidDurations = [], raidLines = [], raidDayChecks = 0, raidDayOk = 0, raidsUnresolved = 0;
let legendaryPerWin = 0, wins = 0, legendaryDupes = 0, matsBeforeWin = 0, matsBeforeChecks = 0, matsAfterWin = 0;
let deaths = 0, heroesEver = 0, heirsExpected = 0, heirsOfferNextDay = 0, heirsRecruited = 0, collapses = 0;
let soloDone = 0, soloOk = 0, soloInjuries = 0, soloLines = 0;
let compositeDays = 0, sampleWinState = null, sampleWinBiome = null;
const heroSnapshots = [];   // { seed, class_id, level, crafts }
const perSeed = [];

function runSeason(seed) {
  let state = sim.newGame(seed, data, { managers: MANAGERS });
  const hashes = [];
  for (let d = 0; d < DAYS; d++) { state = sim.resolveDay(state, defaultActions(state)).state; hashes.push(sim.hashState(state)); }
  return { state, hashes };
}

for (let seed = 1; seed <= SEEDS; seed++) {
  const A = runSeason(seed), B = runSeason(seed);
  if (A.hashes.join() !== B.hashes.join()) hashMismatch++;
  let state = sim.newGame(seed, data, { managers: MANAGERS });
  if (state.threats.length) bad.push(`graine ${seed} : menace planifiée à la création (le dragon n'est plus calendaire)`);
  let prevAge = 0, seenLegendary = {}, seedWins = 0, seedDeaths = 0, pendingHeirs = [], seedOut = [], everIds = {};
  for (const h of heroes(state)) everIds[h.id] = 1;
  for (let d = 0; d < DAYS; d++) {
    const day = state.day;
    const threat = threatOn(state, day);
    const hero = heroes(state).filter(h => h.owner === 'p1')[0];
    // ---- Modèle de vue V4 pour les 5 managers ----
    for (const m of sim.listManagers(state)) {
      const vm = sim.viewModel(state, m);
      vmChecked++;
      const und = []; hasUndefined(vm, 'vm', und);
      let ok = und.length === 0;
      if (!Array.isArray(vm.biomes) || vm.biomes.length !== 3 || !vm.biomes.every(b => ['id', 'name', 'mastery', 'mastery_needed', 'dragon'].every(k => k in b) && b.dragon && ['id', 'name', 'state', 'next_day', 'legendary_left'].every(k => k in b.dragon) && ['dormant', 'awake', 'slain', 'repelled'].includes(b.dragon.state))) { ok = false; bad.push(`graine ${seed} j${day} : VM.biomes non conforme`); }
      if (!Array.isArray(vm.solo_board) || !vm.solo_board.every(s => ['id', 'name', 'class_id', 'class_name', 'difficulty', 'cost_ap', 'rewards_label', 'risk_label'].every(k => k in s) && s.cost_ap === 2)) { ok = false; bad.push(`graine ${seed} j${day} : VM.solo_board non conforme`); }
      if (!('defeat' in vm) || !Array.isArray(vm.village.graves) || !Array.isArray(vm.village.trophies) || !Number.isInteger(vm.village.hall_level) || !Array.isArray(vm.guild.chest)) { ok = false; bad.push(`graine ${seed} j${day} : VM.village/guild/defeat non conforme`); }
      for (const r of vm.roster) {
        if (!Number.isInteger(r.ap_max) || !Number.isInteger(r.ap_today) || r.ap_today < 1 || r.ap_today > r.ap_max || !Array.isArray(r.slots_planned) || !Array.isArray(r.presets) || !Array.isArray(r.crafts) || r.crafts.length !== 6 || r.is_dead !== false) { ok = false; bad.push(`graine ${seed} j${day} : VM.roster PA/crafts non conforme (${r.id})`); break; }
        if (!r.presets.every(p => ['id', 'label', 'slots', 'available', 'reason'].every(k => k in p)) || !r.presets.some(p => p.id === 'recuperation' && p.available)) { ok = false; bad.push(`graine ${seed} j${day} : presets non conformes (${r.id})`); break; }
        if (!r.activity_options.every(o => Number.isInteger(o.cost_ap))) { ok = false; bad.push(`graine ${seed} j${day} : cost_ap manquant (${r.id})`); break; }
        if (r.activity_options.some(o => o.activity === 'gather' && o.targets.some(t => DRAGON_MATS.includes(t.id)))) { ok = false; bad.push(`graine ${seed} j${day} : matériau de dragon récoltable`); break; }
        if (r.is_mine && r.slots_planned.length && !r.slots_planned.every(s => 'activity' in s && 'target' in s && typeof s.label === 'string')) { ok = false; bad.push(`graine ${seed} j${day} : slots_planned non conformes`); break; }
      }
      if (m === 'p1') {
        const T = vm.threat;
        if (state.raid && state.raid.status === 'active') { if (!T || T.phase !== 'raid' || T.dragon_id !== state.raid.dragon_id || !T.raid || T.raid.status !== 'active' || !Number.isInteger(T.raid.hp_pct)) { ok = false; bad.push(`graine ${seed} j${day} : VM.threat (raid) non conforme ${JSON.stringify(T)}`); } if (!vm.raid || !vm.raid.active || !vm.raid.grid || !vm.raid.boss) { ok = false; bad.push(`graine ${seed} j${day} : VM.raid absent pendant le raid`); } }
        else if (threat) { if (!T || T.phase !== 'today' || T.day !== day || T.biome_id !== threat.biome || T.dragon_id !== data.dragons[threat.biome].id || T.name !== data.dragons[threat.biome].name || typeof T.biome_name !== 'string') { ok = false; bad.push(`graine ${seed} j${day} : VM.threat (today) non conforme ${JSON.stringify(T)}`); } }
        else if (state.threats.some(t => t.presage_day === day && t.outcome === null)) { if (!T || T.phase !== 'presage') { ok = false; bad.push(`graine ${seed} j${day} : VM.threat (presage) non conforme`); } }
        else if (T !== null) { ok = false; bad.push(`graine ${seed} j${day} : VM.threat devrait être null`); }
      }
      if (ok) vmOk++; else if (und.length) bad.push(`graine ${seed} j${day} : undefined dans le VM de ${m} (${und.slice(0, 3).join(', ')})`);
    }
    // ---- defend : accepté le jour d'attaque, refusé sinon ----
    if (hero) {
      const v = sim.validateAction(state, { manager_id: 'p1', day, type: 'assign', payload: { adventurer_id: hero.id, activity: 'defend' } });
      const can = hero.injury.severity === 0 && hero.fatigue < 100;
      if (state.raid && state.raid.status === 'active') {   // V5 : pendant un raid, defend refusé et raid accepté (héros apte)
        const vr = sim.validateAction(state, { manager_id: 'p1', day, type: 'assign', payload: { adventurer_id: hero.id, activity: 'raid' } });
        raidDayChecks++;
        if (!v.ok && /raid/.test(v.reason) && (!can || vr.ok)) raidDayOk++; else bad.push(`graine ${seed} j${day} : defend/raid non conformes pendant le raid (${v.reason} / ${vr.reason})`);
      }
      else if (threat) { if (can && v.ok) defendOk++; else if (can) bad.push(`graine ${seed} j${day} : defend refusé le jour d'attaque (${v.reason})`); }
      else { defendTried++; if (!v.ok && /menace/.test(v.reason)) defendRefused++; else bad.push(`graine ${seed} j${day} : defend accepté hors attaque`); }
    }
    // ---- héritier attendu aujourd'hui à la taverne ----
    for (const ph of pendingHeirs.filter(x => x.day === day)) {
      const o = state.tavern.filter(t => t.heir_for === ph.owner)[0];
      if (o && o.cost === 0 && o.hero.traits.includes('heritier')) heirsOfferNextDay++; else bad.push(`graine ${seed} j${day} : héritier absent de la taverne pour ${ph.owner}`);
    }
    const acts = defaultActions(state);
    const r = sim.resolveDay(state, acts);
    const c = r.chronicle;
    state = r.state;
    for (const h of heroes(state)) everIds[h.id] = 1;
    chronicleTotals.push(c.sections.reduce((s, x) => s + x.lines.length, 0));
    // ---- journée composée observée (mêmes héros dans récolte + entraînement + forge ou solo) ----
    const secs = {}; for (const s of c.sections) secs[s.phase] = s.lines;
    if (secs.recolte && secs.entrainement && secs.forge) compositeDays++;
    // ---- présage / menace ----
    const presT = state.threats.filter(t => t.presage_day === day)[0];
    if (presT && presT.day === day + 1 && presT.outcome === null) { presageExpected++; if (c.summary.presage === data.dragons[presT.biome].name && secs.presage && secs.presage.length) presageOk++; else bad.push(`graine ${seed} j${day} : présage manquant (${c.summary.presage})`); }
    else if (c.summary.presage !== null) bad.push(`graine ${seed} j${day} : présage inattendu`);
    if (c.raid) {   // V5 : journée de raid (section Raid, issue différée au jour de clôture)
      raidDays++;
      if (threat && day === c.raid.day_start) { attackDays.push(day); raidsStarted++; if (day < WAKE_DAY_MIN + 1) bad.push(`graine ${seed} : attaque le jour ${day} (< J${WAKE_DAY_MIN + 1})`); }
      if (!secs.raid || !secs.raid.length) bad.push(`graine ${seed} j${day} : section Raid absente`); else raidLines.push(secs.raid.length);
      if (!Array.isArray(c.raid.passes) || !['active', 'won', 'lost'].includes(c.raid.status) || !Number.isInteger(c.raid.hp_pct)) bad.push(`graine ${seed} j${day} : chronicle.raid non conforme`);
      raidPasses += c.raid.passes.length; raidKo += c.raid.passes.filter(p => p.ko).length;
      if (c.raid.status !== 'active') {
        const t = state.threats.filter(x => x.dragon_id === c.raid.id.replace('raid_', 'dragon_') && x.outcome !== null).sort((a, b) => b.day - a.day)[0];
        const expect = c.raid.status === 'won' ? 'vaincu' : 'ravage';
        raidDurations.push(day - c.raid.day_start + 1);
        if (!t || t.outcome !== expect) bad.push(`graine ${seed} j${day} : issue de raid invalide (${t && t.outcome} ≠ ${expect})`); else { outcomes[t.outcome]++; seedOut.push(c.raid.day_start + '-' + day + ':' + t.outcome + '(raid)'); }
        const CT = c.threat;
        if (!CT || CT.type !== 'dragon' || CT.outcome !== expect || typeof CT.dragon_name !== 'string' || !Array.isArray(CT.defenders) || !Array.isArray(CT.loot) || !('building_hit' in CT) || !('legendary' in CT)) bad.push(`graine ${seed} j${day} : chronicle.threat (raid) non conforme`);
        if (!state.raid_history || !state.raid_history.some(r => r.day_end === day && r.status === c.raid.status)) bad.push(`graine ${seed} j${day} : raid non archivé`);
        if (c.raid.status === 'won') {
          wins++; seedWins++; raidsWon++;
          const dr = state.dragons[t ? t.biome : 'forest'];
          const raidDragonId = c.raid.id.replace('raid_', 'dragon_');   // T2 : dragon_forest | dragon_mountain | dragon_marsh
          if (dr.state !== 'slain' || !state.trophies.some(x => x.dragon_id === raidDragonId && x.day === day)) bad.push(`graine ${seed} j${day} : raid gagné non marqué slain / sans trophée`);
          if (CT && CT.legendary) { legendaryPerWin++; if (seenLegendary[CT.legendary]) legendaryDupes++; seenLegendary[CT.legendary] = 1; if (!CT.loot.some(l => l.includes(CT.legendary)) || !c.summary.legendary.includes(CT.legendary)) bad.push(`graine ${seed} j${day} : légendaire absent du butin/summary (raid)`); }
          else bad.push(`graine ${seed} j${day} : raid gagné sans légendaire`);
          if (dragonMats(state) < 1) bad.push(`graine ${seed} j${day} : raid gagné sans matériau de dragon`); else matsAfterWin++;
          if (!sampleWinState) { sampleWinState = state; sampleWinBiome = t ? t.biome : 'forest'; }
        } else {
          raidsLost++;
          const rb = t ? t.biome : 'forest';                                    // T2 : le biome du raid perdu, plus seulement la forêt
          const dr = state.dragons[rb], back = data.constants.dragon_return_ravage;
          const expectDay = day + back <= state.season_length ? day + back : null;
          if (dr.next_day !== expectDay || (expectDay && !state.threats.some(x => x.day === expectDay && x.outcome === null && x.biome === rb))) bad.push(`graine ${seed} j${day} : retour du dragon mal planifié après un raid perdu (${dr.next_day}, attendu ${expectDay})`);
        }
      }
    } else if (threat) {
      const t = state.threats.filter(x => x.day === day)[0];
      attackDays.push(day);
      if (day < WAKE_DAY_MIN + 1) bad.push(`graine ${seed} : attaque le jour ${day} (< J${WAKE_DAY_MIN + 1})`);
      if (!t.outcome || !(t.outcome in outcomes)) bad.push(`graine ${seed} j${day} : issue invalide (${t.outcome})`); else { outcomes[t.outcome]++; seedOut.push(day + ':' + t.outcome); }
      const CT = c.threat;
      if (!CT || CT.type !== 'dragon' || CT.outcome !== t.outcome || CT.biome_id !== t.biome || typeof CT.dragon_name !== 'string' || !Array.isArray(CT.defenders) || !Array.isArray(CT.loot) || !('building_hit' in CT) || !('legendary' in CT)) bad.push(`graine ${seed} j${day} : chronicle.threat non conforme`);
      if (!secs.menace || !secs.menace.length) bad.push(`graine ${seed} j${day} : section Menace absente`); else menaceLines.push(secs.menace.length);
      if (t.outcome === 'vaincu') {
        wins++; seedWins++;
        const dr = state.dragons[t.biome];
        if (dr.state !== 'slain' || !state.trophies.some(x => x.dragon_id === data.dragons[t.biome].id && x.day === day)) bad.push(`graine ${seed} j${day} : dragon vaincu non marqué slain / sans trophée`);
        if (CT && CT.legendary) { legendaryPerWin++; if (seenLegendary[CT.legendary]) legendaryDupes++; seenLegendary[CT.legendary] = 1; if (!CT.loot.some(l => l.includes(CT.legendary)) || !c.summary.legendary.includes(CT.legendary)) bad.push(`graine ${seed} j${day} : légendaire absent du butin/summary`); }
        else bad.push(`graine ${seed} j${day} : vaincu sans légendaire`);
        if (dragonMats(state) < 1) bad.push(`graine ${seed} j${day} : vaincu sans matériau de dragon`); else matsAfterWin++;
        if (!sampleWinState) { sampleWinState = state; sampleWinBiome = t.biome; }
      } else {
        const dr = state.dragons[t.biome];
        const back = t.outcome === 'repoussé' ? data.constants.dragon_return_repelled : data.constants.dragon_return_ravage;
        const expect = day + back <= state.season_length ? day + back : null;
        if (dr.next_day !== expect || (expect && !state.threats.some(x => x.day === expect && x.outcome === null && x.biome === t.biome))) bad.push(`graine ${seed} j${day} : retour du dragon mal planifié (${t.outcome} → ${dr.next_day}, attendu ${expect})`);
      }
    } else {
      if (c.threat !== null || c.summary.threat_outcome !== null || secs.menace) bad.push(`graine ${seed} j${day} : menace hors jour d'attaque`);
    }
    if (seedWins === 0) { matsBeforeChecks++; if (dragonMats(state) === 0) matsBeforeWin++; else bad.push(`graine ${seed} j${day} : matériau de dragon sans dragon vaincu`); }
    // ---- morts, héritiers, deuil ----
    if (c.summary.deaths.length) {
      seedDeaths += c.summary.deaths.length;
      if (!secs.deuil || !secs.deuil.length) bad.push(`graine ${seed} j${day} : mort sans section Deuil`);
      for (const name of c.summary.deaths) {
        const g = state.graves.filter(x => x.name === name && x.day === day)[0];
        if (!g) bad.push(`graine ${seed} j${day} : mort sans tombe (${name})`);
        else if (state.heroes[g.hero_id]) bad.push(`graine ${seed} j${day} : mort encore dans l'effectif`);
        else { heirsExpected++; pendingHeirs.push({ owner: g.hero_id.split('_').slice(1, -1).join('_'), day: day + 1, name }); }
      }
    }
    for (const ph of pendingHeirs.filter(x => x.day === day)) if (c.summary.recruits.length && heroes(state).some(h => h.owner === ph.owner && h.traits.includes('heritier'))) heirsRecruited++;
    // ---- solo ----
    if (secs.solo) { soloLines += secs.solo.length; soloInjuries += secs.solo.filter(l => /bless|Blessure/.test(l)).length; }
    // ---- âges, bâtiments, quantités ----
    if (state.village_age < prevAge) bad.push(`graine ${seed} j${day} : âge du village a reculé`);
    prevAge = state.village_age;
    for (const b of Object.keys(state.buildings)) if (state.buildings[b] < 0) bad.push(`graine ${seed} j${day} : bâtiment ${b} < 0`);
    if (state.guild.gold < 0) bad.push(`graine ${seed} j${day} : caisse négative`);
    for (const m of Object.keys(state.purses)) if (state.purses[m] < 0) bad.push(`graine ${seed} j${day} : bourse ${m} négative`);
    for (const k of Object.keys(state.warehouse)) if (state.warehouse[k] < 0) bad.push(`graine ${seed} j${day} : entrepôt ${k} négatif`);
    for (const m of Object.keys(state.inventories)) for (const k of Object.keys(state.inventories[m].resources)) if (state.inventories[m].resources[k] < 0) bad.push(`graine ${seed} j${day} : inventaire ${m}/${k} négatif`);
    for (const b of Object.keys(state.biome_mastery)) if (state.biome_mastery[b] < 0) bad.push(`graine ${seed} : maîtrise négative`);
    for (const h of heroes(state)) { for (const k of Object.keys(h.crafts)) if (h.crafts[k] < 0) bad.push(`graine ${seed} : savoir-faire négatif`); if (h.fatigue < 0 || h.morale < 0 || h.form < 0 || h.injury.days_left < 0) bad.push(`graine ${seed} : ${h.id} valeur négative`); }
    const nonInt = []; walkNumbers(state, 'state', nonInt);
    if (nonInt.length) bad.push(`graine ${seed} j${day} : non-entier ${nonInt[0]}`);
    if (JSON.stringify(state).includes('undefined')) bad.push(`graine ${seed} : undefined sérialisé`);
    if (state.collapsed) { collapses++; break; }
  }
  if (sim.hashState(state) !== A.hashes[state.day - 2] && !state.collapsed) bad.push(`graine ${seed} : hash de la sonde différent du rejeu`);
  // Mort le dernier jour : l'offre d'héritier est dans l'état final (visible « le lendemain », hors saison).
  for (const ph of pendingHeirs.filter(x => x.day === DAYS + 1)) { const o = state.tavern.filter(t => t.heir_for === ph.owner)[0]; if (o && o.cost === 0 && o.hero.traits.includes('heritier')) { heirsOfferNextDay++; heirsRecruited++; } else bad.push(`graine ${seed} : héritier absent de l'état final pour ${ph.owner}`); }
  if (state.raid && state.raid.status === 'active') raidsUnresolved++;
  const w = Object.keys(state.dragons).filter(b => state.dragons[b].awakenings > 0).length;
  wakesPerSeed.push(w);
  const first = state.threats.slice().sort((a, b) => a.day - b.day)[0];
  if (first) firstAttackDays.push(first.day);
  deaths += seedDeaths; heroesEver += Object.keys(everIds).length;
  soloDone += state.stats.solo_done; soloOk += state.stats.solo_success;
  agesAtEnd.push(state.village_age);
  for (const h of heroes(state)) heroSnapshots.push({ seed, class_id: h.class_id, level: h.level, crafts: Object.keys(h.crafts).sort().map(k => h.crafts[k]).join(','), levels: Object.keys(h.crafts).sort().map(k => sim._internal.craftLevel(state, h.crafts[k])).join(',') });
  perSeed.push(seed + ':' + Object.keys(state.biome_mastery).map(b => b[0].toUpperCase() + state.biome_mastery[b]).join('/') + ' [' + seedOut.map(x => x.replace('repoussé', 'rep').replace('vaincu', 'VAINCU').replace('ravage', 'RAV')).join(' ') + '] †' + seedDeaths + (state.collapsed ? ' CHUTE' : ''));
}

// ---- PA : validateAction refuse un plan > ap_today, accepte ≤, refuse les combinaisons de journée entière ----
{
  const s = sim.newGame(7, data, { managers: MANAGERS });
  const h = heroes(s).filter(x => x.owner === 'p1')[0];
  const ap = sim._internal.apToday(s, h);
  const mk = slots => sim.validateAction(s, { manager_id: 'p1', day: s.day, type: 'plan', payload: { adventurer_id: h.id, slots } });
  const g = { activity: 'gather', target: 'wood' }, t = { activity: 'train', target: 'strength' }, cr = { activity: 'craft' };
  const under = mk(Array(ap).fill(g)), over = mk(Array(ap + 1).fill(g)), mixed = mk([g, t, cr].slice(0, ap)), full2 = mk([{ activity: 'expedition' }, t]), soloOff = mk([{ activity: 'solo', target: 'nope' }]);
  const board = s.solo_board.p1.map(id => data.solo_missions.filter(m => m.id === id)[0]).filter(m => !m.class_id || m.class_id === h.class_id)[0];
  const soloOn = board ? mk([{ activity: 'solo', target: board.id }]) : { ok: true };
  const twoSolo = board ? mk([{ activity: 'solo', target: board.id }, { activity: 'solo', target: board.id }]) : { ok: false };
  check('PA : plan ≤ ap_today accepté (' + ap + ' PA), plan > ap_today refusé avec raison, journée entière non combinable, solo hors tableau refusé, deux solos refusés',
    under.ok && mixed.ok && !over.ok && /PA/.test(over.reason) && !full2.ok && !soloOff.ok && soloOn.ok && !twoSolo.ok, JSON.stringify({ over: over.reason, full2: full2.reason, soloOff: soloOff.reason }));
  const asg = sim.validateAction(s, { manager_id: 'p1', day: s.day, type: 'assign', payload: { adventurer_id: h.id, activity: 'train', target: 'strength' } });
  check('assign (compatibilité) accepté = journée pleine ; assign solo refusé (passe par plan)', asg.ok && !sim.validateAction(s, { manager_id: 'p1', day: s.day, type: 'assign', payload: { adventurer_id: h.id, activity: 'solo', target: 's_ronde_chemins' } }).ok);
}
// ---- Journée composée : récolte + entraînement + forge du même héros dans la même chronique ----
{
  const s = sim.newGame(9, data, { managers: MANAGERS });
  s.inventories.p1.resources.herbs = 6; s.inventories.p1.resources.swamp_moss = 6;
  const h = heroes(s).filter(x => x.owner === 'p1')[0];
  const acts = defaultActions(s).filter(a => !(a.manager_id === 'p1' && (a.type === 'assign' || a.type === 'plan')));
  acts.push({ manager_id: 'p1', day: s.day, type: 'craft_order', payload: { recipe_id: 'r_potion_soin' } });
  acts.push({ manager_id: 'p1', day: s.day, type: 'plan', payload: { adventurer_id: h.id, slots: [{ activity: 'gather', target: 'wood' }, { activity: 'train', target: 'strength' }, { activity: 'craft' }] } });
  const r = sim.resolveDay(s, acts);
  const name = h.first_name + ' ' + h.epithet;
  const has = ph => r.chronicle.sections.some(x => x.phase === ph && x.lines.some(l => l.includes(name)));
  const hh = r.state.heroes[h.id];
  check('journée composée [gather, train, craft] : lignes du héros dans Récolte, Entraînement et Forge, bois +, points d\'entraînement +, XP de savoir-faire +', has('recolte') && has('entrainement') && has('forge') && r.state.inventories.p1.resources.wood > 0 && (hh.train_points.strength || 0) > 0 && hh.crafts.forge > 0 && hh.crafts.herboristerie > 0 && hh.crafts.forge > 0, 'jours composés observés (3 sections le même jour) : ' + compositeDays);
}
// ---- Recettes dragon craftables après un vaincu (simulation : forge 3, or, matériaux retirés de l'entrepôt) ----
{
  let ok = false, detail = 'aucun dragon vaincu sur les 30 graines';
  if (sampleWinState) {
    const s = JSON.parse(JSON.stringify(sampleWinState));
    Object.defineProperty(s, '__data', { value: data, enumerable: false });
    s.buildings.forge = 3; s.purses.p1 = 1000; s.forge_queue = [];
    for (const m of Object.keys(s.purses)) if (m !== 'p1') s.purses[m] = 0;   // les IA ne commandent rien : la file reste à p1
    const DR = data.dragons[sampleWinBiome];
    for (const m of DR.materials) { s.warehouse[m] = 10; }
    s.inventories.p1.resources.iron_ore = 20; s.inventories.p1.resources.crystal = 10; s.inventories.p1.resources.swamp_moss = 20;
    const rec = data.recipes.filter(r => r.category === 'dragon' && Object.keys(r.cost).every(c => !DRAGON_MATS.includes(c) || DR.materials.includes(c)))[0];
    const acts = [];
    for (const c of Object.keys(rec.cost)) if (DRAGON_MATS.includes(c)) acts.push({ manager_id: 'p1', day: s.day, type: 'withdraw', payload: { resource_id: c, qty: rec.cost[c] } });
    const before = sim.validateAction(s, { manager_id: 'p1', day: s.day, type: 'craft_order', payload: { recipe_id: rec.id } });
    let st = sim.resolveDay(s, acts.concat(defaultActions(s).filter(a => a.manager_id !== 'p1'))).state;
    const after = sim.validateAction(st, { manager_id: 'p1', day: st.day, type: 'craft_order', payload: { recipe_id: rec.id } });
    let delivered = false;
    if (after.ok) {
      st = sim.resolveDay(st, [{ manager_id: 'p1', day: st.day, type: 'craft_order', payload: { recipe_id: rec.id } }].concat(defaultActions(st).filter(a => a.manager_id !== 'p1'))).state;
      for (let i = 0; i < 12 && !delivered; i++) { st = sim.resolveDay(st, defaultActions(st)).state; delivered = st.inventories.p1.items.some(x => x.item_id === rec.result); }
    }
    ok = !before.ok && after.ok && delivered;
    detail = rec.id + ' : refusée sans matériaux (' + before.reason + '), acceptée après retrait, livrée=' + delivered + ' (' + data.items.filter(i => i.id === rec.result)[0].rarity + ')';
  }
  check('recette de palier dragon : refusée sans matériaux, craftable après un vaincu (matériaux retirés de l\'entrepôt, forge 3), objet livré', ok, detail);
}
// ---- Défaite forcée : ravage sans défenseur, hall seul bâtiment ≥ 1 → hall 0 → collapse ; resolveDay stable ensuite ----
{
  let s = sim.newGame(3, data, { managers: MANAGERS });
  for (let d = 0; d < 12; d++) s = sim.resolveDay(s, defaultActions(s)).state;
  for (const b of Object.keys(s.buildings)) s.buildings[b] = b === 'hall' ? 1 : 0;
  s.construction = null; s.village_age = 0;
  for (const h of heroes(s)) h.fatigue = 100;
  s.threats.push({ type: 'dragon', biome: 'forest', dragon_id: 'dragon_forest', day: s.day, presage_day: s.day - 1, outcome: null });
  const r = sim.resolveDay(s, defaultActions(s));
  const st = r.state;
  const vm = sim.viewModel(st, 'p1');
  const h1 = sim.hashState(st);
  const r2 = sim.resolveDay(st, defaultActions(st));
  const r3 = sim.resolveDay(r2.state, []);
  check('défaite : ravage sur un hall seul → hall 0, state.collapsed, season_report « chute », VM.defeat ; resolveDay ensuite = état inchangé (hash) + chronique « La guilde est dispersée »',
    st.buildings.hall === 0 && st.collapsed && st.collapsed.day === s.day && st.season_report && /Chute/.test(st.season_report.title) && vm.defeat && vm.defeat.day === s.day && vm.is_season_over
    && sim.hashState(r2.state) === h1 && sim.hashState(r3.state) === h1 && /dispersée/.test(r2.chronicle.headline) && r2.chronicle.sections.some(x => x.lines.some(l => /dispersée/.test(l))) && r2.state.day === st.day,
    'issue ' + r.chronicle.summary.threat_outcome + ', hall ' + st.buildings.hall + ', chutes naturelles ' + collapses + '/' + SEEDS);
}
// ---- Divergence des savoir-faire : héros de même classe et même niveau au J30, pris dans des graines différentes ----
let pairs = 0, diffXp = 0, diffLv = 0;
for (let i = 0; i < heroSnapshots.length; i++) for (let j = i + 1; j < heroSnapshots.length; j++) {
  const a = heroSnapshots[i], b = heroSnapshots[j];
  if (a.seed === b.seed || a.class_id !== b.class_id || a.level !== b.level) continue;
  pairs++; if (a.crafts !== b.crafts) diffXp++; if (a.levels !== b.levels) diffLv++;
}

const wakeAny = wakesPerSeed.filter(w => w >= 1).length, wakeTwo = wakesPerSeed.filter(w => w === 2).length, wakeThree = wakesPerSeed.filter(w => w >= 3).length;
const ageNames = data.village_ages.map(a => a.name);
const ageDist = {}; for (const a of agesAtEnd) ageDist[ageNames[a]] = (ageDist[ageNames[a]] || 0) + 1;

console.log('\n--- Distribution mesurée (' + SEEDS + ' graines × ' + DAYS + ' jours, 5 managers) ---');
console.log('Réveils par graine : 0→' + wakesPerSeed.filter(w => w === 0).length + ' · 1→' + wakesPerSeed.filter(w => w === 1).length + ' · 2→' + wakeTwo + ' · ≥3→' + wakeThree + ' (au moins un : ' + wakeAny + '/' + SEEDS + ')');
console.log('Jour de la première attaque : ' + firstAttackDays.slice().sort((a, b) => a - b).join(' '));
console.log('Attaques : ' + attackDays.length + ' · issues ' + JSON.stringify(outcomes) + ' · lignes Menace min/max ' + Math.min(...menaceLines) + '/' + Math.max(...menaceLines));
console.log('Raids (Sylvain, V5) : ' + raidsStarted + ' démarrés · ' + raidsWon + ' gagnés · ' + raidsLost + ' perdus · ' + raidsUnresolved + ' en cours au J30 · ' + raidPasses + ' passages, ' + raidKo + ' KO (' + (100 * raidKo / Math.max(1, raidPasses)).toFixed(0) + ' %) · durées ' + raidDurations.join(' ') + ' · lignes Raid min/max ' + (raidLines.length ? Math.min(...raidLines) + '/' + Math.max(...raidLines) : '-'));
console.log('Légendaires : ' + legendaryPerWin + ' pour ' + wins + ' vaincus, doublons ' + legendaryDupes + ' · matériaux uniquement via dragon : ' + matsBeforeWin + '/' + matsBeforeChecks + ' jours sans dragon à 0');
console.log('Morts : ' + deaths + ' / ' + heroesEver + ' héros ayant servi (' + (100 * deaths / heroesEver).toFixed(1) + ' %) · héritiers à la taverne le lendemain ' + heirsOfferNextDay + '/' + heirsExpected + ' · recrutés le lendemain ' + heirsRecruited + ' · chutes ' + collapses);
console.log('Missions solo : ' + soloDone + ' faites, ' + soloOk + ' réussies (' + (100 * soloOk / Math.max(1, soloDone)).toFixed(0) + ' %), lignes de blessure ' + soloInjuries);
console.log('Savoir-faire : ' + pairs + ' paires même classe/niveau (graines différentes), XP différents ' + diffXp + ' (' + (100 * diffXp / Math.max(1, pairs)).toFixed(0) + ' %), niveaux différents ' + diffLv + ' (' + (100 * diffLv / Math.max(1, pairs)).toFixed(0) + ' %)');
console.log('Âge au jour 30 : ' + JSON.stringify(ageDist) + ' · chronique totale min/max ' + Math.min(...chronicleTotals) + '/' + Math.max(...chronicleTotals));
console.log('Par graine : ' + perSeed.join(' '));
console.log('');

check('déterminisme : 30 graines rejouées deux fois, hachages identiques (sonde = rejeu)', hashMismatch === 0 && !bad.some(x => /hash/.test(x)), hashMismatch + ' divergence(s)');
check('aucune menace calendaire : threats vide à la création', !bad.some(x => /calendaire/.test(x)));
check('réveils : au moins un sur ≥ 70 % des graines, deux sur ≤ 30 %, trois rare (≤ 2)', wakeAny * 10 >= SEEDS * 7 && wakeTwo * 10 <= SEEDS * 3 && wakeThree <= 2, wakeAny + '/' + SEEDS + ' · deux ' + wakeTwo + ' · trois ' + wakeThree);
check('jamais d\'attaque avant J' + (WAKE_DAY_MIN + 1) + ' (réveil le soir du J' + WAKE_DAY_MIN + ' au plus tôt)', attackDays.length > 0 && !bad.some(x => /< J/.test(x)), 'min ' + Math.min(...attackDays));
check('présage le soir du réveil / la veille d\'un retour (summary.presage = nom du dragon + section Présage)', presageOk === presageExpected && presageExpected > 0, presageOk + '/' + presageExpected);
// Adaptation V5 T2 (2026-09-18) : les trois dragons ont une fiche `data.raids`, donc toute attaque se joue en raid et
// l'issue 'repoussé' (propre à l'auto-combat V4) ne peut plus survenir avec les plans par défaut. Le contrôle vérifie
// les deux issues de raid et garde en entier la vérification du retour planifié (3 jours après un ravage).
check('issues de raid observées (vaincu et ravage) ; retour planifié 3 jours plus tard après un ravage, 5 jours après un repoussé s\'il survient (threat planifiée + dragons[].next_day)', outcomes.vaincu > 0 && outcomes.ravage > 0 && !bad.some(x => /retour du dragon/.test(x)), JSON.stringify(outcomes));
check('un légendaire par vaincu, jamais deux fois le même par saison, dragon marqué slain + trophée', wins > 0 && legendaryPerWin === wins && legendaryDupes === 0 && !bad.some(x => /slain|légendaire/.test(x)), legendaryPerWin + '/' + wins);
check('matériaux de dragon uniquement via un dragon vaincu (0 partout avant, ≥ 1 après ; jamais récoltables)', matsBeforeWin === matsBeforeChecks && matsAfterWin === wins && !bad.some(x => /matériau/.test(x)));
check('missions solo résolues (section Missions solo) avec blessures possibles', soloDone > 0 && soloLines > 0 && soloInjuries > 0, soloDone + ' missions, ' + soloInjuries + ' blessures');
check('savoir-faire : deux héros même classe même niveau (graines différentes) divergent dans ≥ 80 % des cas au J30', pairs > 0 && diffXp * 10 >= pairs * 8, (100 * diffXp / Math.max(1, pairs)).toFixed(0) + ' % sur ' + pairs + ' paires');
check('morts observées ≥ 1 sur 30 graines et ≤ 10 % des héros ; tombe, retrait de l\'effectif, section Deuil', deaths >= 1 && deaths * 10 <= heroesEver && !bad.some(x => /mort|Deuil|tombe/.test(x)), deaths + '/' + heroesEver);
check('héritier : offre à coût 0 avec trait heritier à la taverne le lendemain de chaque mort, recruté par le plan par défaut (max_heroes = 1 ; une mort du J30 laisse l\'offre dans l\'état final)', heirsExpected > 0 && heirsOfferNextDay === heirsExpected && heirsRecruited === heirsExpected && !bad.some(x => /héritier/.test(x)), heirsOfferNextDay + '/' + heirsExpected + ' offres, ' + heirsRecruited + ' recrutés');
check('défaite rare : ≤ 2 graines sur 30 (plans par défaut)', collapses <= 2, collapses + '/' + SEEDS);
check('viewModel V4 conforme et sans undefined pour les 5 managers, chaque jour (VM.threat phase raid + VM.raid pendant un raid, V5)', vmOk === vmChecked && !bad.some(x => /VM|undefined dans le VM/.test(x)), vmOk + '/' + vmChecked + ' ' + bad.filter(x => /VM/.test(x)).slice(0, 2).join(' | '));
// Adaptation V5 T2 : plus aucun jour d'auto-combat (les trois dragons se jouent en raid), donc defendOk vaut 0 ;
// le contrôle garde le refus hors menace et la substitution defend → raid pendant un raid.
check('defend refusé hors menace (« pas de menace aujourd\'hui ») ; pendant un raid : defend refusé, raid accepté (V5)', defendRefused === defendTried && defendTried > 0 && raidDayOk === raidDayChecks && raidDayChecks > 0 && !bad.some(x => /defend/.test(x)), defendOk + ' jours d\'attaque (auto-combat) · ' + defendRefused + '/' + defendTried + ' · raid ' + raidDayOk + '/' + raidDayChecks);
check('chronicle.threat / summary / section Menace cohérents ; jamais de menace hors attaque ; raids : section Raid, issue et archive au jour de clôture (V5)', !bad.some(x => /chronicle\.threat|Menace|menace hors|Raid|raid/.test(x)));
check('raids V5 (Sylvain) : ≥ 1 démarré, ≥ 1 gagné (vaincu, slain, légendaire, trophée), ≥ 1 perdu (ravage, retour à J+3)', raidsStarted > 0 && raidsWon > 0 && raidsLost > 0, raidsStarted + ' démarrés, ' + raidsWon + ' gagnés, ' + raidsLost + ' perdus');
check('hall ≥ 0, bâtiments ≥ 0, or/bourses/entrepôt/inventaires/maîtrise/savoir-faire jamais négatifs, entiers seulement, âges monotones', !bad.some(x => /bâtiment|caisse|bourse|entrepôt|inventaire|négati|non-entier|âge/.test(x)), bad.filter(x => /négati|non-entier/.test(x)).slice(0, 3).join(' | '));
check('chronique : jamais plus de 60 lignes', Math.max(...chronicleTotals) <= 60, Math.min(...chronicleTotals) + '-' + Math.max(...chronicleTotals));

// ---- V5 T2b §B2 : un jour de derby ne titre jamais sur des héros qui n'existent pas ----
// Avant la tranche : 14 titres fantômes sur 120 jours de derby (30 graines × 30 jours, 3 managers). Attendu : 0.
{
  const M3 = MANAGERS.slice(0, 3);
  const DERBY = data.constants.derby_days;
  const PAT = /est vaincu par|accomplit un exploit|est tombé|est mis|abat |terrasse/;
  let derbyDays = 0, ghosts = 0; const samples = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    let st = sim.newGame(seed, data, { managers: M3 });
    const known = {};
    const note = x => { for (const r of sim.viewModel(x, 'p1').roster) known[r.name] = 1; for (const g of (x.graves || [])) known[g.name] = 1; };
    note(st);
    for (let d = 0; d < DAYS; d++) {
      const day = st.day, r = sim.resolveDay(st, defaultActions(st));
      note(r.state);
      if (DERBY.indexOf(day) >= 0) {
        derbyDays++;
        const head = r.chronicle.headline || '';
        if (PAT.test(head) && !Object.keys(known).some(n => head.indexOf(n) >= 0)) { ghosts++; if (samples.length < 3) samples.push('graine ' + seed + ' J' + day + ' : ' + head); }
      }
      st = r.state;
    }
  }
  check('§B2 derby : aucun titre d\'un jour de derby ne nomme un héros absent de l\'effectif (30 graines)', derbyDays > 50 && ghosts === 0, ghosts + '/' + derbyDays + ' ' + samples.join(' | '));
}
// ---- V5 T2b §B3 / garde G4 : une classe sans compétence ne fait plus planter le moteur ----
{
  let err = null, dayReached = 0;
  try {
    const d2 = JSON.parse(JSON.stringify(data));
    const nue = JSON.parse(JSON.stringify(d2.classes[0]));
    nue.id = 'paladin'; nue.name = 'Paladin'; nue.glyph = 'P';
    d2.classes.push(nue);
    const M2 = [{ id: 'p1', name: 'Vous', kind: 'human', profile: 'humain', class_id: 'paladin' },
                { id: 'f_a', name: 'Anselme', kind: 'ai', profile: 'prudent', class_id: 'paladin' }];
    let st = sim.newGame(7, d2, { managers: M2 });
    for (let d = 0; d < 5; d++) { st = sim.resolveDay(st, defaultActions(st)).state; sim.viewModel(st, 'p1'); }
    dayReached = st.day;
  } catch (e) { err = e.message; }
  check('§B3 / G4 : une classe sans entrée data.skills — newGame, 5 journées et viewModel sans exception', err === null && dayReached === 6, err || ('jour ' + dayReached));
}

check('aucune autre anomalie', bad.length === 0, bad.slice(0, 6).join(' | '));

const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);

// ============================================================================
// GÉNÉRATEUR DES VECTEURS DE RÉFÉRENCE — Chroniques de Guilde
// Date : 2026-09-19. Source : CONTRACT.md (API du moteur, ordre des phases),
// AUDIT_ARCHI.md §6 et §8. Ne modifie rien : lit sim.js / tactic.js / data.json
// et écrit ../golden/vectors.json.
//
// Usage :  node port/gen_golden.mjs          -> écrit golden/vectors.json
//          node port/gen_golden.mjs --check  -> rejoue le fichier existant, n'écrit rien
//
// Chaque vecteur est AUTONOME : il porte la graine, la liste des managers passée
// à newGame, et pour chaque journée la liste COMPLÈTE des actions de tous les
// managers. Aucun appel à planDefaults n'est donc nécessaire pour rejouer ;
// un portage peut valider son moteur de résolution avant même d'avoir porté l'IA.
// ============================================================================
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'golden', 'vectors.json');
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));

const CLASSES = data.classes.map(c => c.id);
const NAMES = ['Vous', 'Anselme', 'Roxane', 'Bastien', 'Maëlle', 'Ysolde'];

// Même construction de table de managers que les bancs existants (season_t5_check),
// pour que les graines retenues gardent le sens qu'on leur a mesuré.
function managersFor(seed, n) {
  return NAMES.slice(0, n).map((nm, i) => ({
    id: i === 0 ? 'p1' : 'f_' + i, name: nm,
    kind: i === 0 ? 'human' : 'ai',
    profile: i === 0 ? 'humain' : (i % 2 ? 'prudent' : 'audacieux'),
    class_id: CLASSES[(i + seed) % CLASSES.length]
  }));
}
const allActions = s => {
  let a = [];
  for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m));
  return a;
};

const AGE_ID = (data.village_ages || []).map(a => a.id);

// ---- les vecteurs retenus, un chemin de jeu par vecteur ---------------------
const PLAN = [
  { id: 'court_3j',          seed: 4242, days: 3,  managers: 5,
    label: 'Trois premiers jours de la partie par défaut (test le plus rapide)',
    couvre: ['newGame', 'paie', 'récolte', 'entraînement', 'forge', 'soir'],
    attend: {} },
  { id: 'saison_30j_defaut', seed: 4242, days: 30, managers: 5,
    label: 'Saison complète de 30 jours, 5 managers, plans par défaut (graine du contrat)',
    couvre: ['toutes les phases', 'bilan de saison'],
    attend: { season_report: true } },
  { id: 'derby_j7',          seed: 2,    days: 8,  managers: 5,
    label: 'Huit jours jusqu’au premier Derby (jour 7) inclus',
    couvre: ['phase derby'],
    attend: { derby: true } },
  { id: 'raid_gagne',        seed: 10,   days: 30, managers: 5,
    label: 'Saison où le raid tactique est GAGNÉ (dragon abattu)',
    couvre: ['tactic.js', 'raid gagné', 'flux RNG séparé du raid'],
    attend: { raid_won: true } },
  { id: 'raid_perdu_ravage', seed: 8,    days: 30, managers: 5,
    label: 'Saison où le raid est PERDU et le village RAVAGÉ',
    couvre: ['raid perdu', 'ravage', 'perte de niveau de bâtiment'],
    attend: { raid_lost: true, ravage: true } },
  { id: 'mort_heritier',     seed: 5,    days: 30, managers: 5,
    label: 'Saison avec la MORT d’un héros et le recrutement de son HÉRITIER',
    couvre: ['mort', 'tombe', 'offre d’héritier', 'recrutement d’héritier'],
    attend: { death: true, heir: true } },
  { id: 'age_chateau',       seed: 1,    days: 30, managers: 5,
    label: 'Saison qui fait monter le village jusqu’au CHÂTEAU (âge 4)',
    couvre: ['changements d’âge du village', 'prestige', 'chantiers'],
    attend: { age_max: 4 } }
];

// ---- production d’un vecteur ------------------------------------------------
function build(spec) {
  const options = { managers: managersFor(spec.seed, spec.managers) };
  let s = sim.newGame(spec.seed, data, { managers: options.managers.map(m => Object.assign({}, m)) });
  const vec = {
    id: spec.id, label: spec.label, couvre: spec.couvre,
    seed: spec.seed, days: spec.days, options: options,
    hash_initial: sim.hashState(s),
    steps: []
  };
  const seen = { raid_won: false, raid_lost: false, ravage: false, death: false, heir: false,
                 derby: false, season_report: false, age_max: 0 };
  for (let d = 0; d < spec.days; d++) {
    if (s.collapsed) break;
    const heirBefore = s.tavern.filter(o => o.heir_for).map(o => o.id);
    const day = s.day;
    const actions = allActions(s);
    const r = sim.resolveDay(s, actions);
    if (r.error) throw new Error(spec.id + ' jour ' + day + ' : ' + r.error);
    s = r.state;
    const sm = r.chronicle ? r.chronicle.summary : null;
    if (sm) {
      if (sm.raid_status === 'won') seen.raid_won = true;
      if (sm.raid_status === 'lost') seen.raid_lost = true;
      if (sm.threat_outcome === 'ravage') seen.ravage = true;
      if (sm.deaths && sm.deaths.length) seen.death = true;
    }
    for (const id of heirBefore) if (!s.tavern.some(o => o.id === id)) seen.heir = true;
    if (s.derby && s.derby.last) seen.derby = true;
    if (s.season_report) seen.season_report = true;
    seen.age_max = Math.max(seen.age_max, s.village_age || 0);
    const age = s.village_age || 0;
    vec.steps.push({
      day: day,                      // journée RÉSOLUE par ces actions
      actions: actions,
      hash_after: sim.hashState(s),  // hashState(state) rendu par resolveDay
      diag: {
        day_next: s.day,
        guild_gold: s.guild.gold,
        heroes_alive: Object.keys(s.heroes).length,
        village_age: age,
        village_age_id: AGE_ID[age] || String(age),
        chronicle_title: r.chronicle ? r.chronicle.title : null
      }
    });
  }
  vec.hash_final = vec.steps.length ? vec.steps[vec.steps.length - 1].hash_after : vec.hash_initial;
  vec.observe = seen;
  // garde : le vecteur doit vraiment contenir ce qu’il prétend couvrir
  for (const k of Object.keys(spec.attend)) {
    const want = spec.attend[k], got = seen[k];
    const ok = (k === 'age_max') ? got >= want : got === want;
    if (!ok) throw new Error('vecteur ' + spec.id + ' : ' + k + ' attendu ' + want + ', observé ' + got);
  }
  return vec;
}

// ---- rejeu de contrôle ------------------------------------------------------
// Rejoue un vecteur EXACTEMENT comme le fera le portage : newGame(seed, data, options),
// puis resolveDay(state, actions) avec les actions enregistrées, et comparaison de
// l’empreinte après chaque journée.
export function replay(vec) {
  let s = sim.newGame(vec.seed, data, { managers: vec.options.managers.map(m => Object.assign({}, m)) });
  const h0 = sim.hashState(s);
  if (h0 !== vec.hash_initial) return { ok: false, day: 0, expected: vec.hash_initial, got: h0, checked: 0 };
  let n = 0;
  for (const st of vec.steps) {
    if (s.day !== st.day) return { ok: false, day: st.day, expected: 'jour ' + st.day, got: 'jour ' + s.day, checked: n };
    const r = sim.resolveDay(s, st.actions);
    if (r.error) return { ok: false, day: st.day, expected: st.hash_after, got: 'erreur: ' + r.error, checked: n };
    s = r.state;
    const h = sim.hashState(s);
    n++;
    if (h !== st.hash_after) return { ok: false, day: st.day, expected: st.hash_after, got: h, checked: n };
  }
  return { ok: true, checked: n };
}

// ---- entrée ----------------------------------------------------------------
const CHECK_ONLY = process.argv.indexOf('--check') >= 0;
let doc;
if (CHECK_ONLY) {
  doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
} else {
  const t0 = Date.now();
  const vectors = PLAN.map(build);
  doc = {
    format: 'guilde_golden_vectors/1',
    generated: '2026-09-19',
    source: 'port/gen_golden.mjs — moteur sim.js + tactic.js + data.json de ce dossier',
    hash_algo: 'FNV-1a 32 bits (offset 0x811C9DC5, prime 0x01000193) sur le JSON canonique de l’état (clés triées récursivement, ASCII), rendu en 8 chiffres hexadécimaux minuscules',
    data_fnv: sim._internal.fnvStr(sim._internal.canonical(data)).toString(16),
    note_data: 'data_fnv = empreinte FNV-1a de data.json canonisé. Un portage qui ne retrouve pas cette valeur a chargé une table différente : inutile de comparer les journées.',
    vectors: vectors
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 1), 'utf8');
  console.log('écrit ' + OUT + '  (' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' Ko, ' + (Date.now() - t0) + ' ms)');
}

// ---- vérification : rejeu complet sous le moteur JavaScript ------------------
let okVec = 0, okDays = 0, totDays = 0, fails = [];
for (const v of doc.vectors) {
  const r = replay(v);
  totDays += v.steps.length;
  if (r.ok) { okVec++; okDays += r.checked; }
  else { fails.push(v.id + ' jour ' + r.day + ' : attendu ' + r.expected + ', obtenu ' + r.got); okDays += Math.max(0, r.checked - 1); }
  console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + v.id.padEnd(20) + ' graine ' + String(v.seed).padEnd(6) +
    v.steps.length + ' journées  final ' + v.hash_final +
    '  [' + Object.keys(v.observe).filter(k => v.observe[k] === true).join(', ') +
    (v.observe.age_max ? (Object.keys(v.observe).some(k => v.observe[k] === true) ? ', ' : '') + 'âge ' + v.observe.age_max : '') + ']');
}
console.log('---');
console.log('vecteurs : ' + okVec + '/' + doc.vectors.length + '   journées vérifiées : ' + okDays + '/' + totDays +
  '   (' + (totDays ? Math.round(okDays * 1000 / totDays) / 10 : 0) + ' %)');
for (const f of fails) console.log('  ' + f);
process.exit(fails.length ? 1 : 0);

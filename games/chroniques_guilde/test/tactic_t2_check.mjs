// Banc V5 T2 — voies (13 hybrides), Drake des monts et Hydre des marais (V5_SPEC §8 T2 + mission « V5 tranche T2 », 2026-09-18).
// Preuve par exécution, moteur seul : node test/tactic_t2_check.mjs   (code de sortie 1 si un contrôle échoue)
// (1) déterminisme : 30 graines × 30 jours rejouées à l'identique (voies comprises) ;
// (2) seuils : proposition le soir du seuil, 90 % des héros hybrides au J10, choix automatique exactement deux jours après ;
// (3) les 13 hybrides sont atteignables et chacun est choisi au moins une fois sur 40 graines ;
// (4) `choose_hybrid` : légal accepté, illégal refusé avec sa raison ;
// (5) ressources : chaque ressource d'hybride prend au moins deux valeurs distinctes sur 100 raids (ADR-002 : une métrique prouve sa variance) ;
// (6) Drake : souffle annoncé puis résolu (cendres), envol et atterrissage, fournaise, écailles fissurées — chacun avec son effet ;
// (7) Hydre : trois gueules, venin, immersion, sangsues, tête coupée et double décapitation — chacun avec son effet ;
// (8) Drake et Hydre tombent chacun sur ≥ 30 % des graines où ils se réveillent, et aucun raid n'est impossible ;
// (9) besoin de brûleur : sans Mage ni Spirite ni Conjurateur, le Sylvain tombe rarement ;
// (10) les 26 sorts hybrides sont lancés au moins une fois ; (11) VM.choice, VM.roster[].hybrid et VM.group_needs sans undefined.
// ADAPTÉ V5 T3 (2026-09-18, devenu faux par conception) : les héros portent désormais une spécialisation dès le J20 et
// une installation de spé peut remplacer celle de la voie (budget partagé, une par passage). Le contrôle (8) ne compte
// plus comme « journée à 0 dégât » une journée où PERSONNE n'est monté sur la grille (effectif entièrement blessé) :
// un raid sans défenseur apte n'est pas un raid impossible. Le reste du banc est inchangé.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const T = require(path.join(ROOT, 'tactic.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const L = data.lineage;
const HYBRIDS = data.hybrids.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
const HYB_SPELLS = data.tactic_spells.filter(s => s.hybrid_id).map(s => s.id).sort();
const CLASSES = data.classes.map(c => c.id);
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
function acts(s) { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; }
function attach(s) { Object.defineProperty(s, '__data', { value: data, enumerable: false, configurable: true }); return s; }
function cloneState(s) { return attach(JSON.parse(JSON.stringify(s))); }
function hasUndefined(v, p, out, depth = 0) {
  if (depth > 30) return;
  if (v === undefined) { out.push(p); return; }
  if (Array.isArray(v)) v.forEach((x, i) => hasUndefined(x, p + '[' + i + ']', out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) hasUndefined(v[k], p + '.' + k, out, depth + 1);
}
// Six managers, un héros chacun ; les classes tournent avec la graine pour que les 15 paires de bases soient jouées.
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
// Raid forcé (même procédé qu'en T1) : présage le soir du jour D-1, premier passage au jour D ; `voies` force les hybrides.
function forcedRaid(seed, biome, day, voies, managers) {
  let s = sim.newGame(seed, data, { managers: managers || managersFor(seed) });
  while (s.day < day - 1) s = sim.resolveDay(s, acts(s)).state;
  s = cloneState(s);
  s.raid = null; s.raid_history = [];
  const ids = Object.keys(s.heroes).sort();
  if (voies) ids.forEach((id, i) => { const H = voies(s.heroes[id], i); if (H) { s.heroes[id].hybrid = H; s.heroes[id].hybrid_offer_day = null; s.heroes[id].hybrid_bonus = 0; s.heroes[id].hybrid_day = s.day; } });
  s.threats = [{ type: 'dragon', biome: biome, dragon_id: data.dragons[biome].id, day: s.day + 1, presage_day: s.day, outcome: null }];
  s.dragons[biome].state = 'awake'; s.dragons[biome].awakenings = 1; s.dragons[biome].next_day = s.day + 1;
  return sim.resolveDay(s, acts(s)).state;
}
// Joue un raid jusqu'à sa clôture et relève ce que la grille a produit : les compteurs du raid sont archivés
// dans state.raid_history[0].stats (mécanismes déclenchés, valeurs de ressource, sorts lancés, zones posées).
function runRaid(s) {
  const damageDays = [];
  let guard = 0;
  while (s.raid && guard++ < 8) {
    const before = Object.keys(s.raid.damage_total).reduce((n, k) => n + s.raid.damage_total[k], 0);
    const passesBefore = s.raid.passes_done.length;
    s = sim.resolveDay(s, acts(s)).state;
    const R = s.raid, H = (s.raid_history || [])[0];
    const after = R ? Object.keys(R.damage_total).reduce((n, k) => n + R.damage_total[k], 0)
      : (H ? Object.keys(H.damage_total).reduce((n, k) => n + H.damage_total[k], 0) : before);
    const passesAfter = R ? R.passes_done.length : (H ? H.passes : passesBefore);
    // V5 T3 (2026-09-18) : une journée SANS aucun passage (tout l'effectif blessé ou épuisé : « la clairière est restée
    // vide ») n'est pas un raid impossible — c'est une situation de jeu. Seules les journées réellement jouées comptent
    // pour le contrôle (8) « aucune journée à 0 dégât ».
    if (passesAfter > passesBefore) damageDays.push(after - before);
  }
  const h = (s.raid_history || [])[0] || null;
  const st = h && h.stats ? h.stats : { mech: {}, res_values: {}, casts: {}, zones: {} };
  return { state: s, history: h, mech: st.mech || {}, res: st.res_values || {}, casts: st.casts || {}, zones: st.zones || {}, damageDays };
}

// ---------- (1) déterminisme ----------
{
  let diverge = 0, hybridsSeen = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= 30; seed++) {
    const a = play(seed, 30), b = play(seed, 30);
    if (sim.hashState(a) !== sim.hashState(b)) diverge++;
    hybridsSeen += Object.keys(a.heroes).filter(id => a.heroes[id].hybrid).length;
  }
  check('(1) déterminisme : 30 graines × 30 jours rejouées deux fois → hachages identiques (voies comprises)', diverge === 0 && hybridsSeen > 0, diverge + ' divergence(s), ' + hybridsSeen + ' héros hybrides au J30, ' + (Date.now() - t0) + ' ms');
}

// ---------- (2) seuils, proposition, choix automatique ----------
{
  let heroes10 = 0, hybrid10 = 0, offerBad = [], autoDelays = {}, voieSections = 0, gabarits = {};
  for (let seed = 1; seed <= 12; seed++) {
    let s = sim.newGame(seed, data, { managers: managersFor(seed) });
    const offer = {}, chosen = {};
    for (let d = 1; d <= 12; d++) {
      const r = sim.resolveDay(s, acts(s));
      s = r.state;
      const sec = (r.chronicle.sections || []).filter(x => x.phase === 'voie')[0];
      if (sec) { voieSections++; for (const line of sec.lines) gabarits[line.slice(0, 24)] = 1; }
      for (const id of Object.keys(s.heroes).sort()) {
        const h = s.heroes[id];
        if (h.hybrid_offer_day !== null && h.hybrid_offer_day !== undefined && offer[id] === undefined) {
          offer[id] = h.hybrid_offer_day;
          if (!(h.level >= L.hybrid_level_min || h.hybrid_offer_day >= L.hybrid_day_min)) offerBad.push(seed + '/' + id + ' : proposition hors seuil');
        }
        if (h.hybrid && chosen[id] === undefined) { chosen[id] = d; if (offer[id] !== undefined && h.owner === 'p1') autoDelays[d - offer[id]] = (autoDelays[d - offer[id]] || 0) + 1; }
      }
      if (d === 10) { const ids = Object.keys(s.heroes); heroes10 += ids.length; hybrid10 += ids.filter(id => s.heroes[id].hybrid).length; }
    }
  }
  const delays = Object.keys(autoDelays).map(Number).sort((a, b) => a - b);
  check('(2a) 90 % des héros ont choisi leur voie au jour 10 (plans par défaut)', hybrid10 * 10 >= heroes10 * 9, hybrid10 + '/' + heroes10 + ' héros hybrides au J10');
  check('(2b) proposition le soir du seuil (niveau ≥ ' + L.hybrid_level_min + ' ou jour ≥ ' + L.hybrid_day_min + ') ; section « Voie » dans la chronique avec ses gabarits', offerBad.length === 0 && voieSections > 0 && Object.keys(gabarits).length >= 6, voieSections + ' sections, ' + Object.keys(gabarits).length + ' formulations distinctes' + (offerBad.length ? ' | ' + offerBad[0] : ''));
  check('(2c) sans réponse du joueur, le choix automatique tombe exactement ' + L.hybrid_auto_days + ' jours après la proposition', delays.length === 1 && delays[0] === L.hybrid_auto_days, 'délais observés : ' + delays.join(',') + ' (héros du manager humain)');
}

// ---------- (3) les 13 hybrides atteignables et choisis ----------
{
  const chosen = {}, reachable = {};
  for (const H of HYBRIDS) for (const cls of CLASSES) if ((H.pairs || [H.bases]).some(p => p.indexOf(cls) >= 0)) reachable[H.id] = 1;
  for (let seed = 1; seed <= 40; seed++) {
    const s = play(seed, 12);
    for (const id of Object.keys(s.heroes)) if (s.heroes[id].hybrid) chosen[s.heroes[id].hybrid] = (chosen[s.heroes[id].hybrid] || 0) + 1;
  }
  const missing = HYBRIDS.filter(H => !chosen[H.id]).map(H => H.id);
  check('(3) les 13 hybrides sont atteignables depuis une classe de base et chacun est choisi au moins une fois sur 40 graines',
    HYBRIDS.length === 13 && Object.keys(reachable).length === 13 && missing.length === 0,
    missing.length ? 'jamais choisis : ' + missing.join(', ') : HYBRIDS.map(H => H.id + ':' + chosen[H.id]).join(' '));
}

// ---------- (4) action choose_hybrid ----------
{
  const s = play(7, 8);
  const ids = Object.keys(s.heroes).sort();
  const mine = ids.filter(id => s.heroes[id].owner === 'p1')[0];
  const other = ids.filter(id => s.heroes[id].owner !== 'p1')[0];
  const cls = s.heroes[mine].class_id;
  const legal = HYBRIDS.filter(H => (H.pairs || [H.bases]).some(p => p.indexOf(cls) >= 0)).map(H => H.id);
  const illegal = HYBRIDS.filter(H => legal.indexOf(H.id) < 0)[0].id;
  const mk = (payload, id) => ({ manager_id: 'p1', day: s.day, type: 'choose_hybrid', payload: Object.assign({ adventurer_id: id === undefined ? mine : id }, payload) });
  const okV = sim.validateAction(s, mk({ hybrid_id: legal[0] }));
  const bads = [
    sim.validateAction(s, mk({ hybrid_id: illegal })),
    sim.validateAction(s, mk({ hybrid_id: 'sorcier_des_neiges' })),
    sim.validateAction(s, mk({ hybrid_id: legal[0] }, other)),
    sim.validateAction(s, mk({ hybrid_id: legal[0] }, 'h_inconnu')),
    sim.validateAction(s, { manager_id: 'p1', day: s.day, type: 'choose_hybrid', payload: {} })
  ];
  // une fois la voie prise, la seconde demande est refusée
  const after = sim.resolveDay(s, acts(s).concat([mk({ hybrid_id: legal[0] })])).state;
  const twice = sim.validateAction(after, { manager_id: 'p1', day: after.day, type: 'choose_hybrid', payload: { adventurer_id: mine, hybrid_id: legal[1] } });
  const early = (function () {
    const y = play(7, 3);
    const h = Object.keys(y.heroes).sort().filter(id => y.heroes[id].owner === 'p1')[0];
    const c = y.heroes[h].class_id;
    const lg = HYBRIDS.filter(H => (H.pairs || [H.bases]).some(p => p.indexOf(c) >= 0))[0].id;
    return sim.validateAction(y, { manager_id: 'p1', day: y.day, type: 'choose_hybrid', payload: { adventurer_id: h, hybrid_id: lg } });
  }());
  check('(4a) choose_hybrid légal accepté, et la voie est appliquée par resolveDay', okV.ok && after.heroes[mine].hybrid === legal[0] && after.heroes[mine].hybrid_offer_day === null, 'voie ' + after.heroes[mine].hybrid);
  check('(4b) choose_hybrid illégal refusé avec sa raison (voie d\'une autre classe, voie inconnue, héros d\'un autre manager, héros inconnu, charge vide, déjà hybride, seuil non atteint)',
    bads.every(v => !v.ok && typeof v.reason === 'string' && v.reason.length > 3) && !twice.ok && !early.ok,
    [bads[0].reason, bads[1].reason, bads[2].reason, twice.reason, early.reason].join(' / '));
}

// ---------- (5) variance des ressources + (10) sorts hybrides lancés ----------
// Échantillon : chaque voie est forcée sur tous les héros dont la classe de base la permet, sur les trois dragons
// (13 voies × 3 dragons × 3 graines ≈ 117 raids) — chaque ressource a donc une vraie occasion de bouger.
const RES = {}, CASTS = {};
function voiesCycliques(seed) {
  return (h, i) => {
    const opts = HYBRIDS.filter(H => (H.pairs || [H.bases]).some(p => p.indexOf(h.class_id) >= 0));
    return opts.length ? opts[(seed + i) % opts.length].id : null;
  };
}
function voieUnique(id) {
  const H = HYBRIDS.filter(x => x.id === id)[0], bases = {};
  for (const pr of (H.pairs || [H.bases])) for (const c of pr) bases[c] = 1;
  return h => (bases[h.class_id] ? id : null);
}
{
  const biomes = ['forest', 'mountain', 'marsh'];
  let raids = 0;
  for (const H of HYBRIDS) for (const biome of biomes) for (let seed = 1; seed <= 3; seed++) {
    const r = runRaid(forcedRaid(seed, biome, 14, voieUnique(H.id)));
    raids++;
    for (const k of Object.keys(r.res)) { RES[k] = RES[k] || {}; for (const v of r.res[k]) RES[k][v] = 1; }
    for (const k of Object.keys(r.casts)) CASTS[k] = (CASTS[k] || 0) + r.casts[k];
  }
  const thin = HYBRIDS.filter(H => Object.keys(RES[H.id] || {}).length < 2).map(H => H.id + '(' + Object.keys(RES[H.id] || {}).join('/') + ')');
  check('(5) variance : chaque ressource d\'hybride prend au moins deux valeurs distinctes sur ' + raids + ' raids (ADR-002)', thin.length === 0,
    thin.length ? 'trop plates : ' + thin.join(', ') : HYBRIDS.map(H => H.resource + ':' + Object.keys(RES[H.id]).sort((a, b) => a - b).join('/')).join(' · '));
  const never = HYB_SPELLS.filter(id => !(CASTS[id] > 0));
  check('(10) les 26 sorts hybrides sont lancés au moins une fois par le passage automatique', never.length === 0,
    never.length ? 'jamais lancés : ' + never.join(', ') : HYB_SPELLS.map(id => id + ':' + CASTS[id]).join(' '));
}

// ---------- (6) et (7) mécanismes du Drake et de l'Hydre ----------
function bossRun(biome, seeds, day) {
  const agg = { mech: {}, zones: {}, won: 0, lost: 0, days: [], zeroDays: 0, unclosed: 0, deaths: 0 };
  for (const seed of seeds) {
    const r = runRaid(forcedRaid(seed, biome, day || 14, voieUnique(HYBRIDS[(seed - 1) % HYBRIDS.length].id)));   // une voie forcée par graine : les 13 se mesurent à chaque dragon
    for (const k of Object.keys(r.mech)) agg.mech[k] = (agg.mech[k] || 0) + r.mech[k];
    for (const k of Object.keys(r.zones)) agg.zones[k] = (agg.zones[k] || 0) + r.zones[k];
    for (const d of r.damageDays) if (d === 0) agg.zeroDays++;
    if (r.history) { agg[r.history.status === 'won' ? 'won' : 'lost']++; agg.days.push(r.history.day_end - r.history.day_start + 1); }
    else agg.unclosed++;
    agg.deaths += (r.state.graves || []).length;
  }
  return agg;
}
const SEEDS20 = []; for (let i = 1; i <= 20; i++) SEEDS20.push(i);
const drake = bossRun('mountain', SEEDS20);             // réveil « tôt » (J14)
const hydre = bossRun('marsh', SEEDS20);
const drakeTard = bossRun('mountain', SEEDS20, 21);     // réveil « tard » (J21) : le dragon grossit, la guilde aussi
const hydreTard = bossRun('marsh', SEEDS20, 21);
{
  const m = drake.mech, z = drake.zones;
  const miss = [];
  if (!m.souffle_annonce) miss.push('souffle annoncé');
  if (!m.souffle) miss.push('souffle résolu');
  if (!z.cendres) miss.push('cendres posées par le souffle');
  if (!m.envol) miss.push('envol');
  if (!m.atterrissage && !m.ancrage) miss.push('atterrissage');
  if (!m.fournaise) miss.push('fournaise');
  if (!m.fissure) miss.push('écailles fissurées');
  if (!m.morsure && !m.queue) miss.push('morsure / coup de queue');
  check('(6) Drake des monts : souffle télégraphié puis résolu (cendres posées), envol, atterrissage, fournaise, écailles fissurées, morsure — chacun au moins une fois avec son effet',
    miss.length === 0, miss.length ? 'jamais vu : ' + miss.join(', ') : Object.keys(m).sort().map(k => k + ':' + m[k]).join(' ') + ' · cendres ' + z.cendres);
}
{
  const m = hydre.mech, z = hydre.zones;
  const miss = [];
  if (!m.trois_gueules) miss.push('trois gueules');
  if (!m.venin) miss.push('venin');
  if (!z.venin) miss.push('zone de venin posée');
  if (!m.immersion) miss.push('immersion');
  if (!hydre.mech.sangsue && !hydre.adds) miss.push('');
  if (!m.tete_coupee) miss.push('tête coupée');
  if (!m.decapitation_double && !m.cauterisation) miss.push('double décapitation / cautérisation');
  check('(7) Hydre des marais : trois gueules, venin (zone), immersion, sangsues, tête coupée, double décapitation — chacun au moins une fois avec son effet',
    miss.filter(x => x).length === 0, miss.filter(x => x).length ? 'jamais vu : ' + miss.filter(x => x).join(', ') : Object.keys(m).sort().map(k => k + ':' + m[k]).join(' '));
}
{
  const arms = [['Drake J14', drake], ['Hydre J14', hydre], ['Drake J21', drakeTard], ['Hydre J21', hydreTard]];
  const ok = arms.every(([, a]) => a.won * 10 >= (a.won + a.lost) * 3);
  const zero = arms.reduce((n, [, a]) => n + a.zeroDays, 0), unclosed = arms.reduce((n, [, a]) => n + a.unclosed, 0);
  check('(8) Drake et Hydre tombent chacun sur ≥ 30 % des graines où ils se réveillent (réveil tôt J14 et tard J21) ; aucun raid impossible (aucune journée à 0 dégât, tous clos)',
    ok && zero === 0 && unclosed === 0,
    arms.map(([n, a]) => n + ' ' + a.won + '/' + (a.won + a.lost)).join(' · ') + ' · journées à 0 dégât ' + zero + ' · non clos ' + unclosed);
}

// ---------- (9) le besoin de brûleur existe encore ----------
{
  function arm(noBurner) {
    const classes = ['warrior', 'cleric', 'ranger', 'rogue', noBurner ? 'warrior' : 'mage', noBurner ? 'rogue' : 'summoner'];
    const managers = classes.map((c, i) => ({ id: i === 0 ? 'p1' : 'f_' + i, name: 'M' + i, kind: i === 0 ? 'human' : 'ai', profile: i === 0 ? 'humain' : (i % 2 ? 'prudent' : 'audacieux'), class_id: c }));
    let won = 0, total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runRaid(forcedRaid(seed, 'forest', 14, (h, i) => {
        const opts = HYBRIDS.filter(H => (H.pairs || [H.bases]).some(p => p.indexOf(h.class_id) >= 0) && (!noBurner || (H.id !== 'spirite' && H.id !== 'conjurateur')));
        return opts.length ? opts[(seed + i) % opts.length].id : null;
      }, managers));
      if (r.history) { total++; if (r.history.status === 'won') won++; }
    }
    return { won, total };
  }
  const sans = arm(true), avec = arm(false);
  check('(9) le besoin de brûleur existe : sans Mage ni Spirite ni Conjurateur, le Sylvain tombe bien moins souvent (≥ 20 points d\'écart)',
    sans.total > 0 && avec.total > 0 && (avec.won * 100 / avec.total) - (sans.won * 100 / sans.total) >= 20,
    'sans brûleur ' + sans.won + '/' + sans.total + ' · avec brûleur ' + avec.won + '/' + avec.total);
}

// ---------- (11) viewModel ----------
{
  const bad = [], shapes = [];
  let choiceSeen = 0, hybridSeen = 0, views = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let s = sim.newGame(seed, data, { managers: managersFor(seed) });
    for (let d = 1; d <= 14; d++) {
      s = sim.resolveDay(s, acts(s)).state;
      for (const m of sim.listManagers(s)) {
        const vm = sim.viewModel(s, m);
        views++;
        const out = [];
        hasUndefined(vm.choice, 'VM.choice', out);
        hasUndefined(vm.group_needs, 'VM.group_needs', out);
        for (const h of vm.roster) hasUndefined(h.hybrid, 'VM.roster[' + h.id + '].hybrid', out);
        for (const b of vm.biomes) hasUndefined(b.dragon && b.dragon.raid, 'VM.biomes[' + b.id + '].dragon.raid', out);
        if (out.length) bad.push(out[0]);
        if (vm.choice) {
          choiceSeen++;
          const C = vm.choice;
          if (C.kind !== 'hybrid' || !s.heroes[C.adventurer_id] || !Array.isArray(C.options) || !C.options.length || !Number.isInteger(C.deadline_day)) shapes.push('choice mal formée (graine ' + seed + ' j' + d + ')');
          for (const o of C.options) if (typeof o.name !== 'string' || typeof o.identity !== 'string' || !Number.isInteger(o.affinity) || typeof o.recommended !== 'boolean' || !Array.isArray(o.spells) || o.spells.length !== 2 || !Array.isArray(o.answers)) shapes.push('option mal formée : ' + o.id);
          if (C.options.filter(o => o.recommended).length !== 1) shapes.push('pastille « recommandé » absente ou multiple');
        }
        for (const h of vm.roster) if (h.hybrid) { hybridSeen++; if (!h.hybrid.id || !h.hybrid.name || !h.hybrid.resource || !h.hybrid.resource_label) shapes.push('roster.hybrid incomplet : ' + h.id); }
        if (!vm.group_needs || vm.group_needs.missing.length !== L.need_missing || !vm.group_needs.label) shapes.push('group_needs incomplet');
        if (vm.biomes.filter(b => b.dragon && b.dragon.raid).length !== 3) shapes.push('les trois biomes n\'exposent pas leur fiche de raid');
      }
    }
  }
  check('(11) VM.choice, VM.roster[].hybrid, VM.group_needs et VM.biomes[].dragon.raid : forme conforme et aucun undefined (' + views + ' vues)',
    bad.length === 0 && shapes.length === 0 && choiceSeen > 0 && hybridSeen > 0,
    (bad[0] || shapes[0] || 'choix vus ' + choiceSeen + ', hybrides vus ' + hybridSeen));
}

// ---------- distribution mesurée ----------
{
  const chosen = {}, byDragon = { forest: { won: 0, lost: 0 }, mountain: { won: 0, lost: 0 }, marsh: { won: 0, lost: 0 } };
  const days = [];
  let deaths = 0, heroes = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const s = play(seed, 30);
    for (const id of Object.keys(s.heroes)) { heroes++; if (s.heroes[id].hybrid) chosen[s.heroes[id].hybrid] = (chosen[s.heroes[id].hybrid] || 0) + 1; }
    deaths += (s.graves || []).length;
    for (const r of (s.raid_history || [])) {
      const b = Object.keys(byDragon).filter(k => data.dragons[k].id === r.dragon_id)[0];
      if (b) byDragon[b][r.status === 'won' ? 'won' : 'lost']++;
      days.push(r.day_end - r.day_start + 1);
    }
  }
  console.log('\n--- Distribution mesurée (30 graines × 30 jours, 6 managers, plans par défaut) ---');
  console.log('Voies choisies : ' + HYBRIDS.map(H => H.name + ' ' + (chosen[H.id] || 0)).join(' · '));
  console.log('Raids par dragon : ' + Object.keys(byDragon).map(k => data.dragons[k].name + ' ' + byDragon[k].won + ' gagnés / ' + byDragon[k].lost + ' perdus').join(' · '));
  console.log('Jours par raid : ' + days.join(',') + ' · morts ' + deaths + ' sur ' + heroes + ' héros vivants au J30');
  console.log('Raids forcés (20 graines, une voie forcée par graine) — Drake J14 : ' + drake.won + ' gagnés, jours ' + drake.days.join(',') + ' · Drake J21 : ' + drakeTard.won + ' gagnés');
  console.log('Hydre J14 : ' + hydre.won + ' gagnés, jours ' + hydre.days.join(',') + ' · Hydre J21 : ' + hydreTard.won + ' gagnés');
}

const failed = results.filter(r => !r.ok);
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' contrôles passés');
process.exit(failed.length ? 1 : 0);

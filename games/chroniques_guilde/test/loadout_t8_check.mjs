// Banc V5 T8 — CINQ EMPLACEMENTS DE SORTS (règle de Pierre).
// Preuve par exécution, moteur seul : node test/loadout_t8_check.mjs   (code de sortie 1 si un contrôle échoue)
//
// La règle, dans ses mots : « Tu as toujours cinq emplacements de compétences. Tu choisis entre les deux premières
// classes et la nouvelle voie pour en avoir cinq, que tu gardes. » Ce banc mesure la RÈGLE et rien d'autre ; la
// conception des sorts de branche est mesurée par tactic_t3_check, la saison par season_t5_check.
//
// (1) CINQ EMPLACEMENTS, TOUJOURS — sur 30 graines × 30 jours, aucun héros n'emporte jamais plus ni moins que
//     min(5, vivier) sorts, et aucun n'emporte une liste vide.
// (2) LE VIVIER GRANDIT AVEC LA LIGNÉE — 5 à la classe nue (arme + 4), 11 à la voie (+ seconde base + 2), 13 à la
//     pointe (+ 2), pour tous les profils atteignables. Le nombre d'emplacements, lui, ne bouge jamais.
// (3) LES PASSIFS NE PRENNENT PAS D'EMPLACEMENT — aucun identifiant de passif (data.tactic_passives, specs[].passive)
//     n'est un sort du vivier ; un héros de pointe garde son passif tout en n'emportant que cinq sorts actifs.
// (4) UN CHARGEMENT INVALIDE EST REFUSÉ AVEC SA RAISON — trop de sorts, trop peu, doublon, sort hors vivier, sort
//     inconnu, aucun moyen d'infliger des dégâts, héros d'un autre manager, héros sur la grille.
// (5) UN CHARGEMENT PAR DÉFAUT NON VIDE POUR TOUT HÉROS — les 7 classes nues, les 26 paires (classe, voie) et les
//     52 (classe, voie, pointe) reçoivent cinq sorts, tous dans leur vivier, dont au moins un qui blesse.
// (6) LE CHOIX SE GARDE — un chargement choisi tient d'un jour à l'autre, survit à la voie et à la pointe, et
//     n'est pas refait par le moteur ; et il est REFUSÉ tant que le héros est sur la grille.
// (7) FRÉQUENCES DE SÉLECTION DANS LEURS BORNES — la vraie mesure de santé (elle REMPLACE « aucune pointe ne fait
//     moins que sa voie nue », qui n'a plus de sens à cinq emplacements : un sort moins bon n'est pas emporté).
//     Sur 100 saisons × 30 jours × 6 héros, en ne comptant que les héros dont le vivier DÉPASSE les cinq
//     emplacements (sinon il n'y a pas de choix à faire) : aucun sort jamais choisi, aucun toujours choisi, et
//     toutes les fréquences dans [15 %, 97 %]. Mesuré en T8 : 23,1 % (Mur de boucliers) à 94,8 % (Rafale).
// (8) DIVERSITÉ — les amis simulés ne prennent pas tous les mêmes sorts : au moins 400 chargements distincts
//     observés et au moins deux chargements distincts par héros-saison en moyenne.
// (9) DÉTERMINISME — 30 graines rejouées deux fois : mêmes chargements, mêmes hachages.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const T = require(path.join(ROOT, 'tactic.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const SLOTS = data.constants.spell_slots;
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const CLASSES = data.classes.map(c => c.id);
const managersFor = (seed, n) => ['Vous', 'Anselme', 'Roxane', 'Bastien', 'Maëlle', 'Ysolde'].slice(0, n)
  .map((nm, i) => ({ id: i === 0 ? 'p1' : 'f_' + i, name: nm, kind: i === 0 ? 'human' : 'ai',
    profile: i === 0 ? 'humain' : (i % 2 ? 'prudent' : 'audacieux'), class_id: CLASSES[(i + seed) % CLASSES.length] }));
const acts = s => { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; };
const prof = h => ({ id: h.id, class_id: h.class_id, hybrid_id: h.hybrid || null, spec_id: h.spec || null, level: h.level, loadout: h.loadout, loadout_for: h.loadout_for || null });
const envOf = s => sim._internal.raidEnvOf(s, null);
const idx = {}; for (const sp of data.tactic_spells) idx[sp.id] = sp;
const t0 = Date.now();

// ---------------- (1) cinq emplacements, toujours ----------------
{
  let heroes = 0, bad = [], empty = 0;
  for (let i = 0; i < 30; i++) {
    const seed = 1000 + i * 7;
    let s = sim.newGame(seed, data, { managers: managersFor(seed, 6) });
    for (let d = 0; d < 30 && !s.collapsed; d++) {
      const env = envOf(s);
      for (const h of Object.values(s.heroes)) {
        heroes++;
        const p = prof(h), pool = T.spellPool(env, p), carried = T.unitLoadout(env, p);
        const want = Math.min(SLOTS, pool.length);
        if (!carried.length) empty++;
        if (carried.length !== want && bad.length < 5) bad.push(h.id + ' : ' + carried.length + ' emportés pour ' + want + ' emplacements');
        const dup = {}; for (const id of carried) { if (dup[id] && bad.length < 5) bad.push(h.id + ' : doublon ' + id); dup[id] = 1; }
        for (const id of carried) if (pool.indexOf(id) < 0 && bad.length < 5) bad.push(h.id + ' : ' + id + ' hors vivier');
      }
      s = sim.resolveDay(s, acts(s)).state;
    }
  }
  check('(1) cinq emplacements, toujours : sur 30 graines × 30 jours, tout héros emporte exactement min(5, vivier) sorts, sans doublon, tous dans son vivier, jamais une liste vide',
    bad.length === 0 && empty === 0 && heroes > 3000, heroes + ' héros-jours · ' + (bad.length ? bad.join(' | ') : 'aucun écart') + ' · listes vides ' + empty);
}

// ---------------- (2) le vivier grandit avec la lignée ----------------
{
  const env = { data: data, seed: 1, day: 10, managers: [], heroes: {} };
  const sizes = { nu: {}, voie: {}, pointe: {} }, bad = [];
  for (const c of data.classes) {
    const n = T.spellPool(env, { id: 'x', class_id: c.id, hybrid_id: null, spec_id: null }).length;
    sizes.nu[n] = (sizes.nu[n] || 0) + 1;
    if (n !== SLOTS) bad.push(c.id + ' nu : vivier ' + n);
  }
  for (const H of data.hybrids) for (const pr of (H.pairs && H.pairs.length ? H.pairs : [H.bases])) for (const cl of pr) {
    const nH = T.spellPool(env, { id: 'x', class_id: cl, hybrid_id: H.id, spec_id: null }).length;
    sizes.voie[nH] = (sizes.voie[nH] || 0) + 1;
    if (nH !== 11) bad.push(cl + '/' + H.id + ' : vivier ' + nH);
    for (const S of data.specs) if (S.hybrid === H.id) {
      const nS = T.spellPool(env, { id: 'x', class_id: cl, hybrid_id: H.id, spec_id: S.id }).length;
      sizes.pointe[nS] = (sizes.pointe[nS] || 0) + 1;
      if (nS !== 13) bad.push(cl + '/' + H.id + '/' + S.id + ' : vivier ' + nS);
      const carried = T.defaultLoadout(env, { id: 'h1', class_id: cl, hybrid_id: H.id, spec_id: S.id }, null);
      if (carried.length !== SLOTS) bad.push(cl + '/' + S.id + ' : ' + carried.length + ' emportés');
    }
  }
  check('(2) le vivier grandit avec la lignée (5 à la classe nue, 11 à la voie, 13 à la pointe) et le nombre d\'emplacements ne bouge jamais',
    bad.length === 0, 'nu ' + JSON.stringify(sizes.nu) + ' · voie ' + JSON.stringify(sizes.voie) + ' · pointe ' + JSON.stringify(sizes.pointe) + (bad.length ? ' · ' + bad.slice(0, 4).join(' | ') : ''));
}

// ---------------- (3) les passifs ne prennent pas d'emplacement ----------------
{
  const env = { data: data, seed: 1, day: 10, managers: [], heroes: {} };
  const passives = Object.keys(data.tactic_passives).map(k => data.tactic_passives[k])
    .concat(data.specs.map(S => (S.passive || {}).id).filter(Boolean));
  const inPool = [];
  for (const S of data.specs) {
    const cl = ((data.hybrids.filter(H => H.id === S.hybrid)[0] || {}).pairs || [[]])[0][0];
    if (!cl) continue;
    const pool = T.spellPool(env, { id: 'x', class_id: cl, hybrid_id: S.hybrid, spec_id: S.id });
    for (const pid of passives) if (pool.indexOf(pid) >= 0) inPool.push(S.id + '/' + pid);
    const carried = T.defaultLoadout(env, { id: 'h1', class_id: cl, hybrid_id: S.hybrid, spec_id: S.id }, null);
    if (carried.length !== SLOTS) inPool.push(S.id + ' : ' + carried.length + ' emportés');
  }
  check('(3) les passifs ne prennent pas d\'emplacement : aucun des ' + passives.length + ' passifs (7 de classe + 26 de pointe) n\'est un sort du vivier, et un héros de pointe emporte bien cinq sorts ACTIFS',
    inPool.length === 0, inPool.length ? inPool.slice(0, 4).join(' | ') : passives.length + ' passifs, tous hors vivier');
}

// ---------------- (4) un chargement invalide est refusé avec sa raison ----------------
{
  let s = sim.newGame(4242, data, { managers: managersFor(4242, 6) });
  for (let d = 0; d < 12; d++) s = sim.resolveDay(s, acts(s)).state;
  const mineHero = Object.values(s.heroes).filter(h => h.owner === 'p1')[0];
  const other = Object.values(s.heroes).filter(h => h.owner !== 'p1')[0];
  const env = envOf(s), pool = T.spellPool(env, prof(mineHero));
  const ok5 = T.unitLoadout(env, prof(mineHero));
  const outside = data.tactic_spells.filter(sp => pool.indexOf(sp.id) < 0)[0].id;
  const dmg = ok5.filter(id => (idx[id].power || 0) > 0)[0];
  const noDmg = pool.filter(id => !(idx[id].power || 0)).slice(0, 5);
  const mk = (payload, mgr) => ({ manager_id: mgr || 'p1', day: s.day, type: 'set_loadout', payload: payload });
  const cases = [
    ['trop de sorts', mk({ adventurer_id: mineHero.id, spells: pool.slice(0, 6) })],
    ['trop peu de sorts', mk({ adventurer_id: mineHero.id, spells: pool.slice(0, 3) })],
    ['doublon', mk({ adventurer_id: mineHero.id, spells: [pool[0], pool[0], pool[1], pool[2], pool[3]] })],
    ['sort hors vivier', mk({ adventurer_id: mineHero.id, spells: [outside].concat(pool.slice(0, 4)) })],
    ['sort inconnu', mk({ adventurer_id: mineHero.id, spells: ['sort_qui_n_existe_pas'].concat(pool.slice(0, 4)) })],
    ['héros d\'un autre manager', mk({ adventurer_id: other.id, spells: T.unitLoadout(env, prof(other)) })],
    ['chargement absent', mk({ adventurer_id: mineHero.id, spells: null })]
  ];
  if (noDmg.length === 5) cases.push(['aucun moyen de blesser', mk({ adventurer_id: mineHero.id, spells: noDmg })]);
  const lines = [], bad = [];
  for (const [label, a] of cases) {
    const v = sim.validateAction(s, a);
    if (v.ok || typeof v.reason !== 'string' || !v.reason.length) bad.push(label);
    else lines.push(label + ' → « ' + v.reason + ' »');
  }
  console.log('   refus mesurés : ' + lines.join(' · '));
  const good = sim.validateAction(s, mk({ adventurer_id: mineHero.id, spells: [dmg].concat(pool.filter(id => id !== dmg).slice(0, 4)) }));
  check('(4) un chargement invalide est refusé avec sa raison en français (' + cases.length + ' cas), un chargement valide est accepté',
    bad.length === 0 && good.ok === true, bad.length ? 'acceptés à tort : ' + bad.join(', ') : cases.length + ' refus, 1 acceptation');
}

// ---------------- (5) un chargement par défaut non vide pour TOUT héros ----------------
{
  const env = { data: data, seed: 77, day: 12, managers: [], heroes: {} };
  const RAIDS = [null].concat(Object.keys(data.raids).sort());
  const profs = [];
  for (const c of data.classes) profs.push({ class_id: c.id, hybrid_id: null, spec_id: null });
  for (const H of data.hybrids) for (const pr of (H.pairs && H.pairs.length ? H.pairs : [H.bases])) for (const cl of pr) {
    profs.push({ class_id: cl, hybrid_id: H.id, spec_id: null });
    for (const S of data.specs) if (S.hybrid === H.id) profs.push({ class_id: cl, hybrid_id: H.id, spec_id: S.id });
  }
  const bad = [];
  for (const p of profs) for (const r of RAIDS) for (let k = 0; k < 4; k++) {
    const u = Object.assign({ id: 'h' + k }, p);
    const pool = T.spellPool(env, u), want = Math.min(SLOTS, pool.length);
    const L = T.defaultLoadout(env, u, r);
    const why = T.loadoutWhy(env, u, L);
    if (L.length !== want || why) bad.push(p.class_id + '/' + (p.hybrid_id || '-') + '/' + (p.spec_id || '-') + '@' + r + ' : ' + (why || L.length + ' sorts'));
  }
  check('(5) un chargement par défaut non vide, valide et complet pour TOUT héros : ' + profs.length + ' profils × ' + RAIDS.length + ' situations de boss × 4 héros',
    bad.length === 0, bad.length ? bad.slice(0, 4).join(' | ') : profs.length * RAIDS.length * 4 + ' chargements, tous valides');
}

// ---------------- (6) le choix se garde ; refusé pendant un passage ----------------
{
  // On cherche une partie où le héros de p1 a un VIVIER plus large que ses cinq emplacements : sinon il n'y a
  // pas de choix à garder (un Barde sans voie ouverte emporte forcément ses cinq sorts).
  let s = null, hid = null, seedUsed = 0;
  for (let k = 0; k < 12 && !hid; k++) {
    const sd = 909 + k * 31;
    let t = sim.newGame(sd, data, { managers: managersFor(sd, 6) });
    for (let d = 0; d < 14; d++) t = sim.resolveDay(t, acts(t)).state;
    const e = envOf(t);
    const c = Object.values(t.heroes).filter(h => h.owner === 'p1' && T.spellPool(e, prof(h)).length > SLOTS)[0];
    if (c) { s = t; hid = c.id; seedUsed = sd; }
  }
  if (!s) { s = sim.newGame(909, data, { managers: managersFor(909, 6) }); for (let d = 0; d < 14; d++) s = sim.resolveDay(s, acts(s)).state; hid = Object.values(s.heroes).filter(h => h.owner === 'p1')[0].id; }
  const env0 = envOf(s);
  const env = env0, pool = T.spellPool(env, prof(s.heroes[hid]));
  const auto = T.unitLoadout(env, prof(s.heroes[hid])).slice().sort().join(',');
  const dmgId = pool.filter(id => (idx[id].power || 0) > 0)[0];
  // un chargement DIFFÉRENT du défaut, pour prouver que c'est bien le choix qui tient, pas la règle qui repasse
  let wanted = null;
  for (let k = 1; k + SLOTS - 1 <= pool.length && !wanted; k++) {
    const cand2 = [dmgId].concat(pool.filter(id => id !== dmgId).slice(k, k + SLOTS - 1));
    if (cand2.length === SLOTS && cand2.slice().sort().join(',') !== auto) wanted = cand2;
  }
  wanted = wanted || [dmgId].concat(pool.filter(id => id !== dmgId).slice(0, SLOTS - 1));
  const a = { manager_id: 'p1', day: s.day, type: 'set_loadout', payload: { adventurer_id: hid, spells: wanted } };
  const v0 = sim.validateAction(s, a);
  let st = sim.resolveDay(s, acts(s).concat([a])).state;
  const kept = [], kinds = [];
  for (let d = 0; d < 8 && st.heroes[hid]; d++) {
    const e2 = envOf(st);
    kept.push(T.unitLoadout(e2, prof(st.heroes[hid])).slice().sort().join(','));
    kinds.push(st.heroes[hid].loadout_kind);
    st = sim.resolveDay(st, acts(st)).state;
  }
  const want = wanted.slice().sort().join(',');
  const stable = kept.length > 5 && kept.every(x => x === want) && kinds.every(k => k === 'choice');
  // refusé pendant un passage : un passage en cours, puis un passage déjà joué aujourd'hui
  let sr = sim.newGame(909, data, { managers: managersFor(909, 6) });
  for (let d = 0; d < 30 && !(sr.raid && sr.raid.status === 'active'); d++) sr = sim.resolveDay(sr, acts(sr)).state;
  let r1 = null, r2 = null;
  if (sr.raid && sr.raid.status === 'active') {
    const h2 = Object.values(sr.heroes).filter(h => h.owner === 'p1')[0];
    const p2 = T.spellPool(envOf(sr), prof(h2));
    const dmg2 = p2.filter(id => (idx[id].power || 0) > 0)[0];
    const good = [dmg2].concat(p2.filter(id => id !== dmg2).slice(0, SLOTS - 1));
    const ask = { manager_id: 'p1', day: sr.day, type: 'set_loadout', payload: { adventurer_id: h2.id, spells: good } };
    const okMorning = sim.validateAction(sr, ask);                             // le matin, hors grille : accepté
    const s1 = JSON.parse(JSON.stringify(sr)); sim.attach(s1, data);
    s1.raid.pass = { hero_id: h2.id, hero_name: h2.first_name, turn: 1, done: false };
    r1 = sim.validateAction(s1, ask);
    const s2 = JSON.parse(JSON.stringify(sr)); sim.attach(s2, data);
    s2.raid.passes_done.push({ day: s2.day, hero_id: h2.id, manager_id: 'p1', hero_name: h2.first_name, damage: 0, ko: false, turns: 1, actions: 1 });
    r2 = sim.validateAction(s2, ask);
    check('(6b) le chargement se revoit le matin, jamais pendant un passage : accepté hors grille, refusé si un passage est en cours ou déjà joué aujourd\'hui',
      okMorning.ok === true && r1 && r1.ok === false && r2 && r2.ok === false && /passage/.test(r1.reason) && /passage/.test(r2.reason),
      'matin ' + okMorning.ok + ' · en cours « ' + (r1 && r1.reason) + ' » · déjà joué « ' + (r2 && r2.reason) + ' »');
  } else check('(6b) le chargement se revoit le matin, jamais pendant un passage', false, 'aucun raid actif trouvé');
  check('(6a) le choix se garde d\'un jour à l\'autre : ordonné une fois (et DIFFÉRENT du chargement par défaut), il vaut encore huit jours plus tard et le moteur ne le refait pas',
    v0.ok === true && stable && want !== auto && pool.length > SLOTS,
    'graine ' + seedUsed + ' · vivier ' + pool.length + ' · défaut « ' + auto + ' » · ordonné « ' + want + ' » · relu ' + kept.length + ' jours · ' + (stable ? 'inchangé' : 'devenu ' + kept[kept.length - 1]));
}

// ---------------- (7) fréquences de sélection dans leurs bornes ----------------
// REMPLACE la contrainte « aucune spécialisation ne fait moins que sa voie nue » (stats_t6 (4c)/(4d) avant T8).
const LO = 15, HI = 97;
{
  const occ = {}, take = {}, byHero = {}, uniq = {};
  for (let i = 0; i < 100; i++) {
    const seed = 1000 + i * 7;
    let s = sim.newGame(seed, data, { managers: managersFor(seed, 6) });
    for (let d = 0; d < 30 && !s.collapsed; d++) {
      s = sim.resolveDay(s, acts(s)).state;
      const env = envOf(s);
      for (const h of Object.values(s.heroes)) {
        const p = prof(h), pool = T.spellPool(env, p);
        if (pool.length <= SLOTS) continue;                                    // vivier à ras bord : aucun choix à faire
        const car = T.unitLoadout(env, p);
        for (const id of pool) occ[id] = (occ[id] || 0) + 1;
        for (const id of car) take[id] = (take[id] || 0) + 1;
        const k = seed + '|' + h.id, sig = car.slice().sort().join(',');
        (byHero[k] = byHero[k] || {})[sig] = 1;
        uniq[sig] = 1;
      }
    }
  }
  const rows = Object.keys(occ).sort().map(id => ({ id, o: occ[id], t: take[id] || 0, pct: Math.round(1000 * (take[id] || 0) / occ[id]) / 10 }));
  rows.sort((a, b) => a.pct - b.pct);
  const never = rows.filter(r => r.t === 0), always = rows.filter(r => r.t === r.o);
  const pointes = rows.filter(r => idx[r.id] && idx[r.id].spec_id);
  const low = rows.filter(r => r.pct < LO), high = rows.filter(r => r.pct > HI);
  console.log('   fréquences (' + rows.length + ' sorts mesurés) : ' + rows.slice(0, 4).map(r => r.id + ' ' + r.pct + ' %').join(' · ') +
    ' … ' + rows.slice(-4).map(r => r.id + ' ' + r.pct + ' %').join(' · '));
  console.log('   pointes : ' + pointes.length + ' sorts, de ' + pointes[0].pct + ' % (' + pointes[0].id + ') à ' + pointes[pointes.length - 1].pct + ' % (' + pointes[pointes.length - 1].id + ')');
  check('(7a) aucun sort de pointe n\'est JAMAIS choisi : un sort jamais pris est un sort mort',
    never.filter(r => idx[r.id] && idx[r.id].spec_id).length === 0 && never.length === 0,
    never.length ? 'jamais pris : ' + never.map(r => r.id).join(' ') : 'les ' + rows.length + ' sorts sont pris au moins une fois');
  check('(7b) aucun sort n\'est TOUJOURS choisi par tous les héros qui y ont accès : un sort obligatoire écrase les autres',
    always.length === 0, always.length ? 'toujours pris : ' + always.map(r => r.id).join(' ') : 'aucun sort à 100 %');
  check('(7c) toutes les fréquences tiennent dans la bande mesurée [' + LO + ' %, ' + HI + ' %] (mesuré en T8 : 23,1 % à 94,8 % sur 100 saisons)',
    low.length === 0 && high.length === 0,
    (low.length ? 'sous la borne : ' + low.map(r => r.id + ' ' + r.pct + ' %').join(' ') + ' ' : '') +
    (high.length ? 'au-dessus : ' + high.map(r => r.id + ' ' + r.pct + ' %').join(' ') : '') ||
    'min ' + rows[0].pct + ' % (' + rows[0].id + ') · max ' + rows[rows.length - 1].pct + ' % (' + rows[rows.length - 1].id + ')');
  const combos = Object.values(byHero).map(o => Object.keys(o).length);
  const moy = combos.reduce((a, b) => a + b, 0) / Math.max(1, combos.length);
  check('(8) diversité : les amis simulés ne prennent pas tous les mêmes sorts — au moins 400 chargements distincts et au moins 2 par héros-saison en moyenne',
    Object.keys(uniq).length >= 400 && moy >= 2,
    Object.keys(uniq).length + ' chargements distincts · ' + (Math.round(moy * 100) / 100) + ' par héros-saison');
}

// ---------------- (9) déterminisme ----------------
{
  const sig = seed => {
    let s = sim.newGame(seed, data, { managers: managersFor(seed, 6) });
    const out = [];
    for (let d = 0; d < 30 && !s.collapsed; d++) {
      s = sim.resolveDay(s, acts(s)).state;
      out.push(sim.hashState(s));
      out.push(Object.keys(s.heroes).sort().map(id => id + ':' + (s.heroes[id].loadout || []).join('/')).join(';'));
    }
    return out.join('|');
  };
  let diff = 0;
  for (let i = 0; i < 30; i++) { const seed = 500 + i * 13; if (sig(seed) !== sig(seed)) diff++; }
  check('(9) déterminisme : 30 graines × 30 jours rejouées, mêmes chargements et mêmes hachages', diff === 0, diff + ' divergence(s)');
}

const fails = results.filter(r => !r.ok);
console.log('\n' + (results.length - fails.length) + '/' + results.length + ' contrôles passés  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
if (fails.length) console.log('ÉCHECS : ' + fails.map(f => f.name).join(' | '));
process.exit(fails.length ? 1 : 0);

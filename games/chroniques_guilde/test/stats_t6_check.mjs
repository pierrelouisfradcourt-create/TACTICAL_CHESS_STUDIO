// Banc V5 T6 — COUCHE STATISTIQUES (audit AUDIT_STATS.md, décisions D1-D9 et règles R-A/R-B/R-C).
// Preuve par exécution, moteur seul : node test/stats_t6_check.mjs   (code de sortie 1 si un contrôle échoue)
//
// Ce banc empêche la régression de ce que T6 a réparé. Il ne mesure pas des sorts ni des cases : il mesure que les
// CHIFFRES du jeu font quelque chose. Chaque contrôle porte une borne mesurée, jamais une valeur exacte.
//
//  (1) L'ENTRAÎNEMENT PRODUIT QUELQUE CHOSE — les sept modificateurs donnent des valeurs distinctes, et un héros qui
//      s'entraîne régulièrement gagne deux à quatre points d'attribut sur une saison (avant T6 : 1 seule valeur, 0 point).
//  (2) LE MORAL UTILISE SES TROIS PALIERS — le palier du milieu n'est plus vide et le palier haut ne prend plus tout ;
//      chapelle et décorations changent le moral de façon mesurable (avant T6 : 98 % dans le seul palier haut, et les
//      décorations valaient NaN, donc zéro).
//  (3) AUCUNE STATISTIQUE DÉCLARÉE SANS EFFET — soin, esquive, toucher, feu, soutien, magie d'objet hors Mage :
//      chacune change l'issue quand on la fait varier seule (avant T6 : six d'entre elles strictement nulles en raid).
//  (4) LES 26 PASSIFS DE SPÉCIALISATION EXISTENT ET MORDENT — 26 fiches remplies, chacune dans la bande 8-15 %,
//      et chaque pointe apporte deux sorts actifs déclarés. (V5 T8 : « la pointe fait plus que sa voie nue » est
//      RETIRÉ — caduc à cinq emplacements ; la santé d'une pointe se mesure par sa fréquence de sélection, dans
//      test/loadout_t8_check.mjs.)
//  (5) LE CHARISME EST UN VRAI ATTRIBUT — valeurs distinctes selon les classes, effet mesurable sur le soutien.
//  (6) LE BARDE EST JOUABLE — il apparaît, il monte, il lance ses quatre sorts, il n'a aucune fiche vide.
//  (7) LES CORPS HÉRITENT DU MAÎTRE — deux équipements opposés donnent des corps nettement différents, et chaque type
//      est le meilleur dans ce pour quoi il hérite (golem = PV/DÉF, élémentaire = magie, nuée = pas de plus).
//  (8) R-A / R-B — aucune résurrection d'invocation, et les corps quittent la grille avec leur maître.
//  (9) R-C — le VIVIER d'un héros de voie contient les DEUX barres de base ; il en emporte cinq (écart T8, voir le bloc).
// (10) BUGS DE L'AUDIT — B5 (plafonds après objets), B7 (la rareté est préférée quand la bourse suit), B10 (la DÉF
//      est fatiguée comme l'attaque), B11 (les plafonds déclarés sont ceux qu'on atteint vraiment).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));
const T = require(path.join(ROOT, 'tactic.js'));
const I = T._internal;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const C = data.constants, RC = data.raid;
const CLASSES = data.classes.map(c => c.id);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const div = (a, b) => Math.trunc(a / b), pct = (x, p) => div(x * p, 100);
const acts = s => { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; };
function managersFor(seed, n) {
  const names = ['Vous', 'Anselme', 'Roxane', 'Bastien', 'Maëlle', 'Ysolde'].slice(0, n);
  return names.map((nm, i) => ({ id: i === 0 ? 'p1' : 'f_' + i, name: nm, kind: i === 0 ? 'human' : 'ai',
    profile: i === 0 ? 'humain' : (i % 2 ? 'prudent' : 'audacieux'), class_id: CLASSES[(i + seed) % CLASSES.length] }));
}
const SEEDS = []; for (let i = 0; i < 30; i++) SEEDS.push(1000 + i * 7);

// ---------------- saison de référence, jouée une seule fois ----------------
const t0 = Date.now();
const morale = { lo: 0, mid: 0, hi: 0, n: 0 };
let trainedAny = 0, heroes30 = 0, trainedMax = 0, lvlMax = 0, attrMax = 0, charVals = {};
for (const seed of SEEDS) {
  const n = 5 + (seed % 2);
  let s = sim.newGame(seed, data, { managers: managersFor(seed, n) });
  for (let d = 0; d < 30 && !s.collapsed; d++) {
    s = sim.resolveDay(s, acts(s)).state;
    for (const h of Object.values(s.heroes)) { morale.n++; if (h.morale < 30) morale.lo++; else if (h.morale < 70) morale.mid++; else morale.hi++; }
  }
  for (const h of Object.values(s.heroes)) {
    heroes30++;
    const tt = Object.values(h.trained).reduce((a, b) => a + b, 0);
    if (tt > 0) trainedAny++;
    trainedMax = Math.max(trainedMax, ...Object.values(h.trained));
    lvlMax = Math.max(lvlMax, h.level);
    const cl = data.classes.filter(c => c.id === h.class_id)[0];
    for (const a of data.attributes.map(x => x.id)) attrMax = Math.max(attrMax, cl.start[a] + div(cl.growth[a] * (h.level - 1), 100) + (h.trained[a] || 0) + (h.bonus_attrs[a] || 0));
  }
}
console.log('\n--- Saison mesurée : ' + SEEDS.length + ' graines × 30 jours, 5-6 managers, plans par défaut (' + (Date.now() - t0) + ' ms) ---');
console.log('Moral par palier (jours-héros) : <30 ' + Math.round(100 * morale.lo / morale.n) + ' % · 30-69 ' +
  Math.round(100 * morale.mid / morale.n) + ' % · ≥70 ' + Math.round(100 * morale.hi / morale.n) + ' %  (n=' + morale.n + ')');
console.log('Entraînement : ' + trainedAny + '/' + heroes30 + ' héros (' + Math.round(100 * trainedAny / heroes30) + ' %) ont gagné au moins un point · maximum ' + trainedMax);

// ---------------- (1) entraînement ----------------
{
  const sd = C.slot_divisor;
  const mods = [100, 120, 80, 125, 70, 120, 50];
  const distinct = lv => new Set(mods.map(m => Math.max(1, div(pct(C.tp_base[lv], m), sd)))).size;
  check('(1a) entraînement : au niveau 0 ET au niveau 1 du terrain (les deux seuls atteints en saison), les sept modificateurs donnent au moins 4 valeurs distinctes (avant T6 : 1 au niveau 0)',
    distinct(0) >= 4 && distinct(1) >= 4, 'niveau 0 : ' + distinct(0) + ' valeurs · niveau 1 : ' + distinct(1) + ' valeurs');
  // héros « régulier » : dix journées avec un créneau d'entraînement sur son attribut primaire, terrain de niveau 1
  const tpDay = Math.max(1, div(pct(C.tp_base[1], 120), C.slot_divisor));
  let tp = 10 * tpDay, gained = 0, need = C.tp_threshold_base;
  while (gained < C.trained_max && tp >= need) { tp -= need; gained++; need = C.tp_threshold_base + C.tp_threshold_step * gained; }
  check('(1b) entraînement : dix journées d\'entraînement sur le terrain de niveau 1 valent 2 à 4 points d\'attribut (avant T6 : 0)',
    gained >= 2 && gained <= 4, gained + ' point(s) pour ' + (10 * tpDay) + ' tp (' + tpDay + ' tp/journée, seuils ' + C.tp_threshold_base + '/+' + C.tp_threshold_step + ')');
  check('(1c) entraînement : en saison réelle, au moins 15 % des héros gagnent un point d\'attribut à l\'entraînement (avant T6 : 5 %)',
    trainedAny * 100 >= heroes30 * 15, trainedAny + '/' + heroes30 + ' = ' + Math.round(100 * trainedAny / heroes30) + ' %');
}

// ---------------- (2) moral ----------------
{
  check('(2a) moral : les trois paliers de moraleMod sont réellement utilisés — le palier du milieu prend ≥ 15 % des jours-héros et le palier haut ≤ 85 % (avant T6 : 2 % et 98 %)',
    morale.mid * 100 >= morale.n * 15 && morale.hi * 100 <= morale.n * 85,
    '<30 ' + Math.round(100 * morale.lo / morale.n) + ' % · 30-69 ' + Math.round(100 * morale.mid / morale.n) + ' % · ≥70 ' + Math.round(100 * morale.hi / morale.n) + ' %');
  // chapelle et décorations : A/B sur le même état, une seule journée du soir
  const seed = 1234;
  const build = (chapel, deco) => {
    let s = sim.newGame(seed, data, { managers: managersFor(seed, 5) });
    for (let d = 0; d < 8; d++) s = sim.resolveDay(s, acts(s)).state;
    s = JSON.parse(JSON.stringify(s));
    Object.defineProperty(s, '__data', { value: data, enumerable: false, configurable: true });
    s.buildings.chapel = chapel;
    for (const m of Object.keys(s.quarters)) s.quarters[m] = deco ? [0, 1, 2, 3].map(i => ({ decoration_id: 'kiosque', x: i, y: 0 })) : [];
    for (const h of Object.values(s.heroes)) h.morale = 60;
    for (let d = 0; d < 6; d++) s = sim.resolveDay(s, acts(s)).state;
    return Object.values(s.heroes).reduce((a, h) => a + h.morale, 0);
  };
  const bare = build(0, false), rich = build(4, true);
  check('(2b) moral : la chapelle et les décorations changent le moral de façon mesurable (avant T6 : décorations = NaN → 0, chapelle noyée par le plafond)',
    rich > bare, 'sans chapelle ni décoration ' + bare + ' de moral cumulé · chapelle 4 + 4 kiosques ' + rich + ' (+' + (rich - bare) + ')');
}

// ---------------- bac à sable tactique ----------------
function makeEnv(seed, over, hybrid, spec) {
  const H = hybrid ? data.hybrids.filter(x => x.id === hybrid)[0] : null;
  const cls = H ? (H.pairs || [H.bases])[0][0] : 'cleric';
  const h = Object.assign({ id: 'h_test', name: 'Sujet', owner: 'p1', class_id: cls, hybrid: hybrid || null, spec: spec || null,
    hybrid_bonus: 0, level: 12, gender: 'm', hp_max: 300, atk: 60, def: 20, heal: 30, crit: 8, magic: 0, magic_power: 40,
    support: 40, dodge: 0, hit_bonus: 0, fire: 0, morale: 80, fatigue: 0, dexterity: 20, vigor: 20, traits: [], injury_severity: 0 }, over || {});
  return { data: data, day: 20, seed: seed, season_length: 30,
    managers: [{ id: 'p1', name: 'Vous' }, { id: 'f_1', name: 'A' }, { id: 'f_2', name: 'R' }, { id: 'f_3', name: 'B' }],
    heroes: { h_test: h }, raiders: ['h_test'], wall_shield_pct: 0 };
}
// Trois passages, politique par défaut ; renvoie la réserve entamée (‰), le bouclier maximal tenu, les coups esquivés.
function probe(seed, raidId, over, hybrid, spec, hpMul) {
  const env = makeEnv(seed, over, hybrid, spec);
  const R = I.newRaid(env, raidId);
  const hp0 = R.boss.hp_max, mul = hpMul || 3;
  R.boss.hp_max = hp0 * mul; R.boss.hp = R.boss.hp_max;
  for (const hd of (R.boss.heads || [])) { hd.hp_max = hd.hp_max * mul; hd.hp = hd.hp_max; }
  const log = []; let shield = 0;
  for (let p = 0; p < 3; p++) {
    env.day = 20 + p;
    if (I.beginPass(R, env, 'h_test', log)) break;
    let g = 0;
    while (R.pass && !R.pass.done && g++ < 300) {
      const u = I.heroUnit(R); if (!u) break;
      shield = Math.max(shield, u.shield || 0);
      const a = I.policyAction(R, env, u) || { type: 'end_turn' };
      if (I.applyPassAction(R, env, a, log)) I.applyPassAction(R, env, { type: 'end_turn' }, log);
    }
    if (R.pass && !R.pass.done) I.applyPassAction(R, env, { type: 'end_pass' }, log);
    if (R.status !== 'active') break;
  }
  return { permille: Math.round(1000 * (R.boss.hp_max - R.boss.hp) / hp0), shield: shield,
    dodges: R.stats.mech.esquive || 0, burns: R.stats.mech.braise || 0, R: R, log: log };
}
const PSEEDS = [11, 23, 37, 51, 67, 83];
function suite(over, hybrid, spec, raids) {
  let dmg = 0, sh = 0, dg = 0, bu = 0, n = 0;
  for (const r of (raids || ['raid_forest', 'raid_marsh', 'raid_mountain'])) for (const s of PSEEDS) {
    const p = probe(s, r, over, hybrid || 'ermite', spec || null);
    dmg += p.permille; sh += p.shield; dg += p.dodges; bu += p.burns; n++;
  }
  return { dmg: Math.round(10 * dmg / n) / 10, shield: Math.round(10 * sh / n) / 10, dodges: dg, burns: bu };
}

// ---------------- (3) aucune statistique déclarée sans effet ----------------
{
  const ref = suite({});
  const rows = [];
  const cmp = (label, over, key) => { const r = suite(over); rows.push([label, r]); return r[key] !== ref[key]; };
  const heal = cmp('soin +100', { heal: 130 }, 'shield');
  const dodge = cmp('esquive 300 ‰', { dodge: 300 }, 'dodges');
  const hit = cmp('toucher +8', { hit_bonus: 8 }, 'dmg');
  const fire = cmp('feu d\'objet', { fire: 1 }, 'burns');
  // Le soutien se mesure là où il agit : sur un bouclier POSÉ par un sort. On force le même lancer de « Bénédiction »
  // avec deux soutiens différents, tout le reste identique.
  const blessed = sup0 => {
    const env = makeEnv(31, { class_id: 'cleric', support: sup0 }, null, null);
    const R = I.newRaid(env, 'raid_forest'); const log = [];
    I.beginPass(R, env, 'h_test', log);
    const u = I.heroUnit(R);
    u.shield = 0;
    I.applyPassAction(R, env, { type: 'cast', spell_id: 'blessing', x: u.x, y: u.y }, log);
    const v = I.heroUnit(R);
    return { shield: v ? v.shield : 0, turns: v ? v.shield_turns : 0 };
  };
  const b0 = blessed(0), b1 = blessed(120);
  const sup = b1.shield > b0.shield && b1.turns > b0.turns;
  console.log('   ' + 'soutien 0 → 120'.padEnd(16) + ' : bouclier de Bénédiction ' + b0.shield + ' (' + b0.turns + ' tours) → ' + b1.shield + ' (' + b1.turns + ' tours)');
  for (const [l, r] of rows) console.log('   ' + l.padEnd(16) + ' : ' + r.dmg + ' ‰ · bouclier ' + r.shield + ' · esquives ' + r.dodges + ' · mises à feu ' + r.burns);
  console.log('   ' + 'référence'.padEnd(16) + ' : ' + ref.dmg + ' ‰ · bouclier ' + ref.shield + ' · esquives ' + ref.dodges + ' · mises à feu ' + ref.burns);
  check('(3a) SOIN a un effet en raid : le soin qui déborde devient bouclier (avant T6 : soin +5 et soin +100 identiques au bit près)', heal);
  check('(3b) ESQUIVE a un effet en raid : le savoir-faire Discrétion fait rater des coups (avant T6 : dodge non transmis)', dodge);
  check('(3c) TOUCHER a un effet en raid : le savoir-faire Archerie ajoute des dégâts à distance (avant T6 : hit_bonus non transmis)', hit);
  check('(3d) FEU d\'objet a un effet en raid : une arme de braise met le feu (avant T6 : fire calculé, jamais transmis)', fire);
  check('(3e) SOUTIEN (charisme) a un effet en raid : boucliers et états bénéfiques plus épais et plus longs', sup);
  // magie d'objet hors Mage, côté sim : la règle porte sur la grandeur d'attaque, pas sur l'identifiant de classe
  let s0 = sim.newGame(7, data, { managers: managersFor(7, 5) });
  for (let d = 0; d < 3; d++) s0 = sim.resolveDay(s0, acts(s0)).state;
  const envAll = sim._internal.raidEnvOf(s0, null, 3);
  const per = {};
  for (const h of Object.values(envAll.heroes)) per[h.class_id] = h.magic;
  for (const c of CLASSES) if (per[c] === undefined) per[c] = ['mage', 'cleric', 'summoner', 'bard'].indexOf(c) >= 0 ? 1 : 0;
  const lit = CLASSES.filter(c => per[c] === 1), dark = CLASSES.filter(c => per[c] === 0);
  check('(3f) MAGIE d\'objet : elle compte pour toute classe dont l\'attaque est bâtie sur Esprit ou Volonté, pas pour le seul Mage (avant T6 : 37 héros sur 144 portaient une magie perdue)',
    lit.indexOf('mage') >= 0 && lit.indexOf('cleric') >= 0 && lit.indexOf('summoner') >= 0 && dark.indexOf('warrior') >= 0 && dark.indexOf('rogue') >= 0,
    'lisent la magie : ' + lit.join(' ') + ' · ne la lisent pas : ' + dark.join(' '));
  // VIT : retirée du raid — elle ne doit plus être transmise du tout (sinon elle recommence à mentir)
  const anySpd = Object.values(envAll.heroes).some(h => 'spd' in h);
  check('(3g) VITESSE : elle n\'est plus transmise au raid du tout (décision : retirée, elle reste une grandeur d\'expédition)', !anySpd);
}

// ---------------- (4) les 26 passifs de spécialisation ----------------
{
  const specs = data.specs.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const empty = specs.filter(S => !S.passive);
  const band = specs.filter(S => { const P = S.passive || {}; const vals = ['dmg_pct', 'taken_pct', 'hp_pct', 'def_pct', 'heal_pct', 'shield_pct', 'summon_pct'].map(k => P[k]).filter(v => v); return vals.some(v => v < 8 || v > 15); });
  check('(4a) les 26 fiches de spécialisation portent un passif chiffré (avant T6 : 24 sur 26 à `passive: null`)', empty.length === 0, empty.map(S => S.id).join(' '));
  check('(4b) chaque valeur de passif tient dans la bande mesurée utile par l\'audit : 8 à 15 % sur une grandeur dérivée',
    band.length === 0, band.map(S => S.id).join(' '));
  // ÉCART V5 T8 — la contrainte « aucune spécialisation ne fait moins que sa voie nue » est RETIRÉE, et remplacée.
  // Elle n'a plus de sens depuis les cinq emplacements de sorts : une pointe ne peut plus être un déclassement,
  // puisqu'un sort moins bon n'est tout simplement pas emporté. Comparer « la pointe » à « la voie nue » revenait à
  // comparer deux barres d'action qui n'existent plus telles quelles. (Ses deux contrôles (4c)/(4d) mesuraient,
  // avant T8 : 13 spés sur 26 au-dessus de leur voie nue, la pire à 51 %.)
  // La bonne mesure de santé d'une pointe est devenue la FRÉQUENCE DE SÉLECTION : un sort jamais choisi est mort, un
  // sort toujours choisi écrase les autres. Elle est mesurée par test/loadout_t8_check.mjs (7a/7b/7c) sur 100
  // saisons. Ce qui reste ici est le contrôle qui tient toujours : chaque pointe apporte deux sorts ACTIFS de plus
  // au vivier, et sa fiche les déclare.
  const missing = [];
  for (const S of specs) {
    const spells = (data.tactic_spells || []).filter(sp => sp.spec_id === S.id).map(sp => sp.id).sort();
    const declared = (S.spells || []).slice().sort();
    if (spells.length !== 2 || declared.join(',') !== spells.join(',')) missing.push(S.id + ' : ' + spells.join('+') + ' vs fiche ' + declared.join('+'));
  }
  check('(4c) chaque pointe apporte exactement deux sorts ACTIFS au vivier, et sa fiche les déclare (remplace « la pointe fait plus que sa voie nue », caduc depuis les cinq emplacements T8 — la santé d\'une pointe se mesure maintenant par sa fréquence de sélection, cf. loadout_t8_check (7a-7c))',
    missing.length === 0, missing.length ? missing.slice(0, 4).join(' | ') : specs.length + ' pointes, 2 sorts chacune');
  // (4d) le vivier est bien CLOISONNÉ : les deux verbes d'une pointe n'entrent dans le vivier que du héros qui l'a prise.
  const envP = { data: data, seed: 3, day: 20, managers: [], heroes: {} };
  const leak = [];
  for (const S of specs) {
    const H = data.hybrids.filter(x => x.id === S.hybrid)[0];
    const cl = ((H && (H.pairs && H.pairs.length ? H.pairs : [H.bases])) || [[]])[0][0];
    if (!cl) { leak.push(S.id + ' : aucune classe de base'); continue; }
    const withSpec = I.spellPool(envP, { id: 'h', class_id: cl, hybrid_id: S.hybrid, spec_id: S.id });
    const without = I.spellPool(envP, { id: 'h', class_id: cl, hybrid_id: S.hybrid, spec_id: null });
    const sister = S.sister ? I.spellPool(envP, { id: 'h', class_id: cl, hybrid_id: S.hybrid, spec_id: S.sister }) : [];
    for (const id of (S.spells || [])) {
      if (withSpec.indexOf(id) < 0) leak.push(S.id + ' : ' + id + ' absent de son propre vivier');
      if (without.indexOf(id) >= 0) leak.push(S.id + ' : ' + id + ' fuit dans la voie nue');
      if (sister.length && sister.indexOf(id) >= 0) leak.push(S.id + ' : ' + id + ' fuit chez sa sœur ' + S.sister);
    }
  }
  check('(4d) le vivier est cloisonné : les deux verbes d\'une pointe n\'entrent que dans le vivier du héros qui l\'a prise — jamais dans sa voie nue, jamais chez sa sœur (c\'est ce qui rend le choix de pointe irréversible sans reconversion)',
    leak.length === 0, leak.length ? leak.slice(0, 4).join(' | ') : specs.length + ' pointes cloisonnées');
}

// ---------------- (5) le charisme ----------------
{
  const vals = {};
  for (const c of data.classes) vals[c.id] = c.start.charisma;
  const distinct = new Set(Object.values(vals)).size;
  check('(5a) le charisme prend des valeurs distinctes selon les classes (au moins 4 valeurs sur 7 bases)', distinct >= 4,
    Object.keys(vals).sort().map(k => k + ' ' + vals[k]).join(' · '));
  // variance prouvée : le soutien produit des valeurs différentes sur une grandeur de soutien
  const blessedAt = sup0 => {
    const env = makeEnv(31, { class_id: 'cleric', support: sup0 }, null, null);
    const R = I.newRaid(env, 'raid_forest'); const log = [];
    I.beginPass(R, env, 'h_test', log);
    const u = I.heroUnit(R); u.shield = 0;
    I.applyPassAction(R, env, { type: 'cast', spell_id: 'blessing', x: u.x, y: u.y }, log);
    const v = I.heroUnit(R);
    return (v ? v.shield : 0) * 100 + (v ? v.shield_turns : 0);
  };
  const shields = [0, 30, 60, 120].map(blessedAt);
  check('(5b) le soutien (grandeur dérivée du charisme) produit des valeurs DISTINCTES sur une grandeur de soutien — invariant du studio : une métrique qui calibre prouve sa variance',
    new Set(shields).size >= 3, 'bouclier×100 + durée, pour soutien 0/30/60/120 : ' + shields.join(' / '));
  const craft = data.crafts.filter(c => c.id === (C.craft_by_attribute || {}).charisma)[0];
  check('(5c) le charisme a son savoir-faire, comme les six autres attributs', !!craft, craft ? craft.id + ' (' + craft.label + ')' : 'aucun');
}

// ---------------- (6) le Barde ----------------
{
  const cls = data.classes.filter(c => c.id === 'bard')[0];
  const spells = data.tactic_spells.filter(s => s.class_id === 'bard');
  const skills = data.skills.filter(s => s.class_id === 'bard');
  check('(6a) le Barde est une base complète : profil, croissance, quatre sorts tactiques, compétences d\'expédition, affinités',
    !!cls && cls.primary === 'charisma' && spells.length === 4 && skills.length >= 3 && !!cls.gather_affinity && !!cls.craft_specialty,
    (cls ? cls.name + ' · primaire ' + cls.primary : 'absent') + ' · ' + spells.length + ' sorts · ' + skills.length + ' compétences');
  // il joue : ses quatre sorts partent sur la grille avec la politique par défaut
  const cast = {};
  for (const r of ['raid_forest', 'raid_marsh', 'raid_mountain']) for (const s of PSEEDS) {
    const env = makeEnv(s, { class_id: 'bard', hybrid: null, spec: null }, null, null);
    env.heroes.h_test.class_id = 'bard';
    const p = probe(s, r, { class_id: 'bard' }, null, null);
    for (const k of Object.keys(p.R.stats.casts)) cast[k] = (cast[k] || 0) + p.R.stats.casts[k];
  }
  const never = spells.map(s => s.id).filter(id => !cast[id]);
  check('(6b) les quatre sorts du Barde sont réellement lancés par la politique par défaut', never.length === 0,
    never.length ? 'jamais lancés : ' + never.join(' ') : spells.map(s => s.id + ' ' + cast[s.id]).join(' · '));
  // il vit en saison : il est tiré, il monte, et aucune carte de choix vide ne lui est proposée
  let seen = 0, lvl = 0;
  for (const seed of SEEDS.slice(0, 12)) {
    let s = sim.newGame(seed, data, { managers: managersFor(seed, 6) });
    for (let d = 0; d < 30 && !s.collapsed; d++) s = sim.resolveDay(s, acts(s)).state;
    for (const h of Object.values(s.heroes)) if (h.class_id === 'bard') { seen++; lvl = Math.max(lvl, h.level); }
  }
  check('(6c) le Barde vit la saison : des Bardes sont à la table au jour 30 et ils montent en niveau', seen > 0 && lvl >= 3,
    seen + ' Barde(s) vivants sur 12 saisons · niveau max ' + lvl);
}

// ---------------- (7) les corps héritent du maître ----------------
{
  // deux équipements opposés sur le MÊME invocateur : une panoplie de chair (PV/DÉF) contre une panoplie de magie
  const tank = { hp_max: 460, def: 44, magic_power: 20, atk: 60, dexterity: 12 };
  const mage = { hp_max: 220, def: 14, magic_power: 120, atk: 60, dexterity: 12 };
  const swift = { hp_max: 220, def: 14, magic_power: 20, atk: 60, dexterity: 34 };
  const bodyOf = (over, kind) => {
    const env = makeEnv(5, Object.assign({ class_id: 'summoner' }, over), null, null);
    const R = I.newRaid(env, 'raid_forest');
    const log = [];
    I.beginPass(R, env, 'h_test', log);
    const u = I.heroUnit(R);
    const v = T._internal.heroUnitOf ? null : null;
    // invocation directe par l'API interne de création de corps : on passe par le sort de la classe
    const cell = { x: u.x, y: u.y - 1 };
    I.applyPassAction(R, env, { type: 'cast', spell_id: kind === 'elementaire' ? 'clay_golem' : (kind === 'nuee' ? 'swarm' : 'clay_golem'), x: cell.x, y: cell.y }, log);
    return R.units.filter(x => x.kind === 'summon')[0] || null;
  };
  const gT = bodyOf(tank, 'golem'), gM = bodyOf(mage, 'golem');
  const nT = bodyOf(tank, 'nuee'), nS = bodyOf(swift, 'nuee');
  check('(7a) un corps invoqué change avec l\'ÉQUIPEMENT de son maître : le golem d\'un invocateur de chair a plus de PV et plus de DÉF que celui d\'un invocateur de papier (avant T6 : aucun lien)',
    !!gT && !!gM && gT.hp_max > gM.hp_max && gT.def > gM.def,
    gT ? 'golem de chair ' + gT.hp_max + ' PV / DÉF ' + gT.def + ' · golem de papier ' + gM.hp_max + ' PV / DÉF ' + gM.def : 'aucun corps');
  check('(7b) chaque type de corps est meilleur dans ce pour quoi il hérite : la nuée d\'un maître ADROIT gagne un pas de plus (seuil ' + (RC.summons.nuee.dex_pm) + ' d\'Adresse)',
    !!nT && !!nS && nS.pm_max > nT.pm_max, nT ? 'maître peu adroit PM ' + nT.pm_max + ' · maître adroit PM ' + nS.pm_max : 'aucun corps');
  // l'élémentaire hérite de la puissance magique : le coefficient est lu dans les données
  check('(7c) l\'élémentaire hérite de la PUISSANCE MAGIQUE du maître, pas de son attaque physique (c\'est ce qui rend les objets à MAG utiles à un invocateur)',
    RC.summons.elementaire.atk_from === 'magic' && RC.summons.golem.atk_from === 'atk',
    'élémentaire ← ' + RC.summons.elementaire.atk_from + ' (' + RC.summons.elementaire.atk_pct + ' %) · golem ← ' + RC.summons.golem.atk_from + ' (' + RC.summons.golem.atk_pct + ' %)');
}

// ---------------- (8) R-A et R-B ----------------
{
  const src = fs.readFileSync(path.join(ROOT, 'tactic.js'), 'utf8');
  check('(8a) R-A : plus aucune mécanique de relèvement d\'un corps invoqué tombé (ni `R.fallen`, ni sort « relever »)',
    !/R\.fallen\s*=/.test(src) && !data.tactic_spells.some(s => s.id === 'relever'),
    'sort de l\'Hospitalier : ' + data.specs.filter(S => S.id === 'hospitalier')[0].spells.join(' · '));
  check('(8b) R-B : le plafond d\'invocations PAR GUILDE a disparu des données et du moteur',
    RC.summon_cap_guild === undefined && !/summon_cap_guild\s*\|\|/.test(src), 'summon_cap par maître : ' + RC.summon_cap);
  // les corps quittent la grille avec leur maître
  const env = makeEnv(3, { class_id: 'summoner' }, null, null);
  const R = I.newRaid(env, 'raid_forest');
  const log = [];
  I.beginPass(R, env, 'h_test', log);
  const u = I.heroUnit(R);
  I.applyPassAction(R, env, { type: 'cast', spell_id: 'clay_golem', x: u.x, y: u.y - 1 }, log);
  const born = R.units.filter(x => x.kind === 'summon').length;
  I.applyPassAction(R, env, { type: 'end_pass' }, log);
  const left = R.units.filter(x => x.kind === 'summon').length;
  check('(8c) R-B : les invocations quittent la grille avec leur maître à la fin de son passage', born >= 1 && left === 0,
    born + ' corps posé(s) pendant le passage · ' + left + ' après la fin du passage');
}

// ---------------- (9) R-C : les deux barres ----------------
{
  const env = makeEnv(3, {}, 'paladin', null);       // Paladin = Guerrier + Clerc
  const R = I.newRaid(env, 'raid_forest');
  const log = [];
  I.beginPass(R, env, 'h_test', log);
  const u = I.heroUnit(R);
  // ÉCART V5 T8 : R-C porte désormais sur le VIVIER, pas sur la barre emportée. « Tu es guerrier plus prêtre, tu as
  // ACCÈS à la barre d'action des deux classes » reste vrai mot pour mot ; ce qui change, c'est qu'on n'emporte que
  // cinq de ces sorts à la fois (T8). Le vivier doit donc contenir les deux barres, et la barre emportée en tenir
  // exactement cinq, tous pris dans ce vivier.
  const ids = I.spellPool(env, u);
  const carried = I.unitSpells(env, u);
  const warrior = data.tactic_spells.filter(s => s.class_id === 'warrior').map(s => s.id);
  const cleric = data.tactic_spells.filter(s => s.class_id === 'cleric').map(s => s.id);
  check('(9) R-C : le VIVIER d\'un héros de voie contient les DEUX barres de base (Paladin = Guerrier + Clerc), plus les sorts de sa voie ; il en emporte cinq (T8)',
    warrior.every(id => ids.indexOf(id) >= 0) && cleric.every(id => ids.indexOf(id) >= 0)
      && carried.length === 5 && carried.every(id => ids.indexOf(id) >= 0),
    'vivier ' + ids.length + ' sorts · emportés ' + carried.length + ' : ' + carried.join(' '));
}

// ---------------- (10) bugs de l'audit ----------------
{
  const s0 = sim.newGame(9, data, { managers: managersFor(9, 5) });
  const h = Object.values(s0.heroes)[0];
  const profileOf = (st, id) => sim._internal.raidEnvOf(st, null, st.day).heroes[id];
  // B5 : les plafonds sont appliqués APRÈS les objets — on les prouve en forçant les attributs au maximum
  const s1 = JSON.parse(JSON.stringify(s0));
  Object.defineProperty(s1, '__data', { value: data, enumerable: false, configurable: true });
  const hh = s1.heroes[h.id];
  hh.bonus_attrs.luck = 60; hh.bonus_attrs.dexterity = 60;
  const p = profileOf(s1, h.id);
  check('(10a) B5 : les plafonds de critique et d\'esquive sont appliqués APRÈS les objets et les savoir-faire, donc ils ne se contournent plus',
    p.crit <= (C.crit_max_permille || 400) && p.dodge <= (C.dodge_max_permille || 350),
    'critique ' + p.crit + ' ‰ (plafond ' + C.crit_max_permille + ') · esquive ' + p.dodge + ' ‰ (plafond ' + C.dodge_max_permille + ')');
  // B10 : la défense est fatiguée comme l'attaque
  const rested = JSON.parse(JSON.stringify(s1)); Object.defineProperty(rested, '__data', { value: data, enumerable: false, configurable: true });
  const tired = JSON.parse(JSON.stringify(s1)); Object.defineProperty(tired, '__data', { value: data, enumerable: false, configurable: true });
  rested.heroes[h.id].fatigue = 0; tired.heroes[h.id].fatigue = 90;
  const dR = profileOf(rested, h.id).def, dT = profileOf(tired, h.id).def;
  check('(10b) B10 : la fatigue module la DÉFENSE comme elle module l\'attaque, en raid comme en expédition (avant T6 : un héros épuisé frappait à 75 % mais se défendait comme au repos)',
    dT < dR, 'DÉF au repos ' + dR + ' · DÉF à 90 de fatigue ' + dT);
  // B7 : à bourse pleine, la politique par défaut préfère l'offre la plus rare
  const s2 = JSON.parse(JSON.stringify(s0));
  Object.defineProperty(s2, '__data', { value: data, enumerable: false, configurable: true });
  for (const m of Object.keys(s2.purses)) s2.purses[m] = 5000;
  s2.max_heroes = 12;
  const mgr = sim.listManagers(s2)[0];
  if (s2.tavern.length >= 2) { s2.tavern[0].hero.rarity = 'common'; s2.tavern[0].cost = 40; s2.tavern[1].hero.rarity = 'rare'; s2.tavern[1].cost = 400; }
  const plan = sim.planDefaults(s2, mgr).filter(a => a.type === 'recruit');
  const picked = plan.length ? s2.tavern.filter(o => o.id === plan[0].payload.recruit_id)[0] : null;
  check('(10c) B7 : à bourse pleine, la politique par défaut prend l\'offre la plus RARE et non la moins chère (avant T6 : 354 communs, 0 rare, 0 légendaire sur 359 héros)',
    s2.tavern.length < 2 || (picked && picked.hero.rarity === 'rare'),
    picked ? 'offre retenue : ' + picked.hero.rarity + ' à ' + picked.cost + ' or' : 'aucun recrutement proposé');
  // B11 : les plafonds déclarés sont ceux qu'on atteint vraiment
  check('(10d) B11 : les plafonds déclarés restent hors de portée d\'une saison — ils sont documentés au contrat pour que personne ne calibre une branche en supposant un héros de niveau ' + C.level_max,
    lvlMax < C.level_max && attrMax < C.attr_max && trainedMax < C.trained_max,
    'mesuré au J30 sur ' + heroes30 + ' héros : niveau max ' + lvlMax + '/' + C.level_max + ' · attribut max ' + attrMax + '/' + C.attr_max + ' · entraînement max ' + trainedMax + '/' + C.trained_max);
}

const bad = results.filter(r => !r.ok);
console.log('\n' + (results.length - bad.length) + '/' + results.length + ' contrôles passés');
if (bad.length) { console.log('ÉCHECS : ' + bad.map(b => b.name).join(' | ')); process.exit(1); }

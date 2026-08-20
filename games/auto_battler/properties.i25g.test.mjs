// properties.i25g.test.mjs - MOTS-CLÉS ET TRIBUS (incrément 2.5, commande G).
//
// Un test d'EFFET par mot-clé, jamais de présence. Aucune assertion `>=` tautologique : partout
// où une borne est posée, la valeur EXACTE est asserted à côté, ou la borne est accompagnée d'un
// témoin qui prouve qu'elle n'est pas satisfaite à vide.
//
// Ce que ce fichier vérifie, dans l'ordre :
//   G1  bouclier divin  — le premier coup ne retire RIEN, le second retire le montant exact
//   G1  provocation     — une unité sans provocation n'est JAMAIS ciblée tant qu'une provocation
//                         ennemie vit (+ témoin : elle l'est dès que la provocation tombe)
//   G1  venimeux        — une unité à 400 PV blessée de 1 point meurt
//   G1  furie des vents — exactement deux fois plus d'attaques sur la même durée
//   G1  renaissance     — revient une fois et une seule, à 1 PV
//   G1  râle d'agonie   — l'allié désigné gagne le montant exact, sans hasard
//   G2  buff de tribu   — la tribu gagne exactement +X/+Y, une autre tribu ne gagne RIEN
//   G3  registre        — toujours 22 noms ; Shield/Buff/Debuff/Heal enfin émis ; Cast toujours pas
//   CBT-1 déterminisme  — mêmes armées ⇒ journal identique octet pour octet, mots-clés compris
//   D2/MIRROR           — échanger les armées entre les sièges échange le vainqueur
//   P11 moteur agnostique — aucun identifiant d'unité dans combat/
//   G4  écran           — le renderer AVEUGLE voit le bouclier, l'absorption, le venin, la renaissance

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { resolveCombat } from './combat/combat.mjs';
import { KEYWORDS, KEYWORD_IDS, normalizeKeywords, statDeltaOf } from './combat/keywords.mjs';
import { fromXY, mirrorCell } from './combat/cell.mjs';
import {
  UNITS, TRIBES, TRIBE_NAMES, KEYWORD_LABELS, keywordName, keywordText,
  getUnitDef, getUnitTribe, getUnitKeywords, getUnitDefsOfTribe
} from './content/units.v0.mjs';
import { TICK_LIMIT, WINDFURY_ATTACKS_PER_CYCLE, REBORN_HEALTH } from './params.v0.mjs';
import { EVENT_KINDS } from './engine/registry.mjs';

// =============================================================================================
// helpers — des unités BRUTES, pour épingler un mot-clé à la fois sans passer par le contenu
// =============================================================================================

function u(id, cell, over = {}) {
  return {
    unit_instance_id: id,
    unit_definition_ref: over.def || 'test_def',
    star: 1,
    cell,
    health: 100,
    attack: 10,
    attack_cadence: 1,
    range: 1,
    move_speed: 0,      // immobile par défaut : la géométrie du test ne bouge pas sous lui
    delivery: 'melee',
    tribe: null,
    keywords: [],
    ...over
  };
}

function setup(ref, a, b, refs = ['seat_0', 'seat_1']) {
  return {
    combat_ref: ref,
    sides: [{ side_ref: refs[0], units: a }, { side_ref: refs[1], units: b }]
  };
}

function fromContent(id, defId, cell) {
  const d = getUnitDef(defId);
  return {
    unit_instance_id: id,
    unit_definition_ref: defId,
    star: 1,
    cell,
    health: d.hp,
    attack: d.attack,
    attack_cadence: d.attack_cadence,
    range: d.range,
    move_speed: d.move_speed,
    delivery: d.delivery,
    tribe: d.tribe,
    keywords: d.keywords
  };
}

const kindsOf = (events, kind) => events.filter(e => e.kind === kind);
const damagesOn = (events, id) => kindsOf(events, 'Damage').filter(e => e.target_unit_instance_id === id);

// =============================================================================================
// G1 — BOUCLIER DIVIN
// =============================================================================================

test('G1/EFFET du bouclier divin: le PREMIER coup ne retire aucun point de vie, le SECOND retire le montant exact', () => {
  const attacker = u('att', fromXY(0, 4), { attack: 40, attack_cadence: 1 });
  const shielded = u('def', fromXY(0, 3), {
    attack: 0, health: 400, keywords: [{ id: KEYWORDS.DIVINE_SHIELD }]
  });
  const { events } = resolveCombat(setup('shield', [attacker], [shielded]));

  const hits = damagesOn(events, 'def');
  assert.ok(hits.length >= 2, `précondition: au moins deux coups portés (${hits.length})`);

  // Premier coup : reçu, entièrement absorbé, la Health ne bouge pas d'UN point.
  assert.equal(hits[0].amount, 40, 'le premier coup vaut bien 40 points reçus');
  assert.equal(hits[0].absorbed_by_shield, 40, 'les 40 points sont absorbés');
  assert.equal(hits[0].target_health_after, 400, 'la Health est EXACTEMENT intacte après le premier coup');
  assert.equal(hits[0].target_divine_shield_after, false, 'le bouclier est consommé par ce coup');

  // Second coup : plus de bouclier, le montant exact part de la Health.
  assert.equal(hits[1].amount, 40, 'le second coup vaut le même montant');
  assert.equal(hits[1].absorbed_by_shield, 0, 'plus rien n\'est absorbé');
  assert.equal(hits[1].target_health_after, 360, 'la Health passe EXACTEMENT de 400 à 360');

  // Le Shield d'octroi est bien émis, une seule fois, sur l'unité qui le porte.
  const grants = kindsOf(events, 'Shield');
  assert.equal(grants.length, 1, 'exactement un Event Shield (l\'octroi au CombatSetup)');
  assert.equal(grants[0].target_unit_instance_id, 'def');
  assert.equal(grants[0].tick, 0, 'octroyé au CombatSetup (C2), pas pendant un Tick');
  assert.equal(grants[0].target_divine_shield_after, true);

  // Témoin de non-vacuité : SANS le mot-clé, le premier coup retire déjà les 40 points.
  const naked = u('def', fromXY(0, 3), { attack: 0, health: 400 });
  const control = resolveCombat(setup('shield_control', [attacker], [naked]));
  assert.equal(damagesOn(control.events, 'def')[0].target_health_after, 360,
    'contrôle: sans bouclier divin, le PREMIER coup retire déjà les 40 points');
});

// =============================================================================================
// G1 — PROVOCATION
// =============================================================================================

test('G1/EFFET de la provocation: une unité SANS provocation n\'est jamais ciblée tant qu\'une provocation ennemie vit', () => {
  // `bait` est STRICTEMENT plus proche des deux attaquants que `wall` : sans Provocation, la
  // chaîne de tie-break (clé 3 = distance) la choisirait. C'est ce qui rend le test falsifiable.
  const a1 = u('a1', fromXY(0, 7), { attack: 10, range: 20 });
  const a2 = u('a2', fromXY(1, 7), { attack: 10, range: 20 });
  const bait = u('bait', fromXY(0, 0), { attack: 0, health: 100000 });
  const wall = u('wall', fromXY(7, 0), { attack: 0, health: 60, keywords: [{ id: KEYWORDS.TAUNT }] });

  const { events } = resolveCombat(setup('taunt', [a1, a2], [bait, wall]));
  const attacks = kindsOf(events, 'Attack').filter(e => e.attacker_unit_instance_id.startsWith('a'));
  const wallDeath = kindsOf(events, 'Death').find(e => e.unit_instance_id === 'wall');
  assert.ok(wallDeath, 'précondition: la provocation finit par tomber (sinon le témoin ci-dessous est vide)');

  const before = attacks.filter(e => e.tick <= wallDeath.tick);
  const after = attacks.filter(e => e.tick > wallDeath.tick);
  assert.ok(before.length >= 2, `précondition: des attaques ont eu lieu avant la mort du mur (${before.length})`);
  for (const ev of before) {
    assert.equal(ev.target_unit_instance_id, 'wall',
      `tick ${ev.tick}: ${ev.attacker_unit_instance_id} vise ${ev.target_unit_instance_id} alors que la provocation vit`);
  }
  // Témoin : la règle n'est pas « on ne tape jamais bait », c'est « pas tant que wall vit ».
  assert.ok(after.length >= 1, 'précondition: le combat continue après la mort du mur');
  assert.equal(after.every(e => e.target_unit_instance_id === 'bait'), true,
    'la provocation morte, la cible redevient la plus proche');

  // Contrôle : sans le mot-clé, c'est bien `bait` (la plus proche) qui est visée dès le début.
  const nakedWall = u('wall', fromXY(7, 0), { attack: 0, health: 60 });
  const control = resolveCombat(setup('taunt_control', [a1, a2], [bait, nakedWall]));
  assert.equal(kindsOf(control.events, 'Attack')[0].target_unit_instance_id, 'bait',
    'contrôle: sans provocation, la cible est la plus proche');
});

// =============================================================================================
// G1 — VENIMEUX
// =============================================================================================

test('G1/EFFET du venin: une unité à 400 PV blessée de 1 SEUL point meurt, et le journal le dit', () => {
  const venom = u('venom', fromXY(0, 4), { attack: 1, keywords: [{ id: KEYWORDS.POISON }] });
  const big = u('big', fromXY(0, 3), { attack: 0, health: 400 });
  const { events, result } = resolveCombat(setup('poison', [venom], [big]));

  const hit = damagesOn(events, 'big')[0];
  assert.equal(hit.amount, 1, 'la blessure vaut EXACTEMENT 1 point');
  assert.equal(hit.target_health_after, 399, 'il reste 399 points de vie à l\'unité qui meurt');

  const death = kindsOf(events, 'Death').find(e => e.unit_instance_id === 'big');
  assert.ok(death, 'l\'unité meurt malgré ses 399 points de vie restants');
  assert.equal(death.tick, hit.tick, 'elle meurt au Tick même où le venin l\'a blessée');
  assert.equal(result.resolution_kind, 'elimination');
  assert.equal(result.winner_side_ref, 'seat_0');

  // Le venin est CONSTATÉ par un Debuff (nom du registre, jamais émis avant cette passe) : une
  // mort avec 399 PV au compteur doit être lisible dans le journal, pas ressembler à un bug.
  const marks = kindsOf(events, 'Debuff');
  assert.equal(marks.length, 1, 'exactement un Debuff');
  assert.equal(marks[0].effect_ref, KEYWORDS.POISON);
  assert.equal(marks[0].target_unit_instance_id, 'big');
  assert.deepEqual(marks[0].source_ref, { combat_ref: 'poison', tick: hit.tick, seq: hit.seq },
    'le Debuff pointe l\'identité exacte du Damage qui a porté le venin');

  // Un coup ENTIÈREMENT absorbé ne blesse pas, donc n'empoisonne pas.
  const warded = u('big', fromXY(0, 3), { attack: 0, health: 400, keywords: [{ id: KEYWORDS.DIVINE_SHIELD }] });
  const protectedRun = resolveCombat(setup('poison_shield', [venom], [warded]));
  const firstTick = damagesOn(protectedRun.events, 'big')[0].tick;
  const earlyDeath = kindsOf(protectedRun.events, 'Death')
    .find(e => e.unit_instance_id === 'big' && e.tick === firstTick);
  assert.equal(earlyDeath, undefined, 'le bouclier divin protège du venin: rien n\'est blessé, rien n\'est empoisonné');

  // Contrôle : sans venin, 1 point de dégât ne tue personne.
  const blunt = u('venom', fromXY(0, 4), { attack: 1 });
  const control = resolveCombat(setup('poison_control', [blunt], [big]));
  assert.equal(kindsOf(control.events, 'Death').some(e => e.unit_instance_id === 'big'), false,
    'contrôle: sans venin, une blessure de 1 point ne tue pas une unité à 400 PV');
});

// =============================================================================================
// G1 — FURIE DES VENTS
// =============================================================================================

test('G1/EFFET de la furie des vents: exactement deux fois plus d\'attaques sur la MÊME durée', () => {
  // Deux paires isolées sur le même plateau : chacune ne peut viser que son propre mannequin
  // (l'autre est huit cases plus loin). Les mannequins ne meurent pas et ne frappent pas, donc
  // le combat va jusqu'à TICK_LIMIT — la « même durée » est garantie, pas espérée.
  const plain = u('plain', fromXY(0, 5), { attack: 5, attack_cadence: 2 });
  const fury = u('fury', fromXY(7, 5), { attack: 5, attack_cadence: 2, keywords: [{ id: KEYWORDS.WINDFURY }] });
  const dummy1 = u('d1', fromXY(0, 4), { attack: 0, health: 1000000 });
  const dummy2 = u('d2', fromXY(7, 4), { attack: 0, health: 1000000 });

  const { events, result } = resolveCombat(setup('wf', [plain, fury], [dummy1, dummy2]));
  assert.equal(result.resolution_kind, 'tick_limit', 'précondition: le combat va bien au bout du chrono');
  assert.equal(result.ticks_elapsed, TICK_LIMIT, 'précondition: les deux ont eu exactement la même durée');

  const byPlain = kindsOf(events, 'Attack').filter(e => e.attacker_unit_instance_id === 'plain');
  const byFury = kindsOf(events, 'Attack').filter(e => e.attacker_unit_instance_id === 'fury');

  // Cadence 2 sur 50 Ticks = 25 cycles prêts. Valeur EXACTE des deux côtés, pas un rapport seul.
  assert.equal(byPlain.length, 25, 'l\'unité ordinaire attaque 25 fois');
  assert.equal(byFury.length, 25 * WINDFURY_ATTACKS_PER_CYCLE, 'la furie des vents attaque 50 fois');
  assert.equal(byFury.length, byPlain.length * 2, 'soit exactement deux fois plus');

  // Deux Attacks par cycle, pas une Attack à double montant : chaque coup fait ses propres dégâts.
  const dmg2 = damagesOn(events, 'd2');
  assert.equal(dmg2.length, 50, 'chacune des 50 attaques produit son propre Damage');
  assert.equal(dmg2.every(d => d.amount === 5), true, 'chaque coup vaut le montant NORMAL (pas un montant doublé)');
  assert.equal(dmg2[dmg2.length - 1].target_health_after, 1000000 - 250,
    'la cible a bien encaissé 50 x 5 points, deux fois ce que l\'unité ordinaire a infligé');
  assert.equal(damagesOn(events, 'd1')[damagesOn(events, 'd1').length - 1].target_health_after, 1000000 - 125,
    'témoin: la cible de l\'unité ordinaire n\'a encaissé que 25 x 5 points');
});

// =============================================================================================
// G1 — RENAISSANCE
// =============================================================================================

test('G1/EFFET de la renaissance: l\'unité revient UNE fois et une seule, à 1 point de vie', () => {
  const slayer = u('slayer', fromXY(0, 4), { attack: 1000, attack_cadence: 1 });
  const phoenix = u('phoenix', fromXY(0, 3), { attack: 0, health: 100, keywords: [{ id: KEYWORDS.REBORN }] });
  const { events, result } = resolveCombat(setup('reborn', [slayer], [phoenix]));

  const deaths = kindsOf(events, 'Death').filter(e => e.unit_instance_id === 'phoenix');
  assert.equal(deaths.length, 2, 'elle meurt deux fois: une fois avant la renaissance, une fois pour de bon');

  const heals = kindsOf(events, 'Heal');
  assert.equal(heals.length, 1, 'exactement UNE renaissance — jamais deux');
  assert.equal(heals[0].effect_ref, KEYWORDS.REBORN);
  assert.equal(heals[0].target_health_after, REBORN_HEALTH, 'elle revient à 1 point de vie');
  assert.equal(REBORN_HEALTH, 1, 'valeur v0 sourcée Hearthstone Battlegrounds');
  assert.equal(heals[0].tick, deaths[0].tick, 'elle revient au Tick même où elle est tombée');
  assert.equal(heals[0].seq > deaths[0].seq, true, 'et APRÈS sa propre mort dans l\'ordre du journal');

  // Le second coup frappe une unité qui n'a plus qu'un point : la renaissance a bien eu lieu
  // dans l'ÉTAT, pas seulement dans le journal.
  const hits = damagesOn(events, 'phoenix');
  assert.equal(hits.length, 2, 'deux coups portés');
  assert.equal(hits[0].target_health_after, 100 - 1000, 'premier coup: -900');
  assert.equal(hits[1].target_health_after, REBORN_HEALTH - 1000, 'second coup: porté sur une unité à 1 PV');
  assert.equal(result.ticks_elapsed, 2, 'la renaissance a coûté exactement un Tick de plus à l\'adversaire');

  // Contrôle : sans le mot-clé, un seul Tick suffit.
  const mortal = u('phoenix', fromXY(0, 3), { attack: 0, health: 100 });
  const control = resolveCombat(setup('reborn_control', [slayer], [mortal]));
  assert.equal(control.result.ticks_elapsed, 1, 'contrôle: sans renaissance, le combat dure un seul Tick');
  assert.equal(kindsOf(control.events, 'Heal').length, 0, 'contrôle: aucun Heal');
});

// =============================================================================================
// G1 — RÂLE D'AGONIE
// =============================================================================================

test('G1/EFFET du râle d\'agonie: l\'allié désigné gagne le montant EXACT, et le choix est déterministe (pas de hasard)', () => {
  const dying = u('dying', fromXY(0, 3), {
    attack: 0, health: 10, keywords: [{ id: KEYWORDS.DEATHRATTLE_BUFF, attack: 7, health: 30 }]
  });
  const near = u('near', fromXY(1, 3), { attack: 3, health: 100000, range: 20 });
  const far = u('far', fromXY(7, 0), { attack: 3, health: 100000, range: 20 });
  const killer = u('killer', fromXY(0, 4), { attack: 50, attack_cadence: 1, range: 20 });

  const { events } = resolveCombat(setup('dr', [dying, near, far], [killer]));

  const death = kindsOf(events, 'Death').find(e => e.unit_instance_id === 'dying');
  assert.ok(death, 'précondition: la porteuse du râle meurt bien');
  const buffs = kindsOf(events, 'Buff');
  assert.equal(buffs.length, 1, 'exactement un allié renforcé (pas les deux, pas zéro)');
  const b = buffs[0];
  assert.equal(b.effect_ref, KEYWORDS.DEATHRATTLE_BUFF);
  assert.equal(b.source_unit_instance_id, 'dying');
  assert.equal(b.target_unit_instance_id, 'near',
    'la TieBreakChain (clé 3 = distance) désigne l\'allié le plus proche — jamais un tirage');
  assert.equal(b.attack_delta, 7, 'exactement +7 d\'attaque');
  assert.equal(b.health_delta, 30, 'exactement +30 de vie');
  assert.equal(b.target_attack_after, 3 + 7, 'attaque après: 3 + 7');
  assert.equal(b.target_health_after, 100000 + 30, 'vie après: 100000 + 30');
  assert.equal(b.tick, death.tick, 'le râle se déclenche au Tick de la mort');

  // EFFET réel, pas seulement l'Event : l'allié frappe désormais pour 10, l'autre toujours pour 3.
  const afterDeath = kindsOf(events, 'Damage').filter(e => e.tick > death.tick);
  const byNear = afterDeath.filter(e => e.source_unit_instance_id === 'near');
  const byFar = afterDeath.filter(e => e.source_unit_instance_id === 'far');
  assert.ok(byNear.length >= 1 && byFar.length >= 1, 'précondition: les deux alliés frappent encore après');
  assert.equal(byNear.every(e => e.amount === 10), true, 'l\'allié renforcé inflige EXACTEMENT 10');
  assert.equal(byFar.every(e => e.amount === 3), true, 'l\'allié non renforcé inflige toujours EXACTEMENT 3');
});

// =============================================================================================
// G2 — BUFF DE TRIBU
// =============================================================================================

test('G2/EFFET du meneur de tribu: sa tribu gagne EXACTEMENT +X/+Y, une autre tribu ne gagne RIEN, et lui-même non plus', () => {
  const leader = u('leader', fromXY(0, 7), {
    attack: 20, health: 500, tribe: TRIBES.SYLVE, range: 20,
    keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.SYLVE, attack: 5, health: 20 }]
  });
  const sameTribe = u('same', fromXY(1, 7), { attack: 10, health: 100, tribe: TRIBES.SYLVE, range: 20 });
  const otherTribe = u('other', fromXY(2, 7), { attack: 10, health: 100, tribe: TRIBES.CHEVALERIE, range: 20 });
  const foe = u('foe', fromXY(0, 0), { attack: 0, health: 100000 });

  const { events } = resolveCombat(setup('tribe', [leader, sameTribe, otherTribe], [foe]));

  const buffs = kindsOf(events, 'Buff');
  assert.equal(buffs.length, 1, 'un seul allié de la tribu à renforcer, donc un seul Buff');
  const b = buffs[0];
  assert.equal(b.target_unit_instance_id, 'same', 'c\'est bien l\'unité de la MÊME tribu qui est visée');
  assert.equal(b.source_unit_instance_id, 'leader');
  assert.equal(b.tick, 0, 'appliqué au CombatSetup (C2 Buffs initiaux), pas pendant un Tick');
  assert.equal(b.attack_delta, 5);
  assert.equal(b.health_delta, 20);
  assert.equal(b.target_attack_after, 15, 'attaque: 10 -> 15, exactement');
  assert.equal(b.target_health_after, 120, 'vie: 100 -> 120, exactement');
  assert.equal(b.target_health_max_after, 120, 'le MAXIMUM monte aussi: l\'unité renforcée n\'est pas blessée');

  // EFFET en combat : l'unité de la tribu frappe pour 15, celle d'une autre tribu pour 10,
  // et le meneur pour ses 20 d'origine (« vos AUTRES <tribu> » — il ne se renforce pas).
  const dmg = kindsOf(events, 'Damage');
  const bySame = dmg.filter(e => e.source_unit_instance_id === 'same');
  const byOther = dmg.filter(e => e.source_unit_instance_id === 'other');
  const byLeader = dmg.filter(e => e.source_unit_instance_id === 'leader');
  assert.ok(bySame.length >= 1 && byOther.length >= 1 && byLeader.length >= 1, 'précondition: les trois frappent');
  assert.equal(bySame.every(e => e.amount === 15), true, 'la tribu renforcée inflige 15');
  assert.equal(byOther.every(e => e.amount === 10), true, 'l\'autre tribu inflige toujours 10 — elle ne gagne RIEN');
  assert.equal(byLeader.every(e => e.amount === 20), true, 'le meneur ne se renforce pas lui-même');
});

test('G2: le buff de tribu ne franchit pas les camps — un ennemi de la même tribu ne gagne rien', () => {
  const leader = u('leader', fromXY(0, 7), {
    attack: 10, health: 100000, tribe: TRIBES.ARCANE, range: 20,
    keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.ARCANE, attack: 50, health: 50 }]
  });
  const enemySameTribe = u('spy', fromXY(0, 0), { attack: 10, health: 100000, tribe: TRIBES.ARCANE, range: 20 });
  const { events } = resolveCombat(setup('tribe_sides', [leader], [enemySameTribe]));

  assert.equal(kindsOf(events, 'Buff').length, 0, 'aucun Buff: le seul membre de la tribu est dans l\'autre camp');
  const bySpy = kindsOf(events, 'Damage').filter(e => e.source_unit_instance_id === 'spy');
  assert.ok(bySpy.length >= 1, 'précondition: l\'ennemi frappe bien');
  assert.equal(bySpy.every(e => e.amount === 10), true, 'l\'ennemi de la même tribu inflige toujours 10');
});

// =============================================================================================
// G3 — LE REGISTRE
// =============================================================================================

test('G3: le registre reste CLOS à 22 noms, et quatre des six noms jamais émis le sont enfin', () => {
  assert.equal(EVENT_KINDS.length, 22, 'aucun 23e nom n\'a été créé (INV-12)');

  // Une armée qui porte les six mots-clés, face à un ennemi qui la tue et qu'elle empoisonne.
  const a = [
    u('a_lead', fromXY(0, 5), {
      attack: 0, health: 300, tribe: TRIBES.SYLVE, range: 20,
      keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.SYLVE, attack: 5, health: 10 }]
    }),
    u('a_ward', fromXY(1, 5), {
      attack: 5, health: 60, tribe: TRIBES.SYLVE, range: 20,
      keywords: [{ id: KEYWORDS.TAUNT }, { id: KEYWORDS.DIVINE_SHIELD }, { id: KEYWORDS.REBORN },
        { id: KEYWORDS.DEATHRATTLE_BUFF, attack: 1, health: 1 }, { id: KEYWORDS.POISON }]
    })
  ];
  const b = [
    u('b_axe', fromXY(0, 0), { attack: 100, attack_cadence: 1, health: 5000, range: 20 }),
    u('b_prey', fromXY(1, 4), { attack: 0, health: 100 })
  ];
  const { events } = resolveCombat(setup('registry', a, b));

  const seen = new Set(events.map(e => e.kind));
  for (const kind of ['Spawn', 'Attack', 'Damage', 'Death', 'Victory', 'Shield', 'Buff', 'Debuff', 'Heal']) {
    assert.equal(seen.has(kind), true, `l'Event ${kind} est bien émis`);
  }
  assert.equal(seen.has('Cast'), false, 'Cast n\'est TOUJOURS pas émis (aucun DSL, aucune Ability) — dit, pas simulé');
  for (const ev of events) {
    assert.equal(EVENT_KINDS.includes(ev.kind), true, `nom hors registre: ${ev.kind}`);
  }

  // L'enveloppe obligatoire tient aussi sur les quatre Events nouvellement émis (CBT-5).
  const identities = new Set();
  for (const ev of events.filter(e => ['Shield', 'Buff', 'Debuff', 'Heal'].includes(e.kind))) {
    assert.equal(ev.combat_ref, 'registry');
    assert.equal(Number.isInteger(ev.tick) && ev.tick >= 0, true);
    assert.equal(Number.isInteger(ev.seq) && ev.seq >= 0, true);
    assert.equal(typeof ev.target_unit_instance_id, 'string', `${ev.kind} nomme sa cible`);
    assert.notEqual(ev.source_ref, undefined, `${ev.kind} porte un source_ref`);
    const key = `${ev.tick}|${ev.seq}`;
    assert.equal(identities.has(key), false, `identité (tick, seq) dupliquée: ${key}`);
    identities.add(key);
  }
});

// =============================================================================================
// CBT-1 / CBT-9 — DÉTERMINISME, MOTS-CLÉS COMPRIS
// =============================================================================================

test('CBT-1/G1: mêmes armées ⇒ journal identique OCTET POUR OCTET, mots-clés et tribus compris', () => {
  const a = [
    fromContent('a0', 'unit_11', fromXY(2, 5)),   // Templier: provocation + meneur Chevalerie
    fromContent('a1', 'unit_12', fromXY(3, 5)),   // Chef de Guerre: meneur + renaissance
    fromContent('a2', 'unit_3', fromXY(4, 5))     // Chevalier: bouclier divin + furie des vents
  ];
  const b = [
    fromContent('b0', 'unit_9', mirrorCell(fromXY(2, 5))),   // Homme d'Armes: venimeux
    fromContent('b1', 'unit_15', mirrorCell(fromXY(3, 5))),  // Archimage: meneur + râle d'agonie
    fromContent('b2', 'unit_14', mirrorCell(fromXY(4, 5)))   // Golem: provocation + renaissance
  ];
  const one = resolveCombat(setup('det_g', a, b));
  const two = resolveCombat(setup('det_g', a, b));
  assert.equal(JSON.stringify(one.events), JSON.stringify(two.events), 'journal identique octet pour octet');
  assert.equal(JSON.stringify(one.result), JSON.stringify(two.result), 'CombatResult identique');

  // Non-vacuité : le journal exerce RÉELLEMENT les mots-clés, sinon il ne prouverait rien de neuf.
  const seen = new Set(one.events.map(e => e.kind));
  assert.equal(seen.has('Buff'), true, 'précondition: des buffs de tribu ont bien eu lieu');
  assert.equal(seen.has('Shield'), true, 'précondition: un bouclier divin a bien été octroyé');

  // Les snapshots d'entrée ne sont pas mutés — y compris leurs listes de mots-clés (INV-17).
  const before = JSON.stringify({ a, b });
  resolveCombat(setup('det_g', a, b));
  assert.equal(JSON.stringify({ a, b }), before, 'INV-17: snapshots (et keywords) intacts');

  // CBT-9 statique : rien dans le pipeline ni dans le vocabulaire ne tire au sort.
  for (const file of ['combat/combat.mjs', 'combat/keywords.mjs']) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /Math\.random/, `${file} ne tire pas au sort`);
    assert.doesNotMatch(src, /rng_state/, `${file} ne touche pas au rng`);
  }
});

test('D2/MIRROR (G1): échanger les deux armées entre les sièges échange le VAINQUEUR, mots-clés compris', () => {
  const armyA = (p) => [
    fromContent(`${p}0`, 'unit_11', fromXY(2, 5)),
    fromContent(`${p}1`, 'unit_1', fromXY(3, 5)),
    fromContent(`${p}2`, 'unit_3', fromXY(4, 5))
  ];
  const armyB = (p) => [
    fromContent(`${p}0`, 'unit_13', fromXY(2, 6)),
    fromContent(`${p}1`, 'unit_9', fromXY(3, 6)),
    fromContent(`${p}2`, 'unit_5', fromXY(4, 6))
  ];
  const mirrored = (list) => list.map(x => ({ ...x, cell: mirrorCell(x.cell) }));

  const first = resolveCombat(setup('mir_g_a', armyA('a'), mirrored(armyB('b'))));
  const second = resolveCombat(setup('mir_g_b', armyB('b'), mirrored(armyA('a'))));

  assert.notEqual(first.result.resolution_kind, 'draw', 'précondition: la première assise a un vainqueur');
  // L'armée A gagne au siège 0 => la MÊME armée A doit gagner au siège 1 quand on échange.
  const aWonFirst = first.result.winner_side_ref === 'seat_0';
  const aWonSecond = second.result.winner_side_ref === 'seat_1';
  assert.equal(aWonFirst, aWonSecond,
    `l'armée gagnante doit être la même dans les deux assises (siège 0: ${first.result.winner_side_ref}, ` +
    `assise échangée: ${second.result.winner_side_ref}) — sinon le siège décide, pas les armées`);
  // NON asserted, et c'est un fait connu, pas un oubli : le DÉROULÉ des deux assises n'est pas
  // identique (durée, ordre du journal). Deux sources d'asymétrie existent et sont légitimes —
  // `spawn_order` (clé 4 de la chaîne) est attribué camp par camp, et `cellsWithin` énumère les
  // cases par index croissant, ce qui n'est pas symétrique par miroir. Ce que le test miroir doit
  // garantir, c'est qu'aucun SIÈGE ne gagne à la place d'une ARMÉE ; exiger le même nombre de
  // Ticks exigerait une symétrie que le plateau n'a pas.
});

// =============================================================================================
// P11 — LE MOTEUR RESTE CONTENT-AGNOSTIC
// =============================================================================================

test('P11: aucun identifiant d\'unité ni aucun nom de tribu n\'est codé en dur dans combat/', () => {
  const dir = new URL('./combat/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.mjs'));
  assert.ok(files.length >= 5, 'précondition: les modules de combat/ ont bien été audités');
  const unitIds = UNITS.map(x => x.id);
  for (const file of files) {
    const src = readFileSync(new URL(file, dir), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    // combat/army.mjs et combat/ghost.mjs ONT le droit de lire content/ (c'est leur rôle : la
    // seule porte par laquelle le contenu entre) ; ce qu'aucun module n'a le droit de faire,
    // c'est nommer une unité ou une tribu.
    for (const id of unitIds) {
      assert.equal(src.includes(`'${id}'`), false, `combat/${file} nomme l'unité ${id}`);
    }
    for (const tribe of TRIBE_NAMES) {
      assert.equal(src.includes(`'${tribe}'`), false, `combat/${file} nomme la tribu ${tribe}`);
    }
  }
});

test('P11: normalizeKeywords jette ce qu\'aucune bible ne définit et ne double jamais un mot-clé', () => {
  const norm = normalizeKeywords([
    { id: KEYWORDS.TAUNT },
    { id: 'mot_cle_inexistant', attack: 999 },
    { id: KEYWORDS.TAUNT },
    null,
    'taunt',
    { id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.SYLVE, attack: 5, health: 20 }
  ]);
  assert.deepEqual(norm.map(k => k.id), [KEYWORDS.TAUNT, KEYWORDS.TRIBE_BOOST],
    'inconnus jetés, doublon écarté, entrées malformées ignorées');
  assert.deepEqual(statDeltaOf(norm[1]), { attack: 5, health: 20 });
  // Un mot-clé sans montant déclaré ne donne AUCUN montant (jamais un défaut inventé).
  assert.deepEqual(statDeltaOf({ id: KEYWORDS.DEATHRATTLE_BUFF }), { attack: 0, health: 0 });
  assert.deepEqual(statDeltaOf(null), { attack: 0, health: 0 });
});

// =============================================================================================
// G2 — LE CONTENU
// =============================================================================================

test('G2: chaque unité a une tribu du référentiel et uniquement des mots-clés du vocabulaire clos', () => {
  for (const unit of UNITS) {
    assert.equal(TRIBE_NAMES.includes(unit.tribe), true, `${unit.id} (${unit.name}) a une tribu hors référentiel: ${unit.tribe}`);
    assert.equal(Array.isArray(unit.keywords), true, `${unit.id} n'a pas de liste de mots-clés`);
    for (const kw of unit.keywords) {
      assert.equal(KEYWORD_IDS.includes(kw.id), true, `${unit.id} porte un mot-clé inconnu: ${kw.id}`);
    }
    // Un mot-clé paramétré DOIT porter ses paramètres — sinon il s'appliquerait à 0 en silence.
    const boost = unit.keywords.find(k => k.id === KEYWORDS.TRIBE_BOOST);
    if (boost) {
      assert.equal(TRIBE_NAMES.includes(boost.tribe), true, `${unit.id}: meneur d'une tribu inexistante`);
      assert.equal(boost.attack > 0 || boost.health > 0, true, `${unit.id}: meneur qui ne donne rien`);
    }
    const rattle = unit.keywords.find(k => k.id === KEYWORDS.DEATHRATTLE_BUFF);
    if (rattle) {
      assert.equal(rattle.attack > 0 || rattle.health > 0, true, `${unit.id}: râle d'agonie qui ne donne rien`);
    }
  }
  // Accesseurs de contenu cohérents avec les données.
  assert.equal(getUnitTribe('unit_1'), TRIBES.CHEVALERIE);
  assert.equal(getUnitTribe('inconnu'), null, 'une définition inconnue n\'a pas de tribu inventée');
  assert.equal(getUnitKeywords('inconnu').length, 0);
});

test('G2: chaque tribu a au moins trois membres et au moins DEUX meneuses — une composition cohérente est possible', () => {
  for (const tribe of TRIBE_NAMES) {
    const members = getUnitDefsOfTribe(tribe);
    assert.ok(members.length >= 3, `${tribe}: ${members.length} membre(s), il en faut au moins 3`);
    const leaders = members.filter(m => m.keywords.some(k => k.id === KEYWORDS.TRIBE_BOOST && k.tribe === tribe));
    assert.ok(leaders.length >= 2, `${tribe}: ${leaders.length} meneuse(s), il en faut au moins 2`);
  }
  // Chaque mot-clé du vocabulaire est réellement porté par au moins deux unités : un mot-clé
  // implémenté que personne ne porte serait du code mort déguisé en profondeur.
  for (const id of KEYWORD_IDS) {
    const carriers = UNITS.filter(x => x.keywords.some(k => k.id === id));
    assert.ok(carriers.length >= 2, `le mot-clé ${id} n'est porté que par ${carriers.length} unité(s)`);
  }
});

test('G4: chaque mot-clé du vocabulaire a un libellé FRANÇAIS, et aucun libellé n\'est orphelin', () => {
  assert.deepEqual([...KEYWORD_IDS].sort(), Object.keys(KEYWORD_LABELS).sort(),
    'le vocabulaire de combat/keywords.mjs et la table de libellés de content/ doivent coïncider exactement');
  for (const unit of UNITS) {
    for (const kw of unit.keywords) {
      const name = keywordName(kw);
      const textOf = keywordText(kw);
      assert.notEqual(name, kw.id, `${unit.id}: le mot-clé ${kw.id} est affiché avec son id brut`);
      assert.ok(textOf.length > 10, `${unit.id}: le mot-clé ${kw.id} n'a pas de phrase de règle`);
      assert.doesNotMatch(textOf, /undefined|NaN/, `${unit.id}: la phrase de ${kw.id} contient un trou`);
      // Un mot-clé paramétré doit AFFICHER ses montants réels — pas une formule générique.
      if (kw.id === KEYWORDS.TRIBE_BOOST || kw.id === KEYWORDS.DEATHRATTLE_BUFF) {
        assert.ok(textOf.includes(`+${kw.attack}/+${kw.health}`),
          `${unit.id}: la phrase de ${kw.id} n'affiche pas ses montants réels (+${kw.attack}/+${kw.health})`);
      }
    }
  }
});

// =============================================================================================
// G4 — L'ÉCRAN AVEUGLE VOIT LES MOTS-CLÉS
// =============================================================================================

test('G4/R1: le renderer AVEUGLE voit le bouclier tenir puis se briser, le venin et la renaissance — depuis le journal SEUL', async () => {
  const { buildCombatFrame } = await import('./renderer/combat_view.mjs');
  const { TICK_DURATION_MS } = await import('./params.v0.mjs');

  const attacker = u('att', fromXY(0, 4), { attack: 40, attack_cadence: 1, keywords: [{ id: KEYWORDS.POISON }] });
  const shielded = u('def', fromXY(0, 3), {
    attack: 0, health: 400,
    keywords: [{ id: KEYWORDS.DIVINE_SHIELD }, { id: KEYWORDS.REBORN }, { id: KEYWORDS.TAUNT }]
  });
  const { events } = resolveCombat(setup('view', [attacker], [shielded]));

  const frameAt = (ms) => buildCombatFrame(events, ms);
  const unitIn = (frame, id) => frame.units.find(x => x.unit_instance_id === id);

  // Tick 1, avant l'impact : le halo est là, il vient du Shield du CombatSetup.
  const early = frameAt(TICK_DURATION_MS * 0.1);
  assert.equal(unitIn(early, 'def').divine_shield, true, 'le bouclier divin est visible avant le premier coup');
  assert.deepEqual(unitIn(early, 'def').keywords.sort(),
    [KEYWORDS.DIVINE_SHIELD, KEYWORDS.REBORN, KEYWORDS.TAUNT].sort(),
    'les mots-clés voyagent dans le Spawn: l\'écran peut dessiner une provocation sans lire l\'état');

  // Tick 2, début : le premier coup a été encaissé, le halo a disparu, la vie n'a pas bougé.
  const afterFirst = frameAt(TICK_DURATION_MS * 1.1);
  assert.equal(unitIn(afterFirst, 'def').divine_shield, false, 'le halo disparaît une fois le bouclier consommé');
  assert.equal(unitIn(afterFirst, 'def').health, 400, 'et la barre de vie n\'a pas bougé d\'un point');

  // L'impact du PREMIER Tick est marqué « entièrement absorbé » — c'est ce qui permet de dessiner
  // « le bouclier a tenu » plutôt qu'un coup à zéro dégât (COMBAT_EVENT_FIELDS §3.C).
  const atImpact = frameAt(TICK_DURATION_MS * 0.97);
  assert.ok(atImpact.impacts.length >= 1, 'précondition: un impact est bien dessiné à ce moment');
  assert.equal(atImpact.impacts[0].fully_absorbed, true, 'l\'impact est marqué comme entièrement absorbé');
  // Un coup dont RIEN n'est passé ne fait pas clignoter l'unité en rouge : le clignotement dit
  // « je suis blessée », et un bouclier qui tient dit exactement le contraire.
  assert.equal(unitIn(atImpact, 'def').hit_flash, 0, 'aucun flash de blessure sur un coup entièrement absorbé');
  const wounded = frameAt(TICK_DURATION_MS * 1.97);
  assert.ok(wounded.impacts.some(i => i.fully_absorbed === false),
    'précondition: le second coup, lui, passe bien');
  assert.ok(unitIn(wounded, 'def').hit_flash > 0, 'témoin: un coup qui BLESSE fait bien clignoter l\'unité');

  // Le venin et la renaissance sont visibles eux aussi, au Tick où ils arrivent.
  const anyPoison = [];
  const anyReborn = [];
  for (let t = 0; t <= events[events.length - 1].tick + 1; t++) {
    const f = frameAt(TICK_DURATION_MS * (t + 0.97));
    for (const n of f.notices) {
      if (n.kind === 'poison') anyPoison.push(n);
      if (n.kind === 'reborn') anyReborn.push(n);
    }
  }
  assert.ok(anyPoison.length >= 1, 'le venin est annoncé à l\'écran');
  assert.ok(anyReborn.length >= 1, 'la renaissance est annoncée à l\'écran');
  assert.equal(anyReborn[0].text, 'RENAISSANCE');

  // Et la mort par venin reste lisible: l'unité tombe alors que sa vie affichée est > 0.
  const poisonDamage = damagesOn(events, 'def').find(d => d.absorbed_by_shield === 0);
  assert.ok(poisonDamage, 'précondition: un coup a bien blessé la cible');
  const death = kindsOf(events, 'Death').find(e => e.unit_instance_id === 'def');
  assert.ok(death, 'précondition: la cible meurt');
  assert.ok(poisonDamage.target_health_after > 0,
    'la cible meurt avec de la vie au compteur — c\'est bien le venin, et le Debuff du journal le dit');
});

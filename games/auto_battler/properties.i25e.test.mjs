// properties.i25e.test.mjs - L'ENJEU (increment 2.5, dispatch auto_battler_i2_5-20260719c,
// commande E). Couvre les quatre travaux et, pour CHAQUE constante ajoutée, un test de son
// EFFET — jamais de sa simple présence :
//   E1  Life du Seat + fin de partie   (LIFE_INITIAL, LIFE_FLOOR, phase 'Elimination')
//   E2  formule de dégâts au joueur    (computeLifeDamage, ghostLevelFor)
//   E3  l'étoile renforce              (STAR_ATTACK_MULTIPLIER, STAR_HEALTH_MULTIPLIER)
//   E4  le niveau limite la pose       (BOARD_SLOTS_PER_LEVEL, boardCapacityForLevel)
//   +   SHOP_SIZE réellement câblé dans round/round.mjs (littéral 5 supprimé)
//   +   la Life affichée par le renderer AVEUGLE est celle de l'état (dérivée du seul journal)
//
// Aucune assertion `>=` tautologique : chaque borne est accompagnée de la valeur exacte, ou d'un
// témoin qui prouve qu'elle n'est pas satisfaite à vide.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as round from './round/round.mjs';
import * as prep from './preparation/preparation.mjs';
import * as shopMod from './shop/shop.mjs';
import * as serialize from './engine/serialize.mjs';
import { createGameState } from './engine/state.mjs';
import { resolveCombat } from './combat/combat.mjs';
import { buildPlayerSide } from './combat/army.mjs';
import { buildGhostSide } from './combat/ghost.mjs';
import { fromXY } from './combat/cell.mjs';
import { buildViewModel } from './renderer/viewmodel.mjs';
import { getUnitDef, getUnitRank } from './content/units.v0.mjs';
import {
  LIFE_INITIAL,
  LIFE_FLOOR,
  SHOP_SIZE,
  BOARD_SLOTS_PER_LEVEL,
  STAR_ATTACK_MULTIPLIER,
  STAR_HEALTH_MULTIPLIER,
  LEVEL_UP_COSTS,
  computeLifeDamage,
  ghostLevelFor,
  boardCapacityForLevel,
  starAttack,
  starHealth
} from './params.v0.mjs';

const SEAT = 'player_0';

/** A started game (income credited, opening shop drawn) — the state app/ boots into. */
function startedGame(seed) {
  return round.startRound(round.newGame(seed, [SEAT]));
}

/** Same game, with the seat's board / level / life / gold forced to a chosen fixture. */
function withSeat(state, patch) {
  const players = { ...state.players };
  players[SEAT] = { ...players[SEAT], ...patch };
  return createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: state.eventLog,
    players,
    entities: state.entities,
    phase: state.phase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });
}

function boardUnit(id, defId, star, x, y) {
  return { unit_instance_id: id, unit_def_id: defId, star, board_index: fromXY(x, y) };
}

function lastVictory(state) {
  return state.eventLog.filter(e => e.kind === 'Victory').pop();
}

/**
 * Scan seeds until the GHOST wins the first battle of a game whose board is `boardUnits`.
 * Deterministic (the scan is a pure function of the fixtures) and self-verifying: the caller
 * asserts a scenario was actually found, so the tests below can never pass vacuously.
 */
function findGhostWin(boardUnits, patch = {}, maxSeed = 400) {
  for (let seed = 1; seed <= maxSeed; seed++) {
    const prepared = withSeat(startedGame(seed), { board: boardUnits, ...patch });
    // Go through the real ConfirmPreparation so the state is in the phase a battle is resolved
    // from ('Battle'), exactly as app/ reaches it.
    const before = prep.applyPreparationInput(prepared, { kind: 'ConfirmPreparation', seatId: SEAT });
    const after = round.resolveBattle(before, SEAT);
    const victory = lastVictory(after);
    if (victory && victory.winner_side_ref === `ghost_of_${SEAT}`) {
      return { seed, before, after, victory };
    }
  }
  return null;
}

// =============================================================================================
// E1 — LA LIFE EXISTE, ET ELLE BAISSE
// =============================================================================================

test('E1/EFFET de LIFE_INITIAL: une partie neuve donne au Seat exactement LIFE_INITIAL points de Life (INV-15: une seule)', () => {
  const s = startedGame(101);
  const player = s.players[SEAT];
  assert.equal(player.life, LIFE_INITIAL, 'la Life initiale du Seat est LIFE_INITIAL');
  assert.equal(LIFE_INITIAL, 30, 'valeur v0 sourcée Hearthstone Battlegrounds, ratifiée dispatch commande E');
  // INV-15 : une et une seule Life par Player — un seul champ, et il porte ce nom.
  const lifeFields = Object.keys(player).filter(k => /life/i.test(k));
  assert.deepEqual(lifeFields, ['life'], 'exactement un champ Life sur le Player');
  // INV-14 : aucune Unit ne porte de Life (elles ont une Health).
  for (const u of [...player.bench, ...player.board]) {
    assert.equal(Object.keys(u).some(k => /life/i.test(k)), false, 'aucune Unit ne porte de Life');
  }
});

test('E1/E2: perdre un combat fait BAISSER la Life du montant EXACT donné par la formule (niveau du vainqueur + rangs des survivants)', () => {
  // Un seul Éclaireur (unit_6, rang 1) au niveau 1 — la fixture la plus fragile de son rang,
  // choisie pour qu'une DÉFAITE soit atteignable. Le fantôme est construit en miroir : UNE
  // unité, de rang 1 elle aussi. S'il gagne par élimination il a EXACTEMENT un survivant rang 1.
  // Les dégâts attendus se calculent alors à la main : niveau 1 + rang 1 = 2. Aucune formule
  // n'est rejouée dans l'assertion.
  const found = findGhostWin([boardUnit('p0', 'unit_6', 1, 0, 5)]);
  assert.ok(found, 'précondition: un seed où le fantôme gagne a bien été trouvé (test non vide)');

  const { before, after, victory } = found;
  assert.equal(victory.resolution_kind, 'elimination', 'le fantôme gagne par élimination');
  assert.equal(victory.survivors.length, 1, 'le fantôme n\'avait qu\'une unité: exactement 1 survivant');

  const EXPECTED_DAMAGE = 2; // 1 (niveau du vainqueur, miroir du joueur) + 1 (rang du survivant)
  assert.equal(before.players[SEAT].life, LIFE_INITIAL, 'précondition: Life pleine avant le combat');
  assert.equal(after.players[SEAT].life, LIFE_INITIAL - EXPECTED_DAMAGE,
    `la Life passe de ${LIFE_INITIAL} à ${LIFE_INITIAL - EXPECTED_DAMAGE} — exactement ${EXPECTED_DAMAGE} points`);
  assert.notEqual(after.players[SEAT].life, before.players[SEAT].life, 'la Life a bien changé (pas un no-op)');

  // CBT-6 tient toujours : la Life est le SEUL champ qu'une bataille peut toucher.
  const b = before.players[SEAT];
  const a = after.players[SEAT];
  assert.equal(a.gold, b.gold, 'Gold intact');
  assert.equal(a.level, b.level, 'Level intact');
  assert.equal(JSON.stringify(a.bench), JSON.stringify(b.bench), 'Bench intact');
  assert.equal(JSON.stringify(a.board), JSON.stringify(b.board), 'Board intact (CBT-8: on se bat sur des snapshots)');
  assert.equal(JSON.stringify(a.shop), JSON.stringify(b.shop), 'Shop intact');
  assert.equal(after.rng_state, before.rng_state, 'CBT-9: aucune consommation de hasard');
});

test('E1/E2: perdre TARD coûte plus cher que perdre TÔT — le niveau et les rangs entrent réellement dans la facture', () => {
  const cheap = findGhostWin([boardUnit('p0', 'unit_6', 1, 0, 5)], { level: 1 });
  assert.ok(cheap, 'précondition: défaite trouvée au niveau 1 avec une unité de rang 1');
  const cheapCost = LIFE_INITIAL - cheap.after.players[SEAT].life;
  assert.equal(cheapCost, 2, 'défaite précoce: 1 (niveau) + 1 (rang) = 2 points');

  // Même chose au niveau 5 avec une unité de RANG 5 : le miroir donne au fantôme une unité de
  // rang 5, donc 5 (niveau) + 5 (rang) = 10.
  const late = findGhostWin([boardUnit('p0', 'unit_15', 1, 0, 5)], { level: 5 });
  assert.ok(late, 'précondition: défaite trouvée au niveau 5 avec une unité de rang 5');
  assert.equal(late.victory.survivors.length, 1, 'un seul survivant côté fantôme');
  const lateCost = LIFE_INITIAL - late.after.players[SEAT].life;
  assert.equal(lateCost, 10, 'défaite tardive: 5 (niveau) + 5 (rang) = 10 points');
  assert.equal(lateCost, cheapCost * 5, 'perdre tard coûte exactement 5x perdre tôt dans ce couple de fixtures');
});

test('E2/EFFET de computeLifeDamage: valeurs exactes, et se faire BALAYER coûte strictement plus que perdre de justesse', () => {
  assert.equal(computeLifeDamage(1, []), 1, 'aucun survivant: seul le niveau du vainqueur compte');
  assert.equal(computeLifeDamage(3, [1, 2, 5]), 11, '3 + (1+2+5) = 11 — valeur calculée à la main');
  assert.equal(computeLifeDamage(6, [5, 5, 5, 5]), 26, '6 + 20 = 26');

  // Balayé (4 survivants) vs perdu de justesse (1 survivant), même niveau, mêmes rangs.
  const swept = computeLifeDamage(4, [3, 3, 3, 3]);
  const narrow = computeLifeDamage(4, [3]);
  assert.equal(swept, 16, '4 + 12');
  assert.equal(narrow, 7, '4 + 3');
  assert.ok(swept > narrow, 'se faire balayer coûte strictement plus cher');
  assert.equal(swept - narrow, 9, 'exactement 3 rangs de plus, soit 9 points');

  // ghostLevelFor: le fantôme joue au niveau du joueur (miroir). EFFET, pas présence.
  assert.equal(ghostLevelFor(4), 4, 'le fantôme se voit attribuer le niveau du joueur');
  assert.equal(computeLifeDamage(ghostLevelFor(4), [2]), 6, '4 + 2 = 6');
});

test('E1/QB-6: un MATCH NUL ne coûte AUCUNE Life — ratifié verbatim par le propriétaire, et enfin vérifiable', () => {
  // Plateau vide des deux côtés -> les deux camps sont vides au Tick 1 -> 'draw' (QB-6).
  let s = startedGame(7);
  s = prep.applyPreparationInput(s, { kind: 'ConfirmPreparation', seatId: SEAT });
  const lifeBefore = s.players[SEAT].life;
  const after = round.resolveBattle(s, SEAT);
  const victory = lastVictory(after);

  assert.equal(victory.resolution_kind, 'draw', 'précondition: la résolution est bien un match nul');
  assert.equal(victory.winner_side_ref, null, 'aucun vainqueur');
  assert.equal(after.players[SEAT].life, lifeBefore, 'Life STRICTEMENT inchangée après un match nul');
  assert.equal(after.players[SEAT].life, LIFE_INITIAL, 'et elle vaut toujours LIFE_INITIAL');

  // Témoin de non-vacuité: la MÊME machinerie retire bien de la Life quand ce n'est pas un nul.
  const loss = findGhostWin([boardUnit('p0', 'unit_6', 1, 0, 5)]);
  assert.ok(loss, 'précondition: une défaite existe bien dans le même système');
  assert.ok(loss.after.players[SEAT].life < LIFE_INITIAL,
    'témoin: hors match nul, la Life baisse — le test ci-dessus n\'est pas satisfait à vide');
});

test('E1: life <= 0 déclenche la FIN DE PARTIE — phase Elimination, aucun Round de plus, aucun Input accepté', () => {
  // Une Life de 2 exactement: la défaite trouvée coûte 2 points, elle tombe donc à 0 pile.
  const found = findGhostWin([boardUnit('p0', 'unit_6', 1, 0, 5)], { life: 2 });
  assert.ok(found, 'précondition: une défaite a été trouvée');
  const dead = found.after;
  assert.equal(dead.players[SEAT].life, LIFE_FLOOR, 'la Life est tombée au plancher (0)');
  assert.equal(dead.phase, 'Battle', 'la bataille fatale reste regardable: la phase ne change pas pendant la résolution');
  assert.equal(round.isMatchOver(dead), true, 'le Match est terminé');

  // Le tour suivant n'a PAS lieu.
  const next = round.startNextRound(dead);
  assert.equal(next.phase, 'Elimination', 'la phase devient Elimination');
  assert.equal(next.round_index, dead.round_index, 'aucun round supplémentaire n\'est ouvert');
  assert.equal(next.players[SEAT].gold, dead.players[SEAT].gold, 'aucun revenu crédité');
  const phaseEvents = next.eventLog.filter(e => e.kind === 'PhaseChanged');
  assert.equal(phaseEvents[phaseEvents.length - 1].to_phase, 'Elimination',
    'la fin de partie est portée par un PhaseChanged — Event DÉJÀ dans le registre fermé, aucun 23e nom créé');

  // Le jeu ne continue pas: rappeler startNextRound ne fait strictement rien.
  const again = round.startNextRound(next);
  assert.equal(serialize.serialize(again), serialize.serialize(next),
    'relancer un tour après élimination laisse l\'état STRICTEMENT identique (pas même un Event dupliqué)');

  // INV-9: plus AUCUN Input n'est accepté, quel qu'il soit.
  const frozen = serialize.serialize(next);
  const inputs = [
    { kind: 'Buy', seatId: SEAT, unitDefId: 'unit_1', shop_index: 0 },
    { kind: 'Sell', seatId: SEAT, unit_instance_id: 'p0' },
    { kind: 'Reroll', seatId: SEAT },
    { kind: 'Lock', seatId: SEAT },
    { kind: 'LevelUp', seatId: SEAT },
    { kind: 'Place', seatId: SEAT, unit_instance_id: 'p0', to_zone: 'board', to_index: 40 },
    { kind: 'ConfirmPreparation', seatId: SEAT }
  ];
  for (const input of inputs) {
    const rejected = prep.applyPreparationInput(next, input);
    assert.equal(serialize.serialize(rejected), frozen, `Input ${input.kind} refusé après élimination: état identique`);
  }

  // Témoin de non-vacuité: les MÊMES Inputs sont acceptés tant que la Life tient.
  const alive = withSeat(startedGame(303), { gold: 50 });
  const accepted = prep.applyPreparationInput(alive, { kind: 'Lock', seatId: SEAT });
  assert.notEqual(serialize.serialize(accepted), serialize.serialize(alive),
    'témoin: hors élimination, un Lock passe — le gel ci-dessus n\'est pas un refus universel');
});

test('E1/EFFET de LIFE_FLOOR: la Life ne descend jamais sous le plancher, même quand les dégâts le dépassent', () => {
  const found = findGhostWin([boardUnit('p0', 'unit_15', 1, 0, 5)], { level: 5, life: 3 });
  assert.ok(found, 'précondition: défaite trouvée');
  const cost = 10; // 5 (niveau) + 5 (rang du survivant)
  assert.ok(cost > 3, 'précondition: les dégâts (10) dépassent bien la Life restante (3)');
  assert.equal(found.after.players[SEAT].life, LIFE_FLOOR, 'la Life est bornée au plancher, pas négative');
});

// =============================================================================================
// E3 — L'ÉTOILE RENFORCE
// =============================================================================================

test('E3/EFFET des multiplicateurs: un ★2 du même Piquier a EXACTEMENT 1,5x son attaque et 1,8x sa vie dans le snapshot de combat', () => {
  const def = getUnitDef('unit_1');
  assert.equal(def.attack, 40, 'précondition: Piquier attaque à 40');
  assert.equal(def.hp, 420, 'précondition: Piquier a 420 PV');

  const side = buildPlayerSide('seat', [
    boardUnit('s1', 'unit_1', 1, 0, 5),
    boardUnit('s2', 'unit_1', 2, 1, 5),
    boardUnit('s3', 'unit_1', 3, 2, 5)
  ]);
  const [one, two, three] = side.units;

  assert.equal(one.attack, 40, '★1 : attaque de base');
  assert.equal(one.health, 420, '★1 : vie de base');

  assert.equal(two.attack, 60, '★2 : 60 = 40 x 1,5 exactement');
  assert.equal(two.attack, one.attack * 1.5, '★2 inflige exactement 1,5x les dégâts du ★1');
  assert.equal(two.health, 756, '★2 : 756 = 420 x 1,8 exactement');
  assert.equal(two.health, one.health * 1.8, '★2 encaisse exactement 1,8x plus que le ★1');

  assert.equal(three.attack, Math.round(40 * 2.25), '★3 : 225 % d\'attaque (TFT)');
  assert.equal(three.health, Math.round(420 * 3.24), '★3 : 324 % de vie (TFT)');
  assert.ok(three.attack > two.attack && three.health > two.health, '★3 est strictement au-dessus du ★2');

  assert.deepEqual(STAR_ATTACK_MULTIPLIER, [1, 1.5, 2.25], 'table d\'attaque v0 sourcée TFT');
  assert.deepEqual(STAR_HEALTH_MULTIPLIER, [1, 1.8, 3.24], 'table de vie v0 sourcée TFT');
  assert.equal(starAttack(40, 2), 60, 'la fonction et le snapshot donnent le même nombre');
  assert.equal(starHealth(420, 2), 756, 'idem pour la vie');
});

test('E3/EFFET en COMBAT RÉEL: le ★2 frappe pour 1,5x et met exactement 1,8x plus de temps à tomber', () => {
  // Un cogneur immobile à 42 de dégâts par Tick, collé à la cible. 420 / 42 = 10 Ticks pour un
  // ★1 ; 756 / 42 = 18 Ticks pour un ★2. 18 / 10 = 1,8 EXACTEMENT — la vie multipliée se lit
  // directement dans le nombre de coups encaissés, pas dans un champ.
  function bully(cell) {
    return {
      unit_instance_id: 'bully', unit_definition_ref: 'fixture', star: 1, rank: 1, cell,
      health: 100000, attack: 42, attack_cadence: 1, range: 1, move_speed: 0, delivery: 'melee'
    };
  }
  function deathTickOf(star) {
    const target = buildPlayerSide('seat', [boardUnit('t', 'unit_1', star, 3, 5)]).units[0];
    const { events } = resolveCombat({
      combat_ref: `star_${star}`,
      sides: [{ side_ref: 'seat', units: [target] }, { side_ref: 'foe', units: [bully(fromXY(3, 4))] }]
    });
    const death = events.find(e => e.kind === 'Death' && e.unit_instance_id === 't');
    assert.ok(death, `précondition: le ★${star} meurt bien dans la fenêtre de Ticks`);
    const dealt = events.filter(e => e.kind === 'Damage' && e.source_unit_instance_id === 't');
    return { deathTick: death.tick, ownDamage: dealt.length > 0 ? dealt[0].amount : null };
  }

  const s1 = deathTickOf(1);
  const s2 = deathTickOf(2);

  assert.equal(s1.deathTick, 10, '★1 : tombe au Tick 10 (420 / 42)');
  assert.equal(s2.deathTick, 18, '★2 : tombe au Tick 18 (756 / 42)');
  assert.equal(s2.deathTick, s1.deathTick * 1.8, 'le ★2 encaisse exactement 1,8x plus de coups');

  assert.equal(s1.ownDamage, 40, '★1 : un coup à 40');
  assert.equal(s2.ownDamage, 60, '★2 : un coup à 60');
  assert.equal(s2.ownDamage, s1.ownDamage * 1.5, 'le ★2 inflige exactement 1,5x les dégâts du ★1');
});

test('E3: fusionner ne peut plus AFFAIBLIR — un ★2 bat le ★1 dont il est issu, et le fantôme miroite la Star', () => {
  const one = buildPlayerSide('mono', [boardUnit('a', 'unit_1', 1, 3, 5)]).units[0];
  const two = buildPlayerSide('duo', [boardUnit('b', 'unit_1', 2, 3, 4)]).units[0];
  const { result } = resolveCombat({
    combat_ref: 'merge_pays',
    sides: [{ side_ref: 'mono', units: [one] }, { side_ref: 'duo', units: [two] }]
  });
  assert.equal(result.winner_side_ref, 'duo', 'le ★2 gagne contre le ★1 — la fusion est enfin un gain');
  assert.equal(result.resolution_kind, 'elimination', 'et il gagne par élimination, pas par un départage');

  // Le fantôme miroite la Star: un joueur en ★2 n'affronte plus une armée bloquée à ★1.
  const ghost = buildGhostSide('ghost', [boardUnit('p', 'unit_1', 2, 3, 5)], 42, 0);
  assert.equal(ghost.units.length, 1, 'précondition: le fantôme a bien une unité');
  assert.equal(ghost.units[0].star, 2, 'la Star du fantôme miroite celle du joueur');
  const ghostDef = getUnitDef(ghost.units[0].unit_definition_ref);
  assert.equal(ghost.units[0].attack, starAttack(ghostDef.attack, 2), 'et elle est réellement appliquée à son attaque');
  assert.equal(ghost.units[0].health, starHealth(ghostDef.hp, 2), 'et à sa vie');
});

// =============================================================================================
// E4 — LE NIVEAU LIMITE LE NOMBRE D'UNITÉS POSÉES
// =============================================================================================

test('E4/EFFET de boardCapacityForLevel: la limite EST le niveau, et poser la (N+1)e unité est refusé — état sérialisé identique', () => {
  assert.equal(BOARD_SLOTS_PER_LEVEL, 1, 'v0 sourcée TFT: une place de plateau par point de niveau');
  for (const level of [1, 2, 3, 5]) {
    assert.equal(boardCapacityForLevel(level), level, `niveau ${level} -> ${level} unités posables`);
  }

  for (const level of [1, 2, 3]) {
    // Un banc rempli de N+1 unités, un niveau N, de l'or à ne plus savoir qu'en faire.
    const bench = [];
    for (let i = 0; i <= level; i++) {
      bench.push({ unit_instance_id: `u${i}`, unit_def_id: 'unit_1', star: 1, creation_tick: 0 });
    }
    let s = withSeat(startedGame(500 + level), { gold: 99, level, bench, board: [] });

    // Les N premières poses passent.
    for (let i = 0; i < level; i++) {
      const next = prep.applyPreparationInput(s, {
        kind: 'Place', seatId: SEAT, unit_instance_id: `u${i}`, to_zone: 'board', to_index: 32 + i
      });
      assert.notEqual(serialize.serialize(next), serialize.serialize(s), `pose ${i + 1}/${level} acceptée`);
      s = next;
    }
    assert.equal(s.players[SEAT].board.length, level, `${level} unité(s) posée(s) au niveau ${level}`);

    // La (N+1)e est refusée — sur une case LIBRE et DANS la zone du joueur, pour qu'aucune autre
    // règle ne puisse expliquer le refus.
    const freeCell = 32 + level;
    assert.equal(s.players[SEAT].board.some(u => u.board_index === freeCell), false,
      'précondition: la case visée est libre');
    const before = serialize.serialize(s);
    const rejected = prep.applyPreparationInput(s, {
      kind: 'Place', seatId: SEAT, unit_instance_id: `u${level}`, to_zone: 'board', to_index: freeCell
    });
    assert.equal(serialize.serialize(rejected), before,
      `niveau ${level}: la ${level + 1}e pose est refusée, état sérialisé STRICTEMENT identique`);
    assert.equal(rejected.eventLog.length, s.eventLog.length, 'journal de longueur inchangée: aucun Event de rejet');

    // Et monter d'un niveau débloque EXACTEMENT une place de plus.
    const levelled = withSeat(s, { level: level + 1 });
    const accepted = prep.applyPreparationInput(levelled, {
      kind: 'Place', seatId: SEAT, unit_instance_id: `u${level}`, to_zone: 'board', to_index: freeCell
    });
    assert.equal(accepted.players[SEAT].board.length, level + 1,
      `au niveau ${level + 1} la même pose passe — c'est bien le NIVEAU qui bloquait`);
  }
});

test('E4/F1: la table de coûts va désormais jusqu\'au niveau 10 — chaque palier coûte le prix EXACT déclaré, monter au-delà est refusé', () => {
  // HISTOIRE (E4, commande E): le tarif des paliers s'arrêtait au niveau 5 (preparation.mjs,
  // GOLD_COSTS.LevelUp). L'ancien code lisait `|| 0` : chaque niveau au-delà était GRATUIT —
  // donc un nombre ILLIMITÉ d'unités posables sans dépenser un or. F1 (s9-build commande F)
  // RÉSOUT le TODO [FOG] laissé par E4 : la table (params.v0.mjs::LEVEL_UP_COSTS, sourcée TFT
  // et transposée — voir le commentaire là-bas) va maintenant jusqu'au niveau 10 ; le refus
  // sans repli à 0 reste vrai, simplement déplacé au-delà du niveau 10.
  let s = withSeat(startedGame(801), { gold: 999, level: 4 });

  const to5 = prep.applyPreparationInput(s, { kind: 'LevelUp', seatId: SEAT });
  assert.equal(to5.players[SEAT].level, 5, 'le palier 5 est tarifé: la montée passe');
  assert.equal(to5.players[SEAT].gold, 999 - LEVEL_UP_COSTS[5], 'et elle coûte le prix EXACT déclaré pour le niveau 5');
  assert.equal(boardCapacityForLevel(5), 5, 'elle donne 5 places de plateau');

  // F1: le niveau 6 (autrefois refusé) est désormais tarifé, coûte le prix EXACT déclaré, et
  // la limite de pose passe à 6 — ce sont les trois faits exigés par le dispatch s9-build.
  const to6 = prep.applyPreparationInput(to5, { kind: 'LevelUp', seatId: SEAT });
  assert.equal(to6.players[SEAT].level, 6, 'F1: le palier 6 est désormais tarifé, la montée passe');
  assert.equal(to6.players[SEAT].gold, to5.players[SEAT].gold - LEVEL_UP_COSTS[6],
    'et elle coûte le prix EXACT déclaré pour le niveau 6');
  assert.equal(boardCapacityForLevel(6), 6, 'la limite de pose passe à EXACTEMENT 6');

  // Monte jusqu'au plafond ratifié de ce v0 (niveau 10), un palier à la fois, prix exact à chaque fois.
  let s10 = to6;
  for (const level of [7, 8, 9, 10]) {
    const before = s10.players[SEAT].gold;
    s10 = prep.applyPreparationInput(s10, { kind: 'LevelUp', seatId: SEAT });
    assert.equal(s10.players[SEAT].level, level, `le niveau ${level} est atteignable`);
    assert.equal(s10.players[SEAT].gold, before - LEVEL_UP_COSTS[level], `le niveau ${level} coûte le prix EXACT déclaré`);
  }
  assert.equal(s10.players[SEAT].level, 10, 'le niveau 10 est atteint');
  assert.equal(boardCapacityForLevel(10), 10, 'la limite de pose atteint 10');

  // Le palier 11 n'a AUCUN prix ratifié dans ce v0: refusé, état strictement identique — jamais
  // un repli à 0, jamais un niveau inventé au-delà du plafond.
  const before11 = serialize.serialize(s10);
  const to11 = prep.applyPreparationInput(s10, { kind: 'LevelUp', seatId: SEAT });
  assert.equal(serialize.serialize(to11), before11,
    'le palier 11 n\'a AUCUN prix ratifié: l\'Input est refusé, état strictement identique');
  assert.equal(to11.players[SEAT].level, 10, 'le niveau n\'a pas bougé au-delà de 10');
  assert.equal(boardCapacityForLevel(to11.players[SEAT].level), 10,
    'la limite de pose reste donc bornée à 10: pas de place gratuite au-delà du plafond');
});

test('E4: un repositionnement plateau->plateau n\'est JAMAIS refusé par la limite (le compte ne change pas)', () => {
  let s = withSeat(startedGame(601), {
    gold: 99, level: 1, bench: [],
    board: [boardUnit('u0', 'unit_1', 1, 0, 4)]
  });
  assert.equal(s.players[SEAT].board.length, boardCapacityForLevel(1), 'précondition: le plateau est à sa limite');

  const moved = prep.applyPreparationInput(s, {
    kind: 'Place', seatId: SEAT, unit_instance_id: 'u0', to_zone: 'board', to_index: fromXY(2, 6)
  });
  assert.equal(moved.players[SEAT].board.length, 1, 'toujours une seule unité');
  assert.equal(moved.players[SEAT].board[0].board_index, fromXY(2, 6), 'elle a bien changé de case malgré le plateau plein');
});

// =============================================================================================
// SHOP_SIZE — la constante ratifiée est réellement celle qui tire
// =============================================================================================

test('EFFET de SHOP_SIZE: la boutique de DÉBUT DE TOUR fait SHOP_SIZE emplacements, et le littéral 5 a disparu du site d\'appel', () => {
  // (a) comportemental — drawShop honore réellement la taille qu'on lui passe.
  const s = startedGame(701);
  const drawn = shopMod.drawShop(s.rng_state, s.pool, 1, SHOP_SIZE + 2);
  assert.equal(drawn.shop.length, SHOP_SIZE + 2, 'drawShop honore son paramètre de taille (il n\'est pas ignoré)');

  // (b) comportemental — la boutique réellement tirée au début du tour fait SHOP_SIZE.
  assert.equal(s.players[SEAT].shop.length, SHOP_SIZE, 'la boutique d\'ouverture fait SHOP_SIZE emplacements');
  const rolled = s.eventLog.filter(e => e.kind === 'ShopRolled' && e.cause === 'RoundStart').pop();
  assert.equal(rolled.shop_content.length, SHOP_SIZE, 'et le ShopRolled du journal en porte autant');

  // (c) statique — le site d'appel passe l'IDENTIFIANT importé, plus un nombre en dur. C'est
  // cette assertion qui échoue si quelqu'un remet un littéral: une constante ESM ne pouvant pas
  // être réécrite à chaud, c'est le seul moyen de prouver le CÂBLAGE et pas seulement la valeur.
  const src = readFileSync(new URL('./round/round.mjs', import.meta.url), 'utf-8')
    .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const call = /shop\.drawShop\(([\s\S]*?)\)\s*;/.exec(src);
  assert.ok(call, 'précondition: l\'appel à drawShop a bien été trouvé dans round/round.mjs');
  const args = call[1].split(',').map(a => a.trim());
  assert.equal(args[args.length - 1], 'SHOP_SIZE', 'round/round.mjs passe SHOP_SIZE, pas un littéral');
  assert.doesNotMatch(call[1], /\b\d+\b/, 'aucun nombre en dur dans les arguments de drawShop');
});

// =============================================================================================
// LE RENDERER AVEUGLE — la Life affichée est celle de l'état, dérivée du SEUL journal
// =============================================================================================

/**
 * Une VRAIE partie, jouée uniquement par des Inputs de la liste fermée (aucun état bricolé à la
 * main : tout ce qui arrive passe donc aussi par le journal, ce que le renderer aveugle exige).
 * Stratégie du robot : acheter le premier emplacement de boutique tant qu'il reste une place de
 * plateau, le poser, confirmer, regarder le combat, tour suivant.
 * @returns {{state, rounds, losses, vmChecks}} l'état final et le compte de ce qui s'est passé
 */
function playRealGame(seed, maxRounds, check) {
  let s = startedGame(seed);
  let rounds = 0;
  let losses = 0;
  while (rounds < maxRounds && s.phase !== 'Elimination') {
    const p = s.players[SEAT];
    if (p.board.length < boardCapacityForLevel(p.level) && p.shop.length > 0) {
      s = prep.applyPreparationInput(s, { kind: 'Buy', seatId: SEAT, unitDefId: p.shop[0], shop_index: 0 });
      const bought = s.players[SEAT].bench[0];
      if (bought) {
        s = prep.applyPreparationInput(s, {
          kind: 'Place', seatId: SEAT, unit_instance_id: bought.unit_instance_id,
          to_zone: 'board', to_index: 32 + s.players[SEAT].board.length
        });
      }
    }
    s = prep.applyPreparationInput(s, { kind: 'ConfirmPreparation', seatId: SEAT });
    const lifeBefore = s.players[SEAT].life;
    s = round.resolveBattle(s, SEAT);
    if (s.players[SEAT].life < lifeBefore) losses += 1;
    if (check) check(s, rounds);
    s = round.startNextRound(s);
    rounds += 1;
  }
  return { state: s, rounds, losses };
}

test('R1/E1: la Life reconstruite par le renderer AVEUGLE (Event Log seul) est celle de l\'état, tour après tour, jusqu\'à la mort', () => {
  // Une partie ENTIÈRE, jouée par des Inputs réels; à chaque tour on compare l'état du moteur à
  // ce que le journal SEUL permet de reconstruire. Si les deux divergent, l'écran ment.
  const { state, rounds, losses } = playRealGame(7, 60, (s, r) => {
    const vm = buildViewModel(s.eventLog);
    assert.equal(vm.life, s.players[SEAT].life,
      `tour ${r}: la Life dérivée du journal (${vm.life}) est celle de l'état (${s.players[SEAT].life})`);
    assert.equal(vm.level, s.players[SEAT].level, 'le niveau dérivé du journal est celui de l\'état');
    assert.equal(vm.gold, s.players[SEAT].gold, 'l\'or dérivé du journal est celui de l\'état');
    assert.equal(vm.board_capacity, boardCapacityForLevel(s.players[SEAT].level),
      'la limite de pose affichée est celle que le moteur applique');
    assert.equal(vm.board_used, s.players[SEAT].board.length, 'le nombre d\'unités posées affiché est le vrai');
    assert.deepEqual(vm.unknown_events, [], 'aucun Event que le pliage n\'a pas su projeter');
  });

  assert.ok(losses > 0, 'témoin: des défaites ont bien eu lieu — le test ne compare pas 30 à 30 pendant 60 tours');
  assert.equal(state.phase, 'Elimination', 'la partie s\'est réellement TERMINÉE — on peut perdre');
  assert.equal(state.players[SEAT].life, LIFE_FLOOR, 'et elle s\'est terminée par une Life à zéro');
  assert.ok(rounds > 1 && rounds < 60, `elle a duré ${rounds} tours — ni instantanée, ni interminable`);
});

test('R1/E1: le journal seul suffit à savoir que la partie est finie, et combien de tours ont été tenus', () => {
  const { state, rounds } = playRealGame(7, 60);
  assert.equal(state.phase, 'Elimination', 'précondition: la partie est bien terminée');

  const vm = buildViewModel(state.eventLog);
  assert.equal(vm.phase, 'Elimination', 'la phase Elimination se lit dans le journal');
  assert.equal(vm.eliminated, true, 'le view model expose la fin de partie');
  assert.equal(vm.life, LIFE_FLOOR, 'et la Life reconstruite est à zéro');
  assert.ok(vm.last_life_damage > 0, 'le journal dit aussi ce que le dernier combat a coûté');
  assert.equal(vm.life_before_last_combat, vm.last_life_damage,
    'le dernier combat a emporté exactement ce qu\'il restait');

  // Le nombre de tours tenus = les ShopRolled{cause:'RoundStart'} du journal (combat_view.mjs #3).
  const scoreFromLog = state.eventLog.filter(e => e.kind === 'ShopRolled' && e.cause === 'RoundStart').length;
  assert.equal(scoreFromLog, rounds, `le score affiché (${scoreFromLog} tours) est celui réellement joué (${rounds})`);
});

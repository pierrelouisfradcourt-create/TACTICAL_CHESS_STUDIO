// logic.test.mjs — economy.mjs (R1-R11) + solvability.mjs (R24-R25).
//
// Discipline d'assertion : égalité STRICTE et frontière EXACTE. Un `>=` dans un
// test (« le solde a au moins augmenté ») passe aussi bien sur une mécanique
// morte que sur une mécanique juste ; chaque seuil est donc éprouvé à sa valeur
// exacte, et chaque refus est vérifié comme un no-op complet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, STRUCTURE, click, applyProduction, buyGenerator, buyUpgrade,
  canAfford, canBuyUpgrade, getCost, isVictory, reset, unlockedGenerators,
  unlockedUpgrades, currentObjective, getThresholdIndex, step,
} from './economy.mjs';
import {
  botDecide, botApply, recordMilestones, solvabilityProof, canReachVictory,
  measureVariance, compareRunAdvantage, PROD_UPGRADES,
} from './solvability.mjs';

const S = STRUCTURE.thresholds; // S1..S5 en milli-R

// Etat où AUCUN générateur n'est abordable : isole les branches « amélioration »
// de botDecide, qui sinon ne sont jamais atteintes (les générateurs passent avant).
function stateNoAffordableGenerator(solde_mR, cumul_mR) {
  const state = createState();
  for (const g of state.generators) g.count = 40; // coût G1 ≈ 1,4 M mR à n=40
  state.solde_mR = solde_mR;
  state.cumul_mR = cumul_mR;
  return state;
}

// ─────────────────────────────────────────────────────────────────────────────
// R1 / R9 — objectif courant
// ─────────────────────────────────────────────────────────────────────────────

test('R1: au tick 0 l\'objectif nomme le prochain seuil (100 R) ET le seuil terminal (1000000 R)', () => {
  const objectif = currentObjective(createState());
  assert.equal(objectif, 'Atteindre 100 R pour débloquer G2 — objectif final 1000000 R');
  assert.ok(objectif.includes('1000000'), 'le seuil terminal doit être cité dès le tick 0');
});

test('R9: l\'objectif change caractère pour caractère à chaque seuil franchi', () => {
  const state = createState();
  const t0 = currentObjective(state);

  state.cumul_mR = S[0];
  const s1 = currentObjective(state);
  assert.notEqual(s1, t0);
  assert.equal(s1, 'Atteindre 1000 R pour débloquer G3 — objectif final 1000000 R');

  state.cumul_mR = S[1];
  const s2 = currentObjective(state);
  assert.notEqual(s2, s1);
  assert.equal(s2, 'Atteindre 12000 R pour débloquer G4 — objectif final 1000000 R');

  state.cumul_mR = S[2];
  assert.equal(currentObjective(state),
    'Atteindre 150000 R pour débloquer les améliorations — objectif final 1000000 R');

  // S4 franchi mais S5 non atteint : l'objectif reste le seuil terminal, PAS la victoire.
  state.cumul_mR = S[3];
  assert.equal(currentObjective(state), 'Atteindre 1000000 R : objectif final');

  state.cumul_mR = S[4];
  assert.equal(currentObjective(state), 'Victoire ! Objectif terminal 1000000 R atteint');
});

test('getThresholdIndex compte les seuils franchis, à la valeur EXACTE du seuil', () => {
  assert.equal(getThresholdIndex(0), 0);
  for (let i = 0; i < S.length; i++) {
    assert.equal(getThresholdIndex(S[i] - 1), i, `un mR sous S${i + 1} : ${i} seuil(s) franchi(s)`);
    assert.equal(getThresholdIndex(S[i]), i + 1, `à S${i + 1} EXACTEMENT : ${i + 1} seuil(s) franchi(s)`);
  }
  assert.equal(getThresholdIndex(S[4] * 2), S.length, 'au-delà du dernier seuil : borné à 5');
});

// ─────────────────────────────────────────────────────────────────────────────
// R2 — clic
// ─────────────────────────────────────────────────────────────────────────────

test('R2: chaque clic crédite EXACTEMENT gain_clic_mR, en entiers', () => {
  const state = createState();
  assert.equal(state.solde_mR, 0);

  click(state);
  assert.equal(state.solde_mR, 1000);
  assert.equal(state.cumul_mR, 1000);

  for (let i = 0; i < 5; i++) click(state);
  assert.equal(state.solde_mR, 6000);
  assert.equal(state.cumul_mR, 6000);
  assert.ok(Number.isInteger(state.solde_mR) && Number.isInteger(state.cumul_mR));
});

// ─────────────────────────────────────────────────────────────────────────────
// R3 / R4 — achat de générateur
// ─────────────────────────────────────────────────────────────────────────────

test('R3: buyGenerator débite EXACTEMENT floor(cout_base * 1.12^n) et rend true', () => {
  for (let gen = 0; gen < 4; gen++) {
    const state = createState();
    let attendu = 0;
    for (let n = 0; n < 3; n++) {
      const cout = Math.floor(STRUCTURE.cost_base[gen] * Math.pow(1.12, n));
      assert.equal(getCost(gen, n), cout, `coût G${gen + 1} au ${n + 1}e exemplaire`);
      state.solde_mR = cout;
      assert.equal(buyGenerator(state, gen), true, 'un achat réussi rend true');
      assert.equal(state.solde_mR, 0, 'débit du coût EXACT, ni plus ni moins');
      assert.equal(state.generators[gen].count, n + 1);
      attendu += cout;
    }
    assert.ok(attendu > 0);
  }
});

test('R4: solde insuffisant => canAfford false, buyGenerator no-op TOTAL et rend false', () => {
  const state = createState();
  const cout = getCost(0, 0);

  state.solde_mR = cout - 1;
  assert.equal(canAfford(state, 0), false);
  const avant = JSON.stringify(state);
  assert.equal(buyGenerator(state, 0), false, 'un achat refusé rend false');
  assert.equal(JSON.stringify(state), avant, 'état strictement inchangé après un refus');

  // Frontière EXACTE : au mR près, l'achat devient possible.
  state.solde_mR = cout;
  assert.equal(canAfford(state, 0), true);
  assert.equal(buyGenerator(state, 0), true);
  assert.equal(state.generators[0].count, 1);
  assert.equal(state.solde_mR, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// R5 / R6 — production passive et divergence de décision
// ─────────────────────────────────────────────────────────────────────────────

test('R5: applyProduction ajoute EXACTEMENT la somme des productions par palier', () => {
  const state = createState();
  state.generators[0].count = 2; // 2 * 10
  state.generators[1].count = 3; // 3 * 100
  state.generators[2].count = 1; // 1 * 800
  state.generators[3].count = 1; // 1 * 4700

  const attendu = 2 * 10 + 3 * 100 + 1 * 800 + 1 * 4700;
  applyProduction(state);
  assert.equal(state.solde_mR, attendu);
  assert.equal(state.cumul_mR, attendu);

  applyProduction(state); // déterministe : même état => même delta
  assert.equal(state.solde_mR, attendu * 2);
});

test('R5b: sans générateur, la production est EXACTEMENT nulle', () => {
  const state = createState();
  applyProduction(state);
  assert.equal(state.solde_mR, 0);
  assert.equal(state.cumul_mR, 0);
});

test('R6: deux politiques seedées sur 300 frames divergent d\'un écart EXACT', () => {
  const repos = createState();
  const actif = createState();
  repos.generators[0].count = 1;
  actif.generators[0].count = 1;

  for (let i = 0; i < 300; i++) step(repos);
  for (let i = 0; i < 300; i++) {
    if (i % 3 === 0) click(actif);
    step(actif);
  }

  assert.equal(repos.solde_mR, 300 * 10);
  assert.equal(actif.solde_mR, 300 * 10 + 100 * 1000);
  assert.equal(actif.solde_mR - repos.solde_mR, 100000, 'écart mesuré, non trivial');
});

// ─────────────────────────────────────────────────────────────────────────────
// R7 — déverrouillage des générateurs
// ─────────────────────────────────────────────────────────────────────────────

test('R7: chaque générateur apparaît EXACTEMENT au franchissement de son seuil', () => {
  const state = createState();
  const attendu = [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3]];

  assert.deepEqual(unlockedGenerators(state), attendu[0]);
  for (let i = 0; i < 3; i++) {
    state.cumul_mR = S[i] - 1;
    assert.deepEqual(unlockedGenerators(state), attendu[i], `un mR sous S${i + 1} : rien de neuf`);
    state.cumul_mR = S[i];
    assert.deepEqual(unlockedGenerators(state), attendu[i + 1], `à S${i + 1} EXACTEMENT : une entrée de plus`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R8 — améliorations
// ─────────────────────────────────────────────────────────────────────────────

test('R8: clic_x2 puis clic_x4 doublent gain_clic_mR, avec débit et retour exacts', () => {
  const state = createState();
  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;

  assert.equal(canBuyUpgrade(state, 'clic_x2'), true, 'solde EXACTEMENT égal au coût suffit');
  assert.equal(buyUpgrade(state, 'clic_x2'), true, 'un achat réussi rend true');
  assert.equal(state.gain_clic_mR, 2000);
  assert.equal(state.solde_mR, 0, 'débit EXACT du coût');

  click(state);
  assert.equal(state.solde_mR, 2000, 'le clic vaut désormais 2000 mR');

  state.solde_mR = STRUCTURE.upgrades.clic_x4.cost;
  assert.equal(buyUpgrade(state, 'clic_x4'), true);
  assert.equal(state.gain_clic_mR, 4000);
});

test('R8b: clic_x4 exige clic_x2 — refusé sinon, quel que soit le solde', () => {
  const state = createState();
  state.solde_mR = STRUCTURE.upgrades.clic_x4.cost * 10;
  assert.equal(canBuyUpgrade(state, 'clic_x4'), false, 'prérequis clic_x2 absent');
  assert.equal(buyUpgrade(state, 'clic_x4'), false, 'un achat refusé rend false');
  assert.equal(state.gain_clic_mR, STRUCTURE.gain_clic_initial, 'aucun effet appliqué');
});

test('R8c: une amélioration déjà possédée est refusée (aucun double effet)', () => {
  const state = createState();
  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  buyUpgrade(state, 'clic_x2');
  assert.equal(state.gain_clic_mR, 2000);

  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  assert.equal(canBuyUpgrade(state, 'clic_x2'), false, 'déjà possédée');
  assert.equal(buyUpgrade(state, 'clic_x2'), false);
  assert.equal(state.gain_clic_mR, 2000, 'gain inchangé');
  assert.equal(state.solde_mR, STRUCTURE.upgrades.clic_x2.cost, 'solde non re-débité');
});

test('R8d: les améliorations de production exigent S4 ET le solde — les deux, à la valeur exacte', () => {
  const cout = STRUCTURE.upgrades.prod_g1_x2.cost;

  const avantS4 = createState();
  avantS4.cumul_mR = S[3] - 1;
  avantS4.solde_mR = cout;
  assert.equal(canBuyUpgrade(avantS4, 'prod_g1_x2'), false, 'un mR sous S4 : refusé');

  const sansSolde = createState();
  sansSolde.cumul_mR = S[3];
  sansSolde.solde_mR = cout - 1;
  assert.equal(canBuyUpgrade(sansSolde, 'prod_g1_x2'), false, 'S4 atteint mais solde insuffisant : refusé');

  const state = createState();
  state.cumul_mR = S[3];
  state.solde_mR = cout;
  assert.equal(canBuyUpgrade(state, 'prod_g1_x2'), true, 'S4 et solde EXACTS : accepté');
  assert.equal(buyUpgrade(state, 'prod_g1_x2'), true);
  assert.equal(state.generators[0].prodMultiplier, 2, 'facteur EXACTEMENT x2');
  assert.equal(state.solde_mR, 0);

  // L'effet est bien celui de la production, pas celui du clic.
  assert.equal(state.gain_clic_mR, STRUCTURE.gain_clic_initial);
  state.generators[0].count = 1;
  applyProduction(state);
  assert.equal(state.solde_mR, 20, 'production doublée : 10 -> 20 mR/tick');
});

test('R8e: clic_x2 reste achetable hors S4 (famille de disponibilité distincte)', () => {
  const state = createState();
  state.cumul_mR = 0;
  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  assert.equal(canBuyUpgrade(state, 'clic_x2'), true);
});

test('R8f: unlockedUpgrades liste EXACTEMENT ce qui est disponible à chaque étape', () => {
  const state = createState();
  assert.deepEqual(unlockedUpgrades(state), ['clic_x2'], 'au départ : seule la famille clic');

  state.cumul_mR = S[3] - 1;
  assert.deepEqual(unlockedUpgrades(state), ['clic_x2'], 'un mR sous S4 : inchangé');

  state.cumul_mR = S[3];
  assert.deepEqual(unlockedUpgrades(state), ['clic_x2', ...PROD_UPGRADES],
    'à S4 EXACTEMENT : la famille production apparaît');

  state.upgrades_owned.add('clic_x2');
  assert.deepEqual(unlockedUpgrades(state), ['clic_x4', ...PROD_UPGRADES],
    'clic_x2 possédée : elle sort de la liste, clic_x4 y entre');
});

// ─────────────────────────────────────────────────────────────────────────────
// R10 / R11 — victoire et reset
// ─────────────────────────────────────────────────────────────────────────────

test('R10: isVictory est calculée depuis l\'état, à la frontière EXACTE de S5', () => {
  const state = createState();
  assert.equal(isVictory(state), false);
  state.cumul_mR = S[4] - 1;
  assert.equal(isVictory(state), false, 'un mR sous S5 : pas de victoire');
  state.cumul_mR = S[4];
  assert.equal(isVictory(state), true, 'à S5 EXACTEMENT : victoire');
});

test('R11: reset ramène EXACTEMENT à l\'état initial, sans report inter-run', () => {
  const state = createState();
  state.solde_mR = S[4];
  state.cumul_mR = S[4];
  state.generators[0].count = 5;
  state.generators[3].prodMultiplier = 2;
  state.gain_clic_mR = 4000;
  state.upgrades_owned.add('clic_x2');
  state.tick = 999;

  reset(state);
  assert.deepEqual(
    { ...state, upgrades_owned: [...state.upgrades_owned] },
    { ...createState(), upgrades_owned: [] },
    'aucun bonus persistant : le nouveau run repart de zéro',
  );
  assert.equal(isVictory(state), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Invariants de comptabilité
// ─────────────────────────────────────────────────────────────────────────────

test('Invariant: solde_mR == Σ(gains) + Σ(production) − Σ(dépenses), en entiers', () => {
  const state = createState();
  let gains = 0;
  let production = 0;
  let depenses = 0;

  for (let i = 0; i < 400; i++) {
    click(state);
    gains += state.gain_clic_mR;

    const avant = state.solde_mR;
    applyProduction(state);
    production += state.solde_mR - avant;

    while (canAfford(state, 0)) {
      depenses += getCost(0, state.generators[0].count);
      buyGenerator(state, 0);
    }
    assert.ok(Number.isInteger(state.solde_mR), 'aucun flottant dans l\'état');
  }

  assert.equal(state.solde_mR, gains + production - depenses);
  assert.equal(state.cumul_mR, gains + production, 'le cumul ignore les dépenses');
  assert.ok(production > 0 && depenses > 0, 'les trois termes sont réellement exercés');
});

// ─────────────────────────────────────────────────────────────────────────────
// R24 — solvabilité : politique du bot, éprouvée à la frontière
// ─────────────────────────────────────────────────────────────────────────────

test('botDecide: achète le générateur déverrouillé le moins cher, au mR près', () => {
  const state = createState();
  state.solde_mR = getCost(0, 0) - 1;
  assert.deepEqual(botDecide(state), { action: 'none' }, 'un mR sous le coût : rien');

  state.solde_mR = getCost(0, 0);
  assert.deepEqual(botDecide(state), { action: 'buy_generator', index: 0 });
});

test('botDecide: un générateur non déverrouillé n\'est jamais choisi, même abordable', () => {
  const state = createState();
  state.generators[0].count = 40;          // G1 hors de portée
  state.upgrades_owned.add('clic_x2');     // ferme le repli « amélioration de clic »
  state.solde_mR = getCost(1, 0);          // G2 exactement abordable
  state.cumul_mR = S[0] - 1;
  assert.deepEqual(botDecide(state), { action: 'none' }, 'un mR sous S1 : G2 reste verrouillé');

  state.cumul_mR = S[0];
  assert.deepEqual(botDecide(state), { action: 'buy_generator', index: 1 }, 'à S1 EXACTEMENT : G2 s\'ouvre');
});

test('botDecide: à S4 exact et solde exact, la production passe avant le clic', () => {
  const cout = STRUCTURE.upgrades.prod_g1_x2.cost;

  const state = stateNoAffordableGenerator(cout, S[3]);
  assert.deepEqual(botDecide(state), { action: 'buy_upgrade', id: 'prod_g1_x2' },
    'S4 et coût atteints EXACTEMENT');

  const sousS4 = stateNoAffordableGenerator(cout, S[3] - 1);
  assert.deepEqual(sousS4.upgrades_owned.has('clic_x2'), false);
  assert.deepEqual(botDecide(sousS4), { action: 'buy_upgrade', id: 'clic_x2' },
    'un mR sous S4 : la famille production reste fermée, repli sur le clic');

  const dejaPossedee = stateNoAffordableGenerator(STRUCTURE.upgrades.prod_g2_x2.cost, S[3]);
  dejaPossedee.upgrades_owned.add('prod_g1_x2');
  assert.deepEqual(botDecide(dejaPossedee), { action: 'buy_upgrade', id: 'prod_g2_x2' },
    'une amélioration possédée est sautée, pas re-achetée');
});

test('botDecide: le repli clic_x2 exige le coût exact ET de ne pas la posséder', () => {
  const cout = STRUCTURE.upgrades.clic_x2.cost;

  assert.deepEqual(botDecide(stateNoAffordableGenerator(cout - 1, 0)), { action: 'none' });
  assert.deepEqual(botDecide(stateNoAffordableGenerator(cout, 0)),
    { action: 'buy_upgrade', id: 'clic_x2' });

  const possedee = stateNoAffordableGenerator(cout * 10, 0);
  possedee.upgrades_owned.add('clic_x2');
  assert.deepEqual(botDecide(possedee), { action: 'none' },
    'déjà possédée : le bot épargne au lieu de re-acheter');
});

test('botApply exécute l\'intention reçue et rend le résultat réel de l\'achat', () => {
  const gen = createState();
  gen.solde_mR = getCost(0, 0);
  assert.equal(botApply(gen, { action: 'buy_generator', index: 0 }), true);
  assert.equal(gen.generators[0].count, 1);
  assert.equal(gen.solde_mR, 0);

  const upg = createState();
  upg.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  assert.equal(botApply(upg, { action: 'buy_upgrade', id: 'clic_x2' }), true);
  assert.equal(upg.gain_clic_mR, 2000);

  const rien = createState();
  rien.solde_mR = 999999;
  assert.equal(botApply(rien, { action: 'none' }), false, '« ne rien faire » ne rend jamais un succès');
  assert.equal(rien.solde_mR, 999999);
  assert.equal(rien.generators[0].count, 0);
});

test('recordMilestones enregistre le PREMIER tick de chaque seuil, au mR près', () => {
  const jalons = [null, null, null, null, null];

  recordMilestones(jalons, { cumul_mR: S[0] - 1 }, 10);
  assert.deepEqual(jalons, [null, null, null, null, null], 'un mR sous S1 : rien');

  recordMilestones(jalons, { cumul_mR: S[0] }, 42);
  assert.deepEqual(jalons, [42, null, null, null, null], 'à S1 EXACTEMENT : S1 seul');

  recordMilestones(jalons, { cumul_mR: S[1] }, 99);
  assert.deepEqual(jalons, [42, 99, null, null, null], 'S1 conserve son premier tick');

  recordMilestones(jalons, { cumul_mR: S[4] }, 500);
  assert.deepEqual(jalons, [42, 99, 500, 500, 500]);
});

test('R24: le bot atteint S5 et le nombre de ticks est EXACT et reproductible', () => {
  const proof = solvabilityProof();
  assert.equal(proof.solveSuccessful, true, 'le bot doit réellement GAGNER');
  assert.equal(proof.ticksToVictory, 47845, 'trajectoire déterministe, au tick près');
  assert.deepEqual(proof.thresholdTicks, [830, 4580, 12089, 27916, 47845]);
  assert.ok(proof.ticksToVictory <= STRUCTURE.budget_ticks_mesure);

  const rejeu = solvabilityProof();
  assert.deepEqual(rejeu, proof, 'aucun aléa : deux exécutions sont identiques');
});

test('R24b: budget insuffisant => la preuve ÉCHOUE (l\'oracle peut rougir)', () => {
  const proof = solvabilityProof(100);
  assert.equal(proof.solveSuccessful, false, 'un statut calculé, jamais un drapeau en dur');
  assert.equal(proof.ticksToVictory, null);
  assert.deepEqual(proof.thresholdTicks, [null, null, null, null, null]);
});

test('R24c: canReachVictory dérive son statut de la preuve, budget compris', () => {
  const ok = canReachVictory();
  assert.equal(ok.canReach, true);
  assert.equal(ok.ticksNeeded, 47845);
  assert.equal(ok.withinBudget, true);

  const pile = canReachVictory(47845);
  assert.equal(pile.withinBudget, true, 'budget EXACTEMENT égal aux ticks nécessaires : dans le budget');

  const trop = canReachVictory(100);
  assert.equal(trop.canReach, false);
  assert.equal(trop.ticksNeeded, null);
  assert.equal(trop.withinBudget, false, 'aucune victoire => jamais « dans le budget »');
});

test('R24d: le temps-jusqu\'à-S5 porte une information variable (règle de variance)', () => {
  const v = measureVariance();
  assert.deepEqual(v.clickPeriods, [5, 6, 7, 8, 9]);
  assert.deepEqual(v.samples, [44432, 45369, 46093, 46686, 47220]);
  assert.equal(v.valeurs_distinctes, 5, 'cinq valeurs distinctes, non triviales');
  assert.equal(v.variance_exists, true);
  assert.ok(v.variance > 0);

  const deux = measureVariance(2);
  assert.equal(deux.valeurs_distinctes, 2);
  assert.equal(deux.variance_exists, true, 'deux valeurs distinctes suffisent — frontière exacte');
});

test('R25: réinvestir domine thésauriser sur un horizon identique, écart EXACT', () => {
  const cmp = compareRunAdvantage();
  assert.equal(cmp.horizon, 3000);
  assert.equal(cmp.naive_cumul_mR, 300000);
  assert.equal(cmp.optimal_cumul_mR, 532310);
  assert.equal(cmp.advantage_delta_mR, 232310);
  assert.equal(cmp.advantage_exists, true);

  // L'écart CROÎT avec l'horizon : c'est l'intérêt composé, pas un bruit de mesure.
  const court = compareRunAdvantage(1000);
  assert.equal(court.advantage_delta_mR, 26830);
  assert.ok(cmp.advantage_delta_mR > court.advantage_delta_mR);
});

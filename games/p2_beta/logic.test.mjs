// Suite unitaire — une assertion STRICTE par exigence de la WireMap.
// Aucun `>=` tautologique : on asserte le comportement exact (== la valeur attendue),
// jamais « au moins ». Un `>=` masquerait une mécanique morte (pré-mortem s10a).
// Lancement : node --test logic.test.mjs

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as Logic from './logic.mjs';
import * as Data from './data.mjs';
import * as Input from './input.mjs';

const G1 = Data.GENERATORS[0];

/** Crédite exactement `amount` sans passer par une mécanique de jeu. */
function seed(state, amount) {
  Logic.accrue(state, amount);
  return state;
}

// --- R1 : premier objectif au lancement -------------------------------------------

test('R1: createState pose l\'objectif initial sur data.GOALS[0]', () => {
  const state = Logic.createState();
  assert.strictEqual(state.resourceCounter, 0);
  assert.strictEqual(state.lifetimeEarned, 0);
  assert.strictEqual(state.elapsedTicks, 0);
  assert.strictEqual(state.currentStage, 0);
  assert.strictEqual(state.currentObjectiveIndex, 0);
  assert.strictEqual(state.prestigeCount, 0);
  assert.strictEqual(Logic.getCurrentGoal(state), Data.GOALS[0]);
});

test('R1: le libellé d\'objectif initial est une chaîne NON VIDE', () => {
  const text = Logic.getCurrentGoalText(Logic.createState());
  assert.strictEqual(typeof text, 'string');
  assert.notStrictEqual(text.length, 0);
});

// --- R2 : clic producteur ---------------------------------------------------------

test('R2: N clics donnent EXACTEMENT N * valueClick, ni plus ni moins', () => {
  const state = Logic.createState();
  for (let n = 1; n <= 5; n++) {
    Logic.applyClick(state);
    assert.strictEqual(state.resourceCounter, n * Data.ECONOMY.valueClick);
  }
});

test('R2: le compteur ne bouge PAS entre deux clics (aucun gain fantôme)', () => {
  const state = Logic.createState();
  Logic.applyClick(state);
  const afterFirst = state.resourceCounter;
  // Un tick complet sans générateur : cps == 0, donc aucun gain.
  Logic.step(state, 1);
  assert.strictEqual(state.resourceCounter, afterFirst);
  assert.strictEqual(Logic.computeCPS(state), 0);
});

test('R2: applyClick retourne le montant réellement crédité', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.applyClick(state), Data.ECONOMY.valueClick);
});

test('R2: input route click_target -> logic.applyClick', () => {
  const state = Logic.createState();
  const gained = Input.handleClickTarget(state);
  assert.strictEqual(gained, Data.ECONOMY.valueClick);
  assert.strictEqual(state.resourceCounter, Data.ECONOMY.valueClick);
});

// --- R4 : récompense persistante --------------------------------------------------

test('R4: accrue est le SEUL écrivain du gain, et refuse un montant non positif', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.accrue(state, 0), 0);
  assert.strictEqual(state.resourceCounter, 0);
  assert.strictEqual(state.lifetimeEarned, 0);

  assert.strictEqual(Logic.accrue(state, -5), 0);
  assert.strictEqual(state.resourceCounter, 0);

  assert.strictEqual(Logic.accrue(state, Number.NaN), 0);
  assert.strictEqual(state.resourceCounter, 0);

  assert.strictEqual(Logic.accrue(state, 7), 7);
  assert.strictEqual(state.resourceCounter, 7);
  assert.strictEqual(state.lifetimeEarned, 7);
});

test('R4: la récompense PERSISTE au frame suivant, sans décroître', () => {
  const state = Logic.createState();
  seed(state, 100);
  const before = state.resourceCounter;
  Logic.step(state, 1);
  Logic.step(state, 1);
  assert.strictEqual(state.resourceCounter, before);
  assert.strictEqual(state.lifetimeEarned, before);
});

// --- R5 : décision d'allocation ---------------------------------------------------

test('R5: deux politiques divergent STRICTEMENT sur 300 frames', () => {
  const idle = Logic.createState();
  const active = Logic.createState();
  for (let i = 0; i < 300; i++) {
    if (i % 3 === 0) Logic.applyClick(active);
    Logic.step(idle, 1);
    Logic.step(active, 1);
  }
  assert.strictEqual(idle.resourceCounter, 0);
  assert.ok(active.resourceCounter > idle.resourceCounter, 'la politique active doit dominer');
  assert.notStrictEqual(active.resourceCounter, idle.resourceCounter);
});

test('R5: acheter change la trajectoire — le revenu passif devient non nul', () => {
  const invested = Logic.createState();
  seed(invested, G1.baseCost);
  assert.strictEqual(Logic.buyGenerator(invested, G1.id), true);
  assert.strictEqual(Logic.computeCPS(invested), G1.yield);

  const hoarded = Logic.createState();
  seed(hoarded, G1.baseCost);
  assert.strictEqual(Logic.computeCPS(hoarded), 0);

  Logic.step(invested, 10);
  Logic.step(hoarded, 10);
  assert.notStrictEqual(invested.lifetimeEarned, hoarded.lifetimeEarned);
});

// --- R6 : déverrouillage générateur ----------------------------------------------

test('R6: le coût suit data (base * multiplicateur^possédés), arrondi au supérieur', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.generatorCost(state, G1.id), G1.baseCost);
  state.generatorCounts[G1.id] = 2;
  assert.strictEqual(
    Logic.generatorCost(state, G1.id),
    Math.ceil(G1.baseCost * Math.pow(Data.ECONOMY.costMultiplier, 2))
  );
  assert.strictEqual(Logic.generatorCost(state, 'inconnu'), null);
});

test('R6: canAfford est vrai AU coût exact, faux un cran en dessous, faux si inconnu', () => {
  const state = Logic.createState();
  seed(state, G1.baseCost - 1);
  assert.strictEqual(Logic.canAfford(state, G1.id), false);
  Logic.accrue(state, 1);
  assert.strictEqual(Logic.canAfford(state, G1.id), true);
  assert.strictEqual(Logic.canAfford(state, 'inconnu'), false);
});

test('R6: buyGenerator débite le coût EXACT et fait passer cps de 0 à >0', () => {
  const state = Logic.createState();
  seed(state, 1000);
  assert.strictEqual(Logic.computeCPS(state), 0);
  assert.strictEqual(Logic.buyGenerator(state, G1.id), true);
  assert.strictEqual(state.resourceCounter, 1000 - G1.baseCost);
  assert.strictEqual(state.generatorCounts[G1.id], 1);
  assert.strictEqual(Logic.computeCPS(state), G1.yield);
});

test('R6: buyGenerator refuse sans les fonds et ne touche à RIEN', () => {
  const state = Logic.createState();
  seed(state, G1.baseCost - 1);
  assert.strictEqual(Logic.buyGenerator(state, G1.id), false);
  assert.strictEqual(state.generatorCounts[G1.id], 0);
  assert.strictEqual(state.resourceCounter, G1.baseCost - 1);
  assert.strictEqual(Logic.buyGenerator(state, 'inconnu'), false);
});

test('R6: input route buy_generator -> logic.buyGenerator', () => {
  const state = Logic.createState();
  seed(state, 1000);
  assert.strictEqual(Input.handleBuyGenerator(state, G1.id), true);
  assert.strictEqual(state.generatorCounts[G1.id], 1);
  assert.strictEqual(Input.handleBuyGenerator(Logic.createState(), G1.id), false);
});

test('R6: computeCPS somme TOUS les générateurs possédés', () => {
  const state = Logic.createState();
  state.generatorCounts[Data.GENERATORS[0].id] = 2;
  state.generatorCounts[Data.GENERATORS[1].id] = 3;
  assert.strictEqual(
    Logic.computeCPS(state),
    2 * Data.GENERATORS[0].yield + 3 * Data.GENERATORS[1].yield
  );
  assert.strictEqual(Logic.totalGenerators(state), 5);
  assert.strictEqual(Logic.generatorTypesOwned(state), 2);
});

test('R6: un compteur de générateur manquant retombe à 0, jamais sur NaN', () => {
  const state = Logic.createState();
  delete state.generatorCounts[G1.id];
  assert.strictEqual(Logic.computeCPS(state), 0);
  assert.strictEqual(Logic.totalGenerators(state), 0);
  assert.strictEqual(Logic.generatorTypesOwned(state), 0);
});

// --- R7 / R8 : objectifs successifs ----------------------------------------------

test('R7: après le PREMIER achat, l\'objectif devient data.GOALS[1], texte distinct', () => {
  const state = Logic.createState();
  const goal0 = Logic.getCurrentGoalText(state);
  // Juste de quoi acheter deux fois G1, sans franchir le seuil de l'objectif #3
  // (lifetime >= 1000) : on isole l'effet de l'ACHAT sur la machine d'objectifs.
  seed(state, 100);
  Logic.buyGenerator(state, G1.id);
  assert.strictEqual(state.currentObjectiveIndex, 1);
  assert.strictEqual(Logic.getCurrentGoal(state), Data.GOALS[1]);
  assert.notStrictEqual(Logic.getCurrentGoalText(state), goal0);
});

test('R8: après le DEUXIÈME achat, l\'objectif devient un TROISIÈME texte distinct', () => {
  const state = Logic.createState();
  const goal0 = Logic.getCurrentGoalText(state);
  seed(state, 100);
  Logic.buyGenerator(state, G1.id);
  const goal1 = Logic.getCurrentGoalText(state);
  Logic.buyGenerator(state, G1.id);
  assert.strictEqual(state.currentObjectiveIndex, 2);
  assert.strictEqual(Logic.getCurrentGoal(state), Data.GOALS[2]);
  const goal2 = Logic.getCurrentGoalText(state);
  assert.strictEqual(new Set([goal0, goal1, goal2]).size, 3);
});

test('R7/R8: advanceObjective avance d\'EXACTEMENT 1 et bute sur le dernier', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.advanceObjective(state), true);
  assert.strictEqual(state.currentObjectiveIndex, 1);
  state.currentObjectiveIndex = Data.GOALS.length - 1;
  assert.strictEqual(Logic.advanceObjective(state), false);
  assert.strictEqual(state.currentObjectiveIndex, Data.GOALS.length - 1);
});

test('objectiveSatisfied: chaque genre de condition est évalué AU seuil, pas avant', () => {
  const state = Logic.createState();

  const owned = { condition: { kind: 'generators_owned', value: 2 } };
  state.generatorCounts[G1.id] = 1;
  assert.strictEqual(Logic.objectiveSatisfied(state, owned), false);
  state.generatorCounts[G1.id] = 2;
  assert.strictEqual(Logic.objectiveSatisfied(state, owned), true);

  const types = { condition: { kind: 'generator_types', value: 2 } };
  assert.strictEqual(Logic.objectiveSatisfied(state, types), false);
  state.generatorCounts[Data.GENERATORS[1].id] = 1;
  assert.strictEqual(Logic.objectiveSatisfied(state, types), true);

  const life = { condition: { kind: 'lifetime', value: 100 } };
  const fresh = Logic.createState();
  seed(fresh, 99);
  assert.strictEqual(Logic.objectiveSatisfied(fresh, life), false);
  Logic.accrue(fresh, 1);
  assert.strictEqual(Logic.objectiveSatisfied(fresh, life), true);

  const gauged = { condition: { kind: 'gauge', value: 1 } };
  assert.strictEqual(Logic.objectiveSatisfied(fresh, gauged), false);
  const won = Logic.createState();
  seed(won, Data.META.victoryTarget);
  assert.strictEqual(Logic.objectiveSatisfied(won, gauged), true);

  assert.strictEqual(Logic.objectiveSatisfied(won, { condition: { kind: 'terminal' } }), false);
  assert.strictEqual(Logic.objectiveSatisfied(won, { condition: { kind: 'inconnu', value: 0 } }), false);
});

test('updateObjective traverse toute la chaîne et ne dépasse jamais le dernier', () => {
  const state = Logic.createState();
  seed(state, Data.META.victoryTarget);
  for (const gen of Data.GENERATORS) state.generatorCounts[gen.id] = 1;
  Logic.updateObjective(state);
  assert.strictEqual(state.currentObjectiveIndex, Data.GOALS.length - 1);
  // Idempotent : un second passage ne déborde pas.
  Logic.updateObjective(state);
  assert.strictEqual(state.currentObjectiveIndex, Data.GOALS.length - 1);
});

// --- R9 / R13 : relance bornée et avantage ----------------------------------------

test('R9: input route prestige_reset -> resourceCounter EXACTEMENT 0', () => {
  const state = Logic.createState();
  seed(state, Data.PRESTIGE.costThreshold);
  assert.ok(state.resourceCounter > 0, 'strictement positif AVANT la relance');
  assert.strictEqual(Input.handlePrestigeReset(state), true);
  assert.strictEqual(state.resourceCounter, 0);
  assert.strictEqual(state.prestigeCount, 1);
});

test('R9: la relance est refusée SOUS le seuil, et l\'état reste intact', () => {
  const state = Logic.createState();
  seed(state, Data.PRESTIGE.costThreshold - 1);
  assert.strictEqual(Logic.prestigeReset(state), false);
  assert.strictEqual(state.resourceCounter, Data.PRESTIGE.costThreshold - 1);
  assert.strictEqual(state.prestigeCount, 0);
});

test('R9: la relance vide les générateurs mais PAS la marche vers la fin', () => {
  const state = Logic.createState();
  seed(state, 100000);
  Logic.buyGenerator(state, G1.id);
  Logic.step(state, 50);
  const lifetimeBefore = state.lifetimeEarned;
  const ticksBefore = state.elapsedTicks;
  const gaugeBefore = Logic.endGauge(state);

  assert.strictEqual(Logic.prestigeReset(state), true);
  assert.strictEqual(state.generatorCounts[G1.id], 0);
  assert.strictEqual(Logic.computeCPS(state), 0);
  assert.strictEqual(state.lifetimeEarned, lifetimeBefore);
  assert.strictEqual(state.elapsedTicks, ticksBefore);
  assert.strictEqual(Logic.endGauge(state), gaugeBefore);
});

test('R9: la relance est bloquée EXACTEMENT à maxPrestigeCount', () => {
  const state = Logic.createState();
  state.prestigeCount = Data.PRESTIGE.maxPrestigeCount - 1;
  seed(state, Data.PRESTIGE.costThreshold);
  assert.strictEqual(Logic.prestigeReset(state), true);
  assert.strictEqual(state.prestigeCount, Data.PRESTIGE.maxPrestigeCount);

  seed(state, Data.PRESTIGE.costThreshold);
  assert.strictEqual(Logic.prestigeReset(state), false);
  assert.strictEqual(state.prestigeCount, Data.PRESTIGE.maxPrestigeCount);
  assert.strictEqual(state.resourceCounter, Data.PRESTIGE.costThreshold);
});

test('R13: le delta par clic post-relance est STRICTEMENT supérieur au delta initial', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.prestigeMultiplier(state), 1);
  const deltaBefore = Logic.applyClick(state);

  seed(state, Data.PRESTIGE.costThreshold);
  assert.strictEqual(Logic.prestigeReset(state), true);

  assert.strictEqual(Logic.prestigeMultiplier(state), Data.PRESTIGE.resetMultiplier);
  const deltaAfter = Logic.applyClick(state);
  assert.ok(deltaAfter > deltaBefore, 'le clic doit rapporter STRICTEMENT plus après relance');
  assert.strictEqual(deltaAfter, deltaBefore * Data.PRESTIGE.resetMultiplier);
});

test('R13: le multiplicateur s\'applique AUSSI au revenu passif', () => {
  const state = Logic.createState();
  state.generatorCounts[G1.id] = 1;
  const cpsBefore = Logic.computeCPS(state);
  state.prestigeCount = 1;
  assert.strictEqual(Logic.computeCPS(state), cpsBefore * Data.PRESTIGE.resetMultiplier);
});

// --- R10 / R11 : jauge de fin et victoire ------------------------------------------

test('R10: endGauge vaut 0 à vide, 1 à la cible, et reste borné à 1 au-delà', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.endGauge(state), 0);
  seed(state, Data.META.victoryTarget);
  assert.strictEqual(Logic.endGauge(state), 1);
  Logic.accrue(state, Data.META.victoryTarget);
  assert.strictEqual(Logic.endGauge(state), 1);
});

test('R10: endGauge est monotone NON DÉCROISSANTE sur toute une partie jouée', () => {
  const state = Logic.createState();
  let previous = Logic.endGauge(state);
  for (let i = 0; i < 2000; i++) {
    if (i % 2 === 0) Logic.applyClick(state);
    if (Logic.canAfford(state, G1.id)) Logic.buyGenerator(state, G1.id);
    Logic.step(state, 1);
    const now = Logic.endGauge(state);
    assert.ok(now >= previous, `jauge décroissante au tick ${i} : ${previous} -> ${now}`);
    previous = now;
  }
});

test('R10: une RELANCE ne fait jamais redescendre la jauge', () => {
  const state = Logic.createState();
  seed(state, 50000);
  const gaugeBefore = Logic.endGauge(state);
  Logic.prestigeReset(state);
  assert.strictEqual(Logic.endGauge(state), gaugeBefore);
  assert.notStrictEqual(gaugeBefore, 0);
});

test('R10: le stage suit les crans de jauge et ne redescend jamais', () => {
  const state = Logic.createState();
  assert.strictEqual(state.currentStage, 0);
  assert.strictEqual(Logic.updateStage(state), 0);

  // Juste SOUS le premier cran : pas de transition.
  const belowFirst = Math.pow(10, Data.STAGE_GATES[0] * Math.log10(1 + Data.META.victoryTarget)) - 1;
  seed(state, belowFirst * 0.99);
  assert.strictEqual(Logic.updateStage(state), 0);

  // AU cran : transition d'exactement un stage.
  seed(state, belowFirst - state.lifetimeEarned);
  assert.strictEqual(Logic.updateStage(state), 1);
  // Re-appeler ne double jamais la transition.
  assert.strictEqual(Logic.updateStage(state), 1);

  seed(state, Data.META.victoryTarget);
  assert.strictEqual(Logic.updateStage(state), Data.STAGE_GATES.length);
});

test('R11: isVictory bascule EXACTEMENT à endGauge == 1, pas avant', () => {
  const state = Logic.createState();
  assert.strictEqual(Logic.isVictory(state), false);
  seed(state, Data.META.victoryTarget - 1);
  assert.strictEqual(Logic.endGauge(state) < 1, true);
  assert.strictEqual(Logic.isVictory(state), false);
  Logic.accrue(state, 1);
  assert.strictEqual(Logic.endGauge(state), 1);
  assert.strictEqual(Logic.isVictory(state), true);
});

// --- R12 : répétition de boucle ----------------------------------------------------

test('R12: step avance le temps d\'EXACTEMENT deltaTime et crédite le cps', () => {
  const state = Logic.createState();
  state.generatorCounts[G1.id] = 1;
  Logic.step(state, 1);
  assert.strictEqual(state.elapsedTicks, 1);
  assert.strictEqual(state.resourceCounter, G1.yield);
  Logic.step(state, 10);
  assert.strictEqual(state.elapsedTicks, 11);
  assert.strictEqual(state.resourceCounter, G1.yield * 11);
});

test('R12: la boucle jouée atteint 100 % dans le budget de ticks', () => {
  const state = Logic.createState();
  while (state.elapsedTicks < Data.META.tickBudget && !Logic.isVictory(state)) {
    let bought = false;
    for (let i = Data.GENERATORS.length - 1; i >= 0; i--) {
      if (Logic.canAfford(state, Data.GENERATORS[i].id)) {
        Logic.buyGenerator(state, Data.GENERATORS[i].id);
        bought = true;
        break;
      }
    }
    if (!bought) Logic.applyClick(state);
    Logic.step(state, 1);
  }
  assert.strictEqual(Logic.isVictory(state), true);
  assert.strictEqual(Logic.endGauge(state), 1);
  assert.ok(state.elapsedTicks <= Data.META.tickBudget, 'fin bornée par le budget de ticks');
});

test('R12: sans jouer, la boucle ne progresse JAMAIS (la jauge n\'est pas un minuteur)', () => {
  const state = Logic.createState();
  for (let i = 0; i < 5000; i++) Logic.step(state, 1);
  assert.strictEqual(state.elapsedTicks, 5000);
  assert.strictEqual(state.lifetimeEarned, 0);
  assert.strictEqual(Logic.endGauge(state), 0);
  assert.strictEqual(Logic.isVictory(state), false);
});

// --- cohérence des données ---------------------------------------------------------

test('data: les descripteurs de configuration sont bien formés', () => {
  assert.strictEqual(Data.GENERATORS.length, 5);
  assert.strictEqual(Data.STAGE_GATES.length, Data.META.numStages - 1);
  assert.strictEqual(Data.ASSETS.stageScenes.length, Data.META.numStages);
  assert.strictEqual(Data.STAGE_TINTS.length, Data.META.numStages);
  assert.strictEqual(Data.STAGE_NAMES.length, Data.META.numStages);
  assert.strictEqual(new Set(Data.GOALS.map((g) => g.text)).size, Data.GOALS.length);
  assert.strictEqual(Data.GOALS[Data.GOALS.length - 1].condition.kind, 'terminal');
  for (const gen of Data.GENERATORS) {
    assert.ok(gen.baseCost > 0 && gen.yield > 0, `${gen.id} doit coûter et produire`);
  }
});

test('input: off retire EXACTEMENT l\'écouteur visé', () => {
  const calls = [];
  const a = () => calls.push('A');
  const b = () => calls.push('B');
  const emitter = Input.signals.onBuyGenerator;
  emitter.on('purchase', a);
  emitter.on('purchase', b);
  emitter.off('purchase', a);
  emitter.emit('purchase');
  emitter.off('purchase', b);
  assert.deepStrictEqual(calls, ['B']);
});

test('input: emit sur un évènement sans écouteur ne lève pas', () => {
  Input.signals.onClickTarget.off('inexistant', () => {});
  assert.doesNotThrow(() => Input.signals.onClickTarget.emit('inexistant'));
});

test('input: setupInputListeners lie les trois gestes au même état', () => {
  const state = Logic.createState();
  const handlers = Input.setupInputListeners(state);
  handlers.clickTarget();
  assert.strictEqual(state.resourceCounter, Data.ECONOMY.valueClick);
  assert.strictEqual(handlers.buyGenerator(G1.id), false);
  assert.strictEqual(handlers.prestigeReset(), false);
  seed(state, Data.PRESTIGE.costThreshold);
  assert.strictEqual(handlers.prestigeReset(), true);
  assert.strictEqual(state.resourceCounter, 0);
});

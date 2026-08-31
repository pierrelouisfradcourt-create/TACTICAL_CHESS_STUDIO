// solvability.mjs — preuve de solvabilité runtime (R24) et divergence de
// politiques (R25). Ne pilote QUE economy (jamais render, jamais input).
//
// Principe de preuve : le statut est CALCULÉ depuis l'état final (isVictory),
// jamais un littéral. La politique du bot est une fonction PURE et exportée
// (`botDecide`) : chaque arbitrage — abordabilité, déverrouillage, priorité —
// est donc observable à la frontière EXACTE, et pas seulement à travers une
// trajectoire agrégée.
import {
  createState, STRUCTURE, click, step, buyGenerator, buyUpgrade, isVictory,
  canAfford,
} from './economy.mjs';

// Améliorations de production, dans l'ordre de priorité du bot (disponibles à S4).
export const PROD_UPGRADES = ['prod_g1_x2', 'prod_g2_x2', 'prod_g3_x2', 'prod_g4_x2'];

// Seuil de déverrouillage du générateur d'index `gen` (G1 est toujours ouvert).
function unlockThreshold(gen) {
  return STRUCTURE.thresholds[gen - 1];
}

/**
 * Politique du bot — PURE : ne mute rien, rend l'intention pour cet état.
 * Priorité : générateur déverrouillé le moins cher > amélioration de production
 * (à partir de S4) > amélioration de clic. `{ action: 'none' }` = épargne.
 */
export function botDecide(state) {
  for (let gen = 0; gen < 4; gen++) {
    if (!canAfford(state, gen)) continue;
    if (gen > 0 && state.cumul_mR < unlockThreshold(gen)) continue;
    return { action: 'buy_generator', index: gen };
  }

  if (state.cumul_mR >= STRUCTURE.thresholds[3]) {
    for (const upgradeId of PROD_UPGRADES) {
      if (state.upgrades_owned.has(upgradeId)) continue;
      if (state.solde_mR >= STRUCTURE.upgrades[upgradeId].cost) {
        return { action: 'buy_upgrade', id: upgradeId };
      }
    }
  }

  if (!state.upgrades_owned.has('clic_x2')
      && state.solde_mR >= STRUCTURE.upgrades.clic_x2.cost) {
    return { action: 'buy_upgrade', id: 'clic_x2' };
  }

  return { action: 'none' };
}

/** Exécute une intention de `botDecide`. Rend `true` si l'achat a eu lieu. */
export function botApply(state, decision) {
  if (decision.action === 'buy_generator') return buyGenerator(state, decision.index);
  if (decision.action === 'buy_upgrade') return buyUpgrade(state, decision.id);
  return false;
}

/**
 * Premier tick où chaque seuil S1..S5 est franchi (null = pas encore franchi).
 * Exporté pour être éprouvé à la frontière EXACTE d'un seuil : à travers une
 * trajectoire seule, un décalage d'un mR resterait invisible.
 */
export function recordMilestones(milestones, state, elapsed) {
  for (let i = 0; i < STRUCTURE.thresholds.length; i++) {
    if (milestones[i] === null && state.cumul_mR >= STRUCTURE.thresholds[i]) {
      milestones[i] = elapsed;
    }
  }
}

/**
 * R24 — un bot scripté joue réellement et doit GAGNER dans le budget.
 *
 * `budgetTicks` est un PARAMÈTRE (défaut : le budget du charter) : sans lui,
 * l'issue négative n'était atteignable par aucun test et `solveSuccessful`
 * ne pouvait qu'être vrai — un oracle qui ne peut pas échouer ne mesure rien.
 *
 * `clickPeriod` : le bot clique un tick sur N (politique de jeu actif).
 */
export function solvabilityProof(budgetTicks = STRUCTURE.budget_ticks_mesure,
                                 clickPeriod = 10) {
  const state = createState();
  const metrics = {
    ticksToVictory: null,
    // thresholdTicks[4] coïncide par construction avec ticksToVictory (S5 EST la
    // condition de victoire) : ce n'est pas une seconde mesure, c'est la même.
    thresholdTicks: [null, null, null, null, null],
    solveSuccessful: false,
    strategy: 'greedy-buy-cheapest',
    budgetTicks,
    clickPeriod,
  };

  const startTick = state.tick;
  while (!isVictory(state) && state.tick - startTick < budgetTicks) {
    recordMilestones(metrics.thresholdTicks, state, state.tick - startTick);
    botApply(state, botDecide(state));
    step(state);
    if (state.tick % clickPeriod === 0) click(state);
  }
  recordMilestones(metrics.thresholdTicks, state, state.tick - startTick);

  if (isVictory(state)) {
    metrics.ticksToVictory = state.tick - startTick;
    metrics.solveSuccessful = true;
  }

  return metrics;
}

/**
 * R25 — divergence de politiques sur un horizon IDENTIQUE : une politique qui
 * réinvestit (botDecide) contre une politique qui clique sans jamais acheter.
 *
 * Une seule variable change entre les deux runs : le RÉINVESTISSEMENT. Les deux
 * politiques cliquent au même rythme ; seule l'optimale achète. Comparer un
 * clic-à-chaque-tick à un bot qui clique 1 tick sur 10 mesurerait le rythme de
 * clic, pas la décision d'investir.
 *
 * Honnêteté du périmètre : ceci mesure une divergence INTRA-run entre deux
 * politiques, PAS un avantage de rejeu inter-run (le charter interdit toute
 * méta-progression persistante — aucun report d'un run au suivant n'existe et
 * aucun n'est donc mesuré ici).
 */
export function compareRunAdvantage(horizon = 3000, clickPeriod = 10) {
  const naive = createState();
  const optimal = createState();

  for (let i = 0; i < horizon; i++) {
    step(naive);            // thésaurise : clique, n'achète jamais, aucun intérêt composé
    if (naive.tick % clickPeriod === 0) click(naive);
  }

  for (let i = 0; i < horizon; i++) {
    botApply(optimal, botDecide(optimal));
    step(optimal);
    if (optimal.tick % clickPeriod === 0) click(optimal);
  }

  return {
    horizon,
    naive_cumul_mR: naive.cumul_mR,
    optimal_cumul_mR: optimal.cumul_mR,
    advantage_delta_mR: optimal.cumul_mR - naive.cumul_mR,
    advantage_exists: optimal.cumul_mR > naive.cumul_mR,
  };
}

/**
 * Variance des métriques (règle de variance ratifiée) : le temps-jusqu'à-S5 est
 * mesuré sur plusieurs politiques de clic distinctes. Une métrique à variance
 * nulle validerait le moteur sans mesurer ce que son nom promet.
 */
export function measureVariance(runs = 5) {
  const samples = [];
  const periods = [];

  for (let run = 0; run < runs; run++) {
    const clickPeriod = 5 + (run % 5);
    const proof = solvabilityProof(STRUCTURE.budget_ticks_mesure, clickPeriod);
    periods.push(clickPeriod);
    if (proof.solveSuccessful) samples.push(proof.ticksToVictory);
  }

  const mean = samples.length > 0
    ? samples.reduce((a, b) => a + b, 0) / samples.length
    : null;
  const variance = samples.length > 0
    ? samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / samples.length
    : null;
  const distinctes = new Set(samples).size;

  return {
    clickPeriods: periods,
    samples,
    mean,
    variance,
    valeurs_distinctes: distinctes,
    variance_exists: distinctes >= 2,
  };
}

/** Statut de solvabilité DÉRIVÉ de la preuve — jamais un drapeau en dur. */
export function canReachVictory(budgetTicks = STRUCTURE.budget_ticks_mesure) {
  const proof = solvabilityProof(budgetTicks);
  return {
    canReach: proof.solveSuccessful === true,
    ticksNeeded: proof.ticksToVictory,
    budgetTicks,
    withinBudget: proof.ticksToVictory !== null && proof.ticksToVictory <= budgetTicks,
  };
}

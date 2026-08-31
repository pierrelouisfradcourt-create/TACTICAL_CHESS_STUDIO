// logic — simulation PURE, déterministe, headless. N'importe que `data`
// (blueprint.deps_interdites : logic -/-> render, logic -/-> input, logic -/-> main).
// Surface de solvabilité pilotable sans DOM : tout ce que le bot de `solvability.mjs`
// et l'e2e observent passe par ces fonctions.

import * as Data from './data.mjs';

// --- état -------------------------------------------------------------------------

export function createState() {
  return {
    // ressources DISPONIBLES (dépensables) — débitées par les achats
    resourceCounter: 0,
    // total RÉCOLTÉ SUR LA VIE — jamais débité, jamais remis à zéro par une relance.
    // C'est lui qui porte la jauge de fin, ce qui la rend monotone par construction.
    lifetimeEarned: 0,
    elapsedTicks: 0,
    currentStage: 0,
    currentObjectiveIndex: 0,
    generatorCounts: Object.fromEntries(Data.GENERATORS.map((g) => [g.id, 0])),
    prestigeCount: 0,
  };
}

// --- récompense ------------------------------------------------------------------

/**
 * SEUL écrivain d'un gain de ressource dans tout le moteur : aucune autre fonction
 * n'incrémente `resourceCounter` ni `lifetimeEarned` (les achats ne font que DÉBITER
 * `resourceCounter`). Un gain non positif n'écrit rien — pas de récompense fantôme.
 * @returns {number} le montant réellement crédité (0 si refusé)
 */
export function accrue(state, amount) {
  // Garde écrite en « strictement positif » plutôt qu'en `amount <= 0` : les deux
  // formes sont équivalentes, mais la seconde crée une borne INERTE en amount === 0
  // (créditer zéro est l'identité, donc indistinguable d'un refus). Autant ne pas
  // laisser dans le code un point de décision qu'aucune entrée ne peut départager.
  if (!Number.isFinite(amount) || !(amount > 0)) return 0;
  state.resourceCounter += amount;
  state.lifetimeEarned += amount;
  return amount;
}

// --- méta-boucle ------------------------------------------------------------------

/** Multiplicateur permanent gagné par les relances, lu par `applyClick`. */
export function prestigeMultiplier(state) {
  return Math.pow(Data.PRESTIGE.resetMultiplier, state.prestigeCount);
}

/** Valeur d'UN clic dans l'état courant (base x multiplicateur de prestige). */
export function clickValue(state) {
  return Data.ECONOMY.valueClick * prestigeMultiplier(state);
}

/**
 * Relance bornée. Échange l'économie courante contre le multiplicateur de clic.
 * `lifetimeEarned` / `elapsedTicks` / le stage NE sont PAS repris : la marche vers la
 * fin est monotone (R10), une relance ne remonte jamais le temps.
 */
export function prestigeReset(state) {
  if (state.prestigeCount >= Data.PRESTIGE.maxPrestigeCount) return false;
  if (state.resourceCounter < Data.PRESTIGE.costThreshold) return false;

  state.resourceCounter = 0;
  state.generatorCounts = Object.fromEntries(Data.GENERATORS.map((g) => [g.id, 0]));
  state.prestigeCount += 1;
  return true;
}

// --- entrée joueur ----------------------------------------------------------------

/** Un clic producteur. Seul gain possible tant qu'aucun générateur n'est acheté. */
export function applyClick(state) {
  const gained = accrue(state, clickValue(state));
  syncProgress(state);
  return gained;
}

// --- économie des générateurs -----------------------------------------------------

export function generatorCost(state, generatorId) {
  const generator = Data.GENERATORS.find((g) => g.id === generatorId);
  if (!generator) return null;
  const owned = state.generatorCounts[generatorId] || 0;
  return Math.ceil(generator.baseCost * Math.pow(Data.ECONOMY.costMultiplier, owned));
}

export function canAfford(state, generatorId) {
  const cost = generatorCost(state, generatorId);
  return cost !== null && state.resourceCounter >= cost;
}

export function buyGenerator(state, generatorId) {
  const cost = generatorCost(state, generatorId);
  if (cost === null) return false;
  if (state.resourceCounter < cost) return false;

  state.resourceCounter -= cost;
  state.generatorCounts[generatorId] += 1;
  syncProgress(state);
  return true;
}

/** Revenu passif par tick, multiplicateur de prestige inclus. */
export function computeCPS(state) {
  let total = 0;
  for (const gen of Data.GENERATORS) {
    total += (state.generatorCounts[gen.id] || 0) * gen.yield;
  }
  return total * prestigeMultiplier(state);
}

export function totalGenerators(state) {
  return Data.GENERATORS.reduce((n, g) => n + (state.generatorCounts[g.id] || 0), 0);
}

export function generatorTypesOwned(state) {
  return Data.GENERATORS.filter((g) => (state.generatorCounts[g.id] || 0) > 0).length;
}

// --- jauge de fin, stages, victoire -----------------------------------------------

/**
 * Fraction de progression vers la fin, dans [0, 1]. Échelle logarithmique du total
 * récolté : monotone NON DÉCROISSANTE par construction (`lifetimeEarned` ne décroît
 * jamais et log est croissante), y compris à travers une relance.
 * Un joueur inactif récolte 0 => jauge 0 => il ne gagne pas en attendant.
 */
export function endGauge(state) {
  const ratio =
    Math.log10(1 + state.lifetimeEarned) / Math.log10(1 + Data.META.victoryTarget);
  return Math.max(0, Math.min(1, ratio));
}

export function isVictory(state) {
  return endGauge(state) >= 1;
}

/** Le stage suit les crans de jauge et ne redescend jamais. */
export function updateStage(state) {
  const gauge = endGauge(state);
  let reached = 0;
  for (const gate of Data.STAGE_GATES) {
    if (gauge >= gate) reached += 1;
  }
  if (reached > state.currentStage) state.currentStage = reached;
  return state.currentStage;
}

// --- machine d'objectifs ----------------------------------------------------------

/** Interprète le descripteur structuré de `data.GOALS[].condition`. */
export function objectiveSatisfied(state, goal) {
  const { kind, value } = goal.condition;
  if (kind === 'generators_owned') return totalGenerators(state) >= value;
  if (kind === 'generator_types') return generatorTypesOwned(state) >= value;
  if (kind === 'lifetime') return state.lifetimeEarned >= value;
  if (kind === 'gauge') return endGauge(state) >= value;
  return false; // 'terminal' : le dernier objectif ne se dépasse pas
}

export function advanceObjective(state) {
  if (state.currentObjectiveIndex >= Data.GOALS.length - 1) return false;
  state.currentObjectiveIndex += 1;
  return true;
}

export function getCurrentGoal(state) {
  return Data.GOALS[state.currentObjectiveIndex];
}

/** Texte affiché de l'objectif courant (lu par `render`). */
export function getCurrentGoalText(state) {
  return getCurrentGoal(state).text;
}

export function updateObjective(state) {
  while (objectiveSatisfied(state, getCurrentGoal(state))) {
    if (!advanceObjective(state)) break;
  }
  return state.currentObjectiveIndex;
}

/** Dérivés monotones recalculés après toute écriture d'état. */
export function syncProgress(state) {
  updateStage(state);
  updateObjective(state);
}

// --- boucle -----------------------------------------------------------------------

export function step(state, deltaTime = 1) {
  accrue(state, computeCPS(state) * deltaTime);
  state.elapsedTicks += deltaTime;
  syncProgress(state);
  return state;
}

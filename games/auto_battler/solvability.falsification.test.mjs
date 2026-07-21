// solvability.falsification.test.mjs — R9 (Forge V2 §4-A) preuve de FALSIFIABILITÉ des 5 volets.
//
// Un oracle de solvabilité qui ne peut JAMAIS rougir ne prouve rien (doctrine du studio,
// mémoire forge_experiment_cycle : "toujours une sonde-contrôle"). Ce fichier prouve que chacun
// des 5 checkXxx exportés par solvability.mjs PEUT rougir, en lui injectant des métriques
// FABRIQUÉES (jamais en modifiant le jeu — les 5 checks sont des fonctions PURES sur des
// métriques déjà mesurées, précisément pour rendre cette falsification possible sans toucher à
// engine/preparation/combat/round). Chaque test de falsification est accompagné d'un test-témoin
// (métrique saine) qui prouve que le MÊME check reste VERT quand rien n'est cassé — sinon un
// check qui rougit toujours ne prouverait rien non plus.
//
// Exemples cités par le contrat, vérifiés ici mot pour mot :
//   - "or initial = 0"        -> volet 3 (Ressources disponibles) FAIL
//   - "tick_limit contourné"  -> volet 4 (Simulation terminable) FAIL

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  checkPlayableLoop,
  checkVictoryReachable,
  checkResourcesAvailable,
  checkSimulationTerminates,
  checkCoreMechanicsActivate,
  TICK_LIMIT,
  ROUND_LIMIT
} from './solvability.mjs';

/** Une métrique de seed SAINE, fabriquée (pas de partie réelle) — le témoin vert. */
function healthyMetric(seed = 999) {
  return {
    seed,
    round1Gold: 3,
    round1CheapestShopCost: 1,
    roundsPlayed: 5,
    combats: [{ round: 0, ticksElapsed: 10, resolutionKind: 'elimination', playerWon: true }],
    eventCounts: { UnitBought: 2, UnitPlaced: 2, Attack: 5, Damage: 5, Death: 1 },
    wonAnyCombat: true,
    terminatedBy: 'elimination',
    illegalState: null,
    crash: null
  };
}

test('témoin sain : les 5 volets sont VERTS sur une métrique saine fabriquée', () => {
  const m = [healthyMetric()];
  assert.equal(checkPlayableLoop(m).passed, true);
  assert.equal(checkVictoryReachable(m).passed, true);
  assert.equal(checkResourcesAvailable(m).passed, true);
  assert.equal(checkSimulationTerminates(m).passed, true);
  assert.equal(checkCoreMechanicsActivate(m).passed, true);
});

// --- Volet 1 — Boucle jouable ------------------------------------------------------------------

test('falsification volet 1 (boucle jouable) : un illegalState fabriqué fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), illegalState: "round 3: état attendu 'Preparation', obtenu 'Battle' (fixture)" }];
  const res = checkPlayableLoop(m);
  assert.equal(res.passed, false);
  assert.equal(res.failures.length, 1);
  assert.match(res.failures[0], /seed=999/);
});

test('falsification volet 1 bis : un crash fabriqué fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), crash: 'TypeError: fixture — accès à une propriété de undefined' }];
  const res = checkPlayableLoop(m);
  assert.equal(res.passed, false);
  assert.match(res.failures[0], /crash/);
});

// --- Volet 2 — Victoire atteignable --------------------------------------------------------------

test('falsification volet 2 (victoire atteignable) : aucune seed gagnante fabriquée fait ROUGIR le check', () => {
  const m = [
    { ...healthyMetric(1), wonAnyCombat: false },
    { ...healthyMetric(2), wonAnyCombat: false }
  ];
  const res = checkVictoryReachable(m);
  assert.equal(res.passed, false);
  assert.equal(res.failures.length, 1);
});

test('témoin volet 2 : UNE SEULE seed gagnante sur plusieurs suffit à rester VERT', () => {
  const m = [
    { ...healthyMetric(1), wonAnyCombat: false },
    { ...healthyMetric(2), wonAnyCombat: true }
  ];
  assert.equal(checkVictoryReachable(m).passed, true);
});

// --- Volet 3 — Ressources disponibles (la panne historique exacte) -----------------------------

test('falsification volet 3 (ressources disponibles) : or initial round 1 = 0 fait ROUGIR le check (la panne historique)', () => {
  const m = [{ ...healthyMetric(), round1Gold: 0 }];
  const res = checkResourcesAvailable(m);
  assert.equal(res.passed, false);
  assert.match(res.failures[0], /or initial round 1 = 0/);
});

test('falsification volet 3 bis : Shop round 1 vide fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), round1CheapestShopCost: null }];
  const res = checkResourcesAvailable(m);
  assert.equal(res.passed, false);
  assert.match(res.failures[0], /Shop round 1 vide/);
});

test('falsification volet 3 ter : le moins cher de la Shop coûte plus que l\'or dispo fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), round1Gold: 1, round1CheapestShopCost: 3 }];
  const res = checkResourcesAvailable(m);
  assert.equal(res.passed, false);
  assert.match(res.failures[0], /coûte 3, or disponible 1/);
});

// --- Volet 4 — Simulation terminable (tick_limit / round_limit contournés) ---------------------

test('falsification volet 4 (simulation terminable) : un combat fabriqué dépassant tick_limit fait ROUGIR le check', () => {
  const m = [{
    ...healthyMetric(),
    combats: [{ round: 0, ticksElapsed: TICK_LIMIT + 1, resolutionKind: 'tick_limit', playerWon: false }]
  }];
  const res = checkSimulationTerminates(m);
  assert.equal(res.passed, false);
  assert.match(res.failures[0], /dépassé tick_limit/);
});

test('falsification volet 4 bis : round_limit dépassé sans terminaison fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), roundsPlayed: ROUND_LIMIT + 1, terminatedBy: null }];
  const res = checkSimulationTerminates(m);
  assert.equal(res.passed, false);
  assert.match(res.failures[0], /dépassé round_limit/);
});

test('témoin volet 4 : un combat exactement à tick_limit reste VERT (limite inclusive)', () => {
  const m = [{ ...healthyMetric(), combats: [{ round: 0, ticksElapsed: TICK_LIMIT, resolutionKind: 'tick_limit', playerWon: false }] }];
  assert.equal(checkSimulationTerminates(m).passed, true);
});

// --- Volet 5 — Mécaniques centrales activables --------------------------------------------------

test('falsification volet 5 (mécaniques centrales) : une mécanique jamais déclenchée (Death=0 partout) fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), eventCounts: { UnitBought: 2, UnitPlaced: 2, Attack: 5, Damage: 5, Death: 0 } }];
  const res = checkCoreMechanicsActivate(m);
  assert.equal(res.passed, false);
  assert.ok(res.failures.some(f => f.includes('Death')));
});

test('falsification volet 5 bis : achat jamais déclenché (UnitBought=0 partout) fait ROUGIR le check', () => {
  const m = [{ ...healthyMetric(), eventCounts: { UnitBought: 0, UnitPlaced: 2, Attack: 5, Damage: 5, Death: 1 } }];
  const res = checkCoreMechanicsActivate(m);
  assert.equal(res.passed, false);
  assert.ok(res.failures.some(f => f.includes('UnitBought')));
});

test('témoin volet 5 : une mécanique déclenchée sur UNE SEULE seed (les autres à 0) suffit à rester VERT (compteur cumulé)', () => {
  const m = [
    { ...healthyMetric(1), eventCounts: { UnitBought: 0, UnitPlaced: 0, Attack: 0, Damage: 0, Death: 0 } },
    { ...healthyMetric(2), eventCounts: { UnitBought: 1, UnitPlaced: 1, Attack: 1, Damage: 1, Death: 1 } }
  ];
  assert.equal(checkCoreMechanicsActivate(m).passed, true);
});

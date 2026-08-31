// solvability — ORACLE DE SOLVABILITÉ. Un bot JOUE et doit GAGNER réellement.
// Les mécaniques testées en isolation ne suffisent pas : un jeu aux objectifs
// inatteignables passe tous les tests unitaires en restant injouable (pré-mortem
// s10a-oracle-code). Ce volet mesure l'enveloppe d'action réelle du moteur.
//
// Il vérifie TROIS choses, pas une :
//   1) le bot qui joue atteint end_gauge = 100 % dans le budget de ticks ;
//   2) le bot INACTIF ne gagne PAS — sinon la jauge se remplirait toute seule et
//      la décision d'allocation (R5) ne porterait à aucune conséquence ;
//   3) le bot qui clique SANS JAMAIS ACHETER ne gagne pas non plus — sinon
//      l'économie des générateurs serait une mécanique morte.
// Un « le bot gagne » isolé serait vert sur un jeu qui se gagne en attendant.

import { pathToFileURL } from 'node:url';
import * as Logic from './logic.mjs';
import * as Data from './data.mjs';

const TICK_BUDGET = Data.META.tickBudget;

/** Politique JOUANTE : achète le meilleur générateur payable, clique sinon. */
export function playPolicy(maxTicks = TICK_BUDGET) {
  const state = Logic.createState();
  const checkpoints = [];

  while (state.elapsedTicks < maxTicks && !Logic.isVictory(state)) {
    let bought = false;
    for (let i = Data.GENERATORS.length - 1; i >= 0; i--) {
      const id = Data.GENERATORS[i].id;
      if (Logic.canAfford(state, id)) {
        Logic.buyGenerator(state, id);
        bought = true;
        break;
      }
    }
    if (!bought) Logic.applyClick(state);
    Logic.step(state, 1);

    if (state.elapsedTicks % 1000 === 0) {
      checkpoints.push({
        tick: state.elapsedTicks,
        gauge: Number(Logic.endGauge(state).toFixed(4)),
        stage: state.currentStage,
        objective: state.currentObjectiveIndex,
      });
    }
  }
  return { state, checkpoints };
}

/** Politique INACTIVE : n'agit jamais, laisse le temps passer. */
export function idlePolicy(maxTicks = TICK_BUDGET) {
  const state = Logic.createState();
  while (state.elapsedTicks < maxTicks && !Logic.isVictory(state)) {
    Logic.step(state, 1);
  }
  return state;
}

/** Politique CLIC SEUL : clique à chaque tick, n'achète jamais de générateur. */
export function clickOnlyPolicy(maxTicks = TICK_BUDGET) {
  const state = Logic.createState();
  while (state.elapsedTicks < maxTicks && !Logic.isVictory(state)) {
    Logic.applyClick(state);
    Logic.step(state, 1);
  }
  return state;
}

export function runSolvabilityTest() {
  const failures = [];

  // 1) Le bot qui joue doit GAGNER dans le budget.
  const { state: played, checkpoints } = playPolicy();
  const playedGauge = Logic.endGauge(played);
  if (!Logic.isVictory(played)) {
    failures.push(
      `le bot joueur n'a PAS gagné : jauge ${(playedGauge * 100).toFixed(1)}% ` +
        `après ${played.elapsedTicks}/${TICK_BUDGET} ticks`
    );
  }
  if (played.elapsedTicks > TICK_BUDGET) {
    failures.push(`fin non bornée : ${played.elapsedTicks} ticks > budget ${TICK_BUDGET}`);
  }

  // 2) Le bot inactif ne doit PAS gagner (la jauge ne se remplit pas toute seule).
  const idle = idlePolicy();
  const idleGauge = Logic.endGauge(idle);
  if (Logic.isVictory(idle)) {
    failures.push(
      `le bot INACTIF gagne (jauge ${(idleGauge * 100).toFixed(1)}%) — la fin ` +
        `s'atteint sans jouer, la décision du joueur ne porte à rien`
    );
  }

  // 3) Le bot qui clique sans acheter ne doit PAS gagner (l'économie compte).
  const clickOnly = clickOnlyPolicy();
  const clickOnlyGauge = Logic.endGauge(clickOnly);
  if (Logic.isVictory(clickOnly)) {
    failures.push(
      `le bot CLIC-SEUL gagne (jauge ${(clickOnlyGauge * 100).toFixed(1)}%) — ` +
        `acheter des générateurs ne change pas l'issue, l'économie est morte`
    );
  }

  // 4) Les trois politiques doivent DIVERGER (preuve de variance de la mesure).
  const distinct = new Set([
    playedGauge.toFixed(6),
    idleGauge.toFixed(6),
    clickOnlyGauge.toFixed(6),
  ]);
  if (distinct.size < 3) {
    failures.push(
      `les 3 politiques rendent ${distinct.size} valeur(s) de jauge distincte(s) — ` +
        `la jauge ne discrimine pas les comportements`
    );
  }

  const report = {
    playedGauge: playedGauge.toFixed(4),
    playedTicks: played.elapsedTicks,
    playedLifetime: played.lifetimeEarned.toExponential(3),
    idleGauge: idleGauge.toFixed(4),
    clickOnlyGauge: clickOnlyGauge.toFixed(4),
    tickBudget: TICK_BUDGET,
    checkpoints: checkpoints.length,
    failures,
  };

  if (failures.length > 0) {
    throw new Error(`SOLVABILITÉ FAIL:\n  - ${failures.join('\n  - ')}`);
  }

  console.log('--- ORACLE DE SOLVABILITÉ ---');
  console.log(`bot joueur    : jauge ${(playedGauge * 100).toFixed(1)}% en ${played.elapsedTicks}/${TICK_BUDGET} ticks — GAGNE`);
  console.log(`bot inactif   : jauge ${(idleGauge * 100).toFixed(1)}% — ne gagne pas`);
  console.log(`bot clic-seul : jauge ${(clickOnlyGauge * 100).toFixed(1)}% — ne gagne pas`);
  console.log(`total récolté par le gagnant : ${played.lifetimeEarned.toExponential(3)}`);
  console.log(`checkpoints enregistrés : ${checkpoints.length}`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runSolvabilityTest();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export default { runSolvabilityTest, playPolicy, idlePolicy, clickOnlyPolicy };

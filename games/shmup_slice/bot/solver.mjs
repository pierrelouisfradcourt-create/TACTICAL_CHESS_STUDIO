// Deterministic bot that plays the game via the PUBLIC API (createInitialState +
// step) — never forces state (AI-5). Used by solvability.mjs to prove the game is
// actually winnable, not just that its mechanics work in isolation.
//
// Policy: dodge FIRST (via logic/dodge.mjs — the same function that proves
// esquivability), pursue the boss/enemy centroid when safe, fire continuously.

import { createInitialState, SHIP_WIDTH } from '../logic/state.mjs';
import { step } from '../logic/step.mjs';
import { hasSafeCorridor, findSafeX, isSafeAt } from '../logic/dodge.mjs';
import { createRng } from '../logic/rng.mjs';

const DT = 0.016; // 16ms/frame — même pas que le jeu réel
const MAX_STEPS = 300000; // large marge (~80 minutes de simulation)

function computeBotInputs(state) {
  const shipCenterX = state.ship.x + SHIP_WIDTH / 2;
  let targetX;

  if (!isSafeAt(state, shipCenterX)) {
    // Danger réel à la position courante : priorité absolue à l'esquive.
    targetX = findSafeX(state);
    if (targetX === null) targetX = shipCenterX; // aucun couloir (ne devrait pas arriver)
  } else if (state.bossActive && state.boss) {
    targetX = state.boss.x + (state.boss.width || 0) / 2;
  } else if (state.enemies.length > 0) {
    const sumX = state.enemies.reduce((s, e) => s + e.x, 0);
    targetX = sumX / state.enemies.length + 15; // +15 ≈ centre visuel de l'ennemi
  } else {
    targetX = shipCenterX;
  }

  const input = { left: false, right: false, fire: true };
  if (targetX < shipCenterX - 6) input.left = true;
  else if (targetX > shipCenterX + 6) input.right = true;
  return input;
}

// Joue une partie complète (3 maps + 3 boss) avec la seed donnée. Retourne le
// résultat ET la trace d'esquivabilité (R23) observée pendant CETTE partie —
// aucune frame ne doit avoir été sans couloir sûr tant qu'un tir menaçait.
export function runBot(seed = 1) {
  const state = createInitialState();
  const rng = createRng(seed);

  let steps = 0;
  let corridorViolations = 0;
  let framesWithThreat = 0;

  while (steps < MAX_STEPS && (state.status === 'ACTIVE' || state.status === 'BOSS')) {
    if (state.enemyProjectiles.length > 0) {
      framesWithThreat++;
      if (!hasSafeCorridor(state)) corridorViolations++;
    }
    const inputs = computeBotInputs(state);
    step(state, DT, inputs, rng);
    steps++;
  }

  return {
    won: state.status === 'WON',
    finalStatus: state.status,
    finalLevel: state.level,
    finalScore: state.score,
    finalLives: state.lives,
    steps,
    framesWithThreat,
    corridorViolations,
    corridorAlwaysSafe: corridorViolations === 0,
  };
}

// Compat rétro (ancien call-site) — createBot() renvoie une fonction (seed) => résultat.
export function createBot() {
  return (seed) => runBot(seed);
}

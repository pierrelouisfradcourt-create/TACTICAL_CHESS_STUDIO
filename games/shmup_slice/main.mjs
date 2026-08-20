// Main entry point. Integrates logic, input, render. Exposes game hooks (R26).
// Supports both browser (requestAnimationFrame + accumulateur à pas fixe) and
// headless (step-by-step) modes.

import { createInitialState, BOSSES } from './logic/state.mjs';
import { step } from './logic/step.mjs';
import { createRng } from './logic/rng.mjs';
import { createInputHandler, getNullInput } from './input.mjs';
import { createRenderer, updateOverlay } from './render.mjs';
import { restartRun, jumpToLevel } from './logic/progression.mjs';

const STEP_S = 0.016; // pas fixe de simulation (R21 — DT=16ms), jamais le delta rAF brut

export function initializeGame(canvasElement, seed = 1, domEls = null) {
  const state = createInitialState();
  let rng = createRng(seed);
  const renderer = canvasElement ? createRenderer(canvasElement) : null;
  const getInput = typeof window !== 'undefined' ? createInputHandler() : () => getNullInput();

  let frameId = null;
  const backgroundColor = '#1a1a2e';
  const inBrowserMode = !!canvasElement;

  // Accumulateur à pas fixe : la simulation avance TOUJOURS par pas de STEP_S
  // secondes, quel que soit le rythme réel de requestAnimationFrame (variable
  // selon la machine/l'onglet). Un onglet inactif produit un grand `elapsedS`
  // qu'on plafonne — pas de rattrapage brutal (spirale de la mort), la
  // simulation reprend simplement là où elle était.
  let lastT = null;
  let accumulator = 0;

  function gameLoop(t) {
    if (lastT === null) lastT = t;
    let elapsedS = (t - lastT) / 1000;
    lastT = t;
    if (elapsedS > 0.25) elapsedS = 0.25;
    accumulator += elapsedS;

    const inputs = getInput();
    while (accumulator >= STEP_S) {
      step(state, STEP_S, inputs, rng);
      accumulator -= STEP_S;
    }

    state.backgroundColor = backgroundColor;
    if (renderer) renderer(state);
    if (domEls) updateOverlay(state, domEls);
    exposeGameHooks();

    frameId = requestAnimationFrame(gameLoop);
  }

  // R26 — publie l'état minimal exigé par le contrat de jouabilité (+ shipX/
  // bossX/bossX au-delà du minimum : le contrat dit "au minimum", ces champs
  // laissent un client — ou l'e2e — viser réellement le boss au lieu de
  // deviner sa position à l'aveugle).
  function exposeGameHooks() {
    if (typeof window === 'undefined') return;
    window.__game = {
      level: state.level,
      lives: state.lives,
      score: state.score,
      over: state.status === 'WON' || state.status === 'LOST',
      status: state.status,
      bossHp: state.boss ? state.boss.hp : null,
      shipX: state.ship.x,
      bossX: state.boss ? state.boss.x : null,
    };
    window.__game_debug = {
      // Saute au niveau n (map fraîche, score/vies préservés) — jamais utilisé
      // pour la preuve de solvabilité (AI-5), seulement pour la couverture e2e
      // des maps 2/3.
      setLevel(n) {
        if (n >= 1 && n <= 3) {
          jumpToLevel(state, n);
          exposeGameHooks();
        }
      },
      // Fait apparaître IMMÉDIATEMENT le vrai boss du niveau n (données réelles
      // de data/bosses.mjs — pas de stats ad hoc dupliquées) pour tester la
      // séquence de combat sans attendre le minutage naturel de la map.
      spawnBoss(n) {
        const targetLevel = n >= 1 && n <= 3 ? n : state.level;
        jumpToLevel(state, targetLevel);
        const bossTemplate = BOSSES[targetLevel];
        state.bossActive = true;
        state.boss = { ...bossTemplate, vx: bossTemplate.speed, fireCountdown: 0 };
        exposeGameHooks();
      },
      forceWin() {
        state.status = 'WON';
        exposeGameHooks();
      },
      forceLose() {
        state.lives = 0;
        state.status = 'LOST';
        exposeGameHooks();
      },
    };
  }

  function start() {
    if (inBrowserMode && frameId === null) {
      lastT = null; // resynchronise l'horloge rAF (évite un grand elapsedS fantôme)
      frameId = requestAnimationFrame(gameLoop);
    }
  }

  function stop() {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function restart() {
    restartRun(state);
    rng = createRng(seed);
    accumulator = 0;
    exposeGameHooks();
    if (domEls) updateOverlay(state, domEls);
    start(); // no-op si déjà en cours
  }

  // Expose hooks immédiatement (avant même le premier rAF)
  exposeGameHooks();

  return { state, start, stop, restart };
}

import { createState, step, isVictory, reset, getThresholdIndex } from './economy.mjs';
import { createRenderer, renderFrame, syncOverlay } from './render.mjs';
import { setupInputHandlers, injectDebugApi } from './input.mjs';

let gameInstance = null;

function queryOverlay() {
  const byId = (id) => document.getElementById(id);
  return {
    coeurDeLumen: byId('coeur-de-lumen'),
    buyButtons: [byId('buy-g1'), byId('buy-g2'), byId('buy-g3'), byId('buy-g4')],
    upgradeContainer: byId('upgrade-container'),
    rejouer: byId('rejouer'),
    victoryOverlay: byId('victory-overlay'),
    rCounter: byId('r_counter'),
    objectif: byId('objectif'),
    progressMeter: byId('progress-meter'),
    colonneGenerateurs: byId('colonne_generateurs'),
    thresholdReveal: byId('threshold-reveal'),
  };
}

export function initGame(canvasId, onVictory) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas ${canvasId} not found`);

  const state = createState();
  const renderer = createRenderer(canvas, state);
  renderer.thresholdRevealOpacity = 0;
  const dom = queryOverlay();

  gameInstance = {
    state,
    renderer,
    canvas,
    dom,
    running: false,
    tick_ms: 100,
    animationFrameId: null,
    lastThresholdIdx: getThresholdIndex(state.cumul_mR),
    onVictory,
  };

  // Expose to window for testing
  if (typeof window !== 'undefined') {
    window.__game = state;
    window.__game_instance = gameInstance;
  }

  injectDebugApi(state, gameInstance);

  setupInputHandlers(dom, state, {
    onCoreClick: (gain) => {
      renderer.lastClickBurst = { gain, age: 0 };
    },
    onStateChanged: () => {
      syncOverlay(dom, state, renderer);
    },
    onReplay: () => {
      // `reset` mute l'objet `state` EN PLACE : window.__game pointe déjà dessus
      // depuis initGame. Le ré-assigner ici était une écriture morte — donc une
      // ligne qu'aucun test ne pouvait distinguer de son absence.
      reset(state);
      gameInstance.lastThresholdIdx = getThresholdIndex(state.cumul_mR);
      renderer.thresholdRevealOpacity = 0;
      syncOverlay(dom, state, renderer);
      if (gameInstance.onVictory) gameInstance.onVictory('replay');
      // Une nouvelle partie doit reprendre son cours : sans ce redémarrage,
      // le calque overlay/canvas resterait figé sur la dernière frame de
      // victoire (running=false depuis le tick de victoire).
      if (!gameInstance.running) startGame();
    },
  });

  return gameInstance;
}

export function startGame() {
  if (!gameInstance) throw new Error('Game not initialized');
  if (gameInstance.running) return;

  gameInstance.running = true;
  gameLoop();
}

function gameLoop() {
  if (!gameInstance.running) return;

  const { state, renderer, dom } = gameInstance;

  // One logic step
  step(state);

  // R19 — franchissement de seuil détecté sur CHAQUE tick (production passive
  // incluse, pas seulement les clics) : seule source de vérité pour le flash.
  const currentThresholdIdx = getThresholdIndex(state.cumul_mR);
  if (currentThresholdIdx > gameInstance.lastThresholdIdx) {
    renderer.thresholdRevealOpacity = 1;
    gameInstance.lastThresholdIdx = currentThresholdIdx;
  }

  // Render
  renderFrame(renderer, state);
  syncOverlay(dom, state, renderer);

  // Check victory
  if (isVictory(state)) {
    gameInstance.running = false;
    if (gameInstance.onVictory) gameInstance.onVictory('victory');
    return;
  }

  // Schedule next frame (100ms = 10 ticks/sec)
  gameInstance.animationFrameId = setTimeout(gameLoop, gameInstance.tick_ms);
}

export function stopGame() {
  if (!gameInstance) return;
  gameInstance.running = false;
  if (gameInstance.animationFrameId) {
    clearTimeout(gameInstance.animationFrameId);
    gameInstance.animationFrameId = null;
  }
}

export function getGameInstance() {
  return gameInstance;
}

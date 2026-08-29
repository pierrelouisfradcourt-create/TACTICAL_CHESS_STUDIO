import { initGameState } from './sim/state.mjs';
import { step } from './sim/step.mjs';
import { renderGame } from './render/render.mjs';
import { attachInputHandlers } from './input/input.mjs';

const TICK_MS = 16; // Fixed time step: 16ms = ~60 FPS

let gameState = initGameState(1337);
let accumulator = 0;

// Keeps the HTML shell in step with the state: the gold/lives/wave/leak read-outs
// and the end-of-game #overlay. Without this the DOM read-outs shipped in
// index.html were decorative — the canvas knew the score, the page never did.
const syncDom = (state) => {
  const put = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  put('stat-gold', Math.round(state.gold));
  put('stat-lives', state.lives);
  put('stat-wave', Math.min(state.wave, 10));
  put('stat-leaks', state.leaks);

  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  if (state.result) {
    put('overlay-result', state.result);
    put('overlay-stats', `Lives: ${state.lives} — Wave: ${Math.min(state.wave, 10)} — Leaks: ${state.leaks}`);
    overlay.classList.remove('hidden');
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
    overlay.classList.add('hidden');
  }
};

// R40 — the read-only window onto the running game. Publishes SCALARS and the two
// live collections, and nothing callable: no setter, no debug hook, no way to move
// the state from outside. An observer (Playwright, a person in the console) reads
// it; it can never play through it.
export const exposeGameState = (state) => {
  window.__game = {
    tick: state.tick,
    seed: state.seed,
    phase: state.phase,
    wave: state.wave,
    gold: state.gold,
    lives: state.lives,
    towers: state.towers,
    enemies: state.enemies,
    leaks: state.leaks,
    result: state.result
  };
};

export const startGame = (canvasElement) => {
  const ctx = canvasElement.getContext('2d');

  // Attach input handlers
  attachInputHandlers(gameState, canvasElement, {});

  // RAF loop
  const loop = (currentTime) => {
    // Real time -> fixed time steps
    // dt is clamped to prevent spiral of death
    const dt = Math.min(50, TICK_MS);
    accumulator += dt;

    // Advance simulation by fixed steps
    while (accumulator >= TICK_MS) {
      step(gameState, TICK_MS);
      accumulator -= TICK_MS;
    }

    // Render
    renderGame(ctx, gameState);
    syncDom(gameState);

    exposeGameState(gameState);

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

export const getGameState = () => gameState;
export const setGameState = (newState) => {
  gameState = newState;
};

// Boot
const canvas = document.getElementById('game-canvas');
if (canvas) {
  startGame(canvas);
}

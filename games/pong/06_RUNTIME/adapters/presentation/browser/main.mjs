// PONG — adaptateur NAVIGATEUR reel (ADAPTATEUR, jamais importe par la logique).
// Importe la logique pure, la rend sur un <canvas> via le MEME drawState() que la
// capture headless, lit le clavier via input.translate(), joue le WAV au rebond,
// et cable le bouton Quitter. Boucle de temps reel = requestAnimationFrame ; elle
// vit ICI (adaptateur), jamais dans la logique.
import { boot, step } from '../../../../05_SYSTEMS/game_loop/loop.mjs';
import { restart, isOver } from '../../../../05_SYSTEMS/game_state/state.mjs';
import { translate } from '../../../../05_SYSTEMS/input/input.mjs';
import { drawState, VIEW_W, VIEW_H } from '../draw.mjs';
import { cueFor } from '../audio.mjs';
import { requestExit } from '../exit.mjs';

// Surface -> CanvasRenderingContext2D (backend navigateur du meme code de dessin).
function canvasSurface(ctx) {
  return {
    clear(r, g, b) { ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); },
    fillRect(x, y, w, h, r, g, b) { ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x, y, w, h); },
  };
}

export function mount(canvas, audioEl, exitBtn) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  const surface = canvasSurface(ctx);

  let state = boot(1);
  const keys = new Set();
  window.addEventListener('keydown', (e) => keys.add(e.key));
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  function readInput() {
    // W/S = joueur gauche ; fleches Haut/Bas = joueur droit.
    return {
      p1: { up: keys.has('w'), down: keys.has('s') },
      p2: { up: keys.has('ArrowUp'), down: keys.has('ArrowDown') },
    };
  }

  function playBounce() {
    if (!audioEl) return;
    try { audioEl.currentTime = 0; audioEl.play(); } catch { /* autoplay bloque : sans effet */ }
  }

  if (exitBtn) exitBtn.addEventListener('click', () => requestExit('browser'));
  window.addEventListener('keydown', (e) => { if (e.key === 'r' && isOver(state)) state = restart(1); });

  function frame() {
    const { state: ns, events } = step(state, translate(readInput()));
    state = ns;
    if (events.some((ev) => cueFor(ev) === 'bounce')) playBounce();
    drawState(state, surface);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Auto-montage si charge dans une page contenant les elements attendus.
if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game');
    if (canvas) {
      mount(canvas, document.getElementById('bounce'), document.getElementById('exit'));
    }
  });
}

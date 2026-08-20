// renderer/renderer.mjs - Barrel: composes viewmodel + combat_view + render_dom + render_canvas
// into the one call app/ needs. Still THE RENDERER: imports only its own siblings + layout/ +
// params.v0 + content/ (names & stat sheets). No GameState import here either, and no `combat/`
// import — the battle is read from the Event Log like everything else (R1/INV-5).

import { buildViewModel } from './viewmodel.mjs';
import { buildCombatFrame, roundNumberFromLog } from './combat_view.mjs';
import { renderDom, renderCombatDom, renderEliminationDom } from './render_dom.mjs';
import { renderCanvas, renderCombatCanvas } from './render_canvas.mjs';
import { TIMER_DURATION } from '../params.v0.mjs';

/**
 * @param {Document} doc
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} eventLog - THE only source of truth this module reads
 * @param {number} frameCounter - injected, deterministic (ms elapsed in the CURRENT phase
 *   window: it restarts at 0 on every phase change, which is what lets one counter drive both
 *   the preparation chronometer and the combat playback)
 * @param {boolean} [showDebugOverlay=false]
 * @returns {Object} the view model that was rendered (handy for callers/tests, never re-read
 *   by this module itself)
 */
export function render(doc, ctx, eventLog, frameCounter, showDebugOverlay = false) {
  const vm = buildViewModel(eventLog);

  // E1: the game is over. Read from the journal like everything else — the last PhaseChanged
  // says 'Elimination'. The board stays drawn behind the verdict (the army that lost is still
  // the player's last picture of the game), but every control is dead.
  if (vm.phase === 'Elimination') {
    renderCanvas(ctx, vm, 0, showDebugOverlay);
    renderEliminationDom(doc, vm, roundNumberFromLog(eventLog));
    return vm;
  }

  if (vm.phase === 'Battle') {
    const frame = buildCombatFrame(eventLog, frameCounter);
    renderCombatCanvas(ctx, frame);
    renderCombatDom(doc, vm, frame, roundNumberFromLog(eventLog));
    return vm;
  }

  const secondsRemaining = Math.max(0, TIMER_DURATION - frameCounter / 1000);
  renderDom(doc, vm, secondsRemaining, roundNumberFromLog(eventLog));
  renderCanvas(ctx, vm, frameCounter, showDebugOverlay);
  return vm;
}

export { buildViewModel } from './viewmodel.mjs';
export { buildCombatFrame, combatPlaybackMs, roundNumberFromLog } from './combat_view.mjs';

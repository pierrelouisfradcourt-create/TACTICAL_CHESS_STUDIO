// input/input.mjs - Barrel: wires gestures + submit + feedback + timer into the single entry
// point app/ needs. Still THE INPUT LAYER — the only module allowed to both see state AND
// touch the DOM of interaction (blueprint.yaml). Never draws the game screen, never triggers
// the renderer itself: app/ owns the render loop.

import { attachGestures } from './gestures.mjs';
import { submitInput } from './submit.mjs';
import { showRefusal, clearFeedback } from './feedback.mjs';
import { startTimer, remainingSeconds, hasExpired } from './timer.mjs';

const SEAT_ID = 'player_0';

/**
 * @param {Document} doc
 * @param {HTMLCanvasElement} canvas
 * @param {() => Object} getState
 * @param {(next: Object) => void} setState - called with the new GameState after every
 *   dispatched Input (refused inputs re-set the SAME state, harmless and keeps call sites simple)
 * @param {number} nowMs - "now" at boot, supplied by app/ (never Date/performance read here)
 * @returns {{getRemainingSeconds: (nowMs:number) => number, tick: (nowMs:number) => void}}
 */
export function attachInput(doc, canvas, getState, setState, nowMs) {
  function dispatch(input) {
    const before = getState();
    const { state: next, accepted } = submitInput(before, input);
    if (accepted) {
      clearFeedback(doc);
    } else {
      showRefusal(doc, before, input, SEAT_ID);
    }
    setState(next);
  }

  attachGestures(doc, canvas, getState, dispatch);

  let timer = startTimer(nowMs);
  let observedPhase = null;

  // D4 — THE CHRONOMETER IS PER PREPARATION WINDOW, not per session. Before the loop closed
  // there was only ever one Preparation, so a single timer started at boot was enough. With a
  // battle and a round N+1, a boot-anchored timer is already expired when the second
  // Preparation opens: it would fire ConfirmPreparation on the very first frame and the player
  // would never get to play again. The timer restarts on every ENTRY into 'Preparation'.
  function tick(currentNowMs) {
    const phase = getState().phase;
    if (phase !== observedPhase) {
      observedPhase = phase;
      if (phase === 'Preparation') timer = startTimer(currentNowMs);
    }
    if (phase !== 'Preparation') return;
    if (!hasExpired(timer, currentNowMs)) return;
    // R5: the timer's expiry emits EXACTLY the same Input the "Prêt" button does.
    dispatch({ kind: 'ConfirmPreparation', seatId: SEAT_ID });
  }

  return {
    getRemainingSeconds: (currentNowMs) => remainingSeconds(timer, currentNowMs),
    tick
  };
}

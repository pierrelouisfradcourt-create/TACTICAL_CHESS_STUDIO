// input/timer.mjs - 30s countdown, entirely OUTSIDE the GameState (QC-5, R5: "jamais de
// timer moteur" — a wall clock in state would break replay determinism). At expiry, the
// caller (input/input.mjs) submits the SAME ConfirmPreparation Input the "Prêt" button does.
// Receives "now" as a parameter from app/ rather than reading Date/performance itself, so
// this module stays a pure function of its inputs and is trivially testable.

import { TIMER_DURATION } from '../params.v0.mjs';

/**
 * @param {number} nowMs - "now" at round start, supplied by the caller
 * @returns {{startMs: number}}
 */
export function startTimer(nowMs) {
  return { startMs: nowMs };
}

/**
 * @param {{startMs:number}} timer
 * @param {number} nowMs
 * @returns {number} seconds remaining, clamped to [0, TIMER_DURATION]
 */
export function remainingSeconds(timer, nowMs) {
  const elapsedS = (nowMs - timer.startMs) / 1000;
  return Math.max(0, TIMER_DURATION - elapsedS);
}

/**
 * @param {{startMs:number}} timer
 * @param {number} nowMs
 * @returns {boolean}
 */
export function hasExpired(timer, nowMs) {
  return remainingSeconds(timer, nowMs) <= 0;
}

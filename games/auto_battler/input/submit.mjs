// input/submit.mjs - THE single call site of applyPreparationInput across the whole game
// (blueprint.yaml: "entonnoir unique"). Detects refusal by comparing serialized state
// before/after: R14 — no rejection Event exists in the closed 22-kind registry, so this is
// the ONLY way to know an Input was refused.

import { applyPreparationInput } from '../preparation/preparation.mjs';
import { serialize } from '../engine/serialize.mjs';

/**
 * @param {Object} state - current GameState
 * @param {Object} input - {kind, seatId, ...payload}, one of the 7 closed Input kinds
 * @returns {{state: Object, accepted: boolean}} accepted=false means state === (deep-equal) the input state
 */
export function submitInput(state, input) {
  const before = serialize(state);
  const next = applyPreparationInput(state, input);
  const after = serialize(next);
  return { state: next, accepted: before !== after };
}

// replay.mjs - Deterministic replay of input logs
import { isState } from './types.mjs';
import { transition } from './transition.mjs';
import { createGameState } from './state.mjs';

export function replay(initialState, inputLog) {
  if (!isState(initialState)) {
    throw new Error('Invalid initial state');
  }

  if (!Array.isArray(inputLog)) {
    throw new Error('Input log must be an array');
  }

  // Handle empty input log
  if (inputLog.length === 0) {
    return {
      finalState: initialState,
      eventLog: initialState.eventLog
    };
  }

  // Apply inputs one at a time to ensure determinism
  let currentState = initialState;
  for (const input of inputLog) {
    currentState = transition(currentState, [input]);
  }

  return {
    finalState: currentState,
    eventLog: currentState.eventLog
  };
}

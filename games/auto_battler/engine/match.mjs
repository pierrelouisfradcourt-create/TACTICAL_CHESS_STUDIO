// match.mjs - Complete match execution
import { initState } from './state.mjs';
import { replay } from './replay.mjs';

export function runMatch(seed, inputLog) {
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    throw new Error('Seed must be an integer');
  }

  if (!Array.isArray(inputLog)) {
    throw new Error('Input log must be an array');
  }

  // Initialize state with seed
  const initialState = initState(seed);

  // Replay the input log
  const result = replay(initialState, inputLog);

  return {
    finalState: result.finalState,
    eventLog: result.eventLog
  };
}

// transition.mjs - Pure state reducer
import { isState } from './types.mjs';
import { validateInputSync } from './inputs.mjs';
import { appendEvent } from './eventlog.mjs';
import { createGameState } from './state.mjs';

export function transition(state, inputs) {
  if (!isState(state)) {
    throw new Error('Invalid state object');
  }

  if (!Array.isArray(inputs)) {
    throw new Error('Inputs must be an array');
  }

  // Pure: do not mutate the input state
  let newState = createGameState(state);

  // Process each input
  for (const input of inputs) {
    newState = applyInput(newState, input);
  }

  return newState;
}

export function applyInput(state, input) {
  // Validate input
  const validation = validateInputSync(input);

  if (!validation.ok) {
    // Reject: state unchanged
    return state;
  }

  // Accept: record the acceptance as an event (minimal gameplay)
  // At increment 1, we don't have gameplay rules yet
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'Spawn', // Placeholder event
    inputKind: input.kind
  });

  // Advance phase on ConfirmPreparation
  let newPhase = state.phase;
  if (input.kind === 'ConfirmPreparation') {
    newPhase = 'Battle'; // Simple phase transition
  }

  return createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: state.players,
    entities: state.entities,
    phase: newPhase
  });
}

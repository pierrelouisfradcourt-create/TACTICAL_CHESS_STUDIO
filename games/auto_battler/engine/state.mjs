// state.mjs - Game state creation and immutability
import { seedRng } from './rng.mjs';
import { isState } from './types.mjs';

export function initState(seed) {
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    throw new Error('Seed must be an integer');
  }

  const rng_state = seedRng(seed);

  return createGameState({
    seed,
    rng_state,
    eventLog: [],
    players: {},
    entities: {},
    phase: 'Shop'
  });
}

// Pure structural deep clone: plain objects, arrays, and primitives only.
// State never contains anything else (serialize.mjs enforces the same
// invariant on the way out). Breaks EVERY nested reference between the
// fields passed in and the state returned, at any depth.
function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepClone(value[key]);
    }
    return out;
  }
  return value;
}

export function createGameState(fields) {
  if (!fields || typeof fields !== 'object') {
    throw new Error('Fields must be an object');
  }

  const state = {
    seed: fields.seed,
    rng_state: fields.rng_state,
    // Deep-cloned (not just [...eventLog]/{...players}): a one-level spread
    // copies the container but keeps the SAME nested object references, so
    // mutating a sub-object of the output would silently mutate the input too.
    eventLog: Array.isArray(fields.eventLog) ? deepClone(fields.eventLog) : [],
    players: fields.players ? deepClone(fields.players) : {},
    entities: fields.entities ? deepClone(fields.entities) : {},
    phase: fields.phase,
    // RO-5: preserve extra fields (pool, bench_capacity, round_index, etc.)
    // so handlers don't need to manually re-attach them
    ...(fields.pool !== undefined && { pool: deepClone(fields.pool) }),
    ...(fields.bench_capacity !== undefined && { bench_capacity: fields.bench_capacity }),
    ...(fields.round_index !== undefined && { round_index: fields.round_index })
  };

  return state;
}

// Deep freeze to ensure immutability
export function freezeState(state) {
  if (!isState(state)) {
    throw new Error('Cannot freeze non-state object');
  }

  function deepFreeze(obj) {
    Object.freeze(obj);

    if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (item !== null && typeof item === 'object') {
          deepFreeze(item);
        }
      });
    } else if (obj !== null && typeof obj === 'object') {
      Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
          deepFreeze(obj[prop]);
        }
      });
    }

    return obj;
  }

  return deepFreeze(state);
}

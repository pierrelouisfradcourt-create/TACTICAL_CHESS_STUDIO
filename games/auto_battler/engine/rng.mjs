// rng.mjs - Deterministic uint32 PRNG (mulberry32)
import { isState } from './types.mjs';

// Mulberry32 PRNG: https://github.com/bryc/code/blob/master/jot/randomization.md
// Returns a deterministic sequence of uint32 values.
function mulberry32(a) {
  a = (a >>> 0) >>> 0; // ensure uint32
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0); // return as uint32
  };
}

export function seedRng(seed) {
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    throw new Error('Seed must be an integer');
  }
  const s = (seed >>> 0); // normalize to uint32
  const gen = mulberry32(s);
  return (gen() >>> 0); // first value is the rng_state
}

export function nextRng(rng_state) {
  if (typeof rng_state !== 'number' || !Number.isInteger(rng_state)) {
    throw new Error('RNG state must be an integer');
  }
  const gen = mulberry32(rng_state >>> 0);
  const next_value = (gen() >>> 0);
  const next_state = (gen() >>> 0);
  return {
    rng_state: next_state,
    value: next_value
  };
}

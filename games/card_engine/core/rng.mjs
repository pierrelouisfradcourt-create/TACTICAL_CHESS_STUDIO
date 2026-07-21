// core/rng.mjs — Seeded deterministic RNG (R13)
// Mulberry32 implementation. One single stream per game.
// Shuffle is Fisher-Yates with injectable RNG, does not mutate input.

/**
 * Create a seeded deterministic RNG (mulberry32).
 * @param {number} seed - Seed value
 * @returns {function} RNG function that returns [0,1) on each call
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with injectable RNG.
 * Does not mutate the input array.
 * @param {array} deck - Cards to shuffle
 * @param {function} rng - RNG function returning [0,1)
 * @returns {array} Shuffled copy of the deck
 */
export function shuffle(deck, rng = Math.random) {
  const d = deck.slice(); // copy, never mutate input
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

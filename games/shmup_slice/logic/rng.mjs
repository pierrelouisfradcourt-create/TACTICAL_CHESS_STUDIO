// Seeded RNG (xorshift32). Used everywhere in logic; never Math.random.
export function createRng(seed) {
  let state = seed >>> 0; // 32-bit unsigned
  return () => {
    state = (state ^ (state << 13)) >>> 0;
    state = (state ^ (state >> 17)) >>> 0;
    state = (state ^ (state << 5)) >>> 0;
    return (state >>> 0) / 0x100000000;
  };
}

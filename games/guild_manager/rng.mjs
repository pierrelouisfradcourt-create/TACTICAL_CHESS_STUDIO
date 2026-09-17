// guild_manager — générateur pseudo-aléatoire déterministe (mulberry32).
// L'état du générateur vit DANS l'état de jeu (state.rngState) : un snapshot
// JSON restaure exactement la même suite de tirages (preuve de déterminisme).

export function seedToState(seed) {
  return (Number(seed) >>> 0) || 0x9e3779b9;
}

// Tire un flottant dans [0, 1) et fait avancer state.rngState.
export function nextFloat(state) {
  let t = (state.rngState = (state.rngState + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Entier dans [min, max] inclus.
export function nextInt(state, min, max) {
  if (max < min) throw new Error(`nextInt: max ${max} < min ${min}`);
  return min + Math.floor(nextFloat(state) * (max - min + 1));
}

export function pick(state, arr) {
  if (!arr.length) throw new Error('pick: tableau vide');
  return arr[nextInt(state, 0, arr.length - 1)];
}

// types.mjs - Content-agnostic type constructors
// Exports only abstract identifiers and type predicates

export function makeEntityId(n) {
  if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
    throw new Error('Entity ID must be a non-negative integer');
  }
  return `entity_${n}`;
}

export function makePlayerId(n) {
  if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
    throw new Error('Player ID must be a non-negative integer');
  }
  return `player_${n}`;
}

export function isInput(x) {
  return typeof x === 'object' && x !== null && typeof x.kind === 'string';
}

export function isEvent(x) {
  return typeof x === 'object' && x !== null && typeof x.kind === 'string';
}

export function isState(x) {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof x.seed === 'number' &&
    typeof x.rng_state === 'number' &&
    Array.isArray(x.eventLog) &&
    typeof x.players === 'object' &&
    typeof x.entities === 'object' &&
    typeof x.phase === 'string'
  );
}

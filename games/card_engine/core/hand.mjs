// core/hand.mjs — Hand as a read-only, queryable collection (R6)
// Interrogating hand contents or legal moves does NOT mutate the serializable state.
// All queries return new values (copies) — never expose internal references.

/**
 * Project candidate moves from a hand without mutating the state.
 * This is a read-only query helper. The actual filtering is delegated to
 * the Rules adapter via its legalMoves method.
 * @param {array} hand - Cards in hand (not mutated)
 * @param {function} filterFn - Predicate to filter cards, e.g. a check keyed on card id
 * @returns {array} New array of cards matching the filter (copy)
 */
export function projectMoves(hand, filterFn) {
  // Return a copy to ensure immutability of the query interface
  const filtered = hand.filter(filterFn);
  return filtered.slice ? filtered.slice() : [...filtered];
}

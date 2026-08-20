// core/trick.mjs — Trick resolution: one card per seat, one winner (R7)
// Winner is resolved via an injected comparator from the Rules adapter.
// Reassignment hook (e.g., Tarot Excuse at last trick) is optional (R15).

/**
 * Resolve a complete trick to exactly one winner.
 * @param {object} trick - { led: (card that set the color), plays: [{ seat, card }, ...] }
 * @param {function} compareInTrick - Injected comparator: (card1, card2, led, contract) => number
 *   Returns: >0 if card1 beats card2, <0 if card2 beats, 0 if equal (favor first)
 * @param {object} contract - Game-specific contract (e.g., { trump: "coeur" })
 * @returns {object} { seat: winning_seat } — exactly one winner
 * @throws {Error} If trick does not have exactly one winner
 */
export function resolveTrick(trick, compareInTrick, contract) {
  const { led, plays } = trick;

  if (!plays || plays.length === 0) {
    throw new Error('Trick must have at least one play');
  }

  let winner = plays[0];
  for (let i = 1; i < plays.length; i++) {
    const cmp = compareInTrick(plays[i].card, winner.card, led, contract);
    if (cmp > 0) {
      winner = plays[i];
    }
  }

  return { seat: winner.seat };
}

/**
 * Optional hook to reassign a trick capture (e.g., Tarot Excuse at last trick).
 * This is a no-op in Belote (returns captures unchanged).
 * @param {object} trick - The trick object
 * @param {object} winner - The winning seat { seat }
 * @param {function} reassignFn - Adapter's optional reassignment function
 * @param {object} ctx - Game context (e.g., { isLastTrick: bool })
 * @returns {object} Updated captures (or unchanged if reassignFn is absent)
 */
export function reassignCapture(trick, winner, reassignFn, ctx) {
  if (!reassignFn) {
    // Adapter did not provide a reassignment hook — no-op
    return { seat: winner.seat };
  }
  // Adapter provided hook — call it
  return reassignFn(trick, winner, ctx);
}

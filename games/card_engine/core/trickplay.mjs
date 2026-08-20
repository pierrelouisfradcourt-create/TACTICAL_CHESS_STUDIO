// core/trickplay.mjs — Generic trick chaining: winner entames the next (R13, R7, R6)
// seatCount and trickCount are READ from the adapter (never 4/8 hardcoded).
// Works on a mutable COPY of hands; does not mutate serializable state.
// Rejects illegal moves with deterministic error.

import { assertLegalMove } from './rules_interface.mjs';
import { resolveTrick, reassignCapture } from './trick.mjs';

/**
 * Play a complete trick starting from a leader seat.
 * Solicits the adapter for legal moves, validates chosen move,
 * delegates winner resolution to core/trick.
 *
 * @param {object} playHands - Mutable COPY of hands (playTricks creates this)
 * @param {number} leader - Starting seat
 * @param {object} rules - Rules adapter
 * @param {function} selectMove - Move selector: (legalMoves, trick, contract, seat) -> card
 * @param {object} contract - Game contract (e.g., { trump: "coeur" })
 * @returns {object} { winner: seat, tricks: [{led, plays}], cards: [card,...] }
 * @throws {Error} If selector chooses an illegal move
 */
export function playTrick(playHands, leader, rules, selectMove, contract) {
  const seatCount = rules.seatCount;
  const plays = [];
  const cards = [];

  let led = null;

  for (let i = 0; i < seatCount; i++) {
    const seat = (leader + i) % seatCount;
    const hand = playHands[seat];

    // F12 fix (red-team follow-up, discovered via solver.mjs's independent re-verification):
    // `rules.legalMoves(hand, trick, ...)` MUST see the plays made so far in THIS trick
    // (it expects a flat [{seat, card}, ...] array — exactly `plays`'s shape). The previous
    // code passed a separate `trick` accumulator that was declared but NEVER pushed to —
    // every seat but the leader was evaluated as if leading (entame), so R6 obligations
    // (follow suit / overcut / etc.) were silently never enforced during real play. This
    // was invisible to unit tests (which construct trick arrays by hand) and only surfaced
    // when harness/solver.mjs started independently re-verifying the ACTUAL played sequence.
    const legalMoves = rules.legalMoves(hand, plays, contract, seat);

    // Select a move
    const chosen = selectMove(legalMoves, plays, contract, seat);

    // Validate: move must be legal
    assertLegalMove(chosen, legalMoves);

    // Record play
    plays.push({ seat, card: chosen });
    cards.push(chosen);

    if (i === 0) {
      led = chosen.suit; // First card sets the led suit
    }

    // Remove from hand (mutate the play copy, not the serializable state)
    const idx = hand.findIndex(c => c.id === chosen.id);
    if (idx < 0) {
      throw new Error(`Card ${chosen.id} not found in hand`);
    }
    hand.splice(idx, 1);
  }

  // Resolve winner
  const trickObj = { led, plays };
  const { seat: winner } = resolveTrick(trickObj, rules.compareInTrick, contract);

  // Optional reassignment (e.g., Tarot Excuse)
  const reassign = rules.reassignCapture || (() => ({ seat: winner }));
  const { seat: finalWinner } = reassignCapture(trickObj, { seat: winner }, reassign, { lastTrick: false });

  return {
    winner: finalWinner,
    trick: trickObj,
    cards,
  };
}

/**
 * Play all tricks in a deal.
 * @param {array} hands - Initial hands (NOT mutated; we copy)
 * @param {number} leader - Starting seat for trick 1
 * @param {object} rules - Rules adapter
 * @param {function} selectMove - Move selector
 * @param {object} contract - Game contract
 * @returns {array} Array of { winner, trick, cards } for each trick
 */
export function playTricks(hands, leader, rules, selectMove, contract) {
  // Make a mutable copy for play
  const playHands = hands.map(h => h.slice());

  const results = [];
  let currentLeader = leader;
  const trickCount = rules.trickCount;

  for (let t = 0; t < trickCount; t++) {
    const res = playTrick(playHands, currentLeader, rules, selectMove, contract);
    results.push(res);
    currentLeader = res.winner; // Winner entames next trick
  }

  return results;
}

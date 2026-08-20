// core/shoe.mjs — Generic shoe: cut (RNG), pickup (deterministic) (R13, R14)
// Cut bounds are DERIVED from deck.length (never hardcoded 32/29).
// minOffset is a generic parameter, not a Belote constant (F6 correction: teamOf/teamOrder injected).
// Pickup is deterministic without RNG — distribution + pickup = permutation.

import { shuffle } from './rng.mjs';

/**
 * Create initial shoe: shuffle the full deck with seeded RNG.
 * @param {array} deck - Full deck from adapter.buildDeck()
 * @param {function} rng - RNG function (mulberry32)
 * @returns {object} { deck: shuffled, rng: rng for reuse }
 */
export function newShoe(deck, rng) {
  return {
    deck: shuffle(deck, rng),
    rng,
  };
}

/**
 * Cut the shoe at a random position (bounded, never fixed, never 0).
 * Bounds are derived from deck.length (F6 correction: no hardcoded 32).
 * @param {array} deck - Cards in shoe
 * @param {function} rng - RNG function
 * @param {object} opts - { minOffset: 3 } (default 3, minimum cut to avoid trivial cuts)
 * @returns {array} Cut deck (rotated)
 */
export function cut(deck, rng, opts = {}) {
  const { minOffset = 3 } = opts;
  const lo = minOffset;
  const hi = deck.length - minOffset;

  if (lo > hi) {
    throw new Error(`Cut bounds invalid: minOffset=${minOffset}, deck.length=${deck.length}`);
  }

  const c = lo + Math.floor(rng() * (hi - lo + 1)); // c ∈ [lo, hi]
  return deck.slice(c).concat(deck.slice(0, c));
}

/**
 * Pickup: deterministic recomposition of the deck after tricks are played.
 * No RNG. The adapter MUST provide teamOf and teamOrder to structure the piles —
 * the core presumes NO topology (F7 correction: no default team split, no default
 * team count; a caller that omits opts gets an explicit throw, never a silent
 * 2-team-alternating fallback).
 *
 * @param {array} tricks - Array of { winner, cards } from trick play
 * @param {object} opts - { teamOf, teamOrder } — REQUIRED, no defaults
 *   teamOf: function(seat) -> teamId
 *   teamOrder: non-empty array of team ids (e.g., [0, 1] for Belote; [0, 1, 2] for a 3-team game)
 * @returns {array} Recomposed deck
 * @throws {Error} If teamOf is not a function or teamOrder is not a non-empty array
 */
export function pickup(tricks, opts = {}) {
  const { teamOf, teamOrder } = opts;

  if (typeof teamOf !== 'function' || !Array.isArray(teamOrder) || teamOrder.length === 0) {
    throw new Error('pickup: teamOf/teamOrder requis — le core ne présume aucune topologie');
  }

  // Build piles for each team
  const piles = {};
  for (const teamId of teamOrder) {
    piles[teamId] = [];
  }

  // Distribute won cards to team piles
  for (const trick of tricks) {
    const winnerTeam = teamOf(trick.winner);
    if (!(winnerTeam in piles)) {
      throw new Error(`Winner team ${winnerTeam} not in teamOrder`);
    }
    for (const card of trick.cards) {
      piles[winnerTeam].push(card);
    }
  }

  // Recompose in adapter order (e.g., preneur then défense for Belote)
  let result = [];
  for (const teamId of teamOrder) {
    result = result.concat(piles[teamId]);
  }

  return result;
}

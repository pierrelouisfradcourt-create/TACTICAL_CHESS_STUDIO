// adapters/belote/rules.mjs — Belote trick rules (R6, R7, R9)
// Legal moves and trick winner determination for Belote.

import { cardStrength } from './cards.mjs';

// --- Team structure (hardcoded Belote) ---
export const BELOTE_SEAT_COUNT = 4;
export const BELOTE_TRICK_COUNT = 8;

/**
 * Belote team of a seat: seats 0&2 vs 1&3.
 * @param {number} seat - Seat (0-3)
 * @returns {number} Team (0 or 1)
 */
export function teamOf(seat) {
  return seat % 2;
}

/**
 * Partner of a seat in Belote.
 * @param {number} seat - Seat (0-3)
 * @returns {number} Partner seat (seat+2 mod 4)
 */
export function partnerOf(seat) {
  return (seat + 2) % 4;
}

/**
 * R6: Legal moves for a player in Belote.
 * Implements full obligation rules:
 *   - Provide led suit if possible
 *   - If atout led: must beat or provide atout
 *   - If partner master: free (no obligation)
 *   - If adversary master: must cut/overcut or provide atout
 *   - If no atout in hand: can throw
 *
 * @param {array} hand - Cards in hand
 * @param {array} trick - Plays so far [{ seat, card }, ...]
 * @param {object} contract - { trump: suit }
 * @param {number} mover - Seat playing
 * @returns {array} Legal cards (subset or all of hand)
 */
// Safe max over a possibly-empty array of strengths: an empty trump pool means "no
// trump played yet this trick" — ANY trump in hand must count as "higher", so -Infinity
// is the deliberate, explicit sentinel (not an accidental `Math.max(...[])` quirk).
function maxStrengthOrNegInfinity(strengths) {
  return strengths.length === 0 ? -Infinity : Math.max(...strengths);
}

export function legalMoves(hand, trick, contract, mover) {
  const { trump } = contract;

  // Entame (empty trick): all cards are legal
  if (!trick || trick.length === 0) {
    return hand.slice();
  }

  const led = trick[0].card.suit;
  const inLed = hand.filter(c => c.suit === led);
  const trumps = hand.filter(c => c.suit === trump);

  // --- Case A: Trump was led ---
  if (led === trump) {
    // If no trump, everything is legal
    if (trumps.length === 0) {
      return hand.slice();
    }
    // Have trump: must beat or provide trump
    const highestTrump = maxStrengthOrNegInfinity(trick
      .filter(t => t.card.suit === trump)
      .map(t => cardStrength(t.card, trump)));
    const higherTrumps = trumps.filter(c => cardStrength(c, trump) > highestTrump);
    return higherTrumps.length > 0 ? higherTrumps : trumps;
  }

  // --- Case B: Non-trump suit was led ---
  if (inLed.length > 0) {
    // Must provide the led suit
    return inLed;
  }

  // Can't provide led suit
  const trickWinner = computeTrickWinner(trick, trump);
  const winnerSeat = trickWinner.seat;
  const partnerMaster = teamOf(winnerSeat) === teamOf(mover);

  if (partnerMaster) {
    // Partner has the lead: free (no obligation)
    return hand.slice();
  }

  if (trumps.length === 0) {
    // Adversary master but no trump: free throw
    return hand.slice();
  }

  // Adversary master and we have trump: must cut/overcut
  const highestTrump = maxStrengthOrNegInfinity(trick
    .filter(t => t.card.suit === trump)
    .map(t => cardStrength(t.card, trump)));
  const higherTrumps = trumps.filter(c => cardStrength(c, trump) > highestTrump);
  return higherTrumps.length > 0 ? higherTrumps : trumps;
}

/**
 * Helper: Determine current trick winner.
 * @param {array} trick - Plays so far
 * @param {string} trump - Trump suit
 * @returns {object} { seat: winning_seat }
 */
function computeTrickWinner(trick, trump) {
  const led = trick[0].card.suit;
  const trumpsInTrick = trick.filter(t => t.card.suit === trump);
  const pool = trumpsInTrick.length > 0
    ? trumpsInTrick
    : trick.filter(t => t.card.suit === led);

  if (pool.length === 0) {
    throw new Error('No valid pool for trick winner');
  }

  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (cardStrength(pool[i].card, trump) > cardStrength(best.card, trump)) {
      best = pool[i];
    }
  }

  return { seat: best.seat };
}

/**
 * R7 fix (F9, red-team HIGH): a card's ELIGIBILITY to win depends on the LED suit, not
 * just on rank. Category: 2 = trump (always eligible), 1 = led suit (eligible if no
 * trump was played), 0 = off-suit discard (NEVER eligible — a high-rank discard must
 * NOT beat a low led-suit card just because cardStrength() indexes ranks 0..7 within
 * whichever order applies; that index is only meaningful WITHIN a comparable category).
 * @param {object} card - Card
 * @param {string} led - Led suit
 * @param {string} trump - Trump suit
 * @returns {number} 2 (trump) | 1 (led suit) | 0 (off-suit, can never win)
 */
function trickCategory(card, led, trump) {
  if (card.suit === trump) return 2;
  if (card.suit === led) return 1;
  return 0;
}

/**
 * Comparator for trick winner (injected into core/trick.resolveTrick).
 * Returns: >0 if cardA beats cardB, <0 if cardB beats, 0 if equal.
 *
 * @param {object} cardA - Card A
 * @param {object} cardB - Card B
 * @param {string} led - Led suit
 * @param {object} contract - { trump: suit }
 * @returns {number} Comparison result
 */
export function compareInTrick(cardA, cardB, led, contract) {
  const { trump } = contract;

  const catA = trickCategory(cardA, led, trump);
  const catB = trickCategory(cardB, led, trump);

  // Different eligibility category: higher category always wins, REGARDLESS of rank
  // (an off-suit discard, category 0, can never beat a led-suit or trump card).
  if (catA !== catB) return catA - catB;

  // Both off-suit discards: neither can win the trick, comparison is irrelevant (tie).
  if (catA === 0) return 0;

  // Same eligible category (both trump, or both led suit): compare strength within it.
  const aStrength = cardStrength(cardA, trump);
  const bStrength = cardStrength(cardB, trump);
  return aStrength - bStrength;
}

/**
 * R7: Trick winner.
 * Called by core/trick.resolveTrick.
 * @param {object} trick - { led: suit, plays: [{ seat, card }, ...] }
 * @param {object} contract - { trump: suit }
 * @returns {object} { seat: winning_seat } (exactly one)
 */
export function trickWinner(trick, contract) {
  const { led, plays } = trick;
  const { trump } = contract;

  if (!plays || plays.length === 0) {
    throw new Error('Trick must have at least one play');
  }

  let best = plays[0];
  for (let i = 1; i < plays.length; i++) {
    const cmp = compareInTrick(plays[i].card, best.card, led, contract);
    if (cmp > 0) {
      best = plays[i];
    }
  }

  return { seat: best.seat };
}

/**
 * R9: Team holding King and Queen of trump (belote-rebelote).
 * Returns -1 if no team has both.
 * @param {array} fullHands - 4 hands (8 cards each, after completeDeal)
 * @param {string} trump - Trump suit
 * @returns {number} Team (0 or 1) or -1
 */
export function beloteTeam(fullHands, trump) {
  for (let seat = 0; seat < 4; seat++) {
    const hasK = fullHands[seat].some(c => c.rank === 'R' && c.suit === trump);
    const hasQ = fullHands[seat].some(c => c.rank === 'D' && c.suit === trump);
    if (hasK && hasQ) {
      return teamOf(seat);
    }
  }
  return -1;
}

/**
 * R9: Seat holding King and Queen of trump (for manual declaration).
 * Returns -1 if no seat has both.
 * @param {array} fullHands - 4 hands
 * @param {string} trump - Trump suit
 * @returns {number} Seat (0-3) or -1
 */
export function beloteHolder(fullHands, trump) {
  for (let seat = 0; seat < 4; seat++) {
    const hasK = fullHands[seat].some(c => c.rank === 'R' && c.suit === trump);
    const hasQ = fullHands[seat].some(c => c.rank === 'D' && c.suit === trump);
    if (hasK && hasQ) {
      return seat;
    }
  }
  return -1;
}

// adapters/belote/bidding.mjs — Belote auction (R5)
// Two rounds: round 1 = take turnUp, round 2 = name another suit or pass.

import { SUITS } from './cards.mjs';
import { eldestOrder } from './deal.mjs';

/**
 * Hand strength heuristic for bidding.
 * Jack (V) and 9 of trump are valuable; aces count; others are presence.
 * @param {array} hand - Cards (may include turnUp temporarily for round 1 eval)
 * @param {string} suit - Trump candidate
 * @returns {number} Strength score
 */
export function handStrength(hand, suit) {
  let score = 0;
  for (const c of hand) {
    if (c.suit === suit) {
      if (c.rank === 'V') score += 6;
      else if (c.rank === '9') score += 5;
      else if (c.rank === 'A') score += 3;
      else if (c.rank === '10') score += 2;
      else score += 1; // 7/8/D/R: presence counts
    } else if (c.rank === 'A') {
      score += 2; // Ace outside trump
    } else if (c.rank === '10') {
      score += 1;
    }
  }
  return score;
}

const TAKE_R1 = 8; // Round 1 threshold (with turnUp bonus)
const TAKE_R2 = 9; // Round 2 threshold (stronger hand needed without turnUp)

/**
 * R5: Run the auction (two rounds).
 * Round 1: can take turnUp's suit (and get the card)
 * Round 2: can name any other suit (or pass → redeal)
 *
 * Returns { taker, atout, round } or null if everyone passes.
 *
 * @param {array} hands - 4 hands (5 cards each, before completion)
 * @param {object} turnUp - The turned-up card
 * @param {number} dealer - Dealer seat (determines eldest)
 * @returns {object|null} { taker, atout, round } or null
 */
export function runAuction(hands, turnUp, dealer) {
  if (!hands || hands.length !== 4) {
    throw new Error('Must have 4 hands');
  }
  if (!turnUp) {
    throw new Error('Must have a turnUp card');
  }

  const order = eldestOrder(dealer);
  const candidate = turnUp.suit;

  // Round 1: take turnUp's suit
  for (const p of order) {
    const strength = handStrength([...hands[p], turnUp], candidate);
    if (strength >= TAKE_R1) {
      return { taker: p, atout: candidate, round: 1 };
    }
  }

  // Round 2: name another suit
  for (const p of order) {
    let best = null;
    for (const suit of SUITS) {
      if (suit === candidate) continue; // Can't retake the turnUp suit in round 2
      const strength = handStrength(hands[p], suit);
      if (strength >= TAKE_R2 && (!best || strength > best.strength)) {
        best = { suit, strength };
      }
    }
    if (best) {
      return { taker: p, atout: best.suit, round: 2 };
    }
  }

  return null; // Redeal
}

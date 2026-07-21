// adapters/belote/cards.mjs — Belote card constants and rules (R1, R2, R3, R12)
// EXCLUSIVE holder of Belote constants: 32 cards, two barèmes, two orders, total 152.
// The ONLY Belote file where these numbers live. Core has ZERO hardcoded Belote constants.

import { makeCard } from '../../core/card.mjs';
import { buildDeck } from '../../core/deck.mjs';

// --- R1: Belote deck 32 cards (4 suits × 8 ranks) ---
export const SUITS = ['pique', 'coeur', 'carreau', 'trefle'];
export const RANKS = ['7', '8', '9', '10', 'V', 'D', 'R', 'A'];

// --- R2: Two point barèmes (30 per plain suit, 62 per trump suit) ---
// Non-trump: A=11, 10=10, R=4, D=3, V=2, 9/8/7=0
export const PLAIN_POINTS = { 'A': 11, '10': 10, 'R': 4, 'D': 3, 'V': 2, '9': 0, '8': 0, '7': 0 };

// Trump: V=20, 9=14, A=11, 10=10, R=4, D=3, 8/7=0
export const TRUMP_POINTS = { 'V': 20, '9': 14, 'A': 11, '10': 10, 'R': 4, 'D': 3, '8': 0, '7': 0 };

// --- R3: Two strength orders (for determining trick winner) ---
// Non-trump: 7<8<9<V<D<R<10<A
export const PLAIN_ORDER = ['7', '8', '9', 'V', 'D', 'R', '10', 'A'];

// Trump: 7<8<D<R<10<A<9<V
export const TRUMP_ORDER = ['7', '8', 'D', 'R', '10', 'A', '9', 'V'];

// --- Belote DeckSpec ---
export const beloteDeckSpec = {
  suits: SUITS,
  ranks: RANKS,
  specials: [],
};

/**
 * Build the full Belote deck (32 cards).
 * Delegates to core/deck.buildDeck with Belote's DeckSpec.
 * @returns {array} 32 cards
 */
export function fullDeck() {
  return buildDeck(beloteDeckSpec);
}

/**
 * R2: Point value of a card according to trump.
 * @param {object} card - Card with rank and suit
 * @param {string} trump - Trump suit
 * @returns {number} Points (0-20)
 */
export function cardPoints(card, trump) {
  if (!card.suit || !card.rank) {
    throw new Error(`Card must have suit and rank: ${JSON.stringify(card)}`);
  }
  return card.suit === trump
    ? TRUMP_POINTS[card.rank] || 0
    : PLAIN_POINTS[card.rank] || 0;
}

/**
 * R3: Strength (order position) of a card within its suit.
 * Used to determine trick winner: higher strength wins.
 * @param {object} card - Card with rank and suit
 * @param {string} trump - Trump suit
 * @returns {number} Index in the strength order (0 = weakest)
 */
export function cardStrength(card, trump) {
  if (!card.suit || !card.rank) {
    throw new Error(`Card must have suit and rank: ${JSON.stringify(card)}`);
  }
  const order = card.suit === trump ? TRUMP_ORDER : PLAIN_ORDER;
  const idx = order.indexOf(card.rank);
  if (idx < 0) {
    throw new Error(`Unknown rank ${card.rank} in order`);
  }
  return idx;
}

/**
 * R12: Invariant — total of all card points for any trump.
 * Should always be 152 (before dix de der which adds 10 = 162 base).
 * @param {string} trump - Trump suit (any suit gives same total by Belote rules)
 * @returns {number} Should be 152
 */
export function totalCardPoints(trump) {
  return fullDeck().reduce((sum, c) => sum + cardPoints(c, trump), 0);
}

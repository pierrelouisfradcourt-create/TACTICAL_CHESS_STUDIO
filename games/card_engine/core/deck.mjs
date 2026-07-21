// core/deck.mjs — Generic deck building from a DeckSpec (R15, R14)
// Deck size and composition are PARAMETRIC — no hardcoded 32 or 78.
// Provides helpers for multiset conservation (no card created or lost).

import { makeCard } from './card.mjs';

// Re-export makeCard for convenience
export { makeCard };

/**
 * Build a complete deck from a DeckSpec.
 * @param {object} deckSpec - { suits: [], ranks: [], specials: [] }
 *   suits, ranks: arrays that will be Cartesian product
 *   specials: array of pre-built card objects (e.g., Tarot Excuse)
 * @returns {array} Array of cards in deterministic order.
 */
export function buildDeck(deckSpec) {
  const { suits = [], ranks = [], specials = [] } = deckSpec;
  const deck = [];

  // Cartesian product: suits × ranks
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(makeCard({ rank, suit, id: `${rank}-${suit}` }));
    }
  }

  // Add special cards (e.g., Excuse)
  for (const special of specials) {
    deck.push(makeCard(special));
  }

  return deck;
}

/**
 * Assert that a multiset of cards equals the reference deck by id.
 * This proves conservation: no card created or lost.
 * @param {array} cards - Cards to check
 * @param {array} reference - Reference deck (fullDeck or equivalent)
 * @throws {Error} If multisets differ
 */
export function assertMultisetConserved(cards, reference) {
  // Count occurrences by id
  const cardIds = cards.map(c => c.id).sort();
  const refIds = reference.map(c => c.id).sort();

  if (cardIds.length !== refIds.length) {
    throw new Error(`Multiset size mismatch: ${cardIds.length} vs ${refIds.length}`);
  }

  for (let i = 0; i < cardIds.length; i++) {
    if (cardIds[i] !== refIds[i]) {
      throw new Error(`Multiset mismatch at position ${i}: ${cardIds[i]} vs ${refIds[i]}`);
    }
  }
}

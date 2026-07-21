// core/card.mjs — Generic card identity (R1)
// A card is an object with a stable, unique, opaque id assigned by the DeckSpec.
// The core makes no assumptions about rank or suit — only that id is stable and unique.

/**
 * Create a generic card. The id is opaque and immutable.
 * @param {object} attrs - Attributes provided by the DeckSpec (rank, suit, etc.)
 * @returns {object} Card with id and all attributes from attrs.
 */
export function makeCard(attrs) {
  if (!attrs || typeof attrs !== 'object' || !('id' in attrs)) {
    throw new Error('Card attrs must be an object with id property');
  }
  return { ...attrs };
}

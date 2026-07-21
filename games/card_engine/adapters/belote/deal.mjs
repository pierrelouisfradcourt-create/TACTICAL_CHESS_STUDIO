// adapters/belote/deal.mjs — Belote distribution (R4)
// Two-phase deal: initial (5/player + turnUp + talon), then completion to 8.

/**
 * Order of players starting from eldest (dealer+1).
 * Used for distribution and turn order.
 * @param {number} dealer - Dealer seat (0-3)
 * @returns {array} Array of 4 seats in play order
 */
export function eldestOrder(dealer) {
  // Eldest is dealer+1, then +2, +3, 0
  return [1, 2, 3, 0].map(offset => (dealer + offset) % 4);
}

/**
 * R4: Phase 1 — Initial distribution.
 * Deal 3 then 2 cards to each player in order, total 5 per player.
 * Next card is turnUp (for bidding). Remaining 11 = talon.
 *
 * @param {number} dealer - Dealer seat (0-3)
 * @param {array} deck - Already shuffled and cut deck
 * @returns {object} { hands: [[], [], [], []], turnUp: card, talon: [cards...] }
 */
export function deal(dealer, deck) {
  if (!Array.isArray(deck) || deck.length !== 32) {
    throw new Error(`Deck must be an array of 32 cards, got ${deck.length}`);
  }

  const hands = [[], [], [], []];
  const order = eldestOrder(dealer);
  let k = 0;

  // Phase 1a: 3 cards to each player
  for (const size of [3, 2]) {
    for (const p of order) {
      for (let n = 0; n < size; n++) {
        hands[p].push(deck[k++]);
      }
    }
  }

  // Phase 1b: turnUp and talon
  const turnUp = deck[k++];
  const talon = deck.slice(k); // remaining 11 cards

  return { hands, turnUp, talon };
}

/**
 * R4: Phase 2 — Completion after auction.
 * Taker receives turnUp, then talon is distributed:
 *   Taker gets 2 more (total 5+1+2=8)
 *   Others get 3 more each (total 5+3=8)
 *
 * Does not mutate input hands.
 *
 * @param {array} hands - 4 hands from deal() (5 cards each)
 * @param {number} taker - Taker seat (0-3)
 * @param {object} turnUp - The turnUp card
 * @param {array} talon - 11 remaining cards
 * @param {number} dealer - Dealer (for distribution order)
 * @returns {array} 4 new hands with 8 cards each
 */
export function completeDeal(hands, taker, turnUp, talon, dealer) {
  if (hands.length !== 4) {
    throw new Error(`Hands must have 4 players`);
  }

  // Copy hands
  const full = hands.map(h => h.slice());

  // Taker gets the turnUp
  full[taker].push(turnUp);

  // Distribute talon in eldest order
  const pile = talon.slice();
  const order = eldestOrder(dealer);

  for (const p of order) {
    const need = 8 - full[p].length; // taker = 2, others = 3
    if (need > 0) {
      for (let n = 0; n < need; n++) {
        if (pile.length === 0) {
          throw new Error(`Talon exhausted before completing all hands`);
        }
        full[p].push(pile.shift());
      }
    }
  }

  if (pile.length > 0) {
    throw new Error(`Talon not fully distributed: ${pile.length} cards remain`);
  }

  return full;
}

// adapters/stub/minimal.mjs — Minimal non-Belote adapter (R15 extensibility proof)
// "High card" game: 2 players, 2 seats per team, simple rules.
// Proves core is content-agnostic: zero Belote constants, different topology.

import { assertRulesAdapter } from '../../core/rules_interface.mjs';
import { assertScoreAdapter } from '../../core/score_interface.mjs';
import { buildDeck, makeCard } from '../../core/deck.mjs';

/**
 * Create a minimal deck spec for a 2-player high-card game.
 * Simple: 4 suits × 13 ranks (standard poker deck).
 * @returns {object} DeckSpec
 */
function createMinimalDeckSpec() {
  return {
    suits: ['spade', 'heart', 'diamond', 'club'],
    ranks: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    specials: [],
  };
}

/**
 * Build the minimal deck.
 * @returns {array} 52 cards
 */
function createMinimalDeck() {
  return buildDeck(createMinimalDeckSpec());
}

/**
 * Minimal Rules adapter (not Belote).
 * @returns {object} Rules adapter
 */
function createMinimalRulesAdapter() {
  return {
    // Simple structure: 2 seats, 1 trick each (trivial game)
    seatCount: 2,
    trickCount: 1,
    deckSpec: createMinimalDeckSpec(),

    teamOf: (seat) => seat % 2, // seats 0&2 vs 1&3 (unused for 2 seats)
    partnerOf: (seat) => null, // No partner in 2-player game

    // Trivial deal (not used, but required by interface)
    deal: (dealer, deck) => ({
      hands: [deck.slice(0, 26), deck.slice(26, 52)],
      turnUp: null,
      talon: [],
    }),

    completeDeal: undefined, // Not used in this trivial game

    runAuction: (hands, ctx) => ({
      taker: 0,
      trump: 'spade',
      round: 1,
    }),

    // Legal moves: high card always legal
    legalMoves: (hand, trick, contract, seat) => {
      if (trick.length === 0) return hand.slice();
      return hand.slice(); // All cards always legal in trivial game
    },

    // Comparator: higher rank wins (ignoring suit)
    compareInTrick: (cardA, cardB, led, contract) => {
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      const aVal = ranks.indexOf(cardA.rank);
      const bVal = ranks.indexOf(cardB.rank);
      return aVal - bVal;
    },

    // Winner: highest card
    trickWinner: (trick, contract) => {
      const { plays } = trick;
      let best = plays[0];
      for (let i = 1; i < plays.length; i++) {
        if (
          ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(plays[i].card.rank) >
          ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(best.card.rank)
        ) {
          best = plays[i];
        }
      }
      return { seat: best.seat };
    },

    // No reassignment
    reassignCapture: undefined,
  };
}

/**
 * Minimal Score adapter (not Belote).
 * @returns {object} Score adapter
 */
function createMinimalScoreAdapter() {
  return {
    // Card value: simple point value
    cardValue: (card, contract) => {
      const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
      return values[card.rank] || 0;
    },

    // Deal score: trivial (just count high card points)
    scoreDeal: (tricks, contract, ctx) => {
      const pointsByTeam = [0, 0];
      for (const trick of tricks) {
        const team = trick.winner % 2;
        for (const card of trick.cards) {
          const val = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(card.rank) + 2;
          pointsByTeam[team] += val;
        }
      }
      const scores = pointsByTeam.slice();
      return {
        pointsByTeam,
        base: scores,
        scores,
        contractMet: true,
        capot: false,
        dedans: false,
      };
    },

    bonusHooks: undefined,
  };
}

/**
 * Create the complete minimal (non-Belote) adapter.
 * Proves R15 extensibility: zero Belote constants, different topology (2 seats, 1 trick).
 * @returns {object} Minimal adapter
 */
export function createStubAdapter() {
  const rules = createMinimalRulesAdapter();
  const score = createMinimalScoreAdapter();

  // Validate contracts
  assertRulesAdapter(rules);
  assertScoreAdapter(score);

  return {
    name: 'stub-minimal',
    rules,
    score,
    deckSpec: createMinimalDeckSpec(),
  };
}

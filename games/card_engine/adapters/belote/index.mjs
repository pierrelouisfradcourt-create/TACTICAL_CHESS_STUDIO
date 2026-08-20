// adapters/belote/index.mjs — Belote Rules + Score adapter assembly
// Exposes the unique Rules and Score interfaces for the core.

import { assertRulesAdapter } from '../../core/rules_interface.mjs';
import { assertScoreAdapter } from '../../core/score_interface.mjs';
import { beloteDeckSpec, fullDeck, cardPoints, cardStrength, totalCardPoints } from './cards.mjs';
import { deal, completeDeal, eldestOrder } from './deal.mjs';
import { runAuction } from './bidding.mjs';
import { BELOTE_SEAT_COUNT, BELOTE_TRICK_COUNT, teamOf, partnerOf, legalMoves, compareInTrick, trickWinner, beloteTeam } from './rules.mjs';
import { scoreDeal } from './scoring.mjs';

/**
 * Create the Belote Rules adapter (satisfies core/rules_interface contract).
 * @returns {object} Rules adapter
 */
export function createBeloteRulesAdapter() {
  return {
    // Structure
    seatCount: BELOTE_SEAT_COUNT, // 4 seats
    trickCount: BELOTE_TRICK_COUNT, // 8 tricks per deal
    teamOf,
    partnerOf,
    deckSpec: beloteDeckSpec,

    // Deal phases
    deal,
    completeDeal,
    runAuction,

    // Trick play
    legalMoves,
    compareInTrick,
    trickWinner,

    // Optional: reassignment hook (no-op for Belote)
    reassignCapture: undefined,
  };
}

/**
 * Create the Belote Score adapter (satisfies core/score_interface contract).
 * @returns {object} Score adapter
 */
export function createBeloteScoreAdapter() {
  return {
    // Card values
    cardValue: cardPoints,

    // Deal scoring
    scoreDeal,

    // Optional: bonus hooks
    bonusHooks: undefined,
  };
}

/**
 * Create the complete Belote adapter (both Rules and Score).
 * @returns {object} { rules, score, fullDeck, ... }
 */
export function createBeloteAdapter() {
  const rules = createBeloteRulesAdapter();
  const score = createBeloteScoreAdapter();

  // Validate contracts
  assertRulesAdapter(rules);
  assertScoreAdapter(score);

  // Return combined adapter
  return {
    name: 'belote',
    rules,
    score,
    fullDeck,
    beloteDeckSpec,
    cardPoints,
    cardStrength,
    totalCardPoints,
    eldestOrder,
    beloteTeam,
  };
}

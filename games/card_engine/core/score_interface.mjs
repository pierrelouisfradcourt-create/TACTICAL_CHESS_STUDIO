// core/score_interface.mjs — Score contract (R15)
// Scoring interface is game-agnostic. No baremes, no seuils, no capot values in core.
// All scoring logic lives in the adapter's scoreDeal implementation.

/**
 * Assert that an adapter honors the Score contract.
 * SIGNATURE SCORE (blueprint decision s4 no.1):
 *  - cardValue(card, contract) -> number
 *    (core does NOT assume integer — Tarot can use tenths like 4.5 without touching core)
 *  - scoreDeal(tricks, contract, ctx) -> ScoreResult
 *    { pointsByTeam[], base, bonuses[], contractMet:bool, scores[] }
 *    EVALUATION OF CONTRACT lives INSIDE scoreDeal, not in core
 *    (driven by captured cards, e.g., oudlers threshold 36/41/51/56 Tarot or seuil 82 Belote)
 *  - bonusHooks[]?: declarations and terminal bonuses (belote-rebelote, announcements, poignées)
 *
 * POST-CONDITIONS verified:
 *  - cardValue returns a number (int or fractional)
 *  - scoreDeal returns a ScoreResult with pointsByTeam.length = number of teams
 *  - scores[team] is a number and consistent with evaluation logic
 *
 * @param {object} adapter - Candidate Score adapter
 * @throws {Error} If adapter does not satisfy the contract
 */
export function assertScoreAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('Adapter must be an object');
  }

  // Check required methods
  const required = ['cardValue', 'scoreDeal'];

  for (const field of required) {
    if (!(field in adapter)) {
      throw new Error(`Adapter missing required field: ${field}`);
    }
  }

  if (typeof adapter.cardValue !== 'function') {
    throw new Error(`Adapter.cardValue must be a function`);
  }

  if (typeof adapter.scoreDeal !== 'function') {
    throw new Error(`Adapter.scoreDeal must be a function`);
  }

  // Behavioral post-condition: cardValue returns a number
  // (Full validation happens during scoring of actual deals)
}

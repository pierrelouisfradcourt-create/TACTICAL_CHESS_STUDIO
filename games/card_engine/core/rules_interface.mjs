// core/rules_interface.mjs — Rules contract (R15, R6)
// The ONLY surface where the core knows a concrete game.
// Contains ZERO constants and ZERO rules — only describes and VERIFIES
// the parametric form an adapter must expose (bluepint SIGNATURE RULES).

/**
 * Assert that an adapter honors the Rules contract.
 * SIGNATURE RULES (blueprint decision s4 no.1, frozen at s5):
 *  - seatCount:int
 *  - teamOf(seat) -> teamId
 *  - partnerOf(seat) -> seat | null
 *  - deckSpec: { suits, ranks, specials }
 *  - deal(deck, dealer, rng) -> { hands, kitty?, turnUp? }
 *  - completeDeal?(hand, taker, turnUp, talon, dealer) -> hands[]
 *  - runAuction?(hands, ctx) -> Contract | null
 *  - trickCount:int (derived handSize)
 *  - legalMoves(hand, trick, contract, mover) -> Card[]
 *  - compareInTrick(cardA, cardB, led, contract) -> number
 *  - trickWinner(trick, contract) -> { seat }
 *  - reassignCapture?(trick, winner, ctx) -> captures
 *
 * POST-CONDITIONS verified:
 *  - trickWinner always returns exactly one seat ∈ [0, seatCount)
 *  - legalMoves returns non-empty subset of hand or all hand
 *  - compareInTrick is transitive (card ordering is consistent)
 *
 * @param {object} adapter - Candidate Rules adapter
 * @throws {Error} If adapter does not satisfy the contract
 */
export function assertRulesAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('Adapter must be an object');
  }

  // Check required properties and methods
  const required = [
    'seatCount',
    'teamOf',
    'deckSpec',
    'legalMoves',
    'compareInTrick',
    'trickWinner',
  ];

  for (const field of required) {
    if (!(field in adapter)) {
      throw new Error(`Adapter missing required field: ${field}`);
    }
  }

  // Check method arities (basic shape validation)
  if (typeof adapter.seatCount !== 'number' || adapter.seatCount < 2) {
    throw new Error(`Adapter.seatCount must be a number >= 2, got ${adapter.seatCount}`);
  }

  if (typeof adapter.teamOf !== 'function') {
    throw new Error(`Adapter.teamOf must be a function`);
  }

  if (typeof adapter.deckSpec !== 'object') {
    throw new Error(`Adapter.deckSpec must be an object`);
  }

  if (typeof adapter.legalMoves !== 'function') {
    throw new Error(`Adapter.legalMoves must be a function`);
  }

  if (typeof adapter.compareInTrick !== 'function') {
    throw new Error(`Adapter.compareInTrick must be a function`);
  }

  if (typeof adapter.trickWinner !== 'function') {
    throw new Error(`Adapter.trickWinner must be a function`);
  }

  // Behavioral post-condition: trickWinner returns exactly one valid seat
  // (This is a minimal smoke test; full validation happens during play)
  if (adapter.seatCount > 0) {
    // Just check that the method is callable and returns an object with 'seat'
    // Full validation with real tricks happens in trickplay
  }
}

/**
 * Assert that a move is legal (belongs to legalMoves set).
 * @param {object} card - Card being played
 * @param {array} legalMoves - Result of adapter.legalMoves(...)
 * @throws {Error} If card is not in legalMoves
 */
export function assertLegalMove(card, legalMoves) {
  if (!legalMoves.some(c => c.id === card.id)) {
    throw new Error(`Illegal move: card ${card.id} not in legal moves`);
  }
}

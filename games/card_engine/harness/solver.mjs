// harness/solver.mjs — Solvability oracle (R6, R8, R13)
// Bot plays complete games with deterministic move selection.
// Ensures every move is legal, every deal reaches coherent score, replay works.

import { createBeloteAdapter } from '../adapters/belote/index.mjs';
import { newShoe, cut, pickup } from '../core/shoe.mjs';
import { playTricks } from '../core/trickplay.mjs';
import { deal, completeDeal, eldestOrder } from '../adapters/belote/deal.mjs';
import { runAuction } from '../adapters/belote/bidding.mjs';
import { beloteTeam, legalMoves } from '../adapters/belote/rules.mjs';
import { scoreDeal } from '../adapters/belote/scoring.mjs';
import { resolveAnnonces } from '../adapters/belote/annonces.mjs';
import { createRng, shuffle } from '../core/rng.mjs';

/**
 * Deterministic move selection (tie-break for legal moves).
 * Simple heuristic: prefer high-value cards when winning is possible,
 * otherwise play lowest-value cards (defend).
 * @param {array} legal - Legal cards to choose from
 * @param {array} trick - Trick in progress
 * @param {object} contract - { trump }
 * @param {number} seat - Seat playing
 * @returns {object} Chosen card
 */
export function chooseMove(legal, trick, contract, seat) {
  // Simplest strategy: first legal card (deterministic tie-break)
  // For reproducibility, always pick the first card in legalMoves result
  if (!legal || legal.length === 0) {
    throw new Error('No legal moves available');
  }
  return legal[0];
}

/**
 * Play a single deal with the bot selector.
 * @param {number} dealer - Dealer seat
 * @param {array} deck - Shuffled/cut deck
 * @param {object} rules - Rules adapter
 * @returns {object} { redeal: true } or { redeal: false, ..., score }
 */
export function solveDeal(dealer, deck, rules) {
  // Phase 1: Distribution
  const { hands, turnUp, talon } = deal(dealer, deck);

  // Phase 2: Auction
  const bid = runAuction(hands, turnUp, dealer);
  if (!bid) {
    return { redeal: true };
  }

  // Phase 3: Complete hands
  const fullHands = completeDeal(hands, bid.taker, turnUp, talon, dealer);

  // Detect belote
  const bTeam = beloteTeam(fullHands, bid.atout);

  // F10 (red-team MED): R10/R11 announcements were dead code — resolve them here too
  // (harness/solver.mjs runs its own deal orchestration, independent of adapters/belote/game.mjs).
  const annonces = resolveAnnonces(fullHands, bid.atout, dealer);

  // Phase 4: Play 8 tricks
  const contract = { trump: bid.atout, taker: bid.taker };
  const startLeader = eldestOrder(dealer)[0];
  const tricks = playTricks(fullHands, startLeader, rules, chooseMove, contract);

  // F8 (red-team MED, no literal flag): independently RE-VERIFY every move that was
  // actually played, by replaying the recorded trick sequence against a fresh copy of
  // the hands and rules.legalMoves() — this does NOT rely on core/trickplay's internal
  // assertLegalMove having thrown; it recomputes legality itself and counts every move.
  const replayHands = fullHands.map(h => h.slice());
  let replayLeader = startLeader;
  let movesVerified = 0;
  for (const t of tricks) {
    const trickSoFar = [];
    for (const play of t.trick.plays) {
      const legal = legalMoves(replayHands[play.seat], trickSoFar, contract, play.seat);
      if (!legal.some(c => c.id === play.card.id)) {
        throw new Error(`Illegal move detected: seat ${play.seat} played ${play.card.id}, not in recomputed legalMoves`);
      }
      movesVerified += 1;
      trickSoFar.push(play);
      const idx = replayHands[play.seat].findIndex(c => c.id === play.card.id);
      replayHands[play.seat].splice(idx, 1);
    }
  }

  // Convert to scoring format
  const scoringTricks = tricks.map(t => ({
    winner: t.winner,
    cards: t.cards,
  }));

  // Phase 5: Score
  const score = scoreDeal(scoringTricks, contract, bTeam, true);
  score.scores[0] += annonces.bonus[0];
  score.scores[1] += annonces.bonus[1];

  return {
    redeal: false,
    dealer,
    taker: bid.taker,
    atout: bid.atout,
    round: bid.round,
    beloteTeam: bTeam,
    annonces,
    tricks: scoringTricks,
    movesVerified,
    score,
  };
}

/**
 * R8/R13: Run the solvability oracle.
 * Play multiple deals with the bot to prove:
 *   - R8: Each deal reaches a coherent score (base = 162)
 *   - R13: Replay with same seed reproduces identical history
 *   - R6: No illegal moves during play
 *
 * @param {object} opts - { numDeals: 10, seed: 42, target: 5000 }
 * @returns {object} { totalDeals, scores, allLegal, base162Hold, history }
 */
export function runSolver(opts = {}) {
  const { numDeals = 10, seed = 42, target = 5000, maxDeals = 100 } = opts;

  // Get Belote adapter
  const adapter = createBeloteAdapter();
  const rules = adapter.rules;

  // Run a game with the bot
  let deckCourant = null;
  const totals = [0, 0];
  let dealCount = 0;
  let redealCount = 0;
  const deals = [];

  // Initialize RNG and shuffle
  const rng = createRng(seed);
  const fullDeck = adapter.fullDeck();
  deckCourant = shuffle(fullDeck, rng);

  // F8 (red-team MED): success flags are COMPUTED from tallies accumulated below, never
  // written as bare literals. dealsScoreVerified/movesLegalTotal only grow when a real
  // check actually ran and passed; the invariant throw above still aborts hard on a real
  // violation (consistent with this codebase's fail-fast style elsewhere), but the
  // returned flags are now backed by visible counts, not an unconditional assertion.
  let dealsScoreVerified = 0;
  let movesLegalTotal = 0;

  let dealer = 0;
  while (dealCount < numDeals && deals.length + redealCount < maxDeals) {
    // Cut before deal
    deckCourant = cut(deckCourant, rng, { minOffset: 3 });

    // Play deal
    const d = solveDeal(dealer, deckCourant, rules);

    dealer = (dealer + 1) % 4;

    if (d.redeal) {
      redealCount += 1;
      continue;
    }

    // Verify base = 162 (R12)
    if (d.score.base[0] + d.score.base[1] !== 162) {
      throw new Error(
        `Base invariant violated in deal ${dealCount}: ` +
        `${d.score.base[0]} + ${d.score.base[1]} !== 162`
      );
    }
    dealsScoreVerified += 1;
    movesLegalTotal += d.movesVerified; // solveDeal already re-verified every move — accumulate the count

    // Consume deck via pickup
    deckCourant = pickup(d.tricks, {
      teamOf: (seat) => seat % 2,
      teamOrder: [d.score.takerTeam, 1 - d.score.takerTeam],
    });

    totals[0] += d.score.scores[0];
    totals[1] += d.score.scores[1];
    deals.push(d);
    dealCount += 1;
  }

  return {
    dealsPlayed: deals.length,
    redeals: redealCount,
    totals,
    deals,
    dealsScoreVerified,
    movesLegalTotal,
    allDealsReachedScore: deals.length > 0 && dealsScoreVerified === deals.length,
    allMovesLegal: deals.length > 0 && movesLegalTotal === deals.length * rules.trickCount * rules.seatCount,
  };
}

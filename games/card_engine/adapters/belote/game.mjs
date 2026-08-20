// adapters/belote/game.mjs — Belote orchestration (R13, R8)
// Composes shoe/trickplay/phases. One game = multiple deals until target score.

import { newShoe, cut, pickup } from '../../core/shoe.mjs';
import { playTricks } from '../../core/trickplay.mjs';
import { createRng, shuffle } from '../../core/rng.mjs';
import { deal, completeDeal, eldestOrder } from './deal.mjs';
import { runAuction } from './bidding.mjs';
import { beloteTeam } from './rules.mjs';
import { scoreDeal } from './scoring.mjs';
import { resolveAnnonces } from './annonces.mjs';
import { createBeloteAdapter } from './index.mjs';

/**
 * Minimal move selector (tie-break for legal moves).
 * Tries to win cheaply, otherwise defends.
 * @param {array} legal - Legal cards
 * @param {array} trick - Current trick plays
 * @param {object} contract - { trump }
 * @param {number} seat - Seat playing
 * @returns {object} Chosen card
 */
function chooseMove(legal, trick, contract, seat) {
  // Placeholder: for now, just pick first legal
  // A full implementation would use a more sophisticated heuristic
  return legal[0];
}

/**
 * Play a complete deal (8 tricks until score).
 * @param {number} dealer - Dealer seat
 * @param {array} deck - Already shuffled/cut deck
 * @param {object} beloteRules - The Belote rules adapter
 * @returns {object} { redeal: true } or { redeal: false, dealer, taker, atout, tricks, score }
 */
export function playDeal(dealer, deck, beloteRules) {
  // Phase 1: Initial distribution
  const { hands, turnUp, talon } = deal(dealer, deck);

  // Phase 2: Auction
  const bid = runAuction(hands, turnUp, dealer);
  if (!bid) {
    return { redeal: true };
  }

  // Phase 3: Complete hands
  const fullHands = completeDeal(hands, bid.taker, turnUp, talon, dealer);

  // Detect belote (R+D of trump in any hand)
  const bTeam = beloteTeam(fullHands, bid.atout);

  // R10/R11 (F10, red-team MED): resolve sequence/carré announcements BEFORE play
  // (declaration is based on the completed 8-card hands) — was previously dead code,
  // never wired into the actual deal orchestration. Winning team's bonus is folded
  // into the final score below (bonus is [0,0] whenever nothing was declared or an
  // opposing-team perfect tie cancelled it — safe to always add).
  const annonces = resolveAnnonces(fullHands, bid.atout, dealer);

  // Phase 4: Play 8 tricks
  const contract = { trump: bid.atout, taker: bid.taker };
  const tricks = playTricks(fullHands, eldestOrder(dealer)[0], beloteRules, chooseMove, contract);

  // Convert trick format from core/trickplay to scoring format
  const scoringTricks = tricks.map(t => ({
    winner: t.winner,
    cards: t.cards,
  }));

  // Phase 5: Score
  const score = scoreDeal(scoringTricks, contract, bTeam, true); // true = belote declared by bot
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
    score,
  };
}

/**
 * Play a complete game until target score.
 * F11 fix (red-team MED): `beloteRules` is the RULES sub-adapter (same shape playDeal
 * passes into core/trickplay — seatCount/legalMoves/compareInTrick/...), which has NO
 * fullDeck()/createRng()/shuffle(). The previous version destructured those straight off
 * `beloteRules` and threw a TypeError on every call (`shuffle is not a function`) — this
 * was the only "whole game" entry point and it was never actually exercisable.
 * Deck creation now goes through the full adapter + core/rng.mjs directly; `beloteRules`
 * stays optional and, if omitted, defaults to a fresh Belote rules adapter.
 * @param {object} opts - { target: 1000, seed: 1, startDealer: 0, maxDeals: 200 }
 * @param {object} [beloteRules] - Rules sub-adapter for playTricks (defaults to Belote's own)
 * @returns {object} { totals, winner, deals, dealsPlayed, redeals }
 */
export function playGame(opts = {}, beloteRules) {
  const { target = 1000, seed = 1, startDealer = 0, maxDeals = 200 } = opts;

  const adapter = createBeloteAdapter();
  const rulesAdapter = beloteRules || adapter.rules;

  // Create RNG and initial shoe (core/rng.mjs — the single source of truth for shuffling)
  const rng = createRng(seed);
  const shuffled = shuffle(adapter.fullDeck(), rng);

  let deckCourant = shuffled;
  const totals = [0, 0];
  const deals = [];
  let dealer = startDealer;
  let redeals = 0;

  while (Math.max(...totals) < target && deals.length + redeals < maxDeals) {
    // Cut before each deal
    deckCourant = cut(deckCourant, rng, { minOffset: 3 });

    // Play one deal
    const d = playDeal(dealer, deckCourant, rulesAdapter);

    // Advance dealer
    dealer = (dealer + 1) % 4;

    if (d.redeal) {
      redeals += 1;
      continue; // Deck not consumed, re-cut next iteration
    }

    // Redeal didn't happen: consume deck
    deckCourant = pickup(d.tricks, {
      teamOf: (seat) => seat % 2,
      teamOrder: [d.score.takerTeam, 1 - d.score.takerTeam],
    });

    // Accumulate scores
    totals[0] += d.score.scores[0];
    totals[1] += d.score.scores[1];
    deals.push({ ...d, totalsAfter: totals.slice() });
  }

  const winner = totals[0] === totals[1] ? -1 : totals[0] > totals[1] ? 0 : 1;
  return { totals, winner, deals, dealsPlayed: deals.length, redeals };
}

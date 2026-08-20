// adapters/belote/scoring.mjs — Belote scoring (R8, R9, R12)
// Base 162, contract 82, capot 250. Belote +20 (if declared).
// EXCLUSIVE holder of Belote seuils and barèmes.

import { cardPoints, PLAIN_POINTS, TRUMP_POINTS } from './cards.mjs';
import { teamOf } from './rules.mjs';

export const CONTRACT_MIN = 82; // Taker must reach this
export const CAPOT_POINTS = 250; // All 8 tricks
export const BELOTE_BONUS = 20; // King + Queen of trump

/**
 * R8/R9/R12: Score a completed deal.
 *
 * @param {array} tricks - [{ winner, cards }, ...] (8 tricks)
 * @param {object} contract - { trump: suit, taker: seat }
 * @param {number} beloteTeamIdx - Team holding K+D of trump (-1 if none)
 * @param {boolean} beloteDeclared - Whether belote was declared (default true for bot)
 * @returns {object} Detailed score { pointsByTeam, base, belote, scores, contractMet, capot, dedans }
 */
export function scoreDeal(tricks, contract, beloteTeamIdx, beloteDeclared = true) {
  const { trump, taker } = contract;
  const takerTeam = teamOf(taker);
  const defTeam = 1 - takerTeam;

  // --- Card points by team + dix de der ---
  const pointsByTeam = [0, 0];
  const tricksWon = [0, 0];

  for (const trick of tricks) {
    const team = teamOf(trick.winner);
    tricksWon[team] += 1;
    for (const card of trick.cards) {
      pointsByTeam[team] += cardPoints(card, trump);
    }
  }

  // Dix de der: +10 to winner of last trick (R8 base = 162)
  const lastTrickWinner = teamOf(tricks[tricks.length - 1].winner);
  const base = pointsByTeam.slice();
  base[lastTrickWinner] += 10;

  // --- R12: Invariant check ---
  if (base[0] + base[1] !== 162) {
    throw new Error(`Base invariant violated: ${base[0]} + ${base[1]} !== 162`);
  }

  // --- R9: Belote-rebelote bonus (only if declared) ---
  const belote = [0, 0];
  if (beloteTeamIdx !== -1 && beloteDeclared) {
    belote[beloteTeamIdx] = BELOTE_BONUS;
  }

  // --- R8: Evaluate contract ---
  const capotTeam = tricksWon[0] === 8 ? 0 : tricksWon[1] === 8 ? 1 : -1;
  const scores = [0, 0];
  let contractMet = false;
  let dedans = false;

  if (capotTeam !== -1) {
    // Capot: team that won all 8 tricks scores CAPOT_POINTS
    // Other team scores only its belote bonus
    scores[capotTeam] = CAPOT_POINTS + belote[capotTeam];
    scores[1 - capotTeam] = belote[1 - capotTeam];
    dedans = capotTeam === defTeam; // Taker capoté = dedans (failed)
    contractMet = capotTeam === takerTeam; // Taker has capot = success
  } else if (base[takerTeam] >= CONTRACT_MIN) {
    // Normal: taker succeeded (>= 82)
    scores[takerTeam] = base[takerTeam] + belote[takerTeam];
    scores[defTeam] = base[defTeam] + belote[defTeam];
    contractMet = true;
  } else {
    // Taker dedans: defense encashes all 162 points
    scores[defTeam] = 162 + belote[defTeam];
    scores[takerTeam] = belote[takerTeam];
    dedans = true;
    contractMet = false;
  }

  return {
    pointsByTeam,
    base,
    belote,
    tricksWon,
    scores,
    contractMet,
    capot: capotTeam !== -1,
    capotTeam: capotTeam === -1 ? -1 : capotTeam,
    dedans,
    taker,
    takerTeam,
    defTeam,
  };
}

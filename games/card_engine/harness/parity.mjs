// harness/parity.mjs — Parity checking against golden source (R6, R7, R8)
// Replays golden scenarios and verifies CardEngine produces identical results.
// NORMALIZATION LAYER (F2 correction): maps {player, card} -> {seat}

import { createBeloteAdapter } from '../adapters/belote/index.mjs';

/**
 * F2 Correction: Normalize golden {player, card} format to {seat}.
 * Golden uses 'player', CardEngine uses 'seat' — this layer maps.
 *
 * @param {object} golden - Result from belote-claude (may have {player, card})
 * @param {string} field - Field name ('player' or 'seat')
 * @returns {object} Normalized result
 */
export function normalizeGoldenResult(golden, field = 'player') {
  if (typeof golden === 'object' && field in golden) {
    return {
      seat: golden[field], // Rename player -> seat
    };
  }
  return golden;
}

/**
 * R6 Parity: Compare legal moves.
 * Verifies CardEngine.legalMoves == golden.legalMoves (set equality).
 *
 * @param {array} ceMovesIds - CardEngine's legal moves (card ids)
 * @param {array} goldenMovesIds - Golden's legal moves (card ids)
 * @returns {boolean} true if identical (set equality)
 * @throws {Error} If not equal
 */
export function checkLegalParity(ceMovesIds, goldenMovesIds) {
  const ceSet = new Set(ceMovesIds);
  const goldenSet = new Set(goldenMovesIds);

  if (ceSet.size !== goldenSet.size) {
    throw new Error(
      `Legal moves count mismatch: CardEngine ${ceSet.size} vs Golden ${goldenSet.size}`
    );
  }

  for (const id of ceSet) {
    if (!goldenSet.has(id)) {
      throw new Error(`CardEngine move ${id} not in Golden set`);
    }
  }

  return true;
}

/**
 * R7 Parity: Compare trick winner.
 * Verifies CardEngine.trickWinner == golden.trickWinner (same seat).
 *
 * @param {number} ceSeat - CardEngine winner seat
 * @param {number} goldenSeat - Golden winner seat (mapped from 'player')
 * @returns {boolean} true if identical
 * @throws {Error} If not equal
 */
export function checkWinnerParity(ceSeat, goldenSeat) {
  if (ceSeat !== goldenSeat) {
    throw new Error(`Trick winner mismatch: CardEngine seat ${ceSeat} vs Golden seat ${goldenSeat}`);
  }
  return true;
}

/**
 * R8 Parity: Compare deal score.
 * Verifies all score fields match exactly (pointsByTeam, base, scores, etc.).
 *
 * @param {object} ceScore - CardEngine scoreDeal result
 * @param {object} goldenScore - Golden scoreDeal result
 * @returns {boolean} true if identical
 * @throws {Error} If any field differs
 */
export function checkScoreParity(ceScore, goldenScore) {
  const fields = ['pointsByTeam', 'base', 'belote', 'tricksWon', 'scores'];

  for (const field of fields) {
    if (!Array.isArray(ceScore[field]) || !Array.isArray(goldenScore[field])) {
      throw new Error(`Score field ${field} not an array`);
    }
    if (ceScore[field].length !== goldenScore[field].length) {
      throw new Error(
        `Score[${field}] length mismatch: ${ceScore[field].length} vs ${goldenScore[field].length}`
      );
    }
    for (let i = 0; i < ceScore[field].length; i++) {
      if (ceScore[field][i] !== goldenScore[field][i]) {
        throw new Error(
          `Score[${field}][${i}] mismatch: ${ceScore[field][i]} vs ${goldenScore[field][i]}`
        );
      }
    }
  }

  // Also verify boolean flags
  if (ceScore.contractMet !== goldenScore.contractMet) {
    throw new Error(`contractMet mismatch: ${ceScore.contractMet} vs ${goldenScore.contractMet}`);
  }
  if (ceScore.dedans !== goldenScore.dedans) {
    throw new Error(`dedans mismatch: ${ceScore.dedans} vs ${goldenScore.dedans}`);
  }

  return true;
}

/**
 * Execute all parity checks on a golden scenario.
 * Returns detailed results and throws on first mismatch.
 *
 * @param {object} golden - Golden scenario from belote-claude
 * @param {object} ceResults - CardEngine results for same scenario
 * @returns {object} { passed: bool, checks: [...], errors: [...] }
 */
export function runParityCheck(golden, ceResults) {
  const checks = [];
  const errors = [];

  try {
    // R6: Legal moves
    if (golden.legalMoves && ceResults.legalMoves) {
      const goldenIds = golden.legalMoves.map(c => c.id);
      const ceIds = ceResults.legalMoves.map(c => c.id);
      checkLegalParity(ceIds, goldenIds);
      checks.push({ rule: 'R6', check: 'legalMoves', passed: true });
    }

    // R7: Trick winner
    if (golden.trickWinner && ceResults.trickWinner) {
      const goldenSeat = normalizeGoldenResult(golden.trickWinner, 'player').seat;
      const ceSeat = ceResults.trickWinner.seat;
      checkWinnerParity(ceSeat, goldenSeat);
      checks.push({ rule: 'R7', check: 'trickWinner', passed: true });
    }

    // R8: Score
    if (golden.score && ceResults.score) {
      checkScoreParity(ceResults.score, golden.score);
      checks.push({ rule: 'R8', check: 'scoreDeal', passed: true });
    }
  } catch (err) {
    errors.push(err.message);
  }

  return {
    passed: errors.length === 0,
    checks,
    errors,
  };
}

// solvability.mjs — Oracle of solvability (R8 proof: complete games, no illegal states)
// Runs deterministic bot through complete games and verifies:
//   1. Every deal reaches a coherent score (base = 162)
//   2. No illegal move states reached (independently re-verified, see harness/solver.mjs)
//   3. Games terminate correctly
//
// F8 (red-team MED, was "oracle theater"): previously ran ONE seed (42) while claiming
// "across multiple seeds" in the log. Now genuinely runs SEEDS.length distinct seeds and
// requires ALL of them to pass — the log line matches what actually ran.
//
// F11 (red-team MED): also exercises playGame() (adapters/belote/game.mjs) — the only
// "whole game, multiple deals in one continuous run" API — which previously crashed on
// every call (TypeError) and was never exercised by this oracle.

import { runSolver } from './harness/solver.mjs';
import { playGame } from './adapters/belote/game.mjs';
import { fileURLToPath } from 'node:url';

export const SEEDS = [42, 7, 123, 2026, 999];

export function checkSolver(seed) {
  console.log(`[Solvability Oracle] --- seed=${seed} : runSolver (10 deals) ---`);
  const result = runSolver({ numDeals: 10, seed, maxDeals: 50 });

  console.log(`[Solvability Oracle]   ${result.dealsPlayed} deals played (${result.redeals} redeals), ` +
    `dealsScoreVerified=${result.dealsScoreVerified}, movesLegalTotal=${result.movesLegalTotal}`);

  if (!result.allDealsReachedScore) {
    throw new Error(`seed=${seed}: not all deals reached a coherent score (dealsScoreVerified=${result.dealsScoreVerified} vs dealsPlayed=${result.dealsPlayed})`);
  }
  if (!result.allMovesLegal) {
    throw new Error(`seed=${seed}: not every move was independently re-verified legal (movesLegalTotal=${result.movesLegalTotal})`);
  }

  const [t0, t1] = result.totals;
  console.log(`[Solvability Oracle]   ✓ seed=${seed}: all deals coherent, all moves re-verified legal, totals=[${t0}, ${t1}]`);
  return result;
}

export function checkPlayGame(seed) {
  console.log(`[Solvability Oracle] --- seed=${seed} : playGame (full multi-deal game, target=301) ---`);
  const g = playGame({ target: 301, seed, maxDeals: 60 });

  if (!(g.dealsPlayed > 0)) {
    throw new Error(`seed=${seed}: playGame played 0 deals`);
  }
  if (!(g.winner === 0 || g.winner === 1 || g.winner === -1)) {
    throw new Error(`seed=${seed}: playGame produced an invalid winner: ${g.winner}`);
  }
  for (const d of g.deals) {
    if (d.score.base[0] + d.score.base[1] !== 162) {
      throw new Error(`seed=${seed}: playGame deal violated base invariant`);
    }
  }
  console.log(`[Solvability Oracle]   ✓ seed=${seed}: playGame completed, dealsPlayed=${g.dealsPlayed}, ` +
    `winner=${g.winner}, totals=[${g.totals[0]}, ${g.totals[1]}]`);
  return g;
}

/**
 * Run solvability checks.
 * Exits 0 if all checks pass, 1 if any fail.
 */
export function main() {
  console.log('[Solvability Oracle] Starting...');

  try {
    console.log(`[Solvability Oracle] Running bot across ${SEEDS.length} distinct seeds: [${SEEDS.join(', ')}]`);

    let totalDealsPlayed = 0;
    for (const seed of SEEDS) {
      const result = checkSolver(seed);
      totalDealsPlayed += result.dealsPlayed;
    }

    console.log(`[Solvability Oracle] ✓ All ${SEEDS.length} seeds: every deal reached a valid score`);
    console.log(`[Solvability Oracle] ✓ All ${SEEDS.length} seeds: every move independently re-verified legal`);
    console.log(`[Solvability Oracle] ✓ Base invariant (162) held for all ${totalDealsPlayed} deals across all seeds`);

    for (const seed of SEEDS) {
      checkPlayGame(seed);
    }
    console.log(`[Solvability Oracle] ✓ playGame() (full multi-deal game) exercised successfully across ${SEEDS.length} seeds`);

    console.log('[Solvability Oracle] PASS: Solvability oracle succeeded');
    process.exit(0);
  } catch (err) {
    console.error('[Solvability Oracle] FAIL:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Only auto-run when executed directly (`node solvability.mjs`, as run-oracle.mjs
// spawns it) — NOT when imported by a test file, which needs to call checkSolver/
// checkPlayGame directly without triggering process.exit().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

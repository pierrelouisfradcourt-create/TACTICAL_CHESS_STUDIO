// Solvability oracle: R16 — bot reaches 1M cumul in ≤72k ticks (R15: determinism)
import { SolvabilityBot, testDeterminism } from './harness.mjs';
import { pathToFileURL } from 'node:url';

function runSolvabilityProof() {
  const results = {
    oracle: 'solvability',
    verdict: 'PASS',
    proofs: [],
  };

  // Test 1: Bot reaches victory
  const bot = new SolvabilityBot(12345);
  const run = bot.playSolvabilityBot();

  if (!run.success) {
    results.verdict = 'FAIL';
    results.proofs.push({
      test: 'bot_reaches_victory',
      pass: false,
      reason: `Bot failed to reach 1M cumul in ${run.tick_count} ticks`,
      cumul_mR: run.trajectory[run.trajectory.length - 1].cumul_mR,
    });
    return results;
  }

  if (run.tick_count > 72000) {
    results.verdict = 'FAIL';
    results.proofs.push({
      test: 'victory_within_budget',
      pass: false,
      reason: `Victory at tick ${run.tick_count}, exceeds budget 72000`,
    });
    return results;
  }

  results.proofs.push({
    test: 'bot_reaches_victory',
    pass: true,
    tick_count: run.tick_count,
    final_cumul_mR: run.trajectory[run.trajectory.length - 1].cumul_mR,
  });

  results.proofs.push({
    test: 'victory_within_budget',
    pass: true,
    tick_count: run.tick_count,
    budget: 72000,
  });

  // Test 2: Determinism check (R15)
  const det = testDeterminism(12345, 1000);
  if (!det.deterministic) {
    results.verdict = 'FAIL';
    results.proofs.push({
      test: 'determinism',
      pass: false,
      reason: `Trajectories diverged after ${det.mismatch_count} ticks`,
    });
    return results;
  }

  results.proofs.push({
    test: 'determinism',
    pass: true,
    ticks_tested: det.ticks_tested,
  });

  return results;
}

function main() {
  console.log('=== ORACLE DE SOLVABILITÉ — p3_alpha ===\n');
  const result = runSolvabilityProof();
  for (const p of result.proofs) {
    console.log(`${p.pass ? '✓' : '✗'} ${p.test}: ${JSON.stringify(p)}`);
  }
  console.log(`\nRESULT: ${result.verdict === 'PASS' ? 'PASS' : 'FAIL'}`);
  process.exit(result.verdict === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { runSolvabilityProof };

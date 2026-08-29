#!/usr/bin/env node
// SOLVABILITY — the objective-reachability oracle. Mechanics tested in isolation
// prove nothing about a game whose objective is unreachable: this harness makes a
// scripted, LLM-free bot actually PLAY the shipped simulation and requires it to
// WIN, and requires a deliberately bad bot to actually LOSE. Both directions
// matter: a game nobody can lose is as broken as one nobody can win.
//
// Deterministic: seed 1337, no Math.random / Date.now anywhere in sim/.
// Exit 0 only if every expectation below is met, each an EXACT equality.
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initGameState } from './sim/state.mjs';
import { BOT_PANEL, playMatch, rankBots } from './bots/bots.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SEED = 1337;

// Frozen outcome vectors, produced by executing bots/bots.mjs against
// sim/step.mjs. Exact values, never thresholds: a victory scraped with 1 life is
// a different game from one won with 11, and only an equality notices.
const EXPECTED = {
  competent: { result: 'VICTORY', lives_final: 11, wave_reached: 11, leaks_total: 9, gold_spent_total: -1190 },
  naive: { result: 'DEFEAT', lives_final: 0, wave_reached: 3, leaks_total: 18, gold_spent_total: -200 },
  tall: { result: 'DEFEAT', lives_final: 0, wave_reached: 3, leaks_total: 19, gold_spent_total: -50 },
  wide: { result: 'VICTORY', lives_final: 9, wave_reached: 11, leaks_total: 11, gold_spent_total: -350 },
  tempo: { result: 'VICTORY', lives_final: 10, wave_reached: 11, leaks_total: 10, gold_spent_total: -340 }
};

const METRICS = ['lives_final', 'wave_reached', 'leaks_total', 'gold_spent_total'];

const failures = [];
const expect = (label, actual, expected) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  }
  return actual;
};

console.log('=== SOLVABILITY (a bot plays, and must WIN) ===\n');

const runs = Object.entries(BOT_PANEL).map(([name, bot]) => {
  const outcome = playMatch(initGameState(SEED), bot);
  console.log(`  ${name.padEnd(10)} ${outcome.result.padEnd(8)} ${JSON.stringify(outcome.metrics)}`);
  return { name, result: outcome.result, metrics: outcome.metrics };
});

// 1. The positive direction: the objective is genuinely reachable.
const competent = runs.find((r) => r.name === 'competent');
expect('competent bot wins', competent.result, 'VICTORY');
expect('competent bot clears all ten waves', competent.metrics.wave_reached, 11);
expect('competent bot finishes with its exact frozen lives', competent.metrics.lives_final, 11);

// 2. The negative direction: the game can genuinely be lost.
const naive = runs.find((r) => r.name === 'naive');
expect('naive bot loses', naive.result, 'DEFEAT');
expect('naive bot loses before the final wave', naive.metrics.wave_reached, 3);
expect('naive bot loses with exactly zero lives', naive.metrics.lives_final, 0);

// 3. Every panel bot lands on its exact frozen outcome vector.
for (const run of runs) {
  expect(`${run.name} outcome vector`, { result: run.result, ...run.metrics }, EXPECTED[run.name]);
}

// 4. Metric-variance rule: a metric that ranks or calibrates must be PROVEN to
//    carry information — at least two distinct values across the panel.
const variance = {};
for (const metric of METRICS) {
  const distinct = [...new Set(runs.map((r) => r.metrics[metric]))];
  variance[metric] = distinct;
  if (distinct.length < 2) {
    failures.push(`metric "${metric}" has ZERO variance across the panel (${JSON.stringify(distinct)})`);
  }
}
console.log(`\n  variance: ${JSON.stringify(variance)}`);

// 5. Two metrics that reorder the same bots differently: the outcome space is
//    multidimensional, not one score wearing four names.
const byLives = rankBots(runs, 'lives_final');
const byLeaks = rankBots(runs, 'leaks_total');
console.log(`  rank by lives_final : ${byLives.join(' > ')}`);
console.log(`  rank by leaks_total : ${byLeaks.join(' > ')}`);
if (JSON.stringify(byLives) === JSON.stringify(byLeaks)) {
  failures.push('lives_final and leaks_total produce the SAME ranking — one of them measures nothing new');
}

const green = failures.length === 0;
const evidencePath = resolve(ROOT, 'proofs/solvability-evidence.json');
writeFileSync(evidencePath, JSON.stringify({
  timestamp: new Date().toISOString(),
  seed: SEED,
  runs,
  variance,
  rankings: { lives_final: byLives, leaks_total: byLeaks },
  failures,
  verdict: green ? 'PASS' : 'FAIL',
  evidence_path: evidencePath
}, null, 2));

if (!green) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
console.log(`\nEvidence written to ${evidencePath}`);
console.log(`\nRESULT: ${green ? 'PASS' : 'FAIL'}`);
process.exitCode = green ? 0 : 1;

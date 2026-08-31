/**
 * run-oracle.mjs — Complete test orchestration for p2_alpha
 *
 * This is the main entry point for oracle execution. It runs:
 * 1. Unit tests (logic.test.mjs + properties.test.mjs)
 * 2. Solvability proof (bot reaches S5)
 * 3. E2E tests (Playwright click-through if --e2e passed)
 * 4. --mutation: re-runs the strict "Mutation:"-named regression assertions in
 *    logic/properties.test.mjs (advisory smoke-check, NOT the official Forge
 *    mutation gate — that gate runs separately at s10a via scripts/forge/mutation.py,
 *    scoped from wiremap.json's `fichiers`, against the real source files).
 *
 * Exit codes:
 *   0 = all tests pass
 *   1 = any test fails
 */

import { spawnSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { solvabilityProof, canReachVictory, measureVariance, compareRunAdvantage } from './solvability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const runE2E = args.includes('--e2e');
const runMutation = args.includes('--mutation');
const verbose = args.includes('--verbose') || args.includes('-v');

let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

function log(msg, level = 'info') {
  if (verbose || level !== 'debug') {
    console.log(`[oracle] ${level.toUpperCase()}: ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Unit tests
// ─────────────────────────────────────────────────────────────────────────────

async function runUnitTests() {
  log('Starting unit tests (logic.test.mjs)...');

  return new Promise((resolve) => {
    const proc = spawn('node', ['--test', 'logic.test.mjs'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (verbose) process.stdout.write(chunk);
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (verbose) process.stderr.write(chunk);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        testsPassed += stdout.match(/✔/g)?.length || 0;
        log(`Unit tests passed (${testsPassed} tests)`, 'ok');
      } else {
        testsFailed++;
        failedTests.push('logic.test.mjs');
        log(`Unit tests failed: ${stderr || stdout}`, 'error');
      }
      resolve(code === 0);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: Property tests
// ─────────────────────────────────────────────────────────────────────────────

async function runPropertyTests() {
  log('Starting property tests (properties.test.mjs)...');

  return new Promise((resolve) => {
    const proc = spawn('node', ['--test', 'properties.test.mjs'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (verbose) process.stdout.write(chunk);
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (verbose) process.stderr.write(chunk);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const propTests = stdout.match(/✔/g)?.length || 0;
        testsPassed += propTests;
        log(`Property tests passed (${propTests} tests)`, 'ok');
      } else {
        testsFailed++;
        failedTests.push('properties.test.mjs');
        log(`Property tests failed: ${stderr || stdout}`, 'error');
      }
      resolve(code === 0);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: Solvability proof
// ─────────────────────────────────────────────────────────────────────────────

function runSolvabilityProof() {
  log('Starting solvability proof (bot reaches S5)...');

  try {
    const proof = solvabilityProof();

    if (proof.solveSuccessful) {
      log(`Solvability proof PASSED: bot reached S5 in ${proof.ticksToVictory} ticks`, 'ok');
      log(`Threshold progression: ${JSON.stringify(proof.thresholdTicks)}`, 'debug');
      testsPassed++;
      return true;
    } else {
      log(`Solvability proof FAILED: bot did not reach victory within budget (${proof.ticksToVictory} ticks)`, 'error');
      failedTests.push('solvability.proof');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`Solvability proof threw: ${error.message}`, 'error');
    failedTests.push('solvability.proof');
    testsFailed++;
    return false;
  }
}

function runVarianceCheck() {
  log('Measuring metric variance (multiple bot runs)...');

  try {
    const variance = measureVariance();

    // Règle de variance des métriques : une métrique qui sert à calibrer le jeu
    // doit PROUVER qu'elle porte une information variable. Rendre `true` quand
    // la variance est absente ferait de ce volet une assertion qui ne peut pas
    // échouer — donc une mesure de rien.
    if (variance.variance_exists) {
      log(`Variance exists across runs: mean=${variance.mean}, variance=${variance.variance}`, 'ok');
      log(`Samples: ${variance.samples.join(', ')} (periodes de clic ${variance.clickPeriods.join(', ')})`, 'debug');
      testsPassed++;
      return true;
    } else {
      log(`Metric variance FAILED: ${variance.valeurs_distinctes} valeur(s) distincte(s) sur ${variance.samples.length} run(s) — la métrique ne mesure rien`, 'error');
      failedTests.push('solvability.variance');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`Variance check threw: ${error.message}`, 'error');
    testsFailed++;
    return false;
  }
}

function runAdvantageCheck() {
  log('Checking run advantage (policy divergence)...');

  try {
    const advantage = compareRunAdvantage();

    // R25 est une feature DÉCLARÉE : son volet doit pouvoir rougir, sinon il
    // n'atteste rien (même défaut que ci-dessus).
    if (advantage.advantage_exists && advantage.advantage_delta_mR > 0) {
      log(`Policy divergence verified: delta=${advantage.advantage_delta_mR} mR sur ${advantage.horizon} ticks `
          + `(thésaurisation=${advantage.naive_cumul_mR}, réinvestissement=${advantage.optimal_cumul_mR})`, 'ok');
      testsPassed++;
      return true;
    } else {
      log(`Policy divergence FAILED: réinvestissement=${advantage.optimal_cumul_mR} <= thésaurisation=${advantage.naive_cumul_mR}`, 'error');
      failedTests.push('solvability.advantage');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`Advantage check threw: ${error.message}`, 'error');
    testsFailed++;
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: E2E tests (optional, requires HTTP server running)
// ─────────────────────────────────────────────────────────────────────────────

async function runE2ETests() {
  if (!runE2E) {
    log('E2E tests skipped (pass --e2e to enable)', 'debug');
    return true;
  }

  log('Starting E2E tests (real Playwright/Chromium click-through, e2e.mjs spawns its own server)...');

  return new Promise((resolve) => {
    const proc = spawn('node', ['e2e.mjs'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (verbose) process.stdout.write(chunk);
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (verbose) process.stderr.write(chunk);
    });

    proc.on('close', (code) => {
      if (code === 0 && /RESULT: PASS/.test(stdout)) {
        log('E2E tests passed (real browser click-through)', 'ok');
        testsPassed++;
        resolve(true);
      } else {
        log(`E2E tests FAILED: ${stderr || stdout}`, 'error');
        failedTests.push('e2e.mjs');
        testsFailed++;
        resolve(false);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: Mutation tests (optional)
// ─────────────────────────────────────────────────────────────────────────────

async function runMutationTests() {
  if (!runMutation) {
    log('Mutation tests skipped (pass --mutation to enable)', 'debug');
    return true;
  }

  log('Running mutation tests...');

  return new Promise((resolve) => {
    const proc = spawnSync('node', ['--test', 'logic.test.mjs', 'properties.test.mjs'], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    if (proc.status === 0) {
      log('Mutation tests passed', 'ok');
      testsPassed++;
      resolve(true);
    } else {
      log('Mutation tests failed', 'error');
      testsFailed++;
      failedTests.push('mutation-gate');
      resolve(false);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main orchestration
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  log('Oracle execution started for p2_alpha');
  log(`Running with flags: ${args.length > 0 ? args.join(', ') : 'none'}`);

  // Phase 1-2: Unit + property tests
  const unitsOk = await runUnitTests();
  const propsOk = await runPropertyTests();

  // Phase 3: Solvability
  const solveOk = runSolvabilityProof();
  const varianceOk = runVarianceCheck();
  const advantageOk = runAdvantageCheck();

  // Phase 4: E2E
  const e2eOk = await runE2ETests();

  // Phase 5: Mutation
  const mutationOk = await runMutationTests();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('[oracle] SUMMARY');
  console.log('='.repeat(60));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);

  if (failedTests.length > 0) {
    console.log(`Failed components: ${failedTests.join(', ')}`);
  }

  const allOk = testsFailed === 0 && unitsOk && propsOk && solveOk && varianceOk
    && advantageOk && e2eOk && mutationOk;

  if (allOk) {
    console.log('\n✓ Oracle PASSED: all tests successful');
    process.exit(0);
  } else {
    console.log('\n✗ Oracle FAILED: see errors above');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[oracle] Unhandled error: ${error.message}`);
  process.exit(1);
});

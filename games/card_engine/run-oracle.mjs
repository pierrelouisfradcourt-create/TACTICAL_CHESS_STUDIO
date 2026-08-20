#!/usr/bin/env node
// run-oracle.mjs — Master oracle (verifies entire CardEngine V0)
// Runs: (1) logic tests, (2) property tests, (3) solvability oracle
// Exit 0 iff ALL pass. Exit 1 on first failure.

import test from 'node:test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run tests via node:test
 */
async function runNodeTests() {
  console.log('[Oracle] === Running logic + property tests ===');

  return new Promise((resolve) => {
    // Run tests from a script
    const child = spawn('node', ['--test', 'logic.test.mjs', 'properties.test.mjs'], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Run parity oracle (goldens vs belote-claude, see harness/goldens/)
 */
async function runParity() {
  console.log('[Oracle] === Running parity oracle (goldens) ===');

  return new Promise((resolve) => {
    const child = spawn('node', ['harness/run_parity.mjs'], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Run solvability oracle
 */
async function runSolvability() {
  console.log('[Oracle] === Running solvability oracle ===');

  return new Promise((resolve) => {
    const child = spawn('node', ['solvability.mjs'], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Master oracle
 */
async function main() {
  console.log('[Oracle] CardEngine V0 Oracle Starting');
  console.log('[Oracle] ========================================');

  const results = {
    tests: false,
    parity: false,
    solvability: false,
  };

  try {
    // Run tests
    results.tests = await runNodeTests();
    if (!results.tests) {
      console.error('[Oracle] ✗ Logic + property tests FAILED');
      process.exit(1);
    }
    console.log('[Oracle] ✓ Logic + property tests PASSED');

    // Run parity (goldens vs belote-claude)
    results.parity = await runParity();
    if (!results.parity) {
      console.error('[Oracle] ✗ Parity oracle FAILED');
      process.exit(1);
    }
    console.log('[Oracle] ✓ Parity oracle PASSED');

    // Run solvability
    results.solvability = await runSolvability();
    if (!results.solvability) {
      console.error('[Oracle] ✗ Solvability oracle FAILED');
      process.exit(1);
    }
    console.log('[Oracle] ✓ Solvability oracle PASSED');

    console.log('[Oracle] ========================================');
    console.log('[Oracle] ✓ CardEngine V0 Oracle: ALL CHECKS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('[Oracle] ✗ Unexpected error:', err);
    process.exit(1);
  }
}

main();

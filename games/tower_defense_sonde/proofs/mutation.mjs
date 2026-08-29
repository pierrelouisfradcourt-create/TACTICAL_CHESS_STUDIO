#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const MODULE_PATHS = [
  'sim/combat.mjs',
  'sim/movement.mjs',
  'sim/end.mjs',
  'sim/economy.mjs'
];

function runTests() {
  const result = spawnSync('node', ['--test', 'tests/*.test.mjs'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    cwd: '.'
  });
  return result.status === 0;
}

function applyMutation(filePath, findText, replaceText) {
  const content = readFileSync(filePath, 'utf-8');
  if (!content.includes(findText)) {
    console.warn(`[MUTATION] Could not find "${findText}" in ${filePath}`);
    return false;
  }
  const mutated = content.replace(findText, replaceText);
  writeFileSync(filePath, mutated);
  return true;
}

function revertMutation(filePath) {
  // Re-read original from git
  const result = spawnSync('git', ['checkout', filePath], { stdio: 'pipe' });
  return result.status === 0;
}

async function runMutationTests() {
  console.log('=== MUTATION TEST SUITE ===\n');

  const mutations = [
    {
      file: 'sim/combat.mjs',
      name: 'armor_subtraction',
      find: 'dmg = Math.max(1, dmg - armor);',
      replace: 'dmg = Math.max(1, dmg);' // Remove armor reduction
    },
    {
      file: 'sim/movement.mjs',
      name: 'leak_detection',
      find: 'if (enemy.progress >= PATH_LENGTH) { return \'LEAKED\'; }',
      replace: 'if (enemy.progress >= PATH_LENGTH * 2) { return \'LEAKED\'; }' // Prevent leaks
    },
    {
      file: 'sim/end.mjs',
      name: 'defeat_condition',
      find: 'if (state.lives <= 0) {',
      replace: 'if (state.lives < 0) {' // Change defeat condition
    },
    {
      file: 'sim/economy.mjs',
      name: 'bounty_award',
      find: 'state.gold += bounty;',
      replace: 'state.gold += bounty / 2;' // Reduce bounty
    }
  ];

  let survivingMutants = 0;
  let killedMutants = 0;

  for (const mutation of mutations) {
    console.log(`[MUTATION] Testing: ${mutation.name}`);
    console.log(`  File: ${mutation.file}`);
    console.log(`  Change: ${mutation.find.slice(0, 50)}...`);

    // Apply mutation
    if (!applyMutation(mutation.file, mutation.find, mutation.replace)) {
      console.log(`  ⚠ SKIP (could not apply mutation)\n`);
      continue;
    }

    // Run tests with mutation
    const testsPassed = runTests();

    if (testsPassed) {
      console.log(`  ✗ SURVIVED (tests still pass - bad mutation!)\n`);
      survivingMutants++;
    } else {
      console.log(`  ✓ KILLED (tests fail - mutation detected)\n`);
      killedMutants++;
    }

    // Revert mutation
    revertMutation(mutation.file);
  }

  console.log(`\n=== MUTATION SUMMARY ===`);
  console.log(`Total mutations: ${mutations.length}`);
  console.log(`Killed: ${killedMutants}`);
  console.log(`Survived: ${survivingMutants}`);

  if (survivingMutants > 0) {
    console.log(`\n⚠ WARNING: ${survivingMutants} mutations survived (weak test coverage)`);
  }

  console.log(`\nMutation score: ${Math.round(killedMutants / mutations.length * 100)}%`);

  // Consider test passed if most mutations are killed
  const passed = killedMutants >= Math.floor(mutations.length * 0.75);
  console.log(`\n${passed ? '✓ PASS' : '✗ FAIL'}: Mutation test ${passed ? 'passed' : 'failed'}\n`);

  return passed;
}

runMutationTests().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(e => {
  console.error('Mutation test error:', e);
  process.exit(1);
});

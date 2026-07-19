// run-oracle.mjs - Deterministic oracle for auto_battler engine
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Forbidden patterns in engine modules
const FORBIDDEN_PATTERNS = [
  /\bDate\.now\b/,
  /\bMath\.random\b/,
  /\bperformance\.now\b/,
  /\bnew Date\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bqueueMicrotask\b/,
  /import.*['"]node:fs['"]/,
  /import.*['"]node:net['"]/,
  /import.*['"]node:http['"]/,
  /import.*['"]node:timers['"]/,
  /from.*['"]node:fs['"]/,
  /from.*['"]node:net['"]/,
  /from.*['"]node:http['"]/,
  /from.*['"]node:timers['"]/
];

const ENGINE_MODULES = [
  'engine/types.mjs',
  'engine/rng.mjs',
  'engine/registry.mjs',
  'engine/serialize.mjs',
  'engine/state.mjs',
  'engine/inputs.mjs',
  'engine/eventlog.mjs',
  'engine/transition.mjs',
  'engine/replay.mjs',
  'engine/match.mjs',
  'pool/pool.mjs',
  'shop/shop.mjs',
  'bench/bench.mjs',
  'merge/merge.mjs',
  'economy/gold.mjs',
  'preparation/preparation.mjs'
];

function removeComments(code) {
  // Remove line comments
  let result = code.replace(/\/\/.*$/gm, '');
  // Remove block comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

function scanModule(modulePath) {
  const fullPath = resolve(__dirname, modulePath);
  const code = readFileSync(fullPath, 'utf-8');
  const cleanCode = removeComments(code);

  const violations = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(cleanCode)) {
      violations.push(pattern.toString());
    }
  }

  return { modulePath, violations };
}

function main() {
  console.log('=== AUTO_BATTLER ENGINE ORACLE ===\n');

  // Phase 1: Static scan of engine modules
  console.log('Phase 1: Static scan for forbidden patterns...');
  let scanFailed = false;

  for (const module of ENGINE_MODULES) {
    const result = scanModule(module);
    if (result.violations.length > 0) {
      console.error(`  FAIL: ${module}`);
      console.error(`    Violations: ${result.violations.join(', ')}`);
      scanFailed = true;
    } else {
      console.log(`  OK: ${module}`);
    }
  }

  if (scanFailed) {
    console.log('\nScan FAILED: forbidden patterns detected\n');
    process.exit(1);
  }

  console.log('Scan PASSED: no forbidden patterns found\n');

  // Phase 2: Run logic tests
  console.log('Phase 2: Running logic tests (logic.test.mjs)...');
  let testsFailed = false;

  try {
    const logicResult = execSync('node --test logic.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(logicResult);
  } catch (e) {
    console.error('Logic tests FAILED:');
    console.error(e.stdout || e.message);
    testsFailed = true;
  }

  if (testsFailed) {
    console.log('\nLogic tests FAILED\n');
    process.exit(1);
  }

  console.log('Logic tests PASSED\n');

  // Phase 3: Run properties tests
  console.log('Phase 3: Running properties tests (properties.test.mjs)...');

  try {
    const propsResult = execSync('node --test properties.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(propsResult);
  } catch (e) {
    console.error('Properties tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nProperties tests FAILED\n');
    process.exit(1);
  }

  console.log('Properties tests PASSED\n');

  // Phase 4: Run preparation + economy tests (increment 2)
  console.log('Phase 4: Running preparation tests (preparation.test.mjs)...');

  try {
    const prepResult = execSync('node --test preparation.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(prepResult);
  } catch (e) {
    console.error('Preparation tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nPreparation tests FAILED\n');
    process.exit(1);
  }

  console.log('Preparation tests PASSED\n');

  // Phase 5: Run preparation + economy property/hardening tests (increment 2)
  console.log('Phase 5: Running preparation property tests (properties.i2.test.mjs)...');

  try {
    const propsI2Result = execSync('node --test properties.i2.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(propsI2Result);
  } catch (e) {
    console.error('Preparation property tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nPreparation property tests FAILED\n');
    process.exit(1);
  }

  console.log('Preparation property tests PASSED\n');

  // All phases passed
  console.log('=== ORACLE VERDICT: OK ===');
  console.log('  Static scan: PASSED');
  console.log('  Logic tests: PASSED');
  console.log('  Properties tests: PASSED');
  console.log('  Preparation tests: PASSED');
  console.log('  Preparation property tests: PASSED');
  console.log('\nAuto_battler engine is deterministic, pure, and validated.\n');

  process.exit(0);
}

main();

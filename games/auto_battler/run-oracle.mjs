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
  // engine/transition.mjs, engine/replay.mjs, engine/match.mjs and economy/gold.mjs were
  // DELETED (s9-build commande F, F2): a dead second input circuit and a dead gold-arithmetic
  // module, imported only by tests and this oracle, never by the real game (app ->
  // input/submit.mjs -> preparation.applyPreparationInput). See preparation/preparation.mjs and
  // round/round.mjs for the real, live economy path this oracle actually exercises below.
  'pool/pool.mjs',
  'shop/shop.mjs',
  'bench/bench.mjs',
  'merge/merge.mjs',
  'board/board.mjs',
  'round/round.mjs',
  'preparation/preparation.mjs',
  // Combat (i2.5 commande D): the TickPipeline is a pure function (CBT-1) and consumes no
  // randomness (CBT-9) — it belongs under the same forbidden-pattern scan as the rest of the
  // deterministic core, not beside it.
  'combat/cell.mjs',
  'combat/tiebreak.mjs',
  // i2.5 commande G: the closed keyword vocabulary is a RULE module — it belongs under the same
  // determinism scan as the pipeline that reads it.
  'combat/keywords.mjs',
  'combat/combat.mjs',
  'combat/army.mjs',
  'combat/ghost.mjs',
  'content/units.v0.mjs'
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

  // Phase (was 3, s9-build commande F / F2): properties.test.mjs was DELETED — it
  // property-tested engine/transition.mjs, engine/replay.mjs and engine/match.mjs (4 of its 6
  // tests directly; the other 2 called them for their "after inputs" assertions), a dead second
  // input circuit imported only by tests and this oracle, never by the real game (app ->
  // input/submit.mjs -> preparation.applyPreparationInput). The phase COUNT drops from 9 to 7 as
  // a direct result: fewer phases proving fewer things, on purpose — 7 phases that prove the real
  // game beat 9 of which 2 proved dead code. logic.test.mjs's header note records what of its own
  // dead-circuit tests were removed vs. salvaged (R22/R23 now call state.createGameState
  // directly, the real function transition() was only wrapping).

  // Phase 3: Run preparation + economy tests (increment 2)
  console.log('Phase 3: Running preparation tests (preparation.test.mjs)...');

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

  // Phase 4: Run preparation + economy property/hardening tests (increment 2)
  console.log('Phase 4: Running preparation property tests (properties.i2.test.mjs)...');

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

  // Phase 5: Run startup regression tests (increment 2.5)
  console.log('Phase 5: Running startup regression tests (startup.test.mjs)...');

  try {
    const startupResult = execSync('node --test startup.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(startupResult);
  } catch (e) {
    console.error('Startup regression tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nStartup regression tests FAILED\n');
    process.exit(1);
  }

  console.log('Startup regression tests PASSED\n');

  // Phase 6: Run i2.5 hardening tests (s9-build playtest fixes: C1 board zone, C2 shop odds)
  console.log('Phase 6: Running i2.5 hardening tests (properties.i25.test.mjs)...');

  try {
    const propsI25Result = execSync('node --test properties.i25.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(propsI25Result);
  } catch (e) {
    console.error('i2.5 hardening tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\ni2.5 hardening tests FAILED\n');
    process.exit(1);
  }

  console.log('i2.5 hardening tests PASSED\n');

  // Phase 7: Combat, content and loop (increment 2.5, commande D)
  console.log('Phase 7: Running combat/content/loop tests (properties.combat.test.mjs)...');

  try {
    const combatResult = execSync('node --test properties.combat.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(combatResult);
  } catch (e) {
    console.error('Combat tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nCombat tests FAILED\n');
    process.exit(1);
  }

  console.log('Combat tests PASSED\n');

  // Phase 8: L'ENJEU (increment 2.5, commande E — Life, formule de dégâts, Star, limite de pose)
  console.log('Phase 8: Running stake tests (properties.i25e.test.mjs)...');

  try {
    const stakeResult = execSync('node --test properties.i25e.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(stakeResult);
  } catch (e) {
    console.error('Stake tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nStake tests FAILED\n');
    process.exit(1);
  }

  console.log('Stake tests PASSED\n');

  // Phase 9: LES MOTS-CLÉS ET LES TRIBUS (increment 2.5, commande G — un test d'EFFET par
  // mot-clé, jamais de présence)
  console.log('Phase 9: Running keyword/tribe tests (properties.i25g.test.mjs)...');

  try {
    const keywordResult = execSync('node --test properties.i25g.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(keywordResult);
  } catch (e) {
    console.error('Keyword tests FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nKeyword tests FAILED\n');
    process.exit(1);
  }

  console.log('Keyword tests PASSED\n');

  // Phase 10 (R9, Forge V2 §4-A, PRIORITAIRE — solvabilité minimale OBLIGATOIRE avant toute
  // augmentation de contenu): a bot plays the REAL path (round -> input/submit -> preparation
  // -> combat/combat.mjs) across SEEDS distinct seeds and the 5 volets (boucle jouable, victoire
  // atteignable, ressources disponibles, simulation terminable, mécaniques centrales) must ALL be
  // green. This is what would have caught "0 or, combat jamais lancé" before it shipped.
  console.log('Phase 10: Running solvability oracle (solvability.mjs)...');

  try {
    const solvResult = execSync('node solvability.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(solvResult);
  } catch (e) {
    console.error('Solvability oracle FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nSolvability oracle FAILED\n');
    process.exit(1);
  }

  console.log('Solvability oracle PASSED\n');

  // Phase 11 (R9): the 5 volets above are pure functions over MEASURED metrics precisely so this
  // falsification suite can prove each one CAN turn red (fabricated metrics — historical bug
  // patterns like "or initial = 0" or "tick_limit contourné" — never by touching the game itself).
  // An oracle that can never fail proves nothing (forge_experiment_cycle doctrine: always a
  // control probe) — this phase is the standing regression guard on that falsifiability.
  console.log('Phase 11: Running solvability falsification proof (solvability.falsification.test.mjs)...');

  try {
    const solvFalsResult = execSync('node --test solvability.falsification.test.mjs', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(solvFalsResult);
  } catch (e) {
    console.error('Solvability falsification proof FAILED:');
    console.error(e.stdout || e.message);
    console.log('\nSolvability falsification proof FAILED\n');
    process.exit(1);
  }

  console.log('Solvability falsification proof PASSED\n');

  // All phases passed
  console.log('=== ORACLE VERDICT: OK ===');
  console.log('  Static scan: PASSED');
  console.log('  Logic tests: PASSED');
  console.log('  Preparation tests: PASSED');
  console.log('  Preparation property tests: PASSED');
  console.log('  Startup regression tests: PASSED');
  console.log('  i2.5 hardening tests: PASSED');
  console.log('  Combat/content/loop tests: PASSED');
  console.log('  Stake tests (Life, damage formula, Star, board limit): PASSED');
  console.log('  Keyword/tribe tests (divine shield, taunt, poison, windfury, reborn, tribe buff): PASSED');
  console.log('  Solvability oracle (5 volets — boucle/victoire/ressources/terminaison/mécaniques): PASSED');
  console.log('  Solvability falsification proof (each volet provably CAN fail): PASSED');
  console.log('\nAuto_battler engine is deterministic, pure, validated, playable from startup — losable,');
  console.log('and a unit is now worth choosing for what it DOES, not only for its four numbers.\n');

  process.exit(0);
}

main();

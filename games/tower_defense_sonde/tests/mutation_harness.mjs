#!/usr/bin/env node
// R51: the meta-oracle — "do the tests actually catch a bug?" A generic
// operator flips a single occurrence of an operator (>= to >, === to !==,
// && to ||, += to -=) in one of the logic modules; if `node --test` still
// passes with that fault in place, the mutant SURVIVED (a real hole in test
// coverage). Unlike scripts/forge/mutation.py (the driver's own generic,
// cross-language meta-oracle) or the pre-existing proofs/mutation.mjs (four
// hardcoded scenario mutations, reverted via `git checkout`), this harness
// covers every occurrence of each operator across every logic module, and
// restores each file from an in-memory backup — no git dependency, no risk
// of leaving a mutated file staged if the process is interrupted.
import { readFileSync, writeFileSync, writeFileSync as writeEvidence } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const isMainModule = process.argv[1] && __filename === resolve(process.argv[1]);

// Each operator flips every non-overlapping occurrence of `pattern` in a
// target file's text to `replacement`, one mutant per occurrence — never
// one mutant per operator, so a single surviving `>=` deep in a file
// doesn't hide behind nine other killed occurrences of the same operator.
const OPERATORS = [
  { name: 'flip_gte_gt', pattern: />=/g, replacement: '>' },
  { name: 'flip_lte_lt', pattern: /<=/g, replacement: '<' },
  { name: 'flip_eq_neq', pattern: /===/g, replacement: '!==' },
  { name: 'flip_and_or', pattern: /&&/g, replacement: '||' },
  { name: 'flip_plusassign_minusassign', pattern: /\+=/g, replacement: '-=' }
];

// Logic modules covered — every sim/actions file that can hold a mortal
// mutation (death, leak, or gold-spend condition, per R51's statement).
const TARGET_FILES = [
  'sim/combat.mjs',
  'sim/movement.mjs',
  'sim/end.mjs',
  'sim/economy.mjs',
  'sim/waves.mjs',
  'sim/targeting.mjs',
  'sim/upgrades.mjs',
  'actions/actions.mjs'
];

// The real suite these mutants are tested against — same list run-oracle.mjs
// already uses, so a mutant that survives here would also have survived the
// shipped oracle.
const TEST_FILES = [
  'tests/geometry.test.mjs',
  'tests/towers.test.mjs',
  'tests/combat.test.mjs',
  'tests/solvability.test.mjs'
];

function runTests() {
  const result = spawnSync(process.execPath, ['--test', ...TEST_FILES], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  return result.status === 0;
}

// Every single-occurrence mutant of one operator applied to one file's text
// — an array of full mutated file contents, one per match.
function generateMutants(text, operator) {
  const mutants = [];
  const re = new RegExp(operator.pattern.source, 'g');
  let match;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);
    mutants.push(before + operator.replacement + after);
    if (match[0].length === 0) re.lastIndex++;
  }
  return mutants;
}

export function runMutation({ files = TARGET_FILES, operators = OPERATORS } = {}) {
  const report = { total: 0, killed: 0, survived: [], byFile: {} };

  for (const relPath of files) {
    const absPath = resolve(ROOT, relPath);
    const original = readFileSync(absPath, 'utf-8');
    report.byFile[relPath] = { total: 0, killed: 0, survived: 0 };

    try {
      for (const operator of operators) {
        const mutants = generateMutants(original, operator);
        mutants.forEach((mutatedText, occurrence) => {
          writeFileSync(absPath, mutatedText);
          const testsPassed = runTests();
          report.total += 1;
          report.byFile[relPath].total += 1;
          if (testsPassed) {
            report.survived.push({ file: relPath, operator: operator.name, occurrence });
            report.byFile[relPath].survived += 1;
          } else {
            report.killed += 1;
            report.byFile[relPath].killed += 1;
          }
        });
      }
    } finally {
      // Always restore from the in-memory original, success or crash — no
      // mutated file is ever left on disk past this file's own loop.
      writeFileSync(absPath, original);
    }
  }

  return report;
}

if (isMainModule) {
  console.log('=== MUTATION HARNESS (tests/mutation_harness.mjs) ===\n');
  const report = runMutation();

  console.log(`Total mutants: ${report.total}`);
  console.log(`Killed: ${report.killed}/${report.total}`);
  console.log(`Survived: ${report.survived.length}/${report.total}`);
  if (report.survived.length > 0) {
    console.log('\nSurviving mutants (need a stronger test or a documented triage):');
    report.survived.forEach((s) => console.log(`  - ${s.file} [${s.operator}] occurrence #${s.occurrence}`));
  }

  const evidencePath = resolve(ROOT, 'proofs/mutation-harness-evidence.json');
  writeEvidence(evidencePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total: report.total,
    killed: report.killed,
    survived: report.survived,
    byFile: report.byFile,
    evidence_path: evidencePath
  }, null, 2));
  console.log(`\nEvidence written to ${evidencePath}`);
  console.log(`\n${report.survived.length === 0 ? '✓ PASS' : '✗ FAIL'}: mutation score ${report.total === 0 ? 'n/a' : Math.round((report.killed / report.total) * 100) + '%'}`);

  process.exitCode = report.survived.length === 0 ? 0 : 1;
}

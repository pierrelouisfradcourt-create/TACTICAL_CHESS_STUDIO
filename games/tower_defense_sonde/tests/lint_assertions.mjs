#!/usr/bin/env node
// R50: no numeric assertion may be a tautological/weak range check
// (x>=0, length>=0, hp<=maxHp) — every numeric assertion must be an exact
// equality, or a named-epsilon comparison for floats (e.g.
// Math.abs(a - b) < EPSILON). This statically scans assert(...)/assert.ok(...)
// calls in tests/*.test.mjs for a bare inequality operator on the condition
// argument that isn't guarded by a named epsilon.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `import.meta.url === \`file://${process.argv[1]}\`` never matches on
// Windows (backslash argv path vs forward-slash file: URL) — comparing two
// resolved native paths instead works on every platform.
const isMainModule = process.argv[1] && __filename === resolve(process.argv[1]);

const INEQUALITY_RE = /[<>]=?/;
const EPSILON_RE = /epsilon/i;

// Finds the balanced-paren argument text of every assert(...) / assert.ok(...)
// call in `source` — a plain capture-group regex breaks on multi-line calls
// and nested parens, so this walks the string tracking paren depth instead.
function findAssertOkCalls(source) {
  const calls = [];
  const callRe = /\bassert(?:\.ok)?\s*\(/g;
  let match;
  while ((match = callRe.exec(source)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') depth--;
      i++;
    }
    const argText = source.slice(start, i - 1);
    const line = source.slice(0, match.index).split('\n').length;
    calls.push({ argText, line });
  }
  return calls;
}

export function checkStrictAssertions(source, filename = '<source>') {
  const violations = [];
  for (const { argText, line } of findAssertOkCalls(source)) {
    // Only the condition itself (first comma-split argument) is checked —
    // the rest of argText is the assertion message and may contain anything.
    const condition = argText.split(',')[0];
    const withoutEquality = condition.replace(/[=!]==/g, ''); // strip === / !== before scanning for < >
    if (INEQUALITY_RE.test(withoutEquality) && !EPSILON_RE.test(condition)) {
      violations.push({
        file: filename,
        line,
        code: condition.trim(),
        reason: 'inequality assertion without a named epsilon is not an exact/strict assertion (R50)'
      });
    }
  }
  return violations;
}

function collectTestFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.test.mjs'))
    .map((f) => resolve(dir, f));
}

if (isMainModule) {
  const targets = collectTestFiles(__dirname);
  console.log('=== ASSERTION LINT (tests/lint_assertions.mjs) ===\n');

  const allViolations = [];
  for (const file of targets) {
    const source = readFileSync(file, 'utf-8');
    const violations = checkStrictAssertions(source, file);
    allViolations.push(...violations);
    console.log(`${file}: ${violations.length} violation(s)`);
  }

  if (allViolations.length > 0) {
    console.log('\nViolations:');
    allViolations.forEach((v) => console.log(`  ${v.file}:${v.line}  ${v.code}`));
  }

  const evidencePath = resolve(__dirname, '../proofs/lint-assertions-evidence.json');
  writeFileSync(evidencePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    filesScanned: targets.length,
    violations: allViolations,
    evidence_path: evidencePath
  }, null, 2));
  console.log(`\nEvidence written to ${evidencePath}`);
  console.log(`\n${allViolations.length === 0 ? '✓ PASS' : '✗ FAIL'}: ${allViolations.length} tautological assertion(s) found`);

  process.exitCode = allViolations.length === 0 ? 0 : 1;
}

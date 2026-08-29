#!/usr/bin/env node
// ORACLE — deterministic, non-LLM. Every volet below EXECUTES something and reads
// its exit code; nothing here writes a success literal.
//
// What changed and why (each was a measured hole, not a style preference):
//   * e2e.mjs now lives at the game root and is genuinely invoked. The former
//     proofs/e2e.mjs defined its test function and never called it, so this gate
//     reported PASS without ever opening a browser.
//   * solvability.mjs is wired: mechanics tested in isolation cannot tell whether
//     the objective is reachable at all.
//   * lint_assertions.mjs, tests/evidence.mjs and reuse_ratio.mjs were written but
//     never run by anything — a proof no oracle executes does not exist.
//   * the mutation volet reports what the driver measured; it never claims a
//     result it did not run.

import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(ROOT, '../..');

// The four sealed entry points named in the mutation command. Each is the ROOT of
// its domain and imports its sub-suites (see the header of each file), so this
// list runs the whole suite exactly once per file, with no double execution.
const TESTS = [
  'tests/geometry.test.mjs',
  'tests/towers.test.mjs',
  'tests/combat.test.mjs',
  'tests/solvability.test.mjs'
];

const run = (label, argv, opts = {}) => {
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: opts.cwd || ROOT, stdio: 'pipe', encoding: 'utf-8', timeout: opts.timeout || 120000
  });
  const green = result.status === 0;
  console.log(`  ${label}: ${green ? '✓ PASS' : '✗ FAIL'}`);
  if (!green) {
    const out = (result.stderr || result.stdout || '(no output)').toString();
    console.log(`    ${out.slice(-600).replace(/\n/g, '\n    ')}`);
  }
  return {
    label,
    argv,
    exit_code: result.status,
    executed: result.status !== null || Boolean(result.stdout || result.stderr),
    green,
    output_tail: String(result.stdout || result.stderr || '').slice(-800)
  };
};

console.log('=== TOWER DEFENSE SONDE ORACLE ===\n');
console.log(`Oracle running in: ${ROOT}\n`);

const volets = [];

console.log('[1/6] Unit suites (node --test, strict assertions)...');
const unit = TESTS.map((t) => run(t, ['node', '--test', t]));
volets.push(...unit);

console.log('\n[2/6] Purity (no Math.random / Date.now / performance.now in the sim)...');
const purity = spawnSync('grep', [
  '-r', '-E', '^[^/]*(Math\\.random|Date\\.now|performance\\.now|requestAnimationFrame)\\(',
  'sim/', 'actions/', 'config/', 'bots/'
], { cwd: ROOT, stdio: 'pipe', encoding: 'utf-8' });
// grep exits 0 when it FINDS a match: a match is the failure here.
const purityGreen = purity.status !== 0;
console.log(`  purity: ${purityGreen ? '✓ PASS' : '✗ FAIL'}`);
if (!purityGreen) console.log(purity.stdout);
volets.push({
  label: 'purity', argv: ['grep', 'non-deterministic-calls'], exit_code: purity.status,
  executed: true, green: purityGreen, output_tail: String(purity.stdout || '').slice(-800)
});

console.log('\n[3/6] Solvability (a scripted bot plays and must WIN)...');
volets.push(run('solvability.mjs', ['node', 'solvability.mjs']));

console.log('\n[4/6] E2E (real Chromium, real clicks on the shipped page)...');
// Absence of the means of proof (Playwright unresolvable, import crash) is a FAIL,
// never a SKIP: a volet that cannot execute cannot pass.
volets.push(run('e2e.mjs', ['node', 'e2e.mjs'], { timeout: 180000 }));

console.log('\n[5/6] Proof discipline (assertion lint + evidence paths)...');
volets.push(run('tests/lint_assertions.mjs', ['node', 'tests/lint_assertions.mjs']));
volets.push(run('tests/evidence.mjs', ['node', 'tests/evidence.mjs']));

console.log('\n[6/6] Reuse measurement + mutation...');
// reuse_ratio measures, it never judges: its exit code is recorded, not gated.
const reuse = run('reuse_ratio.mjs', [
  'node', resolve(REPO_ROOT, 'scripts/forge/reuse_ratio.mjs'), ROOT
]);
console.log('  mutation: measured by the driver (forge.mutation_proof) against the '
  + 'sealed suite above — NOT_MEASURED here, and never asserted without execution.');

const allGreen = volets.every((v) => v.green);

const evidencePath = resolve(ROOT, 'proofs/oracle-evidence.json');
const evidence = {
  timestamp: new Date().toISOString(),
  oracle: 'mechanical_validation_only',
  verdict: allGreen ? 'PASS' : 'FAIL',
  volets,
  reuse_ratio: { executed: reuse.executed, exit_code: reuse.exit_code, gated: false,
    output_tail: reuse.output_tail },
  mutation: { executed: false, verdict: 'NOT_MEASURED',
    note: 'measured by the driver (forge.mutation_proof); this oracle never asserts a '
      + 'mutation result it did not run' },
  evidence_path: evidencePath
};
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

console.log(`\n✓ Evidence written to ${evidencePath}`);
console.log(`\n=== ORACLE VERDICT: ${evidence.verdict} ===`);

process.exitCode = allGreen ? 0 : 1;

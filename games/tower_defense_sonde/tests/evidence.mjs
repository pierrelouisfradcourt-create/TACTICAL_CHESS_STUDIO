#!/usr/bin/env node
// R53: a receipt without a verifiable evidence_path is not proof of
// execution — BLOCKED, never a claim (CLAUDE.md: claim_verdict:
// NO_CLAIM_ALLOWED). evidence_path must be present, absolute, and point at
// a file that genuinely exists on disk with real content — not a path
// that merely looks plausible.
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const isMainModule = process.argv[1] && __filename === resolve(process.argv[1]);

export function assertEvidencePath(receipt, label = '<receipt>') {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, label, reason: 'receipt is not an object' };
  }
  const path = receipt.evidence_path;
  if (!path || typeof path !== 'string') {
    return { ok: false, label, reason: 'evidence_path is missing' };
  }
  if (!isAbsolute(path)) {
    return { ok: false, label, reason: `evidence_path is not absolute: ${path}` };
  }
  if (!existsSync(path)) {
    return { ok: false, label, reason: `evidence_path does not point at a real file: ${path}` };
  }
  if (statSync(path).size === 0) {
    return { ok: false, label, reason: `evidence artifact is empty: ${path}` };
  }
  return { ok: true, label, path };
}

// Real receipts this build's own oracle scripts produce — checked against
// the actual disk, not against each other's claims.
const RECEIPT_FILES = [
  resolve(ROOT, 'proofs/oracle-evidence.json'),
  resolve(ROOT, 'proofs/lint-assertions-evidence.json'),
  resolve(ROOT, 'proofs/mutation-harness-evidence.json')
];

if (isMainModule) {
  console.log('=== EVIDENCE PATH CHECK (tests/evidence.mjs) ===\n');
  let allOk = true;
  const results = [];

  for (const file of RECEIPT_FILES) {
    if (!existsSync(file)) {
      console.log(`${file}: SKIP (no receipt produced yet — run its oracle first)`);
      continue;
    }
    const receipt = JSON.parse(readFileSync(file, 'utf-8'));
    const verdict = assertEvidencePath(receipt, file);
    results.push(verdict);
    allOk = allOk && verdict.ok;
    console.log(`${file}: ${verdict.ok ? 'OK -> ' + verdict.path : 'BLOCKED -> ' + verdict.reason}`);
  }

  const evidencePath = resolve(ROOT, 'proofs/evidence-check-evidence.json');
  writeFileSync(evidencePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    evidence_path: evidencePath
  }, null, 2));
  console.log(`\nEvidence written to ${evidencePath}`);
  console.log(`\n${allOk ? '✓ PASS' : '✗ BLOCKED'}`);

  process.exitCode = allOk ? 0 : 1;
}

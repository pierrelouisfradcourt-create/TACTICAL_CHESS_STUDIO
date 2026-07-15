// Tests de studio_selfaudit.mjs — node --test. Fixtures ephemeres, aucune dependance au repo reel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditDocClaims,
  auditConnectorDormancy,
  runSelfAudit,
} from './studio_selfaudit.mjs';

function tmpRepo() {
  return mkdtempSync(join(tmpdir(), 'studioaudit-'));
}
function touch(root, rel, ageDays = 0) {
  const p = join(root, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, '{}\n');
  if (ageDays) {
    const t = Date.now() / 1000 - ageDays * 86400;
    utimesSync(p, t, t);
  }
  return p;
}
function writeManifest(root, obj) {
  const p = join(root, 'scripts/forge/studio_expectations.json');
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, JSON.stringify(obj));
}

test('doc-claim : marque « cible » mais le fichier EXISTE -> derive', () => {
  const root = tmpRepo();
  touch(root, 'knowledge_base/search.mjs');
  const findings = auditDocClaims(root, [
    { path: 'knowledge_base/search.mjs', claimed: 'target', source: 'carte X' },
  ]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].drift, /EXISTE/);
});

test('doc-claim : marque « cible » et le fichier est ABSENT -> aligne (pas de derive)', () => {
  const root = tmpRepo();
  const findings = auditDocClaims(root, [
    { path: 'scripts/forge/agents_ccgs', claimed: 'target', source: 'carte Y' },
  ]);
  assert.equal(findings.length, 0);
});

test('doc-claim : marque « existe » mais le fichier est ABSENT -> derive', () => {
  const root = tmpRepo();
  const findings = auditDocClaims(root, [
    { path: 'scripts/forge/disparu.py', claimed: 'exists', source: 'carte Z' },
  ]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].drift, /ABSENT/);
});

test('doc-claim : marque « existe » et le fichier EXISTE -> aligne', () => {
  const root = tmpRepo();
  touch(root, 'scripts/forge/verdict.py');
  const findings = auditDocClaims(root, [
    { path: 'scripts/forge/verdict.py', claimed: 'exists', source: 'carte' },
  ]);
  assert.equal(findings.length, 0);
});

test('connecteur bien plus vieux que la telemetrie -> dormant', () => {
  const root = tmpRepo();
  touch(root, 'lab/forge_evidence/forge_telemetry.jsonl', 0); // frais
  touch(root, 'lab/reports/forge_ledger_proposals.jsonl', 10); // 10 jours de retard
  const findings = auditConnectorDormancy(root, {
    reference: 'lab/forge_evidence/forge_telemetry.jsonl',
    watched: ['lab/reports/forge_ledger_proposals.jsonl'],
    threshold_days: 3,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].status, 'dormant');
  assert.ok(findings[0].lag_days >= 3);
});

test('connecteur recent -> aucune alerte de dormance', () => {
  const root = tmpRepo();
  touch(root, 'lab/forge_evidence/forge_telemetry.jsonl', 0);
  touch(root, 'lab/reports/forge_ledger_proposals.jsonl', 1);
  const findings = auditConnectorDormancy(root, {
    reference: 'lab/forge_evidence/forge_telemetry.jsonl',
    watched: ['lab/reports/forge_ledger_proposals.jsonl'],
    threshold_days: 3,
  });
  assert.equal(findings.filter((f) => f.status === 'dormant').length, 0);
});

test('connecteur jamais ecrit -> informatif, pas une dormance dure', () => {
  const root = tmpRepo();
  touch(root, 'lab/forge_evidence/forge_telemetry.jsonl', 0);
  const findings = auditConnectorDormancy(root, {
    reference: 'lab/forge_evidence/forge_telemetry.jsonl',
    watched: ['lab/reports/forge_bible_proposals.jsonl'],
    threshold_days: 3,
  });
  assert.equal(findings[0].status, 'jamais_ecrit');
});

test('telemetrie de reference absente -> dormance non evaluable, pas d\'invention', () => {
  const root = tmpRepo();
  const findings = auditConnectorDormancy(root, {
    reference: 'lab/forge_evidence/forge_telemetry.jsonl',
    watched: ['lab/reports/forge_ledger_proposals.jsonl'],
    threshold_days: 3,
  });
  assert.equal(findings[0].status, 'reference_absente');
});

test('runSelfAudit : integration bout-en-bout, derive -> ok=false', () => {
  const root = tmpRepo();
  // manifeste minimal ecrit dans le tmp repo
  touch(root, 'knowledge_base/search.mjs'); // existe mais declare cible -> derive
  touch(root, 'lab/forge_evidence/forge_telemetry.jsonl', 0);
  touch(root, 'lab/reports/forge_ledger_proposals.jsonl', 10); // dormant
  writeManifest(root, {
    doc_claims: [{ path: 'knowledge_base/search.mjs', claimed: 'target', source: 'carte' }],
    connectors: {
      reference: 'lab/forge_evidence/forge_telemetry.jsonl',
      watched: ['lab/reports/forge_ledger_proposals.jsonl'],
      threshold_days: 3,
    },
  });
  const r = runSelfAudit(root);
  assert.equal(r.ok, false);
  assert.equal(r.docDrift.length, 1);
  assert.equal(r.dormancy.filter((d) => d.status === 'dormant').length, 1);
});

test('runSelfAudit : studio aligne -> ok=true', () => {
  const root = tmpRepo();
  touch(root, 'lab/forge_evidence/forge_telemetry.jsonl', 0);
  touch(root, 'lab/reports/forge_ledger_proposals.jsonl', 1); // frais
  writeManifest(root, {
    doc_claims: [{ path: 'scripts/forge/agents_ccgs', claimed: 'target', source: 'carte' }], // cible + absent = aligne
    connectors: {
      reference: 'lab/forge_evidence/forge_telemetry.jsonl',
      watched: ['lab/reports/forge_ledger_proposals.jsonl'],
      threshold_days: 3,
    },
  });
  const r = runSelfAudit(root);
  assert.equal(r.ok, true);
});

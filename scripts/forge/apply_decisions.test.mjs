// Tests de apply_decisions.mjs — node --test. Fixtures ephemeres sous un faux repoRoot,
// meme discipline que pending_review.test.mjs : le repo reel peut bouger, ces tests non.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadDecisions, isActionableDecision, loadProposalLines, matchLines,
  planDecisions, writeChanges, DEFAULT_DECISIONS_FILE,
} from './apply_decisions.mjs';

function fakeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'applydec-'));
  mkdirSync(join(root, 'lab', 'reports'), { recursive: true });
  return root;
}
function writeJsonl(root, relPath, lines) {
  const full = join(root, relPath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, lines.join('\n') + '\n', 'utf-8');
}
function readJsonl(root, relPath) {
  const text = readFileSync(join(root, relPath), 'utf-8');
  return text.split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

// --- loadDecisions / isActionableDecision --------------------------------------------------

test('loadDecisions: fichier absent -> status ABSENT, jamais fatal', () => {
  const root = fakeRepo();
  const r = loadDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(r.status, 'ABSENT');
  assert.deepEqual(r.raw, []);
});

test('loadDecisions: ligne corrompue ignoree, pas de crash', () => {
  const root = fakeRepo();
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ queue: 'q', item: 'a', decision: 'ACCEPT' }),
    '{pas du json',
  ]);
  const r = loadDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(r.raw.length, 1);
  assert.equal(r.ignored_lines, 1);
});

test('isActionableDecision: ligne meta (sans queue/item) -> false', () => {
  assert.equal(isActionableDecision({ ts: '2026-07-20', note: 'synthese' }), false);
});

test('isActionableDecision: decision valide ACCEPT/REJECT -> true', () => {
  assert.equal(isActionableDecision({ queue: 'q', item: 'a', decision: 'ACCEPT' }), true);
  assert.equal(isActionableDecision({ queue: 'q', item: 'a', decision: 'REJECT' }), true);
  assert.equal(isActionableDecision({ queue: 'q', item: 'a', decision: 'POSTPONE' }), false);
});

// --- loadProposalLines / matchLines ---------------------------------------------------------

test('loadProposalLines: conserve la ligne brute pour reecriture fidele', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl', [
    JSON.stringify({ project: 'p', run_id: 'p-run1', ts: 1000 }),
  ]);
  const r = loadProposalLines(root, 'lab/reports/forge_ledger_proposals.jsonl');
  assert.equal(r.status, 'OK');
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].parsed.run_id, 'p-run1');
});

test('matchLines: egalite stricte sur le premier champ candidat qui existe', () => {
  const lines = [
    { raw: '', parsed: { run_id: 'a-run1', project: 'a' } },
    { raw: '', parsed: { run_id: 'b-run1', project: 'b' } },
  ];
  const idx = matchLines(lines, ['run_id', 'project'], 'b-run1');
  assert.deepEqual(idx, [1]);
});

test('matchLines: pas de sous-chaine, egalite stricte uniquement', () => {
  const lines = [{ raw: '', parsed: { title: '[auto] erreur inconnue: council contract rejete' } }];
  const idx = matchLines(lines, ['title'], 'council contract rejete');
  assert.deepEqual(idx, []); // sous-chaine, pas egal -> pas de match
});

// --- planDecisions : cas nominal -------------------------------------------------------------

test('planDecisions: cas nominal ACCEPT sur forge_ledger_proposals (match run_id)', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl', [
    JSON.stringify({ project: 'shmup_slice', run_id: 'shmup_slice-20260714a', ts: 1000, status: 'PROPOSED' }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_ledger_proposals', item: 'shmup_slice-20260714a', decision: 'ACCEPT', motif: 'ok' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0].requested_status, 'ACCEPTED');
  assert.equal(plan.already_up_to_date.length, 0);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.orphaned.length, 0);
});

test('planDecisions: REJECT mappe vers REJECTED', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_project_proposals.jsonl', [
    JSON.stringify({ project: 'collect_runner', folder: 'games/collect_runner', ts: 1000, status: 'PROPOSED' }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_project_proposals', item: 'collect_runner', decision: 'REJECT', motif: 'ferme' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0].requested_status, 'REJECTED');
});

// --- planDecisions : idempotence --------------------------------------------------------------

test('planDecisions + writeChanges: rejouer --apply sur un etat deja applique -> 0 changement', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl', [
    JSON.stringify({ project: 'shmup_slice', run_id: 'shmup_slice-20260714a', ts: 1000, status: 'PROPOSED' }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_ledger_proposals', item: 'shmup_slice-20260714a', decision: 'ACCEPT', motif: 'ok' }),
  ]);
  const plan1 = planDecisions(root, DEFAULT_DECISIONS_FILE);
  const written1 = writeChanges(root, plan1.fileState);
  assert.equal(written1.length, 1);
  assert.equal(plan1.changes.length, 1);

  const proposalsAfter = readJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl');
  assert.equal(proposalsAfter[0].review_status, 'ACCEPTED');
  assert.equal(proposalsAfter[0].review_ts, '2026-07-20');
  assert.equal(proposalsAfter[0].review_source, DEFAULT_DECISIONS_FILE);
  assert.ok(existsSync(join(root, 'lab/reports/forge_ledger_proposals.jsonl.bak')));

  // Re-run : deja a jour, 0 changement, rien reecrit.
  const plan2 = planDecisions(root, DEFAULT_DECISIONS_FILE);
  const written2 = writeChanges(root, plan2.fileState);
  assert.equal(plan2.changes.length, 0);
  assert.equal(plan2.already_up_to_date.length, 1);
  assert.equal(written2.length, 0);
});

// --- planDecisions : orpheline -----------------------------------------------------------------

test('planDecisions: decision sans proposition correspondante -> orpheline, jamais inventee', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/error_proposals.jsonl', [
    JSON.stringify({ error_signature: '54d9a6ad5f590d7c', title: '[auto] erreur inconnue: council contract rejete: write-path/command interdit', created_ts: 1000 }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'error_proposals', item: 'council contract write-path interdit', decision: 'ACCEPT', motif: 'lecon reelle' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.orphaned.length, 1);
  assert.equal(plan.orphaned[0].item, 'council contract write-path interdit');
});

test('planDecisions: queue inconnue -> orpheline (pas un crash)', () => {
  const root = fakeRepo();
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'inconnue_queue', item: 'x', decision: 'ACCEPT' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.orphaned.length, 1);
  assert.match(plan.orphaned[0].reason, /queue inconnue/);
});

test('planDecisions: fichier de propositions absent -> orpheline', () => {
  const root = fakeRepo();
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_ledger_proposals', item: 'x-run1', decision: 'ACCEPT' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.orphaned.length, 1);
  assert.match(plan.orphaned[0].reason, /absent/);
});

// --- planDecisions : conflit ---------------------------------------------------------------

test('planDecisions: proposition deja marquee d\'un statut different -> conflit, pas ecrase', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl', [
    JSON.stringify({ project: 'x', run_id: 'x-run1', ts: 1000, review_status: 'REJECTED', review_ts: '2026-07-01', review_source: 'manuel' }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_ledger_proposals', item: 'x-run1', decision: 'ACCEPT', motif: 'nouvelle decision' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].existing_status, 'REJECTED');
  assert.equal(plan.conflicts[0].requested_status, 'ACCEPTED');

  const written = writeChanges(root, plan.fileState);
  assert.equal(written.length, 0);
  const after = readJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl');
  assert.equal(after[0].review_status, 'REJECTED'); // inchange
});

// --- entrees narratives (skipped_meta) ------------------------------------------------------

test('planDecisions: lignes meta (sans queue/item/decision valide) -> skipped_meta, jamais orpheline', () => {
  const root = fakeRepo();
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', actor: 'Pierre (HumanGate)', verbatim: 'synthese session' }),
    JSON.stringify({ ts: '2026-07-20', note: 'note de fin de session' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.skipped_meta, 2);
  assert.equal(plan.orphaned.length, 0);
  assert.equal(plan.changes.length, 0);
});

// --- dry-run n'ecrit rien --------------------------------------------------------------------

test('dry-run (planDecisions sans writeChanges) ne touche jamais le disque', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_project_proposals.jsonl', [
    JSON.stringify({ project: 'auto_battler', folder: 'games/auto_battler', ts: 1000, status: 'PROPOSED' }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_project_proposals', item: 'auto_battler', decision: 'ACCEPT', motif: 'ok' }),
  ]);
  const before = readFileSync(join(root, 'lab/reports/forge_project_proposals.jsonl'), 'utf-8');
  planDecisions(root, DEFAULT_DECISIONS_FILE); // writeChanges jamais appele : c'est le dry-run
  const after = readFileSync(join(root, 'lab/reports/forge_project_proposals.jsonl'), 'utf-8');
  assert.equal(before, after);
  assert.equal(existsSync(join(root, 'lab/reports/forge_project_proposals.jsonl.bak')), false);
});

// --- plusieurs decisions dans la meme file, matching different par champ -------------------

test('planDecisions: forge_ledger vs forge_project utilisent des champs candidats differents (run_id vs project)', () => {
  const root = fakeRepo();
  writeJsonl(root, 'lab/reports/forge_ledger_proposals.jsonl', [
    JSON.stringify({ project: 'card_engine', run_id: 'card_engine-20260720a', ts: 1000 }),
  ]);
  writeJsonl(root, 'lab/reports/forge_project_proposals.jsonl', [
    JSON.stringify({ project: 'card_engine', folder: 'games/card_engine', ts: 1000 }),
  ]);
  writeJsonl(root, DEFAULT_DECISIONS_FILE, [
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_ledger_proposals', item: 'card_engine-20260720a', decision: 'ACCEPT' }),
    JSON.stringify({ ts: '2026-07-20', queue: 'forge_project_proposals', item: 'card_engine', decision: 'ACCEPT' }),
  ]);
  const plan = planDecisions(root, DEFAULT_DECISIONS_FILE);
  assert.equal(plan.changes.length, 2);
  assert.equal(plan.orphaned.length, 0);
});

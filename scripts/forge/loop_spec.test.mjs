// Tests de loop_spec.mjs (dérivation déterministe loop.json depuis prisme.json).
// node --test scripts/forge/loop_spec.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { deriveLoopSpec, checkLoopSpec, ROLE_ORDER } from './loop_spec.mjs';
import { validateExigence } from './upstream_schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const RUN6_PRISME = resolve(REPO_ROOT, 'lab/forge_runs/kitten_clicker/prisme.json');

function loadRun6Prisme() {
  return JSON.parse(readFileSync(RUN6_PRISME, 'utf-8'));
}

// --- (a) fixture RÉELLE run 6 : mesure du diagnostic ------------------------------

test('run 6 (fixture reelle) : 0 exigence porte loop_role -> 0 step derive', () => {
  const prisme = loadRun6Prisme();
  assert.ok(Array.isArray(prisme.exigences) && prisme.exigences.length > 0,
    'la fixture doit exister et contenir des exigences');
  const spec = deriveLoopSpec(prisme);
  assert.equal(spec.game_id, 'kitten_clicker');
  assert.deepEqual(spec.steps, []);
});

test('run 6 (fixture reelle) : checkLoopSpec FAIL, les 7 roles sont listes manquants', () => {
  const prisme = loadRun6Prisme();
  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);
  assert.equal(check.ok, false);
  assert.equal(check.verdict, 'FAIL');
  assert.equal(check.problems.length, 7, `attendu 7 roles manquants, recu: ${JSON.stringify(check.problems)}`);
  for (const role of ROLE_ORDER) {
    assert.ok(check.problems.some((p) => p.includes(role)), `role ${role} doit etre nomme dans les problems`);
  }
});

// --- (b) fixture synthetique complete : 7 roles, ordre --------------------------

function exigenceLoop(id, role, extra = {}) {
  return {
    id,
    source: 'ADDITIONS',
    source_role: 'prisme',
    reference: null,
    observation: `observation ${id}`,
    claim: `claim ${id}`,
    enonce: `enonce ${id} distinct`,
    expected_proof: { kind: 'bot_action', statement: `preuve ${id}` },
    destination: 's9-build',
    loop_role: role,
    ...extra,
  };
}

function prismeSynthetiqueComplet() {
  return {
    game_id: 'kitten_clicker',
    exigences: [
      // volontairement pas dans l'ordre des roles, pour prouver le tri
      exigenceLoop('ML1', 'META_LOOP', {
        acteur: 'PLAYER', affordance: 'prestige',
        observe: { hud: 'prestige', predicate: 'increases' },
      }),
      exigenceLoop('PG1', 'PLAYER_GOAL', { observe: { hud: 'objectif', predicate: 'nonempty' } }),
      exigenceLoop('PA2', 'PLAYER_ACTION', {
        acteur: 'PLAYER', affordance: 'acheter_chaton',
        observe: { hud: 'collection', predicate: 'increases' },
      }),
      exigenceLoop('PA1', 'PLAYER_ACTION', {
        acteur: 'PLAYER', affordance: 'pelote', repeat: 15,
        observe: { hud: 'ronrons', predicate: 'increases' },
      }),
      exigenceLoop('GR1', 'GAME_RESPONSE', { observe: { hud: 'taux', predicate: 'increases', wait_frames: 120 } }),
      exigenceLoop('RW1', 'REWARD', { observe: { hud: 'ronrons', predicate: 'increases', wait_frames: 120 } }),
      exigenceLoop('UN1', 'UNLOCK', {
        acteur: 'PLAYER', affordance: 'acheter_amelioration',
        observe: { hud: 'taux', predicate: 'increases' },
      }),
      exigenceLoop('NG1', 'NEXT_GOAL', { observe: { hud: 'objectif', predicate: 'changes' } }),
      exigenceLoop('HORS1', 'NONE'),
    ],
  };
}

test('fixture synthetique complete : checkLoopSpec OK, ordre des steps = ordre des roles', () => {
  const spec = deriveLoopSpec(prismeSynthetiqueComplet());
  const check = checkLoopSpec(spec);
  assert.deepEqual(check.problems, []);
  assert.equal(check.ok, true);
  assert.equal(check.verdict, 'OK');
  // 8 exigences avec loop_role != NONE (le 9eme, HORS1, est loop_role NONE -> exclu)
  assert.equal(spec.steps.length, 8);
  assert.deepEqual(spec.steps.map((s) => s.role), [
    'PLAYER_GOAL', 'PLAYER_ACTION', 'PLAYER_ACTION', 'GAME_RESPONSE',
    'REWARD', 'UNLOCK', 'NEXT_GOAL', 'META_LOOP',
  ]);
  // au sein d'un meme role (PLAYER_ACTION), tri par id : PA1 avant PA2
  const actions = spec.steps.filter((s) => s.role === 'PLAYER_ACTION');
  assert.deepEqual(actions.map((s) => s.ref), ['PA1', 'PA2']);
  const pa1 = actions.find((s) => s.ref === 'PA1');
  assert.equal(pa1.affordance, 'pelote');
  assert.equal(pa1.repeat, 15);
  assert.deepEqual(pa1.observe, { hud: 'ronrons', predicate: 'increases' });
  const gr1 = spec.steps.find((s) => s.ref === 'GR1');
  assert.equal(gr1.wait_frames, 120);
});

// --- (c) determinisme --------------------------------------------------------------

test('deriveLoopSpec est deterministe : deux appels sur la meme entree -> JSON strictement egal', () => {
  const prisme = prismeSynthetiqueComplet();
  const s1 = deriveLoopSpec(prisme);
  const s2 = deriveLoopSpec(prisme);
  assert.equal(JSON.stringify(s1), JSON.stringify(s2));
  // meme sur un CLONE profond independant (pas de dependance a l'identite d'objet)
  const clone = JSON.parse(JSON.stringify(prisme));
  const s3 = deriveLoopSpec(clone);
  assert.equal(JSON.stringify(s1), JSON.stringify(s3));
});

// --- (d) PLAYER_ACTION sans affordance -> FAIL nomme --------------------------------

test('PLAYER_ACTION sans affordance : checkLoopSpec FAIL nomme le probleme', () => {
  const prisme = prismeSynthetiqueComplet();
  const pa1 = prisme.exigences.find((e) => e.id === 'PA1');
  delete pa1.affordance;
  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);
  assert.equal(check.ok, false);
  assert.ok(check.problems.some((p) => /PA1/.test(p) && /affordance/.test(p)),
    `attendu un probleme nommant PA1 et affordance, recu: ${JSON.stringify(check.problems)}`);
});

// --- (e) validateExigence : acteur/loop_role additifs -------------------------------

test('validateExigence : acteur invalide produit un finding', () => {
  const ex = exigenceLoop('X1', 'NONE', { acteur: 'REFEREE' });
  const findings = validateExigence(ex, 0);
  assert.ok(findings.some((f) => /\.acteur:/.test(f)), JSON.stringify(findings));
});

test('validateExigence : PLAYER_ACTION avec acteur=SYSTEM produit un finding', () => {
  const ex = exigenceLoop('X2', 'PLAYER_ACTION', {
    acteur: 'SYSTEM', affordance: 'clic', observe: { hud: 'h', predicate: 'increases' },
  });
  const findings = validateExigence(ex, 0);
  assert.ok(findings.some((f) => /\.acteur:/.test(f) && /PLAYER/.test(f)), JSON.stringify(findings));
});

test('validateExigence : exigence ancienne sans champs de boucle -> 0 finding additif', () => {
  const ex = {
    id: 'OLD1', source: 'ADDITIONS', source_role: 'prisme', reference: null,
    observation: 'obs', claim: 'claim distinct', enonce: 'enonce distinct autre',
    expected_proof: { kind: 'oracle', statement: 'preuve' }, destination: 's9-build',
  };
  assert.deepEqual(validateExigence(ex, 0), []);
});

// Tests de loop_spec.mjs (dérivation déterministe loop.json depuis prisme.json).
// Gameplay Contract V2 (GO Pierre 2026-08-22) : 10 rôles A..J (C porté par B),
// H (REPEAT) et J (ADVANTAGE), G >= 2 new_distinct, F avec observe.appears.
// node --test scripts/forge/loop_spec.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { deriveLoopSpec, checkLoopSpec, ROLE_ORDER } from './loop_spec.mjs';
import { validateExigence, validatePrisme } from './upstream_schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
// Run 7 (kitten_clicker-20260821g, commit 3843d7b) — baseline mesurée par
// Pierre, non archivée (chemin courant = dernière run non déplacée sous
// `_runN_...`) : 8 exigences porteuses de loop_role, boucle A..I atteinte,
// H et J n'existent pas encore comme maillons (cf. plan du 2026-08-22).
const RUN7_PRISME = resolve(REPO_ROOT, 'lab/forge_runs/kitten_clicker/prisme.json');

function loadRun7Prisme() {
  return JSON.parse(readFileSync(RUN7_PRISME, 'utf-8'));
}

// --- (a) fixture RÉELLE run 7 : mesure du diagnostic ------------------------------

test('run 7 (fixture reelle) : checkLoopSpec FAIL, nomme REWARD sans observe, G=1, H absent, J absent, F sans appears', () => {
  const prisme = loadRun7Prisme();
  assert.ok(Array.isArray(prisme.exigences) && prisme.exigences.length > 0,
    'la fixture doit exister et contenir des exigences');
  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);

  assert.equal(check.ok, false);
  assert.equal(check.verdict, 'FAIL');

  const problems = check.problems;
  assert.ok(
    problems.some((p) => /REWARD/.test(p) && /EX04/.test(p) && /observe/.test(p)),
    `attendu un probleme REWARD/EX04/observe, recu: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => /NEXT_GOAL/.test(p) && /2 exigences attendues/.test(p) && /1 trouvee/.test(p)),
    `attendu un probleme NEXT_GOAL nommant 1 trouvee (< 2), recu: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => /REPEAT/.test(p) && /0 trouvee/.test(p)),
    `attendu un probleme REPEAT absent (0 trouvee), recu: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => /ADVANTAGE/.test(p) && /0 trouvee/.test(p)),
    `attendu un probleme ADVANTAGE absent (0 trouvee), recu: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => /UNLOCK/.test(p) && /appears/.test(p)),
    `attendu un probleme UNLOCK sans observe.appears, recu: ${JSON.stringify(problems)}`,
  );
});

// --- (b) fixture synthetique A..J complete ---------------------------------------

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

function prismeSynthetiqueAJComplet() {
  return {
    game_id: 'kitten_clicker',
    exigences: [
      // volontairement pas dans l'ordre des roles, pour prouver le tri
      exigenceLoop('J1', 'ADVANTAGE', {
        replay_ref: 'B1',
        observe: { hud: 'ronrons', predicate: 'increases_more_than:B1' },
      }),
      exigenceLoop('I1', 'META_LOOP', {
        acteur: 'PLAYER', affordance: 'prestige',
        observe: { hud: 'ronrons', predicate: 'resets' },
      }),
      exigenceLoop('H1', 'REPEAT', {
        replay: ['B1', 'F1'],
        observe: { hud: 'ronrons', predicate: 'increases' },
      }),
      exigenceLoop('G2', 'NEXT_GOAL', { observe: { hud: 'objectif', predicate: 'new_distinct' } }),
      exigenceLoop('G1', 'NEXT_GOAL', { observe: { hud: 'objectif', predicate: 'new_distinct' } }),
      exigenceLoop('F1', 'UNLOCK', {
        acteur: 'PLAYER', affordance: 'acheter_chaton',
        observe: { hud: 'collection', predicate: 'increases', appears: 'affordance' },
      }),
      exigenceLoop('E1', 'REWARD', { observe: { hud: 'ronrons', predicate: 'increases' } }),
      exigenceLoop('D1', 'GAME_RESPONSE', { observe: { hud: 'taux', predicate: 'increases' } }),
      exigenceLoop('B1', 'PLAYER_ACTION', {
        acteur: 'PLAYER', affordance: 'pelote', repeat: 15,
        observe: { hud: 'ronrons', predicate: 'increases' },
      }),
      exigenceLoop('A1', 'PLAYER_GOAL', { observe: { hud: 'objectif', predicate: 'nonempty' } }),
      exigenceLoop('HORS1', 'NONE'),
    ],
  };
}

test('fixture synthetique A..J complete : checkLoopSpec OK, ordre des steps = ordre des roles', () => {
  const spec = deriveLoopSpec(prismeSynthetiqueAJComplet());
  const check = checkLoopSpec(spec);
  assert.deepEqual(check.problems, []);
  assert.equal(check.ok, true);
  assert.equal(check.verdict, 'OK');

  // 10 exigences avec loop_role != NONE (HORS1 exclu)
  assert.equal(spec.steps.length, 10);
  assert.deepEqual(spec.steps.map((s) => s.role), [
    'PLAYER_GOAL', 'PLAYER_ACTION', 'GAME_RESPONSE', 'REWARD', 'UNLOCK',
    'NEXT_GOAL', 'NEXT_GOAL', 'REPEAT', 'META_LOOP', 'ADVANTAGE',
  ]);
  // au sein du role NEXT_GOAL, tri par id : G1 avant G2
  const goals = spec.steps.filter((s) => s.role === 'NEXT_GOAL');
  assert.deepEqual(goals.map((s) => s.ref), ['G1', 'G2']);

  const h1 = spec.steps.find((s) => s.ref === 'H1');
  assert.deepEqual(h1.replay, ['B1', 'F1']);
  const j1 = spec.steps.find((s) => s.ref === 'J1');
  assert.equal(j1.replay_ref, 'B1');
  const f1 = spec.steps.find((s) => s.ref === 'F1');
  assert.equal(f1.observe.appears, 'affordance');
});

// --- (c) determinisme --------------------------------------------------------------

test('deriveLoopSpec est deterministe : deux appels sur la meme entree -> JSON strictement egal', () => {
  const prisme = prismeSynthetiqueAJComplet();
  const s1 = deriveLoopSpec(prisme);
  const s2 = deriveLoopSpec(prisme);
  assert.equal(JSON.stringify(s1), JSON.stringify(s2));
  // meme sur un CLONE profond independant (pas de dependance a l'identite d'objet)
  const clone = JSON.parse(JSON.stringify(prisme));
  const s3 = deriveLoopSpec(clone);
  assert.equal(JSON.stringify(s1), JSON.stringify(s3));
});

// --- (d) G x2 dont un 'changes' au lieu de 'new_distinct' -> FAIL nomme -----------

test('G x2 dont un changes au lieu de new_distinct : checkLoopSpec FAIL nomme le probleme', () => {
  const prisme = prismeSynthetiqueAJComplet();
  const g2 = prisme.exigences.find((e) => e.id === 'G2');
  g2.observe.predicate = 'changes';
  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);
  assert.equal(check.ok, false);
  assert.ok(
    check.problems.some((p) => /NEXT_GOAL/.test(p) && /new_distinct/.test(p)),
    `attendu un probleme NEXT_GOAL/new_distinct, recu: ${JSON.stringify(check.problems)}`,
  );
});

// --- H avec ref inconnue -> FAIL nomme --------------------------------------------

test('H (REPEAT) avec une ref inconnue dans replay : checkLoopSpec FAIL nomme le probleme', () => {
  const prisme = prismeSynthetiqueAJComplet();
  const h1 = prisme.exigences.find((e) => e.id === 'H1');
  h1.replay = ['B1', 'ZZZ'];
  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);
  assert.equal(check.ok, false);
  assert.ok(
    check.problems.some((p) => /REPEAT/.test(p) && /ZZZ/.test(p)),
    `attendu un probleme REPEAT nommant ZZZ, recu: ${JSON.stringify(check.problems)}`,
  );
});

// --- PLAYER_ACTION sans affordance -> FAIL nomme (regression T1 initial) ----------

test('PLAYER_ACTION sans affordance : checkLoopSpec FAIL nomme le probleme', () => {
  const prisme = prismeSynthetiqueAJComplet();
  const b1 = prisme.exigences.find((e) => e.id === 'B1');
  delete b1.affordance;
  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);
  assert.equal(check.ok, false);
  assert.ok(check.problems.some((p) => /PLAYER_ACTION/.test(p) && /affordance/.test(p)),
    `attendu un probleme nommant PLAYER_ACTION et affordance, recu: ${JSON.stringify(check.problems)}`);
});

// --- (e) validateExigence : acteur/loop_role additifs, REPEAT/ADVANTAGE ----------

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

test('validateExigence : REPEAT sans replay produit un finding', () => {
  const ex = exigenceLoop('H1', 'REPEAT');
  const findings = validateExigence(ex, 0);
  assert.ok(findings.some((f) => /\.replay:/.test(f)), JSON.stringify(findings));
});

test('validateExigence : REPEAT avec replay non vide -> 0 finding sur replay', () => {
  const ex = exigenceLoop('H1', 'REPEAT', { replay: ['B1', 'F1'] });
  const findings = validateExigence(ex, 0);
  assert.ok(!findings.some((f) => /\.replay:/.test(f)), JSON.stringify(findings));
});

test('validateExigence : ADVANTAGE sans replay_ref produit un finding', () => {
  const ex = exigenceLoop('J1', 'ADVANTAGE', {
    observe: { hud: 'ronrons', predicate: 'increases_more_than:B1' },
  });
  const findings = validateExigence(ex, 0);
  assert.ok(findings.some((f) => /\.replay_ref:/.test(f)), JSON.stringify(findings));
});

test('validateExigence : ADVANTAGE avec predicate ne commencant pas par increases_more_than: produit un finding', () => {
  const ex = exigenceLoop('J1', 'ADVANTAGE', {
    replay_ref: 'B1',
    observe: { hud: 'ronrons', predicate: 'increases' },
  });
  const findings = validateExigence(ex, 0);
  assert.ok(findings.some((f) => /\.observe\.predicate:/.test(f) && /increases_more_than/.test(f)), JSON.stringify(findings));
});

test('validateExigence : ADVANTAGE complet (replay_ref + predicate coherent) -> 0 finding additif', () => {
  const ex = exigenceLoop('J1', 'ADVANTAGE', {
    replay_ref: 'B1',
    observe: { hud: 'ronrons', predicate: 'increases_more_than:B1' },
  });
  const findings = validateExigence(ex, 0);
  assert.deepEqual(findings, []);
});

test('validateExigence : exigence ancienne sans champs de boucle -> 0 finding additif', () => {
  const ex = {
    id: 'OLD1', source: 'ADDITIONS', source_role: 'prisme', reference: null,
    observation: 'obs', claim: 'claim distinct', enonce: 'enonce distinct autre',
    expected_proof: { kind: 'oracle', statement: 'preuve' }, destination: 's9-build',
  };
  assert.deepEqual(validateExigence(ex, 0), []);
});

// --- (f) retro-compat : validatePrisme sur le Prisme reel (run 7) -> 0 finding ---

test('validatePrisme sur le Prisme reel (run 7) : 0 finding (retro-compatibilite)', () => {
  const prisme = loadRun7Prisme();
  const findings = validatePrisme(prisme);
  assert.deepEqual(findings, []);
});

// --- ROLE_ORDER porte les 9 roles de boucle (NONE exclu) --------------------------

test('ROLE_ORDER porte les 9 roles A..J (C porte par B, NONE exclu)', () => {
  assert.deepEqual(ROLE_ORDER, [
    'PLAYER_GOAL', 'PLAYER_ACTION', 'GAME_RESPONSE', 'REWARD',
    'UNLOCK', 'NEXT_GOAL', 'REPEAT', 'META_LOOP', 'ADVANTAGE',
  ]);
});

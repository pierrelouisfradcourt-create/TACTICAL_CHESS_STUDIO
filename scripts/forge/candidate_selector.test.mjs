// Tests du Candidate Selector V0 (Decision Plane).
// node --test scripts/forge/candidate_selector.test.mjs
//
// Aucun LLM, aucun réseau, aucun runtime : ce sélecteur est déterministe par contrat,
// et deux tests le vérifient mécaniquement (source scannée + double exécution).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MOTIFS, analyserRewardContract, memeContexte, preuvesPresentes, contraintesRespectees,
  regressionDe, ordonner, resoudreExecution, selectionner, chargerContexte,
} from './candidate_selector.mjs';

const CTX = { dataset_sha256: 'aaa', worker_model: 'qwen2.5-14b-instruct' };

const PROBLEME = {
  id: 'P1',
  metrics: [{ name: 'completion' }, { name: 'tokens' }, { name: 'defauts' }],
  reward_contract: {
    objective: { metric: 'completion', direction: 'maximize' },
    constraints: [{ metric: 'defauts', operator: 'max', value: 0 }],
    penalties: ['tokens'],
    forbidden: ['mutation_score'],
    measurement_method: 'champs remplis / attendus',
  },
  forbidden_aggregation: ['mutation_score'],
};

function mutation(id, o = {}) {
  return {
    id,
    root_problem_id: o.probleme ?? 'P1',
    accepted: o.accepted ?? true,
    evaluation_context: o.contexte ?? CTX,
    measured_metrics: o.mesures ?? { completion: 1, defauts: 0 },
    measured_cost: { token_cost: o.cout ?? 10 },
    false_positive: o.fp ?? 0,
    evidence_refs: { artifacts: o.preuves ?? ['README.md'] },
    evidence_status: 'VERSIONED',
  };
}

/** Un dépôt minimal : les preuves doivent EXISTER physiquement. */
async function racine(fichiers = ['README.md']) {
  const dir = await mkdtemp(join(tmpdir(), 'selector-'));
  for (const f of fichiers) {
    await mkdir(join(dir, f, '..'), { recursive: true });
    await writeFile(join(dir, f), 'x', 'utf-8');
  }
  return dir;
}

const contexte = (mutations, extra = {}) => ({
  mutations,
  problemes: { root_problems: [PROBLEME] },
  capacites: extra.capacites ?? { capabilities: [] },
  recettes: extra.recettes ?? { recipes: [] },
  roles: extra.roles ?? new Set(['worldscan']),
});

// --- PHASE 2 : lecture mécanique du reward_contract -------------------------------

test('un champ non exploitable est SIGNALE, jamais interprete', () => {
  const a = analyserRewardContract({
    objective: { metric: 'completion', direction: 'maximize' },
    constraints: [
      { metric: 'defauts', operator: 'max', value: 0 },
      { metric: 'tokens', operator: 'max', value: 'declared' }, // cas RÉEL du dépôt
    ],
    penalties: ['cost_tokens'],                                  // cas RÉEL du dépôt
    measurement_method: 'NON DEFINI — jamais mesure',            // cas RÉEL du dépôt
  }, PROBLEME);

  assert.deepEqual(a.objective, { metric: 'completion', direction: 'maximize' });
  assert.equal(a.constraints.length, 1, 'seule la contrainte numerique est appliquee');
  assert.deepEqual(a.penalties, [], 'une penalite non mesurable ne penalise rien');
  const champs = a.non_exploitable.map((x) => x.champ);
  assert.ok(champs.includes('constraints[1]'));
  assert.ok(champs.includes('penalties'));
  assert.ok(champs.includes('measurement_method'));
});

test('une direction inconnue rend l objectif inexploitable (aucune interpretation)', () => {
  const a = analyserRewardContract({ objective: { metric: 'x', direction: 'better' } }, PROBLEME);
  assert.equal(a.objective, null);
  assert.ok(a.non_exploitable.some((x) => x.champ === 'objective.direction'));
});

// --- filtres -----------------------------------------------------------------------

test('mutation d un AUTRE probleme : hors sujet, jamais candidate', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' },
    contexte([mutation('A'), mutation('B', { probleme: 'P2' })]), r);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['A']);
  assert.ok(!res.rejected_candidates.some((x) => x.id === 'B'),
    'une mutation d un autre probleme n est pas « rejetee » : elle n est pas comparee');
});

test('contexte d evaluation different : REJET motive', async () => {
  const r = await racine();
  const res = selectionner(
    { root_problem_id: 'P1', evaluation_context: { dataset_sha256: 'aaa' } },
    contexte([mutation('A'), mutation('B', { contexte: { dataset_sha256: 'bbb' } })]), r);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['A']);
  assert.equal(res.rejected_candidates[0].motif, MOTIFS.CONTEXTE_DIFFERENT);
});

test('evidence_ref absente ou fichier introuvable : REJET', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' }, contexte([
    mutation('A'),
    mutation('SANS_REF', { preuves: [] }),
    mutation('FICHIER_ABSENT', { preuves: ['lab/nexiste_pas.json'] }),
  ]), r);
  const motifs = Object.fromEntries(res.rejected_candidates.map((x) => [x.id, x.motif]));
  assert.equal(motifs.SANS_REF, MOTIFS.SANS_PREUVE);
  assert.equal(motifs.FICHIER_ABSENT, MOTIFS.SANS_PREUVE);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['A']);
});

test('mutation non acceptee : REJET', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' },
    contexte([mutation('A'), mutation('REFUSEE', { accepted: false })]), r);
  assert.equal(res.rejected_candidates[0].motif, MOTIFS.NON_ACCEPTEE);
});

test('contrainte violee : REJET, avec le detail chiffre', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' }, contexte([
    mutation('A'),
    mutation('VIOLE', { mesures: { completion: 1, defauts: 3 } }),
    mutation('NON_MESUREE', { mesures: { completion: 1 } }),
  ]), r);
  const rej = Object.fromEntries(res.rejected_candidates.map((x) => [x.id, x]));
  assert.equal(rej.VIOLE.motif, MOTIFS.CONTRAINTE_VIOLEE);
  assert.match(rej.VIOLE.detail, /defauts=3 > max 0/);
  assert.equal(rej.NON_MESUREE.motif, MOTIFS.CONTRAINTE_VIOLEE);
  assert.match(rej.NON_MESUREE.detail, /non mesure/,
    'une contrainte non mesuree n est pas une contrainte respectee');
});

// --- classement --------------------------------------------------------------------

test('deux mutations du meme probleme : la meilleure sur l objectif gagne', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' }, contexte([
    mutation('FAIBLE', { mesures: { completion: 0.8, defauts: 0 } }),
    mutation('FORTE', { mesures: { completion: 1, defauts: 0 } }),
  ]), r);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['FORTE']);
});

test('objectif egal : departage par regression, puis par cout', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' }, contexte([
    mutation('CHER', { cout: 500 }),
    mutation('PAS_CHER', { cout: 10 }),
    mutation('REGRESSE', { cout: 1, mesures: { completion: 1, defauts: 0, regression_count: 2 } }),
  ]), r);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['PAS_CHER'],
    'le moins cher SANS regression, jamais le moins cher tout court');
});

test('EX AEQUO : tous rendus, aucun choix arbitraire', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' },
    contexte([mutation('A'), mutation('B'), mutation('C')]), r);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id).sort(), ['A', 'B', 'C']);
  assert.equal(res.selection_basis.tie_policy, 'ex_aequo_returned_in_full');
  assert.ok(res.reasoning.some((l) => /EX AEQUO/.test(l)));
});

test('objectif non mesure : classement sur regression puis cout, et on le DIT', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' }, contexte([
    mutation('SANS_OBJECTIF', { mesures: { defauts: 0 } }),
    mutation('AVEC_OBJECTIF', { mesures: { completion: 0.1, defauts: 0 } }),
  ]), r);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['AVEC_OBJECTIF'],
    'une valeur mesuree passe devant une valeur inconnue');
  const seul = selectionner({ root_problem_id: 'P1' },
    contexte([mutation('X', { mesures: { defauts: 0 } })]), r);
  assert.ok(seul.reasoning.some((l) => /aucun candidat ne mesure la metrique objectif/.test(l)));
});

// --- PHASE 3 : binding recette -> capacite -> runtime ------------------------------

test('resoudreExecution relie mutation -> recette -> capacite -> runtime declare', () => {
  const liens = resoudreExecution('M-1', {
    capacites: { capabilities: [{ id: 'cap_a', capability_status: 'PROVEN_EXECUTABLE',
      runtime_role: 'worldscan' }] },
    recettes: { recipes: [{ id: 'r_v1', recipe_status: 'EXECUTABLE',
      capability_chain: [{ capability: 'cap_a', evidence: 'M-1' }],
      runtime_roles: [{ capability: 'cap_a', capability_role: 'worldscan' }] }] },
    roles: new Set(['worldscan']),
  });
  assert.deepEqual(liens, [{ recipe: 'r_v1', recipe_status: 'EXECUTABLE', capability: 'cap_a',
    capability_status: 'PROVEN_EXECUTABLE', runtime_role: 'worldscan', runtime_declared: true }]);
});

test('un runtime non declare est SIGNALE, jamais invente', () => {
  const liens = resoudreExecution('M-1', {
    capacites: { capabilities: [{ id: 'cap_a', runtime_role: 'inexistant' }] },
    recettes: { recipes: [{ id: 'r_v1', capability_chain: [{ capability: 'cap_a', evidence: 'M-1' }],
      runtime_roles: [{ capability: 'cap_a', capability_role: null }] }] },
    roles: new Set(['worldscan']),
  });
  assert.equal(liens[0].runtime_declared, false);
});

test('aucune recette : liste vide, jamais une recette fabriquee', () => {
  assert.deepEqual(resoudreExecution('M-inconnue',
    { capacites: { capabilities: [] }, recettes: { recipes: [] }, roles: new Set() }), []);
});

// --- invariants de lane -------------------------------------------------------------

test('AUCUN score : ni dans la sortie, ni dans le vocabulaire', async () => {
  const r = await racine();
  const res = selectionner({ root_problem_id: 'P1' }, contexte([mutation('A')]), r);
  const brut = JSON.stringify(res).toLowerCase();
  for (const interdit of ['"score', '"reward"', '"fitness', '"rank', '"weight']) {
    assert.ok(!brut.includes(interdit), `champ interdit : ${interdit}`);
  }
  assert.deepEqual(res.selection_basis.priority_order,
    ['objective_improvement', 'no_regression', 'lowest_token_cost']);
});

test('AUCUN LLM, AUCUN runtime, AUCUNE ecriture : verifie sur la source', () => {
  const src = readFileSync(fileURLToPath(new URL('./candidate_selector.mjs', import.meta.url)), 'utf-8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  for (const interdit of ['fetch(', 'localhost', 'subprocess', 'child_process', 'spawn(',
    'writeFile', 'appendFile', 'rmSync']) {
    assert.ok(!code.includes(interdit), `le selecteur ne doit pas contenir « ${interdit} »`);
  }
});

test('DETERMINISME : deux appels identiques rendent exactement la meme chose', async () => {
  const r = await racine();
  const req = { root_problem_id: 'P1' };
  const ctx = () => contexte([mutation('A'), mutation('B', { cout: 5 })]);
  assert.deepEqual(selectionner(req, ctx(), r), selectionner(req, ctx(), r));
});

test('root_problem inconnu : erreur nommee, jamais une selection vide silencieuse', async () => {
  const res = selectionner({ root_problem_id: 'JAMAIS_VU' }, contexte([]), await racine());
  assert.equal(res.selection_basis.error, 'ROOT_PROBLEM_NOT_FOUND');
});

// --- le dépôt réel -------------------------------------------------------------------

test('DEPOT REEL : PROMPT_FIELD_OMISSION rend M-ws6 et motive les 5 rejets', async () => {
  const ctx = await chargerContexte();
  const res = selectionner({ root_problem_id: 'PROMPT_FIELD_OMISSION' }, ctx);
  assert.deepEqual(res.selected_candidates.map((c) => c.mutation_id), ['M-ws6']);
  assert.equal(res.rejected_candidates.length, 5);
  assert.ok(res.rejected_candidates.every((x) => x.motif === MOTIFS.NON_ACCEPTEE));
  // le contrat réel porte deux champs non exploitables : ils doivent être dits
  const champs = res.selection_basis.non_exploitable_fields.map((x) => x.champ);
  assert.ok(champs.includes('constraints[1]'), 'completion_tokens max "declared"');
  assert.ok(champs.includes('penalties'), 'cost_tokens n est pas une metrique declaree');
});

test('DEPOT REEL : ORACLE_FALSE_NEGATIVE rend 4 ex aequo — la METHODE est definie, pas la MESURE', async () => {
  const ctx = await chargerContexte();
  const res = selectionner({ root_problem_id: 'ORACLE_FALSE_NEGATIVE' }, ctx);
  assert.equal(res.selected_candidates.length, 4);
  assert.ok(res.selected_candidates.every((c) => c.objective_value === null));
  assert.ok(res.reasoning.some((l) => /EX AEQUO/.test(l)));
  // Corrige le 2026-08-04 : `measurement_method` decrit desormais la mesure REELLE
  // (campagne CAPABILITY_MEASUREMENT_V1), donc elle n est plus « non exploitable ».
  assert.ok(!res.selection_basis.non_exploitable_fields.some(
    (x) => x.champ === 'measurement_method'));
  // Mais les MUTATIONS ne portent toujours pas `detection_rate` dans leurs
  // measured_metrics : la campagne a mesure la CAPACITE, pas chaque mutation. Le
  // classement reste donc impossible sur l objectif — et c est dit.
  assert.ok(res.reasoning.some((l) => /aucun candidat ne mesure la metrique objectif/.test(l)));
});

// Tests de l'Agent Factory V0.
// node --test scripts/forge/agent_factory.test.mjs
//
// La Factory ne choisit pas, ne raisonne pas, ne score pas et n'exécute pas. Quatre
// tests le vérifient mécaniquement, dont un sur la source elle-même.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BLOCKERS, CHAMPS_REQUETE, blocContratRuntime, parseContratRuntime, validerRequete,
  empreinteExecution, instancier, chargerContexteFactory, requeteDepuisMutation,
} from './agent_factory.mjs';

const ROLES_YAML = [
  'models:', '  - id: lmstudio/qwen', '    roles:', '      - repair_runtime',
  'runtime_contracts:', '', '  repair_runtime:', '    mission: >-', '      reparer',
  '    implementation:', '      adapter:    scripts/forge/repair_runtime_adapter.mjs',
  '      entrypoint: scripts/forge/repair_step.mjs', '      model:      lmstudio/qwen',
  '      kill_switch: FORGE_REPAIR=0', '    inputs:  [finding_id, artifact_ref]',
  '    outputs: [before, after]', '  autre:', '    mission: x',
].join('\n');

const M = (o = {}) => ({
  id: o.id ?? 'M-1', root_problem_id: o.rp ?? 'P1', accepted: o.accepted ?? true,
  evidence_refs: { artifacts: ['README.md'] }, evidence_status: 'VERSIONED',
});

const CTX = (o = {}) => ({
  mutations: o.mutations ?? [M()],
  capacites: { capabilities: o.capacites ?? [{ id: 'cap_a',
    capability_status: o.capStatus ?? 'PROVEN_EXECUTABLE', runtime_role: 'repair_runtime' }] },
  recettes: { recipes: o.recettes ?? [{
    id: 'r_v1', proven: true, recipe_status: 'EXECUTABLE',
    capability_chain: [{ capability: 'cap_a', evidence: 'M-1' }],
    runtime_roles: [{ capability: 'cap_a', capability_role: 'repair_runtime' }],
    evidence_requirements: ['README.md'],
  }] },
  roles: o.roles ?? new Set(['repair_runtime']),
  runtime_contracts: o.contrats ?? new Set(['repair_runtime']),
  contrats_etape: o.etapes ?? new Map(),
  runtime_contracts_detail: o.detail ?? new Map([['repair_runtime',
    parseContratRuntime(ROLES_YAML, 'repair_runtime')]]),
});

const REQ = (o = {}) => ({
  root_problem_id: 'P1', mutation_id: 'M-1', recipe_id: 'r_v1', capability_id: 'cap_a',
  runtime_role: 'repair_runtime', evidence_required: [],
  execution_contract_ref: 'roles.yaml#runtime_contracts.repair_runtime', ...o,
});

async function racine() {
  const dir = await mkdtemp(join(tmpdir(), 'factory-'));
  await writeFile(join(dir, 'README.md'), 'x', 'utf-8');
  return dir;
}

const blockers = (p) => p.blockers.map((b) => b.blocker);

// --- contrat d'entrée -----------------------------------------------------------

test('CHAMPS_REQUETE est exactement le contrat FactoryRequest', () => {
  assert.deepEqual([...CHAMPS_REQUETE].sort(), [
    'capability_id', 'evidence_required', 'execution_contract_ref', 'mutation_id',
    'recipe_id', 'root_problem_id', 'runtime_role',
  ]);
});

test('validerRequete refuse un champ manquant ou un passager clandestin', () => {
  for (const champ of CHAMPS_REQUETE) {
    const r = REQ();
    delete r[champ];
    assert.throws(() => validerRequete(r), new RegExp(`manquant.*${champ}`), champ);
  }
  assert.throws(() => validerRequete({ ...REQ(), model: 'opus' }), /hors contrat.*model/);
});

// --- lecture du contrat de runtime ----------------------------------------------

test('parseContratRuntime lit entrypoint, adapter, modele, coupure, entrees, sorties', () => {
  const c = parseContratRuntime(ROLES_YAML, 'repair_runtime');
  assert.deepEqual(c.entrypoints, ['scripts/forge/repair_step.mjs']);
  assert.equal(c.adapter, 'scripts/forge/repair_runtime_adapter.mjs');
  assert.equal(c.model, 'lmstudio/qwen');
  assert.equal(c.kill_switch, 'FORGE_REPAIR=0');
  assert.deepEqual(c.inputs, ['finding_id', 'artifact_ref']);
  assert.deepEqual(c.outputs, ['before', 'after']);
  assert.equal(blocContratRuntime(ROLES_YAML, 'inexistant'), null);
});

// --- les sept vérifications -----------------------------------------------------

test('chemin complet valide -> FactoryExecutionPlan executable', async () => {
  const p = instancier(REQ(), CTX(), await racine());
  assert.equal(p.executable, true, JSON.stringify(p.blockers));
  assert.deepEqual(p.blockers, []);
  assert.equal(p.execution_mode, 'PLAN_ONLY');
  assert.ok(p.execution_id.startsWith('exec-'));
  assert.equal(p.selected_recipe, 'r_v1');
  assert.equal(p.runtime_to_call.runtime_role, 'repair_runtime');
  assert.deepEqual(p.required_inputs, ['finding_id', 'artifact_ref']);
  assert.deepEqual(p.expected_outputs, ['before', 'after']);
  assert.deepEqual(p.evidence_targets, ['README.md']);
});

test('mutation inexistante -> STOP, aucun plan partiel', async () => {
  const p = instancier(REQ({ mutation_id: 'JAMAIS' }), CTX(), await racine());
  assert.deepEqual(blockers(p), [BLOCKERS.MUTATION_NOT_FOUND]);
  assert.equal(p.selected_recipe, null);
  assert.equal(p.runtime_to_call, null);
});

test('mutation non acceptee -> blocker nomme', async () => {
  const p = instancier(REQ(), CTX({ mutations: [M({ accepted: false })] }), await racine());
  assert.equal(p.executable, false);
  assert.ok(blockers(p).includes(BLOCKERS.MUTATION_NOT_ACCEPTED));
});

test('recette absente -> STOP', async () => {
  const p = instancier(REQ({ recipe_id: 'inconnue' }), CTX(), await racine());
  assert.deepEqual(blockers(p), [BLOCKERS.RECIPE_NOT_FOUND]);
});

test('recette non executable -> blocker, verdict RECALCULE par le binding', async () => {
  const p = instancier(REQ(), CTX({
    recettes: [{ id: 'r_v1', proven: false, recipe_status: 'EXECUTABLE',
      capability_chain: [{ capability: 'cap_a', evidence: 'M-1' }],
      runtime_roles: [{ capability: 'cap_a', capability_role: 'repair_runtime' }],
      evidence_requirements: ['README.md'] }],
  }), await racine());
  assert.equal(p.executable, false);
  assert.ok(blockers(p).includes(BLOCKERS.RECIPE_NOT_EXECUTABLE),
    'recipe_status=EXECUTABLE ne suffit pas : le binding tranche');
});

test('capacite absente -> STOP', async () => {
  const p = instancier(REQ(), CTX({ capacites: [] }), await racine());
  assert.ok(blockers(p).includes(BLOCKERS.CAPABILITY_NOT_FOUND));
  assert.equal(p.runtime_to_call, null);
});

test('capacite pas PROVEN_EXECUTABLE -> blocker', async () => {
  const p = instancier(REQ(), CTX({ capStatus: 'PROVEN_EXECUTED_EMBEDDED' }), await racine());
  assert.equal(p.executable, false);
  assert.ok(blockers(p).includes(BLOCKERS.CAPABILITY_NOT_PROVEN_EXECUTABLE));
});

test('runtime sans contrat -> blocker, aucun runtime_to_call invente', async () => {
  const p = instancier(REQ(), CTX({ contrats: new Set(), detail: new Map() }), await racine());
  assert.ok(blockers(p).includes(BLOCKERS.RUNTIME_CONTRACT_MISSING));
  assert.equal(p.runtime_to_call, null);
});

test('evidence absente -> blocker avec les fichiers manquants', async () => {
  const p = instancier(REQ({ evidence_required: ['lab/nexiste_pas.json'] }), CTX(), await racine());
  assert.equal(p.executable, false);
  const b = p.blockers.find((x) => x.blocker === BLOCKERS.EVIDENCE_MISSING);
  assert.match(b.detail, /nexiste_pas/);
});

test('declaration incoherente -> declaration_mismatch, jamais un silence', async () => {
  const r = await racine();
  const mauvaisProbleme = instancier(REQ({ root_problem_id: 'AUTRE' }), CTX(), r);
  assert.ok(blockers(mauvaisProbleme).includes(BLOCKERS.DECLARATION_MISMATCH));

  const mauvaisContrat = instancier(REQ({ execution_contract_ref: 'roles.yaml#autre' }), CTX(), r);
  assert.ok(blockers(mauvaisContrat).includes(BLOCKERS.DECLARATION_MISMATCH));
});

// --- invariants -----------------------------------------------------------------

test('DETERMINISME : meme requete -> meme plan ET meme execution_id', async () => {
  const r = await racine();
  const a = instancier(REQ(), CTX(), r);
  const b = instancier(REQ(), CTX(), r);
  assert.deepEqual(a, b);
  assert.equal(a.execution_id, b.execution_id);
});

test('execution_id CHANGE si le plan change', async () => {
  const r = await racine();
  const ok = instancier(REQ(), CTX(), r);
  const ko = instancier(REQ(), CTX({ mutations: [M({ accepted: false })] }), r);
  assert.notEqual(ok.execution_id, ko.execution_id);
  assert.equal(empreinteExecution({ a: 1 }), empreinteExecution({ a: 1 }));
});

test('AUCUN effet fichier en mode plan', async () => {
  const r = await racine();
  const avant = (await readdir(r)).sort();
  instancier(REQ(), CTX(), r);
  instancier(REQ({ mutation_id: 'JAMAIS' }), CTX(), r);
  assert.deepEqual((await readdir(r)).sort(), avant);
});

test('AUCUN LLM, AUCUN reseau, AUCUNE ecriture, AUCUNE horloge : verifie sur la source', () => {
  const src = readFileSync(fileURLToPath(new URL('./agent_factory.mjs', import.meta.url)), 'utf-8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  for (const i of ['fetch(', 'localhost', 'subprocess', 'child_process', 'spawn(',
    'writeFile', 'appendFile', 'mkdir(', 'Date.now', 'Math.random']) {
    assert.ok(!code.includes(i), `la Factory ne doit pas contenir « ${i} »`);
  }
});

test('AUCUN score : le plan ne porte aucune note', async () => {
  const brut = JSON.stringify(instancier(REQ(), CTX(), await racine())).toLowerCase();
  for (const i of ['"score', '"reward"', '"fitness', '"rank', '"weight']) {
    assert.ok(!brut.includes(i), `champ interdit : ${i}`);
  }
});

// --- le dépôt réel --------------------------------------------------------------

test('DEPOT REEL : REPAIR-LOOP-V1 produit un plan valide, sans rien lancer', async () => {
  const ctx = await chargerContexteFactory();
  const plan = instancier(requeteDepuisMutation('REPAIR-LOOP-V1', ctx), ctx);
  assert.equal(plan.executable, true, JSON.stringify(plan.blockers));
  assert.equal(plan.execution_mode, 'PLAN_ONLY');
  assert.equal(plan.selected_recipe, 'world_scan_repair_v1');
  assert.equal(plan.runtime_to_call.runtime_role, 'repair_runtime');
  assert.deepEqual(plan.runtime_to_call.entrypoints, ['scripts/forge/repair_step.mjs']);
  assert.equal(plan.runtime_to_call.kill_switch, 'FORGE_REPAIR=0');
  assert.deepEqual(plan.required_inputs, ['finding_id', 'root_problem_id', 'artifact_ref',
    'evidence_ref', 'allowed_fields', 'forbidden_fields']);
  assert.deepEqual(plan.expected_outputs, ['before', 'after', 'patch', 'oracle_before',
    'oracle_after', 'evidence_created', 'mutation_used']);
  assert.equal(plan.evidence_targets.length, 4);
});

test('DEPOT REEL : une mutation interne ne produit AUCUN plan', async () => {
  const ctx = await chargerContexteFactory();
  const plan = instancier(requeteDepuisMutation('Q2-LANGUE', ctx), ctx);
  assert.equal(plan.executable, false);
  assert.ok(blockers(plan).includes(BLOCKERS.REQUEST_INVALID),
    'sans recette resolue, la requete elle-meme est incomplete — et c est dit');
});

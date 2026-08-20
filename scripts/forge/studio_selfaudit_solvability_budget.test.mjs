// Cablage du signal « budget de solvabilite » dans l'auto-audit (GO Pierre 2026-08-17).
//
// Ce fichier teste le PONT, pas la detection : la logique vit en Python
// (`forge/solvability_budget_audit.py`, 9 tests) parce qu'aucun parseur YAML n'existe cote
// Node dans ce depot — meme contrainte, meme solution que `auditContractSync`.
//
// TESTS CONDITIONNELS, et la raison compte. Le pont spawn un interpreteur trouve par
// `pythonCandidates`, qui cherche `.venv312` — NON VERSIONNE. Sur une copie isolee
// (`git archive HEAD`, protocole de validation prospective de ce depot), aucun venv n'existe :
// le pont retombe sur `python` nu, echoue, et rend `non_evaluable`. C'est son comportement
// DEGRADE PREVU, pas un defaut. Une premiere redaction assertait `status === 'ok'` sans
// condition : 4 tests rouges sur la copie isolee, verts sur le depot — un test qui depend de
// l'ENVIRONNEMENT et non du CODE. Meme piege que `test_sur_l_artefact_REEL_tetris`
// (commit 4e3223c), corrige de la meme facon : on saute avec un MOTIF NOMME.
// Mieux vaut un saut nomme qu'un rouge d'environnement.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { auditSolvabilityBudget, runSelfAudit } from './studio_selfaudit.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Le pont est-il exploitable ICI ? (venv present) */
function pontDisponible() {
  return auditSolvabilityBudget(REPO).status === 'ok';
}

const SAUT = { skip: 'pont Python indisponible (pas de .venv312 — copie isolee)' };

test('le statut est TOUJOURS l un des deux prevus, jamais une exception', () => {
  // Vrai dans TOUS les environnements : c'est l'invariant de robustesse du pont.
  const r = auditSolvabilityBudget(REPO);
  assert.ok(['ok', 'non_evaluable'].includes(r.status), `statut inattendu : ${r.status}`);
  assert.ok(Array.isArray(r.anomalies), 'anomalies doit rester un tableau, meme degrade');
  if (r.status === 'non_evaluable') assert.ok(r.detail, 'un non_evaluable doit dire POURQUOI');
});

test('DEPOT REEL : tetris remonte, et il est le SEUL contrat ignore', (t) => {
  if (!pontDisponible()) return t.skip(SAUT.skip);
  // Cas reel mesure le 2026-08-17. Si ce test rougit AVEC le pont disponible, c'est que le
  // PARC a change — pas que le pont s'est casse (le test precedent le distingue).
  const { anomalies } = auditSolvabilityBudget(REPO);
  const ignores = anomalies.filter((a) => a.etat === 'CONTRAT_IGNORE').map((a) => a.jeu).sort();
  assert.deepEqual(ignores, ['tetris']);
});

test('l anomalie ARRIVE dans la sortie de runSelfAudit', (t) => {
  if (!pontDisponible()) return t.skip(SAUT.skip);
  // Un detecteur qu'aucun rapport ne porte serait un « producteur sans consommateur ».
  const r = runSelfAudit(REPO);
  assert.ok(r.solvabilityBudget, 'le rapport ne porte pas le signal');
  assert.ok(r.solvabilityBudget.anomalies.some((a) => a.jeu === 'tetris'));
});

test('le signal n entre PAS dans `ok` — il rapporte, il ne ratifie pas', () => {
  // Vrai dans TOUS les environnements : `ok` est la conjonction des TROIS signaux durs,
  // que le pont ait abouti ou non. Meme regime que `registryDivergences` — la promotion
  // en gate dur serait une decision Pierre, pas un cablage.
  const r = runSelfAudit(REPO);
  const attendu = r.docDrift.length === 0
    && r.dormancy.filter((d) => d.status === 'dormant').length === 0
    && r.contractSync.status === 'ok';
  assert.equal(r.ok, attendu, '`ok` doit rester la conjonction des TROIS signaux durs');
});

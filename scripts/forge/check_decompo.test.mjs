// Tests de l'oracle s3-decompo (featuremap vs prisme).
// node --test scripts/forge/check_decompo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDecompoDoc, granularite } from './check_decompo.mjs';
import {
  prismeReference, featuremapReference, featuremapInventee, featuremapAmputee,
} from './upstream_fixtures.mjs';

test('VALIDITE: l oracle ACCEPTE la featuremap de reference', () => {
  const r = checkDecompoDoc(featuremapReference(), prismeReference());
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.exigences_non_couvertes, []);
  assert.deepEqual(r.feuilles_non_sourcees, []);
  assert.equal(r.verdict, 'OK');
  assert.equal(r.stats.feuilles, 4);
  assert.equal(r.stats.exigences_couvertes, 4);
  assert.equal(r.stats.exigences_prisme, 4);
});

test('COUVERTURE: une exigence non portee par une feuille est une omission signalee', () => {
  const r = checkDecompoDoc(featuremapAmputee(), prismeReference());
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.exigences_non_couvertes.length, 1);
  assert.match(r.exigences_non_couvertes[0], /ex\.progression/);
  assert.equal(r.stats.exigences_couvertes, 3);
});

test('NON-INVENTION: une feuille citant une exigence inexistante est refusee', () => {
  const r = checkDecompoDoc(featuremapInventee(), prismeReference());
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.feuilles_non_sourcees.length, 1);
  assert.match(r.feuilles_non_sourcees[0], /invention non declaree/);
  // et l'exigence orpheline remonte aussi en couverture
  assert.ok(r.exigences_non_couvertes.some((p) => /ex\.clic/.test(p)));
});

test('COMPLETUDE: une feuille sans preuve attendue ou sans capacite est refusee', () => {
  const d = featuremapReference();
  delete d.systemes[0].features[0].capacites[0].expected_proof;
  assert.equal(checkDecompoDoc(d, prismeReference()).verdict, 'FAIL');
  const d2 = featuremapReference();
  d2.systemes[0].features[0].capacites[0].capacite = '';
  assert.ok(checkDecompoDoc(d2, prismeReference()).problems.some((p) => /capacite: absent ou vide/.test(p)));
});

test('une featuremap vide ou absurde est refusee (pas de vert vacant)', () => {
  assert.equal(checkDecompoDoc({}, prismeReference()).verdict, 'FAIL');
  assert.equal(checkDecompoDoc({ game_id: 'x', systemes: [] }, prismeReference()).verdict, 'FAIL');
  assert.equal(checkDecompoDoc('texte libre', prismeReference()).verdict, 'FAIL');
});

test('sans Prisme, l oracle REFUSE au lieu de sauter la verification en silence', () => {
  const r = checkDecompoDoc(featuremapReference(), null);
  assert.equal(r.verdict, 'FAIL');
  assert.ok(r.problems.some((p) => /ni sautees en silence/.test(p)));
});

test('GRANULARITE: mesuree et reportee, jamais gatee (regle de variance)', () => {
  const d = featuremapReference();
  assert.deepEqual(granularite(d), { min: 1, max: 2 });
  // une granularite extreme reste OK : l'oracle la REPORTE, il ne la juge pas
  d.systemes[1].features[0].capacites.push({
    id: 'cap.achat.lot',
    capacite: 'Acheter dix batiments d un coup.',
    source_ref: 'ex.achat',
    expected_proof: { kind: 'bot_action', statement: 'Achat x10 debite dix fois le prix unitaire courant.' },
  });
  const r = checkDecompoDoc(d, prismeReference());
  assert.equal(r.verdict, 'OK');
  assert.equal(r.stats.feuilles_par_feature_max, 2);
  assert.equal(r.stats.feuilles, 5);
});

test('un id de capacite duplique est refuse', () => {
  const d = featuremapReference();
  d.systemes[1].features[0].capacites[0].id = 'cap.clic.increment';
  assert.ok(checkDecompoDoc(d, prismeReference()).problems.some((p) => /id duplique/.test(p)));
});

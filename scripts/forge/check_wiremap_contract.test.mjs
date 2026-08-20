// Tests de l'oracle d'AVANT-BUILD de la WireMap (couverture du plan).
// node --test scripts/forge/check_wiremap_contract.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWiremapContractDoc, extraireLignes } from './check_wiremap_contract.mjs';
import {
  wiremapReference, featuremapReference, wiremapSansCouvre, wiremapAmputee,
} from './upstream_fixtures.mjs';

test('VALIDITE: l oracle ACCEPTE la wiremap de reference', () => {
  const r = checkWiremapContractDoc(wiremapReference(), featuremapReference());
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.capacites_non_couvertes, []);
  assert.deepEqual(r.couverture_fantome, []);
  assert.equal(r.verdict, 'OK');
  assert.equal(r.stats.schema, 'v2');
  assert.equal(r.stats.lignes, 4);
  assert.equal(r.stats.capacites_couvertes, 4);
});

test('DISCRIMINATION: une wiremap sans `couvre` ne rend le delta plan/carte calculable par personne', () => {
  const r = checkWiremapContractDoc(wiremapSansCouvre(), featuremapReference());
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.stats.lignes_sans_couvre, 4);
  assert.equal(r.capacites_non_couvertes.length, 4);
});

test('COUVERTURE: une capacite du plan portee par aucune ligne est signalee', () => {
  const r = checkWiremapContractDoc(wiremapAmputee(), featuremapReference());
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.capacites_non_couvertes.length, 1);
  assert.match(r.capacites_non_couvertes[0], /cap\.hud\.compteur/);
});

test('COUVERTURE FANTOME: un couvre qui ne resout aucune capacite est signale', () => {
  const d = wiremapReference();
  d.lines[0].couvre = ['cap.inexistante'];
  const r = checkWiremapContractDoc(d, featuremapReference());
  assert.equal(r.couverture_fantome.length, 1);
  assert.equal(r.verdict, 'FAIL');
});

test('le schema v1 (features[]) est accepte comme le v2 (lines[])', () => {
  const v1 = {
    features: [
      { feature: 'clic', couvre: ['cap.clic.increment'] },
      { feature: 'tick', couvre: ['cap.production.tick'] },
      { feature: 'achat', couvre: ['cap.achat.batiment'] },
      { feature: 'hud', couvre: ['cap.hud.compteur'] },
    ],
  };
  const r = checkWiremapContractDoc(v1, featuremapReference());
  assert.equal(r.stats.schema, 'v1');
  assert.equal(r.verdict, 'OK');
  assert.deepEqual(extraireLignes(v1).schema, 'v1');
  assert.deepEqual(extraireLignes({}).schema, 'inconnu');
});

test('une wiremap absurde ou vide est refusee (pas de vert vacant)', () => {
  assert.equal(checkWiremapContractDoc({}, featuremapReference()).verdict, 'FAIL');
  assert.equal(checkWiremapContractDoc({ lines: [] }, featuremapReference()).verdict, 'FAIL');
  assert.equal(checkWiremapContractDoc('texte libre', featuremapReference()).verdict, 'FAIL');
});

test('une featuremap sans capacite rend la couverture inverifiable, et l oracle le dit', () => {
  const r = checkWiremapContractDoc(wiremapReference(), { game_id: 'x', systemes: [] });
  assert.equal(r.verdict, 'FAIL');
  assert.ok(r.problems.some((p) => /ni sautee en silence/.test(p)));
});

// Périmètre : ce que cet oracle NE fait PAS (sinon deux vérités concurrentes).
test('PERIMETRE: les regles d etat de ligne restent a check_line_states', () => {
  const d = wiremapReference();
  d.lines[0].state = 'ETAT_INVENTE';       // du ressort de check_line_states
  d.lines[0].source_role = '';             // idem
  const r = checkWiremapContractDoc(d, featuremapReference());
  assert.equal(r.verdict, 'OK'); // la COUVERTURE, elle, reste intacte
  assert.deepEqual(r.problems, []);
});

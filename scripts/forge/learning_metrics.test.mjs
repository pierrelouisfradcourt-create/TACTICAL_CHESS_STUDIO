import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord } from './learning_metrics.mjs';

test('un enregistrement complet porte les 3 metriques', () => {
  const r = buildRecord({ brick_id: 'sys-grid-nav-godot', reuse_ratio: 0, oracle_iterations: 2, joust_delta: null });
  assert.equal(r.brick_id, 'sys-grid-nav-godot');
  assert.equal(r.oracle_iterations, 2);
  assert.equal(r.no_comparison, true);
});

test('joust_delta present -> no_comparison false', () => {
  const r = buildRecord({ brick_id: 'x', reuse_ratio: 0.5, oracle_iterations: 1, joust_delta: 0.12 });
  assert.equal(r.no_comparison, false);
});

test('brick_id manquant -> erreur (pas de ligne anonyme dans la courbe)', () => {
  assert.throws(() => buildRecord({ reuse_ratio: 0, oracle_iterations: 1, joust_delta: null }), /brick_id/);
});

test('oracle_iterations negatif -> erreur', () => {
  assert.throws(() => buildRecord({ brick_id: 'x', reuse_ratio: 0, oracle_iterations: -1, joust_delta: null }), /oracle_iterations/);
});

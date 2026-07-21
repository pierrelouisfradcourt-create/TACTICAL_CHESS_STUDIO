import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGodotRunTrial, parseReceipt } from './godot_trial.mjs';

const CFG = { godot_project: 'fixtures/godot_trial_probe', godot_script: 'res://trial.gd', trial_timeout_ms: 30000 };

test('parseReceipt extrait la ligne prefixee au milieu du bruit', () => {
  const out = 'Godot Engine v4.6.3\nblabla\nFORGE_TRIAL {"succeeded":true,"ticks":9}\nautre bruit\n';
  assert.deepEqual(parseReceipt(out), { succeeded: true, ticks: 9 });
});

test('parseReceipt rejette une sortie sans recu', () => {
  assert.throws(() => parseReceipt('rien ici'), /aucun recu FORGE_TRIAL/);
});

test('parseReceipt rejette un recu mal forme', () => {
  assert.throws(() => parseReceipt('FORGE_TRIAL {pas du json}'), /recu FORGE_TRIAL illisible/);
});

test('parseReceipt rejette un recu au mauvais type', () => {
  assert.throws(() => parseReceipt('FORGE_TRIAL {"succeeded":"oui","ticks":9}'), /champ succeeded/);
});

test('runTrial passe le seed a Godot et rend le recu', () => {
  const calls = [];
  const spawnFn = (bin, args) => {
    calls.push({ bin, args });
    return { status: 0, stdout: 'FORGE_TRIAL {"succeeded":true,"ticks":5}', stderr: '' };
  };
  const runTrial = makeGodotRunTrial(spawnFn, () => 'FAKE_GODOT');
  const res = runTrial(42, CFG);
  assert.deepEqual(res, { succeeded: true, ticks: 5 });
  assert.equal(calls[0].bin, 'FAKE_GODOT');
  assert.ok(calls[0].args.includes('--headless'));
  assert.ok(calls[0].args.includes('--seed=42'));
});

test('exit code non nul -> erreur incluant stderr', () => {
  const spawnFn = () => ({ status: 1, stdout: '', stderr: 'SCRIPT ERROR: boom' });
  const runTrial = makeGodotRunTrial(spawnFn, () => 'FAKE_GODOT');
  assert.throws(() => runTrial(1, CFG), /exit 1.*boom/s);
});

test('cfg incomplet -> erreur explicite avant tout spawn', () => {
  let spawned = false;
  const spawnFn = () => { spawned = true; return { status: 0, stdout: '', stderr: '' }; };
  const runTrial = makeGodotRunTrial(spawnFn, () => 'FAKE_GODOT');
  assert.throws(() => runTrial(1, { godot_project: 'x' }), /godot_script/);
  assert.equal(spawned, false);
});

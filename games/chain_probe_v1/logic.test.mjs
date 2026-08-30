#!/usr/bin/env node
// logic.test.mjs — tests de mécanique avec mutations.
// Jamais de >= tautologique. Delta STRICT, invariants vérifiés.

import { test } from 'node:test';
import assert from 'node:assert';
import { GameState } from './logic.mjs';

test('GameState initialization', () => {
  const state = new GameState(1);
  assert.strictEqual(state.objectsActive, 0, 'Initial objectsActive should be 0');
  assert.strictEqual(state.terminalState, 'LOCKED', 'Initial terminal should be LOCKED');
  assert.strictEqual(state.won, false, 'Game should not be won initially');
});

test('Movement increases explored area strictly', () => {
  const state = new GameState(1);
  const before = state.exploredCells.size;
  state.moveAvatar(100, 100);
  const after = state.exploredCells.size;
  assert(after > before, 'Exploration must increase strictly (> not >=)');
});

test('Object activation: delta STRICT = 1', () => {
  const state = new GameState(1);
  assert.strictEqual(state.objectsActive, 0);

  const result1 = state.activateObject(0);
  assert.strictEqual(result1, true, 'First activation must succeed');
  assert.strictEqual(state.objectsActive, 1, 'Delta must be exactly 1, not >=');

  const result2 = state.activateObject(0);
  assert.strictEqual(result2, false, 'Second activation of same object must fail');
  assert.strictEqual(state.objectsActive, 1, 'objectsActive must not change on re-activation');

  const result3 = state.activateObject(1);
  assert.strictEqual(result3, true, 'Second distinct object activation must succeed');
  assert.strictEqual(state.objectsActive, 2, 'Delta must be exactly 1');
});

test('Terminal transitions LOCKED -> AVAILABLE exactly at objectsRequired', () => {
  const state = new GameState(1);
  assert.strictEqual(state.terminalState, 'LOCKED');

  state.activateObject(0);
  assert.strictEqual(state.terminalState, 'LOCKED', 'Not yet at required count');

  state.activateObject(1);
  assert.strictEqual(state.terminalState, 'LOCKED', 'Not yet at required count');

  state.activateObject(2);
  assert.strictEqual(state.terminalState, 'AVAILABLE', 'Must transition to AVAILABLE at exactement');
});

test('Objective changes with terminal state', () => {
  const state = new GameState(1);
  const obj1 = state.currentObjective();
  assert(obj1.includes('Activer'), 'Initial objective should mention activation');

  state.objectsActive = state.objectsRequired;
  state.terminalState = 'AVAILABLE';
  const obj2 = state.currentObjective();
  assert(obj2.includes('terminal'), 'Second objective should mention terminal');
  assert.notStrictEqual(obj1, obj2, 'Objectives must be distinct');

  state.won = true;
  const obj3 = state.currentObjective();
  assert(obj3.includes('Victoire'), 'Final objective should be victory');
});

test('Fresh objects start inactive and invisible', () => {
  const state = new GameState(1);
  assert.strictEqual(state.objects.length, 3);
  for (const obj of state.objects) {
    assert.strictEqual(obj.active, false, `object ${obj.id} must start inactive`);
    assert.strictEqual(obj.visible, false, `object ${obj.id} must start invisible`);
  }
});

test('step(): frameCount increases by exactly 1 per call', () => {
  const state = new GameState(1);
  assert.strictEqual(state.frameCount, 0);
  state.step(0);
  assert.strictEqual(state.frameCount, 1, 'frameCount must increment by exactly 1, not decrement');
  state.step(0);
  assert.strictEqual(state.frameCount, 2);
});

test('moveAvatar: revealing an object increases objectsVisible by exactly 1', () => {
  const state = new GameState(1);
  assert.strictEqual(state.objectsVisible, 0);
  state.moveAvatar(100, 80); // co-localisé avec l'objet 0 (distance 0 < 120)
  assert.strictEqual(state.objectsVisible, 1, 'objectsVisible must increase by exactly 1, not decrease');
  assert.strictEqual(state.objects[0].visible, true);
});

test('moveAvatar: does not re-flag an already-active object as visible', () => {
  const state = new GameState(1);
  state.activateObject(0); // actif mais jamais révélé (visible reste false)
  assert.strictEqual(state.objects[0].visible, false);
  const visibleBefore = state.objectsVisible;
  state.moveAvatar(100, 80); // avatar co-localisé avec l'objet 0, déjà actif
  assert.strictEqual(state.objects[0].visible, false,
    'un objet déjà actif ne doit jamais être re-marqué visible par la révélation');
  assert.strictEqual(state.objectsVisible, visibleBefore,
    'objectsVisible ne doit pas bouger pour un objet déjà actif');
});

test('_passiveActivateNearby: skips an already-active object and activates the next eligible one in range', () => {
  const state = new GameState(1);
  state.activateObject(0);           // objet 0 : déjà actif
  state.objects[0].visible = true;   // ... et visible (cas limite du garde and/or)
  state.objects[1].visible = true;   // objet 1 : visible, inactif -> cible légitime
  state.avatarX = state.objects[0].x; // avatar co-localisé avec les deux objets
  state.avatarY = state.objects[0].y;
  state.objects[1].x = state.avatarX;
  state.objects[1].y = state.avatarY;

  state._passiveActivateNearby(50);

  assert.strictEqual(state.objects[1].active, true,
    'l\'objet visible+inactif dans le rayon doit être activé (le garde ne doit pas s\'arrêter sur l\'objet déjà actif)');
  assert.strictEqual(state.objectsActive, 2, 'delta STRICT = 1 sur objet 1 (objet 0 déjà compté)');
});

test('_activatableTargets: excludes an already-active object even if visible', () => {
  const state = new GameState(1);
  state.activateObject(0);
  state.objects[0].visible = true; // actif + visible : ne doit PAS être une cible
  state.objects[1].visible = true; // visible + inactif : cible légitime
  state.objects[2].visible = false; // invisible : jamais une cible

  const targets = state._activatableTargets();

  assert.strictEqual(targets.length, 1, 'seul l\'objet visible+inactif doit être candidat');
  assert.strictEqual(targets[0].id, 1);
});

test('Bot policy divergence: explore vs activate', () => {
  const state1 = new GameState(1);
  const state2 = new GameState(1);

  // Policy 0 (explore)
  for (let i = 0; i < 300; i++) {
    state1.step(50); // Explore
  }

  // Policy 1 (activate)
  for (let i = 0; i < 300; i++) {
    state2.step(200); // Activate
  }

  const progress1 = state1.objectsActive;
  const progress2 = state2.objectsActive;

  assert.notStrictEqual(progress1, progress2, 'Policies must produce different objectsActive trajectories');
});

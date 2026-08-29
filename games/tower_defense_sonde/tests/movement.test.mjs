import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  effectiveSpeed, updateEnemyPosition, processLeak, progressToWave, initEnemyProgress
} from '../sim/movement.mjs';
import { pathCells } from '../config/geometry.mjs';
import { FROST_BASE_SLOW_MULT } from '../config/upgrades.mjs';
import { ENEMY_TYPES } from '../config/enemies.mjs';
import { initGameState } from '../sim/state.mjs';

const PATH = pathCells();
const PATH_LENGTH = PATH.length; // 47 — see tests/geometry.test.mjs golden

// Named epsilon for the one assertion whose exact value is not representable
// as a binary double (2.2 * 0.55 = 1.2100000000000002).
const SPEED_EPSILON = 1e-12;

test('R7: base speeds are exact, and a frost multiplier scales them exactly', () => {
  assert.equal(effectiveSpeed({ type: ENEMY_TYPES.GRUNT }), 2.0);
  assert.equal(effectiveSpeed({ type: ENEMY_TYPES.RUNNER }), 2.8);
  assert.equal(effectiveSpeed({ type: ENEMY_TYPES.BRUTE }), 1.0);
  assert.equal(effectiveSpeed({ type: ENEMY_TYPES.GRUNT }, FROST_BASE_SLOW_MULT), 1.1,
    '2.0 cases/s chilled = exactly 1.1 cases/s');
  // R7 as written in the WireMap: 2.2 cases/s under Frost -> 1.21 cases/s.
  assert.ok(
    Math.abs(2.2 * FROST_BASE_SLOW_MULT - 1.21) < SPEED_EPSILON,
    '2.2 cases/s chilled = 1.21 cases/s within the named epsilon'
  );
});

test('R31: movement is exactly speed x dt, in cases (dt in ms)', () => {
  const grunt = { type: ENEMY_TYPES.GRUNT, progress: initEnemyProgress(), x: 0, y: 0 };
  assert.equal(grunt.progress, 0, 'enemies enter at progress 0');
  assert.equal(updateEnemyPosition(grunt, 16), 'MOVING');
  assert.equal(grunt.progress, 0.032, '2.0 cases/s over 16ms = exactly 0.032 case');
  assert.deepEqual([grunt.x, grunt.y], [19 - 0.032, 0], 'interpolated along the first segment');
});

test('R7: a chilled enemy covers exactly its slowed distance in the same tick', () => {
  const chilled = { type: ENEMY_TYPES.GRUNT, progress: 0, x: 0, y: 0 };
  assert.equal(updateEnemyPosition(chilled, 16, FROST_BASE_SLOW_MULT), 'MOVING');
  assert.equal(chilled.progress, 0.0176, '1.1 cases/s over 16ms = exactly 0.0176 case');
});

test('R16: an enemy LEAKS the instant its progress reaches EXACTLY the path end', () => {
  // Grunt at 2.0 cases/s covers exactly 2 cases in 1000ms, landing on
  // progress === PATH_LENGTH — the precise boundary a `>=` flipped to `>`
  // would step straight over.
  const atEnd = { type: ENEMY_TYPES.GRUNT, progress: PATH_LENGTH - 2, x: 0, y: 0 };
  assert.equal(updateEnemyPosition(atEnd, 1000), 'LEAKED');
  assert.equal(atEnd.progress, PATH_LENGTH);

  const nearlyThere = { type: ENEMY_TYPES.GRUNT, progress: PATH_LENGTH - 2.5, x: 0, y: 0 };
  assert.equal(updateEnemyPosition(nearlyThere, 1000), 'MOVING', 'half a case short: not a leak');
  assert.equal(nearlyThere.progress, PATH_LENGTH - 0.5);
});

test('R16: on the last path cell an enemy is pinned to that cell, not interpolated past it', () => {
  const last = { type: ENEMY_TYPES.GRUNT, progress: PATH_LENGTH - 0.5, x: 0, y: 0 };
  assert.equal(updateEnemyPosition(last, 16), 'MOVING');
  assert.deepEqual([last.x, last.y], PATH[PATH_LENGTH - 1], 'clamped to the final cell [4,3]');
});

test('R16: a leak costs the EXACT life total of its enemy type, floored at 0', () => {
  const state = initGameState(1337);
  assert.equal(processLeak(state, { type: ENEMY_TYPES.GRUNT }), 1);
  assert.equal(state.lives, 19);
  assert.equal(processLeak(state, { type: ENEMY_TYPES.RUNNER }), 2);
  assert.equal(state.lives, 17);
  assert.equal(processLeak(state, { type: ENEMY_TYPES.BRUTE }), 5);
  assert.equal(state.lives, 12);
  assert.equal(state.leaks, 3, 'every leak is counted');

  state.lives = 3;
  assert.equal(processLeak(state, { type: ENEMY_TYPES.BRUTE }), 5);
  assert.equal(state.lives, 0, 'lives floor at 0, never negative');
  assert.equal(state.leaks, 4);
});

test('R1: progressToWave maps progress onto the exact frozen path cell', () => {
  assert.deepEqual(progressToWave(0), [19, 0]);
  assert.deepEqual(progressToWave(0.9), [19, 0], 'fractional progress stays on its cell');
  assert.deepEqual(progressToWave(1), [18, 0]);
  assert.deepEqual(progressToWave(PATH_LENGTH - 1), [4, 3]);
  assert.deepEqual(progressToWave(PATH_LENGTH), [4, 3], 'past the end: clamped to the last cell');
  assert.deepEqual(progressToWave(1000), [4, 3]);
});

import { strict as assert } from 'assert';
import { test } from 'node:test';
import { waveComposition, wavePrepTime } from '../config/waves.mjs';
import { enemyBaseStats, isLeakDamage, ENEMY_TYPES } from '../config/enemies.mjs';

test('R25: the 10-wave calendar is the exact frozen composition, V1 through V10', () => {
  assert.deepEqual(waveComposition(1), [{ type: 'grunt', count: 5 }]);
  assert.deepEqual(waveComposition(2), [{ type: 'grunt', count: 8 }]);
  assert.deepEqual(waveComposition(3), [{ type: 'grunt', count: 10 }, { type: 'runner', count: 2 }]);
  assert.deepEqual(waveComposition(4), [{ type: 'grunt', count: 12 }, { type: 'runner', count: 3 }]);
  assert.deepEqual(waveComposition(5), [{ type: 'runner', count: 6 }]);
  assert.deepEqual(waveComposition(6), [
    { type: 'grunt', count: 5 }, { type: 'runner', count: 4 }, { type: 'brute', count: 1 }]);
  assert.deepEqual(waveComposition(7), [{ type: 'brute', count: 2 }, { type: 'runner', count: 3 }]);
  assert.deepEqual(waveComposition(8), [{ type: 'brute', count: 3 }]);
  assert.deepEqual(waveComposition(9), [{ type: 'brute', count: 4 }, { type: 'runner', count: 5 }]);
  assert.deepEqual(waveComposition(10), [{ type: 'brute', count: 5 }]);
});

test('R25b: waves outside 1..10 resolve to an EMPTY composition, never a fallback wave', () => {
  assert.deepEqual(waveComposition(0), []);
  assert.deepEqual(waveComposition(11), []);
  assert.deepEqual(waveComposition(99), []);
});

test('R25c: the calendar is deterministic — two reads return the identical table', () => {
  for (let w = 1; w <= 10; w++) {
    assert.deepEqual(waveComposition(w), waveComposition(w), `wave ${w} is stable across reads`);
  }
  assert.equal(wavePrepTime(), 15, 'preparation window is exactly 15 seconds');
});

test('R26: enemy stats are constant — a Grunt in V10 is EXACTLY a Grunt in V1', () => {
  // The composition table carries no per-wave stat override and enemyBaseStats
  // takes no wave argument, so this equality is what "no hidden scaling" means
  // mechanically: identical objects, not merely "not much bigger".
  assert.deepEqual(enemyBaseStats(ENEMY_TYPES.GRUNT), { hp: 40, speed: 2.0, bounty: 8, armor: 0 });
  assert.deepEqual(enemyBaseStats(ENEMY_TYPES.RUNNER), { hp: 30, speed: 2.8, bounty: 6, armor: 0 });
  assert.deepEqual(enemyBaseStats(ENEMY_TYPES.BRUTE), { hp: 50, speed: 1.0, bounty: 25, armor: 4 });
  assert.equal(enemyBaseStats(ENEMY_TYPES.GRUNT).hp, 40);
});

test('R16: leak damage is the exact frozen cost per enemy type', () => {
  assert.equal(isLeakDamage(ENEMY_TYPES.GRUNT), 1);
  assert.equal(isLeakDamage(ENEMY_TYPES.RUNNER), 2);
  assert.equal(isLeakDamage(ENEMY_TYPES.BRUTE), 5);
});

import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  upgradeCost, levelScaling, level3Capability, frostEffectFor,
  FROST_BASE_SLOW_MULT, FROST_L1_DURATION
} from '../config/upgrades.mjs';
import { applyLevel3Capability } from '../sim/upgrades.mjs';
import { TOWER_TYPES } from '../config/tower_types.mjs';
import { enemyBaseStats, ENEMY_TYPES } from '../config/enemies.mjs';

test('R21: upgrade prices are the exact frozen table for all three towers', () => {
  assert.deepEqual(
    [1, 2, 3].map((lvl) => upgradeCost(TOWER_TYPES.GUN, lvl)), [50, 40, 80]);
  assert.deepEqual(
    [1, 2, 3].map((lvl) => upgradeCost(TOWER_TYPES.FROST, lvl)), [60, 48, 96]);
  assert.deepEqual(
    [1, 2, 3].map((lvl) => upgradeCost(TOWER_TYPES.CANNON, lvl)), [100, 80, 160]);
});

test('R22: levelScaling is exactly x1.6 damage and x1.1 range, compounded per level', () => {
  assert.deepEqual(levelScaling(6, 2.5, 1), { dmg: 6, range: 2.5 });
  assert.deepEqual(levelScaling(6, 2.5, 2), { dmg: 9.6, range: 2.75 });
  assert.deepEqual(levelScaling(6, 2.5, 3), { dmg: 15.36, range: 3.03 });
});

test('R23: the level-3 capability table is exact per tower type', () => {
  assert.deepEqual(level3Capability(TOWER_TYPES.GUN), { pierce: 3 });
  assert.deepEqual(level3Capability(TOWER_TYPES.FROST), { slowStrength: 0.6, slowDuration: 2.2 });
  assert.deepEqual(level3Capability(TOWER_TYPES.CANNON), { splashRadius: 1.8 });
});

test('R23: Frost L1/L2 share one slow, L3 slows STRICTLY harder and longer (exact values)', () => {
  // The level branch is load-bearing: L1 and L2 use the baseline, only L3 reads
  // the capability table. Asserting both branches to exact values kills a flip
  // of that branch condition in either direction.
  assert.deepEqual(frostEffectFor(1), { mult: FROST_BASE_SLOW_MULT, duration: FROST_L1_DURATION });
  assert.deepEqual(frostEffectFor(1), { mult: 0.55, duration: 1.0 });
  assert.deepEqual(frostEffectFor(2), { mult: 0.55, duration: 1.0 });
  assert.deepEqual(frostEffectFor(3), { mult: 0.4, duration: 2.2 });
  // 1 - slowStrength (0.6) is exactly representable as 0.4 in IEEE-754 doubles,
  // so this stays an equality rather than an epsilon comparison.
  assert.equal(1 - level3Capability(TOWER_TYPES.FROST).slowStrength, 0.4);
});

test('R23: applyLevel3Capability only fires at level 3, per tower type', () => {
  const bruteArmor = enemyBaseStats(ENEMY_TYPES.BRUTE).armor;
  assert.equal(bruteArmor, 4);

  // GUN: pierce eats flat armor, floored at 0 — and ONLY at L3.
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.GUN, level: 1 }, bruteArmor), 4);
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.GUN, level: 2 }, bruteArmor), 4);
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.GUN, level: 3 }, bruteArmor), 1);
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.GUN, level: 3 }, 2), 0, 'floored at 0');

  // CANNON: L3 replaces the splash radius outright (1.2 -> 1.8).
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.CANNON, level: 1 }, 1.2), 1.2);
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.CANNON, level: 3 }, 1.2), 1.8);

  // FROST: handled by frostEffectFor, so this dispatch is a pass-through.
  assert.equal(applyLevel3Capability({ type: TOWER_TYPES.FROST, level: 3 }, 7), 7);
});

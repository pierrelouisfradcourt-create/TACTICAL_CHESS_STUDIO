import { strict as assert } from 'assert';
import { test } from 'node:test';
import { towerStats, towerCost, TOWER_TYPES } from '../config/towers.mjs';

// ROOT of the "frozen config tables" suite. The sealed mutation command
// (`node --test tests/geometry… tests/towers… tests/combat… tests/solvability…`,
// see run-oracle.mjs) names four entry points; the per-table suites below are
// imported here so every one of them actually RUNS under that command. A test
// that is written but never executed by the sealed suite kills no mutant.
import './upgrades.test.mjs';
import './waves.test.mjs';

test('R5: Gun stats are the exact frozen table at every level', () => {
  assert.deepEqual(towerStats(TOWER_TYPES.GUN, 1),
    { cost: 50, dmg: 6, cadence: 2.0, range: 2.5, splash: 0, pierce: 0 });
  assert.deepEqual(towerStats(TOWER_TYPES.GUN, 2),
    { cost: 50, dmg: 9.6, cadence: 2.0, range: 2.75, splash: 0, pierce: 0 });
  assert.deepEqual(towerStats(TOWER_TYPES.GUN, 3),
    { cost: 50, dmg: 15.36, cadence: 2.0, range: 3.03, splash: 0, pierce: 0 });
});

test('R9: Cannon stats are the exact frozen table at every level', () => {
  assert.deepEqual(towerStats(TOWER_TYPES.CANNON, 1),
    { cost: 100, dmg: 22, cadence: 0.5, range: 3.0, splash: 1.2, pierce: 0 });
  assert.deepEqual(towerStats(TOWER_TYPES.CANNON, 2),
    { cost: 100, dmg: 35.2, cadence: 0.5, range: 3.3, splash: 1.2, pierce: 0 });
  assert.deepEqual(towerStats(TOWER_TYPES.CANNON, 3),
    { cost: 100, dmg: 56.32, cadence: 0.5, range: 3.63, splash: 1.2, pierce: 0 });
});

test('R5b: Frost stats are the exact frozen table at every level', () => {
  assert.deepEqual(towerStats(TOWER_TYPES.FROST, 1),
    { cost: 60, dmg: 3, cadence: 1.5, range: 2.0, splash: 0, pierce: 0 });
  assert.deepEqual(towerStats(TOWER_TYPES.FROST, 2),
    { cost: 60, dmg: 4.8, cadence: 1.5, range: 2.2, splash: 0, pierce: 0 });
  assert.deepEqual(towerStats(TOWER_TYPES.FROST, 3),
    { cost: 60, dmg: 7.68, cadence: 1.5, range: 2.42, splash: 0, pierce: 0 });
});

test('R22: each level multiplies damage by exactly 1.6 and range by exactly 1.1', () => {
  // Exact equalities, never "l2.dmg > l1.dmg": a scaling that merely grows
  // (say +1%) would satisfy an inequality while silently breaking the balance
  // table the whole difficulty curve rests on.
  const l1 = towerStats(TOWER_TYPES.GUN, 1);
  const l2 = towerStats(TOWER_TYPES.GUN, 2);
  const l3 = towerStats(TOWER_TYPES.GUN, 3);
  assert.equal(l2.dmg, 9.6);
  assert.equal(l3.dmg, 15.36);
  assert.equal(l2.range, 2.75);
  assert.equal(l3.range, 3.03);
  assert.equal(l1.cadence, l2.cadence, 'levels never change cadence');
  assert.equal(l1.cost, l3.cost, 'levels never change the base placement cost');
});

test('R21: Gun L3 total investment is exactly 170 gold (50 + 40 + 80)', () => {
  assert.equal(towerCost(TOWER_TYPES.GUN, 0, 1), 50, 'placement price comes from the base table');
  assert.equal(towerCost(TOWER_TYPES.GUN, 1, 2), 40, 'L1->L2 = 0.8x base');
  assert.equal(towerCost(TOWER_TYPES.GUN, 2, 3), 80, 'L2->L3 = 1.6x base');
  assert.equal(
    towerCost(TOWER_TYPES.GUN, 0, 1) + towerCost(TOWER_TYPES.GUN, 1, 2) + towerCost(TOWER_TYPES.GUN, 2, 3),
    170
  );
});

test('R21b: towerCost is priced per tower type, from level 0 and from a live level', () => {
  assert.equal(towerCost(TOWER_TYPES.FROST, 0, 1), 60);
  assert.equal(towerCost(TOWER_TYPES.CANNON, 0, 1), 100);
  assert.equal(towerCost(TOWER_TYPES.CANNON, 1, 2), 80);
  assert.equal(towerCost(TOWER_TYPES.CANNON, 2, 3), 160);
});

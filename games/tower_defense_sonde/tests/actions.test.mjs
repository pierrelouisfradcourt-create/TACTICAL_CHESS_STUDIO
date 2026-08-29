import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  selectTowerType, placeTower, upgradeTower, callWave, restart, validateAndApply
} from '../actions/actions.mjs';
import { initGameState, copyState } from '../sim/state.mjs';
import { hashState } from '../sim/hash.mjs';
import { isBuildable, pathCells } from '../config/geometry.mjs';
import { TOWER_TYPES } from '../config/tower_types.mjs';

const FREE = [1, 1];        // buildable (a pin cell)
const FREE2 = [1, 3];       // buildable, shares its x with FREE
const ON_PATH = pathCells()[0]; // [19, 0]

// Strict "nothing moved" comparison used by every refusal test (R41): the
// state hash AND the two ledgers that a bad intent could quietly touch.
const fingerprint = (state) => ({
  hash: hashState(state),
  gold: state.gold,
  ledger: { ...state.goldLedger },
  towers: state.towers.map((t) => ({ ...t })),
  phase: state.phase
});

test('R37: selecting a tower type records exactly that type', () => {
  const state = initGameState(1337);
  assert.equal(selectTowerType(state, TOWER_TYPES.CANNON), true);
  assert.equal(state.selectedTowerType, TOWER_TYPES.CANNON);
  assert.equal(selectTowerType(state, TOWER_TYPES.FROST), true);
  assert.equal(state.selectedTowerType, TOWER_TYPES.FROST);
});

test('R38: placing a Gun debits EXACTLY its cost and records the exact tower', () => {
  const state = initGameState(1337);
  assert.equal(isBuildable(...FREE), true);
  assert.equal(placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN), true);
  assert.equal(state.gold, 50, '100 - 50, exactly');
  assert.equal(state.goldLedger.spend, 50, 'the spend ledger moved by exactly the same 50');
  assert.equal(state.towers.length, 1);
  assert.deepEqual(state.towers[0], {
    id: 1000, x: FREE[0], y: FREE[1], type: TOWER_TYPES.GUN, level: 1, cooldownMs: 0
  });
});

test('R38: the placed type comes from the intent, else from the selection', () => {
  const explicit = initGameState(1337);
  // No selection at all: the explicit argument alone must carry the placement.
  assert.equal(explicit.selectedTowerType, undefined);
  assert.equal(placeTower(explicit, FREE[0], FREE[1], TOWER_TYPES.CANNON), true);
  assert.equal(explicit.towers[0].type, TOWER_TYPES.CANNON);
  assert.equal(explicit.gold, 0, '100 - 100, exactly');

  const selected = initGameState(1337);
  selectTowerType(selected, TOWER_TYPES.FROST);
  // No explicit argument: the selection alone must carry the placement.
  assert.equal(placeTower(selected, FREE[0], FREE[1]), true);
  assert.equal(selected.towers[0].type, TOWER_TYPES.FROST);
  assert.equal(selected.gold, 40, '100 - 60, exactly');
});

test('R38: two cells sharing only an x (or only a y) are BOTH buildable', () => {
  const state = initGameState(1337);
  assert.equal(placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN), true);
  // FREE2 shares FREE's x. Occupancy is (x AND y), never (x OR y).
  assert.equal(FREE2[0], FREE[0]);
  assert.equal(placeTower(state, FREE2[0], FREE2[1], TOWER_TYPES.GUN), true);
  assert.equal(state.towers.length, 2);
  assert.equal(state.gold, 0, '100 - 50 - 50, exactly');
});

test('R41: placing on a PATH cell is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  const before = fingerprint(state);
  assert.equal(placeTower(state, ON_PATH[0], ON_PATH[1], TOWER_TYPES.GUN), false);
  assert.deepEqual(fingerprint(state), before);
});

test('R41: placing OUT OF BOUNDS is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  const before = fingerprint(state);
  assert.equal(placeTower(state, -1, 0, TOWER_TYPES.GUN), false);
  assert.equal(placeTower(state, 0, 12, TOWER_TYPES.GUN), false);
  assert.deepEqual(fingerprint(state), before);
});

test('R41: placing on an OCCUPIED cell is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  assert.equal(placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN), true);
  const before = fingerprint(state);
  assert.equal(placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN), false);
  assert.deepEqual(fingerprint(state), before);
  assert.equal(state.towers.length, 1);
});

test('R41: placing with NO type chosen is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  const before = fingerprint(state);
  assert.equal(placeTower(state, FREE[0], FREE[1]), false);
  assert.deepEqual(fingerprint(state), before);
});

test('R41: placing without enough gold is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  state.gold = 49; // one gold short of a Gun
  const before = fingerprint(state);
  assert.equal(placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN), false);
  assert.deepEqual(fingerprint(state), before);
  // ...and exactly enough gold IS enough.
  state.gold = 50;
  assert.equal(placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN), true);
  assert.equal(state.gold, 0);
});

test('R39: upgrading debits the exact upgrade cost and raises the level by exactly 1', () => {
  const state = initGameState(1337);
  state.gold = 300;
  placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN); // -50 -> 250
  const id = state.towers[0].id;
  assert.equal(upgradeTower(state, id), true);
  assert.equal(state.towers[0].level, 2);
  assert.equal(state.gold, 210, '250 - 40, exactly');
  assert.equal(upgradeTower(state, id), true);
  assert.equal(state.towers[0].level, 3);
  assert.equal(state.gold, 130, '210 - 80, exactly');
  assert.equal(state.goldLedger.spend, 170, 'Gun L3 total investment is exactly 170');
});

test('R39: an upgrade targets EXACTLY the tower it names, and no other', () => {
  const state = initGameState(1337);
  state.gold = 300;
  placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN);
  placeTower(state, FREE2[0], FREE2[1], TOWER_TYPES.GUN);
  const [first, second] = state.towers;
  assert.equal(upgradeTower(state, second.id), true);
  assert.equal(second.level, 2, 'the named tower rose to level 2');
  assert.equal(first.level, 1, 'the other tower is untouched');
});

test('R41: upgrading a LEVEL 3 tower is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  state.gold = 1000;
  placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN);
  const id = state.towers[0].id;
  upgradeTower(state, id);
  upgradeTower(state, id);
  assert.equal(state.towers[0].level, 3);
  const before = fingerprint(state);
  assert.equal(upgradeTower(state, id), false, 'level 3 is the exact ceiling');
  assert.deepEqual(fingerprint(state), before);
});

test('R41: upgrading a tower that does not exist is refused, without throwing', () => {
  const state = initGameState(1337);
  state.gold = 1000;
  const before = fingerprint(state);
  assert.equal(upgradeTower(state, 424242), false);
  assert.deepEqual(fingerprint(state), before);
});

test('R41: upgrading without enough gold is refused and the state is strictly unchanged', () => {
  const state = initGameState(1337);
  placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN); // 100 -> 50
  state.gold = 39; // one gold short of the 40 upgrade
  const before = fingerprint(state);
  assert.equal(upgradeTower(state, state.towers[0].id), false);
  assert.deepEqual(fingerprint(state), before);
  state.gold = 40;
  assert.equal(upgradeTower(state, state.towers[0].id), true, 'exactly 40 is enough');
  assert.equal(state.gold, 0);
});

test('R29: a wave can be called during PREPARATION, and only then', () => {
  const state = initGameState(1337);
  assert.equal(state.phase, 'PREPARATION');
  assert.equal(callWave(state), true);
  assert.equal(state.phase, 'SPAWNING');
  assert.equal(state.enemies.length, 5);

  const before = fingerprint(state);
  assert.equal(callWave(state), false, 'calling again mid-wave is refused');
  assert.deepEqual(fingerprint(state), before);

  for (const phase of ['VICTORY', 'DEFEAT']) {
    const ended = initGameState(1337);
    ended.phase = phase;
    const snapshot = fingerprint(ended);
    assert.equal(callWave(ended), false, `a wave cannot be called in ${phase}`);
    assert.deepEqual(fingerprint(ended), snapshot);
  }
});

test('R36: restart rebuilds the exact opening position on the SAME seed', () => {
  const state = initGameState(1337);
  placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN);
  callWave(state);
  state.lives = 3;
  state.leaks = 7;

  assert.equal(restart(state), true);
  const fresh = initGameState(1337);
  assert.equal(state.seed, 1337);
  assert.equal(hashState(state), hashState(fresh), 'strictly equal to a brand-new game');
  assert.equal(state.gold, 100);
  assert.equal(state.lives, 20);
  assert.equal(state.leaks, 0);
  assert.equal(state.wave, 1);
  assert.equal(state.phase, 'PREPARATION');
  assert.deepEqual(state.towers, []);
  assert.deepEqual(state.enemies, []);
  assert.deepEqual(state.goldLedger, { bounty: 0, wave_bonus: 0, early_bonus: 0, spend: 0 });
});

test('R41: validateAndApply routes every known intent and refuses every unknown one', () => {
  const state = initGameState(1337);
  assert.equal(validateAndApply(state, { type: 'SELECT_TOWER', towerType: TOWER_TYPES.GUN }), true);
  assert.equal(validateAndApply(state, { type: 'PLACE_TOWER', x: FREE[0], y: FREE[1] }), true);
  assert.equal(state.gold, 50);
  assert.equal(validateAndApply(state, { type: 'UPGRADE_TOWER', towerId: state.towers[0].id }), true);
  assert.equal(state.towers[0].level, 2);
  assert.equal(validateAndApply(state, { type: 'CALL_WAVE' }), true);
  assert.equal(state.phase, 'SPAWNING');
  assert.equal(validateAndApply(state, { type: 'RESTART' }), true);
  assert.equal(state.phase, 'PREPARATION');

  const before = fingerprint(state);
  assert.equal(validateAndApply(state, { type: 'GIVE_ME_GOLD' }), false, 'unknown intent: refused');
  assert.equal(validateAndApply(state, { type: '' }), false);
  assert.equal(validateAndApply(state, {}), false);
  assert.deepEqual(fingerprint(state), before, 'and nothing moved');
});

test('R41: an intent that THROWS mid-flight is refused and the state is rolled back', () => {
  const state = initGameState(1337);
  placeTower(state, FREE[0], FREE[1], TOWER_TYPES.GUN); // 100 -> 50, spend 50
  const tower = state.towers[0];
  // A read-only `level` makes `tower.level++` throw in strict mode AFTER the
  // gold has already been debited — a real mid-flight failure, not a stub. The
  // rollback must undo that partial debit, not leave the player 40 gold poorer
  // for an upgrade that never happened.
  Object.defineProperty(tower, 'level', {
    value: 1, writable: false, configurable: true, enumerable: true
  });
  const before = copyState(state);
  assert.equal(validateAndApply(state, { type: 'UPGRADE_TOWER', towerId: tower.id }), false,
    'a throw is reported as a refusal, never as a success');
  assert.equal(state.gold, 50, 'the 40 gold debited before the throw was given back');
  assert.equal(state.goldLedger.spend, 50, 'the spend ledger was rolled back too');
  assert.equal(state.towers.length, 1);
  assert.equal(state.towers[0].level, 1, 'the tower did not gain a level');
  assert.equal(hashState(state), hashState(before), 'strictly the pre-intent state');
});

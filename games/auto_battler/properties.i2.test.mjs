// properties.i2.test.mjs - Mutation-hardening pass (s9 escalation, i2 increment)
// Targets specific survivor mutants reported by the mutation gate on:
// pool/pool.mjs, shop/shop.mjs, bench/bench.mjs, merge/merge.mjs,
// economy/gold.mjs, preparation/preparation.mjs
//
// Each test below is written to be OBSERVABLY different between the
// original operator and its mutant (||-> &&, !== -> ===, === -> !==,
// true -> false, false -> true, >= -> >), per the survivor line list
// in the s9-build dispatch. Genuinely equivalent survivors are NOT
// force-killed here; they are documented in mutation_triage.i2.json.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import * as state from './engine/state.mjs';
import * as prep from './preparation/preparation.mjs';
import { createExtendedGameState } from './preparation/preparation.mjs';
import * as poolMod from './pool/pool.mjs';
import * as shopMod from './shop/shop.mjs';
import * as benchMod from './bench/bench.mjs';
import * as mergeMod from './merge/merge.mjs';
import * as goldMod from './economy/gold.mjs';

// =====================================================================
// pool/pool.mjs
// =====================================================================

test('pool.reservePool: valid string unitDefId does not throw when stock is sufficient (kills neq->eq @23)', () => {
  assert.doesNotThrow(() => poolMod.reservePool({ unit_1: 5 }, 'unit_1', 2));
});

test('pool.reservePool: reserving more than available throws (MED-2: reservePool is a real operation, not a no-op)', () => {
  assert.throws(() => poolMod.reservePool({ unit_1: 1 }, 'unit_1', 2), /insufficient/);
  assert.throws(() => poolMod.reservePool({}, 'unit_1', 1), /insufficient/);
});

test('pool.reservePool: decrements available and deletes key at zero (MED-2)', () => {
  const p1 = poolMod.reservePool({ unit_1: 5 }, 'unit_1', 2);
  assert.equal(p1.unit_1, 3);
  const p2 = poolMod.reservePool({ unit_1: 2 }, 'unit_1', 2);
  assert.equal(p2.unit_1, undefined, 'key deleted when count reaches 0');
});

test('pool.reservePool: non-string unitDefId throws', () => {
  assert.throws(() => poolMod.reservePool({}, 123, 2));
});

test('pool.reservePool: qty validation isolates each OR clause (kills neq->eq/or->and)', () => {
  // valid: number, integer, >=0 -> no throw
  assert.doesNotThrow(() => poolMod.reservePool({}, 'unit_1', 0));
  // non-integer number: isolates "!Number.isInteger" clause true, others false.
  // Uses a pool with SUFFICIENT stock (not {}) so the later insufficiency
  // check (current < qty) can't incidentally throw and mask a weakened
  // type guard — this is what actually kills the first `||`->`&&` mutant
  // (MED-2: an empty-pool fixture here would pass on a broken type guard,
  // because 0 < 1.5 still throws via the wrong code path).
  assert.throws(() => poolMod.reservePool({ unit_1: 10 }, 'unit_1', 1.5));
  // negative integer: isolates "qty < 0" clause true, others false
  assert.throws(() => poolMod.reservePool({ unit_1: 10 }, 'unit_1', -1));
  // wrong type entirely
  assert.throws(() => poolMod.reservePool({ unit_1: 10 }, 'unit_1', '2'));
});

test('pool.getPoolCount: returns the stored count, or 0 when absent', () => {
  assert.equal(poolMod.getPoolCount({ unit_1: 7 }, 'unit_1'), 7);
  assert.equal(poolMod.getPoolCount({ unit_1: 7 }, 'unit_2'), 0);
  assert.equal(poolMod.getPoolCount({}, 'unit_1'), 0);
});

test('pool.debitPool: qty validation isolates each OR clause (kills or->and @48)', () => {
  const pool = { unit_1: 5 };
  assert.doesNotThrow(() => poolMod.debitPool(pool, 'unit_1', 1));
  assert.throws(() => poolMod.debitPool(pool, 'unit_1', 1.5), /qty must be/);
  assert.throws(() => poolMod.debitPool(pool, 'unit_1', -1), /qty must be/);
});

test('pool.debitPool: decrements and deletes key at zero', () => {
  const pool = { unit_1: 1 };
  const after = poolMod.debitPool(pool, 'unit_1', 1);
  assert.equal(after.unit_1, undefined, 'key removed when count reaches 0');
});

test('pool.restorePool: star validation isolates each OR clause (kills or->and @81)', () => {
  assert.doesNotThrow(() => poolMod.restorePool({}, 'unit_1', 1));
  // non-integer number
  assert.throws(() => poolMod.restorePool({}, 'unit_1', 1.5), /star must be/);
  // integer but < 1
  assert.throws(() => poolMod.restorePool({}, 'unit_1', 0), /star must be/);
});

test('pool.restorePool: star=2 restores exactly 3 exemplars (geometric progression)', () => {
  const after = poolMod.restorePool({}, 'unit_1', 2);
  assert.equal(after.unit_1, 3);
});

// =====================================================================
// shop/shop.mjs
// =====================================================================

const FULL_POOL = { unit_1: 10, unit_2: 10, unit_3: 10, unit_4: 10, unit_5: 10 };

test('shop.drawShop: rng_state validation (kills or->and @26)', () => {
  assert.throws(() => shopMod.drawShop(1.5, FULL_POOL, 1, 5), /rng_state/);
});

test('shop.drawShop: level validation isolates each OR clause (kills or->and @29 x2)', () => {
  assert.doesNotThrow(() => shopMod.drawShop(1, FULL_POOL, 1, 5));
  assert.throws(() => shopMod.drawShop(1, FULL_POOL, 1.5, 5), /level/); // non-integer
  assert.throws(() => shopMod.drawShop(1, FULL_POOL, 0, 5), /level/); // integer but < 1
});

test('shop.drawShop: shopSize validation isolates each OR clause (kills or->and @32 x2)', () => {
  assert.doesNotThrow(() => shopMod.drawShop(1, FULL_POOL, 1, 0));
  assert.throws(() => shopMod.drawShop(1, FULL_POOL, 1, 1.5), /shopSize/); // non-integer
  assert.throws(() => shopMod.drawShop(1, FULL_POOL, 1, -1), /shopSize/); // integer but < 0
});

test('shop.drawShop: empty pool yields empty shop; non-empty pool yields shopSize entries (kills eq->neq @40)', () => {
  const emptyPool = { unit_1: 0 };
  const { shop: emptyShop } = shopMod.drawShop(1, emptyPool, 1, 5);
  assert.deepEqual(emptyShop, []);

  const { shop: fullShop } = shopMod.drawShop(1, FULL_POOL, 1, 5);
  assert.equal(fullShop.length, 5);
  assert.ok(fullShop.every(id => Object.keys(FULL_POOL).includes(id)));
});

test('shop.drawShop: never draws more exemplars of a unitDefId than available; reserves into the returned pool (MED-2)', () => {
  // Only 2 exemplars of unit_1 exist; asking for 5 slots from a pool that
  // ONLY has unit_1 must yield a shop of length 2, not 5 (no over-draw).
  const scarcePool = { unit_1: 2 };
  const { shop, pool: newPool } = shopMod.drawShop(1, scarcePool, 1, 5);
  assert.equal(shop.length, 2, 'shop is bounded by real Pool stock, not forced to shopSize');
  assert.deepEqual(shop, ['unit_1', 'unit_1']);
  assert.equal(newPool.unit_1, undefined, 'Pool fully reserved (available count reaches 0, key deleted)');
});

test('shop.drawShop: reserves drawn exemplars out of the returned pool (MED-2)', () => {
  const { shop, pool: newPool } = shopMod.drawShop(1, FULL_POOL, 1, 5);
  const totalBefore = Object.values(FULL_POOL).reduce((a, b) => a + b, 0);
  const totalAfter = Object.values(newPool).reduce((a, b) => a + b, 0);
  assert.equal(totalAfter, totalBefore - shop.length, 'returned pool is decremented by exactly the number of reserved slots');
});

// =====================================================================
// bench/bench.mjs
// =====================================================================

test('bench.isBenchFull: capacity validation isolates each OR clause (kills or->and @22 x2)', () => {
  assert.doesNotThrow(() => benchMod.isBenchFull([], 0));
  assert.throws(() => benchMod.isBenchFull([], 1.5), /capacity/); // non-integer
  assert.throws(() => benchMod.isBenchFull([], -1), /capacity/); // integer but < 0
});

test('bench.isBenchFull: correctness at exact boundary', () => {
  assert.equal(benchMod.isBenchFull([], 0), true);
  assert.equal(benchMod.isBenchFull([{ a: 1 }], 5), false);
});

test('bench.addToBench: unitInstance validation isolates each OR clause (kills or->and @41)', () => {
  assert.doesNotThrow(() => benchMod.addToBench([], { unit_instance_id: 'x' }));
  assert.throws(() => benchMod.addToBench([], null), /unitInstance/); // typeof null === 'object' but === null
  assert.throws(() => benchMod.addToBench([], 'notanobject'), /unitInstance/); // typeof !== 'object' but !== null
});

test('bench.removeFromBench: unit_instance_id validation (kills neq->eq @69)', () => {
  assert.doesNotThrow(() => benchMod.removeFromBench([], 'x'));
  assert.throws(() => benchMod.removeFromBench([], 123));
});

test('bench.removeFromBench: not-found result has ok strictly false (kills false->true @66)', () => {
  const result = benchMod.removeFromBench([{ unit_instance_id: 'a' }], 'missing');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Unit not found on bench');
});

test('bench.removeFromBench: found result has ok strictly true and removes correct unit', () => {
  const bench = [{ unit_instance_id: 'a' }, { unit_instance_id: 'b' }];
  const result = benchMod.removeFromBench(bench, 'a');
  assert.equal(result.ok, true);
  assert.equal(result.removed.unit_instance_id, 'a');
  assert.deepEqual(result.newBench.map(u => u.unit_instance_id), ['b']);
});

// =====================================================================
// merge/merge.mjs
// =====================================================================

test('merge.detectMerge: unit-is-object validation isolates each OR clause (kills or->and @19)', () => {
  assert.throws(() => mergeMod.detectMerge([null]), /Each unit must be an object/); // === null true, typeof!=='object' false
  assert.throws(() => mergeMod.detectMerge(['x']), /Each unit must be an object/); // typeof!=='object' true, === null false
});

test('merge.detectMerge: shape validation isolates each OR clause (kills or->and @22)', () => {
  assert.throws(
    () => mergeMod.detectMerge([{ unit_def_id: 123, star: 1 }]),
    /unit_def_id \(string\) and star \(number\)/
  );
  assert.throws(
    () => mergeMod.detectMerge([{ unit_def_id: 'unit_1', star: 'bad' }]),
    /unit_def_id \(string\) and star \(number\)/
  );
});

test('merge.detectMerge: 3 identical units detected correctly', () => {
  const units = [
    { unit_def_id: 'unit_1', star: 1 },
    { unit_def_id: 'unit_1', star: 1 },
    { unit_def_id: 'unit_1', star: 1 }
  ];
  const merge = mergeMod.detectMerge(units);
  assert.ok(merge !== null);
  assert.equal(merge.count, 3);
});

test('merge.resolveMerge: merge-object validation isolates neq/eq/or (kills @63 x3)', () => {
  const fn = () => 'id';
  assert.throws(() => mergeMod.resolveMerge([], 'notanobject', fn)); // typeof!=='object' true, ===null false
  assert.throws(() => mergeMod.resolveMerge([], null, fn)); // typeof null==='object' -> first false, ===null true
});

test('merge.resolveMerge: makeUnitInstanceId validation (kills neq->eq @66)', () => {
  const merge = { unitDefId: 'unit_1', star: 1, count: 3, group: [{ unit_instance_id: 'a' }, { unit_instance_id: 'b' }, { unit_instance_id: 'c' }] };
  assert.throws(() => mergeMod.resolveMerge([], merge, 'notafunction'));
  assert.doesNotThrow(() => mergeMod.resolveMerge(
    [{ unit_instance_id: 'a' }, { unit_instance_id: 'b' }, { unit_instance_id: 'c' }],
    merge,
    () => 'new_id'
  ));
});

test('merge.resolveMerge: successful resolution has ok strictly true (kills true->false @94)', () => {
  const group = [{ unit_instance_id: 'a' }, { unit_instance_id: 'b' }, { unit_instance_id: 'c' }];
  const merge = { unitDefId: 'unit_1', star: 1, count: 3, group };
  const result = mergeMod.resolveMerge(group, merge, () => 'new_id');
  assert.equal(result.ok, true);
  assert.equal(result.produced1.star, 2);
});

test('merge.resolveMerge: too-few-units group has ok strictly false, no throw (kills false->true @72, or->and @71)', () => {
  const fn = () => 'id';
  // merge.group undefined: !merge.group short-circuits under original ||;
  // under &&-mutant it would evaluate merge.group.length on undefined -> throws.
  const resultUndefinedGroup = mergeMod.resolveMerge([], {}, fn);
  assert.equal(resultUndefinedGroup.ok, false);
  assert.equal(resultUndefinedGroup.reason, 'Merge group has fewer than 3 units');

  // merge.group present but length 2: !merge.group is false, length<3 is true.
  const twoGroup = [{ unit_instance_id: 'a' }, { unit_instance_id: 'b' }];
  const resultShortGroup = mergeMod.resolveMerge(twoGroup, { group: twoGroup }, fn);
  assert.equal(resultShortGroup.ok, false);
});

test('merge.canMerge: reflects detectMerge strictly (kills neq->eq @108)', () => {
  assert.equal(mergeMod.canMerge([]), false);
  const units = [
    { unit_def_id: 'unit_1', star: 1 },
    { unit_def_id: 'unit_1', star: 1 },
    { unit_def_id: 'unit_1', star: 1 }
  ];
  assert.equal(mergeMod.canMerge(units), true);
});

// =====================================================================
// economy/gold.mjs
// =====================================================================

test('gold.applyGoldTransaction: currentGold validation isolates each OR clause (kills neq->eq/or->and @43)', () => {
  assert.doesNotThrow(() => goldMod.applyGoldTransaction(5, 1, 'Income'));
  assert.throws(() => goldMod.applyGoldTransaction(1.5, 1, 'Income')); // non-integer number
  assert.throws(() => goldMod.applyGoldTransaction(-1, 1, 'Income'));  // integer but < 0
  assert.throws(() => goldMod.applyGoldTransaction('5', 1, 'Income')); // wrong type
});

test('gold.applyGoldTransaction: delta validation isolates each OR clause (kills neq->eq/or->and @46)', () => {
  assert.throws(() => goldMod.applyGoldTransaction(5, 1.5, 'Income'));
  assert.throws(() => goldMod.applyGoldTransaction(5, '1', 'Income'));
});

test('gold.applyGoldTransaction: delta=0 is credit, not debit (kills ge->gt @64)', () => {
  const { transaction } = goldMod.applyGoldTransaction(5, 0, 'Income');
  assert.equal(transaction.type, 'credit');
});

test('gold.applyGoldTransaction: negative delta is debit', () => {
  const { newGold, transaction } = goldMod.applyGoldTransaction(5, -2, 'Sell');
  assert.equal(newGold, 3);
  assert.equal(transaction.type, 'debit');
});

test('gold.computeGoldDelta: tx.amount validation (kills or->and @80)', () => {
  assert.throws(() => goldMod.computeGoldDelta([{ amount: 1.5, source: 'Income' }]));
  assert.throws(() => goldMod.computeGoldDelta([{ amount: '1', source: 'Income' }]));
});

// =====================================================================
// preparation/preparation.mjs
// =====================================================================

// shop defaults to a single unit_1 slot at index 0. Callers that need a
// specific Shop content (e.g. unit_2, or several slots for repeated Buys at
// shop_index 0 — MED-3: Buy consumes the slot, subsequent slots shift down)
// pass their own array.
function makeFreshPrepState(seed, gold, shop = ['unit_1']) {
  const s0 = state.initState(seed);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  return createExtendedGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold, shop } },
    entities: ps.entities,
    phase: ps.phase
  }, ps.pool, ps.bench_capacity);
}

test('prep.createExtendedGameState: respects an explicit truthy benchCapacity (kills or->and @40)', () => {
  const s = createExtendedGameState({ seed: 1, rng_state: 1, eventLog: [], players: {}, entities: {}, phase: 'Preparation' }, {}, 3);
  assert.equal(s.bench_capacity, 3);
});

test('prep.initPrepState: baseState validation isolates each OR clause (kills or->and @60)', () => {
  assert.throws(() => prep.initPrepState(null, ['player_0'])); // typeof null==='object' -> first false, ===null true
  assert.throws(() => prep.initPrepState('notobj', ['player_0'])); // typeof!=='object' true, ===null false
});

test('prep.initPrepState: seats start with shop_locked strictly false (kills false->true @82)', () => {
  const s0 = state.initState(1);
  const ps = prep.initPrepState(s0, ['player_0', 'player_1']);
  assert.equal(ps.players['player_0'].shop_locked, false);
  assert.equal(ps.players['player_1'].shop_locked, false);
});

test('prep.handleBuy: malformed shop_index alone must still reject the Buy (kills or->and @152)', () => {
  let ps = makeFreshPrepState(10, 50);
  const benchBefore = ps.players['player_0'].bench.length;
  const goldBefore = ps.players['player_0'].gold;

  // unitDefId is a valid string; shop_index is malformed (string, not number).
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 'not-a-number'
  });

  assert.equal(ps.players['player_0'].bench.length, benchBefore, 'Bench unchanged: Buy rejected on malformed shop_index');
  assert.equal(ps.players['player_0'].gold, goldBefore, 'Gold unchanged: Buy rejected on malformed shop_index');
});

test('prep.handleBuy: exact gold cost debited for unit_1 is 1, not 0 (kills or->and @174)', () => {
  let ps = makeFreshPrepState(11, 50);
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });
  assert.equal(ps.players['player_0'].gold, 49, 'Buying unit_1 costs exactly 1 gold');
  const goldChanged = ps.eventLog.find(e => e.kind === 'GoldChanged' && e.source === 'Buy');
  assert.equal(goldChanged.delta, -1);
});

test('prep.handleSell: exact gold credit for unit_1 star1 is 1, not 0 (kills or->and @264/@266)', () => {
  let ps = makeFreshPrepState(12, 50);
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });
  const unit = ps.players['player_0'].bench[0];
  const goldAfterBuy = ps.players['player_0'].gold;

  ps = prep.applyPreparationInput(ps, {
    kind: 'Sell',
    seatId: 'player_0',
    unit_instance_id: unit.unit_instance_id
  });

  assert.equal(ps.players['player_0'].gold, goldAfterBuy + 1, 'Selling unit_1 ★1 credits exactly 1 gold');
  const goldChanged = ps.eventLog.find(e => e.kind === 'GoldChanged' && e.source === 'Sell');
  assert.equal(goldChanged.delta, 1);
});

test('prep.handleLevelUp: newLevel and cost computed from actual player.level, not defaulted (kills or->and @417/@418)', () => {
  const s0 = state.initState(13);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  ps = createExtendedGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50, level: 3 } },
    entities: ps.entities,
    phase: ps.phase
  }, ps.pool, ps.bench_capacity);

  ps = prep.applyPreparationInput(ps, { kind: 'LevelUp', seatId: 'player_0' });

  assert.equal(ps.players['player_0'].level, 4, 'level 3 -> LevelUp yields level 4 (not defaulted to 2)');
  assert.equal(ps.players['player_0'].gold, 50 - 4, 'cost for reaching level 4 is 4 gold (not defaulted to 0)');
});

test('prep.handlePlace: valid Place actually moves the unit Bench->Board (kills eq->neq @485)', () => {
  let ps = makeFreshPrepState(14, 50);
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });
  const unit = ps.players['player_0'].bench[0];
  const benchBefore = ps.players['player_0'].bench.length;
  const boardBefore = ps.players['player_0'].board.length;

  ps = prep.applyPreparationInput(ps, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unit.unit_instance_id,
    target_zone: 'board'
  });

  assert.equal(ps.players['player_0'].bench.length, benchBefore - 1, 'unit removed from bench');
  assert.equal(ps.players['player_0'].board.length, boardBefore + 1, 'unit added to board');
  assert.equal(ps.players['player_0'].board[0].unit_instance_id, unit.unit_instance_id);
});

test('prep.handlePlace: malformed unit_instance_id or target_zone alone rejects the input (kills or->and/neq->eq @469 x2)', () => {
  let ps = makeFreshPrepState(15, 50);
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });
  const unit = ps.players['player_0'].bench[0];
  const benchBefore = ps.players['player_0'].bench.length;

  // valid target_zone, malformed unit_instance_id (number)
  let rejected1 = prep.applyPreparationInput(ps, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: 42,
    target_zone: 'board'
  });
  assert.equal(rejected1.players['player_0'].bench.length, benchBefore, 'rejected: bad unit_instance_id type');

  // valid unit_instance_id, malformed target_zone (number)
  let rejected2 = prep.applyPreparationInput(ps, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unit.unit_instance_id,
    target_zone: 42
  });
  assert.equal(rejected2.players['player_0'].bench.length, benchBefore, 'rejected: bad target_zone type');
});

test('prep.handleReroll: unlocks a previously locked shop (kills false->true @361)', () => {
  const s0 = state.initState(16);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  ps = createExtendedGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50 } },
    entities: ps.entities,
    phase: ps.phase
  }, ps.pool, ps.bench_capacity);

  ps = prep.applyPreparationInput(ps, { kind: 'Lock', seatId: 'player_0' });
  assert.equal(ps.players['player_0'].shop_locked, true, 'precondition: shop is locked');

  ps = prep.applyPreparationInput(ps, { kind: 'Reroll', seatId: 'player_0' });
  assert.equal(ps.players['player_0'].shop_locked, false, 'Reroll unlocks the shop');
});

test('prep.applyAutoMerge: merged bench units collapse to 1 star-2 unit on the bench (kills eq->neq @591)', () => {
  // 3 slots so shop_index 0 stays valid across all 3 Buys (MED-3: each Buy
  // consumes and removes its slot, shifting the remaining entries down).
  let ps = makeFreshPrepState(17, 50, ['unit_1', 'unit_1', 'unit_1']);

  for (let i = 0; i < 3; i++) {
    ps = prep.applyPreparationInput(ps, {
      kind: 'Buy',
      seatId: 'player_0',
      unitDefId: 'unit_1',
      shop_index: 0
    });
  }

  const bench = ps.players['player_0'].bench;
  assert.equal(bench.length, 1, 'three unit_1 buys collapse into a single merged bench unit');
  assert.equal(bench[0].unit_def_id, 'unit_1');
  assert.equal(bench[0].star, 2, 'merge produces a star-2 unit');
});

test('prep.applyAutoMerge: a board-only merge places the produced unit on the board, not the bench (kills eq->neq on producedWasOnBench zone check)', () => {
  const s0 = state.initState(19);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  // 3 identical units pre-placed on the BOARD (none on the bench yet).
  const b1 = { unit_instance_id: 'board_u1', unit_def_id: 'unit_1', star: 1, creation_tick: 0 };
  const b2 = { unit_instance_id: 'board_u2', unit_def_id: 'unit_1', star: 1, creation_tick: 1 };
  const b3 = { unit_instance_id: 'board_u3', unit_def_id: 'unit_1', star: 1, creation_tick: 2 };
  ps = createExtendedGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50, board: [b1, b2, b3], shop: ['unit_2'] } },
    entities: ps.entities,
    phase: ps.phase
  }, ps.pool, ps.bench_capacity);

  // Buying an UNRELATED unit adds it to the (currently empty) bench and
  // triggers applyAutoMerge, which discovers the pre-existing board merge.
  // At the moment of merge resolution, player.bench contains ONLY this one
  // freshly-bought unit — a bench of length 1 that must NOT match the
  // consumed board unit's id, forcing eq (===) and neq (!==) to diverge.
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_2',
    shop_index: 0
  });

  const finalPlayer = ps.players['player_0'];
  assert.equal(finalPlayer.board.length, 1, 'the 3 board units collapsed into exactly 1 produced unit');
  assert.equal(finalPlayer.board[0].unit_def_id, 'unit_1');
  assert.equal(finalPlayer.board[0].star, 2, 'produced unit correctly placed on the board (not lost, not on bench)');
  assert.equal(finalPlayer.bench.length, 1, 'the freshly-bought unrelated unit remains alone on the bench');
  assert.equal(finalPlayer.bench[0].unit_def_id, 'unit_2');
});

test('prep.applyAutoMerge: pre-existing board units are untouched by a bench-only merge (kills eq->neq @595)', () => {
  const s0 = state.initState(18);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  const sentinelBoardUnit = { unit_instance_id: 'sentinel_board_unit', unit_def_id: 'unit_2', star: 1, creation_tick: 0 };
  ps = createExtendedGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50, board: [sentinelBoardUnit], shop: ['unit_1', 'unit_1', 'unit_1'] } },
    entities: ps.entities,
    phase: ps.phase
  }, ps.pool, ps.bench_capacity);

  for (let i = 0; i < 3; i++) {
    ps = prep.applyPreparationInput(ps, {
      kind: 'Buy',
      seatId: 'player_0',
      unitDefId: 'unit_1',
      shop_index: 0
    });
  }

  const board = ps.players['player_0'].board;
  assert.equal(board.length, 1, 'board still has exactly the sentinel unit, no leakage from the merge');
  assert.equal(board[0].unit_instance_id, 'sentinel_board_unit');
});

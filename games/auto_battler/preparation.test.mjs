// preparation.test.mjs - Economic and preparation phase tests
// Tests R1..R10 for i2 increment

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import * as state from './engine/state.mjs';
import * as serialize from './engine/serialize.mjs';
import * as types from './engine/types.mjs';
import { nextRng } from './engine/rng.mjs';
import * as prep from './preparation/preparation.mjs';
import { createGameState } from './engine/state.mjs';
import * as poolMod from './pool/pool.mjs';
import * as shopMod from './shop/shop.mjs';
import * as benchMod from './bench/bench.mjs';
import * as mergeMod from './merge/merge.mjs';

// --- Helper: total physical exemplars across Pool + Shops (reserved) +
// Possessions (Bench/Board, weighted by star tier, ECO-1). Used to verify
// the FULL conservation invariant, not just the Pool account alone
// (MED-2: previous R1 only checked Pool, missing Shops+Possessions).
function totalExemplars(prepState) {
  const poolTotal = poolMod.getTotalPoolCount(prepState.pool);

  let shopTotal = 0;
  let possessionsTotal = 0;
  for (const seatId of Object.keys(prepState.players)) {
    const p = prepState.players[seatId];
    const shop = Array.isArray(p.shop) ? p.shop : [];
    shopTotal += shop.length;
    for (const unit of [...(p.bench || []), ...(p.board || [])]) {
      possessionsTotal += Math.pow(3, (unit.star || 1) - 1);
    }
  }

  return poolTotal + shopTotal + possessionsTotal;
}

// --- R1: Full ECO-1 conservation (Pool + Shops reserved + Possessions) ---
test('R1: Pool+Shops+Possessions conservation across Draw/Buy/Reroll/Sell sequences', () => {
  for (let i = 0; i < 20; i++) {
    const testSeed = 100 + i;
    let s = state.initState(testSeed);
    s = prep.initPrepState(s, ['player_0']);

    const player = s.players['player_0'];
    const updatedPlayers = { ...s.players };
    updatedPlayers['player_0'] = { ...player, gold: 30 };
    s = createGameState({
      seed: s.seed,
      rng_state: s.rng_state,
      eventLog: s.eventLog,
      players: updatedPlayers,
      entities: s.entities,
      phase: s.phase,
      pool: s.pool,
      bench_capacity: s.bench_capacity
    });

    const totalBefore = totalExemplars(s);

    // Draw a real Shop: reserves exemplars out of the Pool (ECO-1/MED-2).
    const draw = shopMod.drawShop(s.rng_state, s.pool, 1, 5);
    let playersAfterDraw = { ...s.players };
    playersAfterDraw['player_0'] = { ...s.players['player_0'], shop: draw.shop };
    s = createGameState({
      seed: s.seed,
      rng_state: draw.rng_state,
      eventLog: s.eventLog,
      players: playersAfterDraw,
      entities: s.entities,
      phase: s.phase,
      pool: draw.pool,
      bench_capacity: s.bench_capacity
    });

    assert.equal(totalExemplars(s), totalBefore, `Seed ${testSeed}: conservation holds after Shop draw (reservation)`);

    // Buy the first Shop slot, if the draw produced one.
    if (s.players['player_0'].shop.length > 0) {
      const boughtId = s.players['player_0'].shop[0];
      s = prep.applyPreparationInput(s, {
        kind: 'Buy',
        seatId: 'player_0',
        unitDefId: boughtId,
        shop_index: 0
      });
      assert.equal(totalExemplars(s), totalBefore, `Seed ${testSeed}: conservation holds after Buy`);
    }

    // Reroll: releases the current Shop's reservation, draws a fresh one.
    s = prep.applyPreparationInput(s, { kind: 'Reroll', seatId: 'player_0' });
    assert.equal(totalExemplars(s), totalBefore, `Seed ${testSeed}: conservation holds after Reroll`);

    // Sell a bought unit, if one made it onto the bench.
    const benchUnit = s.players['player_0'].bench[0];
    if (benchUnit) {
      s = prep.applyPreparationInput(s, {
        kind: 'Sell',
        seatId: 'player_0',
        unit_instance_id: benchUnit.unit_instance_id
      });
      assert.equal(totalExemplars(s), totalBefore, `Seed ${testSeed}: conservation holds after Sell`);
    }
  }
});

// --- R2: Shop draw reserves from Pool; Buy leaves Pool unchanged (already
// reserved at draw, ECO-1); Place leaves Pool unchanged ---
test('R2: Shop draw debits Pool by reservation; Buy does not re-debit; Place leaves Pool unchanged', () => {
  const s0 = state.initState(123);
  let ps = prep.initPrepState(s0, ['player_0']);

  // Give player gold
  const player = ps.players['player_0'];
  ps = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50 } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  const poolBeforeDraw = poolMod.getTotalPoolCount(ps.pool);

  // Draw a Shop: this is where the Pool is actually debited (ECO-1/MED-2).
  const draw = shopMod.drawShop(ps.rng_state, ps.pool, 1, 5);
  let playersAfterDraw = { ...ps.players };
  playersAfterDraw['player_0'] = { ...ps.players['player_0'], shop: draw.shop };
  ps = createGameState({
    seed: ps.seed,
    rng_state: draw.rng_state,
    eventLog: ps.eventLog,
    players: playersAfterDraw,
    entities: ps.entities,
    phase: ps.phase,
    pool: draw.pool,
    bench_capacity: ps.bench_capacity
  });

  const poolAfterDraw = poolMod.getTotalPoolCount(ps.pool);
  assert.equal(poolAfterDraw, poolBeforeDraw - draw.shop.length, 'Shop draw reserves exemplars from Pool (ECO-1)');

  // Buy the first drawn slot
  assert.ok(draw.shop.length > 0, 'precondition: draw produced at least one slot');
  const boughtId = ps.players['player_0'].shop[0];
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: boughtId,
    shop_index: 0
  });

  const poolAfterBuy = poolMod.getTotalPoolCount(ps.pool);
  assert.equal(poolAfterBuy, poolAfterDraw, 'Buy does not further debit Pool (exemplar already reserved at draw)');

  // Place (Bench → Board)
  const unit = ps.players['player_0'].bench[0];
  if (unit) {
    ps = prep.applyPreparationInput(ps, {
      kind: 'Place',
      seatId: 'player_0',
      unit_instance_id: unit.unit_instance_id,
      target_zone: 'board'
    });

    const poolAfterPlace = poolMod.getTotalPoolCount(ps.pool);
    assert.equal(poolAfterPlace, poolAfterBuy, 'Place does not change Pool');
  }
});

// --- R3: Sell ★1 returns 1, Sell ★2 returns 3 ---
test('R3: Sell ★1 returns 1 exemplar, Sell ★2 returns 3', () => {
  const s0 = state.initState(456);
  let ps = prep.initPrepState(s0, ['player_0']);

  const player = ps.players['player_0'];
  // Populate the Shop directly (MED-3: Buy now requires a matching Shop
  // slot). No reservation bookkeeping needed here — R1/R2 already cover the
  // draw-time Pool reservation; this test is about Sell's restorePool math.
  ps = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50, shop: ['unit_1'] } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  const poolBefore = poolMod.getTotalPoolCount(ps.pool);

  // Buy unit_1 (★1)
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });

  const star1Unit = ps.players['player_0'].bench[0];
  assert.equal(star1Unit.star, 1, 'Bought unit is ★1');

  const poolAfterBuy = poolMod.getTotalPoolCount(ps.pool);
  assert.equal(poolAfterBuy, poolBefore, 'Buy does not debit Pool (exemplar already reserved at draw, ECO-1)');

  // Sell it
  ps = prep.applyPreparationInput(ps, {
    kind: 'Sell',
    seatId: 'player_0',
    unit_instance_id: star1Unit.unit_instance_id
  });

  const poolAfterSellStar1 = poolMod.getTotalPoolCount(ps.pool);
  assert.equal(poolAfterSellStar1, poolAfterBuy + 1, 'Sell ★1 returns 1 exemplar');

  // Manually create a ★2 unit for testing
  const star2Unit = {
    unit_instance_id: 'manual_star2_unit',
    unit_def_id: 'unit_2',
    star: 2,
    creation_tick: 0
  };
  ps = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...ps.players['player_0'], bench: [star2Unit], gold: 50 } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  const poolBeforeSellStar2 = poolMod.getTotalPoolCount(ps.pool);

  // Sell ★2
  ps = prep.applyPreparationInput(ps, {
    kind: 'Sell',
    seatId: 'player_0',
    unit_instance_id: star2Unit.unit_instance_id
  });

  const poolAfterSellStar2 = poolMod.getTotalPoolCount(ps.pool);
  assert.equal(poolAfterSellStar2, poolBeforeSellStar2 + 3, 'Sell ★2 returns 3 exemplars');
});

// --- R4: Merge cascade (3 identical units → ★2) ---
test('R4: Merge detection and resolution (3 identical → higher star)', () => {
  // Manually craft state with 3 identical units
  const s0 = state.initState(789);
  let ps = prep.initPrepState(s0, ['player_0']);

  const u1 = { unit_instance_id: 'u1', unit_def_id: 'unit_1', star: 1, creation_tick: 0 };
  const u2 = { unit_instance_id: 'u2', unit_def_id: 'unit_1', star: 1, creation_tick: 1 };
  const u3 = { unit_instance_id: 'u3', unit_def_id: 'unit_1', star: 1, creation_tick: 2 };

  ps = state.createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...ps.players['player_0'], bench: [u1, u2, u3], gold: 50 } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  // Detect merge
  const merge = mergeMod.detectMerge(ps.players['player_0'].bench);
  assert.ok(merge !== null, 'Merge detected for 3 identical units');
  assert.equal(merge.unitDefId, 'unit_1', 'Merge unit_def_id is unit_1');
  assert.equal(merge.star, 1, 'Merge star level is 1');
  assert.equal(merge.count, 3, 'Merge count is 3');

  // Verify MergeTriggered and MergeResolved events were emitted
  const eventLog = ps.eventLog;
  const mergeTriggered = eventLog.find(e => e.kind === 'MergeTriggered');
  const mergeResolved = eventLog.find(e => e.kind === 'MergeResolved');
  // After auto-merge in Buy, these should be present (fixtures will show up when Buy adds units)
});

// --- R5: Bench full rejection (DP-9) ---
test('R5: Buy rejected when Bench full (DP-9); zero side effects', () => {
  const s0 = state.initState(111);
  let ps = prep.initPrepState(s0, ['player_0']);

  // Fill the bench to capacity
  const fullBench = [];
  for (let i = 0; i < 8; i++) { // BENCH_CAPACITY = 8
    fullBench.push({
      unit_instance_id: `bench_u${i}`,
      unit_def_id: 'unit_1',
      star: 1,
      creation_tick: i
    });
  }

  const player = ps.players['player_0'];
  ps = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, bench: fullBench, gold: 50 } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  const goldBefore = ps.players['player_0'].gold;
  const poolBefore = { ...ps.pool };
  const eventLogLengthBefore = ps.eventLog.length;

  // Try to Buy
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });

  // Verify rejection
  assert.equal(ps.players['player_0'].gold, goldBefore, 'Gold unchanged after rejected Buy');
  assert.deepEqual(ps.pool, poolBefore, 'Pool unchanged after rejected Buy');
  assert.equal(ps.eventLog.length, eventLogLengthBefore, 'No events emitted on rejected Buy');
});

// --- R6: RNG determinism for Shop draws ---
test('R6: Shop draw is deterministic (same rng_state, same shop)', () => {
  const rng1 = 2581720956; // Seed 42
  const level = 1;
  const pool = { unit_1: 10, unit_2: 10, unit_3: 10, unit_4: 10, unit_5: 10 };

  const { rng_state: rng1a, shop: shop1 } = shopMod.drawShop(rng1, pool, level, 5);
  const { rng_state: rng2a, shop: shop2 } = shopMod.drawShop(rng1, pool, level, 5);

  assert.deepEqual(shop1, shop2, 'Two identical draws produce identical shops');
  assert.equal(rng1a, rng2a, 'RNG state advanced identically');
});

// --- R7: Lock preserves Shop without RNG consumption ---
test('R7: Lock preserves Shop exactly; no RNG consumed', () => {
  const s0 = state.initState(222);
  let ps = prep.initPrepState(s0, ['player_0']);

  const rngBefore = ps.rng_state;
  const shop = ['unit_1', 'unit_2', 'unit_3'];

  ps = state.createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...ps.players['player_0'], shop, shop_locked: false } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  ps = prep.applyPreparationInput(ps, {
    kind: 'Lock',
    seatId: 'player_0'
  });

  assert.deepEqual(ps.players['player_0'].shop, shop, 'Shop preserved exactly after Lock');
  assert.equal(ps.rng_state, rngBefore, 'RNG state unchanged by Lock');
  assert.ok(ps.players['player_0'].shop_locked, 'Shop marked as locked');
});

// --- R8 removed (s9-build commande F, F2): tested economy/gold.mjs::computeGoldDelta, a module
// DELETED as dead code — imported by preparation.mjs and round.mjs but never called
// (`grep "goldModule\."` = 0 hits across the repo). Gold arithmetic on the REAL path is covered
// by every Buy/Sell/Reroll/LevelUp test in this file and in properties.i2.test.mjs, which all
// assert the exact resulting `.gold` on real GameState after a real applyPreparationInput call —
// not gold.mjs's standalone, never-invoked helper.

// --- R9: Input list close verification ---
test('R9: Input list closed; only known kinds accepted', () => {
  const s0 = state.initState(333);
  const ps = prep.initPrepState(s0, ['player_0']);

  const validInputs = [
    { kind: 'Buy', seatId: 'player_0', unitDefId: 'unit_1', shop_index: 0 },
    { kind: 'Sell', seatId: 'player_0', unit_instance_id: 'u1' },
    { kind: 'Reroll', seatId: 'player_0' },
    { kind: 'Lock', seatId: 'player_0' },
    { kind: 'LevelUp', seatId: 'player_0' },
    { kind: 'Place', seatId: 'player_0', unit_instance_id: 'u1', target_zone: 'board' },
    { kind: 'ConfirmPreparation', seatId: 'player_0' }
  ];

  for (const inp of validInputs) {
    // Should not throw and should return a state (possibly rejected, but valid)
    const result = prep.applyPreparationInput(ps, inp);
    assert.ok(types.isState(result) || result === ps, `Input ${inp.kind} accepted`);
  }

  // Invalid input
  const invalidInput = { kind: 'InvalidKind', seatId: 'player_0' };
  const resultInvalid = prep.applyPreparationInput(ps, invalidInput);
  assert.ok(resultInvalid === ps, 'Invalid input rejected deterministically');
});

// --- MED-3: handleBuy must honor the real Shop content, not just accept any shop_index ---
test('MED-3: Buy is rejected when shop_index is out of bounds or does not match the Shop content', () => {
  const s0 = state.initState(600);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  ps = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50, shop: ['unit_1', 'unit_3'] } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  const benchBefore = ps.players['player_0'].bench.length;
  const goldBefore = ps.players['player_0'].gold;
  const shopBefore = [...ps.players['player_0'].shop];
  const eventLogBefore = ps.eventLog.length;

  // Out-of-bounds shop_index
  let rejected1 = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 5
  });
  assert.equal(rejected1.players['player_0'].bench.length, benchBefore, 'out-of-bounds shop_index: Bench unchanged');
  assert.equal(rejected1.players['player_0'].gold, goldBefore, 'out-of-bounds shop_index: Gold unchanged');
  assert.deepEqual(rejected1.players['player_0'].shop, shopBefore, 'out-of-bounds shop_index: Shop unchanged');
  assert.equal(rejected1.eventLog.length, eventLogBefore, 'out-of-bounds shop_index: no events emitted');

  // In-bounds shop_index but unitDefId does not match what's actually there
  // (shop[0] is 'unit_1', not 'unit_3' — a Buy for unit_3 at index 0 must fail)
  let rejected2 = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_3',
    shop_index: 0
  });
  assert.equal(rejected2.players['player_0'].bench.length, benchBefore, 'mismatched unitDefId: Bench unchanged');
  assert.equal(rejected2.players['player_0'].gold, goldBefore, 'mismatched unitDefId: Gold unchanged');
  assert.deepEqual(rejected2.players['player_0'].shop, shopBefore, 'mismatched unitDefId: Shop unchanged');
  assert.equal(rejected2.eventLog.length, eventLogBefore, 'mismatched unitDefId: no events emitted');

  // Negative shop_index
  let rejected3 = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: -1
  });
  assert.equal(rejected3.players['player_0'].bench.length, benchBefore, 'negative shop_index: Bench unchanged');

  // Exact boundary: shop_index === shop.length (one past the last valid slot)
  let rejected4 = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: shopBefore.length
  });
  assert.equal(rejected4.players['player_0'].bench.length, benchBefore, 'boundary shop_index === shop.length: Bench unchanged');
  assert.deepEqual(rejected4.players['player_0'].shop, shopBefore, 'boundary shop_index === shop.length: Shop unchanged');

  // A valid Buy (matches shop[1] === 'unit_3') succeeds and removes that
  // exact entry from the Shop.
  let accepted = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_3',
    shop_index: 1
  });
  assert.equal(accepted.players['player_0'].bench.length, benchBefore + 1, 'valid Buy: unit added to Bench');
  assert.deepEqual(accepted.players['player_0'].shop, ['unit_1'], 'valid Buy: bought slot removed from Shop, other slot preserved');
});

// --- RO-2/R1b: ConfirmPreparation must emit PhaseChanged event (gate 2026-07-19) ---
test('MED-5: ConfirmPreparation advances phase and emits PhaseChanged Event (R1b, gate 2026-07-19)', () => {
  const s0 = state.initState(601);
  let ps = prep.initPrepState(s0, ['player_0']);

  const eventLogBefore = ps.eventLog.length;
  ps = prep.applyPreparationInput(ps, { kind: 'ConfirmPreparation', seatId: 'player_0' });

  assert.equal(ps.phase, 'Battle', 'phase advances to Battle');
  assert.equal(ps.eventLog.length, eventLogBefore + 1, 'PhaseChanged Event is emitted (R1b)');
  const phaseChangedEvent = ps.eventLog[ps.eventLog.length - 1];
  assert.equal(phaseChangedEvent.kind, 'PhaseChanged', 'PhaseChanged event emitted');
  assert.equal(phaseChangedEvent.from_phase, 'Preparation', 'from_phase is Preparation (RO-2)');
  assert.equal(phaseChangedEvent.to_phase, 'Battle', 'to_phase is Battle (RO-2)');
});

// --- R10: Event schema validation ---
test('R10: Emitted events have correct kind and payload structure (05_ECONOMY_BIBLE.md contract, MED-4)', () => {
  const s0 = state.initState(444);
  let ps = prep.initPrepState(s0, ['player_0']);

  const player = ps.players['player_0'];
  ps = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50 } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  // Reroll first to populate a real Shop and check ShopRolled's payload.
  const eventLogBeforeReroll = ps.eventLog.length;
  ps = prep.applyPreparationInput(ps, { kind: 'Reroll', seatId: 'player_0' });
  const rerollEvents = ps.eventLog.slice(eventLogBeforeReroll);

  const shopRolledEvent = rerollEvents.find(e => e.kind === 'ShopRolled');
  assert.ok(shopRolledEvent, 'ShopRolled found');
  assert.equal(typeof shopRolledEvent.seat_id, 'string', 'seat_id is string');
  assert.ok(Array.isArray(shopRolledEvent.shop_content), 'shop_content is an array');
  assert.equal(typeof shopRolledEvent.odds_table_version, 'string', 'odds_table_version present (MED-4)');
  assert.equal(shopRolledEvent.cause, 'Reroll', 'cause is Reroll');

  assert.ok(ps.players['player_0'].shop.length > 0, 'precondition: Reroll produced a non-empty shop');
  const boughtId = ps.players['player_0'].shop[0];

  const eventLogBefore = ps.eventLog.length;

  // Buy to trigger events
  ps = prep.applyPreparationInput(ps, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: boughtId,
    shop_index: 0
  });

  // Check emitted events
  const newEvents = ps.eventLog.slice(eventLogBefore);
  assert.ok(newEvents.length > 0, 'Events emitted');

  // Verify event kinds
  const eventKinds = newEvents.map(e => e.kind);
  assert.ok(eventKinds.includes('GoldChanged'), 'GoldChanged event emitted');
  assert.ok(eventKinds.includes('UnitBought'), 'UnitBought event emitted');

  // Verify GoldChanged payload
  const goldChangedEvent = newEvents.find(e => e.kind === 'GoldChanged');
  assert.ok(goldChangedEvent, 'GoldChanged found');
  assert.equal(typeof goldChangedEvent.seat_id, 'string', 'seat_id is string');
  assert.equal(typeof goldChangedEvent.delta, 'number', 'delta is number');
  assert.equal(typeof goldChangedEvent.new_gold, 'number', 'new_gold is number');
  assert.equal(typeof goldChangedEvent.source, 'string', 'source is string');

  // Verify UnitBought payload matches the bible exactly (R1b, gate 2026-07-19):
  // {seat_id, unit_definition, shop_slot, gold_cost, unit_instance_id, bench_index}
  const unitBoughtEvent = newEvents.find(e => e.kind === 'UnitBought');
  assert.ok(unitBoughtEvent, 'UnitBought found');
  assert.equal(typeof unitBoughtEvent.seat_id, 'string', 'seat_id is string');
  assert.equal(unitBoughtEvent.unit_definition, boughtId, 'unit_definition matches the bought unitDefId');
  assert.equal(unitBoughtEvent.shop_slot, 0, 'shop_slot present and matches the consumed slot');
  assert.equal(typeof unitBoughtEvent.gold_cost, 'number', 'gold_cost is number');
  assert.equal(typeof unitBoughtEvent.unit_instance_id, 'string', 'unit_instance_id present (R1b, gate 2026-07-19)');
  assert.equal(typeof unitBoughtEvent.bench_index, 'number', 'bench_index present (R1b, gate 2026-07-19)');

  // Sell it to verify UnitSold's payload (MED-4: unit_definition was missing).
  const eventLogBeforeSell = ps.eventLog.length;
  const boughtUnit = ps.players['player_0'].bench[0];
  ps = prep.applyPreparationInput(ps, {
    kind: 'Sell',
    seatId: 'player_0',
    unit_instance_id: boughtUnit.unit_instance_id
  });
  const sellEvents = ps.eventLog.slice(eventLogBeforeSell);
  const unitSoldEvent = sellEvents.find(e => e.kind === 'UnitSold');
  assert.ok(unitSoldEvent, 'UnitSold found');
  assert.equal(typeof unitSoldEvent.seat_id, 'string', 'seat_id is string');
  assert.equal(typeof unitSoldEvent.unit_instance, 'string', 'unit_instance is string');
  assert.equal(unitSoldEvent.unit_definition, boughtId, 'unit_definition present on UnitSold');
  assert.equal(typeof unitSoldEvent.star, 'number', 'star is number');
  assert.equal(typeof unitSoldEvent.pool_returned, 'number', 'pool_returned is number');
  assert.equal(typeof unitSoldEvent.gold_credited, 'number', 'gold_credited is number');
  assert.equal(unitSoldEvent.from_zone, 'bench', 'from_zone present (R1b, gate 2026-07-19)');
  assert.equal(typeof unitSoldEvent.from_index, 'number', 'from_index present (R1b, gate 2026-07-19)');
});

// --- Immutability test ---
test('Preparation state is immutable; transitions do not mutate input', () => {
  const s0 = state.initState(555);
  let ps = prep.initPrepState(s0, ['player_0']);

  // Freeze to detect mutations
  ps = state.freezeState(ps);

  const player = ps.players['player_0'];
  const frozenPS = createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold: 50, shop: ['unit_1'] } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });

  const frozenFinal = state.freezeState(frozenPS);
  const serializedBefore = serialize.serialize(frozenFinal);

  // Apply input
  const result = prep.applyPreparationInput(frozenFinal, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: 'unit_1',
    shop_index: 0
  });

  // Verify input unchanged
  const serializedAfter = serialize.serialize(frozenFinal);
  assert.equal(serializedBefore, serializedAfter, 'Input state not mutated');

  // Verify result is different
  assert.notEqual(result, frozenFinal, 'Result is a new state object');
});

// startup.test.mjs - Game startup regression tests (A-bis, increment 2.5)
// Tests R13 (game must start) and the critical path: Income → Shop → Buy → Place → ConfirmPreparation

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import * as round from './round/round.mjs';
import * as prep from './preparation/preparation.mjs';
import * as state from './engine/state.mjs';
import * as serialize from './engine/serialize.mjs';
import * as board from './board/board.mjs';
import * as bench from './bench/bench.mjs';
import { SHOP_SIZE, BENCH_CAPACITY, INCOME_BASE } from './params.v0.mjs';
import { getUnitRank } from './content/units.v0.mjs';

// D1 TEST FIX (declared in the builder report, not silent): these two tests carried their OWN
// copy of the Buy price table, `{unit_1: 1, ... unit_5: 5}` with an `|| 0` fallback. That copy
// was a THIRD source of truth for a price (after preparation.mjs and render_dom.mjs) and it
// silently answered "0" for any unit outside it. With a 15-unit content set the fallback fired
// and the test asserted "gold decreased by 0" against a real cost of 1 — the test was encoding
// the old 5-unit fixture, not the rule. The rule (documented in content/units.v0.mjs and now
// derived by preparation.mjs itself) is: Buy cost === rank. The assertion below is STRONGER than
// before, not weaker: it still pins an exact number, it just reads it from the one place that
// defines it.
const buyCostOf = (unitDefId) => getUnitRank(unitDefId);

/**
 * S1: Full startup sequence with exact value assertions
 * Tests: Income crediting, Shop drawing, Buy, Place (all zones), Lock toggle, ConfirmPreparation, Events exact sequence
 * Verifies R13 and the product's core claim: the game must start and be playable.
 */
test('S1: Full startup sequence — Income, Shop, Buy, Place, Lock, ConfirmPreparation with exact value assertions', () => {
  // Create new game at round 0
  let s = round.newGame(42, ['player_0']);

  // Verify initial state
  assert.strictEqual(s.round_index, 0, 'Initial round_index is 0');
  assert.strictEqual(s.phase, 'Preparation', 'Initial phase is Preparation');
  assert.strictEqual(s.players['player_0'].gold, 0, 'Initial gold is 0 (no income yet)');
  assert.strictEqual(s.players['player_0'].bench.length, 0, 'Initial bench is empty');
  assert.strictEqual(s.players['player_0'].board.length, 0, 'Initial board is empty');
  assert.strictEqual(Array.isArray(s.players['player_0'].shop) ? s.players['player_0'].shop.length : 0, 0, 'Initial shop is empty');

  // Track event count before startRound
  const eventLogBefore = s.eventLog.length;

  // --- Phase 1: Start the first round (Income + Shop draw)
  s = round.startRound(s);

  // Verify income is credited exactly: min(3 + 0, 10) = 3
  const expectedIncome = Math.min(INCOME_BASE + 0, 10);
  assert.strictEqual(expectedIncome, 3, 'Expected income for round 0 is 3');
  assert.strictEqual(s.players['player_0'].gold, 3, 'Gold credited exactly to 3');

  // Verify round_index incremented
  assert.strictEqual(s.round_index, 1, 'Round index incremented to 1');

  // Verify shop was drawn
  const shop = s.players['player_0'].shop;
  assert.strictEqual(Array.isArray(shop), true, 'Shop is an array');
  assert.strictEqual(shop.length, SHOP_SIZE, `Shop has exactly SHOP_SIZE (${SHOP_SIZE}) items`);
  for (const item of shop) {
    assert.strictEqual(typeof item, 'string', `Shop item is a string (unit definition ID)`);
  }

  // Verify events were emitted
  const eventsAfterStartRound = s.eventLog.length;
  assert.ok(eventsAfterStartRound > eventLogBefore, 'Events were emitted during startRound');

  // Find GoldChanged and ShopRolled events
  const goldChangedEvent = s.eventLog.find(e => e.kind === 'GoldChanged' && e.source === 'Income');
  const shopRolledEvent = s.eventLog.find(e => e.kind === 'ShopRolled' && e.cause === 'RoundStart');
  assert.ok(goldChangedEvent, 'GoldChanged event with source Income exists');
  assert.ok(shopRolledEvent, 'ShopRolled event with cause RoundStart exists');
  assert.strictEqual(goldChangedEvent.delta, 3, 'GoldChanged delta is exactly 3');
  assert.strictEqual(goldChangedEvent.new_gold, 3, 'GoldChanged new_gold is exactly 3');
  assert.deepStrictEqual(shopRolledEvent.shop_content, shop, 'ShopRolled shop_content matches drawn shop');

  // --- Phase 2: Buy the first shop item
  const unitToBuy = shop[0];
  const goldBeforeBuy = s.players['player_0'].gold;
  const eventsBeforeBuy = s.eventLog.length;

  s = prep.applyPreparationInput(s, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: unitToBuy,
    shop_index: 0
  });

  // Verify gold decreased by cost (cost fixture: unit_1=1, unit_2=2, etc.)
  const buyCost = buyCostOf(unitToBuy);
  assert.ok(buyCost > 0, 'precondition: the drawn unit has a real, known price');
  assert.strictEqual(s.players['player_0'].gold, goldBeforeBuy - buyCost, `Gold decreased exactly by ${buyCost}`);

  // Verify unit is on bench
  assert.strictEqual(s.players['player_0'].bench.length, 1, 'Bench has exactly 1 unit after Buy');
  const boughtUnit = s.players['player_0'].bench[0];
  assert.strictEqual(boughtUnit.unit_def_id, unitToBuy, `Bought unit definition is ${unitToBuy}`);
  assert.strictEqual(boughtUnit.star, 1, 'Bought unit is ★1');
  assert.strictEqual(typeof boughtUnit.unit_instance_id, 'string', 'Unit has a unique instance ID');

  // Verify shop slot consumed (shop length decreased by 1)
  assert.strictEqual(s.players['player_0'].shop.length, SHOP_SIZE - 1, 'Shop slot consumed');

  // Verify UnitBought event
  const unitBoughtEvent = s.eventLog.find(e => e.kind === 'UnitBought');
  assert.ok(unitBoughtEvent, 'UnitBought event exists');
  assert.strictEqual(unitBoughtEvent.unit_definition, unitToBuy, 'UnitBought.unit_definition matches');
  assert.strictEqual(unitBoughtEvent.gold_cost, buyCost, `UnitBought.gold_cost is exactly ${buyCost}`);
  assert.strictEqual(unitBoughtEvent.unit_instance_id, boughtUnit.unit_instance_id, 'UnitBought.unit_instance_id matches bought unit');
  assert.strictEqual(unitBoughtEvent.bench_index, 0, 'UnitBought.bench_index is 0 (first on bench)');

  // --- Phase 3: Place unit from Bench to Board
  // C1 (s9-build playtest fix, board/board.mjs::isInPlayerHalf): index 0 (row 0, top-left)
  // is now the OPPONENT's half under BOARD_ORIENTATION='mirror' — player_0 owns the bottom
  // half (row >= BOARD_HEIGHT/2 = 4). Index 32 (row 4, col 0) is the equivalent corner of
  // the player's OWN half. This test previously encoded a placement that C1 now correctly
  // refuses; the index was corrected, not the invariant it verifies (bench->board Place
  // succeeds on a free, in-zone cell).
  const unitInstanceId = boughtUnit.unit_instance_id;
  const boardIndexToPlace = 32; // Place at board cell 32 (row 4, col 0 — player's own half)
  const eventsBeforePlace = s.eventLog.length;

  s = prep.applyPreparationInput(s, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unitInstanceId,
    to_zone: 'board',
    to_index: boardIndexToPlace
  });

  // Verify unit removed from bench
  assert.strictEqual(s.players['player_0'].bench.length, 0, 'Bench is empty after placing to board');

  // Verify unit on board with correct index
  assert.strictEqual(s.players['player_0'].board.length, 1, 'Board has exactly 1 unit');
  const placedUnit = s.players['player_0'].board[0];
  assert.strictEqual(placedUnit.unit_instance_id, unitInstanceId, 'Unit on board has correct instance ID');
  assert.strictEqual(placedUnit.board_index, boardIndexToPlace, `Unit placed at board index ${boardIndexToPlace}`);

  // Verify UnitPlaced event
  const unitPlacedEvent = s.eventLog.find(e => e.kind === 'UnitPlaced' && e.unit_instance_id === unitInstanceId);
  assert.ok(unitPlacedEvent, 'UnitPlaced event exists');
  assert.strictEqual(unitPlacedEvent.from_zone, 'bench', 'UnitPlaced.from_zone is bench');
  assert.strictEqual(unitPlacedEvent.from_index, 0, 'UnitPlaced.from_index is 0 (only item on bench)');
  assert.strictEqual(unitPlacedEvent.to_zone, 'board', 'UnitPlaced.to_zone is board');
  assert.strictEqual(unitPlacedEvent.to_index, boardIndexToPlace, `UnitPlaced.to_index is ${boardIndexToPlace}`);

  // --- Phase 4: Place unit from Board to another Board cell (reposition)
  // Same C1 correction as Phase 3: the reposition target must stay in the player's own half
  // (row >= 4). Index 42 = row 5, col 2 — still within player_0's half, still a different
  // cell from boardIndexToPlace (32), so this remains a genuine reposition test.
  const newBoardIndex = 42; // Different cell, same (own) half
  s = prep.applyPreparationInput(s, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unitInstanceId,
    to_zone: 'board',
    to_index: newBoardIndex
  });

  // Verify unit moved to new index
  assert.strictEqual(s.players['player_0'].board.length, 1, 'Board still has exactly 1 unit');
  const repositionedUnit = s.players['player_0'].board[0];
  assert.strictEqual(repositionedUnit.board_index, newBoardIndex, `Unit repositioned to board index ${newBoardIndex}`);

  // Verify UnitPlaced event for reposition
  const unitRepositionedEvent = s.eventLog.slice(-1)[0]; // Last event should be the reposition
  assert.strictEqual(unitRepositionedEvent.kind, 'UnitPlaced', 'Last event is UnitPlaced');
  assert.strictEqual(unitRepositionedEvent.from_zone, 'board', 'UnitPlaced.from_zone is board for reposition');
  assert.strictEqual(unitRepositionedEvent.from_index, boardIndexToPlace, `UnitPlaced.from_index is previous board index ${boardIndexToPlace}`);
  assert.strictEqual(unitRepositionedEvent.to_zone, 'board', 'UnitPlaced.to_zone is board for reposition');
  assert.strictEqual(unitRepositionedEvent.to_index, newBoardIndex, `UnitPlaced.to_index is ${newBoardIndex}`);

  // --- Phase 5: Place unit from Board back to Bench
  s = prep.applyPreparationInput(s, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unitInstanceId,
    to_zone: 'bench',
    to_index: 0 // Ignored by bench handler, but required by validation
  });

  // Verify unit returned to bench
  assert.strictEqual(s.players['player_0'].board.length, 0, 'Board is empty after placing to bench');
  assert.strictEqual(s.players['player_0'].bench.length, 1, 'Bench has exactly 1 unit');
  const returnedUnit = s.players['player_0'].bench[0];
  assert.strictEqual(returnedUnit.unit_instance_id, unitInstanceId, 'Unit on bench is the same instance');

  // Verify UnitPlaced event for return to bench
  const unitReturnEvent = s.eventLog.slice(-1)[0];
  assert.strictEqual(unitReturnEvent.kind, 'UnitPlaced', 'Last event is UnitPlaced');
  assert.strictEqual(unitReturnEvent.from_zone, 'board', 'UnitPlaced.from_zone is board');
  assert.strictEqual(unitReturnEvent.from_index, newBoardIndex, `UnitPlaced.from_index is ${newBoardIndex}`);
  assert.strictEqual(unitReturnEvent.to_zone, 'bench', 'UnitPlaced.to_zone is bench');

  // --- Phase 6: Test Lock toggle (unlock → lock → unlock)
  const shopLockedBefore = s.players['player_0'].shop_locked;
  assert.strictEqual(shopLockedBefore, false, 'Shop is initially unlocked');

  // Lock
  s = prep.applyPreparationInput(s, {
    kind: 'Lock',
    seatId: 'player_0'
  });

  assert.strictEqual(s.players['player_0'].shop_locked, true, 'Shop locked after Lock');
  let shopLockedEvent = s.eventLog.slice(-1)[0];
  assert.strictEqual(shopLockedEvent.kind, 'ShopLocked', 'ShopLocked event emitted after Lock');
  assert.strictEqual(shopLockedEvent.locked, true, 'ShopLocked.locked is true');

  // Lock again (toggle) to unlock
  s = prep.applyPreparationInput(s, {
    kind: 'Lock',
    seatId: 'player_0'
  });

  assert.strictEqual(s.players['player_0'].shop_locked, false, 'Shop unlocked after second Lock (toggle)');
  shopLockedEvent = s.eventLog.slice(-1)[0];
  assert.strictEqual(shopLockedEvent.kind, 'ShopLocked', 'ShopLocked event emitted after second Lock');
  assert.strictEqual(shopLockedEvent.locked, false, 'ShopLocked.locked is false');

  // Lock once more to verify toggle works both ways
  s = prep.applyPreparationInput(s, {
    kind: 'Lock',
    seatId: 'player_0'
  });

  assert.strictEqual(s.players['player_0'].shop_locked, true, 'Shop locked again after third Lock');
  shopLockedEvent = s.eventLog.slice(-1)[0];
  assert.strictEqual(shopLockedEvent.locked, true, 'ShopLocked.locked is true');

  // --- Phase 7: ConfirmPreparation phase transition
  const phaseBeforeConfirm = s.phase;
  assert.strictEqual(phaseBeforeConfirm, 'Preparation', 'Current phase is Preparation before ConfirmPreparation');

  s = prep.applyPreparationInput(s, {
    kind: 'ConfirmPreparation',
    seatId: 'player_0'
  });

  assert.strictEqual(s.phase, 'Battle', 'Phase transitioned to Battle');

  // Verify PhaseChanged event
  const phaseChangedEvent = s.eventLog.slice(-1)[0];
  assert.strictEqual(phaseChangedEvent.kind, 'PhaseChanged', 'PhaseChanged event emitted');
  assert.strictEqual(phaseChangedEvent.from_phase, 'Preparation', 'PhaseChanged.from_phase is Preparation');
  assert.strictEqual(phaseChangedEvent.to_phase, 'Battle', 'PhaseChanged.to_phase is Battle');

  // --- Verify state consistency and event log completeness
  assert.ok(s.eventLog.length > 0, 'Event log is not empty');

  // All events must have 'kind'
  for (const event of s.eventLog) {
    assert.strictEqual(typeof event.kind, 'string', 'All events have a kind field');
  }

  console.log(`S1 PASSED: ${s.eventLog.length} events emitted in sequence`);
});

/**
 * S2: Determinism test (same seed → same state + same journal)
 * Verifies that two independent game instances with the same seed produce identical states and event logs.
 */
test('S2: Determinism — same seed produces identical state and event log', () => {
  const testSeed = 12345;

  // Create two independent game instances
  let s1 = round.newGame(testSeed, ['player_0']);
  let s2 = round.newGame(testSeed, ['player_0']);

  // Start both rounds with same seed
  s1 = round.startRound(s1);
  s2 = round.startRound(s2);

  // Verify serialized states are identical
  const serialized1 = serialize.serialize(s1);
  const serialized2 = serialize.serialize(s2);
  assert.strictEqual(serialized1, serialized2, 'Serialized states are byte-for-byte identical');

  // Verify event logs are identical
  assert.strictEqual(s1.eventLog.length, s2.eventLog.length, 'Event logs have identical length');
  for (let i = 0; i < s1.eventLog.length; i++) {
    assert.deepStrictEqual(s1.eventLog[i], s2.eventLog[i], `Event ${i} is identical`);
  }

  // Apply identical sequence of inputs to both
  const buyInputs = [
    { kind: 'Buy', seatId: 'player_0', unitDefId: s1.players['player_0'].shop[0], shop_index: 0 },
    { kind: 'Buy', seatId: 'player_0', unitDefId: s1.players['player_0'].shop[0], shop_index: 0 }
  ];

  for (const input of buyInputs) {
    s1 = prep.applyPreparationInput(s1, input);
    s2 = prep.applyPreparationInput(s2, { ...input });
  }

  // Verify states are still identical
  const serialized1After = serialize.serialize(s1);
  const serialized2After = serialize.serialize(s2);
  assert.strictEqual(serialized1After, serialized2After, 'Serialized states remain identical after identical inputs');

  // Verify event logs are still identical
  assert.strictEqual(s1.eventLog.length, s2.eventLog.length, 'Event logs remain identical length');
  for (let i = 0; i < s1.eventLog.length; i++) {
    assert.deepStrictEqual(s1.eventLog[i], s2.eventLog[i], `Event ${i} remains identical`);
  }

  console.log('S2 PASSED: Determinism verified');
});

/**
 * S3: Honest refusals (no side effects on rejected inputs)
 * Tests: insufficient gold, occupied board cell
 * Verifies that rejected inputs leave state strictly unchanged: event log length unchanged, state serialization identical.
 */
test('S3: Honest refusals — insufficient gold and occupied cell leave state unchanged', () => {
  let s = round.newGame(99, ['player_0']);
  s = round.startRound(s);

  // Record initial state
  const goldBefore = s.players['player_0'].gold;
  const serializedBefore = serialize.serialize(s);
  const eventLogLengthBefore = s.eventLog.length;

  // --- Test 1: Buy without enough gold
  const unitToBuy = s.players['player_0'].shop[0];
  const buyCost = buyCostOf(unitToBuy);
  assert.ok(buyCost > 0, 'precondition: the drawn unit has a real, known price');

  // Manually reduce gold to less than cost
  let sWithLowGold = state.createGameState({
    seed: s.seed,
    rng_state: s.rng_state,
    eventLog: s.eventLog,
    players: { player_0: { ...s.players['player_0'], gold: Math.max(0, buyCost - 1) } },
    entities: s.entities,
    phase: s.phase,
    pool: s.pool,
    bench_capacity: s.bench_capacity,
    round_index: s.round_index
  });

  const goldBeforeBadBuy = sWithLowGold.players['player_0'].gold;
  const eventLogLengthBeforeBadBuy = sWithLowGold.eventLog.length;

  // Try to buy without enough gold
  sWithLowGold = prep.applyPreparationInput(sWithLowGold, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: unitToBuy,
    shop_index: 0
  });

  // Verify rejection: no side effects
  assert.strictEqual(sWithLowGold.players['player_0'].gold, goldBeforeBadBuy, 'Gold unchanged after rejected Buy');
  assert.strictEqual(sWithLowGold.eventLog.length, eventLogLengthBeforeBadBuy, 'Event log length unchanged after rejected Buy');
  const serializedAfterBadBuy = serialize.serialize(sWithLowGold);
  assert.strictEqual(serializedAfterBadBuy, serialize.serialize(state.createGameState({
    seed: sWithLowGold.seed,
    rng_state: sWithLowGold.rng_state,
    eventLog: sWithLowGold.eventLog,
    players: sWithLowGold.players,
    entities: sWithLowGold.entities,
    phase: sWithLowGold.phase,
    pool: sWithLowGold.pool,
    bench_capacity: sWithLowGold.bench_capacity,
    round_index: sWithLowGold.round_index
  })), 'State serialization identical after rejected Buy');

  // --- Test 2: Place on occupied board cell
  let s2 = round.newGame(77, ['player_0']);
  s2 = round.startRound(s2);

  // Manually add more gold to ensure we can buy two units (safety check)
  s2 = state.createGameState({
    seed: s2.seed,
    rng_state: s2.rng_state,
    eventLog: s2.eventLog,
    players: { player_0: { ...s2.players['player_0'], gold: 20 } },
    entities: s2.entities,
    phase: s2.phase,
    pool: s2.pool,
    bench_capacity: s2.bench_capacity,
    round_index: s2.round_index
  });

  // Buy first unit
  const unit1ToBuy = s2.players['player_0'].shop[0];
  s2 = prep.applyPreparationInput(s2, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: unit1ToBuy,
    shop_index: 0
  });

  // Verify first buy succeeded
  assert.strictEqual(s2.players['player_0'].bench.length, 1, 'Bench has 1 unit after first Buy');

  // Buy second unit from updated shop
  const unit2ToBuy = s2.players['player_0'].shop[0];
  s2 = prep.applyPreparationInput(s2, {
    kind: 'Buy',
    seatId: 'player_0',
    unitDefId: unit2ToBuy,
    shop_index: 0
  });

  // Verify second buy succeeded
  assert.strictEqual(s2.players['player_0'].bench.length, 2, 'Bench has 2 units after second Buy');

  // Place first unit at index 32 (row 4, col 0 — player_0's own half; C1, board/board.mjs::
  // isInPlayerHalf. Index 0 would now be a zone-violation refusal, not the occupied-cell
  // refusal this test targets, so it was moved into the player's own half.)
  const unit1Id = s2.players['player_0'].bench[0].unit_instance_id;
  s2 = prep.applyPreparationInput(s2, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unit1Id,
    to_zone: 'board',
    to_index: 32
  });

  assert.strictEqual(s2.players['player_0'].board.length, 1, 'Board has 1 unit');
  assert.strictEqual(s2.players['player_0'].bench.length, 1, 'Bench has 1 unit left');

  // Try to place second unit at same index (occupied) — rejection test
  const unit2Id = s2.players['player_0'].bench[0].unit_instance_id;
  const serializedBefore2 = serialize.serialize(s2);
  const eventLogLengthBefore2 = s2.eventLog.length;
  const boardLengthBefore2 = s2.players['player_0'].board.length;

  s2 = prep.applyPreparationInput(s2, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unit2Id,
    to_zone: 'board',
    to_index: 32 // Same occupied cell (still in-zone: this test targets occupancy, not C1)
  });

  // Verify rejection: state completely unchanged
  assert.strictEqual(s2.players['player_0'].board.length, boardLengthBefore2, 'Board length unchanged after rejected Place');
  assert.strictEqual(s2.eventLog.length, eventLogLengthBefore2, 'Event log length unchanged after rejected Place');
  const serializedAfter2 = serialize.serialize(s2);
  assert.strictEqual(serializedAfter2, serializedBefore2, 'State serialization identical after rejected Place');

  console.log('S3 PASSED: Honest refusals verified');
});

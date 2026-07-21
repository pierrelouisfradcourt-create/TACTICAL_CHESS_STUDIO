// properties.i25.test.mjs - Hardening pass for the s9-build playtest fixes (increment 2.5,
// dispatch auto_battler_i2_5-20260719c). Covers the 4 tests the dispatch explicitly requires:
//   1. Place hors de sa moitié (C1) est refusé : état sérialisé STRICTEMENT identique, journal
//      de longueur inchangée.
//   2. Place dans sa moitié réussit sur la case exacte.
//   3. Au niveau 1, sur un grand nombre de tirages seedés, aucune unité de rang élevé
//      n'apparaît ; à un niveau élevé, elles apparaissent (C2).
//   4. La table d'odds lue par l'affichage est la même référence que celle lue par le tirage
//      (pas une copie) (ECO-2/INV-8).
// No `>=` tautologies: every assertion below is falsifiable by a real regression.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as state from './engine/state.mjs';
import * as prep from './preparation/preparation.mjs';
import { createGameState } from './engine/state.mjs';
import * as serialize from './engine/serialize.mjs';
import * as boardMod from './board/board.mjs';
import * as shopMod from './shop/shop.mjs';
import { SHOP_ODDS_TABLE, BOARD_WIDTH, BOARD_HEIGHT } from './params.v0.mjs';
import { getUnitRank } from './content/units.v0.mjs';

function makeFreshPrepState(seed, gold, shop = ['unit_1']) {
  const s0 = state.initState(seed);
  let ps = prep.initPrepState(s0, ['player_0']);
  const player = ps.players['player_0'];
  return createGameState({
    seed: ps.seed,
    rng_state: ps.rng_state,
    eventLog: ps.eventLog,
    players: { player_0: { ...player, gold, shop } },
    entities: ps.entities,
    phase: ps.phase,
    pool: ps.pool,
    bench_capacity: ps.bench_capacity
  });
}

// =====================================================================
// C1 — Test 1: Place hors de sa moitié est refusé (état strictement inchangé)
// =====================================================================

test('C1: Place outside player_0\'s own half is refused — state serialization STRICTLY identical, event log length unchanged', () => {
  let ps = makeFreshPrepState(2001, 50);
  ps = prep.applyPreparationInput(ps, { kind: 'Buy', seatId: 'player_0', unitDefId: 'unit_1', shop_index: 0 });
  const unit = ps.players['player_0'].bench[0];
  assert.ok(unit, 'precondition: a unit is on the bench to attempt placing');

  // Sanity check on the fixture geometry itself before trusting the refusal below.
  assert.equal(boardMod.isInPlayerHalf(0, 'player_0'), false, 'precondition: index 0 (row 0) is NOT player_0\'s half');

  const serializedBefore = serialize.serialize(ps);
  const eventLogLengthBefore = ps.eventLog.length;
  const benchBefore = ps.players['player_0'].bench.length;
  const boardBefore = ps.players['player_0'].board.length;

  const rejected = prep.applyPreparationInput(ps, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unit.unit_instance_id,
    to_zone: 'board',
    to_index: 0 // enemy half under BOARD_ORIENTATION='mirror'
  });

  assert.equal(serialize.serialize(rejected), serializedBefore, 'refused Place: serialized state STRICTLY identical');
  assert.equal(rejected.eventLog.length, eventLogLengthBefore, 'refused Place: event log length unchanged');
  assert.equal(rejected.players['player_0'].bench.length, benchBefore, 'refused Place: bench unchanged');
  assert.equal(rejected.players['player_0'].board.length, boardBefore, 'refused Place: board unchanged (unit never landed)');
});

test('C1: every row of the opponent half (0..3) is refused for player_0; sampled with several columns', () => {
  let ps = makeFreshPrepState(2002, 50);
  ps = prep.applyPreparationInput(ps, { kind: 'Buy', seatId: 'player_0', unitDefId: 'unit_1', shop_index: 0 });
  const unit = ps.players['player_0'].bench[0];
  const serializedBefore = serialize.serialize(ps);

  for (let row = 0; row < BOARD_HEIGHT / 2; row++) {
    for (const col of [0, 3, BOARD_WIDTH - 1]) {
      const index = row * BOARD_WIDTH + col;
      const rejected = prep.applyPreparationInput(ps, {
        kind: 'Place',
        seatId: 'player_0',
        unit_instance_id: unit.unit_instance_id,
        to_zone: 'board',
        to_index: index
      });
      assert.equal(serialize.serialize(rejected), serializedBefore, `index ${index} (row ${row}) refused: state unchanged`);
    }
  }
});

// =====================================================================
// C1 — Test 2: Place dans sa moitié réussit sur la case exacte
// =====================================================================

test('C1: Place inside player_0\'s own half succeeds, unit lands on the EXACT requested cell', () => {
  let ps = makeFreshPrepState(2003, 50);
  ps = prep.applyPreparationInput(ps, { kind: 'Buy', seatId: 'player_0', unitDefId: 'unit_1', shop_index: 0 });
  const unit = ps.players['player_0'].bench[0];

  const targetIndex = 50; // row 6, col 2 — inside player_0's own half (row >= 4)
  assert.equal(boardMod.isInPlayerHalf(targetIndex, 'player_0'), true, 'precondition: target index is in player_0\'s own half');

  const accepted = prep.applyPreparationInput(ps, {
    kind: 'Place',
    seatId: 'player_0',
    unit_instance_id: unit.unit_instance_id,
    to_zone: 'board',
    to_index: targetIndex
  });

  assert.equal(accepted.players['player_0'].bench.length, 0, 'unit left the bench');
  assert.equal(accepted.players['player_0'].board.length, 1, 'unit landed on the board');
  assert.equal(accepted.players['player_0'].board[0].board_index, targetIndex, 'unit is on the EXACT requested cell');
  assert.equal(accepted.players['player_0'].board[0].unit_instance_id, unit.unit_instance_id, 'it is the same unit instance');

  const placedEvent = accepted.eventLog.find(e => e.kind === 'UnitPlaced' && e.unit_instance_id === unit.unit_instance_id);
  assert.ok(placedEvent, 'UnitPlaced event was emitted');
  assert.equal(placedEvent.to_index, targetIndex, 'UnitPlaced.to_index matches the exact requested cell');
});

test('C1: every cell of player_0\'s own half (row >= 4) is a legal Place target', () => {
  for (let row = BOARD_HEIGHT / 2; row < BOARD_HEIGHT; row++) {
    for (const col of [0, 4, BOARD_WIDTH - 1]) {
      const index = row * BOARD_WIDTH + col;
      assert.equal(boardMod.isInPlayerHalf(index, 'player_0'), true, `index ${index} (row ${row}) is in player_0's own half`);
    }
  }
});

// =====================================================================
// C2 — Test 3: le tirage dépend du niveau (rang élevé absent à bas niveau, présent à haut niveau)
// =====================================================================

const LARGE_POOL = { unit_1: 1_000_000, unit_2: 1_000_000, unit_3: 1_000_000, unit_4: 1_000_000, unit_5: 1_000_000 };
const DRAW_ITERATIONS = 400;
const SHOP_SIZE_FOR_TEST = 5;

test('C2: at level 1, across many seeded draws, ONLY rank-1 units ever appear (SHOP_ODDS_TABLE[0] = [100,0,0,0,0])', () => {
  let rngState = 777001;
  let sawAnyDraw = false;
  for (let i = 0; i < DRAW_ITERATIONS; i++) {
    const draw = shopMod.drawShop(rngState, LARGE_POOL, 1, SHOP_SIZE_FOR_TEST);
    rngState = draw.rng_state;
    for (const unitDefId of draw.shop) {
      sawAnyDraw = true;
      assert.equal(unitDefId, 'unit_1', `level 1 draw must be unit_1 only, got ${unitDefId} (iteration ${i})`);
      assert.equal(getUnitRank(unitDefId), 1, 'drawn unit rank is 1');
    }
  }
  assert.ok(sawAnyDraw, 'precondition: draws actually produced units to check');
});

test('C2: at a high level, rank-5 units DO appear across many seeded draws (SHOP_ODDS_TABLE clamp level has rank5 weight > 0)', () => {
  const highLevel = SHOP_ODDS_TABLE.length + 3; // beyond the table: exercises the clamp too
  let rngState = 888001;
  let sawRank5 = false;
  let sawRank1 = false;
  for (let i = 0; i < DRAW_ITERATIONS; i++) {
    const draw = shopMod.drawShop(rngState, LARGE_POOL, highLevel, SHOP_SIZE_FOR_TEST);
    rngState = draw.rng_state;
    for (const unitDefId of draw.shop) {
      if (getUnitRank(unitDefId) === 5) sawRank5 = true;
      if (getUnitRank(unitDefId) === 1) sawRank1 = true;
    }
  }
  assert.ok(sawRank5, 'rank-5 units appeared at least once at a high level');
  assert.ok(sawRank1, 'rank-1 units still appear too (level 6+ table keeps a nonzero rank-1 weight)');
});

test('C2: the draw is deterministic — same (rng_state, pool, level) produces the identical shop', () => {
  const drawA = shopMod.drawShop(424242, LARGE_POOL, 3, SHOP_SIZE_FOR_TEST);
  const drawB = shopMod.drawShop(424242, LARGE_POOL, 3, SHOP_SIZE_FOR_TEST);
  assert.deepEqual(drawA.shop, drawB.shop, 'identical inputs produce an identical shop');
  assert.equal(drawA.rng_state, drawB.rng_state, 'identical inputs advance rng_state identically');
});

// =====================================================================
// ECO-2/INV-8 — Test 4: shop draw reads SHOP_ODDS_TABLE by REFERENCE, not a copy
// =====================================================================

test('ECO-2/INV-8: shop.drawShop reads the SAME live SHOP_ODDS_TABLE reference from params.v0.mjs (mutation is observed, proving no copy was taken at import time)', () => {
  const originalLevel1Row = SHOP_ODDS_TABLE[0].slice();
  try {
    // Force level 1 to behave like "only rank 5 exists" by mutating the array IN PLACE
    // (same reference shop.mjs imported — if shop.mjs had cloned the table at import time,
    // this mutation would have no effect on its draws).
    SHOP_ODDS_TABLE[0][0] = 0;
    SHOP_ODDS_TABLE[0][4] = 100;

    const draw = shopMod.drawShop(555001, LARGE_POOL, 1, SHOP_SIZE_FOR_TEST);
    assert.ok(draw.shop.length > 0, 'precondition: draw produced units');
    for (const unitDefId of draw.shop) {
      assert.equal(unitDefId, 'unit_5', 'mutating params.SHOP_ODDS_TABLE in place changed shop.mjs\'s draw — same live reference, not a snapshot');
    }
  } finally {
    // Restore — this array is a module-level singleton shared with every other test in this
    // process (ES module caching), so leaving it mutated would silently corrupt every test
    // that runs after this one in the same `node --test` invocation.
    SHOP_ODDS_TABLE[0][0] = originalLevel1Row[0];
    SHOP_ODDS_TABLE[0][4] = originalLevel1Row[4];
    assert.deepEqual(SHOP_ODDS_TABLE[0], originalLevel1Row, 'restored to the original level-1 odds row');
  }
});

test('ECO-2/INV-8: renderer/render_dom.mjs declares NO local odds table — it only imports SHOP_ODDS_TABLE from params.v0.mjs (single source of truth, static source check)', () => {
  const src = readFileSync(new URL('./renderer/render_dom.mjs', import.meta.url), 'utf-8');
  assert.match(src, /import\s*\{[^}]*SHOP_ODDS_TABLE[^}]*\}\s*from\s*['"]\.\.\/params\.v0\.mjs['"]/, 'render_dom.mjs imports SHOP_ODDS_TABLE from params.v0.mjs');
  // No second declaration of an odds table anywhere in the file (would indicate a copy).
  const localDeclarations = src.match(/\bSHOP_ODDS_TABLE\s*=\s*\[/g) || [];
  assert.equal(localDeclarations.length, 0, 'render_dom.mjs does not locally redeclare/copy SHOP_ODDS_TABLE');
});

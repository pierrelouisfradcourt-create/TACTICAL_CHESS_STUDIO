// preparation/preparation.mjs - Preparation phase input handler
// Routes input kinds to economic actions: Buy, Sell, Reroll, Lock, LevelUp, Place, ConfirmPreparation

import { createGameState, freezeState } from '../engine/state.mjs';
import { appendEvent } from '../engine/eventlog.mjs';
import { nextRng } from '../engine/rng.mjs';
import { validateInputSync } from '../engine/inputs.mjs';
import * as pool from '../pool/pool.mjs';
import * as shop from '../shop/shop.mjs';
import * as bench from '../bench/bench.mjs';
import * as goldModule from '../economy/gold.mjs';
import * as mergeModule from '../merge/merge.mjs';

// Constants (TBD values, fixture defaults for now)
const BENCH_CAPACITY = 8; // ECO-7: schéma ici, valeur Balance Bible
const UNIT_DEF_IDS = ['unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5']; // fixture
const SHOP_SIZE = 5; // fixture TBD
const GOLD_COSTS = {
  Buy: { unit_1: 1, unit_2: 2, unit_3: 3, unit_4: 4, unit_5: 5 },
  Reroll: 1,
  LevelUp: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
};
const GOLD_CREDITS = {
  Sell: { unit_1: { star1: 1, star2: 2, star3: 6 },
          unit_2: { star1: 2, star2: 4, star3: 12 },
          unit_3: { star1: 3, star2: 6, star3: 18 },
          unit_4: { star1: 4, star2: 8, star3: 24 },
          unit_5: { star1: 5, star2: 10, star3: 30 } }
};

/**
 * Create a GameState and attach economic fields.
 * (Helper to work around createGameState not copying extra fields)
 */
export function createExtendedGameState(fields, pool, benchCapacity) {
  const state = createGameState(fields);
  state.pool = pool || {};
  state.bench_capacity = benchCapacity || BENCH_CAPACITY;
  return state;
}

/**
 * Generate a new unique unit_instance_id, deterministically derived from
 * rng_state (INV-19: no module-global mutable state — a decision function may
 * only read GameState/EventLog/DSL). Consumes one rng draw, same as any other
 * rule-authorized rng_state advance (INV-2).
 * @param {number} rngState - current state.rng_state
 * @returns {{id: string, rng_state: number}}
 */
function makeUnitInstanceId(rngState) {
  const { rng_state, value } = nextRng(rngState);
  return { id: `unit_inst_${value}`, rng_state };
}

/**
 * Initialize preparation state by extending a base GameState.
 * Adds pool, shop, bench, gold, level to each player.
 * @param {Object} baseState - GameState from engine/state.mjs
 * @param {Array} seatIds - seat identifiers (typically ['player_0', 'player_1', ...])
 * @returns {Object} extended state
 */
export function initPrepState(baseState, seatIds) {
  if (typeof baseState !== 'object' || baseState === null) {
    throw new Error('baseState must be a game state object');
  }
  if (!Array.isArray(seatIds)) {
    throw new Error('seatIds must be an array');
  }

  // Initialize pool with fixture units (1 of each)
  let initPool = {};
  for (const unitDefId of UNIT_DEF_IDS) {
    initPool[unitDefId] = 10; // Fixture: 10 exemplars of each unit type
  }

  // Initialize each player's bench, board, gold, level
  const players = { ...baseState.players };
  for (const seatId of seatIds) {
    players[seatId] = {
      gold: 0, // Will receive Income on first round
      bench: [],
      board: [],
      level: 1,
      shop: [],
      shop_locked: false
    };
  }

  return createExtendedGameState({
    seed: baseState.seed,
    rng_state: baseState.rng_state,
    eventLog: baseState.eventLog,
    players,
    entities: baseState.entities,
    phase: baseState.phase
  }, initPool, BENCH_CAPACITY);
}

/**
 * Route a single input to the appropriate handler.
 * Validates, applies, emits events, checks for automatic merges.
 * @param {Object} state - current game state
 * @param {Object} input - input object with {kind, seatId, ...payload}
 * @returns {Object} new state (immutable)
 */
export function applyPreparationInput(state, input) {
  // Validate input
  const validation = validateInputSync(input);
  if (!validation.ok) {
    // Reject: state unchanged
    return state;
  }

  const { kind, seatId, ...payload } = input;

  // Route by kind
  let newState = state;

  switch (kind) {
    case 'Buy':
      newState = handleBuy(state, seatId, payload);
      break;
    case 'Sell':
      newState = handleSell(state, seatId, payload);
      break;
    case 'Reroll':
      newState = handleReroll(state, seatId, payload);
      break;
    case 'Lock':
      newState = handleLock(state, seatId, payload);
      break;
    case 'LevelUp':
      newState = handleLevelUp(state, seatId, payload);
      break;
    case 'Place':
      newState = handlePlace(state, seatId, payload);
      break;
    case 'ConfirmPreparation':
      newState = handleConfirmPreparation(state, seatId, payload);
      break;
    default:
      // Should not reach here if validation passed
      return state;
  }

  return newState;
}

/**
 * Buy: Bench full check (DP-9) → if full, reject. Else: debit Pool, debit Gold, add to Bench.
 */
function handleBuy(state, seatId, payload) {
  const { unitDefId, shop_index } = payload;

  if (typeof unitDefId !== 'string' || typeof shop_index !== 'number') {
    return state; // Reject malformed
  }

  const player = state.players[seatId];
  if (!player) {
    return state; // Reject invalid seat
  }

  // DP-9: Bench full check
  if (bench.isBenchFull(player.bench, state.bench_capacity)) {
    // Reject deterministically: no debit, no Pool change, no event
    return state;
  }

  // Check Pool has the unit
  const poolCount = pool.getPoolCount(state.pool, unitDefId);
  if (poolCount < 1) {
    return state; // Reject: unit not available
  }

  // Debit Gold
  const cost = GOLD_COSTS.Buy[unitDefId] || 0;
  if (player.gold < cost) {
    return state; // Reject: insufficient gold
  }

  // All checks passed: apply transaction
  let newState = state;

  // Debit Pool
  const newPool = pool.debitPool(state.pool, unitDefId, 1);

  // Debit Gold and emit GoldChanged
  const newGold = player.gold - cost;
  let newEventLog = appendEvent(newState.eventLog, {
    kind: 'GoldChanged',
    seat_id: seatId,
    delta: -cost,
    new_gold: newGold,
    source: 'Buy'
  });

  // Create unit instance and add to Bench (id derived from rng_state, INV-19)
  const { id: newUnitInstanceId, rng_state: rngAfterId } = makeUnitInstanceId(state.rng_state);
  const unitInstance = {
    unit_instance_id: newUnitInstanceId,
    unit_def_id: unitDefId,
    star: 1,
    creation_tick: 0 // Fixture placeholder
  };

  const newBench = bench.addToBench(player.bench, unitInstance);

  // Emit UnitBought
  newEventLog = appendEvent(newEventLog, {
    kind: 'UnitBought',
    seat_id: seatId,
    unit_definition: unitDefId,
    gold_cost: cost,
    unit_instance_id: unitInstance.unit_instance_id
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, bench: newBench };

  newState = createGameState({
    seed: state.seed,
    rng_state: rngAfterId,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase
  });

  // Attach economic fields
  newState.pool = newPool;
  newState.bench_capacity = state.bench_capacity;

  // Auto-merge check
  newState = applyAutoMerge(newState, seatId);

  return newState;
}

/**
 * Sell: restore Pool (by Star), credit Gold, remove from Bench/Board.
 */
function handleSell(state, seatId, payload) {
  const { unit_instance_id } = payload;

  if (typeof unit_instance_id !== 'string') {
    return state; // Reject malformed
  }

  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  // Find unit on Bench or Board
  let unit = bench.findOnBench(player.bench, unit_instance_id);
  let isOnBench = unit !== null;

  if (!unit) {
    // Try Board (future: not yet implemented, assume Bench only)
    return state; // Unit not found
  }

  const { unit_def_id, star } = unit;

  // Compute Sell credit (Rarity × Star, fixture TBD)
  const sellCreditTable = GOLD_CREDITS.Sell[unit_def_id] || {};
  const creditKey = `star${star}`;
  const credit = sellCreditTable[creditKey] || 0;

  // Restore Pool by Star
  const newPool = pool.restorePool(state.pool, unit_def_id, star);

  // Credit Gold
  const newGold = player.gold + credit;
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'GoldChanged',
    seat_id: seatId,
    delta: credit,
    new_gold: newGold,
    source: 'Sell'
  });

  // Remove from Bench
  const removalResult = bench.removeFromBench(player.bench, unit_instance_id);
  if (!removalResult.ok) {
    return state; // Should not happen if findOnBench succeeded
  }

  const newBench = removalResult.newBench;

  // Emit UnitSold
  newEventLog = appendEvent(newEventLog, {
    kind: 'UnitSold',
    seat_id: seatId,
    unit_instance: unit_instance_id,
    star: star,
    pool_returned: Math.pow(3, star - 1),
    gold_credited: credit
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, bench: newBench };

  const newState2 = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase
  });

  // Attach economic fields
  newState2.pool = newPool;
  newState2.bench_capacity = state.bench_capacity;

  return newState2;
}

/**
 * Reroll: debit Gold, re-draw Shop.
 */
function handleReroll(state, seatId, payload) {
  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  const cost = GOLD_COSTS.Reroll;
  if (player.gold < cost) {
    return state; // Reject: insufficient gold
  }

  // Re-draw Shop (consume RNG)
  const { rng_state: newRngState, shop: newShop } = shop.drawShop(
    state.rng_state,
    state.pool,
    player.level,
    SHOP_SIZE
  );

  // Debit Gold
  const newGold = player.gold - cost;
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'GoldChanged',
    seat_id: seatId,
    delta: -cost,
    new_gold: newGold,
    source: 'Reroll'
  });

  // Emit ShopRolled
  newEventLog = appendEvent(newEventLog, {
    kind: 'ShopRolled',
    seat_id: seatId,
    shop_content: newShop,
    cause: 'Reroll'
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, shop: newShop, shop_locked: false };

  const newState3 = createGameState({
    seed: state.seed,
    rng_state: newRngState,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase
  });

  // Attach economic fields
  newState3.pool = state.pool;
  newState3.bench_capacity = state.bench_capacity;

  return newState3;
}

/**
 * Lock: conserve Shop without cost.
 */
function handleLock(state, seatId, payload) {
  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  // Just mark shop as locked; no RNG consumption, no cost
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, shop_locked: true };

  const newState4 = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: state.eventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase
  });

  // Attach economic fields
  newState4.pool = state.pool;
  newState4.bench_capacity = state.bench_capacity;

  return newState4;
}

/**
 * LevelUp: debit Gold, increment Level.
 */
function handleLevelUp(state, seatId, payload) {
  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  const newLevel = (player.level || 1) + 1;
  const cost = GOLD_COSTS.LevelUp[newLevel] || 0;

  if (player.gold < cost) {
    return state; // Reject: insufficient gold
  }

  // Debit Gold
  const newGold = player.gold - cost;
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'GoldChanged',
    seat_id: seatId,
    delta: -cost,
    new_gold: newGold,
    source: 'LevelUp'
  });

  // Emit PlayerLevelUp
  newEventLog = appendEvent(newEventLog, {
    kind: 'PlayerLevelUp',
    seat_id: seatId,
    old_level: player.level,
    new_level: newLevel,
    gold_cost: cost
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, level: newLevel };

  const newState5 = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase
  });

  // Attach economic fields
  newState5.pool = state.pool;
  newState5.bench_capacity = state.bench_capacity;

  return newState5;
}

/**
 * Place: move unit between Board and Bench (no Pool/Gold effect).
 */
function handlePlace(state, seatId, payload) {
  const { unit_instance_id, target_zone } = payload;

  if (typeof unit_instance_id !== 'string' || typeof target_zone !== 'string') {
    return state;
  }

  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  // Find unit on Bench
  const unit = bench.findOnBench(player.bench, unit_instance_id);
  if (!unit) {
    return state; // Not found
  }

  // Move to target zone (placeholder: only Bench→Board supported for now)
  if (target_zone === 'board') {
    const removalResult = bench.removeFromBench(player.bench, unit_instance_id);
    if (!removalResult.ok) {
      return state;
    }

    const newBench = removalResult.newBench;
    const newBoard = [...player.board, { ...unit }];

    const newPlayers = { ...state.players };
    newPlayers[seatId] = { ...player, bench: newBench, board: newBoard };

    const newState6 = createGameState({
      seed: state.seed,
      rng_state: state.rng_state,
      eventLog: state.eventLog,
      players: newPlayers,
      entities: state.entities,
      phase: state.phase
    });

    // Attach economic fields
    newState6.pool = state.pool;
    newState6.bench_capacity = state.bench_capacity;

    return newState6;
  } else if (target_zone === 'bench') {
    // Board→Bench not yet implemented
    return state;
  }

  return state;
}

/**
 * ConfirmPreparation: close the Preparation phase, advance to Battle.
 */
function handleConfirmPreparation(state, seatId, payload) {
  // Advance phase
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'Spawn', // Placeholder for phase transition
    phase: 'Battle'
  });

  const newState7 = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: state.players,
    entities: state.entities,
    phase: 'Battle'
  });

  // Attach economic fields
  newState7.pool = state.pool;
  newState7.bench_capacity = state.bench_capacity;

  return newState7;
}

/**
 * Auto-merge check: after any input, detect and resolve merges automatically.
 * (Merge is not an Input, it's an automatic effect — QC-3)
 */
function applyAutoMerge(state, seatId) {
  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  // Combine Bench + Board for merge detection
  const combinedUnits = [...player.bench, ...player.board];

  // Detect merge
  const mergeDetection = mergeModule.detectMerge(combinedUnits);
  if (!mergeDetection) {
    return state; // No merge
  }

  // Resolve merge (id derived from rng_state, INV-19 — no module-global counter)
  const { id: mergedUnitId, rng_state: rngAfterId } = makeUnitInstanceId(state.rng_state);
  const mergeResult = mergeModule.resolveMerge(combinedUnits, mergeDetection, () => mergedUnitId);
  if (!mergeResult.ok) {
    return state;
  }

  const { newUnits, consumed3, produced1 } = mergeResult;

  // Emit MergeTriggered and MergeResolved
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'MergeTriggered',
    seat_id: seatId,
    unit_def_id: mergeDetection.unitDefId,
    star: mergeDetection.star,
    consumed_count: 3
  });

  newEventLog = appendEvent(newEventLog, {
    kind: 'MergeResolved',
    seat_id: seatId,
    unit_def_id: mergeDetection.unitDefId,
    new_star: produced1.star,
    produced_unit_id: produced1.unit_instance_id
  });

  // Update Bench and Board from merged units.
  // The produced unit has a freshly-generated unit_instance_id that matches
  // NEITHER the pre-merge Bench nor Board (BUG found via mutation testing,
  // s9 i2 escalation): fixing it here by inheriting the zone of the oldest
  // consumed unit (consumed3[0]) rather than relying on identity matching
  // for the produced unit specifically.
  const producedWasOnBench = player.bench.some(b => b.unit_instance_id === consumed3[0].unit_instance_id);

  const newBench = newUnits.filter(u => {
    if (u.unit_instance_id === produced1.unit_instance_id) {
      return producedWasOnBench;
    }
    const wasOnBench = player.bench.some(b => b.unit_instance_id === u.unit_instance_id);
    return wasOnBench;
  });
  const newBoard = newUnits.filter(u => {
    if (u.unit_instance_id === produced1.unit_instance_id) {
      return !producedWasOnBench;
    }
    const wasOnBoard = player.board.some(b => b.unit_instance_id === u.unit_instance_id);
    return wasOnBoard;
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, bench: newBench, board: newBoard };

  const newState8 = createGameState({
    seed: state.seed,
    rng_state: rngAfterId,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase
  });

  // Attach economic fields
  newState8.pool = state.pool;
  newState8.bench_capacity = state.bench_capacity;

  // Recursively check for chained merges (e.g., merge produces ★2, triggers another ★2+★1→★2)
  return applyAutoMerge(newState8, seatId);
}

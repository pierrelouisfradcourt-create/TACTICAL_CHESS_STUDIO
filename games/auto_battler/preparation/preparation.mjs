// preparation/preparation.mjs - Preparation phase input handler
// Routes input kinds to economic actions: Buy, Sell, Reroll, Lock, LevelUp, Place, ConfirmPreparation

import { createGameState } from '../engine/state.mjs';
import { appendEvent } from '../engine/eventlog.mjs';
import { nextRng } from '../engine/rng.mjs';
import { validateInputSync } from '../engine/inputs.mjs';
import * as pool from '../pool/pool.mjs';
import * as shop from '../shop/shop.mjs';
import * as bench from '../bench/bench.mjs';
import * as board from '../board/board.mjs';
import * as mergeModule from '../merge/merge.mjs';
import { getUnitRank, getAllUnitDefIds } from '../content/units.v0.mjs';
import {
  BENCH_CAPACITY,
  SHOP_SIZE,
  REROLL_COST,
  SELL_STAR_MULTIPLIER,
  POOL_EXEMPLARS_PER_UNIT,
  LIFE_INITIAL,
  LIFE_FLOOR,
  LEVEL_UP_COSTS,
  boardCapacityForLevel
} from '../params.v0.mjs';

// D1 (i2.5 commande D): the content set went from 5 units to 15. The Buy/Sell price tables were
// per-unit literals here — a 15-line table maintained by hand next to the content, i.e. a second
// source of truth waiting to drift. They are now DERIVED, from the two facts already documented
// in content/units.v0.mjs and params.v0.mjs:
//     Buy cost      = rank                                     (rank === Buy cost, by contract)
//     Sell credit   = rank * SELL_STAR_MULTIPLIER[star - 1]    (extracted verbatim, same numbers)
// Verified against the removed tables: unit_2 (rank 2) gave {star1: 2, star2: 4, star3: 12},
// which is exactly 2 * [1, 2, 6]. No price changed for any pre-existing unit.
const UNIT_DEF_IDS = getAllUnitDefIds();
const GOLD_COSTS = {
  Reroll: REROLL_COST
  // LevelUp is NOT duplicated here (F1, s9-build commande F): the table now goes to level 10
  // and is the SINGLE source of truth in params.v0.mjs::LEVEL_UP_COSTS, read directly by
  // handleLevelUp below AND by renderer/render_dom.mjs — see the source/rationale comment there.
};

/** Buy cost of a unit definition: its rank. Unknown definition -> 0 (never throws). */
function buyCostOf(unitDefId) {
  return getUnitRank(unitDefId);
}

/** Sell credit: rank * SELL_STAR_MULTIPLIER[star - 1]. Unknown unit or star -> 0. */
function sellCreditOf(unitDefId, star) {
  const rank = getUnitRank(unitDefId);
  const multiplier = SELL_STAR_MULTIPLIER[star - 1];
  if (!rank || multiplier === undefined) return 0;
  return rank * multiplier;
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

  // Initialize pool: every unit definition of content/units.v0.mjs (15 since D1), same fixture
  // count each. The id list is no longer duplicated here — adding a unit to the content set is
  // enough for it to exist in the Pool.
  let initPool = {};
  for (const unitDefId of UNIT_DEF_IDS) {
    initPool[unitDefId] = POOL_EXEMPLARS_PER_UNIT;
  }

  // Initialize each player's bench, board, gold, level
  const players = { ...baseState.players };
  for (const seatId of seatIds) {
    players[seatId] = {
      gold: 0, // Will receive Income on first round
      // E1 (s9-build commande E): the Seat's Life. INV-15 — exactly ONE Life per Player, and it
      // is a resource of the Player/Seat, never of a Unit (INV-14: a Unit has Health).
      // LIFE_INITIAL is a ratified v0 value sourced from HSBG (params.v0.mjs); the Core Rules
      // Paramètres table listed it as "TBD" and this is the proposal that fills it.
      life: LIFE_INITIAL,
      bench: [],
      board: [],
      level: 1,
      shop: [],
      shop_locked: false
    };
  }

  return createGameState({
    seed: baseState.seed,
    rng_state: baseState.rng_state,
    eventLog: baseState.eventLog,
    players,
    entities: baseState.entities,
    phase: 'Preparation',
    pool: initPool,
    bench_capacity: BENCH_CAPACITY
  });
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

  // E1/INV-9: « Un Seat dont la Life est amenée à zéro est éliminé, plus aucun Input ». The
  // check is here, at the single routing point, so that NO handler can be reached afterwards —
  // an eliminated Seat cannot buy, sell, reroll, level, place, or confirm. State unchanged, no
  // Event, same refusal shape as every other rejection path (R14).
  const actingPlayer = state.players ? state.players[seatId] : null;
  if (actingPlayer && typeof actingPlayer.life === 'number' && actingPlayer.life <= LIFE_FLOOR) {
    return state;
  }

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
 * Buy: Bench full check (DP-9) → if full, reject. Shop-slot check (MED-3) →
 * shop_index must reference a real Shop slot that actually holds unitDefId,
 * else reject deterministically. Else: consume the Shop slot, debit Gold,
 * add to Bench.
 *
 * Pool accounting (ECO-1, reservation au tirage): the exemplar backing this
 * Shop slot was already reserved out of the Pool's available count when the
 * Shop was drawn (shop.drawShop → pool.reservePool). Buy converts that
 * reserved exemplar into a possession (Bench unit) — it does NOT touch
 * state.pool again, since doing so would double-debit the same exemplar.
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

  // MED-3: shop_index must reference a real, in-bounds Shop slot whose
  // content actually matches unitDefId. Buy must not succeed independently
  // of what the Shop displays.
  const playerShop = Array.isArray(player.shop) ? player.shop : [];
  if (
    !Number.isInteger(shop_index) ||
    shop_index < 0 ||
    shop_index >= playerShop.length ||
    playerShop[shop_index] !== unitDefId
  ) {
    return state; // Reject: Shop slot invalid or does not match unitDefId
  }

  // Debit Gold
  const cost = buyCostOf(unitDefId);
  if (player.gold < cost) {
    return state; // Reject: insufficient gold
  }

  // All checks passed: apply transaction
  let newState = state;

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
  const benchIndex = newBench.length - 1; // Index of newly added unit

  // Consume the Shop slot: the exemplar leaves the "reserved" account and
  // becomes a possession (MED-3).
  const newShop = [
    ...playerShop.slice(0, shop_index),
    ...playerShop.slice(shop_index + 1)
  ];

  // Emit UnitBought — now includes unit_instance_id and bench_index (R1b, gate 2026-07-19)
  newEventLog = appendEvent(newEventLog, {
    kind: 'UnitBought',
    seat_id: seatId,
    unit_definition: unitDefId,
    shop_slot: shop_index,
    gold_cost: cost,
    unit_instance_id: newUnitInstanceId,
    bench_index: benchIndex
  });

  // Update state (now createGameState preserves pool and bench_capacity automatically)
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, bench: newBench, shop: newShop };

  newState = createGameState({
    seed: state.seed,
    rng_state: rngAfterId,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  // Auto-merge check
  newState = applyAutoMerge(newState, seatId);

  return newState;
}

/**
 * Sell: restore Pool (by Star), credit Gold, remove from Bench or Board.
 * Now supports selling units from the Board (RO-4).
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
  let fromZone = 'bench';
  let fromIndex = player.bench.findIndex(u => u && u.unit_instance_id === unit_instance_id);

  if (!unit) {
    // Try Board
    unit = board.findOnBoard(player.board, unit_instance_id);
    fromZone = 'board';
    fromIndex = board.getBoardIndex(player.board, unit_instance_id);

    if (!unit) {
      return state; // Unit not found
    }
  }

  const { unit_def_id, star } = unit;

  // Compute Sell credit (Rank × Star multiplier, fixture TBD — see the header note)
  const credit = sellCreditOf(unit_def_id, star);

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

  // Remove from Bench or Board
  let newBench = player.bench;
  let newBoard = player.board;

  if (fromZone === 'bench') {
    const removalResult = bench.removeFromBench(player.bench, unit_instance_id);
    if (!removalResult.ok) {
      return state;
    }
    newBench = removalResult.newBench;
  } else {
    const removalResult = board.removeFromBoard(player.board, unit_instance_id);
    if (!removalResult.ok) {
      return state;
    }
    newBoard = removalResult.newBoard;
  }

  // Emit UnitSold — now includes from_zone and from_index (R1b, gate 2026-07-19)
  newEventLog = appendEvent(newEventLog, {
    kind: 'UnitSold',
    seat_id: seatId,
    unit_instance: unit_instance_id,
    unit_definition: unit_def_id,
    star: star,
    pool_returned: Math.pow(3, star - 1),
    gold_credited: credit,
    from_zone: fromZone,
    from_index: fromIndex
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, bench: newBench, board: newBoard };

  const newState = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: newPool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return newState;
}

// Fixture-only odds table version tag for ShopRolled payloads (ECO-4).
// This is NOT a Balance Bible value — it is a provisional placeholder for
// the contractual field; the real odds table / versioning is TBD.
const ODDS_TABLE_VERSION_FIXTURE = 'v0-fixture';

/**
 * Reroll: debit Gold, release the current Shop's reservation back to the
 * Pool (ECO-1: "réserve levée, retour au tirage"), re-draw a fresh Shop
 * (which reserves new exemplars out of the Pool, MED-2).
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

  // Release the outgoing Shop's reservation: every undrawn/unbought slot
  // returns 1 exemplar to the Pool's available count before the new draw.
  const oldShop = Array.isArray(player.shop) ? player.shop : [];
  let releasedPool = state.pool;
  for (const unitDefId of oldShop) {
    releasedPool = pool.restorePool(releasedPool, unitDefId, 1);
  }

  // Re-draw Shop (consume RNG); reserves new exemplars out of releasedPool.
  const { rng_state: newRngState, shop: newShop, pool: reservedPool } = shop.drawShop(
    state.rng_state,
    releasedPool,
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

  // Emit ShopRolled — payload matches 05_ECONOMY_BIBLE.md exactly:
  // {seat_id, shop_content, odds_table_version, cause}
  newEventLog = appendEvent(newEventLog, {
    kind: 'ShopRolled',
    seat_id: seatId,
    shop_content: newShop,
    odds_table_version: ODDS_TABLE_VERSION_FIXTURE,
    cause: 'Reroll'
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, gold: newGold, shop: newShop, shop_locked: false };

  const newState = createGameState({
    seed: state.seed,
    rng_state: newRngState,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: reservedPool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return newState;
}

/**
 * Lock: toggle shop lock state.
 * RO-1: Lock is a TOGGLE — verrouiller une boutique déjà verrouillée la déverrouille.
 * Emits ShopLocked{locked} (R1b, gate 2026-07-19).
 */
function handleLock(state, seatId, payload) {
  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  // Toggle shop_locked state
  const newLockedState = !player.shop_locked;

  let newEventLog = state.eventLog;

  // Emit ShopLocked event
  newEventLog = appendEvent(newEventLog, {
    kind: 'ShopLocked',
    seat_id: seatId,
    locked: newLockedState
  });

  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, shop_locked: newLockedState };

  const newState = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return newState;
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
  const cost = LEVEL_UP_COSTS[newLevel];

  // E4 side-effect (commande E) — HISTORY, resolved by F1 (s9-build commande F): the LevelUp
  // price table used to stop at level 5, and the older code read it as
  // `GOLD_COSTS.LevelUp[newLevel] || 0` — so EVERY level from 6 upward cost ZERO gold, handing
  // out unlimited board slots (E4) for free. `0` was itself an invented price. F1 extends
  // LEVEL_UP_COSTS (params.v0.mjs) to level 10, sourced TFT and transposed — see the comment
  // there for the exact derivation. The refusal below still invents nothing: level 10 is this
  // v0's ratified ceiling, so a level 11 Input is rejected, state strictly unchanged (R14) —
  // never a repli to 0, never a level invented past the table.
  if (cost === undefined) {
    return state; // Reject: no ratified price for this level — refuse rather than invent one
  }

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

  const newState = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return newState;
}

/**
 * Place: move unit between Bench and Board, or reposition on Board.
 * Supports: bench→board, board→board (reposition), board→bench (RO-4).
 * Emits UnitPlaced event with zone and index information (R1b, gate 2026-07-19).
 */
function handlePlace(state, seatId, payload) {
  const { unit_instance_id, to_zone, to_index } = payload;

  if (typeof unit_instance_id !== 'string' || typeof to_zone !== 'string' || typeof to_index !== 'number') {
    return state;
  }

  const player = state.players[seatId];
  if (!player) {
    return state;
  }

  let fromZone = null;
  let fromIndex = null;
  let unit = null;
  let newBench = player.bench;
  let newBoard = player.board;

  // Find unit on Bench or Board
  unit = bench.findOnBench(player.bench, unit_instance_id);
  if (unit) {
    fromZone = 'bench';
    fromIndex = player.bench.findIndex(u => u && u.unit_instance_id === unit_instance_id);
  } else {
    unit = board.findOnBoard(player.board, unit_instance_id);
    if (unit) {
      fromZone = 'board';
      fromIndex = board.getBoardIndex(player.board, unit_instance_id);
    }
  }

  if (!unit) {
    return state; // Unit not found
  }

  // Handle different movement types
  if (to_zone === 'bench') {
    // Remove from board or bench, add to bench
    if (fromZone === 'bench') {
      return state; // Already on bench
    }

    const boardRemovalResult = board.removeFromBoard(player.board, unit_instance_id);
    if (!boardRemovalResult.ok) {
      return state;
    }

    const benchAddResult = bench.addToBench(player.bench, { ...unit });
    if (!benchAddResult) {
      return state;
    }

    newBoard = boardRemovalResult.newBoard;
    newBench = benchAddResult;
  } else if (to_zone === 'board') {
    // Validate board index
    if (!board.isValidIndex(to_index)) {
      return state;
    }

    // C1 (s9-build playtest fix): placement is restricted to the seat's own half of the
    // board (BOARD_ORIENTATION = 'mirror', params.v0.mjs, ratified R11/RO-4). Reject
    // deterministically, state strictly unchanged — same refusal shape as every other
    // rejection path in this handler (R14: no rejection Event exists; input/submit.mjs
    // detects refusal by before/after state comparison).
    if (!board.isInPlayerHalf(to_index, seatId)) {
      return state;
    }

    // E4 (s9-build commande E): the LEVEL limits how many units may stand on the board at once
    // (TFT source: board units <= level, params.v0.mjs::boardCapacityForLevel). Checked ONLY for
    // a move that ADDS a unit to the board — a board->board reposition does not change the count
    // and must stay free. Refused deterministically, state strictly unchanged, no Event (R14);
    // input/feedback.mjs names the cause on screen ("Plateau plein — montez de niveau").
    // Checked BEFORE occupancy: "you have no slot at all" is a truer cause than "that cell is
    // taken" when both are true.
    if (fromZone === 'bench' && player.board.length >= boardCapacityForLevel(player.level || 1)) {
      return state;
    }

    if (!board.isCellFree(player.board, to_index)) {
      return state; // Cell occupied
    }

    if (fromZone === 'bench') {
      // Bench → Board: remove from bench, place on board
      const benchRemovalResult = bench.removeFromBench(player.bench, unit_instance_id);
      if (!benchRemovalResult.ok) {
        return state;
      }

      const boardPlaceResult = board.placeOnBoard(player.board, unit, to_index);
      if (!boardPlaceResult.ok) {
        return state;
      }

      newBench = benchRemovalResult.newBench;
      newBoard = boardPlaceResult.newBoard;
    } else {
      // Board → Board: reposition
      const moveResult = board.moveOnBoard(player.board, unit_instance_id, to_index);
      if (!moveResult.ok) {
        return state;
      }

      newBoard = moveResult.newBoard;
    }
  } else {
    return state; // Invalid zone
  }

  // Emit UnitPlaced — includes from_zone, from_index, to_zone, to_index (R1b, gate 2026-07-19)
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'UnitPlaced',
    seat_id: seatId,
    unit_instance_id: unit_instance_id,
    from_zone: fromZone,
    from_index: fromIndex,
    to_zone: to_zone,
    to_index: to_index
  });

  // Update state
  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, bench: newBench, board: newBoard };

  const newState = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return newState;
}

/**
 * ConfirmPreparation: transition from Preparation to Battle phase.
 * Emits PhaseChanged event (R1b, gate 2026-07-19, RO-2).
 */
function handleConfirmPreparation(state, seatId, payload) {
  const fromPhase = state.phase || 'Preparation';
  const toPhase = 'Battle';

  let newEventLog = appendEvent(state.eventLog, {
    kind: 'PhaseChanged',
    from_phase: fromPhase,
    to_phase: toPhase
  });

  const newState = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: state.players,
    entities: state.entities,
    phase: toPhase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return newState;
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

  // Determine destination of produced unit (bench or board, same as oldest consumed)
  const producedWasOnBench = player.bench.some(b => b.unit_instance_id === consumed3[0].unit_instance_id);
  const producedBoardIndex = producedWasOnBench
    ? null
    : board.getBoardIndex(player.board, consumed3[0].unit_instance_id);

  // Emit MergeTriggered and MergeResolved
  let newEventLog = appendEvent(state.eventLog, {
    kind: 'MergeTriggered',
    seat_id: seatId,
    unit_def_id: mergeDetection.unitDefId,
    star: mergeDetection.star,
    consumed_count: 3
  });

  // MergeResolved now includes to_zone and to_index (R1b, gate 2026-07-19)
  newEventLog = appendEvent(newEventLog, {
    kind: 'MergeResolved',
    seat_id: seatId,
    unit_def_id: mergeDetection.unitDefId,
    new_star: produced1.star,
    produced_unit_id: produced1.unit_instance_id,
    to_zone: producedWasOnBench ? 'bench' : 'board',
    to_index: producedWasOnBench ? null : producedBoardIndex
  });

  // Update Bench and Board from merged units.
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

  const newState = createGameState({
    seed: state.seed,
    rng_state: rngAfterId,
    eventLog: newEventLog,
    players: newPlayers,
    entities: state.entities,
    phase: state.phase,
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  // Recursively check for chained merges (e.g., merge produces ★2, triggers another ★2+★1→★2)
  return applyAutoMerge(newState, seatId);
}

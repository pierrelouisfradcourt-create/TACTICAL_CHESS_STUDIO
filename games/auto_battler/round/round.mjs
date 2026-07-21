// round/round.mjs - Round lifecycle and income flow
// Creates new game with round_index, advances rounds with Income → ShopRoll → Preparation (R13, A3)

import { initState, createGameState } from '../engine/state.mjs';
import { appendEvent } from '../engine/eventlog.mjs';
import { initPrepState } from '../preparation/preparation.mjs';
import * as shop from '../shop/shop.mjs';
import { resolveCombat } from '../combat/combat.mjs';
import { buildPlayerSide } from '../combat/army.mjs';
import { buildGhostSide } from '../combat/ghost.mjs';
import {
  INCOME_BASE,
  SHOP_SIZE,
  LIFE_FLOOR,
  computeLifeDamage,
  ghostLevelFor
} from '../params.v0.mjs';

// PHASE_ELIMINATION — the state a Match reaches when a Seat's Life hits the floor (INV-9:
// « Un Seat dont la Life est amenée à zéro est éliminé, plus aucun Input »). The NAME is not
// invented: 'Elimination' is a canonical term of 00_VOCABULARY.md ("Sortie définitive d'un Seat
// du Match quand sa Life atteint zéro"). No 23rd Event kind is created for it either — the
// transition is carried by the EXISTING `PhaseChanged` Event, whose payload is {from_phase,
// to_phase} and which already carries a free-form phase name. The blind renderer therefore
// learns the game is over from the journal alone.
export const PHASE_ELIMINATION = 'Elimination';

/**
 * Create a new game with round_index initialized to 0.
 * Calls initState + initPrepState to set up players with their starting state.
 * @param {number} seed - RNG seed
 * @param {Array} seatIds - seat identifiers (default: ['player_0'])
 * @returns {Object} new game state with round_index = 0
 */
export function newGame(seed, seatIds = ['player_0']) {
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    throw new Error('Seed must be an integer');
  }
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('seatIds must be a non-empty array');
  }

  // Initialize base game state
  const baseState = initState(seed);

  // Initialize preparation state (players, pools, shops, gold, level)
  let state = initPrepState(baseState, seatIds);

  // Add round_index = 0 (preserved by createGameState after A1)
  state = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: state.eventLog,
    players: state.players,
    entities: state.entities,
    phase: 'Preparation', // RO-2: canonical phase name
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: 0
  });

  return state;
}

/**
 * Compute income for a round based on round_index.
 * Income = min(3 + round_index, 10) — base income only (Interest and streak bonuses REJECTED, QE-4/QE-5).
 * @param {number} round_index - current round index (0-based)
 * @returns {number} gold to credit
 */
export function computeIncome(round_index) {
  if (typeof round_index !== 'number' || !Number.isInteger(round_index) || round_index < 0) {
    throw new Error('round_index must be a non-negative integer');
  }
  return Math.min(INCOME_BASE + round_index, 10);
}

/**
 * Start a round: credit Income → draw Shops (respecting Lock) → remain in Preparation.
 * Iterates Seats in seat_index order (DP-2, deterministic).
 * @param {Object} state - current game state (typically after ConfirmPreparation of previous round)
 * @returns {Object} new game state with Income credited, Shops rolled, round_index incremented
 */
export function startRound(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('state must be a valid game state');
  }

  if (typeof state.round_index !== 'number' || state.round_index < 0) {
    throw new Error('state.round_index must be a non-negative integer');
  }

  let newState = state;
  let newEventLog = newState.eventLog;
  let newRngState = newState.rng_state;
  let newPlayers = { ...newState.players };

  // Iterate Seats in deterministic order (DP-2: seat_index ascending)
  const seatIds = Object.keys(newPlayers).sort(); // alphabetical = deterministic

  // Phase 1: Income — credit each Seat
  for (const seatId of seatIds) {
    const player = newPlayers[seatId];
    const income = computeIncome(newState.round_index);

    // Credit gold via GoldChanged (no input_ref for system-generated transactions)
    const newGold = player.gold + income;
    newEventLog = appendEvent(newEventLog, {
      kind: 'GoldChanged',
      seat_id: seatId,
      delta: income,
      new_gold: newGold,
      source: 'Income'
      // Note: no input_ref (system-generated, not from an Input)
    });

    newPlayers[seatId] = { ...player, gold: newGold };
  }

  // Phase 2: Shop Rolls — draw for each Seat (unless locked)
  for (const seatId of seatIds) {
    const player = newPlayers[seatId];

    // ECO-8: If shop is locked, skip drawing (keep it as-is, no rng consumption)
    if (player.shop_locked) {
      // Shop locked: emit no ShopRolled, keep old shop and lock state
      continue;
    }

    // Draw new shop (consumes rng_state, reserves exemplars from pool)
    // E-fix (s9-build commande E): this call used to pass the LITERAL 5 with a comment claiming
    // it came from params.v0.mjs — so changing the ratified SHOP_SIZE changed the Reroll shop
    // (preparation.mjs, which imports it) but NOT the start-of-round shop. The constant is now
    // actually imported and used; a test asserts that changing it changes the drawn shop.
    const drawResult = shop.drawShop(
      newRngState,
      newState.pool,
      player.level,
      SHOP_SIZE
    );

    newRngState = drawResult.rng_state;
    newState.pool = drawResult.pool; // Update pool with new reservations

    // Emit ShopRolled with cause='RoundStart' (RO-3)
    newEventLog = appendEvent(newEventLog, {
      kind: 'ShopRolled',
      seat_id: seatId,
      shop_content: drawResult.shop,
      odds_table_version: 'v0-fixture',
      cause: 'RoundStart'
    });

    // Update player's shop and reset lock (ECO-8: lock is per-round, expires after draw)
    newPlayers[seatId] = { ...player, shop: drawResult.shop, shop_locked: false };
  }

  // Reconstruct state with all updates
  newState = createGameState({
    seed: newState.seed,
    rng_state: newRngState,
    eventLog: newEventLog,
    players: newPlayers,
    entities: newState.entities,
    phase: 'Preparation', // RO-2: remain in Preparation
    pool: newState.pool,
    bench_capacity: newState.bench_capacity,
    round_index: newState.round_index + 1 // Increment round counter
  });

  return newState;
}

/**
 * E1/E2 — the Round Resolution's Life consequence, isolated so it can be read (and tested) on
 * its own. Pure: (CombatResult, viewer side ref, viewer level, rank map) -> damage to the viewer.
 *
 * Three cases, and only three:
 *   - `resolution_kind === 'draw'`  -> 0. Ratified VERBATIM by the owner (QB-6,
 *     HUMANGATE_2026-07-19_QB6.md): mutual annihilation costs NO Life to anyone. Before E1 that
 *     rule was vacuous (no Life existed); it is now the only rule that can make a lost-looking
 *     round free, and it is asserted by a test on real state.
 *   - the viewer WON -> 0. Symmetric damage to the ghost is NOT applied: the ghost is not a Seat
 *     and has no Life (combat/ghost.mjs). TODO [FOG] — with real pairing (DP-3) the loser is
 *     another Seat and this same function applies to it. Owner: Decision Bible.
 *   - the viewer LOST -> computeLifeDamage(winner level, ranks of the winner's survivors).
 *
 * @param {Object} result - CombatResult (Victory payload)
 * @param {string} viewerSideRef
 * @param {number} viewerLevel
 * @param {Map<string, number>} rankByUnitInstanceId - built from the two snapshots, so this
 *   module never imports content/ (P11: the engine only ever sees the opaque unit_def_id)
 * @returns {number} Life points the viewer loses (>= 0)
 */
export function lifeDamageForViewer(result, viewerSideRef, viewerLevel, rankByUnitInstanceId) {
  if (!result || result.resolution_kind === 'draw') return 0;
  if (result.winner_side_ref === null || result.winner_side_ref === viewerSideRef) return 0;

  // The winner here is necessarily the ghost (the viewer lost). It has no Level of its own:
  // ghostLevelFor (params.v0.mjs) extends to the Level the mirror that already fixes its count,
  // ranks, stars and cells.
  const winnerLevel = ghostLevelFor(viewerLevel);
  const survivors = Array.isArray(result.survivors) ? result.survivors : [];
  const ranks = survivors.map(s => rankByUnitInstanceId.get(s.unit_instance_id) || 0);
  return computeLifeDamage(winnerLevel, ranks);
}

/**
 * Resolve the Battle of the current Round, APPEND its whole Event segment to the journal, and
 * APPLY its consequence to the Seat's Life (E1/E2, s9-build commande E).
 *
 * QC-1 / CBT-6: the Combat itself still touches nothing outside itself — it receives two
 * snapshots and returns a CombatResult. THIS function is the Round Resolution, and it is the
 * only place allowed to turn that result into a loss of Life.
 *
 * The TODO [FOG] that stood here (no Life field, no formula, both TBD) is RESOLVED: LIFE_INITIAL
 * and computeLifeDamage are ratified v0 values sourced from Hearthstone Battlegrounds
 * (params.v0.mjs). What remains fog is named there, not here.
 *
 * The Board is deliberately NOT modified by the battle: the Combat works on snapshots (CBT-8),
 * so the army that fought is still standing for the next Round — the genre's own convention and
 * the reason a placement is an investment. Gold, Bench, Board, Level, Shop and Pool are STILL
 * strictly untouched; `life` is now the one and only field a battle can change.
 *
 * @param {Object} state - a state whose phase is 'Battle' (after ConfirmPreparation)
 * @param {string} seatId
 * @returns {Object} new state, same phase, Event Log extended by the combat segment, Life applied
 */
export function resolveBattle(state, seatId) {
  if (!state || typeof state !== 'object') {
    throw new Error('state must be a valid game state');
  }
  const player = state.players[seatId];
  if (!player) {
    throw new Error(`Unknown seat: ${seatId}`);
  }

  const roundIndex = typeof state.round_index === 'number' ? state.round_index : 0;
  const combatRef = `combat_${seatId}_r${roundIndex}`;

  const playerSide = buildPlayerSide(`${seatId}`, player.board);
  const ghostSide = buildGhostSide(`ghost_of_${seatId}`, player.board, state.seed, roundIndex);

  const { result, events } = resolveCombat({
    combat_ref: combatRef,
    sides: [playerSide, ghostSide]
  });

  let newEventLog = state.eventLog;
  for (const ev of events) {
    newEventLog = appendEvent(newEventLog, ev);
  }

  // Rank of every unit that fought, from the snapshots themselves (combat/army.mjs and
  // combat/ghost.mjs resolve it out of content/). round/ stays content-agnostic.
  const rankByUnitInstanceId = new Map();
  for (const side of [playerSide, ghostSide]) {
    for (const u of side.units) rankByUnitInstanceId.set(u.unit_instance_id, u.rank || 0);
  }

  const damage = lifeDamageForViewer(result, playerSide.side_ref, player.level || 1, rankByUnitInstanceId);
  const currentLife = typeof player.life === 'number' ? player.life : 0;
  const newLife = Math.max(LIFE_FLOOR, currentLife - damage);

  const newPlayers = { ...state.players };
  newPlayers[seatId] = { ...player, life: newLife };

  return createGameState({
    seed: state.seed,
    rng_state: state.rng_state, // CBT-9: the Combat consumed no randomness at all
    eventLog: newEventLog,
    players: newPlayers,        // CBT-6: Gold, Bench, Board, Level, Shop, Pool untouched; Life applied
    entities: state.entities,
    phase: state.phase,         // the phase change to Elimination happens in startNextRound, so
                                // that the fatal battle is WATCHED before the game-over screen
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: roundIndex
  });
}

/**
 * Has this Seat reached the Life floor? INV-9 — at that point the Seat is eliminated and accepts
 * no further Input.
 * @param {Object} state
 * @param {string} seatId
 * @returns {boolean}
 */
export function isEliminated(state, seatId) {
  if (!state || !state.players) return false;
  const player = state.players[seatId];
  if (!player || typeof player.life !== 'number') return false;
  return player.life <= LIFE_FLOOR;
}

/**
 * Is the Match over? Single-seat slice: the Match ends when THE Seat is eliminated.
 * TODO [FOG] — no VICTORY condition is defined and none is invented here. With one Seat facing a
 * placeholder ghost army, "last one standing" (00_VOCABULARY.md, Elimination) has no meaning: a
 * game is PLAYED UNTIL IT IS LOST, and the score is the number of Rounds held. Owner: Core Rules,
 * to be revisited when several Seats exist.
 * @param {Object} state
 * @returns {boolean}
 */
export function isMatchOver(state) {
  if (!state || !state.players) return false;
  const seatIds = Object.keys(state.players);
  if (seatIds.length === 0) return false;
  return seatIds.every(id => isEliminated(state, id));
}

/**
 * Close the Battle and open the next Round: PhaseChanged('Battle' -> 'Preparation'), then the
 * ratified intra-Round ordering Income -> Shop draw -> Preparation State (05_ECONOMY_BIBLE.md).
 *
 * TODO [FOG] — the name of the phase that FOLLOWS a Combat is NON DOCUMENTÉ (04_COMBAT_BIBLE.md,
 * Concepts; owner: Core Rules). 'Preparation' is reused here because it is the only other
 * canonical phase name in the corpus (RO-2) — reusing an existing name, not coining a new one.
 *
 * E1 — THE GAME CAN NOW END HERE. If the battle that just played brought a Life to the floor,
 * no next Round is opened: the phase becomes 'Elimination' (PhaseChanged, existing Event kind),
 * and every later call is a no-op. Doing it HERE rather than in resolveBattle is deliberate —
 * the fatal battle must be watched to its end before the game-over screen replaces it.
 *
 * @param {Object} state - a state whose phase is 'Battle'
 * @returns {Object} new state in 'Preparation', round_index + 1, income credited, shop drawn —
 *   or in 'Elimination' when the Match is over
 */
export function startNextRound(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('state must be a valid game state');
  }

  // Already over: strictly nothing happens, not even a duplicate PhaseChanged.
  if (state.phase === PHASE_ELIMINATION) {
    return state;
  }

  if (isMatchOver(state)) {
    const eliminationLog = appendEvent(state.eventLog, {
      kind: 'PhaseChanged',
      from_phase: state.phase || 'Battle',
      to_phase: PHASE_ELIMINATION
    });
    return createGameState({
      seed: state.seed,
      rng_state: state.rng_state,
      eventLog: eliminationLog,
      players: state.players,
      entities: state.entities,
      phase: PHASE_ELIMINATION,
      pool: state.pool,
      bench_capacity: state.bench_capacity,
      round_index: state.round_index
    });
  }

  const newEventLog = appendEvent(state.eventLog, {
    kind: 'PhaseChanged',
    from_phase: state.phase || 'Battle',
    to_phase: 'Preparation'
  });

  const backToPreparation = createGameState({
    seed: state.seed,
    rng_state: state.rng_state,
    eventLog: newEventLog,
    players: state.players,
    entities: state.entities,
    phase: 'Preparation',
    pool: state.pool,
    bench_capacity: state.bench_capacity,
    round_index: state.round_index
  });

  return startRound(backToPreparation);
}

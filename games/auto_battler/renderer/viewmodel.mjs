// renderer/viewmodel.mjs - Folds the Event Log into a view model.
// R1/INV-5: THE RENDERER IS BLIND. Its ONLY input is the Event Log (+ the known initial
// conditions of a fresh Preparation window). It NEVER reads GameState, never imports engine/
// preparation/pool/shop/bench/merge/economy/board/round/input/app/web (deps_interdites,
// blueprint.yaml:362-373).

//
// ============================ INSUFFISANCE DE PAYLOAD — LA LIFE (E1/E2) =======================
// SIGNALÉE, PAS CONTOURNÉE. No Event of the CLOSED 22-kind registry carries a Seat's Life, nor
// the damage a lost Round costs it: `GoldChanged` has its {delta, new_gold} twin for Gold, Life
// has nothing. The registry is closed and inventing a 23rd name is a HumanGate decision, not a
// builder's — so this fold REBUILDS the Life from the journal instead:
//   Life(t) = LIFE_INITIAL - sum over every past `Victory` the viewer LOST of
//             computeLifeDamage(level at that moment, ranks of the winner's survivors)
// Every input of that computation IS in the journal: `Victory{winner_side_ref, resolution_kind,
// survivors[]}`, the `Spawn{side_ref, unit_definition_ref}` of the same `combat_ref`, and the
// `PlayerLevelUp` events that precede it. The FORMULA itself is not re-implemented here — it is
// the very function round/round.mjs applies (params.v0.mjs::computeLifeDamage), imported by
// reference, so the screen cannot drift from the engine.
// This is a reconstitution, not a fact read off a payload: it is the same shape of gap already
// documented for MergeResolved's consumed ids and for the round number (combat_view.mjs #3).
// PROPER FIX (owner: Core Rules / HumanGate): a 23rd Event kind `LifeChanged{seat_id, delta,
// new_life, source}` — see the builder report's ESCALATE_REQUEST.

import { LIFE_INITIAL, LIFE_FLOOR, computeLifeDamage, ghostLevelFor, boardCapacityForLevel } from '../params.v0.mjs';
import { getUnitRank } from '../content/units.v0.mjs';

// Known initial conditions (product_snapshot.md R1): gold 0, level 1, empty bench, empty
// board, empty shop, shop unlocked, phase 'Preparation'. E1 adds: life = LIFE_INITIAL.
function initialViewModel() {
  return {
    gold: 0,
    level: 1,
    life: LIFE_INITIAL,
    life_before_last_combat: LIFE_INITIAL, // what to show WHILE the last battle is still playing
    last_life_damage: 0,                   // what that battle cost, 0 on a win or a draw
    // Per-combat_ref spawn bookkeeping, needed to price a Victory. Not part of the drawn screen;
    // kept on the vm because the fold is a single left-to-right pass over the journal.
    _combats: {},
    shop: [],           // [unitDefId, ...]
    shop_locked: false,
    bench: [],           // [{unit_instance_id, unit_def_id, star}]
    board: [],           // [{unit_instance_id, unit_def_id, star, board_index}]
    phase: 'Preparation',
    merge_flashes: 0,    // count of MergeTriggered seen (R3: makes the image differ even
                          // when the resulting bench/board diff alone could be hard to see)
    last_merge: null,    // {unit_def_id, star} of the most recent MergeResolved
    events_seen: 0,
    unknown_events: []   // events this fold could NOT project (surfaced, never swallowed)
  };
}

function removeById(list, id) {
  return list.filter(u => u.unit_instance_id !== id);
}

/**
 * Fold one Event onto a view model. Pure: (vm, event) -> new vm. Every case corresponds to
 * an Event kind product_snapshot.md R3 requires to change the screen when it lands in the
 * journal (GoldChanged, PlayerLevelUp, ShopRolled, ShopLocked, UnitBought, UnitSold,
 * UnitPlaced, MergeTriggered, MergeResolved, PhaseChanged).
 */
function foldEvent(vm, ev) {
  switch (ev.kind) {
    case 'GoldChanged':
      return { ...vm, gold: ev.new_gold };

    case 'PlayerLevelUp':
      return { ...vm, level: ev.new_level };

    case 'ShopRolled':
      return { ...vm, shop: [...ev.shop_content] };

    case 'ShopLocked':
      return { ...vm, shop_locked: ev.locked };

    case 'UnitBought': {
      const bench = [...vm.bench, {
        unit_instance_id: ev.unit_instance_id,
        unit_def_id: ev.unit_definition,
        star: 1
      }];
      const shop = [...vm.shop];
      if (Number.isInteger(ev.shop_slot) && ev.shop_slot >= 0 && ev.shop_slot < shop.length) {
        shop.splice(ev.shop_slot, 1);
      }
      return { ...vm, bench, shop };
    }

    case 'UnitSold':
      // A unit only ever lives in one zone; removing by id from both is safe and avoids
      // trusting from_zone/from_index bookkeeping twice.
      return {
        ...vm,
        bench: removeById(vm.bench, ev.unit_instance),
        board: removeById(vm.board, ev.unit_instance)
      };

    case 'UnitPlaced': {
      const unit = vm.bench.find(u => u.unit_instance_id === ev.unit_instance_id)
        || vm.board.find(u => u.unit_instance_id === ev.unit_instance_id);
      if (!unit) {
        // Genuine journal gap: an Event referencing a unit this fold never saw created.
        return { ...vm, unknown_events: [...vm.unknown_events, ev] };
      }
      let bench = removeById(vm.bench, ev.unit_instance_id);
      let board = removeById(vm.board, ev.unit_instance_id);
      const carried = { unit_instance_id: unit.unit_instance_id, unit_def_id: unit.unit_def_id, star: unit.star };
      if (ev.to_zone === 'bench') {
        bench = [...bench, carried];
      } else if (ev.to_zone === 'board') {
        board = [...board, { ...carried, board_index: ev.to_index }];
      }
      return { ...vm, bench, board };
    }

    case 'MergeTriggered':
      return { ...vm, merge_flashes: vm.merge_flashes + 1 };

    case 'MergeResolved': {
      // GENUINE GAP (flagged in the builder report): MergeResolved carries the PRODUCED
      // unit and its destination, but never names the 3 CONSUMED unit_instance_ids.
      // Re-derive them by replaying merge/merge.mjs::detectMerge's OWN rule against this
      // fold's OWN reconstructed bench+board (never GameState): scan [...bench, ...board]
      // (that concatenation order, matching preparation.mjs's applyAutoMerge), group by
      // (unit_def_id, star), take the first 3 of the group matching
      // (ev.unit_def_id, ev.new_star - 1).
      const preStar = ev.new_star - 1;
      const combined = [...vm.bench, ...vm.board];
      const group = combined.filter(u => u.unit_def_id === ev.unit_def_id && u.star === preStar);
      const consumedIds = new Set(group.slice(0, 3).map(u => u.unit_instance_id));

      let bench = vm.bench.filter(u => !consumedIds.has(u.unit_instance_id));
      let board = vm.board.filter(u => !consumedIds.has(u.unit_instance_id));

      const produced = { unit_instance_id: ev.produced_unit_id, unit_def_id: ev.unit_def_id, star: ev.new_star };
      if (ev.to_zone === 'bench') {
        bench = [...bench, produced];
      } else if (ev.to_zone === 'board') {
        board = [...board, { ...produced, board_index: ev.to_index }];
      }

      return { ...vm, bench, board, last_merge: { unit_def_id: ev.unit_def_id, star: ev.new_star } };
    }

    case 'PhaseChanged':
      return { ...vm, phase: ev.to_phase };

    // ------------------------------------------------------------------ E1/E2 — Life rebuild
    case 'Spawn': {
      // Remember, per combat, who the viewer is (FIRST side_ref spawned — the same convention
      // combat_view.mjs documents as insufficiency #1) and what each unit's definition is, so
      // that a later Victory can be priced without ever asking the engine.
      const ref = ev.combat_ref;
      if (typeof ref !== 'string') return vm;
      const prev = vm._combats[ref] || { viewer_side_ref: ev.side_ref, defs: {} };
      return {
        ...vm,
        _combats: {
          ...vm._combats,
          [ref]: {
            viewer_side_ref: prev.viewer_side_ref,
            defs: { ...prev.defs, [ev.unit_instance_id]: ev.unit_definition_ref }
          }
        }
      };
    }

    case 'Victory': {
      const combat = vm._combats[ev.combat_ref];
      if (!combat) {
        // A Victory whose Spawns are not in this journal: the damage cannot be priced and is
        // NOT guessed at. Surfaced, never swallowed.
        return { ...vm, unknown_events: [...vm.unknown_events, ev] };
      }
      // QB-6, ratified verbatim: a draw costs NO Life. A win costs none either (the ghost is
      // not a Seat and has no Life — round/round.mjs).
      const viewerLost = ev.resolution_kind !== 'draw'
        && ev.winner_side_ref !== null
        && ev.winner_side_ref !== combat.viewer_side_ref;
      if (!viewerLost) {
        return { ...vm, life_before_last_combat: vm.life, last_life_damage: 0 };
      }
      const survivors = Array.isArray(ev.survivors) ? ev.survivors : [];
      const ranks = survivors.map(s => getUnitRank(combat.defs[s.unit_instance_id]));
      const damage = computeLifeDamage(ghostLevelFor(vm.level), ranks);
      return {
        ...vm,
        life_before_last_combat: vm.life,
        last_life_damage: damage,
        life: Math.max(LIFE_FLOOR, vm.life - damage)
      };
    }

    default:
      // The remaining combat-scope events (Move, Attack, Damage, Death, ...) belong to the
      // combat ANIMATION, folded by renderer/combat_view.mjs against the same journal — not to
      // this screen's plates. Silently not-projecting them here is correct, not a gap.
      return vm;
  }
}

/**
 * Fold the full Event Log into a view model. The renderer's ONLY entry point into the
 * game's history — never a GameState object.
 * @param {Array} eventLog
 * @returns {Object} view model
 */
export function buildViewModel(eventLog) {
  const log = Array.isArray(eventLog) ? eventLog : [];
  let vm = initialViewModel();
  for (const ev of log) {
    vm = foldEvent(vm, ev);
  }
  return {
    ...vm,
    events_seen: log.length,
    // E4: the placement limit is a pure function of the Level, which IS in the journal
    // (PlayerLevelUp). Nothing to reconstitute here — the same function preparation/ enforces.
    board_capacity: boardCapacityForLevel(vm.level),
    board_used: vm.board.length,
    eliminated: vm.phase === 'Elimination'
  };
}

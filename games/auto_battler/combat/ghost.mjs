// combat/ghost.mjs - The opponent, PROVISOIRE — this is NOT the pairing system.
//
// ============================== WHAT THIS IS, AND WHAT IT IS NOT ==============================
// Pairing is DP-3 (03_DECISION_BIBLE.md): "le Combat reçoit deux snapshots, il ne choisit jamais
// ses adversaires" (04_COMBAT_BIBLE.md, Objectif). DP-3 is NOT IMPLEMENTED — there is no second
// Seat, no lobby, no GhostBoard bank, and `PairingResolved` has no specified payload
// (COMBAT_EVENT_FIELDS.md §6.6, NON DOCUMENTÉ).
//
// This module exists ONLY so that the loop can close: it fabricates an opposing army
// deterministically from (seed, round_index) so the player has someone to fight tonight.
// It is a PLACEHOLDER awaiting real pairing, and must not be described as the pairing system.
// TODO [FOG] — real pairing, GhostBoard selection, `PairingResolved` payload. Owner: Decision
// Bible. CBT-8 already guarantees the pipeline cannot tell this army from a real one.
//
// ============================== HOW "COMPARABLE POWER" IS OBTAINED ============================
// No power budget is invented, because no bible defines one (`total_remaining_power` itself is
// an unwritten Balance function — see combat.mjs, DP-7). Instead comparability is obtained by
// CONSTRUCTION: the opposing army has
//   * the SAME NUMBER of units as the player's army,
//   * the SAME RANK for each of them (rank is the ratified cost axis: rank === Buy cost),
//   * the SAME STAR for each of them (E3, s9-build commande E — see below),
//   * MIRRORED cells (the very 'mirror' orientation Preparation already enforces).
//
// E3 — WHY THE STAR IS NOW MIRRORED TOO. Until this pass the ghost was hard-coded to `star: 1`
// with the comment "no Star scaling exists, so ★1 is not a nerf". Star scaling now EXISTS
// (combat/army.mjs, params.v0.mjs): keeping the ghost at ★1 while the player fields ★2s would
// turn the placeholder opponent into free wins the moment a merge lands. The mirror is therefore
// extended to the Star, exactly as it already covers count, rank and cell — comparability by
// construction, still no power budget invented.
// Only the unit DEFINITION differs: within each rank, one of the three units of that rank is
// picked deterministically. So the two armies cost the same and are placed symmetrically, while
// still fighting differently — which is what makes the fight worth watching.
//
// Determinism (INV-19): the stream is derived from (seed, round_index) by advancing the shared
// mulberry32 generator round_index+1 times. It NEVER touches `state.rng_state`, so watching a
// combat cannot shift the shop draws of the rest of the match.

import { seedRng, nextRng } from '../engine/rng.mjs';
import { getUnitDef, getUnitDefsOfRank } from '../content/units.v0.mjs';
import { mirrorCell } from './cell.mjs';
import { starAttack, starHealth } from '../params.v0.mjs';

/**
 * A dedicated deterministic stream for opponent generation.
 * @param {number} seed - the match seed
 * @param {number} roundIndex
 * @returns {number} an rng_state, function of (seed, roundIndex) only
 */
function ghostStream(seed, roundIndex) {
  let s = seedRng(seed);
  const steps = Math.max(0, roundIndex) + 1;
  for (let i = 0; i < steps; i++) {
    s = nextRng(s).rng_state;
  }
  return s;
}

/**
 * Build the opposing side facing the player's board.
 * @param {string} sideRef - e.g. 'ghost_of_seat_0'
 * @param {Array} playerBoardUnits - state.players[seatId].board
 * @param {number} seed - match seed
 * @param {number} roundIndex
 * @returns {{side_ref: string, units: Object[]}} empty when the player placed nothing (the
 *   combat then resolves as a draw at Tick 1 — both camps empty, QB-6)
 */
export function buildGhostSide(sideRef, playerBoardUnits, seed, roundIndex) {
  const source = (Array.isArray(playerBoardUnits) ? playerBoardUnits : [])
    .filter(u => u && Number.isInteger(u.board_index))
    .slice()
    // Deterministic iteration order regardless of how the Board array happens to be ordered.
    .sort((a, b) => a.board_index - b.board_index);

  let rng = ghostStream(seed, roundIndex);
  const units = [];

  source.forEach((playerUnit, i) => {
    const playerDef = getUnitDef(playerUnit.unit_def_id);
    if (!playerDef) return;
    const cell = mirrorCell(playerUnit.board_index);
    if (cell < 0) return;

    const sameRank = getUnitDefsOfRank(playerDef.rank);
    if (sameRank.length === 0) return;
    const draw = nextRng(rng);
    rng = draw.rng_state;
    const def = sameRank[draw.value % sameRank.length];

    // E3: the Star is mirrored from the player's own unit — see the header. A player unit with
    // no `star` field is read as ★1, the same default combat/army.mjs applies.
    const star = playerUnit.star || 1;

    units.push({
      unit_instance_id: `ghost_${roundIndex}_${i}`,
      unit_definition_ref: def.id,
      star,
      rank: def.rank, // not a combat stat — the Round Resolution needs it (E2), see army.mjs
      cell,
      health: starHealth(def.hp, star),
      attack: starAttack(def.attack, star),
      attack_cadence: def.attack_cadence,
      range: def.range,
      move_speed: def.move_speed,
      delivery: def.delivery,
      // G1/G2: the ghost fields REAL units of the same rank, so it carries their real tribe and
      // their real keywords — otherwise the placeholder opponent would be a strictly keyword-less
      // army, i.e. free wins the moment the player buys a Provocation. Comparability by
      // construction, still no power budget invented (see the header).
      tribe: def.tribe || null,
      keywords: Array.isArray(def.keywords) ? def.keywords : []
    });
  });

  return { side_ref: sideRef, units };
}

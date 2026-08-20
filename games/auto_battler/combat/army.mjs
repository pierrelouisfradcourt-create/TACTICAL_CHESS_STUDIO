// combat/army.mjs - Materialises a Board into a CombatSide snapshot.
//
// This is the ONLY place where content stats (content/units.v0.mjs) enter the Combat: the
// TickPipeline itself (combat/combat.mjs) receives fully-resolved numbers and never looks up a
// UnitDefinition. That split is what keeps combat.mjs content-agnostic and CBT-6-clean.
//
// It reads a Board — a plain list of `{unit_instance_id, unit_def_id, star, board_index}` — and
// nothing else. No Gold, no Bench, no Pool, no Shop, no Level (CBT-6).
//
// E3 (s9-build commande E) — STAR SCALING. The TODO [FOG] that stood here is RESOLVED: the
// multipliers are now ratified v0 values sourced from TFT (params.v0.mjs, STAR_ATTACK_MULTIPLIER /
// STAR_HEALTH_MULTIPLIER) — a ★2 has 150% attack / 180% health, a ★3 225% / 324%. Until this
// pass, `star` was carried into the snapshot and multiplied NOTHING: three ★1 bodies merged into
// one ★2 body was a strict LOSS of army for the player. It is now a gain, and that is asserted
// by a test on the EFFECT (properties.i25.test.mjs), not by this comment.
//
// `rank` is also carried into the snapshot (it was not before). It is not a combat stat — the
// TickPipeline never reads it — but the Round Resolution needs the rank of each SURVIVOR to
// compute the Life damage (E2), and round/round.mjs must stay content-agnostic (P11: the engine
// only ever sees the opaque unit_def_id). Resolving it HERE, in the one module that is already
// allowed to read content/, is what keeps that separation intact.

import { getUnitDef } from '../content/units.v0.mjs';
import { starAttack, starHealth } from '../params.v0.mjs';

/**
 * @param {Object} boardUnit - {unit_instance_id, unit_def_id, star, board_index}
 * @returns {Object|null} a CombatUnitSnapshot, or null when the definition is unknown (an
 *   unknown definition is dropped rather than defaulted: fabricating stats for it would put an
 *   invented unit on the battlefield).
 */
function toSnapshot(boardUnit) {
  const def = getUnitDef(boardUnit.unit_def_id);
  if (!def) return null;
  const star = boardUnit.star || 1;
  return {
    unit_instance_id: boardUnit.unit_instance_id,
    unit_definition_ref: boardUnit.unit_def_id,
    star,
    rank: def.rank,
    cell: boardUnit.board_index,
    health: starHealth(def.hp, star),
    attack: starAttack(def.attack, star),
    attack_cadence: def.attack_cadence,
    range: def.range,
    move_speed: def.move_speed,
    delivery: def.delivery,
    // G1/G2 (commande G): the tribe and the keyword list are CARRIED, never interpreted here.
    // They are the last piece of content that enters the Combat, and they enter through this one
    // door like every stat above. combat/combat.mjs reads `keywords[].id` against the closed
    // vocabulary of combat/keywords.mjs and compares `tribe` strings — it never looks a unit up.
    // NOT multiplied by the Star: no source gives a Star scaling for a keyword's amounts (a ★2
    // Templier boosts its tribe by exactly what a ★1 does), and inventing one is forbidden.
    // TODO [FOG] — Star scaling of keyword amounts. Owner: Balance Bible.
    tribe: def.tribe || null,
    keywords: Array.isArray(def.keywords) ? def.keywords : []
  };
}

/**
 * Build the player's side from their Board.
 * @param {string} sideRef - e.g. 'seat_0'
 * @param {Array} boardUnits - state.players[seatId].board
 * @returns {{side_ref: string, units: Object[]}}
 */
export function buildPlayerSide(sideRef, boardUnits) {
  const list = Array.isArray(boardUnits) ? boardUnits : [];
  const units = list
    .filter(u => u && Number.isInteger(u.board_index))
    .map(toSnapshot)
    .filter(Boolean);
  return { side_ref: sideRef, units };
}

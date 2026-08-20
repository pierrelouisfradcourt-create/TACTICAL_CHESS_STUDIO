// combat/tiebreak.mjs - THE TieBreakChain (QD-1), applied — never redefined.
//
// The chain is OWNED by 03_DECISION_BIBLE.md (DEC-4, canonical order ratified HumanGate
// 2026-07-18, QD-1). This module APPLIES it, in one place, for every ex aequo of the Combat
// (CBT-4 / DP-1(b) / DP-6.1 / DP-6.3 / DP-6.4 / DP-7). Canonical keys, in order:
//
//   1. décision stratégique déclarée  — the gameplay preference declared by the acting unit's
//                                       DSL data.  *** NOT AVAILABLE in this pass ***: no DSL
//                                       content exists (no criteria vocabulary is implemented),
//                                       so this key is EMPTY, never guessed. TODO [FOG],
//                                       owner: DSL Bible + Content Bible.
//   2. priorité de règle              — the priority the owning rule attaches to candidates.
//                                       Supplied per call site as `rulePriority` (a lower
//                                       number wins); the call site documents what it means.
//   3. distance Manhattan             — contextual sense per usage, fixed by 04_COMBAT_BIBLE.md
//                                       (Concepts, "Distances en Combat"): the caller passes the
//                                       already-measured distance, this module never guesses
//                                       which two cells to measure between.
//   4. initiative de création         — earliest entry into play wins. Materialised by
//                                       `spawn_order`, assigned once at C1 in spawn emission
//                                       order and never reused.
//   5. unit_instance_id (ascending)   — LAST RESORT, guarantees uniqueness, carries no strategy.
//   6. seat_index / side_index (asc.) — separates otherwise totally identical cases.
//
// Ratified principle (QD-1): a tie-break may use technical identity to GUARANTEE UNIQUENESS,
// never to create a hidden strategy. Consequence: `rng_state` is never consulted (CBT-9), and
// the chain is TOTAL — keys 5 and 6 together always decide.

/**
 * A tie-break candidate. Every field is optional except the last-resort identity keys.
 * @typedef {Object} TieBreakCandidate
 * @property {number} [strategic]     key 1 — declared strategic preference (lower wins). Leave
 *                                    undefined while no DSL exists; do NOT substitute a default.
 * @property {number} [rulePriority]  key 2 — owning rule's priority (lower wins)
 * @property {number} [distance]      key 3 — Manhattan distance, already measured by the caller
 * @property {number} [spawnOrder]    key 4 — creation initiative (lower = created earlier)
 * @property {string} unitInstanceId  key 5 — last-resort identity
 * @property {number} sideIndex       key 6 — seat / side index
 */

function cmpNumber(a, b) {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;  // a candidate without the key never wins on it
  if (b === undefined) return -1;
  return a - b;
}

/**
 * Compare two candidates by the canonical chain. Returns < 0 if `a` wins.
 * TOTAL: two distinct candidates never compare equal, because key 5 (unit_instance_id) is
 * unique by construction — an equality would mean the same UnitInstance twice.
 * @param {TieBreakCandidate} a
 * @param {TieBreakCandidate} b
 * @returns {number}
 */
export function compareCandidates(a, b) {
  let c = cmpNumber(a.strategic, b.strategic);      // key 1 (empty in this pass — see header)
  if (c !== 0) return c;
  c = cmpNumber(a.rulePriority, b.rulePriority);    // key 2
  if (c !== 0) return c;
  c = cmpNumber(a.distance, b.distance);            // key 3
  if (c !== 0) return c;
  c = cmpNumber(a.spawnOrder, b.spawnOrder);        // key 4
  if (c !== 0) return c;
  if (a.unitInstanceId !== b.unitInstanceId) {      // key 5
    return a.unitInstanceId < b.unitInstanceId ? -1 : 1;
  }
  return cmpNumber(a.sideIndex, b.sideIndex);       // key 6
}

/**
 * Sort a list of candidates by the chain. Returns a NEW array (never sorts in place: the caller
 * usually still needs its own iteration order).
 * @param {TieBreakCandidate[]} candidates
 * @returns {TieBreakCandidate[]}
 */
export function sortByChain(candidates) {
  return [...candidates].sort(compareCandidates);
}

/**
 * The single winner of a set of candidates. Never returns undefined for a non-empty input, and
 * never consumes randomness (CBT-9).
 * @param {TieBreakCandidate[]} candidates
 * @returns {TieBreakCandidate|null}
 */
export function pickWinner(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (compareCandidates(candidates[i], best) < 0) best = candidates[i];
  }
  return best;
}

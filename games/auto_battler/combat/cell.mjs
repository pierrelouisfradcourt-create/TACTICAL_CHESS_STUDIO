// combat/cell.mjs - Cell encoding for Combat. PURE geometry, no game state.
//
// ============================ THE ENCODING DECISION (D2, tranchée) ============================
// `COMBAT_EVENT_FIELDS.md` §6.3 flags this as NON DOCUMENTÉ and potentially contradictory:
// 04_COMBAT_BIBLE.md (QB-1) describes a Cell as integer coordinates `(x, y)` with a MANHATTAN
// distance, while the shipped Preparation code addresses the board with a LINEAR `board_index`
// (`preparation.mjs`, `UnitPlaced.to_index`, `layout/layout.mjs::cellRect`).
//
// Resolution, per dispatch: the LINEAR INDEX stays the representation — it is what the Event
// Log already carries, what layout/ already draws from, and what input/ already produces from a
// click. `(x, y)` is DERIVED from it whenever a distance is needed:
//     x = i % BOARD_WIDTH        y = Math.floor(i / BOARD_WIDTH)
// Both halves of the divergence are therefore honoured: the code keeps one address space, the
// bible keeps its metric. No Event field changes shape.
//
// Manhattan is the SINGLE metric (ratified gate #3, QB-2): Range, movement and tie-break key 3
// all read the same function below. No diagonal shortcut exists anywhere (QB-1).

import { BOARD_WIDTH, BOARD_HEIGHT } from '../params.v0.mjs';

export const CELL_COUNT = BOARD_WIDTH * BOARD_HEIGHT;

/**
 * @param {number} index
 * @returns {boolean}
 */
export function isValidCell(index) {
  return Number.isInteger(index) && index >= 0 && index < CELL_COUNT;
}

/**
 * Linear index -> derived (x, y). The derivation the bible's geometry is expressed in.
 * @param {number} index
 * @returns {{x:number, y:number}}
 */
export function toXY(index) {
  return { x: index % BOARD_WIDTH, y: Math.floor(index / BOARD_WIDTH) };
}

/**
 * (x, y) -> linear index. Inverse of toXY for every valid pair.
 * @param {number} x
 * @param {number} y
 * @returns {number} -1 when (x, y) is off the grid
 */
export function fromXY(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return -1;
  if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return -1;
  return y * BOARD_WIDTH + x;
}

/**
 * Manhattan distance between two cells — the ONE metric of Combat (QB-2).
 * @param {number} a - cell index
 * @param {number} b - cell index
 * @returns {number}
 */
export function manhattan(a, b) {
  const pa = toXY(a);
  const pb = toXY(b);
  return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
}

/**
 * Mirror a cell across the horizontal midline — the same 'mirror' orientation
 * board/board.mjs::isInPlayerHalf enforces during Preparation (BOARD_ORIENTATION, R11/RO-4).
 * Used to seat the opposing army facing the player's own, so that a placement in the player's
 * half always has a well-defined counterpart in the other half.
 * @param {number} index
 * @returns {number} -1 if index is not a valid cell
 */
export function mirrorCell(index) {
  if (!isValidCell(index)) return -1;
  const { x, y } = toXY(index);
  return fromXY(x, BOARD_HEIGHT - 1 - y);
}

/**
 * Every cell within Manhattan distance <= radius of `from` (excluding `from` itself),
 * in ASCENDING INDEX ORDER — a deterministic enumeration, so that any caller iterating it
 * makes the same choice on every machine (INV-19).
 * @param {number} from - cell index
 * @param {number} radius - Manhattan radius (>= 0)
 * @returns {number[]}
 */
export function cellsWithin(from, radius) {
  const out = [];
  if (!isValidCell(from) || !Number.isInteger(radius) || radius <= 0) return out;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (i === from) continue;
    if (manhattan(from, i) <= radius) out.push(i);
  }
  return out;
}

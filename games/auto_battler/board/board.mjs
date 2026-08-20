// board/board.mjs - Addressable board grid logic
// 8×8 plateau with unit placement, removal, and movement (RO-4)

import { BOARD_WIDTH, BOARD_HEIGHT, BOARD_ORIENTATION } from '../params.v0.mjs';

/**
 * Check if an index is valid for the board grid.
 * Index = row * BOARD_WIDTH + col, where row ∈ [0, BOARD_HEIGHT) and col ∈ [0, BOARD_WIDTH).
 * @param {number} index - board cell index
 * @returns {boolean}
 */
export function isValidIndex(index) {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    return false;
  }
  const totalCells = BOARD_WIDTH * BOARD_HEIGHT;
  return index >= 0 && index < totalCells;
}

/**
 * Parse the numeric seat index out of a seatId like 'player_0' -> 0. Fixture-only convention
 * (input/gestures.mjs, preparation.mjs, round.mjs all use 'player_N' seat ids). Unparseable
 * ids default to seat 0 rather than throwing — callers that hit this path already validated
 * seatId is a real player key in state.players.
 * @param {string} seatId
 * @returns {number}
 */
function seatIndexOf(seatId) {
  const m = /^player_(\d+)$/.exec(typeof seatId === 'string' ? seatId : '');
  return m ? Number(m[1]) : 0;
}

/**
 * C1 (s9-build playtest fix): is `index` inside `seatId`'s own half of the board?
 * BOARD_ORIENTATION === 'mirror' (params.v0.mjs, R11/RO-4 ratified HumanGate 2026-07-19):
 * the grid splits into two symmetric halves along its rows. Even seat indices (0, 2, ...)
 * own the BOTTOM half (row >= BOARD_HEIGHT / 2); odd seat indices (1, 3, ...) own the TOP
 * half (row < BOARD_HEIGHT / 2) — a mirror across the horizontal midline.
 * Any orientation other than 'mirror' is unrestricted (returns true for every valid index) —
 * there is currently no other ratified orientation, so this is future-proofing, not a
 * silent bypass of the one orientation actually in force.
 * @param {number} index - board cell index
 * @param {string} seatId - e.g. 'player_0'
 * @returns {boolean}
 */
export function isInPlayerHalf(index, seatId) {
  if (!isValidIndex(index)) {
    return false;
  }
  if (BOARD_ORIENTATION !== 'mirror') {
    return true;
  }
  const halfRow = BOARD_HEIGHT / 2;
  const row = Math.floor(index / BOARD_WIDTH);
  const seatIndex = seatIndexOf(seatId);
  const ownsBottomHalf = seatIndex % 2 === 0;
  return ownsBottomHalf ? row >= halfRow : row < halfRow;
}

/**
 * Check if a cell is free (no unit occupying it).
 * @param {Array} board - board state (array of UnitInstances with board_index)
 * @param {number} index - cell index to check
 * @returns {boolean} true if cell is free
 */
export function isCellFree(board, index) {
  if (!Array.isArray(board)) {
    return true; // Empty board = all cells free
  }
  return !board.some(unit => unit && unit.board_index === index);
}

/**
 * Place a unit on the board at a specific index.
 * @param {Array} board - current board state
 * @param {Object} unit - unit instance with board_index to be set
 * @param {number} index - destination index
 * @returns {Object} {ok: boolean, newBoard?: Array, error?: string}
 */
export function placeOnBoard(board, unit, index) {
  if (!isValidIndex(index)) {
    return { ok: false, error: `Invalid board index: ${index}` };
  }
  if (!isCellFree(board, index)) {
    return { ok: false, error: `Cell ${index} is occupied` };
  }
  if (!unit || typeof unit !== 'object') {
    return { ok: false, error: 'Unit must be an object' };
  }

  // Place unit with board_index set
  const newUnit = { ...unit, board_index: index };
  const newBoard = Array.isArray(board) ? [...board, newUnit] : [newUnit];

  return { ok: true, newBoard };
}

/**
 * Remove a unit from the board by its unit_instance_id.
 * @param {Array} board - current board state
 * @param {string} unit_instance_id - ID of unit to remove
 * @returns {Object} {ok: boolean, newBoard?: Array, removedUnit?: Object, error?: string}
 */
export function removeFromBoard(board, unit_instance_id) {
  if (!Array.isArray(board)) {
    return { ok: false, error: 'Board must be an array' };
  }
  if (typeof unit_instance_id !== 'string') {
    return { ok: false, error: 'unit_instance_id must be a string' };
  }

  const index = board.findIndex(u => u && u.unit_instance_id === unit_instance_id);
  if (index === -1) {
    return { ok: false, error: `Unit ${unit_instance_id} not found on board` };
  }

  const removedUnit = board[index];
  const newBoard = [...board.slice(0, index), ...board.slice(index + 1)];

  return { ok: true, newBoard, removedUnit };
}

/**
 * Move a unit on the board from one index to another.
 * @param {Array} board - current board state
 * @param {string} unit_instance_id - ID of unit to move
 * @param {number} toIndex - destination index
 * @returns {Object} {ok: boolean, newBoard?: Array, error?: string}
 */
export function moveOnBoard(board, unit_instance_id, toIndex) {
  if (!isValidIndex(toIndex)) {
    return { ok: false, error: `Invalid destination index: ${toIndex}` };
  }
  if (!isCellFree(board, toIndex)) {
    return { ok: false, error: `Cell ${toIndex} is occupied` };
  }

  // Remove unit from current position
  const removeResult = removeFromBoard(board, unit_instance_id);
  if (!removeResult.ok) {
    return removeResult;
  }

  const unit = removeResult.removedUnit;
  const boardAfterRemoval = removeResult.newBoard;

  // Place at new index
  const placeResult = placeOnBoard(boardAfterRemoval, unit, toIndex);
  return placeResult;
}

/**
 * Find a unit on the board by its unit_instance_id.
 * @param {Array} board - board state
 * @param {string} unit_instance_id - ID to search for
 * @returns {Object|null} unit object or null if not found
 */
export function findOnBoard(board, unit_instance_id) {
  if (!Array.isArray(board)) {
    return null;
  }
  const unit = board.find(u => u && u.unit_instance_id === unit_instance_id);
  return unit || null;
}

/**
 * Get the board_index of a unit on the board.
 * @param {Array} board - board state
 * @param {string} unit_instance_id - ID to search for
 * @returns {number|null} index or null if not found
 */
export function getBoardIndex(board, unit_instance_id) {
  const unit = findOnBoard(board, unit_instance_id);
  return unit ? unit.board_index : null;
}

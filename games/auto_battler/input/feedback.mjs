// input/feedback.mjs - Writes refusal messages into its OWN DOM element (#feedback), and
// nowhere the renderer can reach. R14: "le retour de refus est écrit par input/feedback.mjs
// et par personne d'autre ; il n'existe aucun Event de rejet ... et le renderer ne le dessine
// jamais." (blueprint.yaml). Two REAL documented refusal causes only (product_snapshot.md R7:
// or insuffisant, banc plein) — Place's "case occupée" is a real engine rejection path too
// (handlePlace, preparation.mjs) but is NOT one of the two R7-documented causes, so its
// message stays generic rather than claiming a cause the bible never ratified.
//
// C1 (s9-build playtest fix): Place's "hors de votre zone" refusal (own-half restriction,
// BOARD_ORIENTATION='mirror') IS a documented, player-visible cause (the whole point of the
// fix is that this refusal be VISIBLE), so it gets its own message ahead of the generic
// "case occupée" fallback.

import { BOARD_WIDTH, BOARD_HEIGHT, BOARD_ORIENTATION, boardCapacityForLevel } from '../params.v0.mjs';

/**
 * DP-9 bench-full check, read straight off the pre-input state (input/ is allowed to see
 * state — R1 restricts the RENDERER, not this layer). Mirrors preparation.mjs's own check
 * (l.170) without importing bench/bench.mjs, which input/ is forbidden to do directly
 * (deps_interdites: [input, bench] — everything must pass through preparation/).
 */
function benchIsFull(state, seatId) {
  const player = state.players[seatId];
  if (!player) return false;
  return player.bench.length >= state.bench_capacity;
}

/**
 * Mirrors board.mjs::isInPlayerHalf (C1) without importing board/board.mjs, which input/ is
 * forbidden to do directly (deps_interdites: [input, board], blueprint.yaml — everything
 * must pass through preparation/). Same geometry, same seat-index parity rule.
 */
function isOutOfPlayerHalf(index, seatId) {
  if (BOARD_ORIENTATION !== 'mirror') return false;
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_WIDTH * BOARD_HEIGHT) return false;
  const halfRow = BOARD_HEIGHT / 2;
  const row = Math.floor(index / BOARD_WIDTH);
  const m = /^player_(\d+)$/.exec(typeof seatId === 'string' ? seatId : '');
  const seatIndex = m ? Number(m[1]) : 0;
  const ownsBottomHalf = seatIndex % 2 === 0;
  const inOwnHalf = ownsBottomHalf ? row >= halfRow : row < halfRow;
  return !inOwnHalf;
}

/**
 * E4 (s9-build commande E): the board is at its level cap. Mirrors preparation.mjs::handlePlace
 * (same boardCapacityForLevel call, same "only a move that ADDS a unit counts" condition), read
 * off the pre-input state — input/ is allowed to see state, R1 restricts the RENDERER.
 */
function boardIsFull(beforeState, input, seatId) {
  const player = beforeState.players[seatId];
  if (!player) return false;
  if (input.to_zone !== 'board') return false;
  // A board->board reposition is never refused for capacity: the count does not change.
  const comesFromBoard = player.board.some(u => u && u.unit_instance_id === input.unit_instance_id);
  if (comesFromBoard) return false;
  return player.board.length >= boardCapacityForLevel(player.level || 1);
}

function messageFor(beforeState, input, seatId) {
  switch (input.kind) {
    case 'Buy':
      // handleBuy checks Bench-full (DP-9, preparation.mjs:170) BEFORE Gold (:190) — reading
      // the same order here names the real cause without duplicating the per-unit cost
      // fixture (which isn't exported by preparation.mjs).
      return benchIsFull(beforeState, seatId)
        ? 'Banc plein — vendez une unité.'
        : 'Or insuffisant — achat impossible.';
    case 'Reroll':
      return 'Or insuffisant — rafraîchissement impossible.';
    case 'LevelUp':
      return 'Or insuffisant — niveau hors de portée.';
    case 'Place':
      // handlePlace checks the board index (isValidIndex), THEN the own-half zone
      // (isInPlayerHalf, C1), THEN the level capacity (E4), THEN cell occupancy — same order
      // here. Zone and capacity only apply to to_zone==='board': a refused bench-target Place
      // (e.g. already on bench) is neither a zone nor a capacity violation.
      if (input.to_zone === 'board' && isOutOfPlayerHalf(input.to_index, seatId)) {
        return 'Hors de votre zone — placez vos unités dans votre moitié du plateau.';
      }
      if (boardIsFull(beforeState, input, seatId)) {
        return 'Plateau plein — montez de niveau.';
      }
      return 'Case occupée — choisissez un autre emplacement.';
    case 'Sell':
      return 'Impossible de vendre cette unité.';
    default:
      return 'Action refusée.';
  }
}

/**
 * @param {Document} doc
 * @param {Object} beforeState - state BEFORE the refused input (still has the answer to "why")
 * @param {Object} input - the refused input
 * @param {string} seatId
 */
export function showRefusal(doc, beforeState, input, seatId) {
  const el = doc.getElementById('feedback');
  if (!el) return;
  el.textContent = messageFor(beforeState, input, seatId);
  el.classList.add('is-refusal');
}

export function clearFeedback(doc) {
  const el = doc.getElementById('feedback');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('is-refusal');
}

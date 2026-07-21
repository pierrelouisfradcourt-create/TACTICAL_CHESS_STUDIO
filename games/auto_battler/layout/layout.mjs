// layout/layout.mjs - Pure screen geometry: pixel <-> board-cell conversion.
// PURE: no game state, no Event Log, no engine/logic import whatsoever (deps_interdites:
// layout -> engine|pool|shop|bench|merge|economy|board|preparation|round|renderer|input|app|web).
// Exists so renderer/ (draws cells) and input/ (resolves a click into a cell) share EXACTLY
// the same geometry instead of duplicating it and drifting apart (same motif as ECO-2 "une
// seule table lue par l'affichage et par le tirage", product_snapshot.md).

import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CANVAS_SIZE_PX,
  BOARD_MARGIN_PX,
  TIMER_RING_THICKNESS_PX
} from '../params.v0.mjs';

export function canvasSize() {
  return CANVAS_SIZE_PX;
}

export function ringThickness() {
  return TIMER_RING_THICKNESS_PX;
}

// The playable 8x8 grid sits inside the canvas, inset by BOARD_MARGIN_PX on every side —
// that margin is where the consuming chronometer ring lives (direction artistique: "le
// chronomètre EST le cadre").
function boardArea() {
  const size = CANVAS_SIZE_PX - 2 * BOARD_MARGIN_PX;
  return { x: BOARD_MARGIN_PX, y: BOARD_MARGIN_PX, size };
}

function cellPx() {
  const { size } = boardArea();
  return size / BOARD_WIDTH; // BOARD_WIDTH === BOARD_HEIGHT (8x8 miroir, R11 ratifié)
}

/**
 * Cell index -> pixel rectangle {x, y, w, h} in canvas-local coordinates.
 * index = row * BOARD_WIDTH + col, matching board/board.mjs::isValidIndex exactly.
 * @param {number} index
 * @returns {{x:number,y:number,w:number,h:number}|null} null if index is out of range
 */
export function cellRect(index) {
  const total = BOARD_WIDTH * BOARD_HEIGHT;
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    return null;
  }
  const { x: ox, y: oy } = boardArea();
  const c = cellPx();
  const col = index % BOARD_WIDTH;
  const row = Math.floor(index / BOARD_WIDTH);
  return { x: ox + col * c, y: oy + row * c, w: c, h: c };
}

/**
 * Pixel point (canvas-local coordinates) -> board cell index, or -1 if outside the grid.
 * @param {number} px
 * @param {number} py
 * @returns {number}
 */
export function pointToCellIndex(px, py) {
  const { x: ox, y: oy, size } = boardArea();
  if (px < ox || py < oy || px >= ox + size || py >= oy + size) {
    return -1;
  }
  const c = cellPx();
  const col = Math.floor((px - ox) / c);
  const row = Math.floor((py - oy) / c);
  const idx = row * BOARD_WIDTH + col;
  return idx >= 0 && idx < BOARD_WIDTH * BOARD_HEIGHT ? idx : -1;
}

/**
 * Geometry of the consuming chronometer ring: a square frame around the canvas, inset by
 * half the stroke thickness so the stroke sits centered on the outer border.
 * @returns {{x:number,y:number,size:number}}
 */
export function ringRect() {
  const inset = TIMER_RING_THICKNESS_PX / 2;
  return {
    x: inset,
    y: inset,
    size: CANVAS_SIZE_PX - 2 * inset
  };
}

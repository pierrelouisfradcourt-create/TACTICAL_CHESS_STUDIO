// renderer/render_canvas.mjs - Canvas surface (R8): 8x8 board, placed units, and the
// signature consuming chronometer ring. Pure function of (viewModel, frameCounter[, debug]).
// No GameState, no wall-clock read, no Math.random, no Date, no performance.now (R2).

import { cellRect, ringRect, canvasSize, ringThickness } from '../layout/layout.mjs';
import { TIMER_DURATION, BOARD_WIDTH, BOARD_HEIGHT, BOARD_ORIENTATION } from '../params.v0.mjs';
import { getUnitDef, KEYWORDS } from '../content/units.v0.mjs';

// Palette (product_snapshot.md, Direction artistique — R12: no oracle, builder judgment).
const COLOR_FELT = '#16302B';
const COLOR_BRASS = '#B98A3C';
const COLOR_PARCHMENT = '#E8DFC8';
const COLOR_STONE = '#3E5C55';
const COLOR_ALARM = '#C8442F';

const RING_ALARM_FRACTION = 0.8; // last 20% of the window: ring turns alarm red (palette rule)

// C1 (s9-build playtest fix): the enemy half must read as visibly OFF-LIMITS, not just be
// mechanically refused (board/board.mjs::isInPlayerHalf). This single-seat screen's zone is
// fixed (player_0 owns the bottom half under BOARD_ORIENTATION='mirror', same parity rule as
// board.mjs) — presentation-only geometry, no GameState/seat read, consistent with the pure
// layout the rest of this module already draws from.
const ENEMY_HALF_TINT = 'rgba(200, 68, 47, 0.10)';   // faint alarm wash over the adverse half
const ENEMY_HATCH_STROKE = 'rgba(200, 68, 47, 0.18)';
const HALF_BOUNDARY_STROKE = COLOR_BRASS;

function isEnemyRow(row) {
  if (BOARD_ORIENTATION !== 'mirror') return false;
  return row < BOARD_HEIGHT / 2; // player_0 owns the bottom half, mirrors board.mjs
}

function drawBoardGrid(ctx) {
  for (let i = 0; i < BOARD_WIDTH * BOARD_HEIGHT; i++) {
    const r = cellRect(i);
    const col = i % BOARD_WIDTH;
    const row = Math.floor(i / BOARD_WIDTH);
    ctx.fillStyle = (row + col) % 2 === 0 ? COLOR_STONE : COLOR_FELT;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    if (isEnemyRow(row)) {
      // Adverse half: a translucent alarm wash plus a diagonal hatch so the boundary reads
      // even in a black-and-white screenshot, not just via color.
      ctx.fillStyle = ENEMY_HALF_TINT;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = ENEMY_HATCH_STROKE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(232, 223, 200, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }

  // Boundary line between the two halves — the signature "own half" cue.
  if (BOARD_ORIENTATION === 'mirror') {
    const midRow = Math.floor(BOARD_HEIGHT / 2);
    const leftCell = cellRect(midRow * BOARD_WIDTH);
    const rightCell = cellRect(midRow * BOARD_WIDTH + BOARD_WIDTH - 1);
    ctx.strokeStyle = HALF_BOUNDARY_STROKE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftCell.x, leftCell.y);
    ctx.lineTo(rightCell.x + rightCell.w, rightCell.y);
    ctx.stroke();
  }
}

function drawUnit(ctx, unit) {
  const r = cellRect(unit.board_index);
  if (!r) return; // out-of-range index: nothing to draw, never a thrown error mid-render
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const radius = Math.min(r.w, r.h) * 0.34;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_BRASS;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR_PARCHMENT;
  ctx.stroke();

  // C4 (s9-build playtest fix): the token's short label is derived from the unit's real NAME
  // (content/units.v0.mjs), not the raw unit_def_id fixture identifier — full name lives in
  // the DOM stat sheet (#unit-card, input/gestures.mjs), the token only needs to be legible
  // at cell scale.
  const def = getUnitDef(unit.unit_def_id);
  const shortLabel = def ? def.name.slice(0, 3).toUpperCase() : unit.unit_def_id.replace('unit_', 'U');

  ctx.fillStyle = COLOR_FELT;
  ctx.font = '600 11px "Bahnschrift", "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shortLabel, cx, cy);

  ctx.fillStyle = COLOR_PARCHMENT;
  ctx.font = '600 10px "Bahnschrift", "Oswald", sans-serif';
  ctx.fillText('★'.repeat(unit.star), cx, cy + radius + 10);
}

// C5 (s9-build playtest fix): the chronometer is a SQUARE frame that consumes along the
// board's own perimeter — not a circle inscribed in a square, which cut the corners and
// overflowed past the grid. The remaining-time stroke starts at top-center (matching the old
// circle's 12-o'clock start) and consumes clockwise around the four edges.
function squarePerimeterSegments(x, y, size) {
  const half = size / 2;
  return [
    { len: half, from: [x + half, y], to: [x + size, y] },        // top-center -> top-right
    { len: size, from: [x + size, y], to: [x + size, y + size] }, // top-right -> bottom-right
    { len: size, from: [x + size, y + size], to: [x, y + size] }, // bottom-right -> bottom-left
    { len: size, from: [x, y + size], to: [x, y] },                // bottom-left -> top-left
    { len: half, from: [x, y], to: [x + half, y] }                 // top-left -> top-center
  ];
}

function tracePerimeterDistance(ctx, x, y, size, distance) {
  const half = size / 2;
  const totalPerimeter = size * 4;
  let remaining = Math.max(0, Math.min(totalPerimeter, distance));

  ctx.beginPath();
  ctx.moveTo(x + half, y);
  for (const seg of squarePerimeterSegments(x, y, size)) {
    if (remaining <= 0) break;
    const segDist = Math.min(remaining, seg.len);
    const t = seg.len === 0 ? 1 : segDist / seg.len;
    ctx.lineTo(seg.from[0] + (seg.to[0] - seg.from[0]) * t, seg.from[1] + (seg.to[1] - seg.from[1]) * t);
    remaining -= segDist;
  }
}

function drawTimerRing(ctx, frameCounter) {
  const { size } = ringRect();
  const thickness = ringThickness();
  const totalMs = TIMER_DURATION * 1000;
  const spentFraction = Math.min(1, Math.max(0, frameCounter / totalMs));
  const remainingFraction = 1 - spentFraction;
  const totalPerimeter = size * 4;

  const inset = thickness / 2;

  ctx.lineWidth = thickness;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';

  // Track (already-spent time), faint, full square frame underneath.
  ctx.strokeStyle = 'rgba(62, 92, 85, 0.55)';
  ctx.strokeRect(inset, inset, size, size);

  // Remaining time, consuming clockwise from top-center around the board's own square
  // perimeter — the signature element (product_snapshot.md, C5).
  tracePerimeterDistance(ctx, inset, inset, size, remainingFraction * totalPerimeter);
  ctx.strokeStyle = spentFraction >= RING_ALARM_FRACTION ? COLOR_ALARM : COLOR_BRASS;
  ctx.stroke();
}

/**
 * Render the canvas surface. Pure function of (viewModel, frameCounter[, debug]).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} vm - view model from viewmodel.buildViewModel
 * @param {number} frameCounter - injected monotonic counter (ms elapsed in the current
 *   Preparation window), never a Date/performance read performed in this module (R2).
 * @param {boolean} [showDebugOverlay=false] - OFF by default (R9); only an explicit true
 *   from the caller enables it, and no code path in this game ever passes true.
 */
export function renderCanvas(ctx, vm, frameCounter, showDebugOverlay = false) {
  const size = canvasSize();
  ctx.fillStyle = COLOR_FELT;
  ctx.fillRect(0, 0, size, size);

  drawBoardGrid(ctx);
  for (const unit of vm.board) {
    drawUnit(ctx, unit);
  }
  drawTimerRing(ctx, frameCounter);

  if (showDebugOverlay) {
    ctx.fillStyle = COLOR_ALARM;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`events=${vm.events_seen} frame=${frameCounter}`, 4, 4);
  }
}

// =============================================================================================
// COMBAT SURFACE (D2/D4) — drawn ONLY from a frame produced by renderer/combat_view.mjs, i.e.
// only from the Event Log. Same blindness rule as everything above: no GameState, no clock read,
// no Math.random. The animation advances on the injected frame counter (R2).
// =============================================================================================

const COLOR_ENEMY = '#8E3B2E';   // the opposing army's brass, darkened — same family, clearly not you
const COLOR_ARROW = '#F0D9A0';
// G1 — the keyword palette. Three signs that must be readable at cell scale, and readable in a
// still screenshot: a HALO (bouclier divin), a GREEN mark (venin), a BRASS chevron (renforcée).
const COLOR_DIVINE = '#FFF3CD';  // near-white gold: the halo of an unbroken divine shield
const COLOR_POISON = '#6FBF73';  // the only green on the board — nothing else can be mistaken for it
const COLOR_BUFFED = '#F0D9A0';

function centerOf(cellIndex) {
  const r = cellRect(cellIndex);
  if (!r) return null;
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, size: Math.min(r.w, r.h) };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Where a unit is DRAWN this frame: its committed cell, or partway through its Move. */
function unitPoint(unit) {
  const to = centerOf(unit.cell);
  if (!to) return null;
  if (!unit.moving) return to;
  const from = centerOf(unit.from_cell);
  if (!from) return to;
  const t = typeof unit.move_progress === 'number' ? unit.move_progress : 1;
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), size: to.size };
}

function drawHealthBar(ctx, x, y, width, ratio, friendly) {
  const h = 4;
  ctx.fillStyle = 'rgba(22, 48, 43, 0.85)';
  ctx.fillRect(x - width / 2, y, width, h);
  ctx.fillStyle = friendly ? COLOR_BRASS : COLOR_ENEMY;
  ctx.fillRect(x - width / 2, y, width * Math.max(0, Math.min(1, ratio)), h);
  ctx.strokeStyle = 'rgba(232, 223, 200, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width / 2 + 0.5, y + 0.5, width - 1, h - 1);
}

// G1 — TAUNT. A pair of heavy brackets around the token: "you must come through me". Drawn from
// the keyword list the Spawn Event carried, never from a unit id.
function drawTauntBrackets(ctx, cx, cy, radius, friendly) {
  const r = radius + 5;
  const arm = radius * 0.55;
  ctx.strokeStyle = friendly ? COLOR_PARCHMENT : COLOR_ALARM;
  ctx.lineWidth = 2;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * r, cy - r + arm);
    ctx.lineTo(cx + sx * r, cy - r);
    ctx.lineTo(cx + sx * (r - arm), cy - r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + sx * r, cy + r - arm);
    ctx.lineTo(cx + sx * r, cy + r);
    ctx.lineTo(cx + sx * (r - arm), cy + r);
    ctx.stroke();
  }
}

function drawCombatUnit(ctx, unit, strikeOffset) {
  const p = unitPoint(unit);
  if (!p) return;
  const radius = p.size * 0.32;
  const cx = p.x + (strikeOffset ? strikeOffset.x : 0);
  const cy = p.y + (strikeOffset ? strikeOffset.y : 0);

  // G1 — BOUCLIER DIVIN, still unbroken: a bright halo BEHIND the token, so the moment it
  // disappears is visible even on a still frame.
  if (unit.divine_shield) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 243, 205, 0.22)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = COLOR_DIVINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  if (Array.isArray(unit.keywords) && unit.keywords.includes(KEYWORDS.TAUNT)) {
    drawTauntBrackets(ctx, cx, cy, radius, unit.is_viewer);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = unit.is_viewer ? COLOR_BRASS : COLOR_ENEMY;
  ctx.fill();
  ctx.lineWidth = 2;
  // G1 — VENIN: the outline goes green and stays green until the unit falls, so a death with
  // Health still on the bar reads as a poisoning rather than as a bug.
  ctx.strokeStyle = unit.hit_flash > 0
    ? COLOR_ALARM
    : (unit.poisoned ? COLOR_POISON : COLOR_PARCHMENT);
  ctx.stroke();

  if (unit.poisoned) {
    ctx.beginPath();
    ctx.arc(cx + radius * 0.72, cy - radius * 0.72, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_POISON;
    ctx.fill();
  }

  // G1 — RENFORCÉE: a small chevron under the token for a unit a Buff has landed on (tribe
  // leader or râle d'agonie). The synergy has to leave a mark that outlives its own flash.
  if (unit.buffed) {
    ctx.strokeStyle = COLOR_BUFFED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + radius + 4);
    ctx.lineTo(cx, cy + radius - 1);
    ctx.lineTo(cx + 5, cy + radius + 4);
    ctx.stroke();
  }

  if (unit.hit_flash > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3 + unit.hit_flash * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200, 68, 47, ${0.75 * unit.hit_flash})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const def = getUnitDef(unit.unit_def_id);
  const shortLabel = def ? def.name.slice(0, 3).toUpperCase() : String(unit.unit_def_id).replace('unit_', 'U');
  ctx.fillStyle = COLOR_FELT;
  ctx.font = '600 11px "Bahnschrift", "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shortLabel, cx, cy);

  drawHealthBar(ctx, cx, cy - radius - 8, p.size * 0.72,
    unit.health_initial > 0 ? unit.health / unit.health_initial : 0, unit.is_viewer);
}

/** A melee blow: the attacker lunges toward its target and snaps back. */
function strikeOffsetFor(strikes, unitId) {
  const s = strikes.find(x => x.attacker_id === unitId);
  if (!s) return null;
  const from = centerOf(s.from_cell);
  const to = centerOf(s.to_cell);
  if (!from || !to) return null;
  // Out on the first half of the strike window, back on the second — a swing, not a teleport.
  const lunge = s.progress < 0.5 ? s.progress * 2 : (1 - s.progress) * 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Kept short on purpose: at Range 1 the two cells are adjacent, so a long lunge buries the
  // attacker's token behind its target and the blow becomes unreadable.
  const reach = from.size * 0.24 * lunge;
  return { x: (dx / len) * reach, y: (dy / len) * reach };
}

function drawProjectile(ctx, shot) {
  const from = centerOf(shot.from_cell);
  const to = centerOf(shot.to_cell);
  if (!from || !to) return;
  const t = shot.progress;
  const x = lerp(from.x, to.x, t);
  const y = lerp(from.y, to.y, t);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const len = from.size * 0.42;

  // An arrow: a shaft with a head, oriented along its flight. Visible IN FLIGHT — that is the
  // whole point of the exercise, and it is drawn from Attack.attacker_cell/target_cell alone.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = COLOR_ARROW;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.lineTo(len / 2, 0);
  ctx.stroke();
  ctx.fillStyle = COLOR_ARROW;
  ctx.beginPath();
  ctx.moveTo(len / 2 + 5, 0);
  ctx.lineTo(len / 2 - 3, -4);
  ctx.lineTo(len / 2 - 3, 4);
  ctx.closePath();
  ctx.fill();
  // Faint trail behind it, so a still screenshot still reads as "moving".
  ctx.strokeStyle = 'rgba(240, 217, 160, 0.30)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-len * 1.6, 0);
  ctx.lineTo(-len / 2, 0);
  ctx.stroke();
  ctx.restore();
}

function drawImpact(ctx, impact) {
  const c = centerOf(impact.cell);
  if (!c) return;
  // G1: a blow the shield SWALLOWED WHOLE is not drawn as a wound. Same geometry, different
  // colour and different word — "BOUCLIER" instead of a damage figure — because the two are
  // different facts and the payload distinguishes them (fully_absorbed).
  const absorbedWhole = impact.fully_absorbed === true;
  ctx.strokeStyle = absorbedWhole ? COLOR_DIVINE : COLOR_ALARM;
  ctx.lineWidth = absorbedWhole ? 2.5 : 2;
  for (const a of [0.4, 1.9, 3.4, 4.9]) {
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * c.size * 0.18, c.y + Math.sin(a) * c.size * 0.18);
    ctx.lineTo(c.x + Math.cos(a) * c.size * 0.40, c.y + Math.sin(a) * c.size * 0.40);
    ctx.stroke();
  }
  if (absorbedWhole) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.size * 0.46, 0, Math.PI * 2);
    ctx.strokeStyle = COLOR_DIVINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = absorbedWhole ? COLOR_DIVINE : COLOR_PARCHMENT;
  ctx.font = '700 12px "Bahnschrift", "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(absorbedWhole ? 'BOUCLIER' : `-${impact.amount}`, c.x, c.y - c.size * 0.42);
}

// G1 — a keyword notice that happened THIS Tick: a tribe buff, a venom mark, a resurrection.
// Purely a label placed on the cell the frame gave; no rule is read to decide what to say.
const NOTICE_COLOR = {
  buff: COLOR_BUFFED,
  poison: COLOR_POISON,
  reborn: COLOR_DIVINE
};

function drawNotice(ctx, notice) {
  const c = centerOf(notice.cell);
  if (!c) return;
  const color = NOTICE_COLOR[notice.kind] || COLOR_PARCHMENT;
  ctx.fillStyle = color;
  ctx.font = '700 11px "Bahnschrift", "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(notice.text, c.x, c.y + c.size * 0.30);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.size * 0.44, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Render one animation frame of the combat.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} frame - from renderer/combat_view.mjs::buildCombatFrame
 */
export function renderCombatCanvas(ctx, frame) {
  const size = canvasSize();
  ctx.fillStyle = COLOR_FELT;
  ctx.fillRect(0, 0, size, size);
  drawBoardGrid(ctx);

  // Once the playback is over the fight is READ, not replayed: the last Tick's arrows and
  // impact bursts are dropped so the final board (who is left standing) is legible under the
  // result panel. Presentation only — the journal is unchanged.
  const stillFighting = !frame.finished;

  for (const unit of frame.units) {
    if (!unit.alive) continue;
    drawCombatUnit(ctx,
      stillFighting ? unit : { ...unit, hit_flash: 0 },
      stillFighting ? strikeOffsetFor(frame.strikes, unit.unit_instance_id) : null);
  }
  if (stillFighting) {
    for (const shot of frame.projectiles) {
      drawProjectile(ctx, shot);
    }
    for (const impact of frame.impacts) {
      drawImpact(ctx, impact);
    }
    for (const notice of (frame.notices || [])) {
      drawNotice(ctx, notice);
    }
  }

  // The chronometer frame belongs to Preparation; during a battle the same border carries the
  // combat's own progress, so the signature element never goes dark.
  const { size: ringSize } = ringRect();
  const inset = ringThickness() / 2;
  ctx.lineWidth = ringThickness();
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(62, 92, 85, 0.55)';
  ctx.strokeRect(inset, inset, ringSize, ringSize);
  const done = frame.last_tick > 0 ? Math.min(1, (frame.tick - 1 + frame.progress) / frame.last_tick) : 0;
  tracePerimeterDistance(ctx, inset, inset, ringSize, done * ringSize * 4);
  ctx.strokeStyle = COLOR_ALARM;
  ctx.stroke();
}

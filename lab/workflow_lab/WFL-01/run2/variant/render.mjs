// render.mjs — rendu PUR (WFL-01, rollout run2, branche "variant", pièce écrite en
// isolation d'agent : seuls shared/blueprint.yaml, shared/product_snapshot.md R1-R20
// et l'état public exposé par variant/game.mjs de CE run ont été consultés — jamais le
// corps de game.mjs/level.mjs, jamais run1, jamais run2/control/render.mjs).
//
// Contrat : lecture seule de l'état, ne le mute jamais (R19). Note de forme observée :
// status vaut 'playing'|'won'|'lost' (pas 'win'/'lose') ; les briques n'ont pas de champ
// `color` (choisi ici par ligne) ; le score par brique est nommé `points` (pas `score`).

const BACKGROUND = '#0c0f16';
const PADDLE_COLOR = '#f2f2f2';
const BALL_COLOR = '#f2f2f2';
const TEXT_COLOR = '#f2f2f2';
const OVERLAY_BACKDROP = 'rgba(5, 5, 10, 0.7)';
const HUD_FONT = '16px sans-serif';
const OVERLAY_FONT = 'bold 38px sans-serif';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const DEFAULT_BALL_RADIUS = 7;
const ROW_PALETTE = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#8338ec', '#ff8fa3'];

function brickFill(brick) {
  if (!brick.destructible) return '#5c677d';
  const idx = Number.isInteger(brick.row) ? brick.row % ROW_PALETTE.length : 0;
  return ROW_PALETTE[idx];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state instance BreakoutGame (variant, run2)
 */
export function draw(ctx, state) {
  if (!ctx || !state) return;

  const width = (ctx.canvas && ctx.canvas.width) || DEFAULT_WIDTH;
  const height = (ctx.canvas && ctx.canvas.height) || DEFAULT_HEIGHT;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  drawBricks(ctx, state.bricks || []);
  drawPaddle(ctx, state.paddle);
  drawBall(ctx, state.ball);
  drawHud(ctx, state);

  if (state.status === 'won' || state.status === 'lost') {
    drawOverlay(ctx, state, width, height);
  }
}

function drawBricks(ctx, bricks) {
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (!brick || brick.alive === false) continue;
    ctx.fillStyle = brickFill(brick);
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
  }
}

function drawPaddle(ctx, paddle) {
  if (!paddle) return;
  ctx.fillStyle = PADDLE_COLOR;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall(ctx, ball) {
  if (!ball) return;
  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius || DEFAULT_BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function countAliveDestructible(bricks) {
  let n = 0;
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (brick && brick.destructible && brick.alive !== false) n += 1;
  }
  return n;
}

function drawHud(ctx, state) {
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = HUD_FONT;
  ctx.fillText(`Score : ${state.score || 0}`, 16, 22);
  ctx.fillText(`Vies : ${state.lives || 0}`, 16, 42);
  ctx.fillText(`Niveau : ${(state.level || 0) + 1}`, 16, 62);
  ctx.fillText(`Briques : ${countAliveDestructible(state.bricks || [])}`, 16, 82);
}

function drawOverlay(ctx, state, width, height) {
  ctx.fillStyle = OVERLAY_BACKDROP;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = OVERLAY_FONT;
  if ('textAlign' in ctx) ctx.textAlign = 'center';
  ctx.fillText(state.status === 'won' ? 'VICTOIRE' : 'PARTIE PERDUE', width / 2, height / 2);
  if ('textAlign' in ctx) ctx.textAlign = 'left';
}

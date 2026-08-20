// render.mjs — rendu PUR (WFL-01, rollout run2, branche "control"). Lit l'état, ne le
// mute jamais (R19). Écrit indépendamment de run1.

const BG = '#10131c';
const PADDLE_COLOR = '#eaeaea';
const BALL_COLOR = '#eaeaea';
const TEXT_COLOR = '#eaeaea';
const OVERLAY_BG = 'rgba(0,0,0,0.65)';
const HUD_FONT = '15px monospace';
const OVERLAY_FONT = 'bold 34px monospace';
const DEFAULT_W = 800;
const DEFAULT_H = 600;
const BALL_RADIUS_FALLBACK = 7;
const BRICK_PALETTE = ['#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#8338ec'];

function brickColor(index) {
  return BRICK_PALETTE[index % BRICK_PALETTE.length];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state instance BreakoutGame
 */
export function draw(ctx, state) {
  if (!ctx || !state) return;
  const w = (ctx.canvas && ctx.canvas.width) || DEFAULT_W;
  const h = (ctx.canvas && ctx.canvas.height) || DEFAULT_H;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const bricks = state.bricks || [];
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (!brick || brick.alive === false) continue;
    ctx.fillStyle = brickColor(i);
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
  }

  if (state.paddle) {
    ctx.fillStyle = PADDLE_COLOR;
    ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);
  }

  if (state.ball) {
    ctx.fillStyle = BALL_COLOR;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius || BALL_RADIUS_FALLBACK, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHud(ctx, state);

  if (state.status === 'win' || state.status === 'lose') {
    drawOverlay(ctx, state, w, h);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = HUD_FONT;
  ctx.fillText(`SCORE ${state.score || 0}`, 14, 20);
  ctx.fillText(`LIVES ${state.lives || 0}`, 14, 38);
  ctx.fillText(`LEVEL ${(state.level || 0) + 1}`, 14, 56);
}

function drawOverlay(ctx, state, w, h) {
  ctx.fillStyle = OVERLAY_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = OVERLAY_FONT;
  if ('textAlign' in ctx) ctx.textAlign = 'center';
  ctx.fillText(state.status === 'win' ? 'YOU WIN' : 'GAME OVER', w / 2, h / 2);
  if ('textAlign' in ctx) ctx.textAlign = 'left';
}

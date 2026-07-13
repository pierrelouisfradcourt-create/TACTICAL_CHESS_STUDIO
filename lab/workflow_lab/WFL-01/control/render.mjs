// render.mjs — rendu PUR : consomme l'état de jeu, ne le mute jamais (R19).
// Seul module autorisé à parler à un contexte canvas 2D dans ce dossier.

const BACKGROUND_COLOR = '#0b0f1a';
const PADDLE_COLOR = '#f5f5f5';
const BALL_COLOR = '#f5f5f5';
const TEXT_COLOR = '#f5f5f5';
const OVERLAY_BACKDROP = 'rgba(0, 0, 0, 0.6)';
const HUD_FONT = '16px sans-serif';
const OVERLAY_FONT = 'bold 36px sans-serif';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const DEFAULT_BALL_RADIUS = 8;

/**
 * Dessine l'état de jeu courant sur un contexte canvas 2D.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state instance BreakoutGame (ou objet compatible)
 */
export function draw(ctx, state) {
  if (!ctx || !state) return;

  const width = (ctx.canvas && ctx.canvas.width) || DEFAULT_WIDTH;
  const height = (ctx.canvas && ctx.canvas.height) || DEFAULT_HEIGHT;

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  drawBricks(ctx, state.bricks || []);
  drawPaddle(ctx, state.paddle);
  drawBall(ctx, state.ball);
  drawHud(ctx, state);

  if (state.status === 'win' || state.status === 'lose') {
    drawOverlay(ctx, state, width, height);
  }
}

function drawBricks(ctx, bricks) {
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (!brick || brick.alive === false) continue;
    ctx.fillStyle = brick.color || '#e63946';
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

function drawHud(ctx, state) {
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = HUD_FONT;
  const score = state.score || 0;
  const lives = state.lives || 0;
  const levelLabel = (state.level || 0) + 1;
  ctx.fillText(`Score: ${score}`, 16, 24);
  ctx.fillText(`Lives: ${lives}`, 16, 44);
  ctx.fillText(`Level: ${levelLabel}`, 16, 64);
}

function drawOverlay(ctx, state, width, height) {
  ctx.fillStyle = OVERLAY_BACKDROP;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = OVERLAY_FONT;
  if ('textAlign' in ctx) ctx.textAlign = 'center';
  const message = state.status === 'win' ? 'VICTORY' : 'GAME OVER';
  ctx.fillText(message, width / 2, height / 2);
  if ('textAlign' in ctx) ctx.textAlign = 'left';
}

// render.mjs — rendu PUR pour le breakout (WFL-01, pièce "variant").
//
// Contrat (blueprint.yaml) : render lit game.mjs et level.mjs en LECTURE SEULE,
// ne mute jamais l'état, n'importe jamais input.mjs ni server.mjs. Ce module a été
// écrit en ne consultant QUE : shared/blueprint.yaml, shared/product_snapshot.md
// (R1-R20), shared/wiremap_frozen.json et variant/game.mjs + variant/level.mjs —
// jamais la pièce "control" équivalente (isolation d'agent, protocole WFL-01).
//
// Note de forme d'état (lue depuis variant/game.mjs, PAS supposée) : status vaut
// 'playing' | 'won' | 'lost' (pas 'win'/'lose'). Les briques (variant/level.mjs)
// n'ont PAS de champ `color` : ce module choisit lui-même une teinte par ligne et
// par cassabilité, faute de couleur fournie par la logique.

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
const INDESTRUCTIBLE_COLOR = '#7d8597';

// Palette cyclique pour les briques cassables, indexée par numéro de rangée (R8/R9 :
// purement décoratif, sans effet sur la logique — level.mjs ne fournit pas de couleur).
const DESTRUCTIBLE_PALETTE = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d', '#a663cc'];

/**
 * Dessine l'état de jeu courant sur un contexte canvas 2D. Lecture seule (R19) :
 * ne mute jamais `state`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state instance BreakoutGame (variant) ou objet compatible
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

  if (state.status === 'won' || state.status === 'lost') {
    drawOverlay(ctx, state, width, height);
  }
}

function brickColor(brick) {
  if (!brick.destructible) return INDESTRUCTIBLE_COLOR;
  const idx = Number.isInteger(brick.row) ? brick.row % DESTRUCTIBLE_PALETTE.length : 0;
  return DESTRUCTIBLE_PALETTE[idx];
}

function drawBricks(ctx, bricks) {
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (!brick || brick.alive === false) continue;
    ctx.fillStyle = brickColor(brick);
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

/**
 * Compte les briques cassables encore vivantes — level.mjs (variant) n'expose pas
 * de compteur public équivalent à `_destructibleRemaining` (privé à game.mjs), donc
 * ce module le recalcule depuis `state.bricks`, seule donnée publique disponible.
 */
function countDestructibleRemaining(bricks) {
  let remaining = 0;
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (brick && brick.destructible && brick.alive !== false) remaining += 1;
  }
  return remaining;
}

function drawHud(ctx, state) {
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = HUD_FONT;
  const score = state.score || 0;
  const lives = state.lives || 0;
  const levelLabel = (state.level || 0) + 1;
  const bricksRemaining = countDestructibleRemaining(state.bricks || []);
  ctx.fillText(`Score: ${score}`, 16, 24);
  ctx.fillText(`Lives: ${lives}`, 16, 44);
  ctx.fillText(`Level: ${levelLabel}`, 16, 64);
  ctx.fillText(`Bricks: ${bricksRemaining}`, 16, 84);
}

function drawOverlay(ctx, state, width, height) {
  ctx.fillStyle = OVERLAY_BACKDROP;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = OVERLAY_FONT;
  if ('textAlign' in ctx) ctx.textAlign = 'center';
  const message = state.status === 'won' ? 'VICTORY' : 'GAME OVER';
  ctx.fillText(message, width / 2, height / 2);
  if ('textAlign' in ctx) ctx.textAlign = 'left';
}

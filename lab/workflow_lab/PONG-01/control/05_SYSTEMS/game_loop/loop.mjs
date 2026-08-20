// PONG — systeme `game_loop`. C'EST LA BRIQUE DEPOSEE EN BIBLIOTHEQUE (budget: adds).
// Lignes de wiremap couvertes : core.boot, core.main_loop, play.paddle, play.ball, play.score.
// Regles PURES : `tick` est une fonction de (etat, entrees) vers un NOUVEL etat.
// Aucun rendu, aucun hasard, aucune mutation de l'etat recu.

import {
  FIELD, PADDLE, BALL, STATUS, SIDE,
  createInitialState, evaluateEnd,
} from '../game_state/state.mjs';
import { normalizeInputs, actionToDelta } from '../input/input.mjs';

/** Evenements emis par un tick — consommes par la presentation (son, effets). */
export const EVENT = Object.freeze({
  BOUNCE_WALL: 'bounce_wall',
  BOUNCE_PADDLE: 'bounce_paddle',
  SCORE: 'score',
});

/** core.boot — amener le jeu a un etat initial jouable. */
export function boot() {
  return createInitialState();
}

/** Position en x du plan de frappe de chaque raquette. */
function paddlePlaneX(side) {
  return side === SIDE.LEFT ? PADDLE.MARGIN : FIELD.WIDTH - PADDLE.MARGIN;
}

/** play.paddle — deplacement borne. La raquette ne sort JAMAIS du terrain. */
function movePaddle(paddle, action) {
  const maxY = FIELD.HEIGHT - PADDLE.HEIGHT;
  const next = paddle.y + actionToDelta(action) * PADDLE.SPEED;
  return { y: Math.max(0, Math.min(maxY, next)) };
}

/**
 * play.ball — le rebond sur raquette est detecte par FRANCHISSEMENT du plan
 * entre l'ancienne et la nouvelle position, pas par un simple test de position.
 * Sans ca, une balle rapide traverserait la raquette sans la toucher.
 */
function paddleIntercepts(prevX, nextX, ballY, paddles, side) {
  const plane = paddlePlaneX(side);
  const crossing = side === SIDE.LEFT
    ? prevX >= plane && nextX <= plane
    : prevX <= plane && nextX >= plane;
  if (!crossing) return false;

  const top = paddles[side].y;
  return ballY >= top && ballY <= top + PADDLE.HEIGHT;
}

/** L'angle de renvoi depend du point d'impact : deterministe, et rend le jeu jouable. */
function deflect(ballY, paddleY) {
  const relative = (ballY - paddleY) / PADDLE.HEIGHT - 0.5;   // -0.5 .. +0.5
  const vy = relative * 2 * BALL.MAX_SPEED_Y;
  return Math.max(-BALL.MAX_SPEED_Y, Math.min(BALL.MAX_SPEED_Y, vy));
}

/**
 * core.main_loop — un tick. Deterministe : memes entrees, meme resultat.
 * @param {object} state etat courant (jamais mute)
 * @param {unknown} rawInputs entrees brutes des deux joueurs
 * @returns {object} nouvel etat
 */
export function tick(state, rawInputs) {
  if (state.status === STATUS.OVER) return { ...state, events: [] };

  const inputs = normalizeInputs(rawInputs);
  const events = [];

  const paddles = [
    movePaddle(state.paddles[SIDE.LEFT], inputs[SIDE.LEFT]),
    movePaddle(state.paddles[SIDE.RIGHT], inputs[SIDE.RIGHT]),
  ];

  let { x, y, vx, vy } = state.ball;
  const prevX = x;
  x += vx;
  y += vy;

  // Rebond sur les bords haut et bas.
  if (y <= 0) { y = -y; vy = -vy; events.push(EVENT.BOUNCE_WALL); }
  else if (y >= FIELD.HEIGHT) { y = 2 * FIELD.HEIGHT - y; vy = -vy; events.push(EVENT.BOUNCE_WALL); }

  // Rebond sur les raquettes (franchissement).
  for (const side of [SIDE.LEFT, SIDE.RIGHT]) {
    if (paddleIntercepts(prevX, x, y, paddles, side)) {
      const plane = paddlePlaneX(side);
      x = 2 * plane - x;                 // renvoi symetrique du depassement
      vx = -vx;
      vy = deflect(y, paddles[side].y);
      events.push(EVENT.BOUNCE_PADDLE);
    }
  }

  // play.score — la balle a quitte le terrain : un point pour le camp oppose.
  const score = [...state.score];
  let ball = { x, y, vx, vy };
  if (x < 0 || x > FIELD.WIDTH) {
    const scorer = x < 0 ? SIDE.RIGHT : SIDE.LEFT;
    score[scorer] += 1;
    events.push(EVENT.SCORE);
    // Service vers celui qui vient d'encaisser — regle explicite, pas un tirage.
    ball = {
      x: FIELD.WIDTH / 2,
      y: FIELD.HEIGHT / 2,
      vx: scorer === SIDE.LEFT ? -BALL.SPEED_X : BALL.SPEED_X,
      vy: BALL.SPEED_Y,
    };
  }

  const next = {
    ball,
    paddles,
    score,
    status: state.status,
    winner: state.winner,
    ticks: state.ticks + 1,
    events,
  };

  const end = evaluateEnd(next);
  if (end.over) {
    next.status = STATUS.OVER;
    next.winner = end.winner;
  }
  return next;
}

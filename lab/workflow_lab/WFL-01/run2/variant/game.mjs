// game.mjs — logique de jeu PURE (WFL-01, rollout run2, branche "variant", pièce écrite
// en isolation d'agent : consulte UNIQUEMENT shared/blueprint.yaml, shared/
// product_snapshot.md R1-R20 et la forme publique retournée par generateLevel() de
// variant/level.mjs de CE run — jamais le corps de level.mjs, jamais run1, jamais
// run2/control).
//
// Contrat : n'importe jamais render.mjs/input.mjs/server.mjs, aucune API DOM. Toute
// mutation de l'état passe par une méthode de cette classe (R19).

import { generateLevel } from './level.mjs';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

const DEFAULT_SEED = 'wfl01-run2-variant-default';

const BALL_RADIUS = 7;
const BALL_SPEED = 0.3; // px/ms
const SERVE_ANGLE_RAD = Math.PI / 5; // 36°, écart fixe déterministe au service

const PADDLE_WIDTH = 96;
const PADDLE_HEIGHT = 14;
const PADDLE_Y_OFFSET = 36; // distance entre le bas du terrain et le bas de la raquette
const PADDLE_SPEED = 0.46; // px/ms
const PADDLE_BOUNCE_EPSILON = 0.01;

const MAX_BOUNCE_ANGLE_RAD = Math.PI / 3; // 60°

const STARTING_LIVES = 3;
const LAST_LEVEL_INDEX = 2; // 3 niveaux (0,1,2) — dernier nettoyé => victoire de partie

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class BreakoutGame {
  /** @param {{seed?:(number|string)}} [options] */
  constructor({ seed } = {}) {
    this.seed = seed === undefined ? DEFAULT_SEED : seed;
    this._initState();
  }

  reset() {
    this._initState();
  }

  _initState() {
    this.paddle = {
      x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
      y: GAME_HEIGHT - PADDLE_Y_OFFSET - PADDLE_HEIGHT,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };
    this.level = 0;
    this._loadLevel(this.level);
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.status = 'playing';
    this.ball = this._serveBall();
  }

  _loadLevel(levelIndex) {
    const data = generateLevel(this.seed, levelIndex);
    this.bricks = data.bricks.map((brick) => ({ ...brick }));
    this._destructibleRemaining = data.destructibleCount;
  }

  _serveBall() {
    return {
      x: this.paddle.x + this.paddle.width / 2,
      y: this.paddle.y - BALL_RADIUS - 1,
      vx: BALL_SPEED * Math.sin(SERVE_ANGLE_RAD),
      vy: -BALL_SPEED * Math.cos(SERVE_ANGLE_RAD),
    };
  }

  /**
   * @param {number} dtMs
   * @param {{left?:boolean, right?:boolean}} [input]
   */
  step(dtMs, input = {}) {
    if (this.status !== 'playing') return;
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;

    this._movePaddle(dtMs, input || {});
    this._moveBall(dtMs);
    this._resolveWallCollisions();
    this._resolveCeilingCollision();

    if (this._resolveBallLost()) return;

    this._resolvePaddleCollision();
    this._resolveBrickCollision();
    this._checkLevelOutcome();
  }

  _movePaddle(dtMs, input) {
    let dx = 0;
    if (input.left) dx -= PADDLE_SPEED * dtMs;
    if (input.right) dx += PADDLE_SPEED * dtMs;
    if (dx === 0) return;
    this.paddle.x = clamp(this.paddle.x + dx, 0, GAME_WIDTH - this.paddle.width);
  }

  _moveBall(dtMs) {
    this.ball.x += this.ball.vx * dtMs;
    this.ball.y += this.ball.vy * dtMs;
  }

  _resolveWallCollisions() {
    const { ball } = this;
    if (ball.x - BALL_RADIUS < 0) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + BALL_RADIUS > GAME_WIDTH) {
      ball.x = GAME_WIDTH - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx);
    }
  }

  _resolveCeilingCollision() {
    const { ball } = this;
    if (ball.y - BALL_RADIUS < 0) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy);
    }
  }

  _resolveBallLost() {
    if (this.ball.y <= GAME_HEIGHT) return false;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.status = 'lost';
      return true;
    }
    this.ball = this._serveBall();
    return true;
  }

  _resolvePaddleCollision() {
    const { ball, paddle } = this;
    if (ball.vy <= 0) return;

    const ballLeft = ball.x - BALL_RADIUS;
    const ballRight = ball.x + BALL_RADIUS;
    const ballTop = ball.y - BALL_RADIUS;
    const ballBottom = ball.y + BALL_RADIUS;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;

    const overlap =
      ballRight > paddleLeft && ballLeft < paddleRight && ballBottom > paddleTop && ballTop < paddleBottom;
    if (!overlap) return;

    const paddleCenter = paddle.x + paddle.width / 2;
    const relativeIntersect = clamp((ball.x - paddleCenter) / (paddle.width / 2), -1, 1);
    const angle = relativeIntersect * MAX_BOUNCE_ANGLE_RAD;
    const speed = Math.hypot(ball.vx, ball.vy) || BALL_SPEED;

    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddleTop - BALL_RADIUS - PADDLE_BOUNCE_EPSILON;
  }

  _resolveBrickCollision() {
    const { ball } = this;
    const ballLeft = ball.x - BALL_RADIUS;
    const ballRight = ball.x + BALL_RADIUS;
    const ballTop = ball.y - BALL_RADIUS;
    const ballBottom = ball.y + BALL_RADIUS;

    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      const brickLeft = brick.x;
      const brickRight = brick.x + brick.width;
      const brickTop = brick.y;
      const brickBottom = brick.y + brick.height;

      const overlap =
        ballRight > brickLeft && ballLeft < brickRight && ballBottom > brickTop && ballTop < brickBottom;
      if (!overlap) continue;

      const overlapX = Math.min(ballRight, brickRight) - Math.max(ballLeft, brickLeft);
      const overlapY = Math.min(ballBottom, brickBottom) - Math.max(ballTop, brickTop);
      if (overlapX < overlapY) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }

      if (brick.destructible) {
        brick.hp -= 1;
        if (brick.hp <= 0) {
          brick.alive = false;
          this.score += brick.points;
          this._destructibleRemaining -= 1;
        }
      }

      break; // une seule brique par tick — évite le double-rebond
    }
  }

  _checkLevelOutcome() {
    if (this._destructibleRemaining > 0) return;

    if (this.level >= LAST_LEVEL_INDEX) {
      this.status = 'won';
      return;
    }

    this.level += 1;
    this._loadLevel(this.level);
    this.ball = this._serveBall();
  }
}

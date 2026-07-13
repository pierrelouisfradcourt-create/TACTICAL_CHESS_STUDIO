// game.mjs — logique de jeu PURE (état, physique, collisions, conditions de fin).
// Contrat WFL-01 : n'importe JAMAIS render.mjs ni input.mjs, ne référence JAMAIS
// document/window/canvas/addEventListener/requestAnimationFrame. Toute mutation
// de l'état passe exclusivement par des méthodes de cette classe (R19).

import { generateLevel, LEVEL_COUNT } from './level.mjs';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 14;
const PADDLE_MARGIN_BOTTOM = 30;
const PADDLE_SPEED = 480; // px/s

const BALL_RADIUS = 8;
const BALL_SPEED = 300; // px/s — magnitude constante hors accélération de jeu
const BALL_INITIAL_VX = 180;
const BALL_INITIAL_VY = -240; // sqrt(180^2 + 240^2) === BALL_SPEED (300)

const INITIAL_LIVES = 3;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° — angle max de rebond raquette (R4)

const STATUS_PLAYING = 'playing';
const STATUS_WIN = 'win';
const STATUS_LOSE = 'lose';

export class BreakoutGame {
  /**
   * @param {{seed:(string|number)}} opts
   */
  constructor({ seed } = {}) {
    if (seed === undefined || seed === null) {
      throw new Error('BreakoutGame requires { seed }');
    }
    this.seed = seed;
    this.level = 0;
    this.lives = INITIAL_LIVES;
    this.score = 0;
    this.status = STATUS_PLAYING;

    this.paddle = {
      x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
      y: GAME_HEIGHT - PADDLE_MARGIN_BOTTOM - PADDLE_HEIGHT,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: PADDLE_SPEED,
    };

    this.bricks = [];
    this.levelData = null;
    this.ball = this._makeServeBall();
    this._loadLevel(this.level);
  }

  /** Ball repositionnée au-dessus de la raquette, vitesse de service fixe (R1). */
  _makeServeBall() {
    return {
      x: GAME_WIDTH / 2,
      y: this.paddle.y - BALL_RADIUS,
      vx: BALL_INITIAL_VX,
      vy: BALL_INITIAL_VY,
      radius: BALL_RADIUS,
    };
  }

  /** Charge/recharge un niveau depuis level.mjs — déterministe (R10, R14). */
  _loadLevel(levelIndex) {
    const levelData = generateLevel(this.seed, levelIndex);
    this.levelData = levelData;
    this.bricks = levelData.bricks;
    this.paddle.x = (GAME_WIDTH - this.paddle.width) / 2;
    this.ball = this._makeServeBall();
  }

  /** Remet la partie à son état initial (utile pour #restart côté UI, R17). */
  reset() {
    this.level = 0;
    this.lives = INITIAL_LIVES;
    this.score = 0;
    this.status = STATUS_PLAYING;
    this._loadLevel(this.level);
  }

  _remainingBricks() {
    let count = 0;
    for (let i = 0; i < this.bricks.length; i += 1) {
      const brick = this.bricks[i];
      if (brick.destructible && brick.alive) count += 1;
    }
    return count;
  }

  _movePaddle(dt, input) {
    if (input.left) this.paddle.x -= this.paddle.speed * dt;
    if (input.right) this.paddle.x += this.paddle.speed * dt;
    if (this.paddle.x < 0) this.paddle.x = 0;
    const maxX = GAME_WIDTH - this.paddle.width;
    if (this.paddle.x > maxX) this.paddle.x = maxX;
  }

  /** Rebond murs latéraux (R2) + plafond (R3) — inversion stricte de la composante. */
  _reflectWalls() {
    const ball = this.ball;
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ball.radius >= GAME_WIDTH) {
      ball.x = GAME_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    }
  }

  /** Rebond raquette, angle fonction du point d'impact (R4). */
  _reflectPaddle() {
    const ball = this.ball;
    const paddle = this.paddle;
    if (ball.vy <= 0) return false;

    const ballBottom = ball.y + ball.radius;
    const ballTop = ball.y - ball.radius;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    const withinX = ball.x + ball.radius >= paddle.x && ball.x - ball.radius <= paddle.x + paddle.width;
    const withinY = ballBottom >= paddleTop && ballTop <= paddleBottom;
    if (!withinX || !withinY) return false;

    const paddleCenter = paddle.x + paddle.width / 2;
    const halfWidth = paddle.width / 2;
    let relative = (ball.x - paddleCenter) / halfWidth;
    if (relative < -1) relative = -1;
    if (relative > 1) relative = 1;

    const angle = relative * MAX_BOUNCE_ANGLE;
    ball.vx = BALL_SPEED * Math.sin(angle);
    ball.vy = -BALL_SPEED * Math.cos(angle);
    ball.y = paddleTop - ball.radius;
    return true;
  }

  /** Rebond + destruction de brique selon la face touchée (R5, R8, R9). */
  _reflectBricks() {
    const ball = this.ball;
    for (let i = 0; i < this.bricks.length; i += 1) {
      const brick = this.bricks[i];
      if (!brick.alive) continue;

      const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
      const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      if (dx * dx + dy * dy > ball.radius * ball.radius) continue;

      const brickCenterX = brick.x + brick.width / 2;
      const brickCenterY = brick.y + brick.height / 2;
      const overlapX = ball.radius + brick.width / 2 - Math.abs(ball.x - brickCenterX);
      const overlapY = ball.radius + brick.height / 2 - Math.abs(ball.y - brickCenterY);

      if (overlapX < overlapY) {
        ball.vx = ball.x < brickCenterX ? -Math.abs(ball.vx) : Math.abs(ball.vx);
      } else {
        ball.vy = ball.y < brickCenterY ? -Math.abs(ball.vy) : Math.abs(ball.vy);
      }

      brick.alive = false;
      this.score += brick.score || 0;
      break; // une seule brique résolue par step — évite le double-rebond du même tick
    }
  }

  /** Niveau suivant (R14) ou victoire de partie si dernier niveau (R15). */
  _advanceLevelOrWin() {
    if (this.level + 1 >= LEVEL_COUNT) {
      this.status = STATUS_WIN;
      return;
    }
    this.level += 1;
    this._loadLevel(this.level);
  }

  /**
   * Avance la simulation de dtMs millisecondes.
   * @param {number} dtMs
   * @param {{left?:boolean, right?:boolean}} [input]
   */
  step(dtMs, input) {
    if (this.status !== STATUS_PLAYING) return;

    const dt = Math.max(0, Number(dtMs) || 0) / 1000;
    const activeInput = input || {};

    this._movePaddle(dt, activeInput);

    const ball = this.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    this._reflectWalls();
    this._reflectPaddle();
    this._reflectBricks();

    if (this._remainingBricks() === 0) {
      this._advanceLevelOrWin();
      return;
    }

    if (ball.y - ball.radius > GAME_HEIGHT) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.lives = 0;
        this.status = STATUS_LOSE;
        return;
      }
      this.ball = this._makeServeBall();
    }
  }
}

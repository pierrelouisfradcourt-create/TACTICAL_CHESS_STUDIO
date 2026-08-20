// game.mjs — logique de jeu PURE (WFL-01, rollout run2, branche "control").
// Contrat : n'importe JAMAIS render.mjs/input.mjs/server.mjs, ne référence aucune API
// DOM. Toute mutation de l'état passe par une méthode de cette classe (R19). Écrit
// indépendamment de run1 (nouvelle tentative — protocole WFL-01, règle N>=2).

import { generateLevel, LEVEL_COUNT, GAME_WIDTH, GAME_HEIGHT } from './level.mjs';

export { GAME_WIDTH, GAME_HEIGHT };

const PADDLE_WIDTH = 110;
const PADDLE_HEIGHT = 16;
const PADDLE_BOTTOM_GAP = 24;
const PADDLE_SPEED_PX_PER_S = 420;

const BALL_RADIUS = 7;
const BALL_SPEED_PX_PER_S = 260;
const SERVE_ANGLE_DEG = 55; // écart à la verticale, en degrés, au service

const STARTING_LIVES = 3;
const MAX_BOUNCE_ANGLE_DEG = 65;

const STATUS_PLAYING = 'playing';
const STATUS_WIN = 'win';
const STATUS_LOSE = 'lose';

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

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
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.status = STATUS_PLAYING;

    this.paddle = {
      x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
      y: GAME_HEIGHT - PADDLE_BOTTOM_GAP - PADDLE_HEIGHT,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };

    this.bricks = [];
    this._loadLevel(this.level);
    this.ball = this._serveBall();
  }

  reset() {
    this.level = 0;
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.status = STATUS_PLAYING;
    this.paddle.x = (GAME_WIDTH - this.paddle.width) / 2;
    this._loadLevel(this.level);
    this.ball = this._serveBall();
  }

  _loadLevel(levelIndex) {
    const data = generateLevel(this.seed, levelIndex);
    this.bricks = data.bricks.map((b) => ({ ...b }));
  }

  _serveBall() {
    const rad = (SERVE_ANGLE_DEG * Math.PI) / 180;
    return {
      x: this.paddle.x + this.paddle.width / 2,
      y: this.paddle.y - BALL_RADIUS - 1,
      vx: BALL_SPEED_PX_PER_S * Math.sin(rad),
      vy: -BALL_SPEED_PX_PER_S * Math.cos(rad),
    };
  }

  _aliveDestructibleCount() {
    let n = 0;
    for (const b of this.bricks) if (b.destructible && b.alive) n += 1;
    return n;
  }

  _movePaddle(dtSec, input) {
    let dx = 0;
    if (input.left) dx -= PADDLE_SPEED_PX_PER_S * dtSec;
    if (input.right) dx += PADDLE_SPEED_PX_PER_S * dtSec;
    this.paddle.x = clamp(this.paddle.x + dx, 0, GAME_WIDTH - this.paddle.width);
  }

  _resolveWalls() {
    const b = this.ball;
    if (b.x - BALL_RADIUS <= 0) {
      b.x = BALL_RADIUS;
      b.vx = Math.abs(b.vx);
    } else if (b.x + BALL_RADIUS >= GAME_WIDTH) {
      b.x = GAME_WIDTH - BALL_RADIUS;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - BALL_RADIUS <= 0) {
      b.y = BALL_RADIUS;
      b.vy = Math.abs(b.vy);
    }
  }

  _resolvePaddle() {
    const b = this.ball;
    const p = this.paddle;
    if (b.vy <= 0) return;

    const overlapX = b.x + BALL_RADIUS >= p.x && b.x - BALL_RADIUS <= p.x + p.width;
    const overlapY = b.y + BALL_RADIUS >= p.y && b.y - BALL_RADIUS <= p.y + p.height;
    if (!overlapX || !overlapY) return;

    const center = p.x + p.width / 2;
    const relative = clamp((b.x - center) / (p.width / 2), -1, 1);
    const angleRad = relative * ((MAX_BOUNCE_ANGLE_DEG * Math.PI) / 180);
    const speed = Math.hypot(b.vx, b.vy) || BALL_SPEED_PX_PER_S;

    b.vx = speed * Math.sin(angleRad);
    b.vy = -Math.abs(speed * Math.cos(angleRad));
    b.y = p.y - BALL_RADIUS;
  }

  _resolveBricks() {
    const b = this.ball;
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const overlapX = b.x + BALL_RADIUS > brick.x && b.x - BALL_RADIUS < brick.x + brick.width;
      const overlapY = b.y + BALL_RADIUS > brick.y && b.y - BALL_RADIUS < brick.y + brick.height;
      if (!overlapX || !overlapY) continue;

      const cx = brick.x + brick.width / 2;
      const cy = brick.y + brick.height / 2;
      const penX = BALL_RADIUS + brick.width / 2 - Math.abs(b.x - cx);
      const penY = BALL_RADIUS + brick.height / 2 - Math.abs(b.y - cy);
      if (penX < penY) {
        b.vx = b.x < cx ? -Math.abs(b.vx) : Math.abs(b.vx);
      } else {
        b.vy = b.y < cy ? -Math.abs(b.vy) : Math.abs(b.vy);
      }

      brick.alive = false;
      this.score += brick.score || 0;
      break; // une seule brique par step — évite le double-rebond
    }
  }

  _advanceOrWin() {
    if (this.level + 1 >= LEVEL_COUNT) {
      this.status = STATUS_WIN;
      return;
    }
    this.level += 1;
    this._loadLevel(this.level);
    this.ball = this._serveBall();
  }

  /**
   * @param {number} dtMs
   * @param {{left?:boolean, right?:boolean}} [input]
   */
  step(dtMs, input) {
    if (this.status !== STATUS_PLAYING) return;
    const dtSec = Math.max(0, Number(dtMs) || 0) / 1000;
    const activeInput = input || {};

    this._movePaddle(dtSec, activeInput);

    this.ball.x += this.ball.vx * dtSec;
    this.ball.y += this.ball.vy * dtSec;

    this._resolveWalls();
    this._resolvePaddle();
    this._resolveBricks();

    if (this._aliveDestructibleCount() === 0) {
      this._advanceOrWin();
      return;
    }

    if (this.ball.y - BALL_RADIUS > GAME_HEIGHT) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.lives = 0;
        this.status = STATUS_LOSE;
        return;
      }
      this.ball = this._serveBall();
    }
  }
}

// game.mjs — logique de jeu PURE pour le breakout (WFL-01, pièce "variant").
//
// Contrat : aucune dépendance à render.mjs ni input.mjs, aucune référence DOM
// (document/window/canvas/addEventListener/requestAnimationFrame), aucun
// Math.random()/Date.now()/performance.now(). L'unique source d'aléa vient de
// generateLevel() (level.mjs), lui-même déterministe (seed + levelIndex).
//
// Règles couvertes ici (wiremap_frozen.json) : R1-R9, R11-R15, R17-R20.
// R10 (génération de niveau seedée) et R16 (overlay) appartiennent à
// level.mjs / render.mjs respectivement — pas à ce fichier.

import { generateLevel } from './level.mjs';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// ── Constantes nommées (aucun nombre magique dans la logique ci-dessous) ──

const DEFAULT_SEED = 'wfl-01-default-seed';

const BALL_RADIUS = 8;
const INITIAL_BALL_SPEED = 0.35; // px/ms (~350 px/s)
const SERVE_ANGLE_RAD = Math.PI / 6; // 30° — angle de service fixe, déterministe
const SERVE_OFFSET = 1; // marge (px) entre le centre de la balle servie et le haut de la raquette

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;
const PADDLE_Y = GAME_HEIGHT - 40;
const PADDLE_SPEED = 0.5; // px/ms (~500 px/s)
const PADDLE_BOUNCE_EPSILON = 0.01; // évite que la balle reste imbriquée dans la raquette après rebond

const MAX_BOUNCE_ANGLE_RAD = Math.PI / 3; // 60° — angle max de rebond raquette en bord de raquette

const STARTING_LIVES = 3;

// Dernier index de niveau (0-based) : le niveau LAST_LEVEL_INDEX nettoyé => victoire de partie (R15).
const LAST_LEVEL_INDEX = 2; // 3 niveaux au total (0, 1, 2)

/**
 * Borne value dans [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Jeu de casse-briques déterministe — état + physique + conditions de fin.
 * Logique pure : aucune méthode ici ne touche au DOM ni au rendu.
 */
export class BreakoutGame {
  /**
   * @param {{seed?: (number|string)}} [options]
   */
  constructor({ seed } = {}) {
    this.seed = seed === undefined ? DEFAULT_SEED : seed;
    this._initState();
  }

  /**
   * Réinitialise TOUT l'état de jeu à l'état initial (niveau 0, vies pleines,
   * score à zéro, raquette centrée, balle servie) — R17 (restart).
   */
  reset() {
    this._initState();
  }

  /**
   * Construit l'état initial complet. Appelé par le constructeur et par reset().
   */
  _initState() {
    this.paddle = {
      x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
      y: PADDLE_Y,
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

  /**
   * Charge le niveau `levelIndex` via generateLevel (R10, R14) et reconstruit
   * la liste d'état runtime des briques (copie défensive — R9 : ce module
   * possède et mute son propre état, jamais l'objet retourné par level.mjs).
   * @param {number} levelIndex
   */
  _loadLevel(levelIndex) {
    const levelData = generateLevel(this.seed, levelIndex);
    this.bricks = levelData.bricks.map((brick) => ({ ...brick }));
    this._destructibleRemaining = levelData.destructibleCount;
  }

  /**
   * Place une nouvelle balle en service au centre de la raquette, avec un
   * angle de départ fixe et déterministe (R11).
   * @returns {{x: number, y: number, vx: number, vy: number}}
   */
  _serveBall() {
    return {
      x: this.paddle.x + this.paddle.width / 2,
      y: this.paddle.y - BALL_RADIUS - SERVE_OFFSET,
      vx: INITIAL_BALL_SPEED * Math.sin(SERVE_ANGLE_RAD),
      vy: -INITIAL_BALL_SPEED * Math.cos(SERVE_ANGLE_RAD),
    };
  }

  /**
   * Avance la simulation de dtMs millisecondes.
   * @param {number} dtMs
   * @param {{left?: boolean, right?: boolean}} [input]
   */
  step(dtMs, input = {}) {
    if (this.status !== 'playing') return;
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;

    this._movePaddle(dtMs, input || {});
    this._moveBall(dtMs);
    this._resolveWallCollisions();
    this._resolveCeilingCollision();

    if (this._resolveBallLost()) {
      // La balle vient d'être perdue (vie décrémentée + balle re-servie, ou
      // défaite prononcée) : pas de collision raquette/brique ce tick-ci.
      return;
    }

    this._resolvePaddleCollision();
    this._resolveBrickCollision();
    this._checkLevelOutcome();
  }

  /**
   * Déplace la raquette au clavier, bornée dans l'aire de jeu (R6, R7).
   * @param {number} dtMs
   * @param {{left?: boolean, right?: boolean}} input
   */
  _movePaddle(dtMs, input) {
    let dx = 0;
    if (input.left) dx -= PADDLE_SPEED * dtMs;
    if (input.right) dx += PADDLE_SPEED * dtMs;
    if (dx === 0) return;
    this.paddle.x = clamp(this.paddle.x + dx, 0, GAME_WIDTH - this.paddle.width);
  }

  /**
   * Avance la balle en continu selon sa vitesse (R1).
   * @param {number} dtMs
   */
  _moveBall(dtMs) {
    this.ball.x += this.ball.vx * dtMs;
    this.ball.y += this.ball.vy * dtMs;
  }

  /**
   * Rebond sur les murs latéraux — inversion stricte de vx (R2).
   */
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

  /**
   * Rebond sur le plafond — inversion stricte de vy (R3).
   */
  _resolveCeilingCollision() {
    const { ball } = this;
    if (ball.y - BALL_RADIUS < 0) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy);
    }
  }

  /**
   * Détecte la balle passée sous la raquette : perte d'une vie + remise en
   * service, ou défaite si vies épuisées (R11, R12).
   * @returns {boolean} true si la balle a été perdue ce tick (vie perdue ou défaite)
   */
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

  /**
   * Rebond sur la raquette avec angle dépendant du point d'impact (R4).
   * Seul un mouvement descendant peut déclencher ce rebond.
   */
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
      ballRight > paddleLeft &&
      ballLeft < paddleRight &&
      ballBottom > paddleTop &&
      ballTop < paddleBottom;
    if (!overlap) return;

    const paddleCenter = paddle.x + paddle.width / 2;
    const relativeIntersect = clamp((ball.x - paddleCenter) / (paddle.width / 2), -1, 1);
    const angle = relativeIntersect * MAX_BOUNCE_ANGLE_RAD;
    const speed = Math.hypot(ball.vx, ball.vy) || INITIAL_BALL_SPEED;

    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddleTop - BALL_RADIUS - PADDLE_BOUNCE_EPSILON;
  }

  /**
   * Collision balle/brique : rebond selon la face touchée, dégâts, score,
   * disparition définitive (R5, R8, R9). Une seule brique traitée par tick.
   */
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
        ballRight > brickLeft &&
        ballLeft < brickRight &&
        ballBottom > brickTop &&
        ballTop < brickBottom;
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

      break; // une seule brique traitée par tick — évite les doubles rebonds sur AABB voisines
    }
  }

  /**
   * Victoire de niveau ssi briques cassables restantes == 0 (R13) ; progression
   * de niveau (R14) ou victoire de partie au dernier niveau (R15).
   */
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

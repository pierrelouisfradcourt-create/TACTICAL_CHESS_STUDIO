// Chase Prototype — moteur de jeu headless PUR. Aucun accès DOM, aucun canvas, aucun window.
// render.mjs (dessin) et input.mjs (clavier) n'ont AUCUNE règle de jeu — ils lisent/pilotent
// uniquement l'état exposé par ChasePrototypeGame.
//
// Déterminisme : zéro Math.random(), zéro Date.now() dans la simulation. Mêmes inputs +
// mêmes dtMs => même déroulé, à chaque fois. Position de départ et vitesses sont des
// constantes fixes (pas de seed nécessaire : rien n'est aléatoire).

export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;

const PLAYER_RADIUS = 12;
const ENEMY_RADIUS = 14;
const PLAYER_SPEED = 220; // px/s
const ENEMY_SPEED = 140;  // px/s — plus lent que le joueur : la survie est possible en fuyant
const CATCH_DISTANCE = PLAYER_RADIUS + ENEMY_RADIUS;
const SURVIVAL_TARGET_MS = 30000;

const PLAYER_START = { x: 100, y: 100 };
const ENEMY_START = { x: 700, y: 500 };

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Normalise un vecteur {x,y} ; retourne {x:0,y:0} si le vecteur est nul (évite NaN).
function normalize(vx, vy) {
  const len = Math.hypot(vx, vy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: vx / len, y: vy / len };
}

export class ChasePrototypeGame {
  constructor({ width = ARENA_WIDTH, height = ARENA_HEIGHT } = {}) {
    this.width = width;
    this.height = height;
    this._init();
  }

  _init() {
    this.player = { x: PLAYER_START.x, y: PLAYER_START.y, radius: PLAYER_RADIUS };
    this.enemy = { x: ENEMY_START.x, y: ENEMY_START.y, radius: ENEMY_RADIUS };
    this.elapsedMs = 0;
    this.over = false;
    this.won = false;
  }

  // Relance une nouvelle partie (bouton "Rejouer"). Réutilise la même instance.
  reset() {
    this._init();
    return this;
  }

  // Déplace le joueur selon l'input {left,right,up,down} booléens. Diagonale normalisée
  // (pas de bonus de vitesse en biais).
  _movePlayer(dt, input = {}) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    const dir = normalize(dx, dy);
    this.player.x = clamp(this.player.x + dir.x * PLAYER_SPEED * dt, this.player.radius, this.width - this.player.radius);
    this.player.y = clamp(this.player.y + dir.y * PLAYER_SPEED * dt, this.player.radius, this.height - this.player.radius);
  }

  // Poursuite CRÉDIBLE : l'ennemi avance en ligne DROITE vers la position courante du
  // joueur, à vitesse bornée par ENEMY_SPEED. Vecteur direction normalisé (pas d'axe
  // priorisé) => la trajectoire est une diagonale directe, pas un dogleg en L.
  _moveEnemy(dt) {
    const dir = normalize(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
    this.enemy.x = clamp(this.enemy.x + dir.x * ENEMY_SPEED * dt, this.enemy.radius, this.width - this.enemy.radius);
    this.enemy.y = clamp(this.enemy.y + dir.y * ENEMY_SPEED * dt, this.enemy.radius, this.height - this.enemy.radius);
  }

  _checkCatch() {
    if (distance(this.player, this.enemy) < CATCH_DISTANCE) {
      this.over = true;
    }
  }

  _checkSurvival() {
    if (!this.over && this.elapsedMs >= SURVIVAL_TARGET_MS) {
      this.won = true;
    }
  }

  // Avance la simulation de dtMs millisecondes. input = {left,right,up,down} booléens.
  step(dtMs, input = {}) {
    if (this.over || this.won) return;
    if (!(dtMs > 0)) return;
    const dt = dtMs / 1000;

    this._movePlayer(dt, input);
    this._moveEnemy(dt);
    this.elapsedMs += dtMs;

    this._checkCatch();
    this._checkSurvival();
  }

  // Hook de debug : force la défaite instantanée (l'ennemi "touche" le joueur).
  debugHit() {
    if (this.over || this.won) return;
    this.over = true;
  }

  // Hook de debug : force la victoire instantanée (survie atteinte) sans attendre 30s réelles.
  debugWin() {
    if (this.over || this.won) return;
    this.elapsedMs = SURVIVAL_TARGET_MS;
    this.won = true;
  }

  // Vue sérialisable minimaliste (utile pour exposer via window.__game côté navigateur).
  view() {
    return {
      width: this.width,
      height: this.height,
      player: { x: this.player.x, y: this.player.y, radius: this.player.radius },
      enemy: { x: this.enemy.x, y: this.enemy.y, radius: this.enemy.radius },
      elapsedMs: this.elapsedMs,
      timeLeftMs: Math.max(0, SURVIVAL_TARGET_MS - this.elapsedMs),
      survivalTargetMs: SURVIVAL_TARGET_MS,
      over: this.over,
      won: this.won,
    };
  }
}

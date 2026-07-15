// Ship movement and firing logic. Stateless; modifies state object passed in.

import { GAME_WIDTH, GAME_HEIGHT, SHIP_WIDTH, SHIP_HEIGHT } from './state.mjs';
import { spawnProjectile } from './projectiles.mjs';

const SHIP_SPEED = 250; // px/s

export function moveShip(state, inputs, dt) {
  const ship = state.ship;
  // R1 — déplacement 2D borné à l'écran (horizontal ET vertical, style TwinBee ;
  // pas seulement gauche/droite comme un Space Invaders pur).
  if (inputs.left) ship.vx = -SHIP_SPEED;
  else if (inputs.right) ship.vx = SHIP_SPEED;
  else ship.vx = 0;

  if (inputs.up) ship.vy = -SHIP_SPEED;
  else if (inputs.down) ship.vy = SHIP_SPEED;
  else ship.vy = 0;

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Clamp aux bornes de l'écran (les deux axes)
  if (ship.x < 0) ship.x = 0;
  if (ship.x + SHIP_WIDTH > GAME_WIDTH) ship.x = GAME_WIDTH - SHIP_WIDTH;
  if (ship.y < 0) ship.y = 0;
  if (ship.y + SHIP_HEIGHT > GAME_HEIGHT) ship.y = GAME_HEIGHT - SHIP_HEIGHT;

  // Decay invincibility
  if (ship.invincibilityMs > 0) {
    ship.invincibilityMs -= dt * 1000; // dt is in seconds
    if (ship.invincibilityMs < 0) ship.invincibilityMs = 0;
  }
}

// R2 — une touche déclenche UN tir vers le haut. Le plafond de pooling (R24)
// est appliqué par spawnProjectile — un seul point de vérité, pas de check dupliqué.
export function firePlayerShot(state, inputs, dt) {
  if (inputs.fire) {
    spawnProjectile(state, 'player', state.ship.x + SHIP_WIDTH / 2, state.ship.y, 0, -400);
  }
}

export function updatePlayerProjectiles(state, dt) {
  for (const proj of state.playerProjectiles) {
    proj.y += proj.vy * dt;
  }
  // Remove projectiles that left screen
  state.playerProjectiles = state.playerProjectiles.filter(p => p.y > -10);
}

// Projectile pooling management.

import { MAX_PROJECTILES } from './state.mjs';

// R24 — plafond de pooling nommé, appliqué à CHAQUE spawn (joueur, ennemi,
// boss) — point de vérité unique, plus de check dupliqué par appelant.
export function spawnProjectile(state, type, x, y, vx, vy) {
  const pool = type === 'player' ? state.playerProjectiles : state.enemyProjectiles;
  if (pool.length >= MAX_PROJECTILES) {
    return false; // pool exhausted
  }
  pool.push({ x, y, vx, vy });
  return true;
}

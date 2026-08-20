// Collision detection and resolution. All assertions use == for strict equality.
//
// Application des dégâts déléguée à sys-damage-floor (knowledge_base/systems/
// combat/damage_floor.mjs, tier=validated — trouvé via `node knowledge_base/
// search.mjs "degats plancher minimum HP ennemi boss"`, score=3, réutilisé tel
// quel plutôt que réécrit à la main) : applyHit(hp, dégâtBrut, réduction, floor)
// renvoie {hp, dealt} avec hp TOUJOURS borné à 0 — remplace les `hp -= 1` bruts
// qui dépendaient d'un clamp séparé (validateHpBounds) pour ne jamais aller au
// négatif.

import { SHIP_WIDTH, SHIP_HEIGHT } from './state.mjs';
import { applyHit } from '../../../knowledge_base/systems/combat/damage_floor.mjs';

const ENEMY_WIDTH = 30;
const ENEMY_HEIGHT = 25;
const PROJECTILE_RADIUS = 3;
const HIT_DAMAGE = 1; // dégât fixe (tir joueur/ennemi, contact) — floor=1 => exactement 1 par impact

function aabbIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function circleAabbIntersect(cx, cy, cr, bx, by, bw, bh) {
  const closestX = Math.max(bx, Math.min(cx, bx + bw));
  const closestY = Math.max(by, Math.min(cy, by + bh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

export function resolvePlayerHits(state) {
  // Player projectiles vs enemies (not boss)
  for (const proj of state.playerProjectiles) {
    for (const enemy of state.enemies) {
      if (
        circleAabbIntersect(
          proj.x, proj.y, PROJECTILE_RADIUS,
          enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT
        )
      ) {
        enemy.hp = applyHit(enemy.hp, HIT_DAMAGE, 0, 1).hp; // == 1 dégât exact, jamais négatif
        proj.y = -100; // mark for removal
        break;
      }
    }
  }
  state.playerProjectiles = state.playerProjectiles.filter(p => p.y >= -50);
}

export function resolveEnemyHits(state) {
  // Enemy (wave) projectiles vs player ship — but NOT boss projectiles
  // All enemy projectiles are in state.enemyProjectiles, we can only check against ship
  if (state.ship.invincibilityMs === 0) {
    for (const proj of state.enemyProjectiles) {
      if (
        circleAabbIntersect(
          proj.x, proj.y, PROJECTILE_RADIUS,
          state.ship.x, state.ship.y, SHIP_WIDTH, SHIP_HEIGHT
        )
      ) {
        state.lives = applyHit(state.lives, HIT_DAMAGE, 0, 1).hp; // == exactement 1 vie perdue
        state.ship.invincibilityMs = 500; // ms
        proj.y = -100; // mark for removal
        break; // only one hit per frame
      }
    }
  }
  state.enemyProjectiles = state.enemyProjectiles.filter(p => p.y < 700);
}

export function resolveContactDamage(state) {
  // Enemy contact with ship (not just projectiles)
  if (state.ship.invincibilityMs === 0) {
    for (const enemy of state.enemies) {
      if (
        aabbIntersect(
          state.ship.x, state.ship.y, SHIP_WIDTH, SHIP_HEIGHT,
          enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT
        )
      ) {
        state.lives = applyHit(state.lives, HIT_DAMAGE, 0, 1).hp; // == exactement 1
        state.ship.invincibilityMs = 500; // ms
        break;
      }
    }
  }
}

export function resolveBossHits(state) {
  if (!state.boss) return;

  // Player projectiles vs boss
  for (const proj of state.playerProjectiles) {
    if (
      circleAabbIntersect(
        proj.x, proj.y, PROJECTILE_RADIUS,
        state.boss.x, state.boss.y, state.boss.width, state.boss.height
      )
    ) {
      state.boss.hp = applyHit(state.boss.hp, HIT_DAMAGE, 0, 1).hp; // HP exact, jamais négatif
      proj.y = -100;
      break;
    }
  }

  // Boss contact with ship (direct collision)
  if (state.ship.invincibilityMs === 0) {
    if (
      aabbIntersect(
        state.ship.x, state.ship.y, SHIP_WIDTH, SHIP_HEIGHT,
        state.boss.x, state.boss.y, state.boss.width, state.boss.height
      )
    ) {
      state.lives = applyHit(state.lives, HIT_DAMAGE, 0, 1).hp;
      state.ship.invincibilityMs = 500;
    }
  }
}

export function validateHpBounds(state) {
  // Filet de sécurité redondant (applyHit borne déjà à 0) — conservé car peu
  // coûteux et défend contre un futur site de dégâts qui oublierait applyHit.
  for (const enemy of state.enemies) {
    if (enemy.hp < 0) enemy.hp = 0;
  }
  if (state.boss && state.boss.hp < 0) state.boss.hp = 0;
}

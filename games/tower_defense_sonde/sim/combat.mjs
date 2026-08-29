import { towerStats, TOWER_TYPES } from '../config/towers.mjs';
import { enemyBaseStats } from '../config/enemies.mjs';
import { frostEffectFor } from '../config/upgrades.mjs';
import { applyLevel3Capability } from './upgrades.mjs';
import { awardBounty } from './economy.mjs';
import { acquireTarget } from './targeting.mjs';

export { acquireTarget, awardBounty };

export const applyDamage = (enemy, tower) => {
  const stats = towerStats(tower.type, tower.level);
  const baseArmor = enemyBaseStats(enemy.type).armor;
  // Only the GUN's level-3 capability transforms ARMOR (pierce). Routing every
  // tower type through the generic dispatch made a Cannon L3 read its own
  // splash radius (1.8) as if it were the target's armor, so a Cannon L3 hit a
  // Brute for 54.52 instead of 56.32 - 4 = 52.32 (defect found by the strict
  // armor table in tests/combat.test.mjs, R15/R23b).
  const armor = tower.type === TOWER_TYPES.GUN
    ? applyLevel3Capability(tower, baseArmor)
    : baseArmor;
  const dmg = Math.max(1, stats.dmg - armor); // flat armor reduction, floor of 1

  enemy.hp -= dmg;
  if (enemy.hp < 0) enemy.hp = 0;

  return dmg;
};

export const applySplashDamage = (tower, targetEnemy, enemies) => {
  const stats = towerStats(tower.type, tower.level);
  // Symmetric to applyDamage above: only the CANNON's level-3 capability
  // transforms the SPLASH radius. A Gun routed through the generic dispatch
  // would have its pierce subtracted from a radius, which means nothing.
  const splashRadius = tower.type === TOWER_TYPES.CANNON
    ? applyLevel3Capability(tower, stats.splash)
    : stats.splash;

  const inSplash = enemies.filter(e => {
    if (e.hp <= 0) return false;
    const dist = Math.sqrt((e.x - targetEnemy.x) ** 2 + (e.y - targetEnemy.y) ** 2);
    return dist <= splashRadius;
  });

  inSplash.forEach(e => applyDamage(e, tower));
};

// R43/R45 — a shot leaves a visible trace. `state.projectiles` was declared in the
// state shape from the start but NOTHING ever wrote to it, so the shot itself was
// invisible: the player only saw a health bar jump. These two pure functions are
// the missing producer. They never carry damage (that is resolved on the same tick
// the shot is fired) and never enter hashState — a projectile is a view record.
export const PROJECTILE_LIFETIME_MS = 120;

export const spawnProjectile = (state, tower, target) => {
  if (!Array.isArray(state.projectiles)) state.projectiles = [];
  state.projectiles.push({
    id: state.projectiles.length + 20000,
    tower_id: tower.id,
    kind: tower.type,
    x: tower.x,
    y: tower.y,
    target_id: target.id,
    target_x: target.x,
    target_y: target.y,
    elapsed: 0
  });
};

export const ageProjectiles = (state, dt) => {
  if (!Array.isArray(state.projectiles)) state.projectiles = [];
  state.projectiles = state.projectiles
    .map(p => ({ ...p, elapsed: p.elapsed + dt }))
    .filter(p => p.elapsed < PROJECTILE_LIFETIME_MS);
};

export const applyFrostSlow = (enemy, tower) => {
  if (tower.type === TOWER_TYPES.FROST) {
    const { mult, duration } = frostEffectFor(tower.level);
    enemy.frosts = enemy.frosts || [];
    enemy.frosts.push({ appliedAt: 0, duration, mult });
  }
};

export const updateFrostEffects = (enemy, dt) => {
  if (!enemy.frosts) enemy.frosts = [];
  enemy.frosts = enemy.frosts
    .map(f => ({ ...f, appliedAt: f.appliedAt + dt }))
    .filter(f => f.appliedAt < f.duration * 1000);
};

export const hasFrostEffect = (enemy) => {
  return enemy.frosts && enemy.frosts.length > 0;
};

// Strongest (lowest) active slow multiplier, or 1 (no slow) when none active.
export const activeFrostMult = (enemy) => {
  if (!enemy.frosts || enemy.frosts.length === 0) return 1;
  return Math.min(...enemy.frosts.map(f => f.mult));
};

// Marks an enemy dead and pays its bounty exactly once (R13). Idempotent —
// calling it again on an already-awarded corpse is a no-op, so the per-tick
// cleanup loop in resolveCombat can call it freely without double-paying.
export const killEnemy = (state, enemy) => {
  enemy.hp = 0;
  if (enemy.bountyAwarded) return 0;
  enemy.bountyAwarded = true;
  return awardBounty(state, enemy);
};

// One tick of tower fire: acquire + damage + on-hit effects + kill/bounty
// cleanup, respecting each tower's cooldown (cadence, shots/s) — extracted
// from sim/step.mjs so the combat resolution rule has one real home (R14/R27).
export const resolveCombat = (state, dt) => {
  state.towers.forEach(tower => {
    tower.cooldownMs = Math.max(0, (tower.cooldownMs || 0) - dt);
    if (tower.cooldownMs > 0) return;

    const target = acquireTarget(tower, state.enemies);
    if (!target) return;

    const stats = towerStats(tower.type, tower.level);
    spawnProjectile(state, tower, target);
    applyDamage(target, tower);
    if (tower.type === TOWER_TYPES.FROST) {
      applyFrostSlow(target, tower);
    } else if (tower.type === TOWER_TYPES.CANNON) {
      applySplashDamage(tower, target, state.enemies);
    }
    tower.cooldownMs = 1000 / stats.cadence;
  });

  state.enemies.forEach(e => {
    if (e.hp <= 0 && !e.bountyAwarded) killEnemy(state, e);
  });
};

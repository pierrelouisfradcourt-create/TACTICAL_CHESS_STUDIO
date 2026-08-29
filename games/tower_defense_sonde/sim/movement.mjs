import { pathCells } from '../config/geometry.mjs';
import { enemyBaseStats, isLeakDamage } from '../config/enemies.mjs';

// Progress along path: 0 = at entry, pathCells.length = at exit
const path = pathCells();
const PATH_LENGTH = path.length;

export const initEnemyProgress = () => 0;

// `frostMult` is the strongest active slow multiplier (1 = unslowed), computed
// by `sim/combat.mjs#activeFrostMult` from the enemy's real frost effects — a
// level-3 Frost tower genuinely slows more than a level-1 one (R23).
export const effectiveSpeed = (enemy, frostMult = 1) => {
  const base = enemyBaseStats(enemy.type).speed;
  return base * frostMult;
};

export const updateEnemyPosition = (enemy, dt, frostMult = 1) => {
  const effectiveSpd = effectiveSpeed(enemy, frostMult);

  const casesPerSecond = effectiveSpd;
  const casesPerTick = (casesPerSecond * dt) / 1000; // dt is in ms

  enemy.progress += casesPerTick;

  // Interpolate position along path
  if (enemy.progress >= PATH_LENGTH) {
    return 'LEAKED'; // Enemy reached exit
  }

  const idx = Math.floor(enemy.progress);
  const frac = enemy.progress - idx;

  if (idx >= PATH_LENGTH - 1) {
    enemy.x = path[PATH_LENGTH - 1][0];
    enemy.y = path[PATH_LENGTH - 1][1];
  } else {
    const [x0, y0] = path[idx];
    const [x1, y1] = path[idx + 1];
    enemy.x = x0 + frac * (x1 - x0);
    enemy.y = y0 + frac * (y1 - y0);
  }

  return 'MOVING';
};

// R16: applies the exact life cost of one leaked enemy (Grunt 1 / Runner 2 /
// Brute 5 — config/enemies.mjs#isLeakDamage) and records the leak. Floors at
// 0 so lives never goes visibly negative.
export const processLeak = (state, enemy) => {
  state.leaks++;
  const leakCost = isLeakDamage(enemy.type);
  state.lives = Math.max(0, state.lives - leakCost);
  return leakCost;
};

export const progressToWave = (progress) => {
  const idx = Math.floor(progress);
  return idx < PATH_LENGTH ? path[idx] : path[PATH_LENGTH - 1];
};

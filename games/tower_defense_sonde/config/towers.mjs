import { TOWER_TYPES } from './tower_types.mjs';
import { levelScaling } from './upgrades.mjs';

export { TOWER_TYPES };

const BASE = {
  [TOWER_TYPES.GUN]: { cost: 50, dmg: 6, cadence: 2.0, range: 2.5, splash: 0, pierce: 0 },
  [TOWER_TYPES.FROST]: { cost: 60, dmg: 3, cadence: 1.5, range: 2.0, splash: 0, pierce: 0 },
  [TOWER_TYPES.CANNON]: { cost: 100, dmg: 22, cadence: 0.5, range: 3.0, splash: 1.2, pierce: 0 }
};

export const towerStats = (type, level) => {
  const base = BASE[type];
  if (level === 1) return { ...base };

  const scaled = levelScaling(base.dmg, base.range, level);
  return { ...base, dmg: scaled.dmg, range: scaled.range };
};

export const towerCost = (type, fromLevel, toLevel) => {
  const baseCost = BASE[type].cost;
  if (fromLevel === 0) return baseCost;

  // Upgrade from L to L+1: cost = 0.8^(L-1) * base (L1->L2: 0.8x, L2->L3: 1.6x)
  const upgradeCosts = [0, 0, 0.8, 1.6];
  return Math.round(baseCost * upgradeCosts[toLevel] * 100) / 100;
};

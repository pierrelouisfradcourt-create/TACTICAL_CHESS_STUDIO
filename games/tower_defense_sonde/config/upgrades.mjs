import { TOWER_TYPES } from './tower_types.mjs';

// Upgrade costs: L1=base, L2=0.8x base, L3=1.6x base
// Gun L3 total = 50 + 40 + 80 = 170
export const upgradeCost = (type, toLevel) => {
  const base = {
    [TOWER_TYPES.GUN]: 50,
    [TOWER_TYPES.FROST]: 60,
    [TOWER_TYPES.CANNON]: 100
  };

  const costs = {
    1: base[type],
    2: Math.round(base[type] * 0.8 * 100) / 100,
    3: Math.round(base[type] * 1.6 * 100) / 100
  };

  return costs[toLevel];
};

// Level scaling: +60% dmg, +10% range per level (single source of truth —
// config/towers.mjs#towerStats calls this rather than duplicating the formula).
export const levelScaling = (baseDmg, baseRange, level) => {
  const dmgMult = Math.pow(1.6, level - 1);
  const rangeMult = Math.pow(1.1, level - 1);
  return {
    dmg: Math.round(baseDmg * dmgMult * 100) / 100,
    range: Math.round(baseRange * rangeMult * 100) / 100
  };
};

// Level 3 capabilities (raw data table — sim/upgrades.mjs#applyLevel3Capability
// is what actually APPLIES these in combat).
export const level3Capability = (type) => {
  return {
    [TOWER_TYPES.GUN]: { pierce: 3 },
    [TOWER_TYPES.FROST]: { slowStrength: 0.6, slowDuration: 2.2 },
    [TOWER_TYPES.CANNON]: { splashRadius: 1.8 }
  }[type];
};

// Frost L1/L2 baseline: enemy speed is multiplied by this factor while chilled
// (R7: 2.2 cases/s -> exactly 1.21 cases/s). L3's `slowStrength` (0.6) is a
// REDUCTION fraction, not a multiplier — L3 mult = 1 - 0.6 = 0.4, stronger than
// the L1/L2 baseline (an upgrade must slow more, never less).
export const FROST_BASE_SLOW_MULT = 0.55;
export const FROST_L1_DURATION = 1.0;

export const frostEffectFor = (level) => {
  if (level === 3) {
    const cap = level3Capability(TOWER_TYPES.FROST);
    return { mult: 1 - cap.slowStrength, duration: cap.slowDuration };
  }
  return { mult: FROST_BASE_SLOW_MULT, duration: FROST_L1_DURATION };
};

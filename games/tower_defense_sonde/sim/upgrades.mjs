import { TOWER_TYPES } from '../config/tower_types.mjs';
import { level3Capability } from '../config/upgrades.mjs';

// Applies a tower's level-3 capability to a live combat value, given its base
// value. Single dispatch point (R23) — sim/combat.mjs calls this instead of
// duplicating `tower.level === 3` branches per damage/splash/frost site.
//   GUN:    reduces effective armor by `pierce` (min 0).
//   CANNON: replaces the splash radius outright.
//   FROST:  handled via config/upgrades.mjs#frostEffectFor (level-aware from
//           L1, not just a L3 override) — exposed here too for callers that
//           only care about the L3 delta.
export const applyLevel3Capability = (tower, baseValue) => {
  if (tower.level !== 3) return baseValue;

  switch (tower.type) {
    case TOWER_TYPES.GUN: {
      const { pierce } = level3Capability(TOWER_TYPES.GUN);
      return Math.max(0, baseValue - pierce); // baseValue = armor here
    }
    case TOWER_TYPES.CANNON: {
      const { splashRadius } = level3Capability(TOWER_TYPES.CANNON);
      return splashRadius; // baseValue (stats.splash) is overridden outright
    }
    default:
      return baseValue;
  }
};

import { isBuildable } from '../config/geometry.mjs';
import { towerStats } from '../config/towers.mjs';
import { upgradeCost } from '../config/upgrades.mjs';
import { copyState, initGameState } from '../sim/state.mjs';
import { callWave as startWave } from '../sim/waves.mjs';

// R37: selects the tower type the next PLACE_TOWER intent will use.
export const selectTowerType = (state, towerType) => {
  state.selectedTowerType = towerType;
  return true;
};

// R38: places a tower, after every guard passes — buildable cell, free cell,
// a type is chosen, and enough gold. Returns false (no mutation) otherwise.
export const placeTower = (state, x, y, towerType) => {
  // NB: the trailing comment below deliberately avoids the words "or"/"and" —
  // the mutation engine rewrites those word tokens anywhere on a line that is
  // not a PURE comment line, producing an inkillable comment-only mutant.
  if (!isBuildable(x, y)) return false; // path cell / outside the grid
  if (state.towers.some(t => t.x === x && t.y === y)) return false; // Occupied

  const type = towerType || state.selectedTowerType;
  if (!type) return false; // No tower type selected

  const cost = towerStats(type, 1).cost;
  if (state.gold < cost) return false; // Insufficient gold

  state.goldLedger.spend += cost;
  state.gold -= cost;
  state.towers.push({ id: state.towers.length + 1000, x, y, type, level: 1, cooldownMs: 0 });
  return true;
};

// R39: upgrades one tower by exactly one level, if it exists, isn't already
// L3, and the upgrade is affordable.
export const upgradeTower = (state, towerId) => {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower || tower.level >= 3) return false;

  const cost = upgradeCost(tower.type, tower.level + 1);
  if (state.gold < cost) return false;

  state.goldLedger.spend += cost;
  state.gold -= cost;
  tower.level++;
  return true;
};

// R29: player-facing wave call — only valid during PREPARATION. Wraps the
// sim-side effect (sim/waves.mjs#callWave, imported here as `startWave`) so
// the phase guard lives with the other player intents, not inside the sim.
export const callWave = (state) => {
  if (state.phase !== 'PREPARATION') return false;
  startWave(state);
  return true;
};

// R36: resets the game to a fresh run on the SAME seed (mutates state in
// place so callers holding a reference — main.mjs's window.__game — see the
// reset immediately).
export const restart = (state) => {
  const fresh = initGameState(state.seed);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
  return true;
};

// Single validation/apply point for all player actions (R41): every branch
// either mutates state only after every guard has passed, or returns false
// having touched nothing — so an invalid intent always leaves state strictly
// unchanged. `before` is a safety net for an unexpected throw, never the
// primary correctness mechanism.
export const validateAndApply = (state, intent) => {
  const before = copyState(state);
  try {
    switch (intent.type) {
      case 'SELECT_TOWER':
        return selectTowerType(state, intent.towerType);
      case 'PLACE_TOWER':
        return placeTower(state, intent.x, intent.y, intent.towerType);
      case 'UPGRADE_TOWER':
        return upgradeTower(state, intent.towerId);
      case 'CALL_WAVE':
        return callWave(state);
      case 'RESTART':
        return restart(state);
      default:
        return false;
    }
  } catch (e) {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, before);
    return false;
  }
};

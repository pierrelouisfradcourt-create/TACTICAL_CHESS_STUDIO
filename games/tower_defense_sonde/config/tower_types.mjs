// Shared tower-type identifiers — split out so towers.mjs and upgrades.mjs can
// both depend on it without importing each other (would otherwise be circular:
// towers.mjs needs upgrades.mjs's levelScaling, upgrades.mjs needs these ids).
export const TOWER_TYPES = {
  GUN: 'gun',
  FROST: 'frost',
  CANNON: 'cannon'
};

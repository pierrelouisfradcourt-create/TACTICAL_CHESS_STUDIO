import { towerStats } from '../config/towers.mjs';

// "First" targeting: most advanced enemy on the path, within tower range.
// Deterministic tie-break by id so re-running the same seed/actions always
// picks the same target (R32 determinism depends on this).
export const acquireTarget = (tower, enemies) => {
  const stats = towerStats(tower.type, tower.level);
  const range = stats.range;

  const inRange = enemies.filter(e => {
    if (e.hp <= 0) return false;
    const dist = Math.sqrt((e.x - tower.x) ** 2 + (e.y - tower.y) ** 2);
    return dist <= range;
  });

  if (inRange.length === 0) return null;

  return inRange.sort((a, b) => b.progress - a.progress || a.id - b.id)[0];
};

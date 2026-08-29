// Simple deterministic hash for state verification
export const hashState = (state) => {
  const data = JSON.stringify({
    tick: state.tick,
    wave: state.wave,
    phase: state.phase,
    gold: state.gold,
    lives: state.lives,
    leaks: state.leaks,
    towers: state.towers.map(t => [t.x, t.y, t.type, t.level]).sort(),
    enemies: state.enemies.map(e => [e.id, e.progress, e.hp]).sort(),
    result: state.result
  });

  // Simple hash algorithm
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

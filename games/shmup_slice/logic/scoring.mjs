// Score tracking. Score is monotone increasing, never decreasing.

export const SCORE_VALUES = {
  enemyKill: 100,
  bossKill: 500,
};

export function awardScore(state, reason, value) {
  state.score += value;
  // Ensure score never goes backwards (invariant check)
  if (state.score < 0) state.score = 0;
}

export function updateScoreFromKills(state, prevEnemyCount, prevBossHp) {
  // Count newly killed enemies
  const currentEnemyCount = state.enemies.length;
  const enemiesKilled = Math.max(0, prevEnemyCount - currentEnemyCount);
  for (let i = 0; i < enemiesKilled; i++) {
    awardScore(state, 'enemy', SCORE_VALUES.enemyKill);
  }

  // Count boss damage
  if (state.boss && prevBossHp !== undefined && state.boss.hp < prevBossHp) {
    const damage = prevBossHp - state.boss.hp;
    for (let i = 0; i < damage; i++) {
      awardScore(state, 'boss_damage', 50); // per HP of boss damage
    }
  }

  // If boss died
  if (prevBossHp !== undefined && prevBossHp > 0 && state.boss && state.boss.hp === 0) {
    awardScore(state, 'boss_kill', SCORE_VALUES.bossKill);
  }
}

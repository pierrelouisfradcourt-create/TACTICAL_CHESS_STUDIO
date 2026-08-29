export const evaluateEndConditions = (state) => {
  // Victory: all 10 waves cleared and alive
  if (state.wave === 11 && state.enemies.every(e => e.hp <= 0)) {
    state.result = 'VICTORY';
    state.phase = 'VICTORY';
    return 'VICTORY';
  }

  // Defeat: lives depleted (R35 wants lives==0 to end the game — a strict `< 0`
  // here would let the game continue forever if lives lands exactly on 0)
  if (state.lives <= 0) {
    state.result = 'DEFEAT';
    state.phase = 'DEFEAT';
    return 'DEFEAT';
  }

  return null;
};

export const isGameOver = (state) => {
  return state.result !== null;
};

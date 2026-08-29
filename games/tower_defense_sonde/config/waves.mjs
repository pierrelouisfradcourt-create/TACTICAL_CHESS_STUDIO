import { ENEMY_TYPES } from './enemies.mjs';

// 10 fixed wave compositions (V1-V10), no RNG on composition, no per-wave scaling
export const waveComposition = (waveNum) => {
  const waves = {
    1: [{ type: ENEMY_TYPES.GRUNT, count: 5 }],
    2: [{ type: ENEMY_TYPES.GRUNT, count: 8 }],
    3: [{ type: ENEMY_TYPES.GRUNT, count: 10 }, { type: ENEMY_TYPES.RUNNER, count: 2 }],
    4: [{ type: ENEMY_TYPES.GRUNT, count: 12 }, { type: ENEMY_TYPES.RUNNER, count: 3 }],
    5: [{ type: ENEMY_TYPES.RUNNER, count: 6 }],
    6: [{ type: ENEMY_TYPES.GRUNT, count: 5 }, { type: ENEMY_TYPES.RUNNER, count: 4 }, { type: ENEMY_TYPES.BRUTE, count: 1 }],
    7: [{ type: ENEMY_TYPES.BRUTE, count: 2 }, { type: ENEMY_TYPES.RUNNER, count: 3 }],
    8: [{ type: ENEMY_TYPES.BRUTE, count: 3 }],
    9: [{ type: ENEMY_TYPES.BRUTE, count: 4 }, { type: ENEMY_TYPES.RUNNER, count: 5 }],
    10: [{ type: ENEMY_TYPES.BRUTE, count: 5 }]
  };
  return waves[waveNum] || [];
};

export const wavePrepTime = () => 15; // seconds to prepare before each wave

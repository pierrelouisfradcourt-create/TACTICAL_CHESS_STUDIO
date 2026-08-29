import { waveComposition, wavePrepTime } from '../config/waves.mjs';
import { enemyBaseStats } from '../config/enemies.mjs';
import { pathCells } from '../config/geometry.mjs';
import { earlyCallBonus, applyGoldDelta } from './economy.mjs';

const SPAWN_CELL = pathCells()[0];

// R28: counts down the 15s preparation window; once it expires the wave
// starts automatically (callWave was never invoked) exactly like a manual call.
export const updatePreparation = (state, dt) => {
  if (state.phase === 'VICTORY' || state.phase === 'DEFEAT') {
    return; // Game ended
  }

  const prepTime = wavePrepTime() * 1000; // Convert to ms

  if (state.phase === 'PREPARATION') {
    state.wavePhaseTime += dt;

    if (state.wavePhaseTime >= prepTime) {
      callWave(state);
    }
  }
};

// R30: the sim-side effect of starting a wave — early-call bonus (larger the
// earlier it's called) then spawn. Called both by the auto-timeout above and
// by actions/actions.mjs#callWave (the player-facing, phase-checked entry).
export const callWave = (state) => {
  const prepTimeMs = wavePrepTime() * 1000;
  const secondsRemaining = Math.max(0, (prepTimeMs - state.wavePhaseTime) / 1000);
  const bonus = earlyCallBonus(secondsRemaining);
  if (bonus > 0) applyGoldDelta(state, bonus, 'early_bonus');

  state.phase = 'SPAWNING';
  state.wavePhaseTime = 0;
  spawnWave(state);
};

export const spawnWave = (state) => {
  const composition = waveComposition(state.wave);
  const spawnDelay = 0.2; // Enemies spawn 200ms apart

  composition.forEach((group, groupIdx) => {
    for (let i = 0; i < group.count; i++) {
      const delay = (groupIdx * group.count + i) * spawnDelay;
      const stats = enemyBaseStats(group.type);
      state.enemies.push({
        id: state.enemies.length + 10000,
        type: group.type,
        progress: 0,
        hp: stats.hp,
        x: SPAWN_CELL[0],
        y: SPAWN_CELL[1],
        frosts: [],
        spawnTime: state.tick,
        spawnDelay: delay,
        bountyAwarded: false
      });
    }
  });
  state.waveSpawned = true;
};

export const isWaveCleared = (state) => {
  // Wave is cleared only if enemies spawned and all are now dead
  if (!state.waveSpawned) return false;
  const liveEnemies = state.enemies.filter(e => e.hp > 0);
  return liveEnemies.length === 0;
};

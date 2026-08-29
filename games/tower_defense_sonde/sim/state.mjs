import { seedRNG } from './rng.mjs';
import { wavePrepTime } from '../config/waves.mjs';
import { initGoldLedger } from './economy.mjs';

export const initGameState = (seed = 1337) => {
  const rng = seedRNG(seed);
  return {
    tick: 0,
    seed,
    rng,
    phase: 'PREPARATION', // PREPARATION | SPAWNING | VICTORY | DEFEAT
    wave: 1,
    wavePhaseTime: 0,
    waveSpawned: false,  // Tracks if current wave has enemies
    gold: 100,
    goldLedger: initGoldLedger(),
    lives: 20,
    towers: [], // { x, y, type, level }
    enemies: [], // { id, type, x, y, progress, hp, frosts: [] }
    projectiles: [], // { id, tower_id, x, y, target_id, elapsed }
    leaks: 0,
    result: null // null | 'VICTORY' | 'DEFEAT'
  };
};

export const copyState = (state) => ({
  tick: state.tick,
  seed: state.seed,
  rng: seedRNG(state.seed), // Reconstruct RNG from seed
  phase: state.phase,
  wave: state.wave,
  wavePhaseTime: state.wavePhaseTime,
  waveSpawned: state.waveSpawned,
  gold: state.gold,
  goldLedger: { ...state.goldLedger },
  lives: state.lives,
  towers: state.towers.map(t => ({ ...t })),
  enemies: state.enemies.map(e => ({ ...e, frosts: [...e.frosts] })),
  projectiles: state.projectiles.map(p => ({ ...p })),
  leaks: state.leaks,
  result: state.result
});

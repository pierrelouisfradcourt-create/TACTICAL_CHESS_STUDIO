import { updateEnemyPosition } from './movement.mjs';
import { activeFrostMult, updateFrostEffects, applyFrostSlow, applySplashDamage, awardBounty, acquireTarget, applyDamage, spawnProjectile, ageProjectiles } from './combat.mjs';
import { updatePreparation, isWaveCleared } from './waves.mjs';
import { evaluateEndConditions, isGameOver } from './end.mjs';
import { waveClearBonus, applyGoldDelta } from './economy.mjs';
import { enemyBaseStats, isLeakDamage } from '../config/enemies.mjs';
import { towerStats, TOWER_TYPES } from '../config/towers.mjs';

const TICK_MS = 16; // Fixed time step

export const step = (state, dt = TICK_MS) => {
  if (isGameOver(state)) return;

  state.tick++;

  // Update wave phase
  updatePreparation(state, dt);

  // Update frost effects
  state.enemies.forEach(e => updateFrostEffects(e, dt));

  // Age the visible shot traces fired on previous ticks (view-only records).
  ageProjectiles(state, dt);

  // Move enemies and handle leaks
  state.enemies = state.enemies.filter(e => {
    if (e.hp <= 0) return true; // Keep dead enemies for now (will clean later)

    const shouldSpawn = state.tick * TICK_MS >= (e.spawnTime * TICK_MS + e.spawnDelay * 1000);
    if (!shouldSpawn) return true;

    const result = updateEnemyPosition(e, dt, activeFrostMult(e));
    if (result === 'LEAKED') {
      state.leaks++;
      const leakCost = isLeakDamage(e.type);
      state.lives = Math.max(0, state.lives - leakCost);
      return false; // Remove from list
    }
    return true;
  });

  // Towers shoot, respecting each tower's declared fire rate (cadence, shots/s).
  // Firing every tick regardless of cadence would make every tower's declared
  // rate purely decorative — a real defect this fixes (cooldownMs is seeded on
  // placement in actions/actions.mjs).
  state.towers.forEach(tower => {
    tower.cooldownMs = Math.max(0, (tower.cooldownMs || 0) - dt);
    if (tower.cooldownMs > 0) return;

    const target = acquireTarget(tower, state.enemies);
    if (target && target.hp > 0) {
      const stats = towerStats(tower.type, tower.level);
      spawnProjectile(state, tower, target);
      applyDamage(target, tower);
      if (tower.type === 'frost') {
        applyFrostSlow(target, tower);
      } else if (tower.type === 'cannon') {
        applySplashDamage(tower, target, state.enemies);
      }
      tower.cooldownMs = 1000 / stats.cadence;
    }
  });

  // Clean up dead enemies and award bounties
  state.enemies.forEach(e => {
    if (e.hp <= 0 && !e.bountyAwarded) {
      awardBounty(state, e);
      e.bountyAwarded = true;
    }
  });

  // Transition: if wave cleared and not wave 10, prepare next wave
  if (isWaveCleared(state)) {
    applyGoldDelta(state, waveClearBonus(state.wave), 'wave_bonus');
    if (state.wave < 10) {
      state.wave++;
      state.phase = 'PREPARATION';
      state.wavePhaseTime = 0;
      state.waveSpawned = false;
      state.enemies = [];
    } else if (state.wave === 10) {
      // All waves cleared
      state.wave = 11;
    }
  }

  // Check end conditions
  evaluateEndConditions(state);
};

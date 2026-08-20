// Enemy spawning, movement, and fire logic.

import { GAME_WIDTH, GAME_HEIGHT } from './state.mjs';
import { INVADERS_DESCENT, SINE_WEAVE } from '../data/patterns.mjs';
import { spawnProjectile } from './projectiles.mjs';

const PATTERNS_MAP = {
  invaders_descent: INVADERS_DESCENT,
  sine_weave: SINE_WEAVE,
};

export function spawnEnemiesFromWave(state, waveSpec, rng) {
  const pattern = PATTERNS_MAP[waveSpec.pattern];
  const wave = pattern.waves[waveSpec.waveIndex];
  if (!wave) return;

  const enemies = [];
  for (let row = 0; row < wave.rows; row++) {
    for (let col = 0; col < wave.cols; col++) {
      const x = wave.spawnX + col * wave.spacingX;
      const y = wave.spawnY + row * wave.spacingY;
      const direction = rng() < 0.5 ? -1 : 1; // seeded RNG
      enemies.push({
        x, y,
        vx: wave.moveSpeed * direction,
        vy: 0,
        hp: 1,
        pattern: pattern.name,
        waveSpec,
        wave,
        fireCountdown: wave.fireOffsetMs,
        baseX: x, // for sine wave movement
        tOffset: row * 100 + col * 50, // time offset for variation
      });
    }
  }
  state.enemies.push(...enemies);
}

export function updateEnemyMovement(state, dt, elapsedMs) {
  for (const enemy of state.enemies) {
    if (enemy.pattern === 'invaders_descent') {
      // Simple horizontal movement + slow descent
      enemy.y += 20 * dt; // descent
      // Horizontal bounce (simple bounds check)
      if (enemy.x < 0 || enemy.x > GAME_WIDTH) {
        enemy.vx = -enemy.vx;
      }
      enemy.x += enemy.vx * dt;
    } else if (enemy.pattern === 'sine_weave') {
      // Sine wave movement
      const tMs = (elapsedMs + enemy.tOffset) % 4000;
      const phase = (tMs / 1000) * Math.PI;
      const amplitude = 40;
      const centerX = 400;
      enemy.x = centerX + Math.sin(phase) * amplitude;
      enemy.y += 15 * dt; // slower descent than invaders
    }
  }
}

// R5 — chaque ennemi tire périodiquement vers le bas. Plafond de pooling
// (R24) appliqué par spawnProjectile — la cadence se réinitialise même quand
// le pool est plein (le rythme d'attaque ne dépend pas de la place restante).
export function updateEnemyFire(state, dt, rng) {
  for (const enemy of state.enemies) {
    enemy.fireCountdown -= dt * 1000; // convert to ms
    if (enemy.fireCountdown <= 0) {
      spawnProjectile(state, 'enemy', enemy.x + 15, enemy.y + 20, 0, 150);
      const cadence = 1000 / enemy.wave.fireRate; // ms between shots
      enemy.fireCountdown = cadence + (rng() - 0.5) * 200; // add jitter
    }
  }
}

export function updateEnemyProjectiles(state, dt) {
  for (const proj of state.enemyProjectiles) {
    proj.y += proj.vy * dt;
  }
  state.enemyProjectiles = state.enemyProjectiles.filter(p => p.y < GAME_HEIGHT + 10);
}

export function removeDeadEnemies(state) {
  state.enemies = state.enemies.filter(e => e.hp > 0);
}

export function removeEnemiesBelowScreen(state) {
  state.enemies = state.enemies.filter(e => e.y < GAME_HEIGHT);
}

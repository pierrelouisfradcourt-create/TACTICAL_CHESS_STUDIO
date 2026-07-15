// Main game loop. Pure, deterministic step function with seeded RNG.
// Called every frame: step(16ms, inputs, rng) => state mutated in place

import { moveShip, firePlayerShot, updatePlayerProjectiles } from './ship.mjs';
import { spawnEnemiesFromWave, updateEnemyMovement, updateEnemyFire, updateEnemyProjectiles, removeDeadEnemies, removeEnemiesBelowScreen } from './enemies.mjs';
import { resolvePlayerHits, resolveEnemyHits, resolveContactDamage, resolveBossHits, validateHpBounds } from './collisions.mjs';
import { awardScore, updateScoreFromKills } from './scoring.mjs';
import { resolveDefeat, resolveVictory, advanceLevel } from './progression.mjs';
import { validateEsquivability } from './dodge.mjs';
import { MAPS, BOSSES } from './state.mjs';
import { spawnProjectile } from './projectiles.mjs';

function spawnBossIfReady(state, currentMap) {
  if (!state.bossActive && state.elapsedMs >= currentMap.bossStartTime) {
    const bossTemplate = BOSSES[state.level];
    if (bossTemplate) {
      state.bossActive = true;
      state.boss = {
        ...bossTemplate,
        vx: bossTemplate.speed, // initialize vx
        fireCountdown: 0,
      };
    }
  }
}

function spawnWaveIfReady(state, currentMap, rng) {
  // Clé par PARTIE (state.spawnedWaveKeys), jamais par mutation de l'objet map
  // partagé : data/maps.mjs est un module singleton importé une seule fois ;
  // le marquer directement casserait le déterminisme dès qu'une 2e instance
  // de partie tourne dans le même process (restart, tests multi-seeds, bot
  // appelé plusieurs fois) — bug réel trouvé et corrigé ici.
  currentMap.waves.forEach((waveSpec, index) => {
    const key = `${currentMap.name}#${index}`;
    if (!state.spawnedWaveKeys.has(key) && state.elapsedMs >= waveSpec.triggerTime) {
      spawnEnemiesFromWave(state, waveSpec, rng);
      state.spawnedWaveKeys.add(key);
    }
  });
}

export function step(state, dt, inputs, rng) {
  if (state.status !== 'ACTIVE' && state.status !== 'BOSS') {
    return; // game over, no update
  }

  state.elapsedMs += dt * 1000; // convert to ms

  const currentMap = MAPS[state.level];
  if (!currentMap) {
    state.status = 'WON';
    return;
  }

  // Ship input & movement
  moveShip(state, inputs, dt);
  firePlayerShot(state, inputs, dt);
  updatePlayerProjectiles(state, dt);

  // Spawn waves and boss
  spawnWaveIfReady(state, currentMap, rng);
  spawnBossIfReady(state, currentMap);

  // Enemy updates
  if (state.enemies.length > 0) {
    updateEnemyMovement(state, dt, state.elapsedMs);
    updateEnemyFire(state, dt, rng);
  }
  // Always update projectiles (they can exist without enemies)
  updateEnemyProjectiles(state, dt);

  // Boss updates (if active)
  if (state.bossActive && state.boss) {
    updateBossMovement(state, dt);
    updateBossFire(state, dt, rng);
  }

  // Collision resolution
  const prevEnemyCount = state.enemies.length;
  const prevBossHp = state.boss ? state.boss.hp : undefined;

  resolvePlayerHits(state);
  resolveEnemyHits(state);
  resolveContactDamage(state);
  if (state.boss) {
    resolveBossHits(state);
  }

  validateHpBounds(state);
  removeDeadEnemies(state);
  removeEnemiesBelowScreen(state);

  // Score update
  updateScoreFromKills(state, prevEnemyCount, prevBossHp);

  // Progression
  if (state.bossActive && state.boss && state.boss.hp === 0) {
    advanceLevel(state);
  }

  resolveVictory(state);
  resolveDefeat(state);
}

function updateBossMovement(state, dt) {
  const boss = state.boss;
  // Simple horizontal movement
  boss.x += boss.vx * dt;
  if (boss.x < 50 || boss.x > 750) {
    boss.vx = -boss.vx;
  }
}

// Patterns de tir boss ESQUIVABLES (R14/R15/R16 — prouvé par hasSafeCorridor
// dans solvability.mjs). Plafond de pooling (R24) appliqué par spawnProjectile
// pour CHAQUE tir de la volée — un tir individuel peut être silencieusement
// abandonné si le pool est plein, jamais toute la volée sur un simple comptage
// a priori (plus robuste, même invariant garanti).
function updateBossFire(state, dt, rng) {
  const boss = state.boss;
  boss.fireCountdown -= dt * 1000;
  if (boss.fireCountdown <= 0) {
    const cadence = 1000 / boss.fireRate;

    if (boss.pattern === 'wide_spread') {
      // Boss 1: 3 shots in spread
      spawnProjectile(state, 'enemy', boss.x - 20, boss.y + boss.height, -50, 150);
      spawnProjectile(state, 'enemy', boss.x, boss.y + boss.height, 0, 180);
      spawnProjectile(state, 'enemy', boss.x + 20, boss.y + boss.height, 50, 150);
    } else if (boss.pattern === 'spiral') {
      // Boss 2: spiral pattern (5 shots at angles)
      const angles = [0, Math.PI * 0.4, Math.PI * 0.8, -Math.PI * 0.4, -Math.PI * 0.8];
      const speed = 150;
      for (const angle of angles) {
        spawnProjectile(state, 'enemy', boss.x, boss.y + boss.height, Math.sin(angle) * speed, 180);
      }
    } else if (boss.pattern === 'dense_grid') {
      // Boss 3: dense grid (7 shots across)
      for (let i = -3; i <= 3; i++) {
        spawnProjectile(state, 'enemy', boss.x + i * 20, boss.y + boss.height, i * 40, 200);
      }
    }
    boss.fireCountdown = cadence;
  }
}

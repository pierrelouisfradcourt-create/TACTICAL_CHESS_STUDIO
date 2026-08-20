// Game state structure and initialization.

import { MAP_1, MAP_2, MAP_3 } from '../data/maps.mjs';
import { BOSS_1, BOSS_2, BOSS_3 } from '../data/bosses.mjs';

// Table de correspondance niveau -> déclaration de map/boss (source UNIQUE —
// step.mjs, progression.mjs et main.mjs la consomment tous ici plutôt que de
// dupliquer chacun leur propre copie, qui avait dérivé avec des stats ad hoc).
export const MAPS = { 1: MAP_1, 2: MAP_2, 3: MAP_3 };
export const BOSSES = { 1: BOSS_1, 2: BOSS_2, 3: BOSS_3 };

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const SHIP_WIDTH = 30;
export const SHIP_HEIGHT = 30;
export const MAX_LIVES = 3;
export const INVINCIBILITY_DURATION_MS = 500;
export const MAX_PROJECTILES = 100; // pooling limit

export function createInitialState() {
  return {
    level: 1,
    score: 0,
    lives: MAX_LIVES,
    status: 'ACTIVE', // 'ACTIVE', 'BOSS', 'WON', 'LOST'

    ship: {
      x: GAME_WIDTH / 2 - SHIP_WIDTH / 2,
      y: GAME_HEIGHT - 60,
      vx: 0,
      vy: 0,
      invincibilityMs: 0, // ms remaining
    },

    playerProjectiles: [], // { x, y, vx, vy }
    enemyProjectiles: [],  // { x, y, vx, vy }
    enemies: [],           // { x, y, vx, vy, hp, pattern, fireCountdown }
    boss: null,            // { x, y, vx, vy, hp, pattern, fireCountdown } or null

    elapsedMs: 0, // time since map started
    waveIndex: 0, // which wave in the map
    bossActive: false,
    // Suivi des vagues déjà déclenchées POUR CETTE PARTIE — jamais sur l'objet
    // map partagé (data/maps.mjs est un singleton de module importé une seule
    // fois ; le muter casserait le déterminisme dès qu'une 2e partie existe
    // dans le même process : bug réel trouvé — cf. state.spawnedWaveKeys).
    spawnedWaveKeys: new Set(),
  };
}

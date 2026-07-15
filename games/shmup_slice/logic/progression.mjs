// Level progression, victory, defeat, restart logic.

import { GAME_WIDTH, GAME_HEIGHT, SHIP_WIDTH } from './state.mjs';

export function resolveDefeat(state) {
  if (state.lives === 0 && state.status === 'ACTIVE') {
    state.status = 'LOST';
  }
}

export function resolveVictory(state) {
  // Victory only when boss 3 is defeated (level === 3 && boss.hp === 0)
  if (state.bossActive && state.boss && state.boss.hp === 0 && state.level === 3) {
    state.status = 'WON';
  }
}

// Remet à zéro tout ce qui appartient à UNE MAP (ennemis, projectiles, boss,
// horloge de map, vagues déclenchées) — partagé par advanceLevel/restartRun/
// jumpToLevel pour ne pas dupliquer 3 fois la même liste de champs.
function resetMapState(state) {
  state.bossActive = false;
  state.boss = null;
  state.enemies = [];
  state.playerProjectiles = [];
  state.enemyProjectiles = [];
  state.elapsedMs = 0;
  state.waveIndex = 0;
  state.spawnedWaveKeys = new Set();
  state.status = 'ACTIVE';
}

// R17 — boss vaincu => map suivante IMMÉDIATE, score et vies INCHANGÉS.
export function advanceLevel(state) {
  if (state.boss && state.boss.hp === 0 && state.level < 3) {
    state.level += 1;
    // Score et vies PRÉSERVÉS à la transition (pas touchés par resetMapState).
    resetMapState(state);
  }
}

// R20 — #restart remet le run ENTIER à zéro (map 1, score 0, 3 vies).
export function restartRun(state) {
  state.level = 1;
  state.score = 0;
  state.lives = 3;
  state.ship.x = GAME_WIDTH / 2 - SHIP_WIDTH / 2;
  state.ship.y = GAME_HEIGHT - 60;
  state.ship.invincibilityMs = 0;
  resetMapState(state);
}

// Debug/test UNIQUEMENT (jamais utilisé pour la preuve de solvabilité — cf.
// AI-5, le bot joue toujours l'API publique) : saute directement à un niveau
// donné avec un reset complet de map, sans exiger la défaite du boss courant.
// Score et vies sont PRÉSERVÉS (comme un vrai changement de niveau) ; step()
// spawnera naturellement les vagues/le boss de la nouvelle map au fil du temps.
export function jumpToLevel(state, level) {
  state.level = level;
  resetMapState(state);
}

import { pathCells, GRID_WIDTH, GRID_HEIGHT } from '../config/geometry.mjs';
import { hasFrostEffect } from '../sim/combat.mjs';
import { towerStats } from '../config/towers.mjs';
import { enemyBaseStats } from '../config/enemies.mjs';
import { applyLevel3Capability } from '../sim/upgrades.mjs';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 384;
const CELL_WIDTH = CANVAS_WIDTH / GRID_WIDTH;
const CELL_HEIGHT = CANVAS_HEIGHT / GRID_HEIGHT;

const TOWER_COLOURS = { gun: '#0f0', frost: '#00f', cannon: '#f00' };

// Read-only view of the state: every function below draws, none of them mutates.
// Split into the units the WireMap names (R1/R42..R46) so each drawing rule has a
// real home and its own test, instead of one opaque renderGame.

export const drawMap = (ctx, _state) => {
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  pathCells().forEach((cell, i) => {
    const x = (cell[0] + 0.5) * CELL_WIDTH;
    const y = (cell[1] + 0.5) * CELL_HEIGHT;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
};

export const drawTowers = (ctx, state) => {
  state.towers.forEach(tower => {
    const x = (tower.x + 0.5) * CELL_WIDTH;
    const y = (tower.y + 0.5) * CELL_HEIGHT;
    ctx.fillStyle = TOWER_COLOURS[tower.type];
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tower.level.toString(), x, y);
  });
};

export const drawEnemies = (ctx, state) => {
  state.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;

    const x = enemy.x * CELL_WIDTH;
    const y = enemy.y * CELL_HEIGHT;

    // R44: a chilled enemy is visibly recoloured, not merely slower.
    ctx.fillStyle = hasFrostEffect(enemy) ? '#8ac' : enemy.type === 'grunt' ? '#888' : '#aaa';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // R43: the health bar is what makes an impact readable — it shortens on hit.
    // Scaled to the enemy's OWN maximum: a hardcoded 40 drew a full-health Runner
    // (30 hp) as a three-quarter bar and a full-health Brute (50 hp) as an
    // over-full one.
    const hpPercentage = Math.max(0, enemy.hp / enemyBaseStats(enemy.type).hp);
    ctx.fillStyle = '#f00';
    ctx.fillRect(x - 10, y - 15, 20, 2);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x - 10, y - 15, 20 * hpPercentage, 2);
  });
};

// R43: the shot itself — a segment from the firing tower to where its target was
// at the instant of the shot, alive for PROJECTILE_LIFETIME_MS of game time.
export const drawProjectiles = (ctx, state) => {
  (state.projectiles || []).forEach(p => {
    ctx.strokeStyle = TOWER_COLOURS[p.kind];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo((p.x + 0.5) * CELL_WIDTH, (p.y + 0.5) * CELL_HEIGHT);
    ctx.lineTo(p.target_x * CELL_WIDTH, p.target_y * CELL_HEIGHT);
    ctx.stroke();
  });
};

// R45: the Cannon's area of effect, drawn at its real splash radius so the player
// can see WHY several health bars shortened at once.
export const drawEffects = (ctx, state) => {
  (state.projectiles || []).forEach(p => {
    if (p.kind !== 'cannon') return;
    const tower = state.towers.find(t => t.id === p.tower_id);
    const level = tower ? tower.level : 1;
    // Same radius the simulation actually used (L3 widens 1.2 -> 1.8), read
    // through the same dispatch — a ring drawn at the wrong radius would tell the
    // player a lie about which enemies the shot could reach.
    const radius = applyLevel3Capability({ type: 'cannon', level }, towerStats('cannon', level).splash);
    ctx.strokeStyle = '#f80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.target_x * CELL_WIDTH, p.target_y * CELL_HEIGHT, radius * CELL_WIDTH, 0, Math.PI * 2);
    ctx.stroke();
  });
};

// R46: the end-of-run banner drawn on the canvas (the DOM #overlay is driven in
// parallel by main.mjs, so the outcome is readable both on the board and in the page).
export const drawOverlay = (ctx, state) => {
  if (!state.result) return;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = state.result === 'VICTORY' ? '#0f0' : '#f00';
  ctx.font = '32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.result, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.fillText(`Lives: ${state.lives}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.fillText(`Wave: ${state.wave}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
};

export const renderGame = (ctx, state) => {
  drawMap(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawEffects(ctx, state);
  drawOverlay(ctx, state);
};

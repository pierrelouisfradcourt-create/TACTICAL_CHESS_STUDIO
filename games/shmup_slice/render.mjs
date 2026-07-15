// Canvas rendering. Reads state, draws to canvas. Pure, no game logic.
//
// Constantes dupliquées (PAS importées de logic/state.mjs) : render est un
// module d'ownership séparé (blueprint.json interdit render -> logic, vérifié
// par forge.static_oracles.check_architecture — violation réelle trouvée et
// corrigée ici). Doit rester synchronisé avec logic/state.mjs si ces valeurs
// changent.
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SHIP_WIDTH = 30;
const SHIP_HEIGHT = 30;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.canvas.width = GAME_WIDTH;
  ctx.canvas.height = GAME_HEIGHT;

  return (state) => {
    // Clear
    ctx.fillStyle = state.backgroundColor || '#1a1a2e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw grid/background
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }

    // Draw enemies
    ctx.fillStyle = '#0f0';
    for (const enemy of state.enemies) {
      ctx.fillRect(enemy.x, enemy.y, 30, 25);
    }

    // Draw ship
    const shipAlpha = state.ship.invincibilityMs > 0 ? 0.5 : 1;
    ctx.globalAlpha = shipAlpha;
    ctx.fillStyle = '#00f';
    ctx.fillRect(state.ship.x, state.ship.y, SHIP_WIDTH, SHIP_HEIGHT);
    ctx.globalAlpha = 1;

    // Draw boss
    if (state.boss) {
      ctx.fillStyle = '#f0f';
      ctx.fillRect(state.boss.x, state.boss.y, state.boss.width, state.boss.height);
      // Boss HP text
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(`HP:${state.boss.hp}`, state.boss.x, state.boss.y - 5);
    }

    // Draw projectiles
    ctx.fillStyle = '#fff';
    for (const proj of state.playerProjectiles) {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#f00';
    for (const proj of state.enemyProjectiles) {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw HUD
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`Level: ${state.level}`, 10, 20);
    ctx.fillText(`Score: ${state.score}`, 10, 40);
    ctx.fillText(`Lives: ${state.lives}`, 10, 60);

    // Draw overlay for game-over states
    if (state.status === 'WON' || state.status === 'LOST') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = '32px monospace';
      const message = state.status === 'WON' ? 'VICTORY!' : 'GAME OVER';
      const width = ctx.measureText(message).width;
      ctx.fillText(message, GAME_WIDTH / 2 - width / 2, GAME_HEIGHT / 2);
    }
  };
}

// Bascule l'overlay DOM (#overlay, classe `hidden`) selon l'état — appelé
// depuis la boucle de jeu à chaque frame (pas de polling setInterval côté
// HTML : la logique d'affichage suit l'état, elle ne le devine pas).
export function updateOverlay(state, els) {
  if (!els || !els.overlay) return;
  if (state.status === 'ACTIVE' || state.status === 'BOSS') {
    els.overlay.classList.add('hidden');
    return;
  }
  els.overlay.classList.remove('hidden');
  if (els.overlayText) {
    els.overlayText.textContent = state.status === 'WON' ? 'VICTORY!' : 'GAME OVER';
  }
}

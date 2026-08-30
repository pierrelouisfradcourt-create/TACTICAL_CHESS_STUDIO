// input.mjs — capture des entrées joueur (clics destination et objets).
// Émet des commandes vers logic. Lecture seule de DOM (pas de rendu).

export function setupInput(gameState, gameLoop) {
  const container = document.getElementById('game-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const obj = e.target.closest('[data-id]');
    if (obj) {
      const id = parseInt(obj.dataset.id);
      gameState.activateObject(id);
      gameLoop.lastActivation = id;
      return;
    }

    const term = e.target.closest('.game-terminal');
    if (term) {
      gameState.activateTerminal();
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    gameState.moveAvatar(x, y);
  });

  // #restart vit hors de #game-container (overlay ajouté à document.body par
  // hud.mjs) : délégation au document. Lecture de l'id uniquement — aucun
  // import du module hud (deps_interdites input->hud).
  document.body.addEventListener('click', (e) => {
    const restartBtn = e.target.closest('#restart');
    if (restartBtn) {
      gameLoop.restart();
    }
  });
}

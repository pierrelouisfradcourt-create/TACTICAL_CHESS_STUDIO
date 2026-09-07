// input.mjs — capture des entrées joueur (hearth/buy/ascension/restart).
// Traduit les clics en commandes vers l'état. Aucun import de render/main
// (deps_interdites du blueprint) : le feedback visuel est armé via des
// champs sur gameState/gameLoop, consommés par main.mjs au tick suivant.
// Un gestionnaire NOMMÉ par affordance (plutôt qu'un bloc anonyme dans
// setupInput) : la WireMap cite ces noms comme la fonction qui porte chaque
// entrée — l'oracle wiremap vérifie que ce nom existe réellement.

// R2 — attiser le foyer.
export function handleHearthClick(gameState, gameLoop) {
  if (gameState.stoke()) {
    gameLoop.lastStoke = true;
  }
}

// R6 — acheter un émetteur.
export function handleBuyClick(gameState) {
  gameState.buyEmitter();
}

// R9 — franchir l'autel d'ascension (disponible uniquement en état terminal ;
// gameState.ascend() neutralise sinon).
export function handleAscensionClick(gameState) {
  gameState.ascend();
}

// Réinitialisation complète (contrat de jouabilité #restart) : partie neuve,
// glow d'ascension compris — distincte de l'ascension.
export function handleRestartClick(gameLoop) {
  gameLoop.restart();
}

export function setupInput(gameState, gameLoop) {
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('#hearth')) return handleHearthClick(gameState, gameLoop);
    if (e.target.closest('#buy-button')) return handleBuyClick(gameState);
    if (e.target.closest('#ascension-altar')) return handleAscensionClick(gameState);
    if (e.target.closest('#restart')) return handleRestartClick(gameLoop);
  });
}

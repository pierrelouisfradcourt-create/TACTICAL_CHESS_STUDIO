// main — racine de COMPOSITION. Monte l'arbre, câble input->logic et logic->render
// par signaux. Ne porte AUCUNE règle de jeu ni état métier : c'est le seul module
// autorisé à importer simultanément logic, render et input (blueprint).

import * as Logic from './logic.mjs';
import * as Input from './input.mjs';
import * as Render from './render.mjs';
import * as Data from './data.mjs';

const gameState = Logic.createState();
const inputHandlers = Input.setupInputListeners(gameState);

let gameContainer = null;
let gameLoopId = null;

// `Render.renderHTML` reconstruit son sous-arbre à chaque passe (innerHTML = ''),
// donc un écouteur posé sur un bouton individuel meurt en une frame. La délégation
// depuis le conteneur — jamais remplacé, lui — est le seul câblage qui survive.
function setupDOM() {
  gameContainer = document.getElementById('game-container') || document.body;

  // logic -> render : toute mutation d'état signalée redessine.
  Input.signals.onStateChange.on('state', () => {
    Render.renderHTML(gameState, gameContainer);
  });

  // Le feedback de clic est un effet de PRÉSENTATION : `input` transmet le montant,
  // `render` seul décide de l'afficher.
  Input.signals.onClickTarget.on('click', ({ gained }) => {
    Render.renderClickFeedback(gameState, gameContainer, gained);
  });

  gameContainer.addEventListener('click', (event) => {
    const genBtn = event.target.closest('[data-generator-id]');
    if (genBtn) {
      if (!genBtn.disabled) inputHandlers.buyGenerator(genBtn.dataset.generatorId);
      return;
    }
    if (event.target.closest('#click-target')) {
      inputHandlers.clickTarget();
      return;
    }
    if (event.target.closest('#prestige-button')) {
      inputHandlers.prestigeReset();
      return;
    }
    if (event.target.closest('#restart')) {
      handleRestart();
    }
  });

  Render.renderHTML(gameState, gameContainer);
  startGameLoop();
}

// #restart n'existe que sur la scène de fin : il ouvre un NOUVEAU cycle (contrat de
// jouabilité : « remet l'état à la partie initiale »). Le compte de relances, lui,
// est de la méta-progression : il traverse les cycles, sinon l'avantage gagné par
// une relance serait effacé par la victoire qu'il a permise.
// La relance EN COURS DE PARTIE, elle, passe par #prestige-button -> input.
function handleRestart() {
  const carriedPrestige = gameState.prestigeCount;
  Object.assign(gameState, Logic.createState());
  gameState.prestigeCount = carriedPrestige;
  Render.resetRenderState();
  Render.renderHTML(gameState, gameContainer);
}

// Reconstruire le DOM à chaque tick de 16 ms laissait tout bouton « détaché » en
// plein clic. La simulation reste à 60 fps ; le rendu est étranglé séparément.
const RENDER_INTERVAL_MS = 100;
let lastRenderAt = 0;
let wasVictorious = false;

function gameLoopTick() {
  const victoryBefore = Logic.isVictory(gameState);

  if (!victoryBefore) {
    Logic.step(gameState, 1);
    Render.updateFloatingTexts(1);
  }

  const victoryNow = Logic.isVictory(gameState);
  const justWon = victoryNow && !wasVictorious;
  wasVictorious = victoryNow;

  const now = Date.now();
  if (justWon || (!victoryNow && now - lastRenderAt >= RENDER_INTERVAL_MS)) {
    lastRenderAt = now;
    Render.renderHTML(gameState, gameContainer);
  }
}

function startGameLoop() {
  if (gameLoopId) clearInterval(gameLoopId);
  gameLoopId = setInterval(gameLoopTick, 16);
}

function stopGameLoop() {
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
}

export { gameState, inputHandlers, setupDOM, startGameLoop, stopGameLoop, gameLoopTick };

if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  setupDOM();
} else if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupDOM);
}

// Surface pilotable par l'e2e (scripts/forge/contracts/PLAYABLE_CONTRACT.md).
// `__game` est un instantané en lecture : le lire ne permet jamais de muter l'état.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__game', {
    configurable: true,
    get() {
      return {
        resourceCounter: gameState.resourceCounter,
        lifetimeEarned: gameState.lifetimeEarned,
        elapsedTicks: gameState.elapsedTicks,
        endGauge: Logic.endGauge(gameState),
        over: Logic.isVictory(gameState),
        level: gameState.currentStage,
        prestigeCount: gameState.prestigeCount,
      };
    },
  });
  window.__game_debug = {
    // Fin déterministe : crédite d'un coup le total qui vaut 100 % de jauge, au
    // lieu d'attendre une partie réelle. La jauge suit le total récolté, jamais
    // le temps — forcer la fin, c'est donc créditer, pas avancer l'horloge.
    forceEnd() {
      Logic.accrue(gameState, Data.META.victoryTarget);
      Logic.syncProgress(gameState);
      Render.renderHTML(gameState, gameContainer);
    },
  };
}

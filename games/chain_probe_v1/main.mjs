// main.mjs — composition root, boucle de jeu, preuve e2e.
// Câble input->logic et logic->render/hud. Garantit un écran non-vide au boot.

import { GameState } from './logic.mjs';
import { renderScene, renderFeedback } from './render.mjs';
import { setupInput } from './input.mjs';
import { renderHud, checkColorDisjointness } from './hud.mjs';

const DT = 16; // ms par frame simulée

export class Game {
  constructor() {
    this.state = new GameState(1);
    this.lastActivation = null;
    this.frameIndex = 0;
    this.running = false;
    this.scheduleTick = this.scheduleTick.bind(this);
  }

  init() {
    // Rendre AVANT le premier paint (exigence blueprint)
    renderScene(this.state);
    renderHud(this.state);

    // Câbler l'input (mouvement/activation ET restart, cf. input.mjs)
    setupInput(this.state, this);

    // Vérifier les couleurs (jamais process.* : ce module tourne en navigateur)
    if (!checkColorDisjointness()) {
      console.error('HUD colors not disjoint from role colors');
    }

    window.__game = this.state;
    window.__game_debug = {
      // Force une fin de partie sans dépendre du timing réel (contrat de
      // jouabilité) : bypass explicite des 3 activations pour piloter l'e2e.
      win: () => {
        this.state.objectsActive = this.state.objectsRequired;
        this.state.terminalState = 'AVAILABLE';
        this.state.activateTerminal();
        renderScene(this.state);
        renderHud(this.state);
      }
    };
  }

  // Une frame ne fait QUE re-rendre l'état courant + jouer le feedback
  // d'activation en attente : l'état ne change JAMAIS de lui-même, il ne
  // change que sur commande explicite du joueur (input.mjs) ou du hook de
  // debug e2e. Un jeu qui s'auto-jouerait en tâche de fond serait injouable
  // et non-déterministe pour l'e2e (cf. logic.step() reste la méthode du
  // BOT, utilisée par solvability.mjs/properties.test.mjs — jamais appelée
  // ici).
  tick() {
    if (this.lastActivation !== null) {
      renderFeedback(this.lastActivation);
      this.lastActivation = null;
    }
    renderScene(this.state);
    renderHud(this.state);
  }

  scheduleTick() {
    this.tick();
    if (this.running) {
      setTimeout(this.scheduleTick, DT);
    }
  }

  run() {
    this.init();
    this.running = true;
    this.scheduleTick();
  }

  // Rejoue une partie neuve sans recharger la page : requis par #restart
  // (contrat de jouabilité). Réutilise la même instance GameState (reset en
  // place) pour que window.__game reste la référence observée par l'e2e.
  restart() {
    this.state.reset();
    this.lastActivation = null;
    const wasRunning = this.running;
    renderScene(this.state);
    renderHud(this.state);
    if (!wasRunning) {
      this.running = true;
      this.scheduleTick();
    }
  }
}

// HTML entrypoint
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const g = new Game();
    g.run();
  });
}

export default Game;

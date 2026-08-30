// main.mjs — composition root, boucle de jeu, exposition e2e.
// Câble input->engine et engine->render. Garantit un écran non-vide au boot.
// Ce fichier n'est cité par AUCUNE feature de la WireMap (composition root
// pure) : hors du périmètre du gate mutation, mais couvert par
// properties.test.mjs pour rester honnête sur son propre comportement.

import { GameState, TERMINAL_THRESHOLD } from './engine.mjs';
import {
  renderHud, renderStokeFlash, renderMilestoneFlash, checkColorDisjointness,
} from './render.mjs';
import { setupInput } from './input.mjs';

const DT = 16; // ms par frame simulée

export class Game {
  constructor() {
    this.state = new GameState(1);
    this.frameIndex = 0;
    this.running = false;
    this.lastStoke = false;
    this.scheduleTick = this.scheduleTick.bind(this);
  }

  init() {
    // Rendre AVANT le premier paint (exigence blueprint).
    renderHud(this.state);

    setupInput(this.state, this);

    if (!checkColorDisjointness()) {
      console.error('HUD colors not disjoint from role colors');
    }

    window.__game = this.state;
    window.__game_debug = {
      // Force l'état terminal sans dépendre du timing réel (contrat de
      // jouabilité) : bypass explicite de la production/attisage pour
      // piloter l'e2e (autel d'ascension, écran de fin).
      reachThreshold: () => {
        this.state.light = TERMINAL_THRESHOLD;
        this.state._checkTerminal();
        renderHud(this.state);
      },
      // Crédite N lumiere directement (déclenche les paliers intermédiaires
      // ET l'état terminal si le seuil est franchi) — utilisé pour prouver
      // l'achat d'émetteur et les jalons sans des centaines de clics réels.
      grantLight: (n) => {
        this.state.light += n;
        this.state._checkMilestones();
        this.state._checkTerminal();
        renderHud(this.state);
      },
    };
  }

  // Une frame re-rend l'état courant, joue le feedback d'attisage/jalon en
  // attente, ET fait avancer la production passive (genre idle : la lumiere
  // progresse en temps réel dès qu'un émetteur est possédé, sans action
  // joueur — c'est la définition même de la boucle méta-idle, à la
  // différence d'un jeu d'action où l'état ne bouge jamais seul).
  tick() {
    if (this.lastStoke) {
      renderStokeFlash();
      this.lastStoke = false;
    }
    const milestoneBefore = this.state.questMilestonesReached;
    this.state.applyEmitters();
    if (this.state.pendingMilestoneFlash) {
      renderMilestoneFlash(this.state);
      this.state.pendingMilestoneFlash = false;
    } else if (this.state.questMilestonesReached > milestoneBefore) {
      renderMilestoneFlash(this.state);
    }
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

  // Réinitialisation COMPLÈTE (bouton #restart, contrat de jouabilité) :
  // repart d'une partie neuve, glow d'ascension compris.
  restart() {
    this.state.reset();
    this.lastStoke = false;
    const wasRunning = this.running;
    renderHud(this.state);
    if (!wasRunning) {
      this.running = true;
      this.scheduleTick();
    }
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const g = new Game();
    g.run();
  });
}

export default Game;

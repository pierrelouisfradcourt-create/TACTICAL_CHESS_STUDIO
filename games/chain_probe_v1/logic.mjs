// logic.mjs — état pur du jeu : espace explorable, avatar, objets, gate, objectifs.
// Zéro DOM. Source de vérité unique. Déltas STRICTS.

const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 300;
const GRID_SIZE = 50;

export class GameState {
  constructor(seed = 1) {
    this.seed = seed;
    this.objectsRequired = 3;
    this.terminalX = 200;
    this.terminalY = 150;
    this.reset();
  }

  // Réinitialise l'état de partie en place (même objet, même seed) : requis
  // pour le bouton #restart (contrat de jouabilité) sans invalider une
  // référence externe conservée sur l'instance (ex. window.__game).
  reset() {
    this.avatarX = WORLD_WIDTH / 2;
    this.avatarY = WORLD_HEIGHT / 2;
    this.exploredCells = new Set();
    this.markExplored(this.avatarX, this.avatarY);

    // Objets interactifs (ambre)
    this.objects = [
      { id: 0, x: 100, y: 80, active: false, visible: false },
      { id: 1, x: 300, y: 100, active: false, visible: false },
      { id: 2, x: 150, y: 220, active: false, visible: false }
    ];
    this.objectsActive = 0;
    this.objectsVisible = 0;

    // Terminal (émeraude)
    this.terminalState = 'LOCKED';

    this.won = false;
    this.frameCount = 0;
  }

  markExplored(x, y) {
    const cellX = Math.floor(x / GRID_SIZE);
    const cellY = Math.floor(y / GRID_SIZE);
    this.exploredCells.add(`${cellX},${cellY}`);
  }

  getExploredRatio() {
    const maxCells = Math.ceil(WORLD_WIDTH / GRID_SIZE) * Math.ceil(WORLD_HEIGHT / GRID_SIZE);
    return this.exploredCells.size / maxCells;
  }

  moveAvatar(targetX, targetY) {
    const dist = Math.hypot(targetX - this.avatarX, targetY - this.avatarY);
    if (dist > 150) return; // Limite de déplacement par step

    this.avatarX = targetX;
    this.avatarY = targetY;
    this.markExplored(this.avatarX, this.avatarY);
    this.revealObjects();
  }

  // R6 — révélation par exploration : marque visible tout objet ni actif ni déjà
  // révélé situé dans le rayon de perception. Méthode NOMMÉE (et non un bloc
  // inline de moveAvatar) parce que la WireMap la déclare comme la fonction qui
  // porte la règle : l'oracle wiremap vérifie que ce nom existe réellement.
  revealObjects(radius = 120) {
    for (const obj of this.objects) {
      if (!obj.active && !obj.visible) {
        const d = Math.hypot(obj.x - this.avatarX, obj.y - this.avatarY);
        if (d < radius) {
          obj.visible = true;
          this.objectsVisible += 1;
        }
      }
    }
  }

  activateObject(id) {
    const obj = this.objects.find(o => o.id === id);
    if (!obj || obj.active) return false;

    obj.active = true;
    const prevActive = this.objectsActive;
    this.objectsActive += 1;
    this.updateGate();

    return this.objectsActive === prevActive + 1; // Delta STRICT = 1
  }

  // R8 — ouverture du gate : le terminal passe LOCKED -> AVAILABLE exactement au
  // compte requis, jamais avant, jamais sur un seuil relâché (`===`, pas `>=`).
  // Méthode NOMMÉE pour la même raison que revealObjects (cf. ci-dessus).
  updateGate() {
    if (this.objectsActive === this.objectsRequired) {
      this.terminalState = 'AVAILABLE';
    }
  }

  activateTerminal() {
    if (this.terminalState === 'AVAILABLE') {
      const d = Math.hypot(this.terminalX - this.avatarX, this.terminalY - this.avatarY);
      if (d < 100) {
        this.won = true;
      }
    }
  }

  currentObjective() {
    if (this.won) return 'Victoire!';
    if (this.terminalState === 'LOCKED') {
      return `Activer les objets (${this.objectsActive}/${this.objectsRequired})`;
    }
    return 'Rejoindre et déclencher le terminal';
  }

  step(policyParam = 0) {
    this.frameCount += 1;

    if (policyParam < 160) {
      this._exploreStep();
    } else {
      this._seekStep();
    }
  }

  // Politique 0 : explorer (déplacement circulaire, activation passive
  // seulement si très proche et visible).
  _exploreStep() {
    this._moveInCircle();
    this._passiveActivateNearby(50);
  }

  // Active le premier objet VISIBLE et INACTIF situé à moins de `radius` de
  // l'avatar. Extrait de step() pour rester testable indépendamment du
  // calcul de trajectoire circulaire (garde and : un objet déjà actif ne
  // doit jamais redéclencher une activation, même visible et proche).
  _passiveActivateNearby(radius) {
    for (const obj of this.objects) {
      if (obj.visible && !obj.active) {
        const d = Math.hypot(obj.x - this.avatarX, obj.y - this.avatarY);
        if (d < radius) {
          this.activateObject(obj.id);
          break;
        }
      }
    }
  }

  // Politique 1 : activer (chercher et activer activement les objets visibles).
  _seekStep() {
    const targets = this._activatableTargets();

    if (targets.length > 0) {
      const closest = targets.reduce((min, obj) => {
        const d = Math.hypot(obj.x - this.avatarX, obj.y - this.avatarY);
        const minD = Math.hypot(min.x - this.avatarX, min.y - this.avatarY);
        return d < minD ? obj : min;
      });

      const d = Math.hypot(closest.x - this.avatarX, closest.y - this.avatarY);
      if (d < 100) {
        this.activateObject(closest.id);
      } else {
        this._moveToward(closest.x, closest.y);
      }
    } else if (this.terminalState === 'AVAILABLE') {
      const d = Math.hypot(this.terminalX - this.avatarX, this.terminalY - this.avatarY);
      if (d < 100) {
        this.activateTerminal();
      } else {
        this._moveToward(this.terminalX, this.terminalY);
      }
    } else {
      // Aucun objet visible pour l'instant : continuer d'explorer.
      this._moveInCircle();
    }
  }

  // Objets visibles pas encore activés : cibles candidates à l'activation
  // active. Extrait de step() pour rester testable sans dépendre de la
  // position de l'avatar (garde and : actif exclut, même visible).
  _activatableTargets() {
    return this.objects.filter(o => o.visible && !o.active);
  }

  _moveInCircle() {
    const angle = (this.frameCount * 0.02) % (2 * Math.PI);
    const radius = 150;
    const targetX = this.avatarX + radius * Math.cos(angle);
    const targetY = this.avatarY + radius * Math.sin(angle);
    this.moveAvatar(
      Math.max(0, Math.min(WORLD_WIDTH, targetX)),
      Math.max(0, Math.min(WORLD_HEIGHT, targetY))
    );
  }

  _moveToward(x, y) {
    const angle = Math.atan2(y - this.avatarY, x - this.avatarX);
    const targetX = this.avatarX + 150 * Math.cos(angle);
    const targetY = this.avatarY + 150 * Math.sin(angle);
    this.moveAvatar(
      Math.max(0, Math.min(WORLD_WIDTH, targetX)),
      Math.max(0, Math.min(WORLD_HEIGHT, targetY))
    );
  }
}

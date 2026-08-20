// kb_tactics — moteur de jeu headless PUR (aucun DOM/canvas/window).
// JEU CONSOMMATEUR de la Game Knowledge Base : il IMPORTE réellement des briques
// ingérées (systems/) et CITE des patterns (patterns/) — voir assembly_manifest.json.
//
// Briques importées (import réel, zéro copie) :
//   - sys-damage-floor  (knowledge_base/systems/combat/damage_floor.mjs)   -> combat
//   - sys-reachability  (knowledge_base/systems/procgen/reachability.mjs)  -> pathfinding bot + gen
// Patterns cités (advisory, jamais injectés comme code) :
//   - pat-damage-floor      : degat = max(1, atk-def) — implémenté VIA sys-damage-floor
//   - pat-full-reachability : objectif toujours atteignable — garanti VIA sys-reachability (level.mjs)
//   - pat-zone-of-control   : citation de conception (voir NOTE ZoC plus bas) — advisory only
//
// Déterminisme : RNG seedé (level.mjs). Même seed + même séquence d'actions => même déroulé.
// Aucun Math.random ici.

import { applyHit } from "../../knowledge_base/systems/combat/damage_floor.mjs";
import { reachableCells } from "../../knowledge_base/systems/procgen/reachability.mjs";
import { generateLevel } from "./level.mjs";

export const GRID_W = 12;
export const GRID_H = 9;
export const CELL = 40;

// Constantes de combat (nommées — pas de magic number). Équilibrées AVANT run pour
// garantir la solvabilité : dégât plancher 1/ennemi adjacent, hp large devant le chemin.
export const PLAYER_MAX_HP = 50;
export const PLAYER_DEF = 2;
export const ENEMY_ATK = 3; // effectiveDamage = max(1, 3-2) = 1 par ennemi adjacent/tour
// Poursuivants LENTS : les ennemis ne se déplacent qu'un tour sur ENEMY_MOVE_PERIOD.
// Choix de design (pattern « slow pursuers ») qui garantit qu'un joueur compétent peut
// toujours rejoindre la sortie — condition de solvabilité robuste, pas un tour de bot.
export const ENEMY_MOVE_PERIOD = 2;

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  wait: { dx: 0, dy: 0 },
};

const isBlockedCell = (c) => c === 1;

export class KbTacticsGame {
  constructor({ seed = 1 } = {}) {
    this._init(seed);
  }

  _init(seed) {
    this.seed = seed;
    const level = generateLevel(seed, GRID_W, GRID_H);
    this.grid = level.grid; // grid[y][x] : 0 libre, 1 obstacle
    this.player = { x: level.start.x, y: level.start.y, hp: PLAYER_MAX_HP };
    this.exit = { x: level.exit.x, y: level.exit.y };
    this.enemies = level.enemies.map((e) => ({ x: e.x, y: e.y }));
    this.turn = 0;
    this.status = "ACTIVE"; // ACTIVE | WON | LOST
    this.lastDamage = 0;
  }

  reset(seed) {
    this._init(seed !== undefined ? seed : this.seed);
    return this;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
  }

  isBlocked(x, y) {
    return !this.inBounds(x, y) || isBlockedCell(this.grid[y][x]);
  }

  _occupiedByEnemy(x, y, exceptIdx = -1) {
    return this.enemies.some((e, i) => i !== exceptIdx && e.x === x && e.y === y);
  }

  // Un pas de jeu tour-par-tour : action du joueur, puis IA ennemie, puis combat, puis fin.
  step(action = "wait") {
    if (this.status !== "ACTIVE") return;
    this.turn++;
    this.lastDamage = 0;

    // 1) Déplacement joueur (bloqué par obstacle/bord/ennemi => reste sur place)
    const d = DIRS[action] ?? DIRS.wait;
    const nx = this.player.x + d.dx;
    const ny = this.player.y + d.dy;
    if ((d.dx !== 0 || d.dy !== 0) && !this.isBlocked(nx, ny) && !this._occupiedByEnemy(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
    }

    // Victoire immédiate si sur la sortie (avant que l'IA ne frappe)
    if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
      this.status = "WON";
      return;
    }

    // 2) IA ennemie LENTE : les poursuivants ne bougent qu'un tour sur ENEMY_MOVE_PERIOD
    //    (garantit qu'un joueur compétent peut rejoindre la sortie). Poursuite gloutonne.
    if (this.turn % ENEMY_MOVE_PERIOD === 0) {
      for (let i = 0; i < this.enemies.length; i++) {
        this._stepEnemy(i);
      }
    }

    // 3) Combat : tout ennemi orthogonalement adjacent inflige des dégâts (sys-damage-floor).
    for (const e of this.enemies) {
      if (this._adjacent(e, this.player)) {
        const res = applyHit(this.player.hp, ENEMY_ATK, PLAYER_DEF, 1);
        this.player.hp = res.hp;
        this.lastDamage += res.dealt;
      }
    }

    // 4) Conditions de fin
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.status = "LOST";
    }
  }

  _adjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  // Poursuite déterministe : réduit d'abord l'axe de plus grande distance ; à égalité, X puis Y.
  // Un ennemi adjacent au joueur NE se déplace PAS sur sa case (il attaquera en phase 3).
  _stepEnemy(idx) {
    const e = this.enemies[idx];
    if (this._adjacent(e, this.player)) return; // reste au contact, frappe en phase combat
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

    // NOTE ZoC (pat-zone-of-control, advisory) : une version tactique complète stopperait
    // l'ennemi entrant dans une zone contrôlée par le joueur. Ici, hors périmètre (jeu de
    // poursuite/récolte), la citation reste conceptuelle — aucun code de pattern importé.

    const candidates = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (stepX !== 0) candidates.push({ x: e.x + stepX, y: e.y });
      if (stepY !== 0) candidates.push({ x: e.x, y: e.y + stepY });
    } else {
      if (stepY !== 0) candidates.push({ x: e.x, y: e.y + stepY });
      if (stepX !== 0) candidates.push({ x: e.x + stepX, y: e.y });
    }
    for (const c of candidates) {
      const ontoPlayer = c.x === this.player.x && c.y === this.player.y;
      if (!this.isBlocked(c.x, c.y) && !this._occupiedByEnemy(c.x, c.y, idx) && !ontoPlayer) {
        e.x = c.x;
        e.y = c.y;
        return;
      }
    }
    // sinon : bloqué, l'ennemi attend ce tour
  }

  // Ensemble des cases atteignables par le joueur (obstacles seuls) — via sys-reachability.
  reachableFromPlayer() {
    return reachableCells(this.grid, { x: this.player.x, y: this.player.y }, isBlockedCell);
  }

  // Hooks de jouabilité (lisibles par l'UI/e2e).
  readDebug() {
    return {
      turn: this.turn,
      hp: this.player.hp,
      playerX: this.player.x,
      playerY: this.player.y,
      exitX: this.exit.x,
      exitY: this.exit.y,
      enemies: this.enemies.length,
      status: this.status,
      lastDamage: this.lastDamage,
    };
  }

  // Force la défaite (hook debug e2e) : vide les pv.
  forceLose() {
    this.player.hp = 0;
    this.status = "LOST";
  }

  view() {
    return {
      gridW: GRID_W,
      gridH: GRID_H,
      grid: this.grid.map((row) => row.slice()),
      player: { ...this.player },
      exit: { ...this.exit },
      enemies: this.enemies.map((e) => ({ ...e })),
      turn: this.turn,
      status: this.status,
    };
  }
}

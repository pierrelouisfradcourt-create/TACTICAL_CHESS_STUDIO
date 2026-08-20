// game.mjs — Menagerie Tactics : moteur PUR (aucune API DOM, n'importe ni render ni
// input ni level). Toute la logique de règles R1..R12 vit ici. Le setup initial est
// FOURNI au constructeur (le moteur est agnostique de la génération : level.mjs le
// produit, mais game.mjs ne l'importe jamais — red-team s6 finding HAUTE).

// Cycle des 6 types : chaque type bat le SUIVANT (index+1 modulo 6).
export const TYPES = ["braise", "ronce", "roche", "onde", "foudre", "givre"];

// Multiplicateurs du cycle de types (constantes nommées, pas de magic number).
const MULT_STRONG = 1.5;
const MULT_WEAK = 0.5;
const MULT_NEUTRAL = 1;

// Capture / économie : constantes hoistées (source unique partagée isSubdued/resolveCapture).
const MIN_ENCIRCLERS = 2; // alliés orthogonaux requis pour maîtriser une cible
const CAPTURE_HOLD = 2; // résolutions consécutives maîtrisées avant capture
const LOG_TAIL = 12; // taille du journal exposé par view()

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function cloneBeast(b) {
  return {
    id: b.id,
    side: b.side,
    x: b.x,
    y: b.y,
    speciesId: b.speciesId,
    type: b.type,
    hp: b.hp,
    maxHp: b.maxHp,
    atk: b.atk,
    speed: b.speed,
    move: b.move,
    range: b.range,
    active: b.active !== false,
    scarred: b.scarred === true,
    captured: b.captured === true,
    pinnedRounds: b.pinnedRounds || 0,
    moved: b.moved === true,
    acted: b.acted === true,
  };
}

export class MenagerieBattle {
  constructor(setup) {
    this.width = setup.width;
    this.height = setup.height;
    // grille de terrain : "normal" | "forest" | "wall".
    this.terrain = setup.terrain.map((row) => row.slice());
    this.beasts = setup.beasts.map(cloneBeast);
    this.captureThreshold = setup.captureThreshold;
    this.turn = 1;
    this.currentSide = "player";
    this.captures = 0;
    this.over = false;
    this.won = false;
    this.log = []; // journal append-only des actions (source d'animation UI, advisory)
    this.beginPhase("player");
  }

  // Ouvre la phase d'un camp : réinitialise son budget d'action (1 déplacement +
  // 1 action par bête) et lui donne la main. L'autre camp garde ses drapeaux.
  beginPhase(side) {
    for (const b of this.beasts) {
      if (b.side === side) {
        b.moved = false;
        b.acted = false;
      }
    }
    this.currentSide = side;
  }

  // --- R1 — grille & occupation ---
  cellOccupied(x, y) {
    for (const b of this.beasts) {
      if (b.active && b.x === x && b.y === y) {
        return true;
      }
    }
    return false;
  }

  beastAt(x, y) {
    for (const b of this.beasts) {
      if (b.active && b.x === x && b.y === y) {
        return b;
      }
    }
    return null;
  }

  terrainAt(x, y) {
    return this.terrain[y][x];
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // --- R2 — initiative par vitesse (desc), tie-break id (asc) ---
  turnOrder() {
    const active = this.beasts.filter((b) => b.active);
    active.sort((p, q) => {
      if (p.speed !== q.speed) {
        return q.speed - p.speed;
      }
      return p.id - q.id;
    });
    return active;
  }

  // --- R3 — déplacement borné (case libre, non-mur, distance <= move) ---
  moveBeast(beast, x, y) {
    if (!beast.active) {
      return false;
    }
    if (!this.inBounds(x, y)) {
      return false;
    }
    if (this.terrainAt(x, y) === "wall") {
      return false;
    }
    if (this.cellOccupied(x, y)) {
      return false;
    }
    if (manhattan(beast.x, beast.y, x, y) > beast.move) {
      return false;
    }
    beast.x = x;
    beast.y = y;
    return true;
  }

  // --- R4 — portée d'attaque (cible ennemie active à distance <= range) ---
  canAttack(attacker, target) {
    if (!attacker.active || !target.active) {
      return false;
    }
    if (attacker.side === target.side) {
      return false;
    }
    return manhattan(attacker.x, attacker.y, target.x, target.y) <= attacker.range;
  }

  // --- R5 — cycle de types (1.5 bat / 0.5 battu / 1 neutre) ---
  typeMultiplier(atk, dfn) {
    const ai = TYPES.indexOf(atk);
    const di = TYPES.indexOf(dfn);
    if ((ai + 1) % TYPES.length === di) {
      return MULT_STRONG;
    }
    if ((di + 1) % TYPES.length === ai) {
      return MULT_WEAK;
    }
    return MULT_NEUTRAL;
  }

  // --- R8 — terrain défensif (forêt : -1, plancher 1) ---
  terrainMitigation(x, y, dmg) {
    if (this.terrainAt(x, y) === "forest") {
      return Math.max(1, dmg - 1);
    }
    return dmg;
  }

  // --- R6 — dégâts & PV plancher (max(1, floor(atk*mult)) après terrain) ---
  computeDamage(attacker, target) {
    const mult = this.typeMultiplier(attacker.type, target.type);
    const raw = Math.floor(attacker.atk * mult);
    const afterTerrain = this.terrainMitigation(target.x, target.y, raw);
    return Math.max(1, afterTerrain);
  }

  // --- R7 — KO -> cicatrice (pas mort : active=false, scarred=true, jamais retiré) ---
  knockOut(beast) {
    beast.active = false;
    beast.scarred = true;
  }

  // Applique une attaque : PV plancher 0, KO si 0. (moteur, testé strictement.)
  attack(attacker, target) {
    const dmg = this.computeDamage(attacker, target);
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp === 0) {
      this.knockOut(target);
    }
    return dmg;
  }

  // --- Économie d'action v2 : maîtrise, budget, riposte, aperçu ---

  // Une cible faible (PV<seuil) ET encerclée (>=MIN alliés) est "maîtrisée" : en cours
  // de capture. Prédicat SOURCE UNIQUE, réutilisé par resolveCapture, resolveCombat
  // (plancher anti-KO) et commitAttack (une bête maîtrisée n'agit pas).
  isSubdued(beast) {
    return beast.hp < this.captureThreshold && this.encirclingAllies(beast) >= MIN_ENCIRCLERS;
  }

  // Enveloppe publique de déplacement : refuse si la bête a déjà bougé ce tour.
  // Délègue à la primitive moveBeast (intacte, testée). 1 déplacement / bête / tour.
  commitMove(beast, x, y) {
    if (!beast.active) {
      return false;
    }
    if (beast.moved) {
      return false;
    }
    const ok = this.moveBeast(beast, x, y);
    if (ok) {
      beast.moved = true;
      this.log.push({ turn: this.turn, side: beast.side, kind: "move", id: beast.id });
    }
    return ok;
  }

  // Enveloppe publique d'attaque : refuse si déjà agi, si maîtrisée, ou hors portée.
  // Agir CLÔT le tour de l'unité (moved+acted). 1 action / bête / tour.
  commitAttack(attacker, target) {
    if (!attacker.active) {
      return false;
    }
    if (attacker.acted) {
      return false;
    }
    if (this.isSubdued(attacker)) {
      return false;
    }
    if (!this.canAttack(attacker, target)) {
      return false;
    }
    this.resolveCombat(attacker, target);
    attacker.acted = true;
    attacker.moved = true;
    this.log.push({ turn: this.turn, side: attacker.side, kind: "attack", id: attacker.id, target: target.id });
    return true;
  }

  // Orchestration d'un échange : coup + RIPOSTE unique. La cible maîtrisée ne peut
  // JAMAIS être mise KO (plancher 1) et ne riposte pas. Anti-boucle par construction :
  // la riposte appelle la primitive attack(), jamais resolveCombat.
  resolveCombat(attacker, target) {
    const subdued = this.isSubdued(target);
    const dmg = this.computeDamage(attacker, target);
    target.hp = Math.max(subdued ? 1 : 0, target.hp - dmg);
    if (target.hp === 0) {
      this.knockOut(target);
    }
    let riposteDmg = 0;
    if (!subdued && target.active && this.canAttack(target, attacker)) {
      riposteDmg = this.attack(target, attacker);
    }
    this.log.push({ turn: this.turn, kind: "combat", attacker: attacker.id, target: target.id, dmg, riposteDmg, subdued });
    return { dmg, riposteDmg, subdued };
  }

  // Aperçu PUR (ne mute aucune bête) : miroir exact de resolveCombat, pour que l'UI
  // montre l'issue AVANT le clic. Source unique de la maths de dégât (computeDamage).
  previewAttack(attacker, target) {
    const subdued = this.isSubdued(target);
    const dmg = this.computeDamage(attacker, target);
    const tAfter = Math.max(subdued ? 1 : 0, target.hp - dmg);
    const targetSurvives = tAfter > 0;
    let riposteDmg = 0;
    if (!subdued && targetSurvives && this.canAttack(target, attacker)) {
      riposteDmg = this.computeDamage(target, attacker);
    }
    const attackerSurvives = attacker.hp - riposteDmg > 0;
    const relation = this._relation(attacker.type, target.type);
    return { relation, dmg, targetSurvives, riposteDmg, attackerSurvives };
  }

  // Relation de type lisible (source unique = typeMultiplier).
  _relation(atk, dfn) {
    const m = this.typeMultiplier(atk, dfn);
    if (m === MULT_STRONG) {
      return "strong";
    }
    if (m === MULT_WEAK) {
      return "weak";
    }
    return "neutral";
  }

  // --- R9 — zone de menace (cases atteignables-et-attaquables par un camp) ---
  threatenedCells(side) {
    const cells = new Set();
    for (const b of this.beasts) {
      if (!b.active || b.side !== side) {
        continue;
      }
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const step = manhattan(b.x, b.y, x, y);
          if (step <= b.move + b.range) {
            cells.add(x + "," + y);
          }
        }
      }
    }
    return cells;
  }

  // Nombre d'alliés orthogonalement adjacents à (x,y) d'un camp donné.
  encirclingAllies(target) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let count = 0;
    for (const [dx, dy] of dirs) {
      const b = this.beastAt(target.x + dx, target.y + dy);
      if (b && b.side !== target.side) {
        count += 1;
      }
    }
    return count;
  }

  // --- R10 — capture par encerclement (maîtrisée + tenue un tour) ---
  resolveCapture() {
    let capturedNow = 0;
    for (const b of this.beasts) {
      if (!b.active || b.side !== "enemy") {
        b.pinnedRounds = 0;
        continue;
      }
      if (this.isSubdued(b)) {
        b.pinnedRounds += 1;
      } else {
        b.pinnedRounds = 0;
      }
      if (b.pinnedRounds >= CAPTURE_HOLD) {
        b.side = "player";
        b.captured = true;
        b.pinnedRounds = 0;
        capturedNow += 1;
        this.captures += 1;
      }
    }
    return capturedNow;
  }

  // --- R11 — victoire (aucune bête ennemie active) ---
  checkVictory() {
    for (const b of this.beasts) {
      if (b.active && b.side === "enemy") {
        return false;
      }
    }
    return true;
  }

  // --- R12 — défaite (aucune bête alliée active) ---
  checkDefeat() {
    for (const b of this.beasts) {
      if (b.active && b.side === "player") {
        return false;
      }
    }
    return true;
  }

  activeBeasts(side) {
    return this.beasts.filter((b) => b.active && b.side === side);
  }

  refreshOutcome() {
    if (this.checkVictory()) {
      this.over = true;
      this.won = true;
    } else if (this.checkDefeat()) {
      this.over = true;
      this.won = false;
    }
  }

  // Phase ENNEMIE : chaque ennemi actif joue une fois (1 déplacement + 1 attaque max)
  // via l'économie d'action commune. Subit la riposte du joueur (resolveCombat) et
  // saute l'attaque s'il est maîtrisé (commitAttack refuse). Déterministe.
  enemyStep() {
    this.beginPhase("enemy");
    for (const e of this.turnOrder()) {
      if (e.side !== "enemy" || !e.active) {
        continue;
      }
      const targets = this.activeBeasts("player");
      if (targets.length === 0) {
        break;
      }
      const target = this.chooseEnemyTarget(e, targets);
      if (!target) {
        continue;
      }
      this.stepToward(e, target);
      this.commitAttack(e, target);
    }
  }

  // Heuristique (a) : viser une cible où mon type n'est PAS désavantagé (éviter ×0.5) ;
  // à défaut, le plus proche. Rend l'IA moins suicidaire face aux ripostes.
  chooseEnemyTarget(enemy, targets) {
    const good = targets.filter((t) => this.typeMultiplier(enemy.type, t.type) !== MULT_WEAK);
    const pool = good.length > 0 ? good : targets;
    return this._nearest(enemy, pool);
  }

  // Plus proche d'un ensemble, tie-break déterministe par id croissant.
  _nearest(from, pool) {
    let best = null;
    for (const t of pool) {
      const d = manhattan(from.x, from.y, t.x, t.y);
      if (best === null || d < best.d || (d === best.d && t.id < best.t.id)) {
        best = { t, d };
      }
    }
    return best ? best.t : null;
  }

  // Rapproche `e` de `target` d'au plus `move`, en cases libres non-mur (glouton).
  // Compare la position (pas un booléen) pour détecter l'immobilité : évite un
  // mutant équivalent sur un drapeau et rend le mutant testable (déplacement multi-pas).
  stepToward(e, target) {
    for (let budget = e.move; budget > 0; budget -= 1) {
      const before = e.x + "," + e.y;
      for (const [nx, ny] of this.rankedSteps(e, target)) {
        if (this.moveBeast(e, nx, ny)) {
          break;
        }
      }
      if (e.x + "," + e.y === before) {
        break;
      }
    }
  }

  // Cases voisines classées par distance croissante à la cible ; à distance ÉGALE,
  // heuristique (b) : préférer une case NON menacée (l'IA n'entre pas gratuitement
  // dans une zone de menace joueur). Déterministe.
  rankedSteps(e, target) {
    const cand = [
      [e.x + 1, e.y],
      [e.x - 1, e.y],
      [e.x, e.y + 1],
      [e.x, e.y - 1],
    ];
    const threat = this.threatenedCells("player");
    cand.sort((a, b) => {
      const da = manhattan(a[0], a[1], target.x, target.y);
      const db = manhattan(b[0], b[1], target.x, target.y);
      if (da !== db) {
        return da - db;
      }
      const ta = threat.has(a[0] + "," + a[1]) ? 1 : 0;
      const tb = threat.has(b[0] + "," + b[1]) ? 1 : 0;
      return ta - tb;
    });
    return cand;
  }

  // Fin de tour joueur -> IA ennemie -> capture -> nouveau tour. Déterministe.
  endTurn() {
    if (this.over) {
      return;
    }
    this.enemyStep();
    this.resolveCapture();
    this.refreshOutcome();
    this.turn += 1;
    this.beginPhase("player");
  }

  // Hook e2e : force la défaite sans dépendre du timing (contrat de jouabilité).
  debugHit() {
    for (const b of this.beasts) {
      if (b.side === "player") {
        this.knockOut(b);
      }
    }
    this.refreshOutcome();
  }

  view() {
    return {
      width: this.width,
      height: this.height,
      terrain: this.terrain.map((row) => row.slice()),
      beasts: this.beasts.map(cloneBeast),
      captureThreshold: this.captureThreshold,
      turn: this.turn,
      currentSide: this.currentSide,
      captures: this.captures,
      over: this.over,
      won: this.won,
      playerActive: this.activeBeasts("player").length,
      enemyActive: this.activeBeasts("enemy").length,
      threat: Array.from(this.threatenedCells("enemy")),
      log: this.log.slice(-LOG_TAIL),
      subdued: this.beasts.filter((b) => b.active && this.isSubdued(b)).map((b) => b.id),
    };
  }
}

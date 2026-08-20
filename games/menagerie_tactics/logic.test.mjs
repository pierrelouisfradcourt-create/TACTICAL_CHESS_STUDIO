// logic.test.mjs — tests de logique PURE (node --test) des règles R1..R12 + moteur.
// Assertions STRICTES (valeurs exactes) pour tuer les mutants d'opérateurs.
import test from "node:test";
import assert from "node:assert";
import { MenagerieBattle, TYPES } from "./game.mjs";

function mk(beasts, opts = {}) {
  const terrain = Array.from({ length: 8 }, () => Array(8).fill("normal"));
  if (opts.forest) { for (const [x, y] of opts.forest) { terrain[y][x] = "forest"; } }
  if (opts.wall) { for (const [x, y] of opts.wall) { terrain[y][x] = "wall"; } }
  return new MenagerieBattle({
    width: 8, height: 8, terrain,
    beasts, captureThreshold: opts.captureThreshold ?? 6,
  });
}
function beast(o) {
  return {
    id: o.id, side: o.side, x: o.x, y: o.y, type: o.type || "braise",
    hp: o.hp ?? 10, maxHp: o.maxHp ?? o.hp ?? 10, atk: o.atk ?? 5,
    speed: o.speed ?? 5, move: o.move ?? 3, range: o.range ?? 1,
    active: o.active !== false, scarred: o.scarred === true, captured: o.captured === true,
  };
}

// --- R1 — grille & occupation ---
test("R1 cellOccupied vrai sur case avec bête active, faux sinon", () => {
  const b = mk([beast({ id: 1, side: "player", x: 2, y: 3 })]);
  assert.strictEqual(b.cellOccupied(2, 3), true);
  assert.strictEqual(b.cellOccupied(2, 4), false);
  assert.strictEqual(b.cellOccupied(0, 0), false);
});
test("R1 une bête KO n'occupe plus sa case", () => {
  const b = mk([beast({ id: 1, side: "player", x: 2, y: 3, active: false })]);
  assert.strictEqual(b.cellOccupied(2, 3), false);
  assert.strictEqual(b.beastAt(2, 3), null);
});

// --- R2 — initiative par vitesse desc, tie-break id asc ---
test("R2 turnOrder trie par vitesse décroissante puis id croissant", () => {
  const b = mk([
    beast({ id: 3, side: "player", x: 0, y: 0, speed: 4 }),
    beast({ id: 1, side: "enemy", x: 1, y: 0, speed: 7 }),
    beast({ id: 2, side: "player", x: 2, y: 0, speed: 4 }),
  ]);
  assert.deepStrictEqual(b.turnOrder().map((x) => x.id), [1, 2, 3]);
});
test("R2 turnOrder ignore les bêtes KO", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, speed: 9, active: false }),
    beast({ id: 2, side: "player", x: 1, y: 0, speed: 3 }),
  ]);
  assert.deepStrictEqual(b.turnOrder().map((x) => x.id), [2]);
});

// --- R3 — déplacement borné ---
test("R3 moveBeast réussit vers case libre à distance <= move (retourne true)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, move: 3 })]);
  const p = b.beasts[0];
  assert.strictEqual(b.moveBeast(p, 3, 0), true); // distance exacte = move
  assert.strictEqual(p.x, 3);
  assert.strictEqual(p.y, 0);
});
test("R3 moveBeast échoue hors portée (distance move+1) : position inchangée, false", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, move: 3 })]);
  const p = b.beasts[0];
  assert.strictEqual(b.moveBeast(p, 4, 0), false);
  assert.strictEqual(p.x, 0);
});
test("R3 moveBeast échoue sur mur, sur case occupée, et pour bête KO", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, move: 3 }),
    beast({ id: 2, side: "player", x: 1, y: 0 }),
    beast({ id: 3, side: "player", x: 5, y: 5, active: false, move: 3 }),
  ], { wall: [[2, 0]] });
  const p = b.beasts[0];
  assert.strictEqual(b.moveBeast(p, 2, 0), false); // mur
  assert.strictEqual(b.moveBeast(p, 1, 0), false); // occupée
  assert.strictEqual(b.moveBeast(b.beasts[2], 5, 6), false); // KO
});
test("R3 moveBeast échoue hors limites", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, move: 3 })]);
  assert.strictEqual(b.moveBeast(b.beasts[0], -1, 0), false);
});

// --- R4 — portée d'attaque ---
test("R4 canAttack : ennemi actif à portée => true ; borne range vs range+1", () => {
  const a = beast({ id: 1, side: "player", x: 0, y: 0, range: 2 });
  const t = beast({ id: 2, side: "enemy", x: 2, y: 0 });
  const b = mk([a, t]);
  assert.strictEqual(b.canAttack(b.beasts[0], b.beasts[1]), true); // dist 2 = range
  b.beasts[1].x = 3;
  assert.strictEqual(b.canAttack(b.beasts[0], b.beasts[1]), false); // dist 3 > range
});
test("R4 canAttack faux si allié, ou cible KO, ou attaquant KO", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, range: 2 }),
    beast({ id: 2, side: "player", x: 1, y: 0 }),
    beast({ id: 3, side: "enemy", x: 1, y: 0, active: false }),
  ]);
  assert.strictEqual(b.canAttack(b.beasts[0], b.beasts[1]), false); // allié
  assert.strictEqual(b.canAttack(b.beasts[0], b.beasts[2]), false); // cible KO
  b.beasts[0].active = false;
  assert.strictEqual(b.canAttack(b.beasts[0], b.beasts[2]), false); // attaquant KO
});

// --- R5 — cycle de types ---
test("R5 typeMultiplier : chaque type bat le suivant (1.5), est battu par le précédent (0.5)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0 })]);
  for (let i = 0; i < TYPES.length; i++) {
    const atk = TYPES[i];
    const next = TYPES[(i + 1) % TYPES.length];
    const prev = TYPES[(i + TYPES.length - 1) % TYPES.length];
    assert.strictEqual(b.typeMultiplier(atk, next), 1.5);
    assert.strictEqual(b.typeMultiplier(atk, prev), 0.5);
    assert.strictEqual(b.typeMultiplier(atk, atk), 1);
  }
});

// --- R8 — terrain défensif ---
test("R8 terrainMitigation : forêt -1 (plancher 1), normal inchangé", () => {
  const b = mk([], { forest: [[1, 1]] });
  assert.strictEqual(b.terrainMitigation(1, 1, 5), 4);
  assert.strictEqual(b.terrainMitigation(1, 1, 1), 1); // plancher
  assert.strictEqual(b.terrainMitigation(0, 0, 5), 5); // normal
});

// --- R6 — dégâts & PV plancher ---
test("R6 computeDamage = max(1, floor(atk*mult)) après terrain", () => {
  // atk 4, type fort (1.5) => floor(6)=6 ; cible sur forêt => 6-1=5
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, type: "braise", atk: 4 }),
    beast({ id: 2, side: "enemy", x: 1, y: 1, type: "ronce" }),
  ], { forest: [[1, 1]] });
  assert.strictEqual(b.computeDamage(b.beasts[0], b.beasts[1]), 5);
});
test("R6 computeDamage plancher à 1 même en cas de type faible", () => {
  // atk 1, type faible (0.5) => floor(0.5)=0 => max(1,0)=1
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, type: "ronce", atk: 1 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, type: "braise" }),
  ]);
  assert.strictEqual(b.computeDamage(b.beasts[0], b.beasts[1]), 1);
});
test("R6 attack : PV plancher 0, jamais négatif, KO à 0", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, atk: 100 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, hp: 3 }),
  ]);
  b.attack(b.beasts[0], b.beasts[1]);
  assert.strictEqual(b.beasts[1].hp, 0);
  assert.strictEqual(b.beasts[1].active, false);
});

// --- R7 — KO -> cicatrice ---
test("R7 knockOut : active=false, scarred=true, reste dans la collection", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0 })]);
  b.knockOut(b.beasts[0]);
  assert.strictEqual(b.beasts[0].active, false);
  assert.strictEqual(b.beasts[0].scarred, true);
  assert.strictEqual(b.beasts.length, 1);
});

// --- R9 — zone de menace ---
test("R9 threatenedCells : ensemble exact des cases atteignables+attaquables", () => {
  // bête move+range = 1 (immobile portée 1) au coin (0,0) : menace exactement le
  // disque de Manhattan de rayon 1 dans la grille.
  const b = mk([beast({ id: 1, side: "enemy", x: 0, y: 0, move: 0, range: 1 })]);
  const cells = b.threatenedCells("enemy");
  assert.strictEqual(cells.has("0,0"), true);
  assert.strictEqual(cells.has("1,0"), true);
  assert.strictEqual(cells.has("0,1"), true);
  assert.strictEqual(cells.has("2,0"), false); // distance 2 > move+range 1
  assert.strictEqual(cells.has("1,1"), false); // distance 2
});
test("R9 threatenedCells ne compte que le camp demandé et les bêtes actives", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 4, move: 0, range: 1 }),
    beast({ id: 2, side: "enemy", x: 0, y: 0, move: 0, range: 1, active: false }),
  ]);
  assert.strictEqual(b.threatenedCells("enemy").size, 0); // seule bête ennemie est KO
  assert.strictEqual(b.threatenedCells("player").has("4,4"), true);
});

// --- R10 — capture par encerclement ---
function captureSetup(threshold, encirclers, enemyHp) {
  const beasts = [
    beast({ id: 99, side: "enemy", x: 0, y: 0, hp: enemyHp, move: 0, range: 0 }),
  ];
  if (encirclers >= 1) { beasts.push(beast({ id: 1, side: "player", x: 1, y: 0, atk: 0 })); }
  if (encirclers >= 2) { beasts.push(beast({ id: 2, side: "player", x: 0, y: 1, atk: 0 })); }
  return mk(beasts, { captureThreshold: threshold });
}
test("R10 capture : ennemi faible encerclé par 2 alliés, tenu un tour => capturé", () => {
  const b = captureSetup(6, 2, 4);
  assert.strictEqual(b.resolveCapture(), 0); // 1er tour : mise en joue (pinnedRounds=1)
  assert.strictEqual(b.captures, 0);
  assert.strictEqual(b.resolveCapture(), 1); // 2e tour tenu : capturé
  const e = b.beasts.find((x) => x.id === 99);
  assert.strictEqual(e.side, "player");
  assert.strictEqual(e.captured, true);
  assert.strictEqual(b.captures, 1);
});
test("R10 pas de capture avec un seul encercleur", () => {
  const b = captureSetup(6, 1, 4);
  b.resolveCapture();
  b.resolveCapture();
  assert.strictEqual(b.captures, 0);
  assert.strictEqual(b.beasts.find((x) => x.id === 99).side, "enemy");
});
test("R10 pas de capture si PV >= seuil (borne)", () => {
  const b = captureSetup(6, 2, 6); // hp 6 n'est PAS < 6
  b.resolveCapture();
  b.resolveCapture();
  assert.strictEqual(b.captures, 0);
});
test("R10 capture avortée si l'encerclement est rompu avant le tour tenu", () => {
  const b = captureSetup(6, 2, 4);
  assert.strictEqual(b.resolveCapture(), 0); // pinnedRounds=1
  b.beasts.find((x) => x.id === 2).active = false; // un encercleur tombe
  assert.strictEqual(b.resolveCapture(), 0); // remis à zéro, pas de capture
  assert.strictEqual(b.captures, 0);
});

// --- R11 / R12 — victoire & défaite ---
test("R11 checkVictory vrai ssi aucune bête ennemie active", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0 }),
  ]);
  assert.strictEqual(b.checkVictory(), false);
  b.knockOut(b.beasts[1]);
  assert.strictEqual(b.checkVictory(), true);
});
test("R12 checkDefeat vrai ssi aucune bête alliée active", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0 }),
  ]);
  assert.strictEqual(b.checkDefeat(), false);
  b.knockOut(b.beasts[0]);
  assert.strictEqual(b.checkDefeat(), true);
});

// --- moteur : refreshOutcome / endTurn / debugHit / enemyStep ---
test("refreshOutcome : victoire => over+won ; défaite => over sans won", () => {
  const bWin = mk([beast({ id: 1, side: "player", x: 0, y: 0 }), beast({ id: 2, side: "enemy", x: 1, y: 0, active: false })]);
  bWin.refreshOutcome();
  assert.strictEqual(bWin.over, true);
  assert.strictEqual(bWin.won, true);
  const bLose = mk([beast({ id: 1, side: "player", x: 0, y: 0, active: false }), beast({ id: 2, side: "enemy", x: 1, y: 0 })]);
  bLose.refreshOutcome();
  assert.strictEqual(bLose.over, true);
  assert.strictEqual(bLose.won, false);
});
test("debugHit force la défaite (tous les alliés KO, over=true, won=false)", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0 }),
    beast({ id: 2, side: "player", x: 1, y: 0 }),
    beast({ id: 3, side: "enemy", x: 5, y: 5 }),
  ]);
  b.debugHit();
  assert.strictEqual(b.activeBeasts("player").length, 0);
  assert.strictEqual(b.over, true);
  assert.strictEqual(b.won, false);
});
test("enemyStep : un ennemi avance vers l'allié et attaque une fois à portée", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 0, hp: 10, atk: 0 }),
    beast({ id: 2, side: "enemy", x: 0, y: 0, move: 3, range: 1, atk: 5, type: "braise" }),
  ]);
  b.enemyStep();
  const e = b.beasts[1];
  assert.strictEqual(e.x, 3); // avancé de 3 vers l'allié en (4,0)
  const p = b.beasts[0];
  assert.strictEqual(p.hp, 5); // attaqué : 10 - 5 (neutre)
});
test("endTurn incrémente le tour et rend la main au joueur", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 4 }),
    beast({ id: 2, side: "enemy", x: 0, y: 0, move: 1 }),
  ]);
  const t0 = b.turn;
  b.endTurn();
  assert.strictEqual(b.turn, t0 + 1);
  assert.strictEqual(b.currentSide, "player");
});
test("endTurn ne fait rien si la partie est finie", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0 }), beast({ id: 2, side: "enemy", x: 7, y: 7, active: false })]);
  b.refreshOutcome();
  const t0 = b.turn;
  b.endTurn();
  assert.strictEqual(b.turn, t0); // inchangé
});

// --- Tests ANTI-MUTANTS : ciblent des mutants d'opérateurs qui survivraient sinon ---
test("mutant clone: scarred/captured préservés exactement (true ET false) au clonage", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, scarred: true, captured: true }),
    beast({ id: 2, side: "enemy", x: 7, y: 7 }),
  ]);
  assert.strictEqual(b.beasts[0].scarred, true);
  assert.strictEqual(b.beasts[0].captured, true);
  assert.strictEqual(b.beasts[1].scarred, false);
  assert.strictEqual(b.beasts[1].captured, false);
  const v = b.view();
  assert.strictEqual(v.beasts[0].scarred, true);
  assert.strictEqual(v.beasts[1].scarred, false);
});
test("mutant inBounds: déplacement vers le bord (0,0) réussit (bornes x>=0 et y>=0)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 2, y: 0, move: 3 })]);
  assert.strictEqual(b.moveBeast(b.beasts[0], 0, 0), true);
  assert.strictEqual(b.beasts[0].x, 0);
  assert.strictEqual(b.beasts[0].y, 0);
});
test("mutant resolveCapture: un ALLIÉ faible entouré d'ENNEMIS n'est jamais capturé", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 1, y: 1, hp: 1 }),
    beast({ id: 2, side: "enemy", x: 0, y: 1 }),
    beast({ id: 3, side: "enemy", x: 2, y: 1 }),
  ], { captureThreshold: 6 });
  b.resolveCapture();
  b.resolveCapture();
  assert.strictEqual(b.captures, 0);
  assert.strictEqual(b.beasts[0].captured, false);
  assert.strictEqual(b.beasts[0].side, "player");
});
function targetChoice(players) {
  return mk([
    beast({ id: 20, side: "enemy", x: 0, y: 0, move: 0, range: 9, atk: 5, type: "braise" }),
    ...players,
  ]);
}
test("mutant cible: l'ennemi attaque le plus proche même s'il est listé en dernier", () => {
  const b = targetChoice([
    beast({ id: 3, side: "player", x: 5, y: 0, hp: 10 }),  // loin, listé 1er
    beast({ id: 5, side: "player", x: 2, y: 0, hp: 10 }),  // proche, listé 2e
  ]);
  b.enemyStep();
  assert.strictEqual(b.beasts.find((x) => x.id === 5).hp, 5); // proche attaqué
  assert.strictEqual(b.beasts.find((x) => x.id === 3).hp, 10); // loin épargné
});
test("mutant cible: un ennemi plus LOIN mais d'id plus petit n'est pas préféré", () => {
  const b = targetChoice([
    beast({ id: 9, side: "player", x: 1, y: 0, hp: 10 }),  // proche, gros id
    beast({ id: 2, side: "player", x: 5, y: 0, hp: 10 }),  // loin, petit id
  ]);
  b.enemyStep();
  assert.strictEqual(b.beasts.find((x) => x.id === 9).hp, 5); // proche attaqué
  assert.strictEqual(b.beasts.find((x) => x.id === 2).hp, 10);
});
test("mutant cible: à égalité de distance, l'id le plus petit est choisi", () => {
  const b = targetChoice([
    beast({ id: 5, side: "player", x: 2, y: 0, hp: 10 }),  // dist 2, id 5
    beast({ id: 3, side: "player", x: 0, y: 2, hp: 10 }),  // dist 2, id 3 (gagne le tie)
  ]);
  b.enemyStep();
  assert.strictEqual(b.beasts.find((x) => x.id === 3).hp, 5); // id 3 choisi
  assert.strictEqual(b.beasts.find((x) => x.id === 5).hp, 10);
});

// --- view() : booléens exposés pins ---
test("view expose des compteurs et booléens exacts", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0 }),
    beast({ id: 2, side: "enemy", x: 7, y: 7 }),
  ]);
  const v = b.view();
  assert.strictEqual(v.over, false);
  assert.strictEqual(v.won, false);
  assert.strictEqual(v.playerActive, 1);
  assert.strictEqual(v.enemyActive, 1);
  assert.strictEqual(v.turn, 1);
  assert.strictEqual(v.captures, 0);
});

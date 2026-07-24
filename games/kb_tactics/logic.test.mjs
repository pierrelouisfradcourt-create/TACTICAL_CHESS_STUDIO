// kb_tactics — tests de LOGIQUE pure (node --test). Vérifie les mécaniques du moteur ET
// que les briques importées sont réellement câblées (combat via sys-damage-floor, gen via
// sys-reachability). Conçu pour tuer les mutants (bornes, conditions de fin, déterminisme).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KbTacticsGame, GRID_W, GRID_H, PLAYER_MAX_HP, PLAYER_DEF, ENEMY_ATK, ENEMY_MOVE_PERIOD,
} from "./game.mjs";
import { effectiveDamage } from "../../knowledge_base/systems/combat/damage_floor.mjs";
import { isLevelReachable } from "../../knowledge_base/systems/procgen/reachability.mjs";

const isBlockedCell = (c) => c === 1;

test("init : joueur au départ, pv pleins, sortie au coin opposé, statut ACTIVE", () => {
  const g = new KbTacticsGame({ seed: 1 });
  assert.equal(g.player.x, 0);
  assert.equal(g.player.y, 0);
  assert.equal(g.player.hp, PLAYER_MAX_HP);
  assert.equal(g.exit.x, GRID_W - 1);
  assert.equal(g.exit.y, GRID_H - 1);
  assert.equal(g.status, "ACTIVE");
});

test("la sortie est TOUJOURS atteignable (garantie sys-reachability) sur 50 seeds", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const g = new KbTacticsGame({ seed });
    const r = isLevelReachable(g.grid, { x: g.player.x, y: g.player.y }, [g.exit], isBlockedCell);
    assert.equal(r.ok, true, `seed ${seed}: sortie isolée`);
  }
});

test("génération : la grille contient de vrais obstacles (pas un repli vide) sur seeds 1..10", () => {
  let totalObstacles = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const g = new KbTacticsGame({ seed });
    totalObstacles += g.grid.flat().filter((c) => c === 1).length;
  }
  assert.ok(totalObstacles > 0, "aucun obstacle => génération repliée sur grille vide (bug)");
});

test("génération : exactement ENEMY_COUNT (2) ennemis placés", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const g = new KbTacticsGame({ seed });
    assert.equal(g.enemies.length, 2, `seed ${seed}: ${g.enemies.length} ennemis`);
  }
});

// Empreinte EXACTE (RNG + placement) — pinne la séquence xorshift et les gardes de placement
// (sortie, doublon même colonne) que les invariants de contrainte ne distinguent pas.
// seed 3 : ennemis en même colonne (exerce la dédup) ET l'un sur la rangée de la sortie.
test("génération : empreinte exacte du niveau (obstacles + positions ennemies) par seed", () => {
  const expected = {
    1: { obstacles: 15, enemies: [{ x: 8, y: 8 }, { x: 10, y: 4 }] },
    2: { obstacles: 18, enemies: [{ x: 1, y: 2 }, { x: 2, y: 1 }] },
    3: { obstacles: 20, enemies: [{ x: 8, y: 8 }, { x: 8, y: 1 }] },
    7: { obstacles: 22, enemies: [{ x: 8, y: 8 }, { x: 7, y: 7 }] },
  };
  for (const [seed, exp] of Object.entries(expected)) {
    const g = new KbTacticsGame({ seed: Number(seed) });
    assert.equal(g.grid.flat().filter((c) => c === 1).length, exp.obstacles, `seed ${seed}: obstacles`);
    assert.deepEqual(g.enemies, exp.enemies, `seed ${seed}: positions ennemies`);
  }
});

test("déplacement dans une case libre bouge le joueur d'exactement 1 case", () => {
  const g = new KbTacticsGame({ seed: 42 });
  g.grid[0][1] = 0; // garantit la case libre
  g.enemies = [];
  g.step("right");
  assert.equal(g.player.x, 1);
  assert.equal(g.player.y, 0);
});

test("déplacement hors grille : le joueur reste sur place", () => {
  const g = new KbTacticsGame({ seed: 42 });
  g.enemies = [];
  g.step("up");   // y=0 -> hors grille
  assert.equal(g.player.y, 0);
  g.step("left"); // x=0 -> hors grille
  assert.equal(g.player.x, 0);
});

test("déplacement dans un obstacle : le joueur reste sur place", () => {
  const g = new KbTacticsGame({ seed: 7 });
  g.enemies = [];
  g.grid[0][1] = 1; // obstacle à droite
  g.step("right");
  assert.equal(g.player.x, 0);
});

test("atteindre la sortie => WON", () => {
  const g = new KbTacticsGame({ seed: 3 });
  g.enemies = [];
  g.player.x = g.exit.x;
  g.player.y = g.exit.y - 1;
  g.grid[g.exit.y][g.exit.x] = 0;
  g.step("down");
  assert.equal(g.status, "WON");
});

test("combat : un ennemi adjacent inflige exactement effectiveDamage(ENEMY_ATK, PLAYER_DEF)", () => {
  const g = new KbTacticsGame({ seed: 9 });
  const expected = effectiveDamage(ENEMY_ATK, PLAYER_DEF, 1);
  g.player.x = 5; g.player.y = 5;
  g.grid[5][5] = 0;
  g.enemies = [{ x: 6, y: 5 }]; // adjacent à droite
  const hp0 = g.player.hp;
  g.step("wait");
  // ennemi lent : au tour 1 il ne bouge pas (1 % 2 != 0) mais frappe car déjà adjacent
  assert.equal(g.player.hp, hp0 - expected);
  assert.equal(g.lastDamage, expected);
});

test("dégâts plancher : même DEF >= ATK, un ennemi adjacent inflige au moins 1", () => {
  const g = new KbTacticsGame({ seed: 9 });
  g.player.x = 5; g.player.y = 5; g.grid[5][5] = 0;
  g.enemies = [{ x: 6, y: 5 }];
  const hp0 = g.player.hp;
  g.step("wait");
  assert.ok(g.player.hp <= hp0 - 1); // jamais 0 dégât
});

test("défaite : pv à 0 => LOST et pv bornés à 0", () => {
  const g = new KbTacticsGame({ seed: 9 });
  g.player.x = 5; g.player.y = 5; g.grid[5][5] = 0;
  g.player.hp = 1;
  g.enemies = [{ x: 6, y: 5 }];
  g.step("wait");
  assert.equal(g.status, "LOST");
  assert.equal(g.player.hp, 0);
});

test("ennemis LENTS : ne bougent qu'un tour sur ENEMY_MOVE_PERIOD", () => {
  const g = new KbTacticsGame({ seed: 11 });
  g.player.x = 5; g.player.y = 5; g.grid[5][5] = 0;
  g.enemies = [{ x: 9, y: 5 }]; // loin, non adjacent
  const x0 = g.enemies[0].x;
  g.step("wait"); // turn=1, 1 % 2 != 0 => pas de mouvement ennemi
  assert.equal(g.enemies[0].x, x0, "l'ennemi n'aurait pas dû bouger au tour impair");
  g.step("wait"); // turn=2, 2 % 2 == 0 => mouvement (se rapproche : x diminue)
  assert.ok(g.enemies[0].x < x0, "l'ennemi aurait dû se rapprocher au tour pair");
});

test("forceLose (hook debug) : LOST immédiat", () => {
  const g = new KbTacticsGame({ seed: 1 });
  g.forceLose();
  assert.equal(g.status, "LOST");
  assert.equal(g.player.hp, 0);
});

test("aucune action n'a d'effet une fois la partie terminée", () => {
  const g = new KbTacticsGame({ seed: 1 });
  g.forceLose();
  const snapshot = JSON.stringify(g.view());
  g.step("right"); g.step("down");
  assert.equal(JSON.stringify(g.view()), snapshot);
});

test("déterminisme : même seed + même séquence => même état final", () => {
  const seq = ["right", "down", "right", "wait", "down", "left"];
  const a = new KbTacticsGame({ seed: 5 });
  const b = new KbTacticsGame({ seed: 5 });
  for (const act of seq) { a.step(act); b.step(act); }
  assert.equal(JSON.stringify(a.view()), JSON.stringify(b.view()));
});

test("reset restaure l'état initial pour le même seed", () => {
  const g = new KbTacticsGame({ seed: 8 });
  const initial = JSON.stringify(g.view());
  g.step("right"); g.step("down");
  g.reset(8);
  assert.equal(JSON.stringify(g.view()), initial);
});

test("readDebug expose les hooks de jouabilité attendus", () => {
  const g = new KbTacticsGame({ seed: 1 });
  const d = g.readDebug();
  for (const k of ["turn", "hp", "playerX", "playerY", "exitX", "exitY", "enemies", "status"]) {
    assert.ok(k in d, `hook manquant: ${k}`);
  }
});

// ---------------------------------------------------------------------------------------
// Tests d'IA ennemie à position EXACTE (grille nettoyée) — épinglent chaque branche de
// poursuite pour tuer les mutants (bornes, priorité d'axe, candidats, garde ontoPlayer).
// ---------------------------------------------------------------------------------------
function cleanGame() {
  const g = new KbTacticsGame({ seed: 1 });
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) g.grid[y][x] = 0;
  return g;
}
// Avance jusqu'à un tour PAIR pour déclencher le mouvement ennemi (ENEMY_MOVE_PERIOD).
function stepToEnemyMove(g) { g.step("wait"); g.step("wait"); } // turn passe à 2

test("borne : le joueur peut entrer en colonne 0 (x>=0, tue le mutant de borne)", () => {
  const g = cleanGame();
  g.enemies = [];
  g.player.x = 1; g.player.y = 3;
  g.step("left");
  assert.equal(g.player.x, 0);
});

test("borne : le joueur peut entrer en ligne 0 (y>=0, tue le mutant de borne)", () => {
  const g = cleanGame();
  g.enemies = [];
  g.player.x = 3; g.player.y = 1;
  g.step("up");
  assert.equal(g.player.y, 0);
});

test("IA : poursuite même rangée => l'ennemi avance d'une case en X", () => {
  const g = cleanGame();
  g.player.x = 8; g.player.y = 4; g.enemies = [{ x: 2, y: 4 }];
  stepToEnemyMove(g);
  assert.deepEqual(g.enemies[0], { x: 3, y: 4 });
});

test("IA : poursuite même colonne => l'ennemi avance d'une case en Y", () => {
  const g = cleanGame();
  g.player.x = 4; g.player.y = 8; g.enemies = [{ x: 4, y: 2 }];
  stepToEnemyMove(g);
  assert.deepEqual(g.enemies[0], { x: 4, y: 3 });
});

test("IA : à distance égale |dx|==|dy|, priorité à l'axe X (tue >= -> >)", () => {
  const g = cleanGame();
  g.player.x = 6; g.player.y = 6; g.enemies = [{ x: 3, y: 3 }];
  stepToEnemyMove(g);
  assert.deepEqual(g.enemies[0], { x: 4, y: 3 }); // X d'abord, pas (3,4)
});

test("IA : même rangée mais X bloqué et aucun repli Y => l'ennemi attend (tue stepY inversé)", () => {
  const g = cleanGame();
  g.player.x = 8; g.player.y = 4; g.enemies = [{ x: 2, y: 4 }];
  g.grid[4][3] = 1; // bloque la case X
  stepToEnemyMove(g);
  assert.deepEqual(g.enemies[0], { x: 2, y: 4 }); // pas de mouvement Y parasite
});

test("IA : X bloqué mais repli Y disponible (branche X) => l'ennemi prend le Y (tue le push Y)", () => {
  const g = cleanGame();
  g.player.x = 8; g.player.y = 7; g.enemies = [{ x: 2, y: 4 }]; // dx=6>=dy=3 -> branche X
  g.grid[4][3] = 1; // bloque (3,4)
  stepToEnemyMove(g);
  assert.deepEqual(g.enemies[0], { x: 2, y: 5 }); // repli Y
});

test("IA : Y bloqué mais repli X disponible (branche Y) => l'ennemi prend le X (tue le push X)", () => {
  const g = cleanGame();
  g.player.x = 7; g.player.y = 8; g.enemies = [{ x: 4, y: 2 }]; // dy=6>dx=3 -> branche Y
  g.grid[3][4] = 1; // bloque (4,3)
  stepToEnemyMove(g);
  assert.deepEqual(g.enemies[0], { x: 5, y: 2 }); // repli X
});

test("_occupiedByEnemy : un ennemi hors de la case cible ne bloque pas le joueur (tue && -> ||)", () => {
  const g = cleanGame();
  g.player.x = 0; g.player.y = 0; g.enemies = [{ x: 5, y: 0 }]; // même rangée, X différent
  g.step("right");
  assert.equal(g.player.x, 1); // le joueur DOIT pouvoir avancer
});

test("reset avec un AUTRE seed régénère selon ce seed (tue !== -> ===)", () => {
  const g = new KbTacticsGame({ seed: 1 });
  g.reset(2);
  const fresh = new KbTacticsGame({ seed: 2 });
  assert.equal(JSON.stringify(g.view().grid), JSON.stringify(fresh.view().grid));
  assert.deepEqual(g.enemies, fresh.enemies);
});

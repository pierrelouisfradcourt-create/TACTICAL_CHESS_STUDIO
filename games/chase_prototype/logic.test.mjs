// Chase Prototype — tests de logique pure. node --test logic.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ChasePrototypeGame, ARENA_WIDTH, ARENA_HEIGHT } from "./game.mjs";

test("état initial : positions de départ fixes, aucune fin de partie", () => {
  const g = new ChasePrototypeGame();
  const v = g.view();
  assert.equal(v.player.x, 100);
  assert.equal(v.player.y, 100);
  assert.equal(v.enemy.x, 700);
  assert.equal(v.enemy.y, 500);
  assert.equal(v.over, false);
  assert.equal(v.won, false);
  assert.equal(v.elapsedMs, 0);
});

test("le joueur se déplace vers la droite quand input.right est actif", () => {
  const g = new ChasePrototypeGame();
  const before = g.view().player.x;
  g.step(100, { right: true });
  const after = g.view().player.x;
  assert.ok(after > before, `attendu déplacement à droite, ${before} -> ${after}`);
});

test("le joueur se déplace vers la gauche quand input.left est actif", () => {
  const g = new ChasePrototypeGame();
  const before = g.view().player.x;
  g.step(100, { left: true });
  const after = g.view().player.x;
  assert.ok(after < before, `attendu déplacement à gauche, ${before} -> ${after}`);
});

test("le joueur se déplace vers le haut quand input.up est actif", () => {
  const g = new ChasePrototypeGame();
  const before = g.view().player.y;
  g.step(100, { up: true });
  const after = g.view().player.y;
  assert.ok(after < before, `attendu déplacement vers le haut, ${before} -> ${after}`);
});

test("le joueur se déplace vers le bas quand input.down est actif", () => {
  const g = new ChasePrototypeGame();
  const before = g.view().player.y;
  g.step(100, { down: true });
  const after = g.view().player.y;
  assert.ok(after > before, `attendu déplacement vers le bas, ${before} -> ${after}`);
});

test("le déplacement diagonal est normalisé (pas plus rapide qu'un axe seul)", () => {
  const straight = new ChasePrototypeGame();
  straight.step(500, { right: true });
  const distStraight = straight.view().player.x - 100;

  const diag = new ChasePrototypeGame();
  diag.step(500, { right: true, down: true });
  const p = diag.view().player;
  const distDiag = Math.hypot(p.x - 100, p.y - 100);

  assert.ok(
    Math.abs(distStraight - distDiag) < 1e-6,
    `distance parcourue en 500ms doit être égale en ligne droite et en diagonale (${distStraight} vs ${distDiag})`
  );
});

test("le joueur reste dans les bornes de l'arène", () => {
  const g = new ChasePrototypeGame();
  for (let i = 0; i < 200; i++) g.step(16, { left: true, up: true });
  const p = g.view().player;
  assert.ok(p.x >= p.radius && p.x <= ARENA_WIDTH - p.radius, `x hors bornes: ${p.x}`);
  assert.ok(p.y >= p.radius && p.y <= ARENA_HEIGHT - p.radius, `y hors bornes: ${p.y}`);
});

test("l'ennemi se rapproche du joueur immobile à chaque tick (poursuite crédible)", () => {
  const g = new ChasePrototypeGame();
  const dist = (v) => Math.hypot(v.player.x - v.enemy.x, v.player.y - v.enemy.y);
  const d0 = dist(g.view());
  g.step(16, {});
  const d1 = dist(g.view());
  g.step(16, {});
  const d2 = dist(g.view());
  assert.ok(d1 < d0, "l'ennemi doit se rapprocher au tick 1");
  assert.ok(d2 < d1, "l'ennemi doit se rapprocher au tick 2");
});

test("la trajectoire de poursuite est diagonale, pas un dogleg en L (les deux axes bougent ensemble)", () => {
  const g = new ChasePrototypeGame();
  const e0 = g.view().enemy;
  g.step(16, {});
  const e1 = g.view().enemy;
  assert.ok(e1.x !== e0.x, "l'axe x doit bouger dès le premier tick");
  assert.ok(e1.y !== e0.y, "l'axe y doit bouger dès le premier tick (pas de priorité d'axe)");
});

test("collision joueur/ennemi => défaite (over=true)", () => {
  const g = new ChasePrototypeGame();
  g.debugHit();
  const v = g.view();
  assert.equal(v.over, true);
  assert.equal(v.won, false);
});

test("30 secondes écoulées sans capture => victoire (won=true)", () => {
  const g = new ChasePrototypeGame();
  g.debugWin();
  const v = g.view();
  assert.equal(v.won, true);
  assert.equal(v.over, false);
});

test("après over, step() est un no-op (l'état ne change plus)", () => {
  const g = new ChasePrototypeGame();
  g.debugHit();
  const before = g.view();
  g.step(16, { right: true });
  const after = g.view();
  assert.deepEqual(after.player, before.player);
  assert.deepEqual(after.enemy, before.enemy);
});

test("reset() restaure l'état initial", () => {
  const g = new ChasePrototypeGame();
  g.step(1000, { right: true, down: true });
  g.debugHit();
  g.reset();
  const v = g.view();
  assert.equal(v.player.x, 100);
  assert.equal(v.enemy.x, 700);
  assert.equal(v.over, false);
  assert.equal(v.elapsedMs, 0);
});

test("elapsedMs avance réellement du montant exact de dtMs à chaque step()", () => {
  const g = new ChasePrototypeGame();
  g.step(16, {});
  assert.equal(g.view().elapsedMs, 16);
  g.step(250, {});
  assert.equal(g.view().elapsedMs, 266);
});

test("victoire déclenchée par step() atteignant exactement 30000ms (pas seulement le hook debugWin)", () => {
  const g = new ChasePrototypeGame();
  // écarte l'ennemi pour isoler le test de la temporisation (pas de capture parasite).
  g.enemy.x = g.width - g.enemy.radius;
  g.enemy.y = g.height - g.enemy.radius;
  g.player.x = g.player.radius;
  g.player.y = g.player.radius;
  g.elapsedMs = 30000 - 16;
  assert.equal(g.view().won, false);
  g.step(16, {});
  assert.equal(g.view().elapsedMs, 30000);
  assert.equal(g.view().won, true);
});

test("debugHit() n'a aucun effet si la partie est déjà gagnée (garde over||won)", () => {
  const g = new ChasePrototypeGame();
  g.debugWin();
  g.debugHit();
  const v = g.view();
  assert.equal(v.won, true);
  assert.equal(v.over, false, "debugHit ne doit pas écraser une victoire déjà actée");
});

test("debugWin() n'a aucun effet si la partie est déjà perdue (garde over||won)", () => {
  const g = new ChasePrototypeGame();
  g.debugHit();
  g.debugWin();
  const v = g.view();
  assert.equal(v.over, true);
  assert.equal(v.won, false, "debugWin ne doit pas écraser une défaite déjà actée");
});

test("un joueur immobile face à un ennemi plus lent finit par se faire rattraper avant 30s", () => {
  const g = new ChasePrototypeGame();
  let ticks = 0;
  while (!g.over && !g.won && ticks < 5000) {
    g.step(16, {});
    ticks += 1;
  }
  assert.equal(g.view().over, true, "un joueur immobile doit être rattrapé");
  assert.ok(g.view().elapsedMs < 30000, "la capture doit survenir avant les 30s de survie");
});

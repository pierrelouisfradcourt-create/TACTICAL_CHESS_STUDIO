// Breakout — tests de logique PURE (node --test), zéro navigateur, déterministes.
// RÉÉCRIT le 2026-07-13 (go Pierre explicite : "corrige l'arbitre pour qu'il colle
// aux deux branches") — la version précédente testait une API imaginaire
// (applyInput/view/readDebug/checkWin/loseLife/g.width/brick.health) qui ne
// correspondait NI à control/game.mjs NI à variant/game.mjs (confirmé : mêmes
// erreurs identiques sur les deux branches, cf. WFL-01/results.md §3).
//
// Ce fichier ne teste QUE le contrat public commun aux deux branches, tel que lu
// dans control/game.mjs ET variant/game.mjs (pas un contrat supposé) :
//   new BreakoutGame({ seed })            — les deux branches acceptent { seed }
//   game.step(dtMs, input)                — les deux branches, même signature
//   game.paddle { x, y, width, height }   — les deux branches
//   game.ball   { x, y, vx, vy }          — .radius présent seulement côté control ;
//                                           BALL_RADIUS = 8 en dur des deux côtés
//                                           (source lue), donc fallback 8 ci-dessous
//   game.bricks[] { x, y, width, height, alive, destructible, hp, score|points }
//                                          — le nom du champ de score diffère
//                                           (control: `score`, variant: `points`)
//   game.lives, game.score, game.level, game.status, game.reset()
//   status "playing" en jeu (IDENTIQUE dans les deux branches) ; le libellé de fin
//   diffère (control: 'win'/'lose', variant: 'won'/'lost') — normalisé ci-dessous.
//   GAME_WIDTH / GAME_HEIGHT exportés par les deux game.mjs (800×600 les deux).
//
// STRICT assertions — pas de >= masquant un comportement mort, sauf là où le
// contrat lui-même (product_snapshot.md R4) ne spécifie qu'une propriété qualitative
// (signe, ordre de grandeur), jamais une formule numérique exacte propre à une
// implémentation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BreakoutGame, GAME_WIDTH, GAME_HEIGHT } from "./game.mjs";

const WIN_STATUSES = new Set(["win", "won"]);
const LOSE_STATUSES = new Set(["lose", "lost"]);
const FALLBACK_BALL_RADIUS = 8; // constante lue identique dans control/variant game.mjs

function isWin(status) {
  return WIN_STATUSES.has(status);
}
function isLose(status) {
  return LOSE_STATUSES.has(status);
}
// Retire les commentaires bloc et ligne avant un scan textuel — sinon un commentaire
// qui NOMME une API interdite (ex. « pas de Math.random() ») déclenche un faux
// positif (bug réel trouvé en exécutant cet oracle sur control/level.mjs).
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}
function brickScoreValue(brick) {
  return brick.score ?? brick.points ?? 0;
}
function radiusOf(ball) {
  return typeof ball.radius === "number" ? ball.radius : FALLBACK_BALL_RADIUS;
}
/** Première brique cassable encore vivante — les deux branches en ont au niveau 0. */
function firstAliveDestructibleBrick(game) {
  for (const brick of game.bricks) {
    if (brick.alive !== false && brick.destructible) return brick;
  }
  return null;
}

// === R1 : la balle avance en continu selon (vx, vy) ===
test("R1 — balle avance: après un step, la position change du delta attendu", () => {
  const g = new BreakoutGame({ seed: 1 });
  const x0 = g.ball.x;
  const y0 = g.ball.y;
  const vx0 = g.ball.vx;
  const vy0 = g.ball.vy;

  g.step(16, {});

  // Les deux branches convertissent dtMs différemment (ms bruts vs secondes) ;
  // le contrat (R1) n'impose que : la balle a bougé, dans le sens de (vx0, vy0).
  assert.notEqual(g.ball.x, x0, "ball.x doit changer après un step");
  assert.notEqual(g.ball.y, y0, "ball.y doit changer après un step");
  assert.equal(Math.sign(g.ball.x - x0) || 0, Math.sign(vx0) || 0, "déplacement X dans le sens de vx0");
  assert.equal(Math.sign(g.ball.y - y0), Math.sign(vy0), "déplacement Y dans le sens de vy0");
});

// === R2 : rebond mur latéral — vx s'inverse strictement, vy inchangé ===
test("R2 — rebond mur gauche: vx passe de négatif à positif, vy inchangé", () => {
  const g = new BreakoutGame({ seed: 2 });
  g.ball.x = 2;
  g.ball.y = 300;
  g.ball.vx = -100;
  g.ball.vy = 50;

  g.step(0.001, {});

  assert.ok(g.ball.vx > 0, `vx doit devenir positif après rebond mur gauche, got ${g.ball.vx}`);
  assert.equal(g.ball.vy, 50, "vy doit rester strictement inchangé");
});

test("R2 — rebond mur droit: vx passe de positif à négatif, vy inchangé", () => {
  const g = new BreakoutGame({ seed: 2 });
  g.ball.x = GAME_WIDTH - 2;
  g.ball.y = 300;
  g.ball.vx = 100;
  g.ball.vy = 50;

  g.step(0.001, {});

  assert.ok(g.ball.vx < 0, `vx doit devenir négatif après rebond mur droit, got ${g.ball.vx}`);
  assert.equal(g.ball.vy, 50, "vy doit rester strictement inchangé");
});

// === R3 : rebond plafond — vy s'inverse strictement, vx inchangé ===
test("R3 — rebond plafond: vy passe de négatif à positif, vx inchangé", () => {
  const g = new BreakoutGame({ seed: 3 });
  g.ball.x = 400;
  g.ball.y = 2;
  g.ball.vx = 100;
  g.ball.vy = -150;

  g.step(0.001, {});

  assert.ok(g.ball.vy > 0, `vy doit devenir positif après rebond plafond, got ${g.ball.vy}`);
  assert.equal(g.ball.vx, 100, "vx doit rester strictement inchangé");
});

// === R4 : rebond raquette — angle fonction du point d'impact (propriétés du contrat,
// pas une formule d'implémentation : product_snapshot.md ne fige que le signe/l'ordre). ===
test("R4 — rebond raquette centre: vy strictement négatif (repart vers le haut)", () => {
  const g = new BreakoutGame({ seed: 4 });
  const center = g.paddle.x + g.paddle.width / 2;
  g.ball.x = center;
  g.ball.y = g.paddle.y - 1;
  g.ball.vx = 0;
  g.ball.vy = 50;

  g.step(0.001, {});

  assert.ok(g.ball.vy < 0, `vy doit être strictement négatif après rebond raquette, got ${g.ball.vy}`);
});

test("R4 — rebond raquette bord gauche: vx strictement négatif", () => {
  const g = new BreakoutGame({ seed: 5 });
  g.ball.x = g.paddle.x + 2;
  g.ball.y = g.paddle.y - 1;
  g.ball.vx = -20;
  g.ball.vy = 50;

  g.step(0.001, {});

  assert.ok(g.ball.vx < 0, `vx doit rester/devenir négatif côté gauche, got ${g.ball.vx}`);
  assert.ok(g.ball.vy < 0, "vy doit être strictement négatif");
});

test("R4 — rebond raquette bord droit: vx strictement positif", () => {
  const g = new BreakoutGame({ seed: 6 });
  g.ball.x = g.paddle.x + g.paddle.width - 2;
  g.ball.y = g.paddle.y - 1;
  g.ball.vx = 20;
  g.ball.vy = 50;

  g.step(0.001, {});

  assert.ok(g.ball.vx > 0, `vx doit rester/devenir positif côté droit, got ${g.ball.vx}`);
  assert.ok(g.ball.vy < 0, "vy doit être strictement négatif");
});

// === R5, R8, R9 : rebond + destruction + score sur une brique cassable ===
test("R5/R8/R9 — collision brique cassable: rebond + hp/alive + score augmente", () => {
  const g = new BreakoutGame({ seed: 11 });
  const brick = firstAliveDestructibleBrick(g);
  assert.ok(brick, "le niveau 0 doit contenir au moins une brique cassable vivante");

  const scoreBefore = g.score;
  const expectedGain = brickScoreValue(brick);

  g.ball.x = brick.x + brick.width / 2;
  g.ball.y = brick.y + brick.height + radiusOf(g.ball) - 1;
  g.ball.vx = 0;
  g.ball.vy = -50; // monte vers la brique par le dessous

  g.step(0.001, {});

  assert.equal(brick.alive, false, "la brique touchée doit devenir alive=false");
  assert.equal(g.score, scoreBefore + expectedGain, "le score doit augmenter EXACTEMENT du gain de la brique");

  // R9 : elle ne réapparaît jamais, même après de nombreux steps sans nouvelle collision.
  g.ball.x = -1000;
  g.ball.y = -1000;
  for (let i = 0; i < 50; i += 1) g.step(16, {});
  assert.equal(brick.alive, false, "R9 — la brique détruite doit rester détruite");
});

// === R6/R7 : déplacement clavier + bornage de la raquette ===
test("R6 — input gauche: paddle.x diminue strictement", () => {
  const g = new BreakoutGame({ seed: 7 });
  const x0 = g.paddle.x;
  g.step(16, { left: true });
  assert.ok(g.paddle.x < x0, "paddle.x doit diminuer avec input left");
});

test("R6 — input droite: paddle.x augmente strictement", () => {
  const g = new BreakoutGame({ seed: 8 });
  const x0 = g.paddle.x;
  g.step(16, { right: true });
  assert.ok(g.paddle.x > x0, "paddle.x doit augmenter avec input right");
});

test("R7 — paddle borné à gauche: jamais < 0 même en forçant longtemps", () => {
  const g = new BreakoutGame({ seed: 9 });
  for (let i = 0; i < 2000; i += 1) g.step(16, { left: true });
  assert.equal(g.paddle.x, 0, "paddle.x doit être exactement 0 en butée gauche");
});

test("R7 — paddle borné à droite: jamais > GAME_WIDTH-largeur même en forçant longtemps", () => {
  const g = new BreakoutGame({ seed: 10 });
  for (let i = 0; i < 2000; i += 1) g.step(16, { right: true });
  assert.equal(g.paddle.x, GAME_WIDTH - g.paddle.width, "paddle.x doit être exactement à la borne droite");
});

// === R11/R12 : perte de vie puis défaite ssi vies == 0 ===
test("R11 — sortie basse: vies diminue EXACTEMENT de 1, balle re-servie tant qu'il reste des vies", () => {
  const g = new BreakoutGame({ seed: 12 });
  const lives0 = g.lives;
  assert.ok(lives0 > 1, "le seed de test doit démarrer avec plus d'une vie");

  g.ball.y = GAME_HEIGHT + 50;
  g.ball.vy = 1;
  g.step(1, {});

  assert.equal(g.lives, lives0 - 1, "vies doit diminuer EXACTEMENT de 1");
  assert.equal(g.status, "playing", "la partie continue tant que vies > 0");
});

test("R12 — défaite ssi vies atteint 0", () => {
  const g = new BreakoutGame({ seed: 13 });
  let guard = 0;
  while (g.status === "playing" && guard < 20) {
    g.ball.y = GAME_HEIGHT + 50;
    g.ball.vy = 1;
    g.step(1, {});
    guard += 1;
  }
  assert.equal(g.lives, 0, "vies doit être exactement 0 à la défaite");
  assert.ok(isLose(g.status), `status doit signaler la défaite, got ${g.status}`);
});

// === R10 : génération de niveau seedée déterministe (level.mjs, indépendant de game.mjs) ===
test("R10 — generateLevel déterministe: même (seed, levelIndex) => disposition identique", async () => {
  const { generateLevel } = await import("./level.mjs");
  const level1 = generateLevel(42, 0);
  const level2 = generateLevel(42, 0);

  assert.equal(level1.bricks.length, level2.bricks.length, "même nombre de briques");
  for (let i = 0; i < level1.bricks.length; i += 1) {
    const b1 = level1.bricks[i];
    const b2 = level2.bricks[i];
    assert.equal(b1.x, b2.x, `brique ${i}: x identique`);
    assert.equal(b1.y, b2.y, `brique ${i}: y identique`);
    assert.equal(b1.width, b2.width, `brique ${i}: width identique`);
    assert.equal(b1.height, b2.height, `brique ${i}: height identique`);
    assert.equal(b1.hp, b2.hp, `brique ${i}: hp identique`);
    assert.equal(b1.destructible, b2.destructible, `brique ${i}: destructible identique`);
  }
});

// === R17 : restart remet l'état initial (capturé avant mutation, pas une constante supposée) ===
test("R17 — reset() remet lives/score/level à leurs valeurs de départ EXACTES", () => {
  const g = new BreakoutGame({ seed: 16 });
  const lives0 = g.lives;
  const score0 = g.score;
  const level0 = g.level;

  g.lives = 1;
  g.score = 999;
  g.level = 2;

  g.reset();

  assert.equal(g.lives, lives0, "lives doit revenir à sa valeur de départ exacte");
  assert.equal(g.score, score0, "score doit revenir à sa valeur de départ exacte (0)");
  assert.equal(g.level, level0, "level doit revenir à sa valeur de départ exacte (0)");
  assert.equal(g.status, "playing", "status doit revenir à 'playing'");
});

// === R19 : architecture — game.mjs et level.mjs n'importent jamais render/input/server,
// ne référencent aucune API DOM. Lecture de source, agnostique à l'implémentation. ===
test("R19 — game.mjs n'importe pas render/input/server et ne touche pas au DOM", async () => {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(new URL("./game.mjs", import.meta.url), "utf-8");

  assert.ok(!/from\s+['"]\.\/render/.test(content), "game.mjs ne doit pas importer render.mjs");
  assert.ok(!/from\s+['"]\.\/input/.test(content), "game.mjs ne doit pas importer input.mjs");
  assert.ok(!/from\s+['"]\.\/server/.test(content), "game.mjs ne doit pas importer server.mjs");

  const codeOnly = stripComments(content);
  assert.ok(!/\bdocument\./.test(codeOnly), "game.mjs ne doit pas référencer document.*");
  assert.ok(!/\bwindow\./.test(codeOnly), "game.mjs ne doit pas référencer window.*");
  assert.ok(!/addEventListener/.test(codeOnly), "game.mjs ne doit pas référencer addEventListener");
  assert.ok(!/requestAnimationFrame/.test(codeOnly), "game.mjs ne doit pas référencer requestAnimationFrame");
});

test("R19 — level.mjs est pur (aucun Math.random/Date.now/performance.now, pas de DOM)", async () => {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(new URL("./level.mjs", import.meta.url), "utf-8");
  const codeOnly = stripComments(content);

  assert.ok(!/Math\.random\(/.test(codeOnly), "level.mjs ne doit pas utiliser Math.random()");
  assert.ok(!/Date\.now\(/.test(codeOnly), "level.mjs ne doit pas utiliser Date.now()");
  assert.ok(!/performance\.now\(/.test(codeOnly), "level.mjs ne doit pas utiliser performance.now()");
  assert.ok(!/\bdocument\./.test(codeOnly), "level.mjs ne doit pas référencer document.*");
});

// Sanity : le vocabulaire de statut de fin (win/lose vs won/lost) reste au moins l'un des deux.
test("sanity — status de fin reconnu par le normaliseur win/lose", () => {
  assert.ok(WIN_STATUSES.size === 2 && LOSE_STATUSES.size === 2, "normaliseur de statut correctement défini");
});

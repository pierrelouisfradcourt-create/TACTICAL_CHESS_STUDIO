// Breakout — tests de PROPRIÉTÉS (invariants sur une longue séquence, déterminisme
// global). RÉÉCRIT le 2026-07-13 (go Pierre : "corrige l'arbitre pour qu'il colle aux
// deux branches") — voir l'en-tête de logic.test.mjs pour le détail du contrat public
// commun utilisé ici (step/paddle/ball/bricks/lives/score/level/status/reset), et
// WFL-01/results.md §3 pour la preuve que l'ancienne version ne s'exécutait sur AUCUNE
// des deux branches (API imaginée : applyInput/view/g.width/brick.health/'ACTIVE').
import { test } from "node:test";
import assert from "node:assert/strict";
import { BreakoutGame, GAME_WIDTH } from "./game.mjs";

const TERMINAL_STATUSES = new Set(["win", "won", "lose", "lost"]);

// === Propriété : le score ne diminue jamais ===
test("Propriété — score monotone: ne diminue jamais sur 500 steps", () => {
  const g = new BreakoutGame({ seed: 100 });
  let prevScore = g.score;

  for (let i = 0; i < 500 && !TERMINAL_STATUSES.has(g.status); i += 1) {
    g.step(16, { left: i % 4 === 0, right: i % 4 === 2 });
    assert.ok(g.score >= prevScore, `score doit être >= ${prevScore}, got ${g.score} au step ${i}`);
    prevScore = g.score;
  }
});

// === Propriété : les vies ne descendent jamais sous 0 ===
test("Propriété — lives >= 0: jamais négatif sur 500 steps", () => {
  const g = new BreakoutGame({ seed: 101 });

  for (let i = 0; i < 500 && !TERMINAL_STATUSES.has(g.status); i += 1) {
    g.step(16, {});
    assert.ok(g.lives >= 0, `lives ne doit jamais être < 0, got ${g.lives} au step ${i}`);
  }
});

// === Propriété : la raquette reste dans l'aire de jeu à tout instant ===
test("Propriété — paddle dans les bornes [0, GAME_WIDTH-width] sur 500 steps", () => {
  const g = new BreakoutGame({ seed: 102 });

  for (let i = 0; i < 500 && !TERMINAL_STATUSES.has(g.status); i += 1) {
    g.step(16, { left: i % 3 === 0, right: i % 3 === 1 });
    assert.ok(g.paddle.x >= 0, `paddle.x doit être >= 0, got ${g.paddle.x} au step ${i}`);
    assert.ok(
      g.paddle.x <= GAME_WIDTH - g.paddle.width,
      `paddle.x doit être <= ${GAME_WIDTH - g.paddle.width}, got ${g.paddle.x} au step ${i}`
    );
  }
});

// === Propriété : la magnitude de vitesse de la balle reste bornée (pas d'explosion
// numérique) — pas une égalité stricte car les deux formules de rebond raquette
// diffèrent légèrement (ce n'est pas le contrat, cf. logic.test.mjs R4), mais aucune
// des deux ne doit produire une vitesse aberrante. ===
test("Propriété — vitesse de la balle reste dans un ordre de grandeur borné sur 300 steps", () => {
  const g = new BreakoutGame({ seed: 103 });
  const speed0 = Math.hypot(g.ball.vx, g.ball.vy);
  assert.ok(speed0 > 0, "la vitesse initiale doit être non nulle");

  for (let i = 0; i < 300 && !TERMINAL_STATUSES.has(g.status); i += 1) {
    g.step(16, {});
    const speed = Math.hypot(g.ball.vx, g.ball.vy);
    assert.ok(speed > 0, `la vitesse ne doit jamais tomber à 0, got ${speed} au step ${i}`);
    assert.ok(
      speed < speed0 * 10,
      `la vitesse ne doit pas exploser (>10x la vitesse initiale), got ${speed} vs ${speed0} au step ${i}`
    );
  }
});

// === Déterminisme global : même seed + même séquence d'input => même déroulé exact ===
test("Déterminisme — même seed + même séquence d'input => état final identique (200 steps)", () => {
  const seed = 999;
  const g1 = new BreakoutGame({ seed });
  const g2 = new BreakoutGame({ seed });

  for (let i = 0; i < 200; i += 1) {
    const input = { left: i % 5 === 0, right: i % 5 === 2 };
    g1.step(16, input);
    g2.step(16, input);
  }

  assert.equal(g1.ball.x, g2.ball.x, "ball.x doit être identique bit-à-bit (même seed, mêmes inputs)");
  assert.equal(g1.ball.y, g2.ball.y, "ball.y doit être identique bit-à-bit");
  assert.equal(g1.paddle.x, g2.paddle.x, "paddle.x doit être identique bit-à-bit");
  assert.equal(g1.score, g2.score, "score doit être identique");
  assert.equal(g1.lives, g2.lives, "lives doit être identique");
  assert.equal(g1.level, g2.level, "level doit être identique");
  assert.equal(g1.status, g2.status, "status doit être identique");
});

// === Propriété : à niveau constant, le nombre de briques cassables vivantes ne peut
// jamais augmenter (R9) — remis à zéro au changement de niveau, puisqu'un niveau qui
// se recharge (R14) apporte légitimement de NOUVELLES briques (ce n'est pas une
// résurrection de brique détruite, c'est un niveau différent). ===
test("Propriété — briques cassables vivantes: jamais croissant TANT QUE le niveau ne change pas (500 steps)", () => {
  const g = new BreakoutGame({ seed: 104 });
  function aliveDestructibleCount(game) {
    let n = 0;
    for (const b of game.bricks) if (b.destructible && b.alive !== false) n += 1;
    return n;
  }
  let prevCount = aliveDestructibleCount(g);
  let prevLevel = g.level;

  for (let i = 0; i < 500 && !TERMINAL_STATUSES.has(g.status); i += 1) {
    g.step(16, { left: i % 3 === 0, right: i % 3 === 1 });
    const count = aliveDestructibleCount(g);
    if (g.level !== prevLevel) {
      // Nouveau niveau chargé (R14) : nouvelle disposition, pas une résurrection.
      prevLevel = g.level;
      prevCount = count;
      continue;
    }
    assert.ok(
      count <= prevCount,
      `le nombre de briques cassables vivantes ne doit jamais augmenter à niveau constant (${prevCount} -> ${count}) au step ${i}`
    );
    prevCount = count;
  }
});

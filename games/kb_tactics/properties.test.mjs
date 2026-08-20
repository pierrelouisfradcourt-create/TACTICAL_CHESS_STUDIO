// kb_tactics — tests de PROPRIÉTÉ (invariants sur beaucoup de seeds + séquences seedées).
// Attrapent les mutants que les exemples à seed fixe ratent (bornes, monotonies, déterminisme).
import { test } from "node:test";
import assert from "node:assert/strict";
import { KbTacticsGame, GRID_W, GRID_H, PLAYER_MAX_HP } from "./game.mjs";

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ACTIONS = ["up", "down", "left", "right", "wait"];

test("invariant : hp ∈ [0, PLAYER_MAX_HP] à tout instant sur 40 parties aléatoires", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = new KbTacticsGame({ seed });
    const rnd = mulberry32(seed * 31 + 7);
    for (let i = 0; i < 60 && g.status === "ACTIVE"; i++) {
      g.step(ACTIONS[Math.floor(rnd() * ACTIONS.length)]);
      assert.ok(g.player.hp >= 0 && g.player.hp <= PLAYER_MAX_HP, `seed ${seed}: hp=${g.player.hp}`);
    }
  }
});

test("invariant : le joueur reste toujours dans la grille et hors obstacle", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = new KbTacticsGame({ seed });
    const rnd = mulberry32(seed * 17 + 3);
    for (let i = 0; i < 60 && g.status === "ACTIVE"; i++) {
      g.step(ACTIONS[Math.floor(rnd() * ACTIONS.length)]);
      assert.ok(g.player.x >= 0 && g.player.x < GRID_W && g.player.y >= 0 && g.player.y < GRID_H);
      assert.equal(g.grid[g.player.y][g.player.x], 0, `seed ${seed}: joueur sur obstacle`);
    }
  }
});

test("invariant : le joueur se déplace d'au plus 1 case de Manhattan par tour", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = new KbTacticsGame({ seed });
    const rnd = mulberry32(seed * 13 + 5);
    for (let i = 0; i < 50 && g.status === "ACTIVE"; i++) {
      const p0 = { x: g.player.x, y: g.player.y };
      g.step(ACTIONS[Math.floor(rnd() * ACTIONS.length)]);
      const dist = Math.abs(g.player.x - p0.x) + Math.abs(g.player.y - p0.y);
      assert.ok(dist <= 1, `seed ${seed}: saut de ${dist}`);
    }
  }
});

test("invariant : les ennemis restent dans la grille, hors obstacle, sans se superposer", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = new KbTacticsGame({ seed });
    const rnd = mulberry32(seed * 29 + 1);
    for (let i = 0; i < 50 && g.status === "ACTIVE"; i++) {
      g.step(ACTIONS[Math.floor(rnd() * ACTIONS.length)]);
      const occ = new Set();
      for (const e of g.enemies) {
        assert.ok(e.x >= 0 && e.x < GRID_W && e.y >= 0 && e.y < GRID_H);
        assert.equal(g.grid[e.y][e.x], 0, `ennemi sur obstacle seed ${seed}`);
        const k = `${e.x},${e.y}`;
        assert.ok(!occ.has(k), `ennemis superposés seed ${seed}`);
        occ.add(k);
      }
    }
  }
});

test("invariant : WON => joueur sur la sortie ; LOST => hp==0 (cohérence des fins)", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const g = new KbTacticsGame({ seed });
    const rnd = mulberry32(seed * 7 + 11);
    let steps = 0;
    while (g.status === "ACTIVE" && steps < 200) {
      g.step(ACTIONS[Math.floor(rnd() * ACTIONS.length)]);
      steps++;
    }
    if (g.status === "WON") {
      assert.ok(g.player.x === g.exit.x && g.player.y === g.exit.y);
    } else if (g.status === "LOST") {
      assert.equal(g.player.hp, 0);
    }
  }
});

test("invariant : déterminisme total sur séquences aléatoires seedées (rejeu identique)", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const rnd1 = mulberry32(seed * 991 + 2);
    const seq = Array.from({ length: 40 }, () => ACTIONS[Math.floor(rnd1() * ACTIONS.length)]);
    const a = new KbTacticsGame({ seed });
    const b = new KbTacticsGame({ seed });
    for (const act of seq) { a.step(act); b.step(act); }
    assert.equal(JSON.stringify(a.view()), JSON.stringify(b.view()));
  }
});

test("invariant de PLACEMENT ennemi sur 200 seeds : libre, hors sortie, distance>2 du départ, distincts", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = new KbTacticsGame({ seed });
    assert.equal(g.enemies.length, 2, `seed ${seed}: compte`);
    const occ = new Set();
    for (const e of g.enemies) {
      assert.equal(g.grid[e.y][e.x], 0, `seed ${seed}: ennemi sur obstacle`);
      assert.ok(!(e.x === g.exit.x && e.y === g.exit.y), `seed ${seed}: ennemi sur la sortie`);
      assert.ok(Math.abs(e.x - 0) + Math.abs(e.y - 0) > 2, `seed ${seed}: ennemi trop près du départ`);
      const k = `${e.x},${e.y}`;
      assert.ok(!occ.has(k), `seed ${seed}: ennemis en double`);
      occ.add(k);
    }
  }
});

test("invariant : deux seeds différents produisent des niveaux différents (RNG seedé effectif)", () => {
  const a = new KbTacticsGame({ seed: 1 });
  const b = new KbTacticsGame({ seed: 999 });
  const diffGrid = JSON.stringify(a.grid) !== JSON.stringify(b.grid);
  const diffEnemies = JSON.stringify(a.enemies) !== JSON.stringify(b.enemies);
  assert.ok(diffGrid || diffEnemies, "seeds différents => niveaux identiques (RNG neutralisé)");
});

test("invariant : hp non croissant (le joueur ne se soigne jamais)", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = new KbTacticsGame({ seed });
    const rnd = mulberry32(seed * 53 + 9);
    let prev = g.player.hp;
    for (let i = 0; i < 60 && g.status === "ACTIVE"; i++) {
      g.step(ACTIONS[Math.floor(rnd() * ACTIONS.length)]);
      assert.ok(g.player.hp <= prev, `seed ${seed}: hp a augmenté (${prev} -> ${g.player.hp})`);
      prev = g.player.hp;
    }
  }
});

// properties.test.mjs — property-based (LCG seedé, 40 seeds) : déterminisme de la
// génération, invariants du moteur, et anti-mutants de level.mjs.
import test from "node:test";
import assert from "node:assert";
import { MenagerieBattle } from "./game.mjs";
import { generateBattle } from "./level.mjs";

function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7 + 1);

test("propriété: generateBattle est déterministe (même seed => disposition identique)", () => {
  for (const seed of SEEDS) {
    const a = JSON.stringify(generateBattle(1, seed));
    const b = JSON.stringify(generateBattle(1, seed));
    assert.strictEqual(a, b, `seed ${seed} non déterministe`);
  }
});

test("propriété: des seeds différents produisent des batailles différentes (garde RNG)", () => {
  // Sous le mutant `(seed>>>0) && 1`, toutes les seeds collapsent sur s=1 -> batailles
  // identiques : cette assertion le tue.
  const distinct = new Set(SEEDS.map((s) => JSON.stringify(generateBattle(1, s))));
  assert.ok(distinct.size > 1, "toutes les seeds donnent la même bataille (RNG cassé)");
});

test("propriété: toute bête générée est active, non cicatrisée, non capturée", () => {
  for (const seed of SEEDS) {
    for (const b of generateBattle(1, seed).beasts) {
      assert.strictEqual(b.active, true, `seed ${seed} bête ${b.id} inactive`);
      assert.strictEqual(b.scarred, false, `seed ${seed} bête ${b.id} cicatrisée`);
      assert.strictEqual(b.captured, false, `seed ${seed} bête ${b.id} capturée`);
    }
  }
});

test("propriété: le terrain est majoritairement normal (garde densité de forêt)", () => {
  // Sous le mutant `roll<0.14 || !PROTECTED` presque toutes les cases deviennent
  // forêt : la majorité-normal le tue.
  for (const seed of SEEDS) {
    const setup = generateBattle(1, seed);
    let forest = 0;
    let normal = 0;
    for (const row of setup.terrain) {
      for (const cell of row) {
        if (cell === "forest") { forest += 1; } else { normal += 1; }
      }
    }
    assert.ok(normal > forest, `seed ${seed} : ${forest} forêt >= ${normal} normal`);
  }
});

test("propriété: le coin de capture (0,0) et ses cases d'encerclement ne sont jamais forêt", () => {
  for (const seed of SEEDS) {
    const t = generateBattle(1, seed).terrain;
    assert.strictEqual(t[0][0], "normal");
    assert.strictEqual(t[0][1], "normal");
    assert.strictEqual(t[1][0], "normal");
  }
});

test("propriété: seed=1 est solvable-compatible (un ennemi faible immobile existe)", () => {
  const setup = generateBattle(1, 1);
  const weak = setup.beasts.find(
    (b) => b.side === "enemy" && b.move === 0 && b.hp < setup.captureThreshold,
  );
  assert.ok(weak, "aucun ennemi capturable (faible + immobile) au seed 1");
});

test("propriété: bêtes toujours dans la grille sous des actions joueur aléatoires (40 seeds)", () => {
  for (const seed of SEEDS) {
    const b = new MenagerieBattle(generateBattle(1, seed));
    const rnd = lcg(seed + 3);
    for (let round = 0; round < 30 && !b.over; round++) {
      for (const p of b.activeBeasts("player")) {
        const nx = Math.floor(rnd() * b.width);
        const ny = Math.floor(rnd() * b.height);
        b.moveBeast(p, nx, ny); // réussit ou non, jamais hors grille
      }
      b.endTurn();
      for (const beast of b.beasts) {
        assert.ok(beast.x >= 0 && beast.x < b.width, `seed ${seed} x=${beast.x} hors grille`);
        assert.ok(beast.y >= 0 && beast.y < b.height, `seed ${seed} y=${beast.y} hors grille`);
      }
    }
  }
});

test("propriété: captures monotones et fin de partie monotone (40 seeds)", () => {
  for (const seed of SEEDS) {
    const b = new MenagerieBattle(generateBattle(1, seed));
    let prevCaptures = 0;
    let wasOver = false;
    for (let round = 0; round < 60; round++) {
      b.endTurn();
      assert.ok(b.captures >= prevCaptures, `seed ${seed} captures ont baissé`);
      prevCaptures = b.captures;
      if (b.over) { wasOver = true; }
      if (wasOver) { assert.strictEqual(b.over, true, `seed ${seed} over est redevenu false`); }
    }
  }
});

test("propriété: PV toujours dans [0, maxHp] et bête à 0 PV inactive (40 seeds)", () => {
  for (const seed of SEEDS) {
    const b = new MenagerieBattle(generateBattle(1, seed));
    for (let round = 0; round < 40 && !b.over; round++) {
      b.endTurn();
      for (const beast of b.beasts) {
        assert.ok(beast.hp >= 0 && beast.hp <= beast.maxHp, `seed ${seed} pv=${beast.hp} hors [0,${beast.maxHp}]`);
        if (beast.hp === 0) { assert.strictEqual(beast.active, false, `seed ${seed} bête ${beast.id} 0 PV mais active`); }
      }
    }
  }
});

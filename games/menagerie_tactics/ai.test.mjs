// ai.test.mjs — IA ennemie v2 : ciblage (heuristique a : éviter ×0.5), plus-proche
// avec tie-break, économie d'action (1 action/ennemi, skip maîtrisé), déplacement
// évitant la menace (heuristique b). Fichier de test NEUF (hors zone protégée).
import test from "node:test";
import assert from "node:assert";
import { MenagerieBattle } from "./game.mjs";

function mk(beasts, opts = {}) {
  const terrain = Array.from({ length: 8 }, () => Array(8).fill("normal"));
  if (opts.wall) { for (const [x, y] of opts.wall) { terrain[y][x] = "wall"; } }
  return new MenagerieBattle({ width: 8, height: 8, terrain, beasts, captureThreshold: opts.captureThreshold ?? 6 });
}
function beast(o) {
  return {
    id: o.id, side: o.side, x: o.x, y: o.y, type: o.type || "braise",
    hp: o.hp ?? 10, maxHp: o.maxHp ?? o.hp ?? 10, atk: o.atk ?? 5,
    speed: o.speed ?? 5, move: o.move ?? 3, range: o.range ?? 1, active: o.active !== false,
  };
}

test("chooseEnemyTarget évite un matchup ×0.5 même plus proche (heuristique a)", () => {
  // foudre est FAIBLE contre onde (onde bat foudre) ; NEUTRE contre braise.
  const b = mk([
    beast({ id: 20, side: "enemy", x: 0, y: 0, type: "foudre" }),
    beast({ id: 1, side: "player", x: 1, y: 0, type: "onde" }), // proche mais ×0.5
    beast({ id: 2, side: "player", x: 3, y: 0, type: "braise" }), // loin mais neutre
  ]);
  const t = b.chooseEnemyTarget(b.beasts[0], b.activeBeasts("player"));
  assert.strictEqual(t.id, 2);
});
test("chooseEnemyTarget : si tout est ×0.5, prend quand même le plus proche", () => {
  const b = mk([
    beast({ id: 20, side: "enemy", x: 0, y: 0, type: "foudre" }),
    beast({ id: 1, side: "player", x: 1, y: 0, type: "onde" }),
    beast({ id: 2, side: "player", x: 3, y: 0, type: "onde" }),
  ]);
  assert.strictEqual(b.chooseEnemyTarget(b.beasts[0], b.activeBeasts("player")).id, 1);
});

test("_nearest : plus proche, tie-break id croissant ; null si vide", () => {
  const b = mk([
    beast({ id: 20, side: "enemy", x: 0, y: 0 }),
    beast({ id: 5, side: "player", x: 2, y: 0 }), // dist 2, gros id, listé 1er
    beast({ id: 3, side: "player", x: 0, y: 2 }), // dist 2, petit id (gagne le tie)
    beast({ id: 9, side: "player", x: 5, y: 0 }), // loin
  ]);
  assert.strictEqual(b._nearest(b.beasts[0], b.activeBeasts("player")).id, 3);
  assert.strictEqual(b._nearest(b.beasts[0], []), null);
});

test("enemyStep : chaque ennemi agit UNE fois (pas deux)", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 0, hp: 20, atk: 0, range: 1 }),
    beast({ id: 20, side: "enemy", x: 3, y: 0, move: 0, range: 1, atk: 5, type: "braise" }),
  ]);
  b.enemyStep();
  assert.strictEqual(b.beasts[0].hp, 15); // attaqué une seule fois
});
test("enemyStep : une bête maîtrisée n'attaque pas (skip subdued)", () => {
  const b = mk([
    beast({ id: 20, side: "enemy", x: 0, y: 0, hp: 4, move: 0, range: 1, atk: 5, type: "braise" }),
    beast({ id: 1, side: "player", x: 1, y: 0, hp: 20, atk: 0, range: 1 }),
    beast({ id: 2, side: "player", x: 0, y: 1, hp: 20, atk: 0, range: 1 }),
  ], { captureThreshold: 6 });
  b.enemyStep();
  assert.strictEqual(b.beasts[1].hp, 20); // ennemi maîtrisé n'a pas frappé
  assert.strictEqual(b.beasts[2].hp, 20);
});

test("rankedSteps : à distance ÉGALE, préfère la case NON menacée (heuristique b)", () => {
  // depuis (4,4) vers (0,0) : (3,4) et (4,3) sont à égale distance 7. Un joueur en
  // (3,6) menace (3,4) mais pas (4,3) -> la case sûre (4,3) doit passer devant.
  const b = mk([
    beast({ id: 20, side: "enemy", x: 4, y: 4, move: 3, range: 1, type: "braise" }),
    beast({ id: 1, side: "player", x: 3, y: 6, move: 1, range: 1 }),
  ]);
  const ranked = b.rankedSteps(b.beasts[0], { x: 0, y: 0 });
  assert.deepStrictEqual(ranked[0], [4, 3]); // équidistante non menacée d'abord
});

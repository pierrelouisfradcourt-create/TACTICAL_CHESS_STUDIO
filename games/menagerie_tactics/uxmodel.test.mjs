// uxmodel.test.mjs — modèle de présentation (classifyCells disjoints, previewAttack
// enrichi, captureEligible, describeObjective). Fichier NEUF (hors zone protégée).
import test from "node:test";
import assert from "node:assert";
import { MenagerieBattle } from "./game.mjs";
import {
  classifyCells, previewAttack, captureEligible, describeObjective, reachableCells, attackableCells,
} from "./uxmodel.mjs";

function mk(beasts, opts = {}) {
  const terrain = Array.from({ length: 8 }, () => Array(8).fill("normal"));
  if (opts.forest) { for (const [x, y] of opts.forest) { terrain[y][x] = "forest"; } }
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
function inter(a, b) { let n = 0; for (const c of a) { if (b.has(c)) { n += 1; } } return n; }

test("#1 classifyCells : buckets 2-à-2 disjoints", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 4, move: 3, range: 1 }),
    beast({ id: 2, side: "enemy", x: 5, y: 4, move: 2, range: 1 }),
  ]);
  const c = classifyCells(b, b.beasts[0]);
  assert.strictEqual(inter(c.move, c.attack), 0);
  assert.strictEqual(inter(c.move, c.threat), 0);
  assert.strictEqual(inter(c.attack, c.threat), 0);
});

test("#2 précédence : une case atteignable ET menacée tombe dans threat, pas dans move", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 4, move: 3, range: 1 }),
    beast({ id: 2, side: "enemy", x: 4, y: 2, move: 1, range: 1 }),
  ]);
  const c = classifyCells(b, b.beasts[0]);
  assert.strictEqual(c.threat.has("4,3"), true); // menacée par l'ennemi (4,2)
  assert.strictEqual(c.move.has("4,3"), false); // et donc PAS en move
});

test("#3 un ennemi à portée : sa case ∈ attack, ∉ move, ∉ threat", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 4, move: 3, range: 1 }),
    beast({ id: 2, side: "enemy", x: 5, y: 4, move: 0, range: 1 }),
  ]);
  const c = classifyCells(b, b.beasts[0]);
  assert.strictEqual(c.attack.has("5,4"), true);
  assert.strictEqual(c.move.has("5,4"), false);
  assert.strictEqual(c.threat.has("5,4"), false);
});

test("#4 sel null : move/attack vides, threat === menace ennemie", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 4, y: 4 }),
    beast({ id: 2, side: "enemy", x: 0, y: 0, move: 1, range: 1 }),
  ]);
  const c = classifyCells(b, null);
  assert.strictEqual(c.move.size, 0);
  assert.strictEqual(c.attack.size, 0);
  assert.deepStrictEqual([...c.threat].sort(), [...b.threatenedCells("enemy")].sort());
});

test("#5 previewAttack matchup fort : mult 1.5, damage floor(atk*1.5), hpAfter", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, type: "braise", atk: 7 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, type: "ronce", hp: 20 }),
  ]);
  const p = previewAttack(b, b.beasts[0], b.beasts[1]);
  assert.strictEqual(p.mult, 1.5);
  assert.strictEqual(p.damage, Math.floor(7 * 1.5));
  assert.strictEqual(p.hpAfter, 20 - Math.floor(7 * 1.5));
  assert.strictEqual(p.lethal, false);
});

test("#6 previewAttack cible en forêt : dégât réduit de 1", () => {
  const plain = mk([beast({ id: 1, side: "player", x: 0, y: 0, type: "braise", atk: 6 }), beast({ id: 2, side: "enemy", x: 1, y: 0, type: "braise", hp: 20 })]);
  const forest = mk([beast({ id: 1, side: "player", x: 0, y: 0, type: "braise", atk: 6 }), beast({ id: 2, side: "enemy", x: 1, y: 0, type: "braise", hp: 20 })], { forest: [[1, 0]] });
  assert.strictEqual(previewAttack(forest, forest.beasts[0], forest.beasts[1]).damage, previewAttack(plain, plain.beasts[0], plain.beasts[1]).damage - 1);
});

test("#7 previewAttack létal : hpAfter 0, lethal true, riposteDmg 0", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, atk: 100, type: "braise" }), beast({ id: 2, side: "enemy", x: 1, y: 0, hp: 5, type: "braise" })]);
  const p = previewAttack(b, b.beasts[0], b.beasts[1]);
  assert.strictEqual(p.lethal, true);
  assert.strictEqual(p.hpAfter, 0);
  assert.strictEqual(p.riposteDmg, 0);
});

test("#8 previewAttack maîtrisée : capturable + maitrisee, riposteDmg 0 (FIX reflété côté UX)", () => {
  const b = mk([
    beast({ id: 99, side: "enemy", x: 0, y: 0, hp: 4, type: "ronce", atk: 5, range: 1 }),
    beast({ id: 1, side: "player", x: 1, y: 0, atk: 3, type: "braise", range: 1 }),
    beast({ id: 2, side: "player", x: 0, y: 1, atk: 3, type: "braise" }),
  ], { captureThreshold: 6 });
  const p = previewAttack(b, b.beasts[1], b.beasts[0]);
  assert.strictEqual(p.maitrisee, true);
  assert.strictEqual(p.capturable, true);
  assert.strictEqual(p.riposteDmg, 0);
});

test("#8b capturable exige !lethal ET weakAfter ET encircled>=2 (couvre chaque conjonct)", () => {
  // cible NON maîtrisée (hp8 >= seuil6) encerclée par 2 : devient capturable si affaiblie
  // sans être tuée ; PAS capturable si létale ; PAS capturable si reste au-dessus du seuil.
  function setup(atk) {
    return mk([
      beast({ id: 99, side: "enemy", x: 0, y: 0, hp: 8, type: "ronce", range: 1 }),
      beast({ id: 1, side: "player", x: 1, y: 0, atk, type: "braise", range: 1 }),
      beast({ id: 2, side: "player", x: 0, y: 1, atk: 0, type: "braise" }),
    ], { captureThreshold: 6 });
  }
  const soft = setup(4); // dégât 6 (braise fort x1.5) -> hpAfter 2 : affaiblie, pas KO
  const ps = previewAttack(soft, soft.beasts[1], soft.beasts[0]);
  assert.strictEqual(ps.lethal, false);
  assert.strictEqual(ps.capturable, true); // devient capturable
  const kill = setup(100); // létal
  assert.strictEqual(previewAttack(kill, kill.beasts[1], kill.beasts[0]).capturable, false); // !lethal faux
  const graze = setup(1); // dégât 1 -> hpAfter 7 (>= seuil) : pas weakAfter
  assert.strictEqual(previewAttack(graze, graze.beasts[1], graze.beasts[0]).capturable, false); // weakAfter faux
});

test("#9 previewAttack riposte : cible non maîtrisée survivante à portée => canRetaliate, riposteDmg>0", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, atk: 5, type: "braise", range: 1, hp: 20 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, atk: 5, type: "braise", range: 1, hp: 20 }),
  ]);
  const p = previewAttack(b, b.beasts[0], b.beasts[1]);
  assert.strictEqual(p.canRetaliate, true);
  assert.ok(p.riposteDmg > 0);
});

test("#10 captureEligible frontière : 1 encercleur false, 2 true", () => {
  const one = mk([beast({ id: 9, side: "enemy", x: 0, y: 0, hp: 4 }), beast({ id: 1, side: "player", x: 1, y: 0 })], { captureThreshold: 6 });
  assert.strictEqual(captureEligible(one, one.beasts[0]), false);
  const two = mk([beast({ id: 9, side: "enemy", x: 0, y: 0, hp: 4 }), beast({ id: 1, side: "player", x: 1, y: 0 }), beast({ id: 2, side: "player", x: 0, y: 1 })], { captureThreshold: 6 });
  assert.strictEqual(captureEligible(two, two.beasts[0]), true);
});

test("#11 describeObjective rout : compte + accompli quand plus d'ennemis", () => {
  const active = describeObjective({ enemyActive: 2, beasts: [] }, { kind: "rout" });
  assert.strictEqual(active.done, false);
  assert.ok(/2/.test(active.label));
  const done = describeObjective({ enemyActive: 0, beasts: [] }, { kind: "rout" });
  assert.strictEqual(done.done, true);
});

test("reachableCells : bornes exactes (d==move inclus, d==move+1 exclu, self/mur/occupée exclus)", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, move: 3 }),
    beast({ id: 2, side: "player", x: 1, y: 0 }),
  ], { wall: [[0, 2]] });
  const r = reachableCells(b, b.beasts[0]);
  assert.strictEqual(r.has("3,0"), true); // d == move (tue le->lt)
  assert.strictEqual(r.has("4,0"), false); // d == move+1
  assert.strictEqual(r.has("0,1"), true); // d == 1 (tue ge->gt : d>1 l'exclurait)
  assert.strictEqual(r.has("0,0"), false); // self
  assert.strictEqual(r.has("1,0"), false); // occupée
  assert.strictEqual(r.has("0,2"), false); // mur (tue neq->eq)
});

test("attackableCells : ennemi actif à portée inclus ; allié et ennemi KO exclus", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, range: 1 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0 }),
    beast({ id: 3, side: "player", x: 2, y: 2 }),
    beast({ id: 4, side: "enemy", x: 0, y: 1, active: false }),
  ]);
  const a = attackableCells(b, b.beasts[0]);
  assert.strictEqual(a.has("1,0"), true); // ennemi actif à portée
  assert.strictEqual(a.has("2,2"), false); // allié (tue && -> ||)
  assert.strictEqual(a.has("0,1"), false); // ennemi KO
});

test("describeObjective capture/survive : accompli selon l'état", () => {
  assert.strictEqual(describeObjective({ beasts: [{ id: 9, captured: false }] }, { kind: "capture", targetId: 9 }).done, false);
  assert.strictEqual(describeObjective({ beasts: [{ id: 9, captured: true }] }, { kind: "capture", targetId: 9 }).done, true);
  assert.strictEqual(describeObjective({ turn: 3 }, { kind: "survive", turns: 3 }).done, false);
  assert.strictEqual(describeObjective({ turn: 4 }, { kind: "survive", turns: 3 }).done, true);
  assert.strictEqual(describeObjective({}, { kind: "inconnu" }).done, false); // branche par défaut
});

test("#12 consistance MIN_ENCIRCLERS : 2 encercleurs tenus un tour => 1 capture (fidèle au moteur)", () => {
  const b = mk([
    beast({ id: 99, side: "enemy", x: 0, y: 0, hp: 4, move: 0, range: 0 }),
    beast({ id: 1, side: "player", x: 1, y: 0, atk: 0 }),
    beast({ id: 2, side: "player", x: 0, y: 1, atk: 0 }),
  ], { captureThreshold: 6 });
  b.resolveCapture();
  b.resolveCapture();
  assert.strictEqual(b.captures, 1);
});

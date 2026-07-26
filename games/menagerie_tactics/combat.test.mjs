// combat.test.mjs — économie d'action v2 : budget (moved/acted), riposte, maîtrise,
// FIX capture-vs-riposte. Fichier de test NEUF (hors zone protégée). Assertions
// strictes pour tuer les mutants des nouvelles méthodes de game.mjs.
import test from "node:test";
import assert from "node:assert";
import { MenagerieBattle } from "./game.mjs";

function mk(beasts, opts = {}) {
  const terrain = Array.from({ length: 8 }, () => Array(8).fill("normal"));
  return new MenagerieBattle({ width: 8, height: 8, terrain, beasts, captureThreshold: opts.captureThreshold ?? 6 });
}
function beast(o) {
  return {
    id: o.id, side: o.side, x: o.x, y: o.y, type: o.type || "braise",
    hp: o.hp ?? 10, maxHp: o.maxHp ?? o.hp ?? 10, atk: o.atk ?? 5,
    speed: o.speed ?? 5, move: o.move ?? 3, range: o.range ?? 1,
    active: o.active !== false,
  };
}

test("beginPhase réinitialise le budget du camp ciblé UNIQUEMENT", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0 }), beast({ id: 2, side: "enemy", x: 7, y: 7 })]);
  b.beasts[0].moved = true; b.beasts[0].acted = true;
  b.beasts[1].moved = true; b.beasts[1].acted = true;
  b.beginPhase("player");
  assert.strictEqual(b.beasts[0].moved, false);
  assert.strictEqual(b.beasts[0].acted, false);
  assert.strictEqual(b.beasts[1].moved, true); // l'ennemi garde ses drapeaux
  assert.strictEqual(b.beasts[1].acted, true);
  assert.strictEqual(b.currentSide, "player");
});

test("clone: moved/acted transportés exactement (true ET false)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0 }), beast({ id: 2, side: "player", x: 1, y: 0 })]);
  b.beasts[0].moved = true; b.beasts[0].acted = true;
  const v = b.view();
  assert.strictEqual(v.beasts.find((x) => x.id === 1).moved, true);
  assert.strictEqual(v.beasts.find((x) => x.id === 1).acted, true);
  assert.strictEqual(v.beasts.find((x) => x.id === 2).moved, false);
  assert.strictEqual(v.beasts.find((x) => x.id === 2).acted, false);
});

test("commitMove: 1 déplacement/tour ; 2e refusé (position inchangée)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, move: 3 })]);
  const p = b.beasts[0];
  assert.strictEqual(b.commitMove(p, 3, 0), true);
  assert.strictEqual(p.x, 3);
  assert.strictEqual(p.moved, true);
  assert.strictEqual(b.commitMove(p, 3, 1), false); // déjà bougé
  assert.strictEqual(p.x, 3);
});
test("commitMove: refuse une bête inactive ; un échec laisse moved=false (réessayable)", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, move: 3, active: false }),
    beast({ id: 2, side: "player", x: 5, y: 5, move: 1 }),
  ]);
  assert.strictEqual(b.commitMove(b.beasts[0], 1, 0), false); // inactive
  const p2 = b.beasts[1];
  assert.strictEqual(b.commitMove(p2, 7, 7), false); // hors portée
  assert.strictEqual(p2.moved, false);
  assert.strictEqual(b.commitMove(p2, 5, 4), true); // réessaie OK
});

test("commitAttack: 1 action/tour ; agir clôt le tour (moved+acted) ; 2e refusé", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, range: 1, atk: 5, type: "braise" }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, hp: 20, type: "braise", atk: 0 }),
  ]);
  const a = b.beasts[0];
  assert.strictEqual(b.commitAttack(a, b.beasts[1]), true);
  assert.strictEqual(a.acted, true);
  assert.strictEqual(a.moved, true);
  assert.strictEqual(b.commitAttack(a, b.beasts[1]), false); // déjà agi
});
test("commitAttack refuse: inactive, hors portée, allié", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, range: 1 }),
    beast({ id: 2, side: "enemy", x: 5, y: 0 }),
    beast({ id: 3, side: "player", x: 1, y: 0 }),
  ]);
  assert.strictEqual(b.commitAttack(b.beasts[0], b.beasts[1]), false); // hors portée
  assert.strictEqual(b.commitAttack(b.beasts[0], b.beasts[2]), false); // allié
  b.beasts[0].active = false;
  assert.strictEqual(b.commitAttack(b.beasts[0], b.beasts[1]), false); // inactive
});
test("commitAttack refuse une bête MAÎTRISÉE (ne peut pas agir)", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 1, y: 1, hp: 1, range: 1 }),
    beast({ id: 2, side: "enemy", x: 0, y: 1 }),
    beast({ id: 3, side: "enemy", x: 2, y: 1 }),
  ], { captureThreshold: 6 });
  assert.strictEqual(b.isSubdued(b.beasts[0]), true);
  assert.strictEqual(b.commitAttack(b.beasts[0], b.beasts[1]), false);
});

test("isSubdued: exige >=2 encercleurs ET hp<seuil (bornes)", () => {
  const one = mk([beast({ id: 9, side: "enemy", x: 0, y: 0, hp: 4 }), beast({ id: 1, side: "player", x: 1, y: 0 })], { captureThreshold: 6 });
  assert.strictEqual(one.isSubdued(one.beasts[0]), false); // 1 encercleur
  const strong = mk([beast({ id: 9, side: "enemy", x: 0, y: 0, hp: 6 }), beast({ id: 1, side: "player", x: 1, y: 0 }), beast({ id: 2, side: "player", x: 0, y: 1 })], { captureThreshold: 6 });
  assert.strictEqual(strong.isSubdued(strong.beasts[0]), false); // hp 6 pas < 6
  const sub = mk([beast({ id: 9, side: "enemy", x: 0, y: 0, hp: 5 }), beast({ id: 1, side: "player", x: 1, y: 0 }), beast({ id: 2, side: "player", x: 0, y: 1 })], { captureThreshold: 6 });
  assert.strictEqual(sub.isSubdued(sub.beasts[0]), true);
});

test("resolveCombat: KO EXACT à 0 PV ; laisse actif si PV>0", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, atk: 100, type: "braise" }), beast({ id: 2, side: "enemy", x: 1, y: 0, hp: 3, type: "braise", atk: 0 })]);
  b.resolveCombat(b.beasts[0], b.beasts[1]);
  assert.strictEqual(b.beasts[1].hp, 0);
  assert.strictEqual(b.beasts[1].active, false);
  const b2 = mk([beast({ id: 1, side: "player", x: 0, y: 0, atk: 5, type: "braise" }), beast({ id: 2, side: "enemy", x: 1, y: 0, hp: 20, type: "braise", atk: 0 })]);
  b2.resolveCombat(b2.beasts[0], b2.beasts[1]);
  assert.strictEqual(b2.beasts[1].active, true);
});
test("resolveCombat: RIPOSTE unique du défenseur survivant à portée", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, atk: 5, type: "braise", hp: 20, range: 1 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, atk: 5, type: "braise", hp: 20, range: 1 }),
  ]);
  const r = b.resolveCombat(b.beasts[0], b.beasts[1]);
  assert.strictEqual(b.beasts[1].hp, 15); // coup encaissé
  assert.strictEqual(b.beasts[0].hp, 15); // riposte encaissée
  assert.ok(r.riposteDmg > 0);
});
test("resolveCombat: PAS de riposte si défenseur KO ou hors de portée", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, atk: 100, type: "braise", hp: 20, range: 1 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, atk: 5, type: "braise", hp: 3, range: 1 }),
  ]);
  const r = b.resolveCombat(b.beasts[0], b.beasts[1]);
  assert.strictEqual(b.beasts[1].active, false);
  assert.strictEqual(r.riposteDmg, 0); // KO => pas de riposte
  assert.strictEqual(b.beasts[0].hp, 20);
  const b2 = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, atk: 5, type: "braise", hp: 20, range: 5 }),
    beast({ id: 2, side: "enemy", x: 3, y: 0, atk: 5, type: "braise", hp: 20, range: 1 }),
  ]);
  b2.resolveCombat(b2.beasts[0], b2.beasts[1]);
  assert.strictEqual(b2.beasts[0].hp, 20); // défenseur range1 ne peut riposter à distance 3
});
test("FIX capture-vs-riposte: un encercleur ne peut JAMAIS KO une cible maîtrisée", () => {
  const b = mk([
    beast({ id: 99, side: "enemy", x: 0, y: 0, hp: 4, type: "ronce", atk: 5, range: 1 }),
    beast({ id: 1, side: "player", x: 1, y: 0, atk: 100, type: "braise", hp: 20, range: 1 }),
    beast({ id: 2, side: "player", x: 0, y: 1, atk: 100, type: "braise", hp: 20, range: 1 }),
  ], { captureThreshold: 6 });
  assert.strictEqual(b.isSubdued(b.beasts[0]), true);
  const r = b.resolveCombat(b.beasts[1], b.beasts[0]); // un encercleur frappe la maîtrisée
  assert.strictEqual(b.beasts[0].hp, 1); // plancher 1, JAMAIS KO
  assert.strictEqual(b.beasts[0].active, true);
  assert.strictEqual(r.riposteDmg, 0); // maîtrisée ne riposte pas
  assert.strictEqual(r.subdued, true);
});

test("view.subdued liste exactement les bêtes maîtrisées actives", () => {
  const b = mk([
    beast({ id: 99, side: "enemy", x: 0, y: 0, hp: 4 }),
    beast({ id: 1, side: "player", x: 1, y: 0 }),
    beast({ id: 2, side: "player", x: 0, y: 1 }),
    beast({ id: 5, side: "enemy", x: 7, y: 7, hp: 20 }),
  ], { captureThreshold: 6 });
  assert.deepStrictEqual(b.view().subdued, [99]);
});

test("le journal accumule des events typés (attack + combat)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0, atk: 100, type: "braise" }), beast({ id: 2, side: "enemy", x: 1, y: 0, hp: 3, type: "braise", atk: 0 })]);
  b.commitAttack(b.beasts[0], b.beasts[1]);
  const kinds = b.log.map((e) => e.kind);
  assert.ok(kinds.includes("attack"));
  assert.ok(kinds.includes("combat"));
});

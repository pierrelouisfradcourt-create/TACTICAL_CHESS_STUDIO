// preview.test.mjs — previewAttack (aperçu PUR) et _relation. Le test de CONSISTANCE
// (l'aperçu prédit EXACTEMENT le résultat de resolveCombat) est le garde anti-mensonge
// d'UI. Fichier de test NEUF (hors zone protégée).
import test from "node:test";
import assert from "node:assert";
import { MenagerieBattle, TYPES } from "./game.mjs";

function mk(beasts, opts = {}) {
  const terrain = Array.from({ length: 8 }, () => Array(8).fill("normal"));
  return new MenagerieBattle({ width: 8, height: 8, terrain, beasts, captureThreshold: opts.captureThreshold ?? 6 });
}
function beast(o) {
  return {
    id: o.id, side: o.side, x: o.x, y: o.y, type: o.type || "braise",
    hp: o.hp ?? 10, maxHp: o.maxHp ?? o.hp ?? 10, atk: o.atk ?? 5,
    speed: o.speed ?? 5, move: o.move ?? 3, range: o.range ?? 1, active: o.active !== false,
  };
}
function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

test("_relation cohérent avec le cycle des types (strong/weak/neutral)", () => {
  const b = mk([beast({ id: 1, side: "player", x: 0, y: 0 })]);
  for (let i = 0; i < TYPES.length; i++) {
    const atk = TYPES[i];
    const next = TYPES[(i + 1) % TYPES.length];
    const prev = TYPES[(i + TYPES.length - 1) % TYPES.length];
    assert.strictEqual(b._relation(atk, next), "strong");
    assert.strictEqual(b._relation(atk, prev), "weak");
    assert.strictEqual(b._relation(atk, atk), "neutral");
  }
});

test("previewAttack est PUR (ne mute aucun état) et prédit les bons champs", () => {
  const b = mk([
    beast({ id: 1, side: "player", x: 0, y: 0, atk: 5, type: "braise", hp: 20, range: 1 }),
    beast({ id: 2, side: "enemy", x: 1, y: 0, atk: 5, type: "braise", hp: 20, range: 1 }),
  ]);
  const before = JSON.stringify(b.view());
  const p = b.previewAttack(b.beasts[0], b.beasts[1]);
  assert.strictEqual(JSON.stringify(b.view()), before); // pureté
  assert.strictEqual(p.relation, "neutral");
  assert.strictEqual(p.dmg, 5);
  assert.strictEqual(p.targetSurvives, true);
  assert.ok(p.riposteDmg > 0);
  assert.strictEqual(p.attackerSurvives, true);
});

test("CONSISTANCE : previewAttack === résultat réel de resolveCombat (40 scénarios seedés)", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = lcg(seed);
    const atkType = TYPES[Math.floor(rnd() * TYPES.length)];
    const defType = TYPES[Math.floor(rnd() * TYPES.length)];
    const atk = 3 + Math.floor(rnd() * 12);
    const defAtk = 3 + Math.floor(rnd() * 12);
    const hp = 3 + Math.floor(rnd() * 22);
    const setup = () => mk([
      beast({ id: 1, side: "player", x: 0, y: 0, atk, type: atkType, hp: 30, range: 1 }),
      beast({ id: 2, side: "enemy", x: 1, y: 0, atk: defAtk, type: defType, hp, range: 1 }),
    ]);
    const bp = setup();
    const p = bp.previewAttack(bp.beasts[0], bp.beasts[1]);
    const br = setup();
    const r = br.resolveCombat(br.beasts[0], br.beasts[1]);
    assert.strictEqual(p.dmg, r.dmg, `seed ${seed} dmg`);
    assert.strictEqual(p.riposteDmg, r.riposteDmg, `seed ${seed} riposte`);
    assert.strictEqual(p.targetSurvives, br.beasts[1].active, `seed ${seed} targetSurvives`);
    assert.strictEqual(p.attackerSurvives, br.beasts[0].hp > 0, `seed ${seed} attackerSurvives`);
  }
});

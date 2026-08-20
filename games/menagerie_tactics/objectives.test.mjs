// objectives.test.mjs — évaluation des 3 objectifs. Fichier NEUF (hors zone protégée).
import test from "node:test";
import assert from "node:assert";
import { evaluateObjective, OBJECTIVE_KINDS } from "./objectives.mjs";

test("OBJECTIVE_KINDS = rout/capture/survive", () => {
  assert.deepStrictEqual(OBJECTIVE_KINDS, ["rout", "capture", "survive"]);
});

test("rout : ennemis à 0 => won ; joueurs à 0 => lost ; les deux > 0 => active", () => {
  const spec = { kind: "rout" };
  assert.strictEqual(evaluateObjective(spec, { playerActive: 2, enemyActive: 0 }).status, "won");
  assert.strictEqual(evaluateObjective(spec, { playerActive: 0, enemyActive: 1 }).status, "lost");
  assert.strictEqual(evaluateObjective(spec, { playerActive: 2, enemyActive: 1 }).status, "active");
});

test("capture : cible capturée => won ; cible KO non capturée => lost ; cible active => active ; bon vs mauvais id", () => {
  const spec = { kind: "capture", targetId: 99 };
  const won = { playerActive: 2, enemyActive: 0, beasts: [{ id: 99, active: false, captured: true }] };
  assert.strictEqual(evaluateObjective(spec, won).status, "won");
  const lost = { playerActive: 2, enemyActive: 1, beasts: [{ id: 99, active: false, captured: false }] };
  assert.strictEqual(evaluateObjective(spec, lost).status, "lost");
  const active = { playerActive: 2, enemyActive: 1, beasts: [{ id: 99, active: true, captured: false }] };
  assert.strictEqual(evaluateObjective(spec, active).status, "active");
  // mauvais id : la cible n'est pas trouvée -> ni won ni lost (tue !== -> ===)
  const badId = { playerActive: 2, enemyActive: 1, beasts: [{ id: 77, active: false, captured: true }] };
  assert.strictEqual(evaluateObjective(spec, badId).status, "active");
});

test("capture : défaite si tous les joueurs KO même sans la cible perdue", () => {
  const spec = { kind: "capture", targetId: 99 };
  const v = { playerActive: 0, enemyActive: 1, beasts: [{ id: 99, active: true, captured: false }] };
  assert.strictEqual(evaluateObjective(spec, v).status, "lost");
});

test("survive : turn == turns => active ; turn == turns+1 => won ; joueurs 0 => lost", () => {
  const spec = { kind: "survive", turns: 3 };
  assert.strictEqual(evaluateObjective(spec, { playerActive: 2, turn: 3 }).status, "active");
  const won = evaluateObjective(spec, { playerActive: 2, turn: 4 });
  assert.strictEqual(won.status, "won");
  assert.deepStrictEqual(won.progress, { current: 4, needed: 3 });
  assert.strictEqual(evaluateObjective(spec, { playerActive: 0, turn: 4 }).status, "lost");
});

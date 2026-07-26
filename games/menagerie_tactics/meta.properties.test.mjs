// meta.properties.test.mjs — déterminisme de buildDeploySetup + round-trip/fallback
// de la sauvegarde (faux storage injecté, zéro dépendance). Fichier NEUF.
import test from "node:test";
import assert from "node:assert";
import { buildDeploySetup, makeInstance } from "./meta.mjs";
import { SAVE_KEY, SCHEMA_VERSION, defaultSave, loadSave, persistSave } from "./save.mjs";

function fakeStorage(initial) {
  const map = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
    _map: map,
  };
}

test("déterminisme : même save+seed+choix => setup identique (40 seeds)", () => {
  const roster = [makeInstance("embraseur", 1), makeInstance("ondine", 2), makeInstance("fulgor", 3)];
  for (let seed = 1; seed <= 40; seed++) {
    const a = JSON.stringify(buildDeploySetup(roster, [1, 2, 3], seed));
    const b = JSON.stringify(buildDeploySetup(roster, [1, 2, 3], seed));
    assert.strictEqual(a, b, `seed ${seed} non déterministe`);
  }
});

test("round-trip save : persistSave puis loadSave => identique", () => {
  const store = fakeStorage();
  const save = { ...defaultSave(), reserve: [makeInstance("roncier", 1)], nextUid: 2 };
  assert.strictEqual(persistSave(save, store), true);
  assert.deepStrictEqual(loadSave(store), save);
});

test("fallback : JSON corrompu / mauvaise version / clé absente => defaultSave", () => {
  assert.deepStrictEqual(loadSave(fakeStorage({ [SAVE_KEY]: "not json{" })), defaultSave());
  const badVersion = JSON.stringify({ schema_version: 999, roster: [], reserve: [], regionsDone: 0, nextUid: 1 });
  assert.deepStrictEqual(loadSave(fakeStorage({ [SAVE_KEY]: badVersion })), defaultSave());
  assert.deepStrictEqual(loadSave(fakeStorage()), defaultSave()); // clé absente
  assert.strictEqual(SCHEMA_VERSION, 1);
});

test("persistSave quota : setItem qui throw => false (pas d'exception propagée)", () => {
  const throwing = { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); } };
  assert.strictEqual(persistSave(defaultSave(), throwing), false);
});

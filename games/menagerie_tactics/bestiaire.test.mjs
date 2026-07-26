// bestiaire.test.mjs — prouve la table d'espèces (fichier de test NEUF, hors zone
// protégée). Identité distincte + invariants de rôle machine-vérifiables.
import test from "node:test";
import assert from "node:assert";
import { SPECIES, SPECIES_BY_ID, base, glyphOf, roleOf } from "./bestiaire.mjs";
import { MenagerieBattle } from "./game.mjs";
import { generateBattle } from "./level.mjs";

const TYPES = ["braise", "ronce", "roche", "onde", "foudre", "givre"];

function uniqueMaxBy(key) {
  const sorted = [...SPECIES].sort((a, b) => b[key] - a[key]);
  assert.ok(sorted[0][key] > sorted[1][key], `pas d'extrême max unique sur ${key}`);
  return sorted[0];
}
function uniqueMinBy(key) {
  const sorted = [...SPECIES].sort((a, b) => a[key] - b[key]);
  assert.ok(sorted[0][key] < sorted[1][key], `pas d'extrême min unique sur ${key}`);
  return sorted[0];
}

test("6 espèces, une par type du cycle, ids/types/glyphs/rôles uniques", () => {
  assert.strictEqual(SPECIES.length, 6);
  assert.deepStrictEqual([...SPECIES].map((s) => s.type).sort(), [...TYPES].sort());
  for (const field of ["id", "type", "glyph", "role"]) {
    const values = SPECIES.map((s) => s[field]);
    assert.strictEqual(new Set(values).size, 6, `champ ${field} non unique`);
  }
});

test("toutes les stats sont >= 1", () => {
  for (const s of SPECIES) {
    for (const stat of ["hp", "atk", "speed", "move", "range"]) {
      assert.ok(s[stat] >= 1, `${s.id}.${stat} = ${s[stat]} < 1`);
    }
  }
});

test("invariants de rôle par extrême strictement unique", () => {
  assert.strictEqual(uniqueMaxBy("hp").role, "tank");
  assert.strictEqual(uniqueMaxBy("atk").role, "briseur");
  assert.strictEqual(uniqueMaxBy("range").role, "ranged");
  assert.strictEqual(uniqueMinBy("atk").role, "controle");
  assert.strictEqual(uniqueMaxBy("speed").role, "skirmisher");
});

test("base(id) retourne un bloc NEUF avec maxHp === hp et les valeurs exactes", () => {
  const golem = SPECIES_BY_ID.get("golem");
  const b = base("golem");
  assert.strictEqual(b.maxHp, b.hp);
  assert.strictEqual(b.hp, golem.hp);
  assert.strictEqual(b.atk, golem.atk);
  assert.strictEqual(b.type, "roche");
  assert.strictEqual(b.role, "tank");
  // bloc NEUF : muter le retour ne touche pas la table figée
  b.hp = 999;
  assert.strictEqual(SPECIES_BY_ID.get("golem").hp, golem.hp);
  assert.strictEqual(base("golem").hp, golem.hp);
});

test("base(id inconnu) throw ; glyphOf/roleOf(inconnu) === null", () => {
  assert.throws(() => base("dragon_inexistant"), /inconnue/);
  assert.strictEqual(glyphOf("dragon_inexistant"), null);
  assert.strictEqual(roleOf("dragon_inexistant"), null);
  assert.strictEqual(glyphOf("golem"), "🪨");
  assert.strictEqual(roleOf("fulgor"), "skirmisher");
});

test("câblage: speciesId propagé du setup à view() ; stats depuis le bestiaire ; coin capturable préservé", () => {
  const b = new MenagerieBattle(generateBattle(1, 1));
  const v = b.view();
  for (const beast of v.beasts) {
    assert.ok(glyphOf(beast.speciesId) !== null, `speciesId inconnu: ${beast.speciesId}`);
  }
  const p1 = v.beasts.find((x) => x.id === 1);
  assert.strictEqual(p1.speciesId, "embraseur");
  assert.strictEqual(p1.type, base("embraseur").type);
  assert.strictEqual(p1.atk, base("embraseur").atk); // stats = celles de l'espèce
  const corner = v.beasts.find((x) => x.id === 11);
  assert.strictEqual(corner.hp, 4); // override capturable respecté
  assert.strictEqual(corner.move, 0);
});

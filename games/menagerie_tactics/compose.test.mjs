// compose.test.mjs — logique de l'écran composition (pure). Fichier NEUF.
import test from "node:test";
import assert from "node:assert";
import { composableRoster, toggleChoix } from "./compose.mjs";
import { makeInstance, SCAR_DEPLOY_LIMIT, KENNEL_SLOTS } from "./meta.mjs";

test("composableRoster : exclut les bêtes cicatrisées", () => {
  const save = { roster: [
    makeInstance("embraseur", 1),
    { ...makeInstance("golem", 2), cicatrices: SCAR_DEPLOY_LIMIT },
    makeInstance("ondine", 3),
  ] };
  assert.deepStrictEqual(composableRoster(save).map((i) => i.uid), [1, 3]);
});

test("toggleChoix : ajoute/retire et refuse au-delà du plafond", () => {
  let choix = [];
  choix = toggleChoix(choix, 1);
  assert.deepStrictEqual(choix, [1]);
  choix = toggleChoix(choix, 1); // retire
  assert.deepStrictEqual(choix, []);
  // remplit jusqu'au plafond
  for (let u = 1; u <= KENNEL_SLOTS; u++) { choix = toggleChoix(choix, u); }
  assert.strictEqual(choix.length, KENNEL_SLOTS);
  const full = toggleChoix(choix, 99); // au-delà : inchangé
  assert.deepStrictEqual(full, choix);
});

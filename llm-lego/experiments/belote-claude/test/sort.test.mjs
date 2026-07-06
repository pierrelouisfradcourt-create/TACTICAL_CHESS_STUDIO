import { test } from "node:test";
import assert from "node:assert/strict";
import { sortHandForDisplay } from "../src/sort.mjs";
import { card } from "../src/cards.mjs";

const H = () => [
  card("7", "pique"), card("A", "coeur"), card("V", "trefle"),
  card("R", "pique"), card("9", "trefle"), card("10", "carreau"),
];

// indices contigus pour une même couleur ?
function suitsContiguous(out) {
  const suits = out.map((c) => c.suit);
  for (const s of new Set(suits)) {
    const idx = [];
    suits.forEach((x, i) => { if (x === s) idx.push(i); });
    if (idx[idx.length - 1] - idx[0] !== idx.length - 1) return false;
  }
  return true;
}

test("couleur — cartes d'une même couleur contiguës, entrée non mutée", () => {
  const input = H();
  const out = sortHandForDisplay(input, "trefle", "couleur");
  assert.equal(out.length, 6);
  assert.ok(suitsContiguous(out), "couleurs regroupées");
  assert.deepEqual(input.map((c) => c.id), H().map((c) => c.id), "l'entrée ne doit pas être mutée");
});

test("atouts-d-abord — la main s'ouvre sur l'atout", () => {
  const out = sortHandForDisplay(H(), "trefle", "atouts-d-abord");
  assert.equal(out[0].suit, "trefle");
  assert.ok(suitsContiguous(out));
});

test("force — les couleurs peuvent se mêler (vue différente de 'couleur')", () => {
  const out = sortHandForDisplay(H(), "trefle", "force");
  assert.equal(out.length, 6);
  // le Valet d'atout (force max) doit être en tête
  assert.equal(out[0].id, "V-trefle");
});

test("pureté — le tri ne dépend que du contenu, pas de l'ordre d'entrée", () => {
  const a = sortHandForDisplay(H(), "trefle", "couleur");
  const src = H();
  const shuffled = [src[3], src[1], src[5], src[0], src[4], src[2]];
  const b = sortHandForDisplay(shuffled, "trefle", "couleur");
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
});

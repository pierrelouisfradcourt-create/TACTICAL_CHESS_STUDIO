import { test } from "node:test";
import assert from "node:assert/strict";
import { runBidding, handStrength } from "../src/bidding.mjs";
import { card } from "../src/cards.mjs";

test("handStrength : Valet+9 d'atout donnent une main forte", () => {
  const strong = [card("V", "coeur"), card("9", "coeur"), card("A", "coeur")];
  const weak = [card("7", "pique"), card("8", "carreau"), card("9", "trefle")];
  assert.ok(handStrength(strong, "coeur") > handStrength(weak, "coeur"));
  assert.ok(handStrength(strong, "coeur") >= 8);
});

test("tour 1 : un joueur avec Valet+9 d'atout prend la couleur retournée", () => {
  const hands = [
    [card("V", "coeur"), card("9", "coeur"), card("R", "coeur"), card("7", "pique"), card("8", "pique")],
    [card("7", "carreau"), card("8", "carreau"), card("9", "carreau"), card("7", "trefle"), card("8", "trefle")],
    [card("D", "pique"), card("R", "pique"), card("7", "coeur"), card("8", "coeur"), card("9", "pique")],
    [card("D", "carreau"), card("R", "carreau"), card("10", "trefle"), card("9", "trefle"), card("D", "trefle")],
  ];
  const turnUp = card("10", "coeur");
  const res = runBidding(hands, turnUp, 3); // dealer=3 → eldest=0
  assert.ok(res, "quelqu'un doit prendre");
  assert.equal(res.taker, 0);
  assert.equal(res.atout, "coeur");
  assert.equal(res.round, 1);
});

test("personne ne prend : mains faibles + retournée basse → null (redistribution)", () => {
  // Retournée BASSE (8 pique) : voir E4 — une retournée forte (Valet) suffirait à
  // déclencher une prise même sur main faible, car elle entre dans l'évaluation du tour 1.
  const hands = [
    [card("7", "pique"), card("8", "pique"), card("D", "coeur"), card("7", "carreau"), card("8", "carreau")],
    [card("D", "pique"), card("7", "coeur"), card("8", "coeur"), card("D", "carreau"), card("7", "trefle")],
    [card("8", "trefle"), card("D", "trefle"), card("R", "pique"), card("R", "coeur"), card("R", "carreau")],
    [card("R", "trefle"), card("9", "pique"), card("9", "coeur"), card("9", "carreau"), card("9", "trefle")],
  ];
  const turnUp = card("8", "pique");
  const res = runBidding(hands, turnUp, 0);
  assert.equal(res, null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { fullDeck, cardPoints, totalCardPoints, cardStrength, card, SUITS } from "../src/cards.mjs";

test("le jeu contient 32 cartes uniques", () => {
  const deck = fullDeck();
  assert.equal(deck.length, 32);
  assert.equal(new Set(deck.map((c) => c.id)).size, 32);
});

test("total des points cartes = 152 (invariant D7, hors dix de der)", () => {
  for (const atout of SUITS) {
    assert.equal(totalCardPoints(atout), 152, `échoue pour atout=${atout}`);
  }
});

test("barème atout : Valet=20, 9=14, As=11", () => {
  assert.equal(cardPoints(card("V", "coeur"), "coeur"), 20);
  assert.equal(cardPoints(card("9", "coeur"), "coeur"), 14);
  assert.equal(cardPoints(card("A", "coeur"), "coeur"), 11);
});

test("barème non-atout : As=11, Valet=2, 9=0", () => {
  assert.equal(cardPoints(card("A", "pique"), "coeur"), 11);
  assert.equal(cardPoints(card("V", "pique"), "coeur"), 2);
  assert.equal(cardPoints(card("9", "pique"), "coeur"), 0);
});

test("force atout : Valet > 9 > As > 10", () => {
  const a = "trefle";
  assert.ok(cardStrength(card("V", a), a) > cardStrength(card("9", a), a));
  assert.ok(cardStrength(card("9", a), a) > cardStrength(card("A", a), a));
  assert.ok(cardStrength(card("A", a), a) > cardStrength(card("10", a), a));
});

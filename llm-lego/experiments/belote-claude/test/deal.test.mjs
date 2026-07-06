import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng, shuffle, deal, completeDeal } from "../src/deal.mjs";
import { fullDeck } from "../src/cards.mjs";

test("shuffle déterministe : même seed → même ordre, 32 cartes conservées", () => {
  const a = shuffle(fullDeck(), makeRng(42));
  const b = shuffle(fullDeck(), makeRng(42));
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.equal(new Set(a.map((c) => c.id)).size, 32);
});

test("deal initial belote : 5 cartes/joueur, 1 retournée, talon de 11", () => {
  const { hands, turnUp, talon } = deal(0, makeRng(7));
  assert.equal(hands.length, 4);
  for (const h of hands) assert.equal(h.length, 5, "chaque main = 5 cartes avant enchère");
  assert.ok(turnUp && turnUp.id, "carte retournée définie");
  assert.equal(talon.length, 11, "talon = 32 - 20 - 1 = 11");
});

test("completeDeal : après prise, taker=8 (dont retournée), autres=8, 0 doublon", () => {
  const { hands, turnUp, talon } = deal(0, makeRng(7));
  const taker = 2;
  const full = completeDeal(hands, taker, turnUp, talon, 0);
  for (const h of full) assert.equal(h.length, 8);
  assert.ok(full[taker].some((c) => c.id === turnUp.id), "le preneur a bien la carte retournée");
  const all = full.flat();
  assert.equal(all.length, 32);
  assert.equal(new Set(all.map((c) => c.id)).size, 32, "aucun doublon, jeu complet");
});

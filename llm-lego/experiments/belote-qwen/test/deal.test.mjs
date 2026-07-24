import test from "node:test";
import assert from "node:assert/strict";
import { buildDeck } from "../src/cards.mjs";
import { shuffle, deal, completeDeal } from "../src/deal.mjs";

const rng = (() => { let s = 42; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();

test("deal : 5 cartes/joueur + carte retournée + talon 11", () => {
  const d = deal(shuffle(buildDeck(), rng));
  assert.equal(d.hands.length, 4);
  d.hands.forEach((h) => assert.equal(h.length, 5));
  assert.ok(d.turnUp && d.turnUp.suit && d.turnUp.rank);
  assert.equal(d.talon.length, 11);
});
test("completeDeal : mains à 8, preneur a la carte retournée, 32 cartes conservées", () => {
  const d = deal(shuffle(buildDeck(), rng));
  const taker = 0;
  const hands = completeDeal(d.hands, d.talon, d.turnUp, taker).hands;
  hands.forEach((h) => assert.equal(h.length, 8));
  assert.ok(hands[taker].some((c) => c.suit === d.turnUp.suit && c.rank === d.turnUp.rank));
  const all = hands.flat();
  assert.equal(all.length, 32);
  const uniq = new Set(all.map((c) => c.suit + c.rank));
  assert.equal(uniq.size, 32);
});

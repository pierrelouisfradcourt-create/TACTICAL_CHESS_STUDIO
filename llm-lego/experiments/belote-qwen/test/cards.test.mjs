import test from "node:test";
import assert from "node:assert/strict";
import { buildDeck, SUITS, RANKS, getCardPoints, compareCards } from "../src/cards.mjs";

test("32 cartes", () => { assert.equal(buildDeck().length, 32); });
test("invariant belote : total des points cartes = 152 (une couleur atout)", () => {
  const atout = SUITS[0]; let total = 0;
  for (const s of SUITS) for (const r of RANKS) total += getCardPoints({ suit: s, rank: r }, atout);
  assert.equal(total, 152);
});
test("atout : V=20 et 9=14", () => {
  const atout = SUITS[0];
  assert.equal(getCardPoints({ suit: atout, rank: "V" }, atout), 20);
  assert.equal(getCardPoints({ suit: atout, rank: "9" }, atout), 14);
});
test("ordre de force atout : V > 9 > A", () => {
  const atout = SUITS[0];
  assert.ok(compareCards({ suit: atout, rank: "V" }, { suit: atout, rank: "9" }, atout) > 0);
  assert.ok(compareCards({ suit: atout, rank: "9" }, { suit: atout, rank: "A" }, atout) > 0);
});

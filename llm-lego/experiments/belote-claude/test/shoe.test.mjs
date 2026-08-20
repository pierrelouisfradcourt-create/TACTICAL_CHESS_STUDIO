import { test } from "node:test";
import assert from "node:assert/strict";
import { newShoe, cut, pickup, COUPE_MIN } from "../src/shoe.mjs";

test("newShoe — 32 cartes, déterministe par seed", () => {
  const a = newShoe(3).deck, b = newShoe(3).deck, c = newShoe(4).deck;
  assert.equal(a.length, 32);
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id)); // même seed → même paquet
  assert.notDeepEqual(a.map((x) => x.id), c.map((x) => x.id)); // seed différent → paquet différent
});

test("cut — rotation sans perte, jamais fixe, positions variées", () => {
  const { deck, rng } = newShoe(3);
  const sortedIds = [...deck].map((x) => x.id).sort();
  const positions = new Set();
  let d = deck;
  for (let i = 0; i < 40; i++) {
    const before = d.map((x) => x.id).join(",");
    d = cut(d, rng);
    assert.equal(d.length, 32);
    assert.deepEqual([...d].map((x) => x.id).sort(), sortedIds); // aucune carte perdue
    assert.notEqual(d.map((x) => x.id).join(","), before, "la coupe ne doit jamais être l'identité");
    positions.add(d.map((x) => x.id).indexOf(deck[0].id)); // position de la 1re carte d'origine
  }
  assert.ok(positions.size > 3, "les positions de coupe doivent varier");
});

test("cut — position toujours dans la plage [COUPE_MIN, 32-COUPE_MIN]", () => {
  const { rng } = newShoe(7);
  const ordered = Array.from({ length: 32 }, (_, i) => ({ id: String(i) }));
  for (let i = 0; i < 200; i++) {
    const d = cut(ordered, rng);
    const c = d.findIndex((x) => x.id === "0");
    assert.ok(c >= COUPE_MIN && c <= 32 - COUPE_MIN, `coupe ${c} hors plage`);
  }
});

test("pickup — déterministe, sans perte, camp preneur d'abord", () => {
  const C = (id) => ({ id });
  const tricks = [
    { winner: 0, cards: [C("a"), C("b"), C("c"), C("d")] }, // team0
    { winner: 1, cards: [C("e"), C("f"), C("g"), C("h")] }, // team1
    { winner: 2, cards: [C("i"), C("j"), C("k"), C("l")] }, // team0
  ];
  const deck = pickup(tricks, 0); // takerTeam = 0
  assert.deepEqual(deck.map((x) => x.id), ["a", "b", "c", "d", "i", "j", "k", "l", "e", "f", "g", "h"]);
  assert.deepEqual(pickup(tricks, 0).map((x) => x.id), deck.map((x) => x.id)); // pur
  assert.equal(deck.length, 12);
});

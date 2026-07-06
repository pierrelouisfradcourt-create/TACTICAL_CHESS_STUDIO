import { test } from "node:test";
import assert from "node:assert/strict";
import { playDeal, playTrick, playGame } from "../src/game.mjs";
import { makeRng } from "../src/deal.mjs";
import { card } from "../src/cards.mjs";

test("playTrick : 4 cartes jouées, une par joueur, mains réduites de 1", () => {
  const hands = [
    [card("A", "pique"), card("7", "coeur")],
    [card("R", "pique"), card("8", "coeur")],
    [card("D", "pique"), card("9", "coeur")],
    [card("10", "pique"), card("V", "coeur")],
  ];
  const before = hands.map((h) => h.length);
  const res = playTrick(hands, 0, "coeur");
  assert.equal(res.cards.length, 4);
  assert.equal(res.plays.length, 4);
  for (let i = 0; i < 4; i++) assert.equal(hands[i].length, before[i] - 1);
  assert.ok([0, 1, 2, 3].includes(res.winner));
});

test("playDeal : une donne prise → 8 plis joués, 32 cartes distribuées exactement une fois", () => {
  // cherche une seed qui donne une prise (pas de redeal)
  let d, seed = 1;
  do { d = playDeal(0, makeRng(seed++)); } while (d.redeal && seed < 50);
  assert.equal(d.redeal, false, "une donne prise doit exister");
  assert.equal(d.tricks.length, 8);
  const allCards = d.tricks.flatMap((t) => t.cards);
  assert.equal(allCards.length, 32, "8 plis × 4 = 32 cartes");
  assert.equal(new Set(allCards.map((c) => c.id)).size, 32, "aucune carte jouée deux fois");
});

test("playDeal : le total points cartes + der d'une donne = 162 (invariant)", () => {
  let d, seed = 1;
  do { d = playDeal(0, makeRng(seed++)); } while (d.redeal && seed < 50);
  assert.equal(d.score.base[0] + d.score.base[1], 162);
});

test("playGame : une partie complète se termine avec un vainqueur au-dessus du seuil", () => {
  const g = playGame({ target: 501, seed: 3 });
  assert.ok(g.dealsPlayed > 0, "au moins une donne jouée");
  assert.ok(g.winner === 0 || g.winner === 1, "un vainqueur désigné");
  assert.ok(Math.max(...g.totals) >= 501, `total gagnant ${Math.max(...g.totals)} >= 501`);
  assert.ok(g.dealsPlayed < 200, "la partie termine (pas de boucle infinie)");
});

test("playGame : déterministe — même seed → même résultat", () => {
  const a = playGame({ target: 301, seed: 9 });
  const b = playGame({ target: 301, seed: 9 });
  assert.deepEqual(a.totals, b.totals);
  assert.equal(a.dealsPlayed, b.dealsPlayed);
});

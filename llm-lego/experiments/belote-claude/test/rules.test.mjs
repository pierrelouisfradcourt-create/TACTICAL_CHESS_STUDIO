import { test } from "node:test";
import assert from "node:assert/strict";
import { legalMoves, trickWinner, beloteTeam, teamOf, partnerOf } from "../src/rules.mjs";
import { card } from "../src/cards.mjs";

const ids = (cs) => cs.map((c) => c.id).sort();
const ATOUT = "coeur";

test("trickWinner : plus fort atout gagne même joué en dernier", () => {
  const trick = [
    { player: 0, card: card("A", "pique") },
    { player: 1, card: card("7", "coeur") }, // petit atout
    { player: 2, card: card("10", "pique") },
    { player: 3, card: card("V", "coeur") }, // valet d'atout, maître
  ];
  assert.equal(trickWinner(trick, ATOUT).player, 3);
});

test("trickWinner : sans atout, plus forte carte de la couleur demandée", () => {
  const trick = [
    { player: 0, card: card("R", "pique") },
    { player: 1, card: card("A", "pique") }, // As pique = maître
    { player: 2, card: card("A", "carreau") }, // autre couleur, ne compte pas
    { player: 3, card: card("10", "pique") },
  ];
  assert.equal(trickWinner(trick, ATOUT).player, 1);
});

test("obligation : fournir la couleur demandée", () => {
  const hand = [card("7", "pique"), card("A", "pique"), card("R", "coeur")];
  const trick = [{ player: 0, card: card("D", "pique") }];
  assert.deepEqual(ids(legalMoves(hand, trick, ATOUT, 1)), ids([card("7", "pique"), card("A", "pique")]));
});

test("obligation : atout demandé → monter (surcouper) obligatoire", () => {
  const hand = [card("7", "coeur"), card("V", "coeur"), card("R", "pique")];
  const trick = [{ player: 0, card: card("9", "coeur") }]; // 9 atout déjà fort
  // seul le Valet (20/force max) bat le 9 → doit jouer le Valet
  assert.deepEqual(ids(legalMoves(hand, trick, ATOUT, 1)), ids([card("V", "coeur")]));
});

test("obligation : atout demandé, ne peut pas monter → fournir un atout quand même", () => {
  const hand = [card("7", "coeur"), card("8", "coeur"), card("R", "pique")];
  const trick = [{ player: 0, card: card("V", "coeur") }]; // Valet imbattable
  assert.deepEqual(ids(legalMoves(hand, trick, ATOUT, 1)), ids([card("7", "coeur"), card("8", "coeur")]));
});

test("obligation : ne peut pas fournir, adversaire maître → couper obligatoire", () => {
  const hand = [card("7", "coeur"), card("A", "carreau")];
  const trick = [{ player: 0, card: card("R", "pique") }]; // adversaire (0 vs mover 1) maître
  assert.deepEqual(ids(legalMoves(hand, trick, ATOUT, 1)), ids([card("7", "coeur")]));
});

test("obligation : ne peut pas fournir, PARTENAIRE maître → libre (défausse OK, pas d'obligation de couper)", () => {
  const hand = [card("7", "coeur"), card("A", "carreau")];
  // mover = 2, partenaire = 0, qui est maître avec R pique
  const trick = [
    { player: 0, card: card("R", "pique") },
    { player: 1, card: card("8", "pique") },
  ];
  assert.deepEqual(ids(legalMoves(hand, trick, ATOUT, 2)), ids(hand)); // tout permis
});

test("obligation : surcouper si un atout adverse est déjà tombé", () => {
  const hand = [card("8", "coeur"), card("V", "coeur"), card("A", "carreau")];
  const trick = [
    { player: 0, card: card("R", "pique") },
    { player: 1, card: card("9", "coeur") }, // adversaire a coupé fort (9)
  ];
  // mover=2 : partenaire=0 n'est PAS maître (1 a coupé). Doit surcouper → seul V bat 9.
  assert.deepEqual(ids(legalMoves(hand, trick, ATOUT, 2)), ids([card("V", "coeur")]));
});

test("beloteTeam : détecte Roi+Dame d'atout dans une main", () => {
  const hands = [
    [card("R", "coeur"), card("D", "coeur")],
    [card("A", "pique")],
    [card("7", "trefle")],
    [card("8", "carreau")],
  ];
  assert.equal(beloteTeam(hands, ATOUT), teamOf(0));
  assert.equal(partnerOf(0), 2);
});

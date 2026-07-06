import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreDeal } from "../src/scoring.mjs";
import { beloteHolder } from "../src/rules.mjs";
import { card } from "../src/cards.mjs";

const ATOUT = "coeur";
// Construit 8 plis en attribuant explicitement des cartes/vainqueurs pour contrôler le total.
// Helper : un pli où `winner` rafle `cards`.
const trick = (winner, cards) => ({ winner, cards });

// Répartit les 32 cartes réelles n'est pas nécessaire pour tester le barème : on vérifie
// les invariants avec des plis contrôlés dont on connaît les points.

test("base : total des points (cartes + der) = 162 sur une donne complète réelle-like", () => {
  // 8 plis, toutes les cartes du jeu réparties. On donne tout à l'équipe 0 pour simplifier
  // le total, sauf peu importe : on veut juste base[0]+base[1] = 162.
  const cards = [];
  for (const s of ["pique", "coeur", "carreau", "trefle"])
    for (const r of ["7", "8", "9", "10", "V", "D", "R", "A"]) cards.push(card(r, s));
  // 8 plis de 4 cartes ; alterne les vainqueurs 0/1
  const tricks = [];
  for (let i = 0; i < 8; i++) tricks.push(trick(i % 2, cards.slice(i * 4, i * 4 + 4)));
  const r = scoreDeal(tricks, ATOUT, 0, -1);
  assert.equal(r.base[0] + r.base[1], 162);
});

test("contrat réussi : preneur >= 82 garde ses points (sans capot)", () => {
  // Répartition réelle des 32 cartes : équipe 0 rafle les grosses (atouts hauts + as),
  // équipe 1 prend le reste (≥ 1 pli → pas de capot). base[0] doit dépasser 82.
  const all = [];
  for (const s of ["pique", "coeur", "carreau", "trefle"])
    for (const r of ["7", "8", "9", "10", "V", "D", "R", "A"]) all.push(card(r, s));
  const pull = (rank, suit) => all.splice(all.findIndex((c) => c.rank === rank && c.suit === suit), 1)[0];
  // 2 plis équipe 0 = 55 (atouts V/9/A/10 coeur) + 3 as + R coeur = 92 pts
  const t0a = [pull("V", "coeur"), pull("9", "coeur"), pull("A", "coeur"), pull("10", "coeur")];
  const t0b = [pull("A", "pique"), pull("A", "carreau"), pull("A", "trefle"), pull("R", "coeur")];
  const tricks = [trick(0, t0a), trick(2, t0b)];
  // 6 plis équipe 1 avec les 24 cartes restantes ; dernier pli (der) à l'équipe 1
  for (let i = 0; i < 6; i++) tricks.push(trick(1, all.slice(i * 4, i * 4 + 4)));
  const r = scoreDeal(tricks, ATOUT, 0, -1);
  assert.equal(r.capot, false);
  assert.ok(r.base[0] >= 82, `base[0]=${r.base[0]} attendu >= 82`);
  assert.equal(r.success, true);
  assert.equal(r.dedans, false);
  assert.equal(r.base[0] + r.base[1], 162);
});

test("preneur DEDANS : défense encaisse 162, preneur 0", () => {
  // preneur = équipe 0 mais la défense (équipe 1) prend presque tout.
  const strong = [card("V", "coeur"), card("9", "coeur"), card("A", "coeur"), card("10", "coeur")];
  const tricks = [trick(0, [card("7", "pique"), card("8", "pique"), card("9", "pique"), card("7", "trefle")])];
  for (let i = 1; i < 7; i++) tricks.push(trick(1, [card("8", "trefle"), card("9", "trefle"), card("D", "pique"), card("R", "pique")]));
  tricks.push(trick(1, strong)); // dernier pli + der à l'équipe 1
  const r = scoreDeal(tricks, ATOUT, 0, -1);
  assert.equal(r.dedans, true);
  assert.equal(r.success, false);
  assert.equal(r.scores[1], 162); // défense rafle tout
  assert.equal(r.scores[0], 0);
});

test("belote-rebelote : +20 au détenteur, même dedans", () => {
  const strong = [card("V", "coeur"), card("9", "coeur"), card("A", "coeur"), card("10", "coeur")];
  const tricks = [trick(0, [card("7", "pique"), card("8", "pique"), card("9", "pique"), card("7", "trefle")])];
  for (let i = 1; i < 7; i++) tricks.push(trick(1, [card("8", "trefle"), card("9", "trefle"), card("D", "carreau"), card("R", "carreau")]));
  tricks.push(trick(1, strong));
  // preneur équipe 0 dedans, mais l'équipe 0 détient la belote → doit garder 20
  const r = scoreDeal(tricks, ATOUT, 0, 0);
  assert.equal(r.dedans, true);
  assert.equal(r.scores[0], 20); // 0 points cartes mais 20 de belote
  assert.equal(r.scores[1], 162);
});

test("capot : équipe rafle les 8 plis → 250 pts", () => {
  const tricks = [];
  for (let i = 0; i < 8; i++) tricks.push(trick(0, [card("7", "pique"), card("8", "pique"), card("9", "pique"), card("7", "trefle")]));
  const r = scoreDeal(tricks, ATOUT, 0, -1);
  assert.equal(r.capot, true);
  assert.equal(r.capotTeam, 0);
  assert.equal(r.scores[0], 250);
  assert.equal(r.scores[1], 0);
});

test("belote conditionnelle : déclarée = +20, oubliée = 0", () => {
  const cards = [];
  for (const s of ["pique", "coeur", "carreau", "trefle"])
    for (const r of ["7", "8", "9", "10", "V", "D", "R", "A"]) cards.push(card(r, s));
  const tricks = [];
  for (let i = 0; i < 8; i++) tricks.push(trick(i % 2, cards.slice(i * 4, i * 4 + 4)));
  const withDecl = scoreDeal(tricks, ATOUT, 0, 0, true);
  const noDecl = scoreDeal(tricks, ATOUT, 0, 0, false);
  assert.equal(withDecl.belote[0], 20, "belote déclarée → +20");
  assert.equal(noDecl.belote[0], 0, "belote oubliée → 0");
});

test("beloteHolder : siège détenteur R+D d'atout, -1 si séparés", () => {
  assert.equal(beloteHolder([[card("R", "coeur"), card("D", "coeur")], [], [], []], "coeur"), 0);
  assert.equal(beloteHolder([[card("R", "coeur")], [card("D", "coeur")], [], []], "coeur"), -1);
});

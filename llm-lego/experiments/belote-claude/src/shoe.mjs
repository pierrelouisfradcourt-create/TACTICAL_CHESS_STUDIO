// Belote — le "sabot" : mélange initial (seedé) et coupe réelle entre les donnes.
// Fidélité belote : on ne re-mélange JAMAIS entre les donnes ; on ramasse (pickup) puis on COUPE.
// Le mélange initial et les coupes sont les SEULS points où le RNG de partie est consommé —
// d'où la rejouabilité de toute la partie depuis le seed.
import { fullDeck } from "./cards.mjs";
import { makeRng, shuffle } from "./deal.mjs";

export const COUPE_MIN = 3; // coupe jamais triviale : position dans [3, 29]

/** Paquet initial d'une partie : un seul mélange, piloté par le seed. */
export function newShoe(seed) {
  const rng = makeRng(seed);
  return { deck: shuffle(fullDeck(), rng), rng };
}

/** Coupe réelle : rotation à une position tirée du flux RNG, bornée, jamais fixe. */
export function cut(deck, rng) {
  const lo = COUPE_MIN, hi = deck.length - COUPE_MIN;
  const c = lo + Math.floor(rng() * (hi - lo + 1)); // c ∈ [lo, hi]
  return deck.slice(c).concat(deck.slice(0, c));
}

/**
 * Ramassage fidèle et déterministe des plis d'une donne terminée.
 * Empile les plis dans l'ordre où ils sont gagnés, par camp ; recompose le paquet
 * "camp preneur puis camp défense". Aucun RNG — la donne N+1 est fonction pure de la donne N.
 */
export function pickup(tricks, takerTeam) {
  const piles = [[], []]; // [team0, team1]
  for (const t of tricks) {
    const team = t.winner % 2;
    for (const c of t.cards) piles[team].push(c);
  }
  const defTeam = 1 - takerTeam;
  return piles[takerTeam].concat(piles[defTeam]);
}

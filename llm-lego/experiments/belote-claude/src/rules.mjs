// Belote — règles de jeu d'un pli : coups légaux (obligations) + détermination du gagnant.
// Équipes : joueurs 0 & 2 contre 1 & 3.
import { cardStrength } from "./cards.mjs";

export const teamOf = (p) => p % 2;
export const partnerOf = (p) => (p + 2) % 4;

/**
 * Gagnant d'un pli (partiel ou complet). `trick` = [{player, card}, ...] dans l'ordre.
 * Règle : si au moins un atout est joué, le plus fort atout gagne ; sinon le plus fort
 * de la couleur demandée (celle de la 1re carte). Retourne l'entrée {player, card}.
 */
export function trickWinner(trick, atout) {
  const led = trick[0].card.suit;
  const trumps = trick.filter((t) => t.card.suit === atout);
  const pool = trumps.length > 0 ? trumps : trick.filter((t) => t.card.suit === led);
  return pool.reduce((best, t) =>
    cardStrength(t.card, atout) > cardStrength(best.card, atout) ? t : best
  );
}

/**
 * Coups légaux pour `mover` (main `hand`) sur un pli en cours `trick`, atout donné.
 * Implémente les obligations de la belote classique :
 *  - fournir la couleur demandée si possible ;
 *  - à l'atout demandé : monter (surcouper) si on peut, sinon fournir un atout ;
 *  - si on ne peut pas fournir une couleur ordinaire :
 *      · partenaire maître → libre (défausse autorisée, pas d'obligation de couper) ;
 *      · adversaire maître → couper ; si un atout est déjà tombé, surcouper si possible,
 *        sinon fournir quand même un atout (on ne peut pas se défausser) ;
 *      · pas d'atout en main → défausse libre.
 */
export function legalMoves(hand, trick, atout, mover) {
  if (trick.length === 0) return hand.slice(); // entame : tout est permis
  const led = trick[0].card.suit;
  const inLed = hand.filter((c) => c.suit === led);
  const trumps = hand.filter((c) => c.suit === atout);
  const trumpsInTrick = trick.filter((t) => t.card.suit === atout);
  const highestTrump = trumpsInTrick.length
    ? Math.max(...trumpsInTrick.map((t) => cardStrength(t.card, atout)))
    : -1;
  const higherTrumps = trumps.filter((c) => cardStrength(c, atout) > highestTrump);

  // Cas A : atout demandé
  if (led === atout) {
    if (trumps.length === 0) return hand.slice(); // pas d'atout → tout permis
    return higherTrumps.length > 0 ? higherTrumps : trumps; // monter si possible
  }

  // Cas B : couleur ordinaire demandée
  if (inLed.length > 0) return inLed; // fournir la couleur

  // On ne peut pas fournir.
  const winner = trickWinner(trick, atout).player;
  const partnerMaster = teamOf(winner) === teamOf(mover);
  if (partnerMaster) return hand.slice(); // partenaire maître → libre
  if (trumps.length === 0) return hand.slice(); // pas d'atout → défausse libre
  // Adversaire maître, on a de l'atout → couper / surcouper.
  return higherTrumps.length > 0 ? higherTrumps : trumps;
}

/** L'équipe qui détient à la fois Roi ET Dame d'atout (belote-rebelote). -1 si aucune. */
export function beloteTeam(fullHands, atout) {
  for (let p = 0; p < 4; p++) {
    const has = (rank) => fullHands[p].some((c) => c.rank === rank && c.suit === atout);
    if (has("R") && has("D")) return teamOf(p);
  }
  return -1;
}

/** Le SIÈGE qui détient à la fois Roi ET Dame d'atout (pour la déclaration manuelle). -1 si aucun. */
export function beloteHolder(fullHands, atout) {
  for (let p = 0; p < 4; p++) {
    const has = (rank) => fullHands[p].some((c) => c.rank === rank && c.suit === atout);
    if (has("R") && has("D")) return p;
  }
  return -1;
}

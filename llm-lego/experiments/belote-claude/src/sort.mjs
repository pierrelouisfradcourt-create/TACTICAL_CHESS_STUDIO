// Belote — tri d'AFFICHAGE de la main (présentation initiale + préférence joueur).
// PUREMENT visuel : ne mute pas la main, n'affecte ni legalMoves ni la détection d'annonces.
// Le jeu ne re-trie JAMAIS après que le joueur a réorganisé (cf. index.html).
import { cardStrength } from "./cards.mjs";

// Alternance de couleurs lisible : noir / rouge / noir / rouge.
const SUIT_ORDER = ["pique", "coeur", "trefle", "carreau"];
const suitIdx = (s) => SUIT_ORDER.indexOf(s);

/** pref ∈ "couleur" | "force" | "atouts-d-abord". Retourne un NOUVEAU tableau (ne mute pas). */
export function sortHandForDisplay(hand, atout, pref = "couleur") {
  const h = hand.slice();
  const strDesc = (a, b) => cardStrength(b, atout) - cardStrength(a, atout);

  if (pref === "force") {
    // Force décroissante, toutes couleurs mêlées (cartes maîtresses en tête). Les atouts
    // dominent les cartes ordinaires (cardStrength est un rang intra-couleur : on ajoute un
    // bonus d'atout pour les rendre globalement comparables).
    const power = (c) => cardStrength(c, atout) + (c.suit === atout ? 8 : 0);
    return h.sort((a, b) => power(b) - power(a) || suitIdx(a.suit) - suitIdx(b.suit));
  }

  const rankSuit = (s) => (pref === "atouts-d-abord" && s === atout ? -1 : suitIdx(s));
  // Regroupé par couleur (atout à sa place, ou en tête si "atouts-d-abord"), force décroissante.
  return h.sort((a, b) => (rankSuit(a.suit) - rankSuit(b.suit)) || strDesc(a, b));
}

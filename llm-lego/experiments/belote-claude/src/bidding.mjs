// Belote — enchère (choix du preneur et de l'atout).
// Deux tours (décision D2) : tour 1 chacun peut prendre la couleur retournée ;
// tour 2 chacun peut nommer une AUTRE couleur. IA = heuristique de force de main.
import { SUITS } from "./cards.mjs";
import { eldestOrder } from "./deal.mjs";

/**
 * Force approximative d'une main pour un atout candidat `s`.
 * Valet d'atout et 9 d'atout pèsent lourd ; les autres atouts et les as comptent.
 */
export function handStrength(cards, s) {
  let score = 0;
  for (const c of cards) {
    if (c.suit === s) {
      if (c.rank === "V") score += 6;
      else if (c.rank === "9") score += 5;
      else if (c.rank === "A") score += 3;
      else if (c.rank === "10") score += 2;
      else score += 1; // 7/8/D/R d'atout : présence utile
    } else if (c.rank === "A") {
      score += 2; // as dans une couleur ordinaire
    } else if (c.rank === "10") {
      score += 1;
    }
  }
  return score;
}

const TAKE_R1 = 8; // seuil de prise au tour 1 (on récupère en plus la carte retournée)
const TAKE_R2 = 9; // seuil de prise au tour 2 (couleur libre)

/**
 * Résout l'enchère. Retourne { taker, atout, round } ou null si tout le monde passe.
 * `hands` = 4 mains de 5 cartes ; `turnUp` = carte retournée ; `dealer` = donneur.
 */
export function runBidding(hands, turnUp, dealer) {
  const order = eldestOrder(dealer);
  const candidate = turnUp.suit;

  // Tour 1 : prendre la couleur retournée (le preneur intégrera la carte retournée).
  for (const p of order) {
    const strength = handStrength([...hands[p], turnUp], candidate);
    if (strength >= TAKE_R1) return { taker: p, atout: candidate, round: 1 };
  }

  // Tour 2 : nommer une autre couleur (la plus forte au-dessus du seuil).
  for (const p of order) {
    let best = null;
    for (const s of SUITS) {
      if (s === candidate) continue; // interdit de reprendre la couleur retournée au tour 2
      const strength = handStrength(hands[p], s);
      if (strength >= TAKE_R2 && (!best || strength > best.strength)) best = { s, strength };
    }
    if (best) return { taker: p, atout: best.s, round: 2 };
  }

  return null; // personne ne prend → redistribution
}

// Belote — cartes, jeu de 32, barèmes de points.
// Belote classique : 4 couleurs × 8 rangs (7,8,9,10,V,D,R,A).
// Deux barèmes selon que la couleur est ATOUT ou non.

export const SUITS = ["pique", "coeur", "carreau", "trefle"];
export const RANKS = ["7", "8", "9", "10", "V", "D", "R", "A"];

// Barème NON-ATOUT : A=11, 10=10, R=4, D=3, V=2, 9/8/7=0  → 30 pts/couleur
export const PLAIN_POINTS = { A: 11, "10": 10, R: 4, D: 3, V: 2, "9": 0, "8": 0, "7": 0 };
// Barème ATOUT : V=20, 9=14, A=11, 10=10, R=4, D=3, 8/7=0   → 62 pts/couleur
export const TRUMP_POINTS = { V: 20, "9": 14, A: 11, "10": 10, R: 4, D: 3, "8": 0, "7": 0 };

// Ordre de FORCE (pour déterminer qui remporte un pli), du plus faible au plus fort.
// Non-atout : 7<8<9<V<D<R<10<A
export const PLAIN_ORDER = ["7", "8", "9", "V", "D", "R", "10", "A"];
// Atout : 7<8<D<R<10<A<9<V
export const TRUMP_ORDER = ["7", "8", "D", "R", "10", "A", "9", "V"];

/** Une carte est un objet {rank, suit}. Id stable pour comparaisons. */
export function card(rank, suit) {
  return { rank, suit, id: `${rank}-${suit}` };
}

/** Jeu complet de 32 cartes, ordre déterministe. */
export function fullDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(card(r, s));
  return deck;
}

/** Points d'une carte selon la couleur d'atout. */
export function cardPoints(c, atout) {
  return c.suit === atout ? TRUMP_POINTS[c.rank] : PLAIN_POINTS[c.rank];
}

/** Force de tri d'une carte au sein de sa couleur (indice d'ordre). */
export function cardStrength(c, atout) {
  const order = c.suit === atout ? TRUMP_ORDER : PLAIN_ORDER;
  return order.indexOf(c.rank);
}

/** Total théorique des points cartes (doit valoir 152 sans le dix de der). */
export function totalCardPoints(atout) {
  return fullDeck().reduce((sum, c) => sum + cardPoints(c, atout), 0);
}

// src/cards.mjs

export const SUITS = ['COEUR', 'CARREAU', 'TREFLE', 'PIQUE'];
export const RANKS = ['7', '8', '9', '10', 'V', 'D', 'R', 'A'];

const ATOUT_POINTS = {
  '7': 0,
  '8': 0,
  '9': 14,
  '10': 10,
  'V': 20,
  'D': 3,
  'R': 4,
  'A': 11
};

const NON_ATOUT_POINTS = {
  '7': 0,
  '8': 0,
  '9': 0,
  '10': 10,
  'V': 2,
  'D': 3,
  'R': 4,
  'A': 11
};

const ATOUT_ORDER = ['V', '9', 'A', '10', 'R', 'D', '8', '7'];
const NON_ATOUT_ORDER = ['A', '10', 'R', 'D', 'V', '9', '8', '7'];

export function buildDeck() {
  let deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export const POINTS_TOTAL = Object.values(ATOUT_POINTS).reduce((acc, val) => acc + val, 0) * 4 +
                         Object.values(NON_ATOUT_POINTS).reduce((acc, val) => acc + val, 0) * 3;

export function getCardPoints(card, atoutSuit) {
  if (card.suit === atoutSuit) {
    return ATOUT_POINTS[card.rank];
  } else {
    return NON_ATOUT_POINTS[card.rank];
  }
}

export function compareCards(card1, card2, atoutSuit) {
  if (card1.suit === card2.suit) {
    const order = card1.suit === atoutSuit ? ATOUT_ORDER : NON_ATOUT_ORDER;
    return order.indexOf(card2.rank) - order.indexOf(card1.rank); // Inverse l'ordre pour que le plus fort soit positif
  } else {
    return card1.suit === atoutSuit ? 1 : -1;
  }
}

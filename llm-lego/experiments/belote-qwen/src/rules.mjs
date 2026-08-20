import { cards } from './cards.mjs';

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const atouts = ['hearts', 'diamonds'];

function legalMoves(hand, trick, atout) {
  if (trick.length === 0) {
    return hand;
  }

  const firstCard = trick[0];
  const firstSuit = firstCard.suit;

  // Check if we have the same suit as the first card
  const sameSuitCards = hand.filter(card => card.suit === firstSuit);

  if (sameSuitCards.length > 0) {
    return sameSuitCards;
  }

  // If no same suit, check for atout cards
  const atoutCards = hand.filter(card => card.suit === atout);
  if (atoutCards.length > 0) {
    return atoutCards;
  }

  // If no atout, we can play any card
  return hand;
}

function trickWinner(trick, atout) {
  let highestCard = null;
  let winnerIndex = -1;

  for (let i = 0; i < trick.length; i++) {
    const card = trick[i];

    if (!highestCard || isHigher(card, highestCard, atout)) {
      highestCard = card;
      winnerIndex = i;
    }
  }

  return { winner: trick[winnerIndex], index: winnerIndex };
}

function isHigher(card1, card2, atout) {
  if (card1.suit === atout && card2.suit !== atout) {
    return true;
  }
  if (card1.suit !== atout && card2.suit === atout) {
    return false;
  }

  const rankOrder = ['7', '8', '9', 'jack', 'queen', 'king', 'ace'];
  const rankIndex1 = rankOrder.indexOf(card1.rank);
  const rankIndex2 = rankOrder.indexOf(card2.rank);

  return rankIndex1 > rankIndex2;
}

function detectBeloteRebelote(trick, atout) {
  let beloteCount = 0;

  for (const card of trick) {
    if (card.suit === atout && ['king', 'queen'].includes(card.rank)) {
      beloteCount++;
    }
  }

  return beloteCount >= 2;
}

export { legalMoves, trickWinner, detectBeloteRebelote };

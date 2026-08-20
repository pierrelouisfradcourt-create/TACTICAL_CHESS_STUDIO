import { buildDeck } from './cards.mjs';

/**
 * Shuffle a deck deterministically using a provided random number generator.
 * @param {Array} deck - The deck of cards to shuffle.
 * @param {Function} rng - A function that returns a random number between 0 and 1.
 * @returns {Array} - The shuffled deck.
 */
export function shuffle(deck, rng) {
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
}

/**
 * Distribute initial cards for a Belote game.
 * @param {Array} deck - The shuffled deck of cards.
 * @returns {Object} - An object containing the hands for each player and the turn-up card.
 */
export function deal(deck) {
    const players = ['player1', 'player2', 'player3', 'player4'];
    const hands = Array.from({ length: 4 }, () => []);

    // Each player gets 5 cards (3 then 2)
    for (let i = 0; i < 3; i++) {
        players.forEach(player => {
            hands[players.indexOf(player)].push(deck.shift());
        });
    }
    for (let i = 0; i < 2; i++) {
        players.forEach(player => {
            hands[players.indexOf(player)].push(deck.shift());
        });
    }

    // Turn-up card
    const turnUp = deck.shift();

    return { hands, turnUp, talon: deck };
}

/**
 * Complete the deal after the auction.
 * @param {Array} hands - The current hands of players.
 * @param {Array} talon - The remaining deck of cards.
 * @param {Object} turnUp - The turn-up card.
 * @param {number} takerIndex - The index of the player who won the auction (taker).
 * @returns {Object} - An object containing the completed hands and the updated talon.
 */
export function completeDeal(hands, talon, turnUp, takerIndex) {
    // Taker receives the turn-up card plus 2 cards from the talon
    hands[takerIndex].push(turnUp);
    for (let i = 0; i < 2; i++) {
        hands[takerIndex].push(talon.shift());
    }

    // Other players receive 3 cards each
    const otherPlayers = [0, 1, 2, 3].filter(index => index !== takerIndex);
    for (let player of otherPlayers) {
        for (let i = 0; i < 3; i++) {
            hands[player].push(talon.shift());
        }
    }

    return { hands, talon };
}

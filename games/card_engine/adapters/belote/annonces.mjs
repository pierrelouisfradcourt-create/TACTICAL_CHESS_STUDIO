// adapters/belote/annonces.mjs — Belote announcements (R10, R11)
// Detects and resolves sequences (tierce/cinquante/cent) and sets (carrés).
// Detection is order-independent (R11 — property holds for any hand permutation).

import { eldestOrder } from './deal.mjs';
import { teamOf } from './rules.mjs';

// --- Sequence detection order (natural, not trump-dependent) ---
export const SEQ_ORDER = { '7': 0, '8': 1, '9': 2, '10': 3, 'V': 4, 'D': 5, 'R': 6, 'A': 7 };

// --- Carre (set of 4) values ---
export const CARRE_POINTS = {
  'V': 200, '9': 150,
  'A': 100, 'R': 100, 'D': 100, '10': 100,
  '8': 0, '7': 0,
};

/**
 * R11: Detect all sequences in a hand (order-independent).
 * Sequences are >=3 consecutive cards in a suit (natural order).
 * A hand can have multiple sequences in different suits.
 *
 * @param {array} hand - Cards
 * @returns {array} Sequences: [{ kind:'suite', type:'tierce'|'cinquante'|'cent', points, len, suit, top, cards }, ...]
 */
export function detectSequences(hand) {
  const bySuit = {};
  for (const c of hand) {
    (bySuit[c.suit] ||= []).push(c);
  }

  const result = [];
  for (const suit of Object.keys(bySuit)) {
    // Sort by natural order (independent of trump)
    const sorted = bySuit[suit].slice().sort((a, b) => SEQ_ORDER[a.rank] - SEQ_ORDER[b.rank]);

    let run = [sorted[0]];
    const flush = () => {
      if (run.length >= 3) {
        const len = run.length;
        const top = run[len - 1]; // Highest card (natural order)
        let type, points;
        if (len >= 5) { type = 'cent'; points = 100; }
        else if (len === 4) { type = 'cinquante'; points = 50; }
        else { type = 'tierce'; points = 20; }

        result.push({
          kind: 'suite',
          type,
          points,
          len,
          suit,
          top,
          cards: run.slice(),
        });
      }
    };

    for (let i = 1; i < sorted.length; i++) {
      const curr = SEQ_ORDER[sorted[i].rank];
      const prev = SEQ_ORDER[sorted[i - 1].rank];
      if (curr === prev + 1) {
        run.push(sorted[i]);
      } else {
        flush();
        run = [sorted[i]];
      }
    }
    flush();
  }

  return result;
}

/**
 * Detect all sets (carrés) in a hand (4 cards of same rank).
 * Only ranks with CARRE_POINTS > 0 count.
 *
 * @param {array} hand - Cards
 * @returns {array} Sets: [{ kind:'carre', type:'carre', points, rank, cards }, ...]
 */
export function detectCarres(hand) {
  const byRank = {};
  for (const c of hand) {
    (byRank[c.rank] ||= []).push(c);
  }

  const result = [];
  for (const rank of Object.keys(byRank)) {
    if (byRank[rank].length === 4 && CARRE_POINTS[rank] > 0) {
      result.push({
        kind: 'carre',
        type: 'carre',
        points: CARRE_POINTS[rank],
        rank,
        cards: byRank[rank].slice(),
      });
    }
  }

  return result;
}

/**
 * R10/R11: Detect all annonces in a hand.
 * @param {array} hand - Cards (8 after completeDeal)
 * @param {string} trump - Trump suit (for marking trump sequences)
 * @returns {array} All annonces (sequences + carrés)
 */
export function detectAnnonces(hand, trump) {
  const seqs = detectSequences(hand).map(a => ({
    ...a,
    isTrump: a.suit === trump,
  }));
  return [...seqs, ...detectCarres(hand)];
}

/**
 * R10: Ranking key for comparison.
 * Compares: points > carré vs suite > top card > trump > aînesse (latest rank in order).
 * @param {object} annonce - Annonce object
 * @returns {object} Ranking key
 */
function rankKey(annonce) {
  return {
    points: annonce.points,
    isCarre: annonce.kind === 'carre' ? 1 : 0, // Carre beats suite at same points
    topRank: annonce.kind === 'carre'
      ? SEQ_ORDER[annonce.rank]
      : SEQ_ORDER[annonce.top.rank],
    isTrump: annonce.kind === 'carre' ? 0 : (annonce.isTrump ? 1 : 0),
  };
}

/**
 * R10: Compare two annonces.
 * Returns: >0 if a beats b, <0 if b beats a, 0 if equal.
 * @param {object} a - Annonce A
 * @param {object} b - Annonce B
 * @returns {number} Comparison
 */
export function compareAnnonce(a, b) {
  const ka = rankKey(a);
  const kb = rankKey(b);

  if (ka.points !== kb.points) return ka.points - kb.points;
  if (ka.isCarre !== kb.isCarre) return ka.isCarre - kb.isCarre;
  if (ka.topRank !== kb.topRank) return ka.topRank - kb.topRank;
  if (ka.isTrump !== kb.isTrump) return ka.isTrump - kb.isTrump;
  return 0; // Perfect equality (aînesse decided by play order, not here)
}

/**
 * R10: Resolve announcements for a deal.
 * Only the team with the BEST annonce scores, and they score ALL their annonces.
 * Perfect equality between opposing teams cancels all (bonus [0,0]).
 *
 * @param {array} fullHands - 4 hands (8 cards each)
 * @param {string} trump - Trump suit
 * @param {number} dealer - Dealer (for aînesse tiebreaker)
 * @param {array} declared - [bool×4] which players declared (default all true for bot)
 * @returns {object} { byPlayer, winnerTeam, bonus: [t0, t1], best, annule }
 */
export function resolveAnnonces(fullHands, trump, dealer, declared = [true, true, true, true]) {
  const order = eldestOrder(dealer); // Aînesse order for tiebreaking

  // Detect announced cards by each player
  const byPlayer = fullHands.map((hand, p) => {
    if (!declared[p]) return [];
    return detectAnnonces(hand, trump);
  });

  // Find best annonce overall (using aînesse to break ties)
  let best = null;
  let bestPlayer = -1;
  for (const p of order) {
    for (const ann of byPlayer[p]) {
      if (best === null || compareAnnonce(ann, best) > 0) {
        best = ann;
        bestPlayer = p;
      }
      // Equality (compareAnnonce === 0) keeps earliest in order (aînesse)
    }
  }

  // No announcements
  if (best === null) {
    return {
      byPlayer,
      winnerTeam: -1,
      bonus: [0, 0],
      best: null,
      annule: false,
    };
  }

  const winnerTeam = teamOf(bestPlayer);

  // Check for perfect equality with opposing team
  for (const p of order) {
    if (teamOf(p) === winnerTeam) continue; // Same team, skip
    for (const ann of byPlayer[p]) {
      if (compareAnnonce(ann, best) === 0) {
        // Perfect tie with opposing team → cancel
        return {
          byPlayer,
          winnerTeam: -1,
          bonus: [0, 0],
          best,
          annule: true,
        };
      }
    }
  }

  // Winning team scores all their annonces
  const bonus = [0, 0];
  for (let p = 0; p < 4; p++) {
    if (teamOf(p) === winnerTeam) {
      for (const ann of byPlayer[p]) {
        bonus[winnerTeam] += ann.points;
      }
    }
  }

  return {
    byPlayer,
    winnerTeam,
    bonus,
    best,
    annule: false,
  };
}

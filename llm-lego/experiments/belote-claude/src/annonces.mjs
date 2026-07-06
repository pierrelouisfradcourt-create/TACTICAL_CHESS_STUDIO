// Belote — ANNONCES (déclarations du 1er pli) : suites (tierce/cinquante/cent) et carrés.
// Module NOUVEAU (n'altère pas scoring.mjs validé) : la belote-rebelote reste gérée par
// scoring.mjs ; ici on ne traite QUE les combinaisons déclarées.
//
// Barème (décisions documentées) :
//   Suites (même couleur, ordre naturel A>R>D>V>10>9>8>7) :
//     3 cartes = tierce = 20 · 4 = cinquante = 50 · 5+ = cent = 100
//   Carrés (4 cartes de même rang) :
//     Valets = 200 · Neuf = 150 · As/Rois/Dames/10 = 100 · 8/7 = 0 (nul)
//   Comparaison : plus de points l'emporte ; à égalité, carré > suite, puis carte la
//   plus haute, puis atout, puis aînesse. Égalité parfaite entre équipes adverses =
//   annonces ANNULÉES (personne ne marque). Seule l'équipe au meilleur pli marque, et
//   elle marque TOUTES ses annonces.
import { eldestOrder } from "./deal.mjs";
import { teamOf } from "./rules.mjs";

// Ordre naturel des cartes pour les suites (indépendant de l'atout).
export const SEQ_ORDER = { "7": 0, "8": 1, "9": 2, "10": 3, V: 4, D: 5, R: 6, A: 7 };
// Valeur d'un carré selon le rang (8 et 7 : sans valeur).
export const CARRE_POINTS = { V: 200, "9": 150, A: 100, R: 100, D: 100, "10": 100, "8": 0, "7": 0 };
const RANK_FR = { A: "As", R: "Rois", D: "Dames", V: "Valets", "10": "Dix", "9": "Neuf", "8": "Huit", "7": "Sept" };

/** Suites d'une main : runs consécutifs (ordre naturel) de ≥3 cartes dans une couleur. */
function sequences(hand) {
  const bySuit = {};
  for (const c of hand) (bySuit[c.suit] ||= []).push(c);
  const res = [];
  for (const suit of Object.keys(bySuit)) {
    const cards = bySuit[suit].slice().sort((a, b) => SEQ_ORDER[a.rank] - SEQ_ORDER[b.rank]);
    let run = [cards[0]];
    const flush = () => {
      const L = run.length;
      if (L >= 3) {
        const top = run[run.length - 1]; // carte la plus haute (ordre naturel)
        const type = L >= 5 ? "cent" : L === 4 ? "cinquante" : "tierce";
        const points = L >= 5 ? 100 : L === 4 ? 50 : 20;
        res.push({ kind: "suite", type, points, len: L, suit, top, cards: run.slice() });
      }
    };
    for (let i = 1; i < cards.length; i++) {
      if (SEQ_ORDER[cards[i].rank] === SEQ_ORDER[cards[i - 1].rank] + 1) run.push(cards[i]);
      else { flush(); run = [cards[i]]; }
    }
    flush();
  }
  return res;
}

/** Carrés d'une main : 4 cartes de même rang, valeur > 0. */
function carres(hand) {
  const byRank = {};
  for (const c of hand) (byRank[c.rank] ||= []).push(c);
  const res = [];
  for (const rank of Object.keys(byRank)) {
    if (byRank[rank].length === 4 && CARRE_POINTS[rank] > 0) {
      res.push({ kind: "carre", type: "carre", points: CARRE_POINTS[rank], rank, cards: byRank[rank].slice() });
    }
  }
  return res;
}

/** Toutes les annonces d'une main (suites + carrés), avec drapeau atout pour les suites. */
export function detectAnnonces(hand, atout) {
  const seqs = sequences(hand).map((a) => ({ ...a, isTrump: a.suit === atout }));
  return [...seqs, ...carres(hand)];
}

/** Libellé lisible d'une annonce (le TYPE, pas les cartes — comme une annonce à voix haute). */
export function annonceLabel(a) {
  if (a.kind === "carre") return `Carré de ${RANK_FR[a.rank]}`;
  return a.type === "cent" ? "Cent" : a.type === "cinquante" ? "Cinquante" : "Tierce";
}

// Clé de comparaison : [points, carré?, carte haute, atout?]. Plus grand = meilleur.
function rankKey(a) {
  return {
    points: a.points,
    carre: a.kind === "carre" ? 1 : 0,
    top: a.kind === "carre" ? SEQ_ORDER[a.rank] : SEQ_ORDER[a.top.rank],
    trump: a.kind === "carre" ? 0 : a.isTrump ? 1 : 0,
  };
}

/** >0 si a est meilleure que b, <0 si moins bonne, 0 si parfaitement égale. */
export function compareAnnonce(a, b) {
  const ra = rankKey(a), rb = rankKey(b);
  if (ra.points !== rb.points) return ra.points - rb.points;
  if (ra.carre !== rb.carre) return ra.carre - rb.carre; // carré > suite à points égaux
  if (ra.top !== rb.top) return ra.top - rb.top;
  if (ra.trump !== rb.trump) return ra.trump - rb.trump;
  return 0;
}

/**
 * Résout les annonces d'une donne. Retourne :
 *   { byPlayer:[[...]×4], winnerTeam, bonus:[t0,t1], best, annule }
 * Seule l'équipe détentrice de la MEILLEURE annonce marque, et elle marque toutes ses
 * annonces. Égalité parfaite entre équipes adverses → annulée (bonus 0/0).
 */
export function resolveAnnonces(fullHands, atout, dealer, declared = [true, true, true, true]) {
  const order = eldestOrder(dealer); // aînesse pour départager les égalités
  // Seules les annonces DÉCLARÉES entrent dans le pool (IA = toujours ; humain = si « Annoncer »).
  const byPlayer = [0, 1, 2, 3].map((p) => (declared[p] ? detectAnnonces(fullHands[p], atout) : []));

  let best = null, bestPlayer = -1;
  for (const p of order) {
    for (const a of byPlayer[p]) {
      if (best === null || compareAnnonce(a, best) > 0) { best = a; bestPlayer = p; }
      // égalité (===0) : on garde la plus ancienne (aînesse) → ne rien faire
    }
  }
  if (best === null) return { byPlayer, winnerTeam: -1, bonus: [0, 0], best: null, annule: false };

  const winnerTeam = teamOf(bestPlayer);
  // égalité parfaite avec une annonce de l'équipe adverse → tout est annulé
  for (const p of order) {
    if (teamOf(p) === winnerTeam) continue;
    for (const a of byPlayer[p]) if (compareAnnonce(a, best) === 0) {
      return { byPlayer, winnerTeam: -1, bonus: [0, 0], best, annule: true };
    }
  }

  const bonus = [0, 0];
  for (let p = 0; p < 4; p++) {
    if (teamOf(p) === winnerTeam) for (const a of byPlayer[p]) bonus[winnerTeam] += a.points;
  }
  return { byPlayer, winnerTeam, bonus, best, annule: false };
}

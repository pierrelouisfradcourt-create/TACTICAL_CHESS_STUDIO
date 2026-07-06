// Belote — moteur de jeu complet : un pli, une donne, une partie.
// IA simple mais LÉGALE (le prompt priorise la logique, pas la force — décision D8).
import { cardPoints } from "./cards.mjs";
import { deal, completeDeal, eldestOrder, makeRng } from "./deal.mjs";
import { runBidding } from "./bidding.mjs";
import { legalMoves, trickWinner, beloteTeam } from "./rules.mjs";
import { scoreDeal } from "./scoring.mjs";

/** Choix d'un coup parmi les coups légaux. Gagne le pli au moindre coût, sinon défausse bas. */
export function chooseMove(legal, trick, atout, mover) {
  const val = (c) => cardPoints(c, atout);
  if (trick.length === 0) {
    // Entame : jouer un As hors atout si possible (souvent maître), sinon la plus basse.
    const ace = legal.find((c) => c.rank === "A" && c.suit !== atout);
    if (ace) return ace;
    return legal.reduce((lo, c) => (val(c) < val(lo) ? c : lo));
  }
  // Coups qui remportent le pli s'ils sont joués maintenant.
  const winning = legal.filter((c) => trickWinner([...trick, { player: mover, card: c }], atout).player === mover);
  if (winning.length > 0) {
    // Gagner le moins cher possible (garder les grosses cartes).
    return winning.reduce((lo, c) => (val(c) < val(lo) ? c : lo));
  }
  // Ne peut pas gagner → défausser la carte la moins précieuse.
  return legal.reduce((lo, c) => (val(c) < val(lo) ? c : lo));
}

/** Joue un pli complet à partir de `leader`. Mute `hands` (retire les cartes jouées). */
export function playTrick(hands, leader, atout) {
  const trick = [];
  const cards = [];
  for (let i = 0; i < 4; i++) {
    const p = (leader + i) % 4;
    const legal = legalMoves(hands[p], trick, atout, p);
    const chosen = chooseMove(legal, trick, atout, p);
    // retire la carte de la main
    const idx = hands[p].findIndex((c) => c.id === chosen.id);
    hands[p].splice(idx, 1);
    trick.push({ player: p, card: chosen });
    cards.push(chosen);
  }
  const winner = trickWinner(trick, atout).player;
  return { winner, cards, plays: trick };
}

/**
 * Joue une donne complète. Retourne { redeal:true } si personne ne prend, sinon le
 * décompte + métadonnées. `dealer` = donneur ; l'aîné (dealer+1) entame.
 */
export function playDeal(dealer, rng = Math.random) {
  const { hands, turnUp, talon } = deal(dealer, rng);
  const bid = runBidding(hands, turnUp, dealer);
  if (!bid) return { redeal: true };

  const fullHands = completeDeal(hands, bid.taker, turnUp, talon, dealer);
  const play = fullHands.map((h) => h.slice()); // copie jouable (playTrick mute)
  const bTeam = beloteTeam(fullHands, bid.atout);

  const tricks = [];
  let leader = eldestOrder(dealer)[0]; // aîné entame le 1er pli
  for (let t = 0; t < 8; t++) {
    const res = playTrick(play, leader, bid.atout);
    tricks.push(res);
    leader = res.winner; // le gagnant entame le pli suivant
  }
  const score = scoreDeal(tricks, bid.atout, bid.taker, bTeam);
  return { redeal: false, dealer, taker: bid.taker, atout: bid.atout, round: bid.round, beloteTeam: bTeam, tricks, score };
}

/**
 * Joue une partie jusqu'à `target` points. Retourne l'historique + le vainqueur.
 * Garde-fou : nombre de donnes plafonné (anti-boucle infinie de redistributions).
 */
export function playGame({ target = 1000, seed = 1, startDealer = 0, maxDeals = 200 } = {}) {
  const rng = makeRng(seed);
  const totals = [0, 0];
  const deals = [];
  let dealer = startDealer;
  let redeals = 0;
  while (Math.max(...totals) < target && deals.length + redeals < maxDeals) {
    const d = playDeal(dealer, rng);
    dealer = (dealer + 1) % 4; // le donneur tourne
    if (d.redeal) { redeals += 1; continue; }
    totals[0] += d.score.scores[0];
    totals[1] += d.score.scores[1];
    deals.push({ ...d, totalsAfter: totals.slice() });
  }
  const winner = totals[0] === totals[1] ? -1 : totals[0] > totals[1] ? 0 : 1;
  return { totals, winner, deals, redeals, dealsPlayed: deals.length };
}

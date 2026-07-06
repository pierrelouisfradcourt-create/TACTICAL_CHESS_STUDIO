// Belote — DRIVER interactif (couche par-dessus la logique validée, sans la réécrire).
//
// Le moteur src/ est entièrement automatique (playTrick/playDeal jouent les 4 joueurs
// via chooseMove). Pour rendre le jeu jouable par un humain, ce driver rejoue la MÊME
// structure de boucle que playDeal/playGame, mais en appelant les MÊMES fonctions de
// règles (legalMoves, trickWinner, chooseMove, scoreDeal…). Il se met en pause quand
// c'est au tour du siège 0 (l'humain) et laisse l'IA jouer les 3 autres sièges.
//
// Invariant prouvé (web/verify-parity.mjs) : si le siège 0 joue exactement ce que
// chooseMove choisirait, une partie pilotée ici est IDENTIQUE à playGame(seed).
// Donc les règles/scoring ne divergent pas de la version CLI.

import { deal, completeDeal, eldestOrder } from "../src/deal.mjs";
import { newShoe, cut, pickup } from "../src/shoe.mjs";
import { handStrength } from "../src/bidding.mjs";
import { legalMoves, trickWinner, beloteTeam } from "../src/rules.mjs";
import { scoreDeal } from "../src/scoring.mjs";
import { chooseMove } from "../src/game.mjs";
import { cardPoints, SUITS } from "../src/cards.mjs";
import { resolveAnnonces, annonceLabel } from "../src/annonces.mjs";

export const HUMAN = 0; // siège de l'humain (Sud, équipe A = 0 & 2)
const SEAT_NAME = { 0: "Vous", 1: "Ouest", 2: "Nord", 3: "Est" };

// Seuils de prise — MIROIR des constantes privées de bidding.mjs (décision D2).
// On les reproduit ici pour piloter l'enchère pas à pas (l'humain participe) en
// réutilisant la vraie fonction handStrength du moteur. La parité vs playGame
// (qui utilise le vrai runBidding) garde ces seuils honnêtes : s'ils divergeaient,
// le preneur changerait et verify-parity.mjs échouerait.
const TAKE_R1 = 8; // tour 1 : prendre la couleur retournée
const TAKE_R2 = 9; // tour 2 : nommer une autre couleur

export class BeloteDriver {
  constructor({ seed = 1, target = 1000, startDealer = 0, maxDeals = 200, annonces = true } = {}) {
    this.seed = seed;
    this.target = target;
    this.maxDeals = maxDeals;
    this.useAnnonces = annonces; // couche annonces (suites/carrés) — désactivable pour la parité
    this.annonceResult = null; // résolution des annonces de la donne en cours
    this._annonceShown = false; // les annonces de la donne ont-elles déjà été révélées ?
    const shoe = newShoe(seed);
    this.rng = shoe.rng; // un seul RNG de partie (mélange initial déjà consommé)
    this.deckCourant = shoe.deck; // paquet vivant, jamais re-mélangé (fidélité belote)
    this.totals = [0, 0];
    this.dealer = startDealer;
    this.redeals = 0;
    this.dealsPlayed = 0;
    this.deals = []; // historique des donnes terminées (résumé)

    // état de la donne courante (null = aucune donne active)
    this.atout = null;
    this.taker = null;
    this.round = null;
    this.beloteTeamIdx = -1;
    this.hands = null; // 4 mains jouables (mutées au fil des plis)
    this.trick = []; // [{ player, card }] du pli en cours
    this.leader = 0;
    this.trickIndex = 0;
    this.tricks = []; // plis terminés de la donne, pour le scoring

    // état de l'enchère (null = pas d'enchère en cours)
    // { round: 1|2, order: [sièges], index, hands: [5 cartes ×4], turnUp, talon }
    this.bidding = null;
    this._pendingHumanBid = undefined; // décision de l'humain en attente d'application
    this.bidHint = null; // conseil heuristique pour l'humain (quand bid_await)

    // snapshots pour l'affichage
    this.phase = "await_human"; // bid_await | bid_step | await_human | trick_done | deal_done | game_over
    this.lastTrick = null; // pli tout juste terminé (à montrer avant de l'effacer)
    this.lastDeal = null; // résumé de la donne tout juste terminée
    this.winner = null; // vainqueur final (0 | 1 | -1)
    this.legalIds = []; // ids des cartes jouables (quand await_human)
    this.message = "";

    this.advance();
  }

  get dealActive() {
    return this.atout !== null;
  }

  // Distribue 5 cartes + la carte retournée, et ouvre l'enchère (tour 1).
  // Même consommation du RNG que playGame (un deal() par tentative).
  _beginBidding() {
    this.deckCourant = cut(this.deckCourant, this.rng); // coupe réelle avant la donne
    const { hands, turnUp, talon } = deal(this.dealer, this.deckCourant);
    this.bidding = { round: 1, order: eldestOrder(this.dealer), index: 0, hands, turnUp, talon };
    this.message = `Carte retournée : ${turnUp.rank}${turnUp.suit}. Tour 1 — prendre ou passer ?`;
  }

  // Décision d'un siège IA pour l'enchère (mêmes règles que runBidding, via handStrength).
  _aiBidDecision(p) {
    const b = this.bidding;
    if (b.round === 1) {
      const strength = handStrength([...b.hands[p], b.turnUp], b.turnUp.suit);
      return strength >= TAKE_R1 ? { take: true, suit: b.turnUp.suit } : { take: false };
    }
    let best = null;
    for (const s of SUITS) {
      if (s === b.turnUp.suit) continue; // interdit de reprendre la couleur retournée au tour 2
      const st = handStrength(b.hands[p], s);
      if (st >= TAKE_R2 && (!best || st > best.st)) best = { s, st };
    }
    return best ? { take: true, suit: best.s } : { take: false };
  }

  // Conseil affiché à l'humain (ce que ferait l'heuristique du moteur à sa place).
  _humanBidHint() {
    const d = this._aiBidDecision(HUMAN);
    return d.take ? { action: "take", suit: d.suit } : { action: "pass" };
  }

  // Applique une prise : complète les mains à 8 et prépare le jeu.
  _resolveBid(taker, atout, round) {
    const b = this.bidding;
    this.hands = completeDeal(b.hands, taker, b.turnUp, b.talon, this.dealer);
    this.atout = atout;
    this.taker = taker;
    this.round = round;
    this.beloteTeamIdx = beloteTeam(this.hands, atout);
    // annonces (suites/carrés) détectées sur les mains complètes, à déclarer au 1er pli
    this.annonceResult = this.useAnnonces ? resolveAnnonces(this.hands, atout, this.dealer) : null;
    this._annonceShown = false;
    this.trick = [];
    this.tricks = [];
    this.trickIndex = 0;
    this.leader = eldestOrder(this.dealer)[0]; // l'aîné entame le 1er pli
    this.bidding = null;
  }

  // Y a-t-il au moins une annonce (suite/carré) déclarée cette donne ?
  _hasAnnonces() {
    return this.annonceResult && this.annonceResult.byPlayer.some((list) => list.length > 0);
  }

  // Liste lisible des annonces de la donne (type + points, PAS les cartes exactes).
  _annonceList() {
    const r = this.annonceResult;
    if (!r) return null;
    const items = [];
    for (let p = 0; p < 4; p++) {
      for (const a of r.byPlayer[p]) items.push({ player: p, team: p % 2, label: annonceLabel(a), points: a.points });
    }
    return { items, winnerTeam: r.winnerTeam, bonus: r.bonus.slice(), annule: !!r.annule };
  }

  _resolveTrick() {
    const winner = trickWinner(this.trick, this.atout).player;
    const cards = this.trick.map((t) => t.card);
    const done = { winner, cards, plays: this.trick.slice() };
    this.tricks.push(done);
    this.lastTrick = done;
    this.leader = winner; // le gagnant entame le pli suivant
    this.trickIndex += 1;
    this.trick = [];
  }

  _finishDeal() {
    const score = scoreDeal(this.tricks, this.atout, this.taker, this.beloteTeamIdx); // base validée, intacte
    // couche annonces (suites/carrés) ajoutée PAR-DESSUS, sans toucher scoreDeal
    const annBonus = this.useAnnonces && this.annonceResult ? this.annonceResult.bonus : [0, 0];
    this.totals[0] += score.scores[0] + annBonus[0];
    this.totals[1] += score.scores[1] + annBonus[1];
    this.dealsPlayed += 1;
    const summary = {
      index: this.dealsPlayed,
      dealer: this.dealer,
      taker: this.taker,
      atout: this.atout,
      round: this.round,
      beloteTeam: this.beloteTeamIdx,
      score, // décompte cartes (base) — inchangé
      annonceBonus: annBonus.slice(),
      annonces: this._annonceList(), // liste lisible pour l'affichage
      totalsAfter: this.totals.slice(),
    };
    this.deals.push(summary);
    this.lastDeal = summary;
    // fin de donne : ramassage déterministe (parité vs playGame), puis le donneur tourne
    this.deckCourant = pickup(this.tricks, this.taker % 2);
    this.dealer = (this.dealer + 1) % 4;
    this.atout = null;
    this.hands = null;
  }

  _endGame() {
    this.winner = this.totals[0] === this.totals[1] ? -1 : this.totals[0] > this.totals[1] ? 0 : 1;
    this.phase = "game_over";
    this.atout = null;
    this.hands = null;
  }

  // Progresse aussi loin que possible : joue les sièges IA, s'arrête quand il faut
  // l'humain (await_human) ou sur une pause naturelle (trick_done / deal_done / game_over).
  advance() {
    for (;;) {
      if (this.phase === "game_over") return;

      // --- enchère (la prise) en cours ---
      if (this.bidding) {
        const b = this.bidding;
        const p = b.order[b.index];
        // au tour de l'humain : on attend sa décision (prendre / passer / couleur)
        if (p === HUMAN && this._pendingHumanBid === undefined) {
          this.bidHint = this._humanBidHint();
          this.phase = "bid_await";
          return;
        }
        const decision = p === HUMAN ? this._pendingHumanBid : this._aiBidDecision(p);
        if (p === HUMAN) { this._pendingHumanBid = undefined; this.bidHint = null; }

        if (decision.take) {
          this.message = `${SEAT_NAME[p]} prend à ${decision.suit}` + (b.round === 2 ? " (tour 2)" : "");
          this._resolveBid(p, decision.suit, b.round);
          this.phase = "bid_step"; // pause : on montre la prise, puis le jeu démarre
          return;
        }
        // passe
        this.message = `${SEAT_NAME[p]} passe`;
        b.index += 1;
        if (b.index >= 4) {
          if (b.round === 1) {
            b.round = 2; b.index = 0;
            this.message += " — tour 2 : nommer une couleur";
          } else {
            // personne ne prend aux deux tours → redistribution (le donneur tourne)
            this.bidding = null;
            this.redeals += 1;
            this.dealer = (this.dealer + 1) % 4;
            this.message = "Personne ne prend — nouvelle donne.";
          }
        }
        this.phase = "bid_step";
        return;
      }

      if (!this.dealActive) {
        if (Math.max(...this.totals) >= this.target) { this._endGame(); return; }
        if (this.dealsPlayed + this.redeals >= this.maxDeals) { this._endGame(); return; }
        this._beginBidding();
        this.phase = "bid_step"; // on montre la carte retournée avant la 1re décision
        return;
      }

      // annonces déclarées au 1er pli : on les révèle une fois avant de jouer
      if (this.useAnnonces && !this._annonceShown && this._hasAnnonces()) {
        this._annonceShown = true;
        const w = this.annonceResult.winnerTeam;
        this.message = this.annonceResult.annule
          ? "Annonces à égalité — annulées."
          : `Annonces : équipe ${w === 0 ? "A" : "B"} marque ${this.annonceResult.bonus[w]}.`;
        this.phase = "annonce_show";
        return;
      }

      if (this.trickIndex >= 8) {
        this._finishDeal();
        this.phase = "deal_done";
        return;
      }

      if (this.trick.length === 4) {
        this._resolveTrick();
        this.phase = "trick_done";
        return;
      }

      const p = (this.leader + this.trick.length) % 4;
      const legal = legalMoves(this.hands[p], this.trick, this.atout, p);
      if (p === HUMAN) {
        this.legalIds = legal.map((c) => c.id);
        this.phase = "await_human";
        return;
      }
      // siège IA : même choix que le moteur CLI
      const chosen = chooseMove(legal, this.trick, this.atout, p);
      this._removeCard(p, chosen);
      this.trick.push({ player: p, card: chosen });
    }
  }

  _removeCard(p, card) {
    const idx = this.hands[p].findIndex((c) => c.id === card.id);
    if (idx === -1) throw new Error(`carte ${card.id} absente de la main du joueur ${p}`);
    this.hands[p].splice(idx, 1);
  }

  // Nombre de cartes de belote (R et D d'atout) déjà JOUÉES par le détenteur.
  // 0 = rien d'annoncé, 1 = "belote", 2 = "belote-rebelote". Sert d'annonce honnête :
  // on ne révèle la belote que lorsque ses cartes sont réellement tombées.
  _belotePlayedCount() {
    if (this.beloteTeamIdx === -1 || !this.atout) return 0;
    const isBel = (c) => c.suit === this.atout && (c.rank === "R" || c.rank === "D");
    let n = 0;
    for (const t of this.tricks) for (const c of t.cards) if (isBel(c)) n++;
    for (const t of this.trick) if (isBel(t.card)) n++;
    return n;
  }

  // L'humain enchérit : action "take" (prendre) ou "pass" (passer). Au tour 2, "take"
  // exige une couleur `suit` (≠ couleur retournée). Rejette hors tour / choix invalide.
  humanBid(action, suit) {
    if (this.phase !== "bid_await" || !this.bidding) {
      return { ok: false, error: "Ce n'est pas à vous d'enchérir." };
    }
    const b = this.bidding;
    if (b.order[b.index] !== HUMAN) return { ok: false, error: "Ce n'est pas votre tour." };

    if (action === "take") {
      let atout;
      if (b.round === 1) {
        atout = b.turnUp.suit; // tour 1 : on prend la couleur retournée
      } else {
        if (!SUITS.includes(suit) || suit === b.turnUp.suit) {
          return { ok: false, error: "Couleur d'atout invalide au tour 2." };
        }
        atout = suit;
      }
      this._pendingHumanBid = { take: true, suit: atout };
    } else if (action === "pass") {
      this._pendingHumanBid = { take: false };
    } else {
      return { ok: false, error: "Action d'enchère inconnue." };
    }
    this.advance();
    return { ok: true };
  }

  // L'humain (siège 0) joue une carte de sa main. Rejette si ce n'est pas son tour ou
  // si le coup est illégal (mêmes obligations que le moteur via legalMoves).
  playHuman(cardId) {
    if (this.phase !== "await_human") {
      return { ok: false, error: "Ce n'est pas à vous de jouer." };
    }
    const legal = legalMoves(this.hands[HUMAN], this.trick, this.atout, HUMAN);
    const chosen = legal.find((c) => c.id === cardId);
    if (!chosen) {
      return { ok: false, error: "Coup illégal (vous devez fournir / couper selon les règles)." };
    }
    this._removeCard(HUMAN, chosen);
    this.trick.push({ player: HUMAN, card: chosen });
    this.advance();
    return { ok: true };
  }

  // Reprend après une pause d'affichage (trick_done / deal_done).
  continue() {
    if (this.phase === "game_over") return { ok: true };
    this.lastTrick = null;
    this.advance();
    return { ok: true };
  }

  // Siège dont c'est le tour (jeu OU enchère), pour la surbrillance du pod.
  _whoseTurn() {
    if (this.phase === "await_human") return HUMAN;
    if (this.bidding) return this.bidding.index < 4 ? this.bidding.order[this.bidding.index] : null;
    if (this.dealActive) return (this.leader + this.trick.length) % 4;
    return null;
  }

  // Vue JSON pour le client : révèle uniquement la main de l'humain (pas de triche).
  view() {
    const legalSet = new Set(this.legalIds);
    const belotePlayed = this._belotePlayedCount();
    const b = this.bidding;
    // main de l'humain : 8 cartes en jeu, ou ses 5 cartes pendant l'enchère
    const humanHand = this.hands ? this.hands[HUMAN] : b ? b.hands[HUMAN] : null;
    return {
      phase: this.phase,
      seed: this.seed,
      target: this.target,
      totals: this.totals.slice(),
      dealer: this.dealer,
      atout: this.atout,
      taker: this.taker,
      takerTeam: this.taker === null ? null : this.taker % 2,
      round: this.round,
      // annonces de la donne en cours
      beloteTeam: belotePlayed >= 1 ? this.beloteTeamIdx : -1, // -1 tant que non annoncée
      belotePlayed,
      trickIndex: this.trickIndex,
      whoseTurn: this._whoseTurn(),
      // --- enchère ---
      bidding: b ? true : false,
      bidRound: b ? b.round : null,
      turnUp: b ? { id: b.turnUp.id, rank: b.turnUp.rank, suit: b.turnUp.suit } : null,
      bidHint: this.phase === "bid_await" ? this.bidHint : null,
      // couleurs proposables au tour 2 (≠ couleur retournée)
      bidSuits: b && b.round === 2 ? SUITS.filter((s) => s !== b.turnUp.suit) : [],
      // révélation des annonces (suites/carrés) au 1er pli
      annonces: this.phase === "annonce_show" ? this._annonceList() : null,
      // main de l'humain, avec drapeau "jouable" quand c'est son tour
      hand:
        humanHand === null
          ? []
          : humanHand.map((c) => ({
              id: c.id,
              rank: c.rank,
              suit: c.suit,
              points: cardPoints(c, this.atout),
              legal: this.phase === "await_human" ? legalSet.has(c.id) : false,
            })),
      handCounts: this.hands ? this.hands.map((h) => h.length) : b ? b.hands.map((h) => h.length) : [0, 0, 0, 0],
      // pli en cours ou pli tout juste terminé
      trick: (this.trick.length ? this.trick : this.lastTrick ? this.lastTrick.plays : []).map((t) => ({
        player: t.player,
        card: { id: t.card.id, rank: t.card.rank, suit: t.card.suit },
      })),
      trickWinner: this.phase === "trick_done" && this.lastTrick ? this.lastTrick.winner : null,
      lastDeal: this.phase === "deal_done" ? this.lastDeal : null,
      winner: this.winner,
      dealsPlayed: this.dealsPlayed,
      redeals: this.redeals,
      message: this.message,
    };
  }
}

// Belote — mélange et distribution en DEUX temps (mécanique réelle de la belote).
// Temps 1 (deal)         : 5 cartes/joueur (3 puis 2) + 1 carte retournée, talon de 11.
// Temps 2 (completeDeal) : après la prise, le preneur intègre la carte retournée et
//                          on complète toutes les mains à 8 (preneur +2, autres +3).

/** RNG déterministe (mulberry32) — permet des tests reproductibles. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates, RNG injectable, ne mute pas l'entrée. */
export function shuffle(deck, rng = Math.random) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Ordre des joueurs en partant du joueur à gauche du donneur (l'aîné). */
export function eldestOrder(dealer) {
  return [1, 2, 3, 0].map((o) => (dealer + o) % 4);
}

/**
 * Temps 1 — deal initial à partir d'un paquet DÉJÀ mélangé/coupé (fourni par le sabot,
 * cf. src/shoe.mjs). NE mélange PLUS (fidélité belote : le mélange est unique en début de
 * partie). 3 puis 2 cartes à chacun (5), puis 1 carte retournée. Retourne
 * { hands, turnUp, talon } où talon = 11 cartes.
 */
export function deal(dealer, deck) {
  const hands = [[], [], [], []];
  const order = eldestOrder(dealer);
  let k = 0;
  for (const size of [3, 2]) {
    for (const p of order) for (let n = 0; n < size; n++) hands[p].push(deck[k++]);
  }
  const turnUp = deck[k++];
  const talon = deck.slice(k); // 11 cartes restantes
  return { hands, turnUp, talon };
}

/**
 * Temps 2 — complète les mains à 8 après la prise. Le preneur reçoit d'abord la
 * carte retournée, puis on distribue le talon : preneur +2, chacun des autres +3
 * (2 + 3×3 = 11 = talon). Retourne de NOUVELLES mains (ne mute pas l'entrée).
 */
export function completeDeal(hands, taker, turnUp, talon, dealer) {
  const full = hands.map((h) => h.slice());
  full[taker].push(turnUp);
  const pile = talon.slice();
  for (const p of eldestOrder(dealer)) {
    const need = 8 - full[p].length; // preneur=2, autres=3
    for (let n = 0; n < need; n++) full[p].push(pile.shift());
  }
  return full;
}

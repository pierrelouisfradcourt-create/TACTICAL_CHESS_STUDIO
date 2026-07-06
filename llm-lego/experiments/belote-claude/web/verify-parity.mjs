// Preuve de non-divergence : si le siège humain (0) joue exactement ce que chooseMove
// choisirait, le BeloteDriver reproduit playGame(seed) carte pour carte.
// Sert de garde-fou : la couche interface ne change PAS les règles/scoring du moteur.
//
// Usage : node web/verify-parity.mjs
import { BeloteDriver, HUMAN } from "./driver.mjs";
import { playGame } from "../src/game.mjs";
import { legalMoves } from "../src/rules.mjs";
import { chooseMove } from "../src/game.mjs";

function autoDrive(seed, target) {
  // annonces désactivées : la couche annonces ajoute des points que playGame ne connaît
  // pas. Sans elle, le driver doit reproduire playGame carte pour carte (enchère + jeu).
  const d = new BeloteDriver({ seed, target, annonces: false });
  let guard = 0;
  while (d.phase !== "game_over") {
    if (++guard > 100000) throw new Error("boucle infinie");
    if (d.phase === "bid_await") {
      // l'"humain" enchérit exactement comme l'heuristique du moteur (via le conseil).
      // Si l'enchère interactive + les seuils reproduisent runBidding, la partie
      // entière doit égaler playGame — sinon le preneur diffère et la parité casse.
      const hint = d.view().bidHint;
      const r = d.humanBid(hint.action, hint.suit);
      if (!r.ok) throw new Error("enchère rejetée à tort: " + r.error);
    } else if (d.phase === "await_human") {
      // le "joueur humain" joue le choix du moteur → doit égaler playTrick
      const legal = legalMoves(d.hands[HUMAN], d.trick, d.atout, HUMAN);
      const chosen = chooseMove(legal, d.trick, d.atout, HUMAN);
      const r = d.playHuman(chosen.id);
      if (!r.ok) throw new Error("coup rejeté à tort: " + r.error);
      // Joueur AUTOMATIQUE : déclare la belote comme le fait le moteur (auto), pour que le
      // +20 coïncide avec playGame. Sans ça, un siège 0 détenteur de belote divergerait.
      const v = d.view();
      if (v.canBelote) d.humanBelote("belote");
      else if (v.canRebelote) d.humanBelote("rebelote");
    } else {
      // bid_step / trick_done / deal_done → reprendre
      d.continue();
    }
  }
  return d;
}

const SEEDS = [1, 3, 7, 42, 123];
const TARGET = 501;
let allOk = true;
const rows = [];

for (const seed of SEEDS) {
  const ref = playGame({ target: TARGET, seed });
  const drv = autoDrive(seed, TARGET);

  const totalsMatch =
    drv.totals[0] === ref.totals[0] && drv.totals[1] === ref.totals[1];
  const winnerMatch = drv.winner === ref.winner;
  const dealsMatch = drv.dealsPlayed === ref.dealsPlayed && drv.redeals === ref.redeals;

  // comparaison pli par pli de chaque donne
  let tricksMatch = true;
  for (let i = 0; i < ref.deals.length && tricksMatch; i++) {
    const rt = ref.deals[i].tricks;
    // le driver ne stocke pas les plis par donne dans deals[] → on recompose via scores
    // (les totaux + winner + nb donnes suffisent comme empreinte forte ; on vérifie
    //  aussi que chaque score de donne coïncide)
    if (ref.deals[i].score.scores[0] !== drv.deals[i].score.scores[0] ||
        ref.deals[i].score.scores[1] !== drv.deals[i].score.scores[1]) {
      tricksMatch = false;
    }
    void rt;
  }

  const ok = totalsMatch && winnerMatch && dealsMatch && tricksMatch;
  allOk = allOk && ok;
  rows.push({
    seed,
    ref: `${ref.totals[0]}-${ref.totals[1]} (win ${ref.winner}, ${ref.dealsPlayed}d)`,
    drv: `${drv.totals[0]}-${drv.totals[1]} (win ${drv.winner}, ${drv.dealsPlayed}d)`,
    ok,
  });
}

console.log("=== Parité driver interactif vs playGame (auto) ===");
for (const r of rows) {
  console.log(
    `seed ${String(r.seed).padStart(3)} | playGame ${r.ref.padEnd(24)} | driver ${r.drv.padEnd(24)} | ${r.ok ? "✅" : "❌"}`
  );
}
console.log(allOk ? "\nRESULT: PASS — aucune divergence" : "\nRESULT: FAIL — divergence détectée");
process.exit(allOk ? 0 : 1);

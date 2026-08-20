// Vérifie le RITUEL d'annonces (déclaration pli 1 → exposition pli 2, non déclarée = perdue)
// et la BELOTE/REBELOTE manuelle (oubli = perdu), au niveau du BeloteDriver (API réelle).
// Usage : node web/verify-ritual.mjs
import { BeloteDriver } from "./driver.mjs";

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name); } };

// Joue UNE donne complète via l'API du driver. L'humain joue la 1re carte légale.
// Hooks : declareAnnonce (clique « Annoncer » au pli 1), declareBelote (clique Belote/Rebelote).
// Retourne { firstDeal, sawExpose, exposeCards, canAnnonceSeen }.
function playOneDeal(seed, { declareAnnonce = false, declareBelote = false } = {}) {
  const d = new BeloteDriver({ seed, target: 100000 }); // cible haute : on ne joue qu'1 donne
  let sawExpose = false, exposeCards = null, canAnnonceSeen = false, guard = 0;
  const startDeals = d.dealsPlayed;
  while (d.dealsPlayed === startDeals && d.phase !== "game_over" && guard++ < 2000) {
    const v = d.view();
    if (v.phase === "bid_await") {
      const hint = v.bidHint;
      if (hint && hint.action === "take") d.humanBid("take", hint.suit); else d.humanBid("pass");
    } else if (v.phase === "await_human") {
      if (v.trickIndex === 0 && v.canAnnonce) { canAnnonceSeen = true; if (declareAnnonce) d.humanAnnonce(); }
      const card = (v.hand || []).find((c) => c.legal);
      if (!card) break;
      d.playHuman(card.id);
      // belote : si l'humain vient de jouer R/D d'atout, déclarer dans la fenêtre
      if (declareBelote) {
        const vv = d.view();
        if (vv.canBelote) d.humanBelote("belote");
        else if (vv.canRebelote) d.humanBelote("rebelote");
      }
    } else if (v.phase === "annonce_expose") {
      sawExpose = true; exposeCards = v.annonceExpose;
      d.continue();
    } else {
      d.continue(); // bid_step / trick_done / deal_done
    }
  }
  const firstDeal = d.deals[0] || null;
  return { firstDeal, sawExpose, exposeCards, canAnnonceSeen, holder: d._beloteHolder };
}

// ---- 1) Rituel annonces : déclaration change le marquage ; exposition montre des cartes ----
console.log("=== Rituel annonces (déclaration manuelle, exposition pli 2) ===");
let annSeed = -1;
for (let s = 1; s <= 400 && annSeed < 0; s++) {
  const withDecl = playOneDeal(s, { declareAnnonce: true });
  if (!withDecl.canAnnonceSeen) continue;                 // l'humain avait une annonce à déclarer
  const noDecl = playOneDeal(s, { declareAnnonce: false });
  const bDecl = withDecl.firstDeal ? withDecl.firstDeal.annonceBonus : [0, 0];
  const bNo = noDecl.firstDeal ? noDecl.firstDeal.annonceBonus : [0, 0];
  if (bDecl[0] > bNo[0]) { // l'annonce de l'humain (équipe 0) ne compte QUE si déclarée
    annSeed = s;
    check(`seed ${s} : bonus équipe A déclaré (${bDecl[0]}) > non déclaré (${bNo[0]}) — annonce non déclarée = perdue`, true);
    check(`seed ${s} : exposition pli 2 montre les cartes de la meilleure annonce`,
      withDecl.sawExpose && withDecl.exposeCards && Array.isArray(withDecl.exposeCards.best.cards) && withDecl.exposeCards.best.cards.length >= 3);
  }
}
check("un seed où l'humain a une annonce décisive a été trouvé (recherche 1..400)", annSeed > 0);

// ---- 2) Belote-rebelote manuelle : oubli = perdu ----
console.log("=== Belote-rebelote manuelle (oubli = perdu) ===");
let belSeed = -1;
for (let s = 1; s <= 600 && belSeed < 0; s++) {
  const probe = playOneDeal(s, { declareBelote: false });
  if (probe.holder !== 0) continue; // l'humain (siège 0) détient R+D d'atout
  belSeed = s;
  const forgotten = probe;                                  // n'a pas cliqué
  const declared = playOneDeal(s, { declareBelote: true }); // a cliqué Belote puis Rebelote
  const belForgotten = forgotten.firstDeal ? forgotten.firstDeal.score.belote[0] : -1;
  const belDeclared = declared.firstDeal ? declared.firstDeal.score.belote[0] : -1;
  check(`seed ${s} : belote OUBLIÉE → +0 (score.belote[0] = ${belForgotten})`, belForgotten === 0);
  check(`seed ${s} : belote DÉCLARÉE → +20 (score.belote[0] = ${belDeclared})`, belDeclared === 20);
}
check("un seed où l'humain détient la belote a été trouvé (recherche 1..600)", belSeed > 0);

console.log(`\n${fail === 0 ? "RESULT: PASS" : "RESULT: FAIL"} — ${pass} ok, ${fail} ko`);
process.exit(fail === 0 ? 0 : 1);

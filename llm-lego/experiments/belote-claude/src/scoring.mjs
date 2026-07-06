// Belote — décompte d'une donne : points cartes + dix de der + belote + contrat + capot.
import { cardPoints } from "./cards.mjs";
import { teamOf } from "./rules.mjs";

export const CAPOT_POINTS = 250; // décision D6 : capot = 250 pts (barème documenté)
export const CONTRACT_MIN = 82; // décision D3 : le preneur chute sous 82

/**
 * Décompte d'une donne terminée.
 * @param tricks  [{winner, cards:[...]}, ...] (8 plis dans l'ordre)
 * @param atout   couleur d'atout
 * @param taker   joueur preneur (0..3)
 * @param beloteTeamIdx  équipe détentrice R+D d'atout, ou -1
 * @returns décompte détaillé + scores finaux par équipe [team0, team1]
 */
export function scoreDeal(tricks, atout, taker, beloteTeamIdx) {
  const takerTeam = teamOf(taker);
  const defTeam = 1 - takerTeam;

  // Points cartes par équipe + dix de der au vainqueur du dernier pli.
  const cardPts = [0, 0];
  const tricksWon = [0, 0];
  for (const t of tricks) {
    const team = teamOf(t.winner);
    tricksWon[team] += 1;
    for (const c of t.cards) cardPts[team] += cardPoints(c, atout);
  }
  const lastTeam = teamOf(tricks[tricks.length - 1].winner);
  const base = cardPts.slice();
  base[lastTeam] += 10; // dix de der (base sur 162)

  const belote = [0, 0];
  if (beloteTeamIdx !== -1) belote[beloteTeamIdx] = 20; // D4 : toujours au détenteur

  const capotTeam = tricksWon[0] === 8 ? 0 : tricksWon[1] === 8 ? 1 : -1;
  const scores = [0, 0];
  let dedans = false;

  if (capotTeam !== -1) {
    // Capot : l'équipe qui rafle tout marque CAPOT_POINTS ; l'autre 0 (+ sa belote).
    scores[capotTeam] = CAPOT_POINTS + belote[capotTeam];
    scores[1 - capotTeam] = belote[1 - capotTeam];
    dedans = capotTeam === defTeam; // le preneur capoté est dedans
  } else if (base[takerTeam] >= CONTRACT_MIN) {
    // Contrat réussi : chaque équipe garde ses points + sa belote.
    scores[takerTeam] = base[takerTeam] + belote[takerTeam];
    scores[defTeam] = base[defTeam] + belote[defTeam];
  } else {
    // Preneur DEDANS : la défense encaisse tout (162) ; belote reste au détenteur.
    dedans = true;
    scores[defTeam] = 162 + belote[defTeam];
    scores[takerTeam] = belote[takerTeam];
  }

  return {
    taker, takerTeam, defTeam,
    cardPoints: cardPts, base, belote, tricksWon,
    capot: capotTeam !== -1, capotTeam, dedans,
    success: !dedans && capotTeam !== defTeam,
    scores, // [team0, team1]
  };
}

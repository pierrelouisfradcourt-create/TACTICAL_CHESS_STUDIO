// objective.mjs — couche ÉNONCÉS : fonction PURE état -> texte d'objectif.
//
// Aucun DOM, aucun état propre, aucune mutation de l'état reçu. Ne dépend que
// des grandeurs structurelles (economy.mjs) — jamais de l'engine : l'énoncé se
// lit sur un état, il n'a pas besoin de savoir qui l'a produit. C'est aussi ce
// qui rend le test possible SANS navigateur (blueprint : trois états forgés).
//
// Interdit par le blueprint : engine -> objective. L'engine ne fabrique donc
// AUCUNE chaîne d'interface ; l'énoncé vit ici, et ici seulement.

import { TERMINAL_THRESHOLD } from './economy.mjs';

/**
 * Énoncé d'objectif courant, dérivé du SEUL état reçu.
 *
 * Quatre énoncés deux à deux distincts :
 *  - terminal            : orienter vers l'ascension (R9/R10) ;
 *  - 0 émetteur          : amasser jusqu'au seuil terminal, qu'il NOMME (R1) ;
 *  - 1 émetteur          : acquérir le second émetteur (R7a) — ne nomme pas le seuil ;
 *  - production active   : atteindre le seuil terminal, qu'il RE-NOMME (R7b).
 *
 * @param {{terminal: boolean, emitterCount: number}} state — lu, jamais muté.
 * @returns {string} énoncé non vide.
 */
export function currentObjective(state) {
  if (state.terminal) {
    return "Franchir l'autel d'ascension pour préserver un glow permanent.";
  }
  if (state.emitterCount === 0) {
    return `Attiser le foyer pour amasser ${TERMINAL_THRESHOLD} lumiere et provoquer l'Embrasement.`;
  }
  if (state.emitterCount === 1) {
    return 'Acheter un second émetteur pour densifier la production passive.';
  }
  return `Atteindre ${TERMINAL_THRESHOLD} lumiere pour déclencher l'Embrasement.`;
}

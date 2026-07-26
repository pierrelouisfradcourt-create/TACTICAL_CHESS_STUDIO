// PONG — systeme `input`.
// Lignes de wiremap couvertes : core.input, core.error_handling.
// Regles PURES : traduit une entree brute en action de jeu, et absorbe tout ce
// qui n'est pas une action valide SANS jamais invalider l'etat de partie.

/** Actions reconnues — vocabulaire ferme. Toute autre valeur est ignoree. */
export const ACTION = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  NONE: 'none',
});

const VALID = new Set(Object.values(ACTION));

/**
 * core.input + core.error_handling — normalise une entree brute.
 *
 * Le pire cas immediat n'est pas une entree exotique : c'est `undefined`
 * (aucune touche pressee) et les deux directions simultanees. Les deux sont
 * traitees ici, pas plus loin.
 *
 * @param {unknown} raw entree brute, de n'importe quelle forme
 * @returns {string} une valeur de ACTION, toujours
 */
export function normalizeAction(raw) {
  if (typeof raw === 'string' && VALID.has(raw)) return raw;

  // Deux touches a la fois : elles s'annulent, plutot que la derniere gagne.
  if (Array.isArray(raw)) {
    const up = raw.includes(ACTION.UP);
    const down = raw.includes(ACTION.DOWN);
    if (up && down) return ACTION.NONE;
    if (up) return ACTION.UP;
    if (down) return ACTION.DOWN;
  }

  // null, undefined, nombre, objet, chaine inconnue, NaN...
  return ACTION.NONE;
}

/**
 * Normalise le couple d'entrees des deux joueurs.
 * @param {unknown} raw
 * @returns {[string, string]}
 */
export function normalizeInputs(raw) {
  if (!Array.isArray(raw)) return [ACTION.NONE, ACTION.NONE];
  return [normalizeAction(raw[0]), normalizeAction(raw[1])];
}

/**
 * Converti une action en deplacement signe.
 * @param {string} action
 * @returns {number} -1 (haut), +1 (bas) ou 0
 */
export function actionToDelta(action) {
  if (action === ACTION.UP) return -1;
  if (action === ACTION.DOWN) return 1;
  return 0;
}

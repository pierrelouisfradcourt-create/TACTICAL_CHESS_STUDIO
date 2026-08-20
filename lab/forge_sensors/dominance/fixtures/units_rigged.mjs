// fixtures/units_rigged.mjs — TÉMOIN NÉGATIF (P1.1, sonde #1).
//
// Copie de games/auto_battler/content/units.v0.mjs avec UNE SEULE unité (unit_1, Piquier)
// dont hp et attack sont multipliés x10. Ceci ne modifie AUCUN fichier du jeu réel (lecture
// seule stricte de games/**) — c'est une fixture locale au capteur, jamais importée ailleurs.
//
// Doit faire ROUGIR le capteur (flag dominance_agreed sur unit_1) — sinon le capteur n'est pas
// livrable (voir docs/audit/FORGE_V2_ANNEXE_SANTE_LUDIQUE.md §5).

import { KEYWORDS } from '../../../../games/auto_battler/combat/keywords.mjs';
import { UNITS as REAL_UNITS } from '../../../../games/auto_battler/content/units.v0.mjs';

const RIGGED_UNIT_ID = 'unit_1';
const MULTIPLIER = 10;

export const UNITS = REAL_UNITS.map(u => {
  if (u.id !== RIGGED_UNIT_ID) return u;
  return { ...u, hp: u.hp * MULTIPLIER, attack: u.attack * MULTIPLIER };
});

export const RIGGED_UNIT_ID_EXPORT = RIGGED_UNIT_ID;
export const RIGGED_MULTIPLIER = MULTIPLIER;
export { KEYWORDS };

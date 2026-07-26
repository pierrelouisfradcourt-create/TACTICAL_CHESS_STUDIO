// compose.mjs — logique de l'écran COMPOSITION (pure, testable). Choisir jusqu'à
// KENNEL_SLOTS bêtes déployables dans le roster.
import { KENNEL_SLOTS, deployable } from "./meta.mjs";

// Instances du roster réellement déployables (cicatrices sous la limite).
export function composableRoster(save) {
  return save.roster.filter(deployable);
}

// Ajoute/retire un uid du choix ; refuse d'aller au-delà du plafond de déploiement.
export function toggleChoix(choix, uid, kennelSlots = KENNEL_SLOTS) {
  if (choix.includes(uid)) {
    return choix.filter((u) => u !== uid);
  }
  if (choix.length >= kennelSlots) {
    return choix; // plafond atteint : inchangé
  }
  return choix.concat([uid]);
}

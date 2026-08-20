// meta.mjs — couche MÉTA PURE (roster persistant, XP/paliers, capture payoff,
// composition/déploiement). Aucun DOM, aucun localStorage, aucune règle de combat.
// SOURCE UNIQUE des espèces = bestiaire.mjs (D2 : pas de table dupliquée). Réutilise
// generateBattle (terrain + ennemis) et remplace la meute joueur par les instances.
import { SPECIES, base as speciesBase } from "./bestiaire.mjs";
import { generateBattle, DEPLOY_SLOTS } from "./level.mjs";

export const KENNEL_SLOTS = DEPLOY_SLOTS.length; // plafond de déploiement (= slots dispo)
export const XP_PER_PALIER = 100; // paliers LINÉAIRES
export const PALIER_BONUS = { hp: 4, atk: 1 }; // bonus stat-only par palier (PAS de class-change)
export const SCAR_DEPLOY_LIMIT = 3; // à partir de cette limite de cicatrices, bête indéployable

export function listSpecies() {
  return SPECIES;
}

// Instance durable d'une bête dans le roster (uid stable, distinct de l'id de bataille).
export function makeInstance(speciesId, uid) {
  speciesBase(speciesId); // valide l'espèce (throw si inconnue)
  return { uid, species: speciesId, niveau: 1, xp: 0, cicatrices: 0, palier: 0 };
}

export function xpToPalier(xp) {
  return Math.floor(xp / XP_PER_PALIER);
}

// Stats de base + bonus de palier (stat-only : hp et atk uniquement).
export function paliersStats(b, palier) {
  return {
    type: b.type,
    hp: b.hp + palier * PALIER_BONUS.hp,
    atk: b.atk + palier * PALIER_BONUS.atk,
    speed: b.speed,
    move: b.move,
    range: b.range,
  };
}

export function effectiveStats(instance) {
  const b = speciesBase(instance.species);
  const s = paliersStats(b, instance.palier);
  return { type: s.type, hp: s.hp, maxHp: s.hp, atk: s.atk, speed: s.speed, move: s.move, range: s.range };
}

// IMMUTABLE : retourne une NOUVELLE instance, l'originale n'est jamais mutée.
export function gainXp(instance, amount) {
  const xp = instance.xp + amount;
  return { ...instance, xp, palier: xpToPalier(xp) };
}

export function deployable(instance) {
  return instance.cicatrices < SCAR_DEPLOY_LIMIT;
}

// Payoff de capture : à la VICTOIRE, les bêtes capturées rejoignent la réserve (pas le
// roster tout de suite — anti-snowball, cf. completeRegion). À la DÉFAITE, les captures
// du run sont PERDUES (pari sur la victoire).
export function harvest(view, save) {
  if (!(view.over && view.won)) {
    return save;
  }
  const reserve = save.reserve.slice();
  let nextUid = save.nextUid;
  for (const b of view.beasts) {
    if (b.captured === true) {
      reserve.push(makeInstance(b.speciesId, nextUid));
      nextUid += 1;
    }
  }
  return { ...save, reserve, nextUid };
}

// Fin de région : verse la réserve dans le roster (les captures deviennent
// composables), vide la réserve, incrémente le compteur de régions.
export function completeRegion(save) {
  return {
    ...save,
    roster: save.roster.concat(save.reserve),
    reserve: [],
    regionsDone: save.regionsDone + 1,
  };
}

// Construit le setup d'une bataille à partir d'une meute COMPOSÉE (uids choisis).
// PURE. Réutilise generateBattle pour terrain + ennemis (dont le coin capturable) et
// remplace le côté joueur par les instances placées sur DEPLOY_SLOTS avec effectiveStats.
export function buildDeploySetup(roster, choix, seed, opts = {}) {
  const battleNumber = opts.battleNumber === undefined ? 1 : opts.battleNumber;
  if (choix.length > KENNEL_SLOTS) {
    throw new Error("trop de bêtes déployées (max " + KENNEL_SLOTS + ")");
  }
  const byUid = new Map();
  for (const inst of roster) {
    byUid.set(inst.uid, inst);
  }
  const chosen = [];
  for (const uid of choix) {
    const inst = byUid.get(uid);
    if (!inst) {
      throw new Error("uid absent du roster: " + uid);
    }
    if (!deployable(inst)) {
      throw new Error("bête indéployable (cicatrices): " + uid);
    }
    chosen.push(inst);
  }

  const generated = generateBattle(battleNumber, seed);
  const enemies = generated.beasts.filter((b) => b.side === "enemy");
  const players = chosen.map((inst, i) => {
    const s = effectiveStats(inst);
    const slot = DEPLOY_SLOTS[i];
    return {
      id: i + 1,
      side: "player",
      x: slot.x,
      y: slot.y,
      speciesId: inst.species,
      type: s.type,
      hp: s.hp,
      maxHp: s.maxHp,
      atk: s.atk,
      speed: s.speed,
      move: s.move,
      range: s.range,
      active: true,
      scarred: false,
      captured: false,
    };
  });

  return {
    width: generated.width,
    height: generated.height,
    terrain: generated.terrain,
    beasts: players.concat(enemies),
    captureThreshold: generated.captureThreshold,
  };
}

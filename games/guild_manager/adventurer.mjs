// guild_manager — RÈGLES AVENTURIER : création, multiclasse (un niveau par
// classe, à la D&D), statistiques, expérience, ouverture de classes avancées,
// équipement. Fonctions pures sur des objets JSON.
import { CLASSES, CONSTANTS, CRAFTS, CRAFT_MAX, CRAFT_THRESHOLDS, FIRST_NAMES, ITEM_TEMPLATES, RACES, SKILLS, SURNAMES, TIER_NAMES, TITLES, TRAITS } from './data.mjs';
import { nextInt, pick } from './rng.mjs';

export const STAT_KEYS = ['hp', 'atk', 'mag', 'def', 'spd'];
export const SLOTS = ['weapon', 'armor', 'accessory'];
export const BASE_CLASSES = Object.keys(CLASSES).filter((k) => CLASSES[k].tier === 1);

export function xpToNext(level) {
  return CONSTANTS.XP_PER_LEVEL * level;
}

const TRAIT_KEYS = Object.keys(TRAITS);

// Tire `count` traits distincts (aucun si count = 0).
export function rollTraits(state, count) {
  const traits = [];
  const pool = [...TRAIT_KEYS];
  for (let i = 0; i < count && pool.length; i++) traits.push(pool.splice(nextInt(state, 0, pool.length - 1), 1)[0]);
  return traits;
}

export const RACE_KEYS = Object.keys(RACES);
export const CRAFT_KEYS = Object.keys(CRAFTS);

// opts : { traits: nombre de traits, race, craft } — tout est tiré au sort si absent.
export function createAdventurer(state, classKey, level = 1, opts = {}) {
  if (!CLASSES[classKey]) throw new Error(`classe inconnue: ${classKey}`);
  const settings = typeof opts === 'number' ? { traits: opts } : opts;
  const race = settings.race || pick(state, RACE_KEYS);
  if (!RACES[race]) throw new Error(`race inconnue: ${race}`);
  const craft = settings.craft || pick(state, CRAFT_KEYS);
  if (!CRAFTS[craft]) throw new Error(`métier inconnu: ${craft}`);
  return {
    id: state.nextId++,
    name: `${pick(state, FIRST_NAMES)} ${pick(state, SURNAMES)}`,
    race,
    craft,
    craftXp: 0,
    traits: rollTraits(state, settings.traits ?? 1),
    // Faits d'armes : nourrissent les titres et la fiche de personnage.
    lore: { joinedDay: state.day, missions: 0, defeats: 0, kills: 0, bossKills: 0, dealt: 0, healed: 0, revivals: 0 },
    classKey,                              // classe ACTIVE (rôle, arme, capacité, xp)
    classLevels: { [classKey]: level },    // niveau par classe déjà pratiquée
    xp: 0,                                 // xp vers le prochain niveau de la classe active
    unlocked: [],                          // classes avancées/légendaires ouvertes (payées)
    statBonus: 0,                          // parchemins de maîtrise (+1 à toutes les stats chacun)
    loadout: null,                         // compétences choisies (null = sélection automatique)
    potion: null,                          // potion emportée en mission (clé POTIONS)
    equipment: { weapon: null, armor: null, accessory: null },
    status: 'available',                   // available | mission | injured
    injuredDays: 0,
    missionId: null,
  };
}

// Effets de la race : mêmes champs que les traits, pour être combinés.
export function raceEffects(adv) {
  const race = RACES[adv.race] || RACES.humain;
  return {
    mods: race.mods || {},
    combat: race.combat || {},
    xp: race.xp || 1,
    skillSlot: race.skillSlot || 0,
  };
}

// Agrégat des effets de traits : multiplicateurs de stats et drapeaux.
export function traitEffects(adv) {
  const eff = { mods: {}, crit: 0, bossDmg: 0, heal: 0, secondWind: false, stunProof: false, xp: 1, wage: 1, recovery: 0, loyal: false,
                poisonProof: false, hit: 0, dodge: 0, bloodlust: 0, mpDiscount: 0 };
  const race = raceEffects(adv);
  for (const [stat, mult] of Object.entries(race.mods)) eff.mods[stat] = (eff.mods[stat] || 1) * mult;
  for (const [flag, value] of Object.entries(race.combat)) {
    if (typeof value === 'boolean') eff[flag] = eff[flag] || value; else eff[flag] += value;
  }
  eff.xp *= race.xp;
  for (const key of adv.traits || []) {
    const t = TRAITS[key];
    if (!t) continue;
    for (const [stat, mult] of Object.entries(t.mods || {})) eff.mods[stat] = (eff.mods[stat] || 1) * mult;
    for (const [flag, value] of Object.entries(t.combat || {})) {
      if (typeof value === 'boolean') eff[flag] = eff[flag] || value; else eff[flag] += value;
    }
    if (t.xp) eff.xp *= t.xp;
    if (t.wage) eff.wage *= t.wage;
    if (t.recovery) eff.recovery += t.recovery;
    if (t.loyal) eff.loyal = true;
  }
  return eff;
}

// Titre porté : le premier de TITLES dont la condition est remplie.
export function titleOf(adv) {
  const lore = adv.lore;
  if (!lore) return null;
  const found = TITLES.find((t) => t.test(lore));
  return found ? found.name : null;
}

export function displayName(adv) {
  const title = titleOf(adv);
  return title ? `${adv.name} ${title}` : adv.name;
}

export function classLevel(adv, key = adv.classKey) {
  return adv.classLevels[key] || 0;
}

// Niveau total = somme des niveaux de classe (sert aux salaires et à l'affichage).
export function totalLevel(adv) {
  return Object.values(adv.classLevels).reduce((s, l) => s + l, 0);
}

export function isMastered(adv, key) {
  return classLevel(adv, key) >= CONSTANTS.MASTERY_LEVEL;
}

export function masteredClasses(adv) {
  return Object.keys(adv.classLevels).filter((k) => isMastered(adv, k));
}

// Statistiques : base de la classe active + croissance de chaque classe
// pratiquée (les classes SECONDAIRES ne rendent que `SECONDARY_GROWTH` de leur
// croissance : se disperser coûte) + bonus de maîtrise + parchemins +
// équipement (majoré si l'objet a l'affinité du rôle porté) + race et traits.
// Un objet forgé pour un rôle rend davantage à qui tient ce rôle.
export function itemAffinityBonus(adv, item) {
  return item && item.affinity && item.affinity === CLASSES[adv.classKey].role ? CONSTANTS.AFFINITY_BONUS : 0;
}

export function computeStats(adv) {
  const active = CLASSES[adv.classKey];
  const mastered = masteredClasses(adv).length;
  const eff = traitEffects(adv);
  const stats = {};
  for (const k of STAT_KEYS) {
    let v = active.base[k];
    for (const [key, lvl] of Object.entries(adv.classLevels)) {
      const cls = CLASSES[key];
      v += key === adv.classKey
        ? cls.growth[k] * (lvl - 1)
        : cls.growth[k] * lvl * CONSTANTS.SECONDARY_GROWTH;
    }
    v += CONSTANTS.MASTERY_BONUS[k] * mastered;
    v += adv.statBonus || 0;
    for (const slot of SLOTS) {
      const item = adv.equipment[slot];
      if (item && item.stats[k]) v += item.stats[k] * (1 + (itemAffinityBonus(adv, item)));
    }
    if (eff.mods[k]) v *= eff.mods[k];
    stats[k] = Math.max(0, Math.floor(v));
  }
  return stats;
}

// Puissance scalaire indicative (affichage, tri du bot).
export function computePower(adv) {
  const s = computeStats(adv);
  return Math.round(s.hp * 0.4 + Math.max(s.atk, s.mag) * 3 + s.def * 2 + s.spd * 1.5);
}

export function roleOf(adv) {
  return CLASSES[adv.classKey].role;
}

// Ajoute de l'xp à la classe active ; monte de niveau autant que nécessaire.
// Malus de dispersion : au-delà de deux classes pratiquées, l'apprentissage
// ralentit. Se spécialiser reste payant même quand tout est accessible.
export function focusMultiplier(adv) {
  const practiced = Object.keys(adv.classLevels).length;
  const malus = CONSTANTS.DISPERSION_PER_CLASS * Math.max(0, practiced - 2);
  return Math.max(CONSTANTS.DISPERSION_FLOOR, 1 - malus);
}

export function grantXp(adv, amount) {
  if (amount < 0) throw new Error('xp négative');
  adv.xp += Math.round(amount * traitEffects(adv).xp * focusMultiplier(adv));
  let gained = 0;
  while (classLevel(adv) < CONSTANTS.MAX_CLASS_LEVEL && adv.xp >= xpToNext(classLevel(adv))) {
    adv.xp -= xpToNext(classLevel(adv));
    adv.classLevels[adv.classKey] = classLevel(adv) + 1;
    gained += 1;
  }
  if (classLevel(adv) >= CONSTANTS.MAX_CLASS_LEVEL) adv.xp = 0;
  return gained;
}

// ------------------------------------------------------------ compétences
// Nombre de compétences portables en combat (l'Humain en porte une de plus).
export function skillCapacity(adv) {
  return CONSTANTS.MAX_LEARNED_SKILLS + raceEffects(adv).skillSlot;
}

// TOUTES les compétences accessibles : la liste complète de la classe active
// et la liste complète de chaque classe maîtrisée — pas seulement la première.
export function availableSkills(adv) {
  const out = [];
  const seen = new Set();
  const add = (key, origin) => {
    if (seen.has(key) || !SKILLS[key]) return;
    seen.add(key);
    out.push({ key, origin, fromActive: origin === adv.classKey });
  };
  for (const key of CLASSES[adv.classKey].skills) add(key, adv.classKey);
  for (const cls of masteredClasses(adv)) {
    if (cls === adv.classKey) continue;
    for (const key of CLASSES[cls].skills) add(key, cls);
  }
  return out;
}

// Sélection automatique : la classe active d'abord, puis les héritages.
function defaultLoadout(adv) {
  const avail = availableSkills(adv);
  return [...avail.filter((x) => x.fromActive), ...avail.filter((x) => !x.fromActive)]
    .map((x) => x.key)
    .slice(0, skillCapacity(adv));
}

// Compétences réellement portées. `adv.loadout` null = automatique ; un tableau
// (même vide) = choix explicite du joueur, dans SON ordre de priorité.
export function learnedSkills(adv) {
  const avail = availableSkills(adv);
  const originOf = new Map(avail.map((x) => [x.key, x.origin]));
  const explicit = Array.isArray(adv.loadout);
  const chosen = (explicit ? adv.loadout.filter((k) => originOf.has(k)) : defaultLoadout(adv)).slice(0, skillCapacity(adv));
  return {
    all: chosen,
    available: avail,
    capacity: skillCapacity(adv),
    explicit,
    active: chosen.filter((k) => originOf.get(k) === adv.classKey),
    inherited: chosen.filter((k) => originOf.get(k) !== adv.classKey).map((k) => ({ key: originOf.get(k), skill: k })),
  };
}

// Ajoute ou retire une compétence du choix du joueur. L'ordre d'ajout est
// l'ordre de priorité en combat (la première utilisable est jouée).
export function toggleSkill(adv, key) {
  const learned = learnedSkills(adv);
  if (!learned.available.some((x) => x.key === key)) return { ok: false, reason: 'compétence non accessible' };
  const current = [...learned.all];
  const at = current.indexOf(key);
  if (at >= 0) current.splice(at, 1);
  else if (current.length >= learned.capacity) return { ok: false, reason: `${learned.capacity} compétences au maximum` };
  else current.push(key);
  adv.loadout = current;
  return { ok: true, loadout: current, added: at < 0 };
}

// Revient à la sélection automatique.
export function resetLoadout(adv) {
  adv.loadout = null;
  return { ok: true };
}

// Archétypes couverts par les compétences portées (+ le rôle de la classe).
export function skillRoles(adv) {
  const roles = new Set();
  for (const key of learnedSkills(adv).all) roles.add(SKILLS[key].role);
  return roles;
}

// ------------------------------------------------------------------ métier
export function craftLevel(adv) {
  let level = 0;
  CRAFT_THRESHOLDS.forEach((threshold, i) => { if ((adv.craftXp || 0) >= threshold) level = i; });
  return level;
}

export function craftProgress(adv) {
  const level = craftLevel(adv);
  const next = CRAFT_THRESHOLDS[level + 1];
  return { level, max: CRAFT_MAX, xp: adv.craftXp || 0, next: next ?? null };
}

// Prérequis d'une classe : { from, count } → classes maîtrisées parmi `from`.
export function requirementStatus(adv, key) {
  const req = CLASSES[key].requires;
  if (!req) return { met: true, have: [], need: 0, from: [] };
  const have = req.from.filter((k) => isMastered(adv, k));
  return { met: have.length >= req.count, have, need: req.count, from: req.from };
}

// Toutes les classes vues par un aventurier, avec leur état d'accès.
export function classOptions(adv) {
  return Object.keys(CLASSES).map((key) => {
    const cls = CLASSES[key];
    const req = requirementStatus(adv, key);
    const unlocked = cls.tier === 1 || adv.unlocked.includes(key);
    return {
      classKey: key,
      name: cls.name,
      tier: cls.tier,
      level: classLevel(adv, key),
      active: key === adv.classKey,
      unlocked,
      requirementsMet: req.met,
      have: req.have,
      need: req.need,
      from: req.from,
      cost: unlocked ? 0 : CONSTANTS.UNLOCK_COST[cls.tier] || 0,
    };
  });
}

// Passe à une classe ; ouvre la classe si nécessaire (le coût est débité par
// la guilde, ici on vérifie seulement les prérequis). Une arme incompatible
// est retirée et renvoyée.
export function applySwitchClass(adv, targetKey) {
  const opt = classOptions(adv).find((o) => o.classKey === targetKey);
  if (!opt) throw new Error(`classe inconnue: ${targetKey}`);
  if (opt.active) throw new Error('déjà la classe active');
  if (!opt.requirementsMet) throw new Error(`prérequis manquants pour ${opt.name}`);
  if (!opt.unlocked) adv.unlocked.push(targetKey);
  adv.classKey = targetKey;
  if (!adv.classLevels[targetKey]) adv.classLevels[targetKey] = 1;
  adv.xp = 0;
  const weapon = adv.equipment.weapon;
  if (weapon && !canEquip(adv, weapon)) { adv.equipment.weapon = null; return weapon; }
  return null;
}

export function canEquip(adv, item) {
  if (item.slot !== 'weapon') return true;
  return CLASSES[adv.classKey].weapons.includes(item.kind);
}

export function equipItem(adv, item) {
  if (!SLOTS.includes(item.slot)) throw new Error(`emplacement inconnu: ${item.slot}`);
  if (!canEquip(adv, item)) throw new Error(`${item.name} incompatible avec ${CLASSES[adv.classKey].name}`);
  const prev = adv.equipment[item.slot];
  adv.equipment[item.slot] = item;
  return prev;
}

export function powerGainIfEquipped(adv, item) {
  if (!canEquip(adv, item)) return 0;
  const before = computePower(adv);
  const prev = adv.equipment[item.slot];
  adv.equipment[item.slot] = item;
  const after = computePower(adv);
  adv.equipment[item.slot] = prev;
  return after - before;
}

export function unequipSlot(adv, slot) {
  const prev = adv.equipment[slot] || null;
  adv.equipment[slot] = null;
  return prev;
}

export const AFFINITY_NAMES = Object.freeze({ tank: 'du Gardien', dps: 'du Traqueur', healer: 'du Sanctuaire' });

export function makeItem(state, templateKey, tier, affinity = null) {
  const tpl = ITEM_TEMPLATES.find((t) => t.key === templateKey);
  if (!tpl) throw new Error(`objet inconnu: ${templateKey}`);
  if (affinity && !AFFINITY_NAMES[affinity]) throw new Error(`affinité inconnue: ${affinity}`);
  const stats = {};
  for (const [k, v] of Object.entries(tpl.stats)) stats[k] = v * tier;
  const name = `${tpl.name} ${TIER_NAMES[tier]}${affinity ? ` ${AFFINITY_NAMES[affinity]}` : ''}`;
  return {
    id: state.nextId++, key: tpl.key, slot: tpl.slot, kind: tpl.kind, tier, affinity,
    name, stats, price: Math.round(tpl.price * tier * tier * (affinity ? 1.3 : 1)),
  };
}

// Un objet sur deux sort de la forge avec une affinité de rôle.
export function randomItem(state, maxTier) {
  const tpl = pick(state, ITEM_TEMPLATES);
  const tier = nextInt(state, 1, Math.max(1, Math.min(3, maxTier)));
  const affinity = nextInt(state, 0, 1) ? pick(state, Object.keys(AFFINITY_NAMES)) : null;
  return makeItem(state, tpl.key, tier, affinity);
}

export function wageOf(adv) {
  const base = CONSTANTS.WAGE_BASE + Math.floor(totalLevel(adv) / 2);
  return Math.max(1, Math.round(base * traitEffects(adv).wage));
}

// Le prénom seul, pour les phrases où le nom complet alourdit.
export function firstName(adv) {
  return adv.name.split(' ')[0];
}

export function recruitCost(candidate) {
  return CONSTANTS.RECRUIT_BASE_COST + CONSTANTS.RECRUIT_COST_PER_LEVEL * (totalLevel(candidate) - 1);
}

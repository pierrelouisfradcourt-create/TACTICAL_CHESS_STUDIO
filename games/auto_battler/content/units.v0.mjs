// content/units.v0.mjs - First playable content set.
// v0 PROVISOIRE, propriété Balance Bible — matière première à juger en jouant, pas un design
// à faire valider. Fantasy médiéval, direction "table de guerre".
//
// Architecture (P11, content-agnostic engine): this module is read by the SHOP DRAW
// (shop/shop.mjs, rank -> odds lookup), by the INTERFACE (renderer/render_dom.mjs,
// input/gestures.mjs — name + stat sheet), by PREPARATION (Buy/Sell prices, derived from rank)
// and by COMBAT ARMY BUILDING (combat/army.mjs, combat/ghost.mjs — the combat stats below).
// It is NEVER imported by transition/decision logic — the engine only ever sees the opaque
// unit_def_id string. rank === Buy cost (preparation.mjs derives it, single source of truth).
//
// D1 (i2.5 s9-build, commande D): the set went from 5 units (ONE per rank) to 15 (THREE per
// rank). With SHOP_ODDS_TABLE[level 1] = [100,0,0,0,0], a single rank-1 unit made the whole
// shop a repetition of the same card: rerolling was pointless and choosing meant nothing.
// At equal rank the three units are DIFFERENTIATED (a slow tough one, a fast fragile one, a
// ranged one) — that differentiation is what makes a reroll interesting, and it is asserted
// by test, not left to good intentions.
//
// COMBAT STAT UNITS — forms fixed by 04_COMBAT_BIBLE.md (v0), values provisional here:
//   hp             : Health at Star 1 (Unit resource — INV-14, never Life)
//   attack         : Damage amount of ONE Attack (04_COMBAT_BIBLE.md T5/T6)
//   attack_cadence : integer >= 1, in TICKS BETWEEN TWO ATTACKS (Combat Bible, Concepts —
//                    "un entier attack_cadence en Ticks"). NOT attacks per second: the combat
//                    runs in Ticks, and the previous "1/s" stat sheet was incoherent with the
//                    bible. A cadence of 1 = attacks every Tick, 3 = every third Tick.
//   range          : integer >= 1, in CELLS, MANHATTAN metric (ratified QB-1/QB-2). 1 = contact.
//   move_speed     : integer >= 0, in CELLS PER TICK (Combat Bible, Concepts). 0 = never moves.
//   delivery       : closed enum {melee | projectile} — PURELY DECORATIVE (COMBAT_EVENT_FIELDS.md
//                    §4): it changes NO simulation fact, it is the only way a BLIND renderer can
//                    choose between a swing and an arrow without re-encoding the Range rule.
//
// TODO [FOG] — NOT declared here, because no source gives them:
//   * mana_initial / mana_threshold / mana gains, and Abilities (Trigger + Effects + the
//     MaxTriggerPerTick each Effect must declare, QB-16). No DSL content exists, so no unit
//     casts. Owner: Content Bible + DSL Bible. (G1 does NOT change this: the keywords below are
//     the Battlegrounds model — triggered on events, no mana, no spell — precisely because it
//     needs no DSL data.)
//
// =============================================================================================
// G1/G2 (i2.5 s9-build, commande G) — TRIBU ET MOTS-CLÉS
//
// Avant cette passe un combat était une soustraction de points de vie en ligne droite : deux
// unités de même rang ne différaient que par quatre nombres, et RIEN ne récompensait une
// composition cohérente. Le modèle retenu est celui de Hearthstone Battlegrounds (dispatch,
// sourcé) : aucune compétence active, aucun mana, deux statistiques — et toute la profondeur
// dans des MOTS-CLÉS déclenchés par des événements, plus des TRIBUS dont la synergie passe par
// des unités « meneuses » qui renforcent explicitement les autres membres de leur tribu (jamais
// par des paliers de comptage à la TFT : Battlegrounds n'en a pas).
//
// CE QUI EST DONNÉE ET CE QUI EST RÈGLE :
//   * la LISTE des mots-clés existants et leur sémantique = règle -> combat/keywords.mjs ;
//   * QUI porte quel mot-clé, avec quels montants, et dans quelle tribu = donnée -> ce fichier.
// Le moteur ne connaît aucun nom d'unité et aucune tribu : il compare deux chaînes (P11).
//
// ÉQUILIBRAGE : les montants ci-dessous sont des valeurs de travail v0 — **propriété Balance
// Bible**. Aucun équilibre n'est prétendu ni démontré ; ils existent pour être jugés en jouant.
// =============================================================================================

import { KEYWORDS } from '../combat/keywords.mjs';

// Re-exported ON PURPOSE: `renderer/` is forbidden from importing `combat/` (static audit
// R1/INV-5) but already reads this content module, so this is the seam through which a drawing
// routine can name a keyword by its canonical id instead of hard-coding a magic string.
export { KEYWORDS };

/**
 * Les quatre tribus de ce set. Choix de contenu, cohérent avec la direction « table de guerre »
 * médiéval-fantasy déjà en place (les noms des 15 unités n'ont PAS été changés pour l'occasion).
 * Aucun palier de comptage : une tribu ne « s'active » pas, elle se renforce par ses meneuses.
 */
export const TRIBES = Object.freeze({
  CHEVALERIE: 'Chevalerie',   // l'ordre en armure : la ligne qui tient
  SYLVE: 'Sylve',             // ce qui vient des bois : coureurs, rôdeurs, bêtes
  COMPAGNIE: 'Compagnie',     // la compagnie franche : mercenaires payés au trait
  ARCANE: 'Arcane'            // l'arcane : mages et constructions animées
});

export const TRIBE_NAMES = Object.freeze(Object.values(TRIBES));

/**
 * Le nom FRANÇAIS de chaque mot-clé et sa règle, en clair — ce que l'écran affiche.
 * Volontairement ICI et non dans combat/keywords.mjs : `renderer/` a INTERDICTION d'importer
 * `combat/` (audit statique R1/INV-5, properties.combat.test.mjs), mais lit déjà ce module de
 * contenu. La cohérence des deux listes n'est donc pas garantie par un import mais par un TEST
 * (properties.i25g.test.mjs : tout id de combat/keywords.mjs a un libellé, et réciproquement).
 * `text` reçoit le mot-clé AVEC ses paramètres : les montants affichés sont les montants
 * appliqués, il n'y a pas de seconde copie des nombres.
 */
export const KEYWORD_LABELS = Object.freeze({
  [KEYWORDS.TAUNT]: {
    name: 'Provocation',
    text: () => 'Les attaques ennemies doivent la cibler en priorité tant qu\'elle vit.'
  },
  [KEYWORDS.DIVINE_SHIELD]: {
    name: 'Bouclier divin',
    text: () => 'Le premier coup qu\'elle subirait ne lui retire rien et brise le bouclier.'
  },
  [KEYWORDS.POISON]: {
    name: 'Venimeux',
    text: () => 'Toute unité qu\'elle blesse meurt, quels que soient ses points de vie restants.'
  },
  [KEYWORDS.WINDFURY]: {
    name: 'Furie des vents',
    text: () => 'Elle attaque deux fois par cycle d\'attaque au lieu d\'une.'
  },
  [KEYWORDS.REBORN]: {
    name: 'Renaissance',
    text: () => 'À sa mort, elle revient une seule fois avec 1 point de vie.'
  },
  [KEYWORDS.DEATHRATTLE_BUFF]: {
    name: 'Râle d\'agonie',
    text: (kw) => `À sa mort, un allié gagne +${kw.attack}/+${kw.health}.`
  },
  [KEYWORDS.TRIBE_BOOST]: {
    name: 'Meneur',
    text: (kw) => `Au début du combat, vos autres ${kw.tribe} gagnent +${kw.attack}/+${kw.health}.`
  }
});

/**
 * Nom court affichable d'un mot-clé porté par une unité.
 * @param {{id: string}} keyword
 * @returns {string} le nom français, ou l'id brut si le libellé manque (jamais une invention)
 */
export function keywordName(keyword) {
  const entry = keyword && KEYWORD_LABELS[keyword.id];
  return entry ? entry.name : String(keyword && keyword.id ? keyword.id : '');
}

/**
 * Phrase complète d'un mot-clé, montants compris.
 * @param {{id: string}} keyword
 * @returns {string} '' si le mot-clé n'a pas de libellé (signalé par un test, pas comblé ici)
 */
export function keywordText(keyword) {
  const entry = keyword && KEYWORD_LABELS[keyword.id];
  return entry ? entry.text(keyword) : '';
}

export const UNITS = [
  // ---------------------------------------------------------------- rang 1 (coût 1)
  {
    id: 'unit_1',
    name: 'Piquier',
    rank: 1,
    tribe: TRIBES.CHEVALERIE,
    keywords: [{ id: KEYWORDS.TAUNT }],
    hp: 420,
    attack: 40,
    attack_cadence: 2,
    range: 1,
    move_speed: 1,
    delivery: 'melee',
    description: "Ligne de fantassins résistante, frappe lentement au contact."
  },
  {
    id: 'unit_6',
    name: 'Éclaireur',
    rank: 1,
    tribe: TRIBES.SYLVE,
    keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.SYLVE, attack: 5, health: 20 }],
    hp: 260,
    attack: 30,
    attack_cadence: 1,
    range: 1,
    move_speed: 2,
    delivery: 'melee',
    description: "Court vite, frappe souvent, tombe aussi vite."
  },
  {
    id: 'unit_7',
    name: 'Frondeur',
    rank: 1,
    tribe: TRIBES.SYLVE,
    keywords: [{ id: KEYWORDS.DEATHRATTLE_BUFF, attack: 5, health: 20 }],
    hp: 300,
    attack: 35,
    attack_cadence: 2,
    range: 3,
    move_speed: 1,
    delivery: 'projectile',
    description: "Lance ses pierres de loin ; inutile une fois au contact."
  },

  // ---------------------------------------------------------------- rang 2 (coût 2)
  {
    id: 'unit_2',
    name: 'Arbalétrier',
    rank: 2,
    tribe: TRIBES.COMPAGNIE,
    keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.COMPAGNIE, attack: 8, health: 40 }],
    hp: 340,
    attack: 55,
    attack_cadence: 2,
    range: 4,
    move_speed: 1,
    delivery: 'projectile',
    description: "Trait perçant à longue portée, recharge posément."
  },
  {
    id: 'unit_8',
    name: 'Hallebardier',
    rank: 2,
    tribe: TRIBES.CHEVALERIE,
    keywords: [{ id: KEYWORDS.TAUNT }, { id: KEYWORDS.DIVINE_SHIELD }],
    hp: 560,
    attack: 45,
    attack_cadence: 3,
    range: 2,
    move_speed: 1,
    delivery: 'melee',
    description: "Mur d'acier lent, tient la ligne et frappe à deux pas."
  },
  {
    id: 'unit_9',
    name: 'Homme d\'Armes',
    rank: 2,
    tribe: TRIBES.COMPAGNIE,
    keywords: [{ id: KEYWORDS.POISON }],
    hp: 380,
    attack: 50,
    attack_cadence: 1,
    range: 1,
    move_speed: 2,
    delivery: 'melee',
    description: "Charge au contact et enchaîne les coups sans répit."
  },

  // ---------------------------------------------------------------- rang 3 (coût 3)
  {
    id: 'unit_3',
    name: 'Chevalier',
    rank: 3,
    tribe: TRIBES.CHEVALERIE,
    keywords: [{ id: KEYWORDS.DIVINE_SHIELD }, { id: KEYWORDS.WINDFURY }],
    hp: 620,
    attack: 70,
    attack_cadence: 2,
    range: 1,
    move_speed: 2,
    delivery: 'melee',
    description: "Cavalerie lourde : atteint sa cible vite et frappe fort."
  },
  {
    id: 'unit_10',
    name: 'Archer d\'Élite',
    rank: 3,
    tribe: TRIBES.COMPAGNIE,
    keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.COMPAGNIE, attack: 12, health: 60 }],
    hp: 400,
    attack: 65,
    attack_cadence: 2,
    range: 5,
    move_speed: 1,
    delivery: 'projectile',
    description: "Tire au-delà de la mêlée, à découvert il ne tient pas."
  },
  {
    id: 'unit_11',
    name: 'Templier',
    rank: 3,
    tribe: TRIBES.CHEVALERIE,
    keywords: [
      { id: KEYWORDS.TAUNT },
      { id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.CHEVALERIE, attack: 8, health: 90 }
    ],
    hp: 780,
    attack: 55,
    attack_cadence: 3,
    range: 1,
    move_speed: 1,
    delivery: 'melee',
    description: "Encaisse plus qu'il ne rend ; on le contourne, on ne le perce pas."
  },

  // ---------------------------------------------------------------- rang 4 (coût 4)
  {
    id: 'unit_4',
    name: 'Mage de Guerre',
    rank: 4,
    tribe: TRIBES.ARCANE,
    keywords: [{ id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.ARCANE, attack: 20, health: 80 }],
    hp: 440,
    attack: 110,
    attack_cadence: 3,
    range: 5,
    move_speed: 1,
    delivery: 'projectile',
    description: "Frappe rare et dévastatrice à longue portée ; fragile de près."
  },
  {
    id: 'unit_12',
    name: 'Chef de Guerre',
    rank: 4,
    tribe: TRIBES.CHEVALERIE,
    keywords: [
      { id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.CHEVALERIE, attack: 18, health: 70 },
      { id: KEYWORDS.REBORN }
    ],
    hp: 700,
    attack: 85,
    attack_cadence: 2,
    range: 1,
    move_speed: 2,
    delivery: 'melee',
    description: "Va chercher la ligne adverse et l'ouvre en deux."
  },
  {
    id: 'unit_13',
    name: 'Rôdeur Sylvain',
    rank: 4,
    tribe: TRIBES.SYLVE,
    keywords: [
      { id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.SYLVE, attack: 15, health: 90 },
      { id: KEYWORDS.POISON }
    ],
    hp: 480,
    attack: 70,
    attack_cadence: 1,
    range: 3,
    move_speed: 2,
    delivery: 'projectile',
    description: "Décoche à chaque instant, se replace sans cesse."
  },

  // ---------------------------------------------------------------- rang 5 (coût 5)
  {
    id: 'unit_5',
    name: 'Dragon Ancien',
    rank: 5,
    tribe: TRIBES.SYLVE,
    keywords: [
      { id: KEYWORDS.WINDFURY },
      { id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.SYLVE, attack: 30, health: 140 }
    ],
    hp: 1100,
    attack: 150,
    attack_cadence: 2,
    range: 3,
    move_speed: 2,
    delivery: 'projectile',
    description: "Titan ailé : souffle à distance, se déplace comme personne."
  },
  {
    id: 'unit_14',
    name: 'Golem de Siège',
    rank: 5,
    tribe: TRIBES.ARCANE,
    keywords: [{ id: KEYWORDS.TAUNT }, { id: KEYWORDS.REBORN }],
    hp: 1600,
    attack: 130,
    attack_cadence: 3,
    range: 1,
    move_speed: 1,
    delivery: 'melee',
    description: "Avance sans se presser et ne s'arrête devant rien."
  },
  {
    id: 'unit_15',
    name: 'Archimage',
    rank: 5,
    tribe: TRIBES.ARCANE,
    keywords: [
      { id: KEYWORDS.TRIBE_BOOST, tribe: TRIBES.ARCANE, attack: 35, health: 150 },
      { id: KEYWORDS.DEATHRATTLE_BUFF, attack: 40, health: 160 }
    ],
    hp: 620,
    attack: 175,
    attack_cadence: 3,
    range: 6,
    move_speed: 1,
    delivery: 'projectile',
    description: "Porte le trait le plus long du champ ; ne survit pas au contact."
  }
];

const BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));

/**
 * @param {string} unitDefId
 * @returns {number} rank (1..5), or 0 if unitDefId is unknown (never throws — callers treat
 *   0 as "excluded from every odds bucket").
 */
export function getUnitRank(unitDefId) {
  const u = BY_ID[unitDefId];
  return u ? u.rank : 0;
}

/**
 * @param {string} unitDefId
 * @returns {Object|null} the full unit definition, or null if unknown.
 */
export function getUnitDef(unitDefId) {
  return BY_ID[unitDefId] || null;
}

/**
 * Every unit definition id, in declaration order. Single source of truth for the Pool
 * (preparation.mjs::initPrepState) — adding a unit above must never require editing a
 * second list somewhere else.
 * @returns {string[]}
 */
export function getAllUnitDefIds() {
  return UNITS.map(u => u.id);
}

/**
 * All unit definitions of a given rank, in declaration order.
 * Used by combat/ghost.mjs to build an opponent of COMPARABLE power (same ranks) without
 * inventing any power budget.
 * @param {number} rank
 * @returns {Object[]}
 */
export function getUnitDefsOfRank(rank) {
  return UNITS.filter(u => u.rank === rank);
}

/**
 * G2 — the tribe of a unit definition.
 * @param {string} unitDefId
 * @returns {string|null} null when the definition is unknown (never a default tribe: a unit with
 *   an invented tribe would silently join a synergy nobody declared).
 */
export function getUnitTribe(unitDefId) {
  const u = BY_ID[unitDefId];
  return u && typeof u.tribe === 'string' ? u.tribe : null;
}

/**
 * G1 — the keywords of a unit definition, with their parameters.
 * @param {string} unitDefId
 * @returns {Array<{id: string}>} empty for an unknown definition
 */
export function getUnitKeywords(unitDefId) {
  const u = BY_ID[unitDefId];
  return u && Array.isArray(u.keywords) ? u.keywords : [];
}

/**
 * All unit definitions of a given tribe, in declaration order.
 * @param {string} tribe
 * @returns {Object[]}
 */
export function getUnitDefsOfTribe(tribe) {
  return UNITS.filter(u => u.tribe === tribe);
}

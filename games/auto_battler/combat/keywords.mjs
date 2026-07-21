// combat/keywords.mjs - THE CLOSED KEYWORD VOCABULARY (G1, i2.5 s9-build commande G).
//
// ============================== WHY KEYWORDS AND NOT ABILITIES ================================
// Ratified in the dispatch, sourced: Hearthstone Battlegrounds has NO active ability and NO mana
// — two stats only, and all of its depth comes from KEYWORDS TRIGGERED BY EVENTS. That is the
// model this game copies (not the TFT mana/spell model), for one structural reason: it needs no
// DSL content, and no DSL content exists here (07_DSL_BIBLE.md is written, nothing implements it).
// The mana / Cast / Ability slots of the TickPipeline therefore stay EMPTY exactly as they were
// (combat/combat.mjs header, "EMPTY PHASE SLOTS") — this pass does not fake them.
//
// ============================== THE ENGINE STAYS CONTENT-AGNOSTIC (P11) =======================
// This module declares WHAT A KEYWORD IS, never WHICH UNIT HAS IT. The TickPipeline reads a
// unit's `keywords` list — data carried by the UnitDefinition (content/units.v0.mjs) and handed
// over in the CombatUnitSnapshot by combat/army.mjs. There is not one unit id in combat/, and a
// test asserts it.
//
// Tribes are NOT declared here on purpose: a tribe is a pure content label. The engine only ever
// compares two strings for equality (`tribe_boost.tribe === target.tribe`) — it does not know
// that 'Chevalerie' exists, and adding a tribe requires no engine change.
//
// ============================== NO 23rd EVENT NAME WAS CREATED ================================
// Every keyword below reports itself through an EXISTING Event of the closed 22-name registry
// (engine/registry.mjs). Before this pass six names were never emitted anywhere; four of them are
// now emitted by these keywords:
//   Shield  <- divine_shield, at its grant (C2)
//   Buff    <- tribe_boost (C2) and deathrattle_buff (T7)
//   Debuff  <- poison, when it marks a wounded target (T6)
//   Heal    <- reborn, when the unit comes back (T7)
// `Cast` and `PairingResolved` are STILL never emitted (no DSL, no pairing) — said out loud
// rather than faked.
//
// ============================== NO RANDOMNESS (CBT-9) =========================================
// `deathrattle_buff` says "a random ally" in every game of this genre. Here "random" is resolved
// by the TieBreakChain (combat/tiebreak.mjs, QD-1) — never by a draw. The combat stays replayable
// bit for bit, which a test asserts on the journal.

/** The closed vocabulary. A keyword id outside this list is DROPPED (never guessed at). */
export const KEYWORDS = Object.freeze({
  /** Provocation — while a unit with it lives in a camp, enemy attacks must target it first. */
  TAUNT: 'taunt',
  /** Bouclier divin — the first blow it would take deals nothing and consumes the shield. */
  DIVINE_SHIELD: 'divine_shield',
  /** Venimeux — any unit this one WOUNDS dies, whatever Health it had left. */
  POISON: 'poison',
  /** Furie des vents — attacks twice per attack cycle instead of once. */
  WINDFURY: 'windfury',
  /** Renaissance — on death, comes back ONCE with REBORN_HEALTH Health. */
  REBORN: 'reborn',
  /** Râle d'agonie — on death, gives +attack/+health to one ally (chosen by the TieBreakChain).
   *  Params: {attack: number >= 0, health: number >= 0}. */
  DEATHRATTLE_BUFF: 'deathrattle_buff',
  /** Meneur de tribu — at the start of combat, the OTHER allies of `tribe` get +attack/+health.
   *  Params: {tribe: string, attack: number >= 0, health: number >= 0}. */
  TRIBE_BOOST: 'tribe_boost'
});

/** Every keyword id, in declaration order. Single source of truth for the vocabulary. */
export const KEYWORD_IDS = Object.freeze(Object.values(KEYWORDS));

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isKnownKeyword(id) {
  return typeof id === 'string' && KEYWORD_IDS.includes(id);
}

/**
 * Normalise the `keywords` field of a snapshot into a frozen, deduplicated list.
 *
 * Unknown ids are DROPPED rather than defaulted, for the same reason combat/army.mjs drops an
 * unknown UnitDefinition: inventing a behaviour for a keyword nobody declared would put a rule
 * on the battlefield that no bible owns. A duplicate id keeps its FIRST occurrence — never the
 * sum of the two, which would silently double a buff.
 *
 * @param {Array} list - raw `keywords` from a CombatUnitSnapshot (may be undefined)
 * @returns {ReadonlyArray<{id: string}>}
 */
export function normalizeKeywords(list) {
  if (!Array.isArray(list)) return Object.freeze([]);
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    if (!isKnownKeyword(raw.id)) continue;
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    out.push(Object.freeze({ ...raw }));
  }
  return Object.freeze(out);
}

/**
 * @param {ReadonlyArray<{id: string}>} keywords
 * @param {string} id
 * @returns {Object|null} the keyword entry WITH its parameters, or null
 */
export function findKeyword(keywords, id) {
  if (!Array.isArray(keywords)) return null;
  return keywords.find(k => k && k.id === id) || null;
}

/**
 * @param {ReadonlyArray<{id: string}>} keywords
 * @param {string} id
 * @returns {boolean}
 */
export function hasKeyword(keywords, id) {
  return findKeyword(keywords, id) !== null;
}

/**
 * A stat delta carried by a keyword, read defensively.
 * A MISSING amount is read as 0 — not as "some default bonus". A keyword that declares no
 * number grants no number; the content is what declares values (R11), never this module.
 * @param {Object|null} keyword
 * @returns {{attack: number, health: number}}
 */
export function statDeltaOf(keyword) {
  const attack = keyword && Number.isFinite(keyword.attack) ? Math.trunc(keyword.attack) : 0;
  const health = keyword && Number.isFinite(keyword.health) ? Math.trunc(keyword.health) : 0;
  return { attack, health };
}

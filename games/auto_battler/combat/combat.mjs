// combat/combat.mjs - THE TickPipeline. The one and only resolution path of a Combat (CBT-3).
//
// Contract: 04_COMBAT_BIBLE.md (v0 OPPOSABLE) + COMBAT_EVENT_FIELDS.md (payload companion).
//
// CBT-1  pure function: (CombatSetup) -> {result, events}. Same input, same output, bit for bit.
// CBT-6  ÉTANCHÉITÉ: this module imports NOTHING from bench/gold/pool/shop/board/preparation/
//        round/economy/merge/engine — it never sees Gold, Bench, Pool, Life or Level. It takes
//        two already-materialised snapshots and returns a CombatResult; only the Round
//        Resolution applies consequences (QC-1). Enforced by a static audit in the oracle.
// CBT-7  zero Input consumed.
// CBT-9  zero randomness: no rng import, no rng_state parameter. Every ex aequo goes through
//        the TieBreakChain (combat/tiebreak.mjs), never through a draw.
// CBT-3  the phase order below exists in ONE place: the `for` loop of resolveCombat.
//
// ---------------------------------------------------------------------------------------------
// PHASES (ratified gate #3 — QB-3 Movement -> Targeting -> Attack, QB-5 Damage -> Death ->
// Cleanup -> Casts des survivants, QB-13 Auras en tête de Tick, QB-4 hybrid Tick):
//
//   C1 Spawns · C2 Buffs initiaux · C3 Mana initial          (CombatSetup, tick 0)
//   T1 Début · T2 Auras · T3 Movement · T4 Targeting · T5 Attack · T6 Damage ·
//   T7 Death · T8 Cleanup · T9 Casts des survivants · T10 Fin de Tick
//
// QB-4 hybrid semantics, as implemented: each phase collects INTENTS against the state left by
// the previous Commit, VALIDATES them together (conflicts decided by the TieBreakChain, never by
// acting order), RESOLVES, then COMMITS the whole batch. No unit ever reads a fresher state than
// another one inside the same phase. `seq` materialises the total order in the log (DP-1(b)).
//
// ---------------------------------------------------------------------------------------------
// G1 (i2.5 s9-build commande G) — KEYWORDS. The pipeline below now reads a per-unit list of
// KEYWORDS (combat/keywords.mjs, closed vocabulary) carried as DATA by the snapshot. There is not
// one unit id in this file, and no branch is written per unit: a keyword is looked up by id, its
// amounts come from the data. The Battlegrounds model was chosen precisely because it needs no
// DSL (dispatch, sourced) — so the mana / Cast slots below stay EMPTY, they are not faked.
//   taunt            -> T4 Targeting: while an enemy taunt lives, it is the only legal target
//   divine_shield    -> T6 Damage: the first blow is fully absorbed, the shield is consumed
//   poison           -> T6/T7: a WOUNDED target dies at T7 whatever its Health
//   windfury         -> T5 Attack: WINDFURY_ATTACKS_PER_CYCLE Attacks per ready cadence
//   reborn           -> T7 Death: comes back ONCE at REBORN_HEALTH, and stays on the Board
//   deathrattle_buff -> T7 Death: +attack/+health to one ally, chosen by the TieBreakChain
//   tribe_boost      -> C2 Buffs initiaux: the OTHER allies of a tribe get +attack/+health
// NO 23rd Event name was created (INV-12): they report through Shield / Buff / Debuff / Heal,
// four of the six registry names that had never been emitted by anything.
//
// ---------------------------------------------------------------------------------------------
// EMPTY PHASE SLOTS — kept in the pipeline, executing nothing, and said out loud rather than
// invented (dispatch: "le pipeline garde le SLOT d'ordonnancement, il n'exécute rien"):
//   C3 Mana initial / T9 Casts — no UnitDefinition declares mana_initial, mana_threshold or an
//      Ability, so no unit can ever reach a threshold. Mana is tracked at 0 and no Cast is
//      emitted. TODO [FOG], owner: Content Bible + DSL Bible.
//   T2 Auras (QB-13) — no Aura exists in content. A `tribe_boost` is NOT an Aura: it is applied
//      once at C2 and never recomputed, so killing the leader does not take the bonus back (v0,
//      the Battlegrounds behaviour). TODO [FOG] for real Auras.
//   T6 Mana credit (attack / damage received, QB-11) — the SOURCES are ratified but the AMOUNTS
//      belong to Content/DSL and do not exist. Crediting "some" mana would be inventing a
//      number. TODO [FOG].
//   `Cast` and `PairingResolved` Events — still emitted NOWHERE (no DSL, no pairing, DP-3).
//
// C2 Buffs initiaux is NO LONGER an empty slot: it applies the `tribe_boost` keywords (Origin
// slot of the QB-12 order) then grants the divine shields. Class / Items / Temporary stay empty.

import { manhattan, cellsWithin, isValidCell } from './cell.mjs';
import { pickWinner, sortByChain } from './tiebreak.mjs';
import { KEYWORDS, normalizeKeywords, findKeyword, hasKeyword, statDeltaOf } from './keywords.mjs';
import { TICK_LIMIT, WINDFURY_ATTACKS_PER_CYCLE, REBORN_HEALTH } from '../params.v0.mjs';

export const RESOLUTION_ELIMINATION = 'elimination';
export const RESOLUTION_TICK_LIMIT = 'tick_limit';
export const RESOLUTION_DRAW = 'draw';

/**
 * @typedef {Object} CombatUnitSnapshot
 * @property {string} unit_instance_id
 * @property {string} unit_definition_ref
 * @property {number} star
 * @property {number} cell             linear board index (see combat/cell.mjs header)
 * @property {number} health           Health at spawn (Unit resource; a Unit never has Life — INV-14)
 * @property {number} attack           Damage of ONE Attack
 * @property {number} attack_cadence   Ticks between two Attacks (>= 1)
 * @property {number} range            Manhattan Cells
 * @property {number} move_speed       Cells per Tick (>= 0)
 * @property {string} delivery         'melee' | 'projectile' — decorative (COMBAT_EVENT_FIELDS §4)
 *
 * @typedef {Object} CombatSide
 * @property {string} side_ref         seat reference or GhostBoard reference — CBT-8: the
 *                                     pipeline cannot tell the two apart
 * @property {CombatUnitSnapshot[]} units
 *
 * @typedef {Object} CombatSetup
 * @property {string} combat_ref
 * @property {[CombatSide, CombatSide]} sides
 */

function assertSetup(setup) {
  if (!setup || typeof setup !== 'object') throw new Error('CombatSetup must be an object');
  if (typeof setup.combat_ref !== 'string' || setup.combat_ref.length === 0) {
    throw new Error('CombatSetup.combat_ref must be a non-empty string');
  }
  if (!Array.isArray(setup.sides) || setup.sides.length !== 2) {
    throw new Error('CombatSetup.sides must hold exactly two sides');
  }
  const seen = new Set();
  setup.sides.forEach((side, i) => {
    if (!side || typeof side.side_ref !== 'string' || side.side_ref.length === 0) {
      throw new Error(`CombatSetup.sides[${i}].side_ref must be a non-empty string`);
    }
    if (!Array.isArray(side.units)) {
      throw new Error(`CombatSetup.sides[${i}].units must be an array`);
    }
    for (const u of side.units) {
      if (!u || typeof u.unit_instance_id !== 'string') {
        throw new Error(`CombatSetup.sides[${i}]: every unit needs a unit_instance_id`);
      }
      if (seen.has(u.unit_instance_id)) {
        throw new Error(`Duplicate unit_instance_id in CombatSetup: ${u.unit_instance_id}`);
      }
      seen.add(u.unit_instance_id);
      if (!isValidCell(u.cell)) {
        throw new Error(`Unit ${u.unit_instance_id} has an off-board cell: ${u.cell}`);
      }
      if (!Number.isInteger(u.attack_cadence) || u.attack_cadence < 1) {
        // Combat Bible, Concepts: "attack_cadence >= 1 — T5 est UNE phase par Tick".
        throw new Error(`Unit ${u.unit_instance_id} has an invalid attack_cadence: ${u.attack_cadence}`);
      }
      if (!Number.isInteger(u.move_speed) || u.move_speed < 0) {
        throw new Error(`Unit ${u.unit_instance_id} has an invalid move_speed: ${u.move_speed}`);
      }
      if (!Number.isInteger(u.range) || u.range < 1) {
        throw new Error(`Unit ${u.unit_instance_id} has an invalid range: ${u.range}`);
      }
    }
  });
  // Two units may not share a Cell (QB-1: one Unit per Cell at most).
  const cells = new Set();
  for (const side of setup.sides) {
    for (const u of side.units) {
      if (cells.has(u.cell)) throw new Error(`Two units share cell ${u.cell}`);
      cells.add(u.cell);
    }
  }
}

/**
 * Resolve one Combat.
 * @param {CombatSetup} setup
 * @returns {{result: Object, events: Object[]}} `result` is the CombatResult (= the Victory
 *   payload, 04_COMBAT_BIBLE.md); `events` is the whole combat segment of the Event Log, in
 *   order, every entry carrying the envelope {kind, combat_ref, tick, seq}.
 */
export function resolveCombat(setup) {
  assertSetup(setup);

  const combatRef = setup.combat_ref;
  const events = [];
  let tick = 0;
  let seq = 0;

  /** Emit one Event with the mandatory envelope (04_COMBAT_BIBLE.md, Événements). */
  function emit(kind, payload) {
    const ev = { kind, combat_ref: combatRef, tick, seq, ...payload };
    events.push(ev);
    seq += 1;
    return ev;
  }
  /** The identity of an Event — what every `source_ref` points at (v0, resolved in the bible). */
  function idOf(ev) {
    return { combat_ref: ev.combat_ref, tick: ev.tick, seq: ev.seq };
  }

  // ------------------------------------------------------------------ C1. Spawns (tick 0)
  /** @type {Object[]} live working copies — the input snapshots are never mutated (INV-17/CBT-8) */
  const units = [];
  setup.sides.forEach((side, sideIndex) => {
    // Deterministic spawn order inside a side: the TieBreakChain's own last-resort key, so that
    // `spawn_order` (key 4, creation initiative) does not depend on array order of the caller.
    const ordered = sortByChain(side.units.map(u => ({
      unitInstanceId: u.unit_instance_id,
      sideIndex,
      snapshot: u
    })));
    for (const entry of ordered) {
      const u = entry.snapshot;
      // G1: the keyword list is NORMALISED at the door — unknown ids are dropped, duplicates
      // keep their first occurrence. After this line the pipeline never sees a raw content list.
      const keywords = normalizeKeywords(u.keywords);
      const unit = {
        id: u.unit_instance_id,
        defRef: u.unit_definition_ref,
        star: u.star,
        sideIndex,
        sideRef: side.side_ref,
        cell: u.cell,
        health: u.health,
        healthInitial: u.health,
        shield: 0,
        attack: u.attack,
        cadence: u.attack_cadence,
        range: u.range,
        moveSpeed: u.move_speed,
        delivery: u.delivery,
        mana: 0,          // C3 — see EMPTY PHASE SLOTS in the header
        manaThreshold: null,
        cadenceCounter: 0,
        targetId: null,
        alive: true,
        spawnOrder: units.length,
        // -------------------------------------------------------------------- G1/G2 keywords
        tribe: typeof u.tribe === 'string' ? u.tribe : null,
        keywords,
        taunt: hasKeyword(keywords, KEYWORDS.TAUNT),
        divineShield: hasKeyword(keywords, KEYWORDS.DIVINE_SHIELD),
        poison: hasKeyword(keywords, KEYWORDS.POISON),
        // Furie des vents: how many Attacks ONE ready cadence produces. A unit without the
        // keyword attacks once — the ordinary case is the same code path, not a special case.
        attacksPerCycle: hasKeyword(keywords, KEYWORDS.WINDFURY) ? WINDFURY_ATTACKS_PER_CYCLE : 1,
        rebornAvailable: hasKeyword(keywords, KEYWORDS.REBORN),
        deathrattle: findKeyword(keywords, KEYWORDS.DEATHRATTLE_BUFF),
        tribeBoost: findKeyword(keywords, KEYWORDS.TRIBE_BOOST),
        poisoned: false,
        spawnEventId: null
      };
      units.push(unit);
      const spawnEv = emit('Spawn', {
        unit_instance_id: unit.id,
        unit_definition_ref: unit.defRef,
        side_ref: unit.sideRef,
        cell: unit.cell,
        star: unit.star,
        health_initial: unit.healthInitial,
        mana_initial: unit.mana,
        // v0 par cohérence, same justification as `attacker_cell` on Attack (COMBAT_EVENT_FIELDS
        // §4): a BLIND renderer must be able to draw a Provocation marker or a tribe crest
        // without resolving `unit_definition_ref` against the content table itself. `keywords`
        // carries IDS ONLY — the AMOUNTS travel in the Buff Events that actually apply them, so
        // there is exactly one place where a number is stated.
        tribe: unit.tribe,
        keywords: keywords.map(k => k.id)
      });
      unit.spawnEventId = idOf(spawnEv);
    }
  });

  // C3. Mana initial — empty slot; every unit spawned with mana 0 above.

  const byId = new Map(units.map(u => [u.id, u]));
  const livingOf = (sideIndex) => units.filter(u => u.alive && u.sideIndex === sideIndex);
  const living = () => units.filter(u => u.alive);
  const occupied = () => new Set(living().map(u => u.cell));

  /** TieBreakChain candidate for a unit; `distance` is key 3 and MUST be measured by the caller. */
  function candidateOf(unit, distance) {
    return {
      // key 1 (strategic) intentionally absent: no DSL declares one — see tiebreak.mjs header.
      distance,
      spawnOrder: unit.spawnOrder,
      unitInstanceId: unit.id,
      sideIndex: unit.sideIndex,
      unit
    };
  }

  /**
   * G1 — apply a stat delta to a living unit and CONSTATE it with a `Buff` Event.
   * The Health delta raises BOTH the current Health and `healthInitial`: `healthInitial` is what
   * the renderer divides by to draw the health bar, so raising only one of the two would show a
   * reinforced unit as damaged. A delta of 0 on one axis is licit and still reported — the Event
   * constates the application of the Effect, not the fact that it was large enough to matter.
   *
   * @param {Object} target
   * @param {{attack: number, health: number}} delta
   * @param {string} effectRef - the keyword id that produced it
   * @param {Object} sourceUnit - the unit whose keyword it is
   * @param {Object} sourceRef - identity {combat_ref, tick, seq} of the CAUSAL Event
   */
  function applyStatBuff(target, delta, effectRef, sourceUnit, sourceRef) {
    target.attack += delta.attack;
    target.health += delta.health;
    target.healthInitial += delta.health;
    emit('Buff', {
      // `source_kind` is the Damage/Heal/Shield enum applied to Buff for uniformity: a keyword is
      // an Effect, not an Ability (nothing is cast — G1 uses no DSL).
      source_kind: 'Effect',
      source_ref: sourceRef,
      source_unit_instance_id: sourceUnit.id,
      target_unit_instance_id: target.id,
      effect_ref: effectRef,
      // v0 par cohérence — the documented payload is {target_unit_instance_id, source_ref,
      // effect_ref} only. Without the amounts, a blind renderer wanting to show "+18/+70" would
      // have to resolve effect_ref against the content table AND find which unit granted it: the
      // exact "GENUINE GAP" shape (COMBAT_EVENT_FIELDS §2) the corpus refuses. The `*_after`
      // fields are the same redundancy `target_health_after` already carries on Damage.
      attack_delta: delta.attack,
      health_delta: delta.health,
      target_attack_after: target.attack,
      target_health_after: target.health,
      target_health_max_after: target.healthInitial
    });
  }

  // ------------------------------------------------------------- C2. Buffs initiaux (tick 0)
  // QB-12 order is Origin -> Class -> Items -> Temporary. Only the ORIGIN slot has content:
  // `tribe_boost` is a unit's declared belonging acting on its own tribe. Class, Items and
  // Temporary stay empty (no such content exists) — the slots are kept, not faked.
  //
  // A tribe_boost is applied ONCE, here, and never recomputed (it is NOT an Aura, T2/QB-13):
  // killing the leader does not take the bonus back. That is the Battlegrounds behaviour and it
  // is what makes a coherent composition worth building rather than worth protecting.
  {
    // Leaders are walked in spawn order (already the TieBreakChain's own key 4), and their
    // targets in chain order, so the journal is reproducible whatever order the caller passed.
    for (const leader of units) {
      if (!leader.tribeBoost) continue;
      const boostTribe = leader.tribeBoost.tribe;
      if (typeof boostTribe !== 'string') continue;   // a boost with no declared tribe boosts nothing
      const delta = statDeltaOf(leader.tribeBoost);
      const targets = units.filter(t =>
        t.sideIndex === leader.sideIndex &&
        t.id !== leader.id &&               // "vos AUTRES <tribu>" — a leader never boosts itself
        t.tribe === boostTribe);
      for (const entry of sortByChain(targets.map(t => candidateOf(t, manhattan(leader.cell, t.cell))))) {
        applyStatBuff(entry.unit, delta, KEYWORDS.TRIBE_BOOST, leader, leader.spawnEventId);
      }
    }
    // Divine shields, granted last (the Temporary slot of QB-12 is the closest match for a
    // protection carried into the fight). The SCALAR shield of T6 is left untouched at 0: a
    // divine shield is not counted in points, it swallows ONE blow of any size — see T6, where
    // the absorption bookkeeping already written is branched, not duplicated.
    for (const u of units) {
      if (!u.divineShield) continue;
      emit('Shield', {
        source_kind: 'Effect',
        source_ref: u.spawnEventId,
        source_unit_instance_id: u.id,
        target_unit_instance_id: u.id,
        effect_ref: KEYWORDS.DIVINE_SHIELD,
        // `amount` is null ON PURPOSE and is not a 0 dressed up as a value: the documented field
        // is a number of absorbable points, and a divine shield has no such number. Reported as
        // an insufficiency in the builder report rather than filled with an invented figure.
        amount: null,
        target_shield_after: u.shield,          // the scalar shield, unchanged (0)
        target_divine_shield_after: true        // v0 par cohérence — the drawable gauge state
      });
    }
  }

  let result = null;

  // ============================== TickPipeline — the ONE ordered loop (CBT-3) ==============
  for (tick = 1; tick <= TICK_LIMIT; tick++) {
    seq = 0;

    // -------- T1. Début de Tick. No Mana credit here: the V1 "with time" credit is SUPPRESSED
    //             (ratified QB-11). The cadence counter advances every Tick and is never reset
    //             by a move (T3) nor by a target change (T4) — Combat Bible, Concepts, rule 2.
    for (const u of living()) u.cadenceCounter += 1;

    // -------- T2. Auras — empty slot (QB-13: recomputed at the head of each Tick).

    // -------- T3. Movement (DP-6.3, guided by DP-6.2) — BEFORE Targeting (QB-3).
    // A unit with no current target does not move this Tick: movement is relative to the
    // CURRENT target (dérivé QB-3). It acquires one in T4 and moves next Tick.
    {
      const blocked = occupied();
      const intents = [];
      for (const u of living()) {
        if (u.moveSpeed === 0) continue;                    // move_speed 0 is licit: never moves
        const target = u.targetId ? byId.get(u.targetId) : null;
        if (!target || !target.alive) continue;
        const currentDistance = manhattan(u.cell, target.cell);
        if (currentDistance <= u.range) continue;           // already in Range: stands still
        // Candidate Cells: free, within Manhattan <= move_speed. "Free" is read on the state of
        // the last Commit (QB-4): a Cell vacated during THIS phase is not claimable this Tick.
        let bestCell = -1;
        let bestDistance = currentDistance;
        for (const c of cellsWithin(u.cell, u.moveSpeed)) {
          if (blocked.has(c)) continue;
          const d = manhattan(c, target.cell);
          // Strictly closer only — a sideways or backwards step is never chosen. Ties between
          // equally-close Cells fall to the ascending index order of cellsWithin(), the
          // deterministic enumeration (TieBreakChain reduced to its uniqueness key: no DSL
          // movement style exists to order them by gameplay — TODO [FOG], owner: DSL Bible).
          if (d < bestDistance) { bestDistance = d; bestCell = c; }
        }
        if (bestCell >= 0) intents.push({ unit: u, to: bestCell, distance: currentDistance });
      }
      // Validation: two units wanting the SAME Cell are decided by the TieBreakChain (DP-1(b));
      // the loser simply does not move this Tick — no second decision on a fresher state.
      const byDestination = new Map();
      for (const it of intents) {
        if (!byDestination.has(it.to)) byDestination.set(it.to, []);
        byDestination.get(it.to).push(it);
      }
      const granted = [];
      for (const [, contenders] of byDestination) {
        if (contenders.length === 1) { granted.push(contenders[0]); continue; }
        const winner = pickWinner(contenders.map(c => candidateOf(c.unit, c.distance)));
        granted.push(contenders.find(c => c.unit.id === winner.unitInstanceId));
      }
      // Commit together; `seq` order = TieBreakChain, so the log is reproducible.
      const orderedMoves = sortByChain(granted.map(g => ({
        ...candidateOf(g.unit, g.distance), to: g.to
      })));
      for (const m of orderedMoves) {
        const from = m.unit.cell;
        m.unit.cell = m.to;
        emit('Move', { unit_instance_id: m.unit.id, from_cell: from, to_cell: m.to });
      }
    }

    // -------- T4. Targeting (DP-6.1) — AFTER movement (QB-3). Acquisition and re-acquisition
    // for any unit without a living, valid target ("Mort -> Nouvelle cible", V1). A living
    // target is KEPT: no opportunistic re-evaluation every Tick.
    // Emits no Event: Targeting has no name in the closed registry, and inventing one is
    // forbidden (INV-12). Consequence for the renderer: a change of target is INVISIBLE in the
    // journal — reported as an insufficiency, not worked around.
    //
    // G1 — PROVOCATION (taunt). While at least one living enemy carries it, the legal candidate
    // set is REDUCED to those units. Two consequences, both deliberate:
    //   * a unit whose current target is living but NOT a taunter re-acquires. The rule says
    //     "les attaques ennemies doivent la cibler en priorité" — an exception for an already
    //     acquired target would make Provocation silently optional, and it is reachable in play
    //     (a Renaissance brings a taunter back after everyone re-targeted elsewhere);
    //   * with no taunter alive the candidate set is the whole enemy camp, so the pre-G1
    //     behaviour is unchanged, including "a living target is KEPT".
    for (const u of living()) {
      const enemies = living().filter(e => e.sideIndex !== u.sideIndex);
      if (enemies.length === 0) { u.targetId = null; continue; }
      const taunters = enemies.filter(e => e.taunt);
      const pool = taunters.length > 0 ? taunters : enemies;
      const current = u.targetId ? byId.get(u.targetId) : null;
      if (current && current.alive && pool.some(e => e.id === current.id)) continue;
      // Key 1 (declared criterion) is empty — no DSL. The chain therefore starts at key 3:
      // the nearest candidate, measured from the deciding unit's Cell to each candidate's Cell
      // (contextual sense fixed by 04_COMBAT_BIBLE.md, Concepts).
      const winner = pickWinner(pool.map(e => candidateOf(e, manhattan(u.cell, e.cell))));
      u.targetId = winner ? winner.unitInstanceId : null;
    }

    // -------- T5. Attack. Constates the act; the points arrive in T6. Nothing can fail in
    // between (CBT-9: no draw, no dodge, no interception).
    const attacksThisTick = [];
    {
      const shooters = [];
      for (const u of living()) {
        const target = u.targetId ? byId.get(u.targetId) : null;
        if (!target || !target.alive) continue;
        const d = manhattan(u.cell, target.cell);
        if (d > u.range) continue;
        if (u.cadenceCounter < u.cadence) continue;
        shooters.push({ ...candidateOf(u, d), target });
      }
      for (const s of sortByChain(shooters)) {
        // G1 — FURIE DES VENTS. One ready cadence produces `attacksPerCycle` Attacks (1 without
        // the keyword, WINDFURY_ATTACKS_PER_CYCLE with it). Both are declared against the state
        // of the last Commit, exactly like two different attackers hitting the same target on
        // the same Tick (QB-4): the second blow lands even if the first was lethal, because
        // Death is a T7 fact and T5 has not resolved anything yet. They stay distinguishable in
        // the journal through the identity (combat_ref, tick, seq) of each Attack.
        for (let k = 0; k < s.unit.attacksPerCycle; k++) {
          const ev = emit('Attack', {
            attacker_unit_instance_id: s.unit.id,
            target_unit_instance_id: s.target.id,
            attacker_cell: s.unit.cell,
            target_cell: s.target.cell,
            delivery: s.unit.delivery
          });
          attacksThisTick.push({ attacker: s.unit, target: s.target, event: ev });
        }
        s.unit.cadenceCounter = 0; // reset at the Commit of the Tick that emitted the Attack
      }
    }

    // -------- T6. Damage. All the Attacks of T5 land, committed together. Shield absorbs
    // BEFORE Health (v0 sourced, 00_VOCABULARY.md). Bookkeeping is walked in `seq` order so
    // that two simultaneous hits on one shielded target cannot both spend the same shield —
    // the RESOLUTION of the batch is ordered, its COMMIT is not staggered.
    const damageByTarget = new Map();
    for (const a of attacksThisTick) {
      const amount = a.attacker.attack;
      // G1 — BOUCLIER DIVIN. Branched INTO the absorption bookkeeping already written, not
      // beside it: there is still exactly ONE line in this file that subtracts from Health. The
      // difference with the scalar shield is the capacity, not the mechanism — a divine shield
      // absorbs the WHOLE blow whatever its size, then is consumed.
      let absorbed;
      if (a.target.divineShield) {
        absorbed = amount;
        a.target.divineShield = false;
      } else {
        absorbed = Math.min(amount, a.target.shield);
        a.target.shield -= absorbed;
      }
      const dealt = amount - absorbed;
      a.target.health -= dealt;
      const ev = emit('Damage', {
        source_kind: 'Attack',
        source_ref: idOf(a.event),              // identity of the CAUSAL Event (v0, bible)
        source_unit_instance_id: a.attacker.id,
        target_unit_instance_id: a.target.id,
        amount,                                  // amount RECEIVED, before absorption
        absorbed_by_shield: absorbed,
        target_shield_after: a.target.shield,
        // v0 par cohérence — exact symmetric of `target_shield_after` for the divine shield.
        // Without it a fully absorbed blow and a 0-damage blow are the same Event to a blind
        // renderer, which is the very case COMBAT_EVENT_FIELDS §3.C says must stay drawable.
        target_divine_shield_after: a.target.divineShield,
        target_health_after: a.target.health
      });
      damageByTarget.set(a.target.id, ev);       // last (highest seq) damage on that target

      // G1 — VENIMEUX. "Toute unité que celle-ci BLESSE meurt" : a blow entirely swallowed by a
      // shield wounds nobody, so it does not poison — the divine shield protects from the venom,
      // which is the Battlegrounds behaviour and follows from the word, not from a special case.
      // The kill itself happens at T7 (below): T6 only marks. The mark is reported with a
      // `Debuff` Event — a registry name that had never been emitted — so that the death of a
      // unit still holding Health is READABLE in the journal instead of looking like a bug.
      if (dealt > 0 && a.attacker.poison && !a.target.poisoned) {
        a.target.poisoned = true;
        emit('Debuff', {
          source_kind: 'Effect',
          source_ref: idOf(ev),                  // the Damage that carried the venom
          source_unit_instance_id: a.attacker.id,
          target_unit_instance_id: a.target.id,
          effect_ref: KEYWORDS.POISON
        });
      }
    }
    // Mana credit (QB-11 sources ratified, amounts absent) — empty slot, see header.

    // -------- T7. Death. A dead unit NEVER casts its spell (QB-5). Death TRIGGERS (G1:
    // `deathrattle_buff`, `reborn`) are resolved HERE, inside the phase, as the bible requires
    // ("Triggers « à la mort » résolus via la ResolutionQueue au sein de la phase").
    //
    // A unit goes down when its Health reached 0 OR when it was poisoned this Tick (G1). The
    // two are one predicate on purpose: there is a single place in this pipeline that decides
    // a unit is down, so `Venimeux` cannot drift from the ordinary death path.
    const goingDown = living().filter(u => u.health <= 0 || u.poisoned);
    // `alive` is only flipped at T8 (that is the bible's split), so a set is what excludes the
    // dying from the ally pools a deathrattle may target. `reborn` removes an id from it again.
    const downIds = new Set(goingDown.map(u => u.id));
    for (const entry of sortByChain(goingDown.map(u => candidateOf(u, undefined)))) {
      const u = entry.unit;
      const causal = damageByTarget.get(u.id);
      const deathEv = emit('Death', {
        unit_instance_id: u.id,
        // source_ref = identity of the Event that brought Health to <= 0 (or that poisoned the
        // unit — the same Damage carries both). With simultaneous effects that is the LAST
        // Damage of the Tick on this unit (highest seq) — v0 par cohérence: some causal Event
        // must be named, and any other choice would be arbitrary.
        source_ref: causal ? idOf(causal) : null
      });

      // G1 — RÂLE D'AGONIE. "un allié aléatoire" in every game of this genre; here the choice
      // goes through the TieBreakChain (QD-1), never through a draw (CBT-9) — key 3 is the
      // distance from the dying unit, so the bonus goes to whoever was fighting beside it.
      // Candidates exclude the units going down this Tick: buffing a corpse is not a choice.
      if (u.deathrattle) {
        const allies = units.filter(a =>
          a.alive && !downIds.has(a.id) && a.sideIndex === u.sideIndex && a.id !== u.id);
        const pick = pickWinner(allies.map(a => candidateOf(a, manhattan(u.cell, a.cell))));
        if (pick) {
          applyStatBuff(pick.unit, statDeltaOf(u.deathrattle), KEYWORDS.DEATHRATTLE_BUFF, u, idOf(deathEv));
        }
        // No ally left: the effect simply does not happen. No fallback onto an enemy, no
        // self-buff on a corpse — an effect with no legal target does nothing.
      }

      // G1 — RENAISSANCE. Comes back ONCE, at REBORN_HEALTH, on its own Cell (it never left it:
      // T8 has not run yet). Reported with `Heal` — a registry name that had never been emitted
      // — because that is what a blind renderer needs to un-kill the token it just saw fall.
      // The venom mark is cleared with the body: the unit that comes back is not the poisoned
      // one. The keyword is consumed, so a second death is final.
      if (u.rebornAvailable) {
        u.rebornAvailable = false;
        u.poisoned = false;
        u.health = REBORN_HEALTH;
        downIds.delete(u.id);
        emit('Heal', {
          source_kind: 'Effect',
          source_ref: idOf(deathEv),
          source_unit_instance_id: u.id,
          target_unit_instance_id: u.id,
          effect_ref: KEYWORDS.REBORN,
          // A Renaissance SETS the Health rather than adding to it (the unit was at or below 0),
          // so `amount` and `target_health_after` are equal here BY CONSTRUCTION — said out loud
          // because on any other Heal they would not be.
          amount: REBORN_HEALTH,
          target_health_after: u.health
        });
      }
    }
    const deadThisTick = goingDown.filter(u => downIds.has(u.id));

    // -------- T8. Cleanup: remove the dead from the Board, invalidate the references aiming
    // at them (QB-5). No Event: Cleanup constates nothing the registry names.
    // A reborn unit is NOT in `deadThisTick`: it never leaves the Board and the units aiming at
    // it keep a valid target — it is alive, and T4 would re-acquire it anyway.
    for (const u of deadThisTick) u.alive = false;
    if (deadThisTick.length > 0) {
      const deadIds = new Set(deadThisTick.map(u => u.id));
      for (const u of units) {
        if (u.targetId && deadIds.has(u.targetId)) u.targetId = null;
      }
    }

    // -------- T9. Casts des survivants (DP-6.4) — empty slot, see header. Nothing to select:
    // no unit has a mana_threshold, so no unit is ever at full Mana.

    // -------- T10. Fin de Tick — the three checks, in the ratified order.
    const aliveA = livingOf(0).length;
    const aliveB = livingOf(1).length;

    if (aliveA === 0 && aliveB === 0) {
      // (2) Mutual annihilation at the same Tick -> MATCH NUL (ratified QB-6, gate 2026-07-19):
      // resolution_kind 'draw', winner_side_ref null, and NO Life lost by either Player. The
      // Combat cannot touch a Life anyway (CBT-6) — the Round Resolution reads this field.
      result = makeResult(null, RESOLUTION_DRAW, tick, []);
      break;
    }
    if (aliveA === 0 || aliveB === 0) {
      // (1) EXACTLY one camp without a living Unit -> elimination. The quantifier matters: it is
      // what makes QB-6 above reachable at all.
      const winnerIndex = aliveA === 0 ? 1 : 0;
      result = makeResult(setup.sides[winnerIndex].side_ref, RESOLUTION_ELIMINATION, tick,
        survivorsOf(winnerIndex));
      break;
    }
    if (tick === TICK_LIMIT) {
      // (3) tick_limit reached with both camps alive -> DP-7.
      const winnerIndex = resolveTickLimit(aliveA, aliveB);
      result = makeResult(setup.sides[winnerIndex].side_ref, RESOLUTION_TICK_LIMIT, tick,
        survivorsOf(winnerIndex));
      break;
    }
  }

  // CBT-2: unreachable by construction — the loop always breaks at or before TICK_LIMIT — but
  // asserted rather than assumed, because "always terminates" is the invariant being claimed.
  if (result === null) {
    throw new Error('CBT-2 violated: combat ended without a Victory Event');
  }

  tick = result.ticks_elapsed;
  emit('Victory', result);

  return { result, events };

  // ------------------------------------------------------------------------------- helpers
  function survivorsOf(sideIndex) {
    return livingOf(sideIndex)
      .sort((a, b) => (a.spawnOrder - b.spawnOrder))
      .map(u => ({ unit_instance_id: u.id, health_remaining: u.health }));
  }

  function makeResult(winnerSideRef, resolutionKind, ticksElapsed, survivors) {
    return {
      winner_side_ref: winnerSideRef,
      resolution_kind: resolutionKind,
      ticks_elapsed: ticksElapsed,
      survivors
    };
  }

  /**
   * DP-7 — equality chain at tick_limit. Ratified order: total_remaining_power, then
   * units_remaining, then deterministic_order.
   *
   * KEY 1 IS NOT APPLIED, and is not replaced by a guess: `total_remaining_power` is a CANONICAL
   * FUNCTION OF THE BALANCE BIBLE (ratified QB-7, P10) and the Balance Bible DOES NOT EXIST
   * (04_COMBAT_BIBLE.md closes on exactly that warning: "un builder qui rencontre l'une de ces
   * délégations ne trouvera pas de destinataire : il remonte en fog HumanGate, il n'invente pas
   * la valeur"). Summing health, or health times attack, would be inventing a balance formula.
   * TODO [FOG] — owner: Balance Bible.
   *
   * So the chain starts at key 2, `units_remaining` (a pure simulation count, owned by this
   * bible), and falls back to key 3, `deterministic_order` = the TieBreakChain, unique (QB-8).
   *
   * Applying the chain BETWEEN TWO CAMPS: key 4 (initiative de création) is deliberately NOT
   * used here. Between two camps, "who entered play first" is an artefact of the C1 emission
   * order — that is, of the SEAT — not of gameplay: keying on it would hand every tie-limit
   * draw to side 0 forever, which is precisely the "stratégie cachée" QD-1 forbids a technical
   * key from creating. The comparison therefore falls to key 5 (lowest surviving
   * unit_instance_id, an identity that travels WITH the army when armies swap seats) and then
   * key 6 (side index), which together are total.
   */
  function resolveTickLimit(aliveA, aliveB) {
    if (aliveA !== aliveB) return aliveA > aliveB ? 0 : 1;
    const sideCandidates = [0, 1].map(sideIndex => {
      const ids = livingOf(sideIndex).map(u => u.id).sort();
      return { unitInstanceId: ids[0], sideIndex };
    });
    return pickWinner(sideCandidates).sideIndex;
  }
}

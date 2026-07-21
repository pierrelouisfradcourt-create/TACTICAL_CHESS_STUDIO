// renderer/combat_view.mjs - Folds the COMBAT segment of the Event Log into an animation frame.
//
// R1 / INV-5 — THE RENDERER IS BLIND. This module's ONLY input is the Event Log. It imports
// nothing from engine/ preparation/ pool/ shop/ bench/ merge/ economy/ board/ round/ COMBAT/
// input/ app/ web. It never asks the engine what a unit's Health is: it replays the Damage
// Events. It never asks whether an attack is an arrow: it reads `Attack.delivery`.
// If an animation cannot be drawn from the journal, the honest answer is to SAY SO (see
// "INSUFFISANCES CONSTATÉES" below) — never to peek at the state.
//
// Time: the wall-clock length of a Tick is a RENDERER choice, ratified verbatim
// (HUMANGATE_2026-07-19_VALUES_V0.md: "le temps réel par Tick est un choix RENDERER (P2), hors
// du moteur"). No Event carries a duration, and none ever should. TICK_DURATION_MS lives in the
// presentation block of params.v0.mjs.
// R2 — determinism: this module reads no clock. `elapsedMs` is INJECTED by app/ (a frame
// counter), so the same log at the same counter always produces the same picture.
//
// ============================ INSUFFISANCES CONSTATÉES (payloads) =============================
// Found while writing this module — reported, not worked around:
//  1. NO Event says WHICH SIDE THE VIEWER OWNS. `Spawn.side_ref` distinguishes the two camps
//     (a seat ref vs a GhostBoard ref) but nothing marks one as "mine". Worked out here by
//     JOURNAL ORDER: the first side_ref seen in the C1 spawns is treated as the local player's.
//     That is a convention about emission order, not a fact in a payload — a second seat, or a
//     spectator view, would break it.
//  2. TARGETING IS INVISIBLE. A unit choosing or re-acquiring a target (T4, DP-6.1) emits no
//     Event — the closed registry has no name for it (INV-12) and QB-9 says "pas davantage".
//     So the screen cannot draw who is aiming at whom before the first blow lands.
//  3. NO ROUND NUMBER. No Event carries `round_index`; the round shown is DERIVED by counting
//     `ShopRolled{cause:'RoundStart'}` in the journal. Reconstitution, not a field.
//  4. MANA IS UNDRAWABLE (known and assumed, QB-9 + Combat Bible Human Notes): no `ManaChanged`
//     Event exists, so no mana gauge can be shown. Moot today (nothing casts), real tomorrow.
//  5. (G1) A BUFF NEVER EXPIRES ON SCREEN, because no removal Event exists in the closed list
//     (04_COMBAT_BIBLE.md, Événements, point 5: "NON DOCUMENTÉ"). Harmless here — no keyword of
//     this pass grants anything temporary — and reported rather than papered over.
// None of these needs a 23rd Event name for the animations that were asked for — the verdict of
// COMBAT_EVENT_FIELDS.md §5 held up in practice, keywords included.
//
// ================================ G1 — WHAT A KEYWORD LOOKS LIKE ==============================
// The renderer is told about keywords by Events ONLY. It does not know what "divine_shield"
// MEANS; it knows that a `Shield` Event turned a gauge on and that a `Damage` Event turned it
// off, which is exactly enough to draw a halo and a burst:
//   Shield  -> `target_divine_shield_after` : the halo goes ON
//   Damage  -> `target_divine_shield_after` : the halo goes OFF, and `absorbed_by_shield` equal
//              to `amount` says the blow was swallowed (that pairing is what makes a fully
//              absorbed hit distinguishable from a 0-damage hit, COMBAT_EVENT_FIELDS §3.C)
//   Debuff  -> effect_ref 'poison' : the venom mark goes ON, and the Death that follows is
//              readable even though the unit still shows Health
//   Buff    -> `attack_delta` / `health_delta` : a floating "+A/+H", and a raised health bar
//   Heal    -> a unit at Health > 0 is ALIVE again (Renaissance), whatever Death said before
// Not one of these branches reads the GameState, and none re-derives a rule.

import { TICK_DURATION_MS, COMBAT_RESULT_HOLD_MS } from '../params.v0.mjs';

// Where inside one Tick each phase is drawn. Pure presentation (P2): these fractions encode no
// simulation fact, they only spread T3 (Movement) and T5/T6 (Attack, Damage) across the Tick so
// that the eye can follow the order the pipeline actually ran in.
const MOVE_END = 0.55;    // a Move plays over the first 55% of its Tick
const STRIKE_START = 0.5; // an Attack starts flying/lunging at 50% and lands at 100%
const IMPACT_AT = 0.86;   // the last stretch of a flight, where the blow visibly connects

function clamp01(x) {
  return x < 0 ? 0 : (x > 1 ? 1 : x);
}

/**
 * Extract the LAST combat segment of a log: every Event carrying the same `combat_ref` as the
 * most recent one. Preparation Events carry no `combat_ref` and are ignored here.
 * @param {Array} eventLog
 * @returns {{combat_ref: string|null, events: Array}}
 */
export function lastCombatSegment(eventLog) {
  const log = Array.isArray(eventLog) ? eventLog : [];
  let ref = null;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i] && typeof log[i].combat_ref === 'string') { ref = log[i].combat_ref; break; }
  }
  if (ref === null) return { combat_ref: null, events: [] };
  return { combat_ref: ref, events: log.filter(e => e.combat_ref === ref) };
}

/**
 * Count the rounds the journal has opened. Insufficiency #3: derived, not carried.
 * @param {Array} eventLog
 * @returns {number} 1-based round number
 */
export function roundNumberFromLog(eventLog) {
  const log = Array.isArray(eventLog) ? eventLog : [];
  return log.filter(e => e.kind === 'ShopRolled' && e.cause === 'RoundStart').length;
}

/**
 * Build the drawable state of the current combat at `elapsedMs` into its playback.
 *
 * @param {Array} eventLog - the WHOLE journal (the only input this module ever gets)
 * @param {number} elapsedMs - injected frame counter, ms since the battle playback started
 * @returns {Object} {
 *   active, combat_ref, tick, last_tick, units[], projectiles[], strikes[], impacts[],
 *   finished, result, damage_taken, damage_dealt, viewer_side_ref
 * }
 */
export function buildCombatFrame(eventLog, elapsedMs) {
  const { combat_ref, events } = lastCombatSegment(eventLog);
  if (combat_ref === null || events.length === 0) {
    return emptyFrame();
  }

  const victory = events.find(e => e.kind === 'Victory') || null;
  const lastTick = victory ? victory.tick : events.reduce((m, e) => Math.max(m, e.tick || 0), 0);

  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const rawTick = Math.floor(t / TICK_DURATION_MS) + 1;
  const currentTick = Math.min(rawTick, lastTick);
  const progress = rawTick > lastTick ? 1 : clamp01((t % TICK_DURATION_MS) / TICK_DURATION_MS);

  // ------------------------------------------------------------------ fold the spawns (C1)
  const units = new Map();
  let viewerSideRef = null;
  for (const ev of events) {
    if (ev.kind !== 'Spawn') continue;
    if (viewerSideRef === null) viewerSideRef = ev.side_ref; // insufficiency #1
    units.set(ev.unit_instance_id, {
      unit_instance_id: ev.unit_instance_id,
      unit_def_id: ev.unit_definition_ref,
      side_ref: ev.side_ref,
      is_viewer: false,           // filled once viewerSideRef is known (below)
      star: ev.star,
      cell: ev.cell,
      from_cell: ev.cell,
      health: ev.health_initial,
      health_initial: ev.health_initial,
      alive: true,
      moving: false,
      hit_flash: 0,               // 0..1, how "just hit" the unit looks this frame
      // G1/G2 — read straight off the Spawn payload, never looked up in the content table.
      tribe: ev.tribe || null,
      keywords: Array.isArray(ev.keywords) ? ev.keywords : [],
      divine_shield: false,       // turned on by the Shield Event of C2, off by the Damage
      poisoned: false,
      buffed: false,              // at least one Buff landed on this unit during the fight
      effect_flash: 0             // 0..1, "something just happened to me that is not a hit"
    });
  }
  for (const u of units.values()) u.is_viewer = (u.side_ref === viewerSideRef);

  let damageTaken = 0;   // Health lost by the viewer's units — read off the Damage Events
  let damageDealt = 0;

  const projectiles = [];
  const strikes = [];
  const impacts = [];
  // G1: floating notices for the keyword Events that land during the CURRENT Tick — a buff, a
  // venom mark, a resurrection. Each carries the cell it happens on, so the canvas draws it
  // without resolving anything.
  const notices = [];

  /** End-of-Tick Events (T6 Debuff, T7 Buff/Heal) show at the moment the blows connect. */
  function landsNow(isCurrent) {
    return isCurrent && progress >= IMPACT_AT;
  }

  // ------------------------------------------------------- replay every Event up to the frame
  // Ticks strictly before the current one are applied WHOLE. The current Tick is applied
  // partially, in pipeline order (T3 Move, then T5 Attack, then T6 Damage / T7 Death at the
  // very end) — which is exactly why the order the bible fixed is visible on screen.
  const attacksThisTick = new Map(); // seq of the Attack -> the attack record (for its Damage)

  for (const ev of events) {
    const evTick = ev.tick || 0;
    if (evTick > currentTick) break;
    const isCurrent = evTick === currentTick && evTick > 0;

    switch (ev.kind) {
      case 'Move': {
        const u = units.get(ev.unit_instance_id);
        if (!u) break;
        if (!isCurrent) { u.cell = ev.to_cell; u.from_cell = ev.to_cell; break; }
        u.from_cell = ev.from_cell;
        u.cell = ev.to_cell;
        u.moving = true;
        u.move_progress = clamp01(progress / MOVE_END);
        break;
      }

      case 'Attack': {
        const attacker = units.get(ev.attacker_unit_instance_id);
        const target = units.get(ev.target_unit_instance_id);
        if (!isCurrent) break; // an attack of a past Tick has already landed; nothing to draw
        const p = clamp01((progress - STRIKE_START) / (1 - STRIKE_START));
        const record = {
          seq: ev.seq,
          attacker_id: ev.attacker_unit_instance_id,
          target_id: ev.target_unit_instance_id,
          from_cell: ev.attacker_cell,
          to_cell: ev.target_cell,
          delivery: ev.delivery,
          progress: p,
          by_viewer: attacker ? attacker.is_viewer : false
        };
        attacksThisTick.set(ev.seq, record);
        // `delivery` is the ONLY thing that decides arrow vs swing. Deriving it from the
        // Manhattan distance between the two cells would be re-encoding the Range rule inside
        // the renderer — which is exactly what COMBAT_EVENT_FIELDS.md §3.A refused.
        if (ev.delivery === 'projectile') {
          projectiles.push(record);
        } else {
          strikes.push(record);
        }
        if (target) target.aimed_at = true;
        break;
      }

      case 'Damage': {
        const target = units.get(ev.target_unit_instance_id);
        if (!target) break;
        const applied = !isCurrent || progress >= 1;
        if (applied) {
          target.health = ev.target_health_after;
          if (typeof ev.target_divine_shield_after === 'boolean') {
            target.divine_shield = ev.target_divine_shield_after;
          }
          if (target.is_viewer) damageTaken += ev.amount; else damageDealt += ev.amount;
        }
        if (isCurrent) {
          // `source_ref` = the identity {combat_ref, tick, seq} of the causal Attack. THIS is
          // what pairs an impact with the arrow that caused it: without it, two archers hitting
          // the same target on the same Tick would be indistinguishable (COMBAT_EVENT_FIELDS §3.A).
          const causal = ev.source_ref ? attacksThisTick.get(ev.source_ref.seq) : null;
          const p = causal ? causal.progress : progress;
          // The blow CONNECTS at the very end of its own flight/lunge — IMPACT_AT is a
          // presentation threshold, not a rule: the simulation applied the whole batch at once.
          if (p >= IMPACT_AT) {
            const absorbed = ev.absorbed_by_shield || 0;
            // G1: a blow that got NOTHING through must not flash the unit red — a hit flash reads
            // as "I am wounded", and a shield that held is the opposite fact. The burst drawn on
            // the cell carries the event instead.
            const gotThrough = absorbed < ev.amount;
            impacts.push({
              target_id: ev.target_unit_instance_id,
              cell: causal ? causal.to_cell : target.cell,
              amount: ev.amount,
              absorbed,
              // G1: the blow was SWALLOWED WHOLE. Read off the payload, not guessed: a hit that
              // takes nothing off the Health because the shield ate all of it, versus a hit that
              // was worth nothing, are two different pictures.
              fully_absorbed: absorbed > 0 && absorbed === ev.amount
            });
            if (gotThrough) target.hit_flash = clamp01((p - IMPACT_AT) / (1 - IMPACT_AT));
          }
        }
        break;
      }

      case 'Death': {
        const u = units.get(ev.unit_instance_id);
        if (!u) break;
        if (!isCurrent || progress >= 1) u.alive = false;
        break;
      }

      // ------------------------------------------------------------------ G1 — the keywords
      case 'Shield': {
        // The grant (C2, Tick 0). `amount` is null for a divine shield — a protection that is
        // not counted in points — so the gauge that is turned on is the boolean one.
        const u = units.get(ev.target_unit_instance_id);
        if (!u) break;
        if (ev.target_divine_shield_after === true) u.divine_shield = true;
        break;
      }

      case 'Debuff': {
        const u = units.get(ev.target_unit_instance_id);
        if (!u) break;
        u.poisoned = true;
        if (landsNow(isCurrent)) {
          notices.push({ target_id: u.unit_instance_id, cell: u.cell, kind: 'poison', text: 'VENIN' });
          u.effect_flash = 1;
        }
        break;
      }

      case 'Buff': {
        const u = units.get(ev.target_unit_instance_id);
        if (!u) break;
        u.buffed = true;
        // The health bar must stay honest: a buff raises the CURRENT Health and the maximum the
        // bar divides by. Both travel in the payload, so nothing is recomputed here.
        if (Number.isFinite(ev.target_health_after)) u.health = ev.target_health_after;
        if (Number.isFinite(ev.target_health_max_after)) u.health_initial = ev.target_health_max_after;
        if (landsNow(isCurrent)) {
          notices.push({
            target_id: u.unit_instance_id,
            cell: u.cell,
            kind: 'buff',
            text: `+${ev.attack_delta || 0}/+${ev.health_delta || 0}`
          });
          u.effect_flash = 1;
        }
        break;
      }

      case 'Heal': {
        const u = units.get(ev.target_unit_instance_id);
        if (!u) break;
        if (!isCurrent || progress >= 1) {
          if (Number.isFinite(ev.target_health_after)) u.health = ev.target_health_after;
          // A Heal that puts a unit back above 0 puts it back ON THE BOARD. Stated as a general
          // rule on Health, NOT as a special case on effect_ref 'reborn': the renderer does not
          // need to know what Renaissance is to draw a unit that is standing again.
          if (u.health > 0) u.alive = true;
        }
        if (landsNow(isCurrent)) {
          notices.push({ target_id: u.unit_instance_id, cell: u.cell, kind: 'reborn', text: 'RENAISSANCE' });
          u.effect_flash = 1;
        }
        break;
      }

      default:
        break; // Spawn already folded; Victory read separately; Cast is never emitted
    }
  }

  const playbackMs = lastTick * TICK_DURATION_MS;
  const finished = t >= playbackMs;

  return {
    active: true,
    combat_ref,
    tick: currentTick,
    last_tick: lastTick,
    progress,
    units: [...units.values()],
    projectiles,
    strikes,
    impacts,
    notices,
    finished,
    result: finished && victory ? {
      winner_side_ref: victory.winner_side_ref,
      resolution_kind: victory.resolution_kind,
      ticks_elapsed: victory.ticks_elapsed,
      survivors: victory.survivors,
      viewer_won: victory.winner_side_ref !== null && victory.winner_side_ref === viewerSideRef
    } : null,
    damage_taken: damageTaken,
    damage_dealt: damageDealt,
    viewer_side_ref: viewerSideRef
  };
}

/**
 * Total playback length of the current combat, result screen included. app/ reads it to know
 * when the next Round may start — the ONE place outside this module that needs the Tick length.
 * @param {Array} eventLog
 * @returns {number} ms, 0 when the journal holds no combat
 */
export function combatPlaybackMs(eventLog) {
  const { combat_ref, events } = lastCombatSegment(eventLog);
  if (combat_ref === null) return 0;
  const victory = events.find(e => e.kind === 'Victory');
  const lastTick = victory ? victory.tick : events.reduce((m, e) => Math.max(m, e.tick || 0), 0);
  return lastTick * TICK_DURATION_MS + COMBAT_RESULT_HOLD_MS;
}

function emptyFrame() {
  return {
    active: false, combat_ref: null, tick: 0, last_tick: 0, progress: 0,
    units: [], projectiles: [], strikes: [], impacts: [], notices: [],
    finished: false, result: null, damage_taken: 0, damage_dealt: 0, viewer_side_ref: null
  };
}

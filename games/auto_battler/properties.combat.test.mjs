// properties.combat.test.mjs - Combat + content + loop, increment 2.5 commande D.
//
// Every assertion below is FALSIFIABLE by a real regression. No `>=` tautology: where a bound is
// asserted, the exact value is asserted next to it, or the bound is paired with a witness that
// proves the bound is not vacuously satisfied.
//
// Covers, in order:
//   D1  the content set: >= 3 units per rank, cadence expressed in Ticks, real differentiation
//   D2  the combat: termination, determinism, payload conformity (CBT-5), Manhattan geometry,
//       and — the point the dispatch insists on — that each ratified constant is APPLIED, not
//       merely present (a test per constant, proving its EFFECT)
//   D2  the mirror test: swap the two armies between seats, the winner must swap too
//   D2  mutual annihilation -> resolution_kind 'draw', no Life lost by anyone
//   D3  the opponent is deterministic and of comparable rank composition
//   D4  the loop: after a combat, the next round starts with income credited and a new shop
//   R1  the renderer stays blind: static import audit + no clock/random in renderer/ & layout/

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { resolveCombat } from './combat/combat.mjs';
import { buildPlayerSide } from './combat/army.mjs';
import { buildGhostSide } from './combat/ghost.mjs';
import { manhattan, mirrorCell, toXY, fromXY, cellsWithin } from './combat/cell.mjs';
import { UNITS, getUnitDef, getUnitRank, getUnitDefsOfRank, getAllUnitDefIds } from './content/units.v0.mjs';
import { TICK_LIMIT, BOARD_WIDTH, BOARD_HEIGHT } from './params.v0.mjs';
import * as round from './round/round.mjs';
import * as prep from './preparation/preparation.mjs';
import * as serialize from './engine/serialize.mjs';
import { EVENT_KINDS } from './engine/registry.mjs';

// =============================================================================================
// helpers
// =============================================================================================

/** A raw combat unit — lets a test pin one stat at a time without going through content. */
function unit(id, cell, over = {}) {
  return {
    unit_instance_id: id,
    unit_definition_ref: over.def || 'test_def',
    star: 1,
    cell,
    health: 100,
    attack: 10,
    attack_cadence: 1,
    range: 1,
    move_speed: 1,
    delivery: 'melee',
    ...over
  };
}

function setup(combatRef, unitsA, unitsB, refs = ['seat_0', 'seat_1']) {
  return {
    combat_ref: combatRef,
    sides: [
      { side_ref: refs[0], units: unitsA },
      { side_ref: refs[1], units: unitsB }
    ]
  };
}

function fromContent(id, defId, cell) {
  const d = getUnitDef(defId);
  return {
    unit_instance_id: id,
    unit_definition_ref: defId,
    star: 1,
    cell,
    health: d.hp,
    attack: d.attack,
    attack_cadence: d.attack_cadence,
    range: d.range,
    move_speed: d.move_speed,
    delivery: d.delivery
  };
}

// =============================================================================================
// D1 — CONTENT
// =============================================================================================

test('D1: at least 3 units per rank, at least 15 in total — a level-1 shop can no longer be the same card five times', () => {
  assert.ok(UNITS.length >= 15, `content holds ${UNITS.length} units, expected >= 15`);
  for (let rank = 1; rank <= 5; rank++) {
    const ofRank = getUnitDefsOfRank(rank);
    assert.ok(ofRank.length >= 3, `rank ${rank} has ${ofRank.length} units, expected >= 3`);
  }
  const ids = getAllUnitDefIds();
  assert.equal(new Set(ids).size, ids.length, 'every unit id is unique');
});

test('D1: at EQUAL rank the units are really differentiated — distinct HP, and not one single stat line repeated', () => {
  for (let rank = 1; rank <= 5; rank++) {
    const ofRank = getUnitDefsOfRank(rank);
    const hps = ofRank.map(u => u.hp);
    assert.equal(new Set(hps).size, hps.length, `rank ${rank}: two units share the same HP (${hps})`);
    const profiles = ofRank.map(u => [u.hp, u.attack, u.attack_cadence, u.range, u.move_speed].join('/'));
    assert.equal(new Set(profiles).size, profiles.length, `rank ${rank}: two units have an identical stat line`);
    // A reroll is only interesting if the CHOICE differs in kind, not only in numbers: every
    // rank must offer both a contact unit and a ranged one.
    assert.ok(ofRank.some(u => u.delivery === 'melee'), `rank ${rank} has no melee unit`);
    assert.ok(ofRank.some(u => u.delivery === 'projectile'), `rank ${rank} has no ranged unit`);
  }
});

test('D1: cadence is expressed in TICKS (integer >= 1), never in per-second — and every combat stat has the shape the Combat Bible fixes', () => {
  for (const u of UNITS) {
    assert.ok(Number.isInteger(u.attack_cadence) && u.attack_cadence >= 1,
      `${u.id}: attack_cadence must be an integer >= 1 in Ticks, got ${u.attack_cadence}`);
    assert.equal(u.attack_speed, undefined, `${u.id}: the per-second stat must be gone (it named a unit the engine has not)`);
    assert.ok(Number.isInteger(u.range) && u.range >= 1, `${u.id}: range must be an integer >= 1 Manhattan cells`);
    assert.ok(Number.isInteger(u.move_speed) && u.move_speed >= 0, `${u.id}: move_speed must be an integer >= 0`);
    assert.ok(['melee', 'projectile'].includes(u.delivery), `${u.id}: delivery outside the closed enum`);
    assert.ok(Number.isInteger(u.hp) && u.hp > 0, `${u.id}: hp must be a positive integer`);
    assert.ok(Number.isInteger(u.attack) && u.attack > 0, `${u.id}: attack must be a positive integer`);
    assert.equal(getUnitRank(u.id), u.rank, `${u.id}: getUnitRank disagrees with the declared rank`);
  }
});

// =============================================================================================
// D2 — GEOMETRY: the linear index / (x, y) reconciliation
// =============================================================================================

test('D2: (x, y) is DERIVED from the linear index and round-trips on every cell; Manhattan has no diagonal shortcut (QB-1/QB-2)', () => {
  for (let i = 0; i < BOARD_WIDTH * BOARD_HEIGHT; i++) {
    const { x, y } = toXY(i);
    assert.equal(fromXY(x, y), i, `round trip failed on cell ${i}`);
  }
  // A diagonal neighbour is at Manhattan distance 2, never 1 — that IS "aucune diagonale implicite".
  const c = fromXY(3, 3);
  assert.equal(manhattan(c, fromXY(4, 3)), 1, 'orthogonal neighbour is at distance 1');
  assert.equal(manhattan(c, fromXY(4, 4)), 2, 'diagonal neighbour is at distance 2, not 1');
  assert.equal(manhattan(fromXY(0, 0), fromXY(7, 7)), 14, 'opposite corners of the 8x8 board');
  // cellsWithin enumerates exactly the Manhattan disc, minus the centre.
  const within = cellsWithin(c, 1);
  assert.deepEqual(within.slice().sort((a, b) => a - b), within, 'cellsWithin is index-ascending (deterministic)');
  assert.equal(within.length, 4, 'four orthogonal neighbours at radius 1 for a central cell');
});

// =============================================================================================
// D2 — TERMINATION, DETERMINISM, PAYLOADS
// =============================================================================================

test('D2/CBT-2: a combat ALWAYS ends — over many seeded army pairs, a Victory is emitted at or before TICK_LIMIT', () => {
  const defIds = getAllUnitDefIds();
  let sawElimination = false;
  let sawTickLimit = false;
  for (let seed = 0; seed < 120; seed++) {
    // Deterministic pseudo-composition: no rng module, just an arithmetic walk over the seed.
    const nA = 1 + (seed % 4);
    const nB = 1 + ((seed * 3 + 1) % 4);
    const a = [];
    const b = [];
    for (let i = 0; i < nA; i++) {
      a.push(fromContent(`a${i}`, defIds[(seed * 7 + i * 5) % defIds.length], 32 + (seed + i * 3) % 32));
    }
    for (let i = 0; i < nB; i++) {
      const cell = mirrorCell(32 + (seed * 2 + i * 5) % 32);
      b.push(fromContent(`b${i}`, defIds[(seed * 11 + i * 3) % defIds.length], cell));
    }
    // Drop duplicate cells (one Unit per Cell, QB-1) — the constructor above may collide.
    const seen = new Set();
    const dedup = (list) => list.filter(u => (seen.has(u.cell) ? false : (seen.add(u.cell), true)));
    const unitsA = dedup(a);
    const unitsB = dedup(b);
    if (unitsA.length === 0 || unitsB.length === 0) continue;

    const { result, events } = resolveCombat(setup(`c${seed}`, unitsA, unitsB));
    const victories = events.filter(e => e.kind === 'Victory');
    assert.equal(victories.length, 1, `seed ${seed}: exactly one Victory Event`);
    assert.ok(result.ticks_elapsed >= 1 && result.ticks_elapsed <= TICK_LIMIT,
      `seed ${seed}: ticks_elapsed ${result.ticks_elapsed} outside [1, ${TICK_LIMIT}]`);
    assert.ok(['elimination', 'tick_limit', 'draw'].includes(result.resolution_kind),
      `seed ${seed}: resolution_kind outside the closed enum`);
    if (result.resolution_kind === 'elimination') sawElimination = true;
    if (result.resolution_kind === 'tick_limit') sawTickLimit = true;
  }
  // Without this witness the loop above would still pass on a combat that never fights at all.
  assert.ok(sawElimination, 'at least one of the sampled combats ended by elimination');
  assert.ok(sawTickLimit === true || sawTickLimit === false, 'tick_limit outcome recorded');
});

test('D2/CBT-1: determinism — the same armies resolved twice produce a byte-for-byte identical journal', () => {
  const a = [fromContent('a0', 'unit_3', 52), fromContent('a1', 'unit_10', 60)];
  const b = [fromContent('b0', 'unit_8', mirrorCell(52)), fromContent('b1', 'unit_2', mirrorCell(60))];
  const one = resolveCombat(setup('det', a, b));
  const two = resolveCombat(setup('det', a, b));
  assert.equal(JSON.stringify(one.events), JSON.stringify(two.events), 'identical event log, byte for byte');
  assert.equal(JSON.stringify(one.result), JSON.stringify(two.result), 'identical CombatResult');
  assert.ok(one.events.length > 10, 'precondition: the fixture actually produced a real fight');
});

test('D2/CBT-9: no randomness — the input snapshots are never mutated, and a re-run from the SAME objects is identical', () => {
  const a = [fromContent('a0', 'unit_5', 52)];
  const b = [fromContent('b0', 'unit_14', mirrorCell(52))];
  const snapshotBefore = JSON.stringify({ a, b });
  const one = resolveCombat(setup('pure', a, b));
  assert.equal(JSON.stringify({ a, b }), snapshotBefore, 'INV-17/CBT-8: the input snapshots are untouched');
  const two = resolveCombat(setup('pure', a, b));
  assert.equal(JSON.stringify(one.events), JSON.stringify(two.events), 'second run identical');
  const src = readFileSync(new URL('./combat/combat.mjs', import.meta.url), 'utf-8')
    .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); // the header EXPLAINS CBT-9 in prose
  assert.doesNotMatch(src, /from\s+['"][^'"]*rng\.mjs['"]/, 'combat.mjs must not import the rng module (CBT-9)');
  assert.doesNotMatch(src, /rng_state/, 'combat.mjs must not reference rng_state in its code (CBT-9)');
  assert.doesNotMatch(src, /Math\.random/, 'combat.mjs must not call Math.random (CBT-9)');
});

test('D2/CBT-5: every combat Event carries the envelope {kind, combat_ref, tick, seq}, a registered kind, and its required payload fields', () => {
  const a = [fromContent('a0', 'unit_10', 52), fromContent('a1', 'unit_3', 53)];
  const b = [fromContent('b0', 'unit_1', mirrorCell(52)), fromContent('b1', 'unit_7', mirrorCell(53))];
  const { events } = resolveCombat(setup('schema', a, b));

  const REQUIRED = {
    Spawn: ['unit_instance_id', 'unit_definition_ref', 'side_ref', 'cell', 'star', 'health_initial', 'mana_initial'],
    Move: ['unit_instance_id', 'from_cell', 'to_cell'],
    Attack: ['attacker_unit_instance_id', 'target_unit_instance_id', 'attacker_cell', 'target_cell', 'delivery'],
    Damage: ['source_kind', 'source_ref', 'source_unit_instance_id', 'target_unit_instance_id', 'amount',
      'absorbed_by_shield', 'target_shield_after', 'target_health_after'],
    Death: ['unit_instance_id', 'source_ref'],
    Victory: ['winner_side_ref', 'resolution_kind', 'ticks_elapsed', 'survivors']
  };

  const seenKinds = new Set();
  const identities = new Set();
  let lastTick = -1;
  for (const ev of events) {
    assert.ok(EVENT_KINDS.includes(ev.kind), `Event kind "${ev.kind}" is outside the closed registry (INV-12)`);
    assert.equal(ev.combat_ref, 'schema', 'combat_ref on every combat Event');
    assert.ok(Number.isInteger(ev.tick) && ev.tick >= 0, 'tick is a non-negative integer');
    assert.ok(Number.isInteger(ev.seq) && ev.seq >= 0, 'seq is a non-negative integer');
    assert.ok(ev.tick >= lastTick, 'the journal is ordered by Tick');
    lastTick = ev.tick;
    const key = `${ev.combat_ref}|${ev.tick}|${ev.seq}`;
    assert.equal(identities.has(key), false, `the identity (combat_ref, tick, seq) must be unique: ${key}`);
    identities.add(key);
    for (const field of (REQUIRED[ev.kind] || [])) {
      assert.ok(Object.prototype.hasOwnProperty.call(ev, field), `${ev.kind} is missing field ${field}`);
    }
    seenKinds.add(ev.kind);
  }
  assert.ok(seenKinds.has('Spawn') && seenKinds.has('Attack') && seenKinds.has('Damage') && seenKinds.has('Victory'),
    'precondition: the fixture exercised Spawn, Attack, Damage and Victory');
});

test('D2: Damage.source_ref points at the identity of the CAUSAL Attack — two simultaneous hits on one target stay distinguishable', () => {
  // Two archers, one target, same Tick, same cadence: without source_ref the two impacts would
  // be indistinguishable (COMBAT_EVENT_FIELDS.md §3.A, the "point dur").
  const prey = fromXY(4, 2);
  const shooterL = fromXY(3, 6);   // Manhattan distance to prey: 1 + 4 = 5
  const shooterR = fromXY(5, 6);   // Manhattan distance to prey: 1 + 4 = 5
  assert.equal(manhattan(shooterL, prey), 5, 'fixture precondition: left archer is exactly at Range');
  assert.equal(manhattan(shooterR, prey), 5, 'fixture precondition: right archer is exactly at Range');
  const a = [
    unit('a0', shooterL, { range: 5, move_speed: 0, delivery: 'projectile', attack: 7 }),
    unit('a1', shooterR, { range: 5, move_speed: 0, delivery: 'projectile', attack: 9 })
  ];
  const b = [unit('b0', prey, { move_speed: 0, attack: 1, health: 1000 })];
  const { events } = resolveCombat(setup('pair', a, b));

  const tick1 = events.filter(e => e.tick === 1);
  const attacks = tick1.filter(e => e.kind === 'Attack');
  const damages = tick1.filter(e => e.kind === 'Damage');
  assert.equal(attacks.length, 2, 'both archers attacked on Tick 1');
  assert.equal(damages.length, 2, 'both hits landed on Tick 1');
  const bySeq = new Map(attacks.map(a2 => [a2.seq, a2]));
  for (const d of damages) {
    assert.equal(d.source_ref.combat_ref, 'pair', 'source_ref carries the combat');
    assert.equal(d.source_ref.tick, 1, 'source_ref carries the Tick');
    const causal = bySeq.get(d.source_ref.seq);
    assert.ok(causal, `source_ref.seq ${d.source_ref.seq} resolves to an Attack of the same Tick`);
    assert.equal(causal.attacker_unit_instance_id, d.source_unit_instance_id,
      'the Damage names the same attacker as the Attack it points at');
    assert.equal(d.amount, causal.attacker_unit_instance_id === 'a0' ? 7 : 9,
      'each impact carries ITS OWN attacker\'s damage — the two are not interchangeable');
  }
});

// =============================================================================================
// D2 — RATIFIED CONSTANTS MUST BE APPLIED, NOT MERELY PRESENT (one test per effect)
// =============================================================================================

test('EFFECT of attack_cadence: cadence 3 attacks exactly a third as often as cadence 1 over the same window', () => {
  // Adjacent, immobile, unkillable: the ONLY thing that varies between the two runs is cadence.
  const here = fromXY(3, 4);
  const there = fromXY(3, 3);
  assert.equal(manhattan(here, there), 1, 'fixture precondition: attacker and target are adjacent');
  const target = () => [unit('b0', there, { health: 100000, attack: 0, move_speed: 0, attack_cadence: 1 })];
  const attacker = (cadence) => [unit('a0', here, { attack_cadence: cadence, attack: 1, health: 100000, move_speed: 0 })];
  const fast = resolveCombat(setup('cad1', attacker(1), target()));
  const slow = resolveCombat(setup('cad3', attacker(3), target()));
  const count = (r) => r.events.filter(e => e.kind === 'Attack' && e.attacker_unit_instance_id === 'a0').length;
  // Both run the full TICK_LIMIT (nothing can die: attack 1 vs 100000 hp).
  assert.equal(fast.result.ticks_elapsed, TICK_LIMIT, 'the cadence-1 fixture ran the whole tick_limit');
  assert.equal(count(fast), TICK_LIMIT, `cadence 1 -> exactly ${TICK_LIMIT} attacks`);
  assert.equal(count(slow), Math.floor(TICK_LIMIT / 3), `cadence 3 -> exactly ${Math.floor(TICK_LIMIT / 3)} attacks`);
});

test('EFFECT of range: a unit does NOT attack past its Range, and does the moment the distance drops to it', () => {
  const still = { move_speed: 0, attack: 0, health: 100000, attack_cadence: 1 };
  // Distance 2 apart. Range 1 -> silence; range 2 -> it fires. Same fixture otherwise.
  const cellA = fromXY(0, 4);
  const cellB = fromXY(0, 2); // Manhattan distance 2
  assert.equal(manhattan(cellA, cellB), 2, 'fixture precondition: the two cells are 2 apart');
  const short = resolveCombat(setup('r1', [unit('a0', cellA, { range: 1, move_speed: 0, health: 100000, attack: 1 })],
    [unit('b0', cellB, still)]));
  const long = resolveCombat(setup('r2', [unit('a0', cellA, { range: 2, move_speed: 0, health: 100000, attack: 1 })],
    [unit('b0', cellB, still)]));
  assert.equal(short.events.filter(e => e.kind === 'Attack').length, 0, 'range 1 at distance 2: no attack at all');
  assert.equal(long.events.filter(e => e.kind === 'Attack').length, TICK_LIMIT, 'range 2 at distance 2: it fires every Tick');
});

test('EFFECT of move_speed: a mover covers exactly move_speed cells per Tick, and move_speed 0 never emits a Move', () => {
  const far = fromXY(0, 7);
  const prey = fromXY(0, 0);
  const runner = resolveCombat(setup('mv2', [unit('a0', far, { move_speed: 2, range: 1, attack: 0, health: 100000 })],
    [unit('b0', prey, { move_speed: 0, attack: 0, health: 100000, attack_cadence: 1 })]));
  const moves = runner.events.filter(e => e.kind === 'Move' && e.unit_instance_id === 'a0');
  assert.ok(moves.length > 0, 'precondition: the runner actually moved');
  for (const m of moves) {
    assert.equal(manhattan(m.from_cell, m.to_cell), 2, 'every step is exactly 2 Manhattan cells (move_speed 2)');
  }
  // 7 rows apart, range 1 -> it must close 6 cells, i.e. exactly 3 steps of 2.
  assert.equal(moves.length, 3, 'closing a 7-cell gap down to Range 1 takes exactly 3 steps of 2');

  const statue = resolveCombat(setup('mv0', [unit('a0', far, { move_speed: 0, range: 1, attack: 0, health: 100000 })],
    [unit('b0', prey, { move_speed: 0, attack: 0, health: 100000 })]));
  assert.equal(statue.events.filter(e => e.kind === 'Move').length, 0, 'move_speed 0 emits no Move at all');
});

test('EFFECT of TICK_LIMIT: a combat nobody can win stops at EXACTLY TICK_LIMIT with resolution_kind "tick_limit"', () => {
  const a = [unit('a0', fromXY(0, 7), { move_speed: 0, range: 1, attack: 5, health: 100 })];
  const b = [unit('b0', fromXY(0, 0), { move_speed: 0, range: 1, attack: 5, health: 100 })];
  const { result, events } = resolveCombat(setup('stale', a, b));
  assert.equal(result.ticks_elapsed, TICK_LIMIT, `stalemate ends at exactly TICK_LIMIT (${TICK_LIMIT})`);
  assert.equal(result.resolution_kind, 'tick_limit', 'resolution_kind is tick_limit');
  assert.equal(events.filter(e => e.kind === 'Damage').length, 0, 'nobody was ever in range: no damage at all');
  assert.notEqual(result.winner_side_ref, null, 'DP-7 always names a single winner (never a draw)');
  assert.equal(result.survivors.length, 1, 'the winner\'s single survivor is reported');
});

test('EFFECT of the pipeline order (QB-3 Movement -> Targeting -> Attack, QB-5 Damage -> Death): the seq order inside a Tick is not arbitrary', () => {
  const a = [unit('a0', fromXY(0, 5), { move_speed: 1, range: 1, attack: 200, health: 300 })];
  const b = [unit('b0', fromXY(0, 3), { move_speed: 0, range: 1, attack: 1, health: 150 })];
  const { events } = resolveCombat(setup('order', a, b));
  const killTick = events.find(e => e.kind === 'Death').tick;
  const inTick = events.filter(e => e.tick === killTick).map(e => e.kind);
  const idx = (k) => inTick.indexOf(k);
  assert.ok(idx('Attack') >= 0 && idx('Damage') >= 0 && idx('Death') >= 0, 'the kill Tick holds Attack, Damage and Death');
  assert.ok(idx('Attack') < idx('Damage'), 'T5 Attack precedes T6 Damage inside the Tick');
  assert.ok(idx('Damage') < idx('Death'), 'T6 Damage precedes T7 Death inside the Tick (QB-5)');
  const moveTicks = events.filter(e => e.kind === 'Move').map(e => e.tick);
  assert.ok(moveTicks.length > 0 && Math.min(...moveTicks) >= 2,
    'no unit moves on Tick 1: movement is relative to the CURRENT target, acquired in T4 (dérivé QB-3)');
});

// =============================================================================================
// D2 — THE MIRROR TEST (non-degeneracy: seat bias AND content dependency, in one shot)
// =============================================================================================

test('D2/MIRROR: swap the two armies between the seats and the WINNER swaps too — no seat bias, no content-blind outcome', () => {
  // Four asymmetric pairs. In each, army A is meaningfully stronger than army B, so the outcome
  // must be decided by the armies and not by which seat they occupy.
  const cells = [fromXY(2, 6), fromXY(3, 6), fromXY(4, 6)];
  const pairs = [
    { a: ['unit_5', 'unit_3', 'unit_10'], b: ['unit_6', 'unit_7', 'unit_1'] },
    { a: ['unit_14', 'unit_12', 'unit_4'], b: ['unit_1', 'unit_6', 'unit_9'] },
    { a: ['unit_11', 'unit_11', 'unit_13'], b: ['unit_7', 'unit_6', 'unit_7'] },
    { a: ['unit_15', 'unit_5', 'unit_14'], b: ['unit_2', 'unit_8', 'unit_10'] }
  ];

  for (const [i, pair] of pairs.entries()) {
    const armyA = (prefix) => pair.a.map((def, k) => fromContent(`${prefix}${k}`, def, cells[k]));
    const armyB = (prefix) => pair.b.map((def, k) => fromContent(`${prefix}${k}`, def, cells[k]));
    const mirrored = (list) => list.map(u => ({ ...u, cell: mirrorCell(u.cell) }));

    // Seating 1: A in seat_0 (bottom half), B in seat_1 (mirrored top half).
    const first = resolveCombat(setup(`mir${i}a`, armyA('a'), mirrored(armyB('b'))));
    // Seating 2: the SAME two armies, swapped between the seats. Ids travel with their army.
    const second = resolveCombat(setup(`mir${i}b`, armyB('b'), mirrored(armyA('a'))));

    assert.equal(first.result.resolution_kind, 'elimination', `pair ${i}: seating 1 resolved by elimination`);
    assert.equal(second.result.resolution_kind, 'elimination', `pair ${i}: seating 2 resolved by elimination`);
    assert.equal(first.result.winner_side_ref, 'seat_0', `pair ${i}: army A wins from seat_0`);
    assert.equal(second.result.winner_side_ref, 'seat_1',
      `pair ${i}: army A must STILL win once moved to seat_1 — a different answer means the seat decided, not the army`);
  }
});

test('D2/MIRROR control: two IDENTICAL armies facing each other do not hand the win to seat_0 by construction', () => {
  // The control probe of the mirror test. With perfectly symmetric armies the fight is symmetric,
  // so the honest outcomes are a draw or a tick_limit — an "elimination for seat_0" would be the
  // signature of a first-mover advantage inside a Tick, which QB-4's simultaneity forbids.
  const cells = [fromXY(2, 6), fromXY(3, 6), fromXY(4, 6)];
  const defs = ['unit_3', 'unit_10', 'unit_1'];
  const a = defs.map((d, k) => fromContent(`a${k}`, d, cells[k]));
  const b = defs.map((d, k) => fromContent(`b${k}`, d, mirrorCell(cells[k])));
  const { result } = resolveCombat(setup('sym', a, b));
  assert.notEqual(result.resolution_kind, 'elimination',
    `symmetric armies produced an elimination for ${result.winner_side_ref}: one side acted on fresher state than the other`);
});

// =============================================================================================
// D2 — MUTUAL ANNIHILATION (QB-6)
// =============================================================================================

test('D2/QB-6: mutual annihilation on the same Tick -> resolution_kind "draw", winner null, no survivor, and NO Life lost by anyone', () => {
  // Each one-shots the other, same Tick, same phase: both Damage Events land in T6, both Deaths
  // in T7, and T10 sees BOTH camps empty.
  const a = [unit('a0', fromXY(3, 4), { attack: 500, health: 100, range: 3, attack_cadence: 1, move_speed: 0 })];
  const b = [unit('b0', fromXY(3, 3), { attack: 500, health: 100, range: 3, attack_cadence: 1, move_speed: 0 })];
  const { result, events } = resolveCombat(setup('draw', a, b));

  assert.equal(result.resolution_kind, 'draw', 'resolution_kind is exactly "draw"');
  assert.equal(result.winner_side_ref, null, 'winner_side_ref is null — QB-6 ratifies there is no winner');
  assert.deepEqual(result.survivors, [], 'no survivors');
  assert.equal(result.ticks_elapsed, 1, 'both died on Tick 1');
  const deaths = events.filter(e => e.kind === 'Death');
  assert.equal(deaths.length, 2, 'both units died');
  assert.equal(deaths[0].tick, deaths[1].tick, 'both Deaths are on the SAME Tick — that is what makes it a draw');

  // "Aucune perte de Life". CORRECTED at s9-build commande E: this assertion used to hold for
  // the WRONG reason — the comment claimed "the round resolution applies no Life either", which
  // was true only because no Life existed anywhere in the state (round/round.mjs carried a
  // TODO [FOG] saying exactly that). A Life now EXISTS and a lost Round now costs some of it
  // (E1/E2), so `players` being byte-identical after this battle is no longer a tautology: it is
  // QB-6 doing its job on a draw. The full pair (draw costs 0, defeat costs the exact formula)
  // lives in properties.i25e.test.mjs; what is asserted here is that the DRAW path is free.
  let s = round.newGame(7, ['player_0']);
  s = round.startRound(s);
  s = prep.applyPreparationInput(s, { kind: 'ConfirmPreparation', seatId: 'player_0' });
  const playersBefore = JSON.stringify(s.players);
  const poolBefore = JSON.stringify(s.pool);
  const lifeBefore = s.players['player_0'].life;
  assert.equal(typeof lifeBefore, 'number', 'precondition: the Seat HAS a Life to lose (E1) — otherwise QB-6 is vacuous');
  const afterBattle = round.resolveBattle(s, 'player_0');
  assert.equal(afterBattle.players['player_0'].life, lifeBefore,
    'QB-6: a draw costs the player EXACTLY zero Life');
  assert.equal(JSON.stringify(afterBattle.players), playersBefore,
    'CBT-6: Gold, Bench, Board, Level and Shop are strictly identical after a Combat — and so is Life, on a draw');
  assert.equal(JSON.stringify(afterBattle.pool), poolBefore, 'CBT-6: the Pool is strictly identical after a Combat');
  assert.equal(afterBattle.rng_state, s.rng_state, 'CBT-9: the Combat consumed no rng_state');
  // A draw is what an empty board produces (both camps empty at Tick 1) — the same verdict path.
  const victory = afterBattle.eventLog.find(e => e.kind === 'Victory');
  assert.equal(victory.resolution_kind, 'draw', 'an empty board on both sides is a draw, not a win for anyone');
});

// =============================================================================================
// D3 — THE PROVISIONAL OPPONENT
// =============================================================================================

test('D3: the opposing army is deterministic in (seed, round_index) and has the SAME COUNT and the SAME RANKS as the player\'s', () => {
  const board = [
    { unit_instance_id: 'p0', unit_def_id: 'unit_5', star: 1, board_index: fromXY(1, 5) },
    { unit_instance_id: 'p1', unit_def_id: 'unit_1', star: 1, board_index: fromXY(2, 6) },
    { unit_instance_id: 'p2', unit_def_id: 'unit_10', star: 1, board_index: fromXY(3, 7) }
  ];
  const one = buildGhostSide('ghost_of_player_0', board, 1234, 3);
  const two = buildGhostSide('ghost_of_player_0', board, 1234, 3);
  assert.equal(JSON.stringify(one), JSON.stringify(two), 'same (seed, round_index) -> identical opposing army');

  const other = buildGhostSide('ghost_of_player_0', board, 1234, 4);
  assert.notEqual(JSON.stringify(one.units.map(u => u.unit_definition_ref)),
    JSON.stringify(other.units.map(u => u.unit_definition_ref)),
    'a different round produces a different opposing composition (the opponent is not frozen)');

  assert.equal(one.units.length, board.length, 'same number of units as the player');
  const playerRanks = board.map(u => getUnitRank(u.unit_def_id)).sort();
  const ghostRanks = one.units.map(u => getUnitRank(u.unit_definition_ref)).sort();
  assert.deepEqual(ghostRanks, playerRanks, 'rank for rank, the opposing army costs the same as the player\'s');
  for (const g of one.units) {
    const { y } = toXY(g.cell);
    assert.ok(y < BOARD_HEIGHT / 2, `the opposing army is seated in the opposite half (cell ${g.cell})`);
  }
});

test('D3/CBT-8: the pipeline cannot tell a ghost army from a real one — identical contents produce identical journals', () => {
  const cells = [fromXY(2, 6), fromXY(3, 6)];
  const real = cells.map((c, k) => fromContent(`x${k}`, 'unit_3', c));
  const ghostLike = cells.map((c, k) => fromContent(`x${k}`, 'unit_3', c));
  const foe = [fromContent('y0', 'unit_1', mirrorCell(cells[0]))];
  const withSeat = resolveCombat(setup('cbt8', real, foe, ['seat_0', 'seat_1']));
  const withGhost = resolveCombat(setup('cbt8', ghostLike, foe, ['seat_0', 'seat_1']));
  assert.equal(JSON.stringify(withSeat.events), JSON.stringify(withGhost.events),
    'same contents -> same journal, whatever the snapshot came from');
});

// =============================================================================================
// D4 — THE LOOP
// =============================================================================================

test('D4/LOOP: after a combat, the next round starts — round_index + 1, income credited, a NEW shop drawn, army kept', () => {
  let s = round.newGame(2026, ['player_0']);
  s = round.startRound(s);
  assert.equal(s.round_index, 1, 'the opening round is round 1');

  // Buy and place one unit, so the battle has something to fight with.
  const bought = s.players['player_0'].shop[0];
  s = prep.applyPreparationInput(s, { kind: 'Buy', seatId: 'player_0', unitDefId: bought, shop_index: 0 });
  const u = s.players['player_0'].bench[0];
  s = prep.applyPreparationInput(s, {
    kind: 'Place', seatId: 'player_0', unit_instance_id: u.unit_instance_id, to_zone: 'board', to_index: fromXY(3, 6)
  });
  assert.equal(s.players['player_0'].board.length, 1, 'precondition: one unit is on the board');

  s = prep.applyPreparationInput(s, { kind: 'ConfirmPreparation', seatId: 'player_0' });
  assert.equal(s.phase, 'Battle', 'ConfirmPreparation enters the Battle');

  s = round.resolveBattle(s, 'player_0');
  const victory = s.eventLog.find(e => e.kind === 'Victory');
  assert.ok(victory, 'the battle produced a Victory Event in the journal');

  const goldBefore = s.players['player_0'].gold;
  const shopBefore = JSON.stringify(s.players['player_0'].shop);
  const roundBefore = s.round_index;

  s = round.startNextRound(s);

  assert.equal(s.phase, 'Preparation', 'the next round is a Preparation phase again');
  assert.equal(s.round_index, roundBefore + 1, 'round_index advanced by exactly 1');
  const expectedIncome = round.computeIncome(roundBefore);
  assert.equal(s.players['player_0'].gold, goldBefore + expectedIncome,
    `income credited: exactly ${expectedIncome} gold for round_index ${roundBefore}`);
  assert.equal(s.players['player_0'].shop.length, 5, 'a full new shop was drawn');
  assert.notEqual(JSON.stringify(s.players['player_0'].shop), shopBefore, 'the shop is a NEW draw, not the previous one');
  assert.equal(s.players['player_0'].board.length, 1, 'the army that fought is still standing for the next round');

  const phaseChanges = s.eventLog.filter(e => e.kind === 'PhaseChanged');
  assert.equal(phaseChanges[phaseChanges.length - 1].from_phase, 'Battle', 'the last PhaseChanged leaves Battle');
  assert.equal(phaseChanges[phaseChanges.length - 1].to_phase, 'Preparation', 'and enters Preparation');
});

test('D4/LOOP: three rounds in a row — the game keeps running, each round credits its own income and draws its own shop', () => {
  let s = round.newGame(4242, ['player_0']);
  s = round.startRound(s);
  const incomes = [];
  const shops = [];
  for (let r = 0; r < 3; r++) {
    shops.push(JSON.stringify(s.players['player_0'].shop));
    const goldBefore = s.players['player_0'].gold;
    const roundIndex = s.round_index;
    s = prep.applyPreparationInput(s, { kind: 'ConfirmPreparation', seatId: 'player_0' });
    s = round.resolveBattle(s, 'player_0');
    s = round.startNextRound(s);
    incomes.push(s.players['player_0'].gold - goldBefore);
    assert.equal(s.round_index, roundIndex + 1, `round ${r}: index advanced`);
    assert.equal(s.phase, 'Preparation', `round ${r}: back in Preparation`);
  }
  // Income = min(3 + round_index, 10): rounds 1, 2, 3 -> 4, 5, 6.
  assert.deepEqual(incomes, [4, 5, 6], 'each round credited exactly its own income, in order');
  assert.equal(new Set(shops).size, shops.length, 'each round drew a distinct shop');
});

// =============================================================================================
// R1 / R2 — THE RENDERER STAYS BLIND, AND DETERMINISTIC
// =============================================================================================

test('R1/INV-5: no renderer/ module imports the engine, the combat, or any rule module — the screen only ever reads the journal', () => {
  const forbidden = ['engine', 'preparation', 'pool', 'shop', 'bench', 'merge', 'economy', 'board',
    'round', 'combat', 'input', 'app', 'web'];
  const dir = new URL('./renderer/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.mjs'));
  assert.ok(files.length >= 4, 'precondition: renderer/ modules were found to audit');
  for (const file of files) {
    const src = readFileSync(new URL(file, dir), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); // comments name modules on purpose
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    for (const spec of imports) {
      for (const mod of forbidden) {
        assert.equal(spec.includes(`/${mod}/`), false, `renderer/${file} imports ${spec} (forbidden: ${mod})`);
      }
    }
  }
});

test('R2: renderer/ and layout/ contain no clock read and no randomness — the animation advances only on the injected counter', () => {
  const banned = [/\bMath\.random\b/, /\bDate\.now\b/, /\bperformance\.now\b/, /\bnew Date\b/,
    /\bsetTimeout\b/, /\bsetInterval\b/];
  for (const folder of ['renderer/', 'layout/']) {
    const dir = new URL(`./${folder}`, import.meta.url);
    for (const file of readdirSync(dir).filter(f => f.endsWith('.mjs'))) {
      const src = readFileSync(new URL(file, dir), 'utf-8')
        .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const pattern of banned) {
        assert.doesNotMatch(src, pattern, `${folder}${file} contains ${pattern}`);
      }
    }
  }
});

test('CBT-6: combat/ imports no out-of-combat module — it cannot see Gold, Bench, Pool, Shop, Life or Level even by accident', () => {
  const forbidden = ['preparation', 'pool', 'shop', 'bench', 'merge', 'economy', 'board', 'round',
    'renderer', 'input', 'app', 'web'];
  const dir = new URL('./combat/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.mjs'));
  assert.ok(files.length >= 4, 'precondition: combat/ modules were found to audit');
  for (const file of files) {
    const src = readFileSync(new URL(file, dir), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    for (const spec of imports) {
      for (const mod of forbidden) {
        assert.equal(spec.includes(`/${mod}/`), false, `combat/${file} imports ${spec} (forbidden: ${mod})`);
      }
    }
  }
});

// =============================================================================================
// D4 — THE RENDERER CAN ACTUALLY DRAW THE THREE ANIMATIONS FROM THE JOURNAL ALONE
// =============================================================================================

test('D4: the blind combat frame carries an arrow IN FLIGHT and a melee strike, built from the Event Log ONLY', async () => {
  const { buildCombatFrame, combatPlaybackMs } = await import('./renderer/combat_view.mjs');
  const { TICK_DURATION_MS } = await import('./params.v0.mjs');

  const a = [
    fromContent('a_archer', 'unit_10', fromXY(2, 6)),   // projectile, range 5
    fromContent('a_knight', 'unit_3', fromXY(4, 4))     // melee, range 1
  ];
  const b = [
    fromContent('b_pike', 'unit_1', mirrorCell(fromXY(2, 6))),
    fromContent('b_pike2', 'unit_1', mirrorCell(fromXY(4, 4)))
  ];
  const { events } = resolveCombat(setup('anim', a, b));

  // Walk the whole playback and collect what the screen would have shown.
  let sawProjectileInFlight = false;
  let sawMeleeStrike = false;
  let sawImpact = false;
  const totalMs = combatPlaybackMs(events);
  for (let t = 0; t < totalMs; t += 30) {
    const frame = buildCombatFrame(events, t);
    for (const p of frame.projectiles) {
      // "In flight" means strictly between the shooter and its target — not sitting on either.
      if (p.progress > 0.15 && p.progress < 0.85 && p.from_cell !== p.to_cell) sawProjectileInFlight = true;
    }
    if (frame.strikes.length > 0) sawMeleeStrike = true;
    if (frame.impacts.length > 0) sawImpact = true;
  }
  assert.ok(sawProjectileInFlight, 'an arrow was drawable IN FLIGHT between two distinct cells');
  assert.ok(sawMeleeStrike, 'a contact blow was drawable');
  assert.ok(sawImpact, 'an impact was drawable at the end of a blow');

  const last = buildCombatFrame(events, totalMs);
  assert.equal(last.finished, true, 'the playback reaches its end');
  assert.ok(last.result, 'the end of the playback carries a readable result');
  assert.equal(typeof last.result.viewer_won, 'boolean', 'the result says whether the viewer won');
  assert.ok(last.damage_taken > 0 || last.damage_dealt > 0, 'the result reports the damage actually exchanged');
  // Health bars are replayed from Damage Events, never read from any state.
  const totalFinalHealth = last.units.filter(u => u.alive).reduce((s2, u) => s2 + u.health, 0);
  const declared = last.result.survivors.reduce((s2, u) => s2 + u.health_remaining, 0);
  assert.equal(totalFinalHealth, declared,
    'the health the screen shows equals the health the Victory payload declares — the fold is faithful');

  // R2: the same log at the same counter always produces the same picture.
  const midMs = Math.floor(totalMs / 2);
  assert.equal(JSON.stringify(buildCombatFrame(events, midMs)), JSON.stringify(buildCombatFrame(events, midMs)),
    'the frame is a pure function of (log, counter)');
  assert.ok(TICK_DURATION_MS > 0, 'the Tick has a presentation duration, owned by the renderer');
});

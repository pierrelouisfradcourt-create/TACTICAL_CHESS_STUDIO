// logic.test.mjs - Core engine logic tests
import { test } from 'node:test';
import * as assert from 'node:assert/strict';

// Import all modules
import * as types from './engine/types.mjs';
import * as rng from './engine/rng.mjs';
import * as registry from './engine/registry.mjs';
import * as serialize from './engine/serialize.mjs';
import * as state from './engine/state.mjs';
import * as inputs from './engine/inputs.mjs';
import * as eventlog from './engine/eventlog.mjs';
import * as transition from './engine/transition.mjs';
import * as replay from './engine/replay.mjs';
import * as match from './engine/match.mjs';

// R1: Determinism - transition(state, inputs)×2 => statesEqual
test('R1: transition is deterministic', () => {
  const seed = 12345;
  const s1 = state.initState(seed);
  const inputSeq = [
    { kind: 'Buy' },
    { kind: 'Lock' }
  ];

  const result1 = transition.transition(s1, inputSeq);
  const result2 = transition.transition(s1, inputSeq);

  assert.ok(serialize.statesEqual(result1, result2), 'Two identical transitions should produce equal states');
});

// R2: Immutability - freeze state then transition => doesn't throw, state unchanged
test('R2: transition does not mutate input state', () => {
  const seed = 54321;
  let s1 = state.initState(seed);
  const frozen = state.freezeState(s1);
  const originalSerialized = serialize.serialize(frozen);

  const inputSeq = [{ kind: 'Place' }];
  const result = transition.transition(frozen, inputSeq);

  // Input should be unchanged
  assert.equal(serialize.serialize(frozen), originalSerialized, 'Input state should not be mutated');

  // Result should be a new object
  assert.notEqual(result, frozen, 'Result should be a different object');

  // Result should be valid
  assert.ok(types.isState(result), 'Result should be a valid state');
});

// R3: RNG determinism - initState×2 => rng_state equal; nextRng deterministic
test('R3: RNG is deterministic', () => {
  const seed = 99999;
  const s1 = state.initState(seed);
  const s2 = state.initState(seed);

  assert.equal(s1.rng_state, s2.rng_state, 'Same seed => same initial rng_state');

  const {rng_state: rs1, value: v1} = rng.nextRng(s1.rng_state);
  const {rng_state: rs2, value: v2} = rng.nextRng(s1.rng_state); // Use s1.rng_state again

  assert.equal(rs1, rs2, 'nextRng is deterministic');
  assert.equal(v1, v2, 'nextRng values are deterministic');

  // Transition without consuming RNG should leave rng_state unchanged
  let s3 = state.initState(seed);
  const rs_before = s3.rng_state;
  const s3_after = transition.transition(s3, [{ kind: 'Buy' }]);
  // RNG unchanged unless explicitly consumed
  assert.equal(s3_after.rng_state, rs_before, 'RNG state unchanged by transition without consumption');
});

// R4: Replay consistency - replay vs step-by-step; two replays equal
test('R4: replay is consistent and deterministic', () => {
  const seed = 11111;
  const s0 = state.initState(seed);
  const inputs = [
    { kind: 'Reroll' },
    { kind: 'Lock' },
    { kind: 'ConfirmPreparation' }
  ];

  // Method 1: Replay
  const replayResult = replay.replay(s0, inputs);

  // Method 2: Step-by-step
  let s = s0;
  for (const inp of inputs) {
    s = transition.transition(s, [inp]);
  }

  assert.ok(serialize.statesEqual(replayResult.finalState, s), 'Replay equals step-by-step');
  assert.deepEqual(replayResult.eventLog, s.eventLog, 'Event logs match');

  // Replay again should be identical
  const replayResult2 = replay.replay(s0, inputs);
  assert.ok(serialize.statesEqual(replayResult.finalState, replayResult2.finalState), 'Two replays are equal');
  assert.deepEqual(replayResult.eventLog, replayResult2.eventLog, 'Event logs are equal on replay');
});

// R5: Event log immutability - appendEvent returns new log without mutation
test('R5: event log is append-only and immutable', () => {
  const log1 = eventlog.createEventLog();
  const originalSerialized = serialize.serialize(log1);

  const log2 = eventlog.appendEvent(log1, { kind: 'Damage' });

  // log1 should be unchanged
  assert.deepEqual(log1, [], 'Original log unchanged after append');
  assert.equal(serialize.serialize(log1), originalSerialized, 'Original log serialization unchanged');

  // log2 should have one element
  assert.equal(log2.length, 1, 'New log has one element');
  assert.equal(log2[0].kind, 'Damage', 'Event appended correctly');
});

// R6: Event kind registry - known events pass, unknown throw
test('R6: event kind registry is frozen and validated', () => {
  assert.equal(registry.EVENT_KINDS.length, 19, 'EVENT_KINDS has 19 entries');

  registry.assertKnownEvent('Spawn');
  registry.assertKnownEvent('Victory');

  assert.throws(
    () => registry.assertKnownEvent('InvalidKind'),
    /Unknown event kind/,
    'Unknown event throws'
  );

  // Verify Object.isFrozen
  assert.ok(Object.isFrozen(registry.EVENT_KINDS), 'EVENT_KINDS is frozen');
});

// R7: Input kind registry and validation
test('R7: input kind registry and validation', () => {
  assert.equal(registry.INPUT_KINDS.length, 7, 'INPUT_KINDS has 7 entries');

  registry.assertKnownInput('Buy');
  registry.assertKnownInput('ConfirmPreparation');

  // Validate known input
  const validInput = { kind: 'Buy' };
  const v1 = inputs.validateInputSync(validInput);
  assert.ok(v1.ok, 'Known input passes validation');

  // Validate unknown input
  const unknownInput = { kind: 'Merge' };
  const v2 = inputs.validateInputSync(unknownInput);
  assert.ok(!v2.ok, 'Unknown input fails validation deterministically');
  assert.ok(v2.reason, 'Rejection includes reason');

  assert.throws(
    () => registry.assertKnownInput('InvalidKind'),
    /Unknown input kind/,
    'Unknown input kind throws on assert'
  );

  assert.ok(Object.isFrozen(registry.INPUT_KINDS), 'INPUT_KINDS is frozen');
});

// R8: Serialization with special values
test('R8: serialization rejects NaN/Infinity and normalizes -0', () => {
  // Test -0 normalization
  const stateWith0 = state.initState(0);
  const stateWithNeg0 = { ...stateWith0, testVal: -0 };
  const serialized = serialize.serialize(stateWithNeg0);
  assert.ok(serialized.includes('"testVal":0'), 'Negative zero normalized to 0');

  // Test NaN rejection
  const stateWithNaN = { ...stateWith0, testVal: NaN };
  assert.throws(
    () => serialize.serialize(stateWithNaN),
    /Cannot serialize non-finite/,
    'NaN rejected'
  );

  // Test Infinity rejection
  const stateWithInf = { ...stateWith0, testVal: Infinity };
  assert.throws(
    () => serialize.serialize(stateWithInf),
    /Cannot serialize non-finite/,
    'Infinity rejected'
  );

  // Test undefined rejection
  const stateWithUndef = { ...stateWith0, testVal: undefined };
  assert.throws(
    () => serialize.serialize(stateWithUndef),
    /Cannot serialize undefined/,
    'undefined rejected'
  );
});

// R9: Types abstraction - no content symbols
test('R9: types exports only abstract identifiers', () => {
  // Exports should be generic
  const eid = types.makeEntityId(42);
  assert.equal(typeof eid, 'string', 'Entity ID is a string');
  assert.ok(eid.startsWith('entity_'), 'Entity ID has generic format');

  const pid = types.makePlayerId(1);
  assert.equal(typeof pid, 'string', 'Player ID is a string');
  assert.ok(pid.startsWith('player_'), 'Player ID has generic format');

  // Type predicates should be content-agnostic
  assert.ok(types.isInput({ kind: 'AnyKind' }), 'isInput accepts any kind');
  assert.ok(types.isEvent({ kind: 'AnyEvent' }), 'isEvent accepts any kind');
  assert.ok(types.isState(state.initState(0)), 'isState accepts valid state');
});

// R10: Match execution - no crashes with valid inputs
test('R10: runMatch completes with valid inputs', () => {
  const seed = 42;
  const inputs = [
    { kind: 'Buy' },
    { kind: 'Lock' },
    { kind: 'ConfirmPreparation' }
  ];

  const result = match.runMatch(seed, inputs);

  assert.ok(types.isState(result.finalState), 'Result has valid state');
  assert.ok(Array.isArray(result.eventLog), 'Result has event log');
  assert.ok(result.eventLog.length > 0, 'Event log contains events');

  // Empty input log should still work
  const result2 = match.runMatch(seed, []);
  assert.ok(types.isState(result2.finalState), 'Match with empty inputs completes');
  assert.ok(Array.isArray(result2.eventLog), 'Event log exists even for empty inputs');
});

// --- Mutation-hardening tests (s9 escalation: kill mutation survivors) ---

// R11: RNG golden vector - pins the exact deterministic sequence for a known seed.
// Kills arithmetic mutants inside mulberry32 (e.g. pluseq->minuseq on the increment)
// that would still be "deterministic" but produce a DIFFERENT sequence.
test('R11: RNG golden vector for seed 42 is pinned exactly', () => {
  const seed = 42;
  const s0 = rng.seedRng(seed);
  assert.equal(s0, 2581720956, 'seedRng(42) golden value');

  const expected = [
    { value: 1063514341, rng_state: 1936170500 },
    { value: 2222915051, rng_state: 3340294976 },
    { value: 3752556489, rng_state: 26642651 },
    { value: 893971743, rng_state: 4129019110 },
    { value: 1396398114, rng_state: 663931296 }
  ];

  let cur = s0;
  for (let i = 0; i < expected.length; i++) {
    const { rng_state, value } = rng.nextRng(cur);
    assert.equal(value, expected[i].value, `nextRng step ${i}: value pinned to golden vector`);
    assert.equal(rng_state, expected[i].rng_state, `nextRng step ${i}: rng_state pinned to golden vector`);
    cur = rng_state;
  }
});

// R12: RNG rejects a non-integer numeric seed/state explicitly (not just non-numbers).
// Kills the or->and mutant on the `typeof !== 'number' || !Number.isInteger(...)` guard:
// with `&&` a non-integer number like 3.5 would silently pass through.
test('R12: RNG rejects non-integer numeric seed and state', () => {
  assert.throws(() => rng.seedRng(3.5), /Seed must be an integer/, 'seedRng rejects non-integer number');
  assert.throws(() => rng.seedRng('42'), /Seed must be an integer/, 'seedRng rejects non-number type');
  assert.throws(() => rng.nextRng(3.5), /RNG state must be an integer/, 'nextRng rejects non-integer number');
  assert.throws(() => rng.nextRng('42'), /RNG state must be an integer/, 'nextRng rejects non-number type');
});

// R13: serialize deep-sorts nested object keys alphabetically, at every level.
// Kills the eq->neq mutant on `typeof obj === 'object'` inside deepSortKeys: with
// `!==` real nested objects would skip sorting/recursion and come out unsorted.
test('R13: serialize sorts nested object keys alphabetically', () => {
  const obj = { b: 1, a: 2, nested: { z: 1, m: 2 }, list: [{ y: 1, x: 2 }] };
  const result = serialize.serialize(obj);
  assert.equal(
    result,
    '{"a":2,"b":1,"list":[{"x":2,"y":1}],"nested":{"m":2,"z":1}}',
    'Keys are sorted alphabetically at every nesting level'
  );
});

// R14: serialize/statesEqual handle null nested values safely, and statesEqual is
// correct in BOTH directions. Kills the neq->eq mutant on `obj !== null` inside
// deepSortKeys: with `===` a null value would wrongly enter the object branch and
// crash on Object.keys(null).
test('R14: serialize handles null nested values safely; statesEqual both directions', () => {
  const objWithNull = { a: null, b: 1 };
  assert.doesNotThrow(() => serialize.serialize(objWithNull), 'null value must not crash sorting');
  assert.equal(serialize.serialize(objWithNull), '{"a":null,"b":1}', 'null value preserved verbatim');

  const a1 = { x: 1, y: 2 };
  const a2 = { y: 2, x: 1 };
  assert.ok(serialize.statesEqual(a1, a2), 'Same content, different key order => equal');

  const b1 = { x: 1, y: 2 };
  const b2 = { x: 1, y: 3 };
  assert.ok(!serialize.statesEqual(b1, b2), 'Different content => not equal');
});

// R15: validateInput returns ok:false EXPLICITLY (strict boolean, not truthy) for a
// missing kind, and ok:true explicitly for each of the 7 known kinds. Kills the
// false->true mutant on the "missing kind" rejection branch.
test('R15: validateInput returns ok:false explicitly when kind is missing; ok:true for all known kinds', () => {
  const r1 = inputs.validateInput({});
  assert.equal(r1.ok, false, 'Object without kind must yield ok:false');
  assert.equal(r1.reason, 'Input missing kind property');

  const r2 = inputs.validateInput(null);
  assert.equal(r2.ok, false, 'null must yield ok:false');

  const r3 = inputs.validateInput('not-an-input');
  assert.equal(r3.ok, false, 'non-object must yield ok:false');

  for (const kind of registry.INPUT_KINDS) {
    const r = inputs.validateInput({ kind });
    assert.equal(r.ok, true, `Known kind ${kind} must validate ok:true`);
  }
});

// R16: applyInput advances phase to 'Battle' if-and-only-if the input is
// ConfirmPreparation. Kills the eq->neq mutant on `input.kind === 'ConfirmPreparation'`.
test('R16: applyInput phase transition is exact', () => {
  const s0 = state.initState(7);
  assert.equal(s0.phase, 'Shop', 'Initial phase is Shop');

  const s1 = transition.applyInput(s0, { kind: 'Buy' });
  assert.equal(s1.phase, 'Shop', 'Non-ConfirmPreparation input leaves phase unchanged');

  const s2 = transition.applyInput(s0, { kind: 'ConfirmPreparation' });
  assert.equal(s2.phase, 'Battle', 'ConfirmPreparation input advances phase to Battle');
});

// R17: initState/createGameState reject invalid seed and fields explicitly. Kills the
// or->and mutants on the seed-shape guard (L6) and the fields-shape guard (L23): with
// `&&` a non-integer number, or a truthy non-object `fields`, would silently pass.
test('R17: initState and createGameState validate inputs strictly', () => {
  assert.throws(() => state.initState(3.5), /Seed must be an integer/, 'initState rejects non-integer number');
  assert.throws(() => state.initState('7'), /Seed must be an integer/, 'initState rejects non-number type');

  assert.throws(() => state.createGameState(null), /Fields must be an object/, 'createGameState rejects null');
  assert.throws(
    () => state.createGameState('nope'),
    /Fields must be an object/,
    'createGameState rejects a truthy non-object value'
  );
});

// R18: freezeState deep-freezes every nested array item, object property, AND their
// own children (grandchildren). The grandchild checks matter: deepFreeze's top-level
// `Object.freeze(obj)` call already freezes a direct child unconditionally, so only
// testing direct children cannot observe whether recursion into a child's OWN
// properties was skipped. Kills eq->neq/neq->eq on the null/object guards at every
// level (array-item guard, object-property guard, and the recursive object guard).
test('R18: freezeState deep-freezes nested arrays, objects, and grandchildren', () => {
  const grandchildViaArray = { source: 'x' };
  const arrayItem = { hp: 10, meta: grandchildViaArray };
  const grandchildViaObject = { rarity: 'common' };
  const objectPropChild = { name: 'unit_1', tags: grandchildViaObject };

  const raw = state.createGameState({
    seed: 1,
    rng_state: 1,
    eventLog: [arrayItem],
    players: { p1: objectPropChild },
    entities: {},
    phase: 'Shop'
  });

  const frozen = state.freezeState(raw);

  assert.ok(Object.isFrozen(frozen.eventLog[0]), 'Object nested inside an array is frozen');
  assert.ok(Object.isFrozen(frozen.eventLog[0].meta), 'Grandchild nested inside an array item is deep-frozen');
  assert.ok(Object.isFrozen(frozen.players.p1), 'Object nested inside an object property is frozen');
  assert.ok(Object.isFrozen(frozen.players.p1.tags), 'Grandchild nested inside an object property is deep-frozen');

  // Mutation attempts must never take effect, whether frozen-write throws (strict mode)
  // or silently no-ops - either is acceptable, only the resulting value is checked.
  try { frozen.eventLog[0].meta.source = 'hacked'; } catch (e) { /* strict-mode throw is fine */ }
  assert.equal(frozen.eventLog[0].meta.source, 'x', 'Deep-frozen grandchild (array path) is truly immutable');

  try { frozen.players.p1.tags.rarity = 'hacked'; } catch (e) { /* strict-mode throw is fine */ }
  assert.equal(frozen.players.p1.tags.rarity, 'common', 'Deep-frozen grandchild (object path) is truly immutable');
});

// R19: type predicates and ID makers are strict, not just truthy-based. Kills the
// and->or mutants on the short-circuit chains in isInput/isEvent (a single true
// condition must NOT be enough) and the two-guard chains in makeEntityId/makePlayerId
// (each individual guard - negative, non-integer - must independently throw).
test('R19: type predicates and ID makers are strict', () => {
  assert.equal(types.isInput({}), false, 'Object without kind is not a valid input');
  assert.equal(types.isInput(null), false, 'null is not a valid input');
  const fnWithKind1 = function () {};
  fnWithKind1.kind = 'Test';
  assert.equal(types.isInput(fnWithKind1), false, 'Non-object (function) with a kind prop is not a valid input');

  assert.equal(types.isEvent({}), false, 'Object without kind is not a valid event');
  assert.equal(types.isEvent(null), false, 'null is not a valid event');
  const fnWithKind2 = function () {};
  fnWithKind2.kind = 'Test';
  assert.equal(types.isEvent(fnWithKind2), false, 'Non-object (function) with a kind prop is not a valid event');

  assert.throws(() => types.makeEntityId(-1), 'makeEntityId rejects a negative integer');
  assert.throws(() => types.makeEntityId(1.5), 'makeEntityId rejects a non-integer number');
  assert.throws(() => types.makeEntityId('1'), 'makeEntityId rejects a non-number type');

  assert.throws(() => types.makePlayerId(-1), 'makePlayerId rejects a negative integer');
  assert.throws(() => types.makePlayerId(1.5), 'makePlayerId rejects a non-integer number');
  assert.throws(() => types.makePlayerId('1'), 'makePlayerId rejects a non-number type');
});

// R20: isState rejects a state with exactly ONE invalid field, while still accepting
// a fully valid state. Kills the and->or mutants across the 7-condition chain in
// isState (a single true condition following a false one must NOT make it pass).
test('R20: isState rejects each field individually while accepting a fully valid state', () => {
  const valid = state.initState(1);
  assert.ok(types.isState(valid), 'Fully valid state is accepted');

  assert.equal(types.isState(null), false, 'null is rejected');
  assert.equal(types.isState('not-a-state'), false, 'non-object is rejected');
  assert.equal(types.isState({ ...valid, seed: 'bad' }), false, 'non-number seed is rejected');
  assert.equal(types.isState({ ...valid, rng_state: 'bad' }), false, 'non-number rng_state is rejected');
  assert.equal(types.isState({ ...valid, eventLog: {} }), false, 'non-array eventLog is rejected');
  assert.equal(types.isState({ ...valid, players: 'nope' }), false, 'non-object players is rejected');
  assert.equal(types.isState({ ...valid, entities: 'nope' }), false, 'non-object entities is rejected');
  assert.equal(types.isState({ ...valid, phase: 42 }), false, 'non-string phase is rejected');
});

// R21: runMatch rejects a non-integer numeric seed explicitly. Kills the or->and
// mutant on match.mjs's own copy of the seed-shape guard.
test('R21: runMatch validates seed strictly', () => {
  assert.throws(() => match.runMatch(3.5, []), /Seed must be an integer/, 'runMatch rejects non-integer number');
  assert.throws(() => match.runMatch('7', []), /Seed must be an integer/, 'runMatch rejects non-number type');
});

// --- s9 red-team correction tests (F1/F2/F3/F4): these FAIL on the pre-fix code ---

// R22: createGameState performs a genuine DEEP clone of players/entities - the output
// state must share NO mutable reference with the input state's nested substructures,
// at any depth. This is the exact F1 red-team-proven leak: before the fix,
// `{...fields.players}` only copied the TOP level, so after transition(s0,[]),
// mutating s1.players.player_0.gold also silently mutated s0.
test('R22: transition output shares no nested references with input (deep purity)', () => {
  const s0 = state.createGameState({
    seed: 1,
    rng_state: 1,
    eventLog: [],
    players: { player_0: { gold: 1, bench: [{ id: 'unit_1' }] } },
    entities: { entity_0: { hp: 10, tags: { rarity: 'common' } } },
    phase: 'Shop'
  });

  const s1 = transition.transition(s0, []);

  // Mutate every level of the OUTPUT state's nested substructures.
  s1.players.player_0.gold = 999;
  s1.players.player_0.bench[0].id = 'hacked';
  s1.players.player_0.bench.push({ id: 'injected' });
  s1.entities.entity_0.hp = 0;
  s1.entities.entity_0.tags.rarity = 'hacked';

  // The INPUT state must be entirely unaffected.
  assert.equal(s0.players.player_0.gold, 1, 'input player gold unchanged');
  assert.equal(s0.players.player_0.bench.length, 1, 'input bench length unchanged');
  assert.equal(s0.players.player_0.bench[0].id, 'unit_1', 'input bench item unchanged');
  assert.equal(s0.entities.entity_0.hp, 10, 'input entity hp unchanged');
  assert.equal(s0.entities.entity_0.tags.rarity, 'common', 'input entity tag unchanged');

  // No reference identity is shared at any level.
  assert.notEqual(s1.players, s0.players, 'players object is a new reference');
  assert.notEqual(s1.players.player_0, s0.players.player_0, 'nested player object is a new reference');
  assert.notEqual(s1.players.player_0.bench, s0.players.player_0.bench, 'nested bench array is a new reference');
  assert.notEqual(s1.players.player_0.bench[0], s0.players.player_0.bench[0], 'bench item is a new reference');
});

// R23: eventLog elements are deep-cloned at every createGameState construction - not
// just the array wrapper. This is the exact F4 red-team-proven leak: `[...eventLog]`
// copies the array but keeps the SAME element references, so
// `s1.eventLog[0] === s2.eventLog[0]`, and freezeState(s2) would freeze s1's event too.
test('R23: eventLog elements share no references across states (deep purity)', () => {
  const s0 = state.createGameState({
    seed: 1,
    rng_state: 1,
    eventLog: [{ kind: 'Spawn', meta: { source: 'x' } }],
    players: {},
    entities: {},
    phase: 'Shop'
  });

  const s1 = transition.transition(s0, []);

  assert.notEqual(s1.eventLog[0], s0.eventLog[0], 'event object is a new reference');
  assert.notEqual(s1.eventLog[0].meta, s0.eventLog[0].meta, 'nested event field is a new reference');

  s1.eventLog[0].meta.source = 'hacked';
  assert.equal(s0.eventLog[0].meta.source, 'x', 'input event nested field unchanged after output mutation');

  // Freezing one state's eventLog element must not freeze another state's element.
  const frozen = state.freezeState(s1);
  assert.ok(Object.isFrozen(frozen.eventLog[0]), 'output event is frozen');
  assert.ok(!Object.isFrozen(s0.eventLog[0]), 'input event must remain unfrozen (no shared reference)');
});

// R24: serialize rejects Map, Set, and Date explicitly (fail-hard) instead of silently
// collapsing them to "{}" (Object.keys() on a Map/Set/Date is [], since their data
// lives outside own enumerable properties) - the exact F2 red-team-proven bug that let
// two DIFFERENT Maps hash identically and pass statesEqual as "equal".
test('R24: serialize rejects Map, Set, and Date instead of silently collapsing them', () => {
  assert.throws(
    () => serialize.serialize({ a: new Map([['x', 1]]) }),
    /Cannot serialize non-plain object/,
    'Map is rejected'
  );
  assert.throws(
    () => serialize.serialize({ a: new Set([1, 2]) }),
    /Cannot serialize non-plain object/,
    'Set is rejected'
  );
  assert.throws(
    () => serialize.serialize({ a: new Date(0) }),
    /Cannot serialize non-plain object/,
    'Date is rejected'
  );

  // Two different Maps must NOT silently collapse to the same (empty) serialization -
  // both must throw, neither must produce a comparable "{}" string.
  assert.throws(() => serialize.serialize({ a: new Map([['x', 1]]) }));
  assert.throws(() => serialize.serialize({ a: new Map([['x', 2]]) }));
});

// R25: serialize detects circular references and throws a typed domain error - NOT the
// native RangeError "Maximum call stack size exceeded" (the F3 red-team-proven crash).
test('R25: serialize rejects circular references with a typed error, not a raw RangeError', () => {
  const circularObj = { a: 1 };
  circularObj.self = circularObj;
  assert.throws(
    () => serialize.serialize(circularObj),
    /Cannot serialize circular reference/,
    'Circular object throws typed domain error'
  );

  const circularArr = [];
  circularArr.push(circularArr);
  assert.throws(
    () => serialize.serialize({ list: circularArr }),
    /Cannot serialize circular reference/,
    'Circular array throws typed domain error'
  );

  try {
    serialize.serialize(circularObj);
    assert.fail('Expected serialize to throw on circular reference');
  } catch (e) {
    assert.ok(!(e instanceof RangeError), 'Must not be the native "Maximum call stack" RangeError');
    assert.ok(e.message.includes('circular'), 'Error message names the circular condition');
  }

  // A shared (non-cyclic) reference reached via two sibling branches - a DAG, not a
  // cycle - must NOT be a false positive.
  const shared = { v: 1 };
  const dag = { left: shared, right: shared };
  assert.doesNotThrow(() => serialize.serialize(dag), 'Shared non-cyclic reference is not a false-positive cycle');
});

// properties.test.mjs - Property-based tests with seeded randomness
import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import * as state from './engine/state.mjs';
import * as serialize from './engine/serialize.mjs';
import * as transition from './engine/transition.mjs';
import * as replay from './engine/replay.mjs';
import * as match from './engine/match.mjs';
import * as rng from './engine/rng.mjs';
import * as registry from './engine/registry.mjs';

// Seeded test PRNG (not the game PRNG)
function makeTestPRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s = ((s * 1664525) >>> 0) + 1013904223;
    return s >>> 0;
  };
}

// Generate random input based on test PRNG
function randomInput(prng) {
  const inputKinds = registry.INPUT_KINDS;
  const idx = prng() % inputKinds.length;
  return { kind: inputKinds[idx] };
}

// Property: Determinism of transition
test('Property: transition(state, inputs) is deterministic across multiple seeds', () => {
  const prng = makeTestPRNG(12345);

  for (let testRun = 0; testRun < 50; testRun++) {
    const gameSeed = prng() % 100000;
    const inputCount = (prng() % 5) + 1; // 1-5 inputs

    const s0 = state.initState(gameSeed);
    const inputs = [];
    for (let i = 0; i < inputCount; i++) {
      inputs.push(randomInput(prng));
    }

    // Run transition twice
    const r1 = transition.transition(s0, inputs);
    const r2 = transition.transition(s0, inputs);

    assert.ok(serialize.statesEqual(r1, r2), `Run ${testRun}: transitions are deterministic`);
  }
});

// Property: Replay determinism
test('Property: replay is deterministic for various input sequences', () => {
  const prng = makeTestPRNG(54321);

  for (let testRun = 0; testRun < 50; testRun++) {
    const gameSeed = prng() % 100000;
    const inputCount = (prng() % 8) + 1; // 1-8 inputs

    const s0 = state.initState(gameSeed);
    const inputs = [];
    for (let i = 0; i < inputCount; i++) {
      inputs.push(randomInput(prng));
    }

    // Replay twice
    const r1 = replay.replay(s0, inputs);
    const r2 = replay.replay(s0, inputs);

    assert.ok(serialize.statesEqual(r1.finalState, r2.finalState), `Run ${testRun}: replay finals equal`);
    assert.deepEqual(r1.eventLog, r2.eventLog, `Run ${testRun}: replay event logs equal`);
  }
});

// Property: statesEqual is reflexive and symmetric
test('Property: statesEqual is reflexive and symmetric', () => {
  const prng = makeTestPRNG(99999);

  for (let testRun = 0; testRun < 30; testRun++) {
    const gameSeed = prng() % 100000;
    const s = state.initState(gameSeed);

    // Reflexive: s equals itself
    assert.ok(serialize.statesEqual(s, s), `Run ${testRun}: state equals itself (reflexive)`);

    // Apply random inputs
    const inputs = [];
    for (let i = 0; i < 3; i++) {
      inputs.push(randomInput(prng));
    }
    const s2 = transition.transition(s, inputs);

    // Symmetric: if s2 == s3 then s3 == s2
    const s3 = transition.transition(s, inputs);
    const s2_eq_s3 = serialize.statesEqual(s2, s3);
    const s3_eq_s2 = serialize.statesEqual(s3, s2);

    assert.equal(s2_eq_s3, s3_eq_s2, `Run ${testRun}: statesEqual is symmetric`);
  }
});

// Property: RNG state remains uint32
test('Property: RNG state is always uint32', () => {
  const prng = makeTestPRNG(11111);

  for (let testRun = 0; testRun < 50; testRun++) {
    const gameSeed = prng() % 100000;
    const s = state.initState(gameSeed);

    // Check initial rng_state is uint32
    assert.ok(Number.isInteger(s.rng_state), `Run ${testRun}: rng_state is integer`);
    assert.ok(s.rng_state >= 0, `Run ${testRun}: rng_state >= 0`);
    assert.ok(s.rng_state <= 0xFFFFFFFF, `Run ${testRun}: rng_state <= 2^32-1`);

    // Apply random inputs and check RNG still uint32
    const inputs = [];
    for (let i = 0; i < 5; i++) {
      inputs.push(randomInput(prng));
    }
    const s2 = transition.transition(s, inputs);

    assert.ok(Number.isInteger(s2.rng_state), `Run ${testRun}: rng_state after transition is integer`);
    assert.ok(s2.rng_state >= 0, `Run ${testRun}: rng_state after transition >= 0`);
    assert.ok(s2.rng_state <= 0xFFFFFFFF, `Run ${testRun}: rng_state after transition <= 2^32-1`);
  }
});

// Property: Match completion with random inputs
test('Property: runMatch completes for random input sequences', () => {
  const prng = makeTestPRNG(22222);

  for (let testRun = 0; testRun < 40; testRun++) {
    const seed = prng() % 100000;
    const inputCount = (prng() % 10) + 1; // 1-10 inputs

    const inputs = [];
    for (let i = 0; i < inputCount; i++) {
      inputs.push(randomInput(prng));
    }

    const result = match.runMatch(seed, inputs);

    assert.ok(result.finalState, `Run ${testRun}: match returns finalState`);
    assert.ok(Array.isArray(result.eventLog), `Run ${testRun}: match returns eventLog array`);
    assert.ok(result.eventLog.length >= 0, `Run ${testRun}: event log is valid`);
  }
});

// Property: Serialization consistency
test('Property: serialize is consistent for same state', () => {
  const prng = makeTestPRNG(33333);

  for (let testRun = 0; testRun < 30; testRun++) {
    const gameSeed = prng() % 100000;
    const s = state.initState(gameSeed);

    // Serialize same state multiple times
    const s1 = serialize.serialize(s);
    const s2 = serialize.serialize(s);
    const s3 = serialize.serialize(s);

    assert.equal(s1, s2, `Run ${testRun}: serialize is consistent (1)`);
    assert.equal(s2, s3, `Run ${testRun}: serialize is consistent (2)`);
  }
});

import { strict as assert } from 'assert';
import { test } from 'node:test';
import { step } from '../sim/step.mjs';
import { initGameState, copyState } from '../sim/state.mjs';
import { hashState } from '../sim/hash.mjs';
import { evaluateEndConditions, isGameOver } from '../sim/end.mjs';
import { pathCells } from '../config/geometry.mjs';
import { TOWER_TYPES } from '../config/towers.mjs';
import { ENEMY_TYPES } from '../config/enemies.mjs';

const PATH = pathCells();
const ENTRY = PATH[0]; // [19, 0]

// A state parked mid-wave: no preparation countdown to fire, and `waveSpawned`
// false so the wave-clear transition never triggers behind the assertion under
// test. Everything the test cares about is then set explicitly.
const midWave = () => {
  const state = initGameState(1337);
  state.phase = 'SPAWNING';
  state.waveSpawned = false;
  state.enemies = [];
  state.towers = [];
  return state;
};

const foe = (over = {}) => ({
  id: 1, type: ENEMY_TYPES.GRUNT, x: ENTRY[0], y: ENTRY[1], progress: 0, hp: 40,
  frosts: [], spawnTime: 0, spawnDelay: 0, bountyAwarded: false, ...over
});

const towerAtEntry = (type, over = {}) => ({
  id: 1, x: ENTRY[0], y: ENTRY[1], type, level: 1, cooldownMs: 0, ...over
});

test('R40: the opening state is the exact frozen position', () => {
  const state = initGameState(1337);
  assert.equal(state.tick, 0);
  assert.equal(state.seed, 1337);
  assert.equal(state.phase, 'PREPARATION');
  assert.equal(state.wave, 1);
  assert.equal(state.wavePhaseTime, 0);
  assert.equal(state.waveSpawned, false, 'no wave has spawned at boot');
  assert.equal(state.gold, 100);
  assert.equal(state.lives, 20);
  assert.equal(state.leaks, 0);
  assert.equal(state.result, null);
  assert.deepEqual(state.towers, []);
  assert.deepEqual(state.enemies, []);
  assert.deepEqual(state.projectiles, []);
  assert.deepEqual(state.goldLedger, { bounty: 0, wave_bonus: 0, early_bonus: 0, spend: 0 });
});

test('R31: step advances the tick counter by exactly 1, at the fixed step', () => {
  const state = midWave();
  step(state);
  assert.equal(state.tick, 1, 'the default dt is the fixed TICK_MS');
  step(state, 16);
  assert.equal(state.tick, 2);
});

test('R34/R35: a finished game is frozen — step is a no-op once result is set', () => {
  const state = midWave();
  state.result = 'VICTORY';
  assert.equal(isGameOver(state), true);
  const before = copyState(state);
  step(state, 16);
  assert.equal(state.tick, before.tick, 'no tick is consumed after the game ends');
  assert.equal(state.gold, before.gold);
});

test('R31: an enemy starts moving on EXACTLY the tick its spawn time is reached', () => {
  const state = midWave();
  state.enemies = [foe({ spawnTime: 5, spawnDelay: 0 })]; // due at tick 5 (80ms)
  for (let i = 0; i < 4; i++) step(state, 16);
  assert.equal(state.tick, 4);
  assert.equal(state.enemies[0].progress, 0, 'still held at the gate at 64ms');
  step(state, 16);
  assert.equal(state.tick, 5);
  assert.equal(state.enemies[0].progress, 0.032, 'moves exactly one tick of travel at 80ms');
});

test('R14: a tower fires at its declared cadence, not once per tick', () => {
  const state = midWave();
  state.towers = [towerAtEntry(TOWER_TYPES.GUN)];
  state.enemies = [foe()];
  step(state, 16);
  step(state, 16);
  step(state, 16);
  // Gun = 2 shots/s = one shot per 500ms; three 16ms ticks hold exactly one.
  assert.equal(state.enemies[0].hp, 34, 'exactly one 6-damage shot in 48ms');
  assert.equal(state.towers[0].cooldownMs, 468);
});

test('R7: a Frost tower chills its target through the real step loop', () => {
  const state = midWave();
  state.towers = [towerAtEntry(TOWER_TYPES.FROST)];
  state.enemies = [foe()];
  step(state, 16);
  assert.equal(state.enemies[0].hp, 37, 'Frost L1 deals exactly 3');
  assert.deepEqual(state.enemies[0].frosts, [{ appliedAt: 0, duration: 1.0, mult: 0.55 }]);
});

test('R10: a Cannon splashes a second enemy through the real step loop', () => {
  const state = midWave();
  state.towers = [towerAtEntry(TOWER_TYPES.CANNON)];
  state.enemies = [foe({ id: 1, progress: 0.2 }), foe({ id: 2, progress: 0 })];
  step(state, 16);
  // The most advanced enemy is the target; it eats the direct hit AND its own
  // splash (22 + 22, clamped at 0). The neighbour eats the splash alone.
  assert.equal(state.enemies[0].hp, 0);
  assert.equal(state.enemies[1].hp, 18, 'the neighbour took exactly one 22-damage splash');
  assert.equal(state.gold, 108, 'the dead target paid its 8-gold bounty exactly once');
});

test('R13: a corpse is kept for one bounty pass, then paid EXACTLY once, ever', () => {
  const state = midWave();
  state.enemies = [foe({ hp: 0 })];
  step(state, 16);
  assert.equal(state.enemies.length, 1, 'the corpse is kept in the list for the bounty pass');
  assert.equal(state.enemies[0].bountyAwarded, true);
  assert.equal(state.gold, 108);
  step(state, 16);
  assert.equal(state.gold, 108, 'a second tick never re-pays the same corpse');
  assert.equal(state.goldLedger.bounty, 8);
});

test('R13: a LIVE enemy is never paid out by the cleanup pass', () => {
  const state = midWave();
  state.enemies = [
    foe({ id: 1, hp: 0 }),
    foe({ id: 2, hp: 40, spawnTime: 9999 }) // alive, held at the gate
  ];
  step(state, 16);
  assert.equal(state.gold, 108, 'exactly one bounty, for the one corpse');
  assert.equal(state.enemies[1].hp, 40);
  assert.equal(state.enemies[1].bountyAwarded, false);
});

test('R16: an enemy reaching the exit leaks — lives and leak count move exactly', () => {
  const state = midWave();
  // Brute at 1.0 case/s covers exactly 1 case in 1000ms, landing on PATH.length.
  state.enemies = [foe({ type: ENEMY_TYPES.BRUTE, hp: 50, progress: PATH.length - 1 })];
  step(state, 1000);
  assert.equal(state.leaks, 1);
  assert.equal(state.lives, 15, 'a Brute leak costs exactly 5 lives');
  assert.equal(state.enemies.length, 0, 'the leaked enemy leaves the field');
});

test('R18: clearing a wave pays the exact bonus and opens the next preparation', () => {
  const state = midWave();
  state.wave = 3;
  state.waveSpawned = true;
  state.enemies = [];
  step(state, 16);
  assert.equal(state.gold, 135, '100 + (20 + 5 x 3)');
  assert.equal(state.goldLedger.wave_bonus, 35);
  assert.equal(state.wave, 4);
  assert.equal(state.phase, 'PREPARATION');
  assert.equal(state.waveSpawned, false);
  assert.equal(state.wavePhaseTime, 0);
  assert.equal(state.result, null);
});

test('R34: clearing wave 10 ends the run in VICTORY, with the exact final bonus', () => {
  const state = midWave();
  state.wave = 10;
  state.waveSpawned = true;
  state.enemies = [];
  step(state, 16);
  assert.equal(state.wave, 11);
  assert.equal(state.gold, 170, '100 + (20 + 5 x 10)');
  assert.equal(state.result, 'VICTORY');
  assert.equal(state.phase, 'VICTORY');
});

test('R35: reaching exactly 0 lives ends the run in DEFEAT', () => {
  const state = midWave();
  state.lives = 5;
  state.enemies = [foe({ type: ENEMY_TYPES.BRUTE, hp: 50, progress: PATH.length - 1 })];
  step(state, 1000);
  assert.equal(state.lives, 0);
  assert.equal(state.result, 'DEFEAT');
  assert.equal(state.phase, 'DEFEAT');
});

test('R35: end conditions are exact — one life left is not a defeat', () => {
  const state = midWave();
  state.lives = 1;
  assert.equal(evaluateEndConditions(state), null);
  assert.equal(state.result, null);
  state.lives = 0;
  assert.equal(evaluateEndConditions(state), 'DEFEAT');
  assert.equal(state.result, 'DEFEAT');
});

test('R43: the step loop records a shot when a tower fires, and ages it out', () => {
  const state = midWave();
  state.towers = [towerAtEntry(TOWER_TYPES.GUN)];
  state.enemies = [foe({ hp: 400 })];
  step(state, 16);
  assert.equal(state.projectiles.length, 1, 'the shot is visible on the tick it is fired');
  assert.equal(state.projectiles[0].kind, TOWER_TYPES.GUN);
  assert.equal(state.projectiles[0].elapsed, 0);

  // 7 more 16ms ticks = 112ms elapsed: still inside the 120ms lifetime.
  for (let i = 0; i < 7; i++) step(state, 16);
  assert.equal(state.projectiles.length, 1, 'still visible at 112ms');
  assert.equal(state.projectiles[0].elapsed, 112);
  step(state, 16);
  assert.deepEqual(state.projectiles, [], 'gone at 128ms, past its 120ms lifetime');
});

test('R32: the same seed and the same ticks produce a STRICTLY equal state hash', () => {
  const run = () => {
    const state = midWave();
    state.towers = [towerAtEntry(TOWER_TYPES.GUN)];
    state.enemies = [foe({ id: 1 }), foe({ id: 2, progress: 0.5 })];
    for (let i = 0; i < 120; i++) step(state, 16);
    return { hash: hashState(state), state };
  };
  const a = run();
  const b = run();
  assert.equal(a.hash, b.hash, 'two identical replays hash identically');
  assert.equal(a.state.gold, b.state.gold);
  assert.equal(a.state.tick, 120);

  // Falsification twin: a state that genuinely differs must NOT share the hash.
  const c = run();
  c.state.gold += 1;
  assert.notEqual(hashState(c.state), a.hash, 'a changed state changes the hash');
});

test('R40: copyState is a deep, independent snapshot', () => {
  const state = midWave();
  state.towers = [towerAtEntry(TOWER_TYPES.GUN)];
  state.enemies = [foe()];
  const snap = copyState(state);
  assert.equal(snap.gold, 100);
  assert.deepEqual(snap.towers, state.towers);

  state.gold = 42;
  state.towers[0].level = 3;
  state.enemies[0].hp = 1;
  assert.equal(snap.gold, 100, 'the snapshot does not follow later mutations');
  assert.equal(snap.towers[0].level, 1);
  assert.equal(snap.enemies[0].hp, 40);
});

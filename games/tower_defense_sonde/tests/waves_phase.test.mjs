import { strict as assert } from 'assert';
import { test } from 'node:test';
import { updatePreparation, callWave, spawnWave, isWaveCleared } from '../sim/waves.mjs';
import { initGameState } from '../sim/state.mjs';
import { wavePrepTime } from '../config/waves.mjs';
import { pathCells } from '../config/geometry.mjs';

const PREP_MS = wavePrepTime() * 1000; // 15000
const SPAWN_CELL = pathCells()[0];      // [19, 0]

test('R28: the countdown launches the wave on EXACTLY the tick it expires', () => {
  const state = initGameState(1337);
  state.wavePhaseTime = PREP_MS - 16;
  updatePreparation(state, 16);
  assert.equal(state.phase, 'SPAWNING', 'the wave starts at exactly 15000ms elapsed');
  assert.equal(state.wavePhaseTime, 0, 'the phase clock resets on launch');
  assert.equal(state.enemies.length, 5, 'wave 1 = exactly 5 Grunts');
  assert.equal(state.goldLedger.early_bonus, 0, 'a wave that ran its full countdown pays no bonus');
});

test('R28: one tick short of the countdown, nothing happens at all', () => {
  const state = initGameState(1337);
  state.wavePhaseTime = PREP_MS - 32;
  updatePreparation(state, 16);
  assert.equal(state.phase, 'PREPARATION');
  assert.equal(state.wavePhaseTime, PREP_MS - 16);
  assert.equal(state.enemies.length, 0);
});

test('R28: updatePreparation only ever ticks the PREPARATION phase', () => {
  for (const phase of ['SPAWNING', 'VICTORY', 'DEFEAT']) {
    const state = initGameState(1337);
    state.phase = phase;
    state.wavePhaseTime = PREP_MS + 5000;
    updatePreparation(state, 16);
    assert.equal(state.phase, phase, `${phase} is left untouched`);
    assert.equal(state.wavePhaseTime, PREP_MS + 5000, `${phase} does not advance the phase clock`);
    assert.equal(state.enemies.length, 0, `${phase} spawns nothing`);
  }
});

test('R19/R30: calling early pays the exact remaining-time bonus and spawns immediately', () => {
  const state = initGameState(1337);
  state.wavePhaseTime = 5000; // 10 s remaining -> 20 gold, under the 30 cap
  callWave(state);
  assert.equal(state.goldLedger.early_bonus, 20);
  assert.equal(state.gold, 120);
  assert.equal(state.phase, 'SPAWNING');
  assert.equal(state.wavePhaseTime, 0);
  assert.equal(state.enemies.length, 5);
});

test('R19: calling at t=0 pays the exact 30-gold cap', () => {
  const state = initGameState(1337);
  callWave(state);
  assert.equal(state.goldLedger.early_bonus, 30);
  assert.equal(state.gold, 130);
});

test('R25: spawnWave materialises the exact frozen composition, at the entry cell', () => {
  const state = initGameState(1337);
  state.wave = 6; // 5 Grunt + 4 Runner + 1 Brute
  spawnWave(state);
  assert.equal(state.waveSpawned, true);
  assert.equal(state.enemies.length, 10);
  assert.deepEqual(
    state.enemies.map((e) => e.type),
    ['grunt', 'grunt', 'grunt', 'grunt', 'grunt',
      'runner', 'runner', 'runner', 'runner', 'brute']
  );
  assert.deepEqual(state.enemies.map((e) => e.hp), [40, 40, 40, 40, 40, 30, 30, 30, 30, 50]);
  state.enemies.forEach((e) => {
    assert.equal(e.progress, 0, 'every enemy enters at progress 0');
    assert.deepEqual([e.x, e.y], SPAWN_CELL, 'every enemy enters on the entry cell');
    assert.equal(e.bountyAwarded, false);
    assert.deepEqual(e.frosts, []);
  });
  assert.deepEqual(state.enemies.map((e) => e.id), [
    10000, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009
  ], 'ids are assigned deterministically, never randomly');
});

test('R25: spawning wave 11 (past the calendar) materialises no enemy at all', () => {
  const state = initGameState(1337);
  state.wave = 11;
  spawnWave(state);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.waveSpawned, true, 'the flag still flips — an empty wave is instantly cleared');
});

test('R28: a wave counts as cleared only once it has spawned AND every enemy is dead', () => {
  const state = initGameState(1337);
  assert.equal(isWaveCleared(state), false, 'nothing spawned yet: not cleared');

  spawnWave(state);
  assert.equal(isWaveCleared(state), false, '5 live Grunts: not cleared');

  state.enemies.forEach((e) => { e.hp = 0; });
  assert.equal(isWaveCleared(state), true, 'all dead: cleared');

  state.enemies[2].hp = 1;
  assert.equal(isWaveCleared(state), false, 'a single survivor blocks the clear');
});

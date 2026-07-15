// Property-based tests. Run invariants over many seeds.

import { test } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { createInitialState, GAME_WIDTH, GAME_HEIGHT, SHIP_WIDTH, SHIP_HEIGHT, MAX_PROJECTILES } from './logic/state.mjs';
import { step } from './logic/step.mjs';
import { createRng } from './logic/rng.mjs';

const NUM_SEEDS = 20;
const STEPS_PER_SEED = 5000;

test('Property: Ship always in bounds (many seeds)', (t) => {
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const state = createInitialState();
    const rng = createRng(seed);

    for (let i = 0; i < STEPS_PER_SEED; i++) {
      // Use seeded RNG to generate deterministic input
      const r1 = rng();
      const r2 = rng();
      const r3 = rng();
      const inputs = { left: r1 < 0.3, right: r2 < 0.3, fire: r3 < 0.3 };

      step(state, 0.016, inputs, rng);
      ok(state.ship.x >= 0, `seed ${seed}: ship.x >= 0`);
      ok(state.ship.x + SHIP_WIDTH <= GAME_WIDTH, `seed ${seed}: ship in bounds`);
    }
  }
});

test('Property: Score monotone (many seeds)', (t) => {
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const state = createInitialState();
    const rng = createRng(seed);
    let prevScore = 0;

    for (let i = 0; i < STEPS_PER_SEED; i++) {
      step(state, 0.016, { left: false, right: false, fire: true }, rng);
      ok(state.score >= prevScore, `seed ${seed}: score monotone`);
      prevScore = state.score;
    }
  }
});

test('Property: Over is monotone (never resurrects)', (t) => {
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const state = createInitialState();
    const rng = createRng(seed);
    let isOver = false;

    for (let i = 0; i < STEPS_PER_SEED; i++) {
      step(state, 0.016, { left: false, right: false, fire: false }, rng);
      // Track if game has ever ended
      if (state.status !== 'ACTIVE' && state.status !== 'BOSS') {
        isOver = true;
      }
      // If we marked it as over, it must stay over
      if (isOver) {
        ok(state.status !== 'ACTIVE' && state.status !== 'BOSS', `seed ${seed}: over monotone`);
      }
    }
  }
});

test('Property: Projectiles pooled <= MAX_PROJECTILES', (t) => {
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const state = createInitialState();
    const rng = createRng(seed);

    for (let i = 0; i < STEPS_PER_SEED; i++) {
      step(state, 0.016, { left: false, right: false, fire: true }, rng);
      ok(state.playerProjectiles.length <= MAX_PROJECTILES, `seed ${seed}: player projectiles <= ${MAX_PROJECTILES}`);
      ok(state.enemyProjectiles.length <= MAX_PROJECTILES, `seed ${seed}: enemy projectiles <= ${MAX_PROJECTILES}`);
    }
  }
});

test('Property: Boss HP never negative', (t) => {
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const state = createInitialState();
    const rng = createRng(seed);
    state.bossActive = true;
    state.boss = { hp: 10, fireCountdown: 0, width: 60, height: 40, x: 400, y: 80, vx: 0, fireRate: 0.5, pattern: 'wide_spread' };

    for (let i = 0; i < 2000; i++) {
      step(state, 0.016, { left: false, right: false, fire: true }, rng);
      if (state.boss) {
        ok(state.boss.hp >= 0, `seed ${seed}: boss hp >= 0`);
      }
    }
  }
});

test('Property: Cannot transition beyond map 3', (t) => {
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const state = createInitialState();
    const rng = createRng(seed);

    for (let i = 0; i < STEPS_PER_SEED; i++) {
      step(state, 0.016, { left: false, right: false, fire: true }, rng);
      ok(state.level <= 3, `seed ${seed}: level <= 3`);
    }
  }
});

test('Property: Trace identical on same seed (double execution)', (t) => {
  const seed = 42;
  const inputs = { left: false, right: true, fire: true };

  const state1 = createInitialState();
  const rng1 = createRng(seed);
  for (let i = 0; i < 1000; i++) {
    step(state1, 0.016, inputs, rng1);
  }

  const state2 = createInitialState();
  const rng2 = createRng(seed);
  for (let i = 0; i < 1000; i++) {
    step(state2, 0.016, inputs, rng2);
  }

  strictEqual(state1.score, state2.score, 'trace: score identical');
  strictEqual(state1.lives, state2.lives, 'trace: lives identical');
  strictEqual(state1.enemies.length, state2.enemies.length, 'trace: enemies identical');
  strictEqual(state1.ship.x, state2.ship.x, 'trace: ship.x identical');
});

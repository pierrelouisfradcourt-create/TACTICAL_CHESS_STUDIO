import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  build, upgradeAllGuns, botCompetent, botNaive, botTall, botWide, botTempo, collectMetrics
} from '../bots/bots.mjs';
import { initGameState } from '../sim/state.mjs';
import { tripleCoverageCells } from '../config/geometry.mjs';
import { TOWER_TYPES } from '../config/tower_types.mjs';

const PIN = tripleCoverageCells();
const ENTRY_SENTINEL = [8, 1];

const prep = (over = {}) => Object.assign(initGameState(1337), {
  phase: 'PREPARATION', wavePhaseTime: 0, ...over
});

const tower = (x, y, type, level) => ({ id: 1000 + x * 100 + y, x, y, type, level, cooldownMs: 0 });

// --- primitives -----------------------------------------------------------

test('build places once and REFUSES a second tower on the same cell', () => {
  const state = prep({ gold: 500 });
  assert.equal(build(state, 'gun', 1, 1), true);
  assert.equal(state.towers.length, 1);
  assert.equal(build(state, 'gun', 1, 1), false, 'the occupied cell is refused up front');
  assert.equal(state.towers.length, 1, 'and no second tower appeared');
  assert.equal(state.gold, 450, 'exactly one Gun was paid for');
});

test('build refuses a lane cell and leaves the purse untouched', () => {
  const state = prep({ gold: 500 });
  assert.equal(build(state, 'gun', 19, 0), false, 'the entry lane is not buildable');
  assert.equal(state.towers.length, 0);
  assert.equal(state.gold, 500);
});

test('upgradeAllGuns upgrades GUNS ONLY, and only those below level 3', () => {
  const state = prep({ gold: 1000 });
  state.towers = [
    tower(1, 1, TOWER_TYPES.GUN, 1),
    tower(1, 3, TOWER_TYPES.CANNON, 1),
    tower(3, 3, TOWER_TYPES.GUN, 3),
    tower(5, 3, TOWER_TYPES.FROST, 1)
  ];
  upgradeAllGuns(state);
  assert.equal(state.towers[0].level, 2, 'the level-1 Gun was upgraded');
  assert.equal(state.towers[1].level, 1, 'the Cannon was NOT touched');
  assert.equal(state.towers[2].level, 3, 'the level-3 Gun is already capped');
  assert.equal(state.towers[3].level, 1, 'the Frost was NOT touched');
  assert.equal(state.gold, 960, 'exactly one 40-gold upgrade was paid');
});

test('upgradeAllGuns spends when it has EXACTLY the cost, and not a gold less', () => {
  const exact = prep({ gold: 40 });
  exact.towers = [tower(1, 1, TOWER_TYPES.GUN, 1)];
  upgradeAllGuns(exact);
  assert.equal(exact.towers[0].level, 2, 'exactly 40 gold is enough for an L1->L2');
  assert.equal(exact.gold, 0);

  const short = prep({ gold: 39 });
  short.towers = [tower(1, 1, TOWER_TYPES.GUN, 1)];
  upgradeAllGuns(short);
  assert.equal(short.towers[0].level, 1, 'one gold short: no upgrade');
  assert.equal(short.gold, 39);
});

// --- botCompetent ---------------------------------------------------------

test('botCompetent waits: an empty board at t=0 does NOT call the wave', () => {
  const state = prep({ gold: 0 });
  botCompetent(state);
  assert.equal(state.towers.length, 0, 'no gold, no garrison');
  assert.equal(state.phase, 'PREPARATION', 'and no wave called while ungarrisoned');
  assert.equal(state.enemies.length, 0);
});

test('botCompetent calls the wave the moment its garrison reaches EXACTLY 7 towers', () => {
  const state = prep({ gold: 0 });
  state.towers = [ENTRY_SENTINEL, ...PIN].map(([x, y]) => tower(x, y, TOWER_TYPES.GUN, 1));
  assert.equal(state.towers.length, 7);
  botCompetent(state);
  assert.equal(state.phase, 'SPAWNING', 'seven towers is the exact garrison threshold');
  assert.equal(state.enemies.length, 5);
});

test('botCompetent with six towers waits for the countdown instead', () => {
  const state = prep({ gold: 0 });
  state.towers = PIN.map(([x, y]) => tower(x, y, TOWER_TYPES.GUN, 1));
  assert.equal(state.towers.length, 6);
  botCompetent(state);
  assert.equal(state.phase, 'PREPARATION', 'six is not seven');
  botCompetent(Object.assign(state, { wavePhaseTime: 8001 }));
  assert.equal(state.phase, 'SPAWNING', 'past 8s it calls anyway');
});

// --- botNaive -------------------------------------------------------------

test('botNaive buys a dead-zone Cannon with EXACTLY 100 gold, and none with 99', () => {
  const exact = prep({ gold: 100, wave: 1 });
  botNaive(exact);
  assert.equal(exact.towers.length, 1, '100 gold buys exactly one Cannon');
  assert.deepEqual([exact.towers[0].x, exact.towers[0].y], [15, 3]);
  assert.equal(exact.gold, 0);
  assert.equal(exact.phase, 'PREPARATION', 'at t=0 it has not called the wave yet');

  const short = prep({ gold: 99, wave: 1 });
  botNaive(short);
  assert.equal(short.towers.length, 0, 'one gold short: nothing is bought');
});

test('botNaive builds nothing outside PREPARATION, however rich it is', () => {
  const state = prep({ gold: 1000, wave: 1, phase: 'SPAWNING' });
  botNaive(state);
  assert.equal(state.towers.length, 0, 'the phase guard really guards');
  assert.equal(state.gold, 1000);
});

test('botNaive stops buying after wave 3', () => {
  const state = prep({ gold: 1000, wave: 5 });
  botNaive(state);
  assert.equal(state.towers.length, 0, 'past wave 3 it invests nothing more');
  assert.equal(state.gold, 1000);
});

test('botNaive rushes only once the countdown has really started', () => {
  const early = prep({ gold: 0, wave: 1, wavePhaseTime: 50 });
  botNaive(early);
  assert.equal(early.phase, 'PREPARATION', '50ms in: not yet');

  const later = prep({ gold: 0, wave: 1, wavePhaseTime: 101 });
  botNaive(later);
  assert.equal(later.phase, 'SPAWNING', 'past 100ms it rushes');
});

// --- botTall --------------------------------------------------------------

test('botTall builds its single chokepoint tower only on wave 1, in PREPARATION', () => {
  const first = prep({ gold: 500, wave: 1 });
  botTall(first);
  assert.equal(first.towers.length, 1);
  assert.deepEqual([first.towers[0].x, first.towers[0].y], [PIN[2][0], PIN[2][1]]);

  const later = prep({ gold: 500, wave: 2 });
  botTall(later);
  assert.equal(later.towers.length, 0, 'wave 2: it never invests again');

  const spawning = prep({ gold: 500, wave: 1, phase: 'SPAWNING' });
  botTall(spawning);
  assert.equal(spawning.towers.length, 0, 'mid-wave: it builds nothing');
});

test('botTall calls the wave only past its exact 6s threshold', () => {
  const early = prep({ gold: 0, wave: 2, wavePhaseTime: 3000 });
  botTall(early);
  assert.equal(early.phase, 'PREPARATION', '3s in: still waiting');

  const late = prep({ gold: 0, wave: 2, wavePhaseTime: 7000 });
  botTall(late);
  assert.equal(late.phase, 'SPAWNING', 'past 6s it calls');
  assert.equal(late.enemies.length, 8, 'wave 2 is exactly 8 Grunts');
});

// --- botWide / botTempo ---------------------------------------------------

test('botWide garrisons every pin cell plus the sentinel, and never upgrades', () => {
  const state = prep({ gold: 350 });
  botWide(state);
  assert.equal(state.towers.length, 7);
  assert.deepEqual(
    state.towers.map((t) => [t.x, t.y]), [ENTRY_SENTINEL, ...PIN]);
  assert.deepEqual(state.towers.map((t) => t.level), [1, 1, 1, 1, 1, 1, 1]);
  assert.equal(state.gold, 0, '7 x 50 gold, exactly');
});

test('botTempo calls the wave immediately, every wave', () => {
  const state = prep({ gold: 100, wave: 1 });
  botTempo(state);
  assert.equal(state.phase, 'SPAWNING', 'called on the very first opportunity');
  assert.equal(state.goldLedger.early_bonus, 30, 'which is exactly the 30-gold cap');
});

test('collectMetrics reads the final state and invents nothing', () => {
  const state = prep({ gold: 0 });
  state.lives = 4;
  state.wave = 7;
  state.leaks = 12;
  state.goldLedger.spend = 340;
  assert.deepEqual(collectMetrics(state), {
    lives_final: 4, wave_reached: 7, leaks_total: 12, gold_spent_total: -340
  });
});

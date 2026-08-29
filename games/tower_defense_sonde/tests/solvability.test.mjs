import { strict as assert } from 'assert';
import { test } from 'node:test';
import { initGameState } from '../sim/state.mjs';
import { hashState } from '../sim/hash.mjs';
import {
  botCompetent, botNaive, botTall, botWide, botTempo,
  BOT_PANEL, collectMetrics, rankBots, playMatch
} from '../bots/bots.mjs';

// ROOT of the player-intent suite: the actions API, the headless bot policies
// that drive it, and the DOM adapter that translates real clicks into it — all
// proven here so they RUN under the sealed mutation command.
import './actions.test.mjs';
import './bots.test.mjs';
import './input.test.mjs';

const SEED = 1337;
const play = (bot) => playMatch(initGameState(SEED), bot);

// Frozen outcomes, produced by executing bots/bots.mjs against sim/step.mjs at
// seed 1337 with no LLM anywhere in the loop. Exact equalities, never
// "lives > 0": a victory scraped with 1 life is a DIFFERENT game from one won
// with 11, and only an equality notices the difference.
const EXPECTED = {
  competent: { result: 'VICTORY', lives_final: 11, wave_reached: 11, leaks_total: 9, gold_spent_total: -1190 },
  naive: { result: 'DEFEAT', lives_final: 0, wave_reached: 3, leaks_total: 18, gold_spent_total: -200 },
  tall: { result: 'DEFEAT', lives_final: 0, wave_reached: 3, leaks_total: 19, gold_spent_total: -50 },
  wide: { result: 'VICTORY', lives_final: 9, wave_reached: 11, leaks_total: 11, gold_spent_total: -350 },
  tempo: { result: 'VICTORY', lives_final: 10, wave_reached: 11, leaks_total: 10, gold_spent_total: -340 }
};

test('R34: the competent bot WINS at seed 1337, with exact frozen final lives', () => {
  const run = play(botCompetent);
  assert.equal(run.result, 'VICTORY');
  assert.deepEqual(run.metrics, {
    lives_final: 11, wave_reached: 11, leaks_total: 9, gold_spent_total: -1190
  });
  assert.equal(run.final_state.lives, 11, 'the game is winnable with lives to spare');
  assert.equal(run.final_state.wave, 11, 'all ten waves were cleared');
});

test('R35: the naive bot LOSES at seed 1337, at an exact wave, with 0 lives', () => {
  const run = play(botNaive);
  assert.equal(run.result, 'DEFEAT');
  assert.deepEqual(run.metrics, {
    lives_final: 0, wave_reached: 3, leaks_total: 18, gold_spent_total: -200
  });
  assert.equal(run.final_state.lives, 0, 'defeat means exactly zero lives, not "few"');
});

test('R32: two identical replays of the same bot at the same seed are STRICTLY equal', () => {
  const a = play(botCompetent);
  const b = play(botCompetent);
  assert.equal(hashState(a.final_state), hashState(b.final_state), 'identical state hash');
  assert.deepEqual(a.metrics, b.metrics, 'identical metric vector');

  // Falsification twin: a genuinely different strategy must NOT land on the
  // same hash — otherwise the equality above would prove nothing.
  const other = play(botWide);
  assert.notEqual(hashState(other.final_state), hashState(a.final_state));
});

test('R24: two DIFFERENT strategies both win, with strictly different exact outcomes', () => {
  const wide = play(botWide);     // breadth: 7 L1 Guns, never upgraded
  const tempo = play(botTempo);   // economy: fewer towers, every wave called early
  assert.equal(wide.result, 'VICTORY');
  assert.equal(tempo.result, 'VICTORY');
  assert.equal(wide.metrics.lives_final, 9);
  assert.equal(tempo.metrics.lives_final, 10);
  assert.notEqual(wide.metrics.lives_final, tempo.metrics.lives_final,
    'the two winning routes are genuinely distinct, not the same run twice');
  assert.notEqual(wide.metrics.gold_spent_total, tempo.metrics.gold_spent_total);
});

test('R27: two DIFFERENT bad strategies both lose, and lose differently', () => {
  const tall = play(botTall);     // one un-upgraded Gun on a single chokepoint
  const naive = play(botNaive);   // three Cannons in dead zones
  assert.equal(tall.result, 'DEFEAT');
  assert.equal(naive.result, 'DEFEAT');
  assert.equal(tall.metrics.leaks_total, 19);
  assert.equal(naive.metrics.leaks_total, 18);
  assert.notEqual(tall.metrics.leaks_total, naive.metrics.leaks_total,
    'the two failures are distinguishable, not one generic loss');
  assert.equal(tall.metrics.gold_spent_total, -50, 'tall invested exactly one Gun');
  assert.equal(naive.metrics.gold_spent_total, -200, 'naive invested exactly two Cannons');
});

test('R48: every bot of the panel lands on its exact frozen outcome vector', () => {
  for (const [name, bot] of Object.entries(BOT_PANEL)) {
    const run = play(bot);
    assert.equal(run.result, EXPECTED[name].result, `${name} result`);
    assert.deepEqual(
      { result: run.result, ...run.metrics },
      EXPECTED[name],
      `${name} outcome vector`
    );
    assert.deepEqual(collectMetrics(run.final_state), run.metrics,
      `${name}: collectMetrics reads the final state, it does not invent it`);
  }
});

test('R47: every panel metric carries REAL variance (>= 2 distinct non-trivial values)', () => {
  const results = Object.entries(BOT_PANEL).map(([name, bot]) => ({ name, ...play(bot) }));
  assert.equal(results.length, 5);

  // Metric variance rule: a metric used to rank or calibrate must be PROVEN to
  // carry information. Exact expected value sets, not "at least 2 distinct".
  assert.deepEqual(
    new Set(results.map((r) => r.metrics.lives_final)), new Set([11, 0, 9, 10]));
  assert.deepEqual(
    new Set(results.map((r) => r.metrics.wave_reached)), new Set([11, 3]));
  assert.deepEqual(
    new Set(results.map((r) => r.metrics.leaks_total)), new Set([9, 18, 19, 11, 10]));
  assert.deepEqual(
    new Set(results.map((r) => r.metrics.gold_spent_total)), new Set([-1190, -200, -50, -350, -340]));
  assert.deepEqual(
    new Set(results.map((r) => r.result)), new Set(['VICTORY', 'DEFEAT']),
    'the panel really does contain both outcomes');
});

test('R49: rankBots orders by the named metric, ties broken by name, and two metrics disagree', () => {
  const results = Object.entries(BOT_PANEL).map(([name, bot]) => ({ name, ...play(bot) }));

  const byLives = rankBots(results, 'lives_final');
  assert.deepEqual(byLives, ['competent', 'tempo', 'wide', 'naive', 'tall'],
    'descending lives; the 0-0 tie breaks on name (naive before tall)');

  const byLeaks = rankBots(results, 'leaks_total');
  assert.deepEqual(byLeaks, ['tall', 'naive', 'wide', 'tempo', 'competent']);

  // Two metrics that reorder the SAME set of bots differently: the panel's
  // outcome space is genuinely multidimensional, not one score in disguise.
  assert.notDeepEqual(byLives, byLeaks);
  assert.deepEqual(new Set(byLives), new Set(byLeaks), 'same bots, different order');
});

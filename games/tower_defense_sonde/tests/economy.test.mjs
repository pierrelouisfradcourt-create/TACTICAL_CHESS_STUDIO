import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  applyGoldDelta, awardBounty, waveClearBonus, earlyCallBonus,
  expectedGold, initGoldLedger, GOLD_LEDGER_KINDS
} from '../sim/economy.mjs';
import { initGameState } from '../sim/state.mjs';
import { ENEMY_TYPES } from '../config/enemies.mjs';

test('R20: the ledger starts empty and expectedGold reproduces the exact opening balance', () => {
  assert.deepEqual(initGoldLedger(), { bounty: 0, wave_bonus: 0, early_bonus: 0, spend: 0 });
  assert.deepEqual(GOLD_LEDGER_KINDS, ['bounty', 'wave_bonus', 'early_bonus', 'spend']);
  assert.equal(expectedGold(initGoldLedger()), 100);
});

test('R20: applyGoldDelta moves the BALANCE and the LEDGER by the same exact amount', () => {
  const state = initGameState(1337);
  applyGoldDelta(state, 25, 'bounty');
  assert.equal(state.gold, 125);
  assert.equal(state.goldLedger.bounty, 25);
  assert.equal(state.gold, expectedGold(state.goldLedger), 'invariant holds after a bounty');

  applyGoldDelta(state, 30, 'wave_bonus');
  assert.equal(state.gold, 155);
  assert.equal(state.goldLedger.wave_bonus, 30);
  assert.equal(state.gold, expectedGold(state.goldLedger));

  applyGoldDelta(state, 12, 'early_bonus');
  assert.equal(state.gold, 167);
  assert.equal(state.goldLedger.early_bonus, 12);
  assert.equal(state.gold, expectedGold(state.goldLedger), 'invariant holds after all three taps');
});

test('R20: an unknown ledger kind throws and moves NOTHING', () => {
  const state = initGameState(1337);
  assert.throws(() => applyGoldDelta(state, 5, 'freebie'), /unknown ledger kind/);
  assert.equal(state.gold, 100);
  assert.deepEqual(state.goldLedger, initGoldLedger());
});

test('R17: a bounty is the exact frozen value of the enemy type it came from', () => {
  const state = initGameState(1337);
  assert.equal(awardBounty(state, { type: ENEMY_TYPES.GRUNT }), 8);
  assert.equal(awardBounty(state, { type: ENEMY_TYPES.RUNNER }), 6);
  assert.equal(awardBounty(state, { type: ENEMY_TYPES.BRUTE }), 25);
  assert.equal(state.goldLedger.bounty, 39, 'ledger records the exact sum');
  assert.equal(state.gold, 139);
  assert.equal(state.gold, expectedGold(state.goldLedger));
});

test('R18: the wave-clear bonus is exactly 20 + 5 x wave number, for all ten waves', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(waveClearBonus),
    [25, 30, 35, 40, 45, 50, 55, 60, 65, 70]
  );
});

test('R19: the early-call bonus is exactly 2 gold per remaining second, capped at 30', () => {
  assert.equal(earlyCallBonus(0), 0, 'calling at the buzzer pays nothing');
  assert.equal(earlyCallBonus(1), 2);
  assert.equal(earlyCallBonus(7.5), 15);
  assert.equal(earlyCallBonus(15), 30, 'the full 15s window is exactly the cap');
  assert.equal(earlyCallBonus(60), 30, 'the cap holds well past the window');
  assert.equal(earlyCallBonus(-4), 0, 'negative remaining time never pays a negative bonus');
});

test('R20: the gold invariant survives a real mixed sequence of taps and spends', () => {
  const state = initGameState(1337);
  awardBounty(state, { type: ENEMY_TYPES.BRUTE });          // +25
  applyGoldDelta(state, waveClearBonus(3), 'wave_bonus');    // +35
  applyGoldDelta(state, earlyCallBonus(6), 'early_bonus');   // +12
  // Spends go through the placement path (actions/actions.mjs), which credits
  // `spend` positively and debits the balance — expectedGold subtracts it.
  state.goldLedger.spend += 50;
  state.gold -= 50;
  assert.equal(state.gold, 122);
  assert.equal(state.gold, expectedGold(state.goldLedger));
  assert.deepEqual(state.goldLedger, { bounty: 25, wave_bonus: 35, early_bonus: 12, spend: 50 });
});

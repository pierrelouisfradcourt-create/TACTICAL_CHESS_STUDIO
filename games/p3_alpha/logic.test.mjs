// Logic tests: R1,R3,R6,R7,R8,R10,R11,R14 — node:test (node --test logic.test.mjs
// properties.test.mjs est la commande de mutation DEFAULT_TEST_ARGV du driver
// Forge, cf. scripts/forge/driver.py) — STRICT assertions, pas de >= masquant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from './state.mjs';
import { getGeneratorCost_mR, getCurrentRate_R_per_s } from './economy.mjs';
import { ProgressionState } from './progression.mjs';

// R1: Click gain is strictly equal
test('R1-clickGain-baseline', () => {
  const state = new GameState();
  const gain = state.creditClick();
  assert.equal(gain, 1000, 'gain 1R en mR');
  assert.equal(state.solde_mR, 1000);
});

test('R1-clickGain-multiplier-x2', () => {
  const state = new GameState();
  state.upgrades_owned.clic_x2 = true;
  const gain = state.creditClick();
  assert.equal(gain, 2000);
});

test('R1-clickGain-multiplier-x4', () => {
  const state = new GameState();
  state.upgrades_owned.clic_x2 = true;
  state.upgrades_owned.clic_x4 = true;
  const gain = state.creditClick();
  assert.equal(gain, 4000);
});

// R3: Cost curve x1.12
test('R3-costCurve-gen0-tier0', () => {
  assert.equal(getGeneratorCost_mR(0, 0), 15000);
});

test('R3-costCurve-gen0-tier1', () => {
  assert.equal(getGeneratorCost_mR(0, 1), Math.floor(15000 * 1.12));
});

test('R3-costCurve-gen1-tier0', () => {
  assert.equal(getGeneratorCost_mR(1, 0), 100000);
});

// R6: Try purchase validation (strict)
test('R6-tryPurchase-insufficient', () => {
  const state = new GameState();
  state.solde_mR = 10000; // not enough for G1 (needs 15000)
  const success = state.tryPurchaseGenerator(0);
  assert.equal(success, false);
  assert.equal(state.solde_mR, 10000, 'solde inchangé sur échec');
  assert.equal(state.generators_owned[0], 0);
});

test('R6-tryPurchase-sufficient', () => {
  const state = new GameState();
  state.solde_mR = 15000;
  const success = state.tryPurchaseGenerator(0);
  assert.equal(success, true);
  assert.equal(state.solde_mR, 0, 'solde débité exactement');
  assert.equal(state.generators_owned[0], 1);
});

// R7: Rate R/s
test('R7-rate-zero-no-generators', () => {
  const state = new GameState();
  assert.equal(getCurrentRate_R_per_s(state.generators_owned, state.upgrades_owned), 0);
});

test('R7-rate-g1-owned', () => {
  const state = new GameState();
  state.generators_owned[0] = 1;
  assert.equal(getCurrentRate_R_per_s(state.generators_owned, state.upgrades_owned), 0.1);
});

// R8: Gate unlocks at S1-S5 thresholds
test('R8-gateG2-unlocks-at-S1', () => {
  const prog = new ProgressionState();
  prog.updateUnlocks(99999); // just before S1
  assert.equal(prog.isGateUnlocked('g2'), false);

  prog.updateUnlocks(100000); // at S1
  assert.equal(prog.isGateUnlocked('g2'), true);
});

// R10: Victory detection at exactly 1M
test('R10-victory-before-threshold', () => {
  const prog = new ProgressionState();
  prog.updateUnlocks(999999999); // 999,999 R
  assert.equal(prog.checkVictory(), false);
});

test('R10-victory-at-threshold', () => {
  const prog = new ProgressionState();
  prog.updateUnlocks(1000000000); // 1M R
  assert.equal(prog.checkVictory(), true);
});

// R11: Defeat unreachable
test('R11-no-defeat', () => {
  const prog = new ProgressionState();
  assert.equal(prog.isDefeatReachable(), false);
});

// R14: New game resets all
test('R14-reset', () => {
  const state = new GameState();
  state.solde_mR = 100000;
  state.cumul_mR = 200000;
  state.generators_owned[0] = 5;
  state.upgrades_owned.clic_x2 = true;

  state.reset();

  assert.equal(state.solde_mR, 0);
  assert.equal(state.cumul_mR, 0);
  assert.equal(state.generators_owned[0], 0);
  assert.equal(state.upgrades_owned.clic_x2, false);
});

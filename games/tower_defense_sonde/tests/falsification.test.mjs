import { strict as assert } from 'assert';
import { test } from 'node:test';
import { effectiveSpeed } from '../sim/movement.mjs';
import { applyDamage } from '../sim/combat.mjs';
import { towerStats, TOWER_TYPES } from '../config/towers.mjs';
import { enemyBaseStats, ENEMY_TYPES } from '../config/enemies.mjs';
import { FROST_BASE_SLOW_MULT } from '../config/upgrades.mjs';
import { initGameState } from '../sim/state.mjs';
import { applyGoldDelta, expectedGold } from '../sim/economy.mjs';

// R52: a behavior test that would ALSO pass with its mechanic neutralized
// isn't proving anything — it's the tautological-assertion failure mode
// (R50) hiding one level deeper. This helper runs the real assertion first
// (sanity: the mechanic genuinely holds today) then re-runs the SAME kind
// of assertion against a deliberately neutralized double, and requires it
// to FAIL — proving the real test's pass is actually load-bearing.
export function assertFalsifiesWhenNeutralized(realAssertion, neutralizedAssertion, label) {
  realAssertion();
  assert.throws(
    neutralizedAssertion,
    undefined,
    `${label}: expected the assertion to FAIL once the mechanic is neutralized, but it still passed`
  );
}

test('R7 x R52: Frost slow twin — neutralizing the slow (mult=1) must break the slow-value assertion', () => {
  const grunt = { type: ENEMY_TYPES.GRUNT };
  const baseSpeed = enemyBaseStats(ENEMY_TYPES.GRUNT).speed; // 2.0
  const slowedSpeed = baseSpeed * FROST_BASE_SLOW_MULT; // 1.1, exact

  const real = () => {
    assert.equal(effectiveSpeed(grunt, FROST_BASE_SLOW_MULT), slowedSpeed);
  };
  const neutralized = () => {
    // "Frost at 0% strength": no slow at all (mult=1) — the exact-value
    // assertion for the SLOWED speed must now fail against the unslowed one.
    assert.equal(effectiveSpeed(grunt, 1), slowedSpeed);
  };

  assertFalsifiesWhenNeutralized(real, neutralized, 'R7 Frost slow value');
});

test('R6 x R52: armor twin — neutralizing armor reduction must break the Gun-vs-Brute damage assertion', () => {
  const tower = { type: TOWER_TYPES.GUN, level: 1 };

  const real = () => {
    const enemy = { type: ENEMY_TYPES.BRUTE, hp: 50 };
    const dmg = applyDamage(enemy, tower);
    assert.equal(dmg, 2, 'Gun 6 - Brute armor 4 = 2');
  };

  // Local double of applyDamage with the armor subtraction removed — never
  // patches the real sim/combat.mjs, just proves what the assertion would
  // see if that mechanic were gone.
  const neutralizedApplyDamage = (enemy, t) => {
    const stats = towerStats(t.type, t.level);
    const dmg = Math.max(1, stats.dmg); // no armor term
    enemy.hp -= dmg;
    return dmg;
  };
  const neutralized = () => {
    const enemy = { type: ENEMY_TYPES.BRUTE, hp: 50 };
    const dmg = neutralizedApplyDamage(enemy, tower);
    assert.equal(dmg, 2, 'Gun 6 - Brute armor 4 = 2');
  };

  assertFalsifiesWhenNeutralized(real, neutralized, 'R6 armor reduction');
});

test('R20 x R52: gold ledger twin — neutralizing the ledger bookkeeping must break the invariant assertion', () => {
  const real = () => {
    const state = initGameState(1337);
    applyGoldDelta(state, 8, 'bounty');
    assert.equal(state.gold, expectedGold(state.goldLedger));
  };

  // Local double: moves state.gold directly, "forgetting" to record the
  // ledger entry (R20's invariant exists precisely to catch this).
  const neutralizedGoldDelta = (state, delta) => { state.gold += delta; };
  const neutralized = () => {
    const state = initGameState(1337);
    neutralizedGoldDelta(state, 8);
    assert.equal(state.gold, expectedGold(state.goldLedger));
  };

  assertFalsifiesWhenNeutralized(real, neutralized, 'R20 gold ledger invariant');
});

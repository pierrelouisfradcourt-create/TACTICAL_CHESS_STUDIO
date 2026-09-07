// Property-based tests: invariants across random sequences — node:test
// (node --test logic.test.mjs properties.test.mjs est la commande de mutation
// DEFAULT_TEST_ARGV du driver Forge, cf. scripts/forge/driver.py).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './engine.mjs';

// Property 1: cumul never decreases
test('property-cumul-monotonic', () => {
  const engine = new GameEngine(54321);
  let prevCumul = 0;

  for (let i = 0; i < 1000; i++) {
    if (Math.random() < 0.1) engine.state.creditClick();
    else if (Math.random() < 0.05) engine.state.tryPurchaseGenerator(Math.floor(Math.random() * 4));
    else if (Math.random() < 0.05) {
      const upgrades = ['clic_x2', 'clic_x4', 'prod_g1_x2', 'prod_g2_x2', 'prod_g3_x2', 'prod_g4_x2'];
      engine.state.tryPurchaseUpgrade(upgrades[Math.floor(Math.random() * upgrades.length)]);
    }

    engine.tick();

    assert.ok(engine.state.cumul_mR >= prevCumul, `cumul_mR a régressé au tick ${i}`);
    prevCumul = engine.state.cumul_mR;
  }
});

// Property 2: solde never negative
test('property-solde-non-negative', () => {
  const engine = new GameEngine(65432);

  for (let i = 0; i < 1000; i++) {
    if (Math.random() < 0.1) engine.state.creditClick();
    else if (Math.random() < 0.05) engine.state.tryPurchaseGenerator(Math.floor(Math.random() * 4));

    engine.tick();

    assert.ok(engine.state.solde_mR >= 0, `solde_mR négatif au tick ${i}`);
  }
});

// Property 3: multipliers always >= 1
test('property-multipliers-positive', () => {
  const engine = new GameEngine(76543);

  for (let i = 0; i < 500; i++) {
    if (Math.random() < 0.1) engine.state.creditClick();

    assert.ok(engine.state.getClickMultiplier() >= 1, `clickMultiplier < 1 au tick ${i}`);
    for (let j = 0; j < 4; j++) {
      assert.ok(engine.state.getProductionMultiplier(j) >= 1, `prodMultiplier[${j}] < 1 au tick ${i}`);
    }

    engine.tick();
  }
});

// Property 4: no defeat reachable — invariant of the genre
test('property-no-defeat-reachable', () => {
  const engine = new GameEngine(87654);

  for (let i = 0; i < 1000; i++) {
    assert.equal(engine.progression.isDefeatReachable(), false, `défaite atteignable au tick ${i}`);
    engine.tick();
  }
});

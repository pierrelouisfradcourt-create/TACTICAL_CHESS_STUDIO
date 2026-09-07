// Harness: solvability bot + decision probes for proof
import { GameEngine } from './engine.mjs';
import { CONSTANTS } from './state.mjs';

class SolvabilityBot {
  constructor(seed = 12345) {
    this.engine = new GameEngine(seed);
    this.trajectory = [];
    this.max_ticks = 72000;
  }

  // R16: Greedy bot that reaches S5 in ≤72k ticks
  // Strategy: prioritize purchasing next generator/upgrade when affordable
  playSolvabilityBot() {
    const trajectory = [];
    const { state, progression } = this.engine;

    for (let tick = 0; tick < this.max_ticks; tick++) {
      // Record state
      trajectory.push({
        tick,
        cumul_mR: state.cumul_mR,
        solde_mR: state.solde_mR,
        generators_owned: [...state.generators_owned],
        upgrades_owned: { ...state.upgrades_owned },
        victory: progression.checkVictory(),
      });

      // Victory check
      if (progression.checkVictory()) {
        console.log(`[Bot] Victory reached at tick ${tick}, cumul=${state.cumul_mR / 1000} R`);
        trajectory.push({
          tick: tick + 1,
          cumul_mR: state.cumul_mR,
          solde_mR: state.solde_mR,
          generators_owned: [...state.generators_owned],
          upgrades_owned: { ...state.upgrades_owned },
          victory: true,
        });
        return { success: true, tick_count: tick + 1, trajectory };
      }

      // Action decision: greedy purchase next affordable generator/upgrade
      const action = this.decideBotAction(state, progression);
      if (action) {
        switch (action.type) {
          case 'click':
            this.engine.state.creditClick();
            progression.updateUnlocks(state.cumul_mR);
            break;
          case 'buy_gen':
            state.tryPurchaseGenerator(action.index);
            progression.updateUnlocks(state.cumul_mR);
            break;
          case 'buy_upg':
            state.tryPurchaseUpgrade(action.key);
            progression.updateUnlocks(state.cumul_mR);
            break;
        }
      }

      // Always tick
      this.engine.tick();
    }

    return { success: false, tick_count: this.max_ticks, trajectory };
  }

  // Decide next action: buy next affordable item, else click
  decideBotAction(state, progression) {
    const cumul = state.cumul_mR;

    // Prioritize generator purchases
    for (let i = 0; i < 4; i++) {
      const gate_id = ['core_clicker', 'g2', 'g3', 'g4'][i];
      if (!progression.isGateUnlocked(gate_id)) continue;

      const cost = CONSTANTS.GENERATOR_BASE_COSTS_MR[i] * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, state.generators_owned[i]);
      if (state.solde_mR >= cost) {
        return { type: 'buy_gen', index: i };
      }
    }

    // Prioritize upgrade purchases (if panel unlocked)
    if (progression.isGateUnlocked('prod_upgrades_panel')) {
      const upgrades = ['clic_x2', 'clic_x4', 'prod_g1_x2', 'prod_g2_x2', 'prod_g3_x2', 'prod_g4_x2'];
      for (const key of upgrades) {
        if (state.upgrades_owned[key]) continue;

        const tier = state.generators_owned[0] + 1;
        const cost = CONSTANTS.GENERATOR_BASE_COSTS_MR[0] * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, tier);
        if (state.solde_mR >= cost) {
          return { type: 'buy_upg', key };
        }
      }
    }

    // Otherwise click
    return { type: 'click' };
  }

  getResult() {
    return {
      success: this.trajectory[this.trajectory.length - 1]?.victory || false,
      tick_count: this.trajectory.length,
      final_cumul_mR: this.trajectory[this.trajectory.length - 1]?.cumul_mR || 0,
    };
  }
}

class DecisionProbe {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  // R19: Two divergent policies over fixed frames, measure cumul variance
  probeDecisionVariance(frames = 300) {
    const results = {};

    // Policy 1: Idle (no clicks, pure auto-production)
    const engine1 = new GameEngine(this.seed);
    let cumul1 = 0;
    for (let f = 0; f < frames; f++) {
      engine1.tick();
      cumul1 = engine1.state.cumul_mR;
    }
    results.idle_cumul_mR = cumul1;

    // Policy 2: Active clicking (click every 3 frames)
    const engine2 = new GameEngine(this.seed);
    let cumul2 = 0;
    for (let f = 0; f < frames; f++) {
      if (f % 3 === 0) {
        engine2.state.creditClick();
        engine2.progression.updateUnlocks(engine2.state.cumul_mR);
      }
      engine2.tick();
      cumul2 = engine2.state.cumul_mR;
    }
    results.active_cumul_mR = cumul2;

    // Variance non-trivial?
    results.variance_detected = cumul1 !== cumul2;
    results.delta_mR = cumul2 - cumul1;

    return results;
  }
}

// Determinism test: same seed produces same trajectory
function testDeterminism(seed = 12345, ticks = 1000) {
  const engine1 = new GameEngine(seed);
  const trajectory1 = [];
  for (let i = 0; i < ticks; i++) {
    engine1.tick();
    trajectory1.push(engine1.state.cumul_mR);
  }

  const engine2 = new GameEngine(seed);
  const trajectory2 = [];
  for (let i = 0; i < ticks; i++) {
    engine2.tick();
    trajectory2.push(engine2.state.cumul_mR);
  }

  const match = trajectory1.every((v, i) => v === trajectory2[i]);
  return {
    deterministic: match,
    ticks_tested: ticks,
    mismatch_count: trajectory1.filter((v, i) => v !== trajectory2[i]).length,
  };
}

export { SolvabilityBot, DecisionProbe, testDeterminism };

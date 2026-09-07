// Deterministic seeded simulation engine: tick orchestration + RNG
import { GameState, CONSTANTS } from './state.mjs';
import { ProgressionState } from './progression.mjs';

class SeededRNG {
  constructor(seed = 12345) {
    this.seed = seed >>> 0; // 32-bit unsigned
  }

  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0; // LCG constants
    return this.seed / 0x100000000; // return [0, 1)
  }

  reset(seed) {
    this.seed = seed >>> 0;
  }
}

class GameEngine {
  constructor(seed = 12345) {
    this.state = new GameState();
    this.progression = new ProgressionState();
    this.rng = new SeededRNG(seed);
    this.tick_count = 0;
    this.seed = seed;
  }

  // R15: Single deterministic tick (100ms gameplay)
  // Orchestrates: production credit -> progression update
  tick() {
    // Production credit (no RNG used, fully deterministic)
    const production_credit_mR = this.state.creditProduction(CONSTANTS.TICK_MS);

    // Check for new unlocks/victory
    this.progression.updateUnlocks(this.state.cumul_mR);

    this.tick_count++;
    return {
      tick_count: this.tick_count,
      production_credit_mR,
      victory: this.progression.checkVictory(),
    };
  }

  // Run N ticks
  runTicks(n) {
    const trajectory = [];
    for (let i = 0; i < n; i++) {
      const result = this.tick();
      trajectory.push({
        tick: result.tick_count,
        cumul_mR: this.state.cumul_mR,
        solde_mR: this.state.solde_mR,
        victory: result.victory,
      });
      if (result.victory) break;
    }
    return trajectory;
  }

  // Reset for new game.
  // Mutates the existing state/progression instances IN PLACE (never replaces
  // them with `new`) so external references held by callers (index.html's
  // window.__game, InputHandler, GameRenderer) stay valid across a reset.
  reset(seed = null) {
    if (seed !== null) {
      this.seed = seed;
      this.rng.reset(seed);
    } else {
      this.rng.reset(this.seed);
    }
    this.state.reset();
    this.progression.reset();
    this.tick_count = 0;
  }

  // Snapshot entire engine state
  snapshot() {
    return {
      state: this.state.snapshot(),
      progression: this.progression.snapshot(),
      tick_count: this.tick_count,
      seed: this.seed,
      rng_seed: this.rng.seed,
    };
  }

  restore(snap) {
    this.state.restore(snap.state);
    this.progression.restore(snap.progression);
    this.tick_count = snap.tick_count;
    this.seed = snap.seed;
    this.rng.seed = snap.rng_seed;
  }
}

export { GameEngine, SeededRNG };

// Pure state model: milli-R integer accounting, generators/upgrades owned
const CONSTANTS = Object.freeze({
  GAIN_CLIC_INITIAL: 1,
  COST_GROWTH_FACTOR: 1.12,
  GENERATOR_BASE_COSTS_MR: [15000, 100000, 1100000, 12000000], // mR
  GENERATOR_PROD_R_PER_S: [0.1, 1, 8, 47],
  TICK_MS: 100,
  THRESHOLD_S1_MR: 100000,   // 100R in mR
  THRESHOLD_S2_MR: 1000000,  // 1000R
  THRESHOLD_S3_MR: 12000000, // 12000R
  THRESHOLD_S4_MR: 150000000, // 150000R
  THRESHOLD_S5_MR: 1000000000, // 1M R = victory
});

class GameState {
  constructor() {
    this.solde_mR = 0;  // current balance in milli-R
    this.cumul_mR = 0;  // cumulative total (never decreases)
    this.generators_owned = [0, 0, 0, 0];  // count of each G1-G4
    this.upgrades_owned = {
      clic_x2: false,
      clic_x4: false,
      prod_g1_x2: false,
      prod_g2_x2: false,
      prod_g3_x2: false,
      prod_g4_x2: false,
    };
  }

  // R1: Gain au clic — validate strict integer
  creditClick() {
    const multiplier = this.getClickMultiplier();
    const gain_mR = CONSTANTS.GAIN_CLIC_INITIAL * multiplier * 1000;
    this.solde_mR += gain_mR;
    this.cumul_mR += gain_mR;
    return gain_mR;
  }

  // R2: Production par tick
  creditProduction(deltaTime_ms) {
    const dt_s = deltaTime_ms / 1000;
    let production_R_per_s = 0;
    for (let i = 0; i < 4; i++) {
      let prod_R_per_s = CONSTANTS.GENERATOR_PROD_R_PER_S[i];
      const upgradeKey = `prod_g${i + 1}_x2`;
      if (this.upgrades_owned[upgradeKey]) {
        prod_R_per_s *= 2;
      }
      production_R_per_s += this.generators_owned[i] * prod_R_per_s;
    }
    const production_mR = Math.floor(production_R_per_s * dt_s * 1000);
    this.solde_mR += production_mR;
    this.cumul_mR += production_mR;
    return production_mR;
  }

  // R3: Cost curve x1.12^n
  getGeneratorCost(generatorIndex) {
    const base_mR = CONSTANTS.GENERATOR_BASE_COSTS_MR[generatorIndex];
    const n = this.generators_owned[generatorIndex];
    const cost_mR = Math.floor(base_mR * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, n));
    return cost_mR;
  }

  // R4: Click multiplier x2/x4 cascade
  getClickMultiplier() {
    let mult = 1;
    if (this.upgrades_owned.clic_x2) mult *= 2;
    if (this.upgrades_owned.clic_x4) mult *= 2;
    return mult;
  }

  // R5: Production multiplier (per generator)
  getProductionMultiplier(generatorIndex) {
    if (this.upgrades_owned[`prod_g${generatorIndex + 1}_x2`]) {
      return 2;
    }
    return 1;
  }

  // R6: Try purchase — strict validation (solde unchanged on failure)
  tryPurchaseGenerator(generatorIndex) {
    const cost_mR = this.getGeneratorCost(generatorIndex);
    if (this.solde_mR < cost_mR) {
      return false; // refused, state unchanged
    }
    this.solde_mR -= cost_mR;
    this.generators_owned[generatorIndex]++;
    return true;
  }

  tryPurchaseUpgrade(upgradeKey) {
    // All upgrades cost same as their corresponding generator at (n+1) tier
    let generatorIndex = -1;
    if (upgradeKey === 'clic_x2' || upgradeKey === 'clic_x4') {
      // Click upgrades cost based on G1 tier
      generatorIndex = 0;
    } else {
      // prod_gN_x2 upgrades cost based on that generator
      const match = upgradeKey.match(/prod_g(\d)_x2/);
      if (match) generatorIndex = parseInt(match[1]) - 1;
    }

    if (generatorIndex === -1) return false;

    const base_cost_mR = CONSTANTS.GENERATOR_BASE_COSTS_MR[generatorIndex];
    const n = this.generators_owned[generatorIndex];
    const cost_mR = Math.floor(base_cost_mR * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, n + 1));

    if (this.solde_mR < cost_mR) {
      return false;
    }

    if (this.upgrades_owned[upgradeKey]) {
      return false; // already owned
    }

    this.solde_mR -= cost_mR;
    this.upgrades_owned[upgradeKey] = true;
    return true;
  }

  // R7: Current rate R/s
  getCurrentRate_R_per_s() {
    let rate = 0;
    for (let i = 0; i < 4; i++) {
      let prod = CONSTANTS.GENERATOR_PROD_R_PER_S[i];
      if (this.upgrades_owned[`prod_g${i + 1}_x2`]) {
        prod *= 2;
      }
      rate += this.generators_owned[i] * prod;
    }
    return rate;
  }

  // R13: Inventory always milli-R integers
  getDisplayBalance() {
    return Math.floor(this.solde_mR / 1000); // display as R (integer)
  }

  // R14: New game — full reset, no carryover
  reset() {
    this.solde_mR = 0;
    this.cumul_mR = 0;
    this.generators_owned = [0, 0, 0, 0];
    this.upgrades_owned = {
      clic_x2: false,
      clic_x4: false,
      prod_g1_x2: false,
      prod_g2_x2: false,
      prod_g3_x2: false,
      prod_g4_x2: false,
    };
  }

  // Snapshot for bot trajectory tracking
  snapshot() {
    return {
      solde_mR: this.solde_mR,
      cumul_mR: this.cumul_mR,
      generators_owned: [...this.generators_owned],
      upgrades_owned: { ...this.upgrades_owned },
    };
  }

  // Restore from snapshot
  restore(snap) {
    this.solde_mR = snap.solde_mR;
    this.cumul_mR = snap.cumul_mR;
    this.generators_owned = [...snap.generators_owned];
    this.upgrades_owned = { ...snap.upgrades_owned };
  }
}

export { GameState, CONSTANTS };

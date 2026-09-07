// Pure economic rules: cost, production, multipliers, validation
import { CONSTANTS } from './state.mjs';

// R1: Gain per click (with multiplier)
function calculateClickGain(clickMultiplier) {
  return CONSTANTS.GAIN_CLIC_INITIAL * clickMultiplier;
}

// R2: Production credit per tick (deltaTime_ms)
function calculateProductionCredit(generators_owned, upgrades_owned, deltaTime_ms) {
  const dt_s = deltaTime_ms / 1000;
  let production_R_per_s = 0;

  for (let i = 0; i < 4; i++) {
    let prod_R_per_s = CONSTANTS.GENERATOR_PROD_R_PER_S[i];
    const upgradeKey = `prod_g${i + 1}_x2`;
    if (upgrades_owned[upgradeKey]) {
      prod_R_per_s *= 2;
    }
    production_R_per_s += generators_owned[i] * prod_R_per_s;
  }

  // Convert to milli-R, floor to integer
  const production_mR = Math.floor(production_R_per_s * dt_s * 1000);
  return production_mR;
}

// R3: Generator cost at purchase count n
function getGeneratorCost_mR(generatorIndex, count_owned) {
  const base_mR = CONSTANTS.GENERATOR_BASE_COSTS_MR[generatorIndex];
  const cost_mR = Math.floor(base_mR * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, count_owned));
  return cost_mR;
}

// R4: Click multiplier from upgrades (x2 and x4 stack)
function getClickMultiplier(upgrades_owned) {
  let mult = 1;
  if (upgrades_owned.clic_x2) mult *= 2;
  if (upgrades_owned.clic_x4) mult *= 2;
  return mult;
}

// R5: Production multiplier for a specific generator
function getProductionMultiplier(generatorIndex, upgrades_owned) {
  const upgradeKey = `prod_g${generatorIndex + 1}_x2`;
  return upgrades_owned[upgradeKey] ? 2 : 1;
}

// R6: Validate purchase and return new balance (or null if refused)
function validateGeneratorPurchase(solde_mR, generatorIndex, count_owned) {
  const cost_mR = getGeneratorCost_mR(generatorIndex, count_owned);
  if (solde_mR < cost_mR) {
    return null; // insufficient funds
  }
  return { cost_mR, success: true };
}

function validateUpgradePurchase(solde_mR, upgradeKey, generators_owned, upgrades_owned) {
  if (upgrades_owned[upgradeKey]) {
    return null; // already owned
  }

  let generatorIndex = -1;
  if (upgradeKey === 'clic_x2' || upgradeKey === 'clic_x4') {
    generatorIndex = 0;
  } else {
    const match = upgradeKey.match(/prod_g(\d)_x2/);
    if (!match) return null;
    generatorIndex = parseInt(match[1]) - 1;
  }

  const base_cost_mR = CONSTANTS.GENERATOR_BASE_COSTS_MR[generatorIndex];
  const tier = generators_owned[generatorIndex] + 1;
  const cost_mR = Math.floor(base_cost_mR * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, tier));

  if (solde_mR < cost_mR) {
    return null;
  }
  return { cost_mR, success: true };
}

// R7: Current production rate R/s
function getCurrentRate_R_per_s(generators_owned, upgrades_owned) {
  let rate = 0;
  for (let i = 0; i < 4; i++) {
    let prod = CONSTANTS.GENERATOR_PROD_R_PER_S[i];
    const upgradeKey = `prod_g${i + 1}_x2`;
    if (upgrades_owned[upgradeKey]) {
      prod *= 2;
    }
    rate += generators_owned[i] * prod;
  }
  return rate;
}

export {
  calculateClickGain,
  calculateProductionCredit,
  getGeneratorCost_mR,
  getClickMultiplier,
  getProductionMultiplier,
  validateGeneratorPurchase,
  validateUpgradePurchase,
  getCurrentRate_R_per_s,
};

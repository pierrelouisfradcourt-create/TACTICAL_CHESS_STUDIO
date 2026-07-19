// shop/shop.mjs - Shop drawing and state management
// Deterministic shop draw via rng_state (DP-5, ECO-5)

import { nextRng } from '../engine/rng.mjs';
import { reservePool } from '../pool/pool.mjs';

/**
 * Shop state: array of unit definitions available for purchase in this shop window.
 * Each shop draw is deterministic given an rng_state and a level.
 */

/**
 * Draw a shop for a player at a given level.
 * Deterministic draw: same (rng_state, level) => same shop.
 * Uses nextRng to consume rng_state deterministically.
 *
 * TEST VERSION: uniformly draws from available unit definitions (not tied to level yet).
 * Actual odds table (DP-5, ECO-4) is TBD by Economy/Balance Bible.
 *
 * ECO-1: each drawn slot is RESERVED from the pool at draw time (reservePool)
 * — the draw never yields more exemplars of a given unitDefId than the pool
 * actually has available. Once a unitDefId's availability is exhausted
 * during this same draw, it drops out of the candidate list for the
 * remaining slots. If every unitDefId is exhausted before shopSize slots
 * are filled, the returned shop is shorter than shopSize (no forcing).
 *
 * @param {number} rng_state - current RNG state
 * @param {Object} pool - pool state (available exemplars, pre-reservation)
 * @param {number} level - player level (currently unused in test distribution; future: affects odds)
 * @param {number} shopSize - number of units to draw (typically 5 for TFT-like games; fixture TBD)
 * @returns {Object} {rng_state: new_state, shop: [unitDefId, ...], pool: newPool}
 *   newPool is the pool AFTER reserving every drawn exemplar (ECO-1).
 */
export function drawShop(rng_state, pool, level, shopSize = 5) {
  if (typeof rng_state !== 'number' || !Number.isInteger(rng_state)) {
    throw new Error('rng_state must be an integer');
  }
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) {
    throw new Error('level must be a positive integer');
  }
  if (typeof shopSize !== 'number' || !Number.isInteger(shopSize) || shopSize < 0) {
    throw new Error('shopSize must be a non-negative integer');
  }

  // Working copy of pool availability, decremented as slots reserve exemplars.
  let remaining = { ...pool };

  const shop = [];
  let state = rng_state;

  for (let i = 0; i < shopSize; i++) {
    // Only unitDefIds still available in THIS draw can be picked (ECO-1:
    // never draw more exemplars than the pool actually has).
    const availableUnits = Object.keys(remaining).filter(unitDefId => remaining[unitDefId] > 0);

    if (availableUnits.length === 0) {
      // Pool fully exhausted: stop drawing, shop ends up shorter than shopSize.
      break;
    }

    const { rng_state: nextState, value } = nextRng(state);
    state = nextState;

    // Select a unit uniformly: value % availableUnits.length
    const index = value % availableUnits.length;
    const chosen = availableUnits[index];

    // Reserve the exemplar: moves it from "available" to "reserved" (the
    // Shop array itself is the record of the reserved account).
    remaining = reservePool(remaining, chosen, 1);
    shop.push(chosen);
  }

  return {
    rng_state: state,
    shop,
    pool: remaining
  };
}

/**
 * Lock a shop for the next round.
 * A locked shop is kept exactly as-is; no re-draw, no rng consumption.
 * (ECO-8)
 *
 * @param {Array} shop - current shop array
 * @returns {Array} locked shop (same array, immutably copied for clarity)
 */
export function lockShop(shop) {
  if (!Array.isArray(shop)) {
    throw new Error('shop must be an array');
  }
  // Return a new array reference (immutable copy)
  return [...shop];
}

/**
 * Compute the total physical exemplars reserved by a shop window.
 * Used to verify conservation of pool (ECO-1).
 *
 * @param {Array} shop - shop content
 * @returns {number} total exemplars reserved
 */
export function getShopReservedCount(shop) {
  if (!Array.isArray(shop)) {
    throw new Error('shop must be an array');
  }
  // Each shop slot reserves exactly 1 exemplar (no duplicates in the same shop for now)
  // Future: if shop can show duplicates, multiply by count per unit
  return shop.length;
}

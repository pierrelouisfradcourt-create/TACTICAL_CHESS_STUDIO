// shop/shop.mjs - Shop drawing and state management
// Deterministic shop draw via rng_state (DP-5, ECO-5)

import { nextRng } from '../engine/rng.mjs';
import { reservePool } from '../pool/pool.mjs';
import { SHOP_ODDS_TABLE } from '../params.v0.mjs';
import { getUnitRank } from '../content/units.v0.mjs';

/**
 * Shop state: array of unit definitions available for purchase in this shop window.
 * Each shop draw is deterministic given an rng_state and a level.
 */

/**
 * Draw a shop for a player at a given level.
 * Deterministic draw: same (rng_state, level) => same shop.
 * Uses nextRng to consume rng_state deterministically.
 *
 * C2 (s9-build playtest fix): the draw is now WEIGHTED by SHOP_ODDS_TABLE[level][rank-1]
 * (rank looked up via content/units.v0.mjs::getUnitRank — the single source shared with the
 * display layer, ECO-2/INV-8). At each slot, weights are summed over the units still
 * available in this draw and one nextRng draw picks among them proportionally to weight
 * (deterministic: value % totalWeight, walked against cumulative weights in array order).
 * If every available unit has weight 0 at this level (all remaining ranks excluded by the
 * table), the slot falls back to a uniform pick among available units rather than stalling —
 * this keeps the draw total deterministic and never silently drops a slot for a reason a
 * player can't see.
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
 * @param {number} level - player level (indexes SHOP_ODDS_TABLE, clamped to its length)
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

  const levelIndex = Math.min(level, SHOP_ODDS_TABLE.length) - 1;
  const weightsForLevel = SHOP_ODDS_TABLE[levelIndex];

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

    // Weight each available unit by its rank's odds at this level.
    const weighted = availableUnits.map(unitDefId => {
      const rank = getUnitRank(unitDefId);
      const w = rank >= 1 && rank <= weightsForLevel.length ? weightsForLevel[rank - 1] : 0;
      return { unitDefId, w };
    });
    const totalWeight = weighted.reduce((sum, e) => sum + e.w, 0);

    const { rng_state: nextState, value } = nextRng(state);
    state = nextState;

    let chosen;
    if (totalWeight > 0) {
      let roll = value % totalWeight;
      chosen = weighted[weighted.length - 1].unitDefId; // fallback for rounding safety
      for (const entry of weighted) {
        if (roll < entry.w) {
          chosen = entry.unitDefId;
          break;
        }
        roll -= entry.w;
      }
    } else {
      // No available unit has nonzero weight at this level: fall back to uniform
      // among available units so the slot still fills deterministically.
      const index = value % availableUnits.length;
      chosen = availableUnits[index];
    }

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

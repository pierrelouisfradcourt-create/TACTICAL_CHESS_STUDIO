// pool/pool.mjs - Shared unit pool inventory management
// Physical exemplar counting (ECO-1): Pool + Shops + Possessions = total constant

/**
 * Create an empty pool inventory.
 * @returns {Object} pool state keyed by unitDefId
 */
export function createPool() {
  return {};
}

/**
 * Reserve exemplars from the pool into a shop (ECO-1: "réservation au tirage").
 * Decrements the pool's AVAILABLE count for unitDefId by qty — the reserved
 * account itself is not materialized here (it is the Shop content: the
 * caller, e.g. shop.drawShop, is responsible for tracking which unitDefId
 * is reserved by keeping it in the drawn Shop array). Physical exemplar
 * total (Pool available + Shops reserved + possessions) is conserved: this
 * function is the "available -= qty" half of the "reserved += qty" move.
 * @param {Object} pool - current pool state (available exemplars)
 * @param {string} unitDefId - unit definition ID
 * @param {number} qty - quantity to reserve
 * @throws if qty < 0, qty is not integer, unitDefId is invalid, or pool has
 *   fewer than qty available exemplars for unitDefId
 * @returns {Object} new pool state (immutable) with availability decremented
 */
export function reservePool(pool, unitDefId, qty) {
  if (typeof unitDefId !== 'string') {
    throw new Error('unitDefId must be a string');
  }
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 0) {
    throw new Error('qty must be a non-negative integer');
  }

  const current = pool[unitDefId] || 0;
  if (current < qty) {
    throw new Error(`Pool insufficient to reserve: ${unitDefId} has ${current} available, need ${qty}`);
  }

  const newPool = { ...pool };
  if (current - qty === 0) {
    delete newPool[unitDefId];
  } else {
    newPool[unitDefId] = current - qty;
  }

  return newPool;
}

/**
 * Debit exemplars from the pool (at Buy).
 * Pool is decremented; exemplar is removed from inventory.
 * @param {Object} pool - current pool state
 * @param {string} unitDefId - unit definition ID
 * @param {number} qty - quantity to debit (typically 1 for Buy)
 * @throws if qty < 0, qty is not integer, pool insufficient
 * @returns {Object} new pool state (immutable)
 */
export function debitPool(pool, unitDefId, qty) {
  if (typeof unitDefId !== 'string') {
    throw new Error('unitDefId must be a string');
  }
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 0) {
    throw new Error('qty must be a non-negative integer');
  }

  const current = pool[unitDefId] || 0;
  if (current < qty) {
    throw new Error(`Pool insufficient: ${unitDefId} has ${current}, need ${qty}`);
  }

  const newPool = { ...pool };
  if (current - qty === 0) {
    delete newPool[unitDefId];
  } else {
    newPool[unitDefId] = current - qty;
  }

  return newPool;
}

/**
 * Restore exemplars to the pool (at Sell).
 * Computes the physical exemplars consumed to produce a Star-k unit:
 * Star 1 = 1 exemplar, Star 2 = 3 exemplars, Star 3 = 9 exemplars (×3 per tier).
 * @param {Object} pool - current pool state
 * @param {string} unitDefId - unit definition ID
 * @param {number} star - star level of the unit being sold (1, 2, 3, ...)
 * @throws if star < 1 or not integer
 * @returns {Object} new pool state with exemplars restored
 */
export function restorePool(pool, unitDefId, star) {
  if (typeof unitDefId !== 'string') {
    throw new Error('unitDefId must be a string');
  }
  if (typeof star !== 'number' || !Number.isInteger(star) || star < 1) {
    throw new Error('star must be a positive integer');
  }

  // Exemplars consumed to produce a Star-k unit: geometric progression ×3
  // Star 1 = 1, Star 2 = 3, Star 3 = 9, ...
  const exemplarsToRestore = Math.pow(3, star - 1);

  const newPool = { ...pool };
  const current = pool[unitDefId] || 0;
  newPool[unitDefId] = current + exemplarsToRestore;

  return newPool;
}

/**
 * Get the current count of exemplars in the pool for a unit definition.
 * @param {Object} pool - pool state
 * @param {string} unitDefId - unit definition ID
 * @returns {number} count (0 if not present)
 */
export function getPoolCount(pool, unitDefId) {
  return pool[unitDefId] || 0;
}

/**
 * Compute total exemplars across all unit definitions in the pool.
 * @param {Object} pool - pool state
 * @returns {number} total count
 */
export function getTotalPoolCount(pool) {
  return Object.values(pool).reduce((sum, count) => sum + count, 0);
}

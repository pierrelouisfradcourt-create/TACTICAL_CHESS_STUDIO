// bench/bench.mjs - Bench management (reserve, add, remove, check capacity)
// Bench is bounded (ECO-7, DP-9)

/**
 * Create an empty bench.
 * @returns {Array} empty bench
 */
export function createBench() {
  return [];
}

/**
 * Check if a bench is at capacity.
 * @param {Array} bench - bench state
 * @param {number} capacity - bench capacity (declared ECO-7, value from Balance Bible)
 * @returns {boolean} true if bench.length >= capacity
 */
export function isBenchFull(bench, capacity) {
  if (!Array.isArray(bench)) {
    throw new Error('bench must be an array');
  }
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 0) {
    throw new Error('capacity must be a non-negative integer');
  }

  return bench.length >= capacity;
}

/**
 * Add a unit to the bench.
 * ASSUMES the bench is not full — caller must check isBenchFull first.
 *
 * @param {Array} bench - bench state
 * @param {Object} unitInstance - unit instance object
 * @returns {Array} new bench with unit added
 */
export function addToBench(bench, unitInstance) {
  if (!Array.isArray(bench)) {
    throw new Error('bench must be an array');
  }
  if (typeof unitInstance !== 'object' || unitInstance === null) {
    throw new Error('unitInstance must be an object');
  }

  return [...bench, { ...unitInstance }];
}

/**
 * Remove a unit from the bench by unit_instance_id.
 * Returns rejected: {ok: false, reason: "Unit not found"} if not found.
 * @param {Array} bench - bench state
 * @param {string} unit_instance_id - ID of the unit to remove
 * @returns {Object} {ok: true, newBench, removed} or {ok: false, reason}
 */
export function removeFromBench(bench, unit_instance_id) {
  if (!Array.isArray(bench)) {
    throw new Error('bench must be an array');
  }
  if (typeof unit_instance_id !== 'string') {
    throw new Error('unit_instance_id must be a string');
  }

  const foundIndex = bench.findIndex(u => u.unit_instance_id === unit_instance_id);

  if (foundIndex === -1) {
    return { ok: false, reason: 'Unit not found on bench' };
  }

  const newBench = bench.filter((_, i) => i !== foundIndex);
  const removed = bench[foundIndex];

  return { ok: true, newBench, removed };
}

/**
 * Find a unit on the bench by unit_instance_id.
 * @param {Array} bench - bench state
 * @param {string} unit_instance_id - unit ID to find
 * @returns {Object|null} the unit or null if not found
 */
export function findOnBench(bench, unit_instance_id) {
  if (!Array.isArray(bench)) {
    throw new Error('bench must be an array');
  }
  return bench.find(u => u.unit_instance_id === unit_instance_id) || null;
}

/**
 * Get the current bench occupancy.
 * @param {Array} bench - bench state
 * @returns {number} number of units on bench
 */
export function getBenchOccupancy(bench) {
  if (!Array.isArray(bench)) {
    throw new Error('bench must be an array');
  }
  return bench.length;
}

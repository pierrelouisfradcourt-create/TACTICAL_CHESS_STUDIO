// economy/gold.mjs - Gold transactions and tracking (ECO-3)
// Closed-list transaction sources (Income, Buy, Reroll, LevelUp, Sell, reward)

// Closed list of transaction sources (ECO-3, ratified QE-3)
const GOLD_SOURCES = Object.freeze([
  'Income',
  'Buy',
  'Reroll',
  'LevelUp',
  'Sell',
  'reward'
]);

/**
 * Check if a source is valid (closed list ECO-3).
 * @param {string} source - source identifier
 * @returns {boolean}
 */
export function isKnownGoldSource(source) {
  return GOLD_SOURCES.includes(source);
}

/**
 * Assert a source is valid (fail-hard).
 * @param {string} source - source identifier
 * @throws if unknown
 */
export function assertKnownGoldSource(source) {
  if (!isKnownGoldSource(source)) {
    throw new Error(`Unknown gold source: ${source}. Must be one of: ${GOLD_SOURCES.join(', ')}`);
  }
}

/**
 * Apply a gold transaction to a player's gold balance.
 * @param {number} currentGold - player's current gold
 * @param {number} delta - amount to add/subtract (can be negative)
 * @param {string} source - transaction source (must be in GOLD_SOURCES)
 * @throws if source unknown, if delta non-integer, if resulting gold < 0
 * @returns {Object} {newGold, transaction: {amount, source, type}}
 */
export function applyGoldTransaction(currentGold, delta, source) {
  if (typeof currentGold !== 'number' || !Number.isInteger(currentGold) || currentGold < 0) {
    throw new Error('currentGold must be a non-negative integer');
  }
  if (typeof delta !== 'number' || !Number.isInteger(delta)) {
    throw new Error('delta must be an integer');
  }

  assertKnownGoldSource(source);

  const newGold = currentGold + delta;

  // Gold cannot go negative (ECO-3: gold born and dies by transactions)
  if (newGold < 0) {
    throw new Error(`Gold would become negative: ${currentGold} + ${delta} = ${newGold}`);
  }

  return {
    newGold,
    transaction: {
      amount: delta,
      source,
      type: delta >= 0 ? 'credit' : 'debit'
    }
  };
}

/**
 * Compute net gold delta from a list of transactions.
 * @param {Array} transactions - array of {amount, source}
 * @returns {number} sum of amounts
 */
export function computeGoldDelta(transactions) {
  if (!Array.isArray(transactions)) {
    throw new Error('transactions must be an array');
  }

  return transactions.reduce((sum, tx) => {
    if (typeof tx.amount !== 'number' || !Number.isInteger(tx.amount)) {
      throw new Error('Each transaction.amount must be an integer');
    }
    return sum + tx.amount;
  }, 0);
}

/**
 * Get the list of valid gold sources (for reference/validation).
 * @returns {Array} frozen array of source strings
 */
export function getGoldSources() {
  return GOLD_SOURCES;
}

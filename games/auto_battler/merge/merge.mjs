// merge/merge.mjs - Merge detection and resolution (DP-4)
// Three identical units → one unit of higher star (ECO-1, INV-16)

/**
 * Detect if a merge is possible in a collection of units.
 * Merge requires: 3+ units with same unitDefId AND same star level.
 * @param {Array} units - collection of unit instances
 * @returns {Object|null} {unitDefId, star, count} if merge possible, null otherwise
 */
export function detectMerge(units) {
  if (!Array.isArray(units)) {
    throw new Error('units must be an array');
  }

  // Group by (unitDefId, star)
  const groups = {};

  for (const unit of units) {
    if (typeof unit !== 'object' || unit === null) {
      throw new Error('Each unit must be an object');
    }
    if (typeof unit.unit_def_id !== 'string' || typeof unit.star !== 'number') {
      throw new Error('Each unit must have unit_def_id (string) and star (number)');
    }

    const key = `${unit.unit_def_id}__${unit.star}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(unit);
  }

  // Find first group with 3+ identical units
  for (const key of Object.keys(groups)) {
    if (groups[key].length >= 3) {
      const [unitDefId, star] = key.split('__');
      return {
        unitDefId,
        star: parseInt(star, 10),
        count: groups[key].length,
        group: groups[key]
      };
    }
  }

  return null;
}

/**
 * Resolve a merge: consume 3 identical units, produce 1 higher-star unit.
 * Consumes the 3 OLDEST units (by creation order, stored in units via creation_tick or unit_instance_id order).
 * Produces a new unit with: same unitDefId, star+1, new unit_instance_id.
 *
 * @param {Array} units - collection of unit instances (typically Bench or Board combined)
 * @param {Object} merge - merge detection result from detectMerge()
 * @param {Function} makeUnitInstanceId - function to generate new unit_instance_id
 * @returns {Object} {ok, newUnits, consumed3, produced1, reason?}
 */
export function resolveMerge(units, merge, makeUnitInstanceId) {
  if (!Array.isArray(units)) {
    throw new Error('units must be an array');
  }
  if (typeof merge !== 'object' || merge === null) {
    throw new Error('merge must be a detection result object');
  }
  if (typeof makeUnitInstanceId !== 'function') {
    throw new Error('makeUnitInstanceId must be a function');
  }

  // Validate merge result
  if (!merge.group || merge.group.length < 3) {
    return { ok: false, reason: 'Merge group has fewer than 3 units' };
  }

  // Consume the 3 oldest units (first 3 in the group array, which were grouped in order of appearance)
  const consumed3 = merge.group.slice(0, 3);

  // Produce a new unit
  const produced1 = {
    unit_instance_id: makeUnitInstanceId(),
    unit_def_id: merge.unitDefId,
    star: merge.star + 1,
    creation_tick: 0 // Placeholder; actual tick assigned by the caller
  };

  // Remove the 3 consumed units from the collection
  const consumed3Ids = new Set(consumed3.map(u => u.unit_instance_id));
  const newUnits = units.filter(u => !consumed3Ids.has(u.unit_instance_id));

  // Add the produced unit
  const finalUnits = [...newUnits, { ...produced1 }];

  return {
    ok: true,
    newUnits: finalUnits,
    consumed3,
    produced1
  };
}

/**
 * Check if units contain any merge-able group.
 * Shortcut to detectMerge for boolean check.
 * @param {Array} units - collection of unit instances
 * @returns {boolean} true if any merge possible
 */
export function canMerge(units) {
  return detectMerge(units) !== null;
}

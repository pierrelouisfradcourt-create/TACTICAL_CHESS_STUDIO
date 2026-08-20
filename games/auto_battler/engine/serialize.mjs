// serialize.mjs - Canonical deterministic serialization
import { isState } from './types.mjs';

function canonicalReplacer(key, value) {
  // Reject special invalid values
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }
    // Normalize -0 to 0
    if (Object.is(value, -0)) {
      return 0;
    }
    return value;
  }
  if (value === undefined) {
    throw new Error('Cannot serialize undefined');
  }
  if (typeof value === 'function') {
    throw new Error('Cannot serialize function');
  }
  return value;
}

// A serializable State may only contain plain objects, arrays, and JSON
// primitives. Map/Set/Date/RegExp/TypedArray/class instances have no OWN
// enumerable properties, so Object.keys() on them is [] and they would
// silently collapse to "{}" instead of failing loudly - corrupting hashing
// and statesEqual (two different Maps would serialize identically).
function assertPlainObject(obj) {
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) {
    const tag = Object.prototype.toString.call(obj);
    throw new Error(`Cannot serialize non-plain object: ${tag}`);
  }
}

// Sort keys recursively for deterministic output.
// `seen` tracks objects/arrays on the CURRENT recursion path (ancestors) so
// a real cycle throws a typed domain error instead of the native "Maximum
// call stack size exceeded" RangeError. Entries are removed on the way back
// up, so a value reached twice via two different (non-cyclic) branches -
// a DAG, not a cycle - is never a false positive.
function deepSortKeys(obj, seen = new WeakSet()) {
  if (Array.isArray(obj)) {
    if (seen.has(obj)) {
      throw new Error('Cannot serialize circular reference');
    }
    seen.add(obj);
    const result = obj.map(v => deepSortKeys(v, seen));
    seen.delete(obj);
    return result;
  }
  if (obj !== null && typeof obj === 'object') {
    if (seen.has(obj)) {
      throw new Error('Cannot serialize circular reference');
    }
    assertPlainObject(obj);
    seen.add(obj);
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      sorted[k] = deepSortKeys(obj[k], seen);
    }
    seen.delete(obj);
    return sorted;
  }
  if (typeof obj === 'bigint') {
    throw new Error('Cannot serialize BigInt');
  }
  return obj;
}

export function serialize(state) {
  const sorted = deepSortKeys(state);
  return JSON.stringify(sorted, canonicalReplacer);
}

export function statesEqual(a, b) {
  return serialize(a) === serialize(b);
}

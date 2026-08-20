/**
 * Safe state access helpers.
 *
 * Node configuration (e.g. a router's `path`) is user-supplied, so every lookup
 * goes through `resolvePath`, which is hardened against prototype pollution and
 * never throws on a missing segment.
 */

import type { EngineState } from "./types.js";

/** Keys that must never be traversed — guards against prototype pollution. */
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isTraversable(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Resolve a dot-notation path against the canonical state.
 *
 * Examples: `"initial.query"`, `"nodes.node-analyzer.intent"`.
 *
 * - Returns `undefined` if any segment is missing (never throws).
 * - Returns `undefined` if any segment is a blocked key (`__proto__`,
 *   `prototype`, `constructor`).
 * - Returns `undefined` for an empty path (there is no meaningful value to return).
 */
export function resolvePath(state: EngineState, path: string): unknown {
  if (path.length === 0) {
    return undefined;
  }

  const segments = path.split(".");
  let current: unknown = state;

  for (const segment of segments) {
    if (segment.length === 0 || BLOCKED_KEYS.has(segment)) {
      return undefined;
    }
    if (!isTraversable(current)) {
      return undefined;
    }
    // Only read own enumerable-ish properties; never walk the prototype chain.
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/** Build a fresh, empty canonical state for a run. */
export function createInitialState(initial: unknown): EngineState {
  return { initial, nodes: {} };
}

/**
 * Structured-clone-based snapshot of the state, used when recording a trace step
 * so the recorded `input` reflects the state at execution time rather than a live
 * reference that later mutations would change.
 *
 * Falls back to a shallow copy if a value is not cloneable (e.g. contains a
 * function); the engine state should normally be plain JSON-like data.
 */
export function snapshotState(state: EngineState): EngineState {
  try {
    return structuredClone(state);
  } catch {
    return { initial: state.initial, nodes: { ...state.nodes } };
  }
}

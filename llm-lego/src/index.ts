/**
 * Public API surface for llm-lego.
 *
 * Pure TypeScript engine — no React, no UI, no framework dependency.
 */

// Core types
export type {
  Edge,
  EngineState,
  ExecutionContext,
  Graph,
  Node,
  NodeType,
  RoutingDecision,
  RunStatus,
  TraceStep,
} from "./core/types.js";

// State
export { createInitialState, resolvePath, snapshotState } from "./core/state.js";

// Engine
export { findStartNode, runGraph, resumeGraph, type RunOptions } from "./core/engine.js";

// Runtime
export { executeNode } from "./runtime/executor.js";
export {
  resolveNextNode,
  validateGraph,
  type NextNodeResult,
} from "./runtime/scheduler.js";

// Adapters
export type { AdapterFn, Adapters } from "./adapters/types.js";
export { mockAdapters } from "./adapters/mock.js";

// Observability
export {
  logTrace,
  summarizeTrace,
  type TraceSummaryRow,
} from "./observability/trace.js";

// Library + feeder
export { createLibrary, type Library, type LibraryEntry } from "./library/registry.js";
export { feedTraceToLibrary } from "./feeder/feeder.js";

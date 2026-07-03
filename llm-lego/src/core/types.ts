/**
 * Canonical type definitions for the llm-lego graph engine.
 *
 * These types are the contract every other module builds on. They are kept
 * dependency-free so the engine core stays portable (no React, no framework).
 */

export type NodeType = "llm" | "tool" | "agent" | "router" | "humangate";

export interface Node {
  id: string;
  type: NodeType;
  data: Record<string, unknown>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  /** Absent = unconditional edge (only valid when it is the single outgoing edge). */
  condition?: string;
  /**
   * A loop (feedback) edge — an INTENTIONAL, bounded cycle back to an upstream
   * node. Loop edges are the only sanctioned way to create a cycle: they are
   * excluded from start-node detection and from the "one outgoing edge per
   * non-router" rule, and they MUST carry a `condition` (the decision value that
   * triggers the return). A cycle built from non-loop edges is treated as an
   * accidental infinite loop and rejected by `validateGraph`.
   */
  loop?: boolean;
  /** Hard per-loop-edge iteration ceiling. Defaults to DEFAULT_MAX_ITERATIONS. */
  maxIterations?: number;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Canonical execution state.
 *
 * NEVER a flat object overwritten at each step. `initial` holds the run input;
 * `nodes` accumulates one entry per executed node, indexed by `node.id`.
 */
export interface EngineState {
  initial: unknown;
  /** Output of each node, indexed by node.id (and optionally by node.data.outputKey). */
  nodes: Record<string, unknown>;
}

export interface RoutingDecision {
  routeKey: unknown;
  matchedEdgeId: string;
  reason:
    | "exact-match"
    | "default-fallback"
    | "first-edge-fallback"
    /** A loop edge was followed: the decision matched and the loop is not exhausted. */
    | "loop-iteration"
    /** A loop edge matched but its `maxIterations` ceiling was hit — loop stops. */
    | "loop-max-iterations";
}

export interface TraceStep {
  nodeId: string;
  nodeType: NodeType;
  /** Snapshot of the state the node read from (deep-cloned so later mutations don't leak in). */
  input: EngineState;
  output: unknown;
  startedAt: number;
  durationMs: number;
  /**
   * 1-based execution count of THIS node in the current run. A node revisited in
   * a loop produces successive steps with iteration 1, 2, 3 …. The canonical
   * state keeps only the LATEST output (overwrite); the trace is the versioned
   * history — this field is what makes a refinement loop's passes visible.
   */
  iteration: number;
  routingDecision?: RoutingDecision;
  error?: string;
}

/**
 * Terminal/blocking status of a run.
 * - "completed": ran to the end (or stopped safely on maxSteps — the trace carries
 *   any control error). This is the DEFAULT for graphs without a HumanGate, so
 *   existing consumers that ignore `status` are unaffected.
 * - "paused_humangate": the engine reached a `humangate` node and is waiting for an
 *   explicit human decision (see `resumeGraph`). `pausedAt` holds the gate node id.
 * - "rejected": a HumanGate decision was "reject"; the run stopped without executing
 *   downstream nodes.
 */
export type RunStatus = "completed" | "paused_humangate" | "rejected";

export interface ExecutionContext {
  state: EngineState;
  trace: TraceStep[];
  /** Absent = treat as "completed" (backward compatible). Set by run/resumeGraph. */
  status?: RunStatus;
  /** Node id the run is paused on, when status === "paused_humangate". */
  pausedAt?: string;
}

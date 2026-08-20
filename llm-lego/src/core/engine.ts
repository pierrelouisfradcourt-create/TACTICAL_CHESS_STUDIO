/**
 * The engine: sequential graph execution with real conditional branching and
 * cycle safety.
 */

import { mockAdapters } from "../adapters/mock.js";
import type { Adapters } from "../adapters/types.js";
import { executeNode } from "../runtime/executor.js";
import { resolveNextNode, validateGraph } from "../runtime/scheduler.js";
import { createInitialState, snapshotState } from "./state.js";
import type { ExecutionContext, Graph, Node, TraceStep } from "./types.js";

export interface RunOptions {
  /** Adapters to use. Defaults to `mockAdapters`. */
  adapters?: Adapters;
  /** Hard upper bound on executed steps. Defaults to 100. */
  maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 100;

/**
 * Find the single entry node — the node with zero incoming edges.
 *
 * Throws if there is not exactly one such node, rather than silently taking
 * `nodes[0]` (a bug class from the POCs).
 */
export function findStartNode(graph: Graph): Node {
  const incoming = new Map<string, number>();
  for (const node of graph.nodes) {
    incoming.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    // Loop (feedback) edges are excluded: a loop target (e.g. a coder a reviewer
    // loops back to) must still qualify as the start node by its non-loop
    // incoming count, otherwise every refinement loop would break start detection.
    if (edge.loop === true) continue;
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }

  const roots = graph.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
  if (roots.length !== 1) {
    throw new Error(
      `Graph must have exactly one start node (0 incoming edges); found ${roots.length}: ` +
        `[${roots.map((r) => r.id).join(", ")}].`,
    );
  }
  return roots[0]!;
}

/** Append a synthetic control-flow error step (cycle / max steps) to the trace. */
function pushControlError(
  ctx: ExecutionContext,
  node: Node,
  message: string,
  iteration: number,
): void {
  const now = Date.now();
  const step: TraceStep = {
    nodeId: node.id,
    nodeType: node.type,
    input: snapshotState(ctx.state),
    output: null,
    startedAt: now,
    durationMs: 0,
    iteration,
    error: message,
  };
  ctx.trace.push(step);
}

/**
 * Per-run bookkeeping. Owned by the engine, threaded through the loop, and — for a
 * resume — reconstructed from the trace so the counts survive an HTTP round-trip
 * (the trace is serializable; Maps are not sent over the wire).
 */
interface Counts {
  visited: Set<string>;
  /** 1-based execution count per node (grows across loop passes). */
  iterationCounts: Map<string, number>;
  /** Times each loop edge has been traversed (read by the scheduler). */
  loopCounts: Map<string, number>;
  steps: number;
}

function freshCounts(): Counts {
  return { visited: new Set(), iterationCounts: new Map(), loopCounts: new Map(), steps: 0 };
}

/** Rebuild the run counts purely from a trace (used when resuming a paused run). */
function countsFromTrace(ctx: ExecutionContext): Counts {
  const c = freshCounts();
  for (const step of ctx.trace) {
    c.visited.add(step.nodeId);
    c.iterationCounts.set(step.nodeId, (c.iterationCounts.get(step.nodeId) ?? 0) + 1);
    c.steps += 1;
    const d = step.routingDecision;
    if (d !== undefined && d.reason === "loop-iteration") {
      c.loopCounts.set(d.matchedEdgeId, (c.loopCounts.get(d.matchedEdgeId) ?? 0) + 1);
    }
  }
  return c;
}

/**
 * The core execution loop. Advances from `current` until the graph ends, a
 * `humangate` node pauses it, or `maxSteps` is hit. Mutates `ctx` (state, trace,
 * status/pausedAt) and `counts`. For a graph WITHOUT any humangate this is byte-for-
 * byte the same behaviour as before — the only added branch (the humangate check)
 * is never taken.
 */
async function runLoop(
  graph: Graph,
  ctx: ExecutionContext,
  start: Node | undefined,
  adapters: Adapters,
  maxSteps: number,
  counts: Counts,
): Promise<void> {
  let current: Node | undefined = start;
  while (current !== undefined) {
    // HumanGate: pause BEFORE executing — no automatic output. Wait for a human
    // decision delivered via resumeGraph.
    if (current.type === "humangate") {
      ctx.status = "paused_humangate";
      ctx.pausedAt = current.id;
      return;
    }

    if (counts.steps >= maxSteps) {
      pushControlError(ctx, current, "max steps exceeded", (counts.iterationCounts.get(current.id) ?? 0) + 1);
      break;
    }
    counts.steps += 1;
    counts.visited.add(current.id);

    const iteration = (counts.iterationCounts.get(current.id) ?? 0) + 1;
    counts.iterationCounts.set(current.id, iteration);

    await executeNode(current, ctx, adapters, iteration);
    const output = ctx.state.nodes[current.id];

    const { nextNode, decision } = resolveNextNode(graph, current, output, counts.loopCounts);
    if (decision !== undefined) {
      const last = ctx.trace[ctx.trace.length - 1];
      if (last !== undefined) {
        last.routingDecision = decision;
      }
      if (decision.reason === "loop-iteration") {
        counts.loopCounts.set(decision.matchedEdgeId, (counts.loopCounts.get(decision.matchedEdgeId) ?? 0) + 1);
      }
    }

    current = nextNode;
  }
  ctx.status = "completed";
}

/**
 * Run a graph to completion, to a safe stop, or to a HumanGate pause.
 *
 * Stops cleanly — returning the accumulated `ExecutionContext` with an error
 * step appended — when `maxSteps` is exceeded, instead of throwing or looping
 * forever. If the run reaches a `humangate` node, it returns with
 * `status: "paused_humangate"` and `pausedAt` set; call `resumeGraph` to continue.
 *
 * Cycle-safety note (V1): graphs may legitimately revisit a node (e.g. a retry
 * loop), so re-visiting is NOT itself treated as an error. The `visited` set is
 * maintained for future "non-progressing cycle" heuristics, but the actual
 * guard against infinite runs is the `maxSteps` ceiling — this is the documented
 * V1 trade-off called out in the spec.
 */
export async function runGraph(
  graph: Graph,
  initialInput: unknown,
  options: RunOptions = {},
): Promise<ExecutionContext> {
  validateGraph(graph);
  const startNode = findStartNode(graph);

  const adapters = options.adapters ?? mockAdapters;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

  const ctx: ExecutionContext = {
    state: createInitialState(initialInput),
    trace: [],
  };

  await runLoop(graph, ctx, startNode, adapters, maxSteps, freshCounts());
  return ctx;
}

/**
 * Resume a run that is paused on a HumanGate, applying a human `decision`.
 *
 * Vocabulary is aligned with the Oracle brick (Passe 4): the gate's output carries
 * both `decision` ("approve"|"reject") AND the Oracle `verdict` ("PASS"|"FAIL"),
 * plus a free-text `reasoning` (the human note). This lets a HumanGate and an
 * automatic Oracle be consumed the same way downstream.
 *
 * - "approve": record the decision as the gate's output and CONTINUE from the gate's
 *   successor, honouring the scheduler's normal conditional routing (an edge with
 *   `condition: "approve"` matches; a single edge is followed unconditionally).
 * - "reject": record the decision and STOP with `status: "rejected"` — a reject is a
 *   hard gate and never runs downstream nodes. (Documented choice: reject always
 *   halts; a future pass could honour an explicit `condition: "reject"` edge.)
 *
 * Throws if `ctx` is not paused on a humangate node of `graph`.
 */
export async function resumeGraph(
  ctx: ExecutionContext,
  graph: Graph,
  decision: "approve" | "reject",
  options: RunOptions = {},
  note?: string,
): Promise<ExecutionContext> {
  if (ctx.status !== "paused_humangate" || ctx.pausedAt === undefined) {
    throw new Error(
      `resumeGraph: context is not paused on a HumanGate (status is "${ctx.status ?? "completed"}").`,
    );
  }
  const gate = graph.nodes.find((n) => n.id === ctx.pausedAt);
  if (gate === undefined || gate.type !== "humangate") {
    throw new Error(
      `resumeGraph: paused node "${ctx.pausedAt}" is not a "humangate" node in this graph.`,
    );
  }

  const adapters = options.adapters ?? mockAdapters;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const counts = countsFromTrace(ctx);

  // Commit the human decision as the gate's output (mirrors executeNode's commit).
  const input = snapshotState(ctx.state);
  const rule = typeof gate.data["rule"] === "string" && gate.data["rule"].trim() !== ""
    ? (gate.data["rule"] as string)
    : null;
  const output = {
    type: "humangate",
    decision,
    verdict: decision === "approve" ? "PASS" : "FAIL",
    reasoning: note ?? (decision === "approve" ? "Approved by human" : "Rejected by human"),
    rule,
    note: note ?? null,
    timestamp: new Date().toISOString(),
  };
  ctx.state.nodes[gate.id] = output;
  const iteration = (counts.iterationCounts.get(gate.id) ?? 0) + 1;
  counts.iterationCounts.set(gate.id, iteration);
  counts.visited.add(gate.id);
  counts.steps += 1;
  const startedAt = Date.now();
  ctx.trace.push({
    nodeId: gate.id,
    nodeType: "humangate",
    input,
    output,
    startedAt,
    durationMs: Date.now() - startedAt,
    iteration,
  });

  delete ctx.pausedAt; // exactOptionalPropertyTypes: clear, don't assign undefined

  if (decision === "reject") {
    ctx.status = "rejected";
    return ctx;
  }

  // Approve → route from the gate on its decision output, then keep running.
  const { nextNode, decision: routeDecision } = resolveNextNode(graph, gate, output, counts.loopCounts);
  if (routeDecision !== undefined) {
    const last = ctx.trace[ctx.trace.length - 1];
    if (last !== undefined) {
      last.routingDecision = routeDecision;
    }
    if (routeDecision.reason === "loop-iteration") {
      counts.loopCounts.set(routeDecision.matchedEdgeId, (counts.loopCounts.get(routeDecision.matchedEdgeId) ?? 0) + 1);
    }
  }
  await runLoop(graph, ctx, nextNode, adapters, maxSteps, counts);
  return ctx;
}

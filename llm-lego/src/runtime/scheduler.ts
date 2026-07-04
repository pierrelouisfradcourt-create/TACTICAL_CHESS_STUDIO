/**
 * Branch resolution.
 *
 * Replaces the original POC's single-edge `getNextNode` with real branching:
 * a `router` node may have several outgoing edges and the next node is chosen
 * from the router's `routeKey`.
 */

import type { Edge, Graph, Node, RoutingDecision } from "../core/types.js";

export interface NextNodeResult {
  nextNode: Node | undefined;
  decision?: RoutingDecision;
}

/** Default per-loop-edge iteration ceiling when an edge omits `maxIterations`. */
export const DEFAULT_MAX_ITERATIONS = 10;

/** All edges leaving a given node, in declaration order. */
function outgoingEdges(graph: Graph, nodeId: string): Edge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

/** A loop edge is a flagged, bounded back-edge; everything else is a normal edge. */
function isLoopEdge(edge: Edge): boolean {
  return edge.loop === true;
}

function findNode(graph: Graph, nodeId: string): Node | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

/** Resolve an edge's effective iteration ceiling. */
function maxIterationsOf(edge: Edge): number {
  return typeof edge.maxIterations === "number" && edge.maxIterations > 0
    ? edge.maxIterations
    : DEFAULT_MAX_ITERATIONS;
}

/**
 * Read the `routeKey` a router node exposes in its output.
 * The executor guarantees a router's output is `{ routeKey: ... }`.
 */
function readRouteKey(nodeOutput: unknown): unknown {
  if (typeof nodeOutput === "object" && nodeOutput !== null && "routeKey" in nodeOutput) {
    return (nodeOutput as { routeKey: unknown }).routeKey;
  }
  return undefined;
}

/**
 * Read the decision value a node emits to drive a loop edge. Priority:
 * `decision` (e.g. a reviewer's OK/NOK), then `routeKey`, then `intent`.
 * Returned as a string for direct comparison with an edge `condition`.
 */
function readDecisionKey(nodeOutput: unknown): string | undefined {
  if (typeof nodeOutput !== "object" || nodeOutput === null) {
    return undefined;
  }
  const obj = nodeOutput as Record<string, unknown>;
  for (const key of ["decision", "routeKey", "intent"]) {
    if (key in obj) {
      const value = obj[key];
      return value === undefined || value === null ? undefined : String(value);
    }
  }
  return undefined;
}

/**
 * Detect a cycle built from NON-loop edges. Such a cycle has no bounded stop
 * condition and would only be caught at runtime by the `maxSteps` ceiling — an
 * accidental infinite loop. Loop edges (intentional, bounded) are excluded so a
 * legitimate refinement loop is NOT flagged. Returns a node id on the cycle, or
 * undefined if the non-loop subgraph is acyclic.
 */
function findNonLoopCycle(graph: Graph): string | undefined {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (isLoopEdge(edge)) continue;
    adjacency.get(edge.from)?.push(edge.to);
  }

  // 0 = unvisited, 1 = on the current DFS stack, 2 = done.
  const colour = new Map<string, number>();
  const stack: Array<{ id: string; i: number }> = [];

  for (const start of graph.nodes) {
    if ((colour.get(start.id) ?? 0) !== 0) continue;
    stack.push({ id: start.id, i: 0 });
    colour.set(start.id, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const neighbours = adjacency.get(frame.id) ?? [];
      if (frame.i < neighbours.length) {
        const next = neighbours[frame.i]!;
        frame.i += 1;
        const c = colour.get(next) ?? 0;
        if (c === 1) {
          return next; // back-edge to a node on the stack → cycle
        }
        if (c === 0) {
          colour.set(next, 1);
          stack.push({ id: next, i: 0 });
        }
      } else {
        colour.set(frame.id, 2);
        stack.pop();
      }
    }
  }
  return undefined;
}

/**
 * Validate the static shape of the graph. Throws on structural errors that
 * should never reach the runtime:
 *
 * - a non-router node with more than one outgoing edge (ambiguous branching).
 * - an edge pointing at a node id that does not exist.
 *
 * Called once by the engine before execution starts.
 */
export function validateGraph(graph: Graph): void {
  const ids = new Set(graph.nodes.map((n) => n.id));

  for (const edge of graph.edges) {
    if (!ids.has(edge.from)) {
      throw new Error(`Edge "${edge.id}" has unknown source node "${edge.from}"`);
    }
    if (!ids.has(edge.to)) {
      throw new Error(`Edge "${edge.id}" has unknown target node "${edge.to}"`);
    }
    // A loop edge MUST declare the decision value that triggers the return,
    // otherwise the loop has no stop/continue criterion.
    if (isLoopEdge(edge) && (edge.condition === undefined || edge.condition.trim() === "")) {
      throw new Error(
        `Loop edge "${edge.id}" (${edge.from} → ${edge.to}) must declare a non-empty ` +
          `"condition" (the decision value that triggers the loop).`,
      );
    }
  }

  // A non-router node may have at most ONE normal (non-loop) outgoing edge; loop
  // edges don't count toward this (a reviewer can have 1 forward edge + a loop back).
  for (const node of graph.nodes) {
    const normalOut = outgoingEdges(graph, node.id).filter((e) => !isLoopEdge(e));
    if (normalOut.length > 1 && node.type !== "router") {
      throw new Error(
        `Node "${node.id}" (type "${node.type}") has ${normalOut.length} non-loop outgoing edges. ` +
          `Only "router" nodes may have multiple outgoing edges.`,
      );
    }
  }

  // A "join" node declares the predecessors it waits for (data.waitFor: string[]).
  // Each declared id must be a real node in the graph (and not the join itself),
  // otherwise the barrier could never be satisfied — reject statically, don't crash
  // silently at runtime. (The runtime barrier in the executor checks PRESENCE in the
  // trace; this checks EXISTENCE in the graph.)
  for (const node of graph.nodes) {
    if (node.type !== "join") continue;
    const raw = node.data["waitFor"];
    const waitFor = Array.isArray(raw) ? raw : [];
    for (const ref of waitFor) {
      if (typeof ref !== "string" || !ids.has(ref)) {
        throw new Error(
          `join "${node.id}" declares waitFor "${String(ref)}" which is not a node in the graph.`,
        );
      }
      if (ref === node.id) {
        throw new Error(`join "${node.id}" cannot wait for itself.`);
      }
    }
  }

  // Reject accidental infinite loops: any cycle made of non-loop edges has no
  // bounded stop condition. Intentional loops must be flagged `loop: true`.
  const cycleNode = findNonLoopCycle(graph);
  if (cycleNode !== undefined) {
    throw new Error(
      `Graph has a cycle through "${cycleNode}" built from non-loop edges. ` +
        `An intentional loop must mark its back-edge with loop:true and a condition; ` +
        `otherwise this is an unbounded cycle and is rejected.`,
    );
  }
}

/**
 * Resolve the next node to execute after `currentNode`.
 *
 * Loop edges are considered FIRST: if the node's decision value matches a loop
 * edge's `condition` and that loop has not hit its `maxIterations`, the loop is
 * followed (`reason: "loop-iteration"`). If it matches but the loop is exhausted,
 * the loop is NOT followed and a `loop-max-iterations` decision is recorded so
 * the stop is visible; resolution falls through to the normal edges (clean exit).
 *
 * Then the normal (non-loop) edges:
 * - 0 normal edges → end of graph (`nextNode: undefined`).
 * - 1 normal edge → direct next.
 * - multiple normal edges → `currentNode` must be a router; the match is chosen
 *   from the router's `routeKey`:
 *     1. edge whose `condition === routeKey`        → "exact-match"
 *     2. edge whose `condition === "default"`       → "default-fallback"
 *     3. first edge                                 → "first-edge-fallback" (warns)
 *
 * `loopCounts` maps loop-edge id → times already traversed; the engine owns it
 * and increments it when this function returns a `loop-iteration` decision.
 */
export function resolveNextNode(
  graph: Graph,
  currentNode: Node,
  nodeOutput: unknown,
  loopCounts: Map<string, number> = new Map(),
): NextNodeResult {
  const all = outgoingEdges(graph, currentNode.id);
  const loopEdges = all.filter(isLoopEdge);
  const normalEdges = all.filter((e) => !isLoopEdge(e));

  // --- Loop edges first ---
  const decisionKey = readDecisionKey(nodeOutput);
  let exhausted: RoutingDecision | undefined;
  if (decisionKey !== undefined) {
    for (const edge of loopEdges) {
      if (edge.condition !== decisionKey) continue;
      const used = loopCounts.get(edge.id) ?? 0;
      if (used < maxIterationsOf(edge)) {
        return {
          nextNode: findNode(graph, edge.to),
          decision: { routeKey: decisionKey, matchedEdgeId: edge.id, reason: "loop-iteration" },
        };
      }
      // Matched but exhausted — remember it so the stop is recorded, then exit.
      exhausted = { routeKey: decisionKey, matchedEdgeId: edge.id, reason: "loop-max-iterations" };
      break;
    }
  }

  const withExhausted = (result: NextNodeResult): NextNodeResult =>
    exhausted !== undefined && result.decision === undefined
      ? { ...result, decision: exhausted }
      : result;

  // --- Normal edges ---
  if (normalEdges.length === 0) {
    return withExhausted({ nextNode: undefined });
  }

  if (normalEdges.length === 1) {
    const edge = normalEdges[0]!;
    // A single edge is always followed, condition or not.
    return withExhausted({ nextNode: findNode(graph, edge.to) });
  }

  // Multiple normal edges: this is a branch and only routers may branch.
  if (currentNode.type !== "router") {
    throw new Error(
      `Node "${currentNode.id}" (type "${currentNode.type}") has ${normalEdges.length} non-loop outgoing edges. ` +
        `Only "router" nodes may have multiple outgoing edges.`,
    );
  }

  const out = normalEdges;
  const routeKey = readRouteKey(nodeOutput);
  const routeKeyStr = routeKey === undefined || routeKey === null ? undefined : String(routeKey);

  // 1. exact match
  if (routeKeyStr !== undefined) {
    const exact = out.find((e) => e.condition === routeKeyStr);
    if (exact) {
      return {
        nextNode: findNode(graph, exact.to),
        decision: { routeKey, matchedEdgeId: exact.id, reason: "exact-match" },
      };
    }
  }

  // 2. default fallback
  const def = out.find((e) => e.condition === "default");
  if (def) {
    return {
      nextNode: findNode(graph, def.to),
      decision: { routeKey, matchedEdgeId: def.id, reason: "default-fallback" },
    };
  }

  // 3. first-edge fallback — should not happen with a well-formed router graph.
  const first = out[0]!;
  // eslint-disable-next-line no-console
  console.warn(
    `[scheduler] router "${currentNode.id}" found no edge matching routeKey ` +
      `"${routeKeyStr ?? String(routeKey)}" and no "default" edge; ` +
      `falling back to first edge "${first.id}".`,
  );
  return {
    nextNode: findNode(graph, first.to),
    decision: { routeKey, matchedEdgeId: first.id, reason: "first-edge-fallback" },
  };
}

/**
 * Node executor.
 *
 * Executes a single node against the *canonical* state (the full
 * `{ initial, nodes }`, not just the previous node's output), records a full
 * trace step, and writes the result back into `ctx.state.nodes`.
 */

import type { AdapterMeta, Adapters } from "../adapters/types.js";
import { resolvePath, snapshotState } from "../core/state.js";
import type { ExecutionContext, Node, TraceStep } from "../core/types.js";
import { logTrace } from "../observability/trace.js";

/**
 * Dispatch a node to its adapter (llm/tool/agent) or resolve a router.
 *
 * A router reads `node.data.path` against the canonical state and returns
 * `{ routeKey }`. If the path is missing/unresolved, it falls back to
 * `node.data.defaultRoute`. The scheduler consumes that `routeKey` to branch.
 */
async function dispatch(
  node: Node,
  ctx: ExecutionContext,
  adapters: Adapters,
  meta: AdapterMeta,
): Promise<unknown> {
  switch (node.type) {
    case "llm":
      return adapters.llm(node.data, ctx.state, meta);
    case "tool":
      return adapters.tool(node.data, ctx.state, meta);
    case "agent":
      return adapters.agent(node.data, ctx.state, meta);
    case "router": {
      const path = node.data["path"];
      const defaultRoute = node.data["defaultRoute"];
      if (typeof path === "string") {
        const resolved = resolvePath(ctx.state, path);
        return { routeKey: resolved !== undefined ? resolved : defaultRoute };
      }
      return { routeKey: defaultRoute };
    }
    case "humangate":
      // A HumanGate never produces an automatic output — the engine pauses BEFORE
      // executing it (see runGraph/runLoop) and waits for resumeGraph. Reaching
      // dispatch means the caller bypassed the pause; fail loudly rather than emit
      // a bogus output.
      throw new Error(
        `HumanGate node "${node.id}" must be paused by the engine, not dispatched by executeNode.`,
      );
  }
}

/**
 * Execute `node` and commit its result to the context.
 *
 * - Reads the canonical `ctx.state`.
 * - On a thrown error, the output becomes `{ error: message }` and execution of
 *   the run continues (the error is also recorded on the trace step). This
 *   mirrors the original POC's resilient behaviour.
 * - Writes the output to `ctx.state.nodes[node.id]` — the global state is never
 *   overwritten, only extended.
 * - `outputKey`: if `node.data.outputKey` is a non-empty string, the output is
 *   ALSO aliased at `ctx.state.nodes[outputKey]`. This lets downstream routers
 *   reference a stable logical name (`nodes.<outputKey>.x`) independent of the
 *   physical node id.
 * - Records a complete `TraceStep` (with `durationMs`) into `ctx.trace`.
 */
export async function executeNode(
  node: Node,
  ctx: ExecutionContext,
  adapters: Adapters,
  iteration = 1,
): Promise<unknown> {
  const startedAt = Date.now();
  // Snapshot what the node actually read, before we mutate the state with its output.
  const input = snapshotState(ctx.state);

  let output: unknown;
  let errorMessage: string | undefined;

  try {
    output = await dispatch(node, ctx, adapters, { nodeId: node.id, iteration });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    output = { error: errorMessage };
  }

  // Commit to canonical state (extend, never overwrite the whole state).
  ctx.state.nodes[node.id] = output;

  const outputKey = node.data["outputKey"];
  if (typeof outputKey === "string" && outputKey.length > 0 && outputKey !== node.id) {
    ctx.state.nodes[outputKey] = output;
  }

  const step: TraceStep = {
    nodeId: node.id,
    nodeType: node.type,
    input,
    output,
    startedAt,
    durationMs: Date.now() - startedAt,
    iteration,
  };
  if (errorMessage !== undefined) {
    step.error = errorMessage;
  }
  logTrace(ctx, step);

  return output;
}

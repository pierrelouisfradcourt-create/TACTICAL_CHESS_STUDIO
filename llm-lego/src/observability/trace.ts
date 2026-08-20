/**
 * Observability helpers for the execution trace.
 */

import type { ExecutionContext, NodeType, RoutingDecision, TraceStep } from "../core/types.js";

/** Append a step to the trace. Kept trivial on purpose. */
export function logTrace(ctx: ExecutionContext, step: TraceStep): void {
  ctx.trace.push(step);
}

export interface TraceSummaryRow {
  nodeId: string;
  type: NodeType;
  durationMs: number;
  routingDecision?: RoutingDecision;
  error?: string;
}

/**
 * Compact, human-readable view of a run — useful for quick debugging without
 * dumping the full state snapshots carried by each `TraceStep`.
 */
export function summarizeTrace(ctx: ExecutionContext): TraceSummaryRow[] {
  return ctx.trace.map((step) => {
    const row: TraceSummaryRow = {
      nodeId: step.nodeId,
      type: step.nodeType,
      durationMs: step.durationMs,
    };
    if (step.routingDecision !== undefined) {
      row.routingDecision = step.routingDecision;
    }
    if (step.error !== undefined) {
      row.error = step.error;
    }
    return row;
  });
}

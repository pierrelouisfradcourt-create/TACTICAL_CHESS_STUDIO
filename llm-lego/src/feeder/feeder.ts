/**
 * Feeder — harvests successful trace steps into the Library.
 *
 * Mapping (by node type), matching the original POC's intent:
 *   - "llm"    → library.prompts
 *   - "agent"  → library.agents
 *   - "tool"   → library.tools
 *   - "router" → ignored (control flow, not a reusable artefact)
 *
 * Steps that errored are skipped — a failed call is not library material.
 */

import type { ExecutionContext } from "../core/types.js";
import { createLibrary, type Library } from "../library/registry.js";

export function feedTraceToLibrary(
  ctx: ExecutionContext,
  library: Library = createLibrary(),
): Library {
  for (const step of ctx.trace) {
    if (step.error !== undefined) {
      continue;
    }
    const entry = { nodeId: step.nodeId, output: step.output };
    switch (step.nodeType) {
      case "llm":
        library.prompts.push(entry);
        break;
      case "agent":
        library.agents.push(entry);
        break;
      case "tool":
        library.tools.push(entry);
        break;
      case "router":
        break;
    }
  }
  return library;
}

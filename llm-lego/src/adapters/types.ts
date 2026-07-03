/**
 * Adapter contract.
 *
 * The executor never knows whether it is talking to a mock or a real API.
 * Swapping `mockAdapters` for production adapters that hit an LLM / tool / agent
 * backend requires no change to the executor.
 */

import type { EngineState } from "../core/types.js";

/**
 * Per-execution context passed to an adapter. `iteration` is the 1-based count of
 * how many times THIS node has run in the current graph execution (it grows on
 * each pass through a loop). It lets a mock — or a real adapter — behave
 * deterministically across loop passes (e.g. a reviewer that returns NOK on the
 * first passes and OK once a budget is reached) without reading hidden state.
 */
export interface AdapterMeta {
  nodeId: string;
  iteration: number;
}

export type AdapterFn = (
  data: Record<string, unknown>,
  state: EngineState,
  meta?: AdapterMeta,
) => Promise<unknown>;

export interface Adapters {
  llm: AdapterFn;
  tool: AdapterFn;
  agent: AdapterFn;
}

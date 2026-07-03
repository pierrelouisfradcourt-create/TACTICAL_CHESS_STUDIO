import { describe, expect, it } from "vitest";

import { mockAdapters } from "../src/adapters/mock.js";
import type { Adapters } from "../src/adapters/types.js";
import { createInitialState } from "../src/core/state.js";
import type { ExecutionContext, Node } from "../src/core/types.js";
import { executeNode } from "../src/runtime/executor.js";

function freshCtx(initial: unknown): ExecutionContext {
  return { state: createInitialState(initial), trace: [] };
}

function node(id: string, type: Node["type"], data: Record<string, unknown> = {}): Node {
  return { id, type, data };
}

describe("executeNode", () => {
  it("executes an llm node and records the output in canonical state", async () => {
    const ctx = freshCtx({ query: "hi" });
    const n = node("n-llm", "llm", { prompt: "hello" });

    const output = await executeNode(n, ctx, mockAdapters);

    expect(ctx.state.nodes["n-llm"]).toBe(output);
    expect(output).toMatchObject({ type: "llm", prompt: "hello" });
    expect(ctx.trace).toHaveLength(1);
    expect(ctx.trace[0]?.nodeId).toBe("n-llm");
    expect(ctx.trace[0]?.nodeType).toBe("llm");
    expect(ctx.trace[0]?.error).toBeUndefined();
  });

  it("executes a tool node", async () => {
    const ctx = freshCtx({});
    const output = await executeNode(node("n-tool", "tool", { tool: "search" }), ctx, mockAdapters);
    expect(output).toMatchObject({ type: "tool", tool: "search" });
    expect(ctx.state.nodes["n-tool"]).toBe(output);
  });

  it("executes an agent node", async () => {
    const ctx = freshCtx({});
    const output = await executeNode(node("n-agent", "agent", { agent: "bot" }), ctx, mockAdapters);
    expect(output).toMatchObject({ type: "agent", agent: "bot" });
    expect(ctx.state.nodes["n-agent"]).toBe(output);
  });

  it("executes a router node by resolving its path against canonical state", async () => {
    const ctx = freshCtx({ intent: "search" });
    const output = await executeNode(
      node("n-router", "router", { path: "initial.intent" }),
      ctx,
      mockAdapters,
    );
    expect(output).toEqual({ routeKey: "search" });
  });

  it("router falls back to defaultRoute when the path does not resolve", async () => {
    const ctx = freshCtx({});
    const output = await executeNode(
      node("n-router", "router", { path: "initial.missing", defaultRoute: "chat" }),
      ctx,
      mockAdapters,
    );
    expect(output).toEqual({ routeKey: "chat" });
  });

  it("does not overwrite previously computed node outputs", async () => {
    const ctx = freshCtx({ query: "hi" });
    await executeNode(node("n-llm", "llm", { prompt: "a" }), ctx, mockAdapters);
    await executeNode(node("n-tool", "tool", { tool: "t" }), ctx, mockAdapters);

    expect(Object.keys(ctx.state.nodes).sort()).toEqual(["n-llm", "n-tool"]);
    expect(ctx.state.nodes["n-llm"]).toMatchObject({ type: "llm" });
    expect(ctx.state.nodes["n-tool"]).toMatchObject({ type: "tool" });
    expect(ctx.state.initial).toEqual({ query: "hi" });
    expect(ctx.trace).toHaveLength(2);
  });

  it("aliases the output under data.outputKey when provided", async () => {
    const ctx = freshCtx({});
    const output = await executeNode(
      node("n-llm", "llm", { prompt: "a", outputKey: "analysis" }),
      ctx,
      mockAdapters,
    );
    expect(ctx.state.nodes["n-llm"]).toBe(output);
    expect(ctx.state.nodes["analysis"]).toBe(output);
  });

  it("captures adapter errors as { error } output without throwing", async () => {
    const throwingAdapters: Adapters = {
      llm: async () => {
        throw new Error("boom");
      },
      tool: mockAdapters.tool,
      agent: mockAdapters.agent,
    };

    const ctx = freshCtx({});
    const output = await executeNode(node("n-llm", "llm"), ctx, throwingAdapters);

    expect(output).toEqual({ error: "boom" });
    expect(ctx.state.nodes["n-llm"]).toEqual({ error: "boom" });
    expect(ctx.trace[0]?.error).toBe("boom");
  });
});

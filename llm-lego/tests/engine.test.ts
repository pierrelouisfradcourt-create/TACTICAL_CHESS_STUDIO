import { describe, expect, it } from "vitest";

import { runGraph } from "../src/core/engine.js";
import { feedTraceToLibrary } from "../src/feeder/feeder.js";
import { summarizeTrace } from "../src/observability/trace.js";
import type { Graph } from "../src/core/types.js";

/**
 * Fixture from the React POC: analyzer → router → (search | chat).
 * The analyzer (mock llm) surfaces an `intent` derived from the run input;
 * the router branches on `nodes.node-analyzer.intent`.
 */
const routerGraph: Graph = {
  nodes: [
    { id: "node-analyzer", type: "llm", data: { prompt: "classify the query" } },
    {
      id: "node-router",
      type: "router",
      data: { path: "nodes.node-analyzer.intent", defaultRoute: "chat" },
    },
    { id: "node-search", type: "tool", data: { tool: "web-search" } },
    { id: "node-chat", type: "agent", data: { agent: "chatbot" } },
  ],
  edges: [
    { id: "e-analyzer-router", from: "node-analyzer", to: "node-router" },
    { id: "e-router-search", from: "node-router", to: "node-search", condition: "search" },
    { id: "e-router-chat", from: "node-router", to: "node-chat", condition: "chat" },
  ],
};

describe("runGraph — router branching", () => {
  it("takes the search branch when intent is 'search'", async () => {
    const ctx = await runGraph(routerGraph, { query: "weather?", intent: "search" });
    const visited = ctx.trace.map((s) => s.nodeId);

    expect(visited).toContain("node-search");
    expect(visited).not.toContain("node-chat");
    expect(visited).toEqual(["node-analyzer", "node-router", "node-search"]);

    const routerStep = ctx.trace.find((s) => s.nodeId === "node-router");
    expect(routerStep?.routingDecision).toMatchObject({
      routeKey: "search",
      matchedEdgeId: "e-router-search",
      reason: "exact-match",
    });
  });

  it("takes the chat branch when intent is 'chat'", async () => {
    const ctx = await runGraph(routerGraph, { query: "hello", intent: "chat" });
    const visited = ctx.trace.map((s) => s.nodeId);

    expect(visited).toContain("node-chat");
    expect(visited).not.toContain("node-search");
    expect(visited).toEqual(["node-analyzer", "node-router", "node-chat"]);
  });

  it("produces a readable trace summary and feeds the library", async () => {
    const ctx = await runGraph(routerGraph, { query: "weather?", intent: "search" });

    const summary = summarizeTrace(ctx);
    expect(summary.map((r) => r.type)).toEqual(["llm", "router", "tool"]);

    const library = feedTraceToLibrary(ctx);
    expect(library.prompts).toHaveLength(1); // analyzer (llm)
    expect(library.tools).toHaveLength(1); // search (tool)
    expect(library.agents).toHaveLength(0); // chat branch not taken
  });
});

describe("runGraph — start node detection", () => {
  it("throws when there is no unique start node", async () => {
    const graph: Graph = {
      nodes: [
        { id: "a", type: "tool", data: {} },
        { id: "b", type: "tool", data: {} },
      ],
      edges: [], // both have 0 incoming → ambiguous
    };
    await expect(runGraph(graph, {})).rejects.toThrow(/exactly one start node/);
  });
});

describe("runGraph — cycle safety", () => {
  // CONTRACT CHANGE (loop support pass): an UNCONDITIONAL cycle (built from
  // non-loop edges) is now REJECTED at validation, instead of running to the
  // maxSteps ceiling. Intentional loops must be flagged loop:true + condition.
  // This is the spec'd behaviour: "un cycle sans condition d'arrêt reste une erreur".
  it("rejects an unconditional cycle (no stop condition) at validation", async () => {
    // s → a → b → a → b ... — a/b loop forever with plain (non-loop) edges.
    const loopGraph: Graph = {
      nodes: [
        { id: "s", type: "tool", data: {} },
        { id: "a", type: "tool", data: {} },
        { id: "b", type: "tool", data: {} },
      ],
      edges: [
        { id: "e-s-a", from: "s", to: "a" },
        { id: "e-a-b", from: "a", to: "b" },
        { id: "e-b-a", from: "b", to: "a" },
      ],
    };

    await expect(runGraph(loopGraph, {}, { maxSteps: 5 })).rejects.toThrow(
      /cycle through "[ab]" built from non-loop edges/,
    );
  });

  it("maxSteps still backstops a non-terminating INTENTIONAL loop", async () => {
    // A flagged loop whose condition always matches and whose maxIterations is
    // huge: bounded in principle, but maxSteps is the hard global backstop.
    // router `a` always emits routeKey "go"; the loop self-edge matches "go".
    const loopGraph: Graph = {
      nodes: [
        { id: "s", type: "tool", data: {} },
        { id: "a", type: "router", data: { path: "nodes.none", defaultRoute: "go" } },
      ],
      edges: [
        { id: "e-s-a", from: "s", to: "a" },
        { id: "e-loop", from: "a", to: "a", condition: "go", loop: true, maxIterations: 9999 },
      ],
    };

    const ctx = await runGraph(loopGraph, {}, { maxSteps: 5 });
    const last = ctx.trace[ctx.trace.length - 1];

    expect(last?.error).toBe("max steps exceeded");
    // 5 executed steps + 1 synthetic control-error step
    expect(ctx.trace).toHaveLength(6);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveNextNode, validateGraph } from "../src/runtime/scheduler.js";
import type { Graph, Node } from "../src/core/types.js";

function node(id: string, type: Node["type"]): Node {
  return { id, type, data: {} };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveNextNode", () => {
  it("follows a single unconditional edge with no routing decision", () => {
    const a = node("a", "tool");
    const b = node("b", "tool");
    const graph: Graph = {
      nodes: [a, b],
      edges: [{ id: "e1", from: "a", to: "b" }],
    };

    const result = resolveNextNode(graph, a, { result: "x" });
    expect(result.nextNode?.id).toBe("b");
    expect(result.decision).toBeUndefined();
  });

  it("returns undefined next node when there are no outgoing edges", () => {
    const a = node("a", "tool");
    const graph: Graph = { nodes: [a], edges: [] };
    const result = resolveNextNode(graph, a, undefined);
    expect(result.nextNode).toBeUndefined();
    expect(result.decision).toBeUndefined();
  });

  it("router picks the exact-match edge", () => {
    const r = node("r", "router");
    const s = node("s", "tool");
    const c = node("c", "agent");
    const graph: Graph = {
      nodes: [r, s, c],
      edges: [
        { id: "e-search", from: "r", to: "s", condition: "search" },
        { id: "e-chat", from: "r", to: "c", condition: "chat" },
      ],
    };

    const result = resolveNextNode(graph, r, { routeKey: "search" });
    expect(result.nextNode?.id).toBe("s");
    expect(result.decision).toEqual({
      routeKey: "search",
      matchedEdgeId: "e-search",
      reason: "exact-match",
    });
  });

  it("router falls back to the default edge when no condition matches", () => {
    const r = node("r", "router");
    const s = node("s", "tool");
    const c = node("c", "agent");
    const graph: Graph = {
      nodes: [r, s, c],
      edges: [
        { id: "e-search", from: "r", to: "s", condition: "search" },
        { id: "e-default", from: "r", to: "c", condition: "default" },
      ],
    };

    const result = resolveNextNode(graph, r, { routeKey: "totally-unknown" });
    expect(result.nextNode?.id).toBe("c");
    expect(result.decision?.reason).toBe("default-fallback");
    expect(result.decision?.matchedEdgeId).toBe("e-default");
  });

  it("router falls back to the first edge (and warns) when nothing matches", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = node("r", "router");
    const s = node("s", "tool");
    const c = node("c", "agent");
    const graph: Graph = {
      nodes: [r, s, c],
      edges: [
        { id: "e-search", from: "r", to: "s", condition: "search" },
        { id: "e-chat", from: "r", to: "c", condition: "chat" },
      ],
    };

    const result = resolveNextNode(graph, r, { routeKey: "unknown" });
    expect(result.nextNode?.id).toBe("s");
    expect(result.decision?.reason).toBe("first-edge-fallback");
    expect(result.decision?.matchedEdgeId).toBe("e-search");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("throws when a non-router node has multiple outgoing edges", () => {
    const a = node("a", "tool");
    const b = node("b", "tool");
    const c = node("c", "tool");
    const graph: Graph = {
      nodes: [a, b, c],
      edges: [
        { id: "e1", from: "a", to: "b" },
        { id: "e2", from: "a", to: "c" },
      ],
    };

    expect(() => resolveNextNode(graph, a, undefined)).toThrow(/Only "router" nodes/);
  });
});

describe("validateGraph", () => {
  it("throws when a non-router node has multiple outgoing edges", () => {
    const graph: Graph = {
      nodes: [node("a", "llm"), node("b", "tool"), node("c", "tool")],
      edges: [
        { id: "e1", from: "a", to: "b" },
        { id: "e2", from: "a", to: "c" },
      ],
    };
    expect(() => validateGraph(graph)).toThrow(/Only "router" nodes/);
  });

  it("throws when an edge points to an unknown node", () => {
    const graph: Graph = {
      nodes: [node("a", "tool")],
      edges: [{ id: "e1", from: "a", to: "ghost" }],
    };
    expect(() => validateGraph(graph)).toThrow(/unknown target node/);
  });

  it("accepts a router with multiple outgoing edges", () => {
    const graph: Graph = {
      nodes: [node("r", "router"), node("s", "tool"), node("c", "agent")],
      edges: [
        { id: "e1", from: "r", to: "s", condition: "search" },
        { id: "e2", from: "r", to: "c", condition: "chat" },
      ],
    };
    expect(() => validateGraph(graph)).not.toThrow();
  });
});

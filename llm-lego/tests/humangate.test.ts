// HumanGate — engine pause/resume tests. New feature (this pass). Existing test
// files are left untouched; a graph WITHOUT a humangate must behave exactly as
// before (explicit non-regression test below).
import { describe, it, expect } from "vitest";

import { runGraph, resumeGraph } from "../src/core/engine.js";
import type { Graph } from "../src/core/types.js";

// analyzer(llm) → gate(humangate) → tail(llm)
function gatedGraph(gateData: Record<string, unknown> = { message: "Valider ?" }): Graph {
  return {
    nodes: [
      { id: "a", type: "llm", data: { prompt: "p", outputKey: "a" } },
      { id: "gate", type: "humangate", data: gateData },
      { id: "tail", type: "llm", data: { prompt: "after gate", outputKey: "tail" } },
    ],
    edges: [
      { id: "e1", from: "a", to: "gate" },
      { id: "e2", from: "gate", to: "tail" },
    ],
  };
}

describe("HumanGate — pause", () => {
  it("pauses the run at the humangate node (no output beyond it)", async () => {
    const ctx = await runGraph(gatedGraph(), { q: "x" });
    expect(ctx.status).toBe("paused_humangate");
    expect(ctx.pausedAt).toBe("gate");
    // analyzer ran, gate did NOT auto-produce output, tail NOT reached.
    expect(ctx.state.nodes["a"]).toBeDefined();
    expect(ctx.state.nodes["gate"]).toBeUndefined();
    expect(ctx.state.nodes["tail"]).toBeUndefined();
    expect(ctx.trace.map((s) => s.nodeId)).toEqual(["a"]);
  });
});

describe("HumanGate — resume approve", () => {
  it("continues execution to the end and records the decision (verdict PASS)", async () => {
    const paused = await runGraph(gatedGraph(), { q: "x" });
    const ctx = await resumeGraph(paused, gatedGraph(), "approve", {}, "looks good");
    expect(ctx.status).toBe("completed");
    expect(ctx.pausedAt).toBeUndefined();
    // gate output uses the Oracle vocabulary (decision + verdict + reasoning).
    expect(ctx.state.nodes["gate"]).toMatchObject({ decision: "approve", verdict: "PASS", reasoning: "looks good" });
    // tail ran after approval.
    expect(ctx.state.nodes["tail"]).toBeDefined();
    expect(ctx.trace.map((s) => s.nodeId)).toEqual(["a", "gate", "tail"]);
  });
});

describe("HumanGate — resume reject", () => {
  it("stops cleanly without running downstream nodes (verdict FAIL)", async () => {
    const paused = await runGraph(gatedGraph(), { q: "x" });
    const ctx = await resumeGraph(paused, gatedGraph(), "reject", {}, "nope");
    expect(ctx.status).toBe("rejected");
    expect(ctx.state.nodes["gate"]).toMatchObject({ decision: "reject", verdict: "FAIL" });
    // tail must NOT have run.
    expect(ctx.state.nodes["tail"]).toBeUndefined();
    expect(ctx.trace.map((s) => s.nodeId)).toEqual(["a", "gate"]);
  });
});

describe("HumanGate — resume guard", () => {
  it("throws when the context is not paused on a humangate", async () => {
    // A completed (non-gated) run cannot be resumed.
    const done = await runGraph(
      { nodes: [{ id: "only", type: "llm", data: {} }], edges: [] },
      {},
    );
    await expect(resumeGraph(done, gatedGraph(), "approve")).rejects.toThrow(/not paused on a HumanGate/i);
  });
});

describe("HumanGate — carries an Oracle rule", () => {
  it("propagates the gate's rule into the decision output (approve)", async () => {
    const g = gatedGraph({ message: "Valider ?", rule: "must be valid JSON", actsAsOracle: true });
    const paused = await runGraph(g, {});
    const ctx = await resumeGraph(paused, g, "approve");
    expect(ctx.state.nodes["gate"]).toMatchObject({ verdict: "PASS", rule: "must be valid JSON" });
  });
});

describe("HumanGate — NON-REGRESSION: graph without a gate", () => {
  it("a gate-free routing-style graph runs end-to-end, status completed", async () => {
    const routing: Graph = {
      nodes: [
        { id: "analyzer", type: "llm", data: { prompt: "a", outputKey: "intent" } },
        { id: "router", type: "router", data: { path: "nodes.analyzer.intent", defaultRoute: "chat" } },
        { id: "search", type: "tool", data: { name: "search" } },
        { id: "chat", type: "llm", data: { prompt: "reply" } },
      ],
      edges: [
        { id: "e1", from: "analyzer", to: "router" },
        { id: "e2", from: "router", to: "search", condition: "search" },
        { id: "e3", from: "router", to: "chat", condition: "chat" },
      ],
    };
    const ctx = await runGraph(routing, { intent: "search" });
    expect(ctx.status).toBe("completed");
    expect(ctx.pausedAt).toBeUndefined();
    expect(ctx.trace.map((s) => s.nodeId)).toContain("search");
    expect(ctx.trace.map((s) => s.nodeId)).not.toContain("chat");
  });
});

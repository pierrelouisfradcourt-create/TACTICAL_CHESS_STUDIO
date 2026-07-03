import { describe, expect, it } from "vitest";

import { runGraph } from "../src/core/engine.js";
import { validateGraph } from "../src/runtime/scheduler.js";
import type { Adapters } from "../src/adapters/types.js";
import type { Graph } from "../src/core/types.js";

/**
 * A deterministic "reviewer" agent: NOK while iteration <= okAfter, then OK.
 * Reads `meta.iteration` so a refinement loop runs a fixed number of passes.
 */
function councilAdapters(): Adapters {
  return {
    async llm(data) {
      return { type: "llm", text: `mock:${String(data["role"] ?? "llm")}` };
    },
    async tool(data) {
      return { type: "tool", text: `mock:${String(data["role"] ?? "tool")}` };
    },
    async agent(data, _state, meta) {
      const okAfter = data["okAfter"];
      if (okAfter !== undefined) {
        const iteration = meta?.iteration ?? 1;
        const decision = iteration > Number(okAfter) ? "OK" : "NOK";
        return { type: "agent", role: data["role"], decision, iteration };
      }
      return { type: "agent", role: data["role"], output: "ok" };
    },
  };
}

/** coder → tester → reviewer, with a loop edge reviewer →(NOK)→ coder. */
function fastLoopGraph(maxIterations: number): Graph {
  return {
    nodes: [
      { id: "coder", type: "agent", data: { role: "qwen-coder" } },
      { id: "tester", type: "agent", data: { role: "tester" } },
      { id: "reviewer", type: "agent", data: { role: "claude-reviewer", okAfter: 2 } },
    ],
    edges: [
      { id: "e-coder-tester", from: "coder", to: "tester" },
      { id: "e-tester-reviewer", from: "tester", to: "reviewer" },
      { id: "e-loop", from: "reviewer", to: "coder", condition: "NOK", loop: true, maxIterations },
    ],
  };
}

describe("loops — intentional bounded feedback", () => {
  it("runs N passes then stops on the OK decision", async () => {
    // okAfter=2 → reviewer returns NOK on passes 1,2 then OK on pass 3.
    const ctx = await runGraph(fastLoopGraph(5), {}, { adapters: councilAdapters() });

    const reviewer = ctx.trace.filter((s) => s.nodeId === "reviewer");
    const coder = ctx.trace.filter((s) => s.nodeId === "coder");

    // 3 passes through coder + reviewer (iterations 1,2,3); stops on OK.
    expect(coder.map((s) => s.iteration)).toEqual([1, 2, 3]);
    expect(reviewer.map((s) => s.iteration)).toEqual([1, 2, 3]);
    expect((reviewer[2]!.output as { decision: string }).decision).toBe("OK");

    // Two loop-iteration decisions recorded (after passes 1 and 2), none after pass 3.
    const loopSteps = ctx.trace.filter((s) => s.routingDecision?.reason === "loop-iteration");
    expect(loopSteps).toHaveLength(2);

    // No control error: the loop ended cleanly, not via maxSteps.
    expect(ctx.trace.some((s) => s.error)).toBe(false);
  });

  it("stops cleanly at maxIterations when the OK never comes", async () => {
    // reviewer always NOK (okAfter huge), loop capped at 3.
    const graph: Graph = {
      nodes: [
        { id: "coder", type: "agent", data: { role: "qwen-coder" } },
        { id: "reviewer", type: "agent", data: { role: "claude-reviewer", okAfter: 999 } },
      ],
      edges: [
        { id: "e-coder-reviewer", from: "coder", to: "reviewer" },
        { id: "e-loop", from: "reviewer", to: "coder", condition: "NOK", loop: true, maxIterations: 3 },
      ],
    };

    const ctx = await runGraph(graph, {}, { adapters: councilAdapters(), maxSteps: 100 });

    // maxIterations = max times the BACK-EDGE fires. It fires 3× → the body runs
    // 1 (initial) + 3 (loop-backs) = 4 times, then stops cleanly.
    const coder = ctx.trace.filter((s) => s.nodeId === "coder");
    expect(coder.map((s) => s.iteration)).toEqual([1, 2, 3, 4]);
    const loopFires = ctx.trace.filter((s) => s.routingDecision?.reason === "loop-iteration");
    expect(loopFires).toHaveLength(3);
    // The loop hit its ceiling → a loop-max-iterations decision is recorded, clean stop.
    const last = ctx.trace[ctx.trace.length - 1]!;
    expect(last.routingDecision?.reason).toBe("loop-max-iterations");
    expect(ctx.trace.some((s) => s.error === "max steps exceeded")).toBe(false);
  });

  it("rejects an accidental cycle built from non-loop edges", () => {
    const cyclic: Graph = {
      nodes: [
        { id: "a", type: "agent", data: {} },
        { id: "b", type: "agent", data: {} },
      ],
      edges: [
        { id: "e-a-b", from: "a", to: "b" },
        { id: "e-b-a", from: "b", to: "a" }, // non-loop back-edge → unbounded cycle
      ],
    };
    expect(() => validateGraph(cyclic)).toThrow(/cycle .* non-loop edges/);
  });

  it("rejects a loop edge without a stop condition", () => {
    const bad: Graph = {
      nodes: [
        { id: "a", type: "agent", data: {} },
        { id: "b", type: "agent", data: {} },
      ],
      edges: [
        { id: "e-a-b", from: "a", to: "b" },
        { id: "e-loop", from: "b", to: "a", loop: true }, // no condition
      ],
    };
    expect(() => validateGraph(bad)).toThrow(/must declare a non-empty "condition"/);
  });

  it("keeps a unique start node despite the loop-back edge", async () => {
    // coder has an incoming loop edge but 0 non-loop incoming → still the start.
    const ctx = await runGraph(fastLoopGraph(5), {}, { adapters: councilAdapters() });
    expect(ctx.trace[0]!.nodeId).toBe("coder");
    expect(ctx.trace[0]!.iteration).toBe(1);
  });
});

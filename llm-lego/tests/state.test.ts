import { describe, expect, it } from "vitest";

import { resolvePath } from "../src/core/state.js";
import type { EngineState } from "../src/core/types.js";

const state: EngineState = {
  initial: { query: "hello", intent: "search" },
  nodes: {
    "node-analyzer": {
      intent: "search",
      nested: { deep: { value: 42 } },
    },
  },
};

describe("resolvePath", () => {
  it("resolves a deep valid path", () => {
    expect(resolvePath(state, "nodes.node-analyzer.nested.deep.value")).toBe(42);
    expect(resolvePath(state, "nodes.node-analyzer.intent")).toBe("search");
    expect(resolvePath(state, "initial.intent")).toBe("search");
    expect(resolvePath(state, "initial.query")).toBe("hello");
  });

  it("returns undefined for an invalid path (no throw)", () => {
    expect(resolvePath(state, "nodes.does-not-exist.foo")).toBeUndefined();
    expect(resolvePath(state, "initial.missing")).toBeUndefined();
    expect(resolvePath(state, "nodes.node-analyzer.nested.deep.value.too.far")).toBeUndefined();
  });

  it("blocks prototype-pollution keys", () => {
    expect(resolvePath(state, "__proto__")).toBeUndefined();
    expect(resolvePath(state, "nodes.__proto__")).toBeUndefined();
    expect(resolvePath(state, "nodes.node-analyzer.constructor")).toBeUndefined();
    expect(resolvePath(state, "constructor.prototype")).toBeUndefined();
    expect(resolvePath(state, "nodes.node-analyzer.__proto__.polluted")).toBeUndefined();
  });

  it("returns undefined for an empty path", () => {
    expect(resolvePath(state, "")).toBeUndefined();
  });

  it("returns undefined when traversing through a non-object", () => {
    // initial.query is a string; going deeper must not throw
    expect(resolvePath(state, "initial.query.length")).toBeUndefined();
  });
});

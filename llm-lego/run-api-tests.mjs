// Phase 2 — functional API tests against the running demo server.
// Persists each response to testN_result.json and runs programmatic assertions.
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";

async function exec(graph, initialInput) {
  const res = await fetch(`${BASE}/api/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph, initialInput }),
  });
  const json = await res.json().catch(() => ({ success: false, error: "non-JSON response" }));
  return { httpStatus: res.status, body: json };
}

function save(name, payload) {
  writeFileSync(`${name}_result.json`, JSON.stringify(payload, null, 2));
}

const results = {};

// ---- Test 1 — linear analyzer -> search ----
{
  const graph = {
    nodes: [
      { id: "node-analyzer", type: "llm", data: { prompt: "Extract intent from query.", outputKey: "intent" } },
      { id: "node-search", type: "tool", data: { name: "search" } },
    ],
    edges: [{ id: "e1", from: "node-analyzer", to: "node-search" }],
  };
  const r = await exec(graph, { query: "Find AI news" });
  save("test1", r);
  const path = (r.body.trace ?? []).map((t) => t.nodeId);
  const pass =
    r.body.success === true &&
    path.join(",") === "node-analyzer,node-search" &&
    r.body.state?.nodes?.["node-analyzer"] !== undefined &&
    r.body.state?.nodes?.["node-search"] !== undefined;
  results.test1 = { pass, path, context: r.body };
  console.log(`T1 linear: ${pass ? "PASS" : "FAIL"} | path=${path.join(" -> ")}`);
}

// ---- Test 2 — conditional routing ----
{
  const graph = {
    nodes: [
      { id: "node-analyzer", type: "llm", data: { prompt: 'Respond ONLY with JSON: {"intent":"search"} or {"intent":"chat"}', outputKey: "intent" } },
      { id: "node-router", type: "router", data: { path: "nodes.node-analyzer.intent", defaultRoute: "node-chat" } },
      { id: "node-search", type: "tool", data: { name: "search" } },
      { id: "node-chat", type: "llm", data: { prompt: "Provide a friendly response." } },
    ],
    edges: [
      { id: "e1", from: "node-analyzer", to: "node-router" },
      { id: "e2", from: "node-router", to: "node-search", condition: "search" },
      { id: "e3", from: "node-router", to: "node-chat", condition: "chat" },
    ],
  };
  const r = await exec(graph, { query: "Search for climate news" });
  save("test2", r);
  const path = (r.body.trace ?? []).map((t) => t.nodeId);
  const routerStep = (r.body.trace ?? []).find((t) => t.nodeType === "router");
  const reason = routerStep?.routingDecision?.reason;
  const pass =
    r.body.success === true &&
    reason === "exact-match" &&
    path.includes("node-search") &&
    !path.includes("node-chat");
  results.test2 = { pass, path, reason, context: r.body };
  console.log(`T2 router: ${pass ? "PASS" : "FAIL"} | path=${path.join(" -> ")} | reason=${reason}`);
}

// ---- Test 3 — cycle safety (as given: a<->b, NO entry node) ----
{
  const graph = {
    nodes: [
      { id: "a", type: "llm", data: { prompt: "Step A" } },
      { id: "b", type: "llm", data: { prompt: "Step B" } },
    ],
    edges: [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "a" },
    ],
  };
  const r = await exec(graph, {});
  save("test3", r);
  // As-given graph has 0 start nodes -> deliberate "exactly one start node" guard.
  // That is still a CLEAN, explicit, non-hanging stop (cycle safety intent satisfied).
  const cleanStop =
    (r.body.success === false && /one start node/i.test(r.body.error ?? "")) ||
    (r.body.success === true && /max steps exceeded/i.test((r.body.trace ?? []).at(-1)?.error ?? ""));
  results.test3 = { pass: cleanStop, context: r.body };
  console.log(`T3 cycle (as-given): ${cleanStop ? "PASS (clean stop)" : "FAIL"} | success=${r.body.success} | err=${r.body.error ?? (r.body.trace ?? []).at(-1)?.error}`);
}

// ---- Test 3b — entry-cycle variant: proves "max steps exceeded" path ----
{
  const graph = {
    nodes: [
      { id: "s", type: "llm", data: { prompt: "start" } },
      { id: "a", type: "llm", data: { prompt: "Step A" } },
      { id: "b", type: "llm", data: { prompt: "Step B" } },
    ],
    edges: [
      { id: "e0", from: "s", to: "a" },
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "a" },
    ],
  };
  const r = await exec(graph, {});
  save("test3b", r);
  const last = (r.body.trace ?? []).at(-1);
  const pass = r.body.success === true && /max steps exceeded/i.test(last?.error ?? "");
  results.test3b = { pass, lastError: last?.error, steps: (r.body.trace ?? []).length, context: r.body };
  console.log(`T3b entry-cycle: ${pass ? "PASS" : "FAIL"} | steps=${(r.body.trace ?? []).length} | lastError=${last?.error}`);
}

// ---- Test 4 — malformed graph (orphan edge -> n3) ----
{
  const graph = {
    nodes: [
      { id: "n1", type: "llm", data: { prompt: "Test" } },
      { id: "n2", type: "tool", data: { name: "search" } },
    ],
    edges: [{ id: "e1", from: "n1", to: "n3" }],
  };
  const r = await exec(graph, {});
  save("test4", r);
  const pass =
    (r.httpStatus === 400 || r.body.success === false) &&
    /n3|unknown target/i.test(r.body.error ?? "");
  results.test4 = { pass, http: r.httpStatus, error: r.body.error, context: r.body };
  console.log(`T4 invalid: ${pass ? "PASS" : "FAIL"} | http=${r.httpStatus} | error=${r.body.error}`);
}

save("api-tests-summary", Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { pass: v.pass }])));
console.log("\nSUMMARY:", JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.pass])), null, 0));

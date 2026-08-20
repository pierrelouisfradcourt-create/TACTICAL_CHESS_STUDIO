# llm-lego

Pure-TypeScript graph execution engine for orchestrating `llm` / `tool` / `agent` / `router` nodes. Zero runtime dependencies, no UI / React.

## Scripts

```bash
npm run build      # tsc → dist/ (strict mode)
npm run typecheck  # tsc --noEmit over src + tests
npm test           # vitest run
```

## Quick start

```ts
import { runGraph, summarizeTrace, type Graph } from "llm-lego";

const graph: Graph = {
  nodes: [
    { id: "node-analyzer", type: "llm", data: { prompt: "classify" } },
    { id: "node-router", type: "router", data: { path: "nodes.node-analyzer.intent", defaultRoute: "chat" } },
    { id: "node-search", type: "tool", data: { tool: "web-search" } },
    { id: "node-chat", type: "agent", data: { agent: "chatbot" } },
  ],
  edges: [
    { id: "e1", from: "node-analyzer", to: "node-router" },
    { id: "e2", from: "node-router", to: "node-search", condition: "search" },
    { id: "e3", from: "node-router", to: "node-chat", condition: "chat" },
  ],
};

const ctx = await runGraph(graph, { query: "weather?", intent: "search" });
console.table(summarizeTrace(ctx)); // → analyzer, router, node-search
```

Swap `mockAdapters` for real API-backed adapters by passing `{ adapters }` to `runGraph` — the executor is adapter-agnostic.

## Design decisions (discretionary choices flagged in the spec)

- **Canonical state.** State is always `{ initial, nodes }`. Node outputs land in
  `state.nodes[node.id]`; the global state is never overwritten. Router paths
  resolve against this canonical shape (the bug the React POC had).
- **`resolvePath` safety.** Dot-notation, returns `undefined` on any missing
  segment (never throws), and blocks `__proto__` / `prototype` / `constructor`
  against prototype pollution since paths come from user node config.
- **`outputKey`.** If `node.data.outputKey` is a non-empty string, the output is
  *also* aliased at `state.nodes[outputKey]`, letting downstream routers
  reference a stable logical name independent of the physical node id.
- **Branching.** Only `router` nodes may have >1 outgoing edge — enforced both at
  graph validation (`validateGraph`) and in `resolveNextNode`. Router resolution:
  exact `condition === routeKey` → `default` edge → first edge (warns).
- **Cycle safety (V1).** Re-visiting a node is *allowed* (controlled retry loops
  are legitimate). The hard guard against infinite runs is `maxSteps` (default
  100); on overflow the run stops cleanly and appends a trace step with
  `error: "max steps exceeded"`. A `visited` set is maintained for a future
  non-progressing-cycle heuristic — see comment in `core/engine.ts`.
- **Resilient execution.** An adapter throw becomes `{ error: message }` output
  (recorded on the trace step) and the run continues, rather than crashing.

## Layout

```
src/
  core/        types.ts · state.ts · engine.ts
  runtime/     executor.ts · scheduler.ts
  observability/ trace.ts
  library/     registry.ts
  feeder/      feeder.ts
  adapters/    types.ts · mock.ts
  index.ts
tests/         state · scheduler · executor · engine
```

## World Intelligence Layer (Phase 5 v0)

Recherche web **citée** de patterns externes comparables pour un IMP, produite **à la
demande** — jamais par le graphe (le moteur est offline, LM Studio only). Découplage strict
producteur / consommateur :

- **Producteur** : skill Claude Code `/world-scan <IMP-ID>` (`.claude/skills/world-scan/`).
  Lit l'IMP (lecture seule), fait `WebSearch`/`WebFetch`, écrit un *knowledge packet* JSON
  cité dans `llm-lego/knowledge/<IMP-ID>.json`.
- **Contrat** : `world-scan/v0` — `advisory_only: true`, chaque `pattern` porte un
  `source_url` (citation obligatoire), `claim` ≤ 600 caractères (jamais de copie longue).
- **Validateur fail-hard** : `knowledge-validate.mjs` rejette tout packet non-cité,
  `advisory_only ≠ true`, ou `claim` trop long. Auto-découvert par `run-validators.mjs`.
- **Consommateur** : `GET /api/knowledge?imp=IMP-xxx` (lecture seule, param anti-traversal,
  empty state propre) → affiché dans le panneau détail du board avec une bannière
  **« informatif, n'influence pas le council »**.

Garde-fou : le packet **informe, ne tranche jamais**. Il n'est **jamais** injecté dans les
prompts du council (council-audit / arbitration) — toute injection serait une extension
ultérieure explicite. `knowledge/` est **gitignored** (non gouverné, régénérable).

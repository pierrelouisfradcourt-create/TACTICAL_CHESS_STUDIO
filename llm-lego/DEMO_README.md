# LLM-Lego — Solo HTML demo

Minimal HTTP viewer + server to run and observe the engine without any complex UI.

## Files (must live at the project root, next to `dist/`)

- `demo-server.ts` — tiny Node HTTP server (serves the viewers + `/api/execute` + `/vendor/*`)
- `demo.html` — the JSON viewer (paste a graph + input, see state & trace)
- `builder.html` — the **visual builder** (drag/drop nodes, draw edges, run on the real engine)

## Visual builder

Open <http://localhost:3000/builder> (same server, same origin as `/api/execute`).

- Add nodes from the palette (llm / tool / agent / router), drag them around, draw
  edges by dragging from a node's right-hand handle onto another node, edit each
  node's `data` JSON and each router edge's `condition` in the inspector.
- **📦 Charger exemple** loads `analyzer → router → (search | chat)`.
- **▶️ Exécuter** transforms the drawing via `toEngineGraph(nodes, edges)` (drops
  positions/styles → canonical `Graph`) and `POST`s it to the real `/api/execute`.
  The **État final** and **Trace** panels show the engine's actual output (with the
  router's `routingDecision`), not a simulation. Invalid graphs (e.g. two start
  nodes) surface the engine's 400 message in a readable banner instead of crashing.
- React + Babel are vendored offline under `node_modules/` and served from
  `/vendor/*` — no CDN. If those are missing: `npm install --no-save react react-dom @babel/standalone`.

Validate it end-to-end (Playwright, double-run search→chat proves the routing is the
real engine): `node builder-validate.mjs` → writes `builder_validation_result.json`
and `builder_run{1,2,3}_*.png`.

## Run

```bash
# from llm-lego/
npm install        # once
npm run build      # compiles src/ -> dist/  (REQUIRED: the server imports ./dist)
node demo-server.ts
```

`node demo-server.ts` works directly on Node >= 22.6 (native TS type-stripping).
If you prefer: `npx tsx demo-server.ts`.

Then open <http://localhost:3000>. The example graph
`analyzer → router → (search | chat)` loads automatically. `Ctrl+C` to stop.

## How routing is demonstrated

The core `mockAdapters` cannot truly classify free text — it only echoes an
`intent` that was already in the input. So the demo server overrides **only** the
`llm` adapter with a small keyword heuristic (`demoAdapters` in `demo-server.ts`):
queries containing words like *find / search / information / who / what / how* →
`intent: "search"`, otherwise `"chat"`. This is exactly the swap point the
architecture is built around — replace `demoAdapters` with real API-backed
adapters and nothing else changes.

## Verified behaviour (curl against the running server)

| Input query | Path taken | Router decision |
|---|---|---|
| `Find information about AI safety` | analyzer → router → **node-search** | `routeKey="search"`, exact-match |
| `Chat with me` | analyzer → router → **node-chat** | `routeKey="chat"`, exact-match |
| cyclic graph (`a→b→a`) | stops at 100 steps | trace ends with `error: "max steps exceeded"` |
| non-router node with 2 edges | — | `success:false`, explicit validation error |
| malformed JSON body | — | `success:false`, parse error message |

## What was broken in the original demo (now fixed)

1. **`dist` layout** — the build emitted `dist/src/core/...` (rootDir was `.`),
   but the server imports `./dist/core/...`. Fixed by `rootDir: "src"` so the
   build emits a flat `dist/` (this also fixed `package.json`'s `main`).
2. **Compiled output wasn't valid Node ESM** — with `moduleResolution: "Bundler"`
   tsc emitted extensionless relative imports (`from "../adapters/mock"`), which
   Node ESM rejects. Switched to `NodeNext` + explicit `.js` extensions on all
   relative imports, so `dist` runs under plain `node`.
3. **`runGraph` call signature** — it was called as
   `runGraph(graph, input, mockAdapters, { maxSteps })`. The third argument is an
   **options object**, not positional adapters. Corrected to
   `runGraph(graph, input, { adapters, maxSteps })`.
4. **File locations** — the old README told you to copy the server into `src/`
   while it imported `./dist` and read `demo.html` from its own directory, so the
   server couldn't find `demo.html`. Both files now live at the project root.
5. **Routing always went to chat** — with the plain mock, the example input had no
   `intent`, so the analyzer defaulted to `"chat"` and the search branch was never
   taken, contradicting the README. Fixed by the classifying `demoAdapters` above.
   Also fixed the example's `defaultRoute` (`"node-chat"` → the route key `"chat"`).

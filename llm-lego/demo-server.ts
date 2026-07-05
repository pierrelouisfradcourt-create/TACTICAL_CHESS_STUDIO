/**
 * LLM-Lego solo demo server.
 *
 * Run from the llm-lego/ project root (after `npm run build`):
 *
 *   node demo-server.ts          # Node >= 22.6 strips the TS types natively
 *   # or, if you prefer tsx:  npx tsx demo-server.ts
 *
 * Then open http://localhost:3000
 *
 * It imports the COMPILED engine from ./dist (flat layout, rootDir=src), so the
 * server must live at the project root, next to dist/ and demo.html.
 */

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import os from "node:os";
import { execFile } from "node:child_process";

import { runGraph, resumeGraph } from "./dist/core/engine.js";
import { mockAdapters } from "./dist/adapters/mock.js";
import { lmStudioAdapters } from "./dist/adapters/lmstudio.js";
import { powershellAdapters } from "./dist/adapters/powershell.js";
import type { Adapters } from "./dist/adapters/types.js";
import type { EngineState, ExecutionContext, Graph } from "./dist/core/types.js";
import { listNotes, readNote, searchNotes, writeNote } from "./memory-store.mjs";

/**
 * Governance policy (Oracle, Passe 4): NO self-validation. A node cannot be judged
 * by an Oracle produced by its OWN brick — the producer must be independent of the
 * validator. Enforced at the API layer (not in src/ engine) because oracleRef /
 * producerRef are UI-provenance metadata inert to execution. Returns the offending
 * node id, or null if the graph is clean.
 */
function findOracleSelfValidation(graph: Graph): string | null {
  for (const node of graph.nodes ?? []) {
    const d = (node.data ?? {}) as Record<string, unknown>;
    const oracleRef = d["oracleRef"];
    const producerRef = d["producerRef"];
    if (typeof oracleRef === "string" && oracleRef !== "" && oracleRef === producerRef) {
      return node.id;
    }
  }
  return null;
}

/**
 * Carte d'identité policy (Agent completeness): a COMPOSITE agent (posed via "+ Agent",
 * carrying its satellite components) may only execute when ALL its satellites are filled.
 * cardTotal is authoritative and PER-AGENT (présence-based): a fresh "+ Agent" carries 8
 * satellites (incl. "sortie attendue") → 8/8; a legacy agent posed with 7 stays 7/7 and is
 * never retroactively blocked. The satellites are excluded from the engine graph, but
 * toEngineGraph stamps the aggregate completeness (cardComposite/cardFilled/cardTotal/
 * cardComplete) onto the central agent's data — inert metadata the engine ignores, same
 * treatment as oracleRef. Enforced at the API layer (no bypass) as a double-check of the UI
 * guard, exactly like findOracleSelfValidation. Legacy agents (no satellites → no
 * cardComposite marker) are NOT subject to the rule (Option A). Returns the node + counts.
 */
function findIncompleteAgent(graph: Graph): { id: string; filled: number; total: number } | null {
  for (const node of graph.nodes ?? []) {
    if (node.type !== "agent") continue;
    const d = (node.data ?? {}) as Record<string, unknown>;
    if (d["cardComposite"] !== true) continue;
    const total = typeof d["cardTotal"] === "number" ? (d["cardTotal"] as number) : 7;
    const filled = typeof d["cardFilled"] === "number" ? (d["cardFilled"] as number) : 0;
    if (d["cardComplete"] !== true || filled < total) {
      return { id: node.id, filled, total };
    }
  }
  return null;
}
const AGENT_CARD_LABELS_API = "mémoire, skill, plugin, rôle, objectif, garde-fou, modèle, sortie attendue";

/** Serialize an ExecutionContext into the wire shape shared by /execute + /resume. */
function serializeCtx(ctx: ExecutionContext): unknown {
  return {
    success: true,
    status: ctx.status ?? "completed",
    pausedAt: ctx.pausedAt ?? null,
    state: ctx.state,
    trace: ctx.trace.map((t) => ({
      nodeId: t.nodeId,
      nodeType: t.nodeType,
      durationMs: t.durationMs,
      iteration: t.iteration,
      output: t.output,
      routingDecision: t.routingDecision,
      error: t.error,
    })),
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// CT-4 — racines mémoire (surchargables par env pour tests isolés).
const MEM_ROOTS = {
  brain: process.env["TCS_BRAIN_DIR"] ? path.resolve(process.env["TCS_BRAIN_DIR"]) : path.join(__dirname, "..", "studio_brain"),
  facts: process.env["TCS_MEMORY_DIR"] ? path.resolve(process.env["TCS_MEMORY_DIR"]) : path.join(os.homedir(), ".claude", "projects", "C--TACTICAL-CHESS-STUDIO", "memory"),
};
const WIREFRAMES_DIR = path.join(__dirname, "wireframes");
// Brick library (Library Passe 1). Separate store from wireframes/ on purpose —
// see LIBRARY_AUDIT.md §3 (overloading wireframes would break runAudit).
// The canonical store is library/. Tests MUST NOT touch it: they override the
// store via LEGO_LIBRARY_DIR (resolved under __dirname, so it can never escape
// llm-lego/) and the server serves that throwaway dir instead — see
// run-validators.mjs. This is the whole isolation mechanism (Option B).
const REAL_LIBRARY_DIR = path.join(__dirname, "library");
const LIBRARY_DIR = process.env["LEGO_LIBRARY_DIR"]
  ? path.resolve(__dirname, process.env["LEGO_LIBRARY_DIR"])
  : REAL_LIBRARY_DIR;
// True whenever we serve anything other than the canonical library/. Destructive
// test resets read this (via GET /api/library) and REFUSE to run when it is false,
// so a validator run against a real :3000 server can never wipe persistent bricks.
const LIBRARY_IS_TEST = LIBRARY_DIR !== REAL_LIBRARY_DIR;
// Read-only source of truth for the agent seed. llm-lego/ sits directly under the
// TCS repo root, so agent_registry is one level up. NEVER written by this server.
const AGENT_REGISTRY_DIR = path.join(__dirname, "..", "lab", "agent_registry");

/**
 * Seed the library from lab/agent_registry/*.json — ONCE, only when library/ is
 * empty. Each read-only card becomes an editable brick that keeps its agent_id
 * (via sourceRef + payload.role) for traceability. Never overwrites an existing
 * brick, so user edits are safe. Governance fields (autonomy/permissions/surfaces)
 * map from the card; LLM fields (memoire/skill/…) start empty — the card has none.
 */
function seedLibraryIfEmpty(): void {
  mkdirSync(LIBRARY_DIR, { recursive: true });
  const already = readdirSync(LIBRARY_DIR).filter((f) => f.endsWith(".json"));
  if (already.length > 0) return; // seeded already, or the user has bricks — don't clobber
  let cards: string[];
  try {
    cards = readdirSync(AGENT_REGISTRY_DIR).filter((f) => f.endsWith(".agent.json"));
  } catch {
    return; // registry not found — nothing to seed (leave library empty)
  }
  const now = new Date().toISOString();
  for (const fileName of cards) {
    let card: Record<string, unknown>;
    try {
      card = JSON.parse(readFileSync(path.join(AGENT_REGISTRY_DIR, fileName), "utf-8"));
    } catch {
      continue;
    }
    const agentId = String(card["agent_id"] ?? fileName.replace(/\.agent\.json$/, ""));
    const id = `agent-${agentId}-001`;
    const brick = {
      id,
      kind: "agent",
      name: (card["display_name"] as string) ?? agentId,
      maturity: "saved", // seeded cards already exist as real in TCS
      badge: "real",
      roadmapRef: null,
      sourceRef: `lab/agent_registry/${fileName}`,
      payload: {
        role: agentId,
        memoire: "",
        skill: "",
        plugin: "",
        objectif: "",
        gardeFou: "",
        modele: "",
        temperature: null,
        top_p: null,
        max_tokens: null,
        autonomy_level: card["autonomy_level"] ?? null,
        permissions: card["permissions"] ?? {},
        allowed_surfaces: card["allowed_surfaces"] ?? [],
        forbidden_surfaces: card["forbidden_surfaces"] ?? [],
      },
      created: now,
      updated: now,
    };
    writeFileSync(path.join(LIBRARY_DIR, `${id}.json`), JSON.stringify(brick, null, 2), "utf-8");
  }
}

/** Send a JSON response. */
function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

/**
 * Resolve a repo-relative path and REJECT anything that escapes the project root
 * (path-traversal guard). Returns the absolute path, or null if it is outside
 * `__dirname` (the llm-lego/ project directory).
 */
function safeResolve(relOrAbs: string): string | null {
  const resolved = path.resolve(__dirname, relOrAbs);
  const root = __dirname + path.sep;
  if (resolved !== __dirname && !resolved.startsWith(root)) return null;
  return resolved;
}

/** Recursively list files under `dir` (relative to __dirname), filtered by ext. */
function listRepoFiles(dir: string, ext: string | null, acc: string[] = []): string[] {
  const SKIP = new Set(["node_modules", "dist", ".git", "wireframes", "library"]);
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      listRepoFiles(full, ext, acc);
    } else if (!ext || name.endsWith(ext)) {
      acc.push(path.relative(__dirname, full).split(path.sep).join("/"));
    }
  }
  return acc;
}

/**
 * The core `mockAdapters` cannot truly "classify" a free-text query — it only
 * surfaces an `intent` that was already present in the input. For the demo we
 * want the analyzer node to *feel* like a real classifier, so we override the
 * `llm` adapter with a tiny keyword heuristic. Tool/agent keep the core mocks.
 *
 * This is exactly the swap point the architecture is built around: replace these
 * with real API-backed adapters and nothing else changes.
 */
const SEARCH_HINT = /\b(find|search|look\s?up|information|info|news|weather|latest|price|who|what|when|where|why|how)\b/i;

function classifyIntent(state: EngineState): "search" | "chat" {
  const initial = state.initial;
  const query =
    typeof initial === "object" && initial !== null && "query" in initial
      ? String((initial as { query: unknown }).query)
      : "";
  return SEARCH_HINT.test(query) ? "search" : "chat";
}

const demoAdapters: Adapters = {
  ...mockAdapters,
  async llm(data, state) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const intent = classifyIntent(state);
    return {
      type: "llm",
      intent,
      text: `[mock llm] classified intent="${intent}" for prompt: ${String(data["prompt"] ?? "(none)")}`,
    };
  },

  /**
   * Deterministic Council reviewer/gate for the loop demo. An `agent` node whose
   * `data.okAfter` is set emits `{ decision }` driven by the CURRENT iteration
   * (from `meta.iteration`): NOK while `iteration <= okAfter`, then OK. This makes
   * a refinement loop run a fixed, reproducible number of passes — no hidden
   * state, no randomness. Other agents keep the plain mock behaviour.
   */
  async agent(data, _state, meta) {
    const okAfter = data["okAfter"];
    if (okAfter !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const threshold = Number(okAfter);
      const iteration = meta?.iteration ?? 1;
      const decision = iteration > threshold ? "OK" : "NOK";
      return {
        type: "agent",
        role: String(data["role"] ?? "reviewer"),
        agent: String(data["name"] ?? data["role"] ?? "reviewer"),
        iteration,
        decision,
        text: `[mock reviewer] pass ${iteration} → ${decision} (OK once iteration > ${threshold})`,
      };
    }
    return mockAdapters.agent(data, _state, meta);
  },
};

/**
 * Adapter selection — the single opt-in swap. `live === true` on the request
 * routes execution to the REAL LM Studio adapters (local :1234); anything else
 * keeps the default mock/demo wiring. A1 (CEO Ultraplan): converting the shell
 * into a real tool is one flag flip here — nothing is wired live automatically,
 * so existing graphs and the whole regression suite stay on mocks unless the
 * caller explicitly asks for `live`.
 */
// Live set = real backends: LLM (A1) for llm/agent + real PowerShell AUDIT tool for
// a tool node carrying a whitelisted `data.script` (else mock tool). One "live" flag
// enables both; each stays PER-NODE opt-in (llm/agent need a prompt, a tool needs a
// whitelisted script). Default graphs never touch either. `src/core` is untouched —
// PowerShell rides the existing `tool` node type, not a new engine NodeType.
const liveAdapters: Adapters = { ...lmStudioAdapters, tool: powershellAdapters.tool };

function selectAdapters(live: unknown): Adapters {
  return live === true ? liveAdapters : demoAdapters;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the HTML viewer.
  if (req.url === "/" && req.method === "GET") {
    try {
      const html = readFileSync(path.join(__dirname, "demo.html"), "utf-8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("demo.html not found (must sit next to demo-server.ts)");
    }
    return;
  }

  // Serve the visual builder (React, wired to /api/execute on this same origin).
  if (req.url === "/builder" && req.method === "GET") {
    try {
      const html = readFileSync(path.join(__dirname, "builder.html"), "utf-8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("builder.html not found (must sit next to demo-server.ts)");
    }
    return;
  }

  // Serve the vendored React / Babel UMD bundles from local node_modules so the
  // builder runs fully offline (no CDN). Whitelisted filenames only — no path
  // traversal: req.url is matched against a fixed map, never joined with input.
  if (req.url !== undefined && req.url.startsWith("/vendor/") && req.method === "GET") {
    const VENDOR: Record<string, string> = {
      "/vendor/react.js": "node_modules/react/umd/react.development.js",
      "/vendor/react-dom.js": "node_modules/react-dom/umd/react-dom.development.js",
      "/vendor/babel.js": "node_modules/@babel/standalone/babel.min.js",
    };
    const rel = VENDOR[req.url];
    if (rel === undefined) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Unknown vendor asset");
      return;
    }
    try {
      const js = readFileSync(path.join(__dirname, rel), "utf-8");
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(js);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Vendor asset not found: ${rel} (run: npm install --no-save react react-dom @babel/standalone)`);
    }
    return;
  }

  // ---- Wire Map + repo routes (traceability) --------------------------------
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname;

  // List wire map projects.
  if (pathname === "/api/wireframes" && req.method === "GET") {
    try {
      mkdirSync(WIREFRAMES_DIR, { recursive: true });
      const projects = readdirSync(WIREFRAMES_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const id = f.replace(/\.json$/, "");
          let name = id;
          try {
            const doc = JSON.parse(readFileSync(path.join(WIREFRAMES_DIR, f), "utf-8"));
            name = doc?.project?.name ?? id;
          } catch {
            /* keep id as name */
          }
          return { id, name };
        });
      sendJson(res, 200, { projects });
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : "list failed" });
    }
    return;
  }

  // Load / save a specific wire map project.
  if (pathname.startsWith("/api/wireframes/")) {
    const id = decodeURIComponent(pathname.slice("/api/wireframes/".length));
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      sendJson(res, 400, { error: "invalid project id" });
      return;
    }
    const file = path.join(WIREFRAMES_DIR, `${id}.json`);
    if (req.method === "GET") {
      try {
        sendJson(res, 200, JSON.parse(readFileSync(file, "utf-8")));
      } catch {
        sendJson(res, 404, { error: `project "${id}" not found` });
      }
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c.toString()));
      req.on("end", () => {
        try {
          const doc = JSON.parse(body);
          mkdirSync(WIREFRAMES_DIR, { recursive: true });
          writeFileSync(file, JSON.stringify(doc, null, 2), "utf-8");
          sendJson(res, 200, { ok: true, id, path: `wireframes/${id}.json` });
        } catch (err) {
          sendJson(res, 400, { error: err instanceof Error ? err.message : "save failed" });
        }
      });
      return;
    }
  }

  // ---- Brick library (Library Passe 1) --------------------------------------
  // Same route shape as /api/wireframes, separate store (library/{id}.json).
  // List all bricks (summary only). Auto-seeds from agent_registry when empty.
  if (pathname === "/api/library" && req.method === "GET") {
    try {
      seedLibraryIfEmpty();
      const bricks = readdirSync(LIBRARY_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          try {
            const b = JSON.parse(readFileSync(path.join(LIBRARY_DIR, f), "utf-8"));
            // `updated`/`created` are surfaced so the Library list can sort by
            // modification date (F1). They are metadata only — inert to execution.
            return { id: b.id, kind: b.kind, name: b.name, maturity: b.maturity, badge: b.badge,
              updated: b.updated ?? null, created: b.created ?? null };
          } catch {
            return null;
          }
        })
        .filter((b) => b !== null);
      // isTestLibrary/libraryDir let destructive validators self-check they are
      // pointed at an isolated store before deleting anything (never the real one).
      sendJson(res, 200, { bricks, isTestLibrary: LIBRARY_IS_TEST, libraryDir: path.basename(LIBRARY_DIR) });
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : "list failed" });
    }
    return;
  }

  // Load / save / delete a specific brick.
  if (pathname.startsWith("/api/library/")) {
    const id = decodeURIComponent(pathname.slice("/api/library/".length));
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      sendJson(res, 400, { error: "invalid brick id" });
      return;
    }
    const file = path.join(LIBRARY_DIR, `${id}.json`);
    if (req.method === "GET") {
      try {
        sendJson(res, 200, JSON.parse(readFileSync(file, "utf-8")));
      } catch {
        sendJson(res, 404, { error: `brick "${id}" not found` });
      }
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c.toString()));
      req.on("end", () => {
        try {
          const doc = JSON.parse(body);
          mkdirSync(LIBRARY_DIR, { recursive: true });
          writeFileSync(file, JSON.stringify(doc, null, 2), "utf-8");
          sendJson(res, 200, { ok: true, id, path: `${path.basename(LIBRARY_DIR)}/${id}.json` });
        } catch (err) {
          sendJson(res, 400, { error: err instanceof Error ? err.message : "save failed" });
        }
      });
      return;
    }
    if (req.method === "DELETE") {
      try {
        if (existsSync(file)) unlinkSync(file);
        sendJson(res, 200, { ok: true, id });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : "delete failed" });
      }
      return;
    }
  }

  // List repo files (filtered by extension).
  if (pathname === "/api/repo/files" && req.method === "GET") {
    const ext = url.searchParams.get("ext");
    const files = listRepoFiles(__dirname, ext && ext.length > 0 ? ext : null);
    sendJson(res, 200, { files: files.sort() });
    return;
  }

  // Read a repo file (READ-ONLY, path-traversal guarded).
  if (pathname === "/api/repo/file" && req.method === "GET") {
    const rel = url.searchParams.get("path") ?? "";
    const abs = safeResolve(rel);
    if (abs === null) {
      sendJson(res, 403, { error: `path traversal denied: "${rel}" escapes the project root` });
      return;
    }
    try {
      const content = readFileSync(abs, "utf-8");
      sendJson(res, 200, { path: rel, content, lines: content.split(/\r?\n/).length });
    } catch {
      sendJson(res, 404, { error: `file not found: ${rel}` });
    }
    return;
  }

  // Best-effort test results (vitest json). Heavy — guarded with a timeout.
  if (pathname === "/api/repo/tests" && req.method === "GET") {
    execFile(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["vitest", "run", "--reporter=json"],
      { cwd: __dirname, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
      (_err, stdout) => {
        try {
          const jsonStart = stdout.indexOf("{");
          const parsed = jsonStart >= 0 ? JSON.parse(stdout.slice(jsonStart)) : null;
          sendJson(res, 200, { available: !!parsed, summary: parsed
            ? { numTotal: parsed.numTotalTests, numPassed: parsed.numPassedTests, numFailed: parsed.numFailedTests }
            : null });
        } catch {
          sendJson(res, 200, { available: false, note: "vitest json unavailable — run `npm test` in a terminal" });
        }
      },
    );
    return;
  }

  // ---- CT-4 : face HTTP mémoire (mêmes fichiers que la face MCP) ----
  if (pathname === "/api/memory" && req.method === "GET") {
    try { sendJson(res, 200, listNotes(MEM_ROOTS)); }
    catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
    return;
  }
  if (pathname === "/api/memory/search" && req.method === "GET") {
    try { sendJson(res, 200, searchNotes(MEM_ROOTS, url.searchParams.get("q") || "", url.searchParams.get("root") || "all")); }
    catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
    return;
  }
  if (pathname === "/api/memory" && req.method === "POST") {
    let mbody = "";
    req.on("data", (c) => (mbody += c.toString()));
    req.on("end", () => {
      try { sendJson(res, 200, writeNote(MEM_ROOTS, JSON.parse(mbody || "{}"))); }
      catch (e) { sendJson(res, (e as any).status || 400, { error: String((e as any).message || e) }); }
    });
    return;
  }
  {
    const mem = pathname.match(/^\/api\/memory\/([A-Za-z]+)\/(.+)$/);
    if (mem && req.method === "GET") {
      try { sendJson(res, 200, readNote(MEM_ROOTS, mem[1], decodeURIComponent(mem[2]))); }
      catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
      return;
    }
  }

  // Execute a graph.
  if (req.url === "/api/execute" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      void (async () => {
        try {
          const { graph, initialInput, live } = JSON.parse(body) as {
            graph: Graph;
            initialInput: unknown;
            live?: boolean;
          };

          // Governance gate (no bypass): reject a graph where an Oracle validates a
          // node produced by its own brick (self-validation). UI blocks the attach;
          // this blocks execution too, so the API can't be used to sidestep it.
          const selfVal = findOracleSelfValidation(graph);
          if (selfVal !== null) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: false,
              error: `Auto-validation interdite : le nœud "${selfVal}" est jugé par un Oracle produit par sa propre brique. ` +
                `Un Oracle doit valider un nœud produit par un agent indépendant.`,
            }));
            return;
          }

          // Carte d'identité gate (no bypass): reject an incomplete COMPOSITE agent.
          const incomplete = findIncompleteAgent(graph);
          if (incomplete !== null) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: false,
              error: `L'agent ${incomplete.id} est incomplet (${incomplete.filled}/${incomplete.total} composants remplis). ` +
                `Complète sa carte d'identité (${AGENT_CARD_LABELS_API}) avant de l'exécuter.`,
            }));
            return;
          }

          // NOTE: runGraph takes (graph, initialInput, options) — options is an
          // object { adapters, maxSteps }, NOT a positional adapters argument.
          // Diagnostic: make the adapter choice VISIBLE server-side. A run that the
          // user believes is "réel" but logs "mock" here = the browser is hitting a
          // stale server (or `live` never left the UI). One line, no PII.
          console.log(`[execute] live=${JSON.stringify(live)} → adapter=${live === true ? "lmStudio(REAL)" : "demo(mock)"}`);
          const ctx = await runGraph(graph, initialInput, {
            adapters: selectAdapters(live),
            maxSteps: 100,
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(serializeCtx(ctx), null, 2));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            }),
          );
        }
      })();
    });
    return;
  }

  // Resume a run paused on a HumanGate with a human decision (approve|reject).
  // pausedState is the serialized ExecutionContext returned by /api/execute (or a
  // prior /api/resume): { state, trace, status:"paused_humangate", pausedAt }.
  if (req.url === "/api/resume" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      void (async () => {
        try {
          const { pausedState, graph, decision, note, live } = JSON.parse(body) as {
            pausedState: { state: EngineState; trace: unknown[]; status?: string; pausedAt?: string };
            graph: Graph;
            decision: "approve" | "reject";
            note?: string;
            live?: boolean;
          };
          const ctx = {
            state: pausedState.state,
            trace: (pausedState.trace ?? []) as ExecutionContext["trace"],
            status: pausedState.status as ExecutionContext["status"],
            pausedAt: pausedState.pausedAt,
          } as ExecutionContext;
          const resumed = await resumeGraph(ctx, graph, decision, { adapters: selectAdapters(live), maxSteps: 100 }, note);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(serializeCtx(resumed), null, 2));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }));
        }
      })();
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const PORT = Number(process.env["PORT"] ?? 3000);

// Fail LOUDLY if the port is already held. Without this, `node demo-server.ts`
// on an occupied port throws an unhandled 'error' and exits with a raw stack
// trace, leaving a STALE previous server still answering on :3000 — the exact
// trap that made a live toggle appear to "not work" (the browser kept hitting an
// old process that predates the real-adapter wiring). Now the message is
// actionable and the exit code is non-zero.
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ Port ${PORT} déjà utilisé — un serveur demo tourne DÉJÀ dessus.\n` +
        `   Ce process-ci NE démarre PAS. Ton navigateur parle donc à l'ANCIEN\n` +
        `   serveur (build périmé : le toggle « réel » y est ignoré).\n` +
        `   → Arrête l'ancien puis relance :  (PowerShell)\n` +
        `       Get-NetTCPConnection -LocalPort ${PORT} | Select -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }\n` +
        `       node demo-server.ts\n`,
    );
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`LLM-Lego demo running on http://localhost:${PORT}`);
  console.log("Open the URL in a browser and test the engine solo.");
  // Build/capability marker: lets you confirm you are on the REAL-adapter build.
  // If you don't see this line after a restart, you are talking to a stale server.
  console.log(
    `[build] adaptateur LM Studio réel DISPONIBLE — coche « réel (LM Studio) » (POST live:true) ` +
      `pour router vers ${process.env["LMSTUDIO_URL"] ?? "http://localhost:1234"}. Défaut = mock.`,
  );
});

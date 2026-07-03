/**
 * LM Studio adapters — the FIRST real (non-mock) wiring.
 *
 * Implements the same `Adapters` contract as `mockAdapters`, but the `llm` and
 * `agent` functions call a locally-running LM Studio server over its
 * OpenAI-compatible HTTP API (`/v1/chat/completions`). The executor is unchanged:
 * swapping `mockAdapters` for these adapters is the single documented swap point
 * the architecture was built around (`src/adapters/types.ts`).
 *
 * HARD CONSTRAINTS (TCS doctrine):
 *   - LOCAL ONLY. The base URL defaults to http://localhost:1234 (LM Studio).
 *     The paid Anthropic API is NEVER called from here.
 *   - OPT-IN ONLY. Nothing wires these adapters automatically — the caller
 *     (demo-server) selects them explicitly (a `live` request flag). The default
 *     everywhere stays `mockAdapters`.
 *   - NO SERVER CRASH. If LM Studio is unreachable, times out, or returns a
 *     non-2xx, the adapter returns a STRUCTURED "unavailable" result instead of
 *     throwing. The run continues, the trace shows the failure honestly, and
 *     downstream routers still get a (fallback) `intent` to branch on.
 *
 * The call shape mirrors the already-proven harness `oracle-validate.mjs`
 * (URL, model, OpenAI-compatible body, `choices[0].message.content` extraction).
 */

import type { EngineState } from "../core/types.js";
import type { AdapterMeta, Adapters, AdapterFn } from "./types.js";
import { mockAdapters } from "./mock.js";

/** Configuration for a LM Studio adapter set. All fields have safe local defaults. */
export interface LmStudioConfig {
  /** Full chat-completions endpoint. Default: env LMSTUDIO_URL or localhost:1234. */
  url: string;
  /** Model id sent to LM Studio. Overridable per-node via `data.model`. */
  defaultModel: string;
  /** Abort the request after this many ms. Default: env LMSTUDIO_TIMEOUT_MS or 30000. */
  timeoutMs: number;
  /** Sampling temperature when a node does not specify one. */
  defaultTemperature: number;
}

/**
 * Qwen2.5-14B is the studio's JSON-safe local model. Qwen3.6 is INTERDIT for JSON
 * (thinking mode empties `content`) — see CLAUDE.md and oracle-validate.mjs.
 */
const DEFAULT_MODEL = "qwen2.5-14b-instruct";
const DEFAULT_URL = "http://localhost:1234/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TEMPERATURE = 0.2;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Resolve a full config from partial overrides, then env, then hard defaults. */
export function resolveConfig(overrides: Partial<LmStudioConfig> = {}): LmStudioConfig {
  return {
    url: overrides.url ?? process.env["LMSTUDIO_URL"] ?? DEFAULT_URL,
    defaultModel: overrides.defaultModel ?? process.env["LMSTUDIO_MODEL"] ?? DEFAULT_MODEL,
    timeoutMs: overrides.timeoutMs ?? envNumber("LMSTUDIO_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    defaultTemperature: overrides.defaultTemperature ?? DEFAULT_TEMPERATURE,
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Best-effort intent discovery, IDENTICAL to the mock's rule, so a real `llm`
 * node feeding a router keeps routing exactly as it did under mocks. Priority:
 *   1. explicit `data.intent`
 *   2. `state.initial.intent`
 *   3. "chat"
 */
function deriveIntent(data: Record<string, unknown>, state: EngineState): string {
  if (typeof data["intent"] === "string") return data["intent"];
  const initial = state.initial;
  if (typeof initial === "object" && initial !== null && "intent" in initial) {
    const fromInitial = (initial as { intent: unknown }).intent;
    if (typeof fromInitial === "string") return fromInitial;
  }
  return "chat";
}

interface ChatResult {
  text: string;
  model: string;
  error?: string;
}

/**
 * One chat-completions round-trip. NEVER throws for an operational failure
 * (connection refused, timeout, non-2xx, malformed body): those come back as
 * `{ text: "", error }`. It only relies on the caller to shape the node output.
 */
async function chat(
  cfg: LmStudioConfig,
  model: string,
  prompt: string,
  system: string | null,
  temperature: number,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (system !== null && system.trim() !== "") {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { text: "", model, error: `LM Studio HTTP ${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      return { text: "", model, error: "LM Studio returned an empty completion" };
    }
    return { text: content, model };
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? `timeout after ${cfg.timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    return { text: "", model, error: `LM Studio unreachable: ${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Read a node's temperature, falling back to the config default. */
function readTemperature(data: Record<string, unknown>, cfg: LmStudioConfig): number {
  const t = data["temperature"];
  return typeof t === "number" && Number.isFinite(t) ? t : cfg.defaultTemperature;
}

/**
 * Build the real adapter set. Only `llm` and `agent` hit LM Studio; `tool`
 * delegates to the mock (there is no real tool backend). Any deterministic
 * demo behaviour that must survive going "live" (the `okAfter` reviewer used by
 * the loop demo) is preserved WITHOUT a model call, so a live run of a loop
 * graph still terminates predictably even with no model loaded.
 */
export function createLmStudioAdapters(overrides: Partial<LmStudioConfig> = {}): Adapters {
  const cfg = resolveConfig(overrides);

  const llm: AdapterFn = async (data, state) => {
    const prompt = asString(data["prompt"], "(no prompt)");
    const model = asString(data["model"], cfg.defaultModel);
    const system = typeof data["system"] === "string" ? (data["system"] as string) : null;
    const { text, error } = await chat(cfg, model, prompt, system, readTemperature(data, cfg));
    const intent = deriveIntent(data, state);
    if (error !== undefined) {
      return {
        type: "llm",
        model,
        prompt,
        intent,
        text: `[lm-studio indisponible] ${error}`,
        error,
        unavailable: true,
      };
    }
    return { type: "llm", model, prompt, intent, text };
  };

  const agent: AdapterFn = async (data, _state, meta?: AdapterMeta) => {
    // Preserve the deterministic loop-demo reviewer: an agent whose data.okAfter
    // is set emits OK/NOK from the CURRENT iteration, no model call, exactly like
    // the mock demo reviewer. This keeps loops reproducible when going live.
    const okAfter = data["okAfter"];
    if (okAfter !== undefined) {
      const threshold = Number(okAfter);
      const iteration = meta?.iteration ?? 1;
      const decision = iteration > threshold ? "OK" : "NOK";
      return {
        type: "agent",
        role: asString(data["role"], "reviewer"),
        agent: asString(data["name"] ?? data["role"], "reviewer"),
        iteration,
        decision,
        text: `[live reviewer] pass ${iteration} → ${decision} (OK once iteration > ${threshold})`,
      };
    }

    // Otherwise: a real agent turn. Its composite/derived prompt travels as
    // data.prompt (builder keeps it there); role becomes the system frame.
    const prompt = asString(data["prompt"] ?? data["objectif"], "(no prompt)");
    const model = asString(data["model"], cfg.defaultModel);
    const role = typeof data["role"] === "string" ? (data["role"] as string) : null;
    const { text, error } = await chat(cfg, model, prompt, role, readTemperature(data, cfg));
    const name = asString(data["agent"] ?? data["name"] ?? data["role"], "agent");
    if (error !== undefined) {
      return {
        type: "agent",
        agent: name,
        model,
        output: `[lm-studio indisponible] ${error}`,
        text: `[lm-studio indisponible] ${error}`,
        error,
        unavailable: true,
      };
    }
    return { type: "agent", agent: name, model, output: text, text };
  };

  return {
    llm,
    agent,
    tool: mockAdapters.tool,
  };
}

/** Default LM Studio adapter set (localhost:1234, Qwen2.5-14B, 30s timeout). */
export const lmStudioAdapters: Adapters = createLmStudioAdapters();

/**
 * Mock adapters — the default wiring used in tests and local runs.
 *
 * They mimic the simulated behaviour of the original POC: a small artificial
 * delay and a structured, deterministic fake response. They are drop-in
 * replaceable by real API-backed adapters implementing the same `Adapters`
 * interface.
 */

import type { EngineState } from "../core/types.js";
import type { Adapters } from "./types.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Default artificial latency, in ms. Small so tests stay fast. */
const MOCK_LATENCY_MS = 1;

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Best-effort intent discovery so an analyzer-style LLM node can surface an
 * `intent` that downstream routers branch on. Priority:
 *   1. explicit `data.intent`
 *   2. `state.initial.intent` (the run input carried an intent)
 *   3. "chat" (default conversational branch)
 */
function deriveIntent(data: Record<string, unknown>, state: EngineState): string {
  if (typeof data["intent"] === "string") {
    return data["intent"];
  }
  const initial = state.initial;
  if (typeof initial === "object" && initial !== null && "intent" in initial) {
    const fromInitial = (initial as { intent: unknown }).intent;
    if (typeof fromInitial === "string") {
      return fromInitial;
    }
  }
  return "chat";
}

export const mockAdapters: Adapters = {
  async llm(data, state) {
    await delay(MOCK_LATENCY_MS);
    const prompt = asString(data["prompt"], "(no prompt)");
    return {
      type: "llm",
      model: asString(data["model"], "mock-llm"),
      prompt,
      intent: deriveIntent(data, state),
      text: `mock completion for: ${prompt}`,
    };
  },

  async tool(data, _state) {
    await delay(MOCK_LATENCY_MS);
    const name = asString(data["tool"] ?? data["name"], "mock-tool");
    return {
      type: "tool",
      tool: name,
      result: `mock result from ${name}`,
    };
  },

  async agent(data, _state) {
    await delay(MOCK_LATENCY_MS);
    const name = asString(data["agent"] ?? data["name"], "mock-agent");
    return {
      type: "agent",
      agent: name,
      output: `mock output from ${name}`,
    };
  },

  // Chat node (mock) : transcript MINIMAL factice, labellisé "[mock]", ZÉRO appel réseau.
  // Juste de quoi ne pas bloquer les tests de structure — la vraie conversation multi-tours
  // n'existe qu'en mode réel (lmStudioAdapters.chat).
  async chat(data, _state) {
    await delay(MOCK_LATENCY_MS);
    const topic = asString(data["topic"], "(sans sujet)");
    const va = (typeof data["voiceA"] === "object" && data["voiceA"] !== null ? data["voiceA"] : {}) as Record<string, unknown>;
    const vb = (typeof data["voiceB"] === "object" && data["voiceB"] !== null ? data["voiceB"] : {}) as Record<string, unknown>;
    const nameA = asString(va["name"], "Voix A");
    const nameB = asString(vb["name"], "Voix B");
    const transcript = [
      { voice: "A", name: nameA, text: `[mock] ${nameA} ouvre sur « ${topic} » (aucun appel réseau).` },
      { voice: "B", name: nameB, text: `[mock] ${nameB} répond brièvement — transcript factice de structure.` },
    ];
    return { type: "chat", topic, transcript, turns: transcript.length, mock: true, stoppedReason: "mock" };
  },
};

import { describe, expect, it } from "vitest";

import { runGraph } from "../src/core/engine.js";
import { createLmStudioAdapters } from "../src/adapters/lmstudio.js";
import type { Graph } from "../src/core/types.js";

const chatGraph = (data: Record<string, unknown>): Graph => ({
  nodes: [{ id: "c", type: "chat", data }],
  edges: [],
});

describe("chat node — mock (défaut, zéro appel réseau)", () => {
  it("produit un transcript minimal labellisé [mock], voix identifiées", async () => {
    const ctx = await runGraph(
      chatGraph({ topic: "Faut-il un HumanGate ?", voiceA: { name: "Opti" }, voiceB: { name: "Critique" }, maxTurns: 4 }),
      {},
    );
    const out = ctx.state.nodes["c"] as any;
    expect(out.type).toBe("chat");
    expect(out.mock).toBe(true);
    expect(Array.isArray(out.transcript)).toBe(true);
    expect(out.transcript.length).toBeGreaterThanOrEqual(1);
    expect(out.transcript.every((m: any) => /\[mock\]/.test(m.text))).toBe(true);
    expect(out.transcript[0].voice).toBe("A");
    expect(out.transcript[0].name).toBe("Opti");
    expect(out.transcript[1].voice).toBe("B");
  });
});

describe("chat node — réel : plafond dur + arrêt propre (jamais de blocage)", () => {
  it("plafonne maxTurns à 12 même si on demande 99", async () => {
    const adapters = createLmStudioAdapters({ url: "http://127.0.0.1:9/nope", conversationTimeoutMs: 2000 });
    const ctx = await runGraph(
      chatGraph({ topic: "X", voiceA: { name: "A" }, voiceB: { name: "B" }, maxTurns: 99 }),
      {},
      { adapters },
    );
    const out = ctx.state.nodes["c"] as any;
    expect(out.maxTurns).toBe(12); // plafond dur appliqué (99 → 12)
  });

  it("LM Studio injoignable → arrêt PROPRE (message clair, stoppedReason=error, borné, pas de runaway)", async () => {
    const adapters = createLmStudioAdapters({ url: "http://127.0.0.1:9/nope", conversationTimeoutMs: 2000 });
    const ctx = await runGraph(
      chatGraph({ topic: "X", voiceA: { name: "A" }, voiceB: { name: "B" }, maxTurns: 99 }),
      {},
      { adapters },
    );
    const out = ctx.state.nodes["c"] as any;
    expect(out.type).toBe("chat");
    expect(out.stoppedReason).toBe("error");
    expect(out.transcript.length).toBe(1); // s'arrête à la 1re erreur, ne boucle pas
    expect(/indisponible|unreachable|LM Studio/i.test(out.transcript[0].text)).toBe(true);
  });

  it("respecte un maxTurns explicite sous le plafond (4)", async () => {
    const adapters = createLmStudioAdapters({ url: "http://127.0.0.1:9/nope", conversationTimeoutMs: 2000 });
    const ctx = await runGraph(
      chatGraph({ topic: "X", voiceA: { name: "A" }, voiceB: { name: "B" }, maxTurns: 4 }),
      {},
      { adapters },
    );
    const out = ctx.state.nodes["c"] as any;
    expect(out.maxTurns).toBe(4);
  });
});

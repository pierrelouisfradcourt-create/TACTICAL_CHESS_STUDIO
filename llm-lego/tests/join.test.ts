import { describe, expect, it } from "vitest";

import { runGraph } from "../src/core/engine.js";
import { validateGraph } from "../src/runtime/scheduler.js";
import type { Graph } from "../src/core/types.js";

/**
 * ÉTAPE 1 — le type de nœud "join" existe et s'exécute comme un PASSTHROUGH NEUTRE.
 * Aucune logique d'attente encore : le join émet un marqueur, le graphe se termine normalement.
 */
describe("join — étape 1 (passthrough neutre)", () => {
  // tool (départ) → join → agent. Le join ne perturbe ni le routage ni l'état.
  const graph: Graph = {
    nodes: [
      { id: "a", type: "tool", data: { tool: "web-search" } },
      { id: "j", type: "join", data: {} },
      { id: "b", type: "agent", data: { agent: "chatbot" } },
    ],
    edges: [
      { id: "e-a-j", from: "a", to: "j" },
      { id: "e-j-b", from: "j", to: "b" },
    ],
  };

  it("valide et exécute un graphe contenant un join sans erreur", async () => {
    expect(() => validateGraph(graph)).not.toThrow();
    const ctx = await runGraph(graph, { query: "x" });
    const visited = ctx.trace.map((s) => s.nodeId);
    expect(visited).toEqual(["a", "j", "b"]); // le join est traversé, dans l'ordre
    expect(ctx.status ?? "completed").toBe("completed");
  });

  it("le join émet un marqueur neutre, sans erreur, sans casser le routage", async () => {
    const ctx = await runGraph(graph, { query: "x" });
    const joinStep = ctx.trace.find((s) => s.nodeId === "j");
    expect(joinStep).toBeDefined();
    expect(joinStep?.error).toBeUndefined();
    expect(joinStep?.nodeType).toBe("join");
    // l'agent en aval s'est bien exécuté APRÈS le join (routage intact)
    expect(ctx.state.nodes["b"]).toBeDefined();
  });
});

/**
 * ÉTAPE 2 — le join ATTEND ses prédécesseurs déclarés (data.waitFor) : il ne produit sa
 * sortie qu'une fois tous présents dans la trace, sinon échec propre. Validation statique
 * si un waitFor pointe vers un nœud absent du graphe.
 */
describe("join — étape 2 (attente des prédécesseurs déclarés)", () => {
  // Graphe MINIMAL et NOUVEAU : 2 producteurs a, b convergent (séquentiellement) vers le join.
  const convergent: Graph = {
    nodes: [
      { id: "a", type: "tool", data: { tool: "web-search" } },
      { id: "b", type: "agent", data: { agent: "chatbot" } },
      { id: "j", type: "join", data: { waitFor: ["a", "b"] } },
      { id: "m", type: "agent", data: { agent: "merger" } },
    ],
    edges: [
      { id: "e-a-b", from: "a", to: "b" },
      { id: "e-b-j", from: "b", to: "j" },
      { id: "e-j-m", from: "j", to: "m" },
    ],
  };

  it("le join ne s'exécute qu'après ses 2 prédécesseurs déclarés, et agrège leurs sorties", async () => {
    const ctx = await runGraph(convergent, { query: "x" });
    const order = ctx.trace.map((s) => s.nodeId);
    // a et b sont tous deux dans la trace AVANT le join
    const iA = order.indexOf("a");
    const iB = order.indexOf("b");
    const iJ = order.indexOf("j");
    expect(iA).toBeGreaterThanOrEqual(0);
    expect(iB).toBeGreaterThanOrEqual(0);
    expect(iJ).toBeGreaterThan(Math.max(iA, iB));

    const joinStep = ctx.trace.find((s) => s.nodeId === "j");
    expect(joinStep?.error).toBeUndefined();
    const out = joinStep?.output as { type: string; waitedFor: string[]; joined: Record<string, unknown> };
    expect(out.type).toBe("join");
    expect(out.waitedFor).toEqual(["a", "b"]);
    // l'agrégat porte bien les sorties réelles de a et b
    expect(out.joined["a"]).toEqual(ctx.state.nodes["a"]);
    expect(out.joined["b"]).toEqual(ctx.state.nodes["b"]);
    // le merger en aval s'exécute après le join
    expect(ctx.state.nodes["m"]).toBeDefined();
  });

  it("échoue PROPREMENT (message clair, pas de résultat prématuré) si un prédécesseur déclaré n'a pas encore tourné", async () => {
    // Le join déclare attendre "later", qui est EN AVAL du join → jamais présent quand le join tourne.
    const premature: Graph = {
      nodes: [
        { id: "start", type: "tool", data: {} },
        { id: "j", type: "join", data: { waitFor: ["later"] } },
        { id: "later", type: "agent", data: {} },
      ],
      edges: [
        { id: "e-s-j", from: "start", to: "j" },
        { id: "e-j-l", from: "j", to: "later" },
      ],
    };
    // "later" EXISTE dans le graphe → validateGraph passe (c'est un problème d'ORDRE, pas d'existence).
    expect(() => validateGraph(premature)).not.toThrow();
    const ctx = await runGraph(premature, {});
    const joinStep = ctx.trace.find((s) => s.nodeId === "j");
    expect(joinStep?.error).toBeDefined();
    expect(joinStep?.error).toContain("not yet executed");
    expect(joinStep?.error).toContain("later");
    // pas d'agrégat prématuré émis
    expect((joinStep?.output as { joined?: unknown }).joined).toBeUndefined();
  });

  it("rejette à la VALIDATION un waitFor pointant vers un nœud absent du graphe", () => {
    const badRef: Graph = {
      nodes: [
        { id: "a", type: "tool", data: {} },
        { id: "j", type: "join", data: { waitFor: ["a", "ghost"] } },
      ],
      edges: [{ id: "e-a-j", from: "a", to: "j" }],
    };
    expect(() => validateGraph(badRef)).toThrow(/waitFor "ghost" which is not a node/);
  });

  it("rejette un join qui s'attend lui-même", () => {
    const selfRef: Graph = {
      nodes: [
        { id: "a", type: "tool", data: {} },
        { id: "j", type: "join", data: { waitFor: ["j"] } },
      ],
      edges: [{ id: "e-a-j", from: "a", to: "j" }],
    };
    expect(() => validateGraph(selfRef)).toThrow(/cannot wait for itself/);
  });
});

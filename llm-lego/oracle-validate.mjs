// Phase 4 — Qwen oracle with STRUCTURED output (no string-matching prose).
// Reads the persisted testN_result.json files and asks the oracle to judge each.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LM = "http://localhost:1234/v1/chat/completions";
const MODEL = "qwen2.5-14b-instruct"; // Qwen3.6 INTERDIT pour JSON (thinking mode vide le content)

async function callQwenOracle(testName, context) {
  const prompt = `Tu es l'oracle de validation pour un test d'orchestration de graphe LLM.

Test : ${testName}
Contexte d'exécution :
${JSON.stringify(context, null, 2)}

Réponds UNIQUEMENT en JSON valide, aucun texte autour :
{ "verdict": "PASS" | "FAIL", "reasoning": "1-2 phrases expliquant pourquoi" }`;

  let res;
  try {
    res = await fetch(LM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "oracle_verdict",
            strict: true,
            schema: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["PASS", "FAIL"] },
                reasoning: { type: "string" },
              },
              required: ["verdict", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
  } catch (e) {
    return { verdict: "UNAVAILABLE", reasoning: `LM Studio unreachable: ${String(e)}` };
  }
  if (!res.ok) return { verdict: "UNAVAILABLE", reasoning: `LM Studio HTTP ${res.status}` };

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed.verdict !== "PASS" && parsed.verdict !== "FAIL") {
      return { verdict: "FAIL", reasoning: `Oracle returned unexpected verdict: ${raw}` };
    }
    return parsed;
  } catch {
    return { verdict: "FAIL", reasoning: `Oracle response not valid JSON: ${raw.slice(0, 200)}` };
  }
}

function loadBody(file) {
  if (!existsSync(file)) return { missing: true };
  return JSON.parse(readFileSync(file, "utf-8")).body;
}

function compact(body) {
  if (!body || body.missing) return { missing: true };
  return {
    success: body.success,
    error: body.error,
    trace: (body.trace ?? []).map((t) => ({
      nodeId: t.nodeId,
      type: t.nodeType,
      reason: t.routingDecision?.reason,
      error: t.error,
    })),
    nodeKeys: body.state ? Object.keys(body.state.nodes ?? {}) : undefined,
  };
}

const cases = [
  { name: "T1 Linear (analyzer -> search)", file: "test1_result.json",
    expected: "Les deux noeuds executes dans l'ordre node-analyzer puis node-search; state.nodes contient les deux sorties." },
  { name: "T2 Conditional routing", file: "test2_result.json",
    expected: "routingDecision.reason == 'exact-match' et la branche node-search est prise (PAS node-chat)." },
  { name: "T3 Cycle safety (as-given a<->b)", file: "test3_result.json",
    expected: "Arret PROPRE et explicite (pas de boucle infinie). Le graphe n'a aucun noeud d'entree (0 incoming), donc soit erreur 'one start node', soit 'max steps exceeded' — les deux sont des arrets propres acceptables." },
  { name: "T3b Cycle safety (entry-cycle)", file: "test3b_result.json",
    expected: "Le dernier element de la trace contient error == 'max steps exceeded'." },
  { name: "T4 Invalid graph (orphan edge)", file: "test4_result.json",
    expected: "Erreur explicite detectee (edge orpheline vers noeud inexistant n3), success=false / HTTP 400." },
];

const results = {};
for (const c of cases) {
  const context = { expected: c.expected, actual: compact(loadBody(c.file)) };
  const verdict = await callQwenOracle(c.name, context);
  results[c.name] = verdict;
  console.log(`${verdict.verdict === "PASS" ? "✅" : verdict.verdict === "FAIL" ? "❌" : "⚠️"} ${c.name}: ${verdict.verdict} — ${verdict.reasoning}`);
}
writeFileSync("oracle_results.json", JSON.stringify(results, null, 2));
console.log("\nsaved -> oracle_results.json");

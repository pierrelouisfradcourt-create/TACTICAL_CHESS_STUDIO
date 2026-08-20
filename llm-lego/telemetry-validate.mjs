// telemetry-validate.mjs — Phase 3 v0 : (A) l'adapter renvoie usage (LM Studio mocké) ;
// (B) telemetryRecords construit les bons enregistrements. Déterministe, sans serveur ni LLM.
import { createLmStudioAdapters } from "./dist/adapters/lmstudio.js";
import { telemetryRecords } from "./telemetry.mjs";
let pass = 0, fail = 0; const check = (n, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${n}`); };

// (A) adapter renvoie usage — fetch mocké
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "ok STANCE: FAVORABLE" } }], usage: { prompt_tokens: 31, completion_tokens: 5, total_tokens: 36 } }) });
try {
  const ad = createLmStudioAdapters();
  const a = await ad.agent({ prompt: "x", role: "COUT" }, { initial: {} }, {});
  check("agent renvoie usage (prompt 31 / total 36)", !!a.usage && a.usage.total_tokens === 36 && a.usage.prompt_tokens === 31);
  const l = await ad.llm({ prompt: "y" }, { initial: {} });
  check("llm renvoie usage (total 36)", !!l.usage && l.usage.total_tokens === 36);
  globalThis.fetch = async () => ({ ok: false, status: 500, statusText: "err" });
  const e = await ad.agent({ prompt: "z", role: "X" }, { initial: {} }, {});
  check("erreur LM → pas d'usage (unavailable)", !e.usage && e.unavailable === true);
} finally { globalThis.fetch = realFetch; }

// (B) telemetryRecords depuis un ctx factice
const ctx = { state: { nodes: {
  COUT: { model: "qwen2.5-14b-instruct", usage: { prompt_tokens: 31, completion_tokens: 5, total_tokens: 36 } },
  NOTE: { text: "pas d'usage" } } }, trace: [{ nodeId: "COUT", durationMs: 1234 }, { nodeId: "NOTE", durationMs: 2 }] };
const recs = telemetryRecords(ctx, { imp: "IMP-206" }, "2026-07-08T00:00:00Z");
check("1 enregistrement (seul le nœud avec usage)", recs.length === 1);
check("enregistrement complet (imp/nodeId/model/tokens/durée)",
  recs[0].imp === "IMP-206" && recs[0].nodeId === "COUT" && recs[0].model === "qwen2.5-14b-instruct" &&
  recs[0].total_tokens === 36 && recs[0].prompt_tokens === 31 && recs[0].durationMs === 1234);
check("nœud sans usage exclu (NOTE)", !recs.some((r) => r.nodeId === "NOTE"));

console.log(`\n  telemetry-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
process.exit(fail === 0 ? 0 : 1);

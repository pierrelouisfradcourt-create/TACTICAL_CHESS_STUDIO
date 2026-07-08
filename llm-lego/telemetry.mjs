// telemetry.mjs — capture observabilité Phase 3 v0 (coût/tokens/modèle/durée par appel live).
// Append-only vers TELEMETRY_DIR/llm_calls.jsonl (non gouverné, gitignored). Lecture seule ensuite.
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TELEMETRY_DIR = process.env["TCS_TELEMETRY_DIR"] || path.join(__dirname, "telemetry");
export const TELEMETRY_FILE = path.join(TELEMETRY_DIR, "llm_calls.jsonl");

// Construit les enregistrements depuis un ExecutionContext (state.nodes + trace). PUR, déterministe.
// v0 : un enregistrement par étape de trace ; nœuds SANS boucle (council-audit/arbitrage). Un nœud
// en boucle répéterait la dernière usage — non géré en v0 (aucune boucle dans le council).
export function telemetryRecords(ctx, initialInput, tsIso) {
  const imp = (initialInput && typeof initialInput === "object" && initialInput.imp) || null;
  const nodes = (ctx && ctx.state && ctx.state.nodes) || {};
  const trace = (ctx && ctx.trace) || [];
  const records = [];
  for (const step of trace) {
    const out = nodes[step.nodeId];
    const u = out && out.usage;
    if (u && typeof u.total_tokens === "number") {
      records.push({
        ts: tsIso, live: true, imp, nodeId: step.nodeId, model: (out && out.model) || null,
        prompt_tokens: u.prompt_tokens ?? null, completion_tokens: u.completion_tokens ?? null,
        total_tokens: u.total_tokens, durationMs: step.durationMs ?? null,
      });
    }
  }
  return records;
}

// Append append-only (crée le dossier au besoin). L'appelant gère l'erreur (jamais bloquant).
export function appendTelemetry(records) {
  if (!records || !records.length) return 0;
  mkdirSync(TELEMETRY_DIR, { recursive: true });
  appendFileSync(TELEMETRY_FILE, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
  return records.length;
}

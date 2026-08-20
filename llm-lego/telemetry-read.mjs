// telemetry-read.mjs — Phase 3.5 : CONSOMMATEUR pur de la télémétrie (séparé de la capture
// telemetry.mjs). Lit llm_calls.jsonl + council_verdicts.jsonl d'un dossier, tolérant à
// l'absence, malformé sauté+compté. PUR & déterministe, ZERO écriture. Réutilise TELEMETRY_DIR
// (même convention TCS_TELEMETRY_DIR que la capture) comme défaut.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { TELEMETRY_DIR } from "./telemetry.mjs";

const ACCUMULATING_THRESHOLD = 20; // sous ce nb d'appels, le signal est déclaré "en accumulation".

// Lit un .jsonl en objets ; retourne { records, skipped }. Fichier absent = { records:[], skipped:0 }.
function readJsonl(file) {
  if (!existsSync(file)) return { records: [], skipped: 0 };
  const lines = readFileSync(file, "utf-8").split("\n");
  const records = [];
  let skipped = 0;
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue; // ligne vide ignorée, jamais comptée comme malformée
    try { records.push(JSON.parse(s)); } catch { skipped += 1; }
  }
  return { records, skipped };
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// Agrège la télémétrie d'un dossier. dir optionnel → défaut TELEMETRY_DIR. PUR.
export function buildTelemetry({ dir } = {}) {
  const base = dir || TELEMETRY_DIR;
  const calls = readJsonl(path.join(base, "llm_calls.jsonl"));
  const verd = readJsonl(path.join(base, "council_verdicts.jsonl"));

  const llm = {
    count: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0,
    total_duration_ms: 0, by_model: {}, distinct_imps: 0, skipped: calls.skipped,
  };
  const imps = new Set();
  for (const r of calls.records) {
    // Enregistrement invalide (total_tokens non numérique) : sauté ET compté (jamais silencieux).
    if (!r || typeof r.total_tokens !== "number" || !Number.isFinite(r.total_tokens)) { llm.skipped += 1; continue; }
    llm.count += 1;
    llm.total_tokens += num(r.total_tokens);
    llm.prompt_tokens += num(r.prompt_tokens);
    llm.completion_tokens += num(r.completion_tokens);
    llm.total_duration_ms += num(r.durationMs);
    const model = typeof r.model === "string" && r.model ? r.model : "(inconnu)";
    if (!llm.by_model[model]) llm.by_model[model] = { calls: 0, tokens: 0 };
    llm.by_model[model].calls += 1;
    llm.by_model[model].tokens += num(r.total_tokens);
    if (r.imp) imps.add(r.imp);
  }
  llm.distinct_imps = imps.size;

  const verdicts = { count: 0, distribution: {}, skipped: verd.skipped };
  for (const r of verd.records) {
    if (!r || typeof r.verdict !== "string" || !r.verdict) { verdicts.skipped += 1; continue; }
    verdicts.count += 1;
    verdicts.distribution[r.verdict] = (verdicts.distribution[r.verdict] || 0) + 1;
  }

  const corpus_state = (llm.count < ACCUMULATING_THRESHOLD || verdicts.count === 0) ? "accumulating" : "active";
  return { llm_calls: llm, verdicts, corpus_state };
}

// Les N verdicts council les plus récents d'un IMP, plus récent d'abord (append-only = ordre chrono).
// dir optionnel → défaut TELEMETRY_DIR. [] si imp vide / fichier absent / aucun verdict. PUR, ZERO écriture.
// Réutilise readJsonl (tolérant : lignes malformées sautées). Sert le ré-affichage du dernier audit d'un IMP.
export function readLastVerdicts(imp, n = 1, { dir } = {}) {
  if (!imp) return [];
  const base = dir || TELEMETRY_DIR;
  const { records } = readJsonl(path.join(base, "council_verdicts.jsonl"));
  const mine = records.filter((r) => r && r.imp === imp && typeof r.verdict === "string" && r.verdict);
  return mine.slice(-n).reverse();
}

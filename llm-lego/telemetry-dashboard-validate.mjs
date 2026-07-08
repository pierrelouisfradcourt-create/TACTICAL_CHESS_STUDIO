// telemetry-dashboard-validate.mjs — Phase 3.5 : preuve du dashboard coût/tokens/verdicts.
// A/B/C = module pur (dossiers temp). D = endpoint (serveur temp). E = UI (playwright).
// Lecture seule ; n'écrit que son rapport telemetry_dashboard_validation_result.json.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildTelemetry } from "./telemetry-read.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const log = [];
const check = (name, ok) => { (ok ? pass++ : fail++); log.push(`${ok ? "✅" : "❌"} ${name}`); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };

// Corpus de référence = 4 lignes réelles (run council-audit IMP-206, 2026-07-08).
const CORPUS = [
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"COUT","model":"qwen2.5-14b-instruct","prompt_tokens":247,"completion_tokens":90,"total_tokens":337,"durationMs":1344}',
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"QUALITE","model":"qwen2.5-14b-instruct","prompt_tokens":244,"completion_tokens":100,"total_tokens":344,"durationMs":1487}',
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"VITESSE","model":"qwen2.5-14b-instruct","prompt_tokens":247,"completion_tokens":119,"total_tokens":366,"durationMs":1463}',
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"ARCHITECTURE","model":"qwen2.5-14b-instruct","prompt_tokens":251,"completion_tokens":118,"total_tokens":369,"durationMs":1685}',
].join("\n") + "\n";

const dirs = [];
const mkdir = (prefix) => { const d = mkdtempSync(path.join(tmpdir(), prefix)); dirs.push(d); return d; };

// --- A : corpus de référence → sommes exactes ---
{
  const d = mkdir("tel-a-");
  writeFileSync(path.join(d, "llm_calls.jsonl"), CORPUS, "utf-8");
  const t = buildTelemetry({ dir: d });
  check("A: count === 4", t.llm_calls.count === 4);
  check("A: total_tokens === 1416", t.llm_calls.total_tokens === 1416);
  check("A: prompt_tokens === 989", t.llm_calls.prompt_tokens === 989);
  check("A: completion_tokens === 427", t.llm_calls.completion_tokens === 427);
  check("A: total_duration_ms === 5979", t.llm_calls.total_duration_ms === 5979);
  check("A: by_model qwen calls===4 tokens===1416", t.llm_calls.by_model["qwen2.5-14b-instruct"] && t.llm_calls.by_model["qwen2.5-14b-instruct"].calls === 4 && t.llm_calls.by_model["qwen2.5-14b-instruct"].tokens === 1416);
  check("A: distinct_imps === 1", t.llm_calls.distinct_imps === 1);
  check("A: verdicts.count === 0 (fichier absent)", t.verdicts.count === 0);
  check("A: corpus_state === accumulating", t.corpus_state === "accumulating");
}
// --- B : dossier vide → zéros, pas de crash ---
{
  const d = mkdir("tel-b-");
  const t = buildTelemetry({ dir: d });
  check("B: count === 0 (absence tolérée)", t.llm_calls.count === 0);
  check("B: total_tokens === 0", t.llm_calls.total_tokens === 0);
  check("B: skipped === 0", t.llm_calls.skipped === 0);
  check("B: verdicts.count === 0", t.verdicts.count === 0);
  check("B: corpus_state === accumulating", t.corpus_state === "accumulating");
}
// --- C : ligne malformée → sautée + comptée, valides agrégées ---
{
  const d = mkdir("tel-c-");
  writeFileSync(path.join(d, "llm_calls.jsonl"),
    '{"total_tokens":10,"prompt_tokens":6,"completion_tokens":4,"durationMs":5,"model":"m","imp":"IMP-1"}\n{ ceci n\'est pas du json\n\n', "utf-8");
  const t = buildTelemetry({ dir: d });
  check("C: count === 1 (valide agrégée)", t.llm_calls.count === 1);
  check("C: skipped === 1 (malformée comptée)", t.llm_calls.skipped === 1);
  check("C: total_tokens === 10", t.llm_calls.total_tokens === 10);
}
// --- F : verdicts + état "active" + multi-modèle/multi-imp (chemins non exercés par A/B/C) ---
{
  const d = mkdir("tel-f1-");
  writeFileSync(path.join(d, "council_verdicts.jsonl"),
    '{"verdict":"BLOQUE"}\n{"verdict":"ESCALADE"}\n{"verdict":"BLOQUE"}\n{ mauvais json\n{"foo":1}\n', "utf-8");
  const t = buildTelemetry({ dir: d });
  check("F1: verdicts.count === 3", t.verdicts.count === 3);
  check("F1: distribution BLOQUE===2 ESCALADE===1", t.verdicts.distribution.BLOQUE === 2 && t.verdicts.distribution.ESCALADE === 1);
  check("F1: verdicts.skipped === 2 (1 malformé + 1 sans verdict)", t.verdicts.skipped === 2);
  check("F1: corpus_state accumulating (0 appel)", t.corpus_state === "accumulating");
}
{
  const d = mkdir("tel-f2-");
  const calls = [];
  for (let i = 0; i < 10; i++) calls.push(JSON.stringify({ imp: "IMP-1", model: "A", prompt_tokens: 6, completion_tokens: 4, total_tokens: 10, durationMs: 1 }));
  for (let i = 0; i < 10; i++) calls.push(JSON.stringify({ imp: "IMP-2", model: "B", prompt_tokens: 12, completion_tokens: 8, total_tokens: 20, durationMs: 1 }));
  writeFileSync(path.join(d, "llm_calls.jsonl"), calls.join("\n") + "\n", "utf-8");
  writeFileSync(path.join(d, "council_verdicts.jsonl"), '{"verdict":"OK"}\n', "utf-8");
  const t = buildTelemetry({ dir: d });
  check("F2: count === 20", t.llm_calls.count === 20);
  check("F2: total_tokens === 300", t.llm_calls.total_tokens === 300);
  check("F2: by_model 2 entrées (A:10/100, B:10/200)", t.llm_calls.by_model.A && t.llm_calls.by_model.A.calls === 10 && t.llm_calls.by_model.A.tokens === 100 && t.llm_calls.by_model.B && t.llm_calls.by_model.B.calls === 10 && t.llm_calls.by_model.B.tokens === 200);
  check("F2: distinct_imps === 2", t.llm_calls.distinct_imps === 2);
  check("F2: verdicts.count === 1", t.verdicts.count === 1);
  check("F2: corpus_state === active (>=20 appels ET verdicts>0)", t.corpus_state === "active");
}

// --- D : endpoint /api/telemetry sur serveur temp (TCS_TELEMETRY_DIR = fixture) ---
const PORT = process.env["LEGO_TELEMETRY_PORT"] ?? "3123";
const BASE = `http://localhost:${PORT}`;
const teldir = mkdir("tel-d-");
writeFileSync(path.join(teldir, "llm_calls.jsonl"), CORPUS, "utf-8");
const brain = mkdir("tel-brain-");
const facts = mkdir("tel-facts-");
writeFileSync(path.join(facts, "n.md"), "# N\n\nx.", "utf-8");
const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname,
  env: { ...process.env, TCS_TELEMETRY_DIR: teldir, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(BASE + "/api/telemetry"); if (r.ok) return true; } catch {}
    await sleep(250);
  }
  return false;
}
try {
  const up = await waitUp();
  check("D: serveur répond sur /api/telemetry", up);
  if (up) {
    const r = await fetch(BASE + "/api/telemetry");
    const b = await r.json();
    check("D: HTTP 200", r.status === 200);
    check("D: total_tokens === 1416 via endpoint", b.llm_calls && b.llm_calls.total_tokens === 1416);
    check("D: corpus_state === accumulating via endpoint", b.corpus_state === "accumulating");
    check("D: verdicts.count === 0 via endpoint", b.verdicts && b.verdicts.count === 0);
  }
} catch (e) {
  check("D: pas d'exception pendant le test endpoint", false);
  console.error(e);
}

// --- E : la section Télémétrie s'affiche sur l'Accueil (DOM réel) ---
try {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
    await page.getByRole("button", { name: /Accueil/ }).click();
    await page.waitForSelector('[data-testid="telemetry-panel"]', { timeout: 10000 });
    check("E: section telemetry-panel présente", await page.locator('[data-testid="telemetry-panel"]').count() === 1);
    check("E: tuile tokens affiche 1416", /1416/.test(await page.locator('[data-testid="telemetry-tokens"]').textContent()));
    check("E: libellé coût honnête présent", /modèle local/i.test(await page.locator('[data-testid="telemetry-cost-label"]').textContent()));
    check("E: bannière accumulation présente", await page.locator('[data-testid="telemetry-accumulating"]').count() === 1);
    await page.screenshot({ path: path.join(__dirname, "telemetry_dashboard.png"), fullPage: false });
  } finally {
    await browser.close();
  }
} catch (e) {
  check("E: pas d'exception pendant le test UI", false);
  console.error(e);
}

// Teardown robuste : sur Windows, server.kill() déclenche une assertion libuv
// (UV_HANDLE_CLOSING, cf. memory-validate.mjs/hygiene-validate.mjs) — on tue
// l'enfant via taskkill et on n'écrit le rapport / ne process.exit() qu'une
// fois le handle de l'enfant réellement fermé (ou après un fallback 3s).
let done = false;
function finish() {
  if (done) return; done = true;
  for (const d of dirs) { try { rmSync(d, { recursive: true, force: true }); } catch {} }
  writeFileSync(path.join(__dirname, "telemetry_dashboard_validation_result.json"),
    JSON.stringify({ pass, fail, checks: log }, null, 2), "utf-8");
  console.log(`\ntelemetry-dashboard: ${pass} pass / ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}
if (server.exitCode !== null || server.signalCode !== null) {
  finish();
} else {
  server.once("exit", () => finish());
  try {
    if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
    else server.kill();
  } catch { finish(); }
  setTimeout(() => finish(), 3000);
}

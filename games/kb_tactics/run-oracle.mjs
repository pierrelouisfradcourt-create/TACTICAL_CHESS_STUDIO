// kb_tactics — POINT D'ENTRÉE de l'oracle déterministe (4 volets + 1 mesure).
// (a) tests de logique   (node --test logic.test.mjs)
// (b) tests de propriété (node --test properties.test.mjs)
// (c) e2e Playwright     (e2e.mjs)  — playwright résolu via belote node_modules
// (d) solvabilité        (solvability.mjs) — un bot doit GAGNER
// (e) reuse_ratio.mjs    — mesure de réutilisation (advisory, ne gate PAS le verdict)
// Exit 0 SEULEMENT si les quatre volets (a-d) passent.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BELOTE_NODE_MODULES = resolve(
  __dirname, "..", "..", "llm-lego", "experiments", "belote-claude", "node_modules"
);

function run(label, file, extraEnv = {}) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(process.execPath, [file], {
      cwd: __dirname,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stdout.on("data", (d) => { chunks.push(d); process.stdout.write(d); });
    proc.stderr.on("data", (d) => { chunks.push(d); process.stderr.write(d); });
    proc.on("error", (err) => resolvePromise({ label, ok: false, code: -1, output: String(err), launchFailure: true }));
    proc.on("exit", (code) => resolvePromise({ label, ok: code === 0, code, output: chunks.map(String).join("") }));
  });
}

async function main() {
  console.log("=== ORACLE kb_tactics ===\n");

  console.log("--- (a) logic tests ---");
  const logicResult = await run("logic tests", "logic.test.mjs");
  console.log(`\n[logic] exit = ${logicResult.code}\n`);

  console.log("--- (b) property tests ---");
  const propResult = await run("property tests", "properties.test.mjs");
  console.log(`\n[properties] exit = ${propResult.code}\n`);

  console.log("--- (c) e2e Playwright ---");
  if (!existsSync(BELOTE_NODE_MODULES)) {
    console.log(`AVERTISSEMENT : node_modules introuvable à ${BELOTE_NODE_MODULES} — playwright risque de ne pas se résoudre.`);
  }
  const e2eResult = await run("e2e Playwright", "e2e.mjs", { NODE_PATH: BELOTE_NODE_MODULES });
  console.log(`\n[e2e] exit = ${e2eResult.code}\n`);

  console.log("--- (d) solvabilité ---");
  const solvResult = await run("solvabilité", "solvability.mjs");
  console.log(`\n[solvabilité] exit = ${solvResult.code}\n`);

  console.log("--- (e) reuse_ratio (mesure, non gating) ---");
  const reuseResult = await new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(process.execPath, [resolve(__dirname, "..", "..", "scripts", "forge", "reuse_ratio.mjs"), __dirname], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stdout.on("data", (d) => chunks.push(d));
    proc.stderr.on("data", (d) => process.stderr.write(d));
    proc.on("error", (err) => resolvePromise({ ok: false, output: String(err) }));
    proc.on("exit", (code) => resolvePromise({ ok: code === 0, output: chunks.map(String).join("") }));
  });
  console.log(`[reuse_ratio] ${reuseResult.ok ? "mesuré" : "échec d'exécution (non bloquant, ne gate pas le verdict)"}\n`);

  const allOk = logicResult.ok && propResult.ok && e2eResult.ok && solvResult.ok;

  console.log("=== RÉSUMÉ ORACLE ===");
  console.log(`logic tests    : ${logicResult.ok ? "PASS" : "FAIL"} (code ${logicResult.code})`);
  console.log(`property tests : ${propResult.ok ? "PASS" : "FAIL"} (code ${propResult.code})`);
  console.log(`e2e Playwright : ${e2eResult.ok ? "PASS" : e2eResult.launchFailure ? "FAIL (navigateur indisponible)" : "FAIL"} (code ${e2eResult.code})`);
  console.log(`solvabilité    : ${solvResult.ok ? "PASS (un bot gagne)" : "FAIL (injouable)"} (code ${solvResult.code})`);
  console.log(`\nVERDICT ORACLE: ${allOk ? "PASS" : "FAIL"}`);
  process.exit(allOk ? 0 : 1);
}

main();

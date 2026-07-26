// run-oracle.mjs — POINT D'ENTRÉE de l'oracle CODE du jeu. Enchaîne, en process
// séparés : (a) tests logique -> (a') property-based -> (b) e2e navigateur réel ->
// (c) solvabilité (bot gagne + capture). Exit 0 ssi les 4 passent.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Résout les node_modules contenant playwright (pour l'e2e) par recherche ASCENDANTE :
// dans le worktree, node_modules est gitignoré -> on remonte jusqu'au repo principal.
// Portable : marche aussi après merge (le repo du jeu a son propre belote-claude).
function resolvePlaywrightNodeModules() {
  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    const cand = join(dir, "llm-lego", "experiments", "belote-claude", "node_modules");
    if (existsSync(join(cand, "playwright"))) { return cand; }
    const parent = dirname(dir);
    if (parent === dir) { break; }
    dir = parent;
  }
  return null;
}
const NODE_MODULES = resolvePlaywrightNodeModules();

function run(label, file, extraEnv = {}) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(process.execPath, file.split(" "), {
      cwd: __dirname,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stdout.on("data", (d) => { chunks.push(d); process.stdout.write(d); });
    proc.stderr.on("data", (d) => { chunks.push(d); process.stderr.write(d); });
    proc.on("error", (err) => {
      resolvePromise({ label, ok: false, code: -1, output: String(err), launchFailure: true });
    });
    proc.on("exit", (code) => {
      resolvePromise({ label, ok: code === 0, code, output: chunks.map(String).join("") });
    });
  });
}

async function main() {
  console.log("=== ORACLE Menagerie Tactics ===\n");

  console.log("--- (a) logic tests: node --test logic.test.mjs ---");
  const logicResult = await run("logic tests", "--test logic.test.mjs");
  console.log(`\n[logic tests] exit code = ${logicResult.code}\n`);

  console.log("--- (a1) bestiaire tests: node --test bestiaire.test.mjs ---");
  const bestiaireResult = await run("bestiaire tests", "--test bestiaire.test.mjs");
  console.log(`\n[bestiaire tests] exit code = ${bestiaireResult.code}\n`);

  console.log("--- (a2) combat/preview/ai tests (économie d'action v2) ---");
  const combatResult = await run("combat tests", "--test combat.test.mjs");
  const previewResult = await run("preview tests", "--test preview.test.mjs");
  const aiResult = await run("ai tests", "--test ai.test.mjs");
  console.log(`\n[combat] ${combatResult.code}  [preview] ${previewResult.code}  [ai] ${aiResult.code}\n`);

  console.log("--- (a3) meta/compose tests (roster/payoff) ---");
  const metaResult = await run("meta tests", "--test meta.test.mjs");
  const metaPropResult = await run("meta properties", "--test meta.properties.test.mjs");
  const composeResult = await run("compose tests", "--test compose.test.mjs");
  console.log(`\n[meta] ${metaResult.code}  [meta-prop] ${metaPropResult.code}  [compose] ${composeResult.code}\n`);

  console.log("--- (a4) objectives/campaign tests (campagne) ---");
  const objResult = await run("objectives tests", "--test objectives.test.mjs");
  const campResult = await run("campaign tests", "--test campaign.test.mjs");
  console.log(`\n[objectives] ${objResult.code}  [campaign] ${campResult.code}\n`);

  console.log("--- (a5) uxmodel/fx tests (lisibilité) ---");
  const uxResult = await run("uxmodel tests", "--test uxmodel.test.mjs");
  const fxResult = await run("fx tests", "--test fx.test.mjs");
  console.log(`\n[uxmodel] ${uxResult.code}  [fx] ${fxResult.code}\n`);

  console.log("--- (c2) solvabilité généralisée (méta) : meta-solvability.mjs ---");
  const metaSolvResult = await run("méta-solvabilité", "meta-solvability.mjs");
  console.log(`\n[méta-solvabilité] exit code = ${metaSolvResult.code}\n`);

  console.log("--- (c3) solvabilité par objectif (campagne) : campaign-solvability.mjs ---");
  const campSolvResult = await run("campagne-solvabilité", "campaign-solvability.mjs");
  console.log(`\n[campagne-solvabilité] exit code = ${campSolvResult.code}\n`);

  console.log("--- (a') property tests: node --test properties.test.mjs ---");
  const propResult = await run("property tests", "--test properties.test.mjs");
  console.log(`\n[property tests] exit code = ${propResult.code}\n`);

  console.log("--- (b) e2e Playwright: e2e.mjs ---");
  if (!NODE_MODULES) {
    console.log("AVERTISSEMENT : node_modules playwright introuvable par recherche ascendante.");
  }
  const e2eEnv = NODE_MODULES ? { NODE_PATH: NODE_MODULES } : {};
  const e2eResult = await run("e2e Playwright", "e2e.mjs", e2eEnv);
  console.log(`\n[e2e Playwright] exit code = ${e2eResult.code}\n`);

  console.log("--- (b2) e2e UX (lisibilité) : e2e-ux.mjs ---");
  const e2euxResult = await run("e2e UX", "e2e-ux.mjs", e2eEnv);
  console.log(`\n[e2e UX] exit code = ${e2euxResult.code}\n`);

  console.log("--- (c) solvabilité: solvability.mjs ---");
  const solvResult = await run("solvabilité", "solvability.mjs");
  console.log(`\n[solvabilité] exit code = ${solvResult.code}\n`);

  const allOk = logicResult.ok && bestiaireResult.ok && combatResult.ok && previewResult.ok
    && aiResult.ok && metaResult.ok && metaPropResult.ok && composeResult.ok
    && objResult.ok && campResult.ok && uxResult.ok && fxResult.ok
    && propResult.ok && e2eResult.ok && e2euxResult.ok && solvResult.ok && metaSolvResult.ok && campSolvResult.ok;

  console.log("=== RÉSUMÉ ORACLE ===");
  console.log(`logic tests    : ${logicResult.ok ? "PASS" : "FAIL"} (code ${logicResult.code})`);
  console.log(`bestiaire tests: ${bestiaireResult.ok ? "PASS" : "FAIL"} (code ${bestiaireResult.code})`);
  console.log(`combat tests   : ${combatResult.ok ? "PASS" : "FAIL"} (code ${combatResult.code})`);
  console.log(`preview tests  : ${previewResult.ok ? "PASS" : "FAIL"} (code ${previewResult.code})`);
  console.log(`ai tests       : ${aiResult.ok ? "PASS" : "FAIL"} (code ${aiResult.code})`);
  console.log(`meta tests     : ${metaResult.ok && metaPropResult.ok && composeResult.ok ? "PASS" : "FAIL"}`);
  console.log(`campagne tests : ${objResult.ok && campResult.ok ? "PASS" : "FAIL"}`);
  console.log(`ux tests       : ${uxResult.ok && fxResult.ok ? "PASS" : "FAIL"}`);
  console.log(`e2e UX         : ${e2euxResult.ok ? "PASS (aperçu au survol + journal)" : "FAIL"} (code ${e2euxResult.code})`);
  console.log(`méta-solvab.   : ${metaSolvResult.ok ? "PASS (compositions jouables)" : "FAIL"} (code ${metaSolvResult.code})`);
  console.log(`campagne-solv. : ${campSolvResult.ok ? "PASS (objectifs atteints)" : "FAIL"} (code ${campSolvResult.code})`);
  console.log(`property tests : ${propResult.ok ? "PASS" : "FAIL"} (code ${propResult.code})`);
  console.log(`e2e Playwright : ${e2eResult.ok ? "PASS" : (e2eResult.launchFailure ? "FAIL (navigateur non lançable)" : "FAIL")} (code ${e2eResult.code})`);
  console.log(`solvabilité    : ${solvResult.ok ? "PASS (un bot gagne et capture)" : "FAIL (jeu injouable)"} (code ${solvResult.code})`);
  console.log(`\nVERDICT ORACLE: ${allOk ? "PASS" : "FAIL"}`);

  process.exit(allOk ? 0 : 1);
}

main();

// P2 Beta — POINT D'ENTRÉE de l'oracle déterministe.
// (a) tests de logique pure (logic.test.mjs)
// (b) tests de mutation/propriété (properties.test.mjs)
// (c) e2e Playwright (e2e.mjs)
// (d) solvabilité (solvability.mjs)
// (e) mesure de réutilisation (scripts/forge/reuse_ratio.mjs) — informative
// Exit code 0 SEULEMENT si tous les volets passent. Pas de skip silencieux :
// un playwright introuvable est un FAIL, jamais un PASS déguisé (cf. pré-mortem
// s10a-oracle-code — "une vérification peut être verte sans avoir eu lieu").
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// node_modules Playwright partagé du studio (cf. games/breakout/run-oracle.mjs) —
// évite d'installer une copie par jeu.
const SHARED_NODE_MODULES = resolve(
  __dirname, '..', '..', 'llm-lego', 'experiments', 'belote-claude', 'node_modules'
);

function run(label, file, extraEnv = {}, args = []) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(process.execPath, [file, ...args], {
      cwd: __dirname,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout.on('data', (d) => { chunks.push(d); process.stdout.write(d); });
    proc.stderr.on('data', (d) => { chunks.push(d); process.stderr.write(d); });
    proc.on('error', (err) => {
      resolvePromise({ label, ok: false, code: -1, output: String(err), launchFailure: true });
    });
    proc.on('exit', (code) => {
      resolvePromise({ label, ok: code === 0, code, output: chunks.map(String).join('') });
    });
  });
}

async function main() {
  console.log('🎮 P2_BETA ORACLE SUITE\n');

  console.log('=== TEST 1: UNIT TESTS (logic.test.mjs) ===');
  const unitResult = await run('unit tests', 'logic.test.mjs');
  console.log(`\n[unit tests] exit code = ${unitResult.code}\n`);

  console.log('=== TEST 2: MUTATION PROPERTIES (properties.test.mjs) ===');
  const mutResult = await run('mutation properties', 'properties.test.mjs');
  console.log(`\n[mutation properties] exit code = ${mutResult.code}\n`);

  console.log('=== TEST 3: E2E ORACLE (e2e.mjs) ===');
  if (!existsSync(SHARED_NODE_MODULES)) {
    console.log(`AVERTISSEMENT : node_modules introuvable à ${SHARED_NODE_MODULES} — playwright ne pourra probablement pas se résoudre.`);
  }
  const e2eResult = await run('e2e Playwright', 'e2e.mjs', { NODE_PATH: SHARED_NODE_MODULES });
  console.log(`\n[e2e Playwright] exit code = ${e2eResult.code}\n`);

  console.log('=== TEST 4: SOLVABILITY ORACLE (solvability.mjs) ===');
  const solvResult = await run('solvability', 'solvability.mjs');
  console.log(`\n[solvability] exit code = ${solvResult.code}\n`);

  // === MESURE 5 : réutilisation de la bibliothèque ===
  // reuse_ratio.mjs MESURE, il ne juge pas : un ratio bas est un FAIT à rapporter,
  // pas une erreur. Il ne participe donc PAS à `allPassed` — mais il doit être
  // exécuté mécaniquement ici, sinon la citation du builder n'est pas vérifiable
  // (garde forge.static_oracles.check_reuse_ratio_wired).
  console.log('=== MESURE 5: RÉUTILISATION ===');
  const FORGE_SCRIPTS = resolve(__dirname, '..', '..', 'scripts', 'forge');
  const reuseResult = await run('reuse', resolve(FORGE_SCRIPTS, 'reuse_ratio.mjs'), {}, [__dirname]);
  console.log(`\n[reuse_ratio] exit code = ${reuseResult.code} (mesure, non bloquante)\n`);

  const allPassed = unitResult.ok && mutResult.ok && e2eResult.ok && solvResult.ok;

  console.log('='.repeat(50));
  console.log('ORACLE SUITE SUMMARY');
  console.log('='.repeat(50));
  console.log(`Unit Tests:     ${unitResult.ok ? '✓' : '✗'} (code ${unitResult.code})`);
  console.log(`Mutation:       ${mutResult.ok ? '✓' : '✗'} (code ${mutResult.code})`);
  console.log(
    `E2E:            ${e2eResult.ok ? '✓' : e2eResult.launchFailure ? '✗ (lancement navigateur impossible — environnement indisponible)' : '✗'} (code ${e2eResult.code})`
  );
  console.log(`Solvability:    ${solvResult.ok ? '✓ (un bot gagne)' : '✗ (jeu injouable)'} (code ${solvResult.code})`);
  console.log(`Reuse ratio:    mesuré (code ${reuseResult.code}) — informatif, ne gate rien`);
  console.log('='.repeat(50));

  if (allPassed) {
    console.log('✓ ALL ORACLES PASSED');
    console.log('\nsoftware_verdict: OK');
  } else {
    console.log('✗ ORACLE SUITE FAILED');
    console.log('\nsoftware_verdict: FAIL');
  }
  console.log('evidence_verdict: MECHANICAL_VALIDATION_ONLY');
  console.log('claim_verdict: NO_CLAIM_ALLOWED');

  process.exit(allPassed ? 0 : 1);
}

main();

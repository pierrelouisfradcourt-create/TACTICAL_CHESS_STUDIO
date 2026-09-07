// p3_alpha — POINT D'ENTRÉE de l'oracle déterministe.
// (a) tests de logique + propriétés : node --test logic.test.mjs properties.test.mjs
//     (= DEFAULT_TEST_ARGV du driver Forge, scripts/forge/driver.py — la commande
//     de mutation gate DOIT être la MÊME commande qui prouve le logiciel, sinon un
//     mutant tué ici pourrait survivre au gate et inversement)
// (b) e2e Playwright click-through réel : node e2e.mjs
// (c) solvabilité (bot doit GAGNER) : node solvability.mjs
// Exit code 0 SEULEMENT si tous les volets passent.
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(label, argv) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(argv[0], argv.slice(1), {
      cwd: __dirname,
      env: process.env,
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

async function runOracle() {
  console.log('=== ORACLE p3_alpha ===\n');

  console.log('--- (a) logic + property tests: node --test logic.test.mjs properties.test.mjs ---');
  const testResult = await run('logic+properties', [process.execPath, '--test', 'logic.test.mjs', 'properties.test.mjs']);
  console.log(`\n[logic+properties] exit code = ${testResult.code}\n`);

  console.log('--- (b) e2e Playwright: node e2e.mjs ---');
  const e2eResult = await run('e2e', [process.execPath, 'e2e.mjs']);
  console.log(`\n[e2e] exit code = ${e2eResult.code}\n`);

  console.log('--- (c) solvabilité: node solvability.mjs ---');
  const solvResult = await run('solvability', [process.execPath, 'solvability.mjs']);
  console.log(`\n[solvabilité] exit code = ${solvResult.code}\n`);

  const allOk = testResult.ok && e2eResult.ok && solvResult.ok;

  const report = {
    oracle_name: 'p3_alpha-code',
    timestamp: new Date().toISOString(),
    suites: [
      { oracle: 'logic+properties', verdict: testResult.ok ? 'PASS' : 'FAIL', exit_code: testResult.code },
      { oracle: 'e2e', verdict: e2eResult.ok ? 'PASS' : 'FAIL', exit_code: e2eResult.code },
      { oracle: 'solvability', verdict: solvResult.ok ? 'PASS' : 'FAIL', exit_code: solvResult.code },
    ],
    software_verdict: allOk ? 'OK' : 'FAIL',
    evidence_verdict: 'MECHANICAL_VALIDATION_ONLY',
    claim_verdict: 'NO_CLAIM_ALLOWED',
    evidence_path: 'games/p3_alpha',
  };

  console.log('=== RÉSUMÉ ORACLE ===');
  console.log(`logic+properties : ${testResult.ok ? 'PASS' : 'FAIL'} (code ${testResult.code})`);
  console.log(
    `e2e Playwright : ${e2eResult.ok ? 'PASS' : e2eResult.launchFailure ? 'FAIL (lancement navigateur impossible — environnement indisponible)' : 'FAIL'} (code ${e2eResult.code})`
  );
  console.log(`solvabilité : ${solvResult.ok ? 'PASS (un bot gagne)' : 'FAIL (jeu injouable)'} (code ${solvResult.code})`);
  console.log(`\nVERDICT ORACLE: ${allOk ? 'PASS' : 'FAIL'}`);
  console.log(JSON.stringify(report, null, 2));

  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runOracle();
  process.exit(result.software_verdict === 'OK' ? 0 : 1);
}

export { runOracle };

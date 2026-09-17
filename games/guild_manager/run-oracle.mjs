// guild_manager — POINT D'ENTRÉE de l'oracle déterministe.
// (a) tests de logique + propriétés : node --test logic.test.mjs properties.test.mjs
//     (= DEFAULT_TEST_ARGV du driver Forge : la commande de mutation DOIT être la
//     même que celle qui prouve le logiciel)
// (b) e2e Playwright click-through réel : node e2e.mjs
// (c) solvabilité (un bot doit GAGNER, déterminisme) : node solvability.mjs
// Exit code 0 SEULEMENT si tous les volets passent.
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(label, argv) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(argv[0], argv.slice(1), { cwd: __dirname, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', (d) => { chunks.push(d); process.stdout.write(d); });
    proc.stderr.on('data', (d) => { chunks.push(d); process.stderr.write(d); });
    proc.on('error', (err) => resolvePromise({ label, ok: false, code: -1, output: String(err), launchFailure: true }));
    proc.on('exit', (code) => resolvePromise({ label, ok: code === 0, code, output: chunks.map(String).join('') }));
  });
}

async function runOracle() {
  console.log('=== ORACLE guild_manager ===\n');
  console.log('--- (a) logic + property tests ---');
  const testResult = await run('logic+properties', [process.execPath, '--test', 'logic.test.mjs', 'properties.test.mjs']);
  console.log(`\n[logic+properties] exit code = ${testResult.code}\n`);
  console.log('--- (b) e2e Playwright ---');
  const e2eResult = await run('e2e', [process.execPath, 'e2e.mjs']);
  console.log(`\n[e2e] exit code = ${e2eResult.code}\n`);
  console.log('--- (c) solvabilité ---');
  const solvResult = await run('solvability', [process.execPath, 'solvability.mjs']);
  console.log(`\n[solvabilité] exit code = ${solvResult.code}\n`);

  const allOk = testResult.ok && e2eResult.ok && solvResult.ok;
  const report = {
    oracle_name: 'guild_manager-code',
    timestamp: new Date().toISOString(),
    suites: [
      { oracle: 'logic+properties', verdict: testResult.ok ? 'PASS' : 'FAIL', exit_code: testResult.code },
      { oracle: 'e2e', verdict: e2eResult.ok ? 'PASS' : 'FAIL', exit_code: e2eResult.code },
      { oracle: 'solvability', verdict: solvResult.ok ? 'PASS' : 'FAIL', exit_code: solvResult.code },
    ],
    software_verdict: allOk ? 'OK' : 'FAIL',
    evidence_verdict: 'MECHANICAL_VALIDATION_ONLY',
    claim_verdict: 'NO_CLAIM_ALLOWED',
    evidence_path: 'games/guild_manager',
  };
  console.log('=== RÉSUMÉ ORACLE ===');
  console.log(`logic+properties : ${report.suites[0].verdict} (code ${testResult.code})`);
  console.log(`e2e Playwright : ${report.suites[1].verdict} (code ${e2eResult.code})`);
  console.log(`solvabilité : ${report.suites[2].verdict} (code ${solvResult.code})`);
  console.log(`\nVERDICT ORACLE: ${allOk ? 'PASS' : 'FAIL'}`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runOracle();
  process.exit(result.software_verdict === 'OK' ? 0 : 1);
}

export { runOracle };

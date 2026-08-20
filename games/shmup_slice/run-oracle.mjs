// Shmup Slice — POINT D'ENTRÉE de l'oracle déterministe.
// (a) logic tests
// (b) property tests
// (c) solvabilité
// (d) e2e Playwright
// Exit code 0 SEULEMENT si tous les volets passent.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BELOTE_NODE_MODULES = resolve(
  __dirname,
  '..',
  '..',
  'llm-lego',
  'experiments',
  'belote-claude',
  'node_modules'
);

function run(label, file, extraEnv = {}, extraArgs = []) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(process.execPath, [file, ...extraArgs], {
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
  console.log('=== ORACLE Shmup Slice ===\n');

  console.log('--- (a) logic tests: node --test logic.test.mjs ---');
  const logicResult = await run('logic tests', 'logic.test.mjs');
  console.log(`\n[logic tests] exit code = ${logicResult.code}\n`);

  console.log('--- (b) property tests: node --test properties.test.mjs ---');
  const propResult = await run('property tests', 'properties.test.mjs');
  console.log(`\n[property tests] exit code = ${propResult.code}\n`);

  console.log('--- (c) solvabilité: solvability.mjs ---');
  const solvResult = await run('solvabilité', 'solvability.mjs');
  console.log(`\n[solvabilité] exit code = ${solvResult.code}\n`);

  console.log('--- (d) e2e Playwright: e2e.mjs ---');
  if (!existsSync(BELOTE_NODE_MODULES)) {
    console.log(
      `AVERTISSEMENT : node_modules introuvable à ${BELOTE_NODE_MODULES} — playwright ne pourra probablement pas se résoudre.`
    );
  }
  const e2eResult = await run('e2e Playwright', 'e2e.mjs', { NODE_PATH: BELOTE_NODE_MODULES });
  console.log(`\n[e2e Playwright] exit code = ${e2eResult.code}\n`);

  console.log('--- (e) reuse_ratio (advisory, non-gating) : scripts/forge/reuse_ratio.mjs ---');
  const reuseResult = await run('reuse_ratio', resolve(__dirname, '..', '..', 'scripts', 'forge', 'reuse_ratio.mjs'), {}, ['.']);
  console.log(`\n[reuse_ratio] exit code = ${reuseResult.code} (mesure seulement — n'affecte jamais le verdict)\n`);

  const allOk = logicResult.ok && propResult.ok && solvResult.ok && e2eResult.ok;

  console.log('=== RÉSUMÉ ORACLE ===');
  console.log(`logic tests : ${logicResult.ok ? 'PASS' : 'FAIL'} (code ${logicResult.code})`);
  console.log(`property tests : ${propResult.ok ? 'PASS' : 'FAIL'} (code ${propResult.code})`);
  console.log(`solvabilité : ${solvResult.ok ? 'PASS' : 'FAIL'} (code ${solvResult.code})`);
  console.log(
    `e2e Playwright : ${e2eResult.ok ? 'PASS' : e2eResult.launchFailure ? 'FAIL (lancement navigateur impossible — environnement indisponible)' : 'FAIL'} (code ${e2eResult.code})`
  );
  console.log(`\nVERDICT ORACLE: ${allOk ? 'PASS' : 'FAIL'}`);

  process.exit(allOk ? 0 : 1);
}

main();

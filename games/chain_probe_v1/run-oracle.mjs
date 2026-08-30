#!/usr/bin/env node
// run-oracle.mjs — orchestrateur d'oracle : mécanique + e2e + solvabilité.
// Exit 0 seulement si tous les volets passent.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// "playwright" n'est pas dupliqué dans games/chain_probe_v1 : on pointe
// NODE_PATH vers un node_modules du dépôt qui l'installe déjà (même patron
// que games/collect_runner_legacy/run-oracle.mjs). NODE_PATH est ignoré par
// la résolution ESM bare specifier — e2e.mjs le lit via createRequire().
const PLAYWRIGHT_NODE_MODULES = resolve(
  __dirname, '..', '..', 'llm-lego', 'experiments', 'belote-claude', 'node_modules'
);
// games/<jeu>/ -> racine du dépôt (deux niveaux au-dessus).
const REPO_ROOT = resolve(__dirname, '..', '..');

async function runCommand(cmd, args, label, extraEnv = {}) {
  return new Promise((resolve) => {
    console.log(`\n[ORACLE] ${label}...`);
    const proc = spawn(cmd, args, { stdio: 'inherit', cwd: __dirname, env: { ...process.env, ...extraEnv } });
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[ORACLE] ✓ ${label} PASS`);
      } else {
        console.log(`[ORACLE] ✗ ${label} FAIL (exit ${code})`);
      }
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('=== CHAIN_PROBE_V1 ORACLE SUITE ===');

  const results = {
    mechanics: false,
    e2e: false,
    solvability: false
  };

  // Volet 1 : Mécanique (tests unitaires + mutations)
  results.mechanics = await runCommand('node', ['--test', 'logic.test.mjs', 'properties.test.mjs'], 'Mechanics');

  // Volet 2 : E2E (Playwright, navigateur réel — voir PLAYWRIGHT_NODE_MODULES ci-dessus)
  if (!existsSync(PLAYWRIGHT_NODE_MODULES)) {
    console.log(`AVERTISSEMENT : node_modules introuvable à ${PLAYWRIGHT_NODE_MODULES} — playwright ne pourra probablement pas se résoudre.`);
  }
  results.e2e = await runCommand('node', ['e2e.mjs'], 'E2E', { NODE_PATH: PLAYWRIGHT_NODE_MODULES });

  // Volet 3 : Solvabilité (bot joue et gagne)
  results.solvability = await runCommand('node', ['solvability.mjs'], 'Solvability');

  // Volet 4 : MESURE de réutilisation — délibérément HORS du gate. reuse_ratio.mjs
  // compte des imports, il ne juge rien (son propre en-tête : « un reuse_ratio bas
  // n'est pas une erreur, c'est un FAIT à rapporter ») et sort toujours en 0. Le
  // mettre dans `allPass` transformerait une mesure en verdict — exactement la faute
  // que ce studio nomme « une métrique qui classe doit d'abord prouver sa variance ».
  // Le reçu part sur stdout et atterrit donc dans le log d'évidence de l'oracle.
  const reuseMeasured = await runCommand('node', [resolve(REPO_ROOT, 'scripts/forge/reuse_ratio.mjs'), __dirname], 'Reuse ratio (mesure, advisory)');

  const allPass = Object.values(results).every(r => r);
  console.log(`\n=== RÉSULTAT ORACLE ===`);
  console.log(`Mécanique: ${results.mechanics ? 'PASS' : 'FAIL'}`);
  console.log(`E2E: ${results.e2e ? 'PASS' : 'FAIL'}`);
  console.log(`Solvabilité: ${results.solvability ? 'PASS' : 'FAIL'}`);
  console.log(`Reuse ratio (advisory, hors gate): ${reuseMeasured ? 'MESURÉ' : 'NON MESURÉ'}`);
  console.log(`GLOBAL: ${allPass ? 'PASS' : 'FAIL'}`);

  process.exit(allPass ? 0 : 1);
}

main();

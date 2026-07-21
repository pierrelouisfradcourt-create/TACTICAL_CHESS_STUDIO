#!/usr/bin/env node
// godot_oracle.mjs — Oracle maitre pour un projet Godot de la Forge.
// Enchaine (1) run_tests.gd (mecanique, headless) puis (2) solvability_godot.mjs
// (R9 : un bot doit reellement gagner). Exit 0 SEULEMENT si les DEUX sont
// verts ; sinon exit 1 des le premier rouge (jamais un vert par defaut).
//
// Le binaire Godot est toujours resolu via resolveGodotBin() (Tache 1) —
// jamais un chemin en dur.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveGodotBin } from './godot_bin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

const TEST_SCRIPT = 'res://tests/run_tests.gd';
const SOLVABILITY_SCRIPT = 'res://solvability.gd';
const SOLVABILITY_TRIALS = 50;

/** Lance run_tests.gd headless sur le projet. true si exit 0. */
function runMechanicalTests(project) {
  console.log('[godot_oracle] === run_tests.gd (mecanique) ===');
  let bin;
  try {
    bin = resolveGodotBin();
  } catch (e) {
    console.error(`[godot_oracle] resolution du binaire Godot impossible : ${e.message}`);
    return false;
  }
  const res = spawnSync(
    bin,
    ['--headless', '--path', resolve(REPO_ROOT, project), '--script', TEST_SCRIPT],
    { stdio: 'inherit', windowsHide: true }
  );
  if (res.error) {
    console.error(`[godot_oracle] spawn Godot impossible : ${res.error.message}`);
    return false;
  }
  return res.status === 0;
}

/** Lance l oracle de solvabilite (sous-processus node) sur le projet. true si exit 0. */
function runSolvabilityGate(project) {
  console.log('[godot_oracle] === solvability_godot.mjs (R9) ===');
  const script = resolve(HERE, 'solvability_godot.mjs');
  const res = spawnSync(
    process.execPath,
    [script, project, SOLVABILITY_SCRIPT, String(SOLVABILITY_TRIALS)],
    { cwd: REPO_ROOT, stdio: 'inherit' }
  );
  if (res.error) {
    console.error(`[godot_oracle] spawn node solvability_godot.mjs impossible : ${res.error.message}`);
    return false;
  }
  return res.status === 0;
}

function main(argv) {
  const project = argv[0];
  if (!project) {
    console.error('Usage: node godot_oracle.mjs <project>');
    process.exit(2);
    return;
  }

  if (!runMechanicalTests(project)) {
    console.error('[godot_oracle] FAIL : run_tests.gd (mecanique)');
    process.exit(1);
    return;
  }
  console.log('[godot_oracle] OK : run_tests.gd (mecanique)');

  if (!runSolvabilityGate(project)) {
    console.error('[godot_oracle] FAIL : solvabilite (R9)');
    process.exit(1);
    return;
  }
  console.log('[godot_oracle] OK : solvabilite (R9)');

  console.log('[godot_oracle] ALL CHECKS PASSED');
  process.exit(0);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main(process.argv.slice(2));
}

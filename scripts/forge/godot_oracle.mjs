#!/usr/bin/env node
// godot_oracle.mjs — Oracle maitre pour un projet Godot de la Forge.
// Enchaine (1) run_tests.gd (mecanique, headless) puis (2) solvability_godot.mjs
// (R9 : un bot doit reellement gagner). Exit 0 SEULEMENT si les DEUX sont
// verts ; sinon exit 1 des le premier rouge (jamais un vert par defaut).
//
// Le binaire Godot est toujours resolu via resolveGodotBin() (Tache 1) —
// jamais un chemin en dur.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveGodotBin } from './godot_bin.mjs';
import {
  DEFAULT_MAX_TICKS,
  DEFAULT_TRIAL_TIMEOUT_MS,
  DEFAULT_SEED_START,
} from './solvability_godot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const ORACLES_CONFIG = resolve(HERE, 'oracles.json');

const TEST_SCRIPT = 'res://tests/run_tests.gd';
const SOLVABILITY_SCRIPT = 'res://solvability.gd';
const SOLVABILITY_TRIALS = 50;

/**
 * Budget de la solvabilite DECLARE PAR JEU (correction 2026-07-28) : une partie
 * gagnante peut prendre bien plus que DEFAULT_MAX_TICKS (200) — mesure sur
 * `snake` : parties gagnantes de 266-417 ticks, faux negatif 0/50 avec le
 * defaut. Lu depuis l'entree `oracles.json` du jeu (cle = basename(project),
 * meme convention que forge/oracle.py::resolve_oracle), champ optionnel
 * `solvability: {max_ticks, trials, trial_timeout_ms}`.
 *
 * Absence totale (fichier illisible, entree manquante, champ manquant) ->
 * REPLI EXACT sur les valeurs historiques (DEFAULT_MAX_TICKS/SOLVABILITY_TRIALS/
 * DEFAULT_TRIAL_TIMEOUT_MS) : comportement INCHANGE pour tout jeu qui ne
 * declare rien (ex. grid_nav_probe) — jamais un chemin d'erreur silencieux qui
 * modifierait un budget par accident.
 */
export function resolveSolvabilityConfig(project, configPath = ORACLES_CONFIG) {
  const key = basename(project);
  let raw;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (e) {
    console.warn(`[godot_oracle] oracles.json illisible (${e.message}) — budget par defaut`);
    raw = null;
  }
  let entry = null;
  if (raw !== null) {
    try {
      const config = JSON.parse(raw);
      entry = config && typeof config === 'object' ? config[key] : null;
    } catch (e) {
      console.warn(`[godot_oracle] oracles.json invalide (${e.message}) — budget par defaut`);
      entry = null;
    }
  }
  const solv = entry && typeof entry === 'object' && entry.solvability &&
    typeof entry.solvability === 'object' ? entry.solvability : {};
  return {
    trials: Number.isFinite(solv.trials) ? solv.trials : SOLVABILITY_TRIALS,
    maxTicks: Number.isFinite(solv.max_ticks) ? solv.max_ticks : DEFAULT_MAX_TICKS,
    trialTimeoutMs: Number.isFinite(solv.trial_timeout_ms)
      ? solv.trial_timeout_ms
      : DEFAULT_TRIAL_TIMEOUT_MS,
    seedStart: DEFAULT_SEED_START,
  };
}

/**
 * Chemin sur disque de res://solvability.gd pour un projet donne (constante
 * SOLVABILITY_SCRIPT, ancree au projet comme dans runSolvabilityGate).
 */
function solvabilityScriptPath(project) {
  return resolve(REPO_ROOT, project, 'solvability.gd');
}

/**
 * Distingue un JEU (a un point d'entree jouable) d'un MODULE BIBLIOTHEQUE
 * (harnais de logique pure, jamais lance) par un critere MECANIQUE et lisible
 * lu directement dans project.godot : `run/main_scene`.
 *
 * Pourquoi ce critere : c'est deja l'invariant du studio pour « ce projet
 * DOIT demarrer » (POINT DUR #5 du charter, ex. games/breakout_v2/project.godot
 * qui commente explicitement `run/main_scene="res://main.tscn"`). Un module
 * bibliotheque (ex. games/grid_nav_probe, games/p5_gridnav) n'a ni scene ni
 * raison d'en avoir une — donc n'a pas de raison d'avoir un bot de
 * solvabilite (R9) non plus : R9 mesure qu'un bot peut GAGNER une PARTIE,
 * et une partie suppose une scene jouable.
 *
 * Defaut fail-safe : project.godot illisible/absent -> traite comme JEU
 * (R9 reste exige). En cas de doute, on n'affaiblit jamais l'invariant R9,
 * on l'assouplit seulement pour un cas mecaniquement prouve « pas un jeu ».
 *
 * (Correction 2026-08-02, campagne P5 : SOLVABILITY_SCRIPT etait exige sans
 * condition, quel que soit le projet -> 3 activations LLM/4 gaspillees sur
 * p5_gridnav, un module de bibliotheque pure, a produire un solvability.gd
 * qui n'avait aucune raison d'etre.)
 */
function hasMainScene(project) {
  const path = resolve(REPO_ROOT, project, 'project.godot');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    console.warn(
      `[godot_oracle] project.godot illisible (${e.message}) — traite comme JEU par defaut ` +
      `(fail-safe : R9 reste exige en cas de doute)`
    );
    return true;
  }
  const match = raw.match(/^\s*run\/main_scene\s*=\s*"([^"]*)"/m);
  return Boolean(match && match[1].length > 0);
}

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
  const { trials, maxTicks, trialTimeoutMs, seedStart } = resolveSolvabilityConfig(project);
  console.log(
    `[godot_oracle] budget solvabilite : trials=${trials} max_ticks=${maxTicks} ` +
    `trial_timeout_ms=${trialTimeoutMs} (declare par jeu, defaut si absent)`
  );
  const res = spawnSync(
    process.execPath,
    [
      script, project, SOLVABILITY_SCRIPT,
      String(trials), String(seedStart), String(maxTicks), String(trialTimeoutMs),
    ],
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

  const scriptExists = existsSync(solvabilityScriptPath(project));
  if (!scriptExists) {
    if (hasMainScene(project)) {
      // JEU sans solvability.gd : R9 est un invariant du studio pour un jeu,
      // ce n'est pas mesurable-donc-ignorable. FAIL, pas un vert par defaut.
      console.error(
        '[godot_oracle] FAIL : solvabilite (R9) — solvability.gd absent et le projet ' +
        'declare run/main_scene (c\'est un JEU) : R9 est obligatoire pour un jeu.'
      );
      process.exit(1);
      return;
    }
    // MODULE BIBLIOTHEQUE (pas de run/main_scene) sans solvability.gd : rien
    // a mesurer (pas de partie a gagner), volet rendu NOT_MEASURED — jamais
    // FAIL pour une absence de preuve qui n'a pas de raison d'exister.
    console.log(
      '[godot_oracle] NOT_MEASURED : solvabilite (R9) — module bibliotheque ' +
      '(project.godot sans run/main_scene), solvability.gd absent, aucun bot ' +
      'de solvabilite requis.'
    );
  } else if (!runSolvabilityGate(project)) {
    console.error('[godot_oracle] FAIL : solvabilite (R9)');
    process.exit(1);
    return;
  } else {
    console.log('[godot_oracle] OK : solvabilite (R9)');
  }

  console.log('[godot_oracle] ALL CHECKS PASSED');
  process.exit(0);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main(process.argv.slice(2));
}

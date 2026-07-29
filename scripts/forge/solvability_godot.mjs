#!/usr/bin/env node
// solvability_godot.mjs — Oracle de solvabilite pour un projet Godot (declinaison
// R9 : « un bot doit reellement gagner » applique aux jeux Godot).
//
// runSolvability(cfg, trialFn) est PURE et testable sans Godot : trialFn(seed)
// est injectee (fake en test, vrai bot Godot en production via makeGodotRunTrial).
//
// Doctrine (« aucune preuve n'est pas une preuve », meme regle que le gate
// mutation quand total==0) :
//   - trials <= 0            -> BLOCKED, jamais OK
//   - une exception d'essai  -> BLOCKED immediat, jamais un vert par defaut
//   - won === trials         -> OK
//   - sinon                  -> FAIL, avec les seeds perdants nommes
//
// Vocabulaire de verdict : OK / FAIL / BLOCKED uniquement.
import { pathToFileURL } from 'node:url';
import { makeGodotRunTrial } from '../../knowledge_base/systems/adapters/godot_trial.mjs';

// Exportes (pas seulement des constantes de module) : godot_oracle.mjs les reuse
// comme valeurs de repli EXPLICITES quand un jeu ne declare pas de budget de
// tick dans scripts/forge/oracles.json (`solvability.max_ticks/trials/trial_timeout_ms`)
// - une seule source de verite pour « le comportement par defaut, si rien n'est
// declare », jamais deux litteraux dupliques qui pourraient diverger.
export const DEFAULT_MAX_TICKS = 200;
export const DEFAULT_TRIAL_TIMEOUT_MS = 10000;
export const DEFAULT_SEED_START = 1;

/**
 * Fait tourner `trials` essais a partir de `seed_start`, en appelant
 * `trialFn(seed) -> {succeeded, ticks}` pour chacun.
 *
 * @param {{trials: number, seed_start?: number}} cfg
 * @param {(seed: number) => {succeeded: boolean, ticks: (number|null)}} trialFn
 * @returns {{trials: number, won: number, lost: number, failed_seeds: number[], verdict: string, reason?: string}}
 */
export function runSolvability(cfg, trialFn) {
  const trials = cfg?.trials;
  const seedStart = cfg?.seed_start ?? DEFAULT_SEED_START;

  if (typeof trials !== 'number' || !Number.isFinite(trials) || trials <= 0) {
    return {
      trials: typeof trials === 'number' ? trials : 0,
      won: 0,
      lost: 0,
      failed_seeds: [],
      verdict: 'BLOCKED',
      reason: "aucune preuve n'est pas une preuve : trials doit etre > 0",
    };
  }

  let won = 0;
  let lost = 0;
  const failed_seeds = [];

  for (let i = 0; i < trials; i++) {
    const seed = seedStart + i;
    let result;
    try {
      result = trialFn(seed);
    } catch (e) {
      return {
        trials,
        won,
        lost,
        failed_seeds,
        verdict: 'BLOCKED',
        reason: `essai seed=${seed} a leve une exception (jamais un vert par defaut) : ${e.message}`,
      };
    }
    if (result && result.succeeded === true) {
      won += 1;
    } else {
      lost += 1;
      failed_seeds.push(seed);
    }
  }

  const verdict = won === trials ? 'OK' : 'FAIL';
  return { trials, won, lost, failed_seeds, verdict };
}

/**
 * Construit un trialFn(seed) qui lance reellement Godot headless sur le
 * projet/script fournis, via l adaptateur godot_trial.mjs (qui resout le
 * binaire via resolveGodotBin() — jamais un chemin en dur).
 */
function buildGodotTrialFn(project, script, { maxTicks, trialTimeoutMs }) {
  const runTrial = makeGodotRunTrial();
  const cfg = {
    godot_project: project,
    godot_script: script,
    trial_timeout_ms: trialTimeoutMs,
    max_ticks: maxTicks,
  };
  return (seed) => runTrial(seed, cfg);
}

function printUsage() {
  console.error(
    'Usage: node solvability_godot.mjs <project> <script> <trials> [seed_start] [max_ticks] [trial_timeout_ms]'
  );
}

function main(argv) {
  const [project, script, trialsArg, seedStartArg, maxTicksArg, timeoutArg] = argv;
  if (!project || !script || !trialsArg) {
    printUsage();
    process.exit(2);
    return;
  }

  const trials = Number(trialsArg);
  const seed_start = seedStartArg !== undefined ? Number(seedStartArg) : DEFAULT_SEED_START;
  const maxTicks = maxTicksArg !== undefined ? Number(maxTicksArg) : DEFAULT_MAX_TICKS;
  const trialTimeoutMs = timeoutArg !== undefined ? Number(timeoutArg) : DEFAULT_TRIAL_TIMEOUT_MS;

  const trialFn = buildGodotTrialFn(project, script, { maxTicks, trialTimeoutMs });
  const result = runSolvability({ trials, seed_start }, trialFn);
  const receipt = { project, ...result };

  console.log(JSON.stringify(receipt, null, 2));
  process.exit(result.verdict === 'OK' ? 0 : 1);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main(process.argv.slice(2));
}

// godot_trial.mjs — ADAPTATEUR : expose la signature runTrial(seed, cfg) attendue par
// role_sim.mjs, en deleguant l execution a Godot headless. role_sim.mjs n est PAS
// modifie : le couplage au moteur vit ici, dans un module de scenario, exactement la
// ou le schema de contrat le prevoit deja (champ simulation_module).
//
// Contrat de sortie du projet Godot : une ligne stdout `FORGE_TRIAL <json>` avec
// {"succeeded": bool, "ticks": number|null}. Exit 0 exige.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGodotBin } from '../../../scripts/forge/godot_bin.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PREFIX = 'FORGE_TRIAL ';
const REQUIRED_CFG = ['godot_project', 'godot_script', 'trial_timeout_ms'];

/**
 * Extrait le recu JSON d une sortie Godot bruitee (banniere moteur, warnings…).
 * @param {string} stdout
 * @returns {{succeeded: boolean, ticks: (number|null)}}
 */
export function parseReceipt(stdout) {
  const lines = String(stdout).split(/\r?\n/).filter((l) => l.startsWith(PREFIX));
  if (lines.length === 0) throw new Error(`aucun recu FORGE_TRIAL dans la sortie Godot`);
  if (lines.length > 1) {
    throw new Error(`${lines.length} recus FORGE_TRIAL trouves dans la sortie Godot (ambigu, 1 attendu)`);
  }
  const line = lines[0];
  let parsed;
  try {
    parsed = JSON.parse(line.slice(PREFIX.length));
  } catch (e) {
    throw new Error(`recu FORGE_TRIAL illisible : ${e.message}`);
  }
  if (typeof parsed.succeeded !== 'boolean') throw new Error('champ succeeded absent ou non booleen');
  if (parsed.ticks !== null && typeof parsed.ticks !== 'number') throw new Error('champ ticks doit etre number ou null');
  return { succeeded: parsed.succeeded, ticks: parsed.ticks };
}

/**
 * Fabrique un runTrial. Les dependances sont injectables pour rendre l adaptateur
 * testable sans lancer Godot (tests unitaires) tout en restant reel en production.
 * @param {Function} [spawnFn] signature (bin, args, opts) -> {status, stdout, stderr}
 * @param {Function} [binResolver]
 */
export function makeGodotRunTrial(spawnFn, binResolver) {
  const doSpawn = spawnFn ?? ((bin, args, opts) => spawnSync(bin, args, opts));
  const getBin = binResolver ?? resolveGodotBin;

  return function runTrial(seed, cfg) {
    for (const k of REQUIRED_CFG) {
      if (cfg == null || cfg[k] === undefined) {
        throw new Error(`simulation_config incomplet : champ '${k}' requis par godot_trial`);
      }
    }
    if (typeof cfg.trial_timeout_ms !== 'number' || !Number.isFinite(cfg.trial_timeout_ms) || cfg.trial_timeout_ms <= 0) {
      throw new Error(`simulation_config invalide : champ 'trial_timeout_ms' doit etre un nombre fini strictement positif`);
    }
    const bin = getBin();
    const args = [
      '--headless',
      '--path', resolve(REPO_ROOT, cfg.godot_project),
      '--script', cfg.godot_script,
      '--',
      `--seed=${seed}`,
      `--max_ticks=${cfg.max_ticks ?? 0}`,
    ];
    const res = doSpawn(bin, args, {
      encoding: 'utf-8',
      timeout: cfg.trial_timeout_ms,
      windowsHide: true,
    });
    if (res.error) throw new Error(`spawn Godot impossible : ${res.error.message}`);
    if (res.status !== 0) {
      throw new Error(`Godot exit ${res.status} (seed=${seed})\nstderr: ${res.stderr}\nstdout: ${res.stdout}`);
    }
    return parseReceipt(res.stdout);
  };
}

export const runTrial = makeGodotRunTrial();

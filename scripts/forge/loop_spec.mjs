#!/usr/bin/env node
// loop_spec.mjs — dérivation DÉTERMINISTE de `loop.json` depuis `prisme.json`.
//
// VERROU ABSOLU (GO Pierre 2026-08-22) : `loop.json` est une PROJECTION du
// Prisme, jamais une source de vérité. `deriveLoopSpec` est une fonction PURE —
// même entrée -> même sortie, JAMAIS `Date.now()`, JAMAIS `Math.random()` —
// écrite par l'EXÉCUTEUR (run_real.py), aucun LLM ne l'écrit. Si la sortie d'un
// agent s1 contient un bloc ```json``` nommé `loop` ou un fichier `loop.json`,
// il est IGNORÉ.
//
// Usage :
//   node loop_spec.mjs <prisme.json> [--json]
// Exit 0 = boucle complète (checkLoopSpec OK) · 1 = boucle incomplète (FAIL,
// mesure du diagnostic) · 2 = usage / fichier illisible.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Séquence imposée (Pierre) — 7 rôles de boucle, NONE exclu (hors boucle par
// définition). Ordre de tri des steps : ordre des rôles, puis ordre des ids.
export const ROLE_ORDER = [
  'PLAYER_GOAL', 'PLAYER_ACTION', 'GAME_RESPONSE', 'REWARD',
  'UNLOCK', 'NEXT_GOAL', 'META_LOOP',
];

const ACTION_ROLES = new Set(['PLAYER_ACTION', 'UNLOCK', 'META_LOOP']);
const GOAL_ROLES = new Set(['PLAYER_GOAL', 'NEXT_GOAL']);

/**
 * Dérive `loop.json` depuis un `prisme.json` déjà parsé. PURE : aucune horloge,
 * aucun aléa, aucun effet de bord. Steps = exigences dont `loop_role` est un des
 * 7 rôles de ROLE_ORDER (NONE et absent sont exclus), triées par ordre de rôle
 * puis par `id` (tri stable : à id égal ou absent, l'ordre d'apparition dans
 * `exigences` est conservé).
 * @param {unknown} prisme
 * @returns {{schema_version:1, game_id:string, steps:object[]}}
 */
export function deriveLoopSpec(prisme) {
  const gameId = typeof prisme?.game_id === 'string' ? prisme.game_id : '';
  const exigences = Array.isArray(prisme?.exigences) ? prisme.exigences : [];

  const candidats = [];
  exigences.forEach((ex, idx) => {
    if (ex && typeof ex === 'object' && ROLE_ORDER.includes(ex.loop_role)) {
      candidats.push({ ex, idx });
    }
  });

  candidats.sort((a, b) => {
    const ra = ROLE_ORDER.indexOf(a.ex.loop_role);
    const rb = ROLE_ORDER.indexOf(b.ex.loop_role);
    if (ra !== rb) return ra - rb;
    const ida = typeof a.ex.id === 'string' ? a.ex.id : '';
    const idb = typeof b.ex.id === 'string' ? b.ex.id : '';
    if (ida !== idb) return ida < idb ? -1 : 1;
    return a.idx - b.idx; // tri stable ultime (ids egaux ou absents)
  });

  const steps = candidats.map(({ ex }) => {
    const step = {
      role: ex.loop_role,
      ref: typeof ex.id === 'string' ? ex.id : '',
    };
    if (typeof ex.affordance === 'string' && ex.affordance.trim().length > 0) {
      step.affordance = ex.affordance;
    }
    step.repeat = Number.isInteger(ex.repeat) && ex.repeat >= 1 ? ex.repeat : 1;
    if (ex.observe !== null && typeof ex.observe === 'object' && !Array.isArray(ex.observe)) {
      const observe = {};
      if (typeof ex.observe.hud === 'string' && ex.observe.hud.trim().length > 0) {
        observe.hud = ex.observe.hud;
      }
      if (typeof ex.observe.predicate === 'string' && ex.observe.predicate.trim().length > 0) {
        observe.predicate = ex.observe.predicate;
      }
      if (Object.keys(observe).length > 0) step.observe = observe;
      if (Number.isInteger(ex.observe.wait_frames)) step.wait_frames = ex.observe.wait_frames;
    }
    return step;
  });

  return { schema_version: 1, game_id: gameId, steps };
}

/**
 * Vérifie la COMPLÉTUDE d'une boucle dérivée : les 7 rôles présents >= 1 fois,
 * chaque PLAYER_ACTION/UNLOCK/META_LOOP porte `affordance` + `observe`, chaque
 * PLAYER_GOAL/NEXT_GOAL porte `observe.hud`. C'est ICI, et pas dans
 * `validateExigence`, que la complétude de la boucle est exigée (rétro-
 * compatibilité des runs passés — cf. upstream_schema.mjs).
 * @param {unknown} spec sortie de deriveLoopSpec
 * @returns {{ok:boolean, verdict:'OK'|'FAIL', problems:string[]}}
 */
export function checkLoopSpec(spec) {
  const problems = [];
  const steps = Array.isArray(spec?.steps) ? spec.steps : [];

  for (const role of ROLE_ORDER) {
    if (!steps.some((s) => s && s.role === role)) {
      problems.push(`role manquant: ${role} (0 exigence loop_role='${role}')`);
    }
  }

  steps.forEach((s, i) => {
    if (!s || typeof s !== 'object') {
      problems.push(`steps[${i}]: doit etre un objet`);
      return;
    }
    const loc = `steps[${i}] (${s.ref || '?'}, role=${s.role})`;
    if (ACTION_ROLES.has(s.role)) {
      if (typeof s.affordance !== 'string' || s.affordance.trim().length === 0) {
        problems.push(`${loc}: affordance absente ou vide (obligatoire pour ${s.role})`);
      }
      if (s.observe === undefined || typeof s.observe !== 'object' || s.observe === null) {
        problems.push(`${loc}: observe absent (obligatoire pour ${s.role})`);
      }
    }
    if (GOAL_ROLES.has(s.role)) {
      if (!s.observe || typeof s.observe.hud !== 'string' || s.observe.hud.trim().length === 0) {
        problems.push(`${loc}: observe.hud absent ou vide (obligatoire pour ${s.role})`);
      }
    }
  });

  const ok = problems.length === 0;
  return { ok, verdict: ok ? 'OK' : 'FAIL', problems };
}

// ---- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const jsonFlag = argv.includes('--json');
  const target = argv.find((a) => a !== '--json');

  if (!target) {
    console.error('usage: node loop_spec.mjs <prisme.json> [--json]');
    process.exit(2);
  }

  let prisme;
  try {
    prisme = JSON.parse(readFileSync(target, 'utf-8'));
  } catch (err) {
    console.error(`loop_spec: ${target}: absent, illisible ou JSON invalide (${err.message})`);
    process.exit(2);
  }

  const spec = deriveLoopSpec(prisme);
  const check = checkLoopSpec(spec);

  if (jsonFlag) {
    process.stdout.write(JSON.stringify({ spec, check }));
  } else {
    console.log(`VERDICT LOOP_SPEC: ${check.verdict}`);
    check.problems.forEach((p) => console.error(`  FAIL: ${p}`));
    console.log(`  steps derives: ${spec.steps.length}`);
    console.log(JSON.stringify({ spec, check }, null, 2));
  }
  process.exit(check.ok ? 0 : 1);
}

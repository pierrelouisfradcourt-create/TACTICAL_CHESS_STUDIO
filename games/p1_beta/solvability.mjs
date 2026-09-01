#!/usr/bin/env node
// solvability.mjs — oracle de solvabilité : un bot doit atteindre réellement
// l'Embrasement (light >= 5000). Mesure l'enveloppe d'action réelle, vérifie
// que le seuil terminal est atteignable, cherche un plan gagnant.

import { GameState, TERMINAL_THRESHOLD, EMITTER_BASE_COST } from './engine.mjs';

const MAX_TICKS = 8000; // budget fixe — mesuré empiriquement : param=1 gagne en ~2454 ticks

function measureEnvelope(seed = 1) {
  const state = new GameState(seed);
  // 100 steps avec la politique la plus agressive pour mesurer l'enveloppe
  // d'action réelle (gain de lumiere atteignable par tick).
  for (let i = 0; i < 100; i++) {
    state.step(1);
  }
  return {
    lightAfter100: state.light,
    emittersAfter100: state.emitterCount,
    baseEmitterCost: EMITTER_BASE_COST,
    threshold: TERMINAL_THRESHOLD,
  };
}

function playWithPolicy(seed, policyParam) {
  const state = new GameState(seed);
  let terminal = false;

  for (let t = 0; t < MAX_TICKS && !terminal; t++) {
    state.step(policyParam);
    terminal = state.isTerminal();
  }

  return { terminal, light: state.light, ticks: state.frameCount, emitters: state.emitterCount };
}

// Cadences de clic balayées. Hissée en constante pour que le RÉSUMÉ MACHINE
// puisse rapporter combien d'essais ont réellement été joués (`tried`) sans
// dupliquer la liste — un compte inventé serait une mesure fausse.
const POLICY_PARAMS = [1, 2, 3, 5, 8, 13];

function searchWinningPlan(seed) {
  let best = { terminal: false, light: -1, param: -1 };
  let tried = 0;

  // Balaye des cadences de clic de plus en plus lâches — le studio exige un
  // VRAI plan qui gagne, pas juste le meilleur essai.
  for (const param of POLICY_PARAMS) {
    const result = playWithPolicy(seed, param);
    tried += 1;
    if (result.light > best.light) {
      best = { ...result, param };
    }
    // `solvable` est TOUJOURS lu sur la partie réellement jouée
    // (`result.terminal` / `best.terminal`), jamais écrit en littéral : aucune
    // branche de ce fichier ne peut affirmer OUI sans qu'un bot ait atteint
    // l'Embrasement. Garde mécanique : check_harness_no_hardcoded_flags.
    if (result.terminal) {
      return { solvable: result.terminal, best: { ...result, param }, tried };
    }
  }

  return { solvable: best.terminal, best, tried };
}

// Prefixe du RESUME MACHINE, convention `oracle._SUMMARY_PREFIX` (scripts/forge/
// oracle.py:57) : un prefixe, un JSON, UNE ligne — extractible d'un flux bruite.
// `run_oracle` le releve dans stdout et `driver.py:3248` le range en
// `detail["oracle_measures"]`, qui est SIGNE. Le tuyau existait deja et ne servait
// qu'a `godot_oracle.mjs` ; ce jeu ne l'alimentait pas, donc sa solvabilite REELLE
// mourait dans `evidence/*.log`, exclu par `.gitignore:81`. Aucune modification de
// la Forge n'est necessaire : seul l'emetteur manquait.
const SUMMARY_PREFIX = 'FORGE_ORACLE_SUMMARY ';

/** Emet le resume machine. TOUJOURS appele, meme quand il n'y a pas de plan :
 *  `solvabilite: null` est une INFORMATION, une ligne absente serait
 *  indistinguable d'un oracle qui n'a pas tourne (NOT_MEASURED != FAIL).
 *  `mecanique: null` parce que CE fichier ne mesure pas la mecanique — la
 *  declarer vraie serait affirmer ce qu'on n'a pas observe. */
function emitSummary(solvabilite) {
  console.log(SUMMARY_PREFIX + JSON.stringify({
    mecanique: null,
    solvabilite: solvabilite ?? null,
  }));
}

function main() {
  const seed = 1;
  console.log('=== ORACLE DE SOLVABILITÉ — p1_beta ===\n');

  const env = measureEnvelope(seed);
  console.log('Enveloppe d\'action réelle (100 ticks, politique agressive):');
  console.log(`  - Lumiere après 100 ticks: ${env.lightAfter100.toFixed(2)}`);
  console.log(`  - Émetteurs après 100 ticks: ${env.emittersAfter100}`);
  console.log(`  - Coût du premier émetteur: ${env.baseEmitterCost}`);
  console.log(`  - Seuil terminal: ${env.threshold}\n`);

  if (env.lightAfter100 <= 0) {
    console.log('✗ Aucune progression mesurée sur 100 ticks — objectif hors d\'atteinte structurellement.');
    // Aucun essai joue : `trials: 0` et `won: 0` disent exactement cela. Le
    // resume part AVANT la sortie, sinon ce cas — le plus grave — serait le
    // seul a ne rien remonter.
    emitSummary({
      project: 'p1_beta', verdict: 'INJOUABLE', solvable: false, deterministic: null,
      trials: 0, won: 0, lost: 0,
      ticks_to_win: null, tick_budget: MAX_TICKS, margin_ratio: null,
      light_final: env.lightAfter100, threshold: env.threshold,
      reason: 'aucune progression mesuree sur 100 ticks',
    });
    process.exit(1);
  }

  const plan = searchWinningPlan(seed);
  console.log('Recherche de plan gagnant:');
  console.log(`  Plan trouvé: ${plan.solvable ? 'OUI' : 'NON'}`);
  if (plan.solvable) {
    console.log(`  Param gagnant: ${plan.best.param}`);
    console.log(`  Ticks jusqu'à l'Embrasement: ${plan.best.ticks} (budget ${MAX_TICKS})`);
    console.log(`  Lumiere finale: ${plan.best.light.toFixed(2)}`);
    console.log(`  Émetteurs finaux: ${plan.best.emitters}`);
  } else {
    console.log(`  Meilleure lumiere atteinte: ${plan.best.light.toFixed(2)} / ${TERMINAL_THRESHOLD}`);
  }

  // Rejeu déterministe : même seed => même tick d'embrasement (gb_terminal_rule).
  const replay = playWithPolicy(seed, plan.best.param >= 0 ? plan.best.param : 1);
  const deterministic = plan.solvable
    ? (replay.terminal && replay.ticks === plan.best.ticks)
    : true;
  console.log(`\nRejeu déterministe (même seed => même tick): ${deterministic ? 'CONFIRMÉ' : 'ÉCART'}`);

  const ok = plan.solvable && deterministic;
  console.log(`\nVERDICT SOLVABILITÉ: ${ok ? 'SOLVABLE' : 'INJOUABLE'}`);

  // MESURE, pas booleen. `margin_ratio` est le signal que le `passed: true`
  // historique ne portait pas : a quelle distance du budget le bot gagne. Tous
  // les champs sont LUS sur la partie reellement jouee (`plan.best`, `replay`),
  // jamais ecrits en litteral — meme discipline que `solvable` ci-dessus.
  emitSummary({
    project: 'p1_beta',
    verdict: ok ? 'SOLVABLE' : 'INJOUABLE',
    solvable: plan.solvable,
    deterministic,
    trials: plan.tried,
    won: plan.solvable ? 1 : 0,
    lost: plan.tried - (plan.solvable ? 1 : 0),
    ticks_to_win: plan.solvable ? plan.best.ticks : null,
    tick_budget: MAX_TICKS,
    margin_ratio: plan.solvable ? plan.best.ticks / MAX_TICKS : null,
    light_final: plan.best.light,
    threshold: TERMINAL_THRESHOLD,
    winning_param: plan.solvable ? plan.best.param : null,
  });

  process.exit(ok ? 0 : 1);
}

main();

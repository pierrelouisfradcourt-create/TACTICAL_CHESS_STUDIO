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

function searchWinningPlan(seed) {
  let best = { terminal: false, light: -1, param: -1 };

  // Balaye des cadences de clic de plus en plus lâches — le studio exige un
  // VRAI plan qui gagne, pas juste le meilleur essai.
  for (const param of [1, 2, 3, 5, 8, 13]) {
    const result = playWithPolicy(seed, param);
    if (result.light > best.light) {
      best = { ...result, param };
    }
    // `solvable` est TOUJOURS lu sur la partie réellement jouée
    // (`result.terminal` / `best.terminal`), jamais écrit en littéral : aucune
    // branche de ce fichier ne peut affirmer OUI sans qu'un bot ait atteint
    // l'Embrasement. Garde mécanique : check_harness_no_hardcoded_flags.
    if (result.terminal) {
      return { solvable: result.terminal, best: { ...result, param } };
    }
  }

  return { solvable: best.terminal, best };
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

  process.exit(ok ? 0 : 1);
}

main();

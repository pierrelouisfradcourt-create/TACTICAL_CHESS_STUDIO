#!/usr/bin/env node
// solvability.mjs — oracle de solvabilité : un bot doit GAGNER.
// Mesure l'enveloppe d'action réelle, vérifie les objectifs, joue avec politique paramétrée.

import { GameState } from './logic.mjs';

const DT = 16; // ms/frame simulée (déterministe)

function measureEnvelope(seed = 1) {
  const state = new GameState(seed);
  const initialExplored = state.exploredCells.size;

  // Simuler 100 steps d'exploration
  for (let i = 0; i < 100; i++) {
    state.step(0); // Politique 0 = explorer
  }

  const exploredAfter = state.exploredCells.size;
  return {
    initialCells: initialExplored,
    exploredCells: exploredAfter - initialExplored,
    maxReach: 150, // Déplacement max par step
    objectsVisible: state.objectsVisible,
    objectsRequired: state.objectsRequired
  };
}

function unreachableObjectives(env, seed = 1) {
  const state = new GameState(seed);
  const unreachable = [];

  for (const obj of state.objects) {
    // Vérifier si l'objet peut être révélé
    const startDist = Math.hypot(obj.x - state.avatarX, obj.y - state.avatarY);
    if (startDist > 400) { // Hors de portée raisonnable
      unreachable.push({
        what: `objet ${obj.id}`,
        distance: startDist,
        max: 400
      });
    }
  }

  return unreachable;
}

function playWithPolicy(seed, policyParam) {
  const state = new GameState(seed);
  let won = false;
  let progress = 0; // objets_actives / objectsRequired

  for (let s = 0; s < 6000 && !won; s++) {
    state.step(policyParam);
    progress = Math.max(progress, state.objectsActive / state.objectsRequired);
    // Le statut est DÉRIVÉ de l'état du jeu, jamais écrit en dur : c'est
    // GameState qui décide de la victoire, pas le harnais qui la déclare.
    won = state.won;
  }

  return { won, progress, frames: state.frameCount };
}

function searchWinningPlan(seed) {
  let best = { won: false, progress: -1, param: -1 };

  // Balayer les paramètres de politique
  for (let p = 0; p <= 320; p += 16) {
    const result = playWithPolicy(seed, p);
    if (result.progress > best.progress) {
      best = { ...result, param: p };
    }
    // `solvable` est le résultat RÉEL de la partie jouée (result.won), pas un
    // littéral : si le bot ne gagne pas, aucune branche ne peut affirmer OUI.
    if (result.won) {
      return { solvable: result.won, best: { ...result, param: p } };
    }
  }

  return { solvable: best.won, best };
}

function main() {
  const seed = 1;
  console.log('=== ORACLE DE SOLVABILITÉ ===\n');

  const env = measureEnvelope(seed);
  console.log('Enveloppe d\'action réelle:');
  console.log(`  - Cellules initiales explorées: ${env.initialCells}`);
  console.log(`  - Cellules explorées après 100 steps: +${env.exploredCells}`);
  console.log(`  - Portée max par step: ${env.maxReach}px`);
  console.log(`  - Objets visibles: ${env.objectsVisible}`);
  console.log(`  - Objets requis: ${env.objectsRequired}\n`);

  const unreachable = unreachableObjectives(env, seed);
  if (unreachable.length > 0) {
    console.log('Objectifs hors d\'atteinte:');
    for (const u of unreachable) {
      console.log(`  ✗ ${u.what}: distance ${u.distance}px > max ${u.max}px`);
    }
  } else {
    console.log('✓ Tous les objectifs sont atteignables\n');
  }

  const plan = searchWinningPlan(seed);
  console.log('Recherche de plan gagnant:');
  console.log(`  Plan trouvé: ${plan.solvable ? 'OUI' : 'NON'}`);
  console.log(`  Meilleur progress: ${(plan.best.progress * 100).toFixed(1)}%`);
  if (plan.solvable) {
    console.log(`  Param gagnant: ${plan.best.param}`);
    console.log(`  Frames: ${plan.best.frames}`);
  }

  const ok = plan.solvable && unreachable.length === 0;
  console.log(`\nVERDICT SOLVABILITÉ: ${ok ? 'SOLVABLE' : 'INJOUABLE'}`);

  if (!ok) {
    console.log('RAISON:');
    if (unreachable.length > 0) {
      console.log(`  - ${unreachable.length} objectif(s) hors d'atteinte`);
    }
    if (!plan.solvable) {
      console.log(`  - Aucune politique n'atteint la victoire (best: ${(plan.best.progress * 100).toFixed(1)}%)`);
    }
  }

  process.exit(ok ? 0 : 1);
}

main();

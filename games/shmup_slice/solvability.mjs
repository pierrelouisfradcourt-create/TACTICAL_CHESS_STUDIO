// Oracle de SOLVABILITÉ — Shmup Slice peut-il être GAGNÉ en jouant ?
//
// Les logic/properties tests vérifient des MÉCANIQUES en isolation. Ils ne
// prouvent jamais qu'un joueur peut GAGNER en jouant. Cet oracle joue vraiment,
// via l'API PUBLIQUE (createInitialState + step) — jamais via __game_debug, qui
// n'existe même pas ici (c'est un hook navigateur, cf. AI-5).
//
// Portée : le scope final du jeu est TOUJOURS 3 maps + 3 boss (le charter est
// explicite : « le jalon n'est qu'un ordre de construction », pas un allégement
// de la preuve). Cet oracle exige donc SYSTÉMATIQUEMENT que le bot termine le
// run ENTIER — aucune réduction Jalon A.
import { runBot } from './bot/solver.mjs';
import { createInitialState } from './logic/state.mjs';
import { hasSafeCorridor } from './logic/dodge.mjs';

const SEEDS = [1, 2, 3, 4, 5];

function main() {
  console.log('=== ORACLE DE SOLVABILITÉ — Shmup Slice ===\n');

  // --- Test 1 : le run RÉEL, sur plusieurs seeds, doit être gagné de bout en
  // bout (3 maps + 3 boss) ET n'avoir traversé aucune frame sans couloir sûr
  // (R23 — « aucune frame de mort inévitable »).
  console.log(`--- Test 1 : run complet (3 maps + 3 boss), seeds ${SEEDS.join(', ')} ---`);
  let allWon = true;
  for (const seed of SEEDS) {
    const r = runBot(seed);
    const ok = r.won && r.finalLevel === 3 && r.corridorAlwaysSafe;
    console.log(
      `  seed=${seed} : won=${r.won} level=${r.finalLevel} lives=${r.finalLives} score=${r.finalScore} `
      + `steps=${r.steps} corridorAlwaysSafe=${r.corridorAlwaysSafe} (violations=${r.corridorViolations}/${r.framesWithThreat}) `
      + `-> ${ok ? 'PASS' : 'FAIL'}`
    );
    if (!ok) allWon = false;
  }
  if (!allWon) {
    console.log('\nFAIL : au moins une seed n\'a pas terminé le run entier, ou a traversé une frame sans couloir sûr.');
    console.log('RESULT: FAIL');
    process.exit(1);
  }
  console.log('✓ PASS : le bot termine les 3 maps + 3 boss sur toutes les seeds testées, esquivabilité prouvée partout.');

  // --- Test 2 : sonde de contrôle — un scénario RÉELLEMENT injouable doit être
  // détecté comme tel. Contrairement à un placeholder qui renverrait un objet
  // {won:false} fabriqué à la main, cette sonde exécute le VRAI code de
  // production (hasSafeCorridor, sur un vrai état de jeu) contre un mur de
  // projectiles qui couvre toute la largeur de l'écran : aucun couloir ne peut
  // mathématiquement exister. Si l'oracle répondait "sûr" ici, l'esquivabilité
  // ne prouverait rien.
  console.log('\n--- Test 2 : sonde de contrôle — mur de projectiles, aucun couloir possible ---');
  const broken = createInitialState();
  broken.enemyProjectiles = [];
  for (let x = -30; x <= 830; x += 12) {
    broken.enemyProjectiles.push({ x, y: broken.ship.y, vx: 0, vy: 0 });
  }
  const brokenSaysSafe = hasSafeCorridor(broken);
  console.log(`  hasSafeCorridor(mur complet) = ${brokenSaysSafe} (attendu: false)`);
  if (brokenSaysSafe) {
    console.log('FAIL : la sonde de contrôle aurait dû être INJOUABLE — l\'oracle d\'esquivabilité ne détecte rien.');
    console.log('RESULT: FAIL');
    process.exit(1);
  }
  console.log('✓ PASS : la sonde de contrôle est correctement détectée INJOUABLE.');

  console.log('\n=== SOLVABILITY: OK ===');
  console.log('RESULT: PASS');
  process.exit(0);
}

main();

// Oracle de SOLVABILITÉ (R20) — Breakout peut-il être GAGNÉ en jouant, pour de vrai ?
// RÉÉCRIT le 2026-07-13 (go Pierre : "corrige l'arbitre pour qu'il colle aux deux
// branches") — l'ancienne version pilotait `g.applyInput()`/`g.view()`/`g.levelIndex`,
// aucune méthode/champ existant sur control/game.mjs NI variant/game.mjs (confirmé :
// crash identique `g.applyInput is not a function` sur les deux, WFL-01/results.md §3).
//
// Cette version pilote UNIQUEMENT le contrat public réel des deux branches :
// `game.step(dtMs, input)`, `game.status` ('playing' en jeu — IDENTIQUE dans les deux
// branches ; le libellé de fin diffère et est normalisé ci-dessous), `game.paddle`,
// `game.ball`, `game.bricks[]{alive, destructible}`, `game.score`. Le bot pilote la
// raquette EXCLUSIVEMENT via l'objet input passé à step() — jamais de forçage d'état
// (charter, action interdite).
import { BreakoutGame } from "./game.mjs";
import { pathToFileURL } from "node:url";

const DT_MS = 16; // ~60 Hz, en ms — accepté tel quel par les deux branches
const MAX_STEPS = 60000;
const WIN_STATUSES = new Set(["win", "won"]);

function isWin(status) {
  return WIN_STATUSES.has(status);
}

function aliveDestructibleCount(game) {
  let n = 0;
  for (const brick of game.bricks) {
    if (brick.destructible && brick.alive !== false) n += 1;
  }
  return n;
}

/**
 * Bot déterministe : suit la balle en X avec la raquette, via l'API d'entrée
 * publique uniquement (R20 — interdiction de forcer l'état à la main).
 * @param {number|string} seed
 * @returns {{won:boolean, steps:number, finalStatus:string, score:number, level:number, bricksRemaining:number}}
 */
export function runBot(seed) {
  const g = new BreakoutGame({ seed });
  let steps = 0;

  while (steps < MAX_STEPS && g.status === "playing") {
    steps += 1;

    const paddleCenter = g.paddle.x + g.paddle.width / 2;
    const ballDescending = g.ball.vy > 0;
    const tolerance = ballDescending ? 10 : 40;

    const input = { left: false, right: false };
    if (g.ball.x < paddleCenter - tolerance) {
      input.left = true;
    } else if (g.ball.x > paddleCenter + tolerance) {
      input.right = true;
    }

    g.step(DT_MS, input);
  }

  return {
    won: isWin(g.status),
    steps,
    finalStatus: g.status,
    score: g.score,
    level: g.level,
    bricksRemaining: aliveDestructibleCount(g),
  };
}

function main() {
  const seed = 1;
  console.log("=== ORACLE DE SOLVABILITÉ — Breakout (WFL-01) ===\n");

  const probe = new BreakoutGame({ seed });
  const startingBricks = aliveDestructibleCount(probe);
  console.log(`Niveau 0 (seed=${seed}) : ${startingBricks} briques cassables au départ.\n`);

  console.log("Lancement du bot joueur (suit la balle, pilote via step(dtMs, input))...");
  const result = runBot(seed);
  console.log(
    `Bot : ${result.steps} steps, status=${result.finalStatus}, score=${result.score}, ` +
      `level=${result.level}, briques cassables restantes=${result.bricksRemaining}\n`
  );

  if (result.won) {
    console.log("✓ BOT A GAGNÉ — jeu SOLVABLE (victoire réelle, via l'API d'entrée publique)");
    console.log("RESULT: PASS");
    process.exit(0);
  } else {
    console.log(`✗ BOT N'A PAS GAGNÉ — status final=${result.finalStatus}`);
    console.log("RESULT: FAIL");
    process.exit(1);
  }
}

// N'exécute main() que si ce fichier est appelé directement (Windows-safe : pathToFileURL,
// leçon F-T2 — cf. games/breakout/solvability.mjs:127 et fixtures/p1/*).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

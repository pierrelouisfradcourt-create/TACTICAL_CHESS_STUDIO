// PHASE A — Vérification statique §4 du protocole E2 v2 (P1.2a).
// Simulation déterministe du MOTEUR PUR (BreakoutGame headless, importé directement).
// Ce n'est PAS le capteur : aucun navigateur, aucun rapport, aucun outcome.
//
// Question : le candidat E2-SA-D′ (briques en colonne extrême) donne-t-il score = 0
// sur toute la fenêtre [0 ; t_pre_max + 40 × cadence_max ≈ 14 s], sous la séquence
// d'inputs seedée du capteur mappée aux DEUX bornes du modèle temporel, ET sous
// politique sans-input ? (B2 étant absolu, le score doit rester 0 dès t=0.)
//
// Générateur d'inputs : le VRAI makeInputSequence du capteur (sensor.mjs), seed 1234,
// 40 tokens, alphabet [ArrowLeft, ArrowRight] — identique CONFIGS collect.mjs.
// Jeu : seed 888 (urlPath "/?seed=888" des CONFIGS capteur).
import { pathToFileURL } from "node:url";

const REPO = "C:/TACTICAL_CHESS_STUDIO";
const HERE = new URL(".", import.meta.url);

const { makeInputSequence } = await import(
  pathToFileURL(`${REPO}/scripts/quality_sensor/sensor.mjs`).href
);
const pristine = await import(pathToFileURL(`${REPO}/games/breakout/game.mjs`).href);
const candidate = await import(new URL("candidate/game.mjs", HERE).href);

const DT = 16;               // ms/frame (moteur : applyInput suppose 16 ms)
const HOLD_MS = 120;         // holdMs des CONFIGS capteur
const STEPS = 40;            // steps des CONFIGS capteur
const INPUT_SEED = 1234;     // seed des CONFIGS capteur
const GAME_SEED = 888;       // ?seed=888 des CONFIGS capteur
const WINDOW_MS = 14000;     // t_pre_max (4 s) + 40 × cadence_max (250 ms) = 14 s
const FRAMES = Math.ceil(WINDOW_MS / DT); // 875

const seq = makeInputSequence(INPUT_SEED, STEPS, ["ArrowLeft", "ArrowRight"]);

// Politiques : deux bornes du modèle temporel §3.1 + sans-input
const POLICIES = [
  { name: "bound_min (t_pre=2.0s, cadence=150ms)", tPreMs: 2000, cadenceMs: 150 },
  { name: "bound_max (t_pre=4.0s, cadence=250ms)", tPreMs: 4000, cadenceMs: 250 },
  { name: "no_input", tPreMs: null, cadenceMs: null },
];

// input actif à la frame f si un appui [t_press, t_press+HOLD_MS) couvre f*DT
function inputAtFrame(policy, frameMs) {
  if (policy.tPreMs === null) return {};
  for (let i = 0; i < STEPS; i++) {
    const t = policy.tPreMs + i * policy.cadenceMs;
    if (frameMs >= t && frameMs < t + HOLD_MS) {
      return seq.tokens[i] === "ArrowLeft" ? { left: true } : { right: true };
    }
  }
  return {};
}

function simulate(GameClass, policy, gameSeed) {
  const game = new GameClass({ seed: gameSeed });
  let firstScoreFrame = null;
  let livesLost = 0;
  let prevLives = game.lives;
  for (let f = 0; f < FRAMES; f++) {
    game.step(DT, inputAtFrame(policy, f * DT));
    const d = game.readDebug();
    if (firstScoreFrame === null && d.score > 0) firstScoreFrame = f;
    if (d.lives < prevLives) { livesLost++; prevLives = d.lives; }
    if (d.status !== "ACTIVE") break;
  }
  const d = game.readDebug();
  return {
    firstScoreMs: firstScoreFrame === null ? null : firstScoreFrame * DT,
    endScore: d.score, endStatus: d.status, livesLost,
    bricksRemaining: d.brickCount,
  };
}

console.log(`Séquence capteur seed=${INPUT_SEED} : ${seq.tokens.length} tokens, ` +
  `L=${seq.tokens.filter(t => t === "ArrowLeft").length} / R=${seq.tokens.filter(t => t === "ArrowRight").length}`);
console.log(`Fenêtre : ${WINDOW_MS} ms (${FRAMES} frames à ${DT} ms) · jeu seed=${GAME_SEED}\n`);

let candidateClean = true;
for (const [label, mod] of [["PRISTINE (contrôle cohérence)", pristine], ["CANDIDAT E2-SA-D′ (colonne extrême gauche)", candidate]]) {
  console.log(`=== ${label} ===`);
  const level = new mod.BreakoutGame({ seed: GAME_SEED }).view().bricks;
  console.log(`  niveau 0 : ${level.length} briques (${level.filter(b => b.breakable).length} cassables), ` +
    `x ∈ [${Math.min(...level.map(b => b.x))}, ${Math.max(...level.map(b => b.x + b.width))}]`);
  for (const policy of POLICIES) {
    const r = simulate(mod.BreakoutGame, policy, GAME_SEED);
    const scoreInWindow = r.firstScoreMs !== null;
    console.log(`  ${policy.name}: firstScore=${r.firstScoreMs === null ? "JAMAIS (null)" : r.firstScoreMs + " ms"}, ` +
      `endScore=${r.endScore}, status=${r.endStatus}, viesPerdues=${r.livesLost}`);
    if (label.startsWith("CANDIDAT") && scoreInWindow) candidateClean = false;
  }
  console.log();
}

console.log(candidateClean
  ? "VERDICT SIMULATION : candidat score=0 sur toute la fenêtre sous les 3 politiques — mâchoire B échappée"
  : "VERDICT SIMULATION : candidat MARQUE dans la fenêtre — candidat ÉCHOUE (redesign ou ANNULATION)");
process.exit(candidateClean ? 0 : 1);

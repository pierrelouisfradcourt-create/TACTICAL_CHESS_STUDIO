// Oracle de SOLVABILITÉ — le chaînon manquant : les logic tests vérifient des MÉCANIQUES
// en isolation (l'ennemi se rapproche SI on ne bouge pas). Ils ne prouvent JAMAIS qu'un
// joueur peut GAGNER en jouant. Cet oracle joue vraiment, dans les deux sens :
//   1. un bot de FUITE (s'éloigne de l'ennemi, glisse le long des murs) doit GAGNER
//      (survivre 30s) — prouve que la victoire est ATTEIGNABLE.
//   2. un bot IMMOBILE doit PERDRE avant 30s — prouve que la défaite est ATTEIGNABLE
//      (un jeu où on ne peut jamais perdre n'a aucun enjeu, même s'il "passe" tous les
//      tests de mécanique).
import { ChasePrototypeGame } from "./game.mjs";

const DT = 16; // ms/frame simulée
const MAX_TICKS = 3000; // 3000 * 16ms = 48s de marge au-delà des 30s cible

const CANDIDATE_INPUTS = [
  {}, // ne rien faire (référence)
  { left: true }, { right: true }, { up: true }, { down: true },
  { left: true, up: true }, { left: true, down: true },
  { right: true, up: true }, { right: true, down: true },
];

function cloneGame(g) {
  const ng = new ChasePrototypeGame({ width: g.width, height: g.height });
  ng.player = { ...g.player };
  ng.enemy = { ...g.enemy };
  ng.elapsedMs = g.elapsedMs;
  ng.over = g.over;
  ng.won = g.won;
  return ng;
}

function distToEnemy(v) {
  return Math.hypot(v.player.x - v.enemy.x, v.player.y - v.enemy.y);
}

// Bot de fuite par recherche gloutonne à horizon LOOKAHEAD_TICKS : simule chacune des 8
// directions (+ immobile) MAINTENUE pendant tout l'horizon, garde celle qui MAXIMISE la
// distance au poursuivant à la fin de l'horizon (capture => score -1, éliminatoire). Un
// horizon > 1 tick est nécessaire : dans un coin, fuir "droit devant" est bloqué par les
// deux murs à la fois, et la seule échappatoire réelle (longer un mur tangentiellement)
// réduit la distance à très court terme avant de payer — un horizon 1 tick ne la voit pas
// et reste piégé au coin. Ce n'est pas une politique optimale, juste suffisante pour
// prouver qu'une politique gagnante existe.
const LOOKAHEAD_TICKS = 20; // 20 * 16ms = 320ms de projection

function fleeBot(g) {
  let best = null;
  for (const input of CANDIDATE_INPUTS) {
    const trial = cloneGame(g);
    let captured = false;
    for (let i = 0; i < LOOKAHEAD_TICKS && !captured; i++) {
      trial.step(DT, input);
      if (trial.over) captured = true;
    }
    const score = captured ? -1 : distToEnemy(trial.view());
    if (best === null || score > best.score) best = { input, score };
  }
  return best.input;
}

function playWithBot(bot) {
  const g = new ChasePrototypeGame();
  let ticks = 0;
  while (!g.over && !g.won && ticks < MAX_TICKS) {
    const input = bot(g);
    g.step(DT, input);
    ticks += 1;
  }
  return { ...g.view(), ticks };
}

function main() {
  console.log("=== ORACLE DE SOLVABILITÉ — Chase Prototype ===");

  const fleeResult = playWithBot(fleeBot);
  console.log(
    `bot de fuite : ${fleeResult.won ? "SURVIT (VICTOIRE)" : fleeResult.over ? "CAPTURÉ" : "ni l'un ni l'autre (timeout test)"}` +
    ` — elapsedMs=${Math.round(fleeResult.elapsedMs)}`
  );

  const stillResult = playWithBot(() => ({}));
  console.log(
    `bot immobile : ${stillResult.over ? "CAPTURÉ (défaite)" : stillResult.won ? "SURVIT (inattendu)" : "ni l'un ni l'autre (timeout test)"}` +
    ` — elapsedMs=${Math.round(stillResult.elapsedMs)}`
  );

  const victoryReachable = fleeResult.won === true;
  const defeatReachable = stillResult.over === true && stillResult.elapsedMs < 30000;

  const ok = victoryReachable && defeatReachable;
  console.log(`\nVERDICT SOLVABILITÉ : ${ok ? "SOLVABLE (victoire et défaite toutes deux atteignables)" : "INJOUABLE"}`);
  if (!ok) {
    console.log(
      "RAISON : " +
      (!victoryReachable ? "aucune politique de fuite ne mène à la victoire (30s). " : "") +
      (!defeatReachable ? "un joueur immobile ne se fait jamais rattraper avant 30s (jeu sans enjeu)." : "")
    );
  }
  process.exit(ok ? 0 : 1);
}

main();

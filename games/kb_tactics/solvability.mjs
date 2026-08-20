// Oracle de SOLVABILITÉ — kb_tactics peut-il être GAGNÉ en jouant ?
//
// Les logic tests vérifient des mécaniques en isolation. Ils ne prouvent jamais qu'un joueur
// peut GAGNER. Cet oracle joue vraiment : SOLVABLE seulement si un bot déterministe atteint
// la victoire (leçon oracle_solvability_lesson).
//
// Pattern :
//   1. mesurer l'enveloppe d'action RÉELLE (le joueur peut-il bouger dans chaque direction ?)
//   2. vérifier que la sortie est atteignable (sys-reachability — pat-full-reachability)
//   3. lancer un bot BFS déterministe qui suit le plus court chemin vers la sortie et GAGNE
import { KbTacticsGame, GRID_W, GRID_H } from "./game.mjs";
import { pathToFileURL } from "node:url";

const SEEDS = [1, 7, 42, 123, 888, 2024];

// (1) Enveloppe d'action : depuis une case libre entourée de libre, chaque direction déplace-t-elle ?
function measureActionEnvelope(seed) {
  const g = new KbTacticsGame({ seed });
  const moves = {};
  for (const action of ["up", "down", "left", "right"]) {
    const probe = new KbTacticsGame({ seed });
    // amène le joueur au centre pour tester les 4 directions sans bord
    probe.player.x = Math.floor(GRID_W / 2);
    probe.player.y = Math.floor(GRID_H / 2);
    probe.grid[probe.player.y][probe.player.x] = 0;
    const { x, y } = probe.player;
    // dégage la case cible pour isoler la capacité de mouvement du moteur
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[action];
    probe.grid[y + d[1]][x + d[0]] = 0;
    probe.enemies = []; // isole le mouvement (pas d'occupation ennemie)
    const before = { x: probe.player.x, y: probe.player.y };
    probe.step(action);
    moves[action] = probe.player.x !== before.x || probe.player.y !== before.y;
  }
  return moves;
}

// BFS plus court chemin vers la sortie, avec prédicat de blocage paramétrable.
// `blocked(x,y)` permet au bot d'éviter dynamiquement les cases ennemies (et leur voisinage).
function bfsActions(game, blocked) {
  const start = { x: game.player.x, y: game.player.y };
  const goal = game.exit;
  const key = (x, y) => `${x},${y}`;
  const prev = new Map();
  const seen = new Set([key(start.x, start.y)]);
  const queue = [start];
  const NB = [
    { dx: 0, dy: -1, a: "up" }, { dx: 0, dy: 1, a: "down" },
    { dx: -1, dy: 0, a: "left" }, { dx: 1, dy: 0, a: "right" },
  ];
  let found = false;
  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === goal.x && cur.y === goal.y) { found = true; break; }
    for (const n of NB) {
      const nx = cur.x + n.dx, ny = cur.y + n.dy;
      const k = key(nx, ny);
      const isGoal = nx === goal.x && ny === goal.y;
      // la sortie n'est jamais "dangereuse" : on l'accepte toujours si atteignable
      if (seen.has(k) || game.isBlocked(nx, ny) || (blocked(nx, ny) && !isGoal)) continue;
      seen.add(k);
      prev.set(k, { from: key(cur.x, cur.y), a: n.a });
      queue.push({ x: nx, y: ny });
    }
  }
  if (!found) return null;
  const actions = [];
  let k = key(goal.x, goal.y);
  while (k !== key(start.x, start.y)) {
    const step = prev.get(k);
    if (!step) return null;
    actions.push(step.a);
    k = step.from;
  }
  actions.reverse();
  return actions;
}

// Prédicats de danger, du plus prudent au plus permissif (le bot route AUTOUR des ennemis).
function enemyOn(game) {
  const set = new Set(game.enemies.map((e) => `${e.x},${e.y}`));
  return (x, y) => set.has(`${x},${y}`);
}
function enemyOrAdjacent(game) {
  const danger = new Set();
  for (const e of game.enemies) {
    danger.add(`${e.x},${e.y}`);
    danger.add(`${e.x + 1},${e.y}`); danger.add(`${e.x - 1},${e.y}`);
    danger.add(`${e.x},${e.y + 1}`); danger.add(`${e.x},${e.y - 1}`);
  }
  return (x, y) => danger.has(`${x},${y}`);
}

// (3) Bot conscient des ennemis : à chaque tour, cherche le chemin le plus SÛR d'abord
// (évite cases ennemies + voisinage), puis relâche la prudence si aucune route sûre n'existe.
// Les poursuivants étant lents (ENEMY_MOVE_PERIOD), une route sûre existe en général.
export function runBot(seed) {
  const g = new KbTacticsGame({ seed });
  const maxTurns = GRID_W * GRID_H * 4;
  let turns = 0;
  while (g.status === "ACTIVE" && turns < maxTurns) {
    turns++;
    const safe = bfsActions(g, enemyOrAdjacent(g));      // le plus prudent
    const cautious = safe ?? bfsActions(g, enemyOn(g));   // évite juste les cases ennemies
    const plain = cautious ?? bfsActions(g, () => false); // dernier recours : chemin brut
    if (!plain || plain.length === 0) { g.step("wait"); continue; }
    g.step(plain[0]);
  }
  return { won: g.status === "WON", status: g.status, turns, hp: g.player.hp };
}

function main() {
  console.log("=== ORACLE DE SOLVABILITÉ — kb_tactics ===\n");
  let allWon = true;

  for (const seed of SEEDS) {
    const env = measureActionEnvelope(seed);
    const envOk = env.up && env.down && env.left && env.right;

    const g = new KbTacticsGame({ seed });
    const reach = g.reachableFromPlayer();
    const exitReachable = reach.has(`${g.exit.x},${g.exit.y}`);

    const bot = runBot(seed);
    const ok = envOk && exitReachable && bot.won;
    allWon = allWon && ok;

    console.log(
      `seed ${String(seed).padStart(4)} | enveloppe ${envOk ? "OK" : "KO"} | ` +
      `sortie atteignable ${exitReachable ? "oui" : "NON"} | ` +
      `bot ${bot.won ? "GAGNE" : "PERD(" + bot.status + ")"} en ${bot.turns} tours, hp=${bot.hp}`
    );
  }

  console.log(`\nRESULT: ${allWon ? "PASS" : "FAIL"}`);
  process.exit(allWon ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

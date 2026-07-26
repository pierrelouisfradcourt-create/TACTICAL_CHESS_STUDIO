// solvability.mjs — ORACLE DE SOLVABILITÉ (Forge). Un jeu aux objectifs inatteignables
// passe tous les tests de mécanique EN ISOLATION tout en étant injouable. Ce volet :
// (1) mesure l'enveloppe d'action réelle, (2) vérifie que tous les ennemis requis sont
// ATTEIGNABLES (BFS non-mur), (3) fait jouer le bot déterministe (bot.mjs) qui doit
// GAGNER **et** capturer. Balayé sur PLUSIEURS seeds (types fixés mais forêt variable) :
// TOUS doivent être gagnables+capturables. Exit 0 ssi ok.
import { MenagerieBattle } from "./game.mjs";
import { generateBattle } from "./level.mjs";
import { playToVictory } from "./bot.mjs";

const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1); // 1..24

function orth(x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
}

function measureEnvelope(seed) {
  const b = new MenagerieBattle(generateBattle(1, seed));
  const p = b.activeBeasts("player")[0];
  return { move: p.move, range: p.range, reach: p.move + p.range };
}

// BFS des cases non-mur depuis les joueurs ; un ennemi est atteignable si une case
// non-mur à portée `range` est inondée.
function unreachableObjectives(env, seed) {
  const b = new MenagerieBattle(generateBattle(1, seed));
  const walkable = (x, y) => b.inBounds(x, y) && b.terrainAt(x, y) !== "wall";
  const seen = new Set();
  const queue = [];
  for (const p of b.activeBeasts("player")) {
    const k = p.x + "," + p.y;
    if (!seen.has(k)) { seen.add(k); queue.push([p.x, p.y]); }
  }
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    for (const [nx, ny] of orth(x, y)) {
      const k = nx + "," + ny;
      if (walkable(nx, ny) && !seen.has(k)) { seen.add(k); queue.push([nx, ny]); }
    }
  }
  const out = [];
  for (const e of b.activeBeasts("enemy")) {
    let reachable = false;
    for (let y = 0; y < b.height; y++) {
      for (let x = 0; x < b.width; x++) {
        const near = Math.abs(x - e.x) + Math.abs(y - e.y);
        if (seen.has(x + "," + y) && near <= env.range) { reachable = true; }
      }
    }
    if (!reachable) { out.push({ what: `ennemi #${e.id} (${e.x},${e.y})` }); }
  }
  return out;
}

function main() {
  console.log("=== ORACLE DE SOLVABILITÉ — Menagerie Tactics ===");
  const env = measureEnvelope(1);
  console.log(`enveloppe d'action joueur : move=${env.move}, range=${env.range}, portée=${env.reach}`);

  const failures = [];
  let capturesSeen = 0;
  for (const seed of SEEDS) {
    const unreachable = unreachableObjectives(measureEnvelope(seed), seed);
    const r = playToVictory(new MenagerieBattle(generateBattle(1, seed)));
    if (r.won && r.captures >= 1) { capturesSeen += r.captures; }
    if (!r.won || r.captures < 1 || unreachable.length > 0) {
      failures.push({ seed, won: r.won, captures: r.captures, unreachable: unreachable.length });
    }
  }

  const ok = failures.length === 0;
  console.log(`seeds testées : ${SEEDS.length} (1..${SEEDS.length}) — un bot doit GAGNER + CAPTURER chacune`);
  console.log(`captures cumulées prouvées : ${capturesSeen}`);
  for (const f of failures) {
    console.log(`   ✗ seed ${f.seed} : gagné=${f.won}, captures=${f.captures}, ennemis hors d'atteinte=${f.unreachable}`);
  }
  console.log(`\nVERDICT SOLVABILITÉ : ${ok ? `SOLVABLE (un bot gagne ET capture sur ${SEEDS.length}/${SEEDS.length} seeds)` : `INJOUABLE (${failures.length} seed(s) en échec)`}`);
  process.exit(ok ? 0 : 1);
}

main();

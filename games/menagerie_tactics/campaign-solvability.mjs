// campaign-solvability.mjs — SOLVABILITÉ PAR OBJECTIF : pour chaque rencontre du slice
// (rout/capture/survive/boss) × seeds, un bot déterministe ATTEINT l'objectif
// (evaluateObjective.status === 'won'). Prouve que les objectifs sont de vrais défis
// GAGNABLES, pas juste des mécaniques en isolation. Exit 0 ssi tout.
import { MenagerieBattle } from "./game.mjs";
import { ENCOUNTERS } from "./encounters.mjs";
import { generateEncounter } from "./level.mjs";
import { playToVictory, surviveTurns } from "./bot.mjs";
import { evaluateObjective } from "./objectives.mjs";

const SEEDS = 12;
const CASES = ["rout_t1", "capture_t1", "survive_t1", "boss_t2"];

function runCase(encId, seed) {
  const setup = generateEncounter(ENCOUNTERS[encId], seed);
  const b = new MenagerieBattle(setup);
  const obj = setup.objective;
  if (obj.kind === "survive") {
    surviveTurns(b, obj.turns);
  } else {
    playToVictory(b);
  }
  return evaluateObjective(obj, b.view()).status === "won";
}

function main() {
  const failures = [];
  let total = 0;
  for (const encId of CASES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      total += 1;
      if (!runCase(encId, seed)) {
        failures.push(`${encId} @seed${seed}`);
      }
    }
  }
  console.log("=== SOLVABILITÉ PAR OBJECTIF (campagne) ===");
  console.log(`${CASES.length} rencontres x ${SEEDS} seeds = ${total} cas — chacun doit atteindre l'objectif`);
  for (const f of failures) { console.log("   ✗ " + f); }
  const ok = failures.length === 0;
  console.log(`\nVERDICT CAMPAGNE-SOLVABILITÉ : ${ok ? `OK (${total}/${total} objectifs atteints)` : `FAIL (${failures.length} échec(s))`}`);
  process.exit(ok ? 0 : 1);
}

main();

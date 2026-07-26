// meta-solvability.mjs — SOLVABILITÉ GÉNÉRALISÉE : prouve que la couche méta
// (composition -> déploiement) ne casse PAS la jouabilité. Pour un jeu de compositions
// SENSÉES x seeds, buildDeploySetup -> MenagerieBattle -> bot (bot.mjs) doit finir
// over+won avec captures>=1. Exit 0 ssi tout. Garde aussi l'exclusion des cicatrisées.
// NO_CLAIM : ne prouve pas TOUTE combinaison (une meute faible = choix perdant du joueur).
import { MenagerieBattle } from "./game.mjs";
import { buildDeploySetup, makeInstance, SCAR_DEPLOY_LIMIT } from "./meta.mjs";
import { playToVictory } from "./bot.mjs";

const SEEDS = 12;
const ROSTERS = [
  ["embraseur", "ondine", "fulgor"],
  ["embraseur", "fulgor", "golem"],
  ["embraseur", "golem", "ondine"],
  ["fulgor", "ondine", "golem"],
];

function instances(species) {
  return species.map((s, i) => makeInstance(s, i + 1));
}

function main() {
  const failures = [];
  let capturesSeen = 0;
  for (const species of ROSTERS) {
    const roster = instances(species);
    const choix = roster.map((r) => r.uid);
    for (let seed = 1; seed <= SEEDS; seed++) {
      const b = new MenagerieBattle(buildDeploySetup(roster, choix, seed));
      const r = playToVictory(b);
      if (r.won && r.captures >= 1) { capturesSeen += r.captures; }
      if (!r.won || r.captures < 1) {
        failures.push(`${species.join("+")} @seed${seed} : won=${r.won} captures=${r.captures}`);
      }
    }
  }

  // Garde : une bête cicatrisée ne peut jamais être déployée.
  const scarred = [{ ...makeInstance("embraseur", 1), cicatrices: SCAR_DEPLOY_LIMIT }];
  let scarGuard = false;
  try { buildDeploySetup(scarred, [1], 1); } catch { scarGuard = true; }
  if (!scarGuard) { failures.push("bête cicatrisée déployée (garde deployable cassée)"); }

  console.log("=== SOLVABILITÉ GÉNÉRALISÉE (couche méta) ===");
  console.log(`${ROSTERS.length} compositions x ${SEEDS} seeds — chacune doit GAGNER + CAPTURER`);
  console.log(`captures cumulées prouvées : ${capturesSeen}`);
  for (const f of failures) { console.log("   ✗ " + f); }
  const ok = failures.length === 0;
  console.log(`\nVERDICT META-SOLVABILITÉ : ${ok ? "OK (la composition ne casse pas la jouabilité)" : `FAIL (${failures.length} échec(s))`}`);
  console.log("NOTE (NO_CLAIM) : prouve des compositions SENSÉES, pas toute combinaison possible.");
  process.exit(ok ? 0 : 1);
}

main();

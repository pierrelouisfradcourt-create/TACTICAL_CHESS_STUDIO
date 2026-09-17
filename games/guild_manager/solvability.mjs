// guild_manager — ORACLE DE SOLVABILITÉ : un bot glouton déterministe doit
// GAGNER (vaincre le Léviathan) en ≤ SOLVABILITY_DAY_BUDGET jours, et deux
// parties de même graine doivent produire exactement le même état.
import { pathToFileURL } from 'node:url';
import { createGuild, snapshot } from './guild.mjs';
import { botPlayDay, botPlayUntilEnd } from './bot.mjs';

export const SOLVABILITY_SEED = 12345;
export const SOLVABILITY_DAY_BUDGET = 250;
const DETERMINISM_DAYS = 60;

export function testDeterminism(seed, days) {
  const a = createGuild(seed);
  const b = createGuild(seed);
  for (let d = 0; d < days; d++) {
    if (a.outcome !== 'playing' || b.outcome !== 'playing') break;
    botPlayDay(a);
    botPlayDay(b);
    const ja = JSON.stringify(snapshot(a));
    const jb = JSON.stringify(snapshot(b));
    if (ja !== jb) return { deterministic: false, divergedAtDay: a.day };
  }
  return { deterministic: true, daysTested: days };
}

export function runSolvabilityProof() {
  const results = { oracle: 'solvability', verdict: 'PASS', proofs: [] };

  const state = createGuild(SOLVABILITY_SEED);
  const run = botPlayUntilEnd(state, SOLVABILITY_DAY_BUDGET);
  const victory = run.outcome === 'victory';
  results.proofs.push({
    test: 'bot_reaches_victory', pass: victory, outcome: run.outcome, days: run.days,
    budget: SOLVABILITY_DAY_BUDGET, missionsDone: state.stats.missionsDone, raidsDone: state.stats.raidsDone,
  });
  if (!victory) { results.verdict = 'FAIL'; return results; }

  const withinBudget = run.days <= SOLVABILITY_DAY_BUDGET;
  results.proofs.push({ test: 'victory_within_budget', pass: withinBudget, days: run.days, budget: SOLVABILITY_DAY_BUDGET });
  if (!withinBudget) { results.verdict = 'FAIL'; return results; }

  const det = testDeterminism(SOLVABILITY_SEED, DETERMINISM_DAYS);
  results.proofs.push({ test: 'determinism', pass: det.deterministic, ...det });
  if (!det.deterministic) results.verdict = 'FAIL';
  return results;
}

function main() {
  console.log('=== ORACLE DE SOLVABILITÉ — guild_manager ===\n');
  const result = runSolvabilityProof();
  for (const p of result.proofs) console.log(`${p.pass ? '✓' : '✗'} ${p.test}: ${JSON.stringify(p)}`);
  console.log(`\nRESULT: ${result.verdict}`);
  process.exit(result.verdict === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

#!/usr/bin/env node
// role_sim.mjs — ROLE-SIM Oracle (docs/forge/STUDIO_AGENT_ATLAS.md §2.3), service non-LLM.
// Valide un ROLE gameplay PAR SIMULATION : ne mesure jamais un booléen gagné/perdu
// (ça, c'est solvability.mjs) — mesure une BANDE DE DIFFICULTÉ sur N essais seedés, et la
// compare à la bande DÉCLARÉE dans le contrat rôle (knowledge_base/roles/<role>.yaml).
//
// Lecteur YAML volontairement MINIMAL (pas de dépendance npm) : ne comprend QUE le
// sous-ensemble utilisé par les contrats rôle (scalaires top-level `key: value`, blocs
// plats `key:\n  subkey: value` sur UN niveau d'indentation, listes `- item`). Suffisant
// et robuste pour ce format contrôlé — pas un parseur YAML générique.
//
// Usage : node role_sim.mjs <role.yaml>
// Exit 0 = bande mesurée DANS la bande déclarée · 1 = hors bande (rapporté tel quel,
// jamais édulcoré) · 2 = contrat invalide (champ Critique absent) ou erreur.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stepToward, chebyshevDistance } from './systems/ai/pursuer.mjs';
import { stepAway } from './systems/ai/evader.mjs';

// ---- lecteur YAML minimal (sous-ensemble contrôlé, cf. en-tête) ----

/**
 * Extrait la valeur d'un scalaire top-level `key: value` (une ligne, pas de bloc).
 * Gère `>-` (repliage sur les lignes indentées suivantes, comme YAML block scalar).
 * @param {string} text
 * @param {string} key
 * @returns {string|null} null si la clé est absente
 */
function extractScalar(text, key) {
  const lineMatch = text.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!lineMatch) return null;
  const inline = lineMatch[1].trim();
  if (inline && inline !== '>-' && inline !== '|-') return stripQuotes(inline);
  if (inline === '>-' || inline === '|-') {
    // Bloc replié : concatène les lignes indentées qui suivent jusqu'à la 1re ligne
    // non-indentée (ou EOF).
    const afterIdx = lineMatch.index + lineMatch[0].length;
    const rest = text.slice(afterIdx + 1);
    const blockLines = [];
    for (const line of rest.split('\n')) {
      if (line === '' || /^[ \t]/.test(line)) {
        blockLines.push(line.trim());
      } else {
        break;
      }
    }
    return blockLines.join(' ').trim();
  }
  return null;
}

function stripQuotes(str) {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Extrait un bloc plat `blockKey:\n  sub: value\n  sub2: value` — UN niveau
 * d'indentation, valeurs numériques auto-converties. Retourne null si le bloc est absent.
 * @param {string} text
 * @param {string} blockKey
 * @returns {Object<string, (string|number)>|null}
 */
function extractFlatBlock(text, blockKey) {
  const blockMatch = text.match(new RegExp(`^${blockKey}:[ \\t]*$`, 'm'));
  if (!blockMatch) return null;
  const afterIdx = blockMatch.index + blockMatch[0].length;
  const rest = text.slice(afterIdx + 1);
  const result = {};
  for (const line of rest.split('\n')) {
    if (!/^[ \t]+\S/.test(line)) break; // dédent = fin du bloc
    const m = line.match(/^\s+([a-zA-Z_][\w]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    const trimmed = stripQuotes(rawValue.trim());
    result[key] = /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed;
  }
  return Object.keys(result).length ? result : null;
}

/**
 * Charge et valide la structure minimale d'un contrat rôle (règle des 3 états, SCHEMA.md).
 * @param {string} filePath
 * @returns {{role:object, findings:string[]}}
 */
function loadRole(filePath) {
  const text = readFileSync(filePath, 'utf-8');
  const findings = [];

  const roleId = extractScalar(text, 'role_id');
  const archetype = extractScalar(text, 'archetype');
  const tier = extractScalar(text, 'tier');
  const license = extractScalar(text, 'license');
  const path = extractScalar(text, 'path');
  const proofOfUse = extractScalar(text, 'proof_of_use');
  const simulationConfig = extractFlatBlock(text, 'simulation_config');
  const difficultyTarget = extractFlatBlock(text, 'difficulty_target');
  const requiresPresent = /^requires:[ \t]*$/m.test(text);

  if (!roleId) findings.push('champ Critique absent : role_id');
  if (!archetype || archetype.length < 20) findings.push('champ Critique absent/trop court : archetype');
  if (!requiresPresent) findings.push('champ Critique absent : requires');
  if (!simulationConfig) findings.push('champ Critique absent : simulation_config');
  if (!difficultyTarget) findings.push('champ Critique absent : difficulty_target');
  if (!tier) findings.push('champ Critique absent : tier');
  if (!license) findings.push('champ Critique absent : license');
  if (!path) findings.push('champ Critique absent : path');
  if (tier === 'validated' && (!proofOfUse || proofOfUse === 'null')) {
    findings.push("tier=validated mais proof_of_use absent/null — contrat invalide (garde is_clean_pass-style)");
  }

  return {
    role: { roleId, archetype, tier, license, path, proofOfUse, simulationConfig, difficultyTarget },
    findings,
  };
}

// ---- PRNG déterministe (mulberry32 — même famille que les autres oracles du studio) ----

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simule UNE poursuite (un seed = une configuration de départ), jusqu'à capture ou
 * max_ticks. Pur vis-à-vis de l'extérieur (RNG créé et consommé localement, seedé).
 * @param {number} seed
 * @param {object} cfg simulation_config (trials/seed_start non utilisés ici — 1 essai)
 * @returns {{caught:boolean, ticks:number}}
 */
function simulateOne(seed, cfg) {
  const rng = mulberry32(seed);
  const half = cfg.arena_half_size;
  const randCoord = () => Math.round((rng() * 2 - 1) * half);

  let pursuer = { x: randCoord(), y: randCoord() };
  let evader = { x: randCoord(), y: randCoord() };
  // Évite un départ déjà capturé (dégénéré) — retirage déterministe borné.
  let guard = 0;
  while (chebyshevDistance(pursuer, evader) <= cfg.catch_radius && guard < 50) {
    evader = { x: randCoord(), y: randCoord() };
    guard += 1;
  }

  for (let tick = 1; tick <= cfg.max_ticks; tick += 1) {
    evader = stepAway(evader, pursuer, cfg.evader_speed);
    pursuer = stepToward(pursuer, evader, cfg.pursuer_speed);
    if (chebyshevDistance(pursuer, evader) <= cfg.catch_radius) {
      return { caught: true, ticks: tick };
    }
  }
  return { caught: false, ticks: null };
}

function median(sortedNums) {
  const n = sortedNums.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedNums[mid - 1] + sortedNums[mid]) / 2 : sortedNums[mid];
}

/**
 * Lance `trials` simulations (seeds seed_start..seed_start+trials-1) et calcule la
 * bande de difficulté mesurée.
 * @param {object} cfg simulation_config complet
 * @returns {{trials:number, caught:number, notCaught:number, catchRate:number, min:(number|null), median:(number|null), max:(number|null), ticksToCatch:number[]}}
 */
export function measureDifficultyBand(cfg) {
  const ticksToCatch = [];
  let notCaught = 0;

  for (let i = 0; i < cfg.trials; i += 1) {
    const seed = cfg.seed_start + i;
    const result = simulateOne(seed, cfg);
    if (result.caught) ticksToCatch.push(result.ticks);
    else notCaught += 1;
  }

  const sorted = [...ticksToCatch].sort((a, b) => a - b);
  return {
    trials: cfg.trials,
    caught: ticksToCatch.length,
    notCaught,
    catchRate: ticksToCatch.length / cfg.trials,
    min: sorted.length ? sorted[0] : null,
    median: median(sorted),
    max: sorted.length ? sorted[sorted.length - 1] : null,
    ticksToCatch: sorted,
  };
}

const METRIC_KEYS = {
  ticks_to_catch_median: 'median',
  ticks_to_catch_min: 'min',
  ticks_to_catch_max: 'max',
  catch_rate: 'catchRate',
};

function main() {
  const rolePath = process.argv[2];
  if (!rolePath) {
    console.error('Usage: node role_sim.mjs <role.yaml>');
    process.exit(2);
  }

  console.log('=== ROLE-SIM ORACLE — bande de difficulté par simulation ===\n');

  const { role, findings } = loadRole(resolve(rolePath));
  if (findings.length > 0) {
    console.log(`✗ Contrat rôle INVALIDE : ${role.roleId || rolePath}`);
    for (const f of findings) console.log(`    - ${f}`);
    console.log('\nRESULT: INVALID_CONTRACT');
    process.exit(2);
  }

  console.log(`Rôle : ${role.roleId} (tier=${role.tier})`);
  console.log(`Config simulation : ${JSON.stringify(role.simulationConfig)}`);

  const measured = measureDifficultyBand(role.simulationConfig);
  const metricKey = METRIC_KEYS[role.difficultyTarget.metric];
  const measuredValue = metricKey ? measured[metricKey] : undefined;

  console.log(`\nMesuré sur ${measured.trials} essais (seeds ${role.simulationConfig.seed_start}..${role.simulationConfig.seed_start + role.simulationConfig.trials - 1}) :`);
  console.log(`  captures : ${measured.caught}/${measured.trials} (catch_rate=${measured.catchRate.toFixed(3)})`);
  console.log(`  ticks_to_catch : min=${measured.min} médiane=${measured.median} max=${measured.max}`);
  console.log(`\nCible déclarée (${role.difficultyTarget.metric}) : [${role.difficultyTarget.min}, ${role.difficultyTarget.max}]`);
  console.log(`Valeur mesurée pour cette métrique : ${measuredValue}`);

  const inBand =
    metricKey !== undefined &&
    measuredValue !== null &&
    measuredValue >= role.difficultyTarget.min &&
    measuredValue <= role.difficultyTarget.max;

  const receipt = {
    role_id: role.roleId,
    simulation_config: role.simulationConfig,
    difficulty_target: role.difficultyTarget,
    measured,
    in_declared_band: inBand,
  };
  console.log(`\n--- reçu mécanique (JSON) ---\n${JSON.stringify(receipt, null, 2)}`);

  if (inBand) {
    console.log('\nRESULT: PASS (bande mesurée dans la bande déclarée)');
    process.exit(0);
  } else {
    console.log('\nRESULT: FAIL (bande mesurée HORS de la bande déclarée — rapporté tel quel)');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${(process.argv[1] || '').replace(/\\/g, '/')}`) {
  main();
}

// Capteur qualité mécanique — CŒUR PUR (advisory, hors pipeline de preuve Forge).
// Aucun navigateur, aucun LLM, aucun agrégat. Générateur d'inputs seedé rejouable
// + vocabulaire d'observation (signal_detected/absent/metric_unavailable, JAMAIS
// pass/fail) + enveloppe de rapport advisory. La collecte Playwright (screenshots,
// DOM, pilotage) est un module SÉPARÉ (increment ultérieur), pour garder ce cœur
// déterministe et testable. Contrat : docs/forge/P1_MECHANICAL_CONTRACT.md.

const OUTCOMES = Object.freeze({
  DETECTED: "signal_detected",
  ABSENT: "signal_absent",
  UNAVAILABLE: "metric_unavailable",
});

// PRNG déterministe (mulberry32) — reproductible depuis une seed, JAMAIS Math.random.
// Aucun aléatoire non borné : longueur fixe, seed enregistrée, séquence rejouable.
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

export function makeInputSequence(seed, length, alphabet) {
  const rng = mulberry32(seed);
  const tokens = [];
  for (let i = 0; i < length; i++) {
    tokens.push(alphabet[Math.floor(rng() * alphabet.length)]);
  }
  return { seed, mode: "seeded_exploration", tokens };
}

export function evaluate(measured, threshold) {
  if (measured === null || measured === undefined || Number.isNaN(measured)) {
    return OUTCOMES.UNAVAILABLE; // honnête : non mesurable n'est PAS un pass
  }
  const crossed =
    threshold.op === "<" ? measured < threshold.value : measured > threshold.value;
  return crossed ? OUTCOMES.DETECTED : OUTCOMES.ABSENT;
}

export function observation({ id, kind, measured, threshold, justification, raw, artifact }) {
  return {
    id,
    kind,
    outcome: evaluate(measured, threshold),
    measured: measured === undefined ? null : measured,
    // le seuil est une HYPOTHÈSE expérimentale, jamais une norme
    threshold: { value: threshold.value, op: threshold.op, status: "hypothesis" },
    justification,
    raw,
    artifact,
  };
}

export function buildReport({ game, run, observations, rawMeasurements = [] }) {
  // Enveloppe strictement advisory. Rejeu garanti par (seed, input_sequence).
  // Aucun champ de score/verdict/agrégat : chaque observation est atomique et
  // se lit seule ; aucune conclusion « bon/mauvais jeu » n'est produite ici.
  // `raw_measurements` = signaux BRUTS sans seuil (ex. nb de couleurs — la
  // cohérence palette exige l'art bible, P2) : une valeur de contexte, jamais
  // un jugement detected/absent.
  return {
    sensor: "visual_mechanical",
    version: "0",
    advisory: true,
    game,
    run: { seed: run.seed, mode: run.mode, input_sequence: run.tokens },
    observations,
    raw_measurements: rawMeasurements,
  };
}

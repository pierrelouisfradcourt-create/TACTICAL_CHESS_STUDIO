// TDD — cœur pur du capteur qualité mécanique (advisory, hors pipeline Forge).
// Aucun navigateur ici : générateur seedé + vocabulaire d'observation + enveloppe
// de rapport. Contrat : docs/forge/P1_MECHANICAL_CONTRACT.md (ACCEPTED 2026-07-11).
import test from "node:test";
import assert from "node:assert/strict";

import {
  makeInputSequence,
  evaluate,
  observation,
  buildReport,
} from "./sensor.mjs";

const ALPHABET = ["ArrowLeft", "ArrowRight", "Space"];

// --- Point 1 : générateur FTUE seedé, déterministe, rejouable, borné -------------

test("makeInputSequence est déterministe (même seed => même séquence)", () => {
  const a = makeInputSequence(12345, 20, ALPHABET);
  const b = makeInputSequence(12345, 20, ALPHABET);
  assert.deepEqual(a.tokens, b.tokens);
  assert.equal(a.seed, 12345);
  assert.equal(a.mode, "seeded_exploration");
});

test("des seeds différentes divergent (aléatoire seedé, pas constant)", () => {
  const a = makeInputSequence(1, 40, ALPHABET);
  const b = makeInputSequence(2, 40, ALPHABET);
  assert.notDeepEqual(a.tokens, b.tokens);
});

test("séquence bornée : longueur exacte, tokens dans l'alphabet", () => {
  const { tokens } = makeInputSequence(7, 15, ALPHABET);
  assert.equal(tokens.length, 15);
  for (const t of tokens) assert.ok(ALPHABET.includes(t));
});

test("rejouable : la séquence enregistrée se reconstruit à l'identique depuis la seed", () => {
  const run = makeInputSequence(999, 10, ALPHABET);
  const replay = makeInputSequence(run.seed, run.tokens.length, ALPHABET);
  assert.deepEqual(replay.tokens, run.tokens);
});

// --- Point 2 : vocabulaire d'observation (jamais pass/fail) -----------------------

test("evaluate: non mesurable => metric_unavailable (pas un pass)", () => {
  assert.equal(evaluate(null, { value: 4.5, op: "<" }), "metric_unavailable");
  assert.equal(evaluate(NaN, { value: 4.5, op: "<" }), "metric_unavailable");
});

test("evaluate op '<' : sous le seuil => signal_detected, sinon signal_absent", () => {
  assert.equal(evaluate(2.9, { value: 4.5, op: "<" }), "signal_detected");
  assert.equal(evaluate(7.0, { value: 4.5, op: "<" }), "signal_absent");
});

test("evaluate op '>' : au-dessus du seuil => signal_detected, sinon signal_absent", () => {
  assert.equal(evaluate(0.95, { value: 0.92, op: ">" }), "signal_detected");
  assert.equal(evaluate(0.40, { value: 0.92, op: ">" }), "signal_absent");
});

test("evaluate ne renvoie JAMAIS pass/fail", () => {
  const outcomes = new Set([
    evaluate(1, { value: 2, op: "<" }),
    evaluate(3, { value: 2, op: "<" }),
    evaluate(null, { value: 2, op: "<" }),
  ]);
  for (const o of outcomes) {
    assert.ok(["signal_detected", "signal_absent", "metric_unavailable"].includes(o));
    assert.ok(!/pass|fail/i.test(o));
  }
});

// --- observation atomique traçable ------------------------------------------------

test("observation porte mesure + seuil(hypothèse) + justification + raw + artefact", () => {
  const o = observation({
    id: "A1_contrast", kind: "readability", measured: 2.9,
    threshold: { value: 4.5, op: "<" },
    justification: "WCAG AA texte normal = 4.5:1",
    raw: { fg: "#888", bg: "#777", selector: "#overlay" },
    artifact: "lab/forge_sensors/breakout/shots/overlay.png",
  });
  assert.equal(o.outcome, "signal_detected");
  assert.equal(o.threshold.status, "hypothesis");   // seuil = hypothèse, pas norme
  assert.equal(o.measured, 2.9);
  assert.equal(o.justification, "WCAG AA texte normal = 4.5:1");
  assert.ok(o.raw && o.artifact);
});

// --- enveloppe de rapport : advisory, rejouable, SANS agrégat --------------------

test("buildReport: enveloppe advisory rejouable, aucune clé de score/verdict", () => {
  const run = makeInputSequence(12345, 5, ALPHABET);
  const obs = [observation({
    id: "B2_first_reward", kind: "ftue", measured: 999,
    threshold: { value: 50, op: ">" }, justification: "hypothèse: récompense < 50 pas",
    raw: { steps_to_reward: 999 }, artifact: "lab/forge_sensors/breakout/trace.json",
  })];
  const report = buildReport({ game: "breakout", run, observations: obs });

  assert.equal(report.sensor, "visual_mechanical");
  assert.equal(report.advisory, true);
  assert.equal(report.game, "breakout");
  assert.equal(report.run.seed, 12345);
  assert.deepEqual(report.run.input_sequence, run.tokens);
  assert.equal(report.run.mode, "seeded_exploration");
  assert.equal(report.observations.length, 1);
  // INTERDITS : aucun score global / verdict / pass|fail / agrégat à la racine
  for (const k of ["score", "quality", "verdict", "pass", "fail", "grade", "aggregate"]) {
    assert.ok(!(k in report), `clé interdite présente: ${k}`);
  }
});

test("buildReport: raw_measurements = signaux bruts sans jugement (defaut vide)", () => {
  const run = makeInputSequence(1, 3, ALPHABET);
  const empty = buildReport({ game: "g", run, observations: [] });
  assert.deepEqual(empty.raw_measurements, []);   // défaut

  const withRaw = buildReport({
    game: "g", run, observations: [],
    rawMeasurements: [{ id: "A4_distinct_colors", value: 4213, note: "sans seuil (palette=P2)" }],
  });
  assert.equal(withRaw.raw_measurements[0].value, 4213);
  // un signal brut n'a NI outcome NI seuil (ce n'est pas un jugement)
  assert.ok(!("outcome" in withRaw.raw_measurements[0]));
});

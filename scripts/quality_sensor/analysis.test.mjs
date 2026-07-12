// TDD — fonctions d'analyse PURES du capteur (déterministes, données synthétiques).
// Aucun navigateur : le driver Playwright fournira les données brutes (computed
// styles, getImageData, trace d'état) ; ici on teste le calcul seul. Chaque
// fonction rend une VALEUR BRUTE — aucune ne conclut pass/fail/qualité.
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseRgb,
  contrastRatio,
  emptyDensity,
  distinctColors,
  frameDiff,
  ftueMetrics,
} from "./analysis.mjs";

// --- parseRgb ---------------------------------------------------------------------

test("parseRgb: rgb/rgba parsés, invalide => null", () => {
  assert.deepEqual(parseRgb("rgb(136, 136, 136)"), [136, 136, 136]);
  assert.deepEqual(parseRgb("rgba(0, 0, 0, 0.5)"), [0, 0, 0]);
  assert.equal(parseRgb("transparent"), null);
  assert.equal(parseRgb(""), null);
});

// --- contraste WCAG ---------------------------------------------------------------

test("contrastRatio: noir/blanc = 21, identique = 1", () => {
  assert.ok(Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio([120, 120, 120], [120, 120, 120]) - 1) < 1e-9);
});

test("contrastRatio: #888 sur #777 = contraste très faible (~1.27)", () => {
  const c = contrastRatio([136, 136, 136], [119, 119, 119]);
  assert.ok(c > 1.2 && c < 1.35, `attendu ~1.27, obtenu ${c}`);
  assert.ok(c < 4.5); // sous le seuil-hypothèse AA => signalerait
});

// --- densité d'écran vide (RGBA plat) ---------------------------------------------

function rgba(pixels) {
  // pixels = [[r,g,b], ...] -> Uint8ClampedArray RGBA
  const out = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  });
  return out;
}

test("emptyDensity: fraction de pixels = couleur de fond", () => {
  const data = rgba([[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0],
                     [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0],
                     [0, 0, 0], [255, 0, 0]]); // 9/10 fond noir
  assert.ok(Math.abs(emptyDensity(data, [0, 0, 0], 0) - 0.9) < 1e-9);
});

// --- nombre de couleurs distinctes (signal brut, jamais un seuil dur) ------------

test("distinctColors: compte les couleurs distinctes", () => {
  const data = rgba([[0, 0, 0], [0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 255, 0]]);
  assert.equal(distinctColors(data), 3);
});

// --- réactivité visuelle (diff pixel avant/après input) --------------------------

test("frameDiff: identique = 0, un pixel sur quatre = 0.25", () => {
  const a = rgba([[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  const b = rgba([[0, 0, 0], [0, 0, 0], [0, 0, 0], [255, 255, 255]]);
  assert.equal(frameDiff(a, a), 0);
  assert.ok(Math.abs(frameDiff(a, b) - 0.25) < 1e-9);
});

// --- FTUE mécanique depuis une trace (input -> état) -----------------------------
// samples[i] = { changed:boolean (état a bougé), reward:number (cumulé) }

test("ftueMetrics: premier delta, première récompense, inputs morts, plus long stall", () => {
  const samples = [
    { changed: false, reward: 0 }, // step 1 : rien
    { changed: false, reward: 0 }, // step 2 : rien (stall commence)
    { changed: true, reward: 0 },  // step 3 : bouge enfin
    { changed: true, reward: 5 },  // step 4 : première récompense
    { changed: false, reward: 5 }, // step 5 : mort
  ];
  const m = ftueMetrics(samples);
  assert.equal(m.steps_to_first_delta, 3);
  assert.equal(m.steps_to_first_reward, 4);
  assert.ok(Math.abs(m.dead_input_rate - 3 / 5) < 1e-9);
  assert.equal(m.longest_stall, 2); // les 2 premiers !changed consécutifs
});

test("ftueMetrics: jamais de progrès => null (pas 0, pas un pass)", () => {
  const samples = [
    { changed: false, reward: 0 },
    { changed: false, reward: 0 },
  ];
  const m = ftueMetrics(samples);
  assert.equal(m.steps_to_first_delta, null);
  assert.equal(m.steps_to_first_reward, null);
  assert.equal(m.dead_input_rate, 1);
  assert.equal(m.longest_stall, 2);
});

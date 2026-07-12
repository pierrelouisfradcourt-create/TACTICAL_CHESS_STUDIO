// Fonctions d'analyse PURES du capteur qualité (déterministes, sans navigateur).
// Le driver Playwright fournit les données brutes ; ces fonctions calculent des
// VALEURS BRUTES. Aucune ne conclut pass/fail/qualité (le statut d'observation est
// dérivé par sensor.mjs::evaluate contre un seuil-hypothèse). Aucun LLM, aucun état.

export function parseRgb(str) {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(str || "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

// --- contraste WCAG 2.1 -----------------------------------------------------------

function relLuminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg, bg) {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// --- métriques pixel (RGBA plat : [r,g,b,a, r,g,b,a, ...]) ------------------------

function eachPixel(rgba, fn) {
  for (let i = 0; i < rgba.length; i += 4) fn(rgba[i], rgba[i + 1], rgba[i + 2], i / 4);
}

export function emptyDensity(rgba, bg, tol = 8) {
  let match = 0;
  let total = 0;
  eachPixel(rgba, (r, g, b) => {
    total++;
    if (Math.abs(r - bg[0]) <= tol && Math.abs(g - bg[1]) <= tol && Math.abs(b - bg[2]) <= tol) {
      match++;
    }
  });
  return total ? match / total : null;
}

export function distinctColors(rgba, quantizeBits = 0) {
  const shift = quantizeBits;
  const seen = new Set();
  eachPixel(rgba, (r, g, b) => {
    seen.add(((r >> shift) << 16) | ((g >> shift) << 8) | (b >> shift));
  });
  return seen.size;
}

export function frameDiff(a, b, tol = 8) {
  if (a.length !== b.length || a.length === 0) return null;
  let diff = 0;
  const n = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > tol || Math.abs(a[i + 1] - b[i + 1]) > tol ||
        Math.abs(a[i + 2] - b[i + 2]) > tol) {
      diff++;
    }
  }
  return diff / n;
}

// --- FTUE mécanique : trace [{changed, reward}] -> métriques brutes ---------------

export function ftueMetrics(samples) {
  let firstDelta = null;
  let firstReward = null;
  let dead = 0;
  let stall = 0;
  let longestStall = 0;
  const reward0 = samples.length ? samples[0].reward : 0;
  const baseReward = 0; // récompense mesurée relative au départ (0)
  samples.forEach((s, i) => {
    if (s.changed) {
      if (firstDelta === null) firstDelta = i + 1; // 1-based : nb d'inputs appliqués
      stall = 0;
    } else {
      dead++;
      stall++;
      if (stall > longestStall) longestStall = stall;
    }
    if (firstReward === null && s.reward > baseReward) firstReward = i + 1;
  });
  return {
    steps_to_first_delta: firstDelta,   // null = jamais bougé (pas 0, pas un pass)
    steps_to_first_reward: firstReward, // null = jamais de récompense
    dead_input_rate: samples.length ? dead / samples.length : null,
    longest_stall: longestStall,
  };
}

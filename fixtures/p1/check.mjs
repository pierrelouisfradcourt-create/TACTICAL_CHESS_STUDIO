// Vérificateur de non-régression des fixtures P1 — règles figées du protocole P1.1
// (§5/§6 : familles A1/A2/A3/A5, détection attendue par fixture, contrôle silencieux).
// Exit 0 = capteur conforme à la référence expérimentale ; exit 1 = RÉGRESSION.
// Usage : node scripts/quality_sensor/collect.mjs p1_probe_... puis node fixtures/p1/check.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PERIMETER = ["A1_contrast", "A2_target_size", "A3_empty_density", "A5_h_overflow"];
const EXPECTED = {
  p1_probe_contrast: "A1_contrast",
  p1_probe_tiny_target: "A2_target_size",
  p1_probe_invisible: "A3_empty_density",
  p1_probe_overflow: "A5_h_overflow",
  p1_probe_clean: null, // contrôle : tout signal du périmètre = régression (bruit)
};
const S1_VALID_IDS = new Set(["A1_contrast:#score", "A1_contrast:#lives",
                              "A1_contrast:#level", "A1_contrast:.hud-label"]);
const family = (id) => PERIMETER.find((f) => id === f || id.startsWith(f + ":")) || null;

let regressions = [];
for (const [key, expected] of Object.entries(EXPECTED)) {
  let report;
  try {
    report = JSON.parse(readFileSync(join(REPO, "lab", "forge_sensors", key, "visual_mechanical.json"), "utf-8"));
  } catch {
    regressions.push(`${key}: rapport absent/illisible (lancer collect.mjs d'abord)`);
    continue;
  }
  let detected = false;
  for (const o of report.observations) {
    const fam = family(o.id);
    if (!fam || o.outcome !== "signal_detected") continue;
    const isExpected = fam === expected && (key !== "p1_probe_contrast" || S1_VALID_IDS.has(o.id));
    if (isExpected) detected = true;
    else regressions.push(`${key}: FAUX POSITIF ${o.id}=${o.measured}`);
  }
  if (expected && !detected) regressions.push(`${key}: défaut connu NON détecté (famille ${expected})`);
}

if (regressions.length) {
  console.error("RÉGRESSION CAPTEUR :");
  for (const r of regressions) console.error("  ✗ " + r);
  process.exit(1);
}
console.log("fixtures P1 : 4 détections attendues présentes, contrôle silencieux — capteur conforme");
process.exit(0);

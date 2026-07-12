// Dépouillement mécanique P1.1 — applique les règles figées §5/§6 de
// docs/forge/P1_1_PROTOCOL.md (v2 ratifiée) aux rapports JSON de phase C.
// Zéro paramètre libre : familles, attentes et critères viennent du protocole.
import { readFileSync } from "node:fs";

const PERIMETER = ["A1_contrast", "A2_target_size", "A3_empty_density", "A5_h_overflow"]; // §5
const EXPECTED = {                                   // §3 (famille attendue par sonde)
  _probe_contrast: "A1_contrast",
  _probe_tiny_target: "A2_target_size",
  _probe_invisible: "A3_empty_density",
  _probe_overflow: "A5_h_overflow",
  _probe_clean: null,                                // S5 : toute détection périmètre = FP
};
// §3 : S1 ne se valide que via les 4 IDs HUD (les A1 post-overlay restent FP-éligibles
// pour les AUTRES sondes mais ne valident pas S1) — règle famille §5 + restriction §3.
const S1_VALID_IDS = new Set(["A1_contrast:#score", "A1_contrast:#lives",
                              "A1_contrast:#level", "A1_contrast:.hud-label"]);

const family = (id) => PERIMETER.find((f) => id === f || id.startsWith(f + ":")) || null;

let detections = 0, fps = [], unavailable = [], missing = [];
const lines = [];
for (const [probe, expected] of Object.entries(EXPECTED)) {
  const r = JSON.parse(readFileSync(`lab/forge_sensors/${probe}/visual_mechanical.json`, "utf-8"));
  const obs = r.observations;
  // ID attendu absent du rapport ? (§5 : INVALIDE technique)
  if (expected && !obs.some((o) => family(o.id) === expected)) missing.push(`${probe}:${expected}`);
  let detected = false;
  for (const o of obs) {
    const fam = family(o.id);
    if (!fam) continue;                              // hors périmètre (A6/B*) : documentaire
    if (o.outcome === "metric_unavailable") { unavailable.push(`${probe}:${o.id}`); continue; }
    if (o.outcome !== "signal_detected") continue;
    const isExpected = fam === expected &&
      (probe !== "_probe_contrast" || S1_VALID_IDS.has(o.id));
    if (isExpected) detected = true;
    else fps.push(`${probe}:${o.id}=${o.measured}`);
  }
  if (expected) { if (detected) detections++; lines.push(`${probe}: attendu=${expected} -> ${detected ? "DÉTECTÉ" : "NON détecté"}`); }
  else lines.push(`${probe}: contrôle -> ${fps.filter((f) => f.startsWith(probe)).length === 0 ? "0 signal périmètre" : "SIGNAL(S) = FP"}`);
}

console.log(lines.join("\n"));
console.log(`\ndétections attendues : ${detections}/4`);
console.log(`faux positifs (périmètre, toutes sondes) : ${fps.length}${fps.length ? " -> " + fps.join(", ") : ""}`);
console.log(`metric_unavailable (comptés à part) : ${unavailable.length} -> ${unavailable.join(", ")}`);
console.log(`IDs attendus absents : ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);

// §6 branche nominale : SUCCÈS = ≥3/4 ET 0 FP ET P0 vert 5/5 (vérifié en phase B, logs).
const verdict = missing.length ? "INVALIDE (ID attendu absent)"
  : (detections >= 3 && fps.length === 0) ? "SUCCESS" : "FAILURE";
console.log(`\nexperiment_outcome: ${verdict}`);

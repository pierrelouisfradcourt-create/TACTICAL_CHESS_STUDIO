// Dépouilleur E1 — déterministe, zéro paramètre libre (règles §6 v2 transcrites).
// Usage : node depouille_e1.mjs <chemin visual_mechanical.json>
// Sortie stdout (JSON) : { game, coverage_ok, coverage, canonical, canonical_sha256 }
// Projection canonique (figée AVANT le premier run capteur E1) :
//   {sensor, version, advisory, game, run:{seed,mode,input_sequence}}
//   + observations triées par id : familles A1/A2/A5 -> (id, outcome, measured)
//                                  famille  A3       -> (id, outcome)
//   A4/A6/B* et artifact EXCLUS. Couverture : chaque famille A1/A2/A3/A5
//   >= 1 observation avec measured non-null.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const path = process.argv[2];
if (!path) { console.error("usage: node depouille_e1.mjs <report.json>"); process.exit(2); }
const r = JSON.parse(readFileSync(path, "utf-8"));

const familyOf = (id) => {
  if (id.startsWith("A1_contrast")) return "A1";
  if (id.startsWith("A2_target_size")) return "A2";
  if (id.startsWith("A3_empty_density")) return "A3";
  if (id.startsWith("A5_h_overflow")) return "A5";
  return null; // hors périmètre (A4/A6/B*) — exclu
};

const obs = (r.observations || [])
  .map((o) => ({ o, fam: familyOf(o.id) }))
  .filter((x) => x.fam !== null)
  .sort((a, b) => a.o.id.localeCompare(b.o.id))
  .map(({ o, fam }) =>
    fam === "A3"
      ? { id: o.id, outcome: o.outcome }
      : { id: o.id, outcome: o.outcome, measured: o.measured ?? null }
  );

const coverage = {};
for (const fam of ["A1", "A2", "A3", "A5"]) {
  coverage[fam] = (r.observations || []).some(
    (o) => familyOf(o.id) === fam && o.measured !== null && o.measured !== undefined
  );
}
const coverage_ok = Object.values(coverage).every(Boolean);

const canonical = {
  sensor: r.sensor,
  version: r.version,
  advisory: r.advisory,
  game: r.game,
  run: { seed: r.run?.seed, mode: r.run?.mode, input_sequence: r.run?.input_sequence },
  observations: obs,
};
const canonical_sha256 = createHash("sha256")
  .update(JSON.stringify(canonical))
  .digest("hex");

console.log(JSON.stringify({ game: r.game, coverage_ok, coverage, canonical_sha256, canonical }, null, 2));

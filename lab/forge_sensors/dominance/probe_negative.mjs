// probe_negative.mjs — P1.1 sonde #1 (témoin négatif, DOIT rougir).
//
// Contenu réel copié puis unit_1 (Piquier) ×10 en hp/attack (fixtures/units_rigged.mjs). Le
// capteur DOIT flagger unit_1 en dominance_agreed. Si ce n'est pas le cas, le capteur n'est PAS
// livrable (docs/audit/FORGE_V2_ANNEXE_SANTE_LUDIQUE.md §5) — ce script le rapporte honnêtement.

import { pathToFileURL } from 'node:url';
import { runDominanceSensorSafe } from './dominance_sensor.mjs';
import { UNITS, RIGGED_UNIT_ID_EXPORT } from './fixtures/units_rigged.mjs';
import { K_FROZEN, THRESHOLD_FROZEN, EPSILON_FROZEN } from './protocol_constants.mjs';

export function main() {
  console.log('=== probe_negative (temoin negatif, doit rougir) ===');
  console.log(`Fixture: units_rigged.mjs — ${RIGGED_UNIT_ID_EXPORT} x10 hp/attack`);
  console.log(`K=${K_FROZEN} threshold=${THRESHOLD_FROZEN} epsilon=${EPSILON_FROZEN}`);

  const out = runDominanceSensorSafe(UNITS, { K: K_FROZEN, threshold: THRESHOLD_FROZEN, epsilon: EPSILON_FROZEN });

  if (!out.ok) {
    console.log('sensor_error:', out.sensor_error);
    console.log('RESULT: FAIL (sensor errored — cannot be evaluated as livrable)');
    process.exit(1);
    return;
  }

  const flagged = out.flags.dominance.find(d => d.unitId === RIGGED_UNIT_ID_EXPORT && d.status === 'dominant_agreed');
  console.log('dominance flags:', JSON.stringify(out.flags.dominance, null, 2));

  if (flagged) {
    console.log(`RESULT: PASS — ${RIGGED_UNIT_ID_EXPORT} flagged dominant_agreed as expected`);
    process.exit(0);
  } else {
    console.log(`RESULT: FAIL — ${RIGGED_UNIT_ID_EXPORT} was NOT flagged dominant_agreed. Sensor is NOT livrable as-is.`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

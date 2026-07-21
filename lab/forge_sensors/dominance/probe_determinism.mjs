// probe_determinism.mjs — P1.1 sonde #3 : deux executions meme seed -> rapport identique.
//
// Utilise la fixture rigged (petite, rapide) plutot que le contenu reel pour rester leger ;
// le point teste est le determinisme du capteur lui-meme, pas le contenu.

import { pathToFileURL } from 'node:url';
import { runDominanceSensorSafe } from './dominance_sensor.mjs';
import { UNITS } from './fixtures/units_rigged.mjs';
import { K_FROZEN } from './protocol_constants.mjs';

export function main() {
  console.log('=== probe_determinism (meme seed -> meme rapport, bit pour bit) ===');
  const K = Math.min(K_FROZEN, 10); // borne pour rester rapide ; determinisme n'a pas besoin du K complet
  const run1 = runDominanceSensorSafe(UNITS, { K });
  const run2 = runDominanceSensorSafe(UNITS, { K });

  const s1 = JSON.stringify(run1);
  const s2 = JSON.stringify(run2);
  const identical = s1 === s2;

  console.log(`run1 length=${s1.length} run2 length=${s2.length} identical=${identical}`);
  if (identical) {
    console.log('RESULT: PASS — deux executions identiques bit pour bit');
    process.exit(0);
  } else {
    console.log('RESULT: FAIL — divergence entre deux executions au meme seed');
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

// probe_real.mjs — P1.1 sonde #2 (temoin sain, contenu reel intact).
//
// Rapporte le resultat TEL QUEL. Si le capteur flag une vraie dominance du contenu actuel,
// c'est un RESULTAT ADVISORY (pas un echec de sonde) — mais on distingue signal (politiques
// heterogenes en ACCORD) d'incertitude (politiques en DESACCORD), jamais tranché a la place de
// Pierre. ADVISORY STRICT — n'ecrit rien dans un verdict, sortie toujours 0 (fail-open).

import { pathToFileURL } from 'node:url';
import { runDominanceSensorSafe } from './dominance_sensor.mjs';
import { UNITS } from '../../../games/auto_battler/content/units.v0.mjs';
import { K_FROZEN, THRESHOLD_FROZEN, EPSILON_FROZEN } from './protocol_constants.mjs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export function main() {
  console.log('=== probe_real (temoin sain, contenu reel games/auto_battler) ===');
  console.log(`K=${K_FROZEN} threshold=${THRESHOLD_FROZEN} epsilon=${EPSILON_FROZEN}`);

  const out = runDominanceSensorSafe(UNITS, { K: K_FROZEN, threshold: THRESHOLD_FROZEN, epsilon: EPSILON_FROZEN });

  if (!out.ok) {
    console.log('sensor_error:', out.sensor_error);
    console.log('RESULT: sensor errored on real content (advisory — reported, no gate impact)');
    process.exit(0);
    return;
  }

  const agreed = out.flags.dominance.filter(d => d.status === 'dominant_agreed');
  const uncertain = out.flags.dominance.filter(d => d.status === 'dominant_uncertain');
  const mirrorAgreed = out.flags.mirrorFlags.filter(f => f.status === 'mirror_deviation_agreed');
  const mirrorUncertain = out.flags.mirrorFlags.filter(f => f.status === 'mirror_deviation_uncertain');

  console.log(`\nDominance — AGREED (toutes politiques d'accord, signal advisory): ${agreed.length}`);
  for (const d of agreed) console.log(`  ${d.unitId}:`, JSON.stringify(d.perPolicyFieldRate));

  console.log(`\nDominance — UNCERTAIN (politiques en desaccord, rapporte incertain): ${uncertain.length}`);
  for (const d of uncertain) console.log(`  ${d.unitId}:`, JSON.stringify(d.perPolicyFieldRate));

  console.log(`\nMiroir — deviation AGREED: ${mirrorAgreed.length}`);
  for (const m of mirrorAgreed) console.log(`  ${m.unitId}:`, JSON.stringify(m.perPolicy));

  console.log(`\nMiroir — deviation UNCERTAIN: ${mirrorUncertain.length}`);
  for (const m of mirrorUncertain) console.log(`  ${m.unitId}:`, JSON.stringify(m.perPolicy));

  const dateTag = new Date().toISOString().slice(0, 10);
  const outPath = join(HERE, `report_${dateTag}.json`);
  writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), source: 'games/auto_battler/content/units.v0.mjs', ...out }, null, 2), 'utf-8');
  console.log(`\nRapport ecrit: ${outPath}`);
  console.log('RESULT: reported (advisory, no claim, no gate)');
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wiremapPath = path.join(__dirname, '..', '..', 'lab', 'forge_runs', 'p2_alpha', 'wiremap.json');

const wiremap = JSON.parse(fs.readFileSync(wiremapPath, 'utf8'));
const today = new Date().toISOString().split('T')[0];

// Add statut column for all features
wiremap.features.forEach((feature) => {
  if (!feature.statut) {
    feature.statut = 'IMPLEMENTED';
    feature.version = '1.0.0';
    feature.implemented_at = today;
  }
});

fs.writeFileSync(wiremapPath, JSON.stringify(wiremap, null, 2));
console.log(`[wiremap] Updated ${wiremap.features.length} features with statut=IMPLEMENTED`);

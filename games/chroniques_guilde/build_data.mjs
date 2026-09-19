// Régénère data.js depuis data.json. La page charge data.js, tous les bancs et le portage lisent data.json :
// les deux doivent rester identiques. Usage : node build_data.mjs   (--check pour vérifier sans écrire)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const raw = fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8');
const data = JSON.parse(raw);
const canon = JSON.stringify(data, null, 1) + '\n';
const js = 'window.GUILDE_DATA = ' + JSON.stringify(data) + ';\n';
if (process.argv.indexOf('--check') >= 0) {
  const okJson = raw === canon;
  const okJs = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') === js;
  console.log('data.json canonique : ' + (okJson ? 'OK' : 'NON'));
  console.log('data.js à jour      : ' + (okJs ? 'OK' : 'NON'));
  process.exit(okJson && okJs ? 0 : 1);
}
fs.writeFileSync(path.join(ROOT, 'data.json'), canon, 'utf8');
fs.writeFileSync(path.join(ROOT, 'data.js'), js, 'utf8');
console.log('data.json et data.js régénérés (' + data.items.length + ' objets, ' + data.slots.length + ' emplacements).');

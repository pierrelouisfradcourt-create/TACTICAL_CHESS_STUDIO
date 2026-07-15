#!/usr/bin/env node
// studio_selfaudit.mjs — AUTO-AUDIT du STUDIO Forge (audit cognitif 2026-07-14, levier L1).
//
// L'audit mecanique de la Forge (oracles/mutation/solvabilite) couvre les JEUX produits,
// jamais le STUDIO lui-meme. Resultat : les cartes de reference (STUDIO_ARCHITECTURE.md,
// STUDIO_AGENT_ATLAS.md, STUDIO_MASTER_SCHEMA.html) sont des INSTANTANES qui vieillissent en
// silence — ex. elles marquent `search.mjs` « cible » alors qu'il existe. Ce capteur est le
// composant 5 (audit mecanique permanent) applique AU STUDIO. Deterministe, non-LLM, read-only.
//
// Deux verifications, aucune analyse fragile de prose :
//   A. Derive doc<->realite : `studio_expectations.json` declare ce que les cartes AFFIRMENT
//      (claimed: target|exists) ; l'audit compare a `fs.existsSync`. Mismatch = derive.
//   B. Connecteurs dormants : un connecteur propose-only dont le dernier ecrit est bien plus
//      vieux que la telemetrie (le connecteur le plus actif) est probablement debranche.
//
// Usage : node scripts/forge/studio_selfaudit.mjs [<repoRoot>]
// Sortie : rapport JSON sur stdout + resume lisible sur stderr.
// Exit 0 = studio aligne ; exit 1 = derive detectee (a corriger ou ratifier par Pierre).
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_FILE = 'docs/forge/STUDIO_STATUS.generated.md';

/**
 * Charge le manifeste des affirmations des cartes.
 * @param {string} repoRoot
 * @returns {{doc_claims:Array, connectors:object}}
 */
export function loadExpectations(repoRoot) {
  const p = join(repoRoot, 'scripts', 'forge', 'studio_expectations.json');
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/**
 * Verification A — derive entre ce que les cartes AFFIRMENT et le filesystem reel.
 * @param {string} repoRoot
 * @param {Array<{path:string, claimed:'target'|'exists', source:string}>} docClaims
 * @returns {Array<{path:string, claimed:string, exists:boolean, drift:string, source:string}>}
 */
export function auditDocClaims(repoRoot, docClaims) {
  const findings = [];
  for (const c of docClaims) {
    const exists = existsSync(join(repoRoot, c.path));
    let drift = null;
    if (c.claimed === 'target' && exists) {
      drift = `les cartes marquent « ${c.path} » comme CIBLE/manquant, mais il EXISTE — mettre la carte a jour`;
    } else if (c.claimed === 'exists' && !exists) {
      drift = `les cartes marquent « ${c.path} » comme cable/prouve, mais il est ABSENT — carte fausse ou fichier supprime`;
    }
    if (drift) findings.push({ path: c.path, claimed: c.claimed, exists, drift, source: c.source });
  }
  return findings;
}

/**
 * Verification B — connecteurs propose-only dormants (mtime tres en retard sur la telemetrie).
 * @param {string} repoRoot
 * @param {{reference:string, watched:string[], threshold_days:number}} cfg
 * @returns {Array<{connector:string, status:string, lag_days:number|null, detail:string}>}
 */
export function auditConnectorDormancy(repoRoot, cfg) {
  const findings = [];
  const refPath = join(repoRoot, cfg.reference);
  if (!existsSync(refPath)) {
    // Sans reference active, on ne peut pas juger la dormance — on le dit, on n'invente pas.
    findings.push({ connector: cfg.reference, status: 'reference_absente',
      lag_days: null, detail: 'telemetrie de reference absente — dormance non evaluable' });
    return findings;
  }
  const refMtime = statSync(refPath).mtimeMs;
  const thresholdMs = cfg.threshold_days * DAY_MS;
  for (const rel of cfg.watched) {
    const p = join(repoRoot, rel);
    if (!existsSync(p)) {
      findings.push({ connector: rel, status: 'jamais_ecrit', lag_days: null,
        detail: 'aucun fichier — connecteur jamais utilise (informatif, pas une derive)' });
      continue;
    }
    const lagMs = refMtime - statSync(p).mtimeMs;
    if (lagMs > thresholdMs) {
      findings.push({ connector: rel, status: 'dormant', lag_days: +(lagMs / DAY_MS).toFixed(1),
        detail: `dernier ecrit en retard de ${(lagMs / DAY_MS).toFixed(1)} j sur la telemetrie — probablement debranche` });
    }
  }
  return findings;
}

/**
 * Lance l'audit complet du studio.
 * @param {string} repoRoot
 * @returns {{repoRoot:string, docDrift:Array, dormancy:Array, ok:boolean}}
 */
export function runSelfAudit(repoRoot) {
  const exp = loadExpectations(repoRoot);
  const docDrift = auditDocClaims(repoRoot, exp.doc_claims || []);
  const dormancy = auditConnectorDormancy(repoRoot, exp.connectors || { watched: [] });
  // Seuls les vrais signaux comptent pour le verdict : derive doc + connecteurs dormants.
  // Les statuts purement informatifs (jamais_ecrit, reference_absente) ne font pas echouer.
  const hardDormancy = dormancy.filter((d) => d.status === 'dormant');
  const ok = docDrift.length === 0 && hardDormancy.length === 0;
  return { repoRoot, docDrift, dormancy, ok };
}

/**
 * Evalue CHAQUE element suivi (pas seulement les derives) : la matiere du tableau de faits.
 * @param {string} repoRoot
 * @param {Array<{path:string, claimed:'target'|'exists', source:string}>} docClaims
 * @returns {Array<{path:string, claimed:string, exists:boolean, aligned:boolean}>}
 */
export function evaluateDocClaims(repoRoot, docClaims) {
  return docClaims.map((c) => {
    const exists = existsSync(join(repoRoot, c.path));
    const aligned = (c.claimed === 'exists') === exists;
    return { path: c.path, claimed: c.claimed, exists, aligned };
  });
}

/**
 * Genere le TABLEAU DE FAITS VIVANT — markdown deterministe, relu du disque, SANS
 * horodatage (le fichier ne change que si la REALITE change → zero bruit git). C'est
 * la partie « qui existe » des cartes, sortie de la prose ecrite a la main : elle ne
 * peut plus se perimer. Aucune IA ne touche au raisonnement — que des faits fs.existsSync.
 * @param {string} repoRoot
 * @returns {string} markdown
 */
export function generateStatusTable(repoRoot) {
  const exp = loadExpectations(repoRoot);
  const rows = evaluateDocClaims(repoRoot, exp.doc_claims || []);
  const cfg = exp.connectors || { watched: [] };

  const lines = [];
  lines.push('# ÉTAT FACTUEL DU STUDIO — auto-généré (ne pas éditer à la main)');
  lines.push('');
  lines.push('> ⚠ Fichier **AUTO-GÉNÉRÉ** par `node scripts/forge/studio_selfaudit.mjs --write`. Relu du');
  lines.push('> disque, pas écrit à la main → il ne peut PAS se périmer. Les cartes de référence');
  lines.push('> (STUDIO_ARCHITECTURE · STUDIO_AGENT_ATLAS · STUDIO_MASTER_SCHEMA) citent ce fichier pour');
  lines.push('> la partie « qui existe » ; leur prose (le POURQUOI) reste humaine. `claim_verdict: NO_CLAIM_ALLOWED`.');
  lines.push('');
  lines.push('## Éléments suivis — ce que les cartes affirment vs la réalité disque');
  lines.push('');
  lines.push('| Élément | Carte affirme | Réalité | Statut |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    const claimed = r.claimed === 'exists' ? 'existe' : 'cible (à construire)';
    const reality = r.exists ? '✅ présent' : '⬜ absent';
    const status = r.aligned
      ? (r.exists ? 'aligné' : 'aligné (encore à construire)')
      : '⚠ DÉRIVE — mettre la carte à jour';
    lines.push(`| \`${r.path}\` | ${claimed} | ${reality} | ${status} |`);
  }
  lines.push('');
  lines.push('## Connecteurs propose-only — fraîcheur (retard sur la télémétrie)');
  lines.push('');
  lines.push('| Connecteur | État |');
  lines.push('|---|---|');
  const refPath = join(repoRoot, cfg.reference || '');
  const refMtime = cfg.reference && existsSync(refPath) ? statSync(refPath).mtimeMs : null;
  for (const rel of cfg.watched || []) {
    const p = join(repoRoot, rel);
    let etat;
    if (!existsSync(p)) etat = '· jamais écrit (informatif)';
    else if (refMtime === null) etat = '· référence absente (non évaluable)';
    else {
      const lagDays = (refMtime - statSync(p).mtimeMs) / DAY_MS;
      etat = lagDays > (cfg.threshold_days || 3)
        ? `⚠ dormant (retard ${lagDays.toFixed(1)} j)`
        : '✅ frais';
    }
    lines.push(`| \`${rel}\` | ${etat} |`);
  }
  lines.push('');
  const audit = runSelfAudit(repoRoot);
  lines.push(`**Verdict global** : ${audit.ok ? '✅ ALIGNÉ' : '⚠ DÉRIVE DÉTECTÉE'} `
    + `(dérive doc : ${audit.docDrift.length} · connecteurs dormants : `
    + `${audit.dormancy.filter((d) => d.status === 'dormant').length})`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const positional = args.find((a) => !a.startsWith('--'));
  const repoRoot = positional ? resolve(positional) : resolve(here, '..', '..');
  const r = runSelfAudit(repoRoot);

  console.error(`=== AUTO-AUDIT STUDIO — ${repoRoot} ===\n`);
  console.error(`Derive doc<->realite : ${r.docDrift.length} finding(s)`);
  for (const f of r.docDrift) console.error(`  ⚠ ${f.drift}\n      source: ${f.source}`);
  console.error(`\nConnecteurs : ${r.dormancy.length} note(s)`);
  for (const d of r.dormancy) console.error(`  ${d.status === 'dormant' ? '⚠' : '·'} ${d.connector} — ${d.detail}`);
  console.error(`\nVERDICT : ${r.ok ? 'STUDIO ALIGNE ✅' : 'DERIVE DETECTEE ⚠ (corriger la carte ou ratifier)'}`);

  if (write) {
    const md = generateStatusTable(repoRoot);
    writeFileSync(join(repoRoot, STATUS_FILE), md + '\n', 'utf-8');
    console.error(`\n📝 tableau de faits régénéré → ${STATUS_FILE}`);
  }

  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

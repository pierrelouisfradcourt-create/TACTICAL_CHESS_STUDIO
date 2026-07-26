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
import { spawnSync } from 'node:child_process';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_FILE = 'docs/forge/STUDIO_STATUS.generated.md';
const CONTRACT_SYNC_TIMEOUT_MS = 60000;
const CONTRACT_SYNC_MAX_BUFFER = 20 * 1024 * 1024;
const CONTRACT_SYNC_ANCESTOR_LEVELS = 5;

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
 * Ordre de decouverte de l'interpreteur Python pour le capteur contract_sync — voir
 * FORGE_SYSTEM_CONTRACT.yaml bloc `verification`. Premier existant gagne :
 *   1. <repoRoot>/.venv312/Scripts/python.exe (Windows) ou .../bin/python (POSIX)
 *   2. les MEMES deux chemins dans chaque dossier ancetre de repoRoot, jusqu'a 5 niveaux
 *      (cas worktree : le venv reel vit au depot principal, pas dans le worktree)
 *   3. dernier recours : 'python' puis 'python3' resolus depuis le PATH.
 * @param {string} repoRoot
 * @returns {string[]} candidats a essayer dans l'ordre (un seul si un venv a ete trouve,
 *   sinon la paire de commandes PATH).
 */
export function pythonCandidates(repoRoot) {
  const venvIn = (root) => [
    join(root, '.venv312', 'Scripts', 'python.exe'),
    join(root, '.venv312', 'bin', 'python'),
  ];
  let root = resolve(repoRoot);
  for (const p of venvIn(root)) {
    if (existsSync(p)) return [p];
  }
  for (let level = 0; level < CONTRACT_SYNC_ANCESTOR_LEVELS; level += 1) {
    const parent = dirname(root);
    if (parent === root) break; // racine du filesystem atteinte
    root = parent;
    for (const p of venvIn(root)) {
      if (existsSync(p)) return [p];
    }
  }
  return ['python', 'python3'];
}

/**
 * Verification C — le capteur `contract_sync` (Python, deterministe, non-LLM) est-il
 * synchronise avec le fichier de pilotage ? Cf. FORGE_SYSTEM_CONTRACT.yaml `verification`.
 *
 * Statuts possibles :
 *   - 'ok'            : capteur execute, `passed: true` — aucune regle canonique non citee.
 *   - 'derive'         : capteur execute, `passed: false` — violations remontees telles quelles.
 *   - 'non_evaluable' : le capteur n'a PAS pu tourner (interpreteur introuvable, spawn en
 *     erreur, timeout, exit inattendu, stdout non parsable). DISTINCT de 'derive' a dessein :
 *     ne jamais confondre « le contrat derive » et « je n'ai pas pu verifier » — un controle
 *     qui ne tourne pas n'apporte aucune garantie, le compter vert serait le mode de panne
 *     « declare != execute » que ce capteur existe pour attraper.
 * @param {string} repoRoot
 * @returns {{status:'ok'|'derive'|'non_evaluable', interpreter:string|null, violations:Array, detail:string}}
 */
export function auditContractSync(repoRoot) {
  const candidates = pythonCandidates(repoRoot);
  let lastErrorDetail = 'aucun candidat essaye';

  for (const py of candidates) {
    let r;
    try {
      r = spawnSync(py, ['-m', 'forge.contract_sync', repoRoot, '--json'], {
        cwd: join(repoRoot, 'scripts'),
        encoding: 'utf-8',
        timeout: CONTRACT_SYNC_TIMEOUT_MS,
        maxBuffer: CONTRACT_SYNC_MAX_BUFFER,
        // `contract_sync.py` garde volontairement l'encodage NATIF de la console pour son
        // mode prose (cp1252 possible sous Windows — cf. sa docstring `_harden_streams`).
        // Sans forcer PYTHONIOENCODING ici, un octet accentue (e, a, e...) hors ASCII dans
        // un nom de regle serait lu comme de l'UTF-8 par Node -> corruption SILENCIEUSE
        // (remplacement par U+FFFD) au lieu d'un echec franc. On force donc UTF-8 cote
        // Python UNIQUEMENT pour cet appel machine-a-machine (ne touche pas contract_sync.py).
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });
    } catch (e) {
      lastErrorDetail = `spawn a leve : ${e && e.message ? e.message : String(e)}`;
      continue;
    }

    if (r.error) {
      lastErrorDetail = `interpreteur « ${py} » injoignable : ${r.error.message}`;
      continue; // essaie le candidat suivant (utile pour python -> python3)
    }

    if (r.status === 0 || r.status === 1) {
      try {
        const parsed = JSON.parse(r.stdout);
        if (parsed.passed) {
          return { status: 'ok', interpreter: py, violations: [],
            detail: 'contrat synchronise (mecaniquement) — aucune regle canonique non citee' };
        }
        return { status: 'derive', interpreter: py, violations: parsed.violations || [],
          detail: `${(parsed.violations || []).length} violation(s) — voir la liste ci-dessous` };
      } catch (e) {
        return { status: 'non_evaluable', interpreter: py, violations: [],
          detail: `stdout non parsable en JSON (exit ${r.status}) : ${String(e.message || e).slice(0, 300)}` };
      }
    }

    // exit 2 (non evaluable cote capteur Python) ou tout autre code inattendu.
    let raison = null;
    try { raison = JSON.parse(r.stdout).raison || null; } catch { /* stdout non-JSON, ignore */ }
    const stderrHead = (r.stderr || '').trim().slice(0, 300);
    const cause = raison
      ? `raison rapportee par le capteur : ${raison}`
      : `stderr : ${stderrHead || '(vide)'}`;
    return { status: 'non_evaluable', interpreter: py, violations: [],
      detail: `code de sortie inattendu ${r.status} — ${cause}` };
  }

  return { status: 'non_evaluable', interpreter: null, violations: [],
    detail: `aucun interpreteur Python utilisable trouve (candidats essayes : ${candidates.join(', ')}) — ${lastErrorDetail}` };
}

/**
 * Lance l'audit complet du studio.
 * @param {string} repoRoot
 * @returns {{repoRoot:string, docDrift:Array, dormancy:Array, contractSync:object, ok:boolean}}
 */
export function runSelfAudit(repoRoot) {
  const exp = loadExpectations(repoRoot);
  const docDrift = auditDocClaims(repoRoot, exp.doc_claims || []);
  const dormancy = auditConnectorDormancy(repoRoot, exp.connectors || { watched: [] });
  // Seuls les vrais signaux comptent pour le verdict : derive doc + connecteurs dormants.
  // Les statuts purement informatifs (jamais_ecrit, reference_absente) ne font pas echouer.
  const hardDormancy = dormancy.filter((d) => d.status === 'dormant');
  const contractSync = auditContractSync(repoRoot);
  // non_evaluable fait echouer l'audit au meme titre qu'une derive, mais reste un statut
  // DISTINCT dans la sortie (contractSync.status) — jamais confondu avec 'derive'.
  const ok = docDrift.length === 0 && hardDormancy.length === 0 && contractSync.status === 'ok';
  return { repoRoot, docDrift, dormancy, contractSync, ok };
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

  lines.push('## Contrat de système Forge — règles canoniques citées par le pilotage');
  lines.push('');
  lines.push('| Règle | Symboles attendus | Verdict |');
  lines.push('|---|---|---|');
  const cs = audit.contractSync;
  const escapeCell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 400);
  if (cs.status === 'ok') {
    lines.push('| *(toutes les règles canoniques)* | — | ✅ synchronisé (mécaniquement) |');
  } else if (cs.status === 'non_evaluable') {
    lines.push(`| *(non évaluable)* | — | ⚠ NON ÉVALUABLE — ${escapeCell(cs.detail)} |`);
  } else {
    // Deterministe : trie par nom de regle puis par premier symbole attendu — jamais
    // l'ordre du filesystem ou du processus (contrainte dure : zero bruit git).
    const sorted = [...cs.violations].sort((a, b) => {
      const ra = a.regle || '';
      const rb = b.regle || '';
      if (ra !== rb) return ra < rb ? -1 : 1;
      const sa = (a.symboles_attendus && a.symboles_attendus[0]) || '';
      const sb = (b.symboles_attendus && b.symboles_attendus[0]) || '';
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    for (const v of sorted) {
      const symbols = (v.symboles_attendus && v.symboles_attendus.length)
        ? v.symboles_attendus.join(', ') : '—';
      lines.push(`| ${escapeCell(v.regle || '<sans nom>')} | \`${escapeCell(symbols)}\` | ⚠ ${escapeCell(v.type || 'derive')} |`);
    }
  }
  lines.push('');

  const hardDormantCount = audit.dormancy.filter((d) => d.status === 'dormant').length;
  lines.push(`**Verdict global** : ${audit.ok ? '✅ ALIGNÉ' : '⚠ DÉRIVE DÉTECTÉE'} `
    + `(dérive doc : ${audit.docDrift.length} · connecteurs dormants : ${hardDormantCount} · `
    + `contrat de système : ${cs.status})`);
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

  console.error(`\nContrat de système Forge : ${r.contractSync.status.toUpperCase()}`);
  console.error(`  ${r.contractSync.detail}`);
  if (r.contractSync.status === 'derive') {
    for (const v of r.contractSync.violations) {
      const symbols = (v.symboles_attendus && v.symboles_attendus.length)
        ? v.symboles_attendus.join(', ') : '(aucun)';
      console.error(`  - [${v.type}] ${v.regle} — symboles attendus: ${symbols}`);
    }
  }
  // non_evaluable reste un statut DISTINCT de 'derive' : un controle qui n'a pas pu tourner
  // n'apporte aucune garantie, il ne doit jamais etre confondu avec une derive constatee.

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

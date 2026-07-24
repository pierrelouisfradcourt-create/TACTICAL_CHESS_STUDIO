#!/usr/bin/env node
// apply_decisions.mjs — R4 (audit docs/audit/FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md).
//
// CONSTAT REPARE : lab/reports/pending_review_decisions.jsonl contient les decisions
// HumanGate (Pierre) du 2026-07-20 ({ts, queue, item, decision, motif}), ecrites A LA MAIN
// apres lecture de pending_review.mjs. AUCUN code ne les appliquait aux propositions
// sources : le fichier de decisions etait une note morte, jamais reliee mecaniquement aux
// 3 files lues par pending_review.mjs (regle memoire "structured_field_not_comment" —
// une intention non reliee mecaniquement finit par diverger). Ce script ferme CE maillon
// precis, rien de plus.
//
// CHAINE COMPLETE (R5 — documentee ici, jamais dans un nouveau fichier de doc) :
//   1. proposals.jsonl (forge_ledger_proposals / forge_project_proposals / error_proposals)
//      — EXISTE, ecrit par le pipeline Forge (driver/error_journal).
//   2. pending_review.mjs — EXISTE, lecteur READ-ONLY qui agrege les 3 files (aucune
//      decision stockee, colonnes Accept/Reject/Postpone vides pour Pierre en session).
//   3. decision Pierre (pending_review_decisions.jsonl) — EXISTE mais MANUEL : Pierre note
//      sa decision en session, aucun outil ne l'ecrit pour lui (c'est voulu, HumanGate).
//   4. statut final sur la proposition — MANQUAIT avant ce script. CE fichier (apply_decisions.mjs)
//      ferme ce maillon : il appose un champ structure (review_status/review_ts/review_source)
//      sur la proposition correspondante. Idempotent, jamais destructif, jamais un juge.
//   5. promotion vers lab/chains/IMPROVEMENT_LEDGER.yaml — reste VOLONTAIREMENT MANUEL.
//      Doctrine HumanGate (CLAUDE.md) : Pierre decide merge/reject/freeze, jamais un script.
//      Ce script N'ECRIT JAMAIS dans le ledger canonique et ne le lira meme pas. La promotion
//      materielle est une etape 3 separee et ratifiee ailleurs (Resolver V1, note du
//      2026-07-20 dans pending_review_decisions.jsonl) — pas le role de ce fichier.
//
// REGLE DE RAPPROCHEMENT (reverse-engineree sur les decisions REELLES du 2026-07-20, car
// aucun schema formel ne lie decision.item a un champ de proposition) : pour chaque queue,
// une liste de champs candidats est essayee dans l'ordre, EGALITE STRICTE UNIQUEMENT (jamais
// de sous-chaine, jamais de fuzzy-match — "jamais inventee") :
//   - forge_ledger_proposals  : ['run_id', 'project']   (les decisions du 20/07 visent le run_id)
//   - forge_project_proposals : ['project', 'folder']   (ce fichier n'a pas de run_id)
//   - error_proposals         : ['error_signature', 'proposal_id', 'title']
// Si aucun champ candidat n'egale item -> la decision est ORPHELINE (jamais une proposition
// inventee). Exemple reel observe : la decision error_proposals du 20/07 ("council contract
// write-path interdit") ne correspond A AUCUN champ exact de l'unique ligne error_proposals.jsonl
// reelle (ni error_signature, ni title) -> orpheline, signalee, PAS forcee.
//
// Lignes de pending_review_decisions.jsonl SANS {queue, item, decision} (ex. la ligne meta
// de synthese du 20/07, ou la note de fin de session) sont des entrees narratives, pas des
// decisions item-par-item : elles sont comptees en `skipped_meta`, jamais en orpheline.
//
// Mode par defaut = --dry-run (aucune ecriture). --apply seul declenche l'ecriture reelle,
// avec backup .bak du fichier de propositions AVANT toute reecriture. Idempotent : rejouer
// --apply sur un etat deja applique => 0 changement (already_up_to_date).
//
// Usage : node scripts/forge/apply_decisions.mjs [--repo-root <path>] [--apply]
//         [--decisions-file <path relatif au repo-root>]
// Exit codes : 0 = execution normale (y compris orphelines/conflits, qui sont des rapports,
//              pas des echecs) ; 2 = erreur interne inattendue (ex. decisions-file illisible).
//
// claim_verdict: NO_CLAIM_ALLOWED — ce script ne juge rien, il rapporte l'etat mecanique.
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { QUEUE_FILES } from './pending_review.mjs';

export const DEFAULT_DECISIONS_FILE = 'lab/reports/pending_review_decisions.jsonl';

// Champs candidats essayes dans l'ordre, egalite stricte uniquement, PAR queue id.
export const MATCH_FIELDS = {
  forge_ledger_proposals: ['run_id', 'project'],
  forge_project_proposals: ['project', 'folder'],
  error_proposals: ['error_signature', 'proposal_id', 'title'],
};

const DECISION_TO_STATUS = { ACCEPT: 'ACCEPTED', REJECT: 'REJECTED' };

/**
 * Charge et parse pending_review_decisions.jsonl. Lignes corrompues -> ignorees, jamais fatal.
 * @param {string} repoRoot
 * @param {string} relPath
 * @returns {{status:'OK'|'ABSENT', raw:object[], ignored_lines:number}}
 */
export function loadDecisions(repoRoot, relPath) {
  const full = join(repoRoot, relPath);
  if (!existsSync(full)) return { status: 'ABSENT', raw: [], ignored_lines: 0 };
  const text = readFileSync(full, 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const raw = [];
  let ignored = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) { ignored += 1; continue; }
      raw.push(parsed);
    } catch { ignored += 1; }
  }
  return { status: 'OK', raw, ignored_lines: ignored };
}

/**
 * Une decision est "actionnable" (item-par-item) si elle porte queue+item+decision valide.
 * Tout le reste (notes, synthese de session) est narratif -> skipped_meta.
 * @param {object} d
 * @returns {boolean}
 */
export function isActionableDecision(d) {
  return typeof d.queue === 'string' && d.queue.trim() !== ''
    && typeof d.item === 'string' && d.item.trim() !== ''
    && (d.decision === 'ACCEPT' || d.decision === 'REJECT');
}

/**
 * Charge une file JSONL de propositions en conservant les lignes brutes (pour reecriture
 * fidele) ET le parse (pour matching). Ligne corrompue -> conservee telle quelle, jamais touchee.
 * @param {string} repoRoot
 * @param {string} relPath
 * @returns {{status:'OK'|'ABSENT', lines:Array<{raw:string, parsed:object|null}>}}
 */
export function loadProposalLines(repoRoot, relPath) {
  const full = join(repoRoot, relPath);
  if (!existsSync(full)) return { status: 'ABSENT', lines: [] };
  const text = readFileSync(full, 'utf-8');
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const lines = rawLines.map((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { raw, parsed: null };
      return { raw, parsed };
    } catch { return { raw, parsed: null }; }
  });
  return { status: 'OK', lines };
}

/**
 * Trouve les indices de lignes dont un champ candidat egale item (egalite stricte).
 * @param {Array<{raw:string, parsed:object|null}>} lines
 * @param {string[]} candidateFields
 * @param {string} item
 * @returns {number[]}
 */
export function matchLines(lines, candidateFields, item) {
  const idx = [];
  lines.forEach((l, i) => {
    if (!l.parsed) return;
    for (const f of candidateFields) {
      if (Object.prototype.hasOwnProperty.call(l.parsed, f) && String(l.parsed[f]) === item) {
        idx.push(i);
        return;
      }
    }
  });
  return idx;
}

/**
 * Coeur de la logique : applique (ou simule) toutes les decisions actionnables sur les
 * files de propositions QUEUE_FILES. N'ecrit RIEN sur disque ici (le caller decide, voir main()).
 * @param {string} repoRoot
 * @param {string} decisionsFile
 * @returns {object} recap complet + etat des fichiers en memoire (pour ecriture eventuelle)
 */
export function planDecisions(repoRoot, decisionsFile) {
  const decisionsLoad = loadDecisions(repoRoot, decisionsFile);
  const queueById = new Map(QUEUE_FILES.map((q) => [q.id, q]));

  // Etat en memoire des fichiers de propositions touches, cle = queue id.
  const fileState = new Map(); // id -> { path, status, lines }

  const changes = [];
  const already_up_to_date = [];
  const conflicts = [];
  const orphaned = [];
  let skipped_meta = 0;

  for (const d of decisionsLoad.raw) {
    if (!isActionableDecision(d)) { skipped_meta += 1; continue; }

    const queueCfg = queueById.get(d.queue);
    if (!queueCfg) {
      orphaned.push({ queue: d.queue, item: d.item, decision: d.decision, reason: `queue inconnue (pas dans QUEUE_FILES) : "${d.queue}"` });
      continue;
    }
    const candidateFields = MATCH_FIELDS[d.queue];
    if (!candidateFields) {
      orphaned.push({ queue: d.queue, item: d.item, decision: d.decision, reason: `aucune regle de rapprochement definie pour la queue "${d.queue}"` });
      continue;
    }

    if (!fileState.has(d.queue)) {
      const loaded = loadProposalLines(repoRoot, queueCfg.path);
      fileState.set(d.queue, { path: queueCfg.path, status: loaded.status, lines: loaded.lines });
    }
    const state = fileState.get(d.queue);
    if (state.status === 'ABSENT') {
      orphaned.push({ queue: d.queue, item: d.item, decision: d.decision, reason: `fichier de propositions absent : ${state.path}` });
      continue;
    }

    const matchIdx = matchLines(state.lines, candidateFields, d.item);
    if (matchIdx.length === 0) {
      orphaned.push({ queue: d.queue, item: d.item, decision: d.decision, reason: `aucune proposition dans ${state.path} ne correspond a "${d.item}" sur les champs ${JSON.stringify(candidateFields)}` });
      continue;
    }

    const requestedStatus = DECISION_TO_STATUS[d.decision];
    for (const i of matchIdx) {
      const entry = state.lines[i];
      const existing = entry.parsed.review_status;
      if (existing === undefined) {
        changes.push({ queue: d.queue, item: d.item, path: state.path, line_index: i, requested_status: requestedStatus, decision_ts: d.ts, motif: d.motif || null });
        // Marque en memoire — reecriture reelle geree par le caller (mode apply).
        entry.parsed = {
          ...entry.parsed,
          review_status: requestedStatus,
          review_ts: d.ts,
          review_source: decisionsFile,
        };
        entry.pending_write = true;
      } else if (existing === requestedStatus) {
        already_up_to_date.push({ queue: d.queue, item: d.item, path: state.path, line_index: i, status: existing });
      } else {
        conflicts.push({ queue: d.queue, item: d.item, path: state.path, line_index: i, existing_status: existing, requested_status: requestedStatus });
      }
    }
  }

  return {
    decisions_file_status: decisionsLoad.status,
    decisions_ignored_lines: decisionsLoad.ignored_lines,
    fileState,
    changes,
    already_up_to_date,
    conflicts,
    orphaned,
    skipped_meta,
  };
}

/**
 * Ecrit reellement sur disque les fichiers de propositions modifies (mode --apply). Backup
 * .bak AVANT toute reecriture. N'ecrit QUE les fichiers ayant au moins une ligne pending_write.
 * @param {string} repoRoot
 * @param {Map<string, {path:string, status:string, lines:Array}>} fileState
 * @returns {string[]} chemins ecrits
 */
export function writeChanges(repoRoot, fileState) {
  const written = [];
  for (const [, state] of fileState) {
    const hasChange = state.lines.some((l) => l.pending_write);
    if (!hasChange) continue;
    const full = join(repoRoot, state.path);
    copyFileSync(full, `${full}.bak`);
    const outLines = state.lines.map((l) => (l.pending_write ? JSON.stringify(l.parsed) : l.raw));
    writeFileSync(full, outLines.join('\n') + '\n', 'utf-8');
    written.push(state.path);
  }
  return written;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const args = process.argv.slice(2);
  const repoRootFlagIdx = args.indexOf('--repo-root');
  const repoRoot = repoRootFlagIdx !== -1 ? resolve(args[repoRootFlagIdx + 1]) : resolve(here, '..', '..');
  const decisionsFlagIdx = args.indexOf('--decisions-file');
  const decisionsFile = decisionsFlagIdx !== -1 ? args[decisionsFlagIdx + 1] : DEFAULT_DECISIONS_FILE;
  const apply = args.includes('--apply');

  let plan;
  try {
    plan = planDecisions(repoRoot, decisionsFile);
  } catch (err) {
    console.error(`[apply_decisions] ERREUR INTERNE : ${err.message}`);
    process.exit(2);
  }

  let written = [];
  if (apply) {
    written = writeChanges(repoRoot, plan.fileState);
  }

  console.error(`=== apply_decisions — ${apply ? 'APPLY (ecriture reelle)' : 'DRY-RUN (aucune ecriture)'} ===\n`);
  console.error(`Fichier decisions : ${decisionsFile} (${plan.decisions_file_status}${plan.decisions_ignored_lines ? `, ${plan.decisions_ignored_lines} ligne(s) ignoree(s)` : ''})`);
  console.error(`Entrees narratives ignorees (skipped_meta) : ${plan.skipped_meta}`);
  console.error(`\n${apply ? 'Appliquees' : 'A appliquer (simulees)'} : ${plan.changes.length}`);
  for (const c of plan.changes) console.error(`  · ${c.queue} / "${c.item}" -> ${c.requested_status} (${c.path}#${c.line_index})`);
  console.error(`\nDeja a jour : ${plan.already_up_to_date.length}`);
  console.error(`\nConflits (non ecrases) : ${plan.conflicts.length}`);
  for (const c of plan.conflicts) console.error(`  ⚠ ${c.queue} / "${c.item}" : statut existant "${c.existing_status}" != demande "${c.requested_status}" (${c.path}#${c.line_index})`);
  console.error(`\nOrphelines (aucune proposition correspondante — jamais inventee) : ${plan.orphaned.length}`);
  for (const o of plan.orphaned) console.error(`  ⚠ ${o.queue} / "${o.item}" — ${o.reason}`);
  if (apply) {
    console.error(`\nFichiers reecrits (backup .bak cree avant) : ${written.length ? written.join(', ') : '(aucun)'}`);
  } else {
    console.error(`\n(dry-run : aucun fichier touche — relancer avec --apply pour ecrire reellement)`);
  }
  console.error(`\nclaim_verdict: NO_CLAIM_ALLOWED`);

  const payload = {
    mode: apply ? 'apply' : 'dry-run',
    decisions_file: decisionsFile,
    decisions_file_status: plan.decisions_file_status,
    skipped_meta: plan.skipped_meta,
    changes: plan.changes,
    already_up_to_date: plan.already_up_to_date,
    conflicts: plan.conflicts,
    orphaned: plan.orphaned,
    written_files: written,
    claim_verdict: 'NO_CLAIM_ALLOWED',
  };
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

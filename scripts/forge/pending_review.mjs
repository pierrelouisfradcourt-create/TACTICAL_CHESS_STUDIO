#!/usr/bin/env node
// pending_review.mjs — Knowledge Resolver V1, pièce 2/2 (contrat :
// docs/forge/KNOWLEDGE_RESOLVER_V1_PROTOCOL.md, statut PROPOSED en attente gate Pierre).
//
// Rôle : lecteur READ-ONLY qui agrège les 3 files de propositions dormantes existantes
// (aucune n'a de lecteur aujourd'hui — 0 % lues) et calcule des FEATURES DÉTERMINISTES
// BRUTES : fichier source, sujet d'origine, âge en jours, nombre d'occurrences du même
// sujet, champs de reproduction si présents. AUCUN score pondéré, AUCUN pourcentage de
// confiance — interdit par le cadre ratifié (le score advisory viendra plus tard, jamais
// juge de promotion). Les colonnes Accept/Reject/Postpone sont des colonnes VIDES pour
// Pierre en session ; cet outil ne stocke ni ne calcule aucune décision.
//
// Fichiers agrégés (chemins réels, schémas DIFFÉRENTS — voir plus bas) :
//   lab/reports/forge_ledger_proposals.jsonl   — clé sujet: "project"     · horodatage: "ts" (epoch s)
//   lab/reports/forge_project_proposals.jsonl  — clé sujet: "project"     · horodatage: "ts" (epoch s)
//   lab/reports/error_proposals.jsonl          — clé sujet: "error_signature" · horodatage: "created_ts" (epoch s)
//   lab/reports/forge_bible_proposals.jsonl    — clé sujet: "project"     · horodatage: "ts" (epoch s)
//     (4e file, `studio_link.propose_bible_entry` — PROPOSE-ONLY, promotion 100% humaine
//     vers lab/forge_runs/<projet>/PROJECT_BIBLE.md ; record réel : project/kind/decision/
//     rationale/status/ts — voir PASSTHROUGH_FIELDS ci-dessous pour kind/rationale)
//   lab/reports/forge_brick_proposals.jsonl    — clé sujet: "brick_id"    · horodatage: "ts" (epoch s)
//     (5e file, `studio_link.propose_brick` — le dépositaire, PROPOSE-ONLY, ratification
//     Pierre 2026-07-23 ; promotion 100% humaine vers knowledge_base/catalog.json ; record
//     réel : type("brick")/brick_id/run_id/project/kind/function/path/status/ts — clé sujet
//     "brick_id" (pas "project") car deux propositions du MÊME projet peuvent porter des
//     briques DIFFÉRENTES — voir PASSTHROUGH_FIELDS ci-dessous pour brick_id/kind/function/path)
//   Un fichier absent est signalé ABSENT — jamais une erreur fatale.
//
// Dédoublonnage ("occurrences du même sujet") : DOCUMENTÉ ainsi — deux items du MÊME
// fichier source partageant la même clé sujet (project, ou error_signature) sont considérés
// comme le même sujet. On ne dédoublonne PAS across les fichiers de file (leurs clés ne sont pas
// comparables : un "project" de forge_ledger_proposals et un "error_signature" ne désignent
// pas la même notion). Si le champ clé est absent sur un item, une clé de repli est utilisée
// (voir KEY_FALLBACK_PREFIX) et l'item est marqué `key_fallback: true` — jamais un crash.
//
// Tri déterministe (documenté, proposé) : occurrences décroissantes, puis âge décroissant
// (le plus ancien remonte), puis fichier source (ordre alphabétique), puis ordre de lecture
// original — stable, reproductible à froid.
//
// Affichage : table lisible humain (stderr) plafonnée aux 5 premiers items + JSON complet
// (stdout) avec le compte total TOUJOURS présent (aucun volume caché derrière le plafond).
//
// Usage : node scripts/forge/pending_review.mjs [--repo-root <path>] [--top N]
// Exit codes : 0 = agrégation exécutée (y compris 0 item, y compris fichiers absents) ·
//              2 = erreur interne inattendue.
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const QUEUE_FILES = [
  { id: 'forge_ledger_proposals', path: 'lab/reports/forge_ledger_proposals.jsonl', subject_field: 'project', ts_field: 'ts' },
  { id: 'forge_project_proposals', path: 'lab/reports/forge_project_proposals.jsonl', subject_field: 'project', ts_field: 'ts' },
  { id: 'error_proposals', path: 'lab/reports/error_proposals.jsonl', subject_field: 'error_signature', ts_field: 'created_ts' },
  // 4e file (studio_link.propose_bible_entry) : même clé sujet que ledger/project
  // ("project" — record réel écrit par la fonction), même champ d'horodatage epoch
  // secondes ("ts", via studio_link.time.time()). Un fichier absent reste ABSENT,
  // jamais une erreur.
  { id: 'forge_bible_proposals', path: 'lab/reports/forge_bible_proposals.jsonl', subject_field: 'project', ts_field: 'ts' },
  // 5e file (studio_link.propose_brick — le dépositaire). Clé sujet "brick_id" (PAS
  // "project" comme les 4 files ci-dessus) : le sujet examiné par Pierre est LA BRIQUE,
  // pas le projet qui l'a produite — deux propositions du même projet peuvent porter des
  // briques distinctes et ne doivent pas être comptées comme « le même sujet ». Même champ
  // d'horodatage epoch secondes ("ts"). Un fichier absent reste ABSENT, jamais une erreur.
  { id: 'forge_brick_proposals', path: 'lab/reports/forge_brick_proposals.jsonl', subject_field: 'brick_id', ts_field: 'ts' },
];

const KEY_FALLBACK_PREFIX = '__no_subject_field__:';
const DEFAULT_TOP = 5;

// Champs "de reproduction" optionnels rencontrés dans les schémas réels — passés tels
// quels s'ils sont présents. AUCUN champ nommé "reproduction" n'existe dans les données
// réelles actuelles (2026-07-20) : ceci est un écart signalé, pas résolu en silence — voir
// le rapport de livraison.
const PASSTHROUGH_FIELDS = [
  'run_id', 'project', 'folder', 'stage', 'software_verdict', 'decision', 'clean_pass',
  'lane', 'status', 'error_excerpt', 'title', 'oracle_type', 'source', 'proposal_id',
  'error_signature', 'closed', 'ecg_state',
  // forge_bible_proposals (studio_link.propose_bible_entry) : 'decision' est déjà
  // couvert ci-dessus (même nom de champ que ledger) ; 'kind' et 'rationale' sont
  // spécifiques à ce record réel (kind ∈ {"validated","abandoned"}, rationale =
  // le pourquoi, la mémoire la plus précieuse pour un "abandoned").
  'kind', 'rationale',
  // forge_brick_proposals (studio_link.propose_brick, le dépositaire) : 'kind' est déjà
  // couvert ci-dessus (même nom de champ, sens différent ici : BRICK_SPEC::kind ∈
  // {"system","pattern","template"}) ; 'brick_id', 'function' et 'path' sont spécifiques —
  // 'path' est la preuve que le code existe déjà sur disque (pas une intention), 'function'
  // la description courte que Pierre relit pour décider de la promotion.
  'brick_id', 'function', 'path',
];

export const OUT_OF_SCOPE = [
  'aucune donnée "reproduction" dédiée n\'existe dans les fichiers de file actuels — le '
    + 'passthrough expose les champs optionnels disponibles (voir PASSTHROUGH_FIELDS), pas un '
    + 'champ "reproduction" formel qui n\'existe simplement pas encore.',
  'la logique "anti-postpone" du protocole (§5 : un Postpone revient en tête de file à '
    + 'échéance) N\'EST PAS implémentée ici : cet outil ne stocke aucune décision (spec §3), donc '
    + 'il n\'a pas la mémoire d\'un Postpone antérieur. Cette mémoire vit dans l\'enregistrement de '
    + 'gate de session (mécanisme existant), pas dans cet outil — c\'est l\'orchestrateur qui '
    + 'devra réinjecter les Postpone échus s\'il veut ce comportement.',
  'dédoublonnage strictement intra-fichier (voir commentaire d\'en-tête) : un même sujet logique '
    + 'répété dans 2 fichiers différents (ex. un projet à la fois dans forge_ledger_proposals et '
    + 'forge_project_proposals) compte comme 2 sujets distincts, pas 1.',
];

/**
 * Charge et parse une file JSONL, tolérante aux lignes corrompues.
 * @param {string} repoRoot
 * @param {{id:string, path:string, subject_field:string, ts_field:string}} fileCfg
 * @returns {{id:string, path:string, status:'OK'|'ABSENT', raw_items:object[], ignored_lines:number, total_lines:number}}
 */
export function loadQueueFile(repoRoot, fileCfg) {
  const full = join(repoRoot, fileCfg.path);
  if (!existsSync(full)) {
    return { id: fileCfg.id, path: fileCfg.path, status: 'ABSENT', raw_items: [], ignored_lines: 0, total_lines: 0 };
  }
  const text = readFileSync(full, 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const rawItems = [];
  let ignored = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        ignored += 1;
        continue;
      }
      rawItems.push(parsed);
    } catch {
      ignored += 1;
    }
  }
  return { id: fileCfg.id, path: fileCfg.path, status: 'OK', raw_items: rawItems, ignored_lines: ignored, total_lines: lines.length };
}

/**
 * Normalise un item brut en record avec features déterministes brutes.
 * @param {{id:string, subject_field:string, ts_field:string}} fileCfg
 * @param {object} rawItem
 * @param {number} nowEpochS
 * @returns {object}
 */
export function normalizeItem(fileCfg, rawItem, nowEpochS) {
  const subjectRaw = rawItem[fileCfg.subject_field];
  const hasSubject = subjectRaw !== undefined && subjectRaw !== null && String(subjectRaw).trim() !== '';
  const subjectKey = hasSubject ? String(subjectRaw) : `${KEY_FALLBACK_PREFIX}${JSON.stringify(rawItem)}`;

  const tsRaw = rawItem[fileCfg.ts_field];
  const tsValid = typeof tsRaw === 'number' && Number.isFinite(tsRaw);
  const ageDays = tsValid ? (nowEpochS - tsRaw) / 86400 : null;

  const origin = rawItem.run_id || rawItem.project || rawItem.folder || rawItem.proposal_id || null;
  const label = rawItem.title || rawItem.run_id || rawItem.project || rawItem.error_signature || rawItem.proposal_id || '(sans titre)';

  const passthrough = {};
  for (const f of PASSTHROUGH_FIELDS) {
    if (rawItem[f] !== undefined) passthrough[f] = rawItem[f];
  }

  return {
    source_file: fileCfg.id,
    subject_key: subjectKey,
    key_fallback: !hasSubject,
    origin,
    label,
    age_days: ageDays === null ? null : Math.round(ageDays * 100) / 100,
    ts_field_present: tsValid,
    fields: passthrough,
    decision: null, // colonne vide — Pierre décide en session, jamais stockée par cet outil
  };
}

/**
 * Agrège les 3 files, calcule occurrences, trie de façon déterministe.
 * @param {string} repoRoot
 * @param {number} [nowEpochS]
 * @returns {{sources:object[], total_items:number, ranked:object[]}}
 */
export function aggregate(repoRoot, nowEpochS = Date.now() / 1000) {
  const sources = [];
  const normalized = [];
  for (const cfg of QUEUE_FILES) {
    const loaded = loadQueueFile(repoRoot, cfg);
    sources.push({ id: loaded.id, path: loaded.path, status: loaded.status, item_count: loaded.raw_items.length, ignored_lines: loaded.ignored_lines });
    loaded.raw_items.forEach((raw, idx) => {
      normalized.push({ ...normalizeItem(cfg, raw, nowEpochS), _origIndex: normalized.length, _fileIndex: idx });
    });
  }

  const occCounts = new Map();
  for (const it of normalized) {
    const k = `${it.source_file}::${it.subject_key}`;
    occCounts.set(k, (occCounts.get(k) || 0) + 1);
  }
  for (const it of normalized) {
    it.occurrences = occCounts.get(`${it.source_file}::${it.subject_key}`);
  }

  const ranked = [...normalized].sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    const ageA = a.age_days === null ? -Infinity : a.age_days;
    const ageB = b.age_days === null ? -Infinity : b.age_days;
    if (ageB !== ageA) return ageB - ageA;
    if (a.source_file !== b.source_file) return a.source_file < b.source_file ? -1 : 1;
    return a._origIndex - b._origIndex;
  }).map(({ _origIndex, _fileIndex, ...rest }) => rest);

  return { sources, total_items: normalized.length, ranked };
}

function formatTable(ranked, top) {
  const shown = ranked.slice(0, top);
  const lines = [];
  lines.push('#  | source                    | sujet                                  | occ | âge(j) | Accept | Reject | Postpone');
  lines.push('---+---------------------------+-----------------------------------------+-----+--------+--------+--------+---------');
  shown.forEach((it, i) => {
    const label = String(it.label).slice(0, 40).padEnd(40);
    const src = it.source_file.padEnd(25);
    const age = it.age_days === null ? '  ?   ' : String(it.age_days).padEnd(6);
    lines.push(`${String(i + 1).padEnd(2)} | ${src} | ${label} | ${String(it.occurrences).padEnd(3)} | ${age} |   ·    |   ·    |    ·`);
  });
  return lines.join('\n');
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const args = process.argv.slice(2);
  const repoRootFlagIdx = args.indexOf('--repo-root');
  const repoRoot = repoRootFlagIdx !== -1 ? resolve(args[repoRootFlagIdx + 1]) : resolve(here, '..', '..');
  const topFlagIdx = args.indexOf('--top');
  const top = topFlagIdx !== -1 ? Number(args[topFlagIdx + 1]) || DEFAULT_TOP : DEFAULT_TOP;

  let result;
  try {
    result = aggregate(repoRoot);
  } catch (err) {
    console.error(`[pending_review] ERREUR INTERNE : ${err.message}`);
    process.exit(2);
  }

  console.error('=== pending_review — file de propositions dormantes (READ-ONLY) ===\n');
  for (const s of result.sources) {
    if (s.status === 'ABSENT') {
      console.error(`  ABSENT   ${s.path}`);
    } else {
      console.error(`  OK       ${s.path} — ${s.item_count} item(s)${s.ignored_lines ? `, ${s.ignored_lines} ligne(s) ignorée(s) (corrompues)` : ''}`);
    }
  }
  console.error(`\nTotal items agrégés (toutes files) : ${result.total_items}`);
  console.error(`Affichés (plafond ${top}, compte total ci-dessus toujours réel) : ${Math.min(top, result.total_items)}\n`);
  console.error(formatTable(result.ranked, top));
  console.error('\nAccept / Reject / Postpone : colonnes vides à remplir par Pierre en session.');
  console.error('Cet outil n\'écrit et ne stocke AUCUNE décision — read-only strict.');

  const payload = {
    generated_at: new Date().toISOString(),
    sources: result.sources,
    total_items: result.total_items,
    displayed_count: Math.min(top, result.total_items),
    ranking_rule: 'occurrences desc, puis age_days desc (plus ancien en tête), puis source_file asc, puis ordre de lecture original',
    displayed: result.ranked.slice(0, top),
    out_of_scope: OUT_OF_SCOPE,
  };
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

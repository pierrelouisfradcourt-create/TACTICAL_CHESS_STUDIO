#!/usr/bin/env node
// search_usage.mjs — SEARCH_USAGE_CONTRACT_V1, maillons 3 à 5.
//
// Ferme la boucle que le journal de recherche laissait ouverte :
//
//     Question  ->  Recherche  ->  Resultat  ->  Consommation  ->  Preuve
//      caller       journal       matched_ids   consumed_refs    proof_of_consumption
//
// PRINCIPE : « recherche effectuée » ≠ « connaissance utilisée ». Le journal savait
// dire la première. Ce module dit la seconde — et seulement quand elle est MESURÉE.
//
// AUCUNE SIMILARITÉ, AUCUN SCORE, AUCUNE HEURISTIQUE. `consumed_refs` est
// l'INTERSECTION EXACTE entre les identités proposées par les recherches
// (`matched_ids`) et les modules réellement réutilisés, mesurés par
// `reuse_ratio.mjs` — le mécanisme existant, importé tel quel, jamais recalculé.
//
// Usage : node search_usage.mjs <game_dir> [--caller <x>] [--since <iso>] [--json]
//
// claim_posture: NO_CLAIM_ALLOWED
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureReuseRatio } from './reuse_ratio.mjs';
import { CALLERS, CALLER_UNDECLARED } from '../../knowledge_base/search.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..', '..');
export const CHEMIN_JOURNAL = join(RACINE, 'knowledge_base', 'search_log.jsonl');

/**
 * États AUTORISÉS de la preuve de consommation. **Exactement trois.** Un quatrième
 * état serait une façon de ne pas trancher.
 *
 *   MEASURED      `reuse_ratio.mjs` a tourné sur le chemin réellement exécuté et dit
 *                 quels modules sont réutilisés.
 *   NOT_WIRED     le mécanisme existe, personne ne l'invoque dans le projet
 *                 (`run-oracle.mjs` absent ou n'appelant pas reuse_ratio).
 *   NOT_MEASURED  la mesure ne pouvait pas être faite ici (dossier absent, aucun
 *                 fichier de logique). « Pas branché » et « pas mesurable » sont deux
 *                 faits différents — la leçon `oracle_fail_vs_not_measured_marker`
 *                 a été payée pour cette distinction.
 */
export const PROOF_STATES = Object.freeze(['MEASURED', 'NOT_WIRED', 'NOT_MEASURED']);

/** Motif que `check_reuse_ratio_wired` (static_oracles.py:705) cherche dans
 *  `run-oracle.mjs`. Repris à l'identique : une seule définition du « câblé ». */
const REUSE_RATIO_WIRED = /(?:run|spawn|exec|execFile|fork|import|node)\b[^\n]*?reuse_ratio\.mjs/;

/** Retire les commentaires JS avant de chercher le câblage — un appel en commentaire
 *  n'est pas un appel. */
function sansCommentaires(src) {
  return String(src).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Le projet invoque-t-il réellement `reuse_ratio.mjs` dans son `run-oracle.mjs` ?
 * @returns {{wired:boolean, raison:string|null}}
 */
export function reuseRatioCable(gameDir) {
  const runner = join(gameDir, 'run-oracle.mjs');
  if (!existsSync(runner)) return { wired: false, raison: 'run-oracle.mjs absent' };
  if (!REUSE_RATIO_WIRED.test(sansCommentaires(readFileSync(runner, 'utf-8')))) {
    return { wired: false, raison: "run-oracle.mjs n'invoque pas reuse_ratio.mjs" };
  }
  return { wired: true, raison: null };
}

/**
 * Identités proposées par les recherches, depuis le journal.
 *
 * @param {object} opts {since, caller, journal}
 * @returns {{matched_ids:string[], searches:number, par_caller:object}}
 */
export function identitesProposees(opts = {}) {
  const chemin = opts.journal || CHEMIN_JOURNAL;
  let brut;
  try {
    brut = readFileSync(chemin, 'utf-8');
  } catch {
    return { matched_ids: [], searches: 0, par_caller: {} };
  }
  const ids = new Set();
  const parCaller = {};
  let searches = 0;
  for (const ligne of brut.split(/\r?\n/)) {
    if (!ligne.trim()) continue;
    let e;
    try {
      e = JSON.parse(ligne);
    } catch {
      continue;
    }
    if ((e.kind ?? 'search') !== 'search') continue;
    if (opts.since && !(e.ts >= opts.since)) continue;
    if (opts.caller && (e.caller ?? CALLER_UNDECLARED) !== opts.caller) continue;
    searches += 1;
    const c = e.caller ?? CALLER_UNDECLARED;
    parCaller[c] = (parCaller[c] || 0) + 1;
    for (const id of e.matched_ids || []) ids.add(id);
  }
  return { matched_ids: [...ids].sort(), searches, par_caller: parCaller };
}

/**
 * Table `chemin de module -> brick_id`, lue dans le catalogue.
 *
 * C'est la JOINTURE EXACTE entre les deux vocabulaires : `matched_ids` porte des
 * `brick_id`, `reuse_ratio` rend des chemins de fichiers. Le catalogue déclare
 * lui-même la correspondance (`entry.path`). Rapprocher par nom de fichier serait une
 * ressemblance — `sys-reachability` et `reachability.mjs` ne se ressemblent qu'à
 * l'œil ; c'est le catalogue qui dit qu'ils désignent la même chose.
 */
export function tableCheminVersBrique(cheminCatalogue) {
  const chemin = cheminCatalogue || join(RACINE, 'knowledge_base', 'catalog.json');
  const table = new Map();
  try {
    const doc = JSON.parse(readFileSync(chemin, 'utf-8'));
    for (const e of doc.entries || []) {
      const id = e.brick_id ?? e.asset_id;
      if (id && e.path) table.set(String(e.path).replace(/\\/g, '/'), id);
    }
  } catch { /* catalogue illisible : aucune jointure possible, table vide */ }
  return table;
}

/**
 * Ce que le jeu a RÉELLEMENT réutilisé, mesuré par `reuse_ratio.mjs`, traduit en
 * identités du catalogue.
 *
 * Un module réutilisé qui n'est PAS dans le catalogue rend `null` : il est réutilisé,
 * mais il n'a jamais été proposé par une recherche — c'est un fait, pas un défaut, et
 * il est conservé dans `reused_unmapped`.
 */
export function referencesConsommees(gameDir, cheminCatalogue) {
  const mesure = measureReuseRatio(gameDir);
  const table = tableCheminVersBrique(cheminCatalogue);
  const refs = new Set();
  const nonMappes = [];
  for (const mod of mesure.reusedModules || []) {
    const p = String(mod).replace(/\\/g, '/');
    // identité de SUFFIXE de chemin : `../../knowledge_base/x/y.mjs` désigne
    // `knowledge_base/x/y.mjs`. Aucune tolérance au-delà.
    let id = table.get(p) ?? null;
    if (id === null) {
      for (const [cat, brique] of table) {
        if (p === cat || p.endsWith(`/${cat}`)) { id = brique; break; }
      }
    }
    if (id) refs.add(id);
    else nonMappes.push(p);
  }
  return { consumed: [...refs].sort(), reused_unmapped: nonMappes.sort(), mesure };
}

/**
 * Boucle complète pour un jeu. Ne juge rien, ne note rien.
 *
 * @param {string} gameDir chemin RÉELLEMENT exécuté
 * @param {object} opts {since, caller, journal, racine}
 * @returns {object} enregistrement `consumption`
 */
export function mesurerConsommation(gameDir, opts = {}) {
  const racine = opts.racine || RACINE;
  const abs = resolve(racine, gameDir);
  const rel = gameDir.replace(/\\/g, '/');
  const propose = identitesProposees(opts);

  let proof = 'NOT_MEASURED';
  let raison = null;
  let consumed = [];
  let nonMappes = [];
  let ratio = null;
  let reused = [];

  const cable = reuseRatioCable(abs);
  if (!existsSync(abs)) {
    raison = `dossier absent : ${rel}`;
  } else {
    let mesure = null;
    try {
      const r = referencesConsommees(abs, opts.catalogue);
      consumed = r.consumed;
      nonMappes = r.reused_unmapped;
      mesure = r.mesure;
    } catch (err) {
      raison = `mesure impossible : ${err.message}`;
    }
    if (mesure) {
      ratio = mesure.reuseRatio;
      reused = mesure.reusedModules || [];
      if ((mesure.logicFiles || []).length === 0) {
        proof = 'NOT_MEASURED';
        raison = 'aucun fichier de logique — rien a mesurer';
      } else if (!cable.wired) {
        // Le mécanisme a tourné ICI, mais le projet ne l'invoque pas lui-même : sa
        // chaîne qualite ne le mesurera jamais toute seule. C'est `NOT_WIRED`, pas
        // `MEASURED` — sinon on transformerait notre propre appel en preuve du projet.
        proof = 'NOT_WIRED';
        raison = cable.raison;
      } else {
        proof = 'MEASURED';
      }
    }
  }

  // consumed_refs = INTERSECTION EXACTE propose ∩ consomme. Aucun rapprochement flou.
  const proposeSet = new Set(propose.matched_ids);
  const consumedRefs = consumed.filter((c) => proposeSet.has(c)).sort();

  return {
    kind: 'consumption',
    caller: CALLERS.has(opts.caller) ? opts.caller : CALLER_UNDECLARED,
    game_dir: rel,
    searches: propose.searches,
    searches_par_caller: propose.par_caller,
    matched_ids: propose.matched_ids,
    reused_modules: reused,
    reused_unmapped: nonMappes,
    consumed_refs: consumedRefs,
    reuse_ratio: ratio,
    proof_of_consumption: {
      method: 'reuse_ratio',
      invoked_by: cable.wired ? `${rel}/run-oracle.mjs` : null,
      status: proof,
      raison,
    },
    ts: new Date().toISOString(),
  };
}

/** Ajoute l'enregistrement au journal. Best-effort : un journal qui échoue ne doit
 *  jamais faire tomber la mesure. */
export function journaliserConsommation(enregistrement, chemin = CHEMIN_JOURNAL) {
  try {
    mkdirSync(dirname(chemin), { recursive: true });
    appendFileSync(chemin, `${JSON.stringify(enregistrement)}\n`, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

// ---- CLI ----
const estMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (estMain) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const gameDir = argv.find((a, i) => !a.startsWith('--')
    && !['--caller', '--since', '--journal'].includes(argv[i - 1]));
  if (!gameDir) {
    console.error('usage: node search_usage.mjs <game_dir> [--caller <x>] [--since <iso>] [--json] [--log]');
    process.exitCode = 2;
  } else {
    const e = mesurerConsommation(gameDir, {
      caller: opt('--caller'), since: opt('--since'), journal: opt('--journal'),
    });
    if (argv.includes('--log')) journaliserConsommation(e, opt('--journal'));
    if (argv.includes('--json')) {
      console.log(JSON.stringify(e, null, 1));
    } else {
      console.log(`# ${e.game_dir}`);
      console.log(`  recherches       ${e.searches} ${JSON.stringify(e.searches_par_caller)}`);
      console.log(`  matched_ids      ${e.matched_ids.length}`);
      console.log(`  reused_modules   ${e.reused_modules.length}`);
      console.log(`  consumed_refs    ${e.consumed_refs.length} ${JSON.stringify(e.consumed_refs)}`);
      if (e.reused_unmapped.length) {
        console.log(`  reutilise HORS catalogue : ${e.reused_unmapped.length}`);
      }
      console.log(`  reuse_ratio      ${e.reuse_ratio}`);
      console.log(`  proof            ${e.proof_of_consumption.status}`
        + `${e.proof_of_consumption.raison ? ` — ${e.proof_of_consumption.raison}` : ''}`);
    }
    process.exitCode = e.proof_of_consumption.status === 'MEASURED' ? 0 : 1;
  }
}

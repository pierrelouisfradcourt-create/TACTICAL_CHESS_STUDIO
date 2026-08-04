#!/usr/bin/env node
// check_worldscan.mjs — oracle de COMPLÉTUDE STRUCTURELLE non-LLM pour une
// observation World Scan. Même famille que check_artbible.mjs : ne juge JAMAIS
// "est-ce une bonne analyse" — vérifie la FORME (fichiers requis présents/non-vides
// + observation_manifest.json structurellement valide en mode dossier, OU le
// manifeste JSON structurellement valide en mode fichier) et fait respecter la
// règle ratifiée « URLs citées, pas de collecte locale » (aucun média binaire : le
// World Scan cite ses sources, il ne les rapatrie pas).
//
// v0.1 (2026-07-28) — patron : scripts/forge/check_artbible.mjs (CLI, vocabulaire de
// verdict, style de rapport, framework de test node:test).
// v0.2 (2026-08-03) — réparation boucle cassée : le manifest ne portait AUCUN champ
// décrivant victoire/défaite/objectif joueur (cause racine du blocage HumanGate sur
// le run tetris — solvabilité indéfinissable). Ajout de `games[].objectives[]`
// {mode, has_win_state, victory_condition, has_defeat_state, defeat_condition,
// player_goal} : un genre SANS état gagné (marathon/score-attack) DOIT le déclarer
// explicitement (`has_win_state:false` + `victory_condition:null`), jamais par
// absence de champ. Générique — aucune règle spécifique à un jeu.
// v0.3 (2026-08-03) — invariant « un agent de connaissance ne doit jamais posséder
// l'état qu'il décrit » : s2-worldscan n'a plus de droit d'écriture (contrat
// s2-worldscan.yaml réparé), il rend son manifeste en bloc ```json``` terminal que
// l'exécuteur matérialise en worldscan.json (run_real.py::_materialize_artifact,
// même patron que blueprint.json/wiremap.json). AJOUT d'un second MODE D'ENTRÉE —
// le mode dossier existant (GAME_REFERENCE/, 5 .md + observation_manifest.json)
// N'EST PAS retiré ni affaibli, aucune règle de validation n'est retirée : un
// fichier JSON en entrée est désormais accepté et validé comme le manifeste lui-même
// (mêmes fonctions validateManifest/validateGameEntry/validateObjective, mêmes
// seuils MIN_GAMES/MIN_SOURCES_PER_GAME/MIN_OBJECTIVES_PER_GAME).
//
// Usage :
//   node check_worldscan.mjs <dossier_GAME_REFERENCE|worldscan.json> [--json]
// Exit 0 = OK · 1 = FAIL (chemin illisible, fichier manquant/vide, manifest invalide,
// couverture insuffisante, ou média local détecté [mode dossier uniquement]).
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_FILES = [
  'mechanics_analysis.md',
  'progression_map.md',
  'economy_map.md',
  'ux_flow.md',
  'architecture_guess.md',
  'observation_manifest.json',
];

export const SOURCE_TYPES = ['screenshot', 'video', 'article', 'wiki'];
export const LOOP_KEYS = ['minute_1', 'minute_10', 'hour_5', 'endgame'];
export const MIN_GAMES = 2;
export const MIN_SOURCES_PER_GAME = 3;
// Un jeu decrit toujours >=1 mode (solo). Plusieurs modes (solo/versus/coop...) peuvent
// coexister avec des conditions differentes : chacun est une entree distincte.
export const MIN_OBJECTIVES_PER_GAME = 1;

// Extensions média INTERDITES dans le dossier — règle ratifiée « URLs citées, pas de
// collecte locale » : le World Scan ne rapatrie jamais de fichier binaire, il cite ses
// sources par URL. La présence d'un seul de ces fichiers est un échec explicite, jamais
// un skip silencieux.
export const FORBIDDEN_MEDIA_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
  '.mp4', '.webm', '.mkv', '.avi', '.mov',
];

/**
 * Liste récursivement tous les fichiers d'un dossier (chemins relatifs au dossier
 * racine). Ne suit pas les liens symboliques, ne fait aucune hypothèse sur la
 * profondeur — un média local caché dans un sous-dossier reste détecté.
 * @param {string} rootDir
 * @returns {Promise<string[]>} chemins relatifs (posix-style '/')
 */
export async function listFilesRecursive(rootDir) {
  const out = [];
  async function walk(dir, prefix) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), rel);
      } else if (entry.isFile()) {
        out.push(rel);
      }
    }
  }
  await walk(rootDir, '');
  return out;
}

/**
 * Vérifie qu'aucun fichier média local (extension interdite) n'est présent dans le
 * dossier. Retourne la liste des chemins fautifs (vide = conforme).
 * @param {string[]} filePaths chemins relatifs déjà listés
 * @returns {string[]}
 */
export function checkNoLocalMedia(filePaths) {
  return filePaths.filter((p) => FORBIDDEN_MEDIA_EXTENSIONS.includes(extname(p).toLowerCase()));
}

/**
 * Vérifie qu'une URL est http(s) valide et bien formée (pas de simple regex fragile :
 * délègue au constructeur URL natif).
 * @param {unknown} url
 * @returns {boolean}
 */
export function isValidHttpUrl(url) {
  if (typeof url !== 'string' || url.trim().length === 0) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valide une entrée `sources[i]` : {url, type, timestamp?}. `type` doit être connu ;
 * `timestamp` est OBLIGATOIRE quand type==='video' (règle du contrat), sinon optionnel.
 * @param {object} source
 * @param {number} gameIdx
 * @param {number} sourceIdx
 * @returns {string[]} findings (vide = conforme)
 */
export function validateSource(source, gameIdx, sourceIdx) {
  const findings = [];
  const loc = `games[${gameIdx}].sources[${sourceIdx}]`;
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return [`${loc}: doit etre un objet {url, type, timestamp?}`];
  }
  if (!isValidHttpUrl(source.url)) {
    findings.push(`${loc}: url manquante ou invalide (http(s) requis)`);
  }
  if (!('type' in source) || !SOURCE_TYPES.includes(source.type)) {
    findings.push(`${loc}: type invalide (attendu: ${SOURCE_TYPES.join('|')})`);
  }
  if (source.type === 'video') {
    if (!('timestamp' in source) || typeof source.timestamp !== 'string' || source.timestamp.trim().length === 0) {
      findings.push(`${loc}: type=video exige un timestamp non vide`);
    }
  }
  return findings;
}

/**
 * Valide les 4 clés de `loops` : chacune doit être une chaîne non vide. Un jeu sans
 * boucle de jeu décrite à un horizon donné est une observation incomplète, pas un
 * détail optionnel.
 * @param {object} loops
 * @param {number} gameIdx
 * @returns {string[]}
 */
export function validateLoops(loops, gameIdx) {
  const loc = `games[${gameIdx}].loops`;
  if (loops === null || typeof loops !== 'object' || Array.isArray(loops)) {
    return [`${loc}: doit etre un objet {${LOOP_KEYS.join(', ')}}`];
  }
  const findings = [];
  for (const key of LOOP_KEYS) {
    const value = loops[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      findings.push(`${loc}.${key}: absent ou vide`);
    }
  }
  return findings;
}

/**
 * Valide une paire {has_<x>_state, <x>_condition} d'une entrée `objectives[i]`. Règle
 * ratifiée : un genre SANS cet état (ex. marathon sans victoire) doit le représenter
 * EXPLICITEMENT — `has_*_state: false` ET `*_condition: null` — jamais par un champ
 * absent ni par une chaîne vide. C'est la différence entre "non renseigné" (invalide)
 * et "déclaré absent" (valide).
 * @param {object} objective
 * @param {string} loc préfixe de localisation déjà formé (ex. games[0].objectives[0])
 * @param {'has_win_state'|'has_defeat_state'} hasKey
 * @param {'victory_condition'|'defeat_condition'} condKey
 * @returns {string[]}
 */
export function validateConditionState(objective, loc, hasKey, condKey) {
  const findings = [];
  const hasValue = objective[hasKey];
  if (typeof hasValue !== 'boolean') {
    findings.push(`${loc}.${hasKey}: doit etre un booleen explicite (true ou false), jamais absent ou d'un autre type`);
    return findings;
  }
  const hasCondKey = condKey in objective;
  const condValue = objective[condKey];
  if (hasValue === true) {
    if (typeof condValue !== 'string' || condValue.trim().length === 0) {
      findings.push(`${loc}.${condKey}: requis et non vide quand ${hasKey}=true`);
    }
  } else if (!hasCondKey) {
    findings.push(`${loc}.${condKey}: doit etre present et valoir null quand ${hasKey}=false (etat absent = representation explicite, jamais un champ omis)`);
  } else if (condValue !== null) {
    findings.push(`${loc}.${condKey}: doit valoir exactement null quand ${hasKey}=false (pas une chaine vide, pas une autre valeur)`);
  }
  return findings;
}

/**
 * Valide une entrée `objectives[i]` : {mode, has_win_state, victory_condition,
 * has_defeat_state, defeat_condition, player_goal}. Un jeu peut déclarer plusieurs
 * modes (ex. solo marathon vs versus) avec des conditions différentes — chaque mode
 * est une entrée séparée du tableau `objectives`.
 * @param {object} objective
 * @param {number} gameIdx
 * @param {number} objIdx
 * @returns {string[]}
 */
export function validateObjective(objective, gameIdx, objIdx) {
  const loc = `games[${gameIdx}].objectives[${objIdx}]`;
  if (objective === null || typeof objective !== 'object' || Array.isArray(objective)) {
    return [`${loc}: doit etre un objet {mode, has_win_state, victory_condition, has_defeat_state, defeat_condition, player_goal}`];
  }
  const findings = [];
  if (typeof objective.mode !== 'string' || objective.mode.trim().length === 0) {
    findings.push(`${loc}.mode: absent ou vide`);
  }
  findings.push(...validateConditionState(objective, loc, 'has_win_state', 'victory_condition'));
  findings.push(...validateConditionState(objective, loc, 'has_defeat_state', 'defeat_condition'));
  if (typeof objective.player_goal !== 'string' || objective.player_goal.trim().length === 0) {
    findings.push(`${loc}.player_goal: absent ou vide`);
  }
  return findings;
}

/**
 * Valide une entrée `games[i]` complète : game (nom), sources (>=3, URLs valides,
 * video->timestamp), loops (4 clés non vides), objectives (>=1 mode, victoire/défaite
 * explicites), retention_answer (chaîne non vide).
 * @param {object} entry
 * @param {number} idx
 * @returns {string[]}
 */
export function validateGameEntry(entry, idx) {
  const findings = [];
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return [`games[${idx}]: doit etre un objet`];
  }
  if (typeof entry.game !== 'string' || entry.game.trim().length === 0) {
    findings.push(`games[${idx}].game: absent ou vide`);
  }
  if (!Array.isArray(entry.sources)) {
    findings.push(`games[${idx}].sources: doit etre un tableau`);
  } else {
    if (entry.sources.length < MIN_SOURCES_PER_GAME) {
      findings.push(`games[${idx}].sources: ${entry.sources.length} source(s), minimum ${MIN_SOURCES_PER_GAME} requis`);
    }
    entry.sources.forEach((s, i) => findings.push(...validateSource(s, idx, i)));
  }
  findings.push(...validateLoops(entry.loops, idx));
  if (!Array.isArray(entry.objectives)) {
    findings.push(`games[${idx}].objectives: doit etre un tableau`);
  } else {
    if (entry.objectives.length < MIN_OBJECTIVES_PER_GAME) {
      findings.push(`games[${idx}].objectives: ${entry.objectives.length} mode(s) decrit(s), minimum ${MIN_OBJECTIVES_PER_GAME} requis`);
    }
    entry.objectives.forEach((o, i) => findings.push(...validateObjective(o, idx, i)));
  }
  if (typeof entry.retention_answer !== 'string' || entry.retention_answer.trim().length === 0) {
    findings.push(`games[${idx}].retention_answer: absent ou vide`);
  }
  return findings;
}

/**
 * Valide la forme complète de observation_manifest.json : {games: [...], advisory: true}.
 * @param {object} doc
 * @returns {string[]}
 */
export function validateManifest(doc) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['observation_manifest.json: doit etre un objet {games, advisory}'];
  }
  const findings = [];
  if (!Array.isArray(doc.games)) {
    findings.push('observation_manifest.json: champ games manquant ou invalide (tableau attendu)');
  } else {
    if (doc.games.length < MIN_GAMES) {
      findings.push(`observation_manifest.json: ${doc.games.length} jeu(x) analyse(s), minimum ${MIN_GAMES} requis`);
    }
    doc.games.forEach((g, i) => findings.push(...validateGameEntry(g, i)));
  }
  if (doc.advisory !== true) {
    findings.push('observation_manifest.json: champ advisory doit etre exactement true (jamais absent, jamais false)');
  }
  return findings;
}

/**
 * Vérifie qu'un fichier requis existe et n'est pas vide (contenu trim non nul). Ne
 * fait jamais la différence entre "absent" et "illisible" pour l'appelant — les deux
 * sont des findings, jamais une exception qui remonte.
 * @param {string} dir
 * @param {string} filename
 * @returns {Promise<string[]>}
 */
export async function checkRequiredFilePresentAndNonEmpty(dir, filename) {
  const path = join(dir, filename);
  let content;
  try {
    content = await readFile(path, 'utf-8');
  } catch (err) {
    return [`${filename}: absent ou illisible (${err.message})`];
  }
  if (content.trim().length === 0) {
    return [`${filename}: present mais vide`];
  }
  return [];
}

const EMPTY_STATS = { games: 0, sources_total: 0, objectives_total: 0, files_checked: 0, media_files_found: 0 };

/**
 * Calcule les stats agrégées (games/sources_total/objectives_total) d'un manifeste
 * déjà parsé, quel que soit le mode (dossier ou fichier) — factorisé pour ne pas
 * dupliquer le comptage entre les deux chemins d'entrée.
 * @param {object} doc
 * @returns {{games: number, sources_total: number, objectives_total: number}}
 */
function manifestCounts(doc) {
  if (!doc || !Array.isArray(doc.games)) {
    return { games: 0, sources_total: 0, objectives_total: 0 };
  }
  return {
    games: doc.games.length,
    sources_total: doc.games.reduce((acc, g) => acc + (Array.isArray(g.sources) ? g.sources.length : 0), 0),
    objectives_total: doc.games.reduce((acc, g) => acc + (Array.isArray(g.objectives) ? g.objectives.length : 0), 0),
  };
}

/**
 * MODE FICHIER (v0.3, 2026-08-03) : valide un manifeste JSON matérialisé tel quel
 * (worldscan.json produit par run_real.py::_materialize_artifact depuis le bloc
 * ```json``` terminal de l'agent s2-worldscan — l'agent lui-même n'a plus le droit
 * d'écrire). Le fichier EST le manifeste (même schéma exact que
 * observation_manifest.json en mode dossier) : mêmes validateurs, mêmes seuils,
 * AUCUNE règle assouplie. N'a pas de notion de "fichiers .md requis" ni de scan de
 * médias locaux au sens fichiers-sur-disque : un manifeste JSON seul ne peut pas
 * contenir de média binaire, donc `media_files_found` reste 0 par construction (pas
 * un skip silencieux — il n'y a rien à trouver dans ce mode).
 * @param {string} filePath
 * @returns {Promise<{ok: boolean, verdict: 'OK'|'FAIL', problems: string[], stats: object}>}
 */
export async function checkWorldScanFile(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    return { ok: false, verdict: 'FAIL', problems: [`${filePath}: absent ou illisible (${err.message})`], stats: EMPTY_STATS };
  }
  if (raw.trim().length === 0) {
    return { ok: false, verdict: 'FAIL', problems: [`${filePath}: present mais vide`], stats: EMPTY_STATS };
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    return { ok: false, verdict: 'FAIL', problems: [`${filePath}: JSON invalide (${err.message})`], stats: EMPTY_STATS };
  }
  const problems = validateManifest(doc);
  const counts = manifestCounts(doc);
  const stats = { ...counts, files_checked: 1, media_files_found: 0 };
  if (problems.length > 0) {
    return { ok: false, verdict: 'FAIL', problems, stats };
  }
  return { ok: true, verdict: 'OK', problems: [], stats };
}

/**
 * Point d'entrée complet. Deux modes d'entrée, choisis d'après le type du chemin
 * (jamais un flag séparé — un dossier reste un dossier, un fichier reste un fichier) :
 *
 * - MODE DOSSIER (historique, INCHANGÉ) : vérifie la présence/non-vacuité des 6
 *   fichiers requis, l'absence de tout média local, et la validité structurelle de
 *   observation_manifest.json.
 * - MODE FICHIER (v0.3) : le chemin pointe directement le manifeste JSON matérialisé
 *   par l'exécuteur (worldscan.json) — mêmes règles de validation du manifeste,
 *   sans les 5 fichiers .md ni le scan de médias sur disque (cf. checkWorldScanFile).
 *
 * Vocabulaire de verdict unique du studio (jamais PASS/CONCERNS) :
 * - `FAIL` : chemin illisible, fichier requis manquant/vide, manifest invalide,
 *   couverture insuffisante (<2 jeux, <3 sources), ou média local détecté.
 * - `OK`   : entrée complète et manifest structurellement valide.
 * `ok` (booléen) = `verdict === 'OK'`.
 *
 * @param {string} dirPath dossier GAME_REFERENCE/ ou fichier worldscan.json
 * @returns {Promise<{ok: boolean, verdict: 'OK'|'FAIL', problems: string[], stats: object}>}
 */
export async function checkWorldScan(dirPath) {
  let dirStats;
  try {
    dirStats = await stat(dirPath);
  } catch (err) {
    return { ok: false, verdict: 'FAIL', problems: [`dossier illisible : ${err.message}`], stats: EMPTY_STATS };
  }
  if (dirStats.isFile()) {
    return checkWorldScanFile(dirPath);
  }
  if (!dirStats.isDirectory()) {
    return { ok: false, verdict: 'FAIL', problems: [`chemin fourni n'est ni un dossier ni un fichier : ${dirPath}`], stats: EMPTY_STATS };
  }

  const problems = [];

  // 1. Fichiers requis présents et non vides.
  let filesChecked = 0;
  for (const filename of REQUIRED_FILES) {
    problems.push(...(await checkRequiredFilePresentAndNonEmpty(dirPath, filename)));
    filesChecked += 1;
  }

  // 2. Aucun média local (règle « URLs citées, pas de collecte locale »).
  let allFiles = [];
  try {
    allFiles = await listFilesRecursive(dirPath);
  } catch (err) {
    problems.push(`impossible de lister le contenu du dossier : ${err.message}`);
  }
  const mediaFiles = checkNoLocalMedia(allFiles);
  mediaFiles.forEach((f) => problems.push(`media local interdit trouve : ${f} (URLs citees, pas de collecte locale)`));

  // 3. Manifest structurellement valide (seulement si lisible en JSON — sinon déjà
  // remonté par l'étape 1 comme "absent ou illisible" ou par un JSON.parse dédié).
  let gamesCount = 0;
  let sourcesTotal = 0;
  let objectivesTotal = 0;
  const manifestPath = join(dirPath, 'observation_manifest.json');
  let manifestRaw = null;
  try {
    manifestRaw = await readFile(manifestPath, 'utf-8');
  } catch {
    // déjà remonté par checkRequiredFilePresentAndNonEmpty
  }
  if (manifestRaw !== null && manifestRaw.trim().length > 0) {
    let doc;
    try {
      doc = JSON.parse(manifestRaw);
    } catch (err) {
      problems.push(`observation_manifest.json: JSON invalide (${err.message})`);
      doc = null;
    }
    if (doc !== null) {
      problems.push(...validateManifest(doc));
      if (Array.isArray(doc.games)) {
        gamesCount = doc.games.length;
        sourcesTotal = doc.games.reduce((acc, g) => acc + (Array.isArray(g.sources) ? g.sources.length : 0), 0);
        objectivesTotal = doc.games.reduce((acc, g) => acc + (Array.isArray(g.objectives) ? g.objectives.length : 0), 0);
      }
    }
  }

  const stats = {
    games: gamesCount,
    sources_total: sourcesTotal,
    objectives_total: objectivesTotal,
    files_checked: filesChecked,
    media_files_found: mediaFiles.length,
  };

  if (problems.length > 0) {
    return { ok: false, verdict: 'FAIL', problems, stats };
  }
  return { ok: true, verdict: 'OK', problems: [], stats };
}

// ---- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));

  if (positional.length < 1) {
    console.error('usage: node check_worldscan.mjs <dossier_GAME_REFERENCE|worldscan.json> [--json]');
    process.exit(1);
  }

  (async () => {
    const result = await checkWorldScan(positional[0]);
    // Toujours les deux : un résumé lisible pour un humain, puis un bloc JSON stable
    // pour un appelant mécanique (driver/gate) — jamais un vert silencieux, un
    // dossier illisible produit le même format de sortie qu'un dossier invalide.
    console.log(`VERDICT WORLDSCAN: ${result.verdict}`);
    result.problems.forEach((p) => console.error(`  FAIL: ${p}`));
    console.error(`  stats: ${result.stats.games} jeu(x) / ${result.stats.sources_total} source(s) / ${result.stats.objectives_total} objectif(s)/mode(s) / ${result.stats.files_checked} fichier(s) requis verifies / ${result.stats.media_files_found} media(s) local(aux) trouve(s)`);
    console.log(JSON.stringify({ ok: result.ok, problems: result.problems, stats: result.stats }, null, 2));
    process.exit(result.ok ? 0 : 1);
  })();
}

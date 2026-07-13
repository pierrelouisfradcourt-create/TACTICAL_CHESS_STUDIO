#!/usr/bin/env node
// check_artbible.mjs — oracle de CONFORMITÉ STRUCTURELLE non-LLM pour l'Art Director
// (contrat s2.5-artbible.yaml). Ne juge JAMAIS "est-ce que c'est beau" — vérifie la
// FORME de art_bible.md (frontmatter + sections non triviales, même famille de check
// que check_prisme.mjs pour product_snapshot.md) et la VALIDITÉ STRUCTURELLE de chaque
// asset_request produit, en délégant à asset_request.mjs::validateRequestShape (zéro
// duplication de la règle des 3 états). Le taux de resolution OK/BLOCKED contre le
// catalogue réel est rapporté en statistique advisory — jamais un critère pass/fail
// (cf. docs/forge/ASSET_CONTRACT_V0.md "BLOCKED vs FAIL").
//
// Usage :
//   node check_artbible.mjs <art_bible.md> <asset_requests.json> [--catalog <path>] [--json]
// Exit 0 = conforme (structure) · 1 = non conforme · 2 = usage/fichier illisible.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRequestShape, evaluateAssetRequest } from './asset_request.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CATALOG_PATH = resolve(__dirname, '..', '..', 'knowledge_base', 'catalog.json');

const REQUIRED_SECTIONS = [
  { key: 'identite_visuelle', pattern: /IDENTIT[ÉE] VISUELLE/i },
  { key: 'rationale', pattern: /RATIONALE/i },
];
const PLACEHOLDER_MARKERS = [/à\s*d[ée]finir/i, /\bTBD\b/i, /\?\?\?/, /\bTODO\b/i, /\bXXX\b/];
const MIN_SECTION_CHARS = 40;

/**
 * Extrait le frontmatter YAML minimal (--- ... ---) sans dépendance externe : ne
 * supporte que les listes inline `cle: [a, b, c]` et chaînes simples — suffisant pour
 * les 2 champs attendus (styles, mood_keywords). Un frontmatter absent/malformé
 * retourne null (traité comme un finding, pas une exception).
 * @param {string} content
 * @returns {{styles: string[], mood_keywords: string[]}|null}
 */
export function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*\[(.*)\]\s*$/);
    if (!kv) continue;
    const [, key, listBody] = kv;
    out[key] = listBody
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter((s) => s.length > 0);
  }
  return out;
}

/**
 * Découpe le markdown en sections par en-têtes `## N. TITRE`, même convention que
 * check_prisme.mjs::splitSections.
 * @param {string} content
 * @returns {Map<string,string>}
 */
export function splitSections(content) {
  const headingRegex = /^##\s+\d+\.\s+(.+)$/gm;
  const matches = [...content.matchAll(headingRegex)];
  const sections = new Map();
  for (let i = 0; i < matches.length; i += 1) {
    const heading = matches[i][1];
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.slice(start, end).trim();
    const found = REQUIRED_SECTIONS.find((s) => s.pattern.test(heading));
    if (found) sections.set(found.key, body);
  }
  return sections;
}

/**
 * Vérifie la forme de art_bible.md : frontmatter {styles[], mood_keywords[]} non
 * vides + les 2 sections requises, non triviales, sans placeholder.
 * @param {string} content
 * @returns {{findings: string[], styles: string[]}}
 */
export function checkArtBibleMarkdown(content) {
  const findings = [];
  const fm = parseFrontmatter(content);
  if (!fm) {
    findings.push('frontmatter YAML absent ou illisible (attendu: --- styles: [...] mood_keywords: [...] ---)');
  } else {
    if (!Array.isArray(fm.styles) || fm.styles.length === 0) findings.push('frontmatter.styles absent ou vide');
    if (!Array.isArray(fm.mood_keywords) || fm.mood_keywords.length === 0) findings.push('frontmatter.mood_keywords absent ou vide');
  }

  const sections = splitSections(content);
  for (const { key } of REQUIRED_SECTIONS) {
    if (!sections.has(key)) {
      findings.push(`section manquante : ${key}`);
      continue;
    }
    const body = sections.get(key);
    if (body.length < MIN_SECTION_CHARS) findings.push(`section trop courte / probablement vide : ${key} (${body.length} caractères)`);
    for (const marker of PLACEHOLDER_MARKERS) {
      if (marker.test(body)) findings.push(`placeholder non résolu détecté dans ${key} : ${marker}`);
    }
  }

  return { findings, styles: fm && Array.isArray(fm.styles) ? fm.styles : [] };
}

/**
 * Vérifie asset_requests.json : forme {requests[], no_assets_needed, reason},
 * cohérence declared-empty (no_assets_needed=true <=> requests=[] et reason rempli),
 * puis chaque request via validateRequestShape (délégué, zéro duplication) et la
 * cohérence request.style ∈ styles déclarés par la bible.
 * @param {object} doc
 * @param {string[]} bibleStyles
 * @returns {string[]} findings (vide = conforme)
 */
export function checkAssetRequestsShape(doc, bibleStyles) {
  const findings = [];
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['asset_requests.json doit etre un objet {requests, no_assets_needed, reason}'];
  }
  if (!('requests' in doc) || !Array.isArray(doc.requests)) findings.push('champ manquant ou invalide: requests (tableau)');
  if (!('no_assets_needed' in doc) || typeof doc.no_assets_needed !== 'boolean') findings.push('champ manquant ou invalide: no_assets_needed (bool)');
  if (!('reason' in doc) || !(doc.reason === null || (typeof doc.reason === 'string' && doc.reason.length > 0))) {
    findings.push('champ manquant ou invalide: reason (null ou chaine non vide)');
  }
  if (findings.length > 0) return findings;

  if (doc.no_assets_needed === true) {
    if (doc.requests.length !== 0) findings.push('no_assets_needed=true exige requests=[] (decision assumee incoherente)');
    if (doc.reason === null) findings.push('no_assets_needed=true exige reason rempli (decision expliquee, pas un oubli)');
    return findings;
  }

  if (doc.requests.length === 0) {
    findings.push('requests vide sans no_assets_needed=true — declarez explicitement la decision (jamais un oubli silencieux)');
    return findings;
  }

  doc.requests.forEach((req, i) => {
    const shapeErrors = validateRequestShape(req);
    if (shapeErrors.length > 0) {
      shapeErrors.forEach((e) => findings.push(`requests[${i}]: ${e}`));
      return;
    }
    if (!bibleStyles.map((s) => s.toLowerCase()).includes(String(req.style).toLowerCase())) {
      findings.push(`requests[${i}]: style '${req.style}' non declare dans le frontmatter.styles de l'art_bible (coherence bible<->requetes)`);
    }
  });

  return findings;
}

/**
 * Point d'entrée complet : lit les deux fichiers, vérifie la forme, et calcule les
 * statistiques de resolution ADVISORY (jamais gating) contre le catalogue.
 * @param {string} artBiblePath
 * @param {string} assetRequestsPath
 * @param {object} [catalog] catalogue déjà chargé (optionnel, sinon lu depuis DEFAULT_CATALOG_PATH)
 * @returns {Promise<{pass: boolean, findings: string[], resolution_stats: {ok:number, blocked:number, total:number}}>}
 */
export async function checkArtBible(artBiblePath, assetRequestsPath, catalog) {
  let bibleContent;
  let requestsRaw;
  try {
    bibleContent = await readFile(artBiblePath, 'utf-8');
  } catch (err) {
    return { pass: false, findings: [`art_bible.md illisible : ${err.message}`], resolution_stats: { ok: 0, blocked: 0, total: 0 } };
  }
  try {
    requestsRaw = await readFile(assetRequestsPath, 'utf-8');
  } catch (err) {
    return { pass: false, findings: [`asset_requests.json illisible : ${err.message}`], resolution_stats: { ok: 0, blocked: 0, total: 0 } };
  }

  const { findings: bibleFindings, styles } = checkArtBibleMarkdown(bibleContent);
  let doc;
  try {
    doc = JSON.parse(requestsRaw);
  } catch (err) {
    return { pass: false, findings: [...bibleFindings, `asset_requests.json: JSON invalide (${err.message})`], resolution_stats: { ok: 0, blocked: 0, total: 0 } };
  }
  const requestFindings = checkAssetRequestsShape(doc, styles);
  const findings = [...bibleFindings, ...requestFindings];

  // Statistiques de resolution — ADVISORY, ne participe jamais à `pass` (cf. doctrine
  // BLOCKED vs FAIL : un asset qui n'existe pas encore dans le catalogue est un fait
  // légitime, pas un défaut de l'Art Director).
  let ok = 0;
  let blocked = 0;
  if (findings.length === 0 && doc.no_assets_needed === false && catalog) {
    for (const req of doc.requests) {
      const result = evaluateAssetRequest(req, catalog);
      if (result.verdict === 'OK') ok += 1;
      else if (result.verdict === 'BLOCKED') blocked += 1;
    }
  }

  return { pass: findings.length === 0, findings, resolution_stats: { ok, blocked, total: ok + blocked } };
}

// ---- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));
  const asJson = argv.includes('--json');
  const catalogFlagIdx = argv.indexOf('--catalog');
  const catalogPath = catalogFlagIdx !== -1 ? resolve(argv[catalogFlagIdx + 1]) : DEFAULT_CATALOG_PATH;

  if (positional.length < 2) {
    console.error('usage: node check_artbible.mjs <art_bible.md> <asset_requests.json> [--catalog <path>] [--json]');
    process.exit(2);
  }

  (async () => {
    let catalog = null;
    try {
      catalog = JSON.parse(await readFile(catalogPath, 'utf-8'));
    } catch {
      // Catalogue illisible : les stats de resolution seront omises (0/0/0), la
      // vérification de FORME reste inchangée (elle ne dépend pas du catalogue).
    }
    const result = await checkArtBible(positional[0], positional[1], catalog);
    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`VERDICT ART_BIBLE: ${result.pass ? 'PASS' : 'FAIL'}`);
      result.findings.forEach((f) => console.error(`  FAIL: ${f}`));
      console.error(`  resolution (advisory): ${result.resolution_stats.ok} OK / ${result.resolution_stats.blocked} BLOCKED / ${result.resolution_stats.total} total`);
    }
    process.exit(result.pass ? 0 : 1);
  })();
}

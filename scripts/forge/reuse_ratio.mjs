#!/usr/bin/env node
// reuse_ratio.mjs — mesure la RÉUTILISATION d'un jeu forgé (docs/forge/STUDIO_AGENT_ATLAS.md
// §2.4 : « s9 Builder MODIFIÉ — consulte SEARCH d'abord ... reuse-ratio.mjs mesuré »).
// Déterministe, non-LLM, zéro réseau. Ne juge rien — compte des imports.
//
// Périmètre déclaré (choix de conception) : seuls les fichiers de LOGIQUE PRODUIT sont
// scannés (game/level/render/input — les modules que WFL-01/WFL-02 ont établis comme la
// convention de ce studio pour un jeu HTML). Les fichiers de harnais (main.mjs, server.mjs,
// e2e.mjs, run-oracle.mjs, solvability.mjs) et les tests (*.test.mjs) sont EXCLUS : la
// question posée est « combien du LOGICIEL DU JEU vient de la bibliothèque », pas combien
// l'infrastructure de preuve importe.
//
// Usage : node reuse_ratio.mjs <games/nom-du-jeu/>
// Sortie : reçu JSON sur stdout + résumé lisible sur stderr. Exit 0 toujours (mesure, pas
// un oracle pass/fail — reuse_ratio bas n'est pas une erreur, c'est un FAIT à rapporter).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const HARNESS_FILES = new Set(['main.mjs', 'server.mjs', 'e2e.mjs', 'run-oracle.mjs', 'solvability.mjs']);

/**
 * Un fichier compte-t-il comme « logique produit » pour cette mesure ?
 * @param {string} fileName
 * @returns {boolean}
 */
function isLogicFile(fileName) {
  if (extname(fileName) !== '.mjs') return false;
  if (fileName.endsWith('.test.mjs')) return false;
  if (HARNESS_FILES.has(fileName)) return false;
  return true;
}

/**
 * Extrait les specifiers d'import ES d'un fichier source (texte brut — pas d'AST, même
 * limite déclarée que kb-validate.mjs R10 : suffisant pour ce besoin, pas un compilateur).
 * @param {string} source
 * @returns {string[]}
 */
function extractImportSpecifiers(source) {
  const specs = [];
  const re = /\bfrom\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(source)) !== null) specs.push(m[1]);
  return specs;
}

/**
 * Classe un specifier d'import : 'knowledge_base' (réutilisation prouvée) ou 'local'
 * (module écrit pour ce jeu — inclut les imports relatifs vers un AUTRE fichier du même
 * dossier de jeu) ou 'external' (ni l'un ni l'autre — ex. un module npm, non compté).
 * @param {string} specifier
 * @returns {'knowledge_base'|'local'|'external'}
 */
function classifySpecifier(specifier) {
  if (specifier.includes('knowledge_base/')) return 'knowledge_base';
  if (specifier.startsWith('./') || specifier.startsWith('../')) return 'local';
  return 'external';
}

/**
 * Mesure le taux de réutilisation d'un répertoire de jeu.
 * @param {string} gameDir chemin (absolu ou relatif au cwd) du dossier du jeu
 * @returns {{gameDir:string, logicFiles:string[], reusedModules:string[], reuseRatio:number, imports:Array<{file:string, specifier:string, classification:string}>}}
 */
export function measureReuseRatio(gameDir) {
  const entries = readdirSync(gameDir).filter((f) => {
    const full = join(gameDir, f);
    return statSync(full).isFile() && isLogicFile(f);
  });

  const imports = [];
  const reusedModules = new Set();

  for (const file of entries) {
    const source = readFileSync(join(gameDir, file), 'utf-8');
    for (const specifier of extractImportSpecifiers(source)) {
      const classification = classifySpecifier(specifier);
      imports.push({ file, specifier, classification });
      if (classification === 'knowledge_base') reusedModules.add(specifier);
    }
  }

  const logicFileCount = entries.length;
  const reusedModuleCount = reusedModules.size;
  // Dénominateur : fichiers de logique écrits POUR ce jeu + modules importés de la
  // bibliothèque — reflète « sur combien de briques ce jeu s'appuie au total, combien
  // viennent d'ailleurs ». Ratio 0 si aucune brique (jeu tout neuf, rien à réutiliser).
  const denominator = logicFileCount + reusedModuleCount;
  const reuseRatio = denominator === 0 ? 0 : reusedModuleCount / denominator;

  return {
    gameDir,
    logicFiles: entries.sort(),
    reusedModules: [...reusedModules].sort(),
    reuseRatio,
    imports,
  };
}

function main() {
  const gameDir = process.argv[2];
  if (!gameDir) {
    console.error('Usage: node reuse_ratio.mjs <games/nom-du-jeu/>');
    process.exit(2);
  }

  const result = measureReuseRatio(gameDir);

  console.error(`=== REUSE RATIO — ${gameDir} ===\n`);
  console.error(`Fichiers de logique produit scannés (${result.logicFiles.length}) : ${result.logicFiles.join(', ')}`);
  console.error(`Modules bibliothèque réutilisés (${result.reusedModules.length}) :`);
  for (const m of result.reusedModules) console.error(`  - ${m}`);
  console.error(`\nreuse_ratio = ${result.reusedModules.length} / (${result.logicFiles.length} + ${result.reusedModules.length}) = ${result.reuseRatio.toFixed(3)}`);

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

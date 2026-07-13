#!/usr/bin/env node
// merge_prisme.mjs — coup A2 v0 : RECOMBINAISON MÉCANIQUE des 5 sorties du panel Prisme
// (coup A1). Aucun LLM-arbitre, aucun jugement de "quelle vision est la meilleure" —
// c'est exactement le risque identifié dans docs/forge/PRISM_SCOPING.md §2
// (« un LLM-arbitre non outillé recrée le risque que la Forge s'interdit ailleurs »).
//
// Principe : le CHARTER (étape 0) est la seule source de vérité déjà validée. Chaque
// lens du panel s1 cite, dans sa section « Traçabilité », le(s) critère(s) charter
// (`criteres_succes[]`) qu'il couvre — extraction par correspondance EXACTE de texte,
// jamais par interprétation sémantique. La recombinaison =
//   1. UNION des règles par critère charter cité (aucune sélection, aucune fusion de
//      texte — tout ce qui a été écrit est conservé, groupé par critère).
//   2. GAP = tout critère "en périmètre du Prisme" (défini comme : cité par le CONTRÔLE,
//      le seul artefact déjà réel) qu'AUCUN lens du panel ne cite → remonté tel quel
//      depuis le charter, marqué explicitement comme non couvert, PAS deviné.
//   3. Aucune tentative de détecter/trancher une contradiction de valeur entre lenses
//      (hors scope v0 — nécessiterait un jugement sémantique, donc une gate humaine).
//
// Usage : node merge_prisme.mjs <charter.yaml> <control.md> <lens1.md> [<lensN.md> ...]
import { readFile } from 'node:fs/promises';

/**
 * Extrait les tags de critères (le libellé MAJUSCULE avant les ":") depuis
 * `criteres_succes:` dans un charter.yaml — lecture texte, pas de parseur YAML (évite
 * une dépendance ; le format `- "TAG : texte"` est une convention stable du studio).
 * @param {string} charterText
 * @returns {string[]} tags dans l'ordre du charter
 */
function extractCharterCriteria(charterText) {
  const criteriaBlockMatch = charterText.match(/criteres_succes:\n([\s\S]*?)\n\w/);
  const block = criteriaBlockMatch ? criteriaBlockMatch[1] : charterText;
  const tagPattern = /- "([A-ZÀ-Ÿ][A-ZÀ-Ÿ '-]+?)\s*:/g;
  const tags = [];
  let match;
  while ((match = tagPattern.exec(block)) !== null) {
    tags.push(match[1].trim());
  }
  return [...new Set(tags)];
}

/**
 * Découpe la section "RÈGLES OBSERVABLES" (## 4.) d'un artefact product_snapshot.
 * @param {string} content
 * @returns {string} texte brut de la section, ou '' si absente
 */
function extractRulesSection(content) {
  // (?![\s\S]) = fin de chaîne RÉELLE, pas fin de ligne — sinon en mode /m (nécessaire
  // pour ^) un simple `$` matcherait après CHAQUE ligne et tronquerait la capture
  // paresseuse au premier saut de ligne (bug réel trouvé en testant cette fonction).
  const match = content.match(
    /^##\s+4\.\s+R[EÈ]GLES OBSERVABLES.*$\n([\s\S]*?)(?=\n##\s+Tra[cç]abilit|\n```|(?![\s\S]))/m
  );
  return match ? match[1].trim() : '';
}

/**
 * Détermine quels tags de critère charter sont cités dans le texte fourni (correspondance
 * de sous-chaîne insensible à la casse — pas d'interprétation, juste une citation).
 * @param {string} text
 * @param {string[]} allTags
 * @returns {string[]}
 */
function citedTags(text, allTags) {
  return allTags.filter((tag) => text.toLowerCase().includes(tag.toLowerCase()));
}

async function main() {
  const [charterPath, controlPath, ...lensPaths] = process.argv.slice(2);
  if (!charterPath || !controlPath || lensPaths.length === 0) {
    console.error('Usage: node merge_prisme.mjs <charter.yaml> <control.md> <lens1.md> [<lensN.md> ...]');
    process.exit(2);
  }

  const charterText = await readFile(charterPath, 'utf-8');
  const allTags = extractCharterCriteria(charterText);

  const controlContent = await readFile(controlPath, 'utf-8');
  const controlScopeTags = citedTags(controlContent, allTags);

  const lenses = [];
  for (const lensPath of lensPaths) {
    // eslint-disable-next-line no-await-in-loop -- volume faible, ordre stable voulu
    const content = await readFile(lensPath, 'utf-8');
    const rules = extractRulesSection(content);
    lenses.push({ path: lensPath, tags: citedTags(rules.length ? content : content, allTags), rules });
  }

  const coveredByPanel = new Set(lenses.flatMap((l) => l.tags));
  const gaps = controlScopeTags.filter((tag) => !coveredByPanel.has(tag));

  const lines = [];
  lines.push('# Prisme — sortie RECOMBINÉE mécaniquement (coup A2 v0)');
  lines.push('');
  lines.push(
    '> Généré par `merge_prisme.mjs` — UNION par critère charter cité, AUCUN arbitrage sémantique.'
  );
  lines.push('> `claim_verdict` : NO_CLAIM_ALLOWED — recombinaison mécanique, pas un jugement de qualité.');
  lines.push('');
  lines.push('## Périmètre produit (dérivé du contrôle réel, pas deviné)');
  lines.push('');
  lines.push(
    `Le contrôle (artefact s1 réel déjà produit) cite ${controlScopeTags.length}/${allTags.length} critères charter : ` +
      controlScopeTags.map((t) => `\`${t}\``).join(', ') +
      '.'
  );
  lines.push('');
  lines.push('## Couverture par critère (union du panel ×5)');
  lines.push('');
  for (const tag of controlScopeTags) {
    const citingLenses = lenses.filter((l) => l.tags.includes(tag));
    lines.push(`### ${tag}`);
    lines.push('');
    if (citingLenses.length === 0) {
      lines.push(
        `**⚠ GAP — aucun lens du panel ne couvre ce critère.** Repris tel quel depuis le charter ` +
          `(non deviné, non reformulé) :`
      );
      const criterionMatch = charterText.match(new RegExp(`- "${tag}[^\n]*"`, 'i'));
      lines.push('');
      lines.push('```');
      lines.push(criterionMatch ? criterionMatch[0] : `(texte du critère "${tag}" non retrouvé littéralement)`);
      lines.push('```');
    } else {
      lines.push(`Couvert par ${citingLenses.length}/5 lens : ${citingLenses.map((l) => l.path).join(', ')}.`);
    }
    lines.push('');
  }

  lines.push('## Règles observables — union brute, groupée par lens (rien fusionné, rien tranché)');
  lines.push('');
  lines.push(
    'Chaque bloc ci-dessous est le texte VERBATIM de la section « Règles observables » d\'un lens. ' +
      "Aucune reformulation, aucune sélection d'une version « meilleure » qu'une autre — la fusion " +
      'de texte ou l\'arbitrage entre versions divergentes reste une décision HumanGate (hors scope v0).'
  );
  lines.push('');
  for (const lens of lenses) {
    lines.push(`### Source : ${lens.path}`);
    lines.push('');
    lines.push(lens.rules || '(section vide ou introuvable)');
    lines.push('');
  }

  const output = lines.join('\n');
  console.log(output);

  console.error('\n=== RÉCAPITULATIF MÉCANIQUE (stderr) ===');
  console.error(`Critères en périmètre (issus du contrôle) : ${controlScopeTags.length}`);
  console.error(`Critères couverts par au moins 1 lens : ${controlScopeTags.length - gaps.length}`);
  console.error(`Critères NON couverts (gap, remonté fog) : ${gaps.length}${gaps.length ? ' -> ' + gaps.join(', ') : ''}`);
  console.error(gaps.length === 0 ? 'RESULT: FULL_COVERAGE' : 'RESULT: GAPS_PRESENT (attendu — voir fog)');
}

main();

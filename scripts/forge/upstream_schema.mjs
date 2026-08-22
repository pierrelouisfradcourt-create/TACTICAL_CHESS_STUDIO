#!/usr/bin/env node
// upstream_schema.mjs — vocabulaire PARTAGÉ des artefacts amont de la Forge
// (prisme.json, featuremap.json, blueprint.json, wiremap.json), source unique
// consommée par les 4 oracles d'avant-build et par le comparateur.
//
// Pourquoi un module partagé : les 4 oracles et le comparateur posent les MÊMES
// questions (un item a-t-il une provenance résolvable ? une preuve attendue
// exploitable ?). Dupliqués, ces prédicats divergent — et un comparateur qui ne
// compte pas « actionnable » comme l'oracle qui le valide mesure autre chose que
// ce que la chaîne exige. Un seul endroit, donc.
//
// RÈGLE DE PROVENANCE (mesurée le 2026-08-03, ratifiée) : les exigences CORE ne
// transitent JAMAIS par un modèle — leur origine est `core_list` par construction.
// Un artefact amont produit par un worker ne peut donc porter que EXPECTED (vu
// dans le World Scan, `reference` obligatoire) ou ADDITIONS (proposé par le rôle,
// `reference` explicitement null). Une ligne CORE dans une sortie de modèle est
// une usurpation de provenance, pas une exigence de plus.
//
// ALIGNEMENT SUR LE STANDARD EXISTANT : `source`, `source_role`, `reference`,
// `expected_proof{kind,statement}`, `system_parent` sont les champs de la ligne de
// wiremap v2 (scripts/forge/standard/SCHEMA.md §3), déjà validés en aval par
// forge.standard_oracles.check_line_states. Le Prisme est le PRODUCTEUR qui
// manquait à ce validateur : ses exigences sont des lignes candidates, pas un
// vocabulaire parallèle.

// --- enums fermés ---------------------------------------------------------------

// Provenances admissibles dans un artefact PRODUIT PAR UN WORKER (CORE exclu, cf.
// règle de provenance ci-dessus).
export const WORKER_SOURCES = ['EXPECTED', 'ADDITIONS'];

// Union documentée des `kind` de preuve du standard : `bot_action` (expected_proof,
// SCHEMA.md §3) + les kinds de reçu du bloc lifecycle (file_write|oracle|mutation|
// visual). Fermé : un kind inconnu est un finding, jamais un vert silencieux.
export const PROOF_KINDS = ['bot_action', 'oracle', 'mutation', 'visual', 'file_write'];

// Étapes avales qui peuvent CONSOMMER une exigence du Prisme. Fermé : une
// destination hors de cette liste ne désigne aucun consommateur réel — l'exigence
// est un cul-de-sac, ce qui est précisément ce que la chaîne doit rendre visible.
export const DESTINATIONS = ['s3-decompo', 's4-archi', 's5-wiremap', 's9-build'];

// Seuil de similarité textuelle du comparateur — déclaré ici, jamais en dur dans
// un appelant, et TOUJOURS reporté dans la sortie (une mesure dont le seuil est
// invisible n'est pas relisible).
export const JACCARD_SEUIL = 0.6;

// --- V4 GAME LOOP (2026-08-22, GO Pierre) — champs ADDITIFS du Prisme -----------
// Le sujet PLAYER entre dans le contrat de production : chaque exigence PEUT
// désormais porter `acteur`, `loop_role`, `affordance`, `observe`. Champs
// ADDITIFS (rétro-compatibilité des runs passés, cf. run 6 : 25 exigences SANS
// ces champs restent valides) — c'est `checkLoopSpec` (loop_spec.mjs) qui exige
// la COMPLÉTUDE de la boucle (>=1 exigence par rôle), pas ce validateur.

// Sujet grammatical d'une exigence : qui agit.
export const ACTEURS = ['PLAYER', 'SYSTEM'];

// Position d'une exigence dans la boucle de jeu (séquence imposée Pierre :
// PLAYER_GOAL -> PLAYER_ACTION -> GAME_RESPONSE -> REWARD -> UNLOCK -> NEXT_GOAL
// -> META_LOOP). NONE = hors boucle (exigence produit ordinaire).
export const LOOP_ROLES = [
  'PLAYER_GOAL', 'PLAYER_ACTION', 'GAME_RESPONSE', 'REWARD',
  'UNLOCK', 'NEXT_GOAL', 'META_LOOP', 'NONE',
];

// Prédicats d'observation admissibles pour `observe.predicate`. `contains:<txt>`
// est une FAMILLE de prédicats (préfixe), pas une valeur fixe de l'enum — cf.
// isValidPredicate.
export const PREDICATES = ['nonempty', 'increases', 'changes'];

/**
 * Vrai si `p` est un prédicat d'observation valide : une valeur de PREDICATES,
 * ou une chaîne `contains:<txt>` avec `<txt>` non vide.
 * @param {unknown} p
 * @returns {boolean}
 */
export function isValidPredicate(p) {
  if (typeof p !== 'string') return false;
  if (PREDICATES.includes(p)) return true;
  return p.startsWith('contains:') && p.length > 'contains:'.length;
}

/**
 * Valide le bloc `observe: {hud, predicate}` d'une exigence de boucle.
 * @param {unknown} observe
 * @param {string} loc
 * @returns {string[]}
 */
export function validateObserveBlock(observe, loc) {
  if (observe === null || typeof observe !== 'object' || Array.isArray(observe)) {
    return [`${loc}.observe: doit etre un objet {hud, predicate}`];
  }
  const findings = [];
  if (!isNonEmptyString(observe.hud)) {
    findings.push(`${loc}.observe.hud: absent ou vide`);
  }
  if (!isValidPredicate(observe.predicate)) {
    findings.push(`${loc}.observe.predicate: invalide (attendu: ${PREDICATES.join('|')}|contains:<txt>)`);
  }
  return findings;
}

/**
 * Valide les champs ADDITIFS de boucle joueur d'une exigence (`acteur`,
 * `loop_role`, `affordance`, `observe`). Une exigence qui ne porte AUCUN de ces
 * champs produit ZÉRO finding (rétro-compatibilité) : ce validateur ne juge que
 * ce qui est PRÉSENT et déclaré.
 * @param {object} ex
 * @param {string} loc
 * @returns {string[]}
 */
export function validateLoopFields(ex, loc) {
  const findings = [];
  if (ex.acteur !== undefined && !ACTEURS.includes(ex.acteur)) {
    findings.push(`${loc}.acteur: invalide (attendu: ${ACTEURS.join('|')})`);
  }
  if (ex.loop_role === undefined) return findings;
  if (!LOOP_ROLES.includes(ex.loop_role)) {
    findings.push(`${loc}.loop_role: invalide (attendu: ${LOOP_ROLES.join('|')})`);
    return findings;
  }
  if (['PLAYER_ACTION', 'UNLOCK', 'META_LOOP'].includes(ex.loop_role)) {
    if (ex.acteur !== 'PLAYER') {
      findings.push(
        `${loc}.acteur: doit valoir 'PLAYER' quand loop_role='${ex.loop_role}' `
        + '(action joueur a la voix active, le joueur pour sujet)',
      );
    }
    if (!isNonEmptyString(ex.affordance)) {
      findings.push(`${loc}.affordance: absent ou vide (obligatoire quand loop_role='${ex.loop_role}')`);
    }
    findings.push(...validateObserveBlock(ex.observe, loc));
  } else if (['PLAYER_GOAL', 'NEXT_GOAL'].includes(ex.loop_role)) {
    if (!isNonEmptyString(ex.observe?.hud)) {
      findings.push(`${loc}.observe.hud: absent ou vide (obligatoire quand loop_role='${ex.loop_role}')`);
    }
  }
  return findings;
}

// --- primitives de validation ---------------------------------------------------

/**
 * Vrai si `v` est une chaîne non vide (après trim). Le prédicat le plus utilisé de
 * tout le fichier : « présent » et « non vide » ne sont pas la même question, et
 * confondre les deux est la façon dont un artefact creux passe un oracle.
 * @param {unknown} v
 * @returns {boolean}
 */
export function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Valide un bloc `expected_proof` : {kind ∈ PROOF_KINDS, statement non vide}.
 * C'est le maillon « Preuve attendue » de la chaîne Observation → Exigence →
 * Preuve attendue → Destination. Une exigence sans preuve attendue exploitable
 * n'est pas jugée mauvaise : elle est NON ACTIONNABLE, et c'est un fait mesurable.
 * @param {unknown} proof
 * @param {string} loc localisation déjà formée (ex. exigences[0])
 * @param {string} champ nom RÉEL du champ dans l'artefact inspecté. Le blueprint
 *   l'appelle `preuve_attendue`, la ligne de wiremap `expected_proof` : un finding
 *   qui nomme un champ absent de l'artefact envoie son auteur chercher au mauvais
 *   endroit. Le message doit citer le champ tel qu'il existe, pas tel que le
 *   validateur l'a nommé en interne.
 * @returns {string[]} findings (vide = conforme)
 */
export function validateExpectedProof(proof, loc, champ = 'expected_proof') {
  if (proof === null || typeof proof !== 'object' || Array.isArray(proof)) {
    return [`${loc}.${champ}: doit etre un objet {kind, statement}`];
  }
  const findings = [];
  if (!PROOF_KINDS.includes(proof.kind)) {
    findings.push(`${loc}.${champ}.kind: invalide (attendu: ${PROOF_KINDS.join('|')})`);
  }
  if (!isNonEmptyString(proof.statement)) {
    findings.push(`${loc}.${champ}.statement: absent ou vide (une preuve attendue sans enonce ne se verifie pas)`);
  }
  return findings;
}

/**
 * Valide la paire {source, reference} d'un item amont. Applique la règle de
 * provenance : EXPECTED exige une `reference` non vide (ce qui a été observé), et
 * ADDITIONS exige `reference` EXPLICITEMENT null — jamais un champ omis. Même
 * discipline que validateConditionState de check_worldscan.mjs : « déclaré absent »
 * et « non renseigné » sont deux états différents, et seul le premier est valide.
 * @param {object} item
 * @param {string} loc
 * @returns {string[]}
 */
export function validateProvenance(item, loc) {
  const findings = [];
  if (!WORKER_SOURCES.includes(item.source)) {
    findings.push(
      `${loc}.source: invalide (attendu: ${WORKER_SOURCES.join('|')}) — `
      + 'CORE ne transite JAMAIS par un modele (origine core_list par construction)',
    );
    return findings;
  }
  if (!isNonEmptyString(item.source_role)) {
    findings.push(`${loc}.source_role: obligatoire et non vide sur EXPECTED/ADDITIONS (regle check_line_states)`);
  }
  const hasRef = 'reference' in item;
  if (item.source === 'EXPECTED') {
    if (!isNonEmptyString(item.reference)) {
      findings.push(`${loc}.reference: obligatoire et non vide quand source=EXPECTED (la source externe nommee)`);
    }
  } else if (!hasRef) {
    findings.push(`${loc}.reference: doit etre present et valoir null quand source=ADDITIONS (invention declaree, jamais un champ omis)`);
  } else if (item.reference !== null) {
    findings.push(`${loc}.reference: doit valoir exactement null quand source=ADDITIONS (une addition ne cite aucune source externe)`);
  }
  return findings;
}

// --- prisme.json ----------------------------------------------------------------

/**
 * Valide les 3 maillons TEXTUELS de la chaîne de falsifiabilité du Prisme :
 *
 *     Observation  →  Claim  →  Exigence  ( →  Preuve attendue  →  Destination )
 *     ce que j'ai    ce que    ce que
 *     vu             j'en      j'impose
 *                    déduis
 *
 * Pourquoi `claim` est un champ à part et pas un luxe rédactionnel : sans lui, une
 * inférence non dite se glisse entre l'observation et l'exigence, et on ne peut plus
 * dire OÙ la chaîne a cassé quand l'exigence est mauvaise — la donnée était fausse,
 * ou la déduction ? Les deux se réparent à des endroits différents. Un champ non
 * séparé n'est ni vérifiable ni réfutable isolément.
 *
 * Les 3 doivent DIFFÉRER : recopier l'observation dans le claim est la façon la plus
 * simple de satisfaire le schéma sans rien déduire — le contrôle le plus utile ici.
 *
 * @param {object} ex
 * @param {string} loc
 * @returns {string[]}
 */
export function validateChaine(ex, loc) {
  const findings = [];
  if (!isNonEmptyString(ex.observation)) {
    findings.push(`${loc}.observation: absent ou vide (maillon 1 : ce qui a ete observe)`);
  }
  if (!isNonEmptyString(ex.claim)) {
    findings.push(`${loc}.claim: absent ou vide (maillon 2 : ce que l'observation permet d'affirmer)`);
  }
  if (!isNonEmptyString(ex.enonce)) {
    findings.push(`${loc}.enonce: absent ou vide (maillon 3 : l'exigence imposee au jeu)`);
  }
  const trio = [ex.observation, ex.claim, ex.enonce];
  if (trio.every(isNonEmptyString)) {
    const norm = trio.map(normalizeText);
    if (norm[0] === norm[1] || norm[1] === norm[2] || norm[0] === norm[2]) {
      findings.push(
        `${loc}: observation/claim/enonce doivent DIFFERER — recopier l'un dans l'autre `
        + 'satisfait le schema sans rien deduire, et rend indecidable le lieu de la panne '
        + '(donnee fausse ou deduction fausse ?)',
      );
    }
  }
  return findings;
}

/**
 * Valide une exigence du Prisme : la chaîne complète Observation → Exigence →
 * Preuve attendue → Destination, plus sa provenance.
 * @param {unknown} ex
 * @param {number} idx
 * @returns {string[]}
 */
export function validateExigence(ex, idx) {
  const loc = `exigences[${idx}]`;
  if (ex === null || typeof ex !== 'object' || Array.isArray(ex)) {
    return [`${loc}: doit etre un objet {id, source, source_role, reference, observation, claim, enonce, expected_proof, destination}`];
  }
  const findings = [];
  if (!isNonEmptyString(ex.id)) findings.push(`${loc}.id: absent ou vide`);
  findings.push(...validateChaine(ex, loc));
  findings.push(...validateProvenance(ex, loc));
  findings.push(...validateExpectedProof(ex.expected_proof, loc));
  if (!DESTINATIONS.includes(ex.destination)) {
    findings.push(`${loc}.destination: invalide (attendu: ${DESTINATIONS.join('|')}) — une exigence sans consommateur aval est un cul-de-sac`);
  }
  findings.push(...validateLoopFields(ex, loc));
  return findings;
}

/**
 * Valide la forme complète de prisme.json.
 * @param {unknown} doc
 * @returns {string[]}
 */
export function validatePrisme(doc) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['prisme.json: doit etre un objet {game_id, exigences}'];
  }
  const findings = [];
  if (!isNonEmptyString(doc.game_id)) findings.push('prisme.json.game_id: absent ou vide');
  if (!Array.isArray(doc.exigences) || doc.exigences.length === 0) {
    findings.push('prisme.json.exigences: doit etre un tableau NON VIDE');
    return findings;
  }
  doc.exigences.forEach((ex, i) => findings.push(...validateExigence(ex, i)));
  const ids = doc.exigences.filter((e) => e && isNonEmptyString(e.id)).map((e) => e.id);
  findings.push(...duplicateIds(ids, 'prisme.json.exigences'));
  return findings;
}

// --- featuremap.json ------------------------------------------------------------

/**
 * Aplatit l'arbre Système→Feature→capacité en liste de FEUILLES, chacune portant
 * son chemin. Utilisé par l'oracle (complétude) et par le comparateur (items
 * alignables) — une seule définition de « ce qu'est une feuille ».
 * @param {object} doc featuremap déjà parsée
 * @returns {Array<{systeme:string, feature:string, leaf:object, loc:string}>}
 */
export function collectLeaves(doc) {
  const out = [];
  const systemes = Array.isArray(doc?.systemes) ? doc.systemes : [];
  systemes.forEach((sys, si) => {
    const features = Array.isArray(sys?.features) ? sys.features : [];
    features.forEach((feat, fi) => {
      const caps = Array.isArray(feat?.capacites) ? feat.capacites : [];
      caps.forEach((leaf, ci) => {
        out.push({
          systeme: typeof sys?.id === 'string' ? sys.id : '',
          feature: typeof feat?.id === 'string' ? feat.id : '',
          leaf,
          loc: `systemes[${si}].features[${fi}].capacites[${ci}]`,
        });
      });
    });
  });
  return out;
}

/**
 * Liste les ids de features déclarés dans la featuremap (cible de `couvre[]` côté
 * blueprint).
 * @param {object} doc
 * @returns {string[]}
 */
export function featureIds(doc) {
  const out = [];
  const systemes = Array.isArray(doc?.systemes) ? doc.systemes : [];
  for (const sys of systemes) {
    const features = Array.isArray(sys?.features) ? sys.features : [];
    for (const feat of features) if (isNonEmptyString(feat?.id)) out.push(feat.id);
  }
  return out;
}

/**
 * Signale les ids dupliqués d'une collection. Un id dupliqué casse tout
 * alignement en aval (couverture, comparaison) en silence : il vaut mieux le dire.
 * @param {string[]} ids
 * @param {string} loc
 * @returns {string[]}
 */
export function duplicateIds(ids, loc) {
  const seen = new Set();
  const dup = new Set();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup].map((id) => `${loc}: id duplique '${id}' (tout alignement aval devient ambigu)`);
}

/**
 * Valide une feuille de featuremap : {id, capacite, expected_proof, source_ref}.
 * `source_ref` est la traçabilité vers l'exigence du Prisme dont la feuille
 * découle — sa RÉSOLUTION est vérifiée par l'oracle (qui a le Prisme sous la
 * main), pas ici.
 * @param {object} entry sortie de collectLeaves
 * @returns {string[]}
 */
export function validateLeaf(entry) {
  const { leaf, loc } = entry;
  if (leaf === null || typeof leaf !== 'object' || Array.isArray(leaf)) {
    return [`${loc}: doit etre un objet {id, capacite, expected_proof, source_ref}`];
  }
  const findings = [];
  if (!isNonEmptyString(leaf.id)) findings.push(`${loc}.id: absent ou vide`);
  if (!isNonEmptyString(leaf.capacite)) findings.push(`${loc}.capacite: absent ou vide`);
  if (!isNonEmptyString(leaf.source_ref)) {
    findings.push(`${loc}.source_ref: absent ou vide (une feuille sans exigence d'origine est une invention non declaree)`);
  }
  findings.push(...validateExpectedProof(leaf.expected_proof, loc));
  return findings;
}

/**
 * Valide la forme complète de featuremap.json (arbre non vide, systèmes et
 * features identifiés, feuilles conformes).
 * @param {unknown} doc
 * @returns {string[]}
 */
export function validateFeaturemap(doc) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['featuremap.json: doit etre un objet {game_id, systemes}'];
  }
  const findings = [];
  if (!isNonEmptyString(doc.game_id)) findings.push('featuremap.json.game_id: absent ou vide');
  if (!Array.isArray(doc.systemes) || doc.systemes.length === 0) {
    findings.push('featuremap.json.systemes: doit etre un tableau NON VIDE');
    return findings;
  }
  doc.systemes.forEach((sys, si) => {
    if (sys === null || typeof sys !== 'object' || Array.isArray(sys)) {
      findings.push(`systemes[${si}]: doit etre un objet {id, features}`);
      return;
    }
    if (!isNonEmptyString(sys.id)) findings.push(`systemes[${si}].id: absent ou vide`);
    if (!Array.isArray(sys.features) || sys.features.length === 0) {
      findings.push(`systemes[${si}].features: doit etre un tableau NON VIDE (un systeme sans feature ne decompose rien)`);
      return;
    }
    sys.features.forEach((feat, fi) => {
      if (feat === null || typeof feat !== 'object' || Array.isArray(feat)) {
        findings.push(`systemes[${si}].features[${fi}]: doit etre un objet {id, capacites}`);
        return;
      }
      if (!isNonEmptyString(feat.id)) findings.push(`systemes[${si}].features[${fi}].id: absent ou vide`);
      if (!Array.isArray(feat.capacites) || feat.capacites.length === 0) {
        findings.push(`systemes[${si}].features[${fi}].capacites: doit etre un tableau NON VIDE (une feature sans feuille ne porte aucune preuve)`);
      }
    });
  });
  const leaves = collectLeaves(doc);
  leaves.forEach((entry) => findings.push(...validateLeaf(entry)));
  findings.push(...duplicateIds(featureIds(doc), 'featuremap.json.features'));
  findings.push(...duplicateIds(
    leaves.filter((e) => isNonEmptyString(e.leaf?.id)).map((e) => e.leaf.id),
    'featuremap.json.capacites',
  ));
  return findings;
}

// --- normalisation & similarité (comparateur) -----------------------------------

/**
 * Normalise un texte pour comparaison : minuscules, accents retirés, ponctuation
 * réduite à des espaces. Déterministe, sans dictionnaire — on ne cherche pas à
 * comprendre le texte, seulement à ne pas le déclarer différent pour une virgule.
 * @param {unknown} s
 * @returns {string}
 */
export function normalizeText(s) {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Similarité de Jaccard sur les tokens normalisés. Jamais utilisée pour INVENTER
 * une correspondance entre deux items qui déclarent des provenances différentes
 * (cf. compare_artifacts.mjs, ordre d'alignement) — uniquement pour rapprocher
 * deux items dont AUCUN ne cite de source.
 * @param {string} a
 * @param {string} b
 * @returns {number} 0..1
 */
export function jaccard(a, b) {
  const ta = new Set(normalizeText(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

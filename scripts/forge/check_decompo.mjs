#!/usr/bin/env node
// check_decompo.mjs — oracle déterministe non-LLM de l'étape s3-decompo, sur
// l'artefact structuré featuremap.json.
//
// CE QU'IL MESURE (spec Pierre, 2026-08-04) :
//   - COUVERTURE   : toute exigence du Prisme est portée par >=1 feuille.
//   - NON-INVENTION: toute feuille cite une exigence RÉELLE du Prisme (`source_ref`
//                    résolvable). Une feuille non sourcée est une invention non
//                    déclarée — le contrat s3 interdit d'inventer une preuve.
//   - COMPLÉTUDE   : chaque feuille porte {capacite, expected_proof} (contrat
//                    s3-decompo.yaml : « pas de feuille orpheline »).
//   - GRANULARITÉ  : MESURÉE ET REPORTÉE, PAS GATÉE. Règle de variance ratifiée
//                    (2026-07-21) : on prouve d'abord qu'une métrique porte une
//                    information variable avant de s'en servir pour classer. Poser
//                    aujourd'hui un seuil « entre 2 et 7 feuilles par feature »
//                    serait un chiffre inventé qui déciderait d'un verdict.
//
// La STABILITÉ (même entrée -> même sortie d'un worker) n'est PAS mesurable ici :
// elle exige N exécutions, c'est le rôle du protocole d'expérience, pas d'un oracle
// qui ne voit qu'un artefact. Ne pas le prétendre.
//
// Usage :
//   node check_decompo.mjs <featuremap.json> --prisme <prisme.json> [--json]
// Exit 0 = OK · 1 = FAIL · 2 = usage.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isNonEmptyString,
  validateFeaturemap,
  collectLeaves,
} from './upstream_schema.mjs';

const EMPTY_STATS = {
  systemes: 0, features: 0, feuilles: 0,
  feuilles_sourcees: 0, exigences_prisme: 0, exigences_couvertes: 0,
  feuilles_par_feature_min: 0, feuilles_par_feature_max: 0,
  actions_joueur: 0, actions_joueur_prouvees_depuis_scene: 0,
  maillons_couverts: {
    F: 0, G: 0, H: 0, I: 0, J: 0,
  },
};

// V4 GAME LOOP (2026-08-22, GO Pierre) — maillons F..J additifs.
// F=UNLOCK, I=META_LOOP : memes regles que B (existant, boucle_sans_entree) —
// couverts automatiquement par la boucle acteur=PLAYER+affordance ci-dessous.
// G=NEXT_GOAL : exige une feuille d'EFFET (file_write|visual) sourcee sur
// l'exigence, jamais une entree seule.
// H=REPEAT, J=ADVANTAGE : REJEUX — aucune feuille propre exigee, mais chaque ref
// de `replay`/`replay_ref` doit resoudre une exigence du Prisme COUVERTE par
// ailleurs (sinon le rejeu porte sur du vide).
const LOOP_ROLE_LETTER = {
  UNLOCK: 'F', NEXT_GOAL: 'G', REPEAT: 'H', META_LOOP: 'I', ADVANTAGE: 'J',
};
const EFFECT_KINDS = ['file_write', 'visual'];

/**
 * Compte les feuilles par feature (granularité observée). Retourne min/max sur
 * l'ensemble des features — reporté, jamais utilisé pour décider un verdict.
 * @param {object} doc featuremap parsée
 * @returns {{min:number, max:number}}
 */
export function granularite(doc) {
  const counts = [];
  const systemes = Array.isArray(doc?.systemes) ? doc.systemes : [];
  for (const sys of systemes) {
    const features = Array.isArray(sys?.features) ? sys.features : [];
    for (const feat of features) {
      counts.push(Array.isArray(feat?.capacites) ? feat.capacites.length : 0);
    }
  }
  if (counts.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...counts), max: Math.max(...counts) };
}

/**
 * Oracle complet sur une featuremap déjà parsée, confrontée au Prisme dont elle
 * découle.
 * @param {unknown} doc featuremap
 * @param {unknown} prisme prisme.json parsé (obligatoire : sans lui, ni couverture
 *   ni non-invention ne sont vérifiables — l'oracle le dit au lieu de sauter)
 * @returns {{ok:boolean, verdict:'OK'|'FAIL', problems:string[],
 *            exigences_non_couvertes:string[], feuilles_non_sourcees:string[], stats:object}}
 */
export function checkDecompoDoc(doc, prisme) {
  const problems = [...validateFeaturemap(doc)];
  const exigences_non_couvertes = [];
  const feuilles_non_sourcees = [];
  const boucle_sans_entree = [];
  const boucle_sans_effet = [];
  const boucle_replay_non_couvert = [];

  const prismeExigences = Array.isArray(prisme?.exigences) ? prisme.exigences : null;
  if (prismeExigences === null) {
    problems.push('prisme: manifeste absent ou sans exigences[] — la couverture et la non-invention ne sont pas verifiables (ni sautees en silence)');
    return {
      ok: false, verdict: 'FAIL', problems,
      exigences_non_couvertes, feuilles_non_sourcees, boucle_sans_entree,
      boucle_sans_effet, boucle_replay_non_couvert, stats: EMPTY_STATS,
    };
  }

  const exigenceIds = new Set(
    prismeExigences.filter((e) => isNonEmptyString(e?.id)).map((e) => e.id),
  );
  const exigenceById = new Map(
    prismeExigences.filter((e) => isNonEmptyString(e?.id)).map((e) => [e.id, e]),
  );
  const leaves = collectLeaves(doc);
  const couvertes = new Set();
  let sourcees = 0;
  let actionsJoueur = 0;
  let actionsJoueurProuvees = 0;
  const maillons_couverts = {
    F: 0, G: 0, H: 0, I: 0, J: 0,
  };

  for (const entry of leaves) {
    const ref = entry.leaf?.source_ref;
    if (!isNonEmptyString(ref)) continue; // déjà remonté par validateFeaturemap
    if (exigenceIds.has(ref)) {
      couvertes.add(ref);
      sourcees += 1;

      // V4 GAME LOOP (2026-08-22, GO Pierre) : une action joueur (exigence
      // acteur=PLAYER avec affordance) doit se decomposer en une capacite
      // d'ENTREE — preuve bot_action depuis main.tscn — jamais l'effet seul.
      // Regle etendue aux maillons F (UNLOCK) et I (META_LOOP) : memes exigences
      // que B (PLAYER_ACTION), portees par la meme condition acteur+affordance.
      const exigence = exigenceById.get(ref);
      if (exigence?.acteur === 'PLAYER' && isNonEmptyString(exigence?.affordance)) {
        actionsJoueur += 1;
        const proof = entry.leaf?.expected_proof;
        const kindOk = proof?.kind === 'bot_action';
        const statementOk = isNonEmptyString(proof?.statement)
          && proof.statement.toLowerCase().includes('main.tscn');
        if (kindOk && statementOk) {
          actionsJoueurProuvees += 1;
          const letter = LOOP_ROLE_LETTER[exigence?.loop_role];
          if (letter === 'F' || letter === 'I') maillons_couverts[letter] += 1;
        } else {
          boucle_sans_entree.push(
            `${entry.loc}: feuille '${entry.leaf?.id}' realise l'action joueur '${exigence.affordance}' `
            + `(exigence ${ref}) sans preuve bot_action depuis main.tscn`,
          );
        }
      }
    } else {
      feuilles_non_sourcees.push(
        `${entry.loc}.source_ref: '${ref}' ne resout aucune exigence du Prisme (invention non declaree)`,
      );
    }
  }

  // V4 GAME LOOP — maillons G (NEXT_GOAL) et H/J (REPEAT/ADVANTAGE, rejeux).
  // H et J ne portent AUCUNE feuille propre par construction (ce sont des
  // rejeux d'exigences deja realisees) : ils sont donc exclus de la boucle de
  // couverture generique ci-dessous, et verifies ici via leur replay/replay_ref.
  const rejouables = new Set();
  for (const ex of prismeExigences) {
    if (ex === null || typeof ex !== 'object') continue;
    const role = ex.loop_role;
    if (role === 'NEXT_GOAL') {
      const hasEffect = leaves.some((entry) => entry.leaf?.source_ref === ex.id
        && EFFECT_KINDS.includes(entry.leaf?.expected_proof?.kind));
      if (hasEffect) {
        maillons_couverts.G += 1;
      } else {
        boucle_sans_effet.push(
          `exigence '${ex.id}' (NEXT_GOAL) sans feuille d'effet (file_write|visual) sourcee sur cette exigence`,
        );
      }
    } else if (role === 'REPEAT' || role === 'ADVANTAGE') {
      rejouables.add(ex.id);
      const letter = role === 'REPEAT' ? 'H' : 'J';
      const champ = role === 'REPEAT' ? 'replay' : 'replay_ref';
      const refs = role === 'REPEAT'
        ? (Array.isArray(ex.replay) ? ex.replay : [])
        : (isNonEmptyString(ex.replay_ref) ? [ex.replay_ref] : []);
      if (refs.length === 0) {
        boucle_replay_non_couvert.push(`exigence '${ex.id}' (${role}) sans ${champ} exploitable`);
        continue;
      }
      let allOk = true;
      for (const ref of refs) {
        if (!exigenceIds.has(ref)) {
          boucle_replay_non_couvert.push(
            `exigence '${ex.id}' (${role}): ${champ} '${ref}' ne resout aucune exigence du Prisme`,
          );
          allOk = false;
        } else if (!couvertes.has(ref)) {
          boucle_replay_non_couvert.push(
            `exigence '${ex.id}' (${role}): ${champ} '${ref}' cible une exigence non couverte par une feuille`,
          );
          allOk = false;
        }
      }
      if (allOk) maillons_couverts[letter] += 1;
    }
  }

  for (const id of exigenceIds) {
    if (!couvertes.has(id) && !rejouables.has(id)) {
      exigences_non_couvertes.push(`exigence '${id}' du Prisme n'est portee par aucune feuille (omission silencieuse)`);
    }
  }

  const g = granularite(doc);
  const systemes = Array.isArray(doc?.systemes) ? doc.systemes.length : 0;
  const features = Array.isArray(doc?.systemes)
    ? doc.systemes.reduce((a, s) => a + (Array.isArray(s?.features) ? s.features.length : 0), 0)
    : 0;

  const stats = {
    systemes,
    features,
    feuilles: leaves.length,
    feuilles_sourcees: sourcees,
    exigences_prisme: exigenceIds.size,
    exigences_couvertes: couvertes.size,
    feuilles_par_feature_min: g.min,
    feuilles_par_feature_max: g.max,
    actions_joueur: actionsJoueur,
    actions_joueur_prouvees_depuis_scene: actionsJoueurProuvees,
    maillons_couverts,
  };

  const all = [
    ...problems, ...exigences_non_couvertes, ...feuilles_non_sourcees,
    ...boucle_sans_entree, ...boucle_sans_effet, ...boucle_replay_non_couvert,
  ];
  const ok = all.length === 0;
  return {
    ok, verdict: ok ? 'OK' : 'FAIL',
    problems, exigences_non_couvertes, feuilles_non_sourcees, boucle_sans_entree,
    boucle_sans_effet, boucle_replay_non_couvert, stats,
  };
}

/**
 * Lit les deux artefacts sur disque et applique l'oracle. Ne lève jamais.
 * @param {string} featuremapPath
 * @param {string} prismePath
 * @returns {Promise<object>}
 */
export async function checkDecompoFiles(featuremapPath, prismePath) {
  const fail = (msg) => ({
    ok: false, verdict: 'FAIL', problems: [msg],
    exigences_non_couvertes: [], feuilles_non_sourcees: [], boucle_sans_entree: [],
    boucle_sans_effet: [], boucle_replay_non_couvert: [], stats: EMPTY_STATS,
  });
  const load = async (p, label) => {
    let raw;
    try {
      raw = await readFile(p, 'utf-8');
    } catch (err) {
      return { err: `${label} ${p}: absent ou illisible (${err.message})` };
    }
    if (raw.trim().length === 0) return { err: `${label} ${p}: present mais vide` };
    try {
      return { doc: JSON.parse(raw) };
    } catch (err) {
      return { err: `${label} ${p}: JSON invalide (${err.message})` };
    }
  };
  const fm = await load(featuremapPath, 'featuremap');
  if (fm.err) return fail(fm.err);
  const pr = await load(prismePath, 'prisme');
  if (pr.err) return fail(pr.err);
  return checkDecompoDoc(fm.doc, pr.doc);
}

// ---- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const prIdx = argv.indexOf('--prisme');
  const prismePath = prIdx >= 0 ? argv[prIdx + 1] : null;
  const target = argv.filter((a) => !a.startsWith('--') && a !== prismePath)[0];

  if (!target || !prismePath) {
    console.error('usage: node check_decompo.mjs <featuremap.json> --prisme <prisme.json> [--json]');
    process.exit(2);
  }

  (async () => {
    const r = await checkDecompoFiles(target, prismePath);
    console.log(`VERDICT DECOMPO: ${r.verdict}`);
    r.problems.forEach((p) => console.error(`  FAIL: ${p}`));
    r.exigences_non_couvertes.forEach((p) => console.error(`  FAIL couverture: ${p}`));
    r.feuilles_non_sourcees.forEach((p) => console.error(`  FAIL invention: ${p}`));
    r.boucle_sans_entree.forEach((p) => console.error(`  FAIL boucle: ${p}`));
    r.boucle_sans_effet.forEach((p) => console.error(`  FAIL boucle (effet): ${p}`));
    r.boucle_replay_non_couvert.forEach((p) => console.error(`  FAIL boucle (replay): ${p}`));
    const mc = r.stats.maillons_couverts || {
      F: 0, G: 0, H: 0, I: 0, J: 0,
    };
    console.error(`  stats: ${r.stats.systemes} systeme(s) / ${r.stats.features} feature(s) / ${r.stats.feuilles} feuille(s) / ${r.stats.exigences_couvertes} sur ${r.stats.exigences_prisme} exigence(s) couverte(s) / granularite ${r.stats.feuilles_par_feature_min}-${r.stats.feuilles_par_feature_max} feuille(s) par feature (REPORTEE, non gatee) / ${r.stats.actions_joueur_prouvees_depuis_scene} sur ${r.stats.actions_joueur} action(s) joueur prouvee(s) depuis main.tscn / maillons F=${mc.F} G=${mc.G} H=${mc.H} I=${mc.I} J=${mc.J}`);
    console.log(JSON.stringify({
      ok: r.ok,
      problems: r.problems,
      exigences_non_couvertes: r.exigences_non_couvertes,
      feuilles_non_sourcees: r.feuilles_non_sourcees,
      boucle_sans_entree: r.boucle_sans_entree,
      boucle_sans_effet: r.boucle_sans_effet,
      boucle_replay_non_couvert: r.boucle_replay_non_couvert,
      stats: r.stats,
    }, null, 2));
    process.exit(r.ok ? 0 : 1);
  })();
}

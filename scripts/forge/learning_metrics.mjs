#!/usr/bin/env node
// learning_metrics.mjs — instrumentation d'apprentissage de la Forge (Task 12).
//
// Objectif : ne pas seulement produire des jeux, mais consigner CE QUE LA FORGE A APPRIS
// en forgeant chaque brique — reuse_ratio (combien vient de la bibliothèque), le nombre
// d'itérations d'oracle nécessaires avant le vert, et un delta de joute quand une
// comparaison à l'état de l'art existe. Une seule mécanique n'a AUCUNE valeur statistique
// (spec §10) : cette instrumentation établit la ligne de base et prouve qu'elle enregistre,
// rien de plus. Voir knowledge_base/LEARNING_CURVE_README.md pour la mention complète de la limite.
//
// Discipline stricte : buildRecord() est PUR — pas de disque, pas d'horloge interne
// (le timestamp est injecté en paramètre), donc testable et déterministe.
// recordLearning() est l'unique point d'effet de bord (écriture JSONL en append).
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Construit (et valide) une ligne de la courbe d'apprentissage. Fonction pure : aucun
 * accès disque, aucun Date.now() interne — le timestamp est fourni par l'appelant pour
 * rester déterministe et testable.
 * @param {{brick_id:string, reuse_ratio:number, oracle_iterations:number, joust_delta:(number|null)}} params
 * @param {string} [timestamp] ISO 8601, injecté par l'appelant (défaut: non fourni -> omis du record par recordLearning)
 * @returns {{brick_id:string, reuse_ratio:number, oracle_iterations:number, joust_delta:(number|null), no_comparison:boolean, timestamp:(string|undefined)}}
 */
export function buildRecord({ brick_id, reuse_ratio, oracle_iterations, joust_delta }, timestamp) {
  if (typeof brick_id !== 'string' || brick_id.length === 0) {
    throw new Error('brick_id manquant ou vide : pas de ligne anonyme dans la courbe d\'apprentissage');
  }
  if (typeof reuse_ratio !== 'number' || Number.isNaN(reuse_ratio) || reuse_ratio < 0) {
    throw new Error(`reuse_ratio invalide (nombre >= 0 attendu) : ${reuse_ratio}`);
  }
  if (typeof oracle_iterations !== 'number' || !Number.isInteger(oracle_iterations) || oracle_iterations < 0) {
    throw new Error(`oracle_iterations invalide (entier >= 0 attendu) : ${oracle_iterations}`);
  }
  if (joust_delta !== null && typeof joust_delta !== 'number') {
    throw new Error(`joust_delta invalide (nombre ou null attendu) : ${joust_delta}`);
  }

  const record = {
    brick_id,
    reuse_ratio,
    oracle_iterations,
    joust_delta,
    no_comparison: joust_delta === null,
  };
  if (timestamp !== undefined) record.timestamp = timestamp;
  return record;
}

/**
 * Ajoute une ligne à knowledge_base/learning_curve.jsonl. Seul point d'effet de bord
 * du module : construit via buildRecord() (donc validé), puis écrit en append (une ligne
 * JSON par appel, jamais réécrit).
 * @param {{brick_id:string, reuse_ratio:number, oracle_iterations:number, joust_delta:(number|null)}} params
 * @param {string} [timestamp] ISO 8601 ; par défaut new Date().toISOString() (seul endroit du
 *   module où l'horloge réelle apparaît — jamais dans buildRecord()).
 * @param {string} [targetPath] chemin du fichier JSONL cible (paramétrable pour les tests).
 * @returns {object} le record écrit
 */
export function recordLearning(params, timestamp = new Date().toISOString(), targetPath = 'knowledge_base/learning_curve.jsonl') {
  const record = buildRecord(params, timestamp);
  const dir = dirname(targetPath);
  if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(targetPath, JSON.stringify(record) + '\n', 'utf-8');
  return record;
}

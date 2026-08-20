# Audit Standard — Tactical Chess Studio

> Version 1.0 — 2026-06-01
> claim_verdict: NO_CLAIM_ALLOWED

---

## Principes fondamentaux

1. **Pas de claim sans evidence.** Toute assertion dans un rapport doit être le résultat direct d'une commande exécutée et dont la sortie est reproduite.
2. **Reproduisibilité.** Même commande, même environnement → même résultat. Toute dépendance au contexte (date, fichiers temporaires) est explicitement notée.
3. **Fail-closed.** En cas d'erreur d'exécution d'un check, le verdict est INCONNU — jamais PASS.
4. **NO_CLAIM_ALLOWED.** Aucune chaîne ne peut émettre un verdict global PASS si un seul finding de niveau ≥ BASSE est présent et non résolu.

---

## Niveaux de sévérité

| Niveau | Code | Critère d'application |
|---|---|---|
| Critique | `CRIT` | Bloque build, tests, ou corrompt données. Action immédiate requise. |
| Haute | `HAUTE` | Risque de régression, perte de données, ou ambiguïté de vérité. |
| Moyenne | `MOY` | Dette technique mesurable, non bloquante à court terme. |
| Basse | `BASSE` | Nettoyage, hygiène, cosmétique. Acceptable dans un sprint. |
| Info | `INFO` | Observation neutre — état attendu confirmé ou métrique de référence. |

---

## Chaînes d'audit disponibles

| Chaîne | Script | Périmètre | Durée estimée |
|---|---|---|---|
| **Hygiene** | `chains/chain_hygiene.ps1` | Fichiers temporaires, sentinelles vides, fichiers racine parasites, artefacts stale | < 10s |
| **Rust** | `chains/chain_rust.ps1` | `cargo check`, tests, warnings, `unwrap()`, dead code | 3–5 min |
| **Python** | `chains/chain_python.ps1` | Syntaxe, imports, cohérence `requirements.txt`, `__pycache__` stale | < 30s |
| **Lab** | `chains/chain_lab.ps1` | Datasets JSONL, taille `lab/runs/`, intégrité puzzles, `ACTIVE_DATASET.txt` | < 15s |
| **Models** | `chains/chain_models.ps1` | Présence et taille modèles chess (.pt), LLMs GGUF, cohérence `latest_run.json` | < 10s |

---

## Format de rapport de chaîne

Chaque chaîne écrit sa sortie en console structurée :

```
=== CHAIN <NOM> — YYYY-MM-DD HH:MM:SS ===

[CHECK 1/N] <description du check>
  → <résultat brut ou commande>
  STATUS: OK | CRIT | HAUTE | MOY | BASSE | INFO
  FINDING: <description si non-OK>

...

=== RÉSUMÉ ===
Checks : N total | N OK | N findings
Findings :
  [BASSE]  <...>
  [MOY]    <...>
VERDICT: PASS | PARTIAL | FAIL | INCONNU
```

Les rapports persistés sont nommés `reports/AUDIT_<CHAIN>_<YYYYMMDD_HHMMSS>.txt`.

---

## Règle NO_CLAIM_ALLOWED — Détail

- **PASS** : zéro finding de niveau BASSE ou supérieur.
- **PARTIAL** : un ou plusieurs findings BASSE, aucun MOY+.
- **FAIL** : au moins un finding MOY ou supérieur.
- **INCONNU** : au moins un check n'a pas pu s'exécuter.

Le mot "sain", "propre", "stable", "bon" ne peut pas apparaître dans un verdict PARTIAL, FAIL, ou INCONNU.

---

## Mise à jour du standard

Toute modification de ce fichier doit être tracée dans `KAIZEN_LOG.md` avec la rubrique concernée.

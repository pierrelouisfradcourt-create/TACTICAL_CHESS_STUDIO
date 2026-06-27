---
name: imp-readiness
description: Valide un IMP avant pickup par un agent — produit un verdict READY / NEEDS_WORK / BLOCKED sur les critères de lane, blocage, fichiers et acceptance.
---

# /imp-readiness

Vérifie qu'un IMP est prêt à être exécuté par un agent automatique. Aucun agent ne doit démarrer un IMP sans avoir obtenu **READY** ici. Le verdict est mécanique : quatre critères, règle de décision déterministe.

> Règles absolues (CLAUDE.md) : `claim_verdict: NO_CLAIM_ALLOWED`, séparer `software_verdict` / `evidence_verdict` / `claim_verdict`, HumanGate décide le merge.

---

## Entrée attendue

Un identifiant d'IMP (ex. `IMP-042`) ou un bloc YAML collé. Le ledger canonique est :

```
lab/chains/IMPROVEMENT_LEDGER.yaml
```

Champs inspectés : `id`, `status`, `lane`, `blocked_by`, `files`, `acceptance`.

---

## Checklist — 4 critères

### C1 — Lane auto-exécutable

| Valeur `lane` | Verdict C1 |
|---|---|
| `SAFE_AUTO` | PASS |
| `AUDIT_REQUIRED` | PASS (conseil requis post-implémentation) |
| `HUMAN_REQUIRED` | **BLOCKED** |
| `FORBIDDEN` | **BLOCKED** |
| absent / autre | **BLOCKED** |

Les lanes `HUMAN_REQUIRED` et `FORBIDDEN` ne sont jamais auto-pickables. Escalader Pierre.

---

### C2 — Aucune dépendance bloquante

- `blocked_by` est vide (`[]` ou absent) → PASS
- `blocked_by` contient des IMPs → vérifier dans le ledger que chacun est `CLOSED` → PASS si tous CLOSED
- Au moins un IMP listé non CLOSED → **BLOCKED**

```
# Vérification rapide (PowerShell)
Select-String -Path lab/chains/IMPROVEMENT_LEDGER.yaml -Pattern "id: IMP-XXX" -Context 0,5
```

---

### C3 — Fichiers cibles atteignables

Pour chaque chemin listé dans `files` :

1. **Fichier existant** → vérifier `Test-Path <path>` → PASS
2. **Fichier à créer** → vérifier que le répertoire parent existe et n'est pas dans une zone FORBIDDEN

Zones FORBIDDEN (jamais modifiées par un agent) :

```
tests/    eval/    oracle/    bench/    puzzles/    .github/
```

- Tous les chemins PASS → C3 PASS
- Un chemin parent inexistant mais créable (hors FORBIDDEN) → C3 NEEDS_WORK (à mentionner)
- Un chemin dans une zone FORBIDDEN → **BLOCKED**

---

### C4 — Acceptance checkable

- `acceptance` absent ou vide → NEEDS_WORK
- `acceptance` contient la chaîne `TBD` (insensible à la casse) → NEEDS_WORK
- `acceptance` présent, non-TBD, et contient un oracle vérifiable (fichier attendu, commande, exit code, présence d'artefact) → PASS

Un oracle vérifiable = la condition peut être testée sans invoquer de LLM (ex. : « fichier X existe », « cargo test passe », « sortie contient Y »).

---

## Règle de décision

```
C1 = BLOCKED                    → verdict global : BLOCKED  (lane infranchissable)
C2 = BLOCKED                    → verdict global : BLOCKED  (dépendance non résolue)
C3 = BLOCKED (zone FORBIDDEN)   → verdict global : BLOCKED  (périmètre interdit)
C1=PASS, C2=PASS, C3=PASS, C4=PASS  → verdict global : READY
C4=NEEDS_WORK OU C3=NEEDS_WORK      → verdict global : NEEDS_WORK
```

La règle est stricte : un seul BLOCKED suffit. NEEDS_WORK n'est rendu que si aucun critère dur n'est BLOCKED.

---

## Format de sortie obligatoire

```
IMP-READINESS — <IMP-ID> (<timestamp ISO>)
──────────────────────────────────────────────
C1 lane           : <SAFE_AUTO|AUDIT_REQUIRED|…>  → <PASS|BLOCKED>
C2 blocked_by     : <[] | [IMP-XXX CLOSED, …]>   → <PASS|BLOCKED>
C3 files          : <liste ou «aucun»>             → <PASS|NEEDS_WORK|BLOCKED>
C4 acceptance     : <présent/TBD/absent>           → <PASS|NEEDS_WORK>
──────────────────────────────────────────────
verdict           : READY | NEEDS_WORK | BLOCKED
raison            : <motif principal si non READY>
──────────────────────────────────────────────
software_verdict  : OK | FAIL | BLOCKED
evidence_verdict  : MECHANICAL_VALIDATION_ONLY
claim_verdict     : NO_CLAIM_ALLOWED
```

- `software_verdict: OK` = critères vérifiés mécaniquement, verdict émis
- `software_verdict: BLOCKED` = impossible de terminer la vérification (ledger illisible, chemin inaccessible)
- `software_verdict: FAIL` = ne pas utiliser ici — réservé à l'exécution de code

---

## Actions selon verdict

| Verdict | Action agent |
|---|---|
| **READY** | Pickup autorisé. Documenter l'IMP-ID dans le journal de session. |
| **NEEDS_WORK** | Arrêter. Lister les corrections nécessaires (acceptance à préciser, répertoire à créer). Ne pas démarrer l'implémentation. |
| **BLOCKED** | Arrêter. Ne jamais contourner. Escalader Pierre si la lane est HUMAN_REQUIRED/FORBIDDEN ou si une dépendance n'est pas CLOSED. |

---

## Hard rules

- Ne jamais démarrer un IMP sans verdict READY de ce skill.
- Ne jamais modifier `lab/chains/IMPROVEMENT_LEDGER.yaml` manuellement pour faire passer C1/C2 — utiliser `kaizen_loop.py` ou gate Pierre.
- Ne jamais créer de fichiers dans les zones FORBIDDEN pour satisfaire C3.
- Ne jamais interpréter une `acceptance` vague comme « checkable » — en cas de doute → NEEDS_WORK.
- `claim_verdict: NO_CLAIM_ALLOWED` en toute circonstance.

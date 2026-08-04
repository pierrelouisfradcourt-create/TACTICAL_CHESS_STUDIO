# REPAIR_RUNTIME_COMPATIBILITY_REPORT_V1

*2026-08-04. Comparaison entre `REPAIR_RUNTIME_CONTRACT_V1` et l'exécuteur **qui existe
déjà**. Aucun deuxième système de réparation n'a été créé, `repair_step.mjs` n'a pas été
modifié, aucune logique n'a été déplacée.*

---

## Le runtime existant, tel qu'il est

```
run_real.py:1164  run_repair_step()          ← câblé sur 5 étapes amont
        ↓ sous-processus
repair_step.mjs   oracle → réparation → oracle → mesure   (+ phase QUALITÉ)
        ↓
repair_loop.mjs   findings → liste blanche → prompt par champ → patch
        ↓
FORGE_REPAIR_MODEL = qwen2.5-14b-instruct (LM Studio, temp 0)
```

Il fonctionne, il est prouvé, et il est **hors architecture** : aucun `capability_role`
dans `roles.yaml` ne le désigne, aucun contrat `contracts/*.yaml` ne le décrit.

---

## Table de compatibilité — entrées

| Contrat | Existe | Source | Action |
|---|---|---|---|
| `finding_id` | **non** | `repair_step.mjs:252` — l'oracle est **rejoué** pour obtenir `problems[]` | **ajouter** (adaptateur : le finding doit exister dans `oracle_before`, sinon `FINDING_INCONNU`) |
| `root_problem_id` | **non** | absent de toute la chaîne | **ajouter** (adaptateur : reçu, tracé dans la preuve, **jamais** modifié) |
| `artifact_ref` | **oui** | `repair_step.mjs:225` `join(runDir, spec.artefact)` | **garder** (adaptateur : `artifact_ref` → `{etape, runDir}` via `ETAPES`) |
| `evidence_ref` | **non** | l'artefact est réécrit sur place, aucune preuve nommée | **ajouter** (adaptateur : 6 fichiers écrits sous `evidence_ref`) |
| `allowed_fields` | **dérivé** | `repair_loop.mjs:167` `classer()` — déduit des chemins des `problems[]` | **ajouter** (adaptateur : périmètre **reçu**, appliqué par-dessus le dérivé, jamais à la place) |
| `forbidden_fields` | *de facto* | complément de la liste blanche interne, `repair_loop.mjs:329-335` | **garder** + **ajouter** la liste explicite reçue |

## Table de compatibilité — sorties

| Contrat | Existe | Source | Action |
|---|---|---|---|
| `patch` | partiel | `FIELDS_CHANGED` (chemins seuls, sans valeurs) | **compléter** (`{path, before, after}` par feuille modifiée) |
| `before` | **non** | l'artefact est écrasé sur place | **ajouter** (artefact intégral, pas un diff) |
| `after` | **oui** | l'artefact sur disque | **garder** |
| `oracle_before` | **oui** | `repair_step.mjs:252` | **garder** (recalculé, jamais recopié) |
| `oracle_after` | **oui** | `repair_step.mjs:278` | **garder** |
| `evidence_created` | **non** | — | **ajouter** |
| `mutation_used` | **non** | — | **ajouter** (résolu depuis `capabilities.json`, pas écrit en dur) |

---

## Les deux écarts qui comptent

**1. Le périmètre était déduit, pas reçu.** `classer()` construit la liste blanche à partir
des findings que l'oracle vient d'émettre. C'est robuste, mais ça veut dire que le
réparateur **décide lui-même** où il a le droit d'écrire. Un appelant ne pouvait pas dire
« répare celui-là, pas les autres ». L'adaptateur ajoute cette contrainte **par-dessus** :
la liste interne continue de faire son travail, et toute écriture hors du périmètre déclaré
annule la réparation entière et restaure l'artefact.

**2. La couche QUALITÉ écrit hors des findings.** `phaseQualite()` (`repair_step.mjs:124`)
répare des signaux sémantiques que l'oracle n'a **pas** signalés. C'est voulu et utile — mais
sous contrat, ces champs sont hors `allowed_fields`, donc une **violation**. Ce n'est pas un
défaut de la couche qualité : c'est la preuve que les deux ont des périmètres différents.
Composer une réparation strictement structurelle se fait en passant `qualiteActive: false`,
explicitement.

---

## Ce que l'adaptateur ne fait pas

`scripts/forge/repair_runtime_adapter.mjs` — **0 oracle, 0 prompt, 0 appel modèle, 0 liste
blanche interne**. Un test le vérifie mécaniquement : le fichier ne peut contenir ni
`fetch(`, ni `localhost`, ni `temperature`, ni `max_tokens`, ni `FIELD_TO_REPAIR`
(`repair_runtime_adapter.test.mjs`, dernier test). Si la logique de réparation y migre un
jour, le test tombe.

15 tests, dont 3 sur de **vrais oracles** avec un modèle injecté : `FINDING_INCONNU`
(défaut non signalé ⇒ pas de réparation, artefact intact), `CONFORME` (FAIL → OK, preuve
matérialisée), `CONTRACT_VIOLATION` (écriture hors périmètre ⇒ tout est annulé, artefact
restauré à l'octet près).

# ROLE_REPAIR_RUNTIME_PROPOSAL_V1 — proposition de rôle, non appliquée

> **Superseded le 2026-08-04** par `ROLE_REPAIR_RUNTIME_V2.md`, qui décrit le rôle à partir
> de l'implémentation **existante** et corrige deux chiffres mesurés ici : la bande de coût
> (~70 → ~70-150 tokens) et `max_tokens` (256 souhaité → 400 réel dans le code).
> La décision demandée vit désormais dans la V2.

*2026-08-04. **`scripts/forge/contracts/roles.yaml` n'est PAS modifié par ce document.**
Créer un rôle runtime est une décision d'architecture, pas la conséquence d'un audit.*

Complète `ROLE_PROPOSAL_REPAIR_RUNTIME_V1.md` (le contrat) et remplace la décision ouverte de
`ROLE_PROPOSAL_REPAIR_V1.md`, qui posait la même question sans mesurer le besoin de modèle.

---

## role_name

```yaml
repair_runtime
```

Nommé `repair_runtime` et non `repair` : les 15 rôles de `roles.yaml` désignent des **postes
de travail** (`worldscan`, `architect`, `builder`…). Celui-ci désigne un **exécutant borné qui
n'a pas de jugement**. Le suffixe le dit, et empêche la dérive vers « l'agent qui corrige les
choses ».

## mission

Appliquer une réparation ciblée sur les champs qu'un oracle a explicitement rejetés, et eux
seuls. Ne génère pas d'artefact, ne décide pas de sa validité, ne choisit pas ce qui est cassé.

## inputs

`finding_id` · `root_problem_id` · `artifact_ref` · `evidence_ref` · `allowed_fields` ·
`forbidden_fields` — définis par `REPAIR_RUNTIME_CONTRACT_V1`.

## outputs

`patch` · `before` · `after` · `oracle_before` · `oracle_after` · `evidence_created` ·
`mutation_used` — définis par le même contrat.

## tools_required

| outil | requis | pourquoi |
|---|---|---|
| complétion de texte (1 appel / champ) | **oui** | la sortie est une valeur en langue naturelle |
| lecture de l'artefact | oui, **via l'appelant** | le runtime reçoit le contexte, il ne va pas le chercher |
| écriture fichier | **non** | l'application du patch est faite par le code appelant, sous liste blanche |
| recherche / web / KB | **non** | la réparation reformule, elle ne documente pas |
| shell, git | **non** | aucune raison, et un réparateur qui commit est un incident |

---

## model_requirement — mesuré, pas estimé

Phase 4 du mandat : *ne pas surdimensionner*. Chiffres **versionnés** :

| preuve | tokens de complétion | cycles | régressions | durée |
|---|---|---|---|---|
| `REPAIR-LOOP-V1` (s2-worldscan) | **68** | 1 | 0 | 1 129 ms |
| `M-ws6` (composition ws5 + repair) | **70** | 1 | 0 | — |

Deux exécutions supplémentaires ont été observées lors du câblage driver (s2-worldscan 66
tokens, s1-prisme 41 tokens). **Elles ne sont pas versionnées** — je les cite comme
observation, pas comme preuve.

**Verdict : un modèle local suffit.**

- *aucun modèle ?* → non. La sortie est une phrase (`retention_answer`, `player_goal`) ; aucun
  déterministe ne l'écrit.
- *Claude ?* → non, et ce serait payer un raisonnement pour une reformulation de 70 tokens.
- *Qwen local ?* → **oui, et c'est le régime où il est mesuré bon.** La réparation est une
  **transformation** (réécrire un champ à partir d'un contexte fourni), pas un **rappel**
  (citer une source). Mesuré sur 3 jeux × 2 étapes : Qwen réussit 3/3 en transformation et
  plafonne à 2/3 en rappel, avec des citations qui dérivent à température 0. Ce rôle ne cite
  rien.

```yaml
model_requirement:
  provider: lmstudio
  id: qwen2.5-14b-instruct     # celui qui a produit TOUTES les preuves versionnées
  temperature: 0
  max_completion_tokens: 256   # 3,6× le maximum mesuré (70) — marge, pas budget
  fallback: aucun              # pas d'escalade : un échec de réparation doit rester visible
```

Pas d'escalade `haiku → sonnet → opus` sur ce rôle : l'échelle des builders existe pour
produire mieux. Ici, si la réparation échoue, l'oracle reste rouge — et c'est l'information
utile. Escalader la masquerait.

---

## evidence_contract

Toute exécution doit produire, sous `evidence_ref` :

```
before.json · after.json · oracle_before.json · oracle_after.json · measured_metrics.json
```

et satisfaire :

```
regression_count == 0                       # contrainte éliminatoire
oracle_after.problems ⊆ oracle_before.problems
tout chemin modifié ∈ allowed_fields
```

`measured_metrics.json` porte `mutation_used`, `completion_tokens`, `regression_count`,
`problems_resolved_ratio`, et le `evaluation_context` (dataset + sha, modèle, température,
version d'oracle) — mêmes champs que les preuves existantes, pour rester comparable.

## security_constraints

1. **Liste blanche en code, jamais en prompt.** Déjà tenu : `repair_loop.mjs:329-335` rejette
   toute paire hors périmètre et compte comme régression toute feuille modifiée hors liste.
2. **Aucune écriture durable.** Interdit d'écrire dans `contracts/`, `roles.yaml`, un oracle,
   `capabilities.json`, `mutation_registry.json`, `root_problems.json`, le ledger, `memory/`.
3. **Aucun accès réseau** hors l'endpoint de complétion local.
4. **Aucun droit de verdict.** Le runtime ne fixe pas `ok/fail` : l'oracle est rejoué par
   l'appelant. Tenu aujourd'hui — `run_repair_step()` est explicitement *capteur, pas juge*.
5. **Défaillance silencieuse interdite mais non bloquante.** Réparateur injoignable ⇒ l'étape
   se comporte comme avant le branchement, avec une trace. Tenu (`run_real.py:801-838`).
6. **Coupure** : `FORGE_REPAIR=0` désactive le rôle entièrement.

---

## Limite à porter dans la décision

`targeted_field_repair` **converge vers l'oracle, pas vers la qualité**. Mesuré plusieurs
fois : elle écrit des valeurs non vides, pas nécessairement justes (« Proceed with caution
near ghosts. »). Déclarer le rôle rend la chaîne exécutable ; cela ne rend pas ses sorties
bonnes.

Ce qui rattrape ce défaut est mesuré depuis aujourd'hui — `duplicate_content_detection` et
`cross_field_copy_detection`, `detection_rate = 1,0`, `false_positive_rate = 0`. Elles n'ont,
elles non plus, **aucun rôle runtime**. Accepter `repair_runtime` seul rendrait la réparation
exécutable sans son garde-fou déclaré.

---

## Décision demandée

☐ **Accepter** `repair_runtime` — déclarer le rôle dans `roles.yaml` sur `qwen2.5-14b-instruct`,
  puis mettre `targeted_field_repair` en `PROVEN_EXECUTABLE` et recalculer la recette.

☐ **Refuser** — `world_scan_repair_v1` reste `BLOCKED`. L'exécuteur `repair_step.mjs` continue
  de tourner hors registre (état actuel, connu et tracé).

☐ **Autre découpage** — par exemple un rôle `field_editor` plus étroit, ou déclarer d'abord un
  rôle de détection pour ne pas accepter la réparation sans son garde-fou.

Tant qu'aucune case n'est cochée : `targeted_field_repair` reste `PROVEN_BLOCKED_RUNTIME` et la
recette reste `BLOCKED`. **C'est l'état honnête, pas un défaut à corriger.**

# EVIDENCE_GIT_POLICY_RESULT_V1

*2026-08-04. **Option C appliquée.** Résultat mesuré, pas annoncé.*

---

## La règle appliquée

```gitignore
lab/forge_evidence/*
!lab/forge_evidence/*/
```

**Bundles de preuve** (un dossier par expérience, contenu figé une fois l'expérience
close) → **versionnés**.
**Flux d'exploitation** de la racine (append-only, sans fin) → **restent ignorés** :
`dispatch_audit.jsonl` (239 Ko) · `forge_telemetry.jsonl` · `repair_results.jsonl` ·
`runtime_drift.jsonl` · `forge_builder_runs.jsonl` · `oracle_*.log`.

Commit `d8f8143` : **122 fichiers, 5 347 lignes, ~480 Ko**. Vérifié : **aucun `.jsonl` ni
`.log` de flux n'est entré**.

## Avant / après — mesuré sur un export du commit

L'export (`git archive HEAD | tar -x`) ne contient **que** ce qui est dans le dépôt :
aucun fichier de cette machine hors du dépôt n'y est visible.

| | avant (racine sans `lab/forge_evidence/`) | après (export du commit) |
|---|---|---|
| mutations acceptées exécutables | **0 / 13** | **4 / 13** |
| `evidence_missing` | **13** | **0** |
| `recipe_missing` | 9 | 9 |

Et la chaîne complète, exécutée depuis l'export :

```
REPAIR_NON_CONVERGENCE   1 chemin executable
ORACLE_FALSE_NEGATIVE    1 chemin executable
DEFECT_DISPLACEMENT      1 chemin executable
PROMPT_FIELD_OMISSION    1 chemin executable
agent_factory --mutation REPAIR-LOOP-V1  ->  executable=true
```

Les 9 `recipe_missing` restants sont les mutations internes — **le verdict correct,
inchangé**. La politique de dépôt n'a rien débloqué qui ne devait l'être.

## Les trois critères de validation

| critère | résultat |
|---|---|
| clone frais rejouable | ✅ `evidence_missing` 13 → **0** ; 4 chemins exécutables ; les 4 problèmes racines résolus par `mcts_selector` |
| `evidence_refs` résolus | ✅ les **57** références des registres pointent vers des fichiers présents dans le dépôt |
| aucun doublon de vérité | ✅ **aucune copie créée** — les 57 références pointent vers ces chemins-là, pas vers un espace de release parallèle (c'est ce qui écartait l'Option B) |

## Une note sur le tag `forge-v2`

Le tag **n'a pas été déplacé**. Un tag est un fait sur un état passé ; le rétrofiter
effacerait ce que la mesure a montré. `forge-v2` conserve donc la propriété mesurée :
il ne se relance pas. Le commit `d8f8143` est le premier état qui le fait.

## Ce que la politique ne règle pas

- **`AGENT_FACTORY_V0`** est le seul des 15 dossiers qu'**aucun fichier versionné ne
  cite** — alors qu'il contient le plan d'entrée de `EXECUTION_PROOF_V0`. Signalé, non
  corrigé : c'est une référence manquante dans un doc, pas un problème de `.gitignore`.
- **La croissance n'est pas bornée.** 15 dossiers en ~3 semaines. La règle qui rendrait
  cela sûr — « un dossier n'entre que s'il est référencé » — n'est pas appliquée
  mécaniquement : rien n'empêche aujourd'hui un dossier orphelin d'entrer.
- **Les flux ignorés restent invisibles hors de cette machine.** `dispatch_audit.jsonl`
  porte les reçus signés HMAC des dispatches. Un tiers ne peut pas les re-vérifier. C'est
  assumé — ils grossissent sans fin — mais c'est un angle mort réel de l'auditabilité.

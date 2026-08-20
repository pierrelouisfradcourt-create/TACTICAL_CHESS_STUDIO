# ROLE_PROPOSAL_REPAIR_V1 — proposition, non appliquée

> **Superseded le 2026-08-04** par `ROLE_PROPOSAL_REPAIR_RUNTIME_V1.md` (le contrat) et
> `ROLE_REPAIR_RUNTIME_PROPOSAL_V1.md` (le rôle, avec le besoin de modèle **mesuré**).
> La décision demandée vit désormais dans le second. Ce document reste pour l'historique :
> il posait la bonne question sans dimensionner le runtime.

*2026-08-04. **`roles.yaml` n'est PAS modifié par ce document.** La création réelle d'un rôle
runtime demande une validation humaine : c'est une décision d'architecture, pas une conséquence
d'un audit.*

---

## Pourquoi cette proposition existe

L'audit de câblage a produit un fait, pas une opinion :

```
targeted_field_repair  →  status: BLOCKED_RUNTIME_MISSING
world_scan_repair_v1   →  recipe_status: BLOCKED
```

`roles.yaml` déclare **15 rôles** — `architect`, `builder`, `worldscan`, `wiremap`, `decompose`,
`prisme`, `redteam_code`, `redteam_reviewer`, `contract_author`, `art_director`, `game_forger`,
`forge_toolsmith`, `orchestrator`, `run_orchestrator`, `deterministic`. **Tous produisent,
architecturent ou revoient. Aucun ne répare.**

La capacité `targeted_field_repair` est prouvée (`REPAIR-LOOP-V1`, 0,0 → 1,0 mesuré, 0
régression) et pourtant inexécutable dans une recette : on sait ce qu'elle fait, on ne sait pas
qui l'exécute. **Je n'ai pas inventé de rôle pour combler le trou** — je le déclare.

---

## Proposition

```yaml
role_name: repair
```

**mission** — Réparer les champs d'un artefact que l'oracle de l'étape a explicitement rejetés,
et eux seuls. Ne génère pas, ne re-décide rien, ne juge pas.

**inputs**
- l'artefact rejeté (JSON matérialisé par l'exécuteur)
- `problems[]` de l'oracle, au format `<chemin>: <raison>`
- le contexte scalaire voisin de chaque champ fautif (`VALID_CONTEXT`)

**outputs**
- une paire `{path, value}` par champ, et rien d'autre
- le `path` rendu est re-vérifié contre le chemin demandé : une paire mal adressée est rejetée

**consumes_capabilities**
- `targeted_field_repair` (prouvée par `REPAIR-LOOP-V1`)

**required_tools**
- un runtime de complétion à contexte court. Mesuré : 41 à 71 tokens de complétion par
  réparation. **Un modèle local suffit** — `qwen2.5-14b-instruct` a produit tous les résultats
  versionnés de cette capacité.
- aucun accès fichier, aucun outil de recherche : la réparation ne va rien chercher, elle
  reformule un champ à partir de ce qu'on lui donne.

**evidence_contract** — toute exécution doit produire :
`worldscan_input.json` · `worldscan_after.json` · `oracle_result.json` ·
`measured_metrics.json`, et satisfaire `regression_count == 0`.

---

## Ce que ce rôle ne doit pas devenir

- **Pas un générateur.** S'il peut écrire un champ absent *du contrat*, il redevient un
  `worldscan` déguisé, et la séparation des responsabilités disparaît.
- **Pas un juge.** Il ne décide pas si l'artefact est bon — l'oracle le fait, avant et après.
- **Pas un modèle coûteux.** La mesure dit 41-71 tokens : y mettre un modèle de raisonnement
  serait payer un raisonnement pour une reformulation.

## Limite connue, à porter dans la décision

`targeted_field_repair` **converge vers l'oracle, pas vers la qualité**. Mesuré plusieurs fois :
elle écrit des valeurs non vides, pas nécessairement justes (« Proceed with caution near
ghosts. », « I have enjoyed playing Cookie Clicker… »). Créer le rôle rend la chaîne
exécutable ; cela ne rend pas ses sorties bonnes. Les deux capacités de détection
(`duplicate_content_detection`, `cross_field_copy_detection`) sont ce qui rattrape ce défaut —
et elles n'ont, elles non plus, aucun rôle runtime.

## Décision demandée

☐ Créer `repair` dans `roles.yaml` avec le runtime local
☐ Refuser et laisser `world_scan_repair_v1` en `BLOCKED`
☐ Autre découpage (par exemple un rôle `field_editor` plus étroit)

Tant qu'aucune case n'est cochée, `capabilities.json` et `agent_recipes.json` conservent
`BLOCKED_RUNTIME_MISSING` — c'est l'état honnête, pas un défaut à corriger.

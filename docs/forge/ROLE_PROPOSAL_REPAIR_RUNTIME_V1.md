# REPAIR_RUNTIME_CONTRACT_V1 — contrat seul

*2026-08-04. **Contrat, pas implémentation.** Aucune fabrique, aucun agent permanent, aucune
modification de doctrine. `roles.yaml` n'est pas touché par ce document.*

---

## Pourquoi ce contrat existe

L'audit de câblage a produit un fait :

```
targeted_field_repair  →  BLOCKED_RUNTIME_MISSING
world_scan_repair_v1   →  recipe_status: BLOCKED
```

La compétence est prouvée (`REPAIR-LOOP-V1` : 1,0 de problèmes résolus, 68 tokens, 0
régression). Ce qui manque n'est pas la compétence — c'est **l'emplacement d'exécution
déclaré** qui la porte.

---

## Le fait central de l'audit : exécuté ≠ déclaré

Il existe déjà un exécuteur de réparation dans le dépôt :

| | |
|---|---|
| point d'entrée | `scripts/forge/repair_step.mjs` (CLI Node) |
| appelé par | `run_real.py:1164` via `run_repair_step()` (5 étapes amont) |
| runtime réel | `qwen2.5-14b-instruct` via LM Studio, **codé en dur** (`FORGE_REPAIR_MODEL`, `FORGE_REPAIR_URL`) |
| résolu par `roles.yaml` | **non** — aucun `capability_role` ne le désigne |
| contrat d'agent `contracts/*.yaml` | **aucun** |

Le studio connaît son mode de panne habituel : *déclaré ≠ exécuté*. Ici c'est **l'inverse** —
du code répare réellement des artefacts en production de chaîne, hors de tout registre de
rôles, sans contrat, sans porte de dispatch. Ce n'est pas un rôle manquant : c'est un rôle
**non déclaré**.

Ce contrat décrit ce que devrait être ce rôle s'il était déclaré. Il ne le déclare pas.

---

## Mission

**Réparer un défaut déjà identifié.**

Ne découvre pas. Ne réévalue pas. Ne change pas l'oracle.

La distinction est opérante, pas rhétorique : un réparateur qui a le droit de décider *ce
qui* est cassé peut se donner raison. Le défaut lui est donné ; il ne le choisit pas.

---

## Input obligatoire

```yaml
finding_id:        # identifiant du défaut à réparer — déjà émis par un oracle
root_problem_id:   # id EXISTANT de root_problems.json — jamais une description libre
artifact_ref:      # chemin de l'artefact réparable (fichier matérialisé)
evidence_ref:      # dossier lab/forge_evidence/<...> où la preuve sera écrite
allowed_fields:    # liste EXPLICITE de chemins réparables
forbidden_fields:  # liste EXPLICITE de chemins interdits
```

`allowed_fields` est **reçu**, pas déduit. Un réparateur qui calcule lui-même son périmètre
d'écriture peut l'élargir.

## Output obligatoire

```yaml
patch:            # les paires {path, value} appliquées, et rien d'autre
before:           # artefact avant, intégral
after:            # artefact après, intégral
oracle_before:    # verdict + problems[] AVANT
oracle_after:     # verdict + problems[] APRÈS
evidence_created: # chemins réellement écrits sous evidence_ref
mutation_used:    # id de la mutation du registre qui prouve la capacité employée
```

`before` et `after` sont **intégraux**, pas des diffs : un diff est déjà une interprétation,
et c'est la sortie qu'il faut pouvoir recalculer sans faire confiance au réparateur.

---

## Contraintes

Le repair runtime ne peut pas :

| interdit | garantie exigée |
|---|---|
| modifier le `root_problem` | `root_problem_id` est une entrée, jamais une sortie |
| modifier les métriques | aucune écriture dans `capabilities.json` / `mutation_registry.json` |
| modifier les règles d'acceptation | aucune écriture dans `contracts/` ni dans un oracle |
| supprimer un finding | `oracle_after` est **recalculé**, jamais recopié depuis le réparateur |
| écrire hors des champs autorisés | liste blanche appliquée **dans le code**, pas dans le prompt |

La dernière ligne est la seule qui tient sous un modèle qui se trompe. Un prompt qui dit
« ne touche pas aux autres champs » est une politesse ; `repair_loop.mjs:329-335` est une
garantie.

---

## Conformité de l'exécuteur actuel — PARTIELLE

Mesurée contre ce contrat, pas déclarée :

| exigence | `repair_step.mjs` aujourd'hui |
|---|---|
| `finding_id` en entrée | ❌ — il **rejoue l'oracle** pour obtenir `problems[]` |
| `root_problem_id` en entrée | ❌ — absent |
| `artifact_ref` | ✅ — `ETAPES[etape].artefact` sous `run_dir` |
| `evidence_ref` | ❌ — écrit à côté de l'artefact, pas dans un dossier de preuve nommé |
| `allowed_fields` reçu | ⚠️ — **dérivé** des chemins des `problems[]`, pas reçu |
| `forbidden_fields` | ✅ *de facto* — complément de la liste blanche, appliqué en code |
| `patch` / `before` / `after` | ⚠️ — patch et compteurs oui, `before`/`after` intégraux non |
| `oracle_before` / `oracle_after` | ✅ — les deux recalculés par le même oracle |
| `evidence_created` | ❌ |
| `mutation_used` | ❌ |

**Conclusion honnête** : il existe un exécuteur qui fait le travail et un contrat qui décrit
ce qu'il faudrait garantir. Les deux ne coïncident pas encore. Rejouer l'oracle pour trouver
le défaut n'est pas « découvrir » au sens interdit — mais tant que `finding_id` n'est pas une
entrée, rien n'empêche mécaniquement le réparateur de travailler sur un défaut qu'il a choisi.

---

## Ce que ce contrat ne fait pas

- il ne crée pas le rôle (voir `ROLE_REPAIR_RUNTIME_PROPOSAL_V1.md`) ;
- il ne change aucun statut dans `capabilities.json` ;
- il ne débloque pas `world_scan_repair_v1`.

Un contrat écrit n'est pas un runtime accepté.

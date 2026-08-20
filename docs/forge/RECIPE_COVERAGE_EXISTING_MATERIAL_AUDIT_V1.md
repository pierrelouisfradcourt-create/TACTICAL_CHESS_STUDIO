# RECIPE_COVERAGE_EXISTING_MATERIAL_AUDIT_V1

*2026-08-04. **Audit lecture seule.** Aucun fichier modifié : ni recette, ni capacité, ni
registre, ni `roles.yaml`. Aucun LLM appelé, aucun runtime lancé.*

**Question centrale** : les 12 mutations bloquées sur `recipe_missing` manquent-elles d'une
capacité, ou d'un branchement ?

**Réponse mesurée : les trois cas coexistent, et le plus fréquent n'est ni l'un ni
l'autre.** Sur 12 blocages : **2 capacités déjà construites et déjà exécutées** mais non
déclarées comme telles · **1 chaîne déjà prouvée** écrite en double sans être une recette ·
**9 mutations qui ne sont pas des capacités** et n'ont pas à le devenir.

---

## SURFACE 1 — Recipes existantes

**ITEM** `agent_recipes.json` — 1 recette (`world_scan_repair_v1`).
**STATUS** IMPLEMENTED + TESTED.
**EVIDENCE** `recipe_status: EXECUTABLE`, `proven: true`, 4 fichiers de preuve présents.

**ITEM** `capabilities.json → proven_chains[0]` : `worldscan_complete_v1`.
**STATUS** **DOCUMENTED_ONLY** — aucun lecteur de code (`execution_binding` et
`candidate_selector` lisent `recipes`, pas `proven_chains`).
**EVIDENCE** — vérifié champ à champ :

```
chain  worldscan_complete_v1  [instance_separation, targeted_field_repair]  solves PROMPT_FIELD_OMISSION
recipe world_scan_repair_v1   [instance_separation, targeted_field_repair]  root   PROMPT_FIELD_OMISSION
mêmes capacités : true      même problème : true
```

**POTENTIAL_REUSE** — aucun : c'est un **DOUBLON**. La même chaîne existe dans deux
fichiers, avec deux schémas, dont un seul est lu.
**MISSING_LINK** — décider lequel fait foi. Deux représentations du même fait divergeront.

**ITEM** recettes anciennes / manifests hors `agent_recipes.json` — **NOT_FOUND**. Aucun
autre fichier de recette dans `lab/reports`, `docs/forge` ou `scripts/forge`.

---

## SURFACE 2 — Capacités existantes

**ITEM** `duplicate_content_detection` (prouvée par `Q1-DISCRIMINANCE`) et
`cross_field_copy_detection` (prouvée par `M-Q5-A`).
**STATUS** **IMPLEMENTED + TESTED — et déjà EXÉCUTÉES en production.**

**EVIDENCE** — c'est le fait central de cet audit :

```
scripts/forge/repair_step.mjs:126   mesurerSignalSemantique(avant)     ← duplicate_content_detection
scripts/forge/repair_step.mjs:175   mesurerCroise(courant, ...)        ← cross_field_copy_detection
scripts/forge/repair_step.mjs:192   mesurerSignalSemantique(courant)
```

Implémentées (`oracle_quality.mjs`, `cross_field_quality.mjs`), testées, mesurées
(`detection_rate = 1,0`, `false_positive_rate = 0`, n=12 et n=10), **et appelées à chaque
réparation**. Elles ne sont pas absentes : elles tournent **sous le rôle `repair_runtime`**,
à l'intérieur de `phaseQualite`.

**POTENTIAL_REUSE** — élevé, et sans écrire une ligne de logique : le code existe, la
mesure existe, la preuve existe.
**MISSING_LINK** — deux, et seulement deux : (a) aucun `runtime_role` ne les porte en propre
(`capability_status: MEASURED_NOT_EXECUTABLE`) ; (b) aucune recette ne les emploie. Leur
statut dit « non exécutable » alors qu'elles s'exécutent — **le catalogue décrit mal une
réalité qui, elle, fonctionne**.

**ITEM** `agent_genome.mjs` + `genome_generation.yaml`.
**STATUS** **PASSIVE** — validateur sans donnée. Aucun génome n'existe dans le dépôt.
**MISSING_LINK** — une donnée, avant tout lecteur.

**ITEM** `capability_graph.schema.json`, `mutation_graph.json`.
**STATUS** **NOT_FOUND** côté usage — 0 lecteur, 0 écrivain (déjà mesuré le 2026-08-04).

---

## SURFACE 3 — Skills (`.claude/skills/`, 38 skills)

**STATUS** par câblage mécanique réel :

| skill | références à des scripts Forge | statut |
|---|---|---|
| `/forge` | **11** | IMPLEMENTED — la boucle elle-même |
| `/gate` | 3 | IMPLEMENTED (HumanGate) |
| `/autoloop` `/monitor` `/smoke-check` `/fog` `/tech-debt` | commandes exécutables, lane STUDIO | PASSIVE pour la Forge |
| les 32 autres | 0 | **DOCUMENTED_ONLY** |

**POTENTIAL_REUSE comme recettes : aucun.** Une recette exige `root_problem` +
`capability_chain` adossée à des mutations + `evidence_requirements` +
`validation_contract`. Une skill est une **procédure pour la session orchestratrice** : elle
n'a ni problème racine, ni capacité mesurée, ni contrat de preuve. Les convertir
reviendrait à inventer les trois quarts manquants — exactement ce que l'audit doit éviter.

**Faux ami à signaler** : la skill `/world-scan` **n'est pas** l'étape Forge `s2-worldscan`.
C'est un chercheur de patterns externes par IMP (lane STUDIO, advisory-only). Même nom,
deux choses sans rapport. Un recyclage naïf par le nom produirait une recette fausse.

---

## SURFACE 4 — Contrats (`scripts/forge/contracts/`, 49 fichiers)

**STATUS** IMPLEMENTED — consommés mécaniquement par la porte de dispatch
(`prepare_dispatch` → `load_contract` → `capability_role` → registry).

**POTENTIAL_REUSE** — partiel et à ne pas surestimer. Un contrat d'étape porte
`capability_role`, `objectif`, `in_scope`, `success_criteria`, `tests_oracles` : c'est la
moitié « runtime + validation » d'une recette. Il lui manque **root_problem**,
**capability** et **evidence_refs** — c'est-à-dire précisément ce qui rend une recette
sélectionnable.
**MISSING_LINK** — 49 contrats, **0 rattaché à un `root_problem_id`**. Le rattachement est
la donnée manquante, pas le contrat.

---

## SURFACE 5 — Oracles

**ITEM** 6 checkers mécaniques **avec tests** : `check_worldscan`, `check_prisme_manifest`,
`check_decompo`, `check_blueprint_contract`, `check_wiremap_contract`, `check_artbible`
(+ `check_mutation_registry`, testé via `mutation_registry.test.mjs`).
**STATUS** IMPLEMENTED + TESTED — consommés par `repair_step.mjs` et le driver.

**ITEM** `oracle.py`, `static_oracles.py`, `standard_oracles.py`, `product_oracle*.py`,
`godot_oracle.mjs`, `oracles.json`.
**STATUS** IMPLEMENTED — consommés par le driver et `verify_run`.

**POTENTIAL_REUSE** — ces oracles sont déjà la brique `validation_contract.oracle` d'une
recette (`world_scan_repair_v1` cite `check_worldscan.mjs v0.3`). Rien à construire : à
citer.
**MISSING_LINK** — aucun. Cette surface est fermée.

---

## SURFACE 6 — Historique

**ITEM** `lab/forge_runs/` — **34 projets, 33 verdicts signés**.
**STATUS** PASSIVE pour le plan de décision : ce sont des opérations réellement exécutées,
avec preuve signée, **jamais transformées en capacité, recette ou mutation**.
**POTENTIAL_REUSE** — matière brute la plus abondante du dépôt.
**MISSING_LINK** — un verdict signé prouve qu'*un run* a marché ; il ne dit ni quel
`root_problem` il adressait, ni quelle métrique il a déplacée. Sans ces deux champs, il
n'est pas convertible en mutation sans réécrire l'histoire — ce que la doctrine du registre
interdit (« la preuve est reconstruite, pas recopiée »).

**ITEM** `lab/reports/lessons.jsonl` — 23 leçons, 18 validées, retrieval câblé.
**STATUS** IMPLEMENTED + TESTED.
**MISSING_LINK** — mesuré : **`root_problem.lesson_ids` est vide sur les 4 problèmes**,
alors que le champ existe et que 18 leçons validées attendent. Producteur et consommateur
existent ; **le lien est vide**.

**ITEM** `lab/forge_evidence/` — 10 dossiers de preuve versionnée + 5 flux `.jsonl`.
**STATUS** IMPLEMENTED + TESTED (consommés par l'Observer, `verify_run`, le sélecteur).

---

## Matrice finale — les 13 mutations acceptées

| mutation | recipe ? | capability ? | runtime ? | evidence ? | action recommandée |
|---|---|---|---|---|---|
| `REPAIR-LOOP-V1` | ✅ | ✅ `targeted_field_repair` | ✅ `repair_runtime` | ✅ | **aucune — exécutable** |
| `Q1-DISCRIMINANCE` | ❌ | ✅ `duplicate_content_detection` | ❌ | ✅ | **BRANCHER** — capacité déjà exécutée dans `repair_step.mjs:126` |
| `M-Q5-A` | ❌ | ✅ `cross_field_copy_detection` | ❌ | ✅ | **BRANCHER** — déjà exécutée à la ligne 175 |
| `M-ws6` | ❌ | ❌ (mais chaîne prouvée) | — | ✅ | **DÉ-DUPLIQUER** — `proven_chains.worldscan_complete_v1` décrit déjà cette recette |
| `Q2-LANGUE` · `Q3-RECOPIE` | ❌ | ❌ | ❌ | ✅ | classes de signal **internes** à `oracle_quality.mjs` — pas des capacités séparées |
| `M-rep-forme-fictive` · `M-rep-par-champ` · `M-conv-decroissance-stricte` | ❌ | ❌ | ❌ | ✅ | **NE PAS convertir** — règles de construction internes à `REPAIR-LOOP-V1` |
| `M-workflow-oracle-moment` · `M-workflow-capteur-pas-juge` | ❌ | ❌ | ❌ | ✅ | **NE PAS convertir** — décisions de câblage du driver |
| `M-schema-artefacts-amont` · `M-schema-claim` | ❌ | ❌ | ❌ | ✅ | **NE PAS convertir** — mutations de schéma, sans `root_problem_id` |

**Une mutation n'est pas une capacité.** 9 des 12 blocages viennent de là : ce sont des
faits historiques sur la *machinerie* (« décrire la forme avec un exemple fictif », « arrêt
sur décroissance stricte », « capteur pas juge »). Leur donner une recette fabriquerait des
entités vides. `recipe_missing` est le bon verdict pour elles — pas un défaut à corriger.

---

## Réponse à la question centrale

```
capacité absente               →  9 cas, et il ne FAUT PAS les construire
capacité construite non branchée → 2 cas  (duplicate_content_detection · cross_field_copy_detection)
recette déjà écrite en double  →  1 cas  (worldscan_complete_v1)
```

**Sur 12 blocages, 3 sont réellement adressables — et aucun ne demande d'écrire une
capacité.** Deux demandent un rôle runtime et une recette pour du code qui tourne déjà ; le
troisième demande de choisir entre deux écritures du même fait.

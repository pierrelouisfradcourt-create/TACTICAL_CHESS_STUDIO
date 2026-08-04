# RECIPE_COVERAGE_AUDIT_V2

*2026-08-04. **Audit lecture seule.** Aucun fichier runtime modifié : `roles.yaml`,
`capabilities.json`, `agent_recipes.json`, `mutation_registry.json` intacts. Aucune
capacité créée, aucune recette créée, aucun rôle créé.*

**Question** : parmi les 13 mutations acceptées, lesquelles représentent réellement une
capacité composable qui mérite une recette ?

**Réponse : 2 — et aucune des deux ne demande d'écrire du code.** Sur 13 : **3 COVERED** ·
**2 RECIPE_CANDIDATE** · **8 INTERNAL_MUTATION** · 0 INVALID.

---

## Classification des 13 mutations acceptées

### COVERED — le chemin existe déjà

```
mutation_id:          REPAIR-LOOP-V1
root_problem:         REPAIR_NON_CONVERGENCE
capability_candidate: targeted_field_repair (existe)
recipe_existante:     world_scan_repair_v1
execution_binding:    executable = true
evidence_ref:         lab/forge_evidence/REPAIR-LOOP-V1/ (4 fichiers, verifies)
runtime:              repair_runtime (declare + runtime_contract)
classification:       COVERED
reason:               chaine complete mutation -> recipe -> capability -> runtime -> evidence
```

```
mutation_id:          M-ws5  (non acceptee, citee ici car maillon de la recette)
classification:       COVERED (comme evidence de instance_separation)
```

```
mutation_id:          M-ws6
root_problem:         PROMPT_FIELD_OMISSION
capability_candidate: aucune — c est une COMPOSITION de deux capacites existantes
recipe_existante:     world_scan_repair_v1  (M-ws6 figure dans ses evidence_requirements)
execution_binding:    executable = false, blocker = recipe_missing   <-- FAUX NEGATIF
evidence_ref:         lab/forge_evidence/PROMPT_FIELD_OMISSION/M-ws6/ (8 fichiers)
runtime:              worldscan + repair_runtime
classification:       COVERED
reason:               la recette couvre cette composition ; le binding ne la trouve pas parce
                      qu il ne cherche que dans capability_chain[].evidence, jamais dans
                      evidence_requirements. Defaut de LOOKUP, pas de couverture.
```

### RECIPE_CANDIDATE — les 4 critères de la catégorie B sont réunis

```
mutation_id:          Q1-DISCRIMINANCE
root_problem:         ORACLE_FALSE_NEGATIVE
capability_candidate: duplicate_content_detection (EXISTE, PROVEN_EXECUTED_EMBEDDED)
recipe_existante:     aucune
execution_binding:    executable = false, blocker = recipe_missing
evidence_ref:         lab/forge_evidence/Q1-DISCRIMINANCE/ + CAPABILITY_MEASUREMENT_V1/
runtime:              deterministic (declare dans roles.yaml)
classification:       RECIPE_CANDIDATE
reason:               producteur REEL (oracle_quality.mjs) + consommateur REEL
                      (repair_step.mjs:126,192) + preuve MECANIQUE (detection_rate 1,0 ·
                      false_positive_rate 0 · n=12) + runtime IDENTIFIABLE (deterministic).
                      Les quatre criteres tiennent.
```

```
mutation_id:          M-Q5-A
root_problem:         DEFECT_DISPLACEMENT
capability_candidate: cross_field_copy_detection (EXISTE, PROVEN_EXECUTED_EMBEDDED)
recipe_existante:     aucune
execution_binding:    executable = false, blocker = recipe_missing
evidence_ref:         lab/forge_evidence/M-Q5-A/ + CAPABILITY_MEASUREMENT_V1/
runtime:              deterministic
classification:       RECIPE_CANDIDATE
reason:               memes quatre criteres — cross_field_quality.mjs appele en
                      repair_step.mjs:175,193, detection_rate 1,0, n=10.
```

### INTERNAL_MUTATION — `recipe_missing` est le bon verdict

| mutation_id | classe | cible | reason |
|---|---|---|---|
| `M-rep-forme-fictive` | PROMPT | `construirePromptReparation` | forme d'un prompt — **interne à `REPAIR-LOOP-V1`** |
| `M-rep-par-champ` | PROMPT | `construirePromptChamp` | granularité d'appel — interne à la même capacité |
| `M-conv-decroissance-stricte` | REPAIR | `repair_loop.mjs` | condition d'arrêt de boucle — interne |
| `Q2-LANGUE` | ORACLE | `oracle_quality.mjs` | **classe de signal** du même module que Q1 |
| `Q3-RECOPIE` | ORACLE | `oracle_quality.mjs` | idem |
| `M-workflow-oracle-moment` | WORKFLOW | `check_*_contract.mjs` | décision de câblage (avant/après build) |
| `M-workflow-capteur-pas-juge` | WORKFLOW | `run_real.py` | décision de sémantique du verdict, `root_problem_id = null` |
| `M-schema-artefacts-amont` | SCHEMA | `_ARTIFACT_BY_STEP` | modification de schéma, `root_problem_id = null` |
| `M-schema-claim` | SCHEMA | `upstream_schema.mjs` | modification de schéma, `root_problem_id = null` |

Aucune ne porte une compétence réutilisable **hors de son hôte**. Leur donner une recette
créerait une entité pour décrire un détail d'implémentation.

**Note sur les 3 `root_problem_id = null`** : elles sont, par construction, invisibles au
`candidate_selector` (qui filtre sur ce champ). Ce n'est pas un défaut — une mutation de
schéma ne se sélectionne pas.

---

## Recherche spécifique 1 — capacités présentes dans le code, mal déclarées

### Trouvé : `duplicate_content_detection` sous-déclare ce qu'elle fait

`oracle_quality.mjs` implémente **trois** classes de signal :

```
l.114  Q1 — DISCRIMINANCE   deux entrees distinctes decrites par la meme phrase
l.156  Q2 — COHERENCE DE LANGUE
l.184  Q3 — QUASI-RECOPIE
```

La capacité ne cite que `source_mutation: Q1-DISCRIMINANCE`, et sa campagne de mesure
(`detection_rate = 1, n=12`) n'a injecté que des défauts de **DISCRIMINANCE**. **Deux tiers
du détecteur sont exécutés sans être déclarés ni mesurés.** Ce n'est pas une recette
manquante : c'est une capacité qui se décrit plus petite qu'elle n'est.

### Trouvé : une limitation qui contredit son propre voisin de champ

Dans le **même objet** `duplicate_content_detection` :

```json
"metrics":     { "detection_rate": 1, "sample_size": 12 },
"limitations": [ "sa metrique objectif (detection_rate) n a jamais ete mesuree" ]
```

La limitation date d'avant la campagne du 2026-08-04. Une donnée et sa description se
contredisent dans le même fichier — exactement le défaut que la lane documente ailleurs
(« une décision qui vit à côté d'une donnée qui la contredit »).

### Trouvé : `ORACLE_FALSE_NEGATIVE.reward_contract` est périmé

```
measurement_method: "NON DEFINI — la metrique objectif n a jamais ete mesuree sur ce probleme."
```

Elle l'a été depuis (`CAPABILITY_MEASUREMENT_V1`). **Conséquence mécanique observable** :
`candidate_selector ORACLE_FALSE_NEGATIVE` rend **4 candidats ex aequo** avec
`objective_value = null`, alors que la mesure existe. Le sélecteur ne ment pas — il lit un
contrat périmé.

### Aucun rôle nouveau nécessaire

`deterministic` (déjà déclaré, `deterministic/non-llm`, provider `forge`) couvre les deux
détecteurs : la détection est du code pur. Vérifié, aucun rôle à créer.

---

## Recherche spécifique 2 — recettes incomplètes

Comparaison `agent_recipes.json` × `execution_binding.mjs` × `capabilities.json` × `roles.yaml` :

| constat | état |
|---|---|
| recette déclarée mais non exécutable | **aucune** — la seule recette est `EXECUTABLE`, `proven: true` |
| capacité sans recette | **2** — `duplicate_content_detection`, `cross_field_copy_detection` |
| recette doublon | **aucune** — résolu le 2026-08-04 (`proven_chains` → pointeur) |
| recette incomplète | **1, partiellement** — `world_scan_repair_v1` cite M-ws6 dans `evidence_requirements` mais pas dans `capability_chain[].evidence` ; le binding ne le voit donc pas |

**Défaut de lookup de `execution_binding`** (constaté, non corrigé — hors périmètre de cet
audit) : la résolution mutation → recette ne consulte que `capability_chain[].evidence`.
Une mutation citée uniquement dans `evidence_requirements` est déclarée `recipe_missing`
alors qu'elle est couverte. **1 faux négatif mesuré sur 13.**

---

## Recherche spécifique 3 — matière réutilisable (inventaire seul)

| brique | volume | preuve | état |
|---|---|---|---|
| oracles mécaniques | 6 checkers + 5 modules Python/Node | 6 fichiers `.test.mjs` verts | prouvée, consommée |
| réparations before/after | 3 trajectoires complètes (`REPAIR-LOOP-V1`, `M-ws6`, `REPAIR_RUNTIME_V1`) | before/after/oracle_before/oracle_after + sha vérifiés | prouvée, versionnée |
| contrats d'étape | 49 | tracés dans `dispatch_audit.jsonl` (SIGNED) | consommés, **0 rattaché à un root_problem** |
| lessons | 18 validées | `evidence_count ≥ 1`, retrieval câblé | consommées en production |
| evidence | 10 dossiers versionnés + 5 flux `.jsonl` | sha256 + HMAC | consommée par 4 modules |

---

## STATUS_BY_SURFACE

| surface | statut |
|---|---|
| **mutations** | IMPLEMENTED + TESTED — 25 au registre, 13 acceptées, 13 classées |
| **recipes** | IMPLEMENTED + TESTED — 1 recette, exécutable, prouvée ; 1 faux négatif de lookup |
| **capabilities** | IMPLEMENTED + TESTED — 4 déclarées ; 1 sous-déclarée (2 classes sur 3 non citées) |
| **runtime** | IMPLEMENTED + TESTED — 16 rôles, aucun manquant pour les candidats |
| **evidence** | IMPLEMENTED + TESTED — aucune preuve absente sur les 13 mutations acceptées |

Pas de verdict global.

---

## CANDIDATE_RECIPES_FOR_P2

**1. `duplicate_content_detection` en gate autonome.** Producteur, consommateur, preuve et
runtime réunis. Ce qu'une recette fermerait réellement : aujourd'hui le détecteur ne tourne
**que** lorsque `repair_step.mjs` est invoqué — soit les 5 étapes amont d'un run de driver.
Aucun chemin ne permet de vérifier un artefact déjà produit, ou un artefact d'une autre
étape. La recette rendrait la capacité **sélectionnable hors de son hôte**.

**2. `cross_field_copy_detection` en gate autonome.** Même structure, même hôte, même trou.

**3. (aucune troisième.)** Les 8 mutations internes n'en méritent pas, et les 3 COVERED en
ont déjà une. Proposer une troisième reviendrait à remplir un gabarit.

**Pré-requis avant d'écrire l'une ou l'autre** : les deux visent des `root_problem` dont le
`reward_contract` est périmé (`ORACLE_FALSE_NEGATIVE`) ou dont la métrique objectif n'est
pas mesurée. Une recette adossée à un contrat périmé hérite du problème — et le sélecteur
continuera de rendre des ex aequo.

## REJECTED_RECIPE_EXPANSIONS

- `Q2-LANGUE`, `Q3-RECOPIE` — **classes de signal du même module** que Q1. Le besoin réel
  est d'élargir la déclaration et la mesure de la capacité existante, pas d'ajouter deux
  recettes.
- `M-rep-forme-fictive`, `M-rep-par-champ`, `M-conv-decroissance-stricte` — règles internes
  de `REPAIR-LOOP-V1`, déjà couvertes par sa recette.
- `M-workflow-oracle-moment`, `M-workflow-capteur-pas-juge` — décisions de câblage du
  driver ; aucune compétence transportable.
- `M-schema-artefacts-amont`, `M-schema-claim` — modifications de schéma, sans
  `root_problem_id` ; non sélectionnables par construction.
- **Nouvelle recette pour `M-ws6`** — rejetée : elle serait le doublon de
  `world_scan_repair_v1`. Le problème est un lookup, pas une couverture.

---

## Reproductibilité

```bash
node scripts/forge/execution_binding.mjs REPAIR-LOOP-V1
node scripts/forge/candidate_selector.mjs ORACLE_FALSE_NEGATIVE
```

Déterministes, sans modèle ni réseau. Les 13 classifications se recalculent en bouclant sur
les mutations `accepted: true` du registre.

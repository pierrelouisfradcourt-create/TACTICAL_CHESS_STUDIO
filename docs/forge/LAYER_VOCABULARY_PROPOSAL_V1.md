# LAYER_VOCABULARY_PROPOSAL_V1

*2026-08-04. **Contrat de conception. Aucun code, aucun schéma modifié, `lesson.layer`
non ajouté.** Source unique : `mutation_registry.schema.json`. Aucune seconde taxonomie
n'est créée ici.*

---

## Ce qu'une layer est — et n'est pas

**Une layer est une zone où une boucle peut casser.** Test d'appartenance : *« si cette
zone tombe, quelle boucle cesse de se refermer ? »* Si la question n'a pas de réponse, ce
n'est pas une layer.

| ce n'est pas | pourquoi | exemple à refuser |
|---|---|---|
| un **agent** | un agent est une instance, une zone est un endroit | ~~`builder`~~ |
| un **rôle** | `roles.yaml` a déjà 16 rôles ; les confondre ferait perdre les deux | ~~`orchestrator`~~ |
| un **fichier** | un fichier change de nom, une boucle non | ~~`repair_loop.mjs`~~ |
| une **capacité** | une capacité est ce qu'on sait faire, une layer où ça peut rompre | ~~`targeted_field_repair`~~ |

---

## Layers existantes — toutes conservées

`mutation_registry.schema.json → definitions.mutation.layer` :

| layer | boucle qui casse | employée par |
|---|---|---|
| `s1-prisme` | l'exigence produite ne décrit pas ce que le jeu doit prouver | 1 mutation |
| `s2-worldscan` | le manifeste de genre est incomplet ou indiscriminant | `PROMPT_FIELD_OMISSION` + mutations |
| `s3-decompo` | la décomposition ne couvre pas les exigences | — |
| `s4-archi-contract` | l'architecture ne couvre pas le besoin (avant build) | — |
| `s5-wiremap-contract` | le squelette ne correspond pas à l'architecture | — |
| `repair` | la réparation ne converge pas | `REPAIR_NON_CONVERGENCE` |
| `quality` | le signal de qualité ne détecte pas / déplace le défaut | `ORACLE_FALSE_NEGATIVE`, `DEFECT_DISPLACEMENT` |
| `driver` | l'exécution de la chaîne elle-même (ordre, timeout, matérialisation) | 2 mutations |

**Aucune n'est retirée.** Les cinq premières nomment des étapes du profil `amont_only` /
`full` ; les trois dernières sont transversales. Cette dissymétrie est assumée : elle
décrit la chaîne telle qu'elle est, pas telle qu'une taxonomie voudrait qu'elle soit.

---

## Layers manquantes — observées dans les 18 leçons de jeu

Chacune est adossée aux leçons qui l'ont fait apparaître, jamais inventée.

### `preflight` — les prérequis mécaniques avant tout dispatch

**Boucle qui casse** : un run démarre alors qu'une condition vérifiable mécaniquement
n'est pas remplie ; l'échec surgit plusieurs étapes plus loin, loin de sa cause.
**Leçon** : `forge.preflight_oracle_registration` — *« l'enregistrement du projet dans
`oracles.json` est un prérequis mécaniquement vérifiable AVANT le premier dispatch LLM,
mais rien ne le vérifie »*.
**Pourquoi pas `driver`** : le driver exécute des étapes ; le pré-vol décide s'il y a lieu
d'en exécuter une. Deux boucles, deux moments.

### `build` — la production de l'artefact jouable

**Boucle qui casse** : le code produit satisfait ses preuves et le jeu reste inutilisable.
**Leçon** : `forge.entrypoint_is_undeclared_invariant` — *« 282 assertions vertes, 63/64
mutants tués, bot solvable — et `project.godot` ne déclarait pas de scène principale »*.
**Ce n'est pas `s9-build` (l'étape)** : c'est la zone où le passage *spécification →
artefact exécutable* peut rompre, quel que soit le profil qui l'exécute.

### `oracle-produit` — la chaîne de preuve du jeu, distincte de `quality`

**Boucle qui casse** : l'oracle rend un verdict qui ne correspond pas à ce qu'il mesure.
**Leçons (6)** : `oracle_fail_vs_not_measured_marker` (FAIL rendu là où `NOT_MEASURED`
s'imposait) · `forge_oracle_convention_undocumented` · `new_proof_needs_declared_executor`
(un test non listé n'existe pas dans la chaîne) · `hardcoded_expected_state_breaks_on_growth`
· `test_green_via_wrong_causal_path` (vert par le mauvais chemin causal) ·
`mutation_survivor_equivalence_requires_mechanical_proof`.
**Pourquoi pas `quality`** : `quality` désigne les signaux sémantiques sur artefact amont
(discriminance, langue, recopie). `oracle-produit` désigne la preuve du **jeu construit** —
assertions, mutation, solvabilité, observabilité. Les fusionner ferait perdre les deux.

### `knowledge` — catalogue, recherche, réutilisation

**Boucle qui casse** : la connaissance existe, et la production ne s'en sert pas.
**Leçons** : `kb_humangate_to_controlled_autonomy` (la gate d'ingestion empêche la boucle
*manque → world-scan ciblé → KB*) · `reuse_tracking_oracle_dead_since_inception` (les deux
volets de mesure de réutilisation jamais verts sur aucun run).
**Consommateur naturel** : le contrat `SEARCH_USAGE_CONTRACT_V1`.

### `feedback-loop` — le retour diagnostic → correction

**Boucle qui casse** : une cause racine est identifiée et rien n'est corrigé.
**Leçons (4)** : `broken_loop_repair_not_report` · `diagnosis_is_not_workflow_end` ·
`architecture_check_before_human_escalation` · `escalation_costs_avoid_default_route`.

**Nommée `feedback-loop` et surtout PAS `orchestration`** : `orchestrator` et
`run_orchestrator` sont déjà **deux rôles** de `roles.yaml`. Une layer qui porterait le nom
d'un rôle rendrait impossible de distinguer *« la boucle de retour a cassé »* de *« l'agent
orchestrateur a échoué »*. C'est précisément l'erreur que le critère « pas un rôle »
interdit — et elle était à un mot près.

### Ce que je propose de **ne pas** créer

| candidat | verdict |
|---|---|
| `supervision` (vie du run) | **refusé** — `forge.run_status_not_liveness_proof` décrit une boucle du driver : lancer, surveiller, conclure. Élargir la définition de `driver` plutôt qu'ajouter une layer pour une leçon |
| `dispatch` | **refusé** — `forge.timeout_greenfield_by_profile` (timeout d'étape) est `driver` |
| `wiremap` | **refusé** — `forge.wiremap_concept_reuse_requalification` tombe dans `s5-wiremap-contract`, qui existe |

---

## Le vocabulaire proposé — 8 conservées + 5 ajoutées

```
s1-prisme · s2-worldscan · s3-decompo · s4-archi-contract · s5-wiremap-contract
repair · quality · driver
preflight · build · oracle-produit · knowledge · feedback-loop
```

Une seule énumération, un seul fichier source (`mutation_registry.schema.json`), employée
par les mutations, les problèmes racines, et — si Pierre l'ouvre un jour — les leçons.

## Consommateurs

| consommateur | statut réel |
|---|---|
| `mutation_registry.schema.json` (validation d'enum) | **actif** — `check_mutation_registry` refuse une valeur hors énumération |
| `root_problems[].layer` | **écrit, lu par aucun code** |
| `mutation_registry.findByLayer()` | **écrit et testé, appelé par aucun code de production** |
| `lesson.layer` | **n'existe pas** (hors périmètre de ce document) |

**À dire franchement : `layer` est aujourd'hui `PASSIVE`.** Le champ est validé à
l'écriture et n'est lu par aucune décision. Étendre l'énumération **ne crée aucun
consommateur** — cela rend seulement possible d'en avoir un.

Le premier consommateur crédible serait `candidate_selector` : « quelles mutations ont
déjà touché cette zone ? » avant d'en proposer une nouvelle. Il n'existe pas, et ce
document ne le crée pas.

## Risques

1. **Une énumération qui grandit à chaque leçon n'est plus une taxonomie.** Les 5 ajouts
   couvrent 16 des 18 leçons validées ; les 2 restantes
   (`instrument_assumes_instead_of_reads`, transversale) n'ont pas de zone propre. Ce reste
   est le signal à surveiller : si la 19ᵉ leçon demande une 6ᵉ layer, le vocabulaire est
   mal découpé.
2. **`build` et `oracle-produit` décrivent la chaîne aval**, absente du registre actuel
   (toutes les mutations sont amont). Les déclarer avant qu'une mutation les emploie, c'est
   déclarer sans exécuter — le motif que cette lane traque.
3. **`feedback-loop` est la plus fragile** : ses 4 leçons parlent de comportement
   d'orchestration. Le risque de dérive vers « la layer de l'agent » est réel et permanent.
4. **Étendre sans consommateur ne fait rien avancer** (voir tableau ci-dessus).

## Décision demandée

☐ **Adopter les 5 ajouts** (`preflight`, `build`, `oracle-produit`, `knowledge`,
  `feedback-loop`) dans l'énumération existante
☐ **N'adopter que les zones déjà exercées par une mutation** — soit aucune des 5, et
  attendre qu'une mutation aval existe
☐ **Adopter un sous-ensemble** — préciser lequel
☐ **Ne rien changer** — `layer` reste tel quel, et le lien leçon ↔ problème racine reste
  hors d'atteinte

Tant qu'aucune case n'est cochée, `mutation_registry.schema.json` reste inchangé.

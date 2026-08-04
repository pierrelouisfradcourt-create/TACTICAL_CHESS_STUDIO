# KNOWLEDGE_MATERIAL_AUDIT_V1

*2026-08-04. **Audit lecture seule.** Aucun fichier runtime modifié, aucun embedding créé,
aucune base vectorielle installée, aucune recette / capacité / lesson / contrat touché,
aucun champ ajouté, aucun agent RAG construit. Seul ce fichier a été écrit.*

Question posée : **la Forge possède-t-elle déjà assez de matière structurée pour construire
un Knowledge Runtime utile ?**

---

## STATUS

```
MATIÈRE STRUCTURÉE      : OUI, et de qualité inhabituelle (preuves versionnées, sha256, HMAC)
VOLUME                  : PETIT — ~120 unités de connaissance causale au total
LIEN CAUSAL COMPLET     : PARTIEL — la chaîne problème→cause→action→résultat→preuve
                          existe MÉCANIQUEMENT sur l'axe mutation, et est ROMPUE sur l'axe lesson
BLOQUANT PRINCIPAL      : root_problems[].lesson_ids == [] sur 4/4 — 18 leçons validées,
                          ZÉRO rattachée à un problème racine
VERDICT DE CONSTRUCTION : un index vectoriel serait PRÉMATURÉ. Une reconnexion l'est moins.
```

**Réponse courte :** la matière existe et elle est de bien meilleure qualité que dans un dépôt
ordinaire — mais elle est **petite** et **partiellement débranchée**. Le manque n'est pas un
vector store : c'est **une arête** entre deux registres qui existent déjà.

---

## SOURCES_ANALYZED

| Source | Chemin | Mesure |
|---|---|---|
| Contrats d'agent | `scripts/forge/contracts/*.yaml` | 49 fichiers (48 contrats + `roles.yaml`) |
| Capacités Forge | `scripts/forge/capabilities.json` | 4 capacités, 1 entrée `proven_chains` |
| Recettes | `scripts/forge/agent_recipes.json` | 3 recettes |
| Registre de mutations | `scripts/forge/mutation_registry.json` | 25 mutations × 32 champs |
| Graphe de mutations | `scripts/forge/mutation_graph.json` | nœuds + arêtes, aucun score |
| Problèmes racines | `scripts/forge/root_problems.json` | 4 problèmes + `reward_contract` |
| Leçons | `lab/reports/lessons.jsonl` | 23 lignes → **18 après repli** |
| Propositions KB | `knowledge_base/proposals/*.yaml` | 19 fichiers `kb.proposal.v1` |
| Catalogue KB | `knowledge_base/catalog.json` | 50 entrées |
| Preuves | `lab/forge_evidence/**` | 129 fichiers, 32 dossiers, 14 bundles |
| Runs | `lab/forge_runs/**` | 34 projets, 956 fichiers, 33 `verdict.json` signés |
| Observation | `lab/reports/observer/*/events.jsonl` | **7 659 événements**, 4 projets, 32 types |
| Journaux | `lab/reports/*.jsonl` | 9 journaux (dont 42 `capability_gap`, 3 `failure_events`) |
| Jeux | `games/**` | 25 projets, 4 `genre_bible.json`, 4 `wiremap.json` (123 lignes) |
| Vocabulaire de jeu | `scripts/forge/standard/capabilities.yaml` | 31 capacités de gameplay, vocabulaire FERMÉ |
| Documentation | `docs/forge/*.md` | 114 fichiers |

**Note d'état :** `agent_factory.mjs`, `candidate_selector.mjs`, `execution_binding.mjs`,
`mcts_selector.mjs`, `execution_proof.mjs` ont été écrits entre 20:38 et 23:19 aujourd'hui.
Vérifié par exécution : `node --test` sur les 5 → **99/99 pass**. Ils sont donc `IMPLEMENTED
+ TESTED`, non commités.

---

## INVENTORY

### Contrats — 48 contrats × 17 champs, remplissage intégral

```
role · capability_role · exigences_cognitives · memoire · mandatory_read · objectif
in_scope · out_of_scope · permissions · gardeFou · success_criteria · tests_oracles
final_report · output_contract · skill · plugin · delegation_context
```

**48/48 sur chacun des 17 champs. Zéro champ absent.** Le schéma (`contracts/SCHEMA.md`)
impose les trois états *rempli / déclaré vide / absent* et refuse l'absence.

Présence des champs demandés par la mission :

| Champ recherché | Présent | Remplissage réel |
|---|---|---|
| objectif | ✅ | 48/48 rempli |
| permissions | ✅ | 48/48 rempli |
| garde-fous | ✅ `gardeFou` | 48/48 rempli |
| success criteria | ✅ | 48/48 rempli |
| tests | ✅ `tests_oracles` | 48/48 rempli |
| oracles | ✅ `tests_oracles` | 48/48 rempli |
| evidence | ⚠️ indirect | via `tests_oracles` + `final_report` — **aucun champ `evidence_ref` dédié** |

**Sous-déclaration mesurée :** `skill: aucun` sur **45/48**, `plugin: aucun` sur **47/48**.
Le `SCHEMA.md` le documente lui-même comme « consommateur faible … sous-déclaration connue,
à ne pas blanchir ». Pour un RAG, cela signifie : le champ existe mais **ne porte aucune
information discriminante**.

### Capacités — 4, toutes attachées à un runtime

| id | résout | mutation source | runtime_role | déclaré dans `roles.yaml` | measurement_status | production_ready |
|---|---|---|---|---|---|---|
| `instance_separation` | `PROMPT_FIELD_OMISSION` | `M-ws5` | `worldscan` | ✅ | CONSTRAINT_ONLY | false |
| `targeted_field_repair` | `REPAIR_NON_CONVERGENCE` | `REPAIR-LOOP-V1` | `repair_runtime` | ✅ | CONSTRAINT_ONLY | false |
| `duplicate_content_detection` | `ORACLE_FALSE_NEGATIVE` | `Q1-DISCRIMINANCE` | `deterministic` | ✅ | OBJECTIVE_MEASURED | false |
| `cross_field_copy_detection` | `DEFECT_DISPLACEMENT` | `M-Q5-A` | `deterministic` | ✅ | OBJECTIVE_MEASURED | false |

Chacune porte `state · action · expected_metric · constraints`, **4 à 5 `evidence_refs`**,
**4 métriques mesurées**, **2 à 3 `limitations` écrites**. Qualité des descriptions : haute —
les `limitations` sont des phrases falsifiables, pas des précautions de style (« converge vers
l'ORACLE, pas vers la qualité »).

L'entrée `proven_chains` est aujourd'hui un **pointeur** vers `agent_recipes.json`, avec une
note de résolution de doublon datée. Une seule écriture du même fait.

### Recettes — 3, toutes exécutables et prouvées

| id | root_problem | chaîne | métrique objectif | oracle | evidence_req |
|---|---|---|---|---|---|
| `world_scan_repair_v1` | `PROMPT_FIELD_OMISSION` | `instance_separation → targeted_field_repair` | `field_completion_without_regression` | `check_worldscan.mjs v0.3` | 4 |
| `duplicate_content_gate_v1` | `ORACLE_FALSE_NEGATIVE` | `duplicate_content_detection` | `detection_rate` | `oracle_quality.mjs` | 3 |
| `cross_field_copy_gate_v1` | `DEFECT_DISPLACEMENT` | `cross_field_copy_detection` | `residual_defect_rate` | `cross_field_quality.mjs` | 3 |

`recipe_status: EXECUTABLE` ×3, `proven: true` ×3, `blocked_reasons: []` ×3,
`production_ready: false` ×3. **Capacités consommées : 4/4 — aucune capacité orpheline.**

### Leçons — 18 après repli append-only

```
23 lignes  →  18 lesson_id distincts  (5 candidate remplacées par leur version validated)
status          : validated 18/18
evidence_count  : 1 sur 18/18
supporting_runs : rempli 18/18   (11 run_ids distincts)
counter_examples: rempli  0/18   ← VIDE PARTOUT
caused_by.experience : 17/18
caused_by.failure_id :  1/18     ← quasi vide
générations     : g2 = 5 · g3 = 13
```

Structure `forge.lesson.v1` : `lesson_id · statement · status · generation · supporting_runs ·
counter_examples · caused_by{failure_id, experience} · evidence_count · ts`.

Champs demandés par la mission :

| Champ | Présent | Rempli |
|---|---|---|
| cause | ✅ `caused_by` | 17/18 (via `experience`), 1/18 (via `failure_id`) |
| effet | ✅ `statement` | 18/18 — mais cause et effet sont **fondus dans une seule phrase** |
| contexte | ⚠️ | pas de champ dédié ; le contexte est **déduit** de `supporting_runs` |
| supporting_runs | ✅ | 18/18 — **2 non résolvables sur disque** (`pong_r2`, `pong_r3`) |
| evidence | ⚠️ `evidence_count` | compteur (1), **pas de chemin** — la preuve n'est pas adressable depuis la leçon |
| contre-exemples | ✅ champ présent | **0/18 rempli** |

**Projection KB déjà faite :** `knowledge_base/proposals/` contient **19 YAML `kb.proposal.v1`**,
un par leçon, chacun avec `provenance{lessons_source, lesson_id, supporting_runs, validation{
status, validated_by: Pierre, validated_at}}` et `ratification{decideur, statut: APPLIQUEE, date}`.
C'est **la seule matière du dépôt qui porte une ratification humaine datée et lisible par machine.**

### Registre de mutations — 25 entrées, 32 champs

```
evidence_status VERSIONED : 25/25          status : REPRODUCIBLE 11 · PRODUCTION 5
root_problem_id           : 21/25                   ACCEPTED     5 · OBSERVED    4
reward_contract_ref       : 21/25          accepted: true 13 · false 12
measured_metrics          : 17/25          evaluation_context : 25/25
known_blind_spots         : 19/25          requires 8/25 · conflicts 4/25
```

Chaque entrée porte `hypothesis` (la cause supposée), `implementation` (l'action),
`measured_gain` (le résultat, en prose chiffrée), `evidence_refs` (la preuve),
`known_blind_spots` (ce que la mesure refuse de regarder). **Vérifié par exécution :**
`node check_mutation_registry.mjs` → exit 0, donc **chaque `evidence_ref` existe sur disque**.

### Preuves — 14 bundles, 9 complets

```
129 fichiers · 32 dossiers · 100 .json · 9 .txt · 8 .command · 7 .jsonl · 5 .log
```

**9 bundles portent le quintuplet complet** `before + after + oracle_before + oracle_after +
measured_metrics` : `PROMPT_FIELD_OMISSION/M-ws1..M-ws6` (6), `REPAIR_RUNTIME_V1`,
`EXECUTION_PROOF_V0/evidence`, `EXECUTION_PROOF_MWS6/evidence`. La plupart ajoutent
`prompt.txt` et `reproduce.command` — **la commande de rejeu est versionnée**.

Un bundle `_saboteur/` existe : la falsification volontaire de la métrique est conservée à
côté de la mesure qu'elle falsifie.

### Runs et verdicts

```
34 projets · 956 fichiers · 33 verdict.json · 12 state.json · 21 dossiers artifacts/
```

`verdict.json` = 16 champs : `software_verdict · evidence_verdict · claim_verdict · decision ·
oracles{} · redteam_advisory · provenance_ok · git_head · nonce · ts · hmac`. Signature HMAC
présente, `git_head` présent → **chaque verdict est rattachable à un état exact du dépôt**.

### Jeux

```
25 projets sous games/
4 genre_bible.json      (pong · snake · breakout_v2 · tetris)
4 wiremap.json          123 lignes cumulées (pong 15 · snake 44 · breakout_v2 52 · tetris 12)
~20 wiremap.json        supplémentaires sous lab/forge_runs/
10 bibles Markdown      games/auto_battler/bibles/
4 GENRE_BIBLE *_PROPOSED docs/forge/
1 GAME_REFERENCE        games/tetris/
```

**La ligne de wiremap est l'unité la plus riche du dépôt côté gameplay — 24 champs :**

```
id · source · source_role · reference · charter_tags · category · provides · requires
owner · system_parent · address · genre_refs · observable_by_player · observable_proof
observable_note · expected_proof · reused_from · reused_from_note · state · reason
fichiers · fonction · preuve · statut
```

Elle relie **une intention de design** (`fonction`, `observable_by_player`) à **du code**
(`fichiers`, `address`) et à **une preuve** (`preuve`, `observable_proof`, `expected_proof`).

**Deux registres portent le mot « capabilities » — à ne jamais fusionner :**
`scripts/forge/capabilities.json` = 4 **compétences de la Forge** (mesurées) ·
`scripts/forge/standard/capabilities.yaml` = 31 **capacités de gameplay** (vocabulaire fermé
`game.boot`, `game.loop`, `game.state`…, `single_owner`). Le second alimente déjà
`forge_capability_gap_proposals.jsonl` (**42 propositions**).

---

## REUSABLE_MATERIAL

Ce qui est **exploitable tel quel**, sans rien créer :

| Matière | Unités | Format | Pourquoi c'est réutilisable |
|---|---|---|---|
| Bundles de preuve complets | **9** | JSON `before/after/oracle_*/metrics` + `.command` | Paires entrée→sortie mesurées ET rejouables |
| Mutations avec métriques | **17** | JSON, 32 champs | `hypothesis → implementation → measured_gain → evidence` en une entrée |
| Leçons validées + ratification | **18** | JSONL + 19 YAML KB | Seule matière portant une signature humaine datée |
| Contrats | **48** | YAML, 17 champs | Vocabulaire de mission normalisé, 100 % rempli |
| Lignes de wiremap | **123** | JSON, 24 champs | Pont design ↔ code ↔ preuve, déjà normalisé |
| Verdicts signés | **33** | JSON + HMAC + `git_head` | Étiquette de résultat non falsifiable |
| Capacités + recettes | **4 + 3** | JSON schématisé | Description exécutable d'un savoir-faire |
| Capacités de gameplay | **31** | YAML, vocabulaire fermé | Clé de jointure inter-jeux **déjà fermée** |
| Événements d'observation | **7 659** | JSONL + taxonomie de preuve | Trace physique avec `source.path + line + sha256` |

**Total « unités de connaissance causale » : ~120.** (18 leçons + 25 mutations + 4 capacités +
3 recettes + 4 problèmes racines + ~66 lignes de wiremap portant une `preuve` renseignée.)

---

## RAG_VALUE_BY_SOURCE

### A — Très haute valeur : `problème → cause → action → résultat → preuve`

| Source | n | Chaîne réellement portée |
|---|---|---|
| **Mutations avec `root_problem_id` + `measured_metrics` + `evidence_refs`** | **17** | `root_problem` → `hypothesis` → `implementation` → `measured_gain` → `evidence_refs` (existence vérifiée) — **la chaîne est COMPLÈTE et mécanique** |
| **Bundles de preuve complets** | **9** | `before` → `oracle_before` → action → `after` → `oracle_after` → `measured_metrics` + `reproduce.command` |
| **Leçons + proposition KB ratifiée** | **18** | `caused_by.experience` → `statement` → `supporting_runs` → ratification Pierre datée — **mais SANS lien vers un `root_problem`** |

**Classe A totale : 44 unités.** Les 17 mutations sont la seule matière du dépôt où les cinq
maillons sont **tous** vérifiables par machine.

### B — Haute valeur : `capacité → contrat → preuve attendue`

| Source | n | Ce qu'elle décrit |
|---|---|---|
| Contrats d'agent | 48 | mission bornée + `success_criteria` + `tests_oracles` + `output_contract` |
| Capacités | 4 | `state/action/expected_metric/constraints` + `evidence_refs` + `limitations` |
| Recettes | 3 | chaîne de capacités + `validation_contract` + `evidence_requirements` |
| `reward_contract` des problèmes racines | 4 | objectif + contraintes + pénalités + `forbidden_aggregation` + `forbidden_inference` |
| `standard/capabilities.yaml` | 31 | vocabulaire fermé de gameplay, jointure inter-jeux |
| Lignes de wiremap | 123 | intention → fichiers → preuve attendue |

**Classe B totale : 213 unités.**

### C — Moyenne valeur : historique sans causalité

| Source | n | Limite |
|---|---|---|
| Verdicts signés | 33 | disent *ce qui s'est passé*, jamais *pourquoi* |
| Événements Observer | 7 659 | granularité trop fine ; utile comme **preuve d'appui**, pas comme unité de récupération |
| Fichiers de run | 956 | volume dominé par les artefacts intermédiaires |
| `forge_capability_gap_proposals` | 42 | signal de manque, pas de savoir |
| Catalogue KB | 50 | 7 `validated` seulement / 43 `candidate` |
| Journaux d'erreur | 9 fichiers | `failure_events.jsonl` = **3 lignes** pour 18 leçons |

### D — Faible valeur initiale

| Source | n | Raison |
|---|---|---|
| `docs/forge/*.md` | 114 | narratif, statuts mélangés (`PROPOSED`, `CLOS`, périmés) — **risque actif de contradiction** |
| Code source des jeux | 25 projets | brut, non annoté |
| Doublons documentaires | ~10 | `agent_factory_contract.md` (brouillon) vs `AGENT_FACTORY_CONTRACT_V1.md` (courant) — même sujet, deux vérités |

---

## MISSING_LINKS

Ruptures **mesurées**, dans l'ordre de gravité.

### 1. `lesson → root_problem` — ROMPU À 100 %

```
root_problems[].lesson_ids :  []  []  []  []      (4/4 vides)
leçons existantes          :  18
leçons citées              :   0
```

Le champ **existe déjà** dans `root_problems.json`. Il n'a jamais été peuplé.
**Conséquence directe :** un retrieval « problèmes similaires » ne pourrait s'appuyer que sur
la ressemblance de texte entre `statement`s — exactement ce que la doctrine interdit
(*evidence > similarité*). C'est le lien qui manque, et c'est le seul qui soit bloquant.

### 2. `lesson → mutation` — INEXISTANT (aucun champ)

Le schéma `mutation_registry` (32 champs) ne porte **aucun** champ `lesson_id`, et
`forge.lesson.v1` ne porte aucun `mutation_id`. Les 25 mutations et les 18 leçons sont deux
histoires parallèles du même travail, sans passerelle. *(Ajouter le champ serait une décision
humaine — hors périmètre de cet audit.)*

### 3. `lesson → evidence` — COMPTEUR SANS ADRESSE

`evidence_count: 1` sur 18/18, mais **aucun chemin**. On sait qu'il existe une preuve ; on ne
peut pas l'ouvrir depuis la leçon. Le lien passe par `supporting_runs` → `lab/forge_runs/<run>`,
et **2 des 11 runs cités n'existent pas sur disque** (`pong_r2`, `pong_r3`).

### 4. `lesson.counter_examples` — VIDE À 100 %

0/18. La moitié réfutante de chaque leçon est absente. Un Knowledge Runtime bâti là-dessus ne
retournerait **que des confirmations** — un moteur à biais de confirmation.

### 5. `lesson.caused_by.failure_id` — 1/18

`failure_events.jsonl` = **3 lignes** pour 18 leçons. Le mécanisme `failure_event → lesson`
décrit par `learning_memory.py` est implémenté, **et n'a presque jamais été alimenté**.

### 6. `contract → capability` — 43/48 SANS LIEN

Seuls 5 fichiers sur 49 citent `capability` / `root_problem` / `recipe`, dont `roles.yaml`.
Les 48 contrats savent quel **rôle runtime** les exécute (`capability_role`, 48/48) mais
ignorent quelle **compétence mesurée** ils mettent en œuvre. La chaîne
`contract → capability → recipe → runtime → proof` est **connectée sur ses trois derniers
maillons, débranchée sur le premier**.

### 7. `verdict → savoir` — AUCUN RETOUR

33 verdicts signés, aucun ne référence une leçon, une mutation ou une capacité. Un verdict dit
si ça a marché ; rien ne dit ce qu'on en a appris.

### Liens EXISTANTS et sains (à ne pas refaire)

```
capability → runtime_role → roles.yaml          4/4  ✅
capability → mutation source → evidence         4/4  ✅ (existence disque vérifiée, exit 0)
recipe → capability                             4/4  ✅ aucune orpheline
recipe → root_problem → reward_contract         3/3  ✅
mutation → evidence_refs                       25/25 ✅ VERSIONED
mutation → evaluation_context (dataset_sha256) 25/25 ✅
lesson → proposition KB ratifiée               18/19 ✅ signature Pierre datée
wiremap line → fichiers + preuve                     ✅ 24 champs normalisés
verdict → git_head + hmac                      33/33 ✅
```

### Liens INTERDITS par manque de preuve

- `lesson → root_problem` **par similarité de texte** — la doctrine l'interdit, et le dépôt a
  déjà mesuré pourquoi : Jaccard max 0,194 entre deux artefacts que tout rapproche
  (`forge_comparator_alignment`). La similarité lexicale est inerte ici.
- `capability → capability` **par score agrégé** — `forbidden_aggregation` nomme
  `mutation_score`, `quality_score`, `global_score` dans les 4 problèmes racines.
- `mutation ↔ mutation` de **root_problems différents** — interdit par
  `MCTS_CONTROLLER_CONTRACT.md` §3.
- **fusion des deux registres « capabilities »** — compétence Forge et capacité de gameplay
  sont deux notions distinctes partageant un mot.

---

## POSSIBLE_INDEXES

Proposés, **non implémentés**. Chaque index est donné avec sa clé de jointure **existante** —
aucun n'exige de champ nouveau, sauf mention explicite.

| Index | Unités | Clé de jointure existante | Constructible aujourd'hui |
|---|---|---|---|
| `mutations_index` | 17 | `root_problem_id` + `evaluation_context.dataset_sha256` | **OUI** — chaîne causale complète |
| `evidence_index` | 9 bundles / 129 fichiers | chemin + `sha256` (déjà dans `evidence_refs`) | **OUI** |
| `capabilities_index` | 4 + 3 recettes | `id` ↔ `runtime_role` ↔ `source_mutation` | **OUI** |
| `contracts_index` | 48 | `role` + `capability_role` | **OUI** (mais sans lien capacité) |
| `gameplay_index` | 123 lignes + 4 genre_bibles + 31 capacités | `provides`/`requires` sur vocabulaire **fermé** | **OUI** — la meilleure clé du dépôt |
| `verdicts_index` | 33 | `run_id` + `git_head` | **OUI** (valeur C : sans causalité) |
| `lessons_index` | 18 | `lesson_id` + `supporting_runs` | **DÉGRADÉ** — sans `root_problem`, la recherche retombe sur le texte |
| `runtime_index` | 7 659 événements | `run_id` + `actor.capability_role` | **OUI**, mais rôle de **preuve d'appui**, pas d'unité de récupération |

**Le meilleur candidat n'est pas `lessons_index`.** C'est `gameplay_index` : 123 lignes de
wiremap dont les `provides`/`requires` pointent un **vocabulaire fermé de 31 identifiants**.
La jointure y est **arithmétique**, pas sémantique — donc immunisée au reproche
*retrieval ≠ vérité*. Et 42 `capability_gap_proposals` en sortent déjà mécaniquement.

### Types de retrieval — et ce que chacun exige

| Requête | Faisable ? | Chemin, et sa condition |
|---|---|---|
| **« précédents validés »** | **OUI aujourd'hui** | `root_problem_id` → mutations `status: ACCEPTED\|PRODUCTION` → `evidence_refs`. Déjà implémenté par `candidate_selector.mjs` (99 tests verts). |
| **« capacité nécessaire »** | **OUI aujourd'hui** | `root_problem_id` → `capabilities.solves` → `runtime_role` → `roles.yaml`. Déjà implémenté par `execution_binding.mjs`. |
| **« quel jeu a déjà fait ça »** | **OUI** | `provides`/`requires` sur les 31 identifiants fermés, jointure exacte inter-jeux. |
| **« problèmes similaires »** | **NON — c'est le trou** | Exigerait `root_problems[].lesson_ids`. Sans lui, la seule voie est la similarité de texte, interdite par doctrine et mesurée inerte. |
| **« qu'est-ce qui a échoué ici »** | **NON** | `counter_examples` 0/18, `failure_events` 3 lignes. La matière négative n'existe pas. |

**Constat qui doit précéder toute décision :** deux des quatre types de retrieval sont **déjà
servis par du code déterministe testé**, sans aucun embedding. Un Knowledge Runtime vectoriel
n'ajouterait rien à ceux-là. Il ne servirait que le troisième — celui dont la clé manque.

---

## DATASET_POTENTIAL

Aucun dataset créé. Paires **identifiées seulement**.

| Paire | Source | Taille | Qualité | Valeur | Problème restant |
|---|---|---|---|---|---|
| `(artefact défectueux + problems[] d'oracle) → artefact réparé` | 9 bundles complets | **n=9** | **très haute** — `before`/`after` versionnés, oracle des deux côtés, `reproduce.command` | **TRÈS ÉLEVÉE** | Volume dérisoire. Et la limite est écrite dans le registre : « converge vers l'ORACLE, pas vers la qualité » — un modèle entraîné là-dessus apprendrait à **satisfaire l'oracle**, pas à écrire juste |
| `(root_problem + contexte) → capability_chain` | 3 recettes + 4 capacités | **n=3** | haute | **ÉLEVÉE** | n=3. Aucune généralisation possible |
| `(hypothesis + implementation) → measured_gain` | 17 mutations | **n=17** | haute — 12 échecs conservés avec `rejected_reason` | **ÉLEVÉE** | Le ratio 13 acceptées / 12 rejetées est **le point fort** : le négatif est conservé |
| `(symptôme de run) → leçon` | 18 leçons | **n=18** | moyenne | **MOYENNE** | Côté symptôme quasi vide : `caused_by.failure_id` 1/18, `failure_events` 3 lignes |
| `(ligne de wiremap) → fichiers + preuve` | 123 lignes | **n≈66** portant une `preuve` | moyenne-haute | **MOYENNE-ÉLEVÉE** | 4 jeux seulement ; vocabulaire d'état hétérogène corrigé mais historique |
| `(contrat) → artefact + verdict` | 48 contrats × 33 verdicts | **n≈33** | moyenne | **FAIBLE-MOYENNE** | Aucun lien contrat→verdict explicite ; jointure par `run_id` seulement |
| `(prompt) → artefact + oracle` | `prompt.txt` × 6 + transcripts | **n≈6** versionnés | haute | **MOYENNE** | Les prompts hors bundle ne sont pas versionnés, seulement hachés (`payload_prompt_sha256`) |

**Total apprenable, dédupliqué : ~60 exemples.** Trois ordres de grandeur sous ce qu'exige un
fine-tuning, et un ordre de grandeur sous ce qui rend un index vectoriel plus utile qu'un
`grep`. Cette matière est **une mémoire de référence**, pas un corpus d'entraînement — et
c'est ainsi qu'elle a de la valeur.

---

## RISKS

1. **Le volume ne justifie pas un index vectoriel.** ~120 unités de connaissance causale. Le
   dépôt possède déjà un retrieval lexical déterministe (`knowledge_base/search.mjs`, zéro
   embedding assumé) — et son journal montre des `matchCount: 0` récurrents sur 29 requêtes.
   **Le problème mesuré est la couverture du catalogue, pas la méthode de recherche.** Ajouter
   des embeddings au-dessus d'un catalogue trop mince déplacerait le défaut sans le fermer —
   *loi du déplacement*, observée trois fois le 2026-08-04.

2. **Indexer `docs/forge/` (114 MD) injecterait du périmé comme fait.** Preuve dans ce dépôt :
   `MCTS_READINESS_REPORT.md` annonce 1 mutation ordonnable là où le registre en porte 4 ;
   `agent_factory_contract.md` (brouillon) coexiste avec `AGENT_FACTORY_CONTRACT_V1.md` qui le
   remplace ; `RUNTIME_REALITY_LAYER_V0.md` est marqué `CLOS`. Un RAG narratif restituerait la
   version périmée avec la même assurance que la courante.

3. **`counter_examples` vide à 100 % = moteur à confirmation.** Retrouver uniquement ce qui a
   marché, sans jamais ce qui a réfuté, est le mode de panne exact que le studio combat.

4. **Deux registres « capabilities ».** Un index naïf les fusionnerait et ferait perdre les
   deux — le contrat de schéma l'écrit explicitement.

5. **Retrieval pris pour vérité.** Deux des quatre types de retrieval sont **déjà servis** par
   `candidate_selector.mjs` / `execution_binding.mjs`, qui refusent d'estimer quand le contexte
   est incompatible et rendent tous les ex æquo. Un moteur de similarité placé à côté rendrait
   **toujours** un résultat — y compris là où la couche déterministe refuse d'en donner un.
   C'est une régression de garantie, pas un ajout.

6. **`production_ready: false` sur 4/4 capacités et 3/3 recettes.** Toute la matière de classe B
   est explicitement non-production. Un Knowledge Runtime qui la restituerait sans propager ce
   drapeau transformerait une réserve en recommandation.

7. **2 `supporting_runs` non résolvables** (`pong_r2`, `pong_r3`) sur 11. Un index qui ne
   vérifie pas l'existence rendrait une preuve morte comme une preuve vivante. Le garde-fou
   existe déjà côté mutations (`check_mutation_registry.mjs` vérifie chaque `evidence_ref` sur
   disque) ; **il n'a pas d'équivalent côté leçons.**

---

## RECOMMENDED_NEXT_STEP

**Une seule action, et ce n'est pas un index.**

> **Peupler `root_problems[].lesson_ids` — champ qui existe déjà, vide sur 4/4.**

Pourquoi celle-là, et pas une autre :

- C'est **le seul lien bloquant**. Trois des quatre types de retrieval sont déjà servis par du
  code déterministe testé (99/99). Le quatrième — « problèmes similaires », le cœur d'un
  Knowledge Runtime — est le seul sans clé, et cette clé est cette arête.
- Elle **n'ajoute aucun champ** : `lesson_ids` est déjà dans le schéma. Remplir un champ vide
  n'est pas une extension de schéma.
- Elle transforme 18 énoncés isolés en **chaînes de classe A** : `root_problem → lesson →
  supporting_run → evidence`, jointes aux 17 mutations qui portent déjà le même
  `root_problem_id`. La classe A passerait de 44 à ~62 unités, **sans produire un seul fait
  nouveau** — uniquement en connectant des faits déjà prouvés.
- Elle est **falsifiable** : soit une leçon relève d'un des 4 problèmes racines, soit elle
  n'en relève d'aucun — et ce second cas est une information (il révèle un problème racine
  manquant, pas une leçon à forcer).

**Décision qui appartient à Pierre, pas à cet audit :** l'attribution `lesson → root_problem`
est un jugement. Une attribution automatique par similarité de texte reproduirait exactement
ce que la doctrine interdit. La proposition est donc : **rendre les 18 leçons et les 4
problèmes racines côte à côte pour arbitrage humain**, sans écrire.

**Ce qu'il ne faut PAS faire en premier** — et pourquoi :

| Action | Pourquoi pas maintenant |
|---|---|
| Installer une base vectorielle | ~120 unités. Le `grep` et `search.mjs` couvrent déjà ce volume |
| Générer des embeddings sur les leçons | Le lien manquant est causal, pas lexical |
| Indexer `docs/forge/` | Restituerait du périmé comme fait — prouvé dans ce dépôt |
| Construire un agent RAG | Deux couches déterministes servent déjà 3 requêtes sur 4, **avec** le droit de refuser de répondre |
| Remplir `counter_examples` en masse | Un contre-exemple s'observe, il ne se rédige pas |

---

## STATUS_BY_SURFACE

| Surface | Statut | Mesure |
|---|---|---|
| Contrats | `IMPLEMENTED` | 48 × 17 champs, 48/48 remplis · `skill`/`plugin` sous-déclarés (45/48, 47/48 à `aucun`) |
| Capacités | `IMPLEMENTED` | 4, toutes avec runtime_role déclaré, evidence vérifiée, `production_ready: false` ×4 |
| Recettes | `IMPLEMENTED` | 3, EXECUTABLE + proven, 4/4 capacités consommées, `production_ready: false` ×3 |
| Registre de mutations | `IMPLEMENTED + TESTED` | 25 entrées, `evidence_status: VERSIONED` 25/25, validateur exit 0 |
| Problèmes racines | `IMPLEMENTED` mais **`lesson_ids` `PASSIVE`** | 4 `reward_contract` complets · `lesson_ids: []` 4/4 |
| Leçons | `IMPLEMENTED, PARTIELLEMENT RELIÉ` | 18 validées, ratifiées Pierre · `counter_examples` 0/18 · `caused_by.failure_id` 1/18 |
| Propositions KB | `IMPLEMENTED` | 19 YAML, provenance + ratification datée |
| Preuves | `IMPLEMENTED` | 129 fichiers, **9 bundles complets**, `reproduce.command` versionnées |
| Runs / verdicts | `IMPLEMENTED` | 33 verdicts HMAC + `git_head` · aucun retour vers le savoir |
| Observation | `IMPLEMENTED + TESTED` | 7 659 événements, taxonomie de preuve, 32 types |
| Jeux / wiremaps | `IMPLEMENTED` | 123 lignes × 24 champs · 31 capacités de gameplay, vocabulaire fermé |
| Couche de décision | `IMPLEMENTED + TESTED, NON COMMITÉ` | `candidate_selector` · `execution_binding` · `mcts_selector` · `agent_factory` (PLAN_ONLY) · `execution_proof` — **99/99 tests verts** |
| Recherche lexicale | `IMPLEMENTED + TESTED` | `search.mjs`, zéro embedding assumé, 29 requêtes journalisées |
| **Knowledge Runtime / RAG vectoriel** | **`NOT_FOUND`** | Aucun embedding, aucun index, aucune base vectorielle — conforme au périmètre |

---

## Ce que cet audit ne prouve pas

- Que les 18 leçons sont **justes**. Elles sont *ratifiées* — ce qui est une propriété de
  procédure, pas de vérité.
- Que les 9 bundles complets sont **représentatifs**. Ce sont ceux qui ont été produits, pas un
  échantillon choisi ; 6 des 9 portent sur le même problème racine.
- Que la suite `pytest scripts/forge/tests/` passe — non exécutée ici. Les 99 tests exécutés
  couvrent les 5 modules de la couche de décision uniquement.
- Que `search.mjs` couvre mal le besoin **en général**. Les `matchCount: 0` observés portent sur
  29 requêtes de juillet, sur un catalogue depuis enrichi.
- Que le comptage des « ~120 unités causales » soit une métrique validée. C'est un **agrégat
  descriptif construit pour cet audit**, pas une mesure de la Forge — il ne doit ni classer,
  ni calibrer, ni générer quoi que ce soit (règle de variance des métriques, ratifiée
  2026-07-21).

---

```
software_verdict:       OK
evidence_verdict:       MECHANICAL_VALIDATION_ONLY
claim_verdict:          NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

*Aucun verdict global de préparation n'est émis. Cet audit ne dit pas « on peut construire un
RAG ». Il dit : voici les ~120 unités de mémoire causale qui existent, les 44 qui sont
exploitables telles quelles, les 7 liens rompus qui les séparent, et la seule arête —
`root_problems[].lesson_ids` — qui doit être rebranchée avant qu'un Knowledge Runtime ait
autre chose à faire que de la similarité de texte.*

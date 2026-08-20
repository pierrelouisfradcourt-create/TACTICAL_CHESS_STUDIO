# MASTER SCHEMA V2 — la Forge telle qu'elle est

Run de vérité du **2026-08-19**. `HEAD = 751d8be` · master · 118 commits d'avance, **0 poussé** ·
index **vide** · arbre de travail 126 entrées (35 M, 91 ??), **intégralement préservées**.

> Ce document décrit **le système qui existe**, pas celui que nous pensions avoir.
>
> **RÉFÉRENCE CANONIQUE — ratifié Pierre 2026-08-19.** C'est de cette version qu'il faut
> repartir ; `STUDIO_MASTER_SCHEMA.html` n'est plus corrigé, il est conservé comme historique
> et ses écarts sont inventoriés en §16.
>
> Ratifier ce document ne ratifie **aucune** de ses cases : chaque statut reste une mesure
> datée, avec sa portée. Un `UNKNOWN` demeure « non mesuré », jamais « probablement bon », et
> ne devient `TESTED` que par une exécution. Une section corrigée porte sa correction en
> clair plutôt que de la faire disparaître — voir §06_07 et C7.

## Discipline appliquée

Sept statuts, jamais un huitième. `IMPLEMENTED` (code + un appelant) · `TESTED`
(`IMPLEMENTED` + une assertion qui rougit si le comportement disparaît) · `DOCUMENTED_ONLY` ·
`PASSIVE` (testé, aucun consommateur ou aucune donnée) · `BLOCKED` · `NOT_FOUND` · `UNKNOWN`
(**non mesuré dans cette passe** — jamais « probablement bon »).

**Aucun verdict global `READY`.** Verdict par surface uniquement.

**Ce qui n'a pas été refait.** Quatre surfaces ont été mesurées et commitées le même jour ;
les redémontrer contredirait la règle « une preuve établie n'est pas redémontrée sans
changement de surface ». Elles sont citées avec leur commit, pas ré-auditées :
`RUN_IDENTITY_V1` (`104819c`), isolation de la preuve (`2d418b3`, `08d658f`), carte de vérité
et correction `proj` (`e0449cd`), inversion World Scan → Prisme (`751d8be`).

---

## 01_INTENT — la boucle telle que le schéma V1 la prescrit

Étage 2 du `STUDIO_MASTER_SCHEMA.html`, cité mot pour mot :

```
(1) FOUILLE BIBLIOTHEQUE   search.mjs · catalog.json    « advisory, jamais encore exerce »
        manque ?
(2) RETOUR WEB (delta)     world-scan CIBLE du manquant  ingestion/download = gate Pierre
(3) POOL DE BUILDERS       pool.py construit             « jamais declenche — condition jamais vraie »
(4) s8 HABILLAGE           assets                        « aucun contrat, hors ORDER »
```

**Le sens du déclenchement est l'inverse de l'intuition courante.** Ce n'est pas « le World Scan
découvre un manque et alimente la KB ». C'est **« la fouille de bibliothèque bute sur un manque
→ world-scan CIBLÉ du manquant »**. Le schéma déclare lui-même l'inertie de 3 de ses 4 étages.

---

## 02_WORLD_SCAN

| | |
|---|---|
| **Contrat** | `scripts/forge/contracts/s2-worldscan.yaml` |
| **Sortie** | bloc `json` terminal → `worldscan.json` : `games[{game, sources[], loops{}, objectives[{mode, has_win_state, victory_condition, has_defeat_state, defeat_condition, player_goal}], retention_answer}], advisory: true` |
| **Consommateurs mesurés** | `check_worldscan.mjs` (oracle) · `context_manifest.py` + `run_real.py` (injection prompt) · `repair_step.mjs` · `static_oracles.py` · `check_prisme_manifest.mjs` |
| **STATUS** | `IMPLEMENTED` |

Réponses aux onze questions du run :

- champs produits / obligatoires : ci-dessus ; **victoire, défaite et objectif joueur sont
  déclarés** (`has_win_state`, `victory_condition`, `has_defeat_state`, `defeat_condition`,
  `player_goal`), avec la contrainte `null ssi has_*_state=false` ;
- **déclare-t-il une capacité manquante ? NON.** Aucun champ de manque au schéma → `NOT_FOUND` ;
- **qui le transforme en KB ? PERSONNE.** Aucun consommateur ne produit d'entrée
  `knowledge_base/` depuis `worldscan.json` → `NOT_FOUND` ;
- **qui déclenche un retour web ? PERSONNE** (étage 2 du schéma V1) → `NOT_FOUND` ;
- **renvoi automatique sur capacité absente ? NON** — voir §03, le renvoi qui existe part
  d'ailleurs.

**Ordre d'exécution — corrigé et ratifié le 2026-08-19** (`751d8be`) : `s2-worldscan` s'exécute
**AVANT** `s1-prisme`, malgré leurs noms. Le Prisme **consomme** `artifacts/s2-worldscan.txt`
(`_UPSTREAM_BY_STEP`, deux copies). Les noms `s1`/`s2` sont conservés volontairement : ils vivent
dans les contrats, les `state.json` archivés et les traces Observer.

---

## 03_KB

| Mesure | Valeur |
|---|---|
| `knowledge_base/search.mjs` | présent (le schéma V1 le situe à tort dans `scripts/forge/`) |
| `knowledge_base/catalog.json` | **50 entrées** |
| `knowledge_base/search_log.jsonl` | **66 recherches**, 2026-07-20 → 2026-08-14 |
| dont appelant `s9-build` | **9** — le builder lui-même |
| dont appelant `preflight` | **7** |
| dont `undeclared` / absent | 49 |

> **Le schéma V1 dit « advisory, jamais encore exercé ». C'est FAUX depuis au moins un mois.**
> La fouille tourne, elle est journalisée, et le builder en est un appelant réel.

**STATUS fouille : `IMPLEMENTED`.**

### Le canal de manque existe — mais il part d'ailleurs

`propose_capability_gap` (`studio_link.py`) est appelé par **`driver.py` au pas `s10s`**, depuis
`check_collisions.identifiants_inconnus` : donc **après le build**, depuis la **wiremap**, jamais
depuis le World Scan.

| Mesure | Valeur |
|---|---|
| `forge_capability_gap_proposals.jsonl` | **237** propositions |
| dont `PROPOSED` | **236** |
| dont `PENDING` | 1 |
| `pending_review_decisions.jsonl` | **24** décisions |
| `propose_factory_capability_gap` | **0 appelant** |

**STATUS canal produit : `IMPLEMENTED`** (déposé, mais quasi jamais ratifié).
**STATUS canal usine : `PASSIVE`** — fonction sans appelant.

---

## 04_LESSONS

| Mesure | Valeur |
|---|---|
| `lab/reports/lessons.jsonl` | **29** leçons |
| producteurs | **12** modules (driver, kb_proposal, learning_memory, preflight, 8 modules Observer) |
| lecteurs | **1** (`driver.py`) |
| chemin vers le prompt | `premortem_lessons` → `self._premortem()` → clé `"premortem"` du contexte d'exécuteur |

**STATUS : `IMPLEMENTED`** — la leçon atteint réellement le prompt. Asymétrie notable :
douze écrivains, un lecteur.

---

## 05_BUILDER

Contexte réellement transmis à l'exécuteur (`driver.py`, dict `context`) :
`run_id` · `project` · `run_dir` · `model_override` · `dispatch_marker` · `attempt` ·
**`premortem`** · `project_bible` (s0 uniquement).

Artefacts amont injectés (`_UPSTREAM_BY_STEP`, deux copies strictement identiques) :
`s1-prisme ← s2-worldscan.txt` · `s3-decompo ← charter + s1 + s2` · `s2.6-story-bible ← charter + s2`.

> **La dépendance amont n'est PAS contraignante** : `run_real.py` fait
> `continue  # absent/illisible : omis (jamais bloquant a ce niveau)`. Un artefact amont manquant
> est **omis du prompt en silence**. C'est le mécanisme qui a laissé le Prisme tourner aveugle
> pendant des semaines — 0 occurrence de menu/pause/audio/onboarding dans sa production.

**STATUS : `IMPLEMENTED`** · **risque structurel : rupture de transmission silencieuse.**

### Consommation KB prouvée

`search_usage.mjs` calcule `proof_of_consumption`. Mesuré sur les 14 jeux possédant un
`run-oracle.mjs` :

```
MEASURED   2 / 14    kb_tactics   -> sys-damage-floor, sys-reachability
                     shmup_slice  -> sys-damage-floor
NOT_WIRED 12 / 14    « run-oracle.mjs n'invoque pas reuse_ratio.mjs »
```

**La boucle KB → Builder EST prouvée — deux fois, avec des références nommées.** Elle n'est pas
généralisée. **STATUS : `TESTED` sur 2 jeux, `NOT_FOUND` sur 12.**

---

## 06_RUNTIME · 07_ORACLES

> **CORRIGÉ LE 2026-08-19 — la première rédaction de cette section était FAUSSE.** Elle
> annonçait un « faux négatif structurel Godot » et proposait d'introduire `NOT_APPLICABLE`.
> Le cadrage de ce P0 a falsifié les deux affirmations. Le diagnostic erroné est retiré ;
> ce qui suit est ce que la mesure dit.

**Le verdict `NOT_WIRED` sur les jeux Godot est HONNÊTE.** `reuse_ratio.mjs` est pleinement
conscient de Godot — `LOGIC_EXTENSIONS = {'.mjs', '.gd'}`, détection de `project.godot`,
résolution des chemins `res://`, lecture de `preload()`/`load()`. Ses lignes 23-25 documentent
ce défaut **déjà corrigé** en son temps : « `isLogicFile` n'acceptait que `.mjs` : tout jeu
Godot était rejeté d'office ».

Mesure directe : **`games/tetris` → 36 fichiers de logique**, `reuseRatio = 0`. La mesure a donc
bien eu lieu. Le projet n'invoque simplement pas `reuse_ratio` — ce que `NOT_WIRED` signifie
exactement : « le mécanisme existe, personne ne l'invoque dans le projet ».

**`NOT_APPLICABLE` ne sera PAS introduit** (ratifié Pierre 2026-08-19). Le module refuse déjà ce
quatrième état par écrit : *« États AUTORISÉS … **exactement trois**. Un quatrième état serait
une façon de ne pas trancher. »* — et cite la leçon `oracle_fail_vs_not_measured_marker`, payée
pour la distinction `NOT_WIRED` / `NOT_MEASURED`. `CLAUDE.md:75` fige d'ailleurs les trois
valeurs par écrit.

### Le défaut réel : la DÉTECTABILITÉ, pas le vocabulaire

```
jeux WEB     games/<jeu>/run-oracle.mjs        kb_tactics 4 occurrences, shmup_slice 3
jeux GODOT   scripts/forge/godot_oracle.mjs    0 occurrence — runner PARTAGE, pas par jeu
reuseRatioCable  n'observe QUE join(gameDir, 'run-oracle.mjs')
```

Le câblage d'un jeu web vit **dans le jeu**. Celui d'un jeu Godot ne pourrait vivre que dans le
runner **partagé du studio**, déclaré par `oracles.json`
(`node scripts/forge/godot_oracle.mjs games/<jeu>`). Or `reuseRatioCable` ne regarde que le
fichier par jeu.

**Conséquence : si `godot_oracle.mjs` câblait `reuse_ratio` demain, l'oracle continuerait de
répondre « `run-oracle.mjs` absent / NOT_WIRED ».** Ce n'est pas un verdict faux aujourd'hui —
c'est un verdict **qui ne peut pas changer demain**.

**STATUS : `NOT_FOUND`** — la détection du câblage sur runner partagé n'existe pas. Le statut
rendu reste correct ; c'est son évolutivité qui manque.

Piste minimale (non exécutée) : faire partir la détection du runner **déclaré** dans
`oracles.json` au lieu d'un nom de fichier supposé — aucun vocabulaire nouveau, trois états
conservés, registre existant réutilisé. **Limite connue et à mesurer d'abord** : `oracles.json`
porte 23 clés pour 26 répertoires dans `games/`.

---

## 08_EVIDENCE

Mesuré et **clos** le 2026-08-19 (`2d418b3`, `08d658f`) — non ré-audité ici.

```
suite complete AVANT : dispatch_audit +4524 o   repair_results +8590 o
suite complete APRES : 0                        0
asset_results 0        forge_telemetry 0        (deja propres)
```

Cause d'origine : 1048 des 3462 lignes de `dispatch_audit.jsonl` sans `run_id`, **100 %**
`capability_role="repair_runtime"`, réparties s2-worldscan 696 / s4-archi 176 / s5-wiremap 176 —
soit exactement les appels de `test_run_real_repair_wiring.py`. **Ce n'était pas une rupture de
traçabilité en production : c'était la suite de tests écrivant dans la preuve de production.**

**STATUS : `TESTED`.** Classe de défaut sous-jacente (« fonction de haut niveau appelant un
émetteur injectable sans exposer l'injection ») : **OUVERTE** — confinement, pas guérison.

---

## 09_OBSERVER

| Mesure | Valeur |
|---|---|
| projets observés | **28** |
| dont parasites (`forge_run.events == 0`, pas de `run_dir`) | **6** — `jeu`, `nr`, `p`, `rouge`, `vert`, `probe2` |
| cas limite | `repair_runtime_v1` — `run_dir` présent, `state.json` absent |
| **PAS un parasite** | **`proj`** — 1328 événements RÉELS, `run_id = "proj-1"`, 2ᵉ identifiant le plus fréquent du flux de preuve |
| confinement d'écriture | **fermé** `6d2c094` |
| validation du nom de projet | **`NOT_FOUND`** |

**Observer → Décision : `NOT_FOUND`.** `pending_review.mjs` lit **7 files de propositions** et
contient **0 occurrence d'« observer »**. L'Observer ne nourrit aucune décision.

---

## 10_DECISION · 11_MUTATION

| Module | Octets | Consommateurs (tous canaux) |
|---|---|---|
| `candidate_selector.mjs` | 21 513 | 7 |
| `execution_binding.mjs` | 14 034 | 3 |
| `mcts_selector.mjs` | 6 060 | 1 |
| **`agent_factory.mjs`** | **24 010** | **0** |
| `execution_proof.mjs` | 18 665 | 1 |

**La chaîne casse à `agent_factory`** — l'étage qui produirait l'agent. Vérifié par tous canaux
(`.md`, `.ps1`, `.json`, `.yaml`, `.mjs`, `.py`) : les 15 correspondances sont des **documents et
des artefacts Observer**, aucun code. → **`PASSIVE`**

`apply_decisions.mjs` n'écrit dans **aucun registre** (`capabilities.json`,
`mutation_registry.json`, `root_problems.json`). **Décision → génome : `NOT_FOUND`.**

Registres : `mutation_registry` 25 · `layers` 13 · `capabilities` 5 · `root_problems` 4 ·
`agent_recipes` 3.

---

## 12_CAUSAL_LINEAGE

Champs cherchés dans les reçus de run réels : `reason`, `why`, `next_reason`,
`activation_reason`, `return_reason`, `tools_used`.

```
shmup_slice          profil full         13 pas    0/13 sur les 6 champs
tetris_proof3        profil proof_only    2 pas    0/2
bomberman_3d_proof4  profil proof_only    2 pas    0/2
```

**Avant de conclure : le contexte peut-il produire la preuve ?**

```
dernier run AVEC etapes LLM      2026-08-14   (amont_only, m3_e2e)
cablage de la lignee causale     2026-08-16   (8372f0d)
```

**Aucun run exerçant des étapes LLM n'a été exécuté depuis que la lignée est câblée.** Les
`proof_only` des 17 et 18 août n'ont **pas d'étape LLM** : ils ne peuvent structurellement pas
produire ces champs. L'absence mesurée n'est donc **pas** une preuve d'absence du mécanisme.

**STATUS : `UNKNOWN`** — implémenté et testé unitairement, **jamais observé dans un reçu réel**.
Idem `oracle_measures` (`5ae67b0`, 08-19) : aucun run depuis.

---

## 13_IDENTITY

`RUN_IDENTITY_V1` livré le 2026-08-19 (`104819c`). `PROJECT_ID` · `RUN_ID` · `SCOPE` · `RUN_MODE`
requis ; `NATURE` **ouverte**.

- `SCOPE = PRODUCT | FACTORY` — **ratifié Pierre 2026-08-19** ;
- `RUN_MODE = live | dryrun` — `dryrun` attesté (445 enregistrements, `audit._is_dryrun`) ;
- **`NATURE` : `UNKNOWN`**, aucune valeur inventée. L'hypothèse `real|fixture|selftest|probe`
  couvrait 57 % des enregistrements et laissait 71 identifiants sur 149 hors classement.

**STATUS : `TESTED`, mais `NOT_WIRED` délibérément** — brancher sur `audit.append_spawn_event`
renverserait son contrat *best-effort absolu* (« ne lève JAMAIS »). `check_run_identity` existe
pour ce câblage futur : il rapporte sans lever.

`RUN_MODE` ≠ `RUN_KIND` : `dryrun` est un **mode**, orthogonal à la nature. Un run réel sans
effet reste un run réel.

---

## 14_FIXTURES

Préfixes de `run_id` dans `lab/forge_evidence/*.jsonl` (5179 enregistrements, 149 identifiants) :

```
(aucune identite)  1398   27,0 %
proj-1             1320   25,5 %   espace de noms de FIXTURES
run-1               528   10,2 %
dryrun              443    8,6 %   MODE, pas nature
test-bloque         225    4,3 %
tous jeux reels    ~900   ~17 %
```

Les 1398 sans identité et une large part des fixtures venaient de la suite de tests — cause
close le 2026-08-19. **Les enregistrements historiques restent dans le flux** : ils ne sont ni
supprimés ni réécrits.

---

## 15_GAPS — boucles, par état

**Câblées et prouvées** — Lessons → Builder (premortem) · KB → Builder (2 jeux, refs nommées) ·
World Scan → Prisme/Decompo (upstream) · Isolation de la preuve.

**Partiellement câblées** — canal de manque (déposé 237×, ratifié ~0) · KB → Builder (2/14) ·
chaîne de décision V2 (4 étages sur 5).

**Mortes / inertes** — `agent_factory.mjs` (0 appelant) · `propose_factory_capability_gap`
(0 appelant) · `pool.py` (« condition jamais vraie », schéma V1) · Décision → génome.

**Prévues mais absentes** — étage ② « retour web ciblé du manquant » · World Scan → KB ·
Observer → Décision · validation du nom de projet Observer.

---

## 16_EVIDENCE_INDEX — contradictions mesurées

| # | Contradiction | Source | Mesure | Impact | Statut |
|---|---|---|---|---|---|
| C1 | schéma V1 : fouille « jamais encore exercée » | `STUDIO_MASTER_SCHEMA.html` étage 2 ① | `search_log.jsonl` 66 recherches, 9 depuis `s9-build` | le schéma sous-estime le système | **corrigé ici** |
| C2 | `search.mjs` situé dans `scripts/forge/` | schéma V1 | vit dans `knowledge_base/` | référence non résolvable | **corrigé ici** |
| C3 | `capability_gap` et `lesson` : **0 occurrence** au schéma V1 | grep | 237 propositions, 29 leçons | deux mécanismes ont poussé HORS du schéma | **ajoutés ici** |
| C4 | détection du câblage sur runner **partagé** | `reuseRatioCable` | n'observe que `games/<jeu>/run-oracle.mjs` ; Godot passe par `godot_oracle.mjs` déclaré dans `oracles.json` | un câblage Godot futur resterait **invisible** | `NOT_FOUND` |
| C5 | sources `STUDIO_*_V0` | §1 du run | 1 seul consommateur : `studioV2/studioctl.py`, **lane gelée** | politique non appliquée en lane Forge | `DOCUMENTED_ONLY` |
| C6 | contrats `s1`/`s2` : prose « étape 1 / étape 2 » | `contracts/*.yaml` | ordre réel inversé depuis `d8a5464` | numérotation trompeuse | dette documentaire |
| C7 | *(auto-correction)* « faux négatif structurel Godot » | rédaction initiale de ce document | `reuse_ratio.mjs` gère `.gd`, `project.godot`, `res://` ; tetris = **36** fichiers de logique mesurés | le diagnostic accusait l'oracle au lieu du câblage | **retiré 2026-08-19** |

---

## 17_STATUS_BY_SURFACE

| Surface | Statut |
|---|---|
| World Scan (production) | `IMPLEMENTED` |
| World Scan → signal de capacité absente | `NOT_FOUND` |
| World Scan → KB | `NOT_FOUND` |
| Fouille KB (`search.mjs`, 66 recherches) | `IMPLEMENTED` |
| Canal de manque produit (237 déposées) | `IMPLEMENTED` |
| Canal de manque usine | `PASSIVE` |
| Lessons → Builder | `IMPLEMENTED` |
| KB → Builder (2 jeux) | `TESTED` |
| KB → Builder (12 jeux) | `NOT_FOUND` |
| `proof_of_consumption` sur jeux Godot | `IMPLEMENTED` — verdict `NOT_WIRED` **honnête** |
| Détection du câblage sur runner partagé | `NOT_FOUND` |
| Isolation de la preuve | `TESTED` |
| Classe « émetteur injectable non exposé » | `BLOCKED` (confinement seul) |
| Observer (reconstruction) | `IMPLEMENTED` |
| Observer → validation du projet | `NOT_FOUND` |
| Observer → Décision | `NOT_FOUND` |
| Chaîne de décision V2 (4/5 étages) | `IMPLEMENTED` |
| `agent_factory` | `PASSIVE` |
| Décision → génome | `NOT_FOUND` |
| Lignée causale V2 | `UNKNOWN` (jamais observée en reçu réel) |
| `oracle_measures` | `PASSIVE` |
| `RUN_IDENTITY_V1` | `TESTED`, `NOT_WIRED` délibérément |
| `NATURE` | `UNKNOWN` |
| Sources `STUDIO_*_V0` (lane Forge) | `DOCUMENTED_ONLY` |
| Master Schema V1 | `DOCUMENTED_ONLY`, périmé sur C1-C3 |
| **Ce document** | **référence canonique**, ratifié Pierre 2026-08-19 |

---

## 18_EXECUTION_BACKLOG

Classé, **non exécuté**. Aucune de ces lignes n'autorise une action : elles attendent chacune
leur propre cadrage lecture seule.

| | Chantier | Pourquoi ce rang | Préalable mesuré |
|---|---|---|---|
| **P0** | **Détectabilité du câblage Godot** — faire partir `reuseRatioCable` du runner **déclaré** dans `oracles.json` au lieu d'un nom de fichier supposé | c'est le seul défaut où un câblage futur resterait invisible : la correction débloque la mesure elle-même | `oracles.json` porte **23 clés pour 26** répertoires `games/` — la couverture doit être mesurée AVANT de considérer la piste suffisante |
| **P1** | Étage ② du schéma V1 : **retour web ciblé du manquant** | seul maillon absent de la boucle, et il **est déjà au schéma** — le brancher n'ajoute pas de couche | la fouille tourne déjà (66 recherches, 9 depuis `s9-build`) |
| **P1** | Un run `full` pour **observer enfin la lignée causale** | dernier run avec étapes LLM : 2026-08-14 ; câblage : 2026-08-16 | rien à coder — il faut **exécuter**, pas implémenter |
| **P2** | `reuse_ratio` dans les **12 runners** qui ne l'invoquent pas | généralise une boucle déjà prouvée 2 fois | refs nommées obtenues sur `kb_tactics`, `shmup_slice` |
| **P2** | `agent_factory.mjs` — 24 010 octets, **0 appelant** | la chaîne de décision V2 casse à cet étage précis | vérifié tous canaux : les 15 correspondances sont docs et artefacts |
| **P3** | Dette documentaire « étape 1 / étape 2 » dans les contrats `s1`/`s2` | numérotation trompeuse depuis `d8a5464` | les **noms** restent inchangés (traces Observer, `state.json` archivés) |

**Retiré du backlog le 2026-08-19** : « ajouter `NOT_APPLICABLE` à `search_usage.mjs` ».
Falsifié par son propre cadrage — le module refuse ce quatrième état par écrit, et le verdict
Godot n'était pas faux. Voir C7.

```
software_verdict:  par surface uniquement — voir le tableau ci-dessus
evidence_verdict:  MECHANICAL_VALIDATION_ONLY
claim_verdict:     NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

# CARTE DE VÉRITÉ — lane FORGE

Ce document ne décide rien. Il dit **ce qui est**, et **ce qui n'a pas été mesuré**.

## DEUX ÉTATS, jamais confondus

Une carte de vérité qui décrit un état **qu'elle a elle-même modifié** est déjà fausse. Les deux
instants sont donc nommés séparément, et aucun des deux ne vaut pour l'autre.

```
FROZEN_STATE                       2026-08-19, AVANT écriture de cette carte
  HEAD              5ae67b0
  origin/master     bcde5cb
  avance            112 commits, 0 pousse
  index             vide
  arbre de travail  121 entrees  (31 modifiees, 90 non suivies)
  ^ TOUT le corps de ce document decrit CET etat, et lui seul.

TRUTH_MAP_WORKING_STATE            2026-08-19, APRES ecriture de cette carte
  HEAD              5ae67b0        inchange
  index             vide           inchange
  arbre de travail  122 entrees    +1 : ce fichier, non suivi
  ^ etat COURANT du poste. Il n'est decrit NULLE PART ci-dessous.
```

L'écart est d'exactement une entrée : ce fichier. Il est nommé pour que personne n'ait à le
déduire d'une soustraction — et pour que le prochain lecteur sache que le tableau de la §3
compte 121 lignes et non 122, **par construction**, pas par oubli.

## Vocabulaire de statut — sept valeurs, pas une de plus

| Statut | Signification EXACTE |
|---|---|
| `IMPLEMENTED` | le code existe et un consommateur l'appelle |
| `TESTED` | `IMPLEMENTED` + un test qui **échoue** si le comportement disparaît |
| `DOCUMENTED_ONLY` | décrit dans un document ; **aucun** code correspondant trouvé |
| `PASSIVE` | code présent et testé, mais **aucun consommateur** ou **aucune donnée d'entrée** |
| `BLOCKED` | ne peut pas avancer tant qu'une décision extérieure n'est pas prise |
| `NOT_FOUND` | référencé quelque part, **introuvable** dans le dépôt |
| `UNKNOWN` | **non mesuré dans cette passe** — ce n'est PAS « cassé », c'est « je ne sais pas » |

> `UNKNOWN` est la valeur honnête par défaut. Plusieurs fois dans l'historique récent, un statut a été
> affirmé depuis une lecture de surface au lieu d'une exécution. La carte préfère un trou déclaré
> à une case remplie par déduction.

### La dérive à empêcher

`UNKNOWN` **se dégrade avec le temps si personne ne le tient**. La pente est toujours la même :

```
UNKNOWN  =  non re-mesure dans cette passe
   |
   |  (personne ne le corrige, le temps passe)
   v
UNKNOWN  =  personne ne s'en plaint
   |
   v
UNKNOWN  =  probablement bon            <-- FAUX. Rien ne l'a jamais montre.
```

Un `UNKNOWN` ne devient `TESTED` **que par une exécution**, jamais par ancienneté ni par absence
d'incident. Toute lecture de cette carte qui traite une case `UNKNOWN` comme un feu vert la trahit.

---

## 1. Les 112 commits, regroupés en CAPACITÉS

Regroupement par **ce que la Forge sait faire après** qui ne se faisait pas avant — pas par fichier
touché. L'unité de progression est la capacité, pas le commit.

### C1 — Preuve produit Godot : le pixel et la solvabilité deviennent mesurables

**23 commits** · 08-16 → 08-19 · *la capacité dominante de la période*

| | |
|---|---|
| **FILES** | `standard_oracles.py`, `driver.py`, `oracle.py`, `gate.py`, `verdict.py`, `godot_oracle.mjs`, `solvability_godot.mjs`, `product_oracle_godot.py`, `oracles.json`, 4 × `game_contract.yaml` |
| **PROOF** | 13 runs `proof*` réels sur 4 jeux ; 32 volets exécutés en fenêtre GPU (31 OK, 1 NOT_MEASURED, 0 FAIL) ; sonde bout-en-bout bomberman_3d : `won 5/14`, graines perdantes `[1,2,4,7,8,9,10,11,13]` |
| **TEST** | 10 fichiers dédiés (`test_gpu_window_perimetre`, `test_profile_proof_only`, `test_volet_applicabilite_contexte`, `test_oracle_timeout_blocked`, `test_solvability_budget_audit`, `test_observable_coverage_measured`, `test_gate_coverage_violation`, `test_tetris_solvability_budget`, `test_bomberman_solvability_budget`, `test_solvability_measures_in_state`) + 5 jumeaux `.test.mjs` |
| **STATUS** | `TESTED` |

Sous-acquis, chacun fermé par une exécution réelle :

- la directive de mode GPU est **déclarée** par le volet, **vérifiée**, puis **consommée** par le driver ;
- un oracle **mort avant de conclure** rend `BLOCKED`, plus `FAIL` ;
- un budget de solvabilité s'arrête sur **son** budget avant que la limite en dur ne le tue ;
- la couverture observable distingue « non mesuré » de « mesuré et rouge », et une violation **démontrée** gate le pas ;
- les mesures (`trials`, `won`, `lost`, `failed_seeds`) atteignent le reçu du pas.

**Réserve mesurée** — `detail["oracle_measures"]` est **produit sans lecteur** → T2, `PASSIVE`.

### C2 — Lignées causales V2 : pourquoi une décision existe survit à l'agent qui l'a prise

**8 commits** · 08-14 → 08-16 · `de52fbe`, `82c8c99`, `cc155d7`, `8372f0d`, `5660462`, `7f07576`, `af5e699`, `dde64af`

| | |
|---|---|
| **FILES** | `driver.py`, `dispatch.py`, parseurs de flux, `lessons.jsonl` |
| **PROOF** | doctrine `FORGE_CAUSAL_LINEAGE_V2` ; mesuré avant le lot : `reason` vide 9/9, « pourquoi » absent de `final_report` 0/21 |
| **TEST** | tests de driver et de parsing de flux présents |
| **STATUS** | `UNKNOWN` — non re-mesuré dans cette passe ; une régression y a déjà été introduite puis corrigée (`8372f0d`) |

### C3 — Stations amont narratives : l'intention de projet devient source causale

**8 commits** · 08-14 → 08-15 · `948908a`, `afe2eb8`, `73ae154`, `11e70c3`, `91f3a12`, `83403e0`, `cd8f2b4`, `d8a5464`

| | |
|---|---|
| **FILES** | contrats `s2.6-story-bible`, `s2.7-gm-worldscan`, profils `amont_narratif` / `amont_narratif_charte`, matérialiseur YAML |
| **PROOF** | première preuve de **composition inter-stations** ; `charter.yaml` obtient un producteur (M4/M4') |
| **TEST** | présents, non ré-exécutés ici |
| **STATUS** | `UNKNOWN` |

### C4 — Plan de décision V2 : choisir sans LLM

**6 commits** · 08-04 → 08-05 · `d37f51b`, `d90ffc0`, `8812a0c`, `901d1b5`, `74f726e`, `50b9778`

| | |
|---|---|
| **FILES** | `candidate_selector.mjs`, `execution_binding.mjs`, `mcts_selector.mjs`, `agent_factory.mjs`, `execution_proof.mjs`, `search_usage.mjs`, `layers.json` |
| **PROOF** | 3 × `MATCH` d'`execution_proof` ; ouverture contrôlée de `--execute` sous 5 conditions |
| **TEST** | 1 jumeau `.test.mjs` par module (6/6) |
| **STATUS** | `UNKNOWN` — le post-mortem Pac-Man qualifiait cette chaîne d'« île » ; **non re-vérifié depuis** |

### C5 — Observer : charnière de transition inter-run

**7 commits** · 08-03 → 08-10 · `0502508`, `e4fa30b`, `d8b8b8c`, `4412592`, `ea0da43`, `1654dd1`, `314fe19`

| | |
|---|---|
| **FILES** | chaîne Observer, `pending_review.mjs`, `lab/reports/observer/` |
| **PROOF** | comparaison Master Schema ↔ réalité sur 6 axes ; une décision humaine a enfin un effet visible |
| **TEST** | 2 jumeaux `pending_review*.test.mjs` |
| **STATUS** | `IMPLEMENTED`, **avec défaut mesuré ce jour** → F1 |

### C6 — Registres et propositions

**6 commits** · `cb025dd`, `64b2a6b`, `74381b4`, `78bc320`, `9bb6241`, `b21d118`

| | |
|---|---|
| **FILES** | `capabilities.yaml`, `factory_capabilities.yaml`, `knowledge_base/proposals/`, résolution KB |
| **PROOF** | deux registres séparés, 7ᵉ file, réconciliation registre↔proposition ; les fiches **citées** par un contrat sont résolues et servies |
| **TEST** | présents |
| **STATUS** | `UNKNOWN` |

### C7 — Contrôle des spawns et héritage d'autorité

**3 commits** · `1ed09e6`, `6451b06`, `b51d667`

| | |
|---|---|
| **FILES** | hooks `PreToolUse` / `PostToolUse`, `lab/reports/spawn_classification.jsonl` |
| **PROOF** | `AUTHORITY(enfant) ⊆ AUTHORITY(parent)` au PreToolUse ; classificateur = **mesure pure, aucune juridiction** |
| **TEST** | tests de hooks présents |
| **STATUS** | `PASSIVE` — décision explicite : phase d'observation, B/C fermés **jusqu'à mesure sur population réelle**. Le journal `spawn_classification.jsonl` est **non suivi** |

### C8 — Profils et topologie de chaîne

**9 commits** · `336e5d1`, `988c423`, `ab45f03`, `b1f87c9`, `dd46d3d`, `b620816`, `77bbeb4`, `f035755`, `8c72e1a`

| | |
|---|---|
| **FILES** | `dispatch.py:PROFILES`, topologie `driver.py`, `verdict.py` |
| **PROOF** | profils `full_godot`, `standard_godot`, `proof_only` ; verdict de périmètre `PARTIAL` ; game-ness **signée**, plus inférée |
| **TEST** | `test_profile_proof_only`, 8 tests de périmètre `PARTIAL`, `dd46d3d` |
| **STATUS** | `TESTED` |

### C9 — Jeux produits

**8 commits** · `8d4da54` (Tetris) · `4f3d641` + `28b6d1f` (Bomberman 3D) · `c078a87`, `9469747` (gel Breakout V2) · `b22a980` (gel Pac-Man v5) · `7590051` + `04c14d9` (assets 3D)

| | |
|---|---|
| **FILES** | `games/tetris/`, `games/bomberman_3d/`, `games/breakout_v2/`, `games/pacman/` |
| **PROOF** | Tetris : 9 oracles, wiremap 12→22 ; Breakout V2 gelé comme **baseline de régression** |
| **TEST** | oracles par jeu, exécutés ce mois |
| **STATUS** | `IMPLEMENTED` — **Bomberman 3D porte un problème PRODUIT ouvert** → T1 |

### C10 — Auto-audit du studio

**5 commits** · `74d49cf`, `a67fb7c`, `111fa4b`, `b5e9c02`, `5190859`

| | |
|---|---|
| **FILES** | `studio_selfaudit.mjs`, `solvability_budget_audit.py` |
| **PROOF** | ponts Python **injectables** (rouge de 25 jours fermé) ; budgets déclarés jamais lus, signalés |
| **TEST** | 4 jumeaux `studio_selfaudit*.test.mjs` + `test_solvability_budget_audit` |
| **STATUS** | `TESTED` |

### C11 — Doctrine et documentation

**14 commits** · `7b9b170`, `9d71fa5`, `0d3fdc6`, `ade926a`, `bf6c64f`, `62fb44b`, `9de2f07`, `de7f455`, `feaf0df`, `d5b419e`, `e9e37a1`, `112d22f`, `b74107c`, `730cca7`

| | |
|---|---|
| **FILES** | `docs/forge/`, `studio_brain/` |
| **PROOF** | Prisme V2, `FORGE_STATE_V2_0`, grille A-E, « l'autonomie ne fabrique jamais une validation humaine » |
| **TEST** | sans objet |
| **STATUS** | `DOCUMENTED_ONLY` — par nature. **Exception** : `ADR-003`, cité par **10 commits** et hors du dépôt → F2, `UNKNOWN` (trou de traçabilité non tranché) |

### C12 — Réparation de boucles cassées

**7 commits** · `7d0c758`, `965a417`, `284df4c`, `3971b41`, `c061b26`, `4ab1b4c`, `ca71332`

| | |
|---|---|
| **FILES** | driver, `RUN_INDEX`, oracles de wiremap |
| **PROOF** | une wiremap vide cesse de passer **par vacuité** ; la troncature amont cesse de détruire le bloc JSON terminal |
| **TEST** | présents |
| **STATUS** | `UNKNOWN` |

### C13 — Archives et hygiène

**6 commits** · `0bb6389`, `d8f8143`, `a389c27`, `c049a71`, `a3b3c2d`, `c4c5159` — ChessTCG sorti vers `C:\STUDIO_ARCHIVE`, bundles de preuve entrés au dépôt. **STATUS** `IMPLEMENTED`.

---

## 2. Trois faits découverts pendant la remise à plat

### F1 — L'Observer fabrique un état pour n'importe quelle chaîne · défaut

`lab/reports/observer/` contient des répertoires dont le champ `project` vaut littéralement
`"jeu"`, `"nr"`, `"p"`, `"rouge"`, `"vert"` — des **fragments d'arguments CLI**, pas des projets.
Aucune validation d'existence du projet : un argument mal passé produit un état d'apparence légitime.

**Corrigé le 2026-08-19 — cette section affirmait six fantômes. La mesure en donne cinq, plus deux
cas qui ne sont pas ce qu'elle disait.**

Le discriminant n'est pas la forme du nom mais `adapters.forge_run.events == 0`. Sur les 28
répertoires observés il isole exactement 7 entrées, et les 21 autres ont toutes ≥ 3 :

```
jeu  nr  p  rouge  vert     forge_run=0   pas de run_dir   -> parasites, 5
probe2                      forge_run=0   pas de run_dir   -> parasite JAMAIS REPERE, 6e
repair_runtime_v1           forge_run=0   run_dir PRESENT  -> cas limite : le run existe,
                                                              son state.json n'existe pas
proj                        forge_run=0   pas de run_dir   -> PAS un parasite. Voir ci-dessous.
```

**`proj` n'est pas un fantôme.** Ses 1328 événements sont **réels**. `run_id = "proj-1"` est le
**deuxième identifiant le plus fréquent de tout le flux de preuve** — 1320 enregistrements dans
`lab/forge_evidence/*.jsonl`, derrière les seuls enregistrements sans identité. `proj` est un
**espace de noms de fixtures**, et `_belongs_to_project` l'a correctement rattaché par préfixe.
L'Observer a fait son travail ; c'est le flux qui mélange fixtures et runs réels.

**Le mécanisme du défaut n'est pas non plus celui décrit.** Les 8 événements constants que
récoltait n'importe quel nom viennent de `_collect_runtime_drift`
(`adapters/forge_evidence.py:351`), qui **ne filtre délibérément pas** par projet — sa docstring
l'explique : une dérive de déclaration est repo-wide, la filtrer la ferait disparaître de tous les
rapports. Le défaut n'est donc pas l'absence de garde : c'est qu'**un canal volontairement global
masque le silence d'un canal filtré**, et fait paraître productif un nom qui n'observe rien.

### F2 — `ADR-003` est cité par 10 commits et n'est pas dans le dépôt · `UNKNOWN`

`docs/adr/ADR-003-forge-workflow-coherence-audit.md` (17 654 octets) est **présent sur le poste,
non suivi par git**. Dix messages de commit disent « P0-1 … P0-5 ADR-003 ».

Ce n'est pas un fichier manquant, c'est un **trou de traçabilité** : une partie de l'historique
renvoie à une décision que le dépôt ne contient pas. Pour quiconque n'a pas ce poste, dix commits
citent une autorité inaccessible.

`NOT_FOUND` serait faux — le document existe. `UNKNOWN` est exact, et porte sur la **question non
tranchée**, pas sur le fichier :

- le contenu local est-il **la** décision citée, ou un brouillon postérieur qui a divergé ?
- si oui → `COMMIT`, la traçabilité se referme ;
- sinon → la référence doit être **explicitement déclarée historique**, et les dix commits assumés
  comme pointant vers une décision perdue.

Personne ne peut trancher cela par lecture du dépôt. Tant que ce n'est pas tranché, le statut reste
`UNKNOWN`, et la §3 le classe `COMMIT` **sous réserve de cet arbitrage**.

### F3 — Les 4 runs `proof5` qui fondent la décision E ne sont pas au dépôt · `UNKNOWN`

`bomberman_3d_proof5`, `breakout_v2_proof5`, `snake_proof5`, `tetris_proof5` : **0 fichier suivi sur 13** chacun.
Ce sont les runs de l'expérience différentielle qui a validé `ff8d1fb` (décision E).

```
proof_20260817   suivi      9/12
proof2           suivi      10/13   (breakout seul ; tetris et bomberman NON suivis)
proof3           suivi      10/13   les quatre jeux
proof4           suivi      10/13
proof5           NON SUIVI  0/13    les quatre jeux  <-- fonde la decision E
```

**La preuve la plus récente est la moins conservée.** Ce n'est pas un oubli isolé : c'est une
inversion de la pente attendue, et elle touche la doctrine.

> **Une décision ne doit pas dépendre d'une preuve qui ne survit pas à la session qui l'a produite.**

`ff8d1fb` est au dépôt. Ce qui l'a justifié n'y est pas. Pour un lecteur futur, la décision E est
une affirmation sans pièce jointe.

Le statut est `UNKNOWN` parce que la question ouverte n'est pas « faut-il committer ces quatre
runs ? » mais **« quelle est la politique de conservation des preuves de run ? »** — laquelle
n'existe nulle part, ce qui explique que `proof2` soit conservé pour un jeu sur quatre.

**Aucune suppression ni archivage autour de `proof*` avant que cette politique soit posée.**

---

## 3. Les 121 entrées de l'arbre de travail, classées

**Aucune suppression n'a été faite.** Ce tableau est une proposition de classement, pas une action.

| Classe | Nb | Entrées |
|---|---|---|
| `COMMIT` | **19** | `docs/adr/ADR-003-*.md` (F2) · 4 runs `*_proof5_20260818` (F3) · `tetris_proof2`, `bomberman_3d_proof2` · 10 `knowledge_base/proposals/forge.*.yaml` · `lab/reports/spawn_classification.jsonl` |
| `KEEP` | **31** | les 31 fichiers **modifiés** : sorties de runs (`lab/reports/`, `RUN_INDEX.md`, `learning_curve.jsonl`, `lessons.jsonl`, journaux d'erreur, état Observer) — régénérés à chaque exécution, à committer **avec** le run qui les produit, jamais seuls |
| `KEEP` | **3** | `studio_brain/journal/2026-08-06_*`, `2026-08-07_postmortem_pacman_forge.md`, `2026-08-07_revue_finale_forge_v3.md` — mémoire de session, destination correcte |
| `ARCHIVE` | **6** | `driver_smoke_v3/v4/v5` + `v6` ×3 — 127 fichiers, campagnes des 08-07/08 remplacées par les runs `proof*`. **Trois orthographes du même run** : `v6_20260808`, `v6_20260808-run2`, `v6_20260808_run2` |
| `ARCHIVE` | **13** | `lab/forge_evidence/` non suivis (`ORPHAN_GATE_SIM_V01..V04`, `MCTS_WORLDSCAN_QWEN`, `QWEN_AUDIT_REPLAY`, `DIVERGENCE_ORACLE_V1`, `OBSERVER_TAMPER_TEST_V1`, `BOMBERMAN_3D_L0`, `BOMBERMAN_3D_L1_L8`, `L0B_GPU_ROUTING`, `TETRIS_SOLVABILITY_N`, `bomberman_3d_p10`) — 13 Mo de preuves de sondes closes |
| `DELETE` | **6** | `lab/reports/observer/{jeu,nr,p,rouge,vert}` + `probe2` — état fabriqué par un argument CLI mal passé (F1). **Composition corrigée le 2026-08-19** : `proj` en sort (ses événements sont réels), `probe2` y entre (détecté par le discriminant). **SÉQUENCÉ APRÈS T4**, voir l'encadré ci-dessous |
| `UNKNOWN` | **1** | `lab/reports/observer/proj` — espace de noms de **fixtures**, 1328 événements réels ; sa conservation dépend de la décision fixture/réel, pas d'un nettoyage. *(`repair_runtime_v1`, autre entrée à `forge_run = 0`, est **suivi par git** — il ne relève pas de ce tableau ; voir F1.)* |
| `IGNORE` | **3** | `.playwright-mcp/` · 2 × `*.jsonl.bak` — sorties d'outil, à ajouter au `.gitignore` |
| `UNKNOWN` | **13** | 12 `lab/forge_runs/` de sondes (`amont-narratif`, `charte2`, `charte_probe`, `charte_probe2`, `gmws_probe`, `story_probe`, `m3_e2e`, `p1-*`, `p2a_return_snapshot`, `pacman-*`, `postool-agent-proof`) · `scripts/forge/context/*.manifest.jsonl` — **du code lit-il ces manifestes ?** non mesuré |
| `UNKNOWN` | **2** | `games/pacman/00_CHARTER/`, `games/pacman/09_WIREMAP/` — Pac-Man est **gelé** (`b22a980`) ; un charter non suivi postérieur au gel n'a pas de statut clair |
| `PASSIVE` | **2** | `scripts/forge/anonymize_session_paths.py` + son test — 11 tests verts, **jamais appliqué**, périmètre 122 occurrences sur 16 096 |

Volume : `lab/forge_runs` 121 Mo · `lab/reports/observer` 101 Mo · `lab/forge_evidence` 13 Mo.

### Les 6 `DELETE` ne se suppriment pas à la main

Supprimer seul serait du **nettoyage symptomatique** — la boucle se referme sur elle-même :

```
Observer accepte un argument invalide
        v
cree un etat parasite
        v
on supprime le parasite
        v
Observer le recree au prochain argument mal passe     ---> retour a la case depart
```

L'ordre est contraint, et l'étape 5 **ne peut pas** précéder l'étape 4 :

```
1. T4  validation du nom de projet          ecrire la regle
2.     test                                 qui ECHOUE sans la regle
3.     correction de l'Observer             la regle devient effective
4.     revalidation                         un argument invalide est REFUSE, prouve
5.     nettoyage des 6 artefacts            seulement maintenant : ils ne peuvent plus revenir
```

Tant que 1-4 ne sont pas faits, `jeu`, `nr`, `p`, `rouge`, `vert` et `probe2` sont **la seule
trace observable du défaut**.
Les effacer ferait disparaître la preuve avant la cause.

> **Mise à jour du 2026-08-19 — l'étape 1 est `BLOCKED`.** Le cadrage de T4 a montré qu'aucune
> source canonique de projets n'existe : les deux candidates rejettent 21 des 28 projets réellement
> observés, dont l'auto-test de l'Observer. La chaîne entière est donc à l'arrêt, et les six
> répertoires **restent en place**, indéfiniment s'il le faut. Ils ne coûtent rien ; les supprimer
> coûterait la preuve.
>
> **Composition révisée le 2026-08-19** : `proj` en sort — ses 1328 événements sont réels — et
> `probe2` y entre. Le nombre est inchangé, l'ensemble non. Une suppression décidée sur l'ancienne
> liste aurait effacé un espace de noms de fixtures **et** laissé un parasite en place.

---

## 4. Fils ouverts — CAUSE → ACTION → PREUVE → NEXT

### T1 — Bomberman 3D gagne 5 fois sur 14

- **CAUSE** — problème **PRODUIT**, pas outillage : le bot ne remplit son critère de victoire par élimination active que ~35 % du temps.
- **ACTION** — décider si le critère est trop fort ou le bot trop faible. Question de **conception**, pas d'oracle.
- **PREUVE** — `won 5/14`, `failed_seeds [1,2,4,7,8,9,10,11,13]`, reçu structuré dans `state.json` depuis `5ae67b0`.
- **NEXT** — `BLOCKED` sur arbitrage Pierre.

### T2 — `oracle_measures` est un producteur sans lecteur

- **CAUSE** — `5ae67b0` a livré le transport ; aucun consommateur n'a été écrit, **volontairement** (lot distinct).
- **ACTION** — donner un lecteur : rapport de run, gate, ou journal de leçons.
- **PREUVE** — `detail["oracle_measures"]` présent dans le `state.json` d'un run réel.
- **NEXT** — **capacité candidate**, la plus mûre du lot.

### T3 — `ADR-003` : trou de traçabilité (F2) · `UNKNOWN`

- **CAUSE** — jamais ajouté à l'index ; 10 commits le citent. Le document **existe** localement.
- **ACTION** — établir si le contenu local **est** la décision citée ou un brouillon divergent. Puis, selon le cas : `COMMIT`, ou déclarer la référence **explicitement historique**.
- **PREUVE** — `git ls-files` vide, fichier présent, 17 654 octets, 10 commits citants.
- **NEXT** — arbitrage. **Pas trivial** : ce n'est pas un `git add`, c'est une question sur ce que dix commits affirment.

### T4 — L'Observer accepte n'importe quel nom de projet (F1) · `BLOCKED`

**Cadré le 2026-08-19. La formulation initiale de ce fil était fausse, et la mesure l'a montrée.**

Ce document proposait d'abord « valider le projet contre `games/` ». Mesuré sur les 28 projets
réellement observés dans `lab/reports/observer/` :

```
source candidate      survivants / 28
games/  (26 entrees)        7
oracles.json (23 cles)      6
```

**21 des 28 seraient rejetés** — dont `_selftest`, c'est-à-dire **l'auto-test de l'Observer
lui-même**, et les quatre campagnes `driver_smoke_v3..v6`. Les deux candidats sont par ailleurs
en désaccord entre eux : 10 entrées dans `games/` seulement, 7 dans `oracles.json` seulement
(`forge`, `rocky`, `ml`, `llm-lego` sont des **lanes**, pas des jeux).

- **CAUSE RÉELLE** — `--project` n'a **pas de sémantique déclarée**. Il sert simultanément de nom
  de jeu (`tetris`), d'identifiant de campagne (`driver_smoke_v6_20260808`), d'étiquette de sonde
  (`story_probe`, `p1_worldscan_injection`) et de nom d'auto-test (`_selftest`) — avec en plus un
  **défaut silencieux** (`cli.py:184`, `default="breakout_v2"`) qui fait écrire dans un projet réel
  quand l'argument est omis. Aucune liste blanche ne peut distinguer une sonde légitime
  (`story_probe`, `gmws_probe`) d'un parasite (`probe2`) : ils ont exactement la même forme.

  > **Corrigé le 2026-08-19.** Cette ligne donnait `probe2` pour légitime et `proj` pour parasite.
  > C'est l'inverse — mesuré : `probe2` a `forge_run = 0` et aucun `run_dir` ; `proj` porte 1328
  > événements réels issus de `run_id = "proj-1"`. L'erreur venait de la forme du nom, exactement
  > le raisonnement que ce fil interdit.
- **ACTION** — **ne pas inventer de liste dans l'Observer.** Ce serait déplacer le problème et
  casser son propre auto-test. Le préalable est de décider **ce que `--project` désigne**.
- **PREUVE** — tableau ci-dessus, 28 projets confrontés aux deux sources candidates.
- **NEXT** — `BLOCKED` sur une décision de sémantique, pas sur du code.

### T10 — Le nom de projet traverse le système de fichiers sans contrainte · `TESTED` — **FERMÉ `6d2c094`**

Découvert en cadrant T4, fermé le 2026-08-19. **Indépendant de T4** : s'est fermé sans connaître la liste des projets.

- **CAUSE** — `cli.py` concaténait `args.project` dans un chemin sans normalisation. L'Observer confinait déjà ce qu'il **lit** (`ObserverContext._check` → `BlindnessViolation`) sans confiner ce qu'il **écrit**.
- **ACTION** — `OutputScopeViolation` + `resolve_output_dir` dans `sources.py`, appelés par `cli.py` **avant** la reconstruction (le contrôle vivait implicitement au `mkdir`, en fin de `main`). Sortie 2, message nommant projet, chemin résolu et racine.
- **PREUVE** — 24 tests, falsifiés à la collecte sur `5ae67b0` ; équivalence de chemin 0 écart / 9 noms ; run réel `--project pong` exit 0 ; validation prospective sur `HEAD + index` 73 verts, chaîne `driver`→Observer comprise.
- **NEXT** — clos. **N'a pas fermé F1**, et deux tests le verrouillent : les noms parasites passent ce contrôle et **doivent** continuer à le passer.
- **DETTE DOCUMENTAIRE** — la docstring de `test_output_confinement.py` décrit les six noms
  paramétrés comme « des fragments d'arguments CLI qui ont produit de l'état parasite ». Vrai pour
  cinq, **faux pour `proj`** (F1 corrigé). Le test lui-même reste juste — `proj` passe bien le
  contrôle de confinement — seule sa justification est périmée. Correction en attente de GO :
  `scripts/observer/tests/` est une zone protégée.

### T9 — Politique de conservation des preuves de run (F3) · `UNKNOWN`

- **CAUSE** — aucune politique n'existe. Conséquence mesurée : `proof3` conservé pour 4 jeux, `proof2` pour 1 seul, `proof5` pour aucun — alors que `proof5` fonde `ff8d1fb`.
- **ACTION** — poser la règle : **qu'est-ce qu'un run doit laisser au dépôt pour qu'une décision qu'il fonde reste vérifiable ?**
- **PREUVE** — tableau de conservation en F3 ; 121 Mo dans `lab/forge_runs`, 13 sur 23 runs `proof*`/`smoke` non suivis.
- **NEXT** — **gèle les classes `ARCHIVE` de la §3.** Aucun archivage ni suppression autour de `proof*` avant que la règle existe.

### T5 — Budgets de mutation `A_CALIBRER` pour Tetris et Bomberman

- **CAUSE** — descripteurs instruits, valeurs jamais mesurées.
- **ACTION** — mesurer, puis inscrire.
- **PREUVE** — descripteurs présents.
- **NEXT** — `PASSIVE` jusqu'à décision.

### T6 — 3ᵉ rouge de référence `test_full_profile_is_untouched_by_the_standard_addition`

- **CAUSE** — `s2-worldscan` vs `s1-prisme` : le test fige une topologie que `d8a5464` a inversée.
- **ACTION** — décider laquelle des deux fait foi.
- **PREUVE** — rouge à `HEAD`, antérieur à cette session.
- **NEXT** — `BLOCKED` sur décision de topologie.

### T7 — 4 directives inertes de `e02b010`

- **CAUSE** — volets déclarant `requires_gpu_window` sans consommateur au moment du commit.
- **ACTION** — vérifier si `80f91cb` (câblage driver) les a rendues actives.
- **PREUVE** — non mesurée.
- **NEXT** — `UNKNOWN`.

### T8 — Publication

- **CAUSE** — pousser publie 112 commits, dont 43 fichiers portant **16 096 références** à `C:\Users\Studio-Dev\.claude\projects\`. L'exclusion par chemin est impossible : git publie des **commits**.
- **ACTION** — aucune. Décision de périmètre différée par Pierre.
- **PREUVE** — 16 096 occurrences comptées ; outil d'anonymisation écrit, périmètre 122/16 096, **jamais appliqué**.
- **NEXT** — `BLOCKED`, hors de cette remise à plat.

---

## 5. Statut par surface — vue courte

Ratifié Pierre 2026-08-19. C'est la table à lire en premier ; le corps du document la justifie.

| Surface | Statut | Ce que cela veut dire ici |
|---|---|---|
| `godot_oracle` / résumé structuré | `IMPLEMENTED` | émet `FORGE_ORACLE_SUMMARY`, consommé |
| Transport des mesures jusqu'au run Forge | `TESTED` | 9 tests + sonde réelle bomberman_3d |
| Cette carte de vérité | `DOCUMENTED_ONLY` | **non suivie par git, non ratifiée comme référence** |
| Sémantique de `--project` (Observer) | `BLOCKED` | aucune source canonique ; les 2 candidates rejettent 21/28 projets réels, dont l'auto-test (T4) |
| Confinement du chemin de sortie Observer | `TESTED` | fermé par `6d2c094` — 24 tests, run réel, validation prospective (T10) |
| Conservation des `proof5` | `UNKNOWN` | aucune politique n'existe (T9) |
| `ADR-003` | `UNKNOWN` | trou de traçabilité non tranché (T3) |
| Publication | `BLOCKED` | 16 096 chemins personnels, décision différée |
| Critère de victoire Bomberman | `BLOCKED` | 5/14, arbitrage produit |
| Topologie `s2-worldscan` ↔ `s1-prisme` | `BLOCKED` | rouge de référence, décision de topologie |

Quatre `BLOCKED` attendent une décision humaine, trois `UNKNOWN` attendent une règle qui n'existe
pas encore. **Plus aucune surface n'est `NOT_FOUND`** : la seule qui l'était, T10, est fermée par
`6d2c094` — c'était précisément la seule qui ne dépendait d'aucune décision préalable.

Ce qui reste ne se débloque pas par du code. Trois règles manquent (sémantique de `--project`,
politique de conservation des preuves, statut d'`ADR-003`) et trois arbitrages produit attendent.
Écrire davantage de code sans elles ne ferait que déplacer les défauts vers des axes non mesurés.

---

## 6. Ce que cette carte ne dit pas

- Les statuts `UNKNOWN` (C2, C3, C4, C6, C12) signifient **non re-mesuré dans cette passe**. Aucune
  conclusion négative ne doit en être tirée. Les re-mesurer coûterait une session, et le faire sans
  changement de surface contredirait la règle « une preuve établie n'est pas redémontrée ».
- Le regroupement en capacités est une **lecture** de 112 messages de commit — une classification
  analytique, **pas une mesure**. Il n'a pas été validé capacité par capacité par exécution.
- **Cette carte n'est pas la carte de référence du chantier.** Elle est `DOCUMENTED_ONLY` et non
  suivie par git. Elle ne le devient que si Pierre la ratifie comme telle ; jusque-là c'est un
  inventaire daté, et rien d'autre ne doit s'y adosser.
- Aucune suite complète n'a été exécutée pour la produire. La suite `pytest` lancée pendant la
  rédaction a été **arrêtée à 10 minutes** : attendre plus longtemps n'aurait produit aucune
  connaissance que cette carte utilise. La colonne TEST recense des **fichiers de test existants**
  (160 Python, 43 jumeaux Node), pas un résultat d'exécution globale.

```
software_verdict: OK — inventaire et classement uniquement, aucune modification de code
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
NO_GLOBAL_READY_VERDICT: true
```

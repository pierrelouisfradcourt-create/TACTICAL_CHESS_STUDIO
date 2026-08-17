# BOMBERMAN 3D — L0 : contrat de jeu + charter de production

> **Session** : Opus 5, 2026-08-10. **Statut** : PROPOSED — non ratifié.
> **claim_verdict** : NO_CLAIM_ALLOWED · **evidence_verdict** : MECHANICAL_VALIDATION_ONLY.
> **Aucun fichier sous `games/bomberman_3d/`.** Le contrat candidat vit hors du jeu, à
> `lab/forge_evidence/BOMBERMAN_3D_L0_20260810/game_contract.PROPOSED.yaml`.
> Amont : `BOMBERMAN_3D_CAMPAIGN_PREP.md` (spec produit, audit, architecture).
>
> **MISE À JOUR 2026-08-16 — la ligne ci-dessus était vraie le 2026-08-10, elle ne l'est
> plus.** La fixture existe : `games/bomberman_3d/` porte 88 fichiers versionnés (809 Ko ;
> 166 caches d'import Godot restent ignorés). Elle est commitée le 2026-08-16 pour cesser
> de ne vivre que sur un disque. Son état mesuré à cette date, contre les registres du
> dépôt : `check_index` OK · `check_line_states` OK (60 lignes de WireMap) ·
> `check_collisions` OK · `check_gpu_window_directive` **BLOCKED** (`core_audio.gd`
> déclare l'exigence GPU en prose sans la directive structurée ; 2 volets sur 4 la portent).
> Ce rouge est CONSERVÉ tel quel : la fixture sert de cas de falsification, la réparer
> détruirait ce qu'elle mesure. Statut inchangé : **PROPOSED, non ratifié** — commiter
> n'est pas ratifier. Doctrine maintenue : fixture de falsification, **jamais reforgée**.

Chaque affirmation porte sa classe : `IMPLEMENTED` · `TESTED` · `DOCUMENTED_ONLY` ·
`PASSIVE` · `BLOCKED` · `NOT_FOUND` · `UNKNOWN`.

---

## GAME_CONTRACT

### identity — `DOCUMENTED_ONLY`
**Arena battler à réaction en chaîne, sur grille, en 3D.** Lignée Super Bomberman R 2, pas
Bomberman 1985. La 3D sert la lisibilité de la grille, jamais la simulation. Le plaisir
signature est la **chaîne** ; la mort doit toujours être explicable une seconde avant.

### curriculum_node — `DOCUMENTED_ONLY`
`node: 5`. Suite mécanique réelle Pong=1 · Snake=2 · Breakout_v2=3 · Tetris=4 (lue dans
les `game_contract.yaml`, pas dans `CURRICULUM_JEUX_v1.md` qui diverge). Ratifié F.1.

### win_condition — `DOCUMENTED_ONLY`
Deux `VictoryDefinition`, nommées, jamais une théorie abstraite :

| id | mode | victoire | défaite | nul |
|---|---|---|---|---|
| `LAST_STANDING` | versus | un seul acteur vivant | mort de l'acteur joueur | 0 vivant simultané, ou `duree_max` dépassée |
| `CLEAR_ALL_BOTS` | solo | tous les bots morts | mort du joueur | `duree_max` dépassée |

### loss_condition — `DOCUMENTED_ONLY`
La mort est une **conséquence d'état**, jamais un compteur : un acteur meurt s'il occupe
une case létale à la fin d'un tick. Statut de partie ∈ `{EN_COURS, GAGNE, PERDU, NUL}`,
énumération gelée, jamais indéfini (exigence `core.end_condition`).

### player_objective — `DOCUMENTED_ONLY`
Ouvrir l'arène en détruisant des blocs, ramasser les power-ups révélés, et piéger les
adversaires par le placement et le timing des bombes.

**Minimum pour dire « ceci est réellement un Bomberman 3D jouable »** — réponse à la
question L0, six conditions simultanées, pas quatre :
1. je me déplace sur une grille visible en 3D ;
2. je pose une bombe qui me menace d'abord moi-même ;
3. elle explose en croix, s'arrête sur l'indestructible, détruit exactement un
   destructible par bras ;
4. une bombe touchée par une flamme explose **dans le même tick** (la chaîne) ;
5. un power-up révélé change une de mes capacités de façon observable ;
6. la partie se termine par une règle de victoire et je peux en relancer une propre.

Retirer (4) donne un jeu de pose de bombes, pas un Bomberman.

### map_model — `DOCUMENTED_ONLY`
Réponse à la question L0 : **oui, `MapData → validation → runtime`, et jamais
`éditeur → code spécifique`.** L'éditeur ne produit pas de comportement, il produit
une donnée, qui n'entre en jeu qu'après verdict.

```
MapDefinition ─▶ map_schema (légende fermée) ─▶ map_validator ─▶ carte validée … ou RIEN
                                                      │
                                              motifs de refus nommés
```

```
MapDefinition
 ├── id · nom · schema_version
 ├── dimensions (largeur, hauteur)
 ├── plan[]            lignes de symboles, rectangulaire, bord toujours SOLIDE
 ├── spawn_points[]    ≥ nb_acteurs, deux à deux non adjacents
 ├── powerup_rules     {id → poids} + densité, tirage SEEDÉ
 ├── victory_rule      id de VictoryDefinition
 └── metadata          origine ∈ {builtin, user}
```

`hazards` **volontairement absent** : aucun aléa de terrain dans le slice, et une clé sans
lecteur est une promesse non tenue. Elle s'ajoutera avec son premier consommateur.

Vocabulaire fermé des cases — trois types, pas plus :

| Symbole | Type | Franchissable | Arrête la flamme | Destructible |
|---|---|---|---|---|
| `#` | `SOLIDE` | non | oui | non |
| `+` | `DESTRUCTIBLE` | non | oui (en étant détruit) | oui |
| `.` | `SOL` | oui | non | — |
| `S` | `SOL` + spawn | oui | non | — |

Un symbole hors table est **refusé avec son motif**, jamais deviné.

### destruction_model — `DOCUMENTED_ONLY`
Réponse détaillée à la question L0 :

- **Grille** : `largeur × hauteur` cellules entières, bord entièrement `SOLIDE`.
- **Cellule** : un type + au plus une bombe + au plus un power-up + une durée de létalité
  résiduelle.
- **Bombe** : `{proprietaire, cellule, meche_restante, rayon, drapeaux}`. Pose autorisée si
  `bombes_posees < abilities.bombes_max` et la case ne porte pas déjà une bombe. Une bombe
  est un obstacle pour tous **sauf** son poseur tant qu'il n'a pas quitté la case, et sauf
  `BOMB_PASS`.
- **Propagation** : quatre bras depuis le centre, longueur `rayon`. Un bras **s'arrête** sur
  `SOLIDE`. Un bras **détruit exactement un** `DESTRUCTIBLE` puis s'arrête — sauf `PIERCE`,
  qui traverse.
- **Blocage** : le blocage est une propriété du **type de case**, jamais du contenu ; une
  bombe n'arrête pas une flamme, elle la propage.
- **Chaîne** : une bombe atteinte par une flamme explose **dans le même tick**. Résolution
  **en file, jusqu'à point fixe**, dans un ordre déclaré (ordre de pose croissant). C'est le
  point technique le plus délicat du jeu : il a sa propre ligne de WireMap et son propre
  volet d'oracle, et l'oracle doit prouver que le résultat est **indépendant de l'ordre
  d'insertion**.
- **Létalité** : les cases touchées deviennent létales pendant `DUREE_FLAMME` ticks.
- **Power-up révélé** : la destruction d'un `DESTRUCTIBLE` consulte `powerup_rules` avec le
  RNG seedé de la partie ; le power-up apparaît sur la case libérée.

### powerup_model — `DOCUMENTED_ONLY`
Contrat data-driven minimal, trois pièces, sans liste inventée :

```
PowerUpDefinition (donnée)  ─▶  application  ─▶  PlayerAbilities (bloc de stats)
```

Le contrat doit supporter **deux natures d'effet, et seulement deux dans le slice** :

| nature | effet | exemples | coût |
|---|---|---|---|
| **modificateur borné** | `stat += 1`, plafonnée | `BOMB_UP` (nombre), `FIRE_UP` (portée), `SPEED_UP` (vitesse) | nul — un entier dans un bloc |
| **drapeau de capacité** | booléen lu par un système existant | `PIERCE`, `BOMB_PASS` | faible — un `if` dans un système déjà écrit |

Extension prouvée par construction : ajouter un power-up de l'une de ces deux natures doit
être une **opération de donnée**, vérifiée par un test qui n'ajoute aucun fichier de système
(critère de fin du lot L7).

**Hors contrat minimal, et dit explicitement** : `KICK` et `PUNCH` ne sont ni des
modificateurs ni des drapeaux — ils rendent la bombe **mobile**, c'est-à-dire une nouvelle
nature d'objet (état en transit, collision, règle d'atterrissage). Ils ne sont pas dans le
contrat minimal ; ils constituent le lot L12, dont le rôle est précisément de prouver que
l'architecture accepte une nature nouvelle sans réécriture.

### runtime_model — `DOCUMENTED_ONLY`
```
DONNÉE ─▶ RÈGLES (RefCounted pur, headless) ─▶ ÉVÉNEMENTS ─▶ PRÉSENTATION 3D (Godot)
                    ▲
              intention entière (input_adapter)
```

Contrat de tick : `step(state, intents, seed) -> {state, events}` — même état + mêmes
intentions + même graine ⇒ même état suivant sur N ticks.

**Décision structurante** : le déplacement fluide se code en **sous-pas entiers**
(`PAS_PAR_CASE` sous-pas, N ticks par sous-pas ; `SPEED_UP` diminue N). Mouvement
visuellement continu **sans jamais introduire un flottant dans les règles** — donc sans
perdre déterminisme, mutation ni solvabilité.

**Modes** — réponse à la question L0 : la logique commune vit dans les systèmes ; la règle
de mode vit **uniquement** dans `victory/` et dans la `MapDefinition` qui nomme sa
`victory_rule`. Aucun système du noyau ne connaît le nom d'un mode. Un mode nouveau est une
`VictoryDefinition` de plus, pas une branche dans `game_loop`.

Trois interdits structurels, vérifiables : aucun fichier de `05_SYSTEMS/` n'hérite de
`Node`, ne lit `delta`, ni n'utilise d'aléa non seedé · aucun fichier de `06_RUNTIME/`
n'implémente une règle · `game_loop` **ordonne** et n'implémente rien.

### render_proof — `IMPLEMENTED` (chaîne) / `UNKNOWN` (sur scène 3D)
`core.render`, `proof_kind: pixel`, exigence **dure** (F.2). `observable_by_player` reste
`true` — il n'est pas question de la contourner.

Chaîne disponible depuis L0b, `TESTED` sur un cas réel : directive statique
`# forge:run_mode = gpu_window` dans le volet → collecteur → fenêtre GPU hors écran →
capture → verdict. Preuve : `snake/core_render_frame → OK (mode_execution: gpu_window)`,
`lab/forge_evidence/L0B_GPU_ROUTING_20260810/`.

Assertions mécaniques exigées pour Bomberman (non-LLM, sans juge sémantique) :
1. image non nulle, dimensions attendues, **non monochrome** ;
2. deux captures à ticks déclarés **diffèrent** ;
3. la **région projetée** d'une case destructible **change** au tick de sa destruction, et
   **ne change pas** aux ticks où rien ne s'y passe (la double assertion évite le vert par
   bruit) ;
4. la région projetée d'un acteur change quand il se déplace ;
5. les 4 bras de la croix changent au tick d'explosion.

**Contrainte d'architecture qui en découle, posée maintenant** : `presentation_3d` doit
exposer la projection `cellule → région d'écran` comme **fonction pure interrogeable**,
sinon l'oracle devinerait où regarder.

`UNKNOWN` assumé : la capture n'a jamais été mesurée sur une scène `Node3D` (le volet prouvé
rend du 2D `ColorRect`). Premier point à lever au lot L8.

### solvability — `DOCUMENTED_ONLY`
`solvability.gd` à la racine, protocole `FORGE_TRIAL` (patron `pacman/solvability.gd`), la
graine sélectionne la carte quand il y en aura plusieurs.

**Clause anti-tautologie propre à ce jeu** : un bot qui ne pose jamais de bombe survit très
bien et peut « gagner » un `LAST_STANDING` par élimination mutuelle des autres. Le critère
exige donc une **victoire par élimination active** — au moins une mort adverse attribuée à
une bombe du bot testeur. Sans cette clause on prouve la survie, pas la jouabilité (mode de
panne déjà constaté sur `survival_arena` et `collect_runner`).

### assets — `DOCUMENTED_ONLY`
`plan: cc0`. Slice rendu par primitives moteur (`BoxMesh` + `StandardMaterial3D` +
`Camera3D` + `DirectionalLight3D`, patron `chess_tcg/ui/game3d.gd` `[LU]`). Les 7 props 3D
du catalogue sont **ratifiés comme ressources disponibles** (F.4) et consommés **à partir du
lot L8** ; aucune génération d'asset nouvelle n'est prévue.

### reusable_capabilities — voir §REUSE

---

## Validation mécanique du contrat — `TESTED`

```
check_contract_completeness: {"passed": true, "violations": []}
check_budget               : {"passed": true, "empilement_violee": false,
                              "reuses_invalides": [], "hors_budget": [],
                              "promis_non_depose": [], "chevauchement": []}

CONTRE-ÉPREUVE — declarer sys-grid-nav-m01 (tier candidate) dans reuses :
check_budget               : {"passed": false, "reuses_invalides": ["sys-grid-nav-m01"]}
```

La contre-épreuve est le point important : `reuses: []` n'est **pas un choix**, c'est une
contrainte mécanique. Voir RISQUE 1.

---

## CHARTER

Lots courts, chacun avec sa preuve. Un lot ne s'ouvre pas tant que la preuve du précédent
n'est pas verte, ou `NOT_MEASURED` explicitement motivée.

| Lot | Contenu | Preuve de fin |
|---|---|---|
| **L1** — squelette prouvable | `params`, `game_state`, `game_loop` (ordonnance vide), `tests/run_tests.gd` avec `EXPECTED_ASSERTS`, `project.godot`, `main.tscn` | test de déterminisme vert ; le harnais échoue si un cœur ne compile pas |
| **L2** — carte donnée | `map_schema`, `map_validator`, 1 `level`, `content_provider` | ≥1 test par motif de refus ; la carte livrée passe le verdict |
| **L3** — acteur | `actors`, `movement_rules`, `input_adapter` | intention ⇒ déplacement observable ; collisions SOLIDE/DESTRUCTIBLE |
| **L4** — cœur du jeu | `bombs`, `explosion`, `hazard_field`, `damage` | **chaîne** : k bombes ⇒ même tick, résultat indépendant de l'ordre d'insertion ; destruction ; mort |
| **L5** — partie | `victory`, `game_events`, écran de résultat, relance | fin de partie atteinte ; relance ⇒ état identique au premier démarrage |
| **L6** — bots | `bot_policy`, `solvability.gd` | **victoire par élimination active**, ≥ N graines |
| **L7** — power-ups | `powerups` + 3 définitions de stat | ajouter un 4ᵉ power-up = **donnée seule**, prouvé par un test n'ajoutant aucun fichier de système |
| **L8** — 3D + preuve pixel | `presentation_3d`, caméra, lumière, `hud`, projection pure `cellule → région`, volet `core_render_frame` portant `# forge:run_mode = gpu_window` | les 5 assertions pixel de `render_proof` ; **c'est ici que `UNKNOWN` sur scène 3D est levé** ; consommation des `.glb` autorisée |
| **L9** — durcissement | mutation sur les fichiers logiques déclarés par la WireMap | `check_mutation_gate` vert, ou survivants triés avec justification |
| **L10** — verdict | WireMap gelée, oracles, agrégat signé | `verify_run` exit 0 · HumanGate |
| — **fin du vertical slice** — | | |
| **L11** | `PIERCE`, `BOMB_PASS` | extensibilité **à coût de drapeau** |
| **L12** | `KICK` (bombe mobile) | extensibilité **à coût de nature nouvelle** |
| **L13** | `map_editor_model` (logique pure) | tests headless : redimensionner sans perdre de spawn, annuler, refuser une carte invalide |
| **L14** | `map_editor_view` + `persistence` | une carte créée à la main est jouée par le runtime **sans conversion** |
| **L15** | mode solo, cartes multiples, progression | solvabilité **par carte** (la graine sélectionne la carte) |

**Ordre non négociable : L4 avant L8.** Faire la 3D avant la chaîne d'explosion produirait
un jeu joli et faux — l'incident `shmup_slice` pris par l'autre bout.

---

## REUSE

Règle appliquée : une capacité n'est **réutilisée** que s'il existe un **fichier
consommateur réel + une preuve de consommation**. Un patron conceptuel n'est pas du code
réutilisé. Un fichier existant sans consommateur n'est pas une réutilisation.

### reused_code — **0 à ce jour**, 1 candidat bloqué
| Candidat | Classe | État |
|---|---|---|
| `sys-grid-nav-m01` (`knowledge_base/systems/navigation/grid_nav.gd`) | `BLOCKED` | Code lu `[LU]` : `next_step(from, to, walls) -> Vector2i`, `path_length -> int`, `walls` = Dictionary **creux**, ordre de voisinage fixe, borne `MAX_CELLS_EXPLORED = 10000`. Deux réserves nommées : (a) reconstruire `walls` à chaque requête coûte O(W·H) par bot et par tick sur une grille qui change à chaque explosion ; (b) le BFS est statique — la peur du danger s'exprime en **injectant les cases létales dans `walls`**, ce qui marche mais n'est pas ce que le catalogue promet. **Bloqué mécaniquement** : tier `candidate`, et `check_budget` exige `validated` (contre-épreuve ci-dessus). |

### reused_patterns — 6, tous `DOCUMENTED_ONLY` jusqu'à consommation prouvée
| Patron | Source `[LU]` | Ce qui se transmet |
|---|---|---|
| tick pur | `tetris/05_SYSTEMS/game_loop/loop.gd` | `step(state, intent) -> {state, events}`, clone d'abord, ordre canonique déclaré, zéro règle dans la boucle |
| état observable | `tetris/05_SYSTEMS/game_state/state.gd` | `RefCounted`, statuts en `enum` gelé, `initial(seed)` |
| carte donnée | `pacman/05_SYSTEMS/map_schema/map_schema.gd` | légende **fermée**, `CHAMPS_OBLIGATOIRES`, `symboles_inconnus()`, plan → table de types |
| verdict de carte | `pacman/05_SYSTEMS/map_validator/map_validator.gd` | structurel **puis** topologique, motifs en vocabulaire fermé, `carte_validee()` = « validée ou rien » |
| harnais headless | `tetris/tests/run_tests.gd` | `SceneTree` + `ok`/`eq` + garde anti-faux-vert `EXPECTED_ASSERTS` |
| présentation 3D sur grille | `chess_tcg/ui/game3d.gd` (605 l.) | `Node3D`, `TILE := 1.0`, `BoxMesh`/`StandardMaterial3D`/`Camera3D`/`DirectionalLight3D`, moteur `core/` **intact** |

### unused_candidates
| Candidat | Classe | Motif mesuré |
|---|---|---|
| 7 props 3D `.glb` | `IMPLEMENTED`, non consommés | Ratifiés disponibles (F.4). `gen_crate_wood_01` déclare `consumer: [obstacle destructible]`, `gen_pillar_stone_01` pour l'indestructible. Consommation **différée au lot L8**. Échelle face à une case de 1 unité **jamais mesurée** → `UNKNOWN`. |
| Systèmes HTML `validated` (pursuer, evader, ZoC, damage_floor, reachability) | `NOT_NEEDED` | runtime `html`, jamais portés sous Godot ; `pursuer.mjs` ne résout pas « poser une bombe puis fuir » |
| `pacman/ghost_movement.gd` | `NOT_NEEDED` (patron partiel) | cadence + cible en argument, bon patron — mais ne sait ni poser une bombe ni fuir une zone létale |
| Système de power-ups réutilisable | **`NOT_FOUND`** | Mesuré : aucun mécanisme de power-up data-driven dans le parc Godot. `snake_survivor/SurvivorSystems.gd` (840 l.) porte un `UPGRADE_POOL` de bullet-heaven mais `extends Node2D` et gère ses propres nœuds/HUD/UI — couplé, prototype legacy, pas un contrat de donnée. **À écrire.** |
| Systèmes Tetris (rotation, gravité, lignes, sac) | `NOT_NEEDED` | aucun rapport. « Tetris est le jeu précédent » n'est pas une raison d'importer. |

### evidence
- `lab/forge_evidence/BOMBERMAN_3D_L0_20260810/game_contract.PROPOSED.yaml` + sorties des
  deux oracles et de la contre-épreuve (ci-dessus).
- `lab/forge_evidence/L0B_GPU_ROUTING_20260810/` — chaîne de preuve pixel, `TESTED`.
- **Point de mesure à la clôture** : pour chaque ligne `reused_*` ci-dessus, relever
  `consommé: oui/non` + le fichier consommateur. Un patron dont aucun fichier ne descend se
  rapporte comme **prédiction fausse**, pas comme un oubli.

---

## RISKS

**1. `reuses: []` est mécaniquement forcé — et le curriculum ne capitalise pas.** `TESTED`.
Mesuré : `catalog.json` compte 28 briques dont **une seule** au runtime godot
(`sys-grid-nav-m01`, tier `candidate`). `check_budget` exige `validated` — contre-épreuve
ci-dessus. Pire, `knowledge_base/learning_curve.jsonl` (11 lignes) donne
`reuse_ratio = 0` pour **snake ×6, breakout_v2 ×2, grid_nav_probe**, et `0.0588` pour
shmup_slice. **Quatre nœuds de curriculum, zéro brique Godot déposée.** La courbe censée
prouver que la Forge apprend est plate à zéro. Bomberman hérite donc d'une bibliothèque
vide, et l'affichera de la même façon si rien ne change.

**2. `adds: []` reconduit ce risque.** `DOCUMENTED_ONLY`. `check_budget` fait de `adds` une
obligation (`promis_non_depose`), donc promettre par optimisme se paie en rouge — mais ne
rien promettre garantit un cinquième nœud à zéro dépôt. Candidat nommé : la chaîne
descripteur → légende fermée → verdict structurel+topologique.

**3. La preuve pixel n'a jamais tourné sur une scène 3D.** `UNKNOWN`. Le volet prouvé rend
du 2D (`ColorRect`). Levé au lot L8 ; si la capture d'un `Node3D` se comportait autrement,
c'est `core.render` — exigence dure — qui serait touché.

**4. Dépendance de poste.** `TESTED`. `GPU_WINDOW_FLAGS` contient `--display-driver windows`.
Hors de cette machine, un volet pixel rend `NOT_MEASURED` motivé — jamais un faux rouge,
mais la preuve reste liée à ce poste.

**5. La chaîne d'explosion est le point de rupture technique.** `DOCUMENTED_ONLY`. Une
résolution non déterministe (ordre d'itération d'un `Dictionary`) donnerait un jeu qui passe
les tests unitaires et diverge en rejeu. D'où l'exigence d'ordre déclaré + assertion
d'indépendance à l'ordre d'insertion au lot L4.

**6. Un bot qui ne pose pas de bombe peut « gagner ».** `DOCUMENTED_ONLY`. Neutralisé par la
clause d'élimination active — mais seulement si l'oracle L6 l'implémente réellement.

---

## UNRESOLVED

**U1 — Promotion de `sys-grid-nav-m01` : `candidate → validated` (F.6).** *Bloquant pour
déclarer la seule réutilisation de code possible.* Sans promotion : Bomberman réécrit son
propre pathfinding, et le taux de réutilisation de code reste **0** pour le cinquième nœud
consécutif. Décision HumanGate en attente depuis l'étape 0 (verdict AUTHENTIQUE mais
`is_clean_pass: False`). C'est le seul point qui bloque une ligne du contrat.

**U2 — `adds` : déposer une brique, ou reconduire zéro ?** Voir RISQUE 2. Non bloquant pour
L1–L3 ; à trancher avant L10.

**U3 — Cartes utilisateur (F.3) : `user://` hors `repo_map`, ou artefact de dépôt.**
Bloquant pour L14 seulement.

**U4 — Conservation des power-ups entre cartes en solo (F.5).** Change la calibration de
solvabilité. Bloquant pour L15 seulement.

**U5 — Budgets `A_CALIBRER` du descripteur de preuve** (`max_mutants`, `timeout_*`,
`max_ticks`, `trials`). Repris de Tetris faute de mesure Bomberman. À recalibrer sur mesure
réelle avant s9, jamais après un dépassement silencieux.

**U6 — Commentaire périmé** dans `games/tetris/07_TESTS/oracle/core_render.gd:19` : il cite
le filet `GPU_WINDOW_REQUIRED_VOLETS` retiré en L0b. Volontairement non touché — il porte un
choix de nommage que tu as ratifié. Dis-moi si je le corrige.

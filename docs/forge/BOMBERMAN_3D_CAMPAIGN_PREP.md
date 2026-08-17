# BOMBERMAN 3D — préparation de campagne (livrables A→E)

> **Auteur** : session Opus 5, 2026-08-10. **Statut** : PROPOSED, sauf F.1 / F.2 / F.4
> **ratifiées par Pierre le 2026-08-10** (§F). Rien n'est construit.
> **claim_verdict** : NO_CLAIM_ALLOWED. **evidence_verdict** : `[LU]` = code réellement ouvert ·
> `[EXÉCUTÉ]` = commande lancée, sortie citée · `[NON LU]` = déclaratif, non vérifié ici.
> **Aucun fichier de jeu n'a été créé** — la règle de matérialisation du standard
> (`repo_map.yaml` §REGLE DE MATERIALISATION : un dossier vide est un FAIL) interdit de
> pré-scaffolder `games/bomberman_3d/` avant qu'un contrat l'exige.

---

## 0. Ce que cette session a mesuré avant d'écrire quoi que ce soit

| Ce que j'ai ouvert | Constat |
|---|---|
| `scripts/forge/standard/{core_requirements,repo_map,capabilities}.yaml` `[LU]` | 10 exigences CORE non négociables · table figée catégorie→dossier · registre de capacités fermé à 43 ids |
| `games/tetris/05_SYSTEMS/{game_state,game_loop}/*.gd` `[LU]` | règles pures `RefCounted`, `step(state, intent) -> {state, events}`, aucun couplage moteur |
| `games/tetris/tests/run_tests.gd` `[LU]` | harnais `SceneTree`, garde anti-faux-vert `EXPECTED_ASSERTS := 176` |
| `games/pacman/05_SYSTEMS/{map_schema,map_validator}/*.gd` + `03_WORLD/levels/*/level.json` `[LU]` | chaîne descripteur → légende fermée → verdict structurel + topologique → `carte_validee()` ou rien |
| `games/pacman/05_SYSTEMS/ghost_movement/ghost_movement.gd` `[LU]` | déplacement grille à cadence, cible reçue en argument, aucun nom de fantôme codé |
| `games/pacman/solvability.gd` `[LU]` | protocole `FORGE_TRIAL`, la graine sélectionne la carte, bot en boucle fermée par le canal d'entrée public |
| `knowledge_base/systems/navigation/grid_nav.gd` `[LU]` | **seule brique code Godot du catalogue** — BFS 4-directions, `next_step`/`path_length`, `walls` = Dictionary **creux** |
| `knowledge_base/catalog.json` (50 entrées) `[LU]` | 1 brique système Godot · 5 systèmes HTML/JS `validated` (non portés) · 7 props 3D `.glb` `candidate` |
| `games/chess_tcg/ui/game3d.gd` (605 l.) `[LU]` | **unique précédent 3D du studio** : `extends Node3D`, `TILE := 1.0`, plateau en cases, caméra + lumière + Tween, moteur `core/` intact |
| `docs/forge/CURRICULUM_JEUX_v1.md` `[LU]` | PROPOSED, jamais ratifié, **déjà divergent du réel** (voir §F.1) |
| `games/breakout_v2/07_TESTS/oracle/visual_gpu_capture.gd` + `.../presentation/capture.gd` `[LU]` | oracle pixel complet, écrit, avec garde explicite anti-image-morte |
| `scripts/forge/product_oracle_godot.py` `[LU]` | le collecteur **refuse par construction** d'exécuter le volet pixel (voir §H) |
| **exécution réelle** de `visual_gpu_capture.gd` sur `breakout_v2` `[EXÉCUTÉ]` | `PASS (image 640x480)`, `exit 0`, Vulkan 1.4.329 / RTX 5080, fenêtre hors écran |

**Ce que je n'ai PAS mesuré** et qui reste donc non prouvé : le comportement réel de `grid_nav.gd`
sous une grille bornée et mutable (jamais exécuté ici) · l'échelle des 7 `.glb` face à une case de
1 unité · le rendement de la capture sur une **scène 3D** (la mesure ci-dessus porte sur une scène 2D).

---

## A — GAME PRODUCT SPEC

### A.1 Identité

**Arena battler à réaction en chaîne, sur grille, en 3D.** Lignée Super Bomberman R 2, pas
Bomberman 1985. Ce qui définit le produit :

- l'espace est **une grille lisible d'un coup d'œil** — la 3D sert la lisibilité, jamais la
  simulation ;
- le plaisir signature est **la chaîne** : poser une bombe qui en fait sauter trois, ouvrir un
  couloir, piéger un adversaire ;
- la mort est **toujours explicable** — un joueur qui meurt doit pouvoir dire *pourquoi* en
  regardant l'écran une seconde avant ;
- le contenu (cartes, power-ups, règles de victoire) est **de la donnée**, pas du code.

Contrainte d'identité qui en découle et qui borne tout le reste : **toutes les règles sont
discrètes et entières.** Pas de physique continue, pas de `delta` moteur dans la logique. La 3D est
une couche de présentation qui lit un état entier.

### A.2 Boucle fondamentale

```
percevoir la grille → poser une bombe → se replier hors de la croix
→ mèche → explosion → destruction → power-up → capacité accrue → recommencer
```

Trois tensions qui font le jeu, à préserver dans toute décision d'équilibrage :
**la bombe qu'on pose menace d'abord soi-même** · **le power-up est derrière un bloc qu'il faut
détruire, donc derrière un risque** · **l'espace se referme à mesure qu'on l'ouvre**.

### A.3 Terrain

Vocabulaire fermé des cases — trois valeurs, pas plus, et le bord est toujours solide :

| Symbole | Type | Comportement |
|---|---|---|
| `#` | `SOLIDE` | infranchissable, indestructible, arrête la flamme |
| `+` | `DESTRUCTIBLE` | infranchissable, détruit par la flamme, peut révéler un power-up |
| `.` | `SOL` | franchissable |
| `S` | `SOL` + point d'apparition | franchissable, porte un `spawn_index` |

Un symbole hors table est **refusé avec son motif**, jamais deviné (règle héritée de
`map_schema.gd` `[LU]`).

### A.4 Acteur

État d'un acteur : `cellule (Vector2i)` · `offset entier ∈ [0, PAS_PAR_CASE)` · `direction` ·
`vivant` · `abilities` · `bombes_posees`.

**Décision de conception à retenir** : le déplacement fluide se code en **sous-pas entiers**
(`PAS_PAR_CASE` sous-pas par case, N ticks par sous-pas). `SPEED_UP` diminue le nombre de ticks par
sous-pas. On obtient un mouvement visuellement continu **sans jamais introduire un flottant dans les
règles** — donc sans perdre le déterminisme, donc sans perdre mutation ni solvabilité. C'est
l'équivalent Bomberman du `game.fixed_timestep` déjà déposé par Breakout_v2.

### A.5 Bombes

`{proprietaire, cellule, meche_restante, rayon, drapeaux}`.

- pose autorisée si `bombes_posees < abilities.bombes_max` et la case est libre de bombe ;
- la mèche décroît d'un tick par tick ; à zéro → explosion ;
- une bombe est un obstacle pour tous **sauf** son poseur tant qu'il n'a pas quitté la case
  (règle historique, indispensable au feel) et sauf `BOMB_PASS`.

### A.6 Explosion

- croix depuis le centre, quatre bras, longueur `rayon` ;
- un bras **s'arrête** sur `SOLIDE` ;
- un bras **détruit exactement un** `DESTRUCTIBLE` puis s'arrête — sauf `PIERCE`, qui traverse ;
- les cases touchées deviennent **létales pendant `DUREE_FLAMME` ticks** ;
- **chaîne** : une bombe atteinte par une flamme explose *dans le même tick*. La propagation se
  résout en **file, jusqu'à point fixe**, dans un ordre déclaré (ordre de pose croissant), afin que
  la chaîne reste **déterministe** quel que soit le nombre de bombes impliquées. C'est le point
  technique le plus délicat du jeu et il doit avoir sa propre ligne de WireMap et son propre oracle.

### A.7 Power-ups

Architecture générique, en trois pièces :

```
PowerUpDefinition (donnée : id, effet, borne)  →  application  →  PlayerAbilities (bloc de stats)
```

| id | effet | coût d'implémentation |
|---|---|---|
| `BOMB_UP` | `bombes_max += 1` (borné) | **nul** — modificateur de stat |
| `FIRE_UP` | `rayon += 1` (borné) | **nul** — modificateur de stat |
| `SPEED_UP` | `ticks_par_sous_pas -= 1` (borné) | **nul** — modificateur de stat |
| `PIERCE` | drapeau lu par la propagation | **faible** — un `if` dans un système existant |
| `BOMB_PASS` | drapeau lu par la collision | **faible** — un `if` dans un système existant |
| `KICK` | la bombe devient **mobile** | **fort** — nouvel état, nouvelle collision, règle d'arrêt |
| `PUNCH` | la bombe devient un **projectile en arc** | **fort** — trajectoire, atterrissage, case occupée |

Conséquence de planification, pas de design : **les trois premiers ne prouvent rien** de
l'extensibilité (ce sont des entiers dans un bloc de stats). Ce sont `PIERCE`/`BOMB_PASS` qui
prouvent que l'architecture accepte un drapeau sans réécriture, et `KICK` qui prouve qu'elle accepte
une **nouvelle nature d'objet**. Le découpage en lots (§E) suit cette gradation.

### A.8 Cartes — `MapDefinition`

```
MapDefinition
 ├── id, nom, schema_version
 ├── dimensions (largeur, hauteur)
 ├── plan[]              lignes de symboles, rectangulaire, bord solide
 ├── spawn_points[]      ≥ nb_acteurs, deux à deux non adjacents
 ├── powerup_rules       table {id → poids} + densité, tirage SEEDÉ
 ├── victory_rule        id de VictoryDefinition
 └── metadata            auteur, origine (`builtin` | `user`), date
```

`hazards` est **volontairement absent** de la V1 : aucun aléa de terrain n'est prévu dans le
vertical slice, et une clé qui n'a aucun lecteur est une promesse non tenue. Elle s'ajoutera avec
son premier consommateur (mort subite / blocs tombants), pas avant.

### A.9 Conditions de victoire

Plusieurs `VictoryDefinition`, chacune une règle nommée, jamais une théorie abstraite :

| id | mode | victoire | défaite | nul |
|---|---|---|---|---|
| `LAST_STANDING` | versus | un seul acteur vivant | mort de l'acteur joueur | 0 vivant, ou dépassement de `duree_max` |
| `CLEAR_ALL_BOTS` | solo | tous les bots morts | mort du joueur | dépassement de `duree_max` |

L'état de partie prend **exactement** trois valeurs : `EN_COURS` / `GAGNE` / `PERDU`, plus `NUL`
si `duree_max` est déclarée. Jamais indéfini (exigence `core.end_condition` `[LU]`).

### A.10 Modes et progression

- **Versus** : 1 humain + 3 bots (ou 4 bots pour l'oracle), une carte, `LAST_STANDING`.
- **Solo** : suite ordonnée de cartes, `CLEAR_ALL_BOTS` par carte.
  **Décision ouverte (E-1)** : les power-ups sont-ils conservés entre cartes ? Cela change
  radicalement la courbe de difficulté et donc la calibration de solvabilité.
- **Map Editor** : produit une `MapDefinition` `origin: user` jouable en versus.

---

## B — REUSE AUDIT

### B.1 Avertissement méthodologique — la leçon Pacman→Tetris s'inverse ici

La session précédente a établi : *mesurer la CIBLE, pas la source*. Une carte de réutilisation qui
inventorie ce que la source offre mesure une offre et ne mesure jamais la demande — d'où
**~20 greffons annoncés, 0 greffon réel**.

Ici la cible **n'existe pas encore**. Je ne peux donc pas appliquer la vérification inverse
(« la cible l'a déjà »). La discipline équivalente pour un greenfield est celle-ci :

> Tout ce qui suit est une **OFFRE**. Aucune ligne ne compte comme réutilisation tant qu'un besoin
> réel du build ne l'a pas réclamée et qu'un fichier n'a pas été lu contre ce besoin.
> **Le taux de réutilisation réalisé est mesuré à la clôture, pas ici. Sa valeur prédite est 0.**

Point de mesure défini d'avance, pour que la promesse soit falsifiable : à la clôture, pour chaque
ligne `REUSE`/`ADAPT` ci-dessous, on relève `consommé: oui/non` + le fichier consommateur. Un
`REUSE` annoncé et non consommé se rapporte comme **prédiction fausse**, pas comme un oubli.

### B.2 Matrice

Statuts : `REUSE` (consommable tel quel) · `ADAPT` (patron valide, code à réécrire) ·
`REBUILD` (neuf) · `NOT_NEEDED` · `UNKNOWN` (offre non vérifiée contre le besoin).

#### Étage USINE (preuve, gouvernance) — la réutilisation la plus solide

| Capacité | Source | Statut | Preuve de lecture | Coût |
|---|---|---|---|---|
| Table catégorie→dossier | `standard/repo_map.yaml` | **REUSE** | `[LU]` — `system`, `system.adapter`, `level`, `world.rules`, `entity.player`, `test.*`, `godot.project_root/tests` couvrent 100 % du besoin. **Aucune catégorie nouvelle requise pour le jeu.** | 0 |
| Exigences CORE | `standard/core_requirements.yaml` | **REUSE** | `[LU]` — 10 exigences, `not_applicable_allowed: false` | 0 |
| Registre de capacités | `standard/capabilities.yaml` | **ADAPT** | `[LU]` — 43 ids. Bomberman en exige de nouveaux (bombe, explosion, power-up…). **Ne pas les pré-écrire** : le chemin ratifié est `check_collisions` → `identifiants_inconnus` → `_propose_capability_gaps` → gate Pierre. Suivi 3× (Snake, Breakout_v2, Tetris). | 0 (mécanisme existant) |
| Harnais de test headless | `games/tetris/tests/run_tests.gd` | **ADAPT** | `[LU]` — patron `SceneTree` + `ok`/`eq` + garde `EXPECTED_ASSERTS`. Le fichier est spécifique au jeu (constante mesurée), le patron est portable. | faible |
| Oracle de solvabilité | `games/pacman/solvability.gd` | **ADAPT** | `[LU]` — protocole `FORGE_TRIAL`, graine→carte, boucle fermée par le canal d'entrée public. Patron directement transposable. | faible |
| Exécuteurs d'oracle | `godot_oracle.mjs`, `solvability_godot.mjs`, `product_oracle_godot.py`, `forge.mutation` | **REUSE** | `[NON LU]` (existence + câblage attestés par le run Tetris de la session précédente) | 0 |
| Verdict signé / vérif | `forge.verdict`, `forge.verify_run` | **REUSE** | `[NON LU]` — agnostique du jeu | 0 |

#### Étage PRODUIT (code de jeu)

| Capacité Bomberman | Source candidate | Statut | Preuve / réserve |
|---|---|---|---|
| Boucle de tick pure | `tetris/05_SYSTEMS/game_loop/loop.gd` | **ADAPT** | `[LU]` — `step(state, intent) -> {state, events}`, clone d'abord, ordre canonique déclaré, aucun système implémenté dans la boucle. Le **patron** est exactement ce qu'il faut ; le corps est 100 % Tetris. |
| État de partie observable | `tetris/05_SYSTEMS/game_state/state.gd` | **ADAPT** | `[LU]` — `RefCounted`, statuts en `enum` gelé, `initial(seed)`. Patron. Bomberman a 3-4 statuts, pas 2. |
| Carte pilotée par la donnée | `pacman/05_SYSTEMS/map_schema/map_schema.gd` | **ADAPT** | `[LU]` — légende **fermée**, `CHAMPS_OBLIGATOIRES`, `symboles_inconnus()`, `table_des_types()` → `PackedByteArray`. La *forme* est exactement la `MapDefinition` voulue ; la légende (MAISON, TUNNEL, pastilles) est Pacman. |
| Validation de carte | `pacman/05_SYSTEMS/map_validator/map_validator.gd` | **ADAPT** | `[LU]` — le patron le plus précieux de l'audit : verdict **structurel** puis **topologique**, motifs en vocabulaire fermé, `carte_validee()` = « carte validée ou rien ». C'est littéralement le maillon `MAP EDITOR → VALIDATION → RUNTIME` demandé au §7 de la mission. Motifs Bomberman ≠ motifs Pacman. |
| Atteignabilité | `map_validator.verdict_topologie` + `Pellets.tous_atteignables` | **ADAPT** | `[LU]` — Pacman valide déjà « tout collectible atteignable depuis le départ ». Bomberman a besoin de « tout spawn atteint tout autre spawn en ignorant les destructibles ». Même nature, prédicat différent. |
| Navigation de bot | `knowledge_base/systems/navigation/grid_nav.gd` (`sys-grid-nav-m01`) | **REUSE sous réserve** | `[LU]` — `next_step(from, to, walls) -> Vector2i`, `path_length -> int`, `walls: Dictionary` creux, ordre de voisinage FIXE, borne `MAX_CELLS_EXPLORED = 10000`. **Deux réserves mesurables** : (1) `walls` est un dictionnaire **creux sans bords** — reconstruire ce dictionnaire à chaque requête coûte O(W·H) par bot et par tick ; (2) le BFS est **statique**, donc la peur du danger doit s'exprimer en **injectant les cases létales dans `walls`** — c'est possible et c'est même élégant, mais ce n'est pas ce que le catalogue promet, donc à prouver. Tier `candidate`, promotion en attente de HumanGate. **Rappel du contrat Tetris `[LU]` : la brique P5 avait été importée « littéralement » avec une signature qui ne correspondait pas.** |
| Déplacement d'adversaire sur grille | `pacman/05_SYSTEMS/ghost_movement/ghost_movement.gd` | **ADAPT** | `[LU]` — cadence par période, cible **reçue en argument**, demi-tour exclu sauf cul-de-sac, aucun nom de fantôme codé. Bon patron de bot à cadence. Mais un bot Bomberman **pose des bombes et fuit**, ce que ce fichier ne sait pas faire. |
| Présentation 3D sur grille | `games/chess_tcg/ui/game3d.gd` | **ADAPT** | `[LU]`, 605 l. — `extends Node3D`, `TILE := 1.0`, racines de nœuds par catégorie, `Vector2i` de logique → position 3D, caméra + lumière + Tween, **le moteur `core/` reste intact et testé**. C'est **le seul précédent 3D du studio** et il valide exactement la séparation qu'on veut. |
| Blocs 3D destructible / indestructible | `knowledge_base/assets/props3d/*.glb` | **REUSE différé au lot L8** | `[LU]` catalogue + proposition — 7 props, géométrie jugée OK par l'Asset Geometry Oracle, `gen_crate_wood_01` déclare littéralement `consumer: [obstacle destructible]`, `gen_pillar_stone_01` pour l'indestructible. **Ratifiés disponibles** (F.4 précisé 2026-08-10), consommés à partir de L8 ; le slice rend par primitives. Réserve non levée : échelle face à une case de 1 unité jamais mesurée → `UNKNOWN`. |
| Modèle de menu | `pacman/05_SYSTEMS/menu_model/menu_model.gd` | **UNKNOWN** | `[NON LU]` — existe, non ouvert. Candidat pour l'écran de résultat et la sélection de carte. |
| Événements de tick | `pacman/05_SYSTEMS/game_events/game_events.gd` | **UNKNOWN** | `[NON LU]` — `game.events` est une capacité déjà déposée par Snake `[LU]` ; à confronter au besoin (l'audio et la 3D consomment les événements). |
| Systèmes HTML/JS `validated` (pursuer, evader, ZoC, damage_floor, reachability) | `knowledge_base/systems/**/*.mjs` | **NOT_NEEDED** | `[LU]` catalogue — runtime `html`, jamais portés sous Godot. Les porter serait un chantier en soi, et `pursuer.mjs` ne résout pas le problème « poser une bombe puis fuir ». |
| Rotation / gravité / lignes / sac de pièces | `tetris/05_SYSTEMS/*` | **NOT_NEEDED** | `[LU]` — aucun rapport avec Bomberman. À dire explicitement : « Tetris est le jeu précédent » n'est pas une raison d'en importer quoi que ce soit. |

### B.3 Bilan honnête de l'audit

- **Réutilisation à coût nul, avérée** : l'étage usine (repo_map, CORE, verdict, oracles,
  mutation, mécanisme de proposition de capacités). C'est réel, c'est mesuré, et c'est **la vraie
  capitalisation** : elle représente la majorité de la cérémonie de production.
- **Une seule brique de code produit potentiellement importable telle quelle** : `grid_nav.gd`,
  sous deux réserves nommées et vérifiables.
- **Tout le reste est du PATRON, pas du code** : boucle pure, état observable, schéma+validateur de
  carte, présentation 3D sur grille. La valeur y est réelle mais elle se transmet par **lecture**,
  pas par `preload`.
- **Prédiction explicite, à confronter à la clôture** : ~1 greffe de code produit,
  ~5 réutilisations d'usine, ~6 patrons. Si la clôture montre 0 greffe de code produit, la
  prédiction sera dite fausse — pas réinterprétée.

---

## C — ARCHITECTURE PROPOSAL

### C.1 Le principe qui décide de tout le reste

> **Les règles de Bomberman sont entières et discrètes. La 3D est une projection.**

Conséquence directe, et c'est l'argument central de cette proposition : la 3D **ne contamine pas la
chaîne de preuve**. Le noyau de règles reste `RefCounted` pur → testable headless → mutable →
solvable, exactement comme Tetris. Le seul point où la 3D coûte quelque chose est
`core.render` (`proof_kind: pixel` `[LU]`), et **ce point est désormais mesuré, pas supposé** :
la chaîne de capture en fenêtre GPU fonctionne sur ce poste (§H). Ce qu'il reste à faire est un
travail de câblage nommé, pas une inconnue.

### C.2 Étages

```
        DONNÉE                     RÈGLES (pur, headless)              PRÉSENTATION (Godot)
 ┌────────────────────┐      ┌──────────────────────────────┐     ┌──────────────────────┐
 │ MapDefinition      │      │ map_schema   map_validator   │     │ arena_view_3d        │
 │ PowerUpDefinition  │─────▶│ arena        actors          │────▶│ actor_view_3d        │
 │ VictoryDefinition  │      │ bombs        explosion       │     │ hud · end_screen     │
 │ params (équilibre) │      │ powerups     victory         │     │ camera · lights      │
 └────────────────────┘      │ bot_policy   game_loop       │     └──────────────────────┘
                             │ game_state   events          │              ▲
                             └──────────────────────────────┘              │
                                        │  state + events                  │
                                        └──────────────────────────────────┘
        ENTRÉE : input_adapter (Godot) ──▶ intention entière ──▶ game_loop.step()
```

**Trois interdits structurels**, chacun vérifiable mécaniquement :

1. aucun fichier de `05_SYSTEMS/` n'hérite de `Node`, ne lit `delta`, ne touche l'aléa non seedé ;
2. aucun fichier de `06_RUNTIME/` n'implémente une règle — il lit un état et affiche ;
3. `game_loop` **ordonne** les systèmes et n'implémente **aucune** règle (INV-6, tel qu'appliqué
   dans `tetris/loop.gd` `[LU]`).

### C.3 Systèmes (une responsabilité chacun)

| Dossier `05_SYSTEMS/` | Responsabilité | Ne fait jamais |
|---|---|---|
| `params/` | toutes les constantes équilibrables, **un seul bloc** | de la logique |
| `map_schema/` | légende fermée, champs obligatoires, plan → table de types | aller chercher un fichier |
| `map_validator/` | verdict structurel + topologique, motifs fermés | jouer une carte à moitié |
| `arena/` | grille courante mutable : cases, destruction, occupation | décider d'une mort |
| `actors/` | position sous-case, direction, vivant, `abilities` | décider d'un déplacement légal |
| `movement_rules/` | intention → déplacement légal (collision solide/destructible/bombe) | animer |
| `bombs/` | pose, mèche, appartenance, plafond par acteur | propager la flamme |
| `explosion/` | croix, arrêts, destruction, **chaîne jusqu'à point fixe, ordre déclaré** | tuer |
| `hazard_field/` | cases létales et leur durée restante | savoir qui est dessus |
| `damage/` | qui meurt ce tick | terminer la partie |
| `powerups/` | table de définitions, révélation seedée, application aux `abilities` | connaître un power-up par son nom |
| `victory/` | `VictoryDefinition` → statut de partie | compter les acteurs à la place de `game_state` |
| `bot_policy/` | décision de bot déterministe (cible, danger, pose, repli) | bouger l'acteur |
| `game_state/` | détient et expose l'état ; statuts en `enum` gelé | appliquer une règle |
| `game_loop/` | ordre canonique du tick, `step(state, intents) -> {state, events}` | implémenter une règle |
| `game_events/` | événements du tick pour un consommateur externe | rendre ou jouer un son |
| `map_editor_model/` | édition **pure** d'une `MapDefinition` (poser, effacer, redimensionner, annuler) | dessiner, lire ou écrire un fichier |

`map_editor_model` en logique pure est la décision qui rend l'éditeur **testable** : les 90 % de
l'éditeur qui peuvent casser (redimensionner en perdant des spawns, produire une carte invalide,
annuler mal) sont couverts par des tests unitaires headless, et il ne reste qu'une vue à câbler.

### C.4 Adaptateurs (`06_RUNTIME/adapters/`)

`input_adapter` · `presentation_3d` (arène, acteurs, bombes, flammes, caméra, lumière) · `hud` ·
`end_screen` · `menu` · `map_editor_view` · `content_provider` (charge les `MapDefinition`) ·
`persistence` (sauvegarde des cartes utilisateur) · `audio` · `debug_probe` ·
`solvability_bot` · `runtime_loop`.

### C.5 Placement — vérifié contre la table figée

| Élément | Catégorie `repo_map.yaml` | Chemin résolu |
|---|---|---|
| systèmes ci-dessus | `system` | `05_SYSTEMS/{id}/` |
| adaptateurs ci-dessus | `system.adapter` | `06_RUNTIME/adapters/{id}/` |
| cartes livrées | `level` | `03_WORLD/levels/{id}/` |
| tables power-ups / victoire | `world.rules` | `03_WORLD/rules/{id}/` |
| joueur / bot | `entity.player` | `02_ENTITIES/players/{id}/` |
| tests unitaires | `test.unit` | `07_TESTS/unit/{id}` |
| volets d'oracle produit | `test.oracle` | `07_TESTS/oracle/{id}` |
| `solvability.gd`, `project.godot`, `main.tscn` | `godot.project_root` | racine |
| `tests/run_tests.gd` | `godot.project_tests` | `tests/{id}` |

**Aucune catégorie nouvelle n'est nécessaire** — donc aucune gate `repo_map` à ouvrir pour
l'architecture du jeu. **Une seule exception, et c'est une décision (E-3)** : les cartes créées par
le joueur ne sont pas des artefacts de dépôt. Elles doivent aller dans `user://` (Godot), hors
`repo_map`. Il faut le trancher explicitement plutôt que de les écrire dans `03_WORLD/levels/` et
faire du contenu utilisateur un artefact de build.

### C.6 Contrat de déterminisme

`step(state, intents, seed) -> {state, events}` — même état + mêmes intentions + même graine ⇒ même
état suivant, sur N ticks. C'est `core.main_loop` (`proof_kind: test` `[LU]`). Tout ce qui
menacerait ce contrat est banni du noyau : `randf()` non seedé, `Time`, `delta`, ordre d'itération
d'un `Dictionary` sur un chemin décisionnel.

---

## D — MINIMUM VERTICAL SLICE

Le plus petit Bomberman 3D qui soit **une vraie partie**, pas un bac à sable.

**Contenu**
1 carte livrée (11×11, motif damier classique, 4 spawns aux coins) · 1 joueur au clavier ·
3 bots · bombes (pose, mèche, plafond, rayon) · explosion en croix + **chaîne** · destruction ·
3 power-ups **de stat uniquement** (`BOMB_UP`, `FIRE_UP`, `SPEED_UP`) · mort · `LAST_STANDING` ·
écran de résultat · relance · rendu 3D lisible.

**Hors slice, explicitement** : Map Editor · mode solo/progression · `KICK`/`PUNCH`/`PIERCE`/
`BOMB_PASS` · mort subite · audio au-delà du minimum `core.audio` · plusieurs cartes.

**Le slice est fini quand** — chaque ligne est une preuve, pas une opinion :

| # | Critère | Preuve |
|---|---|---|
| 1 | déterminisme du tick | test : même graine + mêmes intentions ⇒ même état sur N ticks |
| 2 | chaîne d'explosion | test : configuration de k bombes ⇒ toutes explosent au même tick, résultat indépendant de l'ordre d'insertion |
| 3 | carte invalide refusée avec motif | test : ≥1 cas par motif du vocabulaire fermé |
| 4 | une partie se termine toujours | solvabilité : sur N graines, `LAST_STANDING` atteint, jamais `EN_COURS` au budget de ticks |
| 5 | **le jeu est gagnable par un bot** | solvabilité : un bot déterministe gagne un `LAST_STANDING` contre 3 bots, sur ≥ N graines |
| 6 | les tests attrapent les bugs | mutation : gate `check_mutation_gate`, survivants tués ou triés avec justification |
| 7 | relance propre | `bot_action` : après fin, relance ⇒ état identique au premier démarrage |
| 8 | **rendu réel** | `pixel` — capture issue d'une **exécution GPU du projet**, non monochrome, et **deux états déclarés qui diffèrent**. `NOT_MEASURED` n'est **pas** un état final acceptable pour ce jeu (ratifié Pierre 2026-08-10, §F.2). Protocole : §H. |
| 9 | le monde change à l'écran | `pixel` différentiel : la région projetée d'une case change quand cette case est détruite ; la région projetée de l'acteur change quand il se déplace |

Le critère 5 est celui qui a déjà pris ce studio en défaut deux fois (`survival_arena`,
`collect_runner` : oracles verts, jeu injouable). **Pour Bomberman il porte un piège spécifique** :
un bot qui ne pose jamais de bombe survit très bien et peut « gagner » par élimination des autres.
Le critère doit donc exiger **une victoire par élimination active**, avec au moins une mort
attribuée à une bombe du bot testeur — sinon on prouve la survie, pas la jouabilité.

---

## E — PRODUCTION PLAN

Lots courts, chacun avec sa preuve. Un lot ne s'ouvre pas tant que la preuve du précédent n'est pas
verte ou explicitement `NOT_MEASURED` motivée.

| Lot | Contenu | Preuve de fin |
|---|---|---|
| **L0** — cadrage | ratification des décisions ouvertes (E-1…E-5), `game_contract.yaml` (nœud, budget `reuses`/`adds`, descripteur de preuve), charter s0 sous contrat, oracle `check_charter` | `check_contract_completeness` + `check_charter` verts |
| **L0b** — **coupleur de preuve pixel** *(usine, nouveau)* | mode d'exécution **fenêtre GPU** dans `product_oracle_godot.py` pour les volets `requires_gpu_window`, au lieu du `NOT_MEASURED` inconditionnel actuel ; correction du fait périmé « binaire Godot absent » | le volet pixel d'un jeu **existant** (`breakout_v2`) remonte `OK` **via le collecteur**, pas seulement en ligne de commande |
| **L1** — squelette prouvable | `params`, `game_state`, `game_loop` vide mais déterministe, `run_tests.gd` avec `EXPECTED_ASSERTS`, `project.godot`, `main.tscn` | test de déterminisme vert, harnais qui échoue si un cœur ne compile pas |
| **L2** — carte donnée | `map_schema`, `map_validator`, 1 `level`, `content_provider` | ≥1 test par motif de refus ; carte livrée validée |
| **L3** — acteur | `actors`, `movement_rules`, `input_adapter` | test : intention ⇒ déplacement observable ; collision solide/destructible |
| **L4** — cœur du jeu | `bombs`, `explosion`, `hazard_field`, `damage` | **test de chaîne** (critère D-2) ; destruction ; mort |
| **L5** — partie | `victory`, `game_events`, écran de résultat, relance | `bot_action` fin de partie + relance propre |
| **L6** — bots | `bot_policy`, `solvability.gd` (protocole `FORGE_TRIAL`) | **critère D-5** : victoire par élimination active, ≥ N graines |
| **L7** — power-ups | `powerups`, 3 définitions de stat | ajout d'un 4ᵉ power-up de stat = **donnée seule**, prouvé par un test qui n'ajoute aucun fichier de système |
| **L8** — 3D | `presentation_3d`, caméra, lumière, `hud`, `capture` à ticks déclarés | **critères D-8 et D-9** : capture GPU réelle, non monochrome, deux états déclarés qui diffèrent, régions projetées qui changent |
| **L9** — durcissement | mutation sur les fichiers logiques déclarés par la WireMap, triage des survivants | `check_mutation_gate` vert ou survivants justifiés |
| **L10** — verdict | WireMap gelée, oracles, agrégat signé, `verify_run` | `verify_run` exit 0 · HumanGate |
| — *fin du vertical slice* — | | |
| **L11** | `PIERCE`, `BOMB_PASS` | preuve d'extensibilité **à coût de drapeau** |
| **L12** | `KICK` (bombe mobile) | preuve d'extensibilité **à coût de nature nouvelle** |
| **L13** | `map_editor_model` (pur) | tests headless : redimensionner sans perdre de spawn, annuler, refuser une carte invalide |
| **L14** | `map_editor_view` + `persistence` | une carte créée à la main est jouée par le runtime **sans conversion** |
| **L15** | mode solo, progression, cartes multiples | solvabilité **par carte** (patron `pacman/solvability.gd` : la graine sélectionne la carte) |

**Ordre non négociable** : L4 avant L8. Faire la 3D avant la chaîne d'explosion produirait un jeu
joli et faux — c'est exactement l'incident `shmup_slice` (mutation 111/112, rendu mort) pris par
l'autre bout.

---

## F — Décisions HumanGate (classe E)

Tout le reste de ce document est de la classe A→D (réparable/planifiable sans arbitrage). Ce qui
suit ne l'est pas. **F.1, F.2 et F.4 ont été tranchées par Pierre le 2026-08-10** ; F.3, F.5, F.6
restent ouvertes.

### ✅ F.1 — RATIFIÉ : nœud 5, delta 3D assumé

`game_contract.yaml` portera `node: 5`, à la suite de Pong=1 / Snake=2 / Breakout_v2=3 / Tetris=4.
Le delta 3D est anticipé de cinq rangs sur `CURRICULUM_JEUX_v1` — décision assumée, fondée sur
§C.1 (le delta est confiné à la présentation).

### ✅ F.2 — RATIFIÉ : `core.render` est une exigence DURE

Décision Pierre, mot pour mot : *« pour Bomberman 3D, `core.render` doit rester une exigence
réelle : le rendu 3D est justement une partie centrale du produit »*, et
**`NOT_MEASURED` n'est pas un état final acceptable**. `core.render` ne peut passer `IMPLEMENTED`
qu'après une **preuve GPU réelle** ; sinon `BLOCKED` ou `NOT_MEASURED`, jamais un vert.

Chaîne exigée : `run fenêtre GPU → capture écran → preuve pixel → oracle → EvidenceManifest`.
Interdit explicite : **aucune capture statique ajoutée à la main** — l'image doit provenir de
l'exécution du projet. Traduction mécanique : §H.

**Conséquence de planification** : cette exigence remonte le travail de preuve visuelle de L8 vers
**L0b**, parce qu'elle est bloquante. Un lot L0b a été ajouté au §E.

### ✅ F.4 — RATIFIÉ, puis PRÉCISÉ le 2026-08-10 : primitives d'abord, `.glb` au lot L8

`assets.plan: cc0`, aligné sur Snake / Breakout_v2 / Tetris : le vertical slice rend par
primitives moteur. **Précision apportée ensuite par Pierre** : les 7 `.glb` du catalogue sont
**ratifiés comme ressources disponibles** et **consommés à partir du lot L8** ; aucune génération
d'asset nouvelle (« ne pas créer artificiellement de nouveaux assets si une primitive ou un asset
existant suffit »).

Leur ligne de l'audit §B.2 est donc `IMPLEMENTED, non consommé` — **pas** `NOT_NEEDED` comme
écrit dans une version antérieure de ce document. Réserve inchangée et non levée : l'échelle des
props face à une case de 1 unité n'a jamais été mesurée.

**Note de traçabilité sur F.1** : `CURRICULUM_JEUX_v1.md` `[LU]` reste PROPOSED, jamais ratifié, et
**divergent du réel** (il annonce PAC-MAZE=01, MATCH-3=02, PLATFORMER=03… et classe la 3D au rang
10). La ratification ci-dessus tranche pour Bomberman **sans** régler cette divergence : le
document du curriculum reste faux sur les nœuds 1→4. À traiter séparément.

### Restent ouvertes

**F.3 — Cartes utilisateur.** `user://` hors `repo_map` (recommandé) ou artefact de dépôt.
Bloquant pour L14 seulement.

**F.5 — Conservation des power-ups entre cartes en solo** (change la calibration de solvabilité).
Bloquant pour L15 seulement.

**F.6 — Promotion de `sys-grid-nav-m01`** `candidate → validated`, en attente depuis l'étape 0
(verdict AUTHENTIQUE mais `is_clean_pass: False`). Bomberman serait son premier consommateur réel.
Non bloquant : la brique est utilisable en `candidate`.

---

## H — Preuve pixel : diagnostic mesuré et protocole

**Classe D — mal câblé.** Pas un manque de capacité, pas un manque de matériel.

### H.1 Ce qui existe et fonctionne

| Élément | État |
|---|---|
| `capture.gd` (pacman, snake, breakout_v2) `[LU]` | écrit. Garde explicite : `contexte_capture_valide()` refuse `headless`/`dummy`, et `capturer()` **n'écrit aucun fichier** sur image nulle — « une image morte ne doit jamais passer pour un vert ». Sélection par ticks déclarés (`doit_capturer`). |
| `visual_gpu_capture.gd` (breakout_v2) `[LU]` | oracle `SceneTree` complet : instancie `main.tscn`, 20 frames, capture, assertion **non monochrome**, `quit(0/1)`. |
| Chaîne complète | **`[EXÉCUTÉ]` ce jour** — `PASS (image 640x480)`, `exit 0`, Vulkan 1.4.329, RTX 5080, fenêtre positionnée hors écran. |

> **MAJ 2026-08-10 — RÉPARÉ (lot L0b).** Le diagnostic §H.2 ci-dessous décrit l'état
> AVANT réparation ; il est conservé tel quel parce qu'il explique le *pourquoi*. Depuis :
> `GPU_WINDOW_REQUIRED_VOLETS` est retiré, le mode est routé par la directive statique
> `# forge:run_mode = gpu_window`, et le collecteur réel a rendu
> `snake/core_render_frame → OK (mode_execution: gpu_window)`. Preuve :
> `lab/forge_evidence/L0B_GPU_ROUTING_20260810/collector_run.json`. Le lot L0b du §E est
> donc soldé, et `core.render` est atteignable pour Bomberman.

### H.2 Où la chaîne est coupée

`scripts/forge/product_oracle_godot.py` `[LU]` :

- ligne 63 — `GPU_WINDOW_REQUIRED_VOLETS = frozenset({"core_render_frame"})`. Pour ces volets, le
  collecteur **ne lance jamais le runner** et rend `NOT_MEASURED` sans exécution. Le test
  `test_core_render_frame_toujours_not_measured_meme_binaire_present` **verrouille ce comportement**,
  binaire présent ou non ;
- le collecteur n'a **qu'un mode d'exécution** (headless). Il n'existe aucun chemin de code capable
  de lancer `--display-driver windows --rendering-driver vulkan --position -3000,-3000` ;
- son en-tête porte un **fait périmé** : *« il est actuellement ABSENT de ce poste
  (`godot.config.json` pointe un chemin qui n'existe plus, vérifié 2026-07-29) »*. Faux aujourd'hui :
  le binaire de `godot.config.json` vient d'exécuter l'oracle. À corriger, sans quoi la prochaine
  session re-conclura à l'impossibilité.

Autrement dit : **le `NOT_MEASURED` de Tetris n'était pas une limite physique, c'était une
politique.** Elle était juste tant qu'aucun jeu n'exigeait la preuve pixel ; F.2 la rend caduque.

### H.3 Ce qu'il faut construire (lot L0b)

Un **second mode d'exécution** dans le collecteur, pas un nouvel étage :

```
volet déclare requires_gpu_window: true
        ↓
runner GPU : --display-driver windows --rendering-driver vulkan --position -3000,-3000
        ↓
FORGE_ORACLE <nom> {json}  +  PNG écrit par capture.gd
        ↓
status OK | FAIL | NOT_MEASURED(raison)      ← NOT_MEASURED réservé à « pas de GPU », plus à « par principe »
        ↓
EvidenceManifest : chemin PNG + sha256 + tick déclaré + run_id
```

Le marqueur `requires_gpu_window` **existe déjà** dans le collecteur (`_GPU_WINDOW_MARKER_KEY`,
`[LU]`) et fait autorité sur la liste en dur : le point d'entrée du câblage est donc déjà nommé
dans le code. C'est bien du branchement, pas de la conception.

### H.4 Traduire les critères de Pierre en assertions mécaniques

Pierre exige : fenêtre ouverte · scène 3D rendue · joueur visible · arène visible · blocs visibles ·
bombe/explosion visible · au moins un état après modification du monde.

Ce qu'un oracle **non-LLM** peut réellement prouver, sans juge sémantique :

| Exigence | Assertion mécanique | Prouvable ? |
|---|---|---|
| fenêtre ouverte, scène rendue | image non nulle, dimensions attendues, **non monochrome** | ✅ déjà prouvé sur breakout_v2 |
| état après modification du monde | deux captures à ticks déclarés **diffèrent** (distance pixel > seuil déclaré) | ✅ |
| blocs visibles | la **région projetée** d'une case destructible **change** au tick de sa destruction, et **ne change pas** aux ticks où rien ne s'y passe | ✅ (la double assertion évite le vert par bruit) |
| joueur visible | la région projetée de l'acteur **change** quand il se déplace, et **le fond ne change pas** | ✅ |
| explosion visible | la région de la croix change au tick d'explosion, sur les 4 bras | ✅ |
| « joueur visible » au sens sémantique (*c'est bien un personnage*) | — | ❌ **non prouvable mécaniquement**. À dire ainsi plutôt que de le simuler. |

La ligne rouge du tableau est importante : la projection cellule→région d'écran doit être fournie
par `presentation_3d` **comme une fonction pure interrogeable**, sinon l'oracle devinerait où
regarder. C'est une contrainte d'architecture posée maintenant, pas un correctif de fin de run.

---

## G — Blackboard (§17 de la mission) : ce que je propose, et ce que je refuse de proposer

La mission demande d'explorer l'idée **et** de ne pas l'adopter sans mesure. Je m'en tiens à ça.

**Ce que je ne fais pas** : concevoir un Blackboard. Il n'a pas de consommateur prouvé et le studio
a déjà un mode de panne documenté qui s'appelle exactement ça — *déclaré ≠ exécuté*, une couche de
plus par manque constaté.

**Ce que je propose** : une mesure, sur cette campagne, avec des compteurs définis d'avance.
Trois signaux existent déjà et sont exploitables sans rien construire :

1. `forge.studio_link.run_cost(run_id)` donne `calls / total_tokens / total_duration_s` par run —
   la répétition de contexte est donc **déjà mesurable**, agent par agent ;
2. la doctrine des quatre lignées causales a déjà mesuré la perte d'information :
   `reason` vide 9/9, « pourquoi » absent de `final_report` 0/21 — c'est un **trou d'information
   avéré**, pas une hypothèse ;
3. `lab/reports/pending_review_decisions.jsonl` compte 215 propositions en attente — un signal de
   ce qui n'est pas consommé.

**Protocole minimal, à décider en L0** : sur les lots L1→L6, relever pour chaque étape-agent
`tokens d'entrée` + `quelle fraction du prompt est du contexte déjà transmis à une étape
précédente`. Si la fraction re-transmise dépasse un seuil déclaré d'avance, l'hypothèse « le
workflow répète du travail » est confirmée **par une mesure**, et alors seulement un prototype
minimal se justifie. Sinon, l'idée s'abandonne — et on l'écrit.

---

## Rapport

```
software_verdict: BLOCKED       # aucun artefact Bomberman n'existe, aucun oracle de ce jeu n'a tourné
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

`BLOCKED` est le verdict honnête d'une session de cadrage : il n'y a **aucun** artefact Bomberman à
mesurer. Ce document repose sur des **lectures de code** (`[LU]`) et sur **une seule exécution
réelle** (`[EXÉCUTÉ]`, §H.1) — qui porte sur `breakout_v2`, pas sur ce projet, et qui prouve la
capacité de la Forge, pas la qualité du jeu à venir.

**Ce qui n'a PAS été fait et ne doit pas être supposé** : aucun fichier sous `games/` n'a été créé
ni modifié · aucun `game_contract.yaml` n'a été écrit · aucune capacité n'a été ajoutée à
`capabilities.yaml` · aucune écriture durable (ledger, mémoire, projets) · rien n'a été commité.

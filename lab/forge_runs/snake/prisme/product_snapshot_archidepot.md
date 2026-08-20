# PRODUCT SNAPSHOT — lentille ARCHITECTE DU DÉPÔT — projet : snake

run_id : `snake-20260728-091302` · marqueur : `FORGE_DISPATCH:s1-prisme-lens-archidepot:snake-20260728-091302`
**Révision v2** (2026-07-28) — révisé contre `lab/forge_runs/snake/charter.yaml` **version 2**
(champ `revisions:`, décisions Pierre D1→D6 + règle de wiremap). Source de vérité : ce charter v2.
Catégories de checklist couvertes (`scripts/forge/prisme/design_review_checklist.yaml`,
`lens: [archidepot]`) : `architecture`, `technique_stack`, et la moitié `archidepot` de
`technique_api` / `technique_data`.

**Point de vue imposé** : le builder pense au jeu, l'architecte pense au studio. Ce document
décrit le Snake FINI **comme une conséquence de briques** — ce qui est importé tel quel, ce qui
est repris comme patron de conception, ce qui est créé, et ce que ce jeu doit **léguer**.

**Ce que la v2 change, en un mot** : la cible passe du navigateur à **Godot 4.x desktop** (D1).
Conséquence directe et non négociable : **aucune brique `.mjs` de Pong n'est importée** — le
charter v2 range la copie de code `.mjs` en `hors_scope` et la « copie maquillée en réutilisation »
en `actions_interdites`. Chaque brique est donc **retypée** selon le vocabulaire imposé par le
charter v2 : `CODE:<chemin>` (code Godot réellement importable), `CONCEPT:<chemin>` (patron repris
d'une brique existante, code réécrit pour la cible), `NEW` (avec les 5 questions IKEA).

**Statut des briques** : chaque chemin cité ci-dessous a été vérifié par lecture du dépôt
(`ls` / `head` / `grep` / `node -e` le 2026-07-28). Une brique attendue mais absente est marquée
`INTROUVABLE` et n'est jamais supposée. Deux répertoires — `scripts/forge/adapters/godot/` et
`fixtures/godot_b0/` — existent réellement (vérifié) mais appartiennent à une
**SESSION_PARALLELE, sort non arbitré** : ils sont cités comme existants, **aucune décision de ce
document ne repose sur eux**.

`evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. CE QUE LE JOUEUR VOIT

Le joueur lance une **application de bureau** (une fenêtre Godot, pas un onglet) et voit
immédiatement une grille 20×20, un serpent de trois segments, une pastille de nourriture, un score
en chiffres et, à côté, son meilleur score. Aucun menu, aucun écran de chargement, aucun appui
préalable : le serpent avance déjà.

Vu par l'architecte, cette image n'est **plus** du rendu Pong rebranché — c'est la conséquence
d'une décision : la V1 change de moteur. Ce qui traverse de Pong, ce sont des **patrons**, pas des
pixels.

- **La grille et les formes** sont dessinées par un adaptateur Godot qui ne fait que **lire un
  état** et le peindre en primitives du moteur (aucun asset importé, `hors_scope`). Le patron de
  cet adaptateur existe déjà, en GDScript, dans le dépôt :
  `games/pong/06_RUNTIME/adapters/presentation/godot/main.gd` (vérifié — `extends Node2D`, lit un
  état JSON, dessine, capture, quitte ; **zéro règle de jeu à l'intérieur**). Snake reprend la
  discipline « le renderer ne décide de rien », pas ses constantes de terrain (`FIELD_W`,
  `PADDLE_H`… propres à Pong).
- **Les chiffres** — score courant, meilleur score, cible de victoire, indicateur de cadence — sont
  affichés par les primitives de texte du moteur. Le patron d'exigence vient de Pong :
  `games/pong/06_RUNTIME/adapters/presentation/draw.mjs` (vérifié — police pixel `GLYPHS` 3×5) et
  surtout de sa **preuve** `games/pong/07_TESTS/unit/score_readout.test.mjs` (vérifié), qui compare
  le chiffre affiché au score interne. C'est le patron qui se transporte, pas la table de glyphes :
  en Godot, un `Font` du moteur remplace `GLYPHS`.
- **L'écran de fin** est explicite (issue + score final + relance) : patron
  `games/pong/06_RUNTIME/adapters/presentation/browser/main.mjs` (vérifié — `createController(seed)`
  → `tick`/`replay`/`stop`) et ses preuves `games/pong/07_TESTS/unit/end_screen.test.mjs` /
  `restart_offer.test.mjs` (vérifiés).
- **L'écran de pause** dit explicitement « en pause ». Rien de tel n'existe dans le dépôt :
  `grep -rln "PAUSED\|pause"` sur `games/pong/05_SYSTEMS` et `games/pong/06_RUNTIME` renvoie
  **zéro fichier** (vérifié). C'est une brique `NEW`, révisée à la hausse par D5 (« prévue dans
  l'architecture dès le départ »), pas une finition.

Ce que le joueur voit de **neuf par nature** (et pourquoi cela n'existait pas) : une **grille
discrète occupée**. Pong est un monde continu (balle en flottants, collision balayée) ; la
grille, le serpent-liste-de-cases et la nourriture-sur-case sont un vocabulaire d'état neuf. Ce
que le joueur en voit, c'est la surface libre qui rétrécit — le sujet même du jeu.

Ce qu'il ne voit pas et qui doit se justifier : le générateur pseudo-aléatoire **seedé** du spawn.
Justification observable : sans lui, deux parties identiques divergent et la promesse de replay
disparaît ; son effet visible pour le joueur est « la nourriture réapparaît toujours ailleurs,
jamais dans mon corps ».

## 2. CE QUE LE JOUEUR FAIT

Le joueur appuie sur quatre flèches, sur une touche de pause et sur une touche de relance. C'est
tout. Son geste traverse une chaîne **identique dans sa forme** à celle de Pong, mais réécrite en
GDScript : `Node d'entrée → traduction pure vers une action normalisée → tick pur → état`.

- **Il tourne.** La touche brute Godot (`InputEvent`) est captée par l'adaptateur, jamais par la
  logique. La logique reçoit une action d'un **vocabulaire fermé** (quatre directions cardinales) ;
  toute entrée inconnue, nulle ou simultanée retombe sur « garde la direction courante ». Patron
  vérifié : `games/pong/05_SYSTEMS/input/input.mjs` (`translate(raw)`, `dirFor(raw)`,
  neutralisation du haut+bas simultané). Le joueur ne peut pas casser le jeu au clavier.
- **Il ne peut pas se suicider par erreur.** Le demi-tour est refusé **dans la logique pure**,
  comparé à la dernière direction EFFECTUÉE. Marteler la flèche opposée ne produit rien de visible.
- **Il mange.** La tête entre sur la case de la nourriture ; au **même tick**, le corps gagne un
  segment et le chiffre du score change. Le joueur agit sur un état, jamais sur un nœud de scène.
- **Il met en pause, et il reprend exactement où il en était.** La pause est un **statut de la
  machine à états**, pas un gel d'horloge de présentation : à la reprise, exactement un tick est
  appliqué, sans rattrapage. Le joueur ne meurt jamais « pendant » sa pause.
- **Il rejoue en un geste.** Aucun état de la partie précédente ne fuit — à l'exception **nommée**
  du meilleur score, qui vit hors de l'état de partie.
- **Il ferme l'application et retrouve son record.** Le meilleur score est écrit dans un fichier
  `user://` du moteur. Si ce fichier est absent, vide, corrompu ou non inscriptible, le jeu démarre
  quand même avec un record de 0 : la dégradation est silencieuse côté joueur, journalisée côté
  debug.
- **Il quitte, et ça se voit.** Patron vérifié :
  `games/pong/06_RUNTIME/adapters/presentation/exit.mjs` — `requestExit` renvoie `{stopped:true}`
  au lieu de se fier à une fermeture qui n'a pas lieu, et l'appelant produit l'effet observable.
  La leçon (« un bouton inerte est un défaut ») se transporte intégralement ; le code, non : en
  Godot la sortie est `get_tree().quit()`, une API de moteur qui n'a rien de commun avec le
  navigateur.

Ce que le joueur **ne fait pas** : il ne se connecte à rien, ne configure rien, n'installe aucun
plugin. La seule donnée qui survit est **un entier**.

## 3. CE QUE LE JOUEUR RESSENT

La sensation visée est la tension d'un espace qui se referme **pendant que le tempo monte**. Vue
par l'architecte, elle est produite par quatre propriétés du dépôt, pas par du polish.

- **Un tempo lisible qui accélère sans devenir injouable.** La période de tick part d'une constante
  nommée et descend par paliers jusqu'à un plancher nommé — jamais en dessous. Cette bande est
  **dérivable des constantes**, donc vérifiable sans lancer le jeu : c'est exactement le patron
  qu'a produit la douleur du playtest Pong, `ballCrossingTimeSeconds()` dans
  `games/pong/05_SYSTEMS/game_loop/loop.mjs` (vérifié — fonction pure traduisant des constantes en
  secondes) avec sa preuve `games/pong/07_TESTS/unit/playable_speed.test.mjs` (vérifié). Snake
  généralise : Pong vérifiait **une** valeur, Snake vérifie **une bande** et **des seuils**.
- **Une réponse immédiate et honnête.** Parce que la logique est pure et que l'adaptateur ne fait
  que lire l'état, il n'existe aucun endroit où une entrée puisse être avalée par le rendu. La
  leçon mesurée du studio est explicite (`docs/forge/FORGE_ARCHITECT_MANUAL_V1.md` §3.1) : sur
  Pong, les systèmes purs tuaient 95 % des mutants, les adaptateurs 0 %. Ce que le joueur ressent
  comme fiabilité est exactement la portion de code que l'oracle protège.
- **Une mort qui a une cause lisible.** La collision est calculée dans la logique pure sur des
  **cases entières** (`Vector2i`) : pas d'arrondi, pas de tunneling, pas de « j'ai touché ou pas ».
  Pong avait dû inventer une collision **balayée** (`stepBall`, interpolation de franchissement de
  plan) parce que son monde est continu. Le charter v2 maintient ce rejet : il n'y a rien à
  interpoler entre deux cases adjacentes. C'est la seule zone où « réutiliser Pong » serait une
  erreur d'architecte, et elle est nommée comme telle.
- **Une progression qui a une mémoire.** Le chiffre qui monte, la grille qui se remplit, la cadence
  qui accélère, et un record qui survit à la fermeture de l'application. C'est délibérément **la
  plus petite mémoire possible** : un entier, hors de l'état de partie, sans influence sur aucune
  règle. Pas de déblocages, pas de collection, pas d'économie — la boucle longue est « refaire
  mieux ».

## 4. RÈGLES OBSERVABLES

Convention : chaque règle porte son **tag de critère charter v2** (majuscules exactes de
`criteres_succes[]` ou de `criteres_demo[]`), sur **une seule ligne**, et son typage de brique —
`CODE:<chemin vérifié>` · `CONCEPT:<chemin vérifié, source du concept>` · `NEW` (5 questions IKEA,
`docs/forge/FORGE_ARCHITECT_MANUAL_V1.md` §6).

### 4.1 Briques CODE — code Godot réellement importable (vérifié existant)

- **R1** — Le bot qui prouve la solvabilité se déplace par un **BFS déterministe en grille** dont
  l'ordre de voisins est fixe et l'exploration bornée, importé tel quel par `preload`, jamais
  réécrit.
  Tag charter : `SOLVABILITE PROUVEE` · `REUTILISATION NOMMEE AVANT PRODUCTION`.
  `CODE: knowledge_base/systems/navigation/grid_nav.gd` (vérifié — `extends RefCounted`,
  `DIRECTIONS` en ordre fixe nord/est/sud/ouest, `MAX_CELLS_EXPLORED := 10000` partagée par les
  deux BFS, `static func next_step` / `path_length` / `next_step_expansions` ; catalogué
  `brick_id: sys-grid-nav-m01`, `runtime: godot` dans `knowledge_base/catalog.json`, vérifié).
  **Précédent d'import réel dans le dépôt** : `games/grid_nav_probe/core/grid_nav.gd` (vérifié,
  copie de la brique) est `preload("res://core/grid_nav.gd")` par trois fichiers —
  `trial.gd:7`, `solvability.gd:43`, `tests/run_tests.gd:6` (vérifié). **Le rejet v1 de cette
  brique (« GDScript, cible navigateur ») tombe avec D1.**

- **R2** — Les tests de la logique pure s'exécutent dans un **harnais headless GDScript** déjà
  éprouvé par deux jeux du dépôt, pas dans un harnais inventé pour ce run.
  Tag charter : `TESTS A MUTATION FORTS` · `PREUVE MECANIQUE FOURNIE`.
  `CODE: games/chess_tcg/tests/run_tests.gd` (vérifié) · `CODE: games/grid_nav_probe/tests/run_tests.gd`
  (vérifié) · `CODE: knowledge_base/systems/navigation/run_tests.gd` (vérifié, 15 356 octets).
  Le harnais s'exécute `godot --headless` : c'est légitime pour la **mécanique**, et interdit pour
  la preuve **visuelle** (R9).

- **R3** — L'oracle de solvabilité n'est pas écrit pour Snake : c'est l'outil de la Forge, avec sa
  doctrine « aucune preuve n'est pas une preuve » (`trials <= 0` → BLOCKED, jamais OK).
  Tag charter : `SOLVABILITE PROUVEE` · `PREUVE MECANIQUE FOURNIE`.
  `CODE: scripts/forge/solvability_godot.mjs` (vérifié — `runSolvability(cfg, trialFn)` pure,
  `won === trials` → OK, exception d'essai → BLOCKED, vocabulaire OK/FAIL/BLOCKED) ·
  `CODE: knowledge_base/systems/adapters/godot_trial.mjs` (vérifié — contrat de sortie
  `FORGE_TRIAL <json>` avec `{succeeded, ticks}`, un seul reçu toléré) ·
  `CODE: scripts/forge/godot_bin.mjs` + `scripts/forge/godot.config.json` (vérifiés — binaire
  Godot 4.6.3 résolu par configuration, jamais en dur). Gabarit du script côté jeu :
  `CODE: games/grid_nav_probe/solvability.gd` (vérifié — boucle pas-à-pas explicite, `succeeded`
  seulement si la sortie est réellement atteinte, et distinction documentée entre `solvability.gd`
  qui prouve la **gagnabilité** et `trial.gd` qui mesure une **bande de difficulté**).

- **R4** — Un seul oracle maître enchaîne mécanique puis solvabilité, et sort vert **uniquement**
  si les deux le sont.
  Tag charter : `PREUVE MECANIQUE FOURNIE` · `SOLVABILITE PROUVEE`.
  `CODE: scripts/forge/godot_oracle.mjs` (vérifié — `res://tests/run_tests.gd` puis
  `res://solvability.gd`, `SOLVABILITY_TRIALS = 50`, exit 1 dès le premier rouge, binaire résolu
  par `resolveGodotBin()`). **Conséquence d'architecture pour Snake** : les chemins
  `tests/run_tests.gd` et `solvability.gd` à la racine du projet Godot sont une **convention
  imposée par l'oracle**, pas un choix de goût.

- **R5** — Le gate mutation sait juger du GDScript : les mutants sont générés sur les opérateurs
  réellement écrits en `.gd`, et les survivants sont triés avec une justification nommée.
  Tag charter : `TESTS A MUTATION FORTS`.
  `CODE: scripts/forge/mutation.py` (vérifié — `_WORD_RULES` couvre `and`/`or`/`true`/`false` avec
  frontière de mot, `_EQ_RULES` couvre `==`/`!=` sans casser un `===` JS, et
  `comment_prefixes_for()` ajoute `#` pour `.gd` — correctif explicitement motivé : sans lui,
  « muter un `.gd` ne produisait presque aucun mutant : gate mutation édenté »). Gabarit de triage :
  `CODE: games/grid_nav_probe/mutation_triage.json` (vérifié — deux survivants `true->false`
  justifiés par **lecture du garde**, avec la note « les tests passent quand même » explicitement
  rejetée comme argument circulaire). C'est le standard de triage que Snake doit tenir.

- **R6** — L'oracle d'architecture statique **comprend** les dépendances GDScript : il lit les
  `preload`/`load` et les `extends`, donc « la logique pure n'importe aucune scène ni script de
  présentation » est vérifiable mécaniquement dès le premier fichier.
  Tag charter : `LOGIQUE SEPAREE DU RENDU`.
  `CODE: scripts/forge/static_oracles.py` (vérifié — `SOURCE_EXTS` contient `.gd`,
  `_GD_LOAD = (?:preload|load)\(...`, `_GD_EXTENDS`, `_GD_DEF`, `_GD_CLASSNAME`, `_GD_SIGNAL`,
  consommés par `check_architecture(blueprint, src_root)`). **Point d'architecture** : le blueprint
  doit déclarer les `deps_interdites` AVANT le code — c'est ce qui rend la règle exécutable, pas
  déclarative.

### 4.2 Briques CONCEPT — patrons Pong réécrits pour Godot (aucun `.mjs` importé)

Le charter v2 range en `hors_scope` la « réutilisation par COPIE DE CODE des fichiers `.mjs` de
`games/pong/` » et en `actions_interdites` la copie « maquillée en réutilisation ». Les chemins
ci-dessous sont donc cités comme **SOURCE DU CONCEPT** : ils se lisent, ils ne s'importent pas.
`games/pong/` reste par ailleurs **gelé** (témoin de régression, décision Pierre 2026-07-27).

- **R7** — Un tick est une fonction **pure** `(état, action) → {état, événements}` : aucune I/O,
  aucun temps réel, aucun aléa non seedé, aucune mutation de l'entrée, et une partie terminée est
  un état figé qui ne produit plus d'effet.
  Tag charter : `LOGIQUE SEPAREE DU RENDU` · `CROISSANCE ET SCORE AU MEME TICK`.
  `CONCEPT: games/pong/05_SYSTEMS/game_loop/loop.mjs` (vérifié — `export function step(state, action)`
  renvoie `{state, events}` ; garde-fou déclaré en tête de fichier ; retour `{state, events: []}`
  quand la partie est finie). Réécrit en GDScript : la logique pure `extends RefCounted`
  (jamais `Node`), et l'événement est un `Dictionary` de données, pas un signal de scène.

- **R8** — La séparation logique / présentation est **déclarée avant d'écrire le code**, avec des
  dépendances à sens unique et explicites.
  Tag charter : `LOGIQUE SEPAREE DU RENDU` · `ARCHITECTURE EXTENSIBLE PROUVEE`.
  `CONCEPT: games/pong/09_WIREMAP/wiremap.json` (vérifié — `systems[]` déclare `game_loop`,
  `input`, `game_state` en `category: "system"` avec `allowed_deps` explicites, et `presentation`
  en `category: "system.adapter"` dépendant de `game_state`). Transposition Godot : `system` =
  scripts `RefCounted` sans arbre de scène ; `system.adapter` = `Node`/`Node2D` qui **lit** l'état.

- **R9** — La preuve visuelle passe par le **runtime réel** du moteur, avec une fenêtre GPU
  réelle ; une image produite en `--headless` n'est pas une preuve de rendu.
  Tag charter : `PREUVE PAR LECTEUR REEL`.
  `CONCEPT: games/pong/06_RUNTIME/adapters/presentation/godot/main.gd` (vérifié — `extends Node2D`,
  lit un état JSON passé en argument, dessine, capture, quitte ; **aucune physique, aucune règle**).
  Ce fichier est du GDScript, donc techniquement copiable — il est classé **CONCEPT** et non CODE
  parce que son contenu est intégralement spécifique à Pong (`FIELD_W`, `PADDLE_H`, `P1_X`…) : ce
  qui se transporte est la discipline « le renderer ne décide de rien », pas ses constantes.
  Contrainte de poste mesurée le 2026-07-22 et reprise dans le charter : `--headless` rend une
  texture nulle ; il faut `--rendering-driver vulkan` et une fenêtre positionnée hors écran.

- **R10** — L'état de jeu est un objet simple à **statuts gelés, mutuellement exclusifs et
  exhaustifs**, validable structurellement à tout instant et reconstructible à l'identique depuis
  une graine.
  Tag charter : `CONDITION DE FIN ET PROGRESSION MESURABLE` · `DETERMINISME PROUVE PAR REPLAY`.
  `CONCEPT: games/pong/05_SYSTEMS/game_state/state.mjs` (vérifié — `STATUS` figé par
  `Object.freeze`, `isValidStatus`, `isValidState`, `endStatus`, `initialState(seed)`). Snake porte
  **quatre** statuts et non trois — EN COURS · EN PAUSE · PERDU · GAGNÉ — conséquence directe de la
  révision v2 du Prisme (pause conservée, D5) et de la condition de victoire (D2).

- **R11** — Toute entrée brute passe par une traduction pure à **vocabulaire fermé** : entrée
  nulle, hors domaine, répétée ou contradictoire ne casse jamais l'état ; le demi-tour est refusé
  dans la logique, jamais dans l'adaptateur.
  Tag charter : `DEMI-TOUR REFUSE` · `DIRECTION REACTIVE`.
  `CONCEPT: games/pong/05_SYSTEMS/input/input.mjs` (vérifié — `translate(raw)`, `dirFor(raw)`,
  neutralisation du haut+bas simultané, `clampPaddle`). Réécriture Godot : l'adaptateur traduit un
  `InputEvent` en action normalisée ; la logique ne connaît ni touche ni `Input`.

- **R12** — La partie se termine sur un **état final explicite** et se relance en un geste, depuis
  un contrôleur qui ne connaît pas la présentation — donc prouvable hors interface.
  Tag charter : `MORT LISIBLE` · `REJOUER EN UN GESTE`.
  `CONCEPT: games/pong/06_RUNTIME/adapters/presentation/browser/main.mjs` (vérifié —
  `createController(seed)` expose `tick`/`replay`/`stop`) ; patrons de preuve
  `games/pong/07_TESTS/unit/end_screen.test.mjs` et `games/pong/07_TESTS/unit/restart_offer.test.mjs`
  (vérifiés).

- **R13** — Toute commande de sortie produit un **effet visible** (arrêt de boucle + état final
  affiché), jamais un contrôle inerte.
  Tag charter : `QUITTER OBSERVABLE`.
  `CONCEPT: games/pong/06_RUNTIME/adapters/presentation/exit.mjs` (vérifié — `requestExit` renvoie
  `{stopped:true}` au lieu de se fier à une fermeture qui n'a pas lieu) ; preuve
  `games/pong/07_TESTS/unit/exit_stop.test.mjs` (vérifié). Le code ne se transporte pas (Godot
  utilise `get_tree().quit()`), la leçon si.

- **R14** — Le score est affiché en **chiffres** et le chiffre affiché est comparé mécaniquement à
  l'état interne, jamais constaté à l'œil.
  Tag charter : `SCORE EN CHIFFRES`.
  `CONCEPT: games/pong/06_RUNTIME/adapters/presentation/draw.mjs` (vérifié — `GLYPHS` 3×5,
  `GLYPH_W`, `GLYPH_H`, `textWidth`) ; patron de preuve
  `CONCEPT: games/pong/07_TESTS/unit/score_readout.test.mjs` (vérifié). En Godot, la table de
  glyphes disparaît au profit d'un `Font` du moteur : **c'est la preuve qui se réutilise, pas la
  police**.

- **R15** — La bande de vitesse jouable est **dérivée des constantes par une fonction pure** et
  vérifiée par un test, sur toute la durée d'une partie.
  Tag charter : `BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE` · `VITESSE JOUABLE RESSENTIE`.
  `CONCEPT: games/pong/05_SYSTEMS/game_loop/loop.mjs` (vérifié — `TICK_HZ = 60`,
  `SERVE_CROSS_DIST`, `ballCrossingTimeSeconds(ballVx, tickHz)` dérivée purement des constantes) ;
  patron de preuve `CONCEPT: games/pong/07_TESTS/unit/playable_speed.test.mjs` (vérifié). Valeurs
  propres à Snake, toutes issues de `charter.parametres_de_design` : départ 200 ms/case
  (`vitesse_initiale_ms`, source HTTP 200 via `docs/forge/GENRE_BIBLE_SNAKE_V1_PROPOSED.md` §6.1),
  plancher 80 ms (`periode_plancher_ms`, statut A_EQUILIBRER).

- **R16** — La solvabilité est prouvée par un **bot qui pilote l'entrée publique** et joue une
  partie entière, en vérifiant à chaque tick la validité de l'état — jamais en forçant l'état ; et
  ce bot n'est jamais confondu avec l'expérience du joueur.
  Tag charter : `SOLVABILITE PROUVEE` · `PARTIE SOLO COMPLETE SANS OUTIL`.
  `CONCEPT: games/pong/07_TESTS/oracle/solvability.mjs` (vérifié — `playFullGame`, contrôles
  `allValid` / `exactlyOnePerPoint`) · `CONCEPT: games/pong/07_TESTS/oracle/solo_session.mjs`
  (vérifié — distingue explicitement le **bot de test à latence nulle** de l'expérience joueur,
  exactement la confusion que `actions_interdites` proscrit). L'exécutable, lui, est du CODE : R3.
  Contrainte v2 : la solvabilité se prouve **accélération active**, pas à vitesse initiale gelée.

### 4.3 Briques recherchées et INTROUVABLES (constatées nominativement, jamais supposées)

`GAME_REFERENCE/architecture_guess.md` (§Candidate Reusable Bricks) suppose l'existence de
plusieurs briques génériques dans `knowledge_base/`. Inventaire réel du catalogue au 2026-07-28
(`node -e` sur `knowledge_base/catalog.json`) : **9 briques + 3 rôles**, dont **une seule en
runtime `godot`** (`sys-grid-nav-m01`), les 5 autres briques de système étant `runtime: html`
(`sys-damage-floor`, `sys-reachability`, `sys-pursuer-mobile`, `sys-evader-basic`,
`sys-guardian-zoc`, `sys-pursuer-continuous`) et 3 étant des patterns `.md` `runtime: agnostic`.

- **R17** — Aucune brique `NEW` ne se justifie par « la bibliothèque n'en a pas » sans que
  l'absence soit **constatée nominativement**.
  Tag charter : `REUTILISATION NOMMEE AVANT PRODUCTION`.
  - `INTROUVABLE` — brique **machine à états** générique (EN COURS / EN PAUSE / PERDU / GAGNÉ) :
    absente du catalogue. Le seul exemplaire vivant est l'énumération `STATUS` de Pong (R10),
    en `.mjs`, donc CONCEPT et non CODE.
  - `INTROUVABLE` — brique **bufferisation d'entrée** (modèle Google Snake,
    `GENRE_BIBLE_SNAKE` §6.3) : absente du catalogue.
  - `INTROUVABLE` — brique **minuterie / cadence variable** : absente du catalogue. Rien dans le
    dépôt ne modèle une période de tick qui change au cours d'une partie (Pong a un `TICK_HZ`
    constant, vérifié) — l'accélération est donc `NEW` (R20).
  - `INTROUVABLE` — brique **persistance locale** (sauvegarde `user://`, tolérance à un fichier
    corrompu) : absente du catalogue, et absente de Pong —
    `grep -rln "localStorage\|high_score\|best_score"` sur `games/pong/05_SYSTEMS` et
    `games/pong/06_RUNTIME` renvoie **zéro fichier** (vérifié).
  - `INAPPLICABLE` (existe, mauvais runtime) — `knowledge_base/systems/procgen/reachability.mjs`
    (vérifié, `brick_id: sys-reachability`, `runtime: html`) : BFS 4-connexe pur, cité en v1 comme
    « seule brique applicable ». **Requalifié en v2** : c'est du `.mjs`, la cible est Godot,
    l'import est interdit. Il reste une bonne **référence de conception** — mais R1 le remplace
    avantageusement, puisque `grid_nav.gd` fait le même travail *en GDScript*.

### 4.4 Briques NEW — chacune passée aux 5 questions IKEA

- **R18** — La détection de collision (mur, corps, nourriture) est **exacte sur cases entières**,
  sans seuil ni tolérance, y compris au coin de grille, sur la case du cou et sur la case de queue
  qui vient de se libérer au même tick.
  Tag charter : `COLLISION EXACTE`.
  `NEW` — IKEA : (1) *existe-t-elle ?* non — aucune brique de collision-grille au catalogue, et la
  collision de Pong est **balayée en continu** (`stepBall` dans `loop.mjs`, vérifié), inapplicable
  à une grille discrète ; le charter v2 **maintient ce rejet** explicitement
  (`revisions.revisions_du_prisme`). (2) *l'étendre ?* non — l'adapter reviendrait à supprimer
  l'interpolation, c'est-à-dire tout son contenu. (3) *la simplifier ?* oui, et c'est la forme
  retenue : comparaison de `Vector2i`, aucun flottant. (4) *générique ?* **oui** — « occupation de
  cases + collision discrète » sert Tetris, Sokoban, tout roguelike : candidate au legs (R28).
  (5) *coût futur ?* faible, pure, sans dépendance ; le risque réel est le cas-limite queue/tête,
  couvert par fixtures à valeur stricte.

- **R19** — Le spawn de nourriture est **seedé et reproductible**, et n'apparaît jamais sur une
  case occupée par le corps.
  Tag charter : `DETERMINISME PROUVE PAR REPLAY` · `CROISSANCE OBSERVABLE`.
  `NEW` — IKEA : (1) *existe-t-elle ?* non — aucune brique de générateur pseudo-aléatoire au
  catalogue ; Pong n'en a aucun, son déterminisme vient d'une fonction de parité
  (`serveVx(seed, pointsPlayed)` dans `state.mjs`, vérifié), qui ne produit pas de position ;
  côté Godot, `randi()`/`randf()` non seedés sont explicitement interdits par le charter.
  (2) *l'étendre ?* non, `serveVx` répond à une autre question. (3) *la simplifier ?* oui — un
  générateur entier minimal et un tirage sur la **liste des cases libres**, ce qui rend l'invariant
  « jamais dans le corps » structurel plutôt que testé après coup. (4) *générique ?* oui : « tirage
  seedé sur cases libres » sert tout placement d'entité déterministe. (5) *coût futur ?* faible ;
  le risque est de laisser fuir un aléa de moteur, ce qui casse le replay.

- **R20** — La cadence de tick accélère selon une **règle pure, déterministe et testée sur ses
  seuils** (valeur exacte avant, au, et après chaque palier ; saturation stricte au plancher),
  monotone non croissante en période, et remise à sa valeur initiale à chaque nouvelle partie.
  Tag charter : `ACCELERATION PROGRESSIVE TESTEE`.
  `NEW` — IKEA : (1) *existe-t-elle ?* non, constaté en R17 : le dépôt ne contient aucune cadence
  variable ; `TICK_HZ = 60` de Pong est une constante (vérifié). (2) *l'étendre ?* rien à étendre.
  (3) *la simplifier ?* oui — une fonction pure `période(nombre_de_fruits) → ms`, sans état propre,
  donc testable par table de valeurs et rejouable. (4) *générique ?* oui — « courbe de difficulté
  par palier, bornée » sert tout jeu arcade du curriculum. (5) *coût futur ?* le vrai risque est
  l'équilibrage, pas le code : les trois chiffres (5 fruits / −8 % / 80 ms) sont marqués
  `A_EQUILIBRER` dans `charter.parametres_de_design` et remontés en
  `charter.question_ouverte_humangate` — l'architecture les isole précisément pour qu'ils bougent
  sans toucher une ligne de logique (R22).

- **R21** — La pause est un **statut de la machine à états** : aucun tick pendant la pause, aucun
  rattrapage à la reprise (exactement 1 tick à la première trame), et l'état de partie après
  reprise est strictement et profondément égal à celui d'avant pause, hors indicateur de pause.
  Tag charter : `PAUSE OBSERVABLE ET NEUTRE` · `PAUSE FONCTIONNELLE`.
  `NEW` — IKEA : (1) *existe-t-elle ?* non, mesuré : zéro occurrence de `pause`/`PAUSED` dans
  `games/pong/05_SYSTEMS` et `games/pong/06_RUNTIME` (vérifié). (2) *l'étendre ?* Pong est gelé :
  on le lit, on ne l'étend pas — et il n'y a rien à lire ici. (3) *la simplifier ?* oui — un
  quatrième statut dans l'énumération existante (patron R10), pas un sous-système parallèle ;
  c'est la forme la moins chère et la seule qui rende l'égalité stricte testable.
  (4) *générique ?* oui, immédiatement : tout jeu temps réel du curriculum en a besoin.
  (5) *coût futur ?* faible, **à condition** de ne jamais l'implémenter comme un gel d'horloge de
  présentation — piège explicitement listé dans `charter.actions_interdites`.
  **Note de révision** : cette brique était REJETÉE en v1 par la design review (règle de genre
  « Stop Ability: No ») ; D5 la conserve, et D4 pose que la Genre Bible est une source de
  compréhension et non un motif de rejet.

- **R22** — Tous les paramètres d'équilibrage vivent dans **un seul bloc de constantes nommées** de
  la logique pure ; le nombre de littéraux numériques de gameplay hors de ce bloc est exactement 0,
  et changer l'équilibrage ne touche aucun script de présentation.
  Tag charter : `PARAMETRES DE JEU ISOLES ET NOMMES`.
  `NEW` — IKEA : (1) *existe-t-il ?* **non, mesuré** — Pong disperse ses constantes de gameplay sur
  **deux** fichiers : `BALL_VX`, `BALL_VY`, `PADDLE_SPEED`, `WIN_SCORE`, `FIELD_W/H` dans
  `state.mjs` et `TICK_HZ`, `SERVE_CROSS_DIST` dans `loop.mjs` (vérifié). Le patron existe donc à
  moitié et **échouerait au critère v2**. (2) *l'étendre ?* c'est exactement l'extension : un bloc
  unique au lieu de deux dispersions. (3) *la simplifier ?* oui — des constantes nommées, pas un
  fichier de configuration chargé au runtime (qui réintroduirait de l'I/O dans la logique pure).
  (4) *générique ?* oui, et c'est le socle de l'extensibilité prouvée (R24). (5) *coût futur ?*
  nul en code ; le coût est disciplinaire, et il est **vérifiable mécaniquement** (comptage des
  littéraux hors bloc), donc il ne repose pas sur la bonne volonté.

- **R23** — Le meilleur score est persisté dans un fichier `user://` du moteur, vit **hors de
  l'état de partie**, n'influence aucune règle, et un fichier absent / vide / corrompu / non
  inscriptible fait démarrer le jeu avec un record de 0 sans exception non gérée.
  Tag charter : `MEILLEUR SCORE PERSISTANT ET ETANCHE` · `SAUVEGARDE DU MEILLEUR SCORE`.
  `NEW` — IKEA : (1) *existe-t-elle ?* non, mesuré (R17) : aucune brique de persistance au
  catalogue, aucune trace de sauvegarde dans Pong. (2) *l'étendre ?* rien à étendre.
  (3) *la simplifier ?* oui, jusqu'au minimum absolu : **un entier**, un fichier, un module de
  logique pure `charger()/enregistrer()` dont l'I/O est confinée dans un adaptateur — la logique
  pure ne touche jamais `FileAccess`. (4) *générique ?* oui — « une valeur de progression étanche
  hors état de partie » est le squelette de toute sauvegarde future. (5) *coût futur ?* **c'est la
  brique la plus dangereuse du run** : elle affaiblit un test strict (« aucun état ne survit à une
  relance »). Le prix est payé explicitement — l'oracle de non-fuite porte **une exception NOMMÉE**,
  et toute autre survivance reste un FAIL. Une exception nommée est vérifiable ; une exception
  implicite serait un trou.

- **R24** — L'architecture est prouvée extensible **mécaniquement, pas déclarativement** :
  (a) changer une valeur du bloc de paramètres modifie le comportement observable sans toucher un
  autre fichier ; (b) les événements de tick (nourriture mangée, palier franchi, fin de partie)
  sont émis comme **données** consommables par un observateur externe, et un observateur de test
  s'y branche réellement sans que la logique connaisse son existence ; (c) aucun script de logique
  pure ne référence une dimension de grille, une touche ou un nom de scène en dur.
  Tag charter : `ARCHITECTURE EXTENSIBLE PROUVEE`.
  `NEW` (le **dispositif de preuve** est neuf ; le patron d'événements ne l'est pas) — IKEA :
  (1) *existe-t-il ?* le patron d'émission d'événements existe et est vérifié —
  `CONCEPT: games/pong/05_SYSTEMS/game_loop/loop.mjs`, où `step()` renvoie `{state, events}` et
  pousse des `{type: 'bounce', wall: 'top'}` (vérifié) ; ce qui n'existe nulle part, c'est un
  **observateur branché** qui prouve que le canal est utilisable. (2) *l'étendre ?* oui, et c'est
  la voie retenue : mêmes événements-données, plus un consommateur de test. (3) *le simplifier ?*
  oui — une liste de dictionnaires retournée par le tick, **pas** de bus d'événements global, pas de
  signal Godot dans la logique pure (ce serait une API de moteur, interdite par le charter).
  (4) *générique ?* oui : c'est le point de branchement où viendront plus tard la télémétrie,
  l'équilibrage et la progression — les trois systèmes que la règle de wiremap de Pierre demande de
  **pouvoir accueillir sans les construire**. (5) *coût futur ?* faible ; le risque nommé est
  l'inverse — construire ces trois systèmes maintenant, ce que `hors_scope` interdit.

- **R25** — Le jeu expose un **point d'observation de debug** lisible par l'oracle depuis le
  runtime réel du moteur : longueur, score, meilleur score, position tête, position nourriture,
  période de tick courante, statut (en cours / en pause / perdu / gagné), plus une commande de
  relance.
  Tag charter : `CONTRAT DE JOUABILITE RESPECTE` · `PREUVE PAR LECTEUR REEL`.
  `NEW` — IKEA : (1) *existe-t-il ?* non pour Godot dans un jeu du dépôt ; ce qui existe est le
  **contrat de reçu** de la Forge, une ligne stdout `FORGE_TRIAL <json>`
  (`CODE: knowledge_base/systems/adapters/godot_trial.mjs`, vérifié) — suffisant pour un essai de
  bot, insuffisant pour lire l'état d'une partie humaine en cours. (2) *l'étendre ?* oui, et c'est
  la forme retenue : le même style de reçu ligne-à-ligne, élargi aux champs ci-dessus, plutôt
  qu'un protocole neuf. (3) *le simplifier ?* oui — le hook expose l'état **déjà tenu** par la
  logique pure, sans structure parallèle qui pourrait diverger. (4) *générique ?* **oui, et c'est
  le legs le plus précieux de ce run** : c'est le contrat qui rend n'importe quel jeu Godot du
  studio lisible par un lecteur réel (règle d'usine n°1 : une preuve sans lecteur n'existe pas).
  (5) *coût futur ?* une surface de debug exposée dans le build — à assumer explicitement, c'est le
  prix de la preuve.
  **Existant cité, non fondateur** : `scripts/forge/adapters/godot/` (vérifié : `launch.mjs`,
  `collect.mjs`, `checks.mjs`, `mission.mjs`, `workspace.mjs`, `harness/harness.gd`) et
  `fixtures/godot_b0/` (vérifié) construisent un adaptateur de lancement Godot pour la Forge —
  **SESSION_PARALLELE, sort non arbitré**. Aucune règle de ce document n'en dépend ; si cette
  session est ratifiée, R25 devra être confronté à son contrat de harnais avant l'étape wiremap.

- **R26** — Chaque bloc de la wiremap porte `REUSED_FROM:` **typé** (`CODE:` / `CONCEPT:` / `NEW`)
  et `OBSERVABLE_BY_PLAYER:` **dès sa rédaction**, avant toute ligne de code de production.
  Tag charter : `REUTILISATION NOMMEE AVANT PRODUCTION` · `OBSERVABLE PAR LE JOUEUR DES LA WIREMAP`.
  `NEW` (champ, pas code) — IKEA : (1) *existe-t-il ?* **non, mesuré** — la wiremap de Pong contient
  **0 champ `reused_from` sur 15 lignes** et `observable_by_player` sur **6 lignes sur 15**
  (`node -e` sur `games/pong/09_WIREMAP/wiremap.json`, vérifié). Snake est le **premier** jeu du
  dépôt à instrumenter la mesure décrite au manuel §5. (2) *l'étendre ?* le schéma de wiremap
  existe et accepte des champs — c'est une extension de format, pas un format neuf.
  (3) *le simplifier ?* deux champs, un typage à trois valeurs, aucun sous-schéma.
  (4) *générique ?* oui, par construction — et le **typage** est ce qui rend la réutilisation
  mesurable quand le moteur cible diffère de celui de la brique source (D1). (5) *coût futur ?* le
  dépôt aura **deux générations de wiremap** (Pong gelé sans ces champs, Snake avec) : écart à
  assumer, pas à masquer.

- **R27** — Toute métrique introduite pour décrire la **pression spatiale** (taux d'occupation,
  marge de manœuvre, difficulté ressentie de l'accélération) prouve d'abord sa variance
  (≥ 2 valeurs distinctes non triviales sur échantillon) ou est renommée d'après ce qu'elle mesure
  réellement.
  Tag charter : `VARIANCE PROUVEE AVANT USAGE`.
  `NEW` (protocole, pas code) — IKEA : (1) *existe-t-il ?* le protocole est une règle ratifiée
  (2026-07-21, leçon grid-navigator : une métrique de « bande de difficulté » qui mesurait en fait
  le plus court chemin), pas une brique de code. (2) *l'étendre ?* oui — l'appliquer ici est
  l'usage prévu, et le charter v2 le cite nommément. (3) *le simplifier ?* mesurer sur les parties
  déjà jouées par le bot de solvabilité (R16), sans échantillonnage dédié. (4) *générique ?* oui.
  (5) *coût futur ?* nul si la métrique reste **advisory** ; élevé si elle se met à piloter
  l'accélération sans preuve — c'est précisément le piège que la leçon nomme, et le risque monte
  en v2 puisque le jeu a désormais une courbe de difficulté à calibrer.

### 4.5 Stack, données, API — les matériaux (checklist `technique_stack`, `technique_api`, `technique_data`)

- **R28** — Le jeu s'exécute **hors ligne**, comme une application de bureau Godot 4.x, sans
  plugin tiers, sans addon, sans asset store, sans paquet réseau, et sans aucun asset importé
  (rendu par primitives du moteur).
  Tag charter : `PREUVE PAR LECTEUR REEL`.
  Tracé par `charter.plateforme_cible` (« MOTEUR GODOT (4.x), application de bureau exécutable
  hors-ligne », `provenance.plateforme_cible` = SOURCE_PIERRE_DIRECTE, D1) et par l'interdit
  explicite « Introduire une dépendance externe runtime » (`charter.actions_interdites`).
  `CODE: scripts/forge/godot.config.json` (vérifié — binaire Godot 4.6.3 du poste, résolu par
  configuration et non en dur ; `scripts/forge/godot.config.example.json` existe pour un autre
  poste, vérifié).
  Réponses de checklist : `stack.moteur` = **Godot 4.x**, tracé au charter, décision Pierre D1 du
  2026-07-28 (le fog v1 « cible navigateur, TRACE_INDIRECTE » est **CLOS**) ;
  `stack.librairies` = **aucune librairie tierce** — donc aucune licence à évaluer, aucun risque
  d'abandon, aucune communauté à auditer ; la seule dépendance est le moteur lui-même (MIT, moteur
  déjà en usage dans le dépôt : `games/chess_tcg/`, `games/grid_nav_probe/`, vérifiés).
  `api.besoin` = **N/A, le local suffit** (jeu solo, hors-ligne, aucun réseau) ; en conséquence
  `api.contrat` = **N/A, aucune API**.
  **GAP signalé pour la recombinaison `merge_prisme`** : aucun tag de `criteres_succes[]` ne couvre
  directement la stack ; cette règle est tracée au champ `plateforme_cible` et aux
  `actions_interdites`, pas à un critère.

- **R29** — **Une seule donnée persiste** entre deux ouvertures de l'application : le meilleur
  score, un entier, dans un fichier `user://` du moteur — hors de l'état de partie, sans influence
  sur aucune règle, et tolérant à un fichier absent, vide, corrompu ou non inscriptible.
  Tag charter : `MEILLEUR SCORE PERSISTANT ET ETANCHE`.
  Réponses de checklist : `data.persistance` = **oui, minimale** — un entier, format de sauvegarde
  trivial (un fichier `user://` du moteur), périmètre fixé par D5 ; la persistance **serveur**
  (backend, base de données, comptes, leaderboard en ligne) reste explicitement `hors_scope`.
  `data.migration_offline` = **migration N/A** (une seule clé, aucun schéma à faire évoluer ; un
  fichier illisible est traité comme absent, ce qui est la stratégie de migration la moins chère
  et la plus testable) ; **offline = oui**, c'est le mode nominal et le seul (R28).
  **Révision v2** : la v1 répondait « N/A, aucune donnée persistée » aux deux items — réponse
  devenue fausse avec D5.

- **R30** — Les dépendances vont dans **un seul sens** : `logique pure → rien` ;
  `adaptateur → logique pure` ; aucun cycle. Un script de logique pure qui hérite d'un `Node` ou
  qui appelle `get_node`, `Input`, `InputEvent`, `Viewport`, `CanvasItem`, `_draw`, `_process`,
  `_physics_process`, `Timer`, `OS`, `Time`, `randi`/`randf` non seedé est un **échec**, pas un
  avertissement.
  Tag charter : `LOGIQUE SEPAREE DU RENDU`.
  `CONCEPT: games/pong/09_WIREMAP/wiremap.json` (vérifié — catégories `system` / `system.adapter`
  avec `allowed_deps` explicites) · vérificateur `CODE: scripts/forge/static_oracles.py`
  (`check_architecture`, lecture réelle des `preload`/`load`/`extends` GDScript, vérifié). Snake
  déclare ces catégories **avant** d'écrire le code, ce qui rend l'oracle applicable dès le premier
  fichier.

### 4.6 Mesure de la réutilisation — l'instrument, et le défaut mesuré qu'il faut connaître

- **R31** — Le taux de réutilisation est rapporté **par type et en valeurs brutes**
  (numérateur/dénominateur pour `CODE`, `CONCEPT` et `NEW` **séparément**), comme un fait, jamais
  agrégé en un chiffre unique ni transformé en note de performance.
  Tag charter : `TAUX DE REUTILISATION MESURE ET RAPPORTE`.
  `CODE: scripts/forge/reuse_ratio.mjs` (vérifié — `measureReuseRatio`, parcours récursif,
  `LOGIC_EXTENSIONS = {'.mjs', '.gd'}`, exclusion des harnais et des tests, plus une extension
  `cross_game` datée du 2026-07-28 qui résout mécaniquement les imports relatifs vers
  `games/<autre-jeu>/`).
  **Défaut mesuré, aggravé par le changement de cible — à remonter en fog HumanGate avant de
  s'appuyer sur le chiffre** : la fonction `extractImportSpecifiers` (vérifiée, l.82) n'extrait que
  les specifiers **ES** (`/\bfrom\s+["']([^"']+)["']/g`). GDScript ne s'importe pas comme ça : il
  utilise `preload("res://…")` / `const X = preload(...)`. Conséquence prouvée par exécution sur le
  seul jeu Godot forgé du dépôt :
  `node scripts/forge/reuse_ratio.mjs games/grid_nav_probe` →
  `reuse_ratio = 0 / (4 + 0) = 0.000`, `imports: []` — **alors que ce jeu contient trois `preload`
  réels de la brique de bibliothèque** (`trial.gd:7`, `solvability.gd:43`, `tests/run_tests.gd:6`,
  vérifiés) et que `core/grid_nav.gd` est une copie de `knowledge_base/systems/navigation/grid_nav.gd`.
  Autrement dit : **sur cible Godot, l'instrument mesure 0 par construction, quelle que soit la
  réutilisation réelle**. La v1 signalait déjà un angle mort (imports relatifs classés `local`,
  `reuse_ratio = 0.000` sur Pong) ; en v2 le trou est plus large — il ne s'agit plus d'un mauvais
  classement mais d'une **absence totale d'extraction**.
  Deux voies, **décision Pierre** : (a) apprendre à `extractImportSpecifiers` à lire
  `preload`/`load` GDScript — le lecteur existe déjà ailleurs dans le dépôt et pourrait servir de
  référence (`_GD_LOAD` dans `scripts/forge/static_oracles.py`, vérifié) ; (b) compter la
  réutilisation depuis le champ `REUSED_FROM` **typé** de la wiremap (R26) plutôt que depuis les
  imports — seule voie capable de compter un `CONCEPT`, qui par définition ne laisse **aucune**
  trace d'import. La règle d'usine n°4 s'applique : *un nom de preuve est la promesse exacte de ce
  qui est mesuré*. Aujourd'hui `reuse_ratio` mesure « imports ES depuis la bibliothèque », pas
  « réutilisation » — et l'objectif industriel du charter v2 (« MESURER la capacité de l'usine à
  réutiliser ») n'est **pas couvert** par l'instrument en l'état.

### 4.7 Ce que Snake doit LÉGUER à la bibliothèque (propose-only, ratification Pierre)

Le charter place toute promotion vers `knowledge_base/` en `hors_scope` : ce qui suit est une
**proposition de legs**, pas une écriture.

- **R32** — Chaque système produit par ce run est évalué sur sa réutilisabilité par le **jeu
  suivant** du curriculum, et le candidat au legs est nommé **avant** la production, pas après.
  Tag charter : `REUTILISATION NOMMEE AVANT PRODUCTION`.
  Candidats, par ordre de valeur pour le studio :
  1. **Grille discrète + collision sur cases entières** (issu de R18), en GDScript — comble une
     absence constatée en R17 et rejoint `sys-grid-nav-m01` pour former un noyau « jeux de grille
     Godot » ; sert Tetris, Sokoban, tout roguelike du curriculum.
  2. **Contrat de point d'observation de debug pour jeu Godot** (issu de R25) → n'est pas du code
     de jeu mais un **standard de dépôt** : la condition pour qu'un lecteur réel prouve n'importe
     quel jeu Godot du studio.
  3. **Cadence à paliers bornée + bloc de paramètres isolés** (issus de R20 et R22) → l'ossature
     d'équilibrage réutilisable par tout jeu arcade, et le socle de l'extensibilité prouvée (R24).
  4. **Tirage seedé sur cases libres** (issu de R19) → tout placement d'entité déterministe.
  5. **Persistance locale étanche à exception nommée** (issu de R23) → le squelette minimal de
     toute sauvegarde future, avec son oracle de non-fuite.
  6. **Patron de wiremap portant `REUSED_FROM` typé et `OBSERVABLE_BY_PLAYER`** (issu de R26) →
     l'instrument qui rend le legs mesurable au run suivant, et la seule voie connue pour compter
     un `CONCEPT`.
  Ce que Snake **ne doit pas** léguer : son rendu et ses dimensions de grille (spécifiques), et son
  bot de solvabilité (outil de test, jamais confondu avec l'expérience joueur —
  `charter.actions_interdites`).

---

### Réponses directes aux items `lens: [archidepot]` de la checklist

| item | réponse | renvoi |
|---|---|---|
| `archi.systemes_separes` | oui — logique pure `RefCounted` vs adaptateurs `Node`, vérifiable par oracle statique GDScript | R7, R8, R30, R6 |
| `archi.dependances_sens_unique` | oui — déclaré en wiremap avant le code, vérifié sur les `preload`/`extends` réels | R30, R6 |
| `archi.brique_existante` | oui : **6 briques CODE** (R1-R6) + **10 briques CONCEPT** (R7-R16) ; non : **10 briques NEW** (R18-R27), chaque absence constatée nominativement | R17, R18-R27 |
| `archi.reutilisable` | oui — 6 candidats au legs nommés avant production | R32 |
| `api.besoin` | N/A — jeu solo hors-ligne, aucune API | R28 |
| `api.contrat` | N/A — aucune API | R28 |
| `data.persistance` | oui, minimale — un entier (meilleur score) en fichier `user://`, hors état de partie ; persistance serveur hors_scope | R23, R29 |
| `data.migration_offline` | migration N/A (une seule clé ; fichier illisible traité comme absent) ; offline = oui, mode nominal et unique | R28, R29 |
| `stack.moteur` | **Godot 4.x** desktop, tracé `charter.plateforme_cible` / `provenance.plateforme_cible` (SOURCE_PIERRE_DIRECTE, D1) | R28 |
| `stack.librairies` | aucune librairie tierce — seule dépendance : le moteur, déjà en usage dans le dépôt | R28 |

### Points remontés en fog HumanGate (hors décision d'agent)

1. **`reuse_ratio.mjs` est aveugle au GDScript** : il n'extrait que les imports ES, jamais
   `preload`/`load`. Mesuré : `reuse_ratio = 0.000` sur `games/grid_nav_probe`, qui contient
   pourtant 3 `preload` réels de la brique de bibliothèque. Sur cible Godot, l'instrument mesure
   0 par construction — R31. Deux voies proposées, aucune choisie par l'agent.
2. **Aucun instrument ne sait compter un `CONCEPT`** : par définition il ne laisse aucune trace
   d'import. Le seul porteur possible est le champ `REUSED_FROM` typé de la wiremap (R26) — donc
   le typage CODE/CONCEPT/NEW imposé par D1 n'a **aucun lecteur mécanique** aujourd'hui. C'est
   exactement le mode de panne « déclaré ≠ exécuté » que le charter nomme lui-même.
3. **Session parallèle non arbitrée** : `scripts/forge/adapters/godot/` (8 modules + `harness/harness.gd`)
   et `fixtures/godot_b0/` existent et visent le même territoire que R25 (lancement Godot,
   collecte de preuve, harnais). **SESSION_PARALLELE, sort non arbitré** — aucune règle de ce
   document ne s'y appuie ; leur ratification éventuelle devra être confrontée à R25 avant s4/s5.
4. **Le dépôt aura deux générations de wiremap** (Pong gelé sans `REUSED_FROM`, Snake avec le champ
   typé) — écart assumé, R26.
5. **Chiffres d'accélération et cible de victoire non ratifiés** (5 fruits / −8 % / 80 ms ;
   longueur 25) : statut `A_EQUILIBRER` dans `charter.parametres_de_design`, déjà remontés en
   `charter.question_ouverte_humangate`. L'architecture les isole (R22) pour qu'ils bougent sans
   toucher la logique — mais l'oracle de solvabilité (R3, 50 essais) en dépend directement.

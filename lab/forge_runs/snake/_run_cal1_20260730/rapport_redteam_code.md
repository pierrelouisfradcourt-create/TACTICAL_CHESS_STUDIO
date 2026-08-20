# rapport_redteam_code.md — Snake (snake-cal1-20260730-142335 / s11-redteam-code)

> Red-team CODE **advisory** (contexte aveuglé — je n'ai pas lu les justifications du builder).
> Je CRITIQUE, je ne juge pas le code. Chaque faille cite une **reproduction** exécutable par un
> oracle non-LLM en aval, ou une **ancre statique** déjà vérifiée ici (grep/lecture de fichier).
> Aucune faille n'entre dans `software_verdict` : ce rapport alimente `redteam_advisory`.
>
> Séparation des verdicts :
> - `software_verdict` : je n'exécute aucun oracle (permission run: aucun). Les constats de
>   **couverture manquante** ci-dessous sont des faits **statiques** (grep) → appuyés.
> - `evidence_verdict: MECHANICAL_VALIDATION_ONLY` pour les constats appuyés par une ancre.
> - `claim_verdict: NO_CLAIM_ALLOWED` — je ne CLAIME jamais « le jeu est cassé » : je n'en ai
>   pas la preuve. Je remonte l'**absence de preuve de démarrage produit** en fog → HumanGate.

---

## Ce qui a été cherché ET qui est PROPRE (résultats négatifs — à dire explicitement)

Deux cibles de chasse prioritaires du dispatch se révèlent **saines** ; le red-team le consigne
plutôt que de fabriquer une faille :

- **Délégation creuse entre les deux harnais (`tests/run_tests.gd` racine vs
  `07_TESTS/oracle/run_tests.gd`)** — PAS de faux-vert. Les DEUX énumèrent le même dossier codé
  en dur `res://07_TESTS/unit/*.test.gd`, exécutent chaque `run(h)`, et gardent le total contre
  `EXPECTED_ASSERTS`. La racine ne recopie PAS la constante : elle la **lit** du harnais canonique
  (`tests/run_tests.gd:19,55` → `OracleTests.EXPECTED_ASSERTS`), donc aucune dérive de total
  possible. Les 26 fichiers/282 assertions sont réellement rejoués par la racine (le point
  d'entrée que `godot_oracle.mjs:24` charge). Délégation **réelle**, pas théâtrale.
- **Solvabilité « par construction » (précédent R9 grid-navigator)** — PAS présente. Le
  générateur de nourriture (`food_spawn.gd`, LCG seedé) est **aveugle au bot** : il tire sur la
  liste des cases libres, jamais en interrogeant le pathfinding. Aucune tautologie « le générateur
  demande à la brique testée si c'est solvable » comme dans grid-navigator. `succeeded=false` est
  **atteignable** (voir Faille #4 : bot glouton piégeable, repli mortel). Le régime testé est
  toutefois trivial — c'est la seule réserve, remontée en advisory.
- **`>=` tautologique** — le seul `>=` de gameplay (`end_condition.gd:10`,
  `longueur >= P.CIBLE_VICTOIRE`) est correctement **borné par un test strict** :
  `end_condition.test.gd:14-16` teste `cible-1 → false`, `cible → true`, `cible+1 → true`. Un
  mutant `>` échoue à `cible`, un mutant `==` échoue à `cible+1`. Non tautologique. (La longueur
  croît de +1/tick et gèle à 25, donc la branche `>` est morte en jeu réel — inélégant mais sûr.)
- **Littéral de gameplay hors params** — aucun. `grep` des littéraux (20/200/0.92/80/25) sous
  `05_SYSTEMS/` hors `params.gd` ne rend que `longueur >= P.CIBLE_VICTOIRE` (référence à un
  paramètre, pas un littéral). `scene.gd:35-38` n'a que CELL_PX/BAND_H/SEED_INITIAL, déclarés
  présentation/déterminisme.
- **Dépendance de la logique pure vers rendu/Input** — non. `grep` de `Input`/`get_node`/`Node`/
  `06_RUNTIME` sous `05_SYSTEMS/` ne rend que des **commentaires**. `purity_guard.test.gd`
  vérifie `extends RefCounted` + liste noire + « aucun import 06_RUNTIME » dans le moteur.
- **Cas limites gameplay** — couverts : demi-tour même tick (garde vs `dir_effectuee`, pas
  `dir_en_attente` — `no_reverse.test.gd:33-38`) ; collision simultanée nourriture/corps
  (`loop.gd:39-44` — la queue n'est retirée du test de corps QUE si on ne mange pas) ; grille
  pleine (`food_spawn.gd:30-31` — retour `grille_pleine` sans boucle, testé
  `food_spawn_free_cells.test.gd:52-60`) ; reprise après pause longue (`runtime_loop.gd:18-20`
  + `no_time_catchup.test.gd:20-21` — 0 tick, accumulateur figé) ; sauvegarde corrompue
  (`best_score_store.gd:16-33` — 4 cas absent/vide/corrompu/illisible → 0, testé
  `best_score_store_degraded`).

---

## Failles rapportées (advisory) — ordre de sévérité décroissante

### Faille #1 — HIGH — Le produit jouable réel (`main.tscn` → `scene.gd`) n'est couvert par AUCUN oracle, ni bloquant ni advisory

**Angle** : point d'entrée produit / la preuve ne remplace pas l'exécution (leçon de clôture de
CE jeu, 2026-07-29).

**Faille** : le seul artefact qui EST le jeu — le Node2D `scene.gd`, chargé par
`main.tscn`, qui câble `_ready()` (boot + persistance), `_process()` (cadenceur + tick),
`_input()` (clavier réel), `_draw()` (rendu) — n'est instancié par **aucun** test/oracle. La
chaîne **bloquante** (`godot_oracle.mjs:24-25`) exécute uniquement (1) `res://tests/run_tests.gd`
(26 fichiers d'unités PURES de `05_SYSTEMS/` + logique d'adaptateurs, jamais le Node) et (2)
`res://solvability.gd` (pilote `Loop.step` dans une boucle `while`, jamais le Node). Les oracles
`07_TESTS/oracle/*.gd` qui approchent le runtime (`core_boot`, `core_input_action`,
`core_render_frame`, `solo_session`) sont **advisory non-bloquants** (voir Faille #2) ET aucun
n'instancie `scene.gd` non plus : `core_boot.gd:18` teste `Boot.etat_initial` (helper pur),
`core_render_frame.gd:30-40` **ré-implémente** son propre rendu ColorRect au lieu d'appeler le
`_draw` de `scene.gd`. Conséquence : un `_ready()` qui plante, un `main.tscn` au script cassé, un
`_process` qui n'avance jamais, un `_draw` qui lève — **tout cela laisse les oracles VERTS** alors
que le jeu ne démarre pas. C'est exactement le mode de panne ratifié par Pierre à la clôture Snake.

**Sévérité** : HIGH — régression de démarrage/rendu/entrée du produit expédiée en vert.

**Reproduction** (falsifiable, exécutable par un oracle non-LLM) :
- Ancre statique déjà vérifiée : `grep -rln "scene.gd\|main.tscn" games/snake/07_TESTS/` → **vide**
  (aucune référence). `grep "runtime_loop/scene.gd" -r games/snake` → uniquement `main.tscn` +
  caches `.godot`. Le point d'entrée déclaré `project.godot:14` (`run/main_scene="res://main.tscn"`)
  n'est asserté par aucun oracle.
- Repro dynamique : introduire `assert(false)` (ou un accès nul) dans `scene.gd:_ready()`, OU
  pointer `main.tscn:3` sur un script inexistant, puis lancer
  `node scripts/forge/godot_oracle.mjs …` → **exit 0** (le chemin `--script res://tests/run_tests.gd`
  contourne la scène principale). Un oracle manquant qui lancerait `godot --path games/snake`
  (fenêtre GPU, cf. `godot_capture_requires_gpu_window`) et exigerait un reçu de boot sur stdout
  (`DebugProbe.emettre`, `scene.gd:56,183`) attraperait la régression ; aucun ne le fait.

---

### Faille #2 — MEDIUM — Le seul oracle qui rend une vraie image est structurellement toujours NOT_MEASURED ; tout le volet `FORGE_ORACLE` (dont `solo_session` end-to-end) est câblé advisory/non-bloquant

**Angle** : observabilité du rendu / verdict logiciel adossé à une preuve non-observable.

**Faille** : `core_render_frame.gd` est le SEUL oracle produisant une frame GPU réelle et
asserte que deux états rendent des images distinctes non-monochromes — mais il est déclaré
`GPU_WINDOW_REQUIRED_VOLETS` et rendu **TOUJOURS `NOT_MEASURED`** tant qu'aucune fenêtre GPU
n'est fournie (`product_oracle_godot.py:55,203`). En parallèle, la totalité du fournisseur Godot
`product_oracle_godot` (qui exécute `solo_session`, `core_boot`, `core_input_action`, `core_exit`,
`replay_determinism`, `mutation_invariants`, `speed_band_report`, `evidence_manifest`) est appelée
sous `try/except … advisory, jamais bloquant` (`driver.py:1018-1029`). Donc la preuve END-TO-END
la plus riche — `solo_session.gd` : boot → avancer → manger → grandir → gagner → écran de fin
actif + message non vide — **ne contribue pas** au `software_verdict`. Celui-ci repose uniquement
sur les unités pures + la solvabilité `Loop.step`. La « vie visuelle » du jeu n'est jamais un
critère de blocage.

**Sévérité** : MEDIUM — le software_verdict peut être OK avec un écran de fin, un rendu, ou une
session bot cassés.

**Reproduction** (falsifiable) :
- Ancre statique : `product_oracle_godot.py:55` (`GPU_WINDOW_REQUIRED_VOLETS = {"core_render_frame"}`),
  `:203` (`core_render_frame` TOUJOURS `NOT_MEASURED`) ; `driver.py:1021` (`except … advisory,
  jamais bloquant`), `:1023` (log « advisory, non bloquant »).
- Repro dynamique : rendre `solo_session.gd` rouge (p.ex. forcer `fails.append(...)` /
  `quit(1)`) → le `software_verdict` du run reste OK (seuls `run_tests.gd` et `solvability.gd`
  bloquent). Un downstream qui traiterait le reçu `product_oracle_godot` comme bloquant sur les
  volets MEASURED le détecterait ; le câblage actuel ne le fait pas.

---

### Faille #3 — LOW — Le filet de pureté de `05_SYSTEMS` est une liste NOIRE incomplète (`Engine.`, `RandomNumberGenerator`, `randomize()` non interdits)

**Angle** : dépendance logique pure / invariant de pureté sous-enforcé.

**Faille** : `purity_guard.test.gd:7-11` interdit une liste FERMÉE d'API
(`get_node(`, `Input.`, `InputEvent`, `OS.`, `Time.`, `randi(`, `randf(`, …) mais **omet**
`Engine.`, `RandomNumberGenerator`, `randomize()`, `Time.get_unix_time_from_system`. Le second
garde (`mutation_invariants.gd:42`) ne teste qu'un substring `"extends Node"`. Un système
`extends RefCounted` qui appellerait `Engine.get_frames_drawn()` ou construirait un
`RandomNumberGenerator` (alea NON seedé, brisant `food_spawn` comme unique source d'alea et le
déterminisme du replay) **passerait les deux gardes**. Aucune violation active aujourd'hui (grep
`Engine\.` sous `05_SYSTEMS/` → vide) : c'est un trou **latent** — une liste noire sous-protège
par nature un invariant « pur » ; une liste blanche (extends autorisés + appels autorisés) le
fermerait.

**Sévérité** : LOW — latent, aucune violation courante ; fragilise l'invariant de pureté/déterminisme.

**Reproduction** : ajouter `var _x = Engine.get_frames_drawn()` à n'importe quel
`games/snake/05_SYSTEMS/**/*.gd`, puis relancer `res://tests/run_tests.gd` → `purity_guard`
rapporte toujours **0 violation** et `mutation_invariants` toujours `ok:true`. Falsifiable et
exécutable par l'oracle mécanique existant.

---

### Faille #4 — LOW — Solvabilité prouvée dans un régime trivial : bot glouton + cible 25 sur 400 cases → `succeeded=false` quasi inatteignable en pratique ; une régression de survie fin-de-partie (le cœur de difficulté du genre) ne serait pas détectée

**Angle** : pouvoir discriminant de l'oracle de solvabilité (précédent R9 / règle de variance).

**Faille** : la politique du bot (`bot_policy.gd:43-50`) est un **plus-court-chemin glouton BFS**
vers la nourriture (corps=murs, queue libérée). Ce type de bot se **piège** notoirement quand le
serpent devient long relativement à la grille. Or la cible est `CIBLE_VICTOIRE = 25` sur une
grille `20×20 = 400` (`params.gd:10,28`) : à la victoire le serpent occupe ~6 % de la grille, très
loin du régime où le glouton s'auto-piège. `succeeded=false` **existe** (repli `_repli`
`bot_policy.gd:32-40` peut ne rendre qu'une direction mortelle → `dir_effectuee` dans le mur/corps),
mais le régime testé le rend quasi-certainement faux. La conséquence : l'oracle prouve que
l'objectif est **atteignable en régime facile**, pas que la logique gère la difficulté réelle de
Snake (survie quand le corps sature l'espace). Une régression qui ne casserait QUE le pathfinding
long-serpent passerait vert. C'est le motif R9 (métrique qui valide le moteur sans mesurer ce que
son nom promet), en version atténuée — ici sans tautologie par construction (cf. résultats propres).

**Sévérité** : LOW (advisory) — l'oracle teste honnêtement la condition de victoire **déclarée**
(25) ; la réserve porte sur son faible pouvoir discriminant, pas sur une tricherie.

**Reproduction** (falsifiable) : porter temporairement `CIBLE_VICTOIRE` vers la capacité de la
grille (p.ex. 380) et relancer `res://solvability.gd --seed=1` : le glouton se piège et émet
`FORGE_TRIAL {"succeeded": false, …}` — démontrant que le vert actuel dépend de la cible généreuse,
pas d'un pathfinding robuste. À l'inverse, un mutant cassant `est_gagne` fait perdre/timeout le
bot → `succeeded=false` : l'oracle garde donc bien une valeur (il n'est pas trivialement vert).

---

## RAPPORT FINAL

**software_verdict: OK** *(portée STRICTE : les constats de couverture manquante — Failles #1, #2,
#3 — sont des faits STATIQUES vérifiés par `grep`/lecture de fichier, ancres citées. Je ne verdicte
PAS la correction fonctionnelle du jeu : je n'exécute aucun oracle.)*

**evidence_verdict: MECHANICAL_VALIDATION_ONLY** *(chaque faille cite une ancre statique ou une
repro exécutable par oracle non-LLM ; aucune conclusion tirée d'un jugement LLM.)*

**claim_verdict: NO_CLAIM_ALLOWED** *(je NE claime PAS « le jeu ne démarre pas » : aucune preuve.
Ce que j'établis, c'est l'ABSENCE d'oracle prouvant qu'il démarre — voir fog.)*

**fog → HumanGate (Pierre)** :
1. **Aucun oracle ne prouve que `main.tscn`/`scene.gd` boote et rend** (Faille #1). Décision Pierre :
   ajouter un oracle de démarrage produit (fenêtre GPU, cf. `godot_capture_requires_gpu_window`)
   déclaré comme **invariant de point d'entrée**, vérifié en présence ET en absence — exactement la
   leçon ratifiée le 2026-07-29 (`proof_never_replaces_product_run`).
2. **Le volet observable est advisory** (Faille #2) : promouvoir `solo_session`/`core_boot` en
   bloquant (au moins headless) relève d'une décision Pierre (changement de gate).
3. Faille #3 (liste noire → liste blanche) et Faille #4 (cible de solvabilité) : arbitrages design,
   non bloquants.

## SKIPPED_VALIDATION

- **Item** : exécution réelle des oracles (`run_tests.gd`, `solvability.gd`, volet `FORGE_ORACLE`).
  **Périmètre** : tout le harnais Godot du jeu. **Statut** : non fait. **Raison** : permission
  `run: aucun` (red-team aveuglé, ne fait tourner aucun oracle) — mes constats sont statiques
  (grep + lecture), jamais des résultats d'exécution que je n'ai pas produits.
- **Item** : preuve dynamique de la Faille #1 (crash `_ready()` → oracles verts). **Périmètre** :
  `scene.gd`/`godot_oracle.mjs`. **Statut** : non fait (décrit comme repro reproductible). **Raison** :
  `run: aucun` + `write` limité à `rapport_redteam_code.md` (je ne modifie aucun fichier de jeu).
- **Item** : mesure de la distribution réelle des 50 essais de solvabilité (variance de
  `succeeded`/`ticks`). **Périmètre** : `solvability.gd`. **Statut** : partiel (raisonnement
  statique sur le régime, pas de mesure). **Raison** : `run: aucun`.
- **Item** : lecture du raisonnement du builder pour recouper mes constats. **Périmètre** : étape 9.
  **Statut** : non fait, **volontairement** (garde-fou : contexte aveuglé — je ne dois pas le
  reconstituer pour me rassurer).

---

```json
{"findings": [{"angle": "point d'entree produit / preuve != execution", "faille": "Le produit jouable reel main.tscn -> scene.gd (Node2D : _ready boot, _process tick, _input clavier, _draw rendu) n'est instancie par AUCUN oracle bloquant NI advisory ; la chaine bloquante godot_oracle.mjs n'execute que les unites pures de 05_SYSTEMS et la solvabilite qui pilote Loop.step en boucle while, jamais le Node ; une regression de boot/rendu/entree du produit est expediee en vert (mode de panne ratifie a la cloture Snake 2026-07-29)", "severite": "HIGH", "reproduction": "Ancre statique: grep -rln 'scene.gd|main.tscn' games/snake/07_TESTS/ => vide ; project.godot:14 run/main_scene=res://main.tscn asserte par aucun oracle. Repro dynamique: casser scene.gd _ready() (assert false) ou le chemin script de main.tscn:3, puis node scripts/forge/godot_oracle.mjs => exit 0 car --script res://tests/run_tests.gd contourne la scene principale ; un oracle de boot lancant godot --path games/snake (fenetre GPU) exigeant le recu DebugProbe sur stdout l'attraperait, aucun ne le fait"}, {"angle": "observabilite du rendu / verdict adosse a une preuve non observable", "faille": "core_render_frame (seul oracle rendant une vraie frame GPU) est structurellement TOUJOURS NOT_MEASURED (product_oracle_godot.py:55,203) et tout le fournisseur product_oracle_godot -- dont solo_session end-to-end (boot->manger->grandir->gagner->ecran de fin) -- est cable advisory non-bloquant (driver.py:1018-1029), donc la preuve visuelle et la preuve end-to-end ne contribuent jamais au software_verdict qui repose seulement sur les unites pures + solvabilite", "severite": "MEDIUM", "reproduction": "Ancre statique: product_oracle_godot.py:55 GPU_WINDOW_REQUIRED_VOLETS={core_render_frame}, :203 core_render_frame TOUJOURS NOT_MEASURED ; driver.py:1021 except advisory jamais bloquant, :1023 log 'advisory, non bloquant'. Repro dynamique: forcer solo_session.gd a quit(1) => software_verdict du run reste OK (seuls run_tests.gd et solvability.gd bloquent)"}, {"angle": "purete logique sous-enforcee (liste noire incomplete)", "faille": "Le filet de purete de 05_SYSTEMS est une liste NOIRE fermee (purity_guard.test.gd:7-11) qui omet Engine., RandomNumberGenerator, randomize(), Time.get_unix_time_from_system ; le second garde mutation_invariants.gd:42 ne teste qu'un substring 'extends Node' ; un systeme extends RefCounted appelant Engine. ou un RNG non seede (brisant food_spawn comme unique source d'alea et le determinisme du replay) passerait les deux gardes -- trou latent, aucune violation active", "severite": "LOW", "reproduction": "Ajouter 'var _x = Engine.get_frames_drawn()' a n'importe quel games/snake/05_SYSTEMS/**/*.gd puis relancer res://tests/run_tests.gd => purity_guard rapporte toujours 0 violation et mutation_invariants toujours ok:true ; grep 'Engine\\.' sous 05_SYSTEMS/ confirme 0 violation courante"}, {"angle": "pouvoir discriminant de l'oracle de solvabilite (precedent R9)", "faille": "Le bot de solvabilite est un plus-court-chemin glouton BFS (bot_policy.gd:43-50) et la cible est CIBLE_VICTOIRE=25 sur une grille 20x20=400 (params.gd:10,28) : a la victoire le serpent occupe ~6% de la grille, loin du regime ou un glouton s'auto-piege ; succeeded=false est atteignable (repli _repli mortel) mais quasi-certainement faux dans ce regime, donc une regression de survie fin-de-partie (le coeur de difficulte de Snake) ne serait pas detectee -- motif R9 attenue, SANS tautologie par construction (le generateur food_spawn LCG est aveugle au bot)", "severite": "LOW", "reproduction": "Porter CIBLE_VICTOIRE vers la capacite de grille (p.ex. 380) et relancer res://solvability.gd --seed=1 : le glouton se piege et emet FORGE_TRIAL {succeeded:false} -- montrant que le vert actuel depend de la cible generreuse ; a l'inverse un mutant cassant est_gagne fait perdre/timeout le bot => succeeded=false, donc l'oracle garde une valeur non triviale"}]}
```

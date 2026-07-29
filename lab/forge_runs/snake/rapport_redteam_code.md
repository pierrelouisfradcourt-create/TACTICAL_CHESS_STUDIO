# Rapport red-team CODE — Snake (dispatch s11-redteam-code, aveuglé)

FORGE_DISPATCH:s11-redteam-code:snake-solv-20260729-151140:1

- **Rôle** : auditeur CODE **aveuglé**. Je n'ai PAS lu le raisonnement du Builder ; je n'ai jugé que
  le code livré (66 `.gd`, 282 assertions) et ses ancres statiques, plus la chaîne d'oracles qui le
  juge (`scripts/forge/godot_oracle.mjs`, `solvability_godot.mjs`, `oracles.json`, reçus
  `evidence/`). Le red-team **critique**, les oracles **prouvent** — séparés. Chaque faille est
  nommée, falsifiable, avec une reproduction exécutable par un oracle non-LLM en aval.
- **Permissions respectées** : `run: aucun` — je n'ai lancé AUCUN oracle Godot ni aucun jeu. Les
  commandes exécutées n'ont servi qu'à **LIRE** l'arbre et à ancrer chaque faille sur du réel.
  `write` : ce seul fichier. Aucun fichier de jeu modifié, aucune lane protégée (`tests/**`) touchée.
- **Confrontation au réel** : ce slot portait le rapport d'un dispatch antérieur
  (`snake-obs-20260729-135513`). Je n'ai rien repris sur parole ; findings reformés depuis le code.

---

## Ce que je n'ai PAS réussi à falsifier (angles demandés, conclus NÉGATIFS)

Je les liste pour que l'absence de faille soit une **décision assumée**, pas un silence :

- **Faux-vert par délégation creuse entre les deux harnais** → NON confirmé. L'oracle officiel
  exécute `res://tests/run_tests.gd` (`godot_oracle.mjs:24`), qui **ré-énumère** réellement
  `res://07_TESTS/unit/*.test.gd`, instancie chaque fichier et appelle `run(h)`
  (`tests/run_tests.gd:39-51`). Il ne délègue au harnais canonique que la **constante**
  `EXPECTED_ASSERTS` (`:19,:55`), jamais l'exécution. Les 282 assertions tournent bien
  (evidence `oracle_snake.log:9` → `282 passed, 0 failed, fichiers: 26`). *La garde compte donc
  un travail réel.* (Un défaut mineur subsiste, voir F5.)
- **Solvabilité prouvée par construction (précédent R9 grid-navigator)** → NON confirmé.
  Le générateur d'instances (`food_spawn.tirer`) tire sur la **liste des cases libres**
  (`food_spawn.gd:14-34`) et **ne consulte JAMAIS** le pathfinder du bot (`grid_nav`). L'ancienne
  tautologie « le générateur demande à `path_length` si un chemin existe » — celle qui a masqué le
  bug 2026-07-21 — a été retirée et documentée (`grid_nav.gd:26-29`). Le bot joue par le **même
  `Loop.step()`** que le clavier (`solvability.gd:33`). `succeeded=false` est **atteignable dans le
  code** : tout statut non `TERMINE_GAGNE` ou tout dépassement de `max_ticks` retourne `false`
  (`solvability.gd:36-37`). L'oracle n'est donc **pas truqué**. *Mais* il passe trivialement — voir F2.
- **Demi-tour dans le même tick** → NON confirmé. La demande est validée contre la direction
  **EFFECTUÉE** (`direction_rules.gd:24-30`), pas contre l'attente, et la promotion refuse encore le
  demi-tour (`:34-37`), profondeur 1. La rafale « N appuis → 1 changement » est testée
  (`no_reverse.test.gd:57-63`), le rejeu impossible est testé (`:41-46`).
- **Collision simultanée nourriture/corps** → NON confirmé. La case libérée par la queue ne tue
  que si l'on ne mange pas (`loop.gd:41-44`) ; cas testés (auto-collision réelle, queue libérée,
  mur) dans `tick_pure.test.gd:57-83`. La nourriture ne peut jamais tomber sur le corps
  (invariant `state.est_valide:90` + `food_spawn` sur cases libres), donc tête-sur-food-et-sur-corps
  au même tick est structurellement impossible.
- **Grille pleine / sauvegarde corrompue** → NON confirmé. `food_spawn` renvoie `grille_pleine`
  sans boucler (`food_spawn.gd:30-31`, testé `food_spawn_free_cells.test.gd:52-60`) ; les 4 cas de
  save (absent/vide/corrompu/illisible) renvoient 0 sans exception joueur
  (`best_score_store.gd:16-33`, testé `best_score_store_degraded.test.gd`).
- **Dépendance logique pure → rendu/Input** → NON confirmé pour l'essentiel. `purity_guard.test.gd`
  scanne `05_SYSTEMS/` et interdit `Input.`, `InputEvent`, `_draw(`, `randi(`, imports `06_RUNTIME`
  (violations = 0). Réserve mineure sur la robustesse du scanner : voir F4.

---

## Failles rapportées

### F1 — Le plancher de vitesse (`PERIODE_PLANCHER_MS = 80`) est structurellement INJOUABLE ; la bande de vitesse déclarée [80,200] promet plus que le jeu ne livre — sévérité **MEDIUM**

- **Angle** : cohérence métrique de calibration (règle de variance / « promesse trop forte »,
  CLAUDE.md 2026-07-21).
- **Faille** : la victoire arrive à `CIBLE_VICTOIRE - LONGUEUR_INITIALE = 25 - 3 = 22` nourritures
  (`params.gd:25,28`). La période à 22 fruits vaut `200 · 0,92^floor(22/5) = 200 · 0,92^4 =
  143,278592 ms` (`tick_rate.gd:12-15`, valeur déjà figée pour le palier 4 dans
  `tick_rate_thresholds.test.gd:18`). Or le plancher 80 ms n'est atteint qu'à **55 fruits**
  (`tick_rate_thresholds.test.gd:26` asserte `periode(55) = 80`). Comme `22 < 55`, **toute la moitié
  basse de la courbe d'accélération (paliers 5→11, périodes 143→80 ms) n'est jamais jouée** : le
  jeu se termine avant. Le paramètre `PERIODE_PLANCHER_MS` et ses tests de saturation valident un
  régime qu'aucun joueur ne traverse. L'oracle `speed_band_report.gd` **expose lui-même l'écart**
  sans échouer dessus : il rapporte `bande_regle_pure = [80, 200]` mais `bande_bot_mesuree ≈
  [143,28, 200]` — deux bandes disjointes en bas — et sa seule garde de variance exige `≥ 2` périodes
  distinctes (`speed_band_report.gd:44-46`), condition satisfaite par les seuls paliers 0→4. Vert
  malgré un tiers-bas mort.
- **Sévérité MEDIUM** : ce n'est PAS un bug de correction (les 3 paramètres sont `A_EQUILIBRER`),
  c'est une **promesse trop forte à requalifier** — exactement la classe de la leçon grid-navigator.
  Décision de balance → HumanGate (soit relever la cible / durcir l'accélération pour rendre le
  plancher atteignable, soit narrer honnêtement la bande réelle [143, 200]).
- **Reproduction** (exécutable / arithmétique non-LLM) : (a) `periode(22) = 143,278592 ≠ 80` et
  `periode(n) = 80 ⇔ n ≥ 55` par `200·0,92^floor(n/5)` — vérifiable par un oracle arithmétique pur ;
  (b) `godot --headless --path games/snake --script res://07_TESTS/oracle/speed_band_report.gd` puis
  lire le JSON : `bande_bot_mesuree[0] > bande_regle_pure[0]` (≈143,28 vs 80).

### F2 — La solvabilité 50/50 ne stresse pas le régime difficile de Snake : cible à ~6 % de remplissage, le bot glouton n'a jamais à gérer l'espace — sévérité **MEDIUM**

- **Angle** : portée de l'oracle R9 (un vert qui ne mesure pas ce que son nom promet).
- **Faille** : la cible est longueur 25 sur une grille de 400 cases, soit **6 % de remplissage**. Le
  bot est un glouton « plus court chemin BFS vers la nourriture » (`bot_policy.gd:1-4,43-50`). À
  cette longueur, le corps ne peut pas enclore la nourriture ni se piéger dans un espace saturé —
  précisément le cœur de difficulté de Snake (fin de partie, remplissage, chasse-queue). L'oracle
  prouve donc « les 6 % faciles sont atteignables », pas « le jeu est solvable ». Un régression du
  *late game* (collision en espace serré, spawn sur grille quasi pleine, gel de l'accélération basse)
  **passerait ce vert**. Le tirage est en plus **déterministe et fixe** (seeds 1→50, `seed_start =
  DEFAULT_SEED_START = 1`, `solvability_godot.mjs:26,38` + `godot_oracle.mjs:69`) : la métrique a
  variance nulle d'un run à l'autre et n'échantillonne jamais un régime tendu.
- **Sévérité MEDIUM** : `succeeded=false` **est** atteignable dans le code (F2 n'est donc pas « oracle
  rigged »), mais le vert est trivial au regard de la cible. Requalification / durcissement =
  décision de balance HumanGate.
- **Reproduction** (falsification exécutable en aval, NON lancée par moi — `run: aucun`) : porter
  `CIBLE_VICTOIRE` de 25 vers une valeur proche de la capacité (p. ex. 200) dans `params.gd:28`, puis
  `node scripts/forge/godot_oracle.mjs games/snake`. Prédiction falsifiable : le **même** bot glouton
  bascule en `verdict: FAIL` (il se piège) — ce qui prouve que le 50/50 actuel est une propriété de
  la cible triviale, pas du jeu « résolu ». Ancre de l'état courant : `evidence/oracle_snake.log:13-20`
  (`trials:50, won:50, failed_seeds:[]`).

### F3 — `runtime_loop.avancer` jette le surplus d'accumulateur à CHAQUE tick (pas seulement après un gel) : la cadence réelle est plus lente que la période déclarée — sévérité **LOW**

- **Angle** : la calibration de vitesse (le but même des params isolés) n'est pas réalisée au temps
  réel.
- **Faille** : dès que `acc ≥ periode`, la fonction retourne `{"ticks": 1, "accumulateur": 0.0}`
  (`runtime_loop.gd:24-25`) — le reliquat `acc - periode` est **détruit à chaque tick**, y compris en
  fonctionnement normal (petit `delta`), pas seulement après une privation d'exécution. Conséquence :
  à 60 fps (16,6 ms/trame) et période 80→200 ms, l'intervalle réel inter-tick =
  `ceil(periode/trame)·trame ≥ periode`, jusqu'à ~1 trame de retard par tick. Le jeu tourne donc
  **mesurablement plus lent** que la courbe calibrée ; les périodes de `speed_band_report` ne
  décrivent pas la cadence observée. L'intention « pas de rattrapage » justifie le plafond à 1 tick,
  mais « jeter le reliquat de chaque trame » est un comportement **plus fort** que l'invariant
  déclaré (« ≤ 1 tick après un gel ») et introduit une dérive permanente. Un pas fixe conservant le
  reliquat borné donnerait la même absence de rattrapage sans la dérive.
- **Reproduction** (exécutable non-LLM) : `RL.avancer(70.0, 16.6, 80.0, false)` renvoie
  `{"ticks":1,"accumulateur":0.0}` — les 6,6 ms de dépassement (70+16,6−80) sont perdues ; un pas
  conservant le reliquat renverrait `accumulateur = 6.6`. Le comportement est déjà **figé par un
  test** (`no_time_catchup.test.gd:18` asserte `accumulateur == 0.0` après 60000 ms) — le test
  enshrine la destruction, il ne la mesure pas comme dérive.

### F4 — `params_isolation.test` détecte les littéraux de gameplay par SOUS-CHAÎNE : garde fragile et poreuse, prouve moins que son nom — sévérité **LOW**

- **Angle** : un test qui promet plus qu'il ne vérifie (structured-field / anti-faux-vert).
- **Faille** : la fuite de littéral est testée par `if v in code` avec
  `VALEURS_GAMEPLAY = ["200", "0.92", "80", "25"]` (`params_isolation.test.gd:13,78-81`), c.-à-d. une
  **sous-chaîne**. « 25 » matcherait `125`, `256`, `1250` ; « 80 » matcherait `180`, `800`, `1080` ;
  « 200 » matcherait `2000`. Donc (a) **faux positif** possible sur un entier non-gameplay légitime,
  (b) **porosité** : un littéral de gameplay noyé dans une expression échappe si non isolé. Le test
  est vert aujourd'hui par absence de collision, mais sa garantie n'est pas celle que son nom promet.
  À sa décharge, le fichier **déclare honnêtement** sa portée limitée et renvoie la vérification
  exhaustive à `forge.static_oracles` (s10s) (`params_isolation.test.gd:6-9`).
- **Sévérité LOW** : la vraie garde exhaustive vit ailleurs (s10s), donc l'impact réel est faible ;
  reste un signal « ce test rassure au-delà de ce qu'il prouve ».
- **Reproduction** (statique, ancre déjà citée) : `params_isolation.test.gd:78` — sémantique
  sous-chaîne. Falsifiable : introduire un littéral non-gameplay `125` dans un fichier `05_SYSTEMS/`
  ferait échouer le test à tort (match « 25 »).

### F5 — Le harnais « canonique » (`07_TESTS/oracle/run_tests.gd`) n'est PAS celui que l'oracle exécute ; la boucle d'énumération est dupliquée → dérive silencieuse possible — sévérité **LOW**

- **Angle** : observabilité / non-duplication de la chaîne de preuve.
- **Faille** : `godot_oracle.mjs:24` ne lance QUE `res://tests/run_tests.gd`. Le fichier nommé
  « canonique » `07_TESTS/oracle/run_tests.gd` n'est **jamais invoqué** par la chaîne d'oracle ; seule
  sa constante `EXPECTED_ASSERTS` est préchargée (`tests/run_tests.gd:19`). Les deux fichiers
  **dupliquent** le corps d'énumération (`DirAccess`, filtre `.test.gd`, `sort`, boucle `run(h)`,
  garde méta) : `tests/run_tests.gd:21-63` ≈ `07_TESTS/oracle/run_tests.gd:23-63`. Si un jour
  l'énumération est modifiée dans un seul (glob, tri, condition de chargement), les deux divergent en
  silence — et seul le harnais racine compte, tandis que le fichier « canonique » entretient
  l'illusion d'être l'oracle. Ce n'est pas un faux-vert aujourd'hui (l'exécuté ré-énumère bien tout),
  mais un piège de maintenance et de nommage.
- **Sévérité LOW** : pas d'impact sur le run courant ; risque de dérive future + nom trompeur.
- **Reproduction** (statique, ancres citées) : `godot_oracle.mjs:24` (seul point d'entrée exécuté) vs
  la boucle dupliquée `07_TESTS/oracle/run_tests.gd:23-63` non atteinte par la chaîne.

---

## RAPPORT FINAL

- **software_verdict : OK** — je ne conteste **aucun reçu d'oracle** du périmètre prouvé
  mécaniquement : mécanique `282 passed / 0 failed` (evidence `oracle_snake.log:9`), mutation
  `OK 63/64 tués` (`run_solv.log:6`), solvabilité `50/50` (`oracle_snake.log:13-20`). Mes findings
  sont **advisory** (red-team ≠ juge du code) : aucun n'invalide un reçu signé.
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY** — les ancres de F1/F3/F4/F5 sont
  statiques/arithmétiques non-LLM (arithmétique de la courbe, `runtime_loop.gd:24-25`,
  `params_isolation.test.gd:78`, `godot_oracle.mjs:24`) ; l'état solvabilité de F2 est le reçu
  `oracle_snake.log`.
- **claim_verdict : NO_CLAIM_ALLOWED** — les jugements « oracle trivial » (F2) et « promesse trop
  forte / bande morte » (F1) reposent sur des **expériences de falsification non encore exécutées**
  (relever `CIBLE_VICTOIRE`, lancer `speed_band_report`) que je n'ai PAS lancées (`run: aucun`). Je
  ne certifie donc rien : je remonte un **fog HumanGate**.
- **fog → Pierre** : `CIBLE_VICTOIRE`, `VITESSE_INITIALE_MS`, `ACCELERATION_PAS`,
  `PERIODE_PLANCHER_MS` sont `A_EQUILIBRER`. Décider si (i) la bande de vitesse déclarée doit rester
  [80,200] alors que seul [143,200] est joué (F1), (ii) la solvabilité doit stresser un régime plus
  difficile que 6 % de remplissage (F2), (iii) le cadenceur doit conserver le reliquat plutôt que le
  jeter (F3). Ce sont des arbitrages de design/balance, hors du pouvoir de la Forge.

### SKIPPED_VALIDATION

- **item** : exécution des oracles Godot / du jeu — **où** : toute la chaîne
  `godot_oracle.mjs`/`solvability_godot.mjs`/`speed_band_report.gd` — **statut** : non fait —
  **raison** : permission `run: aucun` (contrat) ; je me suis appuyé sur les reçus déjà présents
  (`evidence/oracle_snake.log`, `mutation_*.raw.json`, `run_solv.log`).
- **item** : exécution des expériences de falsification F1/F2/F3 — **où** : `params.gd` (cible),
  `speed_band_report.gd`, `runtime_loop.gd` — **statut** : non fait (décrites comme reproductions
  exécutables en aval par un oracle non-LLM) — **raison** : `run: aucun` + séparation
  red-team/oracle (le red-team critique, l'oracle prouve).
- **item** : lecture intégrale des 66 `.gd` — **où** : scripts de présentation
  (`grid_view`, `hud`, `end_screen`, `pause_panel`, `capture`, `debug_probe`, `exit`) — **statut** :
  partiel — **raison** : périmètre priorisé sur la logique pure (`05_SYSTEMS/`), les 26 tests, les
  adaptateurs de contrôle (bot, runtime_loop, input, store) et les 4 harnais/oracles — là où vivent
  les faux-verts et les bugs de règle ; la présentation ne porte aucune décision de jeu (wiremap :
  « LIT l'état, ne décide de rien »).
- **item** : analyse statique exhaustive des littéraux de gameplay — **où** : tout l'arbre `.gd` —
  **statut** : non fait — **raison** : `out_of_scope` — c'est l'oracle Python dédié
  `forge.static_oracles` (étape s10s), pas le red-team code.

```json
{"findings": [
  {"angle": "cohérence métrique de calibration (variance / promesse trop forte)", "faille": "Le plancher de vitesse PERIODE_PLANCHER_MS=80 est structurellement injouable : la victoire arrive à 22 fruits (CIBLE_VICTOIRE 25 - LONGUEUR_INITIALE 3) où periode=200*0.92^4=143.278592 ms, alors que le plancher 80 n'est atteint qu'à 55 fruits ; toute la moitié basse de la courbe (paliers 5-11, 143->80 ms) n'est jamais jouée. bande_regle_pure [80,200] promet plus que bande_bot_mesuree [~143,200]. Requalification de balance, pas un bug.", "severite": "MEDIUM", "reproduction": "Arithmétique non-LLM: periode(22)=200*0.92^floor(22/5)=143.278592 != 80, et periode(n)=80 <=> n>=55 > 22 (tick_rate.gd:12-15, tick_rate_thresholds.test.gd:18,26). Ou: godot --headless --path games/snake --script res://07_TESTS/oracle/speed_band_report.gd -> JSON bande_bot_mesuree[0] (~143.28) > bande_regle_pure[0] (80)."},
  {"angle": "portée de l'oracle R9 (vert qui ne mesure pas ce que son nom promet)", "faille": "Solvabilité 50/50 triviale : cible longueur 25 = 6% de la grille 400, bot glouton BFS-plus-court-chemin (bot_policy.gd) qui à cette longueur ne peut jamais se piéger ni gérer l'espace (le cœur de difficulté de Snake). L'oracle prouve 'les 6% faciles sont atteignables', pas 'le jeu est solvable' ; une régression du late game passerait le vert. Seeds fixes 1-50, variance nulle. succeeded=false EST atteignable dans le code (statut non-gagné / timeout), donc pas rigged, mais vert trivial.", "severite": "MEDIUM", "reproduction": "Falsification exécutable (non lancée, run:aucun): porter CIBLE_VICTOIRE de 25 vers ~200 dans params.gd:28, puis node scripts/forge/godot_oracle.mjs games/snake -> prédiction: le même bot glouton bascule en verdict FAIL (se piège). État courant: evidence/oracle_snake.log:13-20 (trials:50 won:50 failed_seeds:[])."},
  {"angle": "calibration de vitesse non réalisée au temps réel", "faille": "runtime_loop.avancer jette le surplus d'accumulateur (accumulateur=0.0) à CHAQUE tick dès acc>=periode, pas seulement après un gel (runtime_loop.gd:24-25). En jeu normal à 60 fps, l'intervalle réel inter-tick = ceil(periode/trame)*trame >= periode (jusqu'à ~1 trame de retard par tick), donc le jeu tourne plus lent que la courbe calibrée et les périodes de speed_band ne décrivent pas la cadence observée. Comportement plus fort que l'invariant déclaré ('<=1 tick après gel').", "severite": "LOW", "reproduction": "Exécutable non-LLM: RL.avancer(70.0, 16.6, 80.0, false) renvoie {\"ticks\":1,\"accumulateur\":0.0} (6.6 ms de surplus détruits) ; un pas conservant le reliquat renverrait accumulateur=6.6. Déjà figé par no_time_catchup.test.gd:18 (asserte accumulateur==0.0)."},
  {"angle": "test qui promet plus qu'il ne vérifie", "faille": "params_isolation.test détecte les fuites de littéraux de gameplay par SOUS-CHAÎNE (if v in code, VALEURS_GAMEPLAY=['200','0.92','80','25'], params_isolation.test.gd:13,78-81) : '25' matche 125/256/1250, '80' matche 180/800, '200' matche 2000 -> à la fois faux positif possible et porosité (littéral noyé échappe). Vert par absence de collision, mais la garantie n'est pas celle que le nom promet ; la garde exhaustive est déléguée à forge.static_oracles (s10s).", "severite": "LOW", "reproduction": "Statique: params_isolation.test.gd:78 (sémantique sous-chaîne). Falsifiable: injecter un littéral non-gameplay '125' dans un fichier 05_SYSTEMS/ ferait échouer le test à tort (match '25')."},
  {"angle": "observabilité / non-duplication de la chaîne de preuve", "faille": "Le harnais nommé 'canonique' 07_TESTS/oracle/run_tests.gd n'est JAMAIS exécuté par la chaîne d'oracle (godot_oracle.mjs:24 ne lance que res://tests/run_tests.gd) ; seule sa constante EXPECTED_ASSERTS est préchargée. Les deux fichiers dupliquent le corps d'énumération (tests/run_tests.gd:21-63 ~ 07_TESTS/oracle/run_tests.gd:23-63) : une modif d'énumération dans un seul les fait diverger en silence, et le fichier 'canonique' entretient l'illusion d'être l'oracle. Pas un faux-vert aujourd'hui, mais piège de maintenance + nom trompeur.", "severite": "LOW", "reproduction": "Statique: godot_oracle.mjs:24 (seul point d'entrée exécuté) vs la boucle dupliquée non atteinte 07_TESTS/oracle/run_tests.gd:23-63."}
]}
```

# Rapport red-team CODE — Snake (final2, dispatch s11-redteam-code, aveuglé)

FORGE_DISPATCH:s11-redteam-code:snake-final2-20260729-174101:1

- **Posture** : auditeur CODE **aveuglé**. Je n'ai PAS lu les justifications du builder ; je ne corrige rien ; je n'écris que ce fichier. `run: aucun` — aucun oracle Godot ni jeu lancé ; toute la reconnaissance est faite par lecture/grep.
- **Nature** : ADVISORY. Le red-team CRITIQUE, les oracles PROUVENT. Mes findings alimentent `redteam_advisory`, jamais `software_verdict` / `humangate_flags` directement.
- **Reproduction** : chaque faille cite une ancre statique non-LLM (chemin:ligne ou grep déterministe) ré-exécutable par un oracle en aval. Aucune suspicion non ancrée.
- **Confrontation au réel** : ce slot portait le rapport d'un dispatch antérieur (`snake-runtime-20260729-163539`, tranche runtime, solvabilité alors à graine unique). Rien repris sur parole ; findings reformés depuis le code du build final courant. La solvabilité est désormais à 50 graines (le F2 « graine unique » de ce rapport antérieur est donc traité).

---

## Angles demandés conclus NÉGATIFS (décisions assumées, pas des silences)

- **Faux vert par délégation creuse entre les deux harnais** → NON confirmé. `games/snake/tests/run_tests.gd` (racine, exigée par `godot_oracle.mjs`) et `07_TESTS/oracle/run_tests.gd` énumèrent le **même** dossier `res://07_TESTS/unit`, chargent les **mêmes** `*.test.gd`, via le **même** `Harness`, avec la **même** garde `total == EXPECTED_ASSERTS`. Le harnais racine LIT la constante du canonique (`OracleTests.EXPECTED_ASSERTS`, `tests/run_tests.gd:19,55`) au lieu de la recopier. Les deux exécutent réellement les 282 assertions ; pas de dérive de total possible. Résidu inhérent (compteur maintenu à la main) noté en F4.
- **Tautologie `>=` sur la victoire** → NON confirmé. `end_condition.gd:9-10` (`longueur >= CIBLE_VICTOIRE`) est épinglé strictement par `end_condition.test.gd:14-16` (`cible-1`→false, `cible`→true, `cible+1`→true). Mutant `>=`→`>` échoue L15, `>=`→`==` échoue L16.
- **Dépendance logique pure → rendu/Input** → NON confirmé. Double garde : `purity_guard.test.gd` (interdit `Input.`/`_draw(`/`randi(`/`06_RUNTIME` dans chaque `.gd` de `05_SYSTEMS`, violations==0) + `static_oracles.check_architecture`. Tous les `preload` de `05_SYSTEMS/**` restent dans `05_SYSTEMS/**`.
- **Demi-tour dans le même tick / rafale** → NON confirmé. `direction_rules.demander` valide contre `dir_effectuee` (pas l'attente), profondeur 1 ; `direction_du_tick` re-valide. Couvert par `no_reverse.test.gd:36-38,57-63`.
- **Collision simultanée nourriture/corps · reprise après pause longue · sauvegarde corrompue** → NON confirmés. Nourriture jamais sur le corps (`food_spawn.cases_libres` exclut les segments ; `state.est_valide` refuse `nourriture in segments`) → l'entrée tête-sur-queue-en-croissance est inatteignable (cible=nourriture≠queue). Pause : `runtime_loop.avancer(en_pause=true)` fige l'accumulateur (`no_time_catchup.test.gd:20-21`) ; anti-rattrapage ≤1 tick même après 60 s (`:16`). Sauvegarde absente/vide/corrompue/illisible → 0 sans crash (`best_score_store_degraded.test.gd:20,30,36,42`).
- **Grille pleine** → branche défensive présente (`food_spawn.tirer` `grille_pleine`, `growth.manger:25`) mais **inatteignable** (victoire à longueur 25 << 400 cases) : code mort défensif, ni exploitable ni testé — non retenu comme faille.

---

## Failles retenues

### F1 — La preuve « d'isolation des paramètres » est déclarée exhaustive (« tests compris ») mais déléguée à un analyseur qui n'existe pas ; un littéral de gameplay fuit dans un test — MEDIUM

- **Angle** : littéral de gameplay hors du bloc params + déclaré ≠ exécuté (intégrité de preuve).
- **Faille** : la wiremap déclare pour `params.bloc_unique` une `expected_proof` de type `static_oracle` : « Le nombre de litteraux numeriques de gameplay … hors de `params.gd` est EXACTEMENT 0, **scripts de presentation et tests compris**. » Or :
  1. Le test GDScript qui l'incarne (`07_TESTS/unit/params_isolation.test.gd:66-68`) ne scanne QUE `res://05_SYSTEMS` + `res://06_RUNTIME` — **jamais `07_TESTS`** — et ne cherche que 4 sous-chaînes (`:13` `["200","0.92","80","25"]`). Son propre commentaire (`:6-9`) délègue la vérification EXHAUSTIVE à « l'oracle Python `forge.static_oracles` (etape s10s), qui possede un vrai analyseur ».
  2. **Cet analyseur n'existe pas.** `scripts/forge/static_oracles.py` (lu intégralement), `standard_oracles.py` et `run_real.py` ne contiennent AUCUNE fonction d'isolation de littéraux de gameplay.
  3. Conséquence concrète : `07_TESTS/unit/tick_rate_thresholds.test.gd:13` contient le littéral `200.0`, qui **égale `params.VITESSE_INITIALE_MS`**, hors de `params.gd`, dans un test — exactement ce que « tests compris = EXACTEMENT 0 » prétend interdire, et rien ne l'attrape. (Le rapport red-team runtime antérieur avait conclu « 0 fuite » en ne scannant lui non plus que `05_SYSTEMS`/`06_RUNTIME` : le trou « tests » a survécu aux deux audits.)
- **Sévérité** : MEDIUM. Rayon de souffle faible (le littéral fuité est une valeur-or attendue dans un test, effet bénin), mais la PREUVE déclarée (« EXACTEMENT 0 … tests compris », adossée à un oracle nommé mais absent) sur-promet ce qui est réellement vérifié. Famille « déclaré ≠ exécuté ».
- **Reproduction** (non-LLM, ancres statiques) :
  - `grep -rniE "def .*(isolation|litteraux|literal)|VITESSE_INITIALE" scripts/forge/*.py` → 0 fonction d'analyse.
  - `params_isolation.test.gd:67-68` : racines de scan = `05_SYSTEMS` + `06_RUNTIME` uniquement.
  - `grep -n "200\.0" games/snake/07_TESTS/unit/tick_rate_thresholds.test.gd` → `:13` ; `params/params.gd:13` : `VITESSE_INITIALE_MS = 200.0`.

### F2 — Solvabilité 50/50 : signal à variance nulle, aucune sonde-contrôle prouvant que la branche `succeeded=false` est vivante — LOW

- **Angle** : solvabilité prouvée par construction / variance de métrique (précédent R9 2026-07-21).
- **Faille** : `solvability.gd:36-37` émet `succeeded = (statut == TERMINE_GAGNE)`. Sur les 50 graines rapportées, `succeeded` est constamment `true`. La cible (`CIBLE_VICTOIRE=25` sur grille 20×20=400 cases, serpent ≤25 segments) est assez basse pour qu'un bot glouton BFS gagne quasi systématiquement : la branche d'échec n'est **jamais exercée** par l'échantillon. Ce n'est PAS une solvabilité par construction (la chaîne graine→`food_spawn`→`Loop.step` ne consulte jamais le vérificateur de victoire — pas le défaut R9), et la branche est atteignable en principe. Mais le 50/50 seul valide « gagnable » sans distinguer « trivialement gagnable » et sans prouver que la sortie `false` n'est pas morte/figée. Aucune sonde-contrôle n'accompagne la mesure (discipline studio : « toujours une sonde-contrôle »).
- **Sévérité** : LOW (advisory). Le code est honnête (la branche `false` existe et est atteignable) ; le manque est méthodologique — la métrique de solvabilité porte une variance nulle sur l'échantillon montré.
- **Reproduction** (non-LLM, sonde-contrôle recommandée) :
  `godot --headless --path games/snake --script res://solvability.gd -- --seed=1 --max_ticks=1` DOIT imprimer `FORGE_TRIAL {"succeeded": false, "ticks": null}` (après 1 tick le statut reste `EN_COURS`, `solvability.gd:30,36`). Si la sortie est `succeeded:true`, la branche est figée = faux vert. À ajouter comme cas permanent pour prouver mécaniquement les DEUX branches.

### F3 — Bot de solvabilité : effacement inconditionnel de la queue contredit son commentaire « sauf croissance » — LOW

- **Angle** : cas limite (queue en croissance) dans l'outil de test de solvabilité.
- **Faille** : `bot_policy.gd:26-27` retire toujours la queue des murs (`walls.erase(state.segments[last])`) sans garde de croissance, alors que le commentaire `:25` annonce « la queue se libere ce tick (**sauf croissance**) ». Le jeu, lui, conserve la queue si `mange` (`loop.gd:40-44`). Divergence latente entre le modèle du bot et la logique.
- **Sévérité** : LOW. **Effet actuellement masqué** : la nourriture n'est jamais sur le corps, donc « pas vers la nourriture == case-queue » est inatteignable ; et une telle divergence ferait PERDRE le bot (faux négatif), jamais gagner — elle ne peut pas fabriquer un faux vert. Signal de qualité/latence, pas défaut exploitable.
- **Reproduction** (ancre statique) : `bot_policy.gd:26-27` (erase inconditionnel) vs commentaire `:25` ; comparer `loop.gd:41-43` (`if not mange: corps_a_verifier.pop_back()`).

### F4 — Garde anti-faux-vert `EXPECTED_ASSERTS` : compteur littéral maintenu à la main — LOW

- **Angle** : test qui fige une valeur historique.
- **Faille** : les deux harnais gatent sur `total == EXPECTED_ASSERTS` (`oracle/run_tests.gd:21` `:= 282`, littéral posé à la main ; le harnais racine le LIT via `OracleTests.EXPECTED_ASSERTS` — cohérent entre les deux, point vérifié du dispatch). Mais aucun recoupement indépendant ne dérive 282 autrement (ex. somme de comptes déclarés par fichier). Un builder qui supprime des assertions ET abaisse `EXPECTED_ASSERTS` d'autant garde les deux harnais verts avec moins d'assertions réelles : la garde épingle une valeur historique, pas une propriété durable.
- **Sévérité** : LOW. Faiblesse inhérente aux gardes par comptage, partiellement mitigée (un core non compilable fait chuter `total` → META rouge, `oracle/run_tests.gd:56-58`). Connue, non active.
- **Reproduction** (ancre statique) : `oracle/run_tests.gd:21` `const EXPECTED_ASSERTS := 282` ; `grep "EXPECTED_ASSERTS" games/snake` → 1 déclaration + 1 lecture (`tests/run_tests.gd:55`), aucun calcul croisé indépendant.

---

## RAPPORT FINAL (verdicts séparés)

- **software_verdict** : NON ÉMIS par le red-team (advisory). Le `software_verdict` du jeu appartient à la couche verdict, à partir des reçus d'oracle vérifiés — pas au red-team (per dispatch : les findings alimentent `redteam_advisory`, jamais `software_verdict` directement). Je ne me substitue pas aux oracles.
- **evidence_verdict** : MECHANICAL_VALIDATION_ONLY — chaque finding cite une ancre statique non-LLM ré-exécutable (chemin:ligne + grep déterministe), vérifiable par lecture/grep sans exécuter le jeu.
- **claim_verdict** : NO_CLAIM_ALLOWED. Je ne certifie ni l'impact runtime de F1 (la fuite est-elle jamais nuisible ?) ni l'atteignabilité effective de `succeeded=false` (F2) : les deux exigent une exécution que je n'ai pas les droits de lancer (`run: aucun`) → **fog → HumanGate**.

### FOG → HumanGate (jugement de Pierre requis)

1. **F1** : faut-il (a) implémenter réellement l'analyseur `s10s` de littéraux gameplay incluant `07_TESTS`, ou (b) requalifier honnêtement la `expected_proof` de `params.bloc_unique` en retirant « tests compris » ? « EXACTEMENT 0 … tests compris » promet plus qu'aucun oracle ne vérifie aujourd'hui.
2. **F2** : accepter la solvabilité 50/50 comme preuve de « gagnable », ou exiger la sonde-contrôle `--max_ticks=1 → succeeded=false` en cas permanent avant de graver l'oracle R9 pour ce jeu ?

## SKIPPED_VALIDATION

- **item** : exécution réelle des 282 assertions / du bot de solvabilité / de la sonde `--max_ticks=1` — **où** : `games/snake` (harnais + `solvability.gd`) — **statut** : non fait — **raison** : permission `run: aucun` (contrat red-team). Audit du CODE statique uniquement ; les reçus d'exécution restent à la charge des oracles/driver.
- **item** : lecture ligne-à-ligne des 66 `.gd` — **où** : `games/snake` — **statut** : partiel — **raison** : audit ciblé sur les surfaces à risque du dispatch (harnais, solvabilité, cœur de tick, params, entrée, persistance, garde de pureté). Non relus en entier : `events.gd`, `pause.gd`, `restart.gd`, `debug_state.gd`, `debug_probe.gd`, présentation (`hud`/`end_screen`/`pause_panel`/`grid_view`/`capture`/`scene`), `boot.gd`, `exit.gd`, et une partie des tests satellites — parcourus par grep/contexte, aucun finding n'en dépend.
- **item** : preuve que la fuite `200.0` (F1) serait détectée par l'oracle `s10s` réel — **où** : `scripts/forge` — **statut** : non fait — **raison** : l'oracle n'existe pas (c'est précisément F1) ; rien à exécuter.
- **item** : lecture des reçus `lab/forge_runs/snake/evidence/**` — **où** : run_dir — **statut** : non fait — **raison** : hors du diff jugé (aveuglé) ; je juge le code, pas les logs d'un run, pour ne pas me rassurer sur parole.

```json
{"findings": [{"angle": "littéral de gameplay hors du bloc params + déclaré≠exécuté", "faille": "La preuve d'isolation des paramètres (wiremap params.bloc_unique, expected_proof static_oracle « EXACTEMENT 0 littéraux gameplay hors params.gd, tests compris ») délègue la vérification exhaustive à un analyseur forge.static_oracles/s10s qui n'existe pas ; le test GDScript params_isolation ne scanne que 05_SYSTEMS+06_RUNTIME (jamais 07_TESTS) avec 4 sous-chaînes. Résultat : tick_rate_thresholds.test.gd:13 contient le littéral 200.0 == params.VITESSE_INITIALE_MS, hors params.gd, non attrapé.", "severite": "MEDIUM", "reproduction": "grep -rniE 'def .*(isolation|litteraux|literal)|VITESSE_INITIALE' scripts/forge/*.py -> 0 fonction ; params_isolation.test.gd:67-68 scanne 05_SYSTEMS+06_RUNTIME seulement ; grep -n '200\\.0' games/snake/07_TESTS/unit/tick_rate_thresholds.test.gd -> :13 ; params/params.gd:13 VITESSE_INITIALE_MS=200.0"}, {"angle": "solvabilité par construction / variance de métrique (R9)", "faille": "solvability.gd émet succeeded=(statut==TERMINE_GAGNE) ; sur 50 graines succeeded est constamment true (cible 25 sur 400 cases, triviale pour un bot glouton BFS). La branche succeeded=false n'est jamais exercée et aucune sonde-contrôle ne prouve qu'elle est vivante — signal à variance nulle. Pas un défaut de construction (la chaîne graine->food_spawn->Loop.step ne consulte pas le vérificateur de victoire) mais preuve méthodologiquement incomplète.", "severite": "LOW", "reproduction": "godot --headless --path games/snake --script res://solvability.gd -- --seed=1 --max_ticks=1 DOIT imprimer FORGE_TRIAL {\"succeeded\": false, \"ticks\": null} (solvability.gd:30,36) ; si succeeded:true la branche est figée. A ajouter comme sonde-contrôle permanente."}, {"angle": "cas limite queue-en-croissance dans le bot de solvabilité", "faille": "bot_policy.gd:26-27 retire inconditionnellement la queue des murs (walls.erase(segments[last])) alors que son commentaire ligne 25 dit « sauf croissance » ; sur un tick de croissance la queue est conservée par loop.gd:40-44. Divergence latente entre le modèle du bot et la logique. Effet actuellement masqué (nourriture jamais sur le corps, donc case-cible != queue) et ne peut produire qu'un faux négatif, jamais un faux vert.", "severite": "LOW", "reproduction": "bot_policy.gd:26-27 (erase inconditionnel) vs commentaire :25 ; comparer loop.gd:41-43 (if not mange: corps_a_verifier.pop_back())"}, {"angle": "test qui fige une valeur historique", "faille": "Les deux harnais gatent sur total==EXPECTED_ASSERTS (oracle/run_tests.gd:21 :=282, littéral maintenu à la main ; le harnais racine le lit via OracleTests.EXPECTED_ASSERTS donc cohérent). Aucun recoupement indépendant ne dérive 282 autrement : supprimer des assertions ET abaisser le littéral d'autant garde les deux harnais verts avec moins d'assertions réelles. Faiblesse inhérente aux gardes par comptage, partiellement mitigée par la chute de total si un core ne compile pas.", "severite": "LOW", "reproduction": "oracle/run_tests.gd:21 const EXPECTED_ASSERTS := 282 ; grep 'EXPECTED_ASSERTS' games/snake -> 1 déclaration + 1 lecture (tests/run_tests.gd:55), aucun calcul croisé indépendant"}]}
```

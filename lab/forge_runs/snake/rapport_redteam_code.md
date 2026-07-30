# rapport_redteam_code.md — Snake (dispatch snake-cal3-20260730-162425 / s11-redteam-code)

> Red-team CODE **advisory**, contexte aveuglé (le raisonnement du builder n'a pas été lu).
> Aucun fichier modifié. Chaque faille cite une ancre statique ou une reproduction exécutable
> par un oracle non-LLM en aval. Le red-team CRITIQUE ; il ne PROUVE pas et ne juge pas le code.
>
> Vocabulaire de verdict : OK / FAIL / BLOCKED.
> `software_verdict` sur les points appuyés par un oracle ; `claim_verdict: NO_CLAIM_ALLOWED` partout.

---

## Périmètre lu

- `games/snake/05_SYSTEMS/**` (13 briques pures) · `06_RUNTIME/adapters/**` (adaptateurs) ·
  `07_TESTS/**` (26 fichiers unit + oracles) · `solvability.gd` · `mutation_triage.json`.
- Angles imposés par la tâche : double harnais, solvabilité par construction, test tautologique,
  littéral de gameplay hors params, dépendance logique→rendu/Input, cas limites
  (demi-tour même tick, collision simultanée nourriture/corps, grille pleine, reprise après
  pause longue, sauvegarde corrompue).

---

## Suspicions DÉFUSÉES (pas de faille — restitué honnêtement)

Un red-team qui n'annonce que ses trouvailles cache ce qu'il a écarté. Voici les angles vérifiés
et **écartés avec ancre** :

1. **Double harnais — délégation NON creuse.** `tests/run_tests.gd` (racine, point d'entrée de
   l'oracle godot) et `07_TESTS/oracle/run_tests.gd` **énumèrent le même dossier**
   `res://07_TESTS/unit` et exécutent les mêmes fichiers (`tests/run_tests.gd:23,39-51` vs
   `07_TESTS/oracle/run_tests.gd:26,41-53`). Le total attendu est **lu** du harnais canonique
   (`tests/run_tests.gd:19,55` → `OracleTests.EXPECTED_ASSERTS`), jamais recopié → aucune dérive
   possible entre les deux `EXPECTED_ASSERTS`. Ajouter/retirer une assertion casse les DEUX de la
   même manière (garde META, ligne 56-58). **Suspicion #1 écartée.**

2. **Solvabilité PAS « par construction ».** Le générateur d'instances est `State.initial(seed)`
   (`state.gd:33-55`) : il ne consulte **jamais** le bot. Le bot (`bot_policy.gd`) est un
   **glouton BFS plus-court-chemin** (`grid_nav.gd:52-105`), pas un cycle hamiltonien : `succeeded`
   dépend d'une partie réellement jouée, `_repli` peut mener à la mort (`bot_policy.gd:32-40`). Le
   précédent R9 (2026-07-21, générateur qui interroge la brique testée) **n'est pas** reproduit ici.
   → La sous-faille résiduelle (couverture du chemin d'échec) est traitée en **F3**, sévérité basse.

3. **Demi-tour dans le même tick — sûr.** `demander()` compare à `dir_effectuee` (dernière
   direction *exécutée*), jamais à l'attente (`direction_rules.gd:24-30`), et l'attente est de
   profondeur 1 (écrasable). Test couvrant explicitement le cas effectuée=DROITE / attente=HAUT /
   demande=GAUCHE refusée (`no_reverse.test.gd:33-38`). **Écarté.**

4. **Collision simultanée nourriture/corps — cohérente.** La nourriture n'apparaît jamais sur le
   corps (`food_spawn.gd:14-24` exclut tous les segments). La case libérée par la queue ne tue pas,
   SAUF croissance (`loop.gd:40-44` : `pop_back` seulement si `not mange`). **Écarté.**

5. **Reprise après pause longue — bornée.** `runtime_loop.avancer()` jette le surplus
   d'accumulateur (`runtime_loop.gd:24-25`, retour `{"ticks":1,"accumulateur":0.0}`) ; pause = 0
   tick, accumulateur figé (`:18-20`). Testé à D=5s/60s → 1 tick (`no_time_catchup.test.gd:14-21`).
   **Écarté.**

6. **Sauvegarde corrompue — 4 cas couverts.** `best_score_store.charger()` gère absent/illisible/
   vide/corrompu → 0 sans exception (`best_score_store.gd:16-33`). **Écarté.**

7. **Test tautologique (`>=`) — absent des tests.** Le helper `Harness.eq` est une **égalité
   stricte** (`harness.gd:18-24`). Le seul `>=` de production est `end_condition.est_gagne`
   (`end_condition.gd:9`) et il est encadré par un test à bornes strictes cible-1 / cible / cible+1
   (`end_condition.test.gd:14-16`). **Écarté.**

8. **Dépendance logique pure → rendu/Input — non observée.** Les briques `05_SYSTEMS/**` sont
   toutes `extends RefCounted` sans `Input`, `InputEvent`, ni API de rendu ; la traduction clavier
   vit dans l'adaptateur `input_adapter.gd`. **Écarté.**

---

## FAILLES

### F1 — `params.bloc_unique` : l'oracle d'isolation DÉCLARÉ ne couvre pas ce qu'il promet (déclaré > exécuté) — MEDIUM

**Angle** : littéral de gameplay hors du bloc params / oracle statique surdéclaré.

**Faille.** La wiremap déclare pour `params.bloc_unique` un `expected_proof.kind: static_oracle`
dont le `statement` est : *« Le nombre de litteraux numeriques de gameplay … présents hors de
05_SYSTEMS/params/params.gd est EXACTEMENT 0, scripts de présentation et **tests compris**. »*
Or **aucun oracle visible dans ce run_dir n'applique cette promesse**, et elle est **littéralement
fausse en dépôt** :

- L'enforcement in-repo (`07_TESTS/unit/params_isolation.test.gd`) scanne **uniquement**
  `res://05_SYSTEMS` et `res://06_RUNTIME` (`:67-68`) — **jamais** `07_TESTS`. Il ne teste que
  4 valeurs distinctives `["200","0.92","80","25"]` (`:13`), par simple sous-chaîne. Son propre
  commentaire l'admet (`:6-9`) et **délègue** l'exhaustivité à `forge.static_oracles` (s10s),
  dont **aucun reçu n'est présent dans ce run_dir**.
- Des littéraux de gameplay **dérivés vivent réellement dans les tests** :
  `184.0` (= VITESSE_INITIALE_MS 200 × ACCELERATION_PAS 0.92) en
  `07_TESTS/unit/growth_score_same_tick.test.gd:47` et `tick_rate_thresholds.test.gd:14-15` ;
  `19` (= TAILLE_GRILLE − 1, bord de grille) en `07_TESTS/unit/end_condition.test.gd:20`,
  `input_adapter_burst.test.gd:32,47,60`, `tick_pure.test.gd:63`.

Conséquence : si l'oracle Python s10s **n'a pas tourné** (ou emploie une définition plus permissive
que le texte de la wiremap), la garantie « EXACTEMENT 0, tests compris » est **non prouvée** et
contredite en dépôt. C'est le mode de panne canonique du studio (déclaré ≠ exécuté), pas un bug de
runtime.

**Sévérité** : MEDIUM (advisory) — porte sur la *véracité d'une preuve*, pas sur le gameplay.

**Reproduction (statique, exécutable par un oracle non-LLM)** :
1. `grep -rn "184\.0" games/snake/07_TESTS` → 3 occurrences (non vide).
2. `grep -rn "Vector2i(19," games/snake/07_TESTS` → ≥5 occurrences.
3. Lire `params_isolation.test.gd:13,67-68` : racines de scan = {05_SYSTEMS, 06_RUNTIME}, valeurs = 4.
4. Chercher un reçu `forge.static_oracles` / s10s ciblant `07_TESTS/**` dans le run_dir → absent.
Un vrai analyseur AST (celui référencé par la wiremap) tranche déterministe : soit il FAIL sur ces
littéraux, soit sa définition diffère du texte déclaré (dans les deux cas : écart déclaré↔exécuté).

---

### F2 — `growth.manger` produit un état INVALIDE sur grille pleine (latent, mais gardé par une constante `A_EQUILIBRER`) — LOW

**Angle** : cas limite « grille pleine ».

**Faille.** `food_spawn.tirer` renvoie `grille_pleine=true` sans reposer de nourriture
(`food_spawn.gd:30-31`). Dans `growth.manger`, ce cas **ne met PAS à jour** `state.nourriture`
(`growth.gd:24-27` : mise à jour seulement `if not tirage["grille_pleine"]`). La nourriture reste
alors sur la **case que la tête vient de manger**, c.-à-d. `state.segments[0]` → `est_valide()`
renvoie `false` (`state.gd:90-91` : `if nourriture in segments`). Aucun statut terminal
« grille pleine » n'est émis : l'état gèle sur un invariant cassé au lieu d'un TERMINE_GAGNE propre.

C'est **actuellement inatteignable** : la victoire se déclenche à longueur 25 (`params.gd:28`,
`end_condition.gd:9`) bien avant les 400 cases. **Mais** `CIBLE_VICTOIRE` est déclarée
`A_EQUILIBRER` (`params.gd:27`, charter.parametres_de_design) : c'est un bouton d'équilibrage. Le
relever vers la capacité de la grille rend la faille **vivante** — couplage caché entre une valeur
« à équilibrer librement » et une branche non gérée.

**Sévérité** : LOW (mort sous les paramètres actuels ; réveillé par un simple réglage prévu).

**Reproduction (test unitaire, exécutable par le harnais en aval)** :
construire un état dont `segments` occupe toutes les cases sauf une, `nourriture` sur cette dernière
case, tête adjacente, direction vers elle ; `Loop.step(s, AUCUNE)` ; asserter
`e.est_valide() == false` ET `e.statut != State.Statut.TERMINE_GAGNE`. (Ancre statique :
`growth.gd:24-27` sans branche `grille_pleine` vers un terminal ; `state.gd:90-91`.)

---

### F3 — L'oracle de solvabilité n'exerce JAMAIS le chemin `succeeded=false` — LOW

**Angle** : solvabilité — falsifiabilité de l'oracle R9.

**Faille.** Le bot glouton peut perdre en principe (`bot_policy.gd:32-40`, `_repli` puis « mort
assumée »), donc l'oracle **n'est pas** faux-vert par construction (voir Défusé #2). Mais la cible
de victoire (longueur 25) sur une grille de **400 cases** rend le corps du serpent ≤ 24 segments :
un glouton plus-court-chemin ne s'auto-enferme quasiment jamais à cette taille. Résultat rapporté :
**50/50 succès**, soit **zéro échantillon négatif**. L'oracle prouve donc « la mécanique tourne et
un bot gagne sur les graines testées », mais **n'établit pas** que `succeeded=false` soit
observable dans le régime testé — la falsifiabilité de la propriété de solvabilité n'est pas
démontrée par ce run. Un oracle qui ne peut structurellement produire que « vert » sur son
échantillon porte peu d'information (cf. règle de variance des métriques, 2026-07-21).

**Sévérité** : LOW (advisory) — la solvabilité *positive* est réelle ; c'est la *preuve de
falsifiabilité* qui manque.

**Reproduction (statique + oracle en aval)** :
- Ancre : `params.gd:28` (CIBLE_VICTOIRE=25) vs `food_spawn.cases_libres` sur 20×20=400
  (`food_spawn.gd:19-24`) ; `bot_policy.gd` glouton.
- Oracle en aval : exécuter `solvability.gd --seed=k` pour k∈[1..N] → attendu `succeeded=true`
  partout (démontre l'absence d'échantillon négatif). Pour montrer que le chemin d'échec EST
  atteignable, relever `CIBLE_VICTOIRE` vers la capacité et ré-exécuter → apparition de
  `succeeded=false`. (Changement de paramètre : hors de mon périmètre d'écriture — **fog HumanGate**.)

---

### F4 — LCG + modulo : placement de nourriture biaisé/prévisible (déterminisme OK, uniformité NON) — LOW

**Angle** : cas limite alea seedé.

**Faille.** `food_spawn._prochain` est un LCG « Numerical Recipes » masqué `& 0x7fffffff`
(`food_spawn.gd:9-10`) ; l'index est `nouvel_etat % libres.size()` (`:33`). Les **bits de poids
faible** d'un LCG ont des périodes courtes bien connues, et `% n` sur une liste réordonnée (x puis y)
échantillonne précisément ces bits faibles → distribution non uniforme, motifs de placement
prévisibles. La **contrainte déclarée** (déterminisme seedé, jamais `randi()` moteur) est **tenue**
— c'est l'uniformité, non exigée mais implicitement attendue d'un « tirage sur les cases libres »,
qui ne l'est pas.

**Sévérité** : LOW (advisory) — cosmétique pour ce jeu ; n'affecte ni les oracles ni le déterminisme.

**Reproduction (statique + mesure en aval)** :
ancre `food_spawn.gd:9-10,33`. Un oracle en aval peut mesurer la distribution des premières
nourritures sur seeds∈[1..1000] et montrer un χ² d'écart à l'uniforme (variance de placement),
sans juger le code — mesure, pas verdict.

---

## Note sur le mutant survivant (mutation_triage.json)

Le seul survivant déclaré (`food_spawn.gd:17`, `true→false`) est argumenté **équivalent** de façon
solide : `occupees` n'est lu que par `has()` sur la clé (`food_spawn.gd:22`), jamais par sa valeur.
**Non retenu comme faille** — l'argument est vérifiable statiquement et tient. (Advisory : aucune.)

---

## RAPPORT FINAL (verdicts séparés)

- **software_verdict: OK** *(appuyé oracle)* — pour les points DÉFUSÉS 1,3,4,5,6,7,8 : chacun cite
  une ancre de code + un test unitaire strict existant (`no_reverse`, `no_time_catchup`,
  `pause_neutral`, `collision_exact`, `end_condition`, harnais délégué non creux). Ce sont des
  propriétés couvertes par le harnais mécanique du produit.
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — toute affirmation ci-dessus s'appuie sur une
  ancre statique lisible ou un test/oracle non-LLM exécutable en aval ; aucune sur mon jugement seul.
- **claim_verdict: NO_CLAIM_ALLOWED** — F1 (l'oracle s10s a-t-il tourné avec la définition
  déclarée ?) et F3 (relever CIBLE_VICTOIRE pour exposer le chemin d'échec) réclament respectivement
  la lecture d'un reçu absent et une modification de paramètre **hors de mon périmètre d'écriture** :
  je remonte un **besoin HumanGate (fog)**, sans claim auto-certifié.

**fog → Pierre** :
1. Existe-t-il un reçu `forge.static_oracles` (s10s) qui scanne `07_TESTS/**` avec la définition
   stricte « EXACTEMENT 0, tests compris » ? Si non, la wiremap `params.bloc_unique.expected_proof`
   surdéclare (F1). Décision : requalifier le texte de l'oracle, ou câbler l'oracle sur les tests.
2. Faut-il durcir l'oracle de solvabilité pour exhiber au moins un `succeeded=false` (target
   relevé, ou bot volontairement contraint) afin de prouver sa falsifiabilité ? (F3)
3. `growth.manger` doit-il émettre un terminal « grille pleine » explicite plutôt que de laisser un
   état invalide, avant toute hausse de `CIBLE_VICTOIRE` ? (F2)

---

## SKIPPED_VALIDATION

| Item de validation | Périmètre (où) | Statut | Raison |
|---|---|---|---|
| Exécution réelle des harnais (`tests/run_tests.gd`, `07_TESTS/oracle/run_tests.gd`) et confirmation du 282/282 | `games/snake/07_TESTS` | non fait | `permissions.run: aucun` — red-team aveuglé, la preuve d'exécution revient à l'oracle s9/s10, pas à moi. Analyse statique uniquement. |
| Exécution de `solvability.gd` sur un balayage de graines pour mesurer le taux réel de `succeeded` | `games/snake/solvability.gd` | non fait | `run: aucun`. F3 fournit la repro pour l'oracle en aval. |
| Vérification qu'un reçu `forge.static_oracles` (s10s) couvre `07_TESTS/**` | run_dir `lab/forge_runs/snake` | partiel | Aucun reçu s10s trouvé dans ce run_dir ; ne peut être tranché sans l'artefact s10s → remonté en fog (F1). |
| Reproduction dynamique de F2 (grille pleine) | `growth.gd` | non fait | `run: aucun` ; fourni comme test unitaire à exécuter en aval. Latent sous paramètres actuels. |
| Mesure du biais de distribution du LCG (F4) | `food_spawn.gd` | non fait | `run: aucun` ; fourni comme mesure χ² pour un oracle en aval. |
| Lecture du diff builder « sans justifications » | étape 9 | partiel | Le diff n'était pas isolé dans le run_dir ; audit mené directement sur l'arbre `games/snake/**` (état post-build). Le raisonnement du builder n'a délibérément pas été recherché (aveuglement respecté). |

---

```json
{"findings": [{"angle": "littéral de gameplay hors params / oracle statique surdéclaré", "faille": "La wiremap déclare pour params.bloc_unique un static_oracle 'EXACTEMENT 0 littéral de gameplay hors params.gd, tests compris', mais aucun oracle du run_dir ne l'applique et c'est faux en dépôt : le test in-repo params_isolation.test.gd ne scanne que 05_SYSTEMS/06_RUNTIME (jamais 07_TESTS) et 4 valeurs seulement, alors que des littéraux de gameplay dérivés vivent dans les tests (184.0 = 200*0.92 ; 19 = TAILLE_GRILLE-1). Déclaré > exécuté.", "severite": "MEDIUM", "reproduction": "grep -rn '184\\.0' games/snake/07_TESTS (3 hits) ; grep -rn 'Vector2i(19,' games/snake/07_TESTS (>=5 hits) ; lire params_isolation.test.gd:13,67-68 (racines={05_SYSTEMS,06_RUNTIME}, valeurs=4) ; absence de reçu forge.static_oracles s10s ciblant 07_TESTS dans le run_dir."}, {"angle": "cas limite grille pleine", "faille": "growth.manger ne met pas à jour state.nourriture quand food_spawn.tirer renvoie grille_pleine=true (growth.gd:24-27) : la nourriture reste sur segments[0], rendant est_valide()==false (state.gd:90-91), sans terminal 'grille pleine'. Inatteignable sous CIBLE_VICTOIRE=25 mais cette constante est A_EQUILIBRER : la relever réveille la faille.", "severite": "LOW", "reproduction": "Test unitaire : segments occupant toutes les cases sauf une, nourriture sur cette case, tête adjacente ; Loop.step(s, AUCUNE) ; asserter e.est_valide()==false et e.statut != TERMINE_GAGNE. Ancres : growth.gd:24-27 ; state.gd:90-91 ; params.gd:27-28."}, {"angle": "solvabilité — falsifiabilité de l'oracle R9", "faille": "L'oracle de solvabilité rapporte 50/50 succès et n'exhibe jamais succeeded=false. Le bot glouton PEUT perdre (donc pas faux-vert par construction), mais la cible de victoire (longueur 25 sur 400 cases) rend l'échec quasi impossible dans le régime testé : zéro échantillon négatif, la falsifiabilité de la propriété n'est pas démontrée.", "severite": "LOW", "reproduction": "Ancres : params.gd:28 (CIBLE=25) vs food_spawn.gd:19-24 (400 cases) ; bot_policy.gd glouton. Oracle aval : solvability.gd --seed=k pour k in [1..N] -> succeeded=true partout (pas d'échantillon négatif) ; relever CIBLE_VICTOIRE vers la capacité -> apparition de succeeded=false (changement de paramètre = fog HumanGate)."}, {"angle": "alea seedé — uniformité du placement de nourriture", "faille": "food_spawn utilise un LCG masqué &0x7fffffff puis index = etat % libres.size() (food_spawn.gd:9-10,33). Les bits de poids faible d'un LCG ont des périodes courtes ; le modulo les échantillonne -> placement de nourriture non uniforme et prévisible. Le déterminisme seedé (exigence déclarée) est tenu ; l'uniformité, non.", "severite": "LOW", "reproduction": "Ancre statique food_spawn.gd:9-10,33. Oracle aval : mesurer la distribution des premières nourritures sur seeds in [1..1000] et calculer un χ² d'écart à l'uniforme (mesure, pas verdict)."}]}
```

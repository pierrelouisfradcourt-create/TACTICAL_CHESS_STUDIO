# Rapport Red-team CODE — breakout_v2 (run 2)

- **Dispatch** : `FORGE_DISPATCH:s11-redteam-code:breakout_v2-run2-20260731-101252`
- **Posture** : auditeur AVEUGLÉ (aucun accès aux justifications du builder). Advisory : ne remplace aucun oracle.
- **Périmètre** : `games/breakout_v2/**` — lecture seule. Aucun fichier modifié.
- **Focale run 2** : nouveaux tests anti-mutants · déplacement de `main.gd` (pilote de scène) · `EXPECTED_ASSERTS`/compteurs de preuve · champ de promesse wiremap.
- **Contrainte d'exécution** : `run: aucun` + `git`/godot indisponibles pour cet agent → **aucune reproduction exécutée par moi**. Chaque repro est fournie comme **ancre statique (fichier:ligne)** + **étapes exécutables par un oracle non-LLM en aval**. Voir `SKIPPED_VALIDATION`.

---

## Séparation des verdicts

- **software_verdict** : `FAIL`/`OK` **non prononçable par moi** (aucun oracle exécuté ici) → je ne prononce pas de software_verdict. Les findings sont **advisory** et destinés au parseur déterministe `forge.run_real.extract_redteam_findings`.
- **evidence_verdict** : `MECHANICAL_VALIDATION_ONLY` pour les seules ancres statiques (fichier:ligne vérifiables sans LLM).
- **claim_verdict** : `NO_CLAIM_ALLOWED`.

---

## Ce qui a été vérifié et jugé SAIN (aucun finding — pour honnêteté du périmètre)

- **Déplacement de `main.gd`** (`06_RUNTIME/adapters/runtime_loop/main.gd`) : le pilote **lit** l'état (`FieldView/BrickView/Hud/EndScreen.*(_state)` en `_draw`, l.64-79) sans recalculer la simulation ; le delta moteur **entre uniquement** à l'adaptateur (`RL.avancer(_acc, delta*1000.0, gelee)`, l.43) et la logique pure ne voit jamais l'horloge (`Loop.step(_state, _dir)`, l.46). Axe « scène recalcule / delta non arrêté » : **non reproduit**.
- **`end_conditions_strict.test.gd`** : égalités strictes, réciproques comptées `== 0`, balayage 3×3 asserté `== 0` hors boucle (l.75). Aucun `>=` tautologique.
- **`negative_control.gd`** : contrôle négatif réel — interception `>` camp-centre ET `>` suivi-naïf (stricts, l.38/40) + `interc != SEEDS` (l.42, gagne les 7). Répond à la leçon `oracle_solvability_lesson`.
- **`replay_determinism.gd`** : rejoue la séquence via la **boucle pure** (l.39), pas via l'accumulateur temporisé → le déterminisme testé est celui de `Loop.step` (détecte une horloge/RNG cachée). Valide, non tautologique de façon nuisible.
- **`paddle_deflection_three_points.test.gd`** + impl `paddle_deflection.gd` : la valeur attendue mirroite l'expression de l'impl, MAIS le centre (`vx'==0`), la distinctness des 3 `vx'` et `vy<0` sont des propriétés **indépendantes**. Une mutation de la formule change le résultat numérique → tuée. **Non retenu comme finding.**

---

## Findings

### F1 — `EXPECTED_ASSERTS = 299` est un garde CIRCULAIRE, sur-vendu comme « anti-faux-vert » dans la promesse wiremap · sévérité MEDIUM

**Constat.** `tests/run_tests.gd:22` fixe `const EXPECTED_ASSERTS := 299`, commenté (l.21) « 274 (build run 1) + 25 (durcissement run 2) » : **le nombre EST la sortie mesurée**, incrémenté en run 2 pour coïncider avec les asserts ajoutés. Le garde (l.57) fait `if total != EXPECTED_ASSERTS`, où `total = h.passed + h.failed` (l.56) = nombre d'assertions **réellement exécutées**. La wiremap `09_WIREMAP/wiremap.json:2671` présente cela en champ de **preuve** : « 299/299 assertions ; garde anti-faux-vert EXPECTED_ASSERTS=299 (mesure reelle) **egale le total execute** ». C'est explicitement une promesse écrite pour égaler le résultat.

**Pourquoi c'est une faille (portée réelle vs annoncée).** Le garde attrape un **fichier de test manquant ou non compilable** (ses asserts ne tournent pas → `total < 299` → META fail). Il n'offre **aucune** protection contre l'auteur qui **supprime une assertion ET décrémente la constante dans la même édition** : la suite reste verte. La force « anti-faux-vert » est donc plus étroite que ce que le champ de preuve wiremap laisse entendre — c'est le motif exact signalé au pré-mortem « compteur de preuve ajusté après coup ».

**Reproduction (exécutable par oracle non-LLM aval).**
1. *Statique* : compter les sites d'appel `h.eq(`/`h.ok(` sur `07_TESTS/unit/*.test.gd` (en dépliant les boucles à listes littérales : `hud_readout` 4+4, `end_conditions` 0 assert intra-boucle) et confirmer que la somme **est maintenue-pour-égaler** 299, sans spécification indépendante qui impose 299. Ancres : `run_tests.gd:22`, `run_tests.gd:56-59`, `wiremap.json:2671`.
2. *Dynamique* : retirer un seul `h.eq(...)` de n'importe quel test **et** décrémenter `EXPECTED_ASSERTS` de 1 → `godot --headless --path games/breakout_v2 --script res://tests/run_tests.gd` sort **0** (vert). Prouve que le garde ne discrimine pas une suppression d'assertion coordonnée.

**Verdict d'appui.** Ancres statiques `MECHANICAL_VALIDATION_ONLY`. Repro dynamique = besoin d'oracle godot aval (fog).

---

### F2 — `purity_guard.test.gd:55` : assertion `>=` (seuil non strict), l'anti-pattern explicitement proscrit au pré-mortem · sévérité LOW

**Constat.** `07_TESTS/unit/purity_guard.test.gd:55` : `h.ok(fichiers.size() >= 15, "au moins 15 fichiers de logique pure scannes")`. Le pré-mortem s10a-oracle-code impose « JAMAIS de `>=` tautologique dans un test : asserter le comportement STRICT ». Ce seuil accepte 15..∞ : une mutation qui **supprime** des fichiers de logique pure jusqu'à 15 passe encore ce garde de couverture. Les vrais contrôles de pureté (`viol_api == 0`, `sans_refcounted == 0`, `import_presentation == 0`, l.88-90) restent stricts — d'où LOW, mais le garde « assez de fichiers scannés » ne verrouille pas un compte durable.

**Reproduction (statique, non-LLM).** `grep -n '>=' games/breakout_v2/07_TESTS/unit/*.test.gd` → unique occurrence `purity_guard.test.gd:55` à l'intérieur d'un prédicat `h.ok(...)`. Un lint peut refuser `>=`/`<=` dans un argument de `h.ok(`/`h.eq(`.

**Verdict d'appui.** Ancre statique `MECHANICAL_VALIDATION_ONLY`.

---

### F3 — L'accumulateur à pas fixe JETTE le reste sous-tick (`accumulateur: 0.0` à chaque tick), et `no_time_catchup.test.gd` fige désormais cette perte · sévérité LOW (déclaré au charter → fog HumanGate)

**Constat.** `06_RUNTIME/adapters/runtime_loop/runtime_loop.gd:23-26` : quand un tick est émis, retourne `{"ticks": 1, "accumulateur": 0.0}` — le surplus au-delà de `pas_ms()` (jusqu'à presque un tick entier, et à haute cadence l'excès fractionnaire par trame) est **jeté** au lieu d'être reporté (`acc -= pas_ms()`). Un intégrateur à pas fixe standard **reporte** le reste pour aligner le temps-simulation sur le temps réel à long terme. Conséquences : vitesse de jeu **dépendante du framerate** et **biais systématique de ralenti** même à haute cadence.

**Réserve d'honnêteté (aveuglé mais je lis le charter/wiremap amont).** Le charter **déclare** cet invariant : « AU PLUS 1 tick … le surplus est JETE (remis a 0) ». Ce n'est donc **pas** une violation de spec — c'est un choix **ratifié**. Le déterminisme de la simulation pure n'est **pas** affecté (le replay passe par la boucle pure, pas par l'accumulateur — cf. `replay_determinism.gd:39`). Je le remonte comme **observation HumanGate**, pas comme défaut : `no_time_catchup.test.gd:18,23` asserte `accumulateur == 0.0`, ce qui **fige** le comportement et rendrait un futur correctif « report du reste » cassant pour ce test. À confirmer par Pierre : le ralenti systématique est-il l'intention ?

**Reproduction (comportementale, non-LLM aval).** `RL.avancer(0.0, RL.pas_ms()*1.9, false)` renvoie `{"ticks":1, "accumulateur":0.0}` → 0.9·pas de temps perdu. Ancres : `runtime_loop.gd:23-26`, `no_time_catchup.test.gd:18,23`.

**Verdict d'appui.** Ancres statiques `MECHANICAL_VALIDATION_ONLY`. La qualification « défaut vs intention » relève de Pierre (`claim_verdict: NO_CLAIM_ALLOWED`, fog).

---

## Fog → HumanGate (jugement, hors oracle)

- **[fog-1]** `demo_rebound_variability.gd:21-22` déduplique via `snappedf(offset, 0.001)` / `snappedf(vx, 0.01)`. Deux valeurs proches d'une frontière de bucket (ex. 0.0004 et 0.0006) tombent dans deux buckets distincts → le proxy de variance **peut gonfler** la distinctness près des frontières. Pour Breakout les points d'impact couvrent une large plage → en pratique probablement sans effet, **non prouvé par moi** (je n'exécute pas). Je ne le classe pas en finding (« pas de suspicion non prouvée »). À trancher : la barre `>= 2` distinctes est-elle robuste au bucketing, ou faut-il un écart minimal entre valeurs ?
- **[fog-2]** Les oracles `07_TESTS/oracle/*.gd` (SceneTree autonomes) ne sont **pas** énumérés par `tests/run_tests.gd` (qui ne charge que `07_TESTS/unit/*.test.gd`). Leur exécution dépend du **driver Forge** (`forge.mutation.run_mutation_test`, etc.), hors de mon périmètre code. Si le driver ne les invoque pas, ce sont des preuves dormantes (précédent studio « déclaré ≠ exécuté »). À vérifier côté driver, pas ici.
- **[fog-3]** F1 repro dynamique et F3 repro comportementale nécessitent un poste godot 4.6.3 (fenêtre/headless) que cet agent n'a pas. Besoin d'un oracle aval pour trancher software_verdict.

---

## SKIPPED_VALIDATION

- **Exécution des tests unitaires** — *où* : `tests/run_tests.gd` (28 fichiers, 299 asserts annoncés) — *statut* : NON FAIT — *raison* : `run: aucun` dans mon contrat + godot indisponible pour cet agent. Je n'ai pas confirmé le compte 299 ni le vert de la suite ; je l'audite statiquement (F1).
- **Repro dynamique F1** (suppression assert + décrément constante → vert) — *où* : `run_tests.gd` — *statut* : NON FAIT (décrit, non exécuté) — *raison* : idem, pas d'exécution godot.
- **Repro comportementale F3** (`avancer` perd 0.9·pas) — *où* : `runtime_loop.gd` — *statut* : NON FAIT (décrit, non exécuté) — *raison* : idem.
- **Oracle de mutation réel** — *où* : `07_TESTS/oracle/mutation_invariants.gd` + driver `forge.mutation` — *statut* : NON FAIT — *raison* : hors périmètre (piloté par le driver, pas par le diff code) ; j'ai seulement lu que les invariants ré-assertés sont stricts (`!=`, égalités exactes).
- **Vérification `snappedf` gonfle-t-il la variance** (fog-1) — *où* : `demo_rebound_variability.gd` — *statut* : PARTIEL (raisonné, non mesuré) — *raison* : nécessite d'exécuter une partie pour observer la distribution réelle des offsets.
- **Câblage des oracles `07_TESTS/oracle/*.gd` au driver** (fog-2) — *où* : `scripts/forge/` — *statut* : NON FAIT — *raison* : hors périmètre code de cette étape (lecture seule sur `games/breakout_v2/**`).

---

## Rapport final

- **software_verdict** : non prononcé (aucun oracle exécuté par cet agent ; findings advisory pour le parseur déterministe).
- **evidence_verdict** : `MECHANICAL_VALIDATION_ONLY` (ancres statiques fichier:ligne uniquement).
- **claim_verdict** : `NO_CLAIM_ALLOWED`.

Le code de run 2 est discipliné : déplacement de `main.gd` propre (lecture d'état, delta arrêté à l'adaptateur), tests majoritairement stricts et non tautologiques, contrôle négatif de solvabilité réel. Les findings portent sur (F1) la **comptabilité de preuve circulaire** sur-vendue en promesse wiremap, (F2) un `>=` de seuil résiduel, (F3) une **perte de temps sous-tick** figée par un test — cette dernière déclarée au charter, donc remontée en fog et non en défaut.

```json
{"findings": [{"angle": "comptabilite de preuve / garde anti-faux-vert", "faille": "EXPECTED_ASSERTS=299 (run_tests.gd:22) est le total mesure lui-meme, incremente 274->299 en run 2 pour coincider avec les asserts ajoutes ; total=passed+failed (run_tests.gd:56) egale ce compte par construction, et la wiremap (wiremap.json:2671) le presente en champ de preuve 'mesure reelle egale le total execute'. Le garde attrape un fichier de test manquant/non compilable mais offre zero protection contre une suppression d'assertion coordonnee avec un decrement de la constante ; la force anti-faux-vert est plus etroite que la promesse.", "severite": "MEDIUM", "reproduction": "Statique: comparer le compte de sites h.eq(/h.ok( sur 07_TESTS/unit/*.test.gd (listes litterales depliees) a EXPECTED_ASSERTS et confirmer l'absence de specification independante de 299 (ancres run_tests.gd:22, run_tests.gd:56-59, wiremap.json:2671). Dynamique aval: retirer un h.eq(...) ET decrementer EXPECTED_ASSERTS de 1 -> godot --headless --path games/breakout_v2 --script res://tests/run_tests.gd sort 0 (vert)."}, {"angle": "assertion de seuil non stricte (>=)", "faille": "purity_guard.test.gd:55 asserte h.ok(fichiers.size() >= 15, ...), un >= de seuil que le pre-mortem s10a-oracle-code proscrit explicitement ; il accepte 15..infini et ne verrouille pas un compte durable de fichiers de logique pure (une suppression jusqu'a 15 passe). Les controles de purete eux-memes restent stricts (== 0).", "severite": "LOW", "reproduction": "Statique: grep -n '>=' games/breakout_v2/07_TESTS/unit/*.test.gd -> unique occurrence purity_guard.test.gd:55 dans un predicat h.ok(...)."}, {"angle": "accumulateur a pas fixe / perte de temps sous-tick", "faille": "runtime_loop.gd:23-26 retourne accumulateur:0.0 a chaque tick emis, jetant le reste sous-tick au lieu de le reporter (acc -= pas_ms()) ; cela cause une vitesse de jeu dependante du framerate et un biais de ralenti systematique. no_time_catchup.test.gd:18,23 asserte accumulateur == 0.0 et fige cette perte, rendant un futur correctif 'report du reste' cassant. RESERVE: comportement DECLARE au charter ('surplus JETE remis a 0') et sans effet sur le determinisme de la simulation pure (replay via boucle pure) -> remonte en fog HumanGate, pas en defaut de spec.", "severite": "LOW", "reproduction": "Comportementale aval: RL.avancer(0.0, RL.pas_ms()*1.9, false) renvoie {ticks:1, accumulateur:0.0} -> 0.9*pas de temps perdu (ancres runtime_loop.gd:23-26, no_time_catchup.test.gd:18,23)."}]}
```

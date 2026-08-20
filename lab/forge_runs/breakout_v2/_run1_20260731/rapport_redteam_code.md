# Rapport red-team CODE — breakout_v2 (advisory)

FORGE_DISPATCH:s11-redteam-code:breakout_v2-run1-20260731-082705

Posture : auditeur AVEUGLÉ (je n'ai pas vu le raisonnement du builder). Lecture seule
(`games/breakout_v2/**`). Je CRITIQUE ; je ne prouve pas et je ne corrige rien. Chaque faille
porte une reproduction exécutable par un oracle non-LLM en aval. Vocabulaire de verdict : OK /
FAIL / BLOCKED. `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 0. Périmètre réellement audité (pour que l'absence de finding soit lisible, pas silencieuse)

Lus intégralement : les 22 fichiers de `05_SYSTEMS/**` (logique pure), les 12 adaptateurs
`06_RUNTIME/**` + `main.gd` + `solvability.gd` + `tests/run_tests.gd`, et 15 des tests
`07_TESTS/**` (unit + oracle) dont tous les tests de rebond/physique/fin/déterminisme.

### Angles prioritaires du contrat — résultat mécanique

| Angle prioritaire | Résultat | Ancre non-LLM |
|---|---|---|
| Rendu qui recalcule l'état au lieu de LIRE la sim pure | **RAS** | `field_view.gd`, `brick_view.gd`, `hud.gd`, `end_screen.gd` prennent `state` et le LISENT ; aucune règle décidée (ex. `brick_view.gd:22` teste `state.bricks[idx]`, ne détruit rien). |
| Delta-time moteur là où le pas fixe est requis | **RAS dans la sim** — voir F1 pour l'adaptateur | `05_SYSTEMS` n'appelle jamais d'horloge ; `main.gd:41` fait entrer `delta` UNIQUEMENT via l'accumulateur `RL.avancer`, la sim pure lit `FixedStep.dt()` (`loop.gd:44`). |
| Littéral de gameplay codé en dur hors module params | **RAS** | grep numérique sur `05_SYSTEMS\*` hors `params.gd` : seulement des divisions géométriques `/2.0` de constantes nommées ; aucun littéral de gameplay dispersé. |
| Epsilon introduit dans un test de rebond | **RAS** | grep `is_equal_approx\|epsilon\|approx` = 0 dans les tests ; `paddle_deflection_three_points.test.gd:25` et `wall_reflection_strict.test.gd` assertent en égalité stricte d'expressions dérivées de constantes nommées. |
| Dépendance sim → rendu/Input (sens du graphe inversé) | **RAS** | grep `06_RUNTIME\|adapters\|.tscn` dans `05_SYSTEMS` = 0 match ; garde statique `purity_guard.test.gd:84`. |
| Test qui fige une valeur d'implémentation au lieu d'une propriété durable | **1 cas → F1** | `no_time_catchup.test.gd:18,23`. |
| EXPECTED_ASSERTS / compteur de preuve ajusté après coup | **NON PROUVÉ** (exécution refusée) → SKIPPED_VALIDATION | `run_tests.gd:21` (`EXPECTED_ASSERTS := 274`). |
| Champ de promesse de la wiremap modifié pour coïncider | **NON AUDITÉ** (`git diff` refusé par mes permissions run:none) → SKIPPED_VALIDATION | — |

Deux findings advisory subsistent (F1 MEDIUM, F2 LOW). Aucun n'est une assertion cassée : ce
sont des **écarts promesse↔code + trous de couverture d'oracle**, terrain exact du red-team.

---

## F1 — MEDIUM — Accumulateur à perte : vitesse de simulation temps-réel dépendante du framerate, et un test qui FIGE cette perte comme propriété

**Angle** : delta-time / pas fixe au niveau produit + test qui fige une valeur d'implémentation.

**Faille.** `runtime_loop.avancer` (`06_RUNTIME/adapters/runtime_loop/runtime_loop.gd:20-26`)
remet l'accumulateur à `0.0` à chaque tick au lieu de retrancher un pas (`acc - pas_ms()`) :
le RESTE est JETÉ, pas seulement le rattrapage. Conséquence : le nombre de ticks par seconde
réelle est quantifié à la frontière de trame et **dépend du framerate**, sans jamais atteindre
le nominal `1000/16 = 62,5 Hz`. Or :

1. Aucun oracle de gameplay n'exerce ce chemin. `solo_session.gd`, `negative_control.gd`,
   `replay_determinism.gd` et l'oracle de solvabilité (`solvability.gd:32-35`) appellent
   `Loop.step` **directement** et **court-circuitent** `runtime_loop`. La promesse produit
   « le jeu tourne à une vitesse temps-réel cohérente » n'est prouvée par aucun oracle
   (les critères charter prouvés portent sur le boot/entrypoint, pas sur le rythme).
2. Le seul test qui touche `avancer`, `no_time_catchup.test.gd:18` et `:23`, asserte
   `accumulateur == 0.0` après un tick et après un delta énorme — il **fige la valeur
   d'implémentation à perte** au lieu de la propriété durable « nombre de ticks borné par
   appel / pas de rattrapage non borné ». Une implémentation plus correcte conservant le reste
   (`acc -= pas`, ticks plafonnés) échouerait ce test tout en pilotant mieux le produit.

**Sévérité : MEDIUM.** La sim pure (chemin des oracles) reste déterministe ; l'impact est sur
le PRODUIT réel (`main.gd:41-44`), non couvert, contredisant l'esprit « le premier truc qu'un
utilisateur fait » du CLAUDE.md. Ce n'est PAS une re-litigation de la décision ratifiée
« surplus jeté » : je remonte sa **conséquence non testée**.

**Reproduction (pure, headless, exécutable par un oracle non-LLM — `runtime_loop.gd` est RefCounted) :**
```
# Compter les ticks sur 1 s simulée à deux framerates via RL.avancer :
#  60 fps :  acc=0 ; répéter 60x  avancer(acc, 1000.0/60.0,  false) -> chaque appel 1 tick  => 60 ticks/s
# 144 fps :  acc=0 ; répéter 144x avancer(acc, 1000.0/144.0, false) -> 1 tick tous les 3   => 48 ticks/s
# Nominal attendu = 1000/16 = 62,5.
# Oracle déterministe : assert ticks_60fps (60) != ticks_144fps (48)  ET  ticks_144fps != 62.
```
Attendu si la faille existe : `60 != 48` et `48 != 62` → la cadence dépend du framerate et
n'atteint jamais le nominal. Ancre statique corroborante : `runtime_loop.gd:26` (`return
{"ticks": 1, "accumulateur": 0.0}`) et `no_time_catchup.test.gd:23`.

---

## F2 — LOW — « Physique continue » assurée par un échantillonnage discret dont la sûreté anti-tunneling dépend de paramètres A_EQUILIBRER non gardés

**Angle** : promesse (« physique CONTINUE ») vs implémentation ; trou de couverture lié à la variance des paramètres.

**Faille.** Les modules se déclarent « physique CONTINUE (flottants) » (`wall_reflection.gd:3`,
`ball.gd:1`) mais la résolution est **discrète** : intégrer puis tester le chevauchement
(`loop.gd:51-67`, `brick_collision.gd:_chevauche:15-18`). Ce schéma n'est sans-tunneling que
tant que le pas de balle `|v|·dt` reste petit devant la plus petite épaisseur d'obstacle. Or
`BALLE_VITESSE_INITIALE` et `TICK_DT_FIXED_MS` sont **A_EQUILIBRER** (`params.gd:28,31`,
provenance PROPOSITION_REDACTEUR) et `BRIQUE_HAUTEUR = 20` (`params.gd:57`). **Aucun test ni
oracle** n'asserte l'invariant de sûreté `|v|·dt < épaisseur_min` ; tous les oracles tournent
aux valeurs sûres actuelles (`|v|·dt = 300·0,016 = 4,8` unités, brique = 20). Une calibration
future dans l'espace de réglage DÉCLARÉ peut casser silencieusement le collisionneur de
briques sans qu'aucun oracle ne rougisse.

Précision honnête (je ne surqualifie pas) : les **murs** ne sont PAS tunnelables — leur test
est un demi-plan `pos.x - r <= 0` (`wall_reflection.gd:19-24`), donc tout dépassement est
rattrapé quel que soit le pas. Le tunneling ne concerne que les **briques** (test en bande
`_chevauche`).

**Sévérité : LOW.** À la calibration actuelle le jeu est sûr ; c'est un finding **latent /
couverture**, pas une casse présente. Il devient P0 dès l'étape de calibration si la vitesse
de balle ou `dt` montent.

**Reproduction (exécutable par un oracle non-LLM ; perturbation dans l'espace A_EQUILIBRER déclaré) :**
```
# Régler dans un contexte de test  |v|·dt  >  BRIQUE_HAUTEUR + 2*BALLE_RAYON  (= 20 + 12 = 32),
# p.ex. BALLE_VITESSE_INITIALE = 2100 (dt inchangé 0,016 -> pas = 33,6 unités > 32),
# valeur dans l'espace de réglage déclaré A_EQUILIBRER.
# Placer la balle une trame AU-DESSUS d'une rangée de briques présente, vy>0, puis Loop.step 1x.
# Oracle déterministe : compter les events "brique_detruite" et vérifier le franchissement :
#   assert ball_pos.y a franchi toute la bande de briques SANS aucun event brique_detruite
#          (la brique reste présente : tunneling prouvé).
```
Attendu si la faille existe : la balle traverse la rangée sans event de destruction, la brique
reste `true` → le collisionneur discret a laissé passer la balle. Ancre statique corroborante :
`brick_collision.gd:15-18` (test de bande `_chevauche`), `params.gd:28,31,57`, absence
d'assertion `|v|·dt < épaisseur_min` dans `07_TESTS/**` (grep : aucun test ne mentionne cet invariant).

---

## RAPPORT FINAL — verdicts séparés

- **software_verdict : N/A (advisory).** Le red-team ne décerne pas de verdict logiciel — « le
  red-team CRITIQUE, les oracles PROUVENT » (contrat). Mes findings alimentent `redteam_advisory`
  du verdict signé, jamais `software_verdict`/`humangate_flags` directement.
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY** pour les ancres STATIQUES citées ci-dessus
  (citations de lignes vérifiables par lecteur non-LLM : chemins:lignes, résultats de grep).
  Ces ancres établissent l'EXISTENCE des motifs (accumulateur reset-à-0, test qui fige la
  valeur, test de bande discret, params A_EQUILIBRER sans invariant gardé).
- **claim_verdict : NO_CLAIM_ALLOWED.** Je n'ai EXÉCUTÉ aucun oracle (permission run : aucun).
  La CONFIRMATION dynamique de F1 (comptage de ticks 60/144 fps) et de F2 (tunneling après
  perturbation de param) reste à faire tourner par un oracle non-LLM en aval. Tant que non
  exécutée : besoin HumanGate (fog), pas de claim auto-certifié.

### Besoins HumanGate (fog)

- **fog-RT1** : décider si la conséquence de « surplus jeté » (cadence temps-réel dépendante du
  framerate, jamais nominale) est acceptable pour le produit, ou si l'accumulateur doit
  conserver le reste (`acc -= pas`) avec plafond de ticks — et si `no_time_catchup.test.gd`
  doit asserter la propriété durable (ticks bornés) plutôt que `accumulateur == 0.0`.
- **fog-RT2** : ajouter (ou non) un oracle d'invariant de sûreté du collisionneur discret
  `|v|·dt < épaisseur_min_obstacle`, à valider AVANT la campagne de calibration qui touchera
  `BALLE_VITESSE_INITIALE` / `TICK_DT_FIXED_MS`.
- **fog-RT3** : le chemin produit (`main.gd` → accumulateur → `Loop.step`) n'est couvert par
  aucun oracle de solvabilité/déterminisme ; décider s'il doit l'être.

---

## SKIPPED_VALIDATION

| Item de validation (quoi) | Périmètre (où) | Statut | Raison (pourquoi) |
|---|---|---|---|
| Exécution des oracles (`run_tests.gd`, `solvability.gd`, oracles `07_TESTS/oracle/*`) | tout le jeu | non fait | Permission `run: aucun` (contrat red-team). Findings appuyés sur ancres statiques uniquement ; confirmation dynamique déléguée à un oracle aval (fog). |
| Vérification que `EXPECTED_ASSERTS := 274` (`run_tests.gd:21`) = somme réelle des assertions | `07_TESTS/unit/**` | non fait | Nécessite d'exécuter le runner headless (compter passed+failed) — exécution refusée. Le compteur PEUT avoir été ajusté après coup ; je ne peux ni le prouver ni l'infirmer sans run. Remonté comme angle prioritaire non résolu. |
| Diff wiremap (`git diff` sur `09_WIREMAP/wiremap.json` et `lab/forge_runs/breakout_v2/wiremap.json`, tous deux `M` au boot) | wiremap | non fait | Appel `git diff` REFUSÉ par mes permissions (run : aucun). Impossible de vérifier qu'aucun champ de promesse n'a été modifié pour coïncider avec le résultat. À auditer par un lecteur autorisé. |
| Confirmation dynamique de F1 (comptage ticks 60 fps vs 144 fps) | `runtime_loop.gd` | non fait | run refusé ; repro fournie, exécutable en aval. |
| Confirmation dynamique de F2 (tunneling après perturbation de param) | `brick_collision.gd` + `params.gd` | non fait | run refusé ; repro fournie, exécutable en aval. |
| Audit exhaustif des tests unitaires restants | `07_TESTS/unit` (7 fichiers non ouverts : `tick_pure`, `fixed_step_pure`, `ball_kinematics`, `paddle_bounds`, `input_vocabulary_closed`, `error_guard_invalid_input`, `state_status`, `brick_field_count`, `params_isolation`, `boot_zero_gesture`, `restart_no_leak`, `exit_stop`, `event_observer`, `debug_state_fields`, `debug_receipt`, `hud_readout`, `end_screen`) | partiel | Échantillon représentatif lu (rebond/physique/fin/déterminisme/score/vie/latence) ; les non-lus portent sur des surfaces à faible risque déjà couvertes indirectement. Aucune faille supposée non prouvée n'est remontée à leur sujet. |

```json
{"findings": [{"angle": "delta-time / pas fixe au niveau produit + test qui fige une valeur d'implementation", "faille": "runtime_loop.avancer remet l'accumulateur a 0.0 a chaque tick (jette le reste au lieu de acc - pas_ms), rendant la cadence temps-reel dependante du framerate et jamais nominale (62,5 Hz) ; aucun oracle de gameplay n'exerce ce chemin (solo_session/negative_control/replay/solvability appellent Loop.step directement), et no_time_catchup.test.gd fige la valeur a perte (accumulateur == 0.0) au lieu de la propriete durable de bornage des ticks", "severite": "MEDIUM", "reproduction": "Headless pur sur runtime_loop.gd (RefCounted) : compter les ticks sur 1 s simulee a 60 fps (60x avancer(acc,1000/60,false) => 60 ticks) et a 144 fps (144x avancer(acc,1000/144,false) => 48 ticks) ; oracle deterministe assert ticks_60 (60) != ticks_144 (48) ET ticks_144 != 62. Ancres : runtime_loop.gd:26, no_time_catchup.test.gd:23."}, {"angle": "promesse 'physique continue' vs echantillonnage discret ; trou de couverture lie aux parametres A_EQUILIBRER", "faille": "Le collisionneur de briques est discret (integrer puis tester le chevauchement, brick_collision.gd:_chevauche) mais declare 'physique CONTINUE' ; sa surete anti-tunneling depend de |v|*dt < epaisseur_min, or BALLE_VITESSE_INITIALE et TICK_DT_FIXED_MS sont A_EQUILIBRER et aucun test/oracle n'asserte cet invariant (les murs, eux, sont surs car testes en demi-plan)", "severite": "LOW", "reproduction": "Oracle non-LLM avec perturbation dans l'espace A_EQUILIBRER declare : fixer BALLE_VITESSE_INITIALE=2100 (pas = 33,6 > BRIQUE_HAUTEUR+2*BALLE_RAYON = 32), placer la balle une trame au-dessus d'une rangee presente (vy>0), Loop.step 1x, assert : aucun event brique_detruite emis ET la brique reste presente (tunneling prouve). Ancres : brick_collision.gd:15-18, params.gd:28,31,57."}]}
```

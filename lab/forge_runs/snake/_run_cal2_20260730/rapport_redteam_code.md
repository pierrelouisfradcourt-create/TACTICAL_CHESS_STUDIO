# Rapport red-team CODE — Snake (ADVISORY)

- **Dispatch** : `FORGE_DISPATCH:s11-redteam-code:snake-cal2-20260730-145311`
- **Périmètre** : audit du code produit à l'étape 9 (66 fichiers `.gd`, 26 fichiers de tests unitaires, `EXPECTED_ASSERTS=282`, solvabilité annoncée 50/50). Lecture seule. Aucun fichier modifié.
- **Posture** : contexte vierge (aveuglé). Je n'ai pas vu le raisonnement du builder. Chaque finding porte une reproduction exécutable par un oracle **non-LLM** (mutation ciblée ou ancre statique). Le red-team CRITIQUE, les oracles PROUVENT — je ne me substitue à aucun oracle.
- **Résultat d'ensemble** : le cœur est réellement solide — logique pure séparée du rendu, isolation des paramètres **effective en code de production** (0 littéral de gameplay hors `params.gd` dans `05_SYSTEMS/`+`06_RUNTIME/`), assertions strictes (pas de `>=` tautologique dans les tests inspectés), harnais racine qui **délègue vraiment** (même dossier, même `Harness`, `EXPECTED_ASSERTS` lu et non recopié). **Aucune faille HIGH.** Les findings ci-dessous sont advisory (1 MEDIUM, 5 LOW). Le MEDIUM vise une **zone de preuve manquante**, pas un bug reproduit dans le code pur.

---

## F1 — Le chemin d'entrée réel du joueur (`scene.gd`) n'est prouvé par AUCUN oracle — MEDIUM

**Angle** : dépendance logique / « déclaré ≠ exécuté » — la solvabilité prouve-t-elle le vrai canal clavier ?

**Faille** : tous les points de preuve mécaniques s'arrêtent à la frontière `Loop.step(state, direction)` :
- `solvability.gd:33` : `Bot.choisir_action(s)` → `Loop.step(s, action)` — n'instancie jamais `scene.gd`, ne passe pas par `input_adapter`.
- `07_TESTS/oracle/core_input_action.gd:25` : `Loop.step(s, action["dir"])` — idem.
- `07_TESTS/unit/input_adapter_burst.test.gd` : teste `input_adapter` **en isolation** (mapping touche→direction, lignes 14-21) et `Loop.step` en isolation, mais jamais l'assemblage.

Or le chemin qu'emprunte réellement une frappe clavier vit dans `scene.gd` (Node, 184 lignes) et **n'a aucune couverture headless** : `_input()` écrit `_pending = action["dir"]` (l.108), `_process()` appelle `Loop.step(_state, _pending)` (l.89) puis remet `_pending = Loop.AUCUNE` (l.91). Ce câblage (bufferisation profondeur-1, ordre consommation/reset, routage des commandes pause/relance/sortie) n'est instancié par aucun `SceneTree` de test. La ligne d'en-tête de `bot_policy.gd` (« pilote le MÊME canal d'entrée public que le clavier ») et le rôle wiremap `solvability_bot` sont donc **vrais seulement jusqu'à `Loop.step`** : la portion clavier→`Loop.step` reste non prouvée. C'est exactement le mode de panne documenté (mémoire « la preuve ne remplace jamais l'exécution produit » : un projet peut satisfaire tous ses oracles et ne pas être pilotable).

**Sévérité** : MEDIUM — atténuée (le mapping `input_adapter` a sa propre couverture stricte, donc une inversion de touche serait attrapée), mais la surface d'assemblage `scene.gd` reste un angle mort d'oracle sur le geste central du jeu (diriger le serpent).

**Reproduction** (exécutable, non-LLM) : muter `scene.gd:89` de `Loop.step(_state, _pending)` en `Loop.step(_state, Loop.AUCUNE)`. Relancer la suite complète d'oracles mécaniques (`07_TESTS/oracle/run_tests.gd` + `solvability.gd` + `core_input_action.gd`) : **les trois restent verts** (aucun n'instancie `scene.gd`). Un mutant qui rend le serpent non-dirigeable pour un humain survit à tous les oracles → prouve l'absence de couverture du chemin d'entrée réel. Ancre statique : `scene.gd:89,91,108`.

---

## F2 — Littéral de gameplay dérivé (`184.0`, `55`) hors du bloc `params`, côté tests — LOW

**Angle** : littéral de gameplay hors du bloc params.

**Faille** : `growth_score_same_tick.test.gd:47` code en dur `184.0` (= `VITESSE_INITIALE_MS` 200 × `ACCELERATION_PAS` 0,92) et `input_adapter_burst.test.gd:46` code en dur `fruits = 55` (seuil dérivé pour atteindre le plancher). Ces valeurs sont **couplées aux paramètres** mais vivent hors de `params.gd`. Le garde local `params_isolation.test.gd` ne les voit pas : il ne scanne QUE `05_SYSTEMS/`+`06_RUNTIME/` (jamais `07_TESTS/`) et sa liste `VALEURS_GAMEPLAY = ["200","0.92","80","25"]` ne contient pas les valeurs **dérivées** (184, 55). L'oracle Python `static_oracles` (s10s), auquel la wiremap délègue le comptage exhaustif, vérifie les 8 valeurs de base — 184 et 55 étant des produits, ils lui échappent aussi vraisemblablement. Conséquence : l'`observable_proof` de `params.bloc_unique` (« modifier la constante de période initiale ⇒ 0 AUTRE fichier modifié ») est **falsifiée** : changer `VITESSE_INITIALE_MS` casse `growth_score_same_tick.test.gd:47`.

**Sévérité** : LOW — le code de **production** est propre (F-preuve : `grep` ci-dessous = 0 fuite hors `params.gd`) ; l'échec serait **bruyant** (test rouge), jamais un faux-vert silencieux.

**Reproduction** (exécutable, non-LLM) : `grep -n "184\|55" games/snake/07_TESTS/unit/growth_score_same_tick.test.gd games/snake/07_TESTS/unit/input_adapter_burst.test.gd` → ancres l.47 et l.46. Puis muter `params.gd:13` `VITESSE_INITIALE_MS: 200.0 → 150.0`, relancer le harnais → `growth_score_same_tick` échoue (attend 184.0, obtient 138.0), prouvant le couplage inter-fichiers.

---

## F3 — `grille_pleine` laisse `nourriture` périmée (sur le corps) → viole `est_valide()` — LOW (latent, non atteignable en config livrée)

**Angle** : cas limite non couvert (grille pleine).

**Faille** : `growth.gd:25-27` — quand `FoodSpawn.tirer` renvoie `grille_pleine=true`, `state.nourriture` **n'est pas mise à jour** et conserve la case qui vient d'être mangée (désormais sous la tête). `state.gd:90` (`if nourriture in segments: return false`) rend alors `est_valide()` faux. Aucun test n'asserte la **validité de l'état résultant** dans ce cas (le test `food_spawn_free_cells.test.gd:52-60` prouve seulement que le *flag* `grille_pleine` est levé, pas que l'état reste cohérent).

**Sévérité** : LOW — **non atteignable** avec la config livrée : `CIBLE_VICTOIRE=25` ≪ 400 cases, donc `est_gagne` gèle la partie bien avant que la grille se remplisse. Piège latent si la cible de victoire est un jour relevée vers la capacité de grille.

**Reproduction** (constructible en test unitaire, non-LLM) : construire un état à 1 case libre = nourriture, tête adjacente à cette case, `mange=true` ; après `Loop.step`, asserter `nourriture in segments` → vrai, donc `est_valide()==false`. Ancre statique : `growth.gd:25-27` + `state.gd:90` + ordre du check victoire `loop.gd:57`.

---

## F4 — Barre de solvabilité faible : gagner à 25/400 avec un bot glouton n'éprouve jamais la difficulté du genre — LOW (advisory / design-debt)

**Angle** : solvabilité prouvée trop faiblement (précédent R9 2026-07-21).

**Faille** : `succeeded=false` **est structurellement atteignable** (deux chemins existent dans le code : `_repli` → mort par mur/corps → `TERMINE_PERDU` ; ou `max_ticks` atteint → statut `EN_COURS`), donc l'oracle **n'est PAS tautologique par construction** — contrairement au grid-navigator falsifié. MAIS `CIBLE_VICTOIRE=25` sur une grille de 400 cases, avec un bot **glouton BFS-vers-nourriture** sans cycle hamiltonien ni sécurité de queue (`bot_policy.gd`), signifie que le bot n'affronte jamais la vraie difficulté de Snake (auto-évitement d'un corps long). La marge de solvabilité est si large que l'oracle « SOLVABILITE PROUVEE » (charter tag) est satisfait par un barème trivial : il prouve « un glouton atteint la longueur 25 », pas « le jeu est un Snake bien formé ». C'est le motif « promesse trop forte » de la doctrine de variance des métriques.

**Sévérité** : LOW — advisory, pas un bug. `CIBLE_VICTOIRE` est un paramètre `A_EQUILIBRER` assumé.

**Reproduction** (exécutable, non-LLM, mesure de variance) : relever `params.gd:28` `CIBLE_VICTOIRE` vers ~350 et relancer `solvability.gd` sur les mêmes 50 graines : observer l'effondrement du taux de victoire du bot glouton (démontre que le barème actuel ne discrimine pas un jeu subtilement cassé-mais-gagnable-jusqu'à-25). Ancres : `params.gd:10,28` + `bot_policy.gd:4,43-50`.

---

## F5 — `EXPECTED_ASSERTS=282` est un fil-piège de comptage, pas une preuve de couverture (et total data-dépendant) — LOW

**Angle** : faux vert par délégation entre les deux harnais.

**Faille** : la délégation racine → oracle est **réelle** (F-preuve : `tests/run_tests.gd:19,55` `preload` l'oracle et lit `OracleTests.EXPECTED_ASSERTS` sans le recopier ; même dossier `07_TESTS/unit`, même `Harness`). Ce n'est donc **pas** un faux-vert. Deux réserves subsistantes : (a) le garde ne vérifie que `total == 282` ; il ne prouve **aucune assertion spécifique** — supprimer un fichier de test ET décrémenter la constante passerait vert avec moins de couverture réelle ; (b) le total runtime est **data-dépendant** : `params_isolation.test.gd:62-63` (boucle sur `CONSTANTES_ATTENDUES`) et `debug_state_fields.test.gd:14-15` (boucle sur 7 clés) génèrent des assertions dynamiques, donc les 260 sites d'appel statiques mesurés ≠ 282 (l'écart vient des boucles). Le garde **échoue en sécurité** (toute dérive → `META` rouge), donc n'est pas un vecteur de faux-vert, mais 282 reste un nombre magique fragile à resynchroniser à la main.

**Sévérité** : LOW — fail-safe confirmé, pas d'exploitation en faux-vert.

**Reproduction** (statique + exécutable) : `grep -c 'h\.\(eq\|ok\|fail\)(' games/snake/07_TESTS/unit/*.test.gd` → 260 sites statiques ≠ 282 runtime (prouve la part dynamique des boucles `params_isolation.test.gd:62`, `debug_state_fields.test.gd:14`). Le fail-safe se reproduit en supprimant un `.test.gd` sans toucher la constante → `META: N/282` rouge. **Non exécuté par moi** (voir SKIPPED_VALIDATION : je n'ai pas lancé Godot, donc je n'ai pas confirmé que le total runtime vaut exactement 282).

---

## F6 — Assertion disjonctive faible dans `error_guard_invalid_input.test.gd:55` — LOW

**Angle** : test tautologique / assertion qui ne peut pas échouer.

**Faille** : `error_guard_invalid_input.test.gd:55` : `h.ok(s5.est_valide() or s5.statut == State.Statut.TERMINE_PERDU, ...)`. La disjonction passe même si l'état est **invalide** dès lors que le serpent est mort — elle ne distingue pas « valide » de « invalide-mais-mort ». Elle n'est sauvée que par le compteur séparé `invalides` (l.53-54, asserté strict l.58). Isolée, cette ligne serait quasi-tautologique (une mort par auto-collision satisferait le `or` même avec un état corrompu).

**Sévérité** : LOW — backstoppée par l'assertion stricte `h.eq(invalides, 0, ...)` (l.58) ; à retenir comme fragilité si la l.58 disparaissait.

**Reproduction** (statique, non-LLM) : ancre `error_guard_invalid_input.test.gd:55` vs backstop `:58`. Mutation d'exposition : retirer les lignes 53-54 et 58 (le compteur), puis introduire un état corrompu-mais-mort → la l.55 seule reste verte.

---

## Verdicts (séparés)

- **software_verdict : OK** — pour la portée **appuyée par oracle** : logique pure (state/loop/collision/food_spawn/tick_rate/direction_rules/end_condition), isolation params en production, et harnais de délégation. Ces propriétés sont couvertes par les tests unitaires + oracles cités (ancres statiques vérifiées ; je n'ai pas ré-exécuté Godot — voir SKIPPED_VALIDATION).
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY** — findings appuyés par mutations ciblées / ancres statiques exécutables par un oracle non-LLM en aval. Aucune preuve de « fun » ou de feel.
- **claim_verdict : NO_CLAIM_ALLOWED** — pour F1 en particulier (couverture du chemin d'entrée réel) : oracle **absent** dans la suite actuelle ⇒ je ne certifie pas ; je remonte un besoin **HumanGate (fog)**, pas un claim auto-certifié.

## Besoin HumanGate (fog)
1. **F1 (prioritaire)** : décider si un oracle headless instanciant `scene.gd` et pilotant `_input`→`_process`→`Loop.step` doit être exigé avant de considérer le geste « diriger le serpent » comme prouvé. Aujourd'hui, seule l'exécution produit (le jeu démarre/s'affiche, commit `6e3ed96`) couvre ce chemin — pas un oracle mécanique.
2. **Point d'entrée `tests/run_tests.gd`** : la wiremap déclare `godot.project_tests` à `tests/run_tests.gd`, mais la permission de dispatch dénie l'écriture sous `tests/**`. Le point d'entrée canonique est déposé sous `07_TESTS/oracle/` — écart déjà remonté par le builder, à ratifier par Pierre.

---

## SKIPPED_VALIDATION
- **Exécution du harnais Godot** (quoi : lancer `07_TESTS/oracle/run_tests.gd` et confirmer `282 passed`) — où : `games/snake/` — statut : **non fait** — raison : permissions du contrat = `run: aucun` ; je n'exécute pas d'oracle (le red-team critique, les oracles prouvent). Impact : le total runtime de 282 et le vert de la suite ne sont pas confirmés par moi ; à confirmer par l'étape oracle (s10) / verdict (s12).
- **Exécution des mutations proposées** (F1, F2, F3, F4, F6) — où : `scene.gd`, `params.gd`, `growth.gd`, `error_guard_*` — statut : **non fait** — raison : `run: aucun` + `delete: aucun` + « ne corrige pas lui-même » ; les reproductions sont **spécifiées pour** un oracle de mutation non-LLM en aval, pas exécutées ici.
- **Solvabilité 50/50** (quoi : rejouer `solvability.gd` sur les 50 graines) — où : `games/snake/solvability.gd` — statut : **non fait** — raison : `run: aucun`. J'ai audité l'**atteignabilité de `succeeded=false`** par lecture de code (structurellement atteignable) sans exécuter le bot.
- **Oracles visuels / capture** (quoi : juger le rendu `capture.gd`/`grid_view.gd`) — où : `06_RUNTIME/adapters/presentation/` — statut : **hors périmètre** — raison : périmètre = audit du diff mécanique ; l'image relève d'un juge visuel séparé (mécanique-puis-Pierre).
- **Étages amont non relus ligne à ligne** (quoi : `07_TESTS/oracle/{mutation_invariants,replay_determinism,evidence_manifest,speed_band_report,solo_session,core_boot,core_exit}.gd`) — où : `07_TESTS/oracle/` — statut : **partiel** — raison : budget d'attention concentré sur les axes du dispatch (double-harnais, solvabilité, tautologies, isolation params, dépendances rendu/input, cas limites) ; ces oracles auxiliaires ont été localisés et échantillonnés, non audités exhaustivement.

**Rien d'autre sauté hors de ce qui précède.**

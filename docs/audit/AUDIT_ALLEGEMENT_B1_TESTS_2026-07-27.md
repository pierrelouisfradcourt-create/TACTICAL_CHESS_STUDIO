# Audit B1 — Valeur réelle des suites de tests (Pong + Studio Forge)

Date : 2026-07-27. Mission Forge `FORGE_DISPATCH:b1-audit-valeur-tests:b1_audit_tests`.
Posture imposée : un test vaut par la régression RÉELLE qu'il empêcherait sur le produit
final, pas par son existence. Périmètre : LECTURE seule du dépôt, ÉCRITURE limitée à ce
fichier. Aucun test modifié, aucun gate mutation relancé.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED

---

## Correction préalable (garde-fou 7 — doute déclaré)

La mémoire de dispatch annonçait « 51 tests unit + 1 oracle ». Comptage réel par lecture
intégrale des 4 fichiers (`grep -c "^test("` + vérification manuelle ligne par ligne) :

| fichier | tests `test(...)` |
|---|---:|
| `games/pong/07_TESTS/unit/input.test.mjs` | 8 |
| `games/pong/07_TESTS/unit/loop.test.mjs` | 23 |
| `games/pong/07_TESTS/unit/state.test.mjs` | 19 |
| **sous-total unit** | **49** (pas 51) |
| `games/pong/07_TESTS/oracle/solvability.mjs` | 1 harnais (4 fonctions, 9 sous-checks agrégés) |

Le chiffre exact est **49 tests unit + 1 harnais de solvabilité = 50 preuves**, pas 52. Ce
n'est pas bloquant pour l'audit (le fond ne change pas), mais la mémoire du studio doit être
corrigée : `forge_mechanical_ok_visually_dead` et les entrées RUN_INDEX qui citent « 51
tests » sont légèrement fausses. Signalé, non corrigé ici (hors périmètre écriture).

---

## Résumé en une phrase

Les 49 tests unitaires + le harnais de solvabilité de Pong prouvent, avec un score de
mutation mesuré de 95 % (58/61), que la **mécanique pure** (rebonds, score, fin de partie,
entrées) est correcte et robuste au fuzzing ; mais **0 de ces 50 preuves n'importe jamais**
un des 7 fichiers d'adaptateur (`06_RUNTIME/adapters/presentation/`, 488 lignes) qui
constituent 100 % de ce qu'un joueur voit, entend et clique — expliquant mécaniquement,
sans exception, pourquoi les 4 constats du playtest réel de Pierre (bouton quitter mort,
vitesse injouable, aucun adversaire automatique, score/UX non validés) et les 2 bugs de
premier chargement navigateur sont tous passés inaperçus malgré une suite « verte ».

---

## Réponse aux 3 questions de Pierre

### (1) Quels tests empêchent une VRAIE régression du produit ?

Au sens strict (« produit final jouable, tel que Pierre l'a testé au clavier ») : **aucun**,
de façon quantifiable — 0 des 50 preuves de la suite Pong n'exécute une seule ligne de
`06_RUNTIME/adapters/presentation/` (confirmé par grep des imports, repris de l'audit du
2026-07-26 `docs/audit/ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md`, re-vérifié ici).

Au sens de « la **mécanique de jeu pure** (les règles, indépendamment de leur habillage) » —
c'est un produit intermédiaire réel, pas rien — une liste nominative existe : voir
**§ Vraies régressions couvertes**, ci-dessous. Ces tests-là empêcheraient une vraie
régression *si* le studio livrait la logique seule (ex. un moteur de règles réutilisé par
plusieurs habillages) — ce n'est pas le cas ici, Pierre joue au jeu HABILLÉ.

Côté studio (Forge), le tableau est différent : plusieurs tests exécutent le VRAI chemin de
code de bout en bout avec de vrais artefacts signés (`test_driver.py`, `test_verify_run.py`,
`test_verify_run_integrity_separation.py`, `test_aggregate_verdict.py`) — ce sont des tests
d'intégration internes qui empêcheraient une vraie régression de l'outillage (ex. un verdict
falsifié qui passerait, un gate mutation contourné). Liste nominative également en § ci-dessous.

### (2) Quels tests ne vérifient QUE l'existence d'une structure ?

Peu, dans Pong — la majorité des 49 tests unit affirment un comportement observable réel
(direction de balle, score, validité d'état), même les tests de « renforcement mutation »
aux bornes exactes. Les candidats sincèrement proches de l'existence-seule :

- `state.test.mjs` — **« readStatus : lit le statut courant »** (L87-89) : appelle
  `readStatus(initialState(1))`, compare à `STATUS.PLAYING` — strictement le même fait déjà
  vérifié une ligne plus haut dans `initialState : etat propre...` (`s.status ===
  STATUS.PLAYING`), via un accesseur différent. Marginal ≈ 0.
- `state.test.mjs` — **« isValidStatus : SEULES les 3 valeurs déclarées »** (L32-39) : énumère
  un vocabulaire fermé — proche de l'existence, MAIS protège un invariant réellement
  CONSOMMÉ ailleurs (le fuzz-test `error.guard` de 500 ticks dépend de `isValidState`, qui
  dépend de `isValidStatus`) — donc structurel, mais pas inutile (garde-fou 3).
- `input.test.mjs` — **« dirFor : vocabulaire fermé »** (L27-32) teste un helper PRIVÉ déjà
  exercé indirectement par « translate : chaînes up/down » un test plus haut (chemin public).
  Redondance de surface, pas de risque réel non couvert par ailleurs.

Côté studio, les tests les plus proches de l'existence-seule (échantillon lu) :
- `test_dispatch.py::test_order_covers_the_agent_steps` — `assert len(ORDER) == 13` : compte
  un total, ne dit rien sur QUELLES étapes. Utile comme canari de régression de nombre, faible
  à lui seul (mais combiné à `test_full_profile_is_the_whole_chain` juste après, qui liste les
  13 noms exacts, la paire devient réellement protectrice).
- `test_component_design.py::test_module_without_docstring` — vérifie un texte de repli
  `"(sans docstring)"` : protège un format d'affichage, pas un comportement produit.

### (3) Quels tests devraient être REMPLACÉS par un test comportemental ?

Voir la liste structurée **§ Remplacements proposés** — 3 candidats nominatifs avec le
comportement produit couvert et un coût estimé. Le constat honnête : ce ne sont pas les
tests EXISTANTS de Pong qui sont mauvais (ils sont, pour la plupart, corrects et utiles à
leur échelle) — le vrai trou n'est pas un remplacement mais une **absence totale** de test
sur la couche qui a effectivement cassé au playtest. Le § **Tests manquants (playtest)**
répond à ça directement, chiffré avec un coût par item.

---

## Classement exhaustif des 52 (en réalité 50) tests jeu Pong

Légende classe : **COMPORTEMENTAL** (assertion sur un résultat observable du jeu réel) ·
**STRUCTUREL** (assertion sur une forme/invariant interne, protège quelque chose de réel
mais indirect) · **EXISTENCE** (proche de « la fonction existe et ne plante pas ») ·
**TAUTOLOGIQUE** (aucun cas trouvé dans Pong — voir note en fin de section).

### `input.test.mjs` (8/8 lus intégralement)

| test | classe | justification |
|---|---|---|
| translate : entrée brute invalide -> action neutre | COMPORTEMENTAL | garantit qu'une entrée hostile ne fait jamais bouger une raquette de façon imprévue |
| translate : chaînes up/down | COMPORTEMENTAL | mapping clavier réel (ce que `main.mjs` envoie) |
| translate : objets up/down, simultané neutralisé | COMPORTEMENTAL | règle de jeu : appuyer haut+bas ensemble immobilise, pas un bug de priorité |
| dirFor : vocabulaire fermé | STRUCTUREL | redondant avec le test `translate` public juste au-dessus (même garantie, chemin privé) |
| clampPaddle : bornes | COMPORTEMENTAL | empêche une raquette de sortir de l'écran — régression visible immédiate si cassé |
| dirFor : up=false explicite -> immobile | COMPORTEMENTAL | ferme un vrai bug de mutation (true→false) sur une entrée objet ambiguë |
| dirFor : down=false explicite -> immobile | COMPORTEMENTAL | idem, symétrique |
| error.guard : 500 entrées hostiles -> état toujours valide | COMPORTEMENTAL (fort) | fuzz réel sur 500 ticks — la classe de bug « le jeu se corrompt/plante sur une entrée bizarre » est directement couverte |

### `loop.test.mjs` (23/23 lus intégralement)

| test | classe | justification |
|---|---|---|
| boot : état initial jouable | COMPORTEMENTAL | le jeu démarre dans un état jouable — base de tout le reste |
| movePaddle : bornes | COMPORTEMENTAL | anti-régression directe (raquette hors-champ) |
| core.main_loop : déterminisme strict | COMPORTEMENTAL | protège contre un bug de désync (même seed+entrée doit rejouer identique) — invisible au playtest manuel mais réel pour replay/anti-triche futur |
| rebond bord HAUT | COMPORTEMENTAL | mécanique cœur |
| rebond bord BAS | COMPORTEMENTAL | mécanique cœur |
| rebond raquette DROITE alignée | COMPORTEMENTAL | mécanique cœur (toucher la balle) |
| pas de rebond si raquette ailleurs -> point | COMPORTEMENTAL | condition de score correcte |
| **NO-TUNNEL à toute vitesse (6 vitesses testées)** | COMPORTEMENTAL (fort) | ferme LE bug classique de Pong (balle traversant la raquette) — haute valeur |
| score sortie droite -> point p1 exact | COMPORTEMENTAL | comptage de score correct |
| score sortie gauche -> point p2 | COMPORTEMENTAL | idem |
| game.end : WIN_SCORE fige la partie | COMPORTEMENTAL | fin de partie correcte |
| game.loop : partie finie -> état figé | COMPORTEMENTAL | pas d'input parasite après victoire |
| contact exact bord HAUT raquette gauche (ge) | COMPORTEMENTAL (renfort mutation) | bug d'off-by-one classique sur collision — réel mais niche |
| contact exact bord BAS raquette gauche (le) | COMPORTEMENTAL (renfort mutation) | idem symétrique |
| balle au-dessus raquette gauche -> pas de rebond (and) | COMPORTEMENTAL (renfort mutation) | évite un faux-rebond |
| départ exact plan gauche -> rebond (ge L56) | COMPORTEMENTAL (renfort mutation) | garde balayée, bug d'off-by-one |
| arrivée exacte plan gauche -> rebond (le L56) | COMPORTEMENTAL (renfort mutation) | idem |
| balle déjà au-delà plan gauche -> pas de rebond (and#1) | COMPORTEMENTAL (renfort mutation) | évite un rebond fantôme |
| balle vers droite près mur gauche -> pas de rebond (and#2) | COMPORTEMENTAL (renfort mutation) | idem |
| arrivée exacte plan droit -> rebond (ge L67) | COMPORTEMENTAL (renfort mutation) | symétrique droit |
| départ exact plan droit -> rebond (le L67) | COMPORTEMENTAL (renfort mutation) | symétrique droit |
| balle déjà au-delà plan droit -> pas de rebond (and#1) | COMPORTEMENTAL (renfort mutation) | symétrique droit |
| balle vers gauche près mur droit -> pas de rebond (and#2) | COMPORTEMENTAL (renfort mutation) | symétrique droit |

Remarque (garde-fou 3, sur les 11 tests « renfort mutation ») : chacun affirme un fait réel
et observable (la balle rebondit ou non), mais les 11 exercent la MÊME fonction
(`hitsPaddle`/garde balayée) à des pixels-limite voisins. Valeur marginale décroissante au-delà
des 3-4 premiers : voir § Remplacements proposés (R3).

### `state.test.mjs` (19/19 lus intégralement)

| test | classe | justification |
|---|---|---|
| initialState : état propre, déterministe | COMPORTEMENTAL | conditions de départ correctes |
| serveVx : signe piloté par seed/parité | COMPORTEMENTAL | règle d'équité du service (alterne de sens) |
| isValidStatus : seules 3 valeurs déclarées | STRUCTUREL | protège un invariant consommé par `isValidState`/le fuzz-test — pas inutile |
| isValidState : vrai sur état sain | STRUCTUREL | cas de base du validateur |
| isValidState : raquette aux bornes | STRUCTUREL | protège l'invariant utilisé par `error.guard` (fuzz) et la solvabilité |
| isValidState : score entier ≥ 0 | STRUCTUREL | idem |
| isValidState : balle NaN / hors terrain | STRUCTUREL (protège une vraie classe de crash) | une NaN qui se propage gèlerait le rendu — ce validateur est le seul rempart, mais n'est TESTÉ que via appel direct, jamais via le vrai flux `main.mjs` |
| isValidState : statut non déclaré invalide | STRUCTUREL | idem |
| endStatus : seuil de victoire exact | COMPORTEMENTAL | condition de victoire pile au bon score |
| isOver : vrai ssi un camp a gagné | COMPORTEMENTAL | fin de partie correcte |
| readStatus : lit le statut courant | EXISTENCE | redondant avec `initialState` (même fait, autre accesseur) — voir § remplacements R1 |
| restart : identique bit-à-bit au premier démarrage | COMPORTEMENTAL | évite un résidu d'état après une partie (pertinent pour un futur bouton Rejouer) |
| serveVx : seed neutre sert à droite (renfort) | COMPORTEMENTAL (renfort mutation) | cas limite réel (seed=0) |
| initialState : seed 0 normalisé à +1 (renfort) | STRUCTUREL (renfort mutation) | normalisation interne, pas observable au jeu |
| isValidState : null/non-objet rejetés (renfort) | STRUCTUREL (renfort mutation) | garde anti-crash |
| isValidState : raquette y=NaN rejetée (renfort) | STRUCTUREL (renfort mutation) | garde anti-crash |
| isValidState : raquette y non numérique rejetée (renfort) | STRUCTUREL (renfort mutation) | garde anti-crash |
| isValidState : balle nulle rejetée (renfort) | STRUCTUREL (renfort mutation) | garde anti-crash |
| isValidState : balle x non numérique rejetée (renfort) | STRUCTUREL (renfort mutation) | garde anti-crash |

### `oracle/solvability.mjs` (1 harnais lu intégralement — 4 fonctions, 9 sous-checks)

| test | classe | justification |
|---|---|---|
| `runSolvability` (boot/input/partie complète/restart, 9 checks agrégés) | COMPORTEMENTAL (le plus fort de la suite) | SEUL test qui joue une partie ENTIÈRE de bout en bout (jusqu'à 200 000 ticks) avec deux bots, vérifie l'état valide à CHAQUE tick, exactement un point par événement de score, une partie qui se termine avec un vainqueur défini. C'est le plus proche d'un test d'intégration produit dans toute la suite — mais **le bot a une latence de réaction ZÉRO** (il recentre sa raquette sur la balle à chaque tick, sans délai humain), ce qui en fait une preuve de solvabilité MÉCANIQUE, jamais de jouabilité HUMAINE (cf. § Delta de confiance). |

**Aucun cas TAUTOLOGIQUE trouvé** dans la population Pong (contrairement à la leçon R9/M01
citée en mémoire, où le générateur consultait la brique testée) : la logique testée
(`05_SYSTEMS/`) et le test (`07_TESTS/`) sont deux artefacts écrits indépendamment, sans
boucle de consultation croisée observée à la lecture.

---

## Synthèse studio — `scripts/forge/tests/` (69 fichiers, 829 tests comptés par grep)

**Méthode annoncée** : comptage exact par fichier (`grep -c "def test_"`, tous les 69
fichiers). Lecture intégrale de 15 fichiers (178 tests, 22 % des fichiers), lecture
partielle (échantillon en tête de fichier, 15-55 % du fichier) de 5 gros fichiers
supplémentaires (~63 tests observés). Total directement observé : **≈241/829 tests (≈29 %)**,
réparti sur des catégories volontairement disjointes (driver E2E, contrat/dispatch,
mutation/gate, verify_run/intégrité, hook de sécurité, journal, connecteurs studio,
missions récentes s10s/V1/V4, oracles STANDARD, câblage de profils). Pour les 49 fichiers
restants, seul le nom et le compte de tests sont connus — **aucune affirmation de
« dominante » n'est faite sur ces lignes**, marquées `non lu`.

| fichier | n | lu | dominante observée / remarque |
|---|---:|---|---|
| test_standard_oracles.py | 114 | partiel (~19/114, 16%) | COMPORTEMENTAL — chaque test fabrique un contrat/wiremap réel et vérifie `passed`/`violations` sur des cas PASS et FAIL distincts, jamais un simple existence-check ; robustesse anti-crash (None/list/str en entrée) systématique |
| test_run_real_hardening.py | 34 | partiel (~10/34, 29%) | COMPORTEMENTAL — durcissement red-team mesuré sur sondes réelles (allowlist d'outils, deny-list git par classe), traçabilité vers incidents réels documentés en commentaire |
| test_standard_step_wiring.py | 31 | partiel (~9/31, 29%) | COMPORTEMENTAL — répare des « défauts silencieux » réels (profil déclaré mais injoignable, étape sans outils) ; anti-régression bit-à-bit du profil `full` |
| test_run_real_greenfield.py | 26 | non lu | n/a |
| test_context_manifest.py | 26 | partiel (~14/26, 54%) | COMPORTEMENTAL — signature HMAC réelle + vérif, jamais un simple format-check |
| test_aggregate_verdict.py | 25 | partiel (~11/25, 44%) | COMPORTEMENTAL (fort) — provenance/anti-rejeu/falsification réels, cœur de la garantie NO_CLAIM_ALLOWED |
| test_spawn_executed_proof.py | 24 | non lu | n/a |
| test_contract_sync.py | 23 | non lu | n/a |
| test_dispatch.py | 19 | intégral | COMPORTEMENTAL — porte C1/C2, marqueur anti-rejeu, aucun spawn réel |
| test_contract.py | 19 | intégral | COMPORTEMENTAL — C1 (refus si champ absent) + C2 (payload borné) sur contrat réel |
| test_standard_wiring_corrections.py | 18 | non lu | n/a |
| test_check_charter.py | 18 | non lu | n/a |
| test_skipped_validation.py | 16 | intégral | COMPORTEMENTAL — mesure l'ADOPTION réelle d'une section sur du texte d'agent, pas un format vide |
| test_driver.py | 16 | intégral | COMPORTEMENTAL (fort) — run E2E complet du driver (verdict signé, reprise après interruption, escalade bornée) |
| test_studio_link.py | 15 | intégral | COMPORTEMENTAL — connecteurs propose-only, garde anti-écriture ledger/projects.json vérifiée par lecture de source |
| test_mutation_proof.py | 15 | non lu | n/a |
| test_mutation.py | 15 | intégral | COMPORTEMENTAL — génération de mutants réels, garde anti-régression JS/GDScript explicite |
| test_dispatch_spawn_authority.py | 14 | non lu | n/a |
| test_mutation_gate.py | 13 | intégral | COMPORTEMENTAL — gate « survivant justifié » avec cas ambigus, triage périmé, entrée sans ligne |
| test_feature_set_frozen.py | 13 | intégral | STRUCTUREL protecteur réel — empêche l'auto-correction de changer le JEU DE RÈGLES (pas juste une forme) |
| test_driver_mutation.py | 13 | non lu | n/a |
| test_studio_link_cli.py | 12 | non lu | n/a |
| test_static_oracles.py | 12 | non lu | n/a |
| test_hook_guard.py | 12 | intégral | COMPORTEMENTAL (sécurité) — fail-closed en périmètre Forge prouvé, y compris quand la garde elle-même plante |
| test_final_report_cost_effort.py | 12 | non lu | n/a |
| test_run_real_timeout.py | 11 | non lu | n/a |
| test_escalate.py | 11 | non lu | n/a |
| test_runtime.py | 10 | non lu | n/a |
| test_learning_hook.py | 10 | non lu | n/a |
| test_journal_domains.py | 10 | intégral | COMPORTEMENTAL — routage par domaine + non-pollution croisée réellement vérifiée (pas juste « le fichier existe ») |
| test_e2e_harness.py | 10 | non lu | n/a |
| test_driver_telemetry_outcome.py | 10 | non lu | n/a |
| test_verify_run_integrity_separation.py | 9 | intégral | COMPORTEMENTAL (fort) — inclut un test de NON-RÉGRESSION DE SÉCURITÉ explicite (un OK affiché sur gate rouge reste rejeté) |
| test_solvability_wired.py | 8 | non lu | n/a |
| test_r6_r7_contract_fields.py | 8 | non lu | n/a |
| test_provenance.py | 8 | non lu | n/a |
| test_panel.py | 8 | non lu | n/a |
| test_is_clean_pass.py | 8 | non lu | n/a |
| test_component_design.py | 8 | intégral | COMPORTEMENTAL — extraction AST réelle sur modules factices, déterminisme vérifié |
| test_verify_run.py | 7 | intégral | COMPORTEMENTAL (fort) — falsification HMAC/évidence/clé testées activement (pas seulement le chemin heureux) |
| test_triage_doctrine.py | 7 | non lu | n/a |
| test_oracle_canary.py | 7 | non lu | n/a |
| test_hook_guard_stdlib_only.py | 7 | non lu | n/a |
| test_harness_no_hardcoded_flags.py | 7 | non lu | n/a |
| test_driver_journal_autowire.py | 7 | non lu | n/a |
| test_s0_project_bible_injection.py | 6 | non lu | n/a |
| test_reuse_ratio_wired.py | 6 | non lu | n/a |
| test_project_bible.py | 6 | non lu | n/a |
| test_journal_index_autowire.py | 6 | non lu | n/a |
| test_gate.py | 6 | non lu | n/a |
| test_error_journal_resolution.py | 6 | non lu | n/a |
| test_verify_run_mutation.py | 5 | non lu | n/a |
| test_verify_run_knowledge_trace.py | 5 | non lu | n/a |
| test_verdict.py | 5 | non lu | n/a |
| test_search_consulted.py | 5 | non lu | n/a |
| test_pool.py | 5 | non lu | n/a |
| test_playtest_capture.py | 5 | non lu | n/a |
| test_verify_run_encoding.py | 4 | non lu | n/a |
| test_driver_learning_hook.py | 4 | non lu | n/a |
| test_driver_brick_proposal.py | 4 | intégral | COMPORTEMENTAL — mission V4 récente, teste le prédicat réel (dépôt SSI reçu code OK), best-effort prouvé par injection de faute |
| test_oracle_run.py | 3 | non lu | n/a |
| test_oracle_resolve.py | 3 | non lu | n/a |
| test_mutation_gate_integration.py | 3 | non lu | n/a |
| test_feature_set_frozen_acceptance.py | 3 | non lu | n/a |
| test_e2e_harness_acceptance.py | 3 | non lu | n/a |
| test_driver_solvability.py | 3 | non lu | n/a |
| test_contract_chain.py | 3 | non lu | n/a |
| test_s10s_attempts_invariant.py | 2 | intégral | COMPORTEMENTAL — reconstruit un incident RÉEL daté (pong/state.json attempts:0) via git log -S, RED avant correctif prouvé |
| test_driver_harness_no_hardcoded_flags.py | 2 | non lu | n/a |

**Constat sur l'échantillon lu (20 fichiers, ~241 tests) : dominante très majoritairement
COMPORTEMENTALE.** Zéro test tautologique trouvé (aucun cas où le test consulte la même
source que le code testé). Les tests structurels rencontrés (`test_feature_set_frozen.py`,
portions de `test_component_design.py`) protègent tous un invariant réellement consommé
ailleurs — pas de structurel gratuit dans l'échantillon. Ceci **ne peut pas être extrapolé
aux 49 fichiers non lus** sans le dire : c'est une observation sur 29 % de la suite, pas sur
100 %. Le seul point faible mesuré dans l'échantillon lu est ailleurs : la désynchronisation
`triaged_survivors: []` déjà documentée par la mission V3 (2026-07-26), hors périmètre ici.

---

## Vraies régressions couvertes (nominatif)

**Pong (mécanique pure)** :
- `loop.test.mjs` — NO-TUNNEL à 6 vitesses (bug classique de Pong empêché)
- `loop.test.mjs` — rebonds HAUT/BAS/raquettes + score exact + fin de partie
- `loop.test.mjs` — déterminisme strict (anti-désync)
- `input.test.mjs` — error.guard, 500 entrées hostiles, état jamais corrompu
- `state.test.mjs` — restart identique bit-à-bit (anti-résidu)
- `oracle/solvability.mjs` — partie complète bout-en-bout, score cohérent, vainqueur défini

**Studio Forge (outillage)** :
- `test_driver.py` — run E2E signé, reprise après interruption, escalade bornée, Prisme jamais décisionnaire
- `test_verify_run.py` + `test_verify_run_integrity_separation.py` — falsification HMAC/évidence détectée activement, non-régression de sécurité explicite (OK affiché sur gate rouge reste rejeté)
- `test_aggregate_verdict.py` — provenance rompue -> BLOCKED, reçu sans évidence -> BLOCKED
- `test_hook_guard.py` — fail-closed en périmètre Forge même si la garde plante
- `test_mutation_gate.py` — survivant non justifié fait échouer le gate, triage périmé détecté
- `test_feature_set_frozen.py` — auto-correction ne peut pas changer le jeu de règles
- `test_s10s_attempts_invariant.py` — reconstruction d'un incident réel daté, garde prouvée par RED->GREEN

## Existence seulement (nominatif)

- `state.test.mjs::readStatus : lit le statut courant` — redondant avec un test voisin
- `input.test.mjs::dirFor : vocabulaire fermé` — redondant avec le chemin public `translate`
- `test_dispatch.py::test_order_covers_the_agent_steps` — compte un total sans nommer les étapes (protégé seulement en combinaison avec le test suivant)
- `test_component_design.py::test_module_without_docstring` (partie « texte de repli ») — protège un format d'affichage

---

## Remplacements proposés

| # | actuel | comportement produit couvert (remplacement) | coût estimé |
|---|---|---|---|
| R1 | `state.test.mjs::readStatus : lit le statut courant` (redondant, marginal ≈0) | « le clic sur le bouton Quitter ferme réellement la partie, ou affiche un message compréhensible si `window.close()` est bloqué par le navigateur » — répond directement au constat playtest « bouton quitter non fonctionnel » | **S** (~30-45 min) — nécessite de rendre `requestExit` observable (retour succès/échec) + test DOM léger (jsdom/happy-dom) sur `mount()` de `browser/main.mjs` |
| R2 | `input.test.mjs::dirFor : vocabulaire fermé` (redondant avec `translate`) | « une partie peut se jouer contre un adversaire automatique (mode un joueur) » — répond au constat « pas d'adversaire auto » | **L** (feature + test, pas un simple remplacement — la fonctionnalité n'existe pas dans `main.mjs`, qui ne câble que 2 joueurs humains clavier ; décision de conception à trancher par Pierre avant tout test) |
| R3 | 4 des 8 tests « renfort mutation » les plus redondants de `loop.test.mjs` (guard balayée and#1/and#2, gauche+droite) — valeur marginale décroissante au-delà des 3-4 premiers de la série | « avec les constantes réelles du jeu (`PADDLE_SPEED=4`, `BALL_VX=3`, `BALL_VY=2`), un joueur avec une latence de réaction modélisée (150-250 ms, quelques ticks) peut renvoyer au moins X % des services » — sonde de jouabilité distincte du bot actuel (latence 0) | **M** (~2-3h) — ajouter un bot à latence bornée au harnais `solvability.mjs`, décision de seuil par Pierre |

---

## Tests manquants (playtest) — chiffrés

| constat playtest | test proposé | comportement produit couvert | coût estimé |
|---|---|---|---|
| Bouton quitter non fonctionnel | test DOM : clic sur `#exit` déclenche `requestExit('browser')` ; vérifier le retour observable (aujourd'hui `requestExit` ne retourne rien d'exploitable côté navigateur — `window.close()` échoue silencieusement hors fenêtre ouverte par script, cause probable racine identifiée par lecture de `exit.mjs`) | « la partie se termine visiblement pour le joueur au clic Quitter » | **S** (~45 min) |
| Vitesse de balle injouable | sonde de jouabilité à latence humaine bornée (cf. R3) comparée au bot actuel à latence 0 — le bot actuel de `solvability.mjs` est structurellement une **borne supérieure** de performance humaine (aucun délai de réaction, remise à jour optimale à CHAQUE tick), donc ne peut mathématiquement pas détecter « trop rapide pour un humain » | « la fourchette de vitesse est jouable par un humain moyen, pas seulement par un bot omniscient » | **M** (~2-3h, seuil à trancher par Pierre) |
| Pas d'adversaire automatique | (cf. R2) — nécessite d'abord une décision de conception, pas seulement un test : `browser/main.mjs` câble exclusivement `p1` (W/S) et `p2` (flèches), confirmé par lecture ligne à ligne — aucune IA de jeu n'existe (le bot de `solvability.mjs` est un outil de TEST interne, jamais exposé au joueur) | « un mode un joueur existe et est jouable » | **L** (journée, feature + test) |
| Score/UX pas validés | test sur `draw.mjs::drawState` (0/3 mutants tués, 0 test l'importe, confirmé par lecture) : le score est dessiné en « pips » (petits carrés), jamais en chiffres — vérifier que le nombre de pips affichés correspond exactement à `state.score` après un point marqué | « le score affiché à l'écran reflète fidèlement l'état réel après chaque point » | **S-M** (~1-1.5h, `draw.mjs` a une interface `{clear, fillRect}` déjà mockable sans DOM réel) |
| 2 bugs de premier chargement navigateur (mémoire `forge_mechanical_ok_visually_dead` / constat 2026-07-26) | smoke-test Playwright qui charge réellement `browser/main.mjs` dans un vrai navigateur headless et vérifie zéro erreur console + canvas non vide après 1s — Playwright est DÉJÀ une dépendance du dépôt (utilisé par `capture_browser.mjs`), aucun nouvel outil à introduire | « le jeu démarre sans erreur dans un vrai navigateur, pas seulement dans un runtime Node isolé » | **M** (~2h) — c'est EXACTEMENT le test qui aurait détecté les 2 bugs de chargement déjà vécus, puisqu'aucun test actuel ne charge `main.mjs` |

---

## Delta de confiance — ce que la suite prouve sur le COLIS vs la MÉCANIQUE

Chiffré, à partir des mesures ré-utilisées de l'audit du 2026-07-26 (`ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md`, reçu signé `mutation_pong_r2`) et de la lecture directe des adaptateurs faite ici :

- **Mécanique pure** (`05_SYSTEMS/`, 3 fichiers) : mutation 58/61 tués = **95 %** — preuve mécanique forte que les règles internes sont correctes.
- **Présentation** (`06_RUNTIME/adapters/presentation/`, 7 fichiers, 488 lignes = 100 % de ce que le joueur voit/entend/clique) : mutation **0/65 tués = 0 %**, et **0/7 fichiers jamais importés** par un test scellé (fait structurel, pas une observation de run — reconfirmé ici par lecture directe de `browser/main.mjs`, `exit.mjs`, `draw.mjs`).
- Sur les **5 constats du playtest réel** (quitter, vitesse, adversaire, score/UX, 2 bugs de chargement) : **0/5 auraient pu être attrapés** par la suite actuelle — 4 vivent entièrement dans la couche 0 %-testée, et le 5ᵉ (vitesse) vit dans une couche testée (95 %) mais sur une propriété (jouabilité humaine) qu'AUCUN des 50 tests n'exprime, y compris le harnais de solvabilité qui est structurellement une borne supérieure de performance (bot à latence zéro).
- **Conclusion chiffrée** : la suite donne une confiance élevée et mesurée (95 %) sur « le moteur de règles ne bugue pas en interne », et une confiance de **0 % mesurable** sur « le jeu tel que livré est jouable et complet » — les deux affirmations sont vraies simultanément et ne se contredisent pas, mais seule la seconde est celle que Pierre a testée au clavier.

---

## SKIPPED_VALIDATION

- Gate mutation NON relancé (hors périmètre explicite de la mission — analyse basée sur le
  reçu signé `mutation_pong_r2` déjà vérifié par la mission V3 du 2026-07-26).
- Suite `scripts/forge/tests/` NON exécutée réellement (`pytest`) dans cette mission — les
  869 passed/1 skipped cités viennent de `lab/forge_runs/RUN_INDEX.md` (dernière mesure
  connue, mission V4 2026-07-26), pas d'une ré-exécution par cet audit. Le décompte de 829
  tests par `grep -c "def test_"` utilisé ici est un DÉCOMPTE STATIQUE, pas une exécution —
  l'écart (869 vs 829) vient très probablement de tests paramétrés (`@pytest.mark.parametrize`,
  observé dans `test_verify_run_integrity_separation.py`) qui comptent plusieurs fois à
  l'exécution pour une seule définition source — non recompté précisément ici.
- 49 des 69 fichiers de `scripts/forge/tests/` n'ont pas été lus (ni intégralement ni
  partiellement) — leur ligne dans le tableau § Synthèse studio est marquée `non lu`,
  aucune dominante n'est affirmée pour ces fichiers.
- Le playtest de Pierre lui-même (bouton quitter, vitesse, adversaire, score/UX) n'a pas été
  rejoué manuellement par cet audit — les constats sont pris tels que rapportés dans le
  contrat de dispatch, corroborés par lecture du code (ex. `window.close()` sur une fenêtre
  non ouverte par script échoue silencieusement dans la plupart des navigateurs — cohérent
  avec le constat, non reproduit en conditions réelles ici).
- La désynchronisation `triaged_survivors: []` déjà documentée par la mission V3 n'a pas été
  ré-investiguée (hors périmètre, déjà signalée ailleurs).

SKIPPED_VALIDATION: voir liste ci-dessus (5 éléments) — rien d'autre sauté.

---

## Contrat de sortie (résumé structuré)

```
resume_1_phrase: "0 des 50 preuves de la suite Pong n'importe un fichier d'adaptateur de
  présentation (488 lignes = 100% du colis joué) alors que la mécanique pure scelle 95% de
  mutation tuée — les 5 constats du playtest réel (quitter, vitesse, adversaire, score/UX,
  chargement) sont tous structurellement invisibles à la suite actuelle."
correction_memoire: "51 tests unit annoncés -> 49 réels (+1 harnais solvabilité) = 50, pas 52"
tests_jeu: "49 unit + 1 harnais classés un par un dans le corps du rapport (aucun cas
  tautologique trouvé ; 2 cas EXISTENCE ; ~9 cas STRUCTUREL protecteurs réels ; le reste
  COMPORTEMENTAL)"
tests_studio_synthese: "69 fichiers / 829 tests comptés (grep). 20 fichiers lus (intégral ou
  partiel) = 241 tests observés directement (~29%), dominante très majoritairement
  comportementale sur l'échantillon, zéro tautologie trouvée. 49 fichiers non lus, non notés."
vraies_regressions_couvertes: "NO-TUNNEL, rebonds/score/fin de partie, déterminisme, fuzz
  500 entrées, restart, solvabilité bout-en-bout (Pong) ; run E2E signé, falsification
  HMAC/évidence, provenance rompue, fail-closed sécurité, gate mutation, gel du jeu de
  règles, incident s10s reconstruit (Studio)"
existence_seulement: "readStatus (redondant), dirFor vocabulaire (redondant), comptage
  ORDER sans les noms (Studio), texte de repli docstring (Studio)"
remplacements_proposes:
  - actuel: "readStatus : lit le statut courant"
    comportement_produit_couvert: "clic Quitter ferme réellement la partie / message clair si bloqué"
    cout: "S (~30-45 min)"
  - actuel: "dirFor : vocabulaire fermé"
    comportement_produit_couvert: "un mode un joueur contre une IA existe et est jouable"
    cout: "L (feature + test, décision Pierre requise avant tout test)"
  - actuel: "4 des 8 tests renfort-mutation les plus redondants (guard balayée and#1/and#2)"
    comportement_produit_couvert: "un joueur à latence de réaction réaliste peut renvoyer >=X% des services"
    cout: "M (~2-3h, seuil à trancher par Pierre)"
tests_manquants_playtest:
  - constat: "bouton quitter non fonctionnel"
    test_propose: "clic #exit -> sortie visible / message si window.close() bloqué"
    cout: "S (~45 min)"
  - constat: "vitesse de balle injouable"
    test_propose: "sonde de jouabilité à latence humaine bornée vs bot actuel latence 0"
    cout: "M (~2-3h)"
  - constat: "pas d'adversaire auto"
    test_propose: "mode un joueur + test d'intégration (feature absente, décision Pierre d'abord)"
    cout: "L (journée)"
  - constat: "score/UX pas validés"
    test_propose: "nombre de pips dessinés == state.score après un point (draw.mjs 0% testé)"
    cout: "S-M (~1-1.5h)"
  - constat: "2 bugs de premier chargement navigateur"
    test_propose: "smoke-test Playwright réel sur browser/main.mjs, zéro erreur console"
    cout: "M (~2h, Playwright déjà présent dans le dépôt)"
rapport_path: "docs/audit/AUDIT_ALLEGEMENT_B1_TESTS_2026-07-27.md"
git_status_final: "voir section dédiée ci-dessous — seul ce rapport est ajouté par cette mission"
skipped_validation:
  - "gate mutation non relancé (hors périmètre)"
  - "suite scripts/forge/tests/ non ré-exécutée, chiffre 869 repris de RUN_INDEX.md"
  - "49/69 fichiers studio non lus, non notés dans la synthèse"
  - "playtest Pierre non rejoué manuellement, corroboré par lecture de code seulement"
  - "désynchronisation triaged_survivors déjà signalée par V3, non ré-investiguée"
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

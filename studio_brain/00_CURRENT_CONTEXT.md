# Contexte courant TCS
*(Handoff. Archives : `journal/context-archive-2026-08-22-kitten-clicker-runs1-3.md` (détail des 3 runs,
6 ruptures, chemins pour forger, croquis blackboard), `…-2026-08-21-publication-reparation.md`, `…-08-20`.)*

## Branche : `master` (= origin/master). `publish` = snapshot séparé, intouché.
Hors lot, non commité : `scripts/forge/tests/test_evidence_isolation_fixture.py` (12 lignes, ne vivait que
sur `publish`) — à arbitrer par Pierre. Artefacts de run (lab/forge_runs/kitten_clicker/, lessons.jsonl,
RUN_INDEX.md, observer/) non commités : merge/reject = Pierre.

## Kitten Clicker — test d'autonomie de la Forge (réf. Cookie Clicker + Neko Atsume)
**Commits master** : `ad6eff4` lot 1 (profil `full_godot_narratif`, injection s2.6/s2.7, `reference` adressable,
sonde `check_amont_traversal.mjs`) · `bfe04fa` lot 2 · `4f8c245` lot 3 · `db8c79b` lot 4 (`full_godot_content` +
art bible injectée jusqu'à s9) · `e8e9b40` lot 5 (WireMap v2) · `6aa64bf` lot V3 (runtime_alive + gates).

**Run 3** (baseline, DONE 16/16, ≈ 38 $) : 10 exigences / 10 feuilles / 10 lignes / 23 fichiers / 0 asset / 0 audio /
story bible 2-8 ; 6 ruptures (1-3 corrigées lots 2-3 ; 4 charter advisory ; 5 couvre fantômes + fausse preuve de
réparation ; 6 composition legacy/standard). Diagnostic ratifié : le Prisme est un PLAFOND, « vérifiable » ≠ « par
un bot », ne pas transformer chaque dimension en oracle ; croquis blackboard = première formulation ; chemins pour
forger : `run_real.py` canonique, skill `/forge` périmé, `FORGE_SYSTEM_CONTRACT.yaml` PROPOSED. Détail : archive runs1-3.
**2026-08-22 — « il y a suffisamment d'éléments »** → composition de l'existant (plan `…-complet-composition.md`),
gestes manuels M1-M7 = spec du câblage ; 5 familles/6 ont leur brique ; aucun générateur 2D → SVG ; les TÂCHES exigent.
**Run 4** (`db8c79b`, HALTED s5) : 13 critères, Prisme 26/5 familles, WireMap v2 51 lignes 26/26 (rupture 5 fermée
par la tâche) ; rupture 7 validateur v1-only → lot 5 (`e8e9b40`). Les noms des chatons naissent à s2.5 (art bible).

**Run 5 `kitten_clicker-20260821e`** (`e8e9b40`, DONE 17/17, ≈ 22-50 $, verdict AUTHENTIQUE FAIL/BLOCKED, archivé
`_run5_20260821e/` + `game_build5/`) : l'intention traverse jusqu'aux FICHIERS (22 exigences / 5 familles, WireMap v2
40 lignes 22/22, 110 fichiers, 17 SVG importés, registres 8 chatons nommés, audio, volets GPU OK, s10c isomorphe,
sonde 3 faits à BUILD) — mais **rupture 8 : preuve sans exécution produit** (red-team Opus, vérifié) : `main.tscn`
= Node2D + HUD statique, aucune boucle, registres jamais chargés, audio jamais déclenché par le jeu, volets qui
construisent leur propre scène, `preuve` = prose (11 fichiers cités absents). Capture : « 0 ronrons / 0 /sec ».
s10s = deux vocabulaires (Prisme vs STANDARD). Détail : `journal/context-archive-2026-08-22-kitten-clicker-runs4-6.md`.

### HumanGate V3 — playtest Pierre (2026-08-22) sur le build 2 du run 6
« Il y a des choses mais je ne peux rien faire d'autre qu'enchaîner des clics au centre ; pas d'arrivée de
chaton quand on clique ; on n'est pas guidé ; pas de boucle menu ni de réelle boucle de jeu. »
**V3 technique validée, V3 produit échoue** : runtime vivant ≠ jeu jouable. Existe : scène réelle, assets,
chatons, refuge, HUD, clic, compteur, runtime réactif. Manque : boucle de jeu, arrivée des chatons par le
gameplay, objectifs, guidage, progression jouable, menu/navigation, décisions du joueur, boucle méta.
Décision Pierre : **pas V3.1 puis retour pipeline** (V3.1 mécanique, fermable en parallèle) ; prochain vrai
chantier = **GAME LOOP**, par audit ciblé du gameplay produit (pas un système de Forge) : (1) intention /
Story / GM / Grey Blocks du run 6 → (2) reconstruire la boucle demandée → (3) comparer au runtime → (4) où
elle disparaît → (5) corriger là seulement. Le Builder n'invente pas la boucle : il reçoit
`PLAYER_GOAL · PLAYER_ACTION · GAME_RESPONSE · REWARD · UNLOCK · NEXT_GOAL · META_LOOP`. Le GM = producteur
de la « loi de la physique du jeu » — exactement ce qui manque. Prochain test : « un joueur peut-il
commencer sans explication, comprendre quoi faire, atteindre un 1er objectif, recevoir une conséquence,
débloquer, entrer dans la boucle suivante ? »
**Audit gameplay (Opus, lecture seule, CONFRONTÉ par grep)** — où la boucle disparaît, ordre causal :
(1) **aucune affordance d'achat** : `input.gd` n'a qu'un signal `clic_pelote` ; `api_buy_kitten/upgrade/prestige`
(`runtime.gd:128/139/148`) ont 0 appelant runtime (seuls les oracles les appellent) ; (2) cascade : production
passive gardée par `if kittens.size() > 0` (`runtime.gd:106`) jamais vraie en jeu ; (3) **les oracles ont validé
la boucle par un canal que le joueur n'a pas** (`main_screen_render.gd:82` appelle `api_buy_kitten` ;
`solvability.gd` pilote `Economy` sans `main.tscn`) ; (4) quêtes = fichier lu (`runtime.gd:67`) jamais consommé ;
(5) objets = icônes, `effet` jamais lu ; (6) ni menu ni guidage (0 Button/menu/tutorial). **Cause racine unique :
les 25 exigences du Prisme sont à la voix passive** (« Acheter un chaton fait apparaître… », CT5 « un registre
déclare… ») — **0 exigence « le joueur PEUT »** — alors que le charter (d) demandait « affichés à l'écran » : la
perte est **entre charter et Prisme**, puis reproduite fidèlement par Grey Blocks → WireMap → Builder → Oracle.
Physique du jeu : seules 2 constantes tracent au GM (coût 15, ×1,15) ; paliers/upgrades/prestige sans source.
**Plus petit endroit à corriger** : (a) Prisme — classe d'exigence « le joueur PEUT » avec affordance nommée +
NEXT_GOAL/PLAYER_GOAL affichés ; (b) featuremap — capacités d'input `bot_action` passant par `main.tscn` ;
(c) `input.gd` + ligne WireMap `core.input` (1 signal, 1 `couvre`). Spec de boucle à livrer au Builder (7
champs, sources amont) : dans l'archive runs4-6.

### Prochaine étape
1. **Chantier GAME LOOP — plan V4 écrit** : `docs/superpowers/plans/2026-08-22-kitten-clicker-v4-game-loop.md`
   (Prisme : `acteur` PLAYER/SYSTEM + `loop_role` + `affordance` + `observe` additifs ; `loop.json` dérivé
   déterministement de prisme.json ; check_decompo : action joueur ⇒ bot_action depuis main.tscn ; contrat s9 :
   affordances = Control groupe `affordance`, HUD = Label groupe `hud` ; bot-joueur `player_loop.gd` par InputEvent
   seulement + garde anti-contournement (Economy/api_* interdits aux volets et à solvability) ; gate `loop_dead`
   advisory au run 7). **GO Pierre 2026-08-22** — verrous : `loop.json` = projection déterministe du Prisme (jamais
   LLM → loop.json), copie déposée par le builder à sha égal ; ordre strict T1 → T2 → T3/T4 → T5 avec confrontation
   entre chaque ; garde anti-contournement non négociable ; critère logiciel ≠ HumanGate (voulu) ; pas de dérive.
   **Lot V4 livré et confronté (T1→T5)** : `validateExigence` additif (`acteur`, `loop_role`, `affordance`,
   `observe`) ; `loop_spec.mjs` (projection déterministe, hash stable) + `loop.json` matérialisé par l'exécuteur,
   reçu `loop_check` recopié dans l'état ; `check_decompo` règle `boucle_sans_entree` (action joueur ⇒ `bot_action`
   depuis main.tscn) ; `loop.json` injecté s3/s5/s9 ; contrat s9 : affordances `Control` groupe `affordance`, Labels
   groupe `hud`, copie sha-égale de loop.json, garde-fous (i) entrées du joueur seules, (j) guidage ; sonde
   `godot_probes/player_loop.gd` (InputEvent + lecture hud uniquement) + `run_player_loop` (sha mismatch = FAIL) ;
   `check_loop_bypass` + garde statique par volet ; gate `loop_dead` ADVISORY au run 7. **Baselines mesurées sur le
   run 6** : `checkLoopSpec` FAIL 7 rôles manquants · `actions_joueur: 0` · bot-joueur `reached_role: NONE`
   (« hud 'ronrons' introuvable ») · `check_loop_bypass` : 9 violations (volets + solvability : api_buy_kitten,
   api_prestige, Economy, 05_SYSTEMS). Preuves : Node 841/841, pytest ciblé 71 + 84 + 45 + 43, test_driver.py 19/19. Cadrage d'origine : pas un système de Forge — corriger au plus petit endroit (Prisme
   « le joueur PEUT » + objectifs affichés → featuremap capacités d'input via main.tscn → input.gd/core.input),
   livrer au Builder la spec 7 champs (archive runs4-6), puis run 7 ; test = « un joueur commence sans explication,
   comprend, atteint un 1er objectif, reçoit une conséquence, débloque, entre dans la boucle suivante ». Aucun
   lot engagé — plan avant code. V3.1 (sonde inconditionnelle, dépôt 09_WIREMAP) fermable en parallèle.
   Pierre : merge/reject des artefacts de run ; arbitrer `test_evidence_isolation_fixture.py`.
2. **Lot V3 livré** (`6aa64bf`, plan `docs/superpowers/plans/2026-08-22-kitten-clicker-v3-assemblage-runtime.md`) :
   sonde externe `godot_probes/runtime_alive.gd` + `run_runtime_alive` (vraie scène, clic injecté, image change ?
   OUI/NON — baseline run 5 : FAIL) · gate s10a `runtime_dead` (3 points d'agrégation) · garde « volet charge
   res://main.tscn » · `preuve` → fichier existant (11 absents au run 5) · contrat s9 assemblage + tâche s9.
   V3 PASS = main.tscn réel + systèmes instanciés + interaction réelle + oracle sur CE main.tscn + preuve →
   fichiers + capture + playtest humain.
3. **Run 6 `kitten_clicker-20260821f` (commit `6aa64bf`, profil `full_godot_content`)** — amont : Prisme 25
   exigences / 5 familles / 24-24 refs ; WireMap v2 42 lignes 25/25, 0 fantôme, sonde WIREMAP. Build 1
   (49 min, 21,7 $) : `main.tscn` 1 nœud, pas de `proof:` → **trou de gate mesuré** : `runtime_alive` vit dans
   `if proof_descriptor_ok and godot_capacity_ok` → un build sans `proof:` échappe à la sonde (V3.1 : sonde
   inconditionnelle dès `run/main_scene`) ; harnais du builder rouge (HTTPRequest dans runtime.gd). Build 2
   (pool, 46 min, 23,8 $) : `main.tscn` = nœud `Main` + `runtime.gd` qui précharge 10 systèmes/adaptateurs et les
   `add_child` en `_ready` ; **`runtime_alive` OK : scène chargée, 30 nœuds, 6 scriptés (5 systèmes), image non
   monochrome, CHANGE après le clic** ; 204 tests verts ; solvabilité 20/20 ; 3 volets OK en chargeant
   `res://main.tscn` (la garde a façonné le builder) ; capture GPU hors projet = pelote, HUD, galerie 6 chatons,
   objets, refuge (vs HUD gris du run 5). **s10a BLOCKED** : `09_WIREMAP/wiremap.json` non déposé dans le jeu →
   régime mutation sans entrée (+ s10s BLOCKED idem) ; s10c FAIL sur la WireMap de s5 (`preuve` vides 23,
   `fonction` en prose 42 — variance de forme de s5, gatée honnêtement). Le NON du run 5 est éliminé. **Run 6 DONE 17/17**
   (2 h 57, 646 k tokens, ≈ 48 $) : verdict `BLOCKED / BLOCKED`, **INTÉGRITÉ : REJET** par `verify_run` —
   « reçu de JEU sans preuve mutation embarquée » (conséquence directe du `09_WIREMAP` non déposé → mutation
   jamais jouée), pas une falsification ; flags : wiremap rouge (`preuve` cite `runtime_alive.gd` = la sonde
   du studio, hors `src_root` → à tolérer en V3.1), standard rouge, red-team dégradé ; s11 Opus : 0 finding ;
   7 leçons promues. Capture GPU : un jeu à l'écran. Playtest Pierre = la mesure qui reste.
2. Rapport : intention traversée vs baseline, gestes manuels → spec de câblage, ruptures localisées.
3. Ensuite (décisions Pierre) : lots candidats des ruptures 4-6, skill `/forge` à réaligner sur
   `run_real.py`, ratification `FORGE_SYSTEM_CONTRACT.yaml`, branches mortes.

## Rappels de fond
`publish` = snapshot orphelin séparé, aucun SHA recopié ici · artefacts à chemin de poste exclus du corpus
public (`d9b8a5b`) · HMAC symétrique = 0 vérifiable par un tiers · lots EVIDENCE / anonymisation /
sensibilité FERMÉS → `journal/context-archive-2026-08-21-publication-reparation.md`.

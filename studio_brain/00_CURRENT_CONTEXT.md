# Contexte courant TCS
*(Handoff. Archives : `journal/context-archive-2026-08-22-kitten-clicker-runs1-3.md` (détail des 3 runs,
6 ruptures, chemins pour forger, croquis blackboard), `…-2026-08-21-publication-reparation.md`, `…-08-20`.)*

## Branche : `master` (= origin/master). `publish` = snapshot séparé, intouché.
Hors lot, non commité : `scripts/forge/tests/test_evidence_isolation_fixture.py` (12 lignes, ne vivait que
sur `publish`) — à arbitrer par Pierre. Artefacts de run (lab/forge_runs/kitten_clicker/, lessons.jsonl,
RUN_INDEX.md, observer/) non commités : merge/reject = Pierre.

## Kitten Clicker — test d'autonomie de la Forge (réf. Cookie Clicker + Neko Atsume)
**Commits master** : `ad6eff4` lot 1 (profil `full_godot_narratif`, injection s2.6/s2.7 → s1/s3, `reference`
adressable, sonde `check_amont_traversal.mjs` ADVISORY sur le reçu s10c) · `bfe04fa` lot 2 (regex YAML
ancrée, sortie en échec persistée) · `4f8c245` lot 3 (dernier bloc JSON qui PASSE le validateur) ·
lot 4 (ce commit) : profil **`full_godot_content`** = narratif + `s2.5-artbible` après s1 (17 étapes),
injection `art_bible.md`/`asset_requests.json` dans s3, s5 et **s9** (qui n'avait aucune injection).

**Run 3 `kitten_clicker-20260821c`** (DONE 16/16, ≈ 38 $, verdict AUTHENTIQUE FAIL/BLOCKED) = baseline :
10 exigences / 10 feuilles / 10 lignes / 23 fichiers / 1 scène / 0 asset / 0 audio / story bible 2-8 / sonde 4
GREY_BLOCKS ; jeu mécaniquement jouable (73 tests, solvabilité 20/20, volets GPU OK). Six ruptures localisées
(détail archive 2026-08-22) : 1-3 corrigées (lots 2-3) ; 4 charter advisory ; 5 couvre fantômes + fausse preuve
de réparation (`repair_step.mjs:237`) + `ESCALADE` sans consommateur ; 6 composition legacy/standard.
**Diagnostic ratifié Pierre** : le Prisme est un PLAFOND (non-invention s3), « vérifiable » ≠ « par un bot »,
ne pas transformer chaque dimension en oracle. Croquis blackboard (3 sources → effets → wiremap → builder) :
première formulation. **Chemins pour forger** : `run_real.py` canonique ; skill `/forge` périmé (87 commits,
ne cite pas run_real) ; `run_orchestrator` mort avec pong_r3 ; `review`/`increment` jamais joués ;
`FORGE_SYSTEM_CONTRACT.yaml` PROPOSED ; aucun code Forge hors master.
**2026-08-22 — « il y a suffisamment d'éléments »** → composition de l'existant, gestes manuels M1-M7 = spec du
câblage (plan `docs/superpowers/plans/2026-08-21-kitten-clicker-complet-composition.md`) ; 5 familles/6 ont
leur brique ; aucun générateur 2D → SVG ; `expected_proof.kind` actuel suffit, ce sont les TÂCHES qui exigent.
**Run 4 `kitten_clicker-20260821d`** (`db8c79b`, HALTED s5, archivé `_run4_20260821d/`) : charter 13 critères,
story bible 3/8 (s2.6 ANCRE, n'invente pas — les noms naissent à **s2.5** : Moustache, Biscotte, Réglisse,
Nuage, Cannelle, Saphir, Lumina), Prisme 26 exigences / 5 familles / 24-24 refs, WireMap v2 51 lignes 26/26
couvertes (rupture 5 fermée par la tâche) ; **rupture 7** : validateur v1-only → **lot 5** (`e8e9b40`) v2 acceptée
+ `check_wiremap` v2-aware ; `lines[8] core.audio fichiers: []` = écart builder (0/167 réels), règle stricte.

**Run 5 `kitten_clicker-20260821e` (commit `e8e9b40`) — DONE 17/17, 2 h 10, 13 appels, ≈ 22-50 $ (build 1
25,9 $ / 58 min, build 2 0,9 $), verdict AUTHENTIQUE `FAIL / BLOCKED`.** L'intention a traversé jusqu'aux
FICHIERS : charter PASS 13 critères · Prisme 22 exigences / 5 familles / 19-19 refs · featuremap 22 feuilles
OK · **WireMap v2 acceptée** (lot 5 validé en réel) 40 lignes, 22/22 couvertes, 0 fantôme, 17 `asset.sprite`
· build 110 fichiers : **17 SVG importés par Godot**, registres `03_WORLD` (8 chatons nommés, 2 lieux, 3
objets, quêtes), adaptateur audio, 3 volets · s10c **isomorphe** (0 manquante/renommée) · volets GPU
`core_audio`/`gallery_render`/`main_screen_render` OK · solvabilité 20/20 · e2e PASS · **sonde : 3 faits à
BUILD** (première fois). Rouges : s10a `reuse_ratio` (legacy) + wrapper solvabilité (`runner_argv=[]`) ;
s10s `core_omis` 10/10, 17 `identifiants_inconnus`, `genre_bible` null = **deux vocabulaires** (Prisme vs
STANDARD), rupture 6 sous sa vraie forme.
**Rupture 8 — preuve sans exécution produit (red-team Opus, 6 findings, VÉRIFIÉS mécaniquement)** :
`main.tscn` = Node2D vide + HUD ; aucun `_process`/Timer dans le runtime ; `load_registries()` sans appelant ;
`play_sfx` déclenché seulement par son propre oracle ; `main_screen_render` dessine un HUD codé en dur au
lieu de charger la scène ; 2 fichiers de preuve cités par la WireMap absents (`preuve` = prose non vérifiée
par `check_wiremap`) ; le bot ne passe jamais par le prestige. **Les pièces existent, l'assemblage runtime
n'existe pas, et les volets construisent leur propre scène.** Couches : contrat s9 (livrer une scène
jouable n'est exigé nulle part), oracle produit (volets auto-assemblés), `check_wiremap` (`preuve` texte).
Red-team plan Qwen : 0 finding (PASSIVE confirmée). 12 leçons promues.

### Orientation Pierre 2026-08-22 (fin de session) — V3 = « spécification → assemblage runtime réel »
Paliers ratifiés en séance : **V1** mécanique prouvable · **V2** intention → contenu → spécification →
fichiers (atteint, run 5) · **V3** spécification → assemblage runtime réel (prochain lot, **étroit**, ni
système de contenu, ni oracle généraliste, ni couche). Question du test V3 : *la Forge produit-elle un jeu,
ou une représentation de jeu ?* Trois pièces, avec leur ancrage mesuré :
1. **Contrat Builder → Runtime** (`scripts/forge/contracts/s9-build-godot-standard.yaml`) : `main.tscn` est le
   point d'entrée JOUABLE et instancie/charge les systèmes exigés par la WireMap — pas « les fichiers
   existent ». Cible Kitten Clicker : `main.tscn → GameController → {ronrons, chatons, production, upgrades,
   lieux, quêtes, audio, progression}` et la boucle clic → ronrons → chaton → production → upgrade → lieu →
   quête → méta-progression DANS le runtime.
2. **Builder** : assemble réellement dans `main.tscn` (le run 5 a livré 110 pièces indépendantes ; mesuré :
   Node2D + HUD, aucun `_process`/Timer, `load_registries()` sans appelant, `play_sfx` jamais appelé par le jeu).
3. **Oracles** : chargent le VRAI `res://main.tscn` produit au lieu de construire leur scène (mesuré :
   `07_TESTS/oracle/main_screen_render.gd:39` dessine `draw_hud(12345, 678)` ; `product_oracle_godot` exécute
   ces volets tels quels) ; `check_wiremap` doit résoudre `preuve` vers un fichier existant (2 absents au run 5).
   Défaut le plus important du test : **un oracle qui reconstruit son environnement peut prouver un jeu qui
   n'existe pas** — « 73 tests verts » sur un jeu statique. Preuve humaine : capture GPU hors projet
   (`--script` externe, 90 frames) → « 0 ronrons / 0 /sec » ; à refaire par Pierre en playtest.
Ensuite seulement : WireMap → Builder → main.tscn réel → Godot → oracle sur CE runtime → playtest → leçons.

### Prochaine étape
1. **Pierre** : playtest de `games/kitten_clicker/` (HumanGate, attendu : HUD statique) ; merge/reject/freeze
   des artefacts de run ; arbitrer `test_evidence_isolation_fixture.py`.
2. **Lot V3 livré (go Pierre 2026-08-22)** — plan `docs/superpowers/plans/2026-08-22-kitten-clicker-v3-assemblage-runtime.md`.
   Doctrine : Task 1 est LE test, le reste le rend incontournable ; `runtime_alive` reste pauvre (scène vit ?
   réagit à un clic réel ? OUI/NON). Livré : sonde externe `scripts/forge/godot_probes/runtime_alive.gd` +
   `product_oracle_godot.run_runtime_alive` (fenêtre GPU, vraie `run/main_scene`, 60 frames, clic injecté,
   image change ?) — **baseline mesurée sur le build run 5 : FAIL, `changed_after_click: false`** · gate s10a
   `runtime_dead` (driver, injectable, SKIPPED sans main_scene, NOT_MEASURED sans Godot) · garde statique :
   un volet `07_TESTS/oracle/*.gd` sans `load("res://main.tscn")` = FAIL sans exécution (les 3 volets du
   run 5 rejetés) · `check_wiremap` : `preuve` qui nomme un `.gd` absent = `preuves_absentes` (**11** sur la
   WireMap du run 5, pas 3) · contrat s9 : `main.tscn` = point d'entrée JOUABLE, garde-fou (h) « pas de
   pièces sans assemblage », critères 5-7 ; tâche s9 ASSEMBLAGE OBLIGATOIRE. Fixtures de
   `test_product_oracle_godot.py` mises en conformité (volets synthétiques chargent la scène).
   V3 PASS = main.tscn réel + systèmes instanciés + interaction réelle + oracle sur CE main.tscn + preuve →
   fichiers + capture + playtest humain. Run 5 + build archivés `_run5_20260821e/` (+ `game_build5/`).
2. Rapport : intention traversée vs baseline, gestes manuels → spec de câblage, ruptures localisées.
3. Ensuite (décisions Pierre) : lots candidats des ruptures 4-6, skill `/forge` à réaligner sur
   `run_real.py`, ratification `FORGE_SYSTEM_CONTRACT.yaml`, branches mortes.

## Rappels de fond
`publish` = snapshot orphelin séparé, aucun SHA recopié ici · artefacts à chemin de poste exclus du corpus
public (`d9b8a5b`) · HMAC symétrique = 0 vérifiable par un tiers · lots EVIDENCE / anonymisation /
sensibilité FERMÉS → `journal/context-archive-2026-08-21-publication-reparation.md`.

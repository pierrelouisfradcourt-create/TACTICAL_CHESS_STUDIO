# Contexte courant TCS
*(Handoff. Archives journal : `context-archive-2026-08-22-kitten-clicker-v3-v4.md` (runs 6-7, playtest, audit gameplay,
lots V3/V4), `…-runs4-6.md`, `…-runs1-3.md`, `…-2026-08-21-publication-reparation.md`.)*

## Branche : `master` (= origin/master + 7 commits locaux non poussés). `publish` = snapshot séparé, intouché.
Non commités : artefacts de run `lab/forge_runs/kitten_clicker/` (runs 1-7 archivés `_runN_*/` + builds), `games/kitten_clicker/`
(build du run 7), `lessons.jsonl`, `RUN_INDEX.md`, observer/, `test_evidence_isolation_fixture.py` (hors lot, 12 lignes) —
merge/reject/freeze = Pierre.

## Kitten Clicker — test d'autonomie de la Forge (réf. Cookie Clicker + Neko Atsume), 2026-08-21/22
**Commits master** : `ad6eff4` lot 1 (profil `full_godot_narratif`, injection s2.6/s2.7, `reference` adressable, sonde
amont) · `bfe04fa` lot 2 (regex YAML, sortie en échec persistée) · `4f8c245` lot 3 (dernier bloc JSON qui PASSE le
validateur) · `db8c79b` lot 4 (`full_godot_content` : art bible injectée jusqu'à s9) · `e8e9b40` lot 5 (WireMap v2) ·
`6aa64bf` **V3** (sonde `runtime_alive` hors projet, gate `runtime_dead`, volets sans scène propre, `preuve` → fichier,
contrat s9 assemblage) · `3843d7b` **V4** (sujet PLAYER au Prisme, `loop.json` projection déterministe, `check_decompo`
entrée+effet, bot-joueur `player_loop.gd`, `check_loop_bypass`, gate `loop_dead` advisory).

**Paliers ratifiés Pierre** : V1 mécanique prouvable (run 3) · V2 intention → fichiers (run 5) · V3 assemblage runtime
réel (run 6 : scène vit et réagit ; playtest : « runtime vivant ≠ jeu jouable ») · **V4 boucle joueur** (run 7).
Doctrines fixées en séance : le Prisme est un PLAFOND (non-invention s3) ; « vérifiable » ≠ « par un bot » ; ne pas
transformer chaque dimension en oracle ; *un oracle qui reconstruit son environnement peut prouver un jeu qui
n'existe pas* ; *la boucle n'a pas été perdue par le runtime, elle a été transformée en effets sans sujet joueur
avant le Builder* ; `loop.json` = projection déterministe du Prisme, jamais LLM → loop.json ; le bot de preuve n'a
que les entrées d'un joueur (Economy / api_* / 05_SYSTEMS / runtime.gd interdits) ; critère logiciel ≠ HumanGate.

**Ruptures localisées (toutes mesurées, 1-3 et 7 corrigées)** : 1 regex YAML · 2 sortie en échec non persistée ·
3 dernier bloc JSON · 4 charter advisory (s0 OK sans artefact ; re-spawn prescrit, non implémenté) · 5 couvre fantômes +
fausse preuve de réparation (`repair_step.mjs:237`) + `ESCALADE` sans consommateur · 6 composition legacy/standard
(vocabulaires Prisme ≠ STANDARD, `reuse_ratio` rouge structurel) · 7 validateur WireMap v1-only · 8 preuve sans
exécution produit (volets auto-assemblés, `preuve` prose) · **9 effets sans sujet joueur** (Prisme voix passive).

**Run 7 (V4, `3843d7b`)** : le bot-joueur joue jusqu'à l'adoption d'un chaton par l'écran seul ; arrêt à NEXT_GOAL (chaîne à un
maillon), REWARD sans `observe` ; le driver n'a pas mesuré (pas de `proof:`, 3ᵉ fois). Détail : journal `…-gameplay-contract.md`.

### Gameplay Contract (commit `f1bce0d`) + run 8b — résumé (détail : journal `…-gameplay-contract.md`)
10 maillons A→J dans `loop.json`, sonde `player_loop.gd` (new_distinct/appears/decreases/resets/increases_more_than/REPEAT), driver :
bloc runtime inconditionnel dès `run/main_scene`, `loop_dead` gate. Run 8a HALTED s2 (rupture 10 : BLOCKED sans retry). Run 8b
(`_run8_20260821h2/`) : A→J 12/12 mesuré par le driver, verdict FAIL hors boucle ; 0/4 affordances liées selon
`check_wiremap_contract` (non consommé par l'exécuteur, `EFFECT_KINDS` trop étroit).

### Décision significative (2026-08-23, archivé `…-decision-produit.md`) — résumé
A→J nécessaire pas suffisant ; définition contre-factuelle ratifiée (`gamedesign/kitten_clicker_decision_significative.md` V2, 6 preuves) ;
chantier DÉCISION `0a9f4d4` ; run 9 `_run9_20260823a/` : A→J 13/13 + DECISION 6/6 mesurés par le driver, non-dominance inversée ;
HumanGate FAIL (prototype mécanique). Lot produit P0–P4 `b75f165` (direction produit V1 ratifiée, intention/tâches/s9).

### HumanGate Pierre 2026-08-23 sur le build run 9 — FAIL « jeu complet » = BASELINE PRODUIT (ratifié)
« Prototype mécanique avec habillage. » 4 causes : (1) les 6 chatons sont décoratifs (récompense visible avant d'être gagnée) ;
(2) le prestige n'est pas un 2ᵉ niveau (pas de reset réel / bonus permanent / nouvelle stratégie — un bouton) ; (3) espace trop
pauvre (nombre de chatons = variable, pas une colonie ; plafond = mur arbitraire) ; (4) guidage illisible (hiérarchie OBJECTIF →
ACTION → CONSÉQUENCE → PROCHAINE POSSIBILITÉ absente). V4/V5 n'ont pas échoué : ils ont fait apparaître la vérité produit.
**Prochain chantier = PRODUIT/GAMEPLAY, pas infrastructure** (pas de « V5 plus d'oracles ») : plan
`docs/superpowers/plans/2026-08-23-kitten-clicker-lot-produit.md` (P0 direction produit → P1 boucle → P2 vrai prestige →
P3 monde/placement → P4 guidage → P5 2ᵉ HumanGate « envie de continuer après le premier prestige ? »), réalisé PAR LA FORGE
(intention/tâches/contrat, mesure inchangée). P0 rédigé : `studio_brain/gamedesign/kitten_clicker_direction_produit_v1.md`
(PROPOSED : niveau 1 par possibilités nouvelles, prestige reset/conserve/cœurs/grenier, niveau 2 croquettes + décision
jardin/grenier, places = règle lisible, album de silhouettes).

### Audit lecture seule design → runtime (2026-08-23, Opus, confronté Fable) — `docs/audit/2026-08-23-kitten-clicker-design-chain-audit.md`
Réponse : **on a construit avant de spécifier** — aucune station n'écrit les nombres ni la causalité du jeu (le GM mesure le GENRE,
la « station suivante » qu'il annonce n'existe pas) ; `design_intent.md` n'est lu par AUCUNE étape ; 0/21 exigences citent le design
(schéma d'adresse l'interdit) ; toutes les valeurs naissent dans `pricing.gd`/`prestige.gd` ; contenu entier épuisé en < 1 s ;
G et J verts pour la mauvaise raison (phrase suffixée d'un compteur ; J sans affordance = production passive — la sonde ignore
`replay_ref`). Table : boucle/progression DOCUMENTED_ONLY · métriques NOT_FOUND amont · métagame PASSIVE · design→GM BLOCKED ·
GM→Prisme PASSIVE · Prisme→runtime TESTED forme. Run 10 **non lancé** (run 10 `…b` avorté à s0 : build run 9 verrouillé par Godot ;
artefacts au scratchpad). Build run 9 déplacé au scratchpad, `games/kitten_clicker/` absent. **Audit 2 (Fable, sur pièces) :
World Scan → Art Bible → GM = NON par ORDRE** (s2.5 Art Bible produite APRÈS s2.7 GM et s1 ; GM ne reçoit que le World Scan ; l'Art
Bible n'a AUCUNE injection amont, ancrée Prisme seul ; le « GM » est un scan de genre, pas un Game Master) —
`docs/audit/2026-08-23-kitten-clicker-worldscan-artbible-gm-pipe.md`. Cible ratifiée Pierre : WORLD SCAN → ART BIBLE (héritée +
décidée) → GAME MASTER (loops, progression, métriques, preuves, Grey Blocks) → ARTIST/BUILDER ; réparer ce tuyau AVANT gameplay.

### Lots ratifiés Pierre 2026-08-23 : A Tuyau → B GM (Game Master, option (a) : étendre s2.7) → C Calibration → D Fuites → E Run 10
**Lot A FAIT** (`497c54b`) : s2.5 Art Bible avant s2.7 GM ; s2.5 ← charter+World Scan+Story Bible ; s2.7 ← World Scan+Story Bible+
art_bible+asset_requests ; preuve de chargement = manifeste de dispatch ; preuve de consommation = `sources_consumed` résolu. Art Bible :
8 sections nommées (texte de contrat, pas de validateur Python).

**Lot B FAIT (GO Pierre : Opus · gates dès le run 10 · retour inter-run · boucles testables)** — plan
`docs/superpowers/plans/2026-08-23-forge-lot-b-game-master.md`. s2.7 = GAME MASTER (Opus, rôle `game_master`) : `gm_worldscan.json`
gagne `game_master` {world_interpretation, 6 loops (étapes avec why/metric_ref/proof_ref), economy_model, progression_metrics
invariant|target|observation, proof_model, grey_blocks, artist_requirements} validé par `game_master_schema.mjs` à la
matérialisation (refus nommé) ; `economy.json` projeté (reçu `economy_check`) et injecté à s9 ; héritage inter-run `heritage/`
(art_bible, gm_worldscan, art_response + manifest) écrit par le driver, injecté à s2.5/s2.7. Consommation : Prisme → GATE
`_validate_prisme(run_dir)` (toute exigence de boucle cite `gm_worldscan:game_master.loops.*|grey_blocks.*` qui résout, dès
qu'un bloc `game_master` existe) ; Grey Blocks → `check_decompo --gm` `grey_block_non_decompose` ; Builder → gates driver
`art_response_dead` (`check_art_response.mjs`, 1:1 avec artist_requirements) et `economy_bypass_dead` (`check_economy_bypass` :
run 9 = 5 constantes en dur) ; sonde : `frames` par step + `target_frames` (FAIL hors tolérance). Baselines run 9 : 0/13 exigences
sourcées GM, `game_master` absent → refus. `check_prisme_manifest.mjs` reste non consommé (advisory ; la gate vit dans run_real).

### Prochaine étape
1. **Lot C — calibration Kitten Clicker** : chaque nombre avec source · raison · unité · cible · preuve (durée niveau 1,
   coûts, revenus, déblocages, espace, prestige, niveau 2) — rédigé par Fable sous la forme du bloc `game_master` attendu, ratifié Pierre.
2. Lot D fuites (J `replay_ref`, tri
   alphabétique → ordre du Prisme, `design_intent`) · Lot E run 10 (`kitten_clicker-20260823c`) → P5 HumanGate.
3. Gates : merge/reject des artefacts non commités (runs 7-9, audits) ; push de `f1bce0d` `0a9f4d4` `b75f165` + Lot A.
4. Passifs : gates historiques (e2e `DirAccess`, solvabilité argv, mutation), `check_wiremap_contract` non consommé, rupture 10.

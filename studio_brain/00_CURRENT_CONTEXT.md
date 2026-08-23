# Contexte courant TCS
*(Handoff. Archives journal : `context-archive-2026-08-22-kitten-clicker-v3-v4.md` (runs 6-7, playtest, audit gameplay,
lots V3/V4), `…-runs4-6.md`, `…-runs1-3.md`, `…-2026-08-21-publication-reparation.md`.)*

## Branche : `master` (= origin/master + **12** commits locaux non poussés ; dernier push `50ea9b8`, 08-21). `publish` = snapshot séparé, intouché.
*(Compte revérifié en revue hebdo 2026-08-23 : le handoff annonçait 7, les Lots A/B l'avaient périmé. 131 entrées sales.)*
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

### HumanGate run 9 (2026-08-23, archivé `…-decision-produit.md`) — résumé
FAIL « jeu complet » = baseline produit : chatons décoratifs · prestige = bouton · espace pauvre · guidage illisible. Prochain chantier =
PRODUIT, pas infrastructure ; direction produit V1 ratifiée (`gamedesign/kitten_clicker_direction_produit_v1.md`) ; lot produit P0–P4 `b75f165`.

### Audits 2026-08-23 (archivés `…-decision-produit.md`) — résumé
`docs/audit/2026-08-23-kitten-clicker-design-chain-audit.md` : on a construit avant de spécifier (aucune station n'écrit les nombres ni la
causalité ; `design_intent` lu par personne ; G/J verts pour la mauvaise raison). `…-worldscan-artbible-gm-pipe.md` : Art Bible produite
APRÈS le GM → Lot A. Run 10 `…b` avorté (build verrouillé par Godot) ; build run 9 au scratchpad ; `games/kitten_clicker/` absent.

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
0. **Décision Pierre 2026-08-23 (après C.1/V2.1) : STOP Lots D/E tels que prévus.** « Assez de documentation économique, pas assez de
   conception de jeu. » Vision ratifiée : construire un petit univers de chatons bienveillant où chaque achat transforme VISIBLEMENT la
   scène ; règle maîtresse **UNLOCK = possibilité perceptible, jamais +X %** ; la carte = système de progression (états, saisons) ; départ
   = panier + coussin + jardin fermé + album de silhouettes (plus de 6 chatons décoratifs). Architecture cible : boucle de conception
   ART ↔ GM AVANT le WireMap (design freeze) + réconciliation APRÈS — à planifier, pas de station nouvelle.
0b. **Doctrine Pierre 2026-08-23 (mémoire `mutual_completion_loop_doctrine`)** : le jeu ÉMERGE de l'échange Art ↔ GM ; « un agent
   n'est pas obligé de savoir, il est obligé de savoir ce qu'il ne sait pas et de le demander au bon agent » ; pas de design freeze
   avec une question ouverte ; WireMap à la convergence. Mesuré : aucun alias d'étape, steps = dict par id, seul échange = inter-run.
   **Lot F PROPOSED** `docs/superpowers/plans/2026-08-23-forge-lot-f-boucle-completion-mutuelle.md` : alias d'étape (s2.5/s2.7 en
   2 rondes), `design_questions.json` partagé (« il me manque X », réponses, blocking, ready_for_freeze), `design_state.json`, gate
   `design_freeze` avant s1 (HALTED « design non convergé » = un résultat). **GO Pierre 2026-08-23 : Lot F · 2 rondes · ordre F → D →
   run 10 · C.2 V1.1b RATIFIÉE.** Lot F T1–T4 livrés et CONFRONTÉS : alias `-r<N>` (`contract.base_step`, source unique), profil
   `full_godot_content` = 19 étapes (s2.5 → s2.7 → s2.5-r2 → s2.7-r2 → s1), `design_questions.json` (fence ```design_questions, validateur
   : about/answer résolus, ready refusé si question reçue sans réponse, PARTIAL toléré en R1 si ≥ 1 question bloquante), `design_state.json`
   + gate `design_freeze` avant s1 (HALTED « design non convergé »), tâches R1/R2 avec la graine C.2. Suite finale en cours, puis commit.
1. **Lot C.2 — Gameplay Loop & Content Contract V1 : PROPOSED** `studio_brain/gamedesign/kitten_clicker_gameplay_loop_content_contract_v1.md`
   (9 sections : core/player/progression/meta/content/economy loops, arbre de possibilités, échange Art↔GM, WireMap gate à 5 questions ;
   tableau de contenu par progression). Test de reconstruction « scène » : passe 1 : 0 compteur, 7 inventions / 3 contradictions → V1.1 ; passe 2 : 0 contradiction, 0 compteur → V1.1b (§11, 15 réponses). À ratifier AVANT tout WireMap ; C.1 et V2.1 seront
   réalignés dessus (objets/interactions remplacent les améliorations abstraites). C.1 RATIFIÉ reste la colonne vertébrale ; V2.1 non ratifiée.
2. (après C.2 ratifié) réalignement C.1/V2.1 → Lot D fuites (J `replay_ref`, tri
   alphabétique → ordre du Prisme, `design_intent`) · Lot E run 10 (`kitten_clicker-20260823c`) → P5 HumanGate.
3. Gates : merge/reject des artefacts non commités (runs 7-9, audits) ; push de `f1bce0d` `0a9f4d4` `b75f165` + Lot A.
4. Passifs : gates historiques (e2e `DirAccess`, solvabilité argv, mutation), `check_wiremap_contract` non consommé, rupture 10.

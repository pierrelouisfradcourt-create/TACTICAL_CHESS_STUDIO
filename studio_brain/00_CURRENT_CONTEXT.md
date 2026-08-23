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

### Décision Pierre 2026-08-23 (après run 8b) — ratifiée
**A → J est nécessaire, pas suffisant.** Gameplay Contract = mécanisme de vérification VALIDÉ (runtime, entrées, affordances,
feedback, reward, unlock, repeat, progression observable, meta-loop : TESTED) ; qualité du gameplay = **HumanGate FAIL** (« encore
le même objectif avec un numéro différent » ; machine à compter). Pas de verdict global. **Code : ne pas toucher. Rien aujourd'hui.**
Prochain travail SEULEMENT après avoir défini ce qu'est une **décision significative** dans le jeu cible : le contrat devra
distinguer LOOP_EXISTS de LOOP_HAS_MEANINGFUL_DECISION (REWARD → DECISION → NEXT_STATE avec transformation réelle : deux choix
→ deux états différents → objectif adapté) et mesurer des **changements de possibilité** (affordances disponibles par objectif),
pas un texte (`new_distinct` = syntaxiquement correct, sémantiquement insuffisant). Jamais un LLM pour ça. Confrontation aux
données 8b : les 4 affordances existent dès le Palier 0 (capture) ; `appears` n'a compté que le lieu `jardin` → sous ce critère,
GOAL_1/2/3 ont le même espace d'action = FAIL, cohérent avec le ressenti. Interdits maintenus : oracle LLM, station, profil,
narration, architecture, « plusieurs heures », vocabulaire STANDARD/Prisme, reuse, red-team.

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
**Lot A FAIT** (plan `docs/superpowers/plans/2026-08-23-forge-lot-a-tuyau-worldscan-artbible-gm.md`) : `full_godot_content` = s2 →
s2.6 → **s2.5 Art Bible → s2.7 GM** → s1 ; s2.5 ← charter + World Scan + Story Bible (plus `product_snapshot`) ; s2.7 ← World Scan +
Story Bible + `art_bible.md` + `asset_requests.json` ; preuve de CHARGEMENT = manifeste de dispatch (`sources[] role=upstream sha256`),
preuve de CONSOMMATION = `gm_worldscan.json.sources_consumed` {worldscan, story_bible, art_bible} résolu à la matérialisation
(`_validate_gm_worldscan(run_dir)`) ; Art Bible : 8 sections nommées (`## heritage_worldscan` … `## asset_rules`) — **texte de
contrat seulement, aucun validateur Python** (trou à connaître avant B). Preuve par fixtures (run 9) ; 1ʳᵉ traversée réelle = run 10.

### Prochaine étape
1. **Lot B — GM = Game Master** (étendre s2.7, pas de station) : WORLD INTERPRETATION → GAMEPLAY LOOP → PLAYER LOOP →
   PROGRESSION LOOP → META LOOP → METRICS (avant le Builder) → PROOF MODEL → GREY BLOCKS (Builder + Artiste). Plan à écrire, GO Pierre.
2. Lot C calibration Kitten Clicker (chaque nombre : source · raison · unité · cible · preuve) · Lot D fuites (J `replay_ref`, tri
   alphabétique → ordre du Prisme, `design_intent`) · Lot E run 10 (`kitten_clicker-20260823c`) → P5 HumanGate.
3. Gates : merge/reject des artefacts non commités (runs 7-9, audits) ; push de `f1bce0d` `0a9f4d4` `b75f165` + Lot A.
4. Passifs : gates historiques (e2e `DirAccess`, solvabilité argv, mutation), `check_wiremap_contract` non consommé, rupture 10.

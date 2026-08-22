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

**Run 7 `kitten_clicker-20260821g` (V4, DONE 17/17, 2 h 28, ≈ 57 $, verdict BLOCKED, intégrité REJET = pas de `proof:`)**
- Amont : Prisme 23 exigences, **6 PLAYER, 7 rôles de boucle**, affordances `pelote` / `acheter_chaton` /
  `acheter_amelioration` / `prestige`, `loop.json` dérivé **OK** (8 steps) ; Grey Blocks 27 feuilles, **8 actions joueur
  8/8 prouvées depuis main.tscn** ; WireMap 48 lignes 27/27, 4 lignes `input.*` ; sonde amont 4 faits à BUILD.
- Build (70 min, 34 $, 93 fichiers) : `03_WORLD/loop.json` copie sha-égale, `09_WIREMAP` déposé, Controls en groupe
  `affordance`, Labels en groupe `hud`, panneau de 3 quêtes, 3 boutons avec coût — **mais pas de `proof:`** → le driver a
  sauté tout le bloc produit/runtime (trou V3.1, 3ᵉ occurrence) ; BLOCKED ne déclenche pas le pool.
- **Mesures directes (sondes du dépôt, orchestrateur)** : `runtime_alive` OK (33 nœuds) · `check_loop_bypass` **0
  violation** · **`player_loop` par les seules entrées du joueur** : objectif affiché → pelote (ronrons 0→5) →
  amélioration (Prod/s 0→0,5) → production passive sans clic (15,5→30,5) → [override de mesure] REWARD (31→91) →
  **UNLOCK adoption d'un chaton (Prod/s 0,5→0,7)** → NEXT_GOAL FAIL : `objectif` déjà « Refuge accompli : ronronne à
  l'infini ! » (chaîne d'objectifs à UN maillon) → META_LOOP (prestige, palier 3) non atteint.
- Arrêts AMONT, pas dans le code : step REWARD sans `observe` (exigence EX04 ; `checkLoopSpec` ne l'exige pas pour
  GAME_RESPONSE/REWARD) ; chaîne d'objectifs non exigée. s11 Opus 7 MEDIUM (paliers plafonnés = seuil prestige 30 ;
  registres objets/lieux chargés jamais consommés ; chatons sans id ; quêtes = affichage sans règle ; sprites non
  exercés par un oracle). 8 leçons promues. Capture : objectif, HUD, 3 quêtes, pelote, 3 boutons.

**Réponse mesurée à « peut-on jouer ce que la Forge forge ? »** : oui, jusqu'à l'adoption du premier chaton, par
l'écran seul ; la boucle s'arrête là où la SPEC s'arrête (objectif unique, REWARD non observé), pas là où le code casse.

### Orientation Pierre 2026-08-22 (après run 7) — UN chantier : GAMEPLAY CONTRACT, plus de V5/V6
« La Forge sait transformer une intention en runtime vivant, mais ne sait pas encore garantir que le runtime
constitue une expérience jouable complète. » Fermer la chaîne INTENTION → OBJECTIF → ACTION → AFFORDANCE → RÉPONSE →
RÉCOMPENSE → PROGRESSION → NOUVEL OBJECTIF → META-LOOP ↺. Le Gameplay Contract = **entrée obligatoire du Builder**
(Prisme → Gameplay Contract → Grey Blocks → WireMap → Runtime → Player Loop) ; la WireMap lie `affordance → input →
système → state change → feedback → reward → unlock → next goal`. Test V4 = 10 questions depuis main.tscn, bot sans
API interne (voir écran → affordance → cliquer → observer → décider). **Jeu complet = 4 preuves** : software (scène
vit) · player loop (boucle complète par les seules entrées du jeu) · progression (transformation réelle : contenu /
capacité / choix) · HumanGate (Pierre : « je sais quoi faire, je comprends, j'ai une raison de continuer »). Pas de
« plusieurs heures » avant une vraie boucle puis une boucle de progression. Confrontation à l'existant : `loop.json` =
embryon du contrat (porté jusqu'à s9 au run 7) ; bot couvre 7/10 questions ; manquent : 9 (recommencer), 10 (avantage
après META_LOOP), preuve Progression (`appears:<group>`), `observe` obligatoire partout, chaîne d'objectifs ≥ 2, gates
(`loop_dead` + sonde inconditionnelle), WireMap liée par maillon.
**Validation Pierre + verrous** : `loop.json` RESTE le contrat exécutable dérivé du Prisme (pas un système) ; 10
maillons A–J avec **H REPEAT** explicite et J ADVANTAGE ; `GOAL_2 ≠ GOAL_1 ≠ GOAL_3` (prédicat `new_distinct`) ; pas
de « plusieurs heures » ; aucun chantier parallèle. **Plan écrit** :
`docs/superpowers/plans/2026-08-22-kitten-clicker-gameplay-contract.md` (T1 loop_spec 10 rôles + observe partout +
chaîne distincte + H/J · T2 WireMap liée par résolution provides/requires/couvre · T3 sonde : new_distinct, appears,
increases_more_than, REPEAT · T4 gates non contournables, bloc produit inconditionnel dès run/main_scene · T5 contrat
s9 + run 8). Baselines à mesurer : loop.json run 7 → FAIL (REWARD sans observe, G=1, H/J absents). **GO Pierre 2026-08-22** :
T1 → T2 → T3 → T4 → T5, confrontation entre chaque, un commit, run 8. **Faits et confrontés** : T1 (`loop_spec` 10 rôles,
baseline run 7 → FAIL E/F/G/H/J) · T2 (`check_decompo` F/G/H/I/J, `check_wiremap_contract` `maillon_non_lie` : run 7 =
**0/4 affordances liées**, `requires: []` partout ; 904/904 Node) · T3 (sonde : `new_distinct`, `appears`, `decreases`/`resets`,
`increases_more_than`, REPEAT ; **mesuré sur le build run 7 : contrat A–J atteint ADVANTAGE** (prestige rejoué 31,4 > 15,0) sauf F
`appears` (le chaton adopté n'entre dans aucun groupe) et G distinct une seule fois) · T4 (bloc produit inconditionnel dès
`run/main_scene`, `loop_dead` = gate aux 3 points, loop.json absent = FAIL ; 192 tests driver) · T5 (contrat s9 (k) dépôt
`proof:`+`09_WIREMAP`, 10 maillons ; tâche s9). Suite Forge 2062/2062 (1 skip). Run 7 archivé `_run7_20260821g/` + `game_build7/` ;
5 fixtures réancrées sur les archives. **Run 8 `kitten_clicker-20260821h` lancé depuis la session.**

### Prochaine étape
1. **Pierre** : playtest du build run 7 (`games/kitten_clicker/`) = HumanGate V4 : « je comprends quoi faire sans
   explication ? » ; merge/reject des artefacts ; arbitrer `test_evidence_isolation_fixture.py` ; push = gate.
2. **V4.1 (étroit)** : `checkLoopSpec` exige `observe` pour GAME_RESPONSE/REWARD · NEXT_GOAL = chaîne ≥ 3 maillons
   exigée au Prisme (`observe: changes` par maillon) · `player_loop` gaté (plus advisory).
3. **V3.1 (séparé)** : sonde produit/runtime INCONDITIONNELLE dès `run/main_scene` ; `proof:` + `09_WIREMAP` exigés
   du builder (3 runs sur 3 ont sauté le bloc produit faute de `proof:`).
4. Passifs documentés, hors lots : ruptures 4, 5, 6 ; skill `/forge` périmé (ne cite pas `run_real.py`) ;
   `FORGE_SYSTEM_CONTRACT.yaml` PROPOSED ; branches locales mortes ; red-team Qwen 0 finding sur 5 runs.

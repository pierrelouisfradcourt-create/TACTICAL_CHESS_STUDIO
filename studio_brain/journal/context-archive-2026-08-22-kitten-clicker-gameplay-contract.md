# Archive contexte — Kitten Clicker run 7 → chantier Gameplay Contract → run 8 (2026-08-22)
*(Source : `00_CURRENT_CONTEXT.md`, archivé par Fable en fin de session 2026-08-22.)*

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
5 fixtures réancrées sur les archives. **Run 8a `kitten_clicker-20260821h` HALTED à s2 en 15 min** (haiku a écrit `advisory_only` au lieu de `advisory` ;
validateur correct, contrat explicite ; **rupture 10 : BLOCKED de matérialisation = terminal sans retry**, famille 4 — archivé
`_run8a_20260821h_halted_s2/`, non corrigé dans ce lot). **Run 8b `kitten_clicker-20260821h2` relancé depuis la session.**


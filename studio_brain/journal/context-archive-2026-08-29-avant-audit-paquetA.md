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

### Gameplay Contract `f1bce0d` + run 8b — archivé (journal `…-gameplay-contract.md`) : A→J 12/12 mesuré par le driver ; rupture 10 née au run 8a.

### Décision significative `0a9f4d4` + run 9 — archivé (`…-decision-produit.md`) : DECISION 6/6 mesurée, non-dominance inversée, HumanGate FAIL.

### HumanGate run 9 — archivé : FAIL « jeu complet » (4 causes) → direction produit V1 ratifiée, lot produit `b75f165`.

### Audits 2026-08-23 — archivés (`…-decision-produit.md`) : construit avant de spécifier ; Art Bible après le GM → Lots A/B.

### Lots A→G.2 (détail archivé `…-decision-produit.md`) — l'essentiel
A `497c54b` tuyau Art Bible→GM · B `00b872a` GM=Game Master Opus (game_master, economy.json, art_response, gates) · C.1/C.2 design
ratifiés (progression + gameplay loop & content, tests de reconstruction 0/0) · V2.1 calibration PROPOSED (retirée du run) · F `c3f82de`
boucle Art↔GM 2 rondes + design_freeze · D `3565de5` fuites (replay_ref, ordre Prisme, design injecté) · G `138aaa4` rejeu matérialisation
· G.2 `464515b` canal design_questions (squelette, retour au modèle) · timeout s9 `85537cd` · coercition+budget 3 `00e4637`.
**Runs 10a-10f** : 10d = LA PREUVE (boucle convergée round 2, shared 100 %, nommage escaladé ; Prisme 22/22 sourcé GM ; grey blocks 20/20 ;
economy.json lu) mort au timeout s9 ; les autres = ruptures 10/11 (forme haiku, canal) et limite d'usage — toutes corrigées ou tracées.
Runs 10g/10h : 10g = 2ᵉ convergence (2/2, bidirectionnelle, sans rejeu) puis builder tué par la limite d'usage ; 10h =
`kitten_clicker-20260824d` : Art R1 OK (3 questions, 2 bloquantes) puis **HALTED à GM R1 après 3 tentatives** — vraie mesure de
canal cette fois (append-only violé ×2 MALGRÉ le retour listant les ids, fence vide ×1) : le canal a convergé aux runs 10d/10g et
oscille ici. **Décision Pierre : run 10h EN OBSERVATION (artefacts intacts, pas de relance) + AUDIT DE CONCEPTION lancé** (10 boucles
de gameplay, matrice, 6 versions, FREEZE_ALLOWED) — **LIVRÉ et confronté** : `docs/audit/2026-08-24-kitten-clicker-loop-completeness-audit.md`.
**GAME_CONCEPT = PARTIAL** : 5 boucles/6 sans métrique exclusive ; quest/world/skill sans slot ; consommation du design non prouvée
(`design:` jamais résolu) ; V1→V6 : la PREUVE a progressé (rôles 0→13) bien plus vite que la BOUCLE (actions jouables 1→4, figé dès V4) ;
une seule ressource, prestige = multiplicateur, aucun lieu jouable, aucune quête récompensée sur les 6 versions ; `product_snapshot`
V2→V6 = « comment passer les oracles » ; faux déblocage V6 (affordances inertes) = recoupé red-team run 9. FREEZE_ALLOWED=false (10h).
**C.3 V1.2 RATIFIÉ** (10 boucles × 14 champs, matrice produit/consomme/débloque ; réserve Pierre : le 6/10
architectural est un diagnostic, jamais un seuil). Genèse archivée au journal.

**C.4 V1.1 RATIFIÉ Pierre 2026-08-24** (verrou : le lot ne « fait pas passer » Kitten — il rend la Forge INCAPABLE de déclarer
un jeu complet sans boucles fermées). **Lot C.4-code EN COURS** (plan `docs/superpowers/plans/2026-08-24-forge-lot-c4-code-boucles.md`) :
agents A (schéma) + B (design_state par boucle, DEFERRED humain, R3-lite, gate, heritage/ au freeze). Critère : gm 10h REFUSÉ ; un design honnêtement partiel doit PASSER — **ATTEINT, commit `5feb1b5`**. Run 10h archivé scratchpad `run10h_observed/`.
**Runs 11 (2026-08-24)** : 11a halté par un FAUX refus (regex de fence non ancrée) ; 11b = **premier HALT honnête**
de la gate C.4 — 7 DEFERRED honorées, core_loop COMPLETE, `gameplay_loop OPEN(réponse sans modification)` FONDÉ.
2 correctifs TDD sur fixtures réelles (run_real regex · driver R2a par nom de boucle), 2270 pytest verts, **NON
COMMITÉS**. Détail archivé au journal.

**C.5 RATIFIÉE Pierre 2026-08-25 + INJECTÉE** (condition n°1 tenue, preuve d'exécution : les 4 étapes des deux
piliers reçoivent la carte ENTIÈRE). 3 défauts trouvés au câblage : s9 touché par ricochet (retiré) · **carte tronquée**
à 15k car. sur 60k (exemption posée : un contrat `design/*.md` s'injecte entier) · 6 tests figés à mettre à jour.
Garde anti-dérive canon↔copie posée. **C.5 devient V2.0 GAMEPLAY MAP** (la carte est un OBJET qu'on se passe ; les 14
éléments ; **R5** = 7 éléments d'une boucle sinon PARTIELLE ; les 14 questions ; la carte de Kitten commence par la
BOUCLE CANONIQUE, pas par l'échelle de coûts ; direction « chatons travailleurs » inscrite comme test).

**C.6 V1.1 ÉCRIT — PROPOSED** `studio_brain/gamedesign/kitten_clicker_game_loop_blueprint_c6.md` (demande Pierre :
« reconstruis le jeu réel, boucles imbriquées, AUCUN nombre »). Le jeu en une phrase · **déplacement décisif** : le
gameplay n'est pas d'acheter des chatons, c'est de leur DONNER QUELQUE CHOSE À FAIRE · 7 boucles imbriquées avec les
9 questions remplies · l'économie = connecteur, pas boucle · test des chatons travailleurs = **6 maillons, 0 présent**
· **§7bis PREMIER MONDE proposé** : atelier de paniers (le chaton fabrique ce qui amène le chaton suivant), 2 métiers
(artisan/jardinier), une quête rapporte du CONTENU qui s'installe, prestige = « on perd les chatons, on garde les
plans ». Test vierge : 12 corrections dont **mon propre interdit enfreint** (+25 % écrit). **5 décisions = HumanGate.** Ancien plan : UN lot de code (schéma GM 10 boucles + MÉTRIQUE_PROPRE + R1/R2
Archives scratchpad `run10*_halted/`

### Prochaine étape
1. Design ratifiés : C.1 V1.2 (+§9 réaligné C.2) · C.2 V1.1b (graine) · C.3 V1.2 · C.4 V1.1 ; Calibration V2.1 PROPOSED (H5).

2. **Décision Pierre en attente** : périmètre/ordre du niveau CONTENT REQUIREMENTS (audit 2026-08-25) ; relance run 11c ou arbitrage R3-lite.
3. Gates : merge/reject des artefacts non commités (runs 7-9, audits) ; push de `f1bce0d` `0a9f4d4` `b75f165` + Lot A.
4. Passifs : gates historiques (e2e `DirAccess`, solvabilité argv, mutation), `check_wiremap_contract` non consommé, rupture 10.

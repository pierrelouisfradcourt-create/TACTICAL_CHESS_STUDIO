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

### Chantier GAMEPLAY CONTRACT (GO Pierre, commit `f1bce0d`, 2026-08-22) — 10 maillons A→J
T1 `loop_spec` 10 rôles + `observe` partout + G ≥ 2 `new_distinct` + H `replay` + J `increases_more_than` · T2 `check_decompo`
F/G/H/I/J + `check_wiremap_contract` `maillon_non_lie` · T3 sonde `player_loop.gd` (new_distinct, appears, decreases/resets,
increases_more_than, REPEAT, deltas) · T4 driver : bloc runtime **inconditionnel dès `run/main_scene`**, `loop_dead` = gate,
loop.json absent = FAIL · T5 contrat s9 (k) dépôt `proof:`+`09_WIREMAP`. Suite Forge 2062 verts, Node 904. Runs 5/6/7 archivés
(`_runN_*/` + `game_buildN/`), fixtures réancrées dessus. Run 8a `…h` HALTED s2 en 15 min (haiku `advisory_only` ≠ `advisory` ;
**rupture 10 : BLOCKED de matérialisation = terminal sans retry**, famille 4, non corrigé) → `_run8a_20260821h_halted_s2/`.

**Run 8b `kitten_clicker-20260821h2` (DONE 17/17, 2 h 07, 24 $, verdict signé AUTHENTIQUE : FAIL / BLOCKED)** — archivé
`_run8_20260821h2/` (+ `game_build8/`, capture, state tentative 1) ; build courant `games/kitten_clicker/` = run 8b.
- Amont : Prisme 22 exigences, **`checkLoopSpec` OK au 1ᵉʳ essai sans override** (10 rôles, 12 steps) ; Grey Blocks maillons
  F=2 G=2 H=1 I=2 J=1, 8/8 actions prouvées depuis main.tscn ; WireMap 42 lignes, `requires` remplis (run 7 : vides).
- **Les 3 preuves logicielles sont mesurées PAR LE DRIVER** (bloc inconditionnel, `proof:` déposé) aux 2 tentatives de build :
  `runtime_alive` OK (38 nœuds) · **`player_loop` `reached_role: ADVANTAGE`, 12/12 steps, 0 fail, sans override** (pelote 0→61,
  achat chaton, production passive 657, lieux 1→2→3 = `appears`, objectifs Palier 0 → 44 → 55, REPEAT rejoué ×4, prestige reset
  −7672, avantage 100 > 61) · `loop_bypass` 0 violation · `loop_dead` false. 4ᵉ preuve = HumanGate Pierre (à jouer).
- Rouges (tous HORS boucle, historiques) : e2e heuristique `DirAccess.open` (harnais à preloads, 51 asserts, baseline OK → faux
  positif probable) · solvabilité `runner_argv=[]` : la branche descripteur exige un wrapper que le driver ne passe jamais en
  régime descripteur (validateur sans producteur) · mutation 8/13 (2 fichiers sans mutant, `production.gd` 0/1) · s10c
  `preuves_absentes` audio ×2 · s10s FAIL. s11 Opus : 0 finding. Le pool a relancé s9 (tentative 2, 9 min, 4 $) pour ces rouges.
- Limites mesurées : G satisfait **textuellement** seulement (« Palier 44 — Le prestige est à portée » / « Palier 55 — … » :
  même objectif, numéro différent) ; `check_wiremap_contract` compte **0/4** affordances liées alors que la chaîne d'ids est
  bien fermée 4/4 — `EFFECT_KINDS=[file_write,visual]` refuse les feuilles d'effet typées `bot_action` par s3 (oracle trop
  étroit sur sa 1ʳᵉ donnée réelle) ET ce contrôle n'est appelé par aucun exécuteur (auto-attestation de l'agent s5).

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

### Prochaine étape
1. **Pierre ratifie/corrige P0** (4 questions listées dans le plan : silhouettes · seuil de prestige · cœurs +25 % · niveau 2).
   Rien n'est engagé avant ; ensuite P1–P4 = intention + tâches + contrat (Fable, en direct), un commit, run 10, P5.
2. Gates : merge/reject des artefacts non commités (runs 7-9, build 9, handoff) ; push de `f1bce0d` + `0a9f4d4`.
3. Passifs documentés (ne pas ouvrir sans décision) : gates historiques (e2e `DirAccess`, solvabilité argv, mutation),
   `check_wiremap_contract` non consommé + `EFFECT_KINDS`, rupture 10 (BLOCKED sans retry), ruptures 4/5/6, skill `/forge` périmé.

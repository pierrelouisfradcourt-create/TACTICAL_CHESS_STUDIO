# Contexte courant TCS
*(Handoff. Archives : `journal/context-archive-2026-08-{21,20,17,15}-*.md`.)*

## Branche : `master` (retour le 2026-08-21, sentinelle humain Pierre)
Retour depuis `publish` : 68 fichiers non suivis que `master` suit écartés (58 artefacts identiques
modulo CRLF, 10 rapports Observer régénérés par les tests), sauvegardés hors dépôt, restaurés par le
checkout. Hors lot, non commité : `scripts/forge/tests/test_evidence_isolation_fixture.py` (12 lignes,
correctif `import conftest` qui ne vivait que sur `publish`) — à arbitrer par Pierre. `publish` intouché.

## Session 2026-08-21 — Kitten Clicker, test d'autonomie de la Forge (réf. Cookie Clicker + Neko Atsume)
Choix (b) Pierre : recâblage par **composition de profil**, aucune station GM neuve. Plan :
`docs/superpowers/plans/2026-08-21-kitten-clicker-full-godot-narratif.md`. Trois commits sur `master` :
- `ad6eff4` lot 1 : profil **`full_godot_narratif`** (16 étapes = full_godot + s2.6 + s2.7 avant s1) ;
  `_UPSTREAM_BY_STEP` : s1 ET s3 reçoivent story_bible + gm_worldscan ; `reference` des exigences
  EXPECTED **adressable** (`worldscan:` / `story_bible:` / `gm_worldscan:`) ; sonde
  **`check_amont_traversal.mjs`** (ADVISORY, 6 faits, `reached` NOT_PRODUCED…BUILD) attachée au
  reçu s10c via `oracle.run_amont_traversal_probe` ; `oracles.json` kitten_clicker ; design_intent/tasks.
- `bfe04fa` lot 2 : `_FENCED_YAML` ancrée en début de ligne (charter avalé par une mention en
  prose) ; sortie brute persistée en échec (`artifacts/<etape>.failed.txt`) + coûts dans le dict d'échec.
- `4f8c245` lot 3 : `select_artifact_payload` = dernier bloc JSON qui PASSE le validateur (un
  RETURN_REASON fencé volait la place du worldscan) ; message « clé absente » ≠ « liste vide ».
Preuves par lot : node 828/828 · pytest ciblé 151 · test_driver.py 19/19 · suite forge 1961/1 skip ·
lot 2 : 10/10 + 202 · lot 3 : 6/6 + 290 · `git diff --check` propre · dry-run 16 étapes.

### Statut par pièce (IMPLEMENTED · TESTED · DOCUMENTED_ONLY · PASSIVE · BLOCKED · UNKNOWN)
profil + injection s2.6/s2.7 → s1,s3 : TESTED en réel (run 3) · `reference` adressable : TESTED (9/9
résolues) · sonde amont : TESTED, reçu s10c produit par le driver (4 faits GREY_BLOCKS) · charter
YAML : TESTED run 2, run 3 illisible → s0 OK quand même (advisory) = PASSIVE · `amont_traversal` :
PASSIVE (lecteur = session/Pierre) · reprise d'un run HALTED : BLOCKED par design (`BLOCKED` terminal).

### Runs (tous sans `--charter` : le panel Prisme n'injecte pas l'amont — défaut préexistant, passif)
- **Runs 1-2** HALTED s2 (ruptures 1-3, corrigées lots 2-3), archivés `_run1_20260821-1312/`, `_run2_20260821b/`.
- **Run 3** `c` (décision Pierre : laisser courir, mesurer) — s0..s6 OK en 45 min.
  - **Rupture 4** : charter YAML illisible (`hors_scope: … gelees: src/, …` — deux-points non échappé
    dans un scalaire plain) ; `_materialize_yaml` advisory → s0 OK sans artefact ; skill prescrit
    « check_charter faux → re-spawn s0 » : **jamais implémenté dans le driver**. Story Bible sans
    charter : 2/8 GROUNDED, 0 élément refuge/chatons (exactement la mesure du 14/08).
  - **Rupture 5 (Grey Blocks → WireMap), chaque maillon prouvé** : s5 rend 10 `couvre` VIDES →
    `check_wiremap_contract` 10 problèmes de forme → réparation Qwen remplit avec des **noms de
    fonctions inventés** (`apply_purr`, `requirement_id_1`…) → `repair_step.mjs:237` ne recopie
    que `problems[]`, jette `capacites_non_couvertes`/`couverture_fantome` → **fausse preuve**
    « 0 problème après » (oracle rejoué sur le même hash : FAIL 0/10 couvertes, 11 fantômes) →
    `ESCALADE` écrit dans `repair_results.jsonl` **sans consommateur**, `res["repair"]` jeté par le
    littéral `entry["detail"]` du driver → WireMap gelée et construite telle quelle.
  - **Build 1** (30 min, 10,58 $) : 20 fichiers GDScript, Godot **73 tests verts, solvabilité 20/20,
    ALL CHECKS PASSED** ; s10b OK ; s10c FAIL (4 fonctions renommées wiremap↔code) + `amont_traversal`
    **produit par le driver** (4 faits GREY_BLOCKS, 9/9 refs résolues, `lines: []`) ; e2e FAIL
    (run_tests.gd coquille) ; mutation BLOCKED (ni `--logic-files` ni `09_WIREMAP`) ; s10s BLOCKED.
  - **Rupture 6 (composition)** : `full_godot*` = topologie LEGACY (hors `_STANDARD_TOPOLOGY_PROFILES`)
    mais embarque `s10s-oracle-standard`, qui exige `00_CHARTER/game_contract.yaml` + `09_WIREMAP/
    wiremap.json` — **qu'aucune étape d'aucun profil ne produit** (breakout_v2 : écrit à la main par
    l'orchestrateur). En legacy, e2e/reuse_ratio ne sont pas SKIPPED → rouges structurels sur Godot
    (mesurés 17/08). Aval de s9 bloqué quel que soit le build → pool retry (10 $) sans information
    nouvelle. Décision Pierre : laisser aller jusqu'à s12 pour exercer s11 + verdict signé.
  - Mesures amont : worldscan 3 jeux, victory/defeat **null = vérité du genre** (`has_win_state=false`),
    références visuelles ABSENT, monotonie PARTIEL, clé `loops` irrégulière ; GM 7/8 dimensions
    MEASURED, `bonus` **dupliqué** (passé l'oracle), compétences reconnaissables sauf click (nommé)
    et quêtes (absent) ; Prisme 10 exigences ; Grey Blocks 5 systèmes / 8 features / 10 feuilles ;
    red-team plan Qwen : **0 finding**, narration d'intention sans exécution.

  - **Run 3 DONE** (2 h 16, 12 appels, 475 895 tokens, ≈ 37,7 $ dont build 2 = 24,4 $ / 59 min).
    `forge.verify_run` : **INTÉGRITÉ AUTHENTIQUE (exit 0)**, `VERDICT LOGICIEL : FAIL / BLOCKED`.
    Build 2 a écrit `00_CHARTER/game_contract.yaml` de lui-même → **s10s OK** (pronostic « retry
    inutile » FAUX) ; e2e PASS ; s10a FAIL (reuse_ratio legacy structurel + wrapper solvabilité non
    câblé `runner_argv=[]`) ; s10c FAIL (4 fonctions gelées absentes du code). s11 (Opus) : 6 findings
    dont HIGH « aucun oracle ne mesure "plusieurs heures", solvability casse au 1er prestige »,
    MEDIUM « prestige n'affecte pas la production passive », « proof text non dérivé ». HumanGate flags :
    wiremap rouge · **4 survivants mutation triés par le producteur (équivalence NON vérifiée)** ·
    red-team dégradé. **11 leçons promues**, Observer déclenché (42 s, rc 0). Jeu : 23 fichiers,
    Godot 73 tests verts, solvabilité 20/20 — **jamais joué par un humain**.

### Orientation Pierre 2026-08-21 (énoncée en séance — à ratifier via /gate)
**Kitten Clicker est TERMINÉ comme expérience.** Résultat : la Forge sait produire un prototype
mécanique à partir d'un cahier des charges prouvable ; elle ne sait pas préserver l'intention ludique
jusqu'au runtime. Cause architecturale, pas un défaut du Builder : **le Prisme est un plafond** (10
exigences mécaniques → s3 ne peut légalement rien ajouter → WireMap → build), et « vérifiable » est
encore confondu avec « vérifiable par un bot ». **Ne pas lancer de nouveau jeu.** Prochain chantier :
réparer la perte d'intention World/Story → Prisme → Grey Blocks → WireMap et élargir la preuve à 6
familles (GAMEPLAY · CONTENT · VISUAL · AUDIO · UX · LONGUEUR). Ensuite seulement : **Kitten Clicker V2
comme test de régression**, critère = INTENTION → WORLD → CONTENT → GAME DESIGN → GREY BLOCKS →
WIREMAP → ASSETS+AUDIO+GAMEPLAY → GODOT → HUMAN PLAYTEST.
**Chantier en 6 étapes (Pierre, 2026-08-21)** : (1) inventorier l'existant non câblé (s2.5-artbible,
asset-generator, Asset Geometry Oracle, capture GPU, red-team LONGUEUR) · (2) identifier les catégories
d'exigences déjà prouvables par ces composants · (3) étendre `expected_proof.kind` UNIQUEMENT là où un
consommateur réel existe, sans affaiblir la non-invention de s3 · (4) jugement humain → `HumanGate`
explicite, jamais un faux oracle · (5) reconnecter au flux World/Story → Prisme → Grey Blocks → WireMap
→ Builder · (6) Kitten Clicker V2 = régression, succès mesuré en **intention traversée**, pas en
fichiers. Ne pas transformer chaque dimension en oracle (déterministe / HumanGate = la distinction
qui évite l'usine à gaz).
**Chemins pour forger (inventaire 2026-08-21, confronté)** : `run_real.py --profile` = **CANONIQUE**
(seul appelant de `ForgeDriver(` hors tests ; `driver.py` sans `__main__`) · boucle « manuelle » du
SKILL.md (spawn Task par étape) = **LEGACY non observé** (0 trace dans dispatch_audit ; SKILL.md ne cite
JAMAIS `run_real.py` — divergence doc↔code à corriger) · agent `run_orchestrator` = supervision, dernier
usage pong_r3 2026-07-27 (mort avec son agent) · `forge.dispatch --dry-run` = pré-vol, pas un lanceur.
17 profils déclarés, 15 joués, **`review` et `increment` jamais joués**. `FORGE_SYSTEM_CONTRACT.yaml`
(qui tranche « pas de ./forge, run_real = exécuteur ») est encore **PROPOSED**, non ratifié.
**Croquis Pierre (histoire · GM · effets/son/habillage → wiremap-blackboard → builder)** : blackboard
déjà [D] dans `FORGE_PIPELINE_TARGET_V1.md:84,109` (propriété de la WireMap) ; s8 HABILLAGE `NOT_FOUND`
partout ; Passe Juice s9.5 = idée M6 jamais construite ; **« loi de la physique du jeu » (GM → effets)
et lien « ambiance » histoire↔GM : nulle part écrits** — le croquis est leur première formulation.
Précisions mesurées : les pièces VISUAL/CONTENT existent mais sont HORS profil (`s2.5-artbible`,
`asset-generator`/Asset Geometry Oracle, capture GPU `product_oracle_godot` inactive sans `proof:`) ;
`expected_proof.kind` ∈ {bot_action, oracle, mutation, visual, file_write} = le vocabulaire qui borne
le Prisme ; les métriques LONGUEUR/monotonie tombent sous la règle de variance ; identité visuelle,
compréhension, cohérence = HumanGate par nature (ADR-002 : oracles déterministes non-LLM).

### 2026-08-22 — Décision Pierre : « il y a suffisamment d'éléments pour produire le jeu »
Voie courte choisie : **Kitten Clicker COMPLET par composition de l'existant**, chaque geste manuel
mesuré comme spec du câblage manquant. Plan : `docs/superpowers/plans/2026-08-21-kitten-clicker-complet-composition.md`.
Mesuré avant : 5 familles sur 6 ont déjà leur brique (s2.5-artbible réel mais hors profil/0 lecteur ;
volets GPU `07_TESTS/oracle/*.gd` ont TOURNÉ au build 2 ; audio procédural prouvé sur pacman/bomberman
sans fichier son ; STANDARD `core.render`/`core.audio` ; `asset.sprite → 04_ASSETS/sprites/{id}`) ;
**aucun générateur 2D** (asset-generator = 3D) → hypothèse SVG-texte importé par Godot ; les 5 familles
tiennent dans `expected_proof.kind` ACTUEL → pas d'extension nécessaire, ce sont les TÂCHES qui exigent.
**Lot 4** : profil `full_godot_content` = narratif + `s2.5-artbible` après s1 (17 étapes) ; injection
`art_bible.md`/`asset_requests.json` dans s3, s5 et **s9** (qui n'avait aucune injection). `tasks.json` v2
= l'intention entre par les critères (chatons nommés, lieux, objets, quêtes, sons, feedback, paliers).
Run 3 + build 2 archivés par déplacement dans `_run3_20260821c/` (+ `game_build2/`, 43 fichiers).
Run 4 = `kitten_clicker-20260821d`, cible : ≥ 20 exigences / 5 familles, ≥ 6 sprites rendus, volet audio
OK, bot au 3ᵉ palier, sonde à BUILD, puis playtest Pierre.

### Prochaine étape
1. **Pierre** : `/playtest` de `games/kitten_clicker/` (jouable mécaniquement, visuel non mesuré) ;
   décider merge/reject/freeze du jeu et des artefacts de run (tous NON commités : games/, lab/forge_runs/
   kitten_clicker/, lessons.jsonl, RUN_INDEX.md, lab/reports/observer/kitten_clicker/).
2. Lots candidats (critère de sortie « fausse preuve / capacité contractuelle »), AUCUN engagé :
   adaptateur de réparation (`repair_step.mjs:237` ne recopie que `problems[]`) + consommateur
   d'`ESCALADE` ; reçu `repair` dans `entry["detail"]` ; charter non matérialisable → re-spawn s0 ;
   composition `full_godot*` = validateurs (s10s, e2e, reuse) sans producteurs ni SKIPPED.
3. Hors lot, mesuré : `_FENCED_JSON` même forme que l'ancienne `_FENCED_YAML` ; `bonus` dupliqué non
   détecté par `check_gm_worldscan` ; `ref` de story_bible résolvent contre le TEXTE de s2, pas le JSON.

## Rappels de fond
`publish` = snapshot orphelin séparé, aucun SHA recopié ici · artefacts à chemin de poste exclus du
corpus public (`d9b8a5b`), HMAC symétrique = 0 vérifiable par un tiers · backlog §18 Master Schéma V2 ·
lots EVIDENCE / anonymisation / sensibilité **FERMÉS** → `journal/context-archive-2026-08-21-publication-reparation.md`.

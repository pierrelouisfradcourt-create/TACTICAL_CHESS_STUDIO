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

**Run 3 `kitten_clicker-20260821c` (DONE, 16/16, ≈ 38 $, 2 h 16, verdict AUTHENTIQUE FAIL/BLOCKED)** —
baseline : 10 exigences / 10 feuilles / 10 lignes / 23 fichiers / 1 scène / 0 asset / 0 audio / story
bible 2-8 / sonde 4 faits GREY_BLOCKS. Jeu mécaniquement jouable (73 tests, solvabilité 20/20, volets GPU
`main_screen_render`/`gallery_render` OK en gpu_window). **Six ruptures localisées** (détail en archive) :
1-3 corrigées (lots 2-3) ; 4 charter YAML illisible + matérialisation advisory (s0 OK sans artefact,
re-spawn prescrit par le skill jamais implémenté) ; 5 Grey Blocks → WireMap : `couvre` vides → Qwen invente
des noms → `repair_step.mjs:237` ne recopie que `problems[]` = **fausse preuve** → `ESCALADE` sans
consommateur, `res["repair"]` jeté par `entry["detail"]` ; 6 composition `full_godot*` = topologie legacy +
`s10s` = validateurs sans producteurs (builder a écrit `game_contract.yaml` seul au retry → s10s OK).

**Diagnostic ratifié en séance (Pierre)** : la Forge produit le noyau *prouvable* d'une intention ; le
Prisme est un PLAFOND (non-invention de s3) ; « vérifiable » ≠ « vérifiable par un bot ». Chantier en 6
étapes (inventaire existant non câblé → familles prouvables → `expected_proof.kind` seulement avec
consommateur → HumanGate explicite → recâblage → V2 régression). **Ne pas transformer chaque dimension
en oracle.** Croquis Pierre (histoire · GM · effets/son/habillage → wiremap-blackboard → builder) : blackboard
déjà [D] (PIPELINE_TARGET_V1:84,109), s8 HABILLAGE `NOT_FOUND`, « loi de la physique du jeu » et lien
« ambiance » nulle part écrits — première formulation.

**Chemins pour forger (inventaire)** : `run_real.py --profile` = CANONIQUE ; boucle manuelle du skill =
legacy non observé (le skill ne cite jamais `run_real`, périmé de 87 commits) ; `run_orchestrator` = mort
avec pong_r3 ; 17 profils, `review`/`increment` jamais joués ; `FORGE_SYSTEM_CONTRACT.yaml` PROPOSED. Aucun
code Forge hors `master` ; 2 branches locales mortes, 1 distante +7 (ledger STUDIO gelé).

**2026-08-22 — Décision Pierre : « il y a suffisamment d'éléments pour produire le jeu »** → Kitten Clicker
COMPLET par composition, chaque geste manuel = spec du câblage manquant. Plan :
`docs/superpowers/plans/2026-08-21-kitten-clicker-complet-composition.md`. Mesuré : 5 familles/6 ont
leur brique (s2.5 réel hors profil/0 lecteur ; volets GPU ont tourné ; audio procédural prouvé pacman/
bomberman sans fichier ; STANDARD `core.render`/`core.audio` ; `asset.sprite → 04_ASSETS/sprites/{id}`) ;
**aucun générateur 2D** → hypothèse SVG-texte ; les 5 familles tiennent dans `expected_proof.kind` ACTUEL
→ ce sont les TÂCHES qui exigent (`tasks.json` v2). Gestes manuels M1-M7 listés dans le plan.
Run 3 + build 2 archivés par déplacement (`_run3_20260821c/` + `game_build2/`, 43 fichiers).

### Prochaine étape
1. Run 4 `kitten_clicker-20260821d`, profil `full_godot_content`, sans `--charter`, depuis la session de
   supervision (arrière-plan + moniteur). Cibles : ≥ 20 exigences / 5 familles ; story bible ≥ 6-8 ;
   ≥ 6 sprites rendus non-monochromes ; volet `core_audio` OK ; bot au 3ᵉ palier ; sonde à BUILD ;
   verdict authentique ; puis **playtest Pierre** consigné comme HumanGate.
2. Rapport : intention traversée vs baseline, gestes manuels → spec de câblage, ruptures localisées.
3. Ensuite (décisions Pierre) : lots candidats des ruptures 4-6, skill `/forge` à réaligner sur
   `run_real.py`, ratification `FORGE_SYSTEM_CONTRACT.yaml`, branches mortes.

## Rappels de fond
`publish` = snapshot orphelin séparé, aucun SHA recopié ici · artefacts à chemin de poste exclus du corpus
public (`d9b8a5b`) · HMAC symétrique = 0 vérifiable par un tiers · lots EVIDENCE / anonymisation /
sensibilité FERMÉS → `journal/context-archive-2026-08-21-publication-reparation.md`.

# Kitten Clicker COMPLET par composition de l'existant — plan

*Date : 2026-08-21 · Source : session Fable (poste de commande) · Décision Pierre : « il y a suffisamment
d'éléments pour produire le jeu » → composer les briques existantes, mesurer chaque geste manuel comme
spécification du câblage manquant. Aucune station neuve, aucun oracle neuf, aucune extension de
`expected_proof.kind`. Baseline à battre (run 3, `kitten_clicker-20260821c`) : 10 exigences / 10 feuilles /
10 lignes / 23 fichiers / 1 scène / 0 asset / 0 audio / story bible 2-8 / sonde 4 faits GREY_BLOCKS / ≈ 38 $ / 2 h 16.*

## 1. Ce qui existe et sera composé (mesuré)

| Famille | Brique existante | Preuve existante | État |
|---|---|---|---|
| CONTENT (monde) | `s2.6-story-bible` (7/8 GROUNDED avec charter), `s2.7-gm-worldscan` | `check_story_bible` (source/ref/inferred) | dans le profil, consommée par s1/s3 |
| VISUAL (identité) | contrat `s2.5-artbible` (Opus, 5 min, 1,7 $ mesurés le 18/07) → `art_bible.md` + `asset_requests.json` | `check_artbible.mjs` | **hors profil, 0 consommateur** |
| VISUAL (rendu) | volets `07_TESTS/oracle/*.gd` en `gpu_window` (`main_screen_render`, `gallery_render` OK au build 2) | `product_oracle_godot` + `core.render` (pixel) | câblé, a tourné |
| VISUAL (assets) | `repo_map` : `asset.sprite → 04_ASSETS/sprites/{id}` ; Godot 4 importe `.svg` ; le builder a `Write` | `core.render` non-monochrome ; `asset.*` = lignes de wiremap jugées par s10s | **aucun générateur 2D** (asset-generator = 3D) → hypothèse SVG-texte |
| AUDIO | pattern procédural `AudioStreamGenerator` + journal (`games/pacman/06_RUNTIME/adapters/audio/audio.gd`, bomberman idem) ; STANDARD `core.audio` = `audio.cue` | volet `core_audio.gd` (bomberman) via `product_oracle_godot` | réutilisable (`reused_from`), jamais demandé |
| LONGUEUR | GM `progression` (coût ×1,15, prestige), solvabilité paramétrable (`max_ticks`, `trials`) | `bot_action` : un bot atteint le palier N | jamais exigé (finding HIGH s11) |
| UX / feel | — | `/playtest` humain | HumanGate |

## 2. Composition (lot 4 de code — même forme que le lot 1, petit)

- `dispatch.PROFILES["full_godot_content"]` = `full_godot_narratif` + **`s2.5-artbible` inséré après `s1-prisme`**
  (s2.5 consomme `product_snapshot.md` de s1) → 17 étapes. Timeout builder : même entrée 5400 s.
- `_UPSTREAM_BY_STEP` (2 copies) : `s3-decompo` += `art_bible.md`, `asset_requests.json` ;
  `s5-wiremap` += `art_bible.md`, `asset_requests.json`, `artifacts/s2.6-story-bible.txt` ;
  **nouvelle entrée** `s9-build-godot-standard`: (`blueprint.json`, `wiremap.json`, `art_bible.md`,
  `asset_requests.json`) — aujourd'hui cette étape n'a AUCUNE injection (lecture déclarative seule).
- Tests : profil (ordre, sous-ensemble ORDER∪DEDICATED), égalité des 2 tables, omission si absent.
- Aucune modification de contrat, d'oracle, de `expected_proof.kind`, de la non-invention de s3.

## 3. Ce que les TÂCHES exigent (tasks.json v2 — c'est ici que l'intention entre)

- **s0** : `criteres_demo` doit porter, en plus des 5 mécaniques : ≥ 6 chatons nommés avec identité
  visuelle distincte par rareté · ≥ 2 lieux (refuge + 1 débloqué) · ≥ 3 objets · ≥ 3 petites quêtes
  (objectifs visibles) · un son distinct pour clic / achat / déblocage / prestige · un feedback visuel au
  clic · une courbe de paliers avec ≥ 3 valeurs distinctes (règle de variance) · un bot atteint le 3ᵉ
  palier en T ticks. Règle de forme : toute valeur de liste YAML entre guillemets doubles ou en bloc
  `>-` (2 charters sur 3 cassés par un deux-points non échappé — contournement de prompt, PAS un correctif).
- **s1-prisme** : ≥ 1 exigence EXPECTED par famille CONTENT / VISUAL / AUDIO / LONGUEUR, chacune avec
  une référence adressable (`story_bible:characters`, `gm_worldscan:progression`, …) et un
  `expected_proof.kind` du vocabulaire actuel (`visual` → volet gpu ; `oracle` → `core_audio.gd` ;
  `file_write` → registre `03_WORLD/*.json` ; `bot_action` → palier).
- **s2.5-artbible** : identité « mignon / chaleureux », entités = chatons (par rareté), lieux, objets ;
  `asset_requests.json` en Asset Contract V0.1 ; **format cible `svg`** (texte, importable Godot).
- **s5-wiremap** : une ligne `asset.sprite` par entité requise (`04_ASSETS/sprites/{id}.svg`), une ligne
  `system.adapter` audio (`reused_from` pacman `audio.gd`), `couvre` = ids de capacités EXACTS (rupture 5).
- **s9-build-godot-standard** : `game_contract.assets.plan: generated` ; écrire les SVG ; réutiliser
  `audio.gd` (import réel, `reused_from.type: CODE_COPIE` + sha) ; volet `07_TESTS/oracle/core_audio.gd`
  ; `adds` ≤ 1 (loi d'empilement) ; aucun fichier hors carte.
- **s11** : attaquer LONGUEUR et COHÉRENCE monde↔mécanique (prestige vs passif, déjà trouvé).

## 4. Gestes manuels (chacun = spécification d'un câblage manquant, consigné dans le rapport)

| # | Geste | Câblage qu'il révèle |
|---|---|---|
| M1 | archiver le run 3 → `_run3_20260821c/` (même projet, même `oracles.json`) | un profil ne peut pas s'enchaîner sur un run DONE du même projet |
| M2 | règle de forme YAML dans la tâche s0 | charter advisory ; re-spawn s0 non implémenté (rupture 4) |
| M3 | exiger les familles dans les tâches s0/s1 | le Prisme ne porte que ce que la tâche demande : l'intention doit entrer par les `criteres_demo` |
| M4 | SVG comme format d'asset 2D | aucun générateur 2D ; à mesurer : Godot rend-il ces SVG (volet non-monochrome) ? |
| M5 | `reused_from` pacman audio.gd | la réutilisation n'est ni proposée ni mesurée sans le demander (reuse_ratio) |
| M6 | lecture humaine de `art_bible.md` → rien (0 consommateur hors injection) | l'art bible n'a de lecteur que par la table d'injection ajoutée ici |

## 5. Lancement (après go Pierre, depuis CETTE session, arrière-plan)

```bash
PYTHONPATH=scripts .venv312/Scripts/python.exe scripts/forge/run_real.py --project kitten_clicker --run-id kitten_clicker-20260821d --profile full_godot_content --src-root games/kitten_clicker --is-game --tasks-file lab/forge_runs/kitten_clicker/tasks.json
```
(sans `--charter` ; `games/kitten_clicker/` existant = le build 2, reconstruit sous la nouvelle carte ;
si la WireMap v2 exige un greenfield, archiver le jeu actuel en `games/kitten_clicker/_build2/` — geste M7.)

Coût attendu : amont ≈ 6 $ (s0 1,5 · s2 0,5 · s2.6 1 · s2.7 0,5 · s1 1 · s2.5 1,7) + s3-s6 ≈ 3 $ +
build 10-25 $ (×1-2, pool) + s11 3 $ → **30-60 $, 2 h 30 - 3 h 30**.

## 6. Critères de succès (intention traversée, pas volume)

| Mesure | Baseline run 3 | Cible |
|---|---|---|
| exigences Prisme / familles couvertes | 10 / 1 (GAMEPLAY) | ≥ 20 / 5 |
| story bible GROUNDED · éléments propres au jeu | 2-8 · 0 | ≥ 6-8 · ≥ 10 |
| sonde : faits à BUILD | 0 (4 GREY_BLOCKS) | ≥ 4 (couvre résolus) |
| lignes `asset.sprite` / fichiers `04_ASSETS` | 0 / 0 | ≥ 6 / ≥ 6, volet rendu non-monochrome OK |
| volet `core_audio` | absent | OK (journal de déclenchements ≥ 4 événements) |
| palier atteint par le bot | 1er prestige casse | 3ᵉ palier, trials 20/20 |
| verdict signé | FAIL/BLOCKED authentique | authentique, quel qu'il soit |
| playtest humain (Pierre) | jamais | fait, consigné comme HumanGate à côté du verdict |

## 7. Hors plan (mesuré, non traité)
Ruptures 4-6 du run 3 (charter advisory, adaptateur de réparation, composition legacy/standard) restent
ouvertes ; `increment` (jamais joué) serait le vrai véhicule d'enrichissement d'un jeu existant — non
utilisé ici parce qu'il ne contient ni s2.6/s2.7/s2.5 ni le builder Godot.

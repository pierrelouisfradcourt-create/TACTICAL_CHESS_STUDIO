# STUDIO_FULL_MAP — Tactical Chess Studio

> Cartographie complète générée le **2026-06-01**.
> Périmètre : `C:\TACTICAL_CHESS_STUDIO` entier — hors `.venv312` et `target/`.

---

## 1. Tableau de tous les dossiers

| Dossier | Fichiers¹ | Taille | Type de contenu | Statut |
|---|---|---|---|---|
| `src/` | 111 | 1 MB | Rust — TacticalChessPureLab | **ACTIF** |
| `tests/` | 63 | 0.5 MB | Tests d'intégration Rust | **ACTIF** |
| `ml/` | 33 | 0.7 MB | Python — pipeline ML (train, eval, loader) | **ACTIF** |
| `lab/` | 615 | ~4 607 MB² | Lab principal : datasets, runs, chains, puzzles | **ACTIF** |
| `models/` | 5 | 17 909 MB | Modèles chess (.pt) + LLMs GGUF (Devstral + Mistral) | **ACTIF** |
| `tools/` | 108 | 110 MB | Stockfish exe + src C++ + scripts PS admin | **ACTIF** |
| `scripts/` | 95 | 1.5 MB | Control plane Python + PS (studioV2, uxpilote) | **ACTIF** |
| `00_STUDIO_CONTROL/` | 282 | 2.7 MB | Documentation pilotage, registries, forms, maps | **ACTIF** |
| `docs/` | 210 | 0.8 MB | Docs architecture, contrats, schemas narratifs | **ACTIF** |
| `schemas/` | 35 | 0.1 MB | JSON Schemas validation (35 types de paquets) | **ACTIF** |
| `db/` | 9 | ~1 KB | Migrations SQL (rulesets, simulation, replay) | **ACTIF** |
| `memory_core/` | 5 | ~0.1 MB | Python RAG mini (phase, plans, retrieve, tags) | **ACTIF (light)** |
| `outputs/` | 6 | 8.2 MB | Git bundle backup + rapports sécurité | **ACTIF (archive)** |
| `repos/apps/BullshitKiller/` | 1 115 | 46.5 MB | App Python packagée (PyInstaller standalone) | **DORMANT** |
| `repos/games/studioV2_MIGRATED_HOLD/` | 1 050 | 36.4 MB | Ancienne v2 du studio (migrated hold) | **DORMANT** |
| `repos/games/ChessTCG/` | 59 | 0.1 MB | Design docs ChessTCG — aucun code | **DORMANT (docs)** |
| `repos/agents/CyberSentinel/` | 1 | ~1 KB | Agent déclaré — README seulement | **STUB** |
| `repos/apps/StudioLauncher/` | 1 | ~1 KB | Launcher déclaré — README seulement | **STUB** |
| `repos/shared/` | 1 | ~1 KB | Bibliothèque partagée déclarée — README seulement | **STUB** |
| `document_work/` | 17 | 0.4 MB | Document "Le paradoxe Skynet" + extraction ODT | **HORS-STUDIO** |
| `AI_MEMORY/` | 1 | ~1 KB | README seulement | **VIDE** |
| `.studio_state/` | 2 | ~1 KB | README + .gitignore — état vide | **VIDE** |
| `datasets/` | 0 | 0 | — | **VIDE (sentinelle)** |
| `runs/` | 0 | 0 | — | **VIDE (sentinelle)** |
| `tmp/` | 0 | 0 | — | **VIDE (sentinelle)** |
| `.venv312/` | 29 379 | 4 477 MB | Python 3.12 venv (numpy, torch…) | **INFRA (exclu)** |

¹ Hors `target/` et `.venv312/`.
² La taille réelle de `lab/` est dominée par `lab/runs/` (3 426 MB) et `lab/puzzles/` (1 046 MB).

---

## 2. Détail par dossier non vide

---

### `src/` + `tests/` — TacticalChessPureLab Rust

Voir `SYSTEM_MAP.md` pour la cartographie exhaustive. Résumé :

- Crate unique `tactical_chess_pure_lab` v0.1.0
- 106 fichiers `.rs` src | 28 fichiers tests
- 29 883 lignes src + 6 830 lignes tests
- Tests : 224 passing / 1 failing / durée 142s

---

### `ml/` — Pipeline ML Python

| Fichier | KB | Rôle |
|---|---|---|
| `adaptive_dataset.py` | 53.8 | Dataset adaptatif (sélection dynamique) |
| `dataset_loader.py` | 42.9 | Loader JSONL → tenseurs PyTorch |
| `train.py` | 36.2 | Boucle d'entraînement principale |
| `lab_orchestrator.py` | 36.6 | Orchestrateur de lab (pilotage runs) |
| `dataset_decision_router.py` | 34.7 | Routage dynamique des datasets |
| `dataset_phase_builder.py` | 35.4 | Construction par phase d'entraînement |
| `priority_training_queue.py` | 26.1 | File prioritaire (importance sampling) |
| `experiment_runner.py` | 21.8 | Lancement + logging d'expériences |
| `experiment_analytics.py` | 20.6 | Analyse des résultats d'expériences |
| `coach.py` | 14.7 | Coaching loop (policy improvement) |
| `lab_control_ui.py` | 16.8 | UI terminal de contrôle du lab |
| `claude_bridge.py` | 3.8 | Bridge Claude API (critiques automatiques) |
| `infer_policy.py` | 10.2 | Inférence policy (inference time) |
| `model.py` | 2.3 | Définition architecture modèle PyTorch |
| `move_vocab.py` | 5.2 | Vocabulaire des coups (token mapping) |
| `lichess_importer.py` | 7.3 | Import données Lichess (PGN → JSONL) |
| `exercise_trainer/generator.py` | 31.8 | Générateur d'exercices ML |

---

### `lab/` — Lab principal

#### Sous-répertoires clés

| Sous-dossier | Fichiers | Taille | Rôle |
|---|---|---|---|
| `lab/runs/` | 111 | **3 426 MB** | Artefacts de runs d'entraînement (modèles, logs, métriques) |
| `lab/puzzles/` | 4 | **1 046 MB** | Base de puzzles tactiques (CSV massif) |
| `lab/experiments/` | 9 | 67.8 MB | Résultats d'expériences (checkpoints, analyses) |
| `lab/project_genesis/` | 61 | 21.4 MB | Genesis du design ChessTCG (docs historiques) |
| `lab/datasets/` | 44 | 31.1 MB | Datasets teacher actifs (JSONL) |
| `lab/reports/` | 20 | 5.1 MB | Rapports de qualité, métriques dataset |
| `lab/pedagogy_db/` | 16 | 2.3 MB | Base pédagogique (positions, exercices) |
| `lab/chains/` | 52 | 0.3 MB | Improvement ledger, decision log, charters IMP-* |
| `lab/gameplay_observation/` | 76 | 0.3 MB | Observations de parties (traces JSON) |
| `lab/no_code/` | 16 | 0.1 MB | Artefacts no-code (prompts, specs) |
| `lab/reverse_dataset/` | 9 | 0.2 MB | Dataset inversé (prise de perspective noire) |
| `lab/agent_tasks/` | 15 | — | Tâches d'agents en cours |
| `lab/claim_data_gates/` | 20 | — | Gates de validation des claims |
| `lab/parsers/` | 15 | — | Parseurs JSONL/PGN |
| `lab/traces/` | 27 | — | Traces d'épisodes |
| `lab/policies/` | 6 | — | Politiques lab (admissions, routage) |

#### Fichiers temporaires non nettoyés à la racine de `lab/`

```
lab/tmp_share_69e97198.html   1 987 KB
lab/tmp_share_69eb2cbf.html     999 KB
lab/tmp_share_69ee0685.html   1 955 KB
lab/tmp_share_69ee0695.html   1 613 KB
```

Ces 4 fichiers HTML (~6.5 MB total) sont des partages temporaires à supprimer.

---

### `models/` — Modèles

| Fichier | Taille | Type | Rôle |
|---|---|---|---|
| `models/best.pt` | 0.03 GB | PyTorch | Meilleur checkpoint chess neural |
| `models/latest.pt` | 0.03 GB | PyTorch | Dernier checkpoint chess neural |
| `models/latest_run.json` | ~1 KB | JSON | Métadonnées du dernier run |
| `models/lmstudio/.../Devstral-Small-2507-Q4_K_M.gguf` | **13.35 GB** | GGUF | LLM local pour revue/critique (Devstral) |
| `models/lmstudio/.../Mistral-7B-Instruct-v0.3-Q4_K_M.gguf` | **4.07 GB** | GGUF | LLM local alternatif (Mistral 7B) |

**Total stockage modèles : ~17.5 GB**

---

### `tools/` — Outils vendor

#### Stockfish

| Fichier | Taille | Rôle |
|---|---|---|
| `tools/vendor_tools/stockfish/stockfish-windows-x86-64-avx2.exe` | **111 MB** | Moteur teacher (moteur de référence) |
| `tools/vendor_tools/stockfish/src/` | ~62 fichiers C++/h | Code source Stockfish (référence, non compilé) |
| `tools/vendor_tools/stockfish/wiki/` | ~15 fichiers MD | Documentation UCI + usage |

#### Scripts PowerShell admin (14 fichiers .ps1)

| Script | Rôle |
|---|---|
| `CONSOLIDATE_LA_CIGOGNE_PROFILE.ps1` | Consolidation profil |
| `CLEAN_SAFE_DUPLICATES_CURRENT.ps1` | Nettoyage doublons |
| `CLEAN_CONFIRMED_DUPLICATES_LA_CIGOGNE.ps1` | Nettoyage doublons confirmés |
| `AUDIT_200GB_DATA_ADMIN.ps1` | Audit 200 GB données |
| `AUDIT_CURRENT_USER_DUPLICATES.ps1` | Audit doublons utilisateur |
| `AUDIT_LLM_DUPLICATES_ADMIN.ps1` | Audit doublons LLM |
| `COMPARE_STUDIO_SHADOW_TO_CURRENT.ps1` | Comparaison shadow/current |
| `RESTORE_CODEX_CLAVARDAGES_AFTER_CLOSE.ps1` | Restauration logs Codex |
| `RECOVER_APP_SETTINGS_*.ps1` (×5) | Restauration ACL paramètres |
| `CHECK_SHADOW_COPIES_ADMIN.ps1` | Vérification shadow copies |

---

### `scripts/` — Control plane

#### Deux sous-systèmes distincts

**`scripts/studioV2/`** (pipeline de contrôle principal) :

| Catégorie | Fichiers | Rôle |
|---|---|---|
| `control_plane/*.py` | ~30 | Pipeline semi-auto : derive_delta, render_status, compile_mission, validate_reports |
| `operator/*.py/.ps1` | 5 | Validation staged, PR inspection, JSON artifacts |
| Scripts racine | ~40 | check_*, prepare_*, run_*, generate_*, report_* |
| `studioctl.py` | 140 KB | Contrôleur principal studioV2 |
| `check_input_boundary.py` | 32 KB | Validation frontière inputs |
| `agent_pr_operator.py` | 30 KB | Opérateur PR automatique |
| `auto_merge_guard.py` | 26 KB | Garde auto-merge |
| `parse_run_bundle.py` | 25.5 KB | Parsing bundles de runs |

**`scripts/uxpilote/`** :

| Fichier | Taille | Rôle |
|---|---|---|
| `uxpilote_readonly.py` | **221 KB** | Prototype UX pilote read-only (TRÈS GROS) |

---

### `00_STUDIO_CONTROL/` — Documentation de contrôle

Structure en 4 couches :

```
00_STUDIO_CONTROL/
├── 00_MASTER_DOCS/          — 70+ fichiers, docs vivantes
│   ├── 00_NAVIGATION_INDEX.md  — index principal
│   ├── 01_CURRENT_STATE.md     — état courant du studio (19 KB)
│   ├── 05_ARCHITECTURE.md      — architecture (18 KB)
│   ├── 06_KNOWN_ISSUES.md      — 14 problèmes actifs (35 KB)
│   ├── 07_CURRENT_STATE.md     — état détaillé (23 KB)
│   ├── 10_AUTOMATION_EVIDENCE_PLANE.md
│   ├── AUTOMATION_*.md         — contrats automation (6 fichiers)
│   └── ARCHIVE/                — 50+ docs archivés
│
├── 01_SYSTEM/               — Système de contrôle vivant
│   ├── boundaries/          — 14 fichiers, politiques (HumanGate, secrets, network)
│   ├── codex/               — 13 fichiers, loop LLM, templates, codex params
│   ├── forms/               — 14 fichiers, templates YAML (pipeline IO, task charters)
│   ├── index/               — CONTROL_INDEX, READ_FIRST, STATUS_LEGEND
│   ├── maps/                — 13 fichiers, cartes architecture (UXPilote, PATH_CONTRACT)
│   ├── navigation/          — STUDIO_SOURCE_ANCHORING
│   ├── rag/                 — politique RAG backend
│   └── registries/          — 13 fichiers (FILE_REGISTRY 41 KB, AGENT_REGISTRY, etc.)
│
├── 02_PIPELINE/             — Pipeline actif
│   └── bootstrap/KENPACHI/  — checklist ouverture de session
│
└── 99_ARCHIVE/              — Archives historiques
    ├── legacy_pipeline/     — 8 fichiers ancien pipeline
    ├── migration/           — 6 fichiers rapports de migration
    ├── plans/               — 40+ fichiers specs UXPilote + ROCKY queues
    └── records/             — 63 fichiers audits, snapshots, truth maps
```

---

### `docs/` — Documentation architecture

| Sous-dossier | Fichiers | Contenu |
|---|---|---|
| `docs/control-plane/` | 191 | Docs contrats control plane (schemas, smokes, loops) |
| `docs/fixtures/` | 114 | Fixtures de tests |
| `docs/evidence/` | 13 | Preuves traces Rocky (observation protocol, AlphaStar) |
| `docs/gpt-navigator/` | 5 | Instructions GPT Navigator |
| Racine `docs/` | 82 fichiers | Contrats architecture (ENGINE_SEARCH_NEURAL, ROCKY, STUDIO_*) |

Fichiers notables :
- `ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md` — 15 KB
- `ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` — 7.5 KB
- `ROCKY_ERROR_TO_PUZZLE_ROADMAP_V0.md` — 10.3 KB
- `STUDIO_GOVERNANCE_LANES_V0.md` — 11.1 KB

---

### `schemas/` — JSON Schemas (35 types)

Tous les paquets du pipeline agentic sont validés par schéma :

| Catégorie | Exemples |
|---|---|
| Studio state | `studio_current_state`, `studio_state_delta`, `studio_state_snapshot` |
| StudioPilot | `studiopilot_campaign_plan`, `studiopilot_director_report`, `studiopilot_execution_report` |
| PR/Review | `studiopilot_pr_decision_packet`, `studiopilot_review_packet`, `studiopilot_local_review_pack` |
| Human/Gate | `humangate_decision_candidate`, `studiopilot_human_command`, `studiopilot_human_decision` |
| Agents | `agent_profile`, `agent_scorecard`, `autonomy_levels`, `forbidden_surfaces`, `tool_permission_matrix` |
| Learning | `studiopilot_learning_event`, `learning_card`, `reward_log` |
| Task/Work | `studiopilot_task_packet`, `task_packet`, `studio_mission_candidate`, `block_manifest` |

---

### `db/` — Migrations SQL (9 fichiers)

```sql
001_create_rulesets.sql
002_create_unit_templates.sql
003_create_ability_definitions.sql
004_create_terrain_types.sql
005_create_simulation_runs.sql
006_create_simulation_matches.sql
007_create_simulation_metrics.sql
008_create_balance_reports.sql
009_create_replay_index.sql
```

Base de données prévue pour simulation/balance — non montée actuellement (pas de fichier `.db`).

---

### `repos/games/ChessTCG/` — Design docs uniquement

8 docs de design canon (charter, roadmap, RNG formula, card taxonomy, source inventory) + 50 fichiers de genesis importés depuis `TacticalChessPureLab_github_main`. Pas une ligne de code source. Statut : documentation-only.

---

### `repos/games/studioV2_MIGRATED_HOLD/` — Ancienne version

Copie freeze de l'ancienne version v2 du studio. Contient :
- Rust src plus fragmenté (src avec sous-dossiers agents, chess, core, etc.) — 136 fichiers
- `target/debug/` — **3 535 fichiers build** (non nettoyés, ~36 MB)
- Copies identiques de la plupart des fichiers lab, scripts, ml, schemas
- À traiter : supprimer `target/` ou archiver entièrement

---

### `repos/apps/BullshitKiller/` — App packagée

Application Python standalone packagée avec PyInstaller (`python312.dll`, `_internal/`, templates de prompts juridiques). Pas en développement actif — livraison déjà effectuée.

---

### `outputs/` — Artefacts

| Fichier | Taille | Rôle |
|---|---|---|
| `outputs/git_bundles/TACTICAL_CHESS_STUDIO_2026-05-23_post_fusion.bundle` | 8.2 MB | Backup git bundle (post-fusion) |
| `outputs/security_audit/security_supplychain_audit_*.txt` (×4) | ~20 KB | Audits sécurité supply chain |
| `outputs/security_pack/SECURITY_PACK_SECRETS_SUPPLYCHAIN.md` | ~1 KB | Bilan sécurité |

---

### `document_work/` — Hors-studio

Travail d'écriture sur le document "Le paradoxe Skynet" (`.docx`, `.odt`, extraction XML). Sans rapport fonctionnel avec le studio d'échecs.

---

### Fichiers racine notables

| Fichier | Taille | Rôle |
|---|---|---|
| `ENGINE_SEARCH_NEURAL_SCAN.txt` | 260 KB | Scan brut du système search/neural |
| `rocky_debug.log` | 177 KB | Log de debug Rocky (non archivé) |
| `AUDIT_2026-05-28.md` | 73 KB | Audit récent du studio |
| `FILE_ROUTING_MANIFEST.yaml` | 15 KB | Manifeste de routage fichiers |
| `AGENTS.md` | 3 KB | Instructions agents (Claude Code) |
| `SECURITY_AUTOMATION_AUDIT.md` | 5 KB | Audit sécurité automation |
| `SECURITY_BOUNDARY.md` | 1.8 KB | Frontière sécurité |
| `THREAT_MODEL.md` | 2.5 KB | Modèle de menaces |
| `viewer.html` | 10 KB | Viewer HTML local |
| `audit_rocky.py` | 10 KB | Script audit Rocky |
| `audit_moves_length.py` | 0.4 KB | Audit longueur des coups |
| `fix_hanging.py` | 1.6 KB | Fix détection de blocage |

---

## 3. Actif vs Dormant vs Documentation-only

### ACTIF — En développement ou utilisation courante

| Zone | Evidence d'activité |
|---|---|
| `src/` + `tests/` | Commits récents (IMP-007 à IMP-021), tests en CI |
| `ml/` | Scripts train.py, dataset loaders, lab_orchestrator |
| `lab/datasets/` | 6 JSONL teacher actifs, 23 000+ lignes |
| `lab/runs/` | 111 fichiers, 3.4 GB (runs récents) |
| `lab/chains/` | IMPROVEMENT_LEDGER.yaml, HUMANGATE_DECISION_LOG.yaml (git status modifié) |
| `models/best.pt` + `latest.pt` | Mis à jour lors des runs ML |
| `tools/stockfish/` | Teacher engine utilisé par `teacher_uci_runner.rs` |
| `scripts/studioV2/` | Pipeline de contrôle actif |
| `00_STUDIO_CONTROL/` | Navigation, decisions log, known issues vivants |
| `docs/` | Contrats et roadmaps référencés par le pipeline |
| `schemas/` | Validation active via `validate_control_plane_json.py` |

### DORMANT — Conservé mais inactif

| Zone | Raison |
|---|---|
| `repos/games/studioV2_MIGRATED_HOLD/` | Migration effectuée, version freeze |
| `repos/apps/BullshitKiller/` | Application livrée, développement arrêté |
| `repos/games/ChessTCG/` | Docs-only, aucun développement en cours |
| `models/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf` | Supplanté par Devstral |
| `memory_core/` | RAG léger, utilisé ponctuellement |
| `db/migrations/` | Schema SQL défini, pas de DB montée |

### DOCUMENTATION-ONLY

| Zone | Contenu |
|---|---|
| `00_STUDIO_CONTROL/99_ARCHIVE/` | Historique décisions, snapshots frozen |
| `repos/games/ChessTCG/` | Design canon, pas de code |
| `docs/gpt-navigator/` | Instructions GPT Navigator externe |
| `outputs/security_audit/` | Rapports audit archivés |

---

## 4. Surfaces manquantes ou inattendues

### Inattendues (présentes sans être documentées)

| Surface | Localisation | Observation |
|---|---|---|
| **Document Skynet** | `document_work/` | Travail d'écriture sans rapport avec le studio d'échecs |
| **2 LLMs GGUF locaux** | `models/lmstudio/` | 17.4 GB de modèles locaux (Devstral + Mistral) |
| **4 fichiers HTML temporaires** | `lab/tmp_share_*.html` | ~6.5 MB de partages non nettoyés |
| **1 046 MB puzzles** | `lab/puzzles/` | Taille massive non documentée dans SYSTEM_MAP |
| **3 426 MB runs** | `lab/runs/` | Artefacts d'entraînement non purgés |
| **target/ dans studioV2_MIGRATED_HOLD** | `repos/games/studioV2_MIGRATED_HOLD/target/` | 3 535 fichiers build non nettoyés (~36 MB) |
| **`rocky_debug.log`** | Racine | Debug log 177 KB à la racine (non archivé) |
| **`ENGINE_SEARCH_NEURAL_SCAN.txt`** | Racine | Scan brut 260 KB à la racine |
| **Scripts Godot** | `00_STUDIO_CONTROL/99_ARCHIVE/plans/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/` | Prototype Godot 4 (GDScript) en archive |
| **Prototype JS/HTML** | `00_STUDIO_CONTROL/99_ARCHIVE/plans/UXPILOTE_PROTOTYPE_CANDIDATE_ONLY/` | app.js 29 KB + styles.css 22 KB en archive |
| **`scripts/uxpilote/uxpilote_readonly.py`** | `scripts/uxpilote/` | 221 KB — fichier Python le plus gros du projet |

### Manquantes (déclarées mais absentes)

| Surface attendue | Statut réel | Impact |
|---|---|---|
| `datasets/` — datasets centraux | **VIDE** | Tout est dans `lab/datasets/` (doublon logique) |
| `runs/` — runs centraux | **VIDE** | Tout est dans `lab/runs/` (doublon logique) |
| `repos/agents/CyberSentinel/` | **STUB** (README seulement) | Agent déclaré non implémenté |
| `repos/apps/StudioLauncher/` | **STUB** (README seulement) | Launcher déclaré non implémenté |
| `repos/shared/` | **STUB** (README seulement) | Bibliothèque partagée déclarée vide |
| `AI_MEMORY/` | **VIDE** (README seulement) | Mémoire AI déclarée sans contenu |
| `.studio_state/` | **VIDE** | État du studio non persisté |
| Base de données SQL | **ABSENTE** | 9 migrations définies, aucun fichier `.db` ou `.sqlite` |
| CI/CD workflows | **Non vérifiés** | `.github/` existe (7 fichiers) — contenu non détaillé |

---

## 5. Carte de la consommation disque (hors infra)

```
TACTICAL_CHESS_STUDIO (total utile)
├── models/                17 909 MB  ████████████████████ (78%)
│   ├── Devstral.gguf      13 350 MB
│   └── Mistral.gguf        4 070 MB
├── lab/runs/               3 426 MB  ████ (15%)
├── lab/puzzles/            1 046 MB  ██ (5%)
├── repos/ (utile)           ~84 MB   < 1%
│   ├── BullshitKiller         46.5 MB
│   └── studioV2_MIGRATED_HOLD 36.4 MB
├── tools/ (stockfish)        110 MB  < 1%
├── lab/experiments/           68 MB
├── outputs/                    8 MB
├── lab/datasets/              31 MB
├── lab/project_genesis/       21 MB
├── Rust src+tests              2 MB
├── scripts/ + ml/ + docs/      3 MB
└── Reste (md, yaml, json)     ~10 MB
```

---

## 6. Points d'entrée du système

### Entrées utilisateur directes

| Commande | Fichier | Action |
|---|---|---|
| `cargo run -- <subcommand>` | `src/main.rs` → `tool/cli.rs` | UCI, puzzle-eval, benchmark, observe-fen |
| `python ml/train.py` | `ml/train.py` | Entraînement modèle chess |
| `python ml/lab_orchestrator.py` | `ml/lab_orchestrator.py` | Orchestration lab complète |
| `python scripts/studioV2/studioctl.py` | `scripts/studioV2/studioctl.py` | Contrôleur pipeline studio |
| `./tools/vendor_tools/stockfish/stockfish-windows-x86-64-avx2.exe` | direct | Moteur teacher UCI |
| `python scripts/studioV2/run_manual_codex_loop_once.py` | — | Boucle Codex manuelle |

### Entrées du pipeline agentic

```
Agent ──► 00_STUDIO_CONTROL/01_SYSTEM/index/READ_FIRST.md
           └─► CONTROL_INDEX.md
                └─► PATH_CONTRACT.md (chemins canoniques)
                └─► AGENT_REGISTRY.yaml (agents actifs)
                └─► FILE_REGISTRY.yaml (routes fichiers)
```

---

*Fin de cartographie studio complète — STUDIO_FULL_MAP.md généré le 2026-06-01*

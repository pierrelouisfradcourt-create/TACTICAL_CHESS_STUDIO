# TacticalChessPureLab V2 Source Of Truth

## Active Project Root

- Active repo root: `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab`
- Active code roots:
  - `src/`
  - `ml/`
  - `models/`
  - `lab/`

## Authority Order

1. active runtime code
2. active repo manifests / active dataset infra
3. active root truth docs
4. historical docs only as support

If code and docs disagree, code wins.

## Active Runtime Contracts

- Dataset generation: `src/simulation/teacher_uci_runner.rs`
- Dataset export boundary: `src/ml/dataset_export.rs`
- Training: `ml/train.py`
- Dataset loading and row validation: `ml/dataset_loader.py`
- Dataset validation: `ml/export_dataset_check.py`
- Inference bridge: `ml/infer_policy.py`
- Move vocabulary contract: `ml/move_vocab.py`
- Neural runtime: `src/agents/neural_agent.rs`
- Real tournament runtime: `src/simulation/neural_tournament_runner.rs`
- CLI runtime surface: `src/tool/cli.rs`
- Exercise generator: `ml/exercise_trainer/generator.py`

## Active Output Policy

- Canonical experiment output root:
  - `lab/experiments/exp_003_aggressive/tournaments/`
- Canonical active experiment marker:
  - `lab/ACTIVE_EXPERIMENT.txt`
- Canonical frozen baby dataset:
  - `lab/datasets/teacher_v2_baby_source_seed42_g12.jsonl`
- Canonical frozen baby dataset manifest:
  - `lab/datasets/teacher_v2_baby_source_seed42_g12.manifest.json`
- Training run provenance:
  - `lab/runs/<run_id>/manifest.json`
  - `lab/runs/<run_id>/training_epochs.csv`
  - `models/latest_run.json`

## Active Dataset Marker Reality

### Canonical pointer
- `lab/ACTIVE_DATASET.txt`

### Source-proven meaning
- `ml/train.py` uses dataset path resolution from `ml/dataset_loader.py`
- explicit `--input` wins if provided
- otherwise training falls back to `lab/ACTIVE_DATASET.txt`

### Critical boundary
The active dataset pointer is canonical.

It is not automatic proof that the pointed artifact satisfies the current train contract.

## Pedagogy DB Reality

Active pedagogy curation artifacts exist inside the active repo:

- `lab/pedagogy_db/candidate_games_for_triage.csv`
- `lab/pedagogy_db/triaged_pedagogy_candidates.csv`
- `lab/pedagogy_db/promoted_pedagogy_pack.csv`

These artifacts establish a curation workflow shape:
- candidate compilation
- triage materialization
- promoted selection

They do not by themselves establish train-consumable ML samples.

## Current Train Contract

`ml/dataset_loader.py` currently validates per-row training data with:

Required:
- `fen`
- `best_move`
- `result` or `engine_eval`

Optional:
- `legal_moves`
- `top_moves`
- `top_scores`
- `player_to_move`
- `schema_version`
- `side_material_plus`
- `conversion_focus`

Additional active truth:
- `best_move` must map into the shared move vocabulary
- `legal_moves` are used to build a legal mask
- `top_moves` and `top_scores` are used to build a soft policy target when present

## Current Active Dataset Warning

If `lab/ACTIVE_DATASET.txt` points to a pedagogy curation CSV, that artifact must not be treated as a train-consumable teacher dataset unless it satisfies the active loader contract.

Operational rule:
- active pointer is real
- compatibility is a separate truth layer

## Explicitly Not Source Of Truth

- Root-level archive packs outside `TacticalChessPureLab`
- Browser ChatGPT history by itself
- Legacy root tournament outputs now archived from `lab/tournaments`
- Zero-byte noise files created by failed automations
- A dataset pointer whose target does not satisfy the active training contract
- Curation DB artifacts promoted by narrative only

## Governance Docs

- Project history:
  - `MASTER_DOCS/PROJECT_HISTORY.md`
- Source/archive policy:
  - `MASTER_DOCS/SOURCE_ARCHIVE_MAP.md`
- Reviewed ChatGPT share ledger:
  - `MASTER_DOCS/CHATGPT_SHARE_ARCHIVE_MAP.md`

## V2 Hygiene Rules

- Do not write tournament truth into two locations at once.
- Do not treat a dataset as valid without `ml/export_dataset_check.py`.
- Do not promote a checkpoint without a matching run manifest.
- Do not use files outside this repo root as active runtime inputs unless they are imported intentionally.
- Do not treat a canonical pointer as automatic compatibility proof.
- Do not describe pedagogy curation as ML training data unless the active loader contract is satisfied.

## Post-V2 Reality Update

The active lab has passed through additional recovery phases after the initial V2 cleanup.

### Benchmark truth recovery
Confirmed:
- benchmark contamination tracking exists
- deterministic benchmark modes exist
- provenance is materially clearer than before
- benchmark results are now sufficiently cleaned for serious benchmarking

### Runtime setup safety recovery
Confirmed:
- invalid initial board placement fails fast
- out-of-bounds setup is rejected
- duplicate spawn collisions are rejected

### True-chess recovery
Confirmed in the active runtime:
- castling
- en passant
- explicit underpromotion
- fifty-move rule
- threefold repetition
- insufficient material detection

Important:
- hard cap still exists
- but it is now lab-only termination, not official chess draw truth

## Runtime Guard Rail Reality

### Neural runtime
Confirmed in active source:
- bridge startup health checks exist
- bridge readiness handshake is required
- benchmark-sensitive impurity tracking exists
- runtime path resolution is more explicit than older hardcoded assumptions

### CLI surface
Confirmed in active source:
- neural tournament performs a neural bridge health check before tournament start
- tournament can be cancelled if bridge startup fails
- runtime identity details are printed from the bridge health check path
- output file locations are printed after tournament run

## Generator Hygiene Reality

Confirmed in active source:
- family-based theme routing exists
- curriculum family weights exist
- intra-family weights exist
- difficulty weights exist
- runtime theme disablement exists
- repeated failures can disable themes

Not confirmed as completed:
- localized runtime theme state
- non-misleading active-theme truth
- richer per-theme runtime summary fields
- differentiated early/mid/late stage weights

## Current Active Phase

The project is no longer primarily in truth recovery.

The active phase is now:

**conversion recovery plus AAA runtime bridge validation**

This means:
- benchmark truth is sufficiently cleaned for serious interpretation
- runtime rules are sufficiently cleaned for serious chess benchmarking
- the main remaining problem is practical non-conversion and long sterile games
- the pedagogy curation layer and the ML train contract still require explicit separation
- the first AAA trace/export/load/train path exists, but its value still needs A/B validation

## Current Highest-ROI Priority Order

1. `src/chess/search.rs`
2. `src/agents/neural_agent.rs`
3. `ml/train.py`

## AAA Runtime Bridge Reality

Confirmed in active source:
- `src/chess/decision.rs` exists
- decision traces are represented with `DecisionMode` and `DecisionTrace`
- root search returns `RootSearchResult` and `RootSearchDiagnostics`
- teacher export can emit `aaa_alt_moves`, `aaa_alt_decision_scores`, `aaa_confidence`, and `aaa_used_search`
- `ml/dataset_loader.py` validates and consumes AAA metadata
- `ml/train.py` consumes `aaa_confidence` in policy weighting and reports AAA dataset stats
- `ml/export_dataset_check.py` is AAA-field aware

Important boundary:
- AAA runtime wiring exists
- AAA strength value is not yet proven
- the safe status is `DEPLOY WITH RESERVATIONS`

Not yet source-of-truth as implemented code:
- full `StrategicState -> PolicyWeights -> Search modulation -> Root arbitration`
- true `make_move / unmake_move` search architecture
- proven A/B gain from AAA weighting

Detail doc:
- `MASTER_DOCS/AAA_RUNTIME_UPDATE.md`

## Frozen Unless Concrete Bug Is Observed

- broad benchmark-truth reopening
- broad rules-recovery reopening
- large architecture refactors
- RL / MCTS / selfplay moonshots

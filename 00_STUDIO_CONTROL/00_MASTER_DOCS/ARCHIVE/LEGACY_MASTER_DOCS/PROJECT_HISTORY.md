# Tactical Chess Project History

## Scope

This document retraces the project as it exists on `2026-04-17`.
It is intentionally factual and centered on the active lab:

- active lab root: `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab`
- supporting memory outside repo: browser ChatGPT shares, desktop packs, backups, handoff files

## Phase 0 - Studio Vision Before Source Control Hygiene

The broader `TACTICAL_CHESS_STUDIO` workspace started as a multi-branch project:

- game engine and ruleset work
- AI lab experiments
- architecture notes and handoff packs
- browser ChatGPT design iterations
- local backups and zip archives

At this stage, the project direction was already consistent:

- Rust engine
- teacher-driven dataset generation
- Python training and inference
- tournament-based evaluation
- future idea of multiple AI archetypes

The main weakness of this phase was not ambition, but traceability.
Project memory was spread across:

- repo files
- downloads
- desktop backups
- browser conversations
- shared ChatGPT links

## Phase 1 - PureLab Becomes The Real Active Lab

The active chess AI lab converged into `TacticalChessPureLab`.
The operational pipeline became:

- `src/simulation/teacher_uci_runner.rs`
- `src/ml/dataset_export.rs`
- `ml/train.py`
- `ml/dataset_loader.py`
- `ml/move_vocab.py`
- `ml/infer_policy.py`
- `src/agents/neural_agent.rs`
- `src/simulation/neural_tournament_runner.rs`

This phase established the right lab shape:

- dataset generation from teacher engine
- PyTorch policy/value training
- neural inference from Rust
- Elo-style tournament comparison

## Phase 2 - Drift, Silent Failures, And False Growth

The lab then accumulated real technical debt.

### Runtime drift

- the neural bridge depended on fragile Python runtime assumptions
- `neural_pick` could report ready even when the bridge was broken
- `neural_tournament` could silently fall back to non-neural behavior

### Dataset drift

Large datasets existed, but the major ones were structurally unhealthy:

- `teacher_mix_70_30.jsonl`
- `teacher_tactical_finisher.jsonl`

Observed problems:

- extremely low effective FEN diversity
- effectively repeated trajectories
- result labels collapsed to `1-0`
- no trustworthy provenance from dataset to checkpoint

This created a dangerous illusion:

- lots of rows
- many model files
- weak scientific confidence

## Phase 3 - Audit And V2 Cleanup

On `2026-04-16` and `2026-04-17`, the lab was audited and cleaned in place.

### Repo hygiene

- zero-byte root noise files were quarantined into `archive/quarantine_2026-04-16/root_zero_byte_noise`
- ambiguous legacy outputs from `lab/tournaments` were archived into `archive/quarantine_2026-04-16/legacy_lab_outputs`
- `MASTER_DOCS/V2_SOURCE_OF_TRUTH.md` was created

### Runtime truthfulness restored

- neural bridge behavior was corrected so broken inference no longer looked healthy
- CLI tournament output paths were aligned with real files
- bridge configuration stopped depending on a single hardcoded Python path

### Dataset validation upgraded

`ml/export_dataset_check.py` was upgraded from a shallow field check into a real health gate:

- row count
- unique FEN ratio
- unique best move ratio
- result distribution
- failure on large collapsed datasets

### Training provenance upgraded

`ml/train.py` was upgraded to write durable provenance:

- `lab/runs/<run_id>/manifest.json`
- `lab/runs/<run_id>/training_epochs.csv`
- `models/latest_run.json`
- dataset SHA256 and summary statistics

## Phase 4 - New Dataset Incubator

The teacher generator was then reworked to break the repeated-trajectory problem.

Key changes:

- reproducible seeding
- guided opening exploration
- alternating starting player
- draw handling instead of misleading unfinished states
- dataset manifest output in `lab/datasets/teacher_manifest.json`

The result was the first V2 birth-quality dataset:

- frozen dataset: `lab/datasets/teacher_v2_baby_source_seed42_g12.jsonl`
- manifest: `lab/datasets/teacher_v2_baby_source_seed42_g12.manifest.json`

Frozen dataset stats:

- rows: `1278`
- unique FEN: `1241`
- unique best move: `656`
- results:
  - `1-0`: `344`
  - `0-1`: `363`
  - `1/2-1/2`: `571`

This is the first dataset in the current workspace that passed the V2 health check and is considered fit to seed a clonable baby.

## Phase 5 - Birth Of Baby V2

After freezing the dataset, a fully traceable training run was executed.

Canonical run:

- run id: `run_20260417_001525_baby_v2_seed42_g12`
- run dir: `lab/runs/run_20260417_001525_baby_v2_seed42_g12`
- registry: `models/latest_run.json`

Training summary:

- seed: `42`
- epochs: `20`
- batch size: `64`
- lr: `3e-4`
- value weight: `0.2`
- device: `cuda`
- best loss: `0.864146522113255`

Canonical active outputs:

- `models/best.pt`
- `models/latest.pt`
- `models/latest_run.json`

## Phase 6 - Benchmark Truth Recovery

After the V2 cleanup and Baby V2 birth, the lab entered a benchmark-truth recovery phase.

Key results:
- benchmark contamination tracking was added
- deterministic benchmark modes were introduced
- purity violations became visible instead of silently hidden
- runtime / model / vocab / dataset provenance became materially clearer

## Phase 7 - Runtime Setup Safety Recovery

The next phase focused on runtime initialization safety.

Key results:
- invalid initial placements fail fast
- out-of-bounds placement is rejected
- duplicate spawn collisions are rejected

## Phase 8 - True-Chess Recovery

The project then shifted from a chess-like runtime toward a more faithful chess ruleset.

Recovered rule families in the active runtime:
- castling
- en passant
- explicit underpromotion
- fifty-move rule
- threefold repetition
- insufficient material detection

The hard turn cap was preserved only as a lab safety stop and separated from official chess draw truth.

## Phase 9 - Conversion Recovery

After benchmark truth and true-chess recovery, the project entered its current phase:

**conversion recovery**

The dominant problem is now:
- long sterile non-conversion
- too many games surviving to turn limit
- neural underperformance versus baselines
- likely selector/search passivity in near-equal positions

Current practical patch priority:
1. `src/chess/search.rs`
2. `src/agents/neural_agent.rs`
3. `ml/train.py`

## Phase 10 - Pedagogy Curation Layer And Dataset Pointer Split

A pedagogy curation layer was introduced inside the active repo:

- `lab/pedagogy_db/candidate_games_for_triage.csv`
- `lab/pedagogy_db/triaged_pedagogy_candidates.csv`
- `lab/pedagogy_db/promoted_pedagogy_pack.csv`

This established a real curation workflow shape:

- candidate compilation artifact
- triage materialization artifact
- promoted pack artifact

At the same time, the repo introduced a canonical active dataset pointer:

- `lab/ACTIVE_DATASET.txt`

And the training path was updated so that:

- explicit `--input` remains authoritative
- otherwise `ml/train.py` falls back through `ml/dataset_loader.py` to `lab/ACTIVE_DATASET.txt`

This created an important new truth boundary.

The current pointed artifact may be a promoted pedagogy curation CSV.

But the active training loader still expects teacher-style row data with fields such as:

- `fen`
- `best_move`
- `result` or `engine_eval`
- optional `legal_moves`
- optional `top_moves`
- optional `top_scores`

A direct runtime attempt exposed the boundary:
the active pointer resolved correctly, but the train path still attempted JSON row parsing, confirming that curation tables and train-consumable ML datasets are still distinct under the current contract.

So the project discovered a critical distinction:

**promoted pedagogy curation CSV != trainable ML dataset**

This is now an active operational truth, not a theoretical nuance.

Historical consequence:
- active marker discipline improved
- provenance improved
- but pointer truth and train-contract truth must now be kept separate unless conversion or loader evolution closes the gap

## Phase 11 - Search Maturation And AAA Runtime Bridge

Around `2026-04-22`, the project moved through a combined runtime and ML-pipeline update.

This phase had two parallel tracks:

- stronger, more conversion-oriented Rust search
- first complete AAA signal path from decision traces to teacher export, dataset loading, and training

Confirmed search/runtime changes:

- `src/chess/search.rs` now contains a more credible search core
- root search exposes `RootSearchResult`, `RootSearchDiagnostics`, and `DecisionMetrics`
- search uses iterative depth, adaptive depth, TT bounds, TT best-move ordering, killer moves, history heuristic, quiescence, LMR-style reductions, and TT pruning
- conversion-oriented logic is explicit through `draw_score(...)`, `progress_move_score(...)`, `is_conversion_move(...)`, `shuffle_penalty(...)`, and `ROOT_PRACTICAL_MARGIN`
- root diagnostics now track richer counters and alternatives

Confirmed AAA bridge changes:

- `src/chess/decision.rs` exists
- decision traces are represented through `DecisionMode` and `DecisionTrace`
- teacher export uses `choose_best_action_with_trace(...)`
- exported teacher rows can include `aaa_alt_moves`, `aaa_alt_decision_scores`, `aaa_confidence`, and `aaa_used_search`
- `ml/dataset_loader.py` validates and consumes AAA fields
- `ml/train.py` records AAA dataset stats and weights policy loss by `aaa_confidence`
- `ml/export_dataset_check.py` is aware of AAA metadata

The important conceptual shift:

```text
the teacher no longer only exports a best move;
it can now export alternatives, decision scores, confidence, and whether search was used
```

The honest status is:

```text
DEPLOY WITH RESERVATIONS
```

because the wiring exists and obvious safety risks were reduced, but the value of the AAA signal still needs durable A/B validation.

Important caveats:

- the structural search ceiling remains `engine.clone() -> apply_action()`
- there is not yet a true `make_move / unmake_move` runtime architecture
- `StrategicState -> PolicyWeights -> Search modulation -> Root arbitration` is the clarified next doctrine, not fully implemented code
- conversion tuning looks directionally useful, but still needs repeated benchmark proof

Canonical detail doc:

- `MASTER_DOCS/AAA_RUNTIME_UPDATE.md`

## Phase 12 - AAA Operational Visibility And First Cautious A/B

On `2026-04-23`, the project moved AAA from "wired and alive" to "measurable enough for cautious validation".

This was not a redesign phase. The work stayed focused on operational visibility, isolated experiment control, and a first small A/B training comparison.

Confirmed operational visibility improvements:

- teacher exports can now report AAA summary stats in their manifest
- dataset checks report:
  - `aaa_rows`
  - `aaa_status`
  - `aaa_used_search_proportion`
  - average valid AAA alternatives per AAA row
  - `aaa_alt_unmapped`
  - skipped `best_move` vocabulary mismatches
  - average AAA confidence
- training summaries/manifests distinguish AAA influence being enabled from AAA signal actually being present
- `aaa_alt_search_scores` is explicitly treated as diagnostic-only
- non-AAA rows remain backward compatible

Small experiment-control additions:

- `TCS_TEACHER_OUTPUT_DIR` allows isolated teacher exports without overwriting canonical `lab/datasets/*`
- `TCS_MODEL_DIR` allows isolated training artifacts without overwriting `models/best.pt`, `models/latest.pt`, or `models/latest_run.json`

First completed AAA A/B validation:

- dataset: `lab/datasets/aaa_ab_validation_small_20260423/teacher_samples.jsonl`
- export settings:
  - `teacher_uci 5`
  - `TCS_TEACHER_DEPTH=3`
  - `TCS_TEACHER_MAX_TURNS=50`
  - `TCS_DATASET_SEED=4343`
- dataset profile:
  - rows: `240`
  - loaded samples: `235`
  - AAA rows: `23`
  - loaded AAA samples: `21`
  - AAA used-search proportion: `1.0000`
  - average valid AAA alternatives per AAA row: `2.8696`
  - AAA alternative unmapped count: `3`
  - skipped best-move vocabulary mismatches: `5`
  - average AAA confidence: about `0.8536`
  - AAA status: `usable`

Controlled A/B training comparison:

- seed: `777`
- batch size: `64`
- lr: `3e-4`
- value weight: `0.2`
- conversion focus weight: `1.25`
- only changed toggle: `TCS_DISABLE_AAA_INFLUENCE`

Observed results:

- 1 epoch:
  - AAA disabled: total `2.9272`, policy `2.9159`, value `0.0565`
  - AAA enabled: total `2.8692`, policy `2.8578`, value `0.0569`
- 3 epochs:
  - AAA disabled: total `1.5246`, policy `1.5225`, value `0.0104`
  - AAA enabled: total `1.4942`, policy `1.4921`, value `0.0105`

Interpretation:

```text
AAA is stable and directionally promising on this small controlled run.
AAA is not yet proven useful at full model-selection strength.
```

The policy loss improved consistently with AAA enabled, while value loss stayed effectively neutral. No NaN or training instability was observed.

Important caveats:

- the validation dataset is small
- all generated games in this export ended as draws
- this proves pipeline stability and a promising training signal, not playing-strength improvement
- stronger validation still needs larger, more diverse AAA-populated datasets and repeated runs

Current recommendation:

```text
KEEP AAA ENABLED WITH GUARDRAILS
```

## Phase 13 - Engine Runtime Cost Audit And Repetition-Key Reduction

After AAA became operationally visible, the next runtime ceiling was audited cautiously.

The initial suspicion was that recursive search was still dominated by full `Engine` cloning. The audit refined that picture:

- the recursive search hot path already uses `simulate_action_for_search(...)` / `undo_action_for_search(...)`
- there is still a root-level `engine.clone()` for caller isolation
- per-child full-engine cloning is not the dominant measured cost
- snapshot cost for units/captures/rook state is low in the current probe
- null move overhead is negligible in the current probe
- the dominant measured cost inside search simulate/undo was FEN/repetition bookkeeping

Runtime instrumentation was added to expose:

- move simulation count
- move undo count
- null move simulation/undo count
- snapshot nanos
- apply nanos
- restore nanos
- repetition/FEN nanos
- capture and castling-rook snapshot counts

The first targeted runtime patch was:

```text
SearchMoveUndo.fen_after
```

This changed search undo behavior so that:

- `simulate_action_for_search(...)` computes the post-move repetition key once
- that key is stored in the search undo payload
- `undo_action_for_search(...)` decrements `repetition_counts` using the stored key
- undo no longer recomputes the same post-move FEN

A focused regression test now verifies that simulate+undo restores:

- FEN
- repetition counts
- action log length

The second targeted runtime patch kept repetition semantics identical but made the existing FEN builder cheaper:

- `engine_to_fen(...)` now uses a fixed stack board array instead of heap-allocating nested vectors
- empty-square run lengths are emitted directly as digit chars instead of allocating temporary strings
- the current FEN/repetition-key shape is locked by a regression test

Important semantic caveat:

```text
The current repetition key is still the existing simplified FEN string:
board + side-to-move + constant " - - 0 1".
```

The patch did not introduce a new chess repetition truth model. It preserved the current one.

Measured debug probe direction after the second patch:

- move simulate/undo total dropped materially versus the pre-patch instrumentation state
- simulate-side repetition/FEN cost dropped, but still remains the largest measured component
- the next larger step would be a real repetition-key strategy, likely hash-based or incrementally maintained, and should be treated as a separate design PR

Current runtime recommendation:

```text
KEEP THE TARGETED FEN PATCHES.
DO NOT START A BROAD MAKE/UNMAKE REWRITE YET.
NEXT PERF STEP SHOULD BE A DEDICATED REPETITION-KEY DESIGN PR ONLY IF MEASUREMENT STILL JUSTIFIES IT.
```

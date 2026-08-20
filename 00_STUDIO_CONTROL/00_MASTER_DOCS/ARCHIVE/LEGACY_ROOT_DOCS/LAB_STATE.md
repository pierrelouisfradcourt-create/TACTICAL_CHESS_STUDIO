# LAB STATE

## Operational Truth

- Branch: `strength-recovery-v1`
- Runtime model: `models/latest.pt`
- Best retained model: `models/best.pt`
- Training registry: `models/latest_run.json`
- Active dataset pointer: `lab/ACTIVE_DATASET.txt`
- Active dataset value: `lab/pedagogy_db/promoted_pedagogy_pack.jsonl`
- Latest retained training run: `lab/runs/run_20260422_162007_promoted_pedagogy_v1`
- Latest AAA validation runs:
  - `lab/runs/run_20260423_121341_aaa_ab_smoke_A_disabled`
  - `lab/runs/run_20260423_121411_aaa_ab_smoke_B_enabled`
  - `lab/runs/run_20260423_121536_aaa_ab_short_A_disabled`
  - `lab/runs/run_20260423_121608_aaa_ab_short_B_enabled`
- Latest isolated AAA validation dataset: `lab/datasets/aaa_ab_validation_small_20260423/teacher_samples.jsonl`
- Latest retained benchmark folder: `lab/experiments/exp_003_aggressive`
- Latest engine-runtime focus: search simulate/undo repetition-key cost reduction
- Latest runtime probe: `cargo test engine_runtime_profile_probe -- --nocapture`

## Hot Assets

- `src/`
- `ml/`
- `memory_core/`
- `models/latest.pt`
- `models/best.pt`
- `models/latest_run.json`
- `lab/pedagogy_db/promoted_pedagogy_pack.jsonl`
- `lab/datasets/teacher_samples.jsonl`
- `lab/datasets/teacher_tactical.jsonl`
- `lab/datasets/teacher_finisher.jsonl`
- `lab/datasets/teacher_solid.jsonl`
- `lab/datasets/teacher_positional.jsonl`
- `lab/datasets/aaa_ab_validation_small_20260423/teacher_samples.jsonl`
- `lab/runs/run_20260422_162007_promoted_pedagogy_v1`
- `lab/runs/run_20260423_121536_aaa_ab_short_A_disabled`
- `lab/runs/run_20260423_121608_aaa_ab_short_B_enabled`
- `lab/experiments/exp_003_aggressive`
- `stockfish.exe.exe`

## Archived Cold Assets

- Models archive: `archive/models/`
- Runs archive: `archive/runs/`
- Datasets archive: `archive/datasets/`
- Benchmarks archive: `archive/benchmarks/`

## Notes

- `lab/pedagogy_db/promoted_pedagogy_pack.csv` is curation metadata and is not trainable under the current loader contract.
- `ml/experiment_runner.py` now defaults to the active promoted pedagogy JSONL so new experiments do not point at a missing legacy dataset.
- First-pass cleanup was archive-only. No assets were deleted.
- AAA is now operationally visible in export/check/train summaries.
- First cautious AAA A/B showed stable training and a small consistent policy-loss improvement with AAA enabled, but the dataset was small and draw-only.
- Current AAA recommendation: `KEEP AAA ENABLED WITH GUARDRAILS`.
- Recursive search now uses measured simulate/undo diagnostics for move application cost.
- The old suspected full-clone ceiling was refined: root-level `engine.clone()` remains, but per-child search is already simulate/undo.
- Search undo no longer recomputes the post-move FEN for repetition bookkeeping; `SearchMoveUndo` stores the post-move key.
- The current FEN/repetition key builder was optimized without changing its output format.
- Current measured runtime truth: FEN/repetition bookkeeping is still the largest visible simulate-side cost, but the safe local reductions have already been applied.
- Next engine perf step should be a dedicated repetition-key design PR only if further measurement justifies moving beyond the current simplified FEN string.

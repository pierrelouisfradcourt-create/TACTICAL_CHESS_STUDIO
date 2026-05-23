# Benchmark Ledger

Only entries with local files or local manifests belong here.

## Current protocol

- Official launcher: `scripts/run_benchmark.ps1`
- Runtime repair helper: `scripts/python_runtime.ps1`
- Observable output: `benchmark_runner.py` prints `BENCHMARK_*` lines and refreshes `lab/reports/latest_benchmark_summary.json`
- Hard failure rule: if `lab/tournaments/benchmark_status.csv` reports contamination, the benchmark run is invalid
- Summary artifact: `lab/reports/latest_benchmark_summary.json`
- Every benchmark summary must record:
  - `run_classification`
  - `promotion_eligible`
  - `benchmark_status_source`

## Timeout behavior

- Default: no timeout (the Rust tournament runs until completion or manual interruption).
- Optional: pass `-TimeoutSeconds` through `scripts/run_benchmark.ps1` to fail the run if it exceeds the time budget.
- `-TimeoutSeconds` only applies to the Rust tournament execution; it is ignored when `-SummarizeOnly` is set.
- Timeout persistence is working in the current wrapper flow.

## Current operational rule

- Use `exploration_only` unless a run is intentionally being used as promotion evidence.
- Only runs marked `promotion_eligible` and free of contamination are allowed to present as promotion-grade.
- Latest committed summary artifact is authoritative even when the run failed.

## 2026-04-25

State:
- benchmark summary artifact: `lab/reports/latest_benchmark_summary.json`
- benchmark dir: `lab/smoke_benchmark/tournaments/`

Protocol:
- smoke benchmark
- `run_classification=exploration_only`
- `promotion_eligible=false`

Result:
- `benchmark_status=failed`
- `games=2`
- `timeout_seconds=null`
- partial file found:
  - `moves_detailed.csv`
- `error=[Errno 22] Invalid argument`
- `timeout_status=false`

Conclusion:
- the latest committed benchmark truth is currently a failed smoke run
- this artifact overrides older ledger language that implied the latest smoke surface was clean success
- no strength claim is supported by this artifact

## 2026-04-22

State:
- benchmark folder: `lab/experiments/exp_003_aggressive/tournaments/`
- tournament surface also visible in `lab/tournaments/`

Protocol:
- four-agent benchmark
- agents present in result table:
  - `heuristic`
  - `hybrid`
  - `random`
  - `neural`
- purity ledger reports no contamination

Result:
- heuristic: `1341.65`
- hybrid: `1264.66`
- random: `1167.90`
- neural: `1025.79`

Conclusion:
- neural is operational but clearly weakest in the retained benchmark snapshot
- benchmark truth is usable
- strength recovery is still unfinished

## 2026-04-23

State:
- dataset: `lab/datasets/aaa_ab_validation_small_20260423/teacher_samples.jsonl`
- runs:
  - `lab/runs/run_20260423_121536_aaa_ab_short_A_disabled`
  - `lab/runs/run_20260423_121608_aaa_ab_short_B_enabled`

Protocol:
- same dataset
- same seed `777`
- same 3-epoch short training setup
- only toggle changed: AAA influence disabled vs enabled

Result:
- AAA disabled best loss: `1.5245740115642548`
- AAA enabled best loss: `1.4942253232002258`
- dataset fitness for AB: rejected
- reasons:
  - `no_white_wins`
  - `no_black_wins`
  - `result_distribution_skewed`

Conclusion:
- this is exploratory evidence only
- AAA looked directionally helpful on loss
- this run is not promotion-grade proof

## 2026-04-24

State:
- benchmark summary artifact: `lab/reports/latest_benchmark_summary.json`
- benchmark dir: `lab/smoke_benchmark/tournaments/`

Protocol:
- smoke benchmark via `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Smoke -RunClass exploration_only`
- bounded surface for daily validation
- 2 games
- 40-turn cap
- isolated output under `lab/smoke_benchmark/tournaments/`

Result:
- `benchmark_invalid=false`
- `contaminated_match_count=0`
- `purity_violation_total=0`
- `completed_games=2`
- `capped_games=2`
- `avg_turns=40.0`
- `fallback_used=false`
- `inference_confirmed=true`
- matchup result: `2 draws`

Conclusion:
- smoke benchmark is usable as a bounded bridge-health check
- smoke gameplay still does not prove conversion strength
- no broad Elo or strength claim is supported by this result
- this entry is historical and does not override the later failed summary dated 2026-04-25

State:
- audit file: `lab/reports/conversion_audit_20260424.md`

Protocol:
- audit active promoted pedagogy dataset for true conversion rows

Result:
- active pack rows: `1227`
- conversion-tagged rows: `263`
- opening-ply conversion-tagged rows: `60`
- extracted conservative late conversion candidates: `36`

Conclusion:
- the conversion label is semantically dirty inside the active promoted pack
- conversion work should not trust current row labels blindly

State:
- conversion suite report: `lab/reports/conversion_suite_v1_latest.md`

Protocol:
- `cargo run -- conversion_suite N` (writes `conversion_suite_v1_latest.*`)
- do not treat as Elo; treat as conversion-focused regression surface

Result:
- latest committed JSON artifact now reports:
  - total: `5`
  - improved: `5`
  - stagnated: `0`
  - regressed: `0`

Conclusion:
- conversion metrics are now meaningful and observable
- still no broad Elo claim

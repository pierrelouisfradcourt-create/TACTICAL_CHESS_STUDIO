# Reprise Prompt

Read this first if you are resuming the project.

## Project

This repo is a chess engine plus ML lab.
Rust is runtime truth.
Python is dataset, training, and inference truth.

## Start here

Read in this order:
1. `MASTER_DOCS/00_EXEC_SUMMARY.md`
2. `MASTER_DOCS/01_CURRENT_STATE.md`
3. `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
4. `MASTER_DOCS/03_KNOWN_ISSUES.md`
5. `MASTER_DOCS/04_BENCHMARK_LEDGER.md`
6. `MASTER_DOCS/05_ARCHITECTURE.md`
7. `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
8. `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
9. `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
10. code only after that

## Current truth

- Active repo: `TacticalChessPureLab`
- Current automation consolidation is merged through PR #138.
- Passive runtime boundaries merged: `SearchBackend` (PR #129), `PolicyGuide` (PR #132), `DecisionController` (PR #133), `TacticalEnv` (PR #137).
- Guard hardening merged: PR #134 and PR #135.
- Forensic auto-merge marker merged: PR #138 (`AUTO_MERGED_BY_GUARD`).
- PR #136 is closed as stale duplicate.
- Open PR verification target is zero open PRs before resuming new bounded tasks.
- Local tracked noise may exist at `lab/reports/latest_benchmark_summary.json`; keep it out of docs/control commits.
- Current verdict defaults: preserve `software_verdict`, `evidence_verdict`, and `claim_verdict`; keep `claim_verdict: NO_CLAIM_ALLOWED`.
- No control-plane/docs/runtime-scaffolding work creates scientific/performance/strength claims.

## What works

- Legal chess runtime
- Search with simulate/undo inside the tree
- Neural bridge with startup handshake and health check
- Dataset loader and training path
- AAA signal wiring from teacher export to training

## What is not settled

- Conversion strength
- Semantic cleanliness of conversion labels
- Full value of AAA influence
- Long-term search ceiling
- How much of the autobattler / tactical-card roadmap should become implementation work, and when

## Do not waste time on

- rewriting project history again
- product fantasy
- RL / MCTS moonshots
- broad architecture redesign
- claims that AAA is supported as strength evidence
- claims that the neural agent is already strong

Allowed memory use:
- External discussions and idea dumps can be mined for constraints and direction.
- Do not treat them as truth unless code or committed artifacts confirm them.
- The last ~10% of `C:\Users\wazou\Desktop\grosgpt.txt` is especially noisy/repetitive; prefer earlier occurrences and concrete repo-verifiable claims.

## Where truth lives

- Runtime truth: `src/`
- ML truth: `ml/`
- Active data and runs: `lab/`, `models/`
- Benchmark truth: `lab/reports/latest_benchmark_summary.json`
- Smoke benchmark surface: `lab/smoke_benchmark/tournaments/`
- Benchmark launcher: `scripts/run_benchmark.ps1`
- Runtime helper: `scripts/python_runtime.ps1`
- Benchmark summary artifact: `lab/reports/latest_benchmark_summary.json`
- Search profiling report: `lab/reports/search_profile_latest.json`
- SSOT docs: `MASTER_DOCS/00..11` plus the named architecture/control docs listed above
- Historical material: `MASTER_DOCS/ARCHIVE/`

## Safe resume protocol

Use this order every time:

1. Check local tracked noise first:
   - `git status --short`
   - if `lab/reports/latest_benchmark_summary.json` is dirty, do not stage/revert/stash it in docs lanes.
2. Verify local base against remote:
   - `git fetch origin --prune`
   - `git rev-parse main`
   - `git rev-parse origin/main`
   - if diverged, rebase or recreate a clean branch/worktree from `origin/main`.
3. Verify expected PR truth for the active automation baseline:
   - PR #129, #132, #133, #134, #135, #137, #138 merged
   - PR #136 closed
   - no open PRs expected unless a new bounded lane is active
4. For passive runtime boundaries only, use `scripts/auto_merge_guard.py` with dry-run first.
5. Never auto-merge PRs that modify `scripts/auto_merge_guard.py` or other protected control-plane scripts.
6. Keep verdict block explicit in PR bodies and keep `claim_verdict: NO_CLAIM_ALLOWED`.

## Next best move

If you are here for the automation/evidence-plane work, do this first:

1. Complete the safe resume protocol above.
2. Read `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md`.
3. Use guard-driven flow for passive boundaries only.
4. Keep control-plane script PRs on manual merge paths.
5. Keep each task bounded to one branch, one diff, one report, and one human decision surface.
6. Next recommended runtime lane: add passive `InitialStateFactory` boundary for 960-readiness prep.

If automation/evidence-plane work is explicitly paused, work on one of these only:

1. conversion benchmark discipline
2. search behavior in non-converting positions
3. semantic cleanup of conversion rows in the active promoted dataset
4. replace or redesign the current fast benchmark for daily iteration
5. if doing architecture/product recovery, keep it in roadmap/idea-dump docs until a dedicated implementation branch exists

For a browser GPT-5.5 handoff, use:

- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`

Fast sanity commands:
- `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Smoke -RunClass exploration_only`
- `cargo run -- conversion_suite 5`

## Rule

If docs disagree with code, code wins.

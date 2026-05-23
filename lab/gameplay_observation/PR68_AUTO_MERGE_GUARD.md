# PR68 Auto Merge Guard

## Why this exists
- `scripts/auto_merge_guard.py` adds a local, fail-closed guard for bounded PR automation.
- It is a mechanical gate only. It prevents unsafe or ambiguous PRs from being merged by automation.
- Default mode is report-only dry run. Merge is never attempted unless `--allow-merge` is provided.

## What it can auto-merge
- Only PRs that pass all gates:
1. explicit `--allow-merge`
2. PR state `OPEN`
3. `mergeable == MERGEABLE`
4. `headRefOid == --expected-head`
5. all checks passed
6. no pending checks
7. no failed checks
8. changed files remain inside the passive allowlist
9. title starts with `runtime: Add passive`, `automation:`, or `docs:`
10. no forbidden file paths
11. PR body claim verdict remains `NO_CLAIM_ALLOWED`
12. PR body includes `software_verdict`, `evidence_verdict`, and `claim_verdict`

## What it must never auto-merge
- Any PR touching forbidden paths such as:
  - `src/chess/search.rs`
  - `src/chess/root_decision.rs`
  - `src/chess/decision.rs`
  - `src/engine/**`
  - `src/agents/**`
  - `ml/**`
  - `.github/**`
  - `lab/reports/latest_benchmark_summary.json`
  - `lab/runs/**`
  - `latest.json`
- Any PR with behavior-risk signals in title/body/files.
- Any PR with missing/failed/pending checks.
- Any PR with head mismatch or non-open/non-mergeable state.

## Why GPT/Codex cannot approve claims
- This guard is not scientific validation. It only checks metadata, checks status, and file scope.
- It cannot prove strength, Elo, promotion, or research-grade conclusions.
- Final claim authority remains human-only. `claim_verdict` is fixed to `NO_CLAIM_ALLOWED`.

## SAFE_AUTO_MERGE examples
- `automation: tighten docs PR hygiene output`
  - Files only in `scripts/prepare_docs_update_pr.py` and docs markdown
  - checks all passed
  - head matches expected SHA
- `docs: refresh PR gate instructions`
  - Files only in `README.md`, `MASTER_DOCS/**`, `lab/gameplay_observation/PR*.md`
  - required body verdicts present and claim verdict unchanged

## STOP_HUMAN_REQUIRED examples
- `runtime: tune root decision search ordering`
  - touches `src/chess/root_decision.rs`
  - blocked with `AUTO_MERGE_BLOCKED_FORBIDDEN_PATH`
- `automation: update workflow and engine defaults`
  - touches `.github/**` or `src/engine/**`
  - blocked forbidden path and behavior risk
- `runtime: Add passive ...` with pending CI
  - blocked until checks are fully complete and passed

## Validation
- `.\.venv312\Scripts\python.exe -m py_compile scripts/auto_merge_guard.py`
- `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --help`

## Risks
- `gh` output/semantics can evolve and require parser updates.
- Conservative behavior-risk keywords may block some truly safe PRs.
- This is intentionally fail-closed to avoid silent behavior change merges.

## Verdicts
- software_verdict: AUTO_MERGE_GUARD_ADDED
- evidence_verdict: MECHANICAL_PR_GATE_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

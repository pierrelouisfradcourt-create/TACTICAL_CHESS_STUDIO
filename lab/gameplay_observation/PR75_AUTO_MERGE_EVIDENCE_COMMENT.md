# PR75 Auto-Merge Evidence Comment

## Why this exists
`auto_merge_guard.py` previously used the same `gh pr merge --merge --match-head-commit` path a human can run manually. That made successful merges difficult to attribute forensically when auditing historical PR events.

## How this fixes forensic ambiguity
When `--allow-merge` is set and all gates pass, the guard now requires a pre-merge top-level PR comment containing the durable marker `AUTO_MERGED_BY_GUARD` plus merge context fields:

- `pr_number`
- `expected_head`
- `actual_head`
- `changed_files`
- `checks_passed`
- `checks_pending`
- `checks_failed`
- `checks_skipped`
- `software_verdict_before_merge`
- `evidence_verdict`
- `claim_verdict`
- `merge_result`

The guard fails closed before merge if comment creation fails, preventing untraceable auto-merges.

## Why guard-modifying PRs still require manual merge
Protected control-plane policy is unchanged. PRs that modify `scripts/auto_merge_guard.py` remain blocked by `PROTECTED_CONTROL_PLANE_SCRIPT_CHANGED`, so this PR cannot be auto-merged and requires manual merge.

## Validation
Commands run:

- `.\.venv312\Scripts\python.exe -m py_compile scripts/auto_merge_guard.py`
- `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 137 --expected-head f12b9e1ee88e7f3a00c140dc7f6dce40239370c8 --pretty`
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`

Results summary:

- Python compile passed.
- Guard dry-run report emitted new fields: `evidence_comment_required`, `evidence_comment_attempted`, `evidence_comment_result`.
- Guard run against merged PR137 stayed dry-run and did not merge.
- Workspace/documentation hygiene scripts passed for this scope (with pre-existing local tracked noise in `lab/reports/latest_benchmark_summary.json`).
- `cargo check` passed.
- `cargo test fen_round_trip -- --nocapture` passed.
- `cargo test root_decision -- --nocapture` passed.

## Risks
- Behavior risk: Low. Change is limited to automation control-plane merge flow and comment emission.
- Evidence risk: Low. Pre-merge comment requirement improves attribution and fails closed if evidence cannot be recorded.
- Claim risk: Low. No performance/strength/scientific claim logic introduced.

software_verdict: AUTO_MERGE_EVIDENCE_COMMENT_ADDED
evidence_verdict: MECHANICAL_PR_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED

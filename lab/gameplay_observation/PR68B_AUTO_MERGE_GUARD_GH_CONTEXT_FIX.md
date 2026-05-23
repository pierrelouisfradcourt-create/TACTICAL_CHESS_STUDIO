# PR68B Auto Merge Guard GH Context Fix

## Original failure
- First PR69 dry-run showed `gh` worked directly for PR `#129`, but guard output had empty PR fields:
  - `actual_head: ""`
  - `title: ""`
  - `state: ""`
  - `changed_files: []`
- This caused fail-closed blocks with misleading extra conclusions such as `EXPECTED_HEAD_MISMATCH` and title/state-related gate failures even when PR metadata was not actually read.

## Fix added
- Added optional CLI argument:
  - `--repo <owner/name>`
- Added GH command builder so all GH calls include `--repo` when provided:
  - `gh pr view`
  - `gh pr checks`
  - `gh pr diff`
  - `gh pr ready`
  - `gh pr merge`
- Added JSON diagnostics fields:
  - `gh_view_returncode`
  - `gh_view_stderr`
  - `gh_checks_returncode`
  - `gh_checks_stderr`
  - `gh_diff_returncode`
  - `gh_diff_stderr`
- Kept fail-closed behavior, but changed reason derivation to avoid fabricated conclusions:
  - If view read fails, only view-failure reasons are emitted (plus parse error if present); no state/title/head/body verdict assumptions.
  - If checks read fails, emits `PR_CHECKS_FAILED` only; no synthetic `CHECKS_FAILED` unless parsed checks actually fail.
  - If diff read fails, emits `PR_DIFF_FAILED` only; no changed-file safety conclusions are invented.
- Added clearer software verdict routing:
  - `AUTO_MERGE_BLOCKED_GH_READ_FAILURE`
  - `AUTO_MERGE_BLOCKED_BODY_VERDICTS`
  - `AUTO_MERGE_BLOCKED_FORBIDDEN_PATH`
  - `AUTO_MERGE_BLOCKED_BEHAVIOR_RISK`
  - `AUTO_MERGE_READY_DRY_RUN`
  - `AUTO_MERGE_COMPLETED`
  - `AUTO_MERGE_BLOCKED_GUARD`

## PR129 dry-run without repo
- Command:
  - `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --pr 129 --expected-head 058eb6007ea1a8015ca7e99b5a0a8863dec40caa --pretty`
- Result:
  - GH config access failed in sandbox context.
  - Guard now reports only:
    - `PR_VIEW_FAILED`
    - `PR_CHECKS_FAILED`
    - `PR_DIFF_FAILED`
  - No fabricated `EXPECTED_HEAD_MISMATCH`, `PR_NOT_OPEN`, `TITLE_PREFIX_NOT_ALLOWED`, or mergeability mismatch.
  - `software_verdict: AUTO_MERGE_BLOCKED_GH_READ_FAILURE`

## PR129 dry-run with repo
- Command:
  - `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 129 --expected-head 058eb6007ea1a8015ca7e99b5a0a8863dec40caa --pretty`
- Result:
  - GH reads succeed (`gh_*_returncode == 0`).
  - Guard reads expected PR fields:
    - `state: OPEN`
    - `mergeable: MERGEABLE`
    - `actual_head: 058eb6007ea1a8015ca7e99b5a0a8863dec40caa`
    - `title: runtime: Add passive SearchBackend boundary`
  - Remaining block reasons are now data-driven from actual PR content/diff/body.

## Validation commands run
- `.\.venv312\Scripts\python.exe -m py_compile scripts/auto_merge_guard.py`
- `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --pr 129 --expected-head 058eb6007ea1a8015ca7e99b5a0a8863dec40caa --pretty`
- `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 129 --expected-head 058eb6007ea1a8015ca7e99b5a0a8863dec40caa --pretty`
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`

## Verdicts
- software_verdict: AUTO_MERGE_GUARD_GH_CONTEXT_FIXED
- evidence_verdict: MECHANICAL_PR_GATE_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

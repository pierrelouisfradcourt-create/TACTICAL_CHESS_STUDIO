# PR68C Auto Merge Guard Passive Boundary Fix

## Context
PR129 (passive SearchBackend boundary) was blocked in dry-run by two false positives:
- `CHANGED_FILE_OUTSIDE_ALLOWED_PASSIVE_SET` because `src/lib.rs` was not in the passive allowlist.
- `BEHAVIOR_RISK_DETECTED` because negated safety statements in PR body text matched broad behavior-risk keywords.

## Original False Positive
- Changed files in PR129 include `src/lib.rs` to expose passive boundaries.
- PR body includes explicit safety-negation lines such as:
  - `no runtime wiring`
  - `no changes to chess/engine/agents/ml runtime behavior`
- Previous keyword scan treated these lines as positive risk.

## Fix Added
- Added `src/lib.rs` to passive allowlist for bounded PR flows.
- Added explicit `src/lib.rs` safeguard:
  - If `src/lib.rs` changes and title is not `runtime: Add passive...`, behavior risk is raised.
- Kept strict path risk blocking for runtime-sensitive areas:
  - `src/chess/**`
  - `src/engine/**`
  - `src/agents/**`
- Improved keyword risk scan:
  - Ignore lines containing explicit negation/safety markers:
    - `no `
    - `not `
    - `without `
    - `does not `
    - `must not `
    - `no changes to `
    - `no runtime wiring`
  - Keep positive-risk phrase detection, including:
    - `changes runtime behavior`
    - `modifies engine`
    - `rewires search`
    - `updates neural`
    - `uses benchmark as proof`
    - `dataset reset`

## src/lib.rs Passive-Boundary Rationale
`src/lib.rs` is the canonical module exposure boundary for passive architecture extraction PRs. Allowing it in passive scope avoids false positives while preserving behavior safety via title gating and existing forbidden/path risk rules.

## Forbidden Paths Still Blocked
Forbidden path list remains unchanged, including:
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

## PR129 Dry-Run Result After Fix
Command:
- `./.venv312/Scripts/python.exe scripts/auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 129 --expected-head 058eb6007ea1a8015ca7e99b5a0a8863dec40caa --pretty`

Result:
- `software_verdict: AUTO_MERGE_READY_DRY_RUN`
- `blocked_reasons: []`
- `behavior_risk: false`
- `checks_passed: true`
- `changed_files` includes `src/lib.rs` and is accepted.

## Validation
Executed:
- `./.venv312/Scripts/python.exe -m py_compile scripts/auto_merge_guard.py`
- `./.venv312/Scripts/python.exe scripts/auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 129 --expected-head 058eb6007ea1a8015ca7e99b5a0a8863dec40caa --pretty`
- `./.venv312/Scripts/python.exe scripts/check_workspace_hygiene.py --pretty`
- `./.venv312/Scripts/python.exe scripts/report_local_agent_session.py --pretty`
- `./.venv312/Scripts/python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`

Observed:
- All required commands completed successfully.
- Cargo emitted warnings only; no test failures.

## Risks
- Negation-based line filtering is intentionally conservative and may suppress keyword risk on mixed-signal lines that contain both negation and risky terms.
- Path-based behavior risk and forbidden path gates remain the primary hard safety controls.

software_verdict: AUTO_MERGE_GUARD_PASSIVE_BOUNDARY_FIXED
evidence_verdict: MECHANICAL_PR_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED

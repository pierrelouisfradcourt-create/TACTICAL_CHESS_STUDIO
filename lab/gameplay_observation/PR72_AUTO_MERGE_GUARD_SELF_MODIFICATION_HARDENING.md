# PR72 Auto Merge Guard Self Modification Hardening

## Audit Finding

A deep audit found that `scripts/auto_merge_guard.py` was listed in `ALLOWED_PASSIVE_PATTERNS`. That meant a PR modifying the auto-merge guard policy could potentially be classified as auto-merge eligible by the same guard whose policy it changed.

This is a control-plane policy gap. A guard must not approve changes to itself or adjacent merge/security automation scripts. Those changes can be valid manual PRs, but they require human review before merge.

## Policy Change

`scripts/auto_merge_guard.py` is no longer in the passive auto-merge allowlist.

Protected control-plane script patterns are now:

- `scripts/auto_merge_guard.py`
- `scripts/check_pr_readiness.py`
- `scripts/check_workspace_hygiene.py`
- `scripts/report_local_agent_session.py`
- `scripts/prepare_docs_update_pr.py`
- `scripts/check_*guard*.py`
- `scripts/*gate*.py`

If a PR changes any protected control-plane script, the guard reports:

- `software_verdict: AUTO_MERGE_BLOCKED_PROTECTED_CONTROL_PLANE`
- `blocked_reasons` includes `PROTECTED_CONTROL_PLANE_SCRIPT_CHANGED`
- `human_review_required: true`
- `auto_merge_allowed: false`

These files are not marked as forbidden forever. They are manual-review control-plane changes.

## Auto-Merge Eligibility Preserved

Docs-only PRs remain eligible when other gates pass:

- `MASTER_DOCS/**`
- `README.md`
- `lab/gameplay_observation/PR*.md`

Passive runtime boundary PRs remain eligible when other gates pass and the title is passive-runtime scoped:

- `src/ai/**`
- `src/env/**`
- `src/core/**`
- `src/lib.rs` only under the passive runtime title gate
- `tests/*_boundary.rs`
- `tests/*_contract.rs`
- `lab/gameplay_observation/PR*.md`

Forbidden path handling is unchanged:

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

Fail-closed behavior remains in place for GitHub read failures, check failures, pending checks, head mismatch, and claim mismatch.

## Validation

Commands run:

- `git fetch origin --prune`
- `git switch main`
- `git pull --ff-only origin main`
- `git status --porcelain`
- `git log --oneline -30`
- `git switch -c automation-pr72-harden-auto-merge-guard-self-modification`
- `.\.venv312\Scripts\python.exe -m py_compile scripts\auto_merge_guard.py`
- `.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 133 --expected-head 1f54b7a655fd1abaec62137e3771c8160afada45 --pretty`
- PowerShell direct inspection that `scripts/auto_merge_guard.py` is absent from `ALLOWED_PASSIVE_PATTERNS` and present in `PROTECTED_CONTROL_PLANE_PATTERNS`
- `.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`

Results:

- `py_compile`: passed.
- PR #133 guard smoke: passed the expected non-merge behavior. The merged PR reported `state: MERGED`, `auto_merge_allowed: false`, `merge_attempted: false`, and blocked on `PR_NOT_OPEN` plus mergeability.
- Direct code inspection: passed. `scripts/auto_merge_guard.py` is no longer in the passive allowlist and is present in protected control-plane patterns.
- `check_workspace_hygiene.py`: `software_verdict: PASS`, `hygiene_verdict: CLEAN`; local tracked benchmark-summary noise was reported but not staged.
- `report_local_agent_session.py`: completed with `claim_verdict: NO_CLAIM_ALLOWED`; reported the known local tracked benchmark-summary noise and no tracked sandbox outputs.
- `prepare_docs_update_pr.py --ignore-local-benchmark-noise`: dry-run completed with `software_verdict: DOCS_UPDATE_PR_GUARD_READY`; local benchmark-summary noise was present and ignored by the requested flag.
- `cargo check`: passed with existing warnings.
- `cargo test fen_round_trip -- --nocapture`: passed. Matching tests reported ok.
- `cargo test root_decision -- --nocapture`: passed. Matching tests reported ok.

Skipped validation:

- `auto_merge_guard.py --allow-merge` was not run for this PR because this PR modifies the guard itself and must be manually reviewed and merged.
- No benchmark, holdout, dataset reset, runtime run, promotion check, or performance proof was run.

## Risks

Behavior risk: low. This PR changes only auto-merge control-plane policy reporting and does not change runtime, search, neural, engine, or dataset behavior.

Evidence risk: low for mechanical gating. Validation is limited to syntax checks, guard smoke behavior, helper scripts, cargo check, and focused tests. No performance or scientific evidence is claimed.

Claim risk: none. This PR makes no Elo, strength, promotion, holdout, or scientific-proof claim.

software_verdict: AUTO_MERGE_GUARD_SELF_MODIFICATION_HARDENED
evidence_verdict: MECHANICAL_PR_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED

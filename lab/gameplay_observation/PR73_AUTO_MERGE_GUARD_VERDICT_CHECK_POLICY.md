# PR73 Auto Merge Guard Verdict + Check Policy Hardening

## Triggering Audit Finding
- Current audit verdict before this PR: `DEEP_GUARD_AUDIT_BLOCKS_PR73`.
- Blocking gaps:
  1. `auto_merge_guard` treated `"skipping"` checks as pass.
  2. `auto_merge_guard` only checked body verdict presence, not exact allowed values by lane.

## Implemented Guard Hardening

### 1) Skipping policy hardened
- Removed `"skipping"` from `PASS_CHECK_BUCKETS`.
- Added explicit skipped classification bucket (`skip`, `skipped`, `skipping`) -> `skipped`.
- Added block reason: `CHECKS_SKIPPED`.
- Added JSON diagnostic: `checks_skipped`.
- `checks_passed` now requires `checks_skipped == 0`.

### 2) Exact evidence verdict policy enforced
- Added exact allowed `evidence_verdict` set:
  - `DOCUMENTATION_ONLY`
  - `MECHANICAL_PR_GATE_ONLY`
  - `MECHANICAL_RUNTIME_BOUNDARY_ONLY`
  - `MECHANICAL_CONTROL_PLANE_ONLY`
  - `MECHANICAL_CONTROL_PLANE_AUDIT_ONLY`
  - `MECHANICAL_AUDIT_AND_CODE_INSPECTION_ONLY`
  - `NON_CANONICAL_SANDBOX_ONLY`
- Added block reason for out-of-policy value: `EVIDENCE_VERDICT_NOT_ALLOWED`.

### 3) Exact software verdict lane policy enforced
- Lane detection by title prefix:
  - `docs:` -> docs lane
  - `automation:` -> automation lane
  - `runtime: Add passive` -> passive runtime lane
- Enforced exact allowed software verdicts per lane.
- Added block reason for out-of-policy value: `SOFTWARE_VERDICT_NOT_ALLOWED_FOR_LANE`.

### 4) claim_verdict strictness preserved
- Still only allows: `NO_CLAIM_ALLOWED`.
- Existing block reason retained: `CLAIM_VERDICT_NOT_NO_CLAIM_ALLOWED`.

### 5) JSON diagnostics added
- `body_software_verdict`
- `body_evidence_verdict`
- `body_claim_verdict`
- `software_verdict_allowed_for_lane`
- `evidence_verdict_allowed`
- `checks_skipped`

### 6) Protected control-plane policy preserved
- Protected script changes still require human review.
- `scripts/auto_merge_guard.py` changes remain blocked from auto-approval by:
  - `PROTECTED_CONTROL_PLANE_SCRIPT_CHANGED`
  - `human_review_required = true`.

### 7) Forbidden path policy preserved
- No forbidden-path rule changes made.

## Regression Checks

### PR #133 merged-state regression
- Command:
  - `.\.venv312\Scripts\python.exe scripts/auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 133 --expected-head 1f54b7a655fd1abaec62137e3771c8160afada45 --pretty`
- Result:
  - `state = MERGED`
  - blocked by merged-state gates (`PR_NOT_OPEN`, `PR_MERGEABLE_NOT_MERGEABLE`)
  - not merge-ready, as expected
  - body verdict diagnostics:
    - `body_software_verdict = PASSIVE_DECISION_CONTROLLER_BOUNDARY_ADDED`
    - `software_verdict_allowed_for_lane = true`
    - `body_evidence_verdict = MECHANICAL_RUNTIME_BOUNDARY_ONLY`
    - `evidence_verdict_allowed = true`
    - `body_claim_verdict = NO_CLAIM_ALLOWED`

### PR body verdict audit for #129, #132, #133 (gh view)
- `#129`:
  - software: `PASSIVE_SEARCH_BACKEND_BOUNDARY_ADDED` (allowed passive runtime lane)
  - evidence: `MECHANICAL_RUNTIME_BOUNDARY_ONLY` (allowed)
  - claim: `NO_CLAIM_ALLOWED` (allowed)
- `#132`:
  - software: `PASSIVE_POLICY_GUIDE_BOUNDARY_ADDED` (allowed passive runtime lane)
  - evidence: `MECHANICAL_RUNTIME_BOUNDARY_ONLY` (allowed)
  - claim: `NO_CLAIM_ALLOWED` (allowed)
- `#133`:
  - software: `PASSIVE_DECISION_CONTROLLER_BOUNDARY_ADDED` (allowed passive runtime lane)
  - evidence: `MECHANICAL_RUNTIME_BOUNDARY_ONLY` (allowed)
  - claim: `NO_CLAIM_ALLOWED` (allowed)

## Validation
- `.\.venv312\Scripts\python.exe -m py_compile scripts/auto_merge_guard.py` -> pass
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty` -> pass (`hygiene_verdict: CLEAN`)
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty` -> pass
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty` -> pass (dry-run guard)
- `cargo check` -> pass (warnings only)
- `cargo test fen_round_trip -- --nocapture` -> pass
- `cargo test root_decision -- --nocapture` -> pass

## Risks
- Behavior risk: low; changes are isolated to control-plane guard policy (`scripts/auto_merge_guard.py`) and reporting.
- Evidence risk: low; policy now fail-closed for skipped checks and out-of-policy verdict strings.
- Claim risk: low; strict `NO_CLAIM_ALLOWED` gate unchanged.

## Verdicts
- software_verdict: `AUTO_MERGE_GUARD_VERDICT_CHECK_POLICY_HARDENED`
- evidence_verdict: `MECHANICAL_PR_GATE_ONLY`
- claim_verdict: `NO_CLAIM_ALLOWED`

# PR-47 Phase 2 Core Minimal Close

## Scope

Report-only guardrail-validation PR to close Phase 2 Core Minimal after PR-45 and validate the PR-46 local verifier runtime scopes.

No runtime behavior was modified. No `src/core`, engine, chess, agents, search, CI, docs, scripts, `ml`, benchmark, holdout, dataset, or canonical evidence files were modified for this PR.

## Prior PR Presence

Latest local `main` after `git pull --ff-only origin main` is `e150f10906f31d84176c09553db04b6d945e2380`.

PR-46 is present:

- `e150f109 Merge pull request #104 from pierrelouisfradcourt-create/automation-pr46-local-verifier-runtime-scopes`
- `scripts/run_local_agent_verify.py --help` exposes `--scope {core-minimal,default,telemetry-prep,test-only-runtime}`
- Accepted scopes verified: `default`, `test-only-runtime`, `core-minimal`, `telemetry-prep`

PR-45 Phase 2 files are present:

- `src/core/action_id.rs`
- `src/core/ids.rs`
- `src/core/game_result.rs`
- `src/core/deterministic.rs`
- `tests/core_minimal.rs`

## Verifier Scopes Tested

Commands:

- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --scope core-minimal --pretty`
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --scope test-only-runtime --pretty`
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --scope telemetry-prep --pretty`
- `.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty`

Results:

- `core-minimal`: PASS, `software_verdict=LOCAL_AGENT_VERIFY_READY`, `forbidden_changed_files=[]`, `unexpected_changed_files=[]`, `tracked_sandbox_outputs=[]`
- `test-only-runtime`: PASS, `software_verdict=LOCAL_AGENT_VERIFY_READY`, `forbidden_changed_files=[]`, `unexpected_changed_files=[]`, `tracked_sandbox_outputs=[]`
- `telemetry-prep`: PASS, `software_verdict=LOCAL_AGENT_VERIFY_READY`, `forbidden_changed_files=[]`, `unexpected_changed_files=[]`, `tracked_sandbox_outputs=[]`
- `check_workspace_hygiene.py`: PASS, `hygiene_verdict=CLEAN`, `software_verdict=PASS`

Each verifier scope reported the local tracked noise as `LOCAL_TRACKED_NOISE_PRESENT` and did not confuse unstaged `MASTER_DOCS/**` noise or `lab/reports/latest_benchmark_summary.json` noise with PR branch diff.

Local tracked noise present and intentionally untouched:

- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `lab/reports/latest_benchmark_summary.json`

## Validation Commands

Commands and results:

- `git fetch origin --prune`: PASS after escalation for `.git/FETCH_HEAD` permission boundary
- `git switch main`: PASS after escalation for `.git/index.lock` permission boundary
- `git pull --ff-only origin main`: PASS, already up to date
- `git status --porcelain`: PASS, showed only known local tracked noise before PR file creation
- `git log --oneline -12`: PASS, includes PR #104 and PR #103 merges
- `Test-Path src\core\action_id.rs; Test-Path src\core\ids.rs; Test-Path src\core\game_result.rs; Test-Path src\core\deterministic.rs; Test-Path tests\core_minimal.rs`: PASS, all `True`
- `rg --line-number "scope|core-minimal|test-only-runtime|telemetry-prep|default" scripts\run_local_agent_verify.py`: PASS, scope support located
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --help`: PASS, accepted scopes listed
- `cargo check`: PASS with existing warnings
- `cargo test --test core_minimal -- --nocapture`: PASS, 5 passed
- `cargo test --test deterministic_engine -- --nocapture`: PASS, 121 passed
- `cargo test fen_round_trip -- --nocapture`: PASS, filtered test run passed matching FEN round-trip tests
- `cargo test root_decision -- --nocapture`: PASS, filtered test run passed matching root decision tests
- `cargo test`: PASS, full test suite exited 0

## Guardrail Confirmations

- Runtime rewiring: none
- Runtime behavior changes: none
- `src/core` changes: none
- Engine/chess/agents/search changes: none
- CI changes: none
- Docs changes: none
- Dataset reset: none
- Benchmark proof: none
- Holdout use: none
- Canonical evidence creation: none
- `lab/runs/RUN_*` creation: none
- `latest.json` creation: none
- Sandbox outputs tracked: none

## Skipped Validation And Reason

- Benchmarks skipped: prohibited as proof by repository guardrail.
- Holdout validation skipped: prohibited by repository guardrail.
- Dataset reset skipped: prohibited by repository guardrail.
- Canonical evidence generation skipped: PR is report-only and guardrail-validation only.
- Verifier `--run-checks` skipped: required commands requested report-mode scope checks only; mechanical validation was run explicitly through the listed cargo and hygiene commands.

## Risks

Behavior risk: Low. This PR adds only a report file and does not rewire runtime behavior.

Evidence risk: Low. Evidence is limited to local mechanical guardrail and test coverage; no canonical evidence is created.

Claim risk: Low. No Elo, strength, promotion, scientific proof, benchmark proof, or holdout claim is made.

## Next Recommended Phase

Phase 3 telemetry-prep.

## Verdict

software_verdict: PHASE2_CORE_MINIMAL_CLOSED

evidence_verdict: MECHANICAL_GUARDRAIL_AND_TEST_COVERAGE_ONLY

claim_verdict: NO_CLAIM_ALLOWED

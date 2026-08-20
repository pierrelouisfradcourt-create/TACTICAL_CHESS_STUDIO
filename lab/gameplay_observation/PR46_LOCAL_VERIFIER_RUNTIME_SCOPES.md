# PR46 Local Verifier Runtime Scopes

## Scope Profiles Added

- `default`: preserves the legacy local verifier path checks and reports the selected scope in JSON output.
- `test-only-runtime`: allows `tests/**` and `lab/gameplay_observation/PR*.md`; forbids runtime/source, CI, ML, run, sandbox output, benchmark output, and holdout paths.
- `core-minimal`: allows `src/core/**`, `src/lib.rs`, `tests/**`, and `lab/gameplay_observation/PR*.md`; forbids broader engine/chess/agent/simulation runtime areas plus CI, ML, run, sandbox output, benchmark output, and holdout paths.
- `telemetry-prep`: allows only `src/chess/decision_trace.rs`, `tests/**`, and `lab/gameplay_observation/PR*.md`; broad `src/chess/**` changes remain forbidden unless they are the exact allowed trace path.

## Default Behavior Preservation

Default scope keeps the existing verifier stance: it still checks the local worktree plus `origin/main...HEAD` against legacy forbidden path rules. The added scope fields are visible in JSON output without relaxing the default guardrail path profile.

The explicit runtime scopes validate the branch diff for the selected bounded profile and expose both `forbidden_changed_files` and `unexpected_changed_files`. This prevents approved bounded Phase 2/Phase 3 runtime paths from being false-blocked while still blocking forbidden branch-diff paths.

## Local Tracked Noise Behavior

Unstaged `MASTER_DOCS/**` changes and `lab/reports/latest_benchmark_summary.json` are reported as `LOCAL_TRACKED_NOISE_PRESENT` and are not treated as PR diff when they are not present in `origin/main...HEAD`.

Observed local tracked noise during validation:

- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `lab/reports/latest_benchmark_summary.json`

Result: `LOCAL_TRACKED_NOISE_PRESENT`.

## Validation Results

- `git fetch origin --prune`: passed after escalation for `.git/FETCH_HEAD` permission.
- `git switch main`: passed after escalation for `.git/index.lock` permission.
- `git pull --ff-only origin main`: passed after escalation for `.git/FETCH_HEAD` permission; already up to date.
- `git status --porcelain`: showed only known local tracked noise before PR-46 edits.
- `git log --oneline -12`: confirmed PR #103 / PR-45 merge on main.
- PR-45 file checks: `src/core/action_id.rs`, `tests/core_minimal.rs`, and `lab/gameplay_observation/PR45_CORE_MINIMAL_IDENTITY.md` all present.
- `.\.venv312\Scripts\python.exe -m py_compile scripts/run_local_agent_verify.py`: passed.
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --pretty`: passed; reported scope `default`, local tracked noise, no forbidden paths, no tracked sandbox outputs.
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --scope test-only-runtime --pretty`: passed; reported scope `test-only-runtime`, no forbidden or unexpected branch-diff files, no tracked sandbox outputs.
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --scope core-minimal --pretty`: passed; reported scope `core-minimal`, no forbidden or unexpected branch-diff files, no tracked sandbox outputs.
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --scope telemetry-prep --pretty`: passed; reported scope `telemetry-prep`, no forbidden or unexpected branch-diff files, no tracked sandbox outputs.
- `.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty`: passed; no blocked reasons.
- `cargo check`: passed with existing warnings.
- `cargo test --test core_minimal -- --nocapture`: passed, 5 tests.
- `cargo test --test deterministic_engine -- --nocapture`: passed, 121 tests.
- `cargo test fen_round_trip -- --nocapture`: passed matching filtered tests.
- `cargo test root_decision -- --nocapture`: passed matching filtered tests.
- `cargo test`: passed; full workspace tests completed successfully.

## Skipped Validation

None. All requested validation commands were run.

## Risks

behavior risk: Low. Change is limited to local automation verifier scope classification and does not modify runtime behavior, CI, docs, neural/search/engine code, or canonical evidence paths.

evidence risk: Low. This is a mechanical guardrail report only. No benchmark output, holdout result, run artifact, canonical evidence, promotion evidence, Elo claim, or scientific proof was produced.

claim risk: Low. The change does not support any strength, promotion, Elo, or scientific claim. Claim status remains blocked.

## Verdicts

software_verdict: LOCAL_VERIFIER_RUNTIME_SCOPES_ADDED

evidence_verdict: MECHANICAL_GUARDRAIL_ONLY

claim_verdict: NO_CLAIM_ALLOWED

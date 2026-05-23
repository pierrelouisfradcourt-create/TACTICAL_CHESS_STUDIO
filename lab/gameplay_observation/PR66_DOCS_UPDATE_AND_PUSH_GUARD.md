# PR66 Docs Update and Push Guard

## Why this exists

PR66 adds a local automation control-plane guard for future `MASTER_DOCS` and `README.md` updates so pushes can be prepared safely without granting merge power to automation.

## What it protects

- Keeps default behavior report-only (`dry-run`).
- Restricts push scope to docs/update packets:
  - `README.md`
  - `MASTER_DOCS/**`
  - `lab/gameplay_observation/PR*_*.md`
- Treats forbidden paths as hard blocks:
  - `src/**`
  - `tests/**`
  - `.github/**`
  - `ml/**`
  - `scripts/**` (with PR66 exception for `scripts/prepare_docs_update_pr.py`)
  - `lab/reports/latest_benchmark_summary.json`
  - `lab/runs/**` and `lab/runs/RUN_*`
  - `latest.json`
- Blocks if tracked sandbox outputs exist under `lab/gameplay_observation/sandbox_outputs/`.
- Blocks local benchmark noise by default when `lab/reports/latest_benchmark_summary.json` is modified locally.

## Dry-run behavior

`scripts/prepare_docs_update_pr.py` default mode:

- Never pushes.
- Inspects branch, head SHA, branch diff, and staged files.
- Classifies changed files as allowed/forbidden.
- Detects local benchmark noise (`lab/reports/latest_benchmark_summary.json`).
- Blocks local benchmark noise by default (`BLOCKED_LOCAL_BENCHMARK_NOISE_PRESENT`).
- Detects tracked sandbox outputs.
- Emits JSON to stdout (compact by default, pretty with `--pretty`).

## --allow-push behavior

With `--allow-push`, the script attempts `git push -u origin <branch>` only if all gates pass:

- Current branch is not `main`.
- Branch diff is limited to allowed docs/update scope (plus PR66 script exception).
- No forbidden files are changed.
- No forbidden files are staged.
- No `latest.json`.
- No `lab/runs/**` or `lab/runs/RUN_*`.
- No tracked sandbox outputs.
- Local benchmark report noise is blocked unless explicitly ignored with `--ignore-local-benchmark-noise` and only when safe.

If any gate fails, push is refused and reported in `blocked_reasons`.

### Local benchmark-noise policy

- Default: if `lab/reports/latest_benchmark_summary.json` is modified locally, `push_allowed` is false.
- Opt-in ignore: `--ignore-local-benchmark-noise` allows local benchmark noise only when all of these are true:
  - benchmark report is not staged
  - benchmark report is not in `origin/main...HEAD` branch diff
- Always block if benchmark report is staged:
  - `BLOCKED_STAGED_LOCAL_BENCHMARK_REPORT`
- Always block if benchmark report is in branch diff:
  - `BLOCKED_BENCHMARK_REPORT_IN_BRANCH_DIFF`
- Guard output includes:
  - `ignore_local_benchmark_noise`
  - `local_benchmark_noise_present`
  - `local_benchmark_noise_blocking`

## What it refuses

- Auto-merge.
- PR closure.
- Branch deletion.
- Force push.
- Any attempt to treat benchmark artifacts or sandbox outputs as canonical proof.
- Any attempt to commit local benchmark report noise; benchmark reports remain non-canonical local noise in this flow.

## Why it does not auto-merge

Merge remains a human decision. This guard implements only a mechanical local push gate and explicitly avoids merge or PR lifecycle actions.

## Validation

Executed commands:

1. `.\.venv312\Scripts\python.exe -m py_compile scripts/prepare_docs_update_pr.py`
2. `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --pretty`
3. `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
4. `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
5. `cargo check`
6. `cargo test fen_round_trip -- --nocapture`
7. `cargo test root_decision -- --nocapture`

## Risks

- Push gating depends on local Git state (`origin/main...HEAD`, staged state).
- Local tracked benchmark noise still exists in workspace and is reported as non-canonical local noise.
- Script does not inspect remote PR status; it is intentionally local and mechanical.

## Verdicts

- software_verdict: DOCS_UPDATE_PR_GUARD_READY
- evidence_verdict: MECHANICAL_CONTROL_PLANE_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

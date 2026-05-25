# Command Cheatsheet (Official)

These are the supported operational commands for TacticalChessPureLab.

## PowerShell baseline

Run scripts from repo root:
- `powershell -ExecutionPolicy Bypass -File .\scripts\<script>.ps1 ...`

## Python runtime (Doctor / validation)

- Doctor (no changes; no auto-install):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\python_runtime.ps1 -Doctor`
- Doctor + allow repo-local repair (installs into `.\.python312\` if needed and if `python-3.12.5-amd64.exe` exists in repo root):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\python_runtime.ps1 -Doctor -Repair`
- Print resolved interpreter path (may repair if needed):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\python_runtime.ps1 -PrintExe`
  - If repair fails due to policy (access denied / blocked interpreter), install Python 3.12 manually and set `TCS_PYTHON_EXE`.

Environment overrides:
- `TCS_PYTHON_CMD` - launcher command for Python 3.12, for example `py -3.12`.
- `TCS_PYTHON_EXE` (preferred) - full path to a Python 3.12 `python.exe` to use.

Doctor outputs:
- `PY_RUNTIME_STATUS=ok|failed`
- `PY_RUNTIME_EXE=...`
- `PY_RUNTIME_IS_312=true|false`
- `PY_RUNTIME_VENV_SITE_PACKAGES_PRESENT=true|false`
- `PY_RUNTIME_INSTALLER_PRESENT=true|false`
- `PY_RUNTIME_FAILURE_REASON=...` (only on failure)

## Benchmarks

Primary launcher (runs tournament + writes summary):
- `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Games 12 -RunClass exploration_only`

Smoke benchmark (bounded daily validation):
- `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Smoke -RunClass exploration_only`
- Writes isolated output under `lab\smoke_benchmark\tournaments\`
- Current shape: 2 games, 40-turn cap

Summarize only (no `cargo` run; re-reads latest `elo.csv` + `matches.csv` and refreshes `lab/reports/latest_benchmark_summary.json`):
- `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -SummarizeOnly -RunClass exploration_only`

Optional controls:
- Fast exploratory mode:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Fast -RunClass exploration_only`
  - Note: still too slow for daily iteration; prefer `-Smoke` for routine checks.
- Timeout (0 = no timeout):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Games 12 -TimeoutSeconds 3600`
  - Note: `-TimeoutSeconds` is ignored when `-SummarizeOnly` is set (no `cargo` run).
- Explicit tournament source when summarizing (either an experiment dir or a `tournaments/` dir):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -SummarizeOnly -TournamentDir .\lab\experiments\exp_003_aggressive`

Observables:
- `benchmark_runner.py` prints `BENCHMARK_*` lines (status, dir, timeout, purity, Elo ranks).
- Summary artifact: `lab/reports/latest_benchmark_summary.json`.
- Exit code:
  - `0` = summary produced and `benchmark_invalid=false`
  - `1` = failed run, timed out, or `benchmark_invalid=true`

Environment overrides:
- `TCS_EXPERIMENT_DIR` - where the Rust tournament writes its `tournaments/` outputs (defaults to `.\lab\`).

## Conversion suite (targeted conversion metric)

Run suite (optional limit N):
- `cargo run -- conversion_suite 36`

Observables:
- `cargo run -- conversion_suite ...` prints `CONVERSION_SUITE_*` lines (status + report paths).
- Report artifacts:
  - `lab/reports/conversion_suite_v1_latest.md`
  - `lab/reports/conversion_suite_v1_latest.json`

Environment overrides:
- `TCS_CONVERSION_SUITE_ENGINE` - engine under test (default `hybrid`)
- `TCS_CONVERSION_SUITE_OPPONENT` - opponent engine (default `heuristic`)

## Deprecated BAT scripts

BAT entrypoints are legacy and may contain hard-coded paths.
Prefer the PowerShell launchers above.

Known legacy surfaces:
- Repo root: `RUN_PURELAB_AUTOMATION.bat`, `RUN_MEGA_AGENT_AUTOMATION.bat`, `clean_studio.bat`, `auto_patch_and_run.bat`
- Under `scripts/`: `scripts/*.bat`

# COMMAND

## Exact Command Run

```powershell
$env:TCS_SEARCH_RUNTIME_DIAG='1'
$env:TCS_ROOT_DECISION_AUDIT='1'
$env:TCS_ROOT_DECISION_AUDIT_TOP_N='3'
$env:TCS_REPLY_SCAN_LIMIT='3'
$env:TCS_ROOT_WORST_CASE_MAX_CANDIDATES='3'
$cmd = 'cargo run -- observe_fen "6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1" --depth 1 > docs\evidence\ROCKY_TRACE_EVIDENCE_SEED_V0\RAW_OUTPUT.txt 2>&1'
cmd /d /c $cmd
exit $LASTEXITCODE
```

Trace command:

```text
cargo run -- observe_fen "6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1" --depth 1
```

## Working Directory

```text
C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab
```

## Capture Method

stdout and stderr from the `cargo run -- observe_fen ...` command were redirected by `cmd /d /c` into:

```text
docs\evidence\ROCKY_TRACE_EVIDENCE_SEED_V0\RAW_OUTPUT.txt
```

`RAW_OUTPUT.txt` was not manually cleaned, reformatted, summarized, or beautified.

## Environment Variables Used

- `TCS_SEARCH_RUNTIME_DIAG=1`
- `TCS_ROOT_DECISION_AUDIT=1`
- `TCS_ROOT_DECISION_AUDIT_TOP_N=3`
- `TCS_REPLY_SCAN_LIMIT=3`
- `TCS_ROOT_WORST_CASE_MAX_CANDIDATES=3`

The CLI also set `TCS_MINIMAX_DEPTH=1` internally from `--depth 1` for the duration of the search and then restored or removed it.

## File Writes

The output capture wrote `RAW_OUTPUT.txt`. `cargo run` may write normal Rust build artifacts under `target/`. The `observe_fen` command path did not write report files.

## Benchmark-Like Status

Benchmark-like: NO.

This was a single-position bounded observation command, not a tournament, benchmark campaign, neural smoke, training run, Elo run, win-rate run, or comparative strength run.

## Command Result

Success: YES.

Exit code: 0.

## Execution Record Boundary

`COMMAND.md` records execution only. It does not interpret results.

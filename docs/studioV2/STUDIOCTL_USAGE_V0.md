# studioctl Usage V0

`scripts/studioV2/studioctl.py` is a read-only Studio Control helper for local inspection, route checking, source-state summaries, evidence aggregation, report-field inspection, and stdout-only task-charter rendering.

It does not create route outputs, register sources, load project truth into governance, enforce runtime behavior, validate models, prove chess strength, or decide claim status. The human remains the HumanGate for merge, reject, freeze, promotion, and any claim decision.

## Boundary

- `claim_posture` defaults to `NO_CLAIM_ALLOWED`.
- JSON payloads include `no_global_ready_verdict: true`.
- Runtime model identity is blocked unless Codex exposes it explicitly.
- Route checks report whether a destination is allowed; they do not write files or create directories.
- Report inspection refuses forbidden paths such as `secrets/` and reports `read_attempted: false`.
- Charter rendering writes to stdout only and does not execute the rendered task.

## Commands

Use the project Python interpreter from the repository root on Windows:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py status --json
```

Check an allowed roadmap/status route without creating the file:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py routes check --surface roadmap_docs_only --output 00_STUDIO_CONTROL/05_STATUS/EXAMPLE.md --json
```

Check a forbidden runtime-source destination without writing it:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py routes check --surface roadmap_docs_only --output src/SHOULD_NOT_WRITE.md --json
```

Scan fixed source anchors and report created, registered, loaded, enforced, and evidenced state:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py sources scan --json
```

Render the evidence board:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py evidence board --json
```

Inspect a report path. Forbidden paths are blocked before any read attempt:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py report inspect secrets/SHOULD_NOT_READ.md --json
```

Render a task charter candidate to stdout only:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py charter render --profile hygiene --task-id TASK-HYGIENE-001 --title "Check route hygiene" --target 00_STUDIO_CONTROL/05_STATUS --surface roadmap_docs_only --json
```

## What It Does Not Prove

`studioctl` output is local tooling evidence only. It does not prove readiness, benchmark results, Elo, model quality, dataset validity, runtime activation, source promotion, or scientific claims. It can support bounded review by reporting structured status, but claim validation remains blocked unless separately authorized and evidenced by the required HumanGate process.

## Targeted Validation

Run the dedicated unittest module:

```powershell
.\.venv312\Scripts\python.exe -m unittest tests.studioV2.test_studioctl
```

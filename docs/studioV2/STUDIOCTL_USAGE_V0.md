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

Show the repository surface map without reading secrets or model/dataset contents:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py surface map
```

Emit the same controlled surface map as JSON:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py surface map --json
```

Show the UxPilote Scripts Control View data as a read-only JSON payload:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py uxpilote scripts-control --json
```

The same command without `--json` prints a short text summary:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py uxpilote scripts-control
```

Show the UxPilote audit/control chain catalog as a read-only JSON payload:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py uxpilote audit-chains --json
```

The same command without `--json` prints a short text summary:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py uxpilote audit-chains
```

Show the UxPilote read-only graph backend seed as a JSON payload:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py uxpilote graph --json
```

The same command without `--json` prints a short text summary:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py uxpilote graph
```

Inspect a report path. Forbidden paths are blocked before any read attempt:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py report inspect secrets/SHOULD_NOT_READ.md --json
```

Parse an executor report into normalized JSON without modifying the report:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py report parse 00_STUDIO_CONTROL/05_STATUS/EXAMPLE_EXECUTOR_REPORT.md --json
```

Emit a task-matrix candidate from the parsed report to stdout only:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py report matrix-candidate 00_STUDIO_CONTROL/05_STATUS/EXAMPLE_EXECUTOR_REPORT.md --json
```

`report parse` and `report matrix-candidate` are read-only. They never write `STUDIO_MASTER_TASK_MATRIX_V0.yaml`, never update `STUDIO_SOURCE_REGISTRATION_PLAN_V0.yaml`, and never register sources. Missing required fields are normalized to `UNKNOWN`; missing `no_global_ready_verdict`, missing `claim_verdict`, missing `status_by_surface`, unknown actual runtime, or file-producing reports without route/output-routing evidence are marked `BLOCKED`. The candidate output preserves `NO_CLAIM_ALLOWED`, emits no global ready verdict, and requires HumanGate before any matrix update is applied.

The report parser accepts bounded aliases observed in local status records: `repo_reference` may fill missing `preflight` fields, `validation.result` / `validation.diff_check` / `validation.readback` may fill `validation.status` only when they carry a controlled status value, `files_changed.by_this_task`, `files_changed.repo_source_test_docs_runtime`, or `files_touched` may fill `files_changed`, mapping-style `commands_run` entries are normalized to command strings, and `next_tasks` may fill `recommended_next_tasks`. `codex_runtime.actual_runtime: UNKNOWN` still keeps `codex_runtime.runtime_status: BLOCKED`; the matrix candidate remains stdout-only HumanGate review material and does not authorize a task-matrix write.

Render a task charter candidate to stdout only:

```powershell
.\.venv312\Scripts\python.exe scripts/studioV2/studioctl.py charter render --profile hygiene --task-id TASK-HYGIENE-001 --title "Check route hygiene" --target 00_STUDIO_CONTROL/05_STATUS --surface roadmap_docs_only --json
```

## What It Does Not Prove

`studioctl` output is local tooling evidence only. It does not prove readiness, benchmark results, Elo, model quality, dataset validity, runtime activation, source promotion, or scientific claims. It can support bounded review by reporting structured status, but claim validation remains blocked unless separately authorized and evidenced by the required HumanGate process.

The surface map is a path-boundary view only. It reports controlled surface names, path existence, status, owner hints, authority boundaries, read policy, and write policy. It does not recurse into `secrets/`, does not read model or dataset contents, does not validate runtime behavior, and does not promote any surface to canonical or active truth.

The UxPilote Scripts Control View JSON is a data-source candidate only. It reports script-family nodes, path drift, read-only entrypoints, blocked runners, selected-node inspector fields, `scripts/uxpilote` as `UNKNOWN`, and HumanGate questions. It does not execute unknown scripts, run benchmark or gameplay commands, automate GitHub or auto-merge, create datasets, create models or checkpoints, create `lab/runs`, create `latest.json`, or perform Git actions.

The UxPilote Audit Chains JSON is a read-only catalog view only. It reports audit/control chain cards, source catalog state, UX targets, packet types, blocked actions, and HumanGate questions. It does not execute chains or audits, run scripts, mutate files, generate logs, promote the catalog, validate claims, or make HumanGate decisions.

The UxPilote Graph JSON is a read-only backend seed only. It aggregates existing `studioctl` payload builders into graph planes, nodes, edges, blocked edges, unsafe edges, source-state gaps, and HumanGate questions. It does not parse dashboard HTML, execute audit chains, run tests, run gameplay, run benchmarks, train, create `lab/runs`, create `latest.json`, promote sources, or render blocked/unknown edges as active truth.

The report parser and task-matrix candidate generator are stdout-only tooling. They parse YAML-like executor reports with a bounded line-oriented reader and do not execute report content. `STUDIO_MASTER_TASK_MATRIX_V0.yaml` remains read/reference-only for this workflow; applying any candidate row requires a separate HumanGate-routed task.

## Targeted Validation

Run the dedicated unittest module:

```powershell
.\.venv312\Scripts\python.exe -m unittest tests.studioV2.test_studioctl
```

# StudioPilot Operator Manual

## Purpose

This manual defines how to run the merged StudioPilot control-plane manual loop from local files only:

TaskPacket -> rendered Codex prompt -> ExecutionReport intake -> ReviewPacket -> HumanDecision -> loop smoke

This is an operator guide for dry-run control-plane tooling. It does not activate autonomy, merge authority, promotion authority, or claim authority.

## Scope and Authority

- All flow is manual, dry-run, and non-canonical.
- Scripts are local validators/builders only.
- No script calls Codex, OpenAI, or GitHub APIs.
- No script creates merge/promotion/claim authority.
- HumanGate remains the final authority for merge, reject, freeze, promotion, and claims.

## Merged Components (Current)

- `docs/control-plane/LOOP_CONTRACT.md`
- `docs/control-plane/AUTHORITY_MATRIX.md`
- `docs/control-plane/LOOP_STATES.md`
- `docs/control-plane/STUDIOPILOT_PACKET_SCHEMAS.md`
- `docs/control-plane/RENDER_CODEX_PROMPT.md`
- `docs/control-plane/EXECUTION_REPORT_INTAKE.md`
- `docs/control-plane/REVIEW_PACKET_DRY_RUN.md`
- `docs/control-plane/HUMAN_DECISION_DRY_RUN.md`
- `docs/control-plane/STUDIOPILOT_LOOP_SMOKE.md`

## Required Command Order

Run in this exact sequence:

1. `validate_studiopilot_packets.py`
2. `render_codex_prompt.py`
3. `validate_execution_report.py`
4. `build_review_packet.py`
5. `build_human_decision.py`
6. `run_studiopilot_loop_smoke.py`

## Script Inputs and Outputs

### 1) validate_studiopilot_packets.py

Script: `scripts/control_plane/validate_studiopilot_packets.py`

Input:
- Fixture root (default): `docs/control-plane/fixtures/studiopilot_packets/`
- Schemas:
  - `schemas/studiopilot_task_packet.schema.json`
  - `schemas/studiopilot_execution_report.schema.json`
  - `schemas/studiopilot_review_packet.schema.json`
  - `schemas/studiopilot_human_decision.schema.json`

Output:
- Deterministic JSON summary including:
  - `overall_status` (`PASS` or `BLOCKED`)
  - valid/invalid fixture counters
  - `errors`

Exit codes:
- `0` PASS
- `1` fixture expectation/validation failure
- `2` setup/internal failure (including missing dependency)

### 2) render_codex_prompt.py

Script: `scripts/control_plane/render_codex_prompt.py`

Input:
- Required TaskPacket JSON path
- TaskPacket schema: `schemas/studiopilot_task_packet.schema.json`
- Optional `--output` path

Output:
- Rendered deterministic Codex prompt to stdout, or file when `--output` is used
- File write guardrails:
  - no overwrite
  - parent directory must exist
  - forbidden-path boundary enforcement when output is repo-relative

Exit codes:
- `0` render success
- `1` TaskPacket schema validation failure
- `2` missing files/dependencies or internal/io/json parse errors

### 3) validate_execution_report.py

Script: `scripts/control_plane/validate_execution_report.py`

Input:
- Required ExecutionReport JSON
- Optional `--task-packet` JSON for boundary checks
- Schemas:
  - `schemas/studiopilot_execution_report.schema.json`
  - `schemas/studiopilot_task_packet.schema.json`

Output:
- Deterministic JSON with:
  - `overall_status` (`PASS` or `BLOCKED`)
  - `schema_valid`
  - `task_packet_checked`
  - `task_id_match` (`true`, `false`, or `UNKNOWN`)
  - `allowed_path_result` (`PASS`, `BLOCKED`, or `UNKNOWN`)
  - `forbidden_path_result` (`PASS` or `BLOCKED`)
  - `claim_scope_result` (`PASS` or `BLOCKED`)
  - `scope_deviation_result` (`PASS`, `BLOCKED`, or `UNKNOWN`)
  - `errors`

Exit codes:
- `0` PASS
- `1` validation/boundary failure
- `2` setup/internal failure

### 4) build_review_packet.py

Script: `scripts/control_plane/build_review_packet.py`

Input:
- Required validated ExecutionReport JSON
- Optional validated TaskPacket JSON
- Schemas:
  - `schemas/studiopilot_execution_report.schema.json`
  - `schemas/studiopilot_task_packet.schema.json`
  - `schemas/studiopilot_review_packet.schema.json`

Output:
- ReviewPacket JSON (stdout or `--output` file)
- Non-overwrite write behavior when output file is requested
- Recommendation/risk synthesis (`SAFE_TO_READY`, `REQUEST_CHANGES`, `BLOCKED`) as non-binding review guidance only

Exit codes:
- `0` ReviewPacket built and validated
- `1` input/schema/path/boundary validation failure
- `2` internal failure

### 5) build_human_decision.py

Script: `scripts/control_plane/build_human_decision.py`

Input:
- Required validated ReviewPacket JSON
- Schemas:
  - `schemas/studiopilot_review_packet.schema.json`
  - `schemas/studiopilot_human_decision.schema.json`
- Optional explicit decision overrides (`--merge-decision`, `--claim-decision`, `--promotion-decision`)

Output:
- HumanDecision draft JSON (stdout or `--output` file)
- Non-overwrite write behavior when output file is requested
- Separate decision axes preserved:
  - merge
  - claim
  - promotion

Exit codes:
- `0` HumanDecision built and validated
- `1` input/schema validation failure
- `2` internal failure

### 6) run_studiopilot_loop_smoke.py

Script: `scripts/control_plane/run_studiopilot_loop_smoke.py`

Input:
- Local fixtures and local schemas
- Optional `--output-dir`
- Optional `--keep-temp`

Output:
- End-to-end dry-run summary JSON with per-step statuses
- `overall_status` (`PASS` or `BLOCKED`)
- Temporary artifacts by default (deleted unless retained)
- Optional retained output directory with guardrails

Exit codes:
- `0` smoke pipeline PASS
- `1` smoke pipeline BLOCKED
- `2` setup/internal failure

## Minimal Example Commands (Windows)

Run from repository root using project venv Python:

```powershell
.\.venv312\Scripts\python.exe scripts\control_plane\validate_studiopilot_packets.py --pretty

.\.venv312\Scripts\python.exe scripts\control_plane\render_codex_prompt.py docs\control-plane\fixtures\studiopilot_packets\valid\valid_task_packet_docs.json --pretty

.\.venv312\Scripts\python.exe scripts\control_plane\validate_execution_report.py docs\control-plane\fixtures\studiopilot_packets\valid\valid_execution_report_docs.json --task-packet docs\control-plane\fixtures\studiopilot_packets\valid\valid_task_packet_docs.json --pretty

.\.venv312\Scripts\python.exe scripts\control_plane\build_review_packet.py docs\control-plane\fixtures\studiopilot_packets\valid\valid_execution_report_docs.json --task-packet docs\control-plane\fixtures\studiopilot_packets\valid\valid_task_packet_docs.json --pretty

.\.venv312\Scripts\python.exe scripts\control_plane\build_human_decision.py docs\control-plane\fixtures\studiopilot_packets\valid\valid_review_packet_safe_to_ready.json --pretty

.\.venv312\Scripts\python.exe scripts\control_plane\run_studiopilot_loop_smoke.py --pretty
```

## Troubleshooting

### PASS

- Meaning: the step completed within dry-run boundaries.
- Action: proceed to the next step in order.

### BLOCKED

- Meaning: schema, boundary, or validation policy failed.
- Action: stop progression, fix input/boundary issue, rerun the blocked step.

### UNKNOWN

- Meaning: insufficient observability or unsupported matching pattern for a boundary check.
- Action: treat as non-pass; diagnose and resolve before continuing.

### missing jsonschema

Symptoms:
- `BLOCKED_MISSING_JSONSCHEMA`

Action:
- Install `jsonschema` into `.venv312` and rerun.

### schema validation failure

Symptoms:
- output shows schema errors (for example `*_schema_error`, `task_packet_schema_validation_failed`, `INPUT_VALIDATION_ERROR`)

Action:
- Correct JSON structure/content to satisfy the referenced schema, then rerun the same step.

### path boundary failure

Symptoms:
- forbidden-path touches
- paths outside `allowed_paths`
- blocked output path/forbidden output directory

Action:
- restrict changed/output paths to declared allowed scope and outside forbidden scope, then rerun.

## Forbidden Near-Term Work Through StudioPilot

- Codex SDK adapter
- MCP write tools
- auto-ready
- auto-merge
- training
- fine-tuning
- runtime/search/neural refactor through StudioPilot

## Manual Loop Trial 001

The first controlled trial is report-only and non-canonical. It is a manual dogfood pass to exercise the full control-plane loop end to end, not autonomous StudioPilot execution.

Operators should run the loop manually in this order: TaskPacket -> rendered Codex prompt -> ExecutionReport -> ReviewPacket -> HumanDecision.

Trial constraints are strict:
- no runtime changes
- no ML/training
- no benchmark activity
- no claim of capability
- no canonical evidence creation
- no autonomous execution

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_DOCS_ONLY
- evidence_verdict: OPERATOR_MANUAL_DOCUMENTATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

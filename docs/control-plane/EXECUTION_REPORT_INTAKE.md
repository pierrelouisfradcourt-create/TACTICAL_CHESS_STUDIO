# StudioPilot ExecutionReport Intake (Dry-Run Only)

This intake step validates local StudioPilot `ExecutionReport` JSON artifacts.

In the reporting chain, ExecutionReport is source material for ReviewPacket and LocalReviewPack. It is not the main solo review summary and does not replace PRDecisionPacket decision support or HumanGate.

## Boundary

- Intake is dry-run only.
- `ExecutionReport` is not proof by itself.
- `ExecutionReport` is not canonical evidence by itself.
- The validator does not execute tasks.
- The validator does not call Codex.
- The validator does not call OpenAI.
- The validator does not call GitHub.
- The validator does not create PRs.
- The validator does not authorize merge, promotion, or claim.
- HumanGate remains final authority.
- This is preparation for future PR review automation, not automation itself.

## Script

`scripts/control_plane/validate_execution_report.py`

The script validates:

1. ExecutionReport schema against `schemas/studiopilot_execution_report.schema.json`.
2. Optional TaskPacket schema against `schemas/studiopilot_task_packet.schema.json`.
3. Optional intake boundary alignment:
   - `task_id` equality between report and packet.
   - `changed_files` vs `forbidden_paths` (forbidden match blocks).
   - `changed_files` vs `allowed_paths` (outside allowed paths blocks).
   - `claim_verdict` does not exceed TaskPacket `claim_scope`.
   - `validation_results` exists and is non-empty.
   - If forbidden paths are touched, `scope_deviation` must be `BLOCKING`.

## Output Contract

The script prints deterministic JSON with:

- `overall_status`: `PASS` or `BLOCKED`
- `schema_valid`: `true` or `false`
- `task_packet_checked`: `true` or `false`
- `task_id_match`: `true`, `false`, or `UNKNOWN`
- `allowed_path_result`: `PASS`, `BLOCKED`, or `UNKNOWN`
- `forbidden_path_result`: `PASS` or `BLOCKED`
- `claim_scope_result`: `PASS` or `BLOCKED`
- `scope_deviation_result`: `PASS`, `BLOCKED`, or `UNKNOWN`
- `errors`: array of deterministic error strings

Exit codes:

- `0`: PASS
- `1`: validation or boundary failure
- `2`: script/config/internal error

## Examples

```powershell
python scripts/control_plane/validate_execution_report.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_execution_report_docs.json --pretty
```

```powershell
python scripts/control_plane/validate_execution_report.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_execution_report_docs.json --task-packet docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json --pretty
```

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_INTAKE_TOOLING_ONLY
- evidence_verdict: EXECUTION_REPORT_DRY_RUN_VALIDATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

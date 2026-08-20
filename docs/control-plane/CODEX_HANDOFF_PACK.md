# Codex Handoff Pack (Dry Run Only)

## Purpose

`scripts/control_plane/prepare_codex_handoff.py` prepares a local Codex handoff folder from a schema-valid StudioPilot `TaskPacket`.

The generator is a control-plane packaging tool only. It validates packet structure, reuses the local Codex prompt renderer, and writes operator-facing files only when `--output-dir` is explicitly provided.

## Hard Boundaries

- The generator does not call Codex.
- The generator does not call OpenAI.
- The generator does not call GitHub.
- The generator does not create PRs.
- The generator does not merge.
- The generator does not execute the rendered prompt.
- The generated handoff pack is not evidence.
- The generated handoff pack is not merge, promotion, claim, ready-for-review, or execution authorization.
- HumanGate remains final authority.

## Inputs

Required:

- A local StudioPilot `TaskPacket` JSON file.

Validation:

- The input packet is validated against `schemas/studiopilot_task_packet.schema.json`.
- The generated `execution_report_template.json` is validated against `schemas/studiopilot_execution_report.schema.json` before any files are written.
- The rendered prompt is produced with the same local logic as `render_codex_prompt.py`.

## CLI

Dry-run validation and in-memory rendering only:

```powershell
.\.venv312\Scripts\python.exe scripts/control_plane/prepare_codex_handoff.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json
```

Create a fresh local handoff folder:

```powershell
.\.venv312\Scripts\python.exe scripts/control_plane/prepare_codex_handoff.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json --output-dir lab/gameplay_observation/sandbox_outputs/codex_handoff_example
```

Options:

- `--output-dir <path>` creates a new handoff folder. The directory must not already exist.
- `--pretty` renders the prompt with extra spacing.
- `--validation-command-mode include|omit` controls whether packet validation commands appear in `codex_prompt.txt`.
- `--repo-path <path>` controls schema lookup and repo-relative forbidden path checks.

No files are written when `--output-dir` is omitted.

## Generated Files

When `--output-dir` is provided, exactly these files are written:

- `task_packet.json`
- `codex_prompt.txt`
- `execution_report_template.json`
- `README_NEXT_STEPS.md`

The output directory is refused if any generated target would land inside a `forbidden_paths` pattern from the TaskPacket.

## Operator Flow

1. Validate the TaskPacket and generate the handoff folder locally.
2. Inspect `task_packet.json` and `codex_prompt.txt`.
3. If a human chooses to start Codex separately, use the rendered prompt outside this generator.
4. After Codex execution, complete `execution_report_template.json` with actual changed files, commands, validation results, skipped validation, risks, and verdicts.
5. Validate the completed execution report before building any ReviewPacket.

## Required Validation

```powershell
.\.venv312\Scripts\python.exe scripts/control_plane/validate_studiopilot_packets.py --pretty
.\.venv312\Scripts\python.exe scripts/operator/validate_json_artifacts.py
.\.venv312\Scripts\python.exe -m py_compile scripts/control_plane/prepare_codex_handoff.py
.\.venv312\Scripts\python.exe scripts/control_plane/prepare_codex_handoff.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json --output-dir lab/gameplay_observation/sandbox_outputs/codex_handoff_smoke
```

The smoke output path is non-canonical sandbox output and must not be committed.

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_HANDOFF_PACK_ONLY
- evidence_verdict: DRY_RUN_HANDOFF_PREPARATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

# ReviewPacket Dry-Run Builder (SP-206)

## Purpose

`scripts/control_plane/build_review_packet.py` is a local dry-run builder that reads a validated StudioPilot `ExecutionReport` and optionally a validated `TaskPacket`, then emits a schema-valid StudioPilot `ReviewPacket`.

In the reporting chain, ReviewPacket output is source or annex material for LocalReviewPack. It is not the main solo review summary and does not replace PRDecisionPacket decision support or HumanGate.

## Hard Boundaries

- This builder is dry-run only.
- ReviewPacket output is non-binding.
- ReviewPacket output is not promotion authorization.
- ReviewPacket output is not an approval.
- ReviewPacket output is not merge authorization.
- ReviewPacket output is not claim authorization.
- ReviewPacket output is not canonical evidence.
- The builder does not call GPT, OpenAI, Codex, or GitHub.
- The builder does not execute tasks.
- The builder does not create PRs.
- The builder does not decide HumanGate.
- HumanGate remains the only final authority for merge, claim, and promotion decisions.
- This is preparation for future review automation, not automation itself.

## Inputs and Validation

- Required input: local ExecutionReport JSON validated against `schemas/studiopilot_execution_report.schema.json`.
- Optional input: local TaskPacket JSON validated against `schemas/studiopilot_task_packet.schema.json`.
- Generated output is validated against `schemas/studiopilot_review_packet.schema.json` before emission.

## CLI

```bash
python scripts/control_plane/build_review_packet.py <execution_report_path> [--task-packet <path>] [--output <path>] [--pretty] [--review-id <id>] [--source-pr <value>]
```

- No file is written unless `--output` is explicitly provided.
- `--output` refuses overwrite and requires that parent directory already exists.
- Without `--output`, JSON is printed to stdout.

## Examples

```bash
python scripts/control_plane/build_review_packet.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_execution_report_docs.json --pretty
```

```bash
python scripts/control_plane/build_review_packet.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_execution_report_docs.json --task-packet docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json --pretty
```

## Risk Inference (V0)

- `scope_deviation=BLOCKING` forces `scope_risk=BLOCKING` and `recommendation=BLOCKED`.
- Non-`NO_CLAIM_ALLOWED` execution claim verdict increases claim risk.
- Runtime-path file changes increase runtime risk.
- Missing `validation_results` or failed validations increase evidence risk and can block recommendation.
- Unknown or ambiguous signals escalate risk rather than reducing it.

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_REVIEW_PACKET_TOOLING_ONLY
- evidence_verdict: REVIEW_PACKET_DRY_RUN_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

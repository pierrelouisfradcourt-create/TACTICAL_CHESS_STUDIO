# StudioPilot Packet Schemas V0 (SP-202)

This document defines V0 schema contracts for StudioPilot loop packets.

## Boundary

- These schemas are V0 contracts only.
- This PR does not activate execution behavior.
- This PR does not authorize autonomy.
- This PR does not add training flows.
- This PR does not allow prompt mutation.
- This PR does not allow claim scope expansion.

## Packet Roles

- TaskPacket precedes Codex work and defines bounded scope.
- ExecutionReport captures structured implementation output and validation notes.
- ReviewPacket captures non-binding review guidance only.
- HumanDecision is the only final authority record.

Schema files (namespaced to avoid collision with legacy control-plane contracts):
- `schemas/studiopilot_task_packet.schema.json`
- `schemas/studiopilot_execution_report.schema.json`
- `schemas/studiopilot_review_packet.schema.json`
- `schemas/studiopilot_human_decision.schema.json`

## Authority and Evidence Notes

- ExecutionReport is not proof by itself.
- ReviewPacket cannot authorize merge, promotion, or claims.
- HumanDecision separates merge, claim, and promotion decisions.

## Renderer Companion

SP-204 adds `scripts/control_plane/render_codex_prompt.py` as a dry-run renderer that converts a validated StudioPilot TaskPacket into manual Codex prompt text.

- It does not call Codex, OpenAI, or GitHub.
- It does not execute TaskPacket instructions.
- It does not authorize merge, promotion, or claims.

## Mechanical Validation

- Valid fixtures must pass their mapped StudioPilot V0 schemas.
- Invalid fixtures must fail their mapped StudioPilot V0 schemas.
- Local script:
  `python scripts/control_plane/validate_studiopilot_packets.py --pretty`
- This does not execute StudioPilot.
- This does not create TaskPackets.
- This does not call Codex.
- This does not create evidence or claims.

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_TOOLING_ONLY
- evidence_verdict: FIXTURE_VALIDATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

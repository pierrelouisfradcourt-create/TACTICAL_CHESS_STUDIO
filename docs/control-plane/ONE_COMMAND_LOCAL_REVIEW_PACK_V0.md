# One-Command Local Review Pack V0

One-Command Local Review Pack V0 reduces copy-paste for the solo founder by combining local ExecutionReport-like, ReviewPacket-like, HumanDecision-like, and PRDecisionPacket-like inputs into one compact local review pack. The LocalReviewPack is the main solo review summary; the other packet shapes remain sources, annexes, or decision-support inputs.

It is local control-plane tooling only. It is not an executor, not Codex execution, not GitHub automation, not model training, not benchmark automation, and not runtime or ML work.

The local tool does not call GitHub, Codex, or OpenAI APIs. It does not use secrets. It does not mark a pull request ready. It does not merge. It only reads a local JSON input and emits a deterministic JSON recommendation to stdout.

The recommendation vocabulary is:

- GO
- GO_READY_AND_MERGE
- HOLD
- BLOCKED
- BLOCKED_INFRA

HumanGate remains the final authority. Required checks must be green before merge. There is no auto-ready and no auto-merge.

Vision-map note: this pack belongs to the normalized data and local summary surface described in [CONTROL_PLANE_VISION_MAP_V0.md](CONTROL_PLANE_VISION_MAP_V0.md). It is not an agent, AI analyst, director, CEO, or HumanDecision.

## Reporting Relationship

- LocalReviewPack is the main solo review summary for reducing Codex report confusion.
- ExecutionReport and ReviewPacket material are source or annex material for the summary.
- PRDecisionPacket material is decision support for encoded scope, checks, and next-action status.
- HumanGate remains the final authority for ready, merge, promotion, and claim decisions.

## Local Inputs

The input file groups four local control-plane sections:

- `execution_report`
- `review_packet`
- `human_decision`
- `pr_decision_packet`

The PRDecisionPacket-like section supplies the final encoded scope, checks, software, evidence, claim, merge, and touched-surface status. The local review pack refuses missing HumanGate, auto-ready, auto-merge, and claim escalation outside the allowed local vocabulary.

When a report carries `patch_type`, use only this local classification vocabulary:

- `docs_only`
- `control_plane_local`
- `runtime`
- `ml`
- `evidence`
- `future_agent_readiness`

## Local Tooling

`scripts/control_plane/build_local_review_pack.py` reads one combined local input JSON file and emits a `studiopilot.local_review_pack.v0` object to stdout.

`scripts/control_plane/smoke_local_review_pack.py` runs deterministic smoke fixtures for GO, HOLD, BLOCKED_INFRA, and invalid safety boundaries.

The scripts are constrained to:

- no network
- no GitHub API calls
- no Codex API calls
- no OpenAI API calls
- no subprocess
- no secrets
- no file writes
- stdout only

## Decision Rules

- BLOCKED_INFRA wins when checks are blocked by infrastructure.
- HOLD is emitted when checks are pending or the status is uncertain.
- BLOCKED is emitted for failed checks, scope violations, or forbidden touched surfaces.
- GO_READY_AND_MERGE is emitted only when checks are successful, scope is OK, software is SAFE, claim verdict is NO_CLAIM_ALLOWED, HumanGate is required, auto-ready and auto-merge are false, and the merge verdict allows it.

Even GO_READY_AND_MERGE is only a local review summary for the human founder. It does not ready or merge the pull request.

For human-facing Codex reports, use this verdict shorthand without changing the JSON recommendation vocabulary:

- GO means reviewable or actionable.
- HOLD means incomplete or inefficient.
- REJECT means an incorrect or harmful patch.
- GUARD means blocked by safety, governance, evidence, or HumanGate.

## Future Integration

Future integration with LearningEvent may record that a local review summary was produced, but it must preserve HumanGate, required-check gates, no auto-ready, no auto-merge, and NO_CLAIM_ALLOWED boundaries.

## Current Verdicts

software_verdict: CONTROL_PLANE_LOCAL_REVIEW_PACK_ONLY

evidence_verdict: LOCAL_REVIEW_SUMMARY_ONLY

claim_verdict: NO_CLAIM_ALLOWED

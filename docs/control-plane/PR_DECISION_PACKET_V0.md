# PRDecisionPacket V0

PRDecisionPacket is a compact decision object for the human founder. It summarizes a pull request into a small local record so the final review path can use GO, HOLD, BLOCKED, or BLOCKED_INFRA without relying on long Codex reports or repeated copy-paste. It is decision support for the LocalReviewPack, not a competing main solo review summary.

It is not an executor. It does not call GitHub, Codex, or OpenAI APIs. It does not mark a pull request ready. It does not merge. It does not authorize claims, promotion, benchmarks, training, or runtime changes.

The packet summarizes:

- scope
- checks
- software verdict
- evidence verdict
- claim verdict
- objective status
- next action

HumanGate remains the final authority. Even when a packet reports GO_READY_AND_MERGE, the result means only that the local decision summary found no encoded blocker and required checks are represented as green. Required checks must be green before merge, and the human founder still decides whether to ready or merge.

## Decision States

- GO: local packet indicates the PR may move toward human ready review.
- GO_READY_AND_MERGE: local packet indicates checks, scope, and software verdict are green enough for the human founder to decide whether to ready and merge.
- HOLD: local packet indicates pending checks, uncertain scope, risky software verdict, or draft-only state.
- BLOCKED: local packet indicates a failed check, forbidden surface, or explicit software blocker.
- BLOCKED_INFRA: local packet indicates infrastructure prevented normal check evaluation.

For human-facing Codex reports that use the shorter review vocabulary:

- GO means reviewable or actionable.
- HOLD means incomplete or inefficient.
- REJECT means an incorrect or harmful patch.
- GUARD means blocked by safety, governance, evidence, or HumanGate.

## Local Tooling

`scripts/control_plane/build_pr_decision_packet.py` reads one local PRDecisionPacket JSON file and emits a deterministic PRDecisionSummary JSON object to stdout.

`scripts/control_plane/smoke_pr_decision_packet.py` runs deterministic local smoke fixtures for GO, HOLD, BLOCKED_INFRA, and invalid safety boundaries.

The scripts are local control-plane tooling only:

- no network
- no GitHub API calls
- no Codex API calls
- no OpenAI API calls
- no subprocess
- no secrets
- no file writes
- stdout only

## Future Integration

PRDecisionPacket is designed to fit beside the existing StudioPilot control-plane records:

- ExecutionReport
- ReviewPacket
- HumanDecision
- LearningEvent

In the reporting chain, ExecutionReport and ReviewPacket are source or annex records, PRDecisionPacket is decision support, and LocalReviewPack remains the main solo review summary. Those future integrations must preserve HumanGate, required check gates, and NO_CLAIM_ALLOWED boundaries.

## Current Verdicts

software_verdict: CONTROL_PLANE_PR_DECISION_PACKET_ONLY

evidence_verdict: LOCAL_DECISION_SUMMARY_ONLY

claim_verdict: NO_CLAIM_ALLOWED

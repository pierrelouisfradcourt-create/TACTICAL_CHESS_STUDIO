# PatchPack CampaignPlan V0

PatchPack means one large objective split into coherent PatchGroups and PR candidates before execution begins. CampaignPlan V0 is the planning object for that split. It records scope, forbidden changes, local validation, stop conditions, budget gates, and the human gates required before work moves forward.

CampaignPlan is local-first batching. The studio can plan a larger objective, inspect the PatchGroups, and decide whether the campaign should remain draft, move to planning, hold, block, or continue. The object does not execute commands, call Codex, call OpenAI, call GitHub, create branches, create PRs, ready PRs, merge PRs, or mutate the repository by itself.

## CampaignPlan And PRQueue

CampaignPlan answers what the campaign is allowed to attempt and how it should be split.

PRQueue answers which PR candidate should be considered next.

CampaignPlan stays at campaign and PatchGroup level. PRQueue is the sequencing layer that can later feed TaskPackets or handoff packs. Neither object is an autonomous runner.

## Human Gates

The human approves the campaign, each PatchGroup boundary, each future bounded handoff task, and final ready or merge decisions. `human_gate_required` remains true. PatchGroups also carry explicit human approval.

No schema or fixture in this pack authorizes:

- auto-merge
- auto-ready
- auto-claim
- auto-promotion
- benchmark automation
- runtime or ML changes unless explicitly scoped and gated

Codex executes only bounded handoff tasks after the human chooses them. A CampaignPlan can describe future Codex work, but it does not start Codex or any other agent.

## Local-First Validation

Local validation comes before GitHub Actions. The campaign records commands that should be run locally for the PR candidate, and those reports feed the next planning decision. GitHub Actions remains a final short gate after local validation, not a replacement for local review.

Benchmarks are never automatic. Performance runs are not proof. Holdout is not used as campaign evidence.

## Decisions

Campaign-level decisions are:

- GO: local planning is coherent enough to prepare the next handoff
- HOLD: wait for human review or more local context
- BLOCKED: scope, validation, claim, or policy violation
- BLOCKED_INFRA: remote or infrastructure failure that is outside the patch contents

Stop conditions include failed checks, scope violation, claim escalation, forbidden path touches, benchmark attempts, runtime touches without scope, and ML training attempts.

## Verdicts

software_verdict: CONTROL_PLANE_PATCHPACK_SCHEMA_TOOLING_ONLY

evidence_verdict: LOCAL_FIRST_PATCHPACK_PLANNING_ONLY

claim_verdict: NO_CLAIM_ALLOWED

# Campaign Local Loop V0

Campaign Local Loop V0 is a local dry-run loop, not an autonomous runner. It reads a schema-valid CampaignPlan and PRQueue, selects the next bounded PR candidate, renders a TaskPacket-like draft to stdout, and renders a compact GO / HOLD / BLOCKED / BLOCKED_INFRA summary for a human.

The loop does not execute Codex. It does not call OpenAI. It does not call the GitHub API. It does not create branches, create PRs, mark PRs ready, merge PRs, run benchmarks, run training, or mutate runtime/ML code.

## Objects

CampaignPlan defines the objective, allowed paths, forbidden paths, stop conditions, validation expectations, and claim boundaries for a local-first campaign.

PRQueue sequences PR candidates from that campaign. It records candidate readiness, dependencies, local-first CI policy, merge policy, learning policy, HumanGate requirements, and the queue verdict.

The next TaskPacket draft is a bounded handoff object. It prepares a local dry-run Codex handoff shape, but it is not execution authorization by itself.

The campaign decision summary gives the human a short machine-readable GO / HOLD / BLOCKED / BLOCKED_INFRA decision. HumanGate remains final authority.

## Boundaries

- no auto-merge
- no auto-ready
- no benchmark automation
- no runtime change
- no ML or training change
- no GitHub Actions workflow change
- no GitHub API call from the scripts
- no Codex or OpenAI call from the scripts
- no file writes from the scripts

Future work can integrate ExecutionReport, ReviewPacket, HumanDecision, and LearningEvent objects after the human approves the next local control-plane boundary.

## Verdicts

software_verdict: CONTROL_PLANE_CAMPAIGN_LOCAL_LOOP_ONLY

evidence_verdict: LOCAL_FIRST_DRY_RUN_ONLY

claim_verdict: NO_CLAIM_ALLOWED

# StudioPilot Control-Plane V0

## Purpose

This folder contains the StudioPilot control-plane V0 docs.

Current status: manual, dry-run, non-canonical.

Current stabilized surfaces:

| Surface | Status | Boundary |
| --- | --- | --- |
| active runtime code | IMPLEMENTED | Rust runtime remains the gameplay truth; this index does not change runtime behavior. |
| tests | TESTED | Dry-run and in-memory control-plane harnesses exist for local validation only. |
| tools_scripts | IMPLEMENTED | Python control-plane scripts provide validators, renderers, dry-run compilers, and in-memory loop checks. |
| artifacts_runtime_outputs | TESTED | `.studio_state/current_state.json` is local ignored state; no inbox, latest, lab run, puzzle, benchmark, or claim artifact is authorized here. |
| schemas | PASSIVE | JSON schemas are passive contracts and validators, not runtime authority. |
| canonical_docs | DOCUMENTED_ONLY | This folder documents the control-plane boundaries and indexes implemented tooling. |
| roadmap_docs_only | DOCUMENTED_ONLY | Roadmap and campaign docs remain planning-only until explicit HumanGate approval. |
| inference | PASSIVE | Neural may propose/rerank only; Search remains final authority. |

There is no active StudioPilot runtime. There is no autonomy.

Dry-run tooling exists, but runtime activation, Codex execution, PR creation, auto-ready, auto-merge, dataset generation, training, benchmarks, model promotion, and public claims remain BLOCKED unless a separate explicit HumanGate decision authorizes a narrower action.

Vision map: [CONTROL_PLANE_VISION_MAP_V0.md](CONTROL_PLANE_VISION_MAP_V0.md) clarifies the macro/data/analysis/director/board/CEO/HumanDecision mental model without adding architecture or activation.

The Vision Map is a navigation and mental-model document, not an authority layer.

This index is navigation documentation only. It is not a new capability, not automation, not evidence, and not a benchmark or claim.

## Reading Order

1. [LOOP_CONTRACT.md](LOOP_CONTRACT.md)
2. [AUTHORITY_MATRIX.md](AUTHORITY_MATRIX.md)
3. [LOOP_STATES.md](LOOP_STATES.md)
4. [STUDIOPILOT_PACKET_SCHEMAS.md](STUDIOPILOT_PACKET_SCHEMAS.md)
5. [RENDER_CODEX_PROMPT.md](RENDER_CODEX_PROMPT.md)
6. [CODEX_HANDOFF_PACK.md](CODEX_HANDOFF_PACK.md)
7. [EXECUTION_REPORT_INTAKE.md](EXECUTION_REPORT_INTAKE.md)
8. [REVIEW_PACKET_DRY_RUN.md](REVIEW_PACKET_DRY_RUN.md)
9. [HUMAN_DECISION_DRY_RUN.md](HUMAN_DECISION_DRY_RUN.md)
10. [STUDIOPILOT_LOOP_SMOKE.md](STUDIOPILOT_LOOP_SMOKE.md)
11. [STUDIOPILOT_OPERATOR_MANUAL.md](STUDIOPILOT_OPERATOR_MANUAL.md)
12. [STUDIOPILOT_MANUAL_LOOP_TRIAL_001.md](STUDIOPILOT_MANUAL_LOOP_TRIAL_001.md)
13. [STUDIOPILOT_CONTROL_PLANE_V0_AUDIT.md](STUDIOPILOT_CONTROL_PLANE_V0_AUDIT.md)
14. [CI_LOCAL_FIRST_POLICY.md](CI_LOCAL_FIRST_POLICY.md)
15. [PATCHPACK_CAMPAIGN_PLAN_V0.md](PATCHPACK_CAMPAIGN_PLAN_V0.md)
16. [PR_QUEUE_V0.md](PR_QUEUE_V0.md)
17. [CAMPAIGN_LOCAL_LOOP_V0.md](CAMPAIGN_LOCAL_LOOP_V0.md)
18. [CI_COSTGUARD_LOCAL_AUDIT_V0.md](CI_COSTGUARD_LOCAL_AUDIT_V0.md)
19. [HUMAN_COMMAND_VOCABULARY_V0.md](HUMAN_COMMAND_VOCABULARY_V0.md)
20. [PR_DECISION_PACKET_V0.md](PR_DECISION_PACKET_V0.md)
21. [ONE_COMMAND_LOCAL_REVIEW_PACK_V0.md](ONE_COMMAND_LOCAL_REVIEW_PACK_V0.md)
22. [CONTROL_PLANE_INTEGRATION_SMOKE_V0.md](CONTROL_PLANE_INTEGRATION_SMOKE_V0.md)
23. [LEARNING_EVENT_MINIMAL_V0.md](LEARNING_EVENT_MINIMAL_V0.md)
24. [AI_ORG_CHART_V0.md](AI_ORG_CHART_V0.md)
25. [REPORTING_CHAIN_V0.md](REPORTING_CHAIN_V0.md)
26. [ESCALATION_MATRIX_V0.md](ESCALATION_MATRIX_V0.md)
27. [CEO_OFFICE_V0.md](CEO_OFFICE_V0.md)
28. [SPECIALIST_ROLE_BOUNDARIES_V0.md](SPECIALIST_ROLE_BOUNDARIES_V0.md)
29. [CHESS960_CAMPAIGNPLAN_DRAFT_V0.md](CHESS960_CAMPAIGNPLAN_DRAFT_V0.md)
30. [STUDIO_GOVERNANCE_LANES_V0.md](STUDIO_GOVERNANCE_LANES_V0.md)
31. [STUDIO_DEPLOYMENT_COLUMNS_V0.md](STUDIO_DEPLOYMENT_COLUMNS_V0.md)
32. [STUDIO_ROI_SCORING_V0.md](STUDIO_ROI_SCORING_V0.md)
33. [STUDIO_AGENT_BREATHING_POLICY_V0.md](STUDIO_AGENT_BREATHING_POLICY_V0.md)
34. [STUDIO_CONCEPT_FUSION_MATRIX_V0.md](STUDIO_CONCEPT_FUSION_MATRIX_V0.md)
35. [LM_STUDIO_REVIEW_CONTRACT_V0.md](LM_STUDIO_REVIEW_CONTRACT_V0.md)
36. [PROMPT_AND_REPORT_HYGIENE_CONTRACT_V0.md](PROMPT_AND_REPORT_HYGIENE_CONTRACT_V0.md)
37. [PATCH_CHAIN_ANALYZER_CONTRACT_V0.md](PATCH_CHAIN_ANALYZER_CONTRACT_V0.md)
38. [SOURCE_STATE_LEDGER_CONTRACT_V0.md](SOURCE_STATE_LEDGER_CONTRACT_V0.md)
39. [PRO_REQUEST_INTAKE_CONTRACT_V0.md](PRO_REQUEST_INTAKE_CONTRACT_V0.md)
40. [V2_REQUIREMENTS_TRACEABILITY_MATRIX_CONTRACT_V0.md](V2_REQUIREMENTS_TRACEABILITY_MATRIX_CONTRACT_V0.md)
41. [TRUTH_PACKET_AND_CODEX_PACK_CONTRACT_V0.md](TRUTH_PACKET_AND_CODEX_PACK_CONTRACT_V0.md)
42. [STUDIO_PRO_QUERY_ROUTER_V0.md](STUDIO_PRO_QUERY_ROUTER_V0.md)
43. [STUDIO_PIPELINE_STATE_MACHINE_V0.md](STUDIO_PIPELINE_STATE_MACHINE_V0.md)

Items 30-43 are Studio fusion governance contracts. They are docs-only or
passive review contracts. They do not activate runtime behavior, Codex
execution, autonomous agents, Git authority, training, benchmarks, dataset
generation, model promotion, or claim authority.

## Script Order

1. `validate_studiopilot_packets.py`
2. `render_codex_prompt.py`
3. `prepare_codex_handoff.py`
4. `validate_execution_report.py`
5. `build_review_packet.py`
6. `build_human_decision.py`
7. `run_studiopilot_loop_smoke.py`
8. `validate_patchpack_plan.py`
9. `build_next_taskpacket_from_pr_queue.py`
10. `summarize_campaign_decision.py`
11. `smoke_campaign_local_loop.py`
12. `ci_costguard_report.py`
13. `validate_human_commands.py`
14. `resolve_human_command_conflicts.py`
15. `build_pr_decision_packet.py`
16. `smoke_pr_decision_packet.py`
17. `build_local_review_pack.py`
18. `smoke_local_review_pack.py`
19. `smoke_control_plane_integration.py`
20. `validate_learning_events.py`
21. `build_learning_event.py`
22. `smoke_learning_event.py`
23. `render_studio_status_report.py`
24. `derive_studio_state_delta.py`
25. `apply_studio_state_delta_dry_run.py`
26. `update_studio_current_state.py`
27. `compile_next_mission_dry_run.py`
28. `compile_operator_inbox_dry_run.py`
29. `compile_humangate_decision_dry_run.py`
30. `apply_humangate_decision_dry_run.py`
31. `run_semi_auto_studio_loop_dry_run.py`
32. `run_full_studio_loop_in_memory_test.py`
33. `validate_prompt_report_hygiene.py`
34. `smoke_prompt_report_hygiene.py`
35. `smoke_passive_control_plane_gates.py`

## Studio State Loop Tooling

The newer Studio state loop tools are implemented as local Python control-plane tooling:

- `render_studio_status_report.py`: read-only status renderer for `.studio_state/current_state.json`.
- `derive_studio_state_delta.py`: derives a passive state delta from reports/snapshots.
- `apply_studio_state_delta_dry_run.py`: aggregates a delta in dry-run form without writing current state.
- `update_studio_current_state.py`: builds a current-state candidate; persistent writes require explicit `--write`.
- `compile_next_mission_dry_run.py`: compiles a mission candidate from current state without execution.
- `compile_operator_inbox_dry_run.py`: compiles a stdout-only operator inbox and never writes `.studio_state/inbox.json`.
- `compile_humangate_decision_dry_run.py`: compiles a HumanGate decision candidate from an inbox.
- `apply_humangate_decision_dry_run.py`: compiles an authorized next-action plan without applying it.
- `run_semi_auto_studio_loop_dry_run.py`: chains current state, inbox, HumanGate candidate, and next-action plan in stdout-only dry-run mode.
- `run_full_studio_loop_in_memory_test.py`: verifies the full loop in memory and checks that `.studio_state/current_state.json`, `.studio_state/inbox.json`, and `latest.json` are not created or modified.
- `validate_prompt_report_hygiene.py`: passive gate for Codex prompt and report shape; it emits PASS/HOLD/BLOCKED/ESCALATE_TO_HUMANGATE JSON and does not execute Codex or mutate files.
- `smoke_prompt_report_hygiene.py`: stdout-only smoke check for prompt/report hygiene fixtures; it verifies one valid prompt, one blocked prompt, and one valid ExecutionReport JSON.
- `smoke_passive_control_plane_gates.py`: stdout-only aggregate for passive gates; it runs the integration smoke and prompt/report hygiene smoke without runtime, Git, training, dataset, or benchmark authority.

These tools are IMPLEMENTED control-plane tooling. They do not activate runtime behavior, Codex execution, autonomous agents, training, benchmarks, dataset writes, `latest.json`, lab outputs, or claims.

## Manual Loop

`TaskPacket -> rendered Codex prompt -> ExecutionReport -> ReviewPacket -> HumanDecision -> loop smoke`

## PR Decision States

- [BLOCKED_INFRA.md](BLOCKED_INFRA.md): classify control-plane infra blockers when GitHub Actions checks fail before job start
- [CHESS960_CAMPAIGNPLAN_DRAFT_V0.md](CHESS960_CAMPAIGNPLAN_DRAFT_V0.md): docs-only Chess960 CampaignPlan, PRQueue draft, Director/Specialist requirements, HumanGate gates, and `NO_CLAIM_ALLOWED` policy

## Boundaries

The StudioPilot control-plane V0 scripts and docs do not provide or authorize:

- no Codex API
- no OpenAI API
- no GitHub API from the control-plane scripts
- no MCP write tools
- no auto-ready
- no auto-merge
- no training
- no fine-tuning
- no runtime/search/neural refactor through StudioPilot
- no canonical evidence creation
- no benchmark proof
- no capability claim

HumanGate remains final authority.

## Current Verdicts

software_verdict: CONTROL_PLANE_DRY_RUN_TOOLING_INDEXED

evidence_verdict: DOCUMENTED_ONLY_INDEX_WITH_IMPLEMENTED_TOOLING_READBACK

claim_verdict: NO_CLAIM_ALLOWED

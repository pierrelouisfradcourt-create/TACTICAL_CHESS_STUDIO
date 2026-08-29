# GPT Navigator Repo Notice V0

> **LEGACY PRE-FORGE — FROZEN 2026-08-28 (HumanGate decision: Pierre).**
> Pre-Forge Codex/GPT-Navigator control plane (last substantive update 2026-05,
> scoped to TacticalChessPureLab). NOT current studio truth — do not use as a
> source anchor for Forge-lane work. Current truth: `docs/forge/STUDIO_MASTER_SCHEMA.html`
> (Détail M, 2026-08-28) + `docs/adr/ADR-003-forge-workflow-coherence-audit.md`.

## Purpose
Short mental map for ChatGPT browser sessions navigating TacticalChessPureLab.

## Read-First Sources
| Status | Source |
| --- | --- |
| navigator_guard | AGENTS.md |
| navigator_guard | docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md |
| navigator_guard | docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md |
| navigator_guard | docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md |
| navigator_guard | docs/gpt-navigator/GPT_NAVIGATOR_PROJECT_INSTRUCTIONS_V0.md |
| navigator_guard | README.md |
| main_truth | 00_STUDIO_CONTROL/01_SYSTEM/index/READ_FIRST.md |
| main_truth | 00_STUDIO_CONTROL/00_MASTER_DOCS/DOCS_STATUS.md |
| main_truth | 00_STUDIO_CONTROL/00_MASTER_DOCS/CURRENT_STATE_INDEX.md |
| main_truth | 00_STUDIO_CONTROL/00_MASTER_DOCS/01_CURRENT_STATE.md |
| main_truth | 00_STUDIO_CONTROL/00_MASTER_DOCS/03_KNOWN_ISSUES.md |
| main_truth | 00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md |
| main_truth | 00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md |
| main_truth | 00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md |
| main_truth | 00_STUDIO_CONTROL/01_SYSTEM/index/CONTROL_INDEX.md |

Do not treat all non-archive Markdown as main truth.

## Reference Sources
| Status | Source |
| --- | --- |
| reference | 00_STUDIO_CONTROL/00_MASTER_DOCS/00_EXEC_SUMMARY.md |
| reference | 00_STUDIO_CONTROL/00_MASTER_DOCS/02_COMMAND_CHEATSHEET.md |
| reference | 00_STUDIO_CONTROL/00_MASTER_DOCS/06_DECISION_LOG.md |
| reference | 00_STUDIO_CONTROL/00_MASTER_DOCS/07_PROJECT_HISTORY.md |
| reference | 00_STUDIO_CONTROL/00_MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md |
| reference | MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md |
| reference | MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md |
| reference | MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md |
| reference | docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md |
| reference | docs/control-plane/README.md |
| reference | docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md |
| reference | docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md |
| reference | docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md |

## Studio Control Sources Outside Repo
| Status | Source |
| --- | --- |
| main_truth | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md |
| main_truth | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md |
| main_truth | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/index/CONTROL_INDEX.md |
| reference | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md |
| reference | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md |
| reference | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_CHARTER_TEMPLATE_V0.yaml |
| reference | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/EXECUTOR_REPORT_TEMPLATE_V0.yaml |
| reference | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml |

Most contracts, forms, registries, policies, passive specs, and roadmaps are on-demand reference sources.
Temporary task reports and Codex audit reports remain task-specific unless HumanGate promotes them.

## Source Anchoring Rule
Always separate:
- created
- registered
- loaded
- enforced
- evidenced

Core rule:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

A newly created control document must not be used as loaded project truth until its registration, loading, enforcement, and evidence state is reported.

Created != registered != loaded != enforced != evidenced.

`no_global_ready_verdict: true`

## Studio Control Topology

`STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` records the current unique-prefix Studio Control root topology and supersedes the earlier duplicate-prefix freeze state. Refresh project sources after this migration before using Studio Control paths as loaded project truth.

Current compact top-level topology is `00_MASTER_DOCS`, `01_SYSTEM`, `02_PIPELINE`, and `99_ARCHIVE`. Older direct-prefix paths such as `01_MAPS`, `02_NAVIGATION`, `05_STATUS`, and `07_FORMS` are historical drift unless explicitly verified for a scoped task.

## Local vs GitHub Split Rule
Always verify local `HEAD` and `origin/main` live with Git before relying on any doc mention of the split.

Do not trust hardcoded branch or SHA claims in local-history docs. Some `MASTER_DOCS` files mention older local stack splits; treat those statements as local-history reference only until current Git commands confirm them.

## Daily Backup Policy

```yaml
daily_backup_policy:
  default_commit: BLOCKED
  default_push: BLOCKED
  task_level_commit_push: BLOCKED
  daily_backup_push_main: ALLOWED_ONLY_WHEN_EXPLICITLY_REQUESTED
  max_frequency: "1 per day"
  purpose: "backup only"
  claim_posture: "NO_CLAIM_ALLOWED"
  promotion_status: "NO_PROMOTION"
```

Local work is the default. Executor reports are local evidence records, not GitHub promotion events. A daily backup push to `main` may be requested by the human as a safeguard only, and it must not be treated as readiness, release, promotion, benchmark proof, runtime activation, dataset promotion, model promotion, or scientific claim validation.

## Do Not Treat As Active Truth
- lab/*
- latest.json
- benchmark summaries
- old reprise prompts
- archive docs
- roadmap docs without code/test evidence
- docs-only local history notes used alone
- generated reports unless explicitly scoped

## ROCKY Docs-Only Classification

The ROCKY control-plane docs are `DOCUMENTED_ONLY` and `roadmap_docs_only` until a later preflight and HumanGate promote any narrower work item.

Task-specific docs-only sources:

- docs/control-plane/ROCKY_COST_SEARCH_OBSERVABILITY_V0.md
- docs/control-plane/ROCKY_ERROR_TO_PUZZLE_CURRICULUM_V0.md
- docs/control-plane/ROCKY_ERROR_TO_PUZZLE_ROADMAP_V0.md

They do not claim CostSearch implementation, Error-to-Puzzle implementation, training, benchmark proof, dataset generation, runtime authority, agent activation, Chess960 activation, or DecisionController activation.

Claim posture: NO_CLAIM_ALLOWED.

## Analysis Rules
Always separate:
- active runtime code
- tests
- artifacts/runtime outputs
- canonical docs
- roadmap/docs-only
- inference

Use status tags:
- IMPLEMENTED
- TESTED
- DOCUMENTED_ONLY
- PASSIVE
- BLOCKED
- NOT_FOUND
- UNKNOWN

## Project Doctrine
- Rust = runtime truth.
- Python = ML/inference/tooling.
- Search = final authority.
- Neural = proposes/reranks only.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.

## Evidence scale
- Doc = intention / doctrine
- Code = implementation
- Test = verification
- Log / benchmark / report = observation only
- HumanGate = validation / promotion

## Authority clarification
- Search engine = final gameplay decision authority.
- Repo inspection = factual authority for current repository state.
- HumanGate = final authority for promotion, claim, activation, merge, reject, or freeze.

## Anti-activation rule
A roadmap, report, benchmark, log, or generated artifact cannot activate ActionMask, Chess960 runtime, DecisionController, training, dataset reset, or neural authority. Activation requires explicit HumanGate and matching active code/tests.

Classic/Rocky runtime claims require code/test evidence, not docs-only evidence.

## Codex Prompt Rule
Only propose a Codex prompt when a repo action is necessary or explicitly requested.

Before generating any Codex prompt, apply docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md.

If the required source anchors are not loaded or provided in the current context, GPT Navigator must report BLOCKED and must not generate the Codex prompt.

GPT Navigator must not generate Codex prompts from memory.

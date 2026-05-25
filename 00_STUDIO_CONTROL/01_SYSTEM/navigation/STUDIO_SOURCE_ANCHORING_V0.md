# Studio Source Anchoring V0

Status: DOCUMENTED_ONLY
Owner: HumanGate
Scope: Source registration and pipeline anchoring for ChatGPT Navigator, Codex, and future read-only analysis agent
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

## 1. Purpose

This document links the studio control pipeline to its required source anchors.

It prevents the studio from using newly created contracts, templates, or reports only from memory or conversational context.

A document is not operational until it is:

- created
- registered
- loaded
- enforced
- evidenced

`00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` is the route, owner, consumer, status, and evidence authority for registered control-room files when local file metadata is incomplete.

## 2. Core Rule

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Definitions:

| State | Meaning | Minimum evidence |
| --- | --- | --- |
| created | The file exists on disk. | File path and readback. |
| registered | The file is listed in the source registry or upload checklist. | Registry entry or checklist entry. |
| loaded | The file has been uploaded to ChatGPT Project Sources or explicitly read in the active task. | Upload state, project source list, or command/tool readback. |
| enforced | The active task, report, or agent prompt applies the source rules. | Executor report, task charter, AGENTS rule, or analysis record cites enforcement. |
| evidenced | The final report records commands, results, validation, and source state. | Commands run, readback, skipped validation, risks, and verdicts. |

File creation alone is not a source-control event. Registration alone does not prove that a running assistant has loaded or enforced the source.

## 3. Anchor Map

| Anchor | Canonical location | Surface | Status |
| --- | --- | --- | --- |
| Source anchoring rule | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| Studio Control topology freeze | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| Studio output routing policy | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| Studio Control Cleanup Status | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_CLEANUP_APPLY_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| Studio Control topology migration status | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | canonical_docs | DOCUMENTED_ONLY |
| Studio AutoDev Pipeline I/O Contract | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| Task charter template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | canonical_docs | DOCUMENTED_ONLY |
| Executor report template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | canonical_docs | DOCUMENTED_ONLY |
| Analysis agent record template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | canonical_docs | DOCUMENTED_ONLY |
| GPT Navigator source index | `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| GPT Navigator upload checklist | `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| GPT Navigator repo notice | `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_REPO_NOTICE_V0.md` | canonical_docs | DOCUMENTED_ONLY |
| Codex AGENTS anchoring rule | `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/AGENTS.md` | canonical_docs | DOCUMENTED_ONLY |

## 3.1 Studio Agentic Pyramid Source State

These sources are Studio Control documents registered as GPT Navigator reference sources. They are not permanent repo-local sources and they do not authorize runtime, agent, training, benchmark, dataset, model, publishing, or claim actions.

| Source | Canonical location | Surface | Created | Registered | Loaded | Enforced | Evidenced |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Studio Agentic Pyramid Architecture V0 | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md` | canonical_docs | DOCUMENTED_ONLY | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY after readback and grep evidence |
| Studio Agentic Pyramid Activation Roadmap V0 | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/STUDIO_AGENTIC_PYRAMID_ACTIVATION_ROADMAP_V0.md` | roadmap_docs_only | DOCUMENTED_ONLY | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY after readback and grep evidence |

## 4. ChatGPT Project Sources

ChatGPT Project Sources are a loaded-context surface, not a file system surface.

Rules:

- A source is registered for upload only when it appears in `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` or `GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md`.
- A registered source is not loaded until it is present in the active ChatGPT Project Sources or explicitly read into the active task.
- A loaded source is not enforced unless the active instructions, task charter, or executor report applies it.
- Enforced source use must be evidenced in the final report.

When a source is missing from the active project source set, use `NOT_FOUND` for the loaded state or `UNKNOWN` if the source set was not inspected.

## 5. GPT Navigator Registration

GPT Navigator must treat `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` as the registration map.

The index should separate:

- repo-local permanent project sources
- Studio control sources outside the repo
- temporary or task-specific sources

Temporary sources do not become active truth by being uploaded. Reports, logs, lab outputs, benchmarks, and roadmap notes remain observation or planning unless a human-approved control record promotes them.

## 6. Studio AutoDev Pipeline I/O Contract

`STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` defines the canonical record flow:

```text
task_charter_input -> executor_report_output -> analysis_agent_record
```

For file-producing tasks, the record flow must include routing evidence:

```text
task_charter_input.output_routing -> executor_report_output.route_check + output_routing_result -> analysis_agent_record.routing_compliance_analysis
```

Source anchoring adds a required evidence posture to that flow:

```text
source created -> source registered -> source loaded -> rule enforced -> evidence reported
```

The YAML templates are canonical forms only. They do not prove source loading or enforcement by themselves.

## 7. Codex AGENTS Anchoring Rule

For repository work, Codex must begin from current repository evidence:

- branch
- HEAD
- worktree status
- pre-existing modified, staged, deleted, or untracked files

For source-anchoring work, Codex must also report source state separately:

- created
- registered
- loaded
- enforced
- evidenced

Codex must not use memory, conversational context, or an unregistered local file as if it were loaded project truth.

## 8. Future Read-Only Analysis-Agent Gate

Future analysis-agent work remains `PASSIVE` and `BLOCKED` from mutation until a human explicitly authorizes activation.

Required gate before any read-only analysis-agent record is trusted:

| Gate | Required status | Evidence |
| --- | --- | --- |
| Task charter input exists | DOCUMENTED_ONLY | Path and readback. |
| Executor report output exists | DOCUMENTED_ONLY | Path and readback. |
| Source anchoring source is registered | DOCUMENTED_ONLY | Source index or checklist entry. |
| Source anchoring source is loaded | DOCUMENTED_ONLY or UNKNOWN | Project source evidence, explicit readback, or declared unknown. |
| Write access remains blocked | BLOCKED | Analysis record authority limits. |
| Runtime execution remains blocked | BLOCKED | Analysis record authority limits. |
| Claims stay bounded | DOCUMENTED_ONLY or PASSIVE | Verdicts split by surface. |

The future analysis agent must not:

- create files
- update files
- delete files
- patch code
- patch tests
- run runtime commands
- run training
- run benchmarks
- generate datasets
- reset datasets
- create run folders
- create `latest.json`
- create models or checkpoints
- promote models or checkpoints
- activate Chess960
- activate DecisionController
- activate agents
- commit
- push
- create branches
- create pull requests

## 9. Required Final-Report Evidence

Any task that creates, updates, registers, or relies on Studio control sources must report:

- commands run
- results
- skipped validation
- risks
- software_verdict
- evidence_verdict
- claim_verdict

Verdicts must be split by surface:

- active_runtime_code
- tests
- artifacts_runtime_outputs
- canonical_docs
- roadmap_docs_only
- inference

A global ready or not-ready verdict is not allowed.

## 10. Non-Authorization

This source-anchoring layer is documentation only.

It does not authorize:

- runtime implementation
- Cost Search
- Error-to-Puzzle
- gameplay changes
- agent activation
- training
- benchmarking
- dataset generation
- dataset reset
- model or checkpoint creation
- model promotion
- Chess960 activation
- DecisionController activation
- commits
- pushes
- branch creation
- pull request creation

Any such action requires a separate explicit human-approved task charter.

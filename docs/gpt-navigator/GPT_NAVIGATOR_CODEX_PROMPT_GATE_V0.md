# GPT Navigator Codex Prompt Gate V0

> **LEGACY PRE-FORGE — FROZEN 2026-08-28 (HumanGate decision: Pierre).**
> Pre-Forge Codex/GPT-Navigator control plane (last substantive update 2026-05,
> scoped to TacticalChessPureLab). NOT current studio truth — do not use as a
> source anchor for Forge-lane work. Current truth: `docs/forge/STUDIO_MASTER_SCHEMA.html`
> (Détail M, 2026-08-28) + `docs/adr/ADR-003-forge-workflow-coherence-audit.md`.

Status: DOCUMENTED_ONLY
Scope: Required source-backed gate before GPT Navigator may generate Codex prompts
Runtime authority: NONE
Codex execution authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Purpose

This document defines the mandatory source-backed gate that GPT Navigator must apply before generating any Codex prompt.

It prevents GPT Navigator from generating prompts from memory, conversational context, stale documents, or unverified local assumptions.

This gate does not authorize Codex execution by itself.

---

## 2. Core Rule

```text
No source readback -> no Codex prompt.
No loaded template -> no task charter.
No output routing -> no file-producing task charter.
No task charter -> no Codex patch.
No executor report -> no analysis-agent record.
No source-backed agent -> no agent conclusion.
```

---

## 3. Required Source Anchors

Before generating any Codex prompt, GPT Navigator must verify that these anchors are loaded or provided in the current context:

| Anchor | Required source | Required state |
| --- | --- | --- |
| Codex prompt gate | `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` | loaded |
| Source anchoring rule | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | loaded |
| Studio output routing policy | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | loaded |
| Studio topology migration status | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | loaded |
| AutoDev I/O contract | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | loaded |
| Task charter template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | loaded |
| Executor report template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | loaded |
| Analysis-agent record template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | loaded |
| Codex-side executor gate | `AGENTS.md` | loaded |

Loaded means present in the active ChatGPT Project Sources or explicitly provided/read in the current conversation.

---

## 4. Gate Procedure

GPT Navigator must complete this gate before writing a Codex prompt:

1. Confirm that a repo action is necessary or explicitly requested.
2. Verify source readback for the required anchors.
3. Verify the requested task can be expressed through the Studio AutoDev Pipeline I/O Contract and task charter template.
4. For any file-producing task, verify that `output_routing` is declared and allowed by `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`.
5. Separate active runtime code, tests, artifacts/runtime outputs, canonical docs, roadmap/docs-only, and inference.
6. Apply locked actions from the contract and repository doctrine.
7. If any required source anchor is missing, stale, or UNKNOWN, report `BLOCKED` and do not generate the Codex prompt.
8. If file-producing work lacks output routing, report `BLOCKED` and do not generate the Codex prompt.

---

## 5. Prompt Requirements

Any Codex prompt produced after this gate must include:

- explicit task scope
- exact files or directories in scope
- reference-only paths
- blocked actions
- expected validation
- final-report requirements
- source state for created, registered, loaded, enforced, and evidenced
- `output_routing` for any task that may create, update, move, rename, delete, archive, or generate a file
- executor requirement to report `route_check` and `output_routing_result`

The prompt must not ask Codex to infer authority from memory or conversational context.

---

## 6. Non-Authorization

This gate is documentation only.

It does not authorize:

- runtime implementation
- test changes
- ML code changes
- dataset changes
- benchmark changes
- `latest.json` creation
- `lab/runs/RUN_*` creation
- training
- benchmarking
- agent activation
- Chess960 activation
- DecisionController activation
- commits
- pushes
- branch creation
- pull request creation

Any execution still requires a separate explicit human request and Codex-side compliance with `AGENTS.md`.

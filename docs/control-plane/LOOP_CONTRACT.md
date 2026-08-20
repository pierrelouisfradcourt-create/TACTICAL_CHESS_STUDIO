# StudioPilot Loop Contract (SP-201)

## Purpose

This document defines the canonical StudioPilot industrial loop:

Human intention -> TaskPacket -> Codex execution -> PR -> checks -> GPT review -> HumanGate -> merge/reject/freeze -> LearningEvent.

This document is the canonical control-plane loop contract. The repo now contains passive JSON schemas and implemented Python dry-run tooling for parts of this loop, but this document remains a documentation contract and does not activate a runtime, Codex execution, workflows, MCP write tools, or autonomous agents.

## Scope Boundary

- In scope: loop contract language, role boundaries, state transition constraints, passive schema interpretation, and implemented dry-run tooling boundaries.
- Out of scope: active StudioPilot runtime, Codex SDK adapter, MCP write tools, auto-ready, auto-merge, prompt auto-mutation, ML training, fine-tuning, and runtime/search/neural refactors through StudioPilot.

## Current Implementation Boundary

| Surface | Status | Boundary |
| --- | --- | --- |
| loop contract docs | DOCUMENTED_ONLY | Defines required order and authority boundaries. |
| schemas | PASSIVE | Validate packet/state shapes; they do not execute or authorize transitions. |
| dry-run scripts | IMPLEMENTED | Compile, render, validate, and preview control-plane artifacts locally. |
| in-memory loop harness | TESTED | Verifies loop composition without persistent inbox/latest/current-state mutation. |
| active runtime | BLOCKED | No gameplay/runtime behavior is activated by this contract. |
| Codex execution | BLOCKED | No Codex run, branch, PR, commit, push, ready, or merge is authorized by this contract. |
| HumanGate | PASSIVE | Required before merge, reject, freeze, promotion, activation, or claims. |

## Roles

- Human Founder: final authority for merge, reject, freeze, promotion, and claims.
- ChatGPT Browser / Architect Producer: assists with planning, critique, and non-binding review guidance.
- StudioPilot Planner: routes work orders and plans bounded tasks.
- Codex Worker: executes bounded implementation tasks and produces PR artifacts.
- GitHub PR: container for code changes, checks, review discussion, and merge metadata.
- GuardPlane: mechanical policy and process gates that can block non-compliant transitions.
- EvidencePlane: structured recording of checks, artifacts, outcomes, and traceability.
- HumanGate: explicit human decision point before terminal path selection.
- LearningLog / LearningEvent: post-decision record of what happened and what to improve next.

## Canonical Flow

IDEA
-> WORK_ORDER
-> TASK_PACKET_VALIDATED
-> CODEX_TASK_CREATED
-> BRANCH_READY
-> MECHANICAL_CHECKED
-> GPT_REVIEWED
-> HUMAN_DECIDED
-> MERGED / REJECTED / FROZEN
-> LEARNING_EVENT_RECORDED

## Contract Rules

- No state may skip `HUMAN_DECIDED`.
- GPT review is non-binding advisory input.
- A Codex report is not canonical evidence by itself.
- Merge decision, claim decision, and promotion decision are separate decisions.
- StudioPilot routes and plans but does not self-mutate.
- BoosterSystem learns and proposes but does not apply repository changes directly.
- Dry-run tools may emit stdout candidates, but stdout candidates are not canonical evidence and do not apply state.
- Persistent `.studio_state/current_state.json` writes require explicit write intent and remain local ignored state until HumanGate promotes the result.
- `.studio_state/inbox.json`, `latest.json`, `lab/runs/RUN_*`, lab puzzles, datasets, models, benchmarks, and runtime outputs are not created by the dry-run loop.
- `claim_posture: NO_CLAIM_ALLOWED` and `no_global_ready_verdict: true` must be preserved.

## Non-Autonomy Constraints

- No autonomous retry loop is authorized by this contract.
- No direct mutation path from StudioPilot or BoosterSystem to runtime or policies is authorized by this contract.
- Runtime modification remains forbidden unless explicitly scoped by future PRs.

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_DRY_RUN_CONTRACT_STABILIZED
- evidence_verdict: DOCUMENTED_ONLY_CONTRACT_WITH_IMPLEMENTED_DRY_RUN_TOOLING_READBACK
- claim_verdict: NO_CLAIM_ALLOWED


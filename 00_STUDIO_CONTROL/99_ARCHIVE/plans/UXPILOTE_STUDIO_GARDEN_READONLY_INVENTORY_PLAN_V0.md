# UxPilote Studio Garden Read-Only Inventory Plan V0

Task ID: UXPILOTE-STUDIO-GARDEN-READONLY-INVENTORY-PLAN-V0

## Status and authority

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- Owner authority: HumanGate
- Human gate required: true

This document is a docs-only read-only inventory plan. It prepares a future bounded truth inventory for the full Studio Garden. It does not run that inventory and does not authorize scanning, file moves, file edits, Git, Godot, agents, training, benchmarks, datasets, models, latest.json, lab/runs, or any operational action.

## Purpose

The purpose of this plan is to define a future read-only inventory protocol for:

```text
C:/TACTICAL_CHESS_STUDIO
```

The plan exists so a later HumanGate-approved task can inventory the garden in narrow slices, collect evidence fields consistently, classify material without moving it, and report status by surface.

This plan is not itself an inventory result. No current file, folder, repo, candidate, tool, archive, build zone, dataset, model, or checkpoint status is claimed from this document.

## Root truth

C:/TACTICAL_CHESS_STUDIO is the garden.

PureLab is one component inside the garden.

The TacticalChessPureLab component path is:

```text
C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab
```

PureLab is not the garden root. It is one component/tree/massif inside the larger studio garden. Future inventory work must preserve that distinction in every slice, category, evidence row, and verdict.

## Why inventory must be read-only

The first garden inventory must be read-only because the studio currently needs truth before action.

A non-read-only inventory would risk:

- treating old folder structure as current authority
- confusing PureLab with the full garden
- moving or deleting evidence before HumanGate can interpret it
- promoting roadmap or Godot candidate concepts into active truth
- creating runtime, dataset, model, benchmark, or tool outputs without a separate task charter

Read-only means the future task may inspect only the approved scope, record evidence, and report classifications as candidates. It must not move, rename, delete, copy, edit, archive, execute, train on, benchmark, branch, commit, push, promote, or activate anything.

## Inventory slices

The future inventory should be split into narrow slices. HumanGate may approve one slice at a time or a small bounded set of slices. A full uncontrolled scan is not authorized by this plan.

| Slice | Intended scope | Current authority |
| --- | --- | --- |
| studio_control_slice | Studio control docs, maps, routing, forms, status, roadmap, registries, boundaries, and control-room structure. | Candidate read-only slice only. |
| purelab_component_slice | TacticalChessPureLab as one game component inside the garden. | BLOCKED until separate HumanGate read-only task; no content inspection authorized by this plan. |
| tools_slice | Tool Zone candidates, local workflow tools, Godot/Codex support material, and professional software support surfaces. | Candidate read-only slice only. |
| archives_slice | Archive Zone candidates, historical evidence, duplicate candidates, superseded material, and preservation candidates. | Candidate read-only slice only; no archive action. |
| build_zone_slice | Build Zone candidates, sandbox-like preparation areas, experimental work areas, and branch-like planning areas. | Candidate read-only slice only; no build execution or branch creation. |
| godot_candidate_slice | Godot garden candidate documentation and candidate-only visual artifact boundaries. | Candidate read-only slice only; no .gd, .tscn, Godot run, or candidate modification. |
| unknown_or_legacy_slice | Material whose surface, owner, or destination cannot be inferred without HumanGate-approved inspection. | Default candidate slice; unknown_pending_audit until evidence exists. |

## Evidence fields

Each future inventory row should use these fields:

| Field | Required meaning |
| --- | --- |
| path | Exact path observed during the approved read-only slice. |
| surface | One of active_runtime_code, tests, artifacts_runtime_outputs, canonical_docs, roadmap_docs_only, inference, or UNKNOWN. |
| candidate_role | Human-readable candidate role inferred from read-only evidence. |
| current_status | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, or UNKNOWN. |
| evidence_type | File existence, filename, readback excerpt, metadata, source anchor, registry entry, report evidence, or UNKNOWN. |
| owner_or_destination_candidate | Candidate owner or destination, not an instruction to move. |
| keep_extract_archive_build_tool_unknown | One of keep, extract, archive, build, tool, unknown, or blocked as a shorthand only. |
| risk | Main risk if the item is misunderstood, moved, executed, promoted, or ignored. |
| human_gate_question | Concrete question HumanGate must answer before any action beyond read-only evidence. |

Evidence rows must not include hidden approval, execution authority, autonomous decision, or global ready verdicts.

## Classification categories

Future inventory classifications are candidate-only. They do not authorize changes.

| Category | Meaning | Authority |
| --- | --- | --- |
| keep_in_place | Material appears to belong where it is. | Candidate only until HumanGate confirms. |
| extract_to_studio_control_candidate | Material may belong in 00_STUDIO_CONTROL as policy, routing, status, forms, maps, or roadmap documentation. | Candidate only; no extraction authorized. |
| extract_to_tool_zone_candidate | Material may belong in Tool Zone or tool-support surfaces. | Candidate only; no tool launch or installation. |
| move_to_archive_candidate | Material may belong in Archive Zone because it is historical, duplicate, superseded, or evidence-only. | Candidate only; no move or archive action. |
| move_to_build_zone_candidate | Material may belong in a Build Zone or sandbox-like preparation area for later bounded work. | Candidate only; no build execution or branch creation. |
| future_core_candidate | Material may later inform a Future Mistral / Devstral core, prompt/RAG context, or local LLM support layer. | Candidate only; no training, dataset, model, checkpoint, or promotion. |
| unknown_pending_audit | Material whose role cannot be known until approved read-only evidence exists. | Default when evidence is absent or insufficient. |
| blocked_do_not_touch | Material must not be moved, edited, deleted, copied, scanned, or reclassified without separate explicit authorization. | BLOCKED. |

## Stop conditions

The future audit must stop and report BLOCKED if any of these occur:

- output routing is ambiguous
- requested scope would become a full uncontrolled scan
- requested scope would inspect TacticalChessPureLab contents without a separate HumanGate approval
- requested scope would modify, move, rename, delete, copy, archive, or create files
- requested scope would touch Godot .gd or .tscn files
- requested scope would run Godot
- requested scope would run Git
- requested scope would create latest.json, lab/runs/RUN_*, datasets, models, checkpoints, benchmarks, or training outputs
- requested scope would activate agents, Chess960, DecisionController, backend, network, telemetry, tool execution, or real approval workflow
- evidence cannot be reported by surface
- any required write would leave the explicitly approved destination

## HumanGate questions

Before any future audit begins, HumanGate should answer:

- Which inventory slice is approved first?
- What exact paths are in scope for that slice?
- Is the task allowed to list only immediate children, read file bodies, or read metadata only?
- Which output file will receive the inventory evidence?
- Are any paths blocked_do_not_touch before inspection?
- Should PureLab remain excluded until a separate PureLab-specific read-only task?
- What evidence fields are mandatory for the selected slice?
- What classification categories should be allowed for that slice?
- What stop condition should end the task immediately?
- Who decides whether a candidate classification later becomes a real move, archive, extraction, build-zone task, tool-zone task, or core-context task?

## Future bounded audit task

A future bounded audit task must be read-only.

It must be HumanGate-approved.

It must be narrow, not full uncontrolled scan.

It must report status by surface.

It must not move or modify files.

Minimum future task charter:

```yaml
task_class: docs_workflow
authority: read_only
human_gate_required: true
target_root: "C:/TACTICAL_CHESS_STUDIO"
approved_slice: ""
approved_paths: []
forbidden_paths: []
allowed_actions:
  - "Run only the approved read-only inventory commands for the selected slice."
  - "Record evidence fields in the approved docs-only output."
blocked_actions:
  - "Do not move, rename, delete, copy, archive, or edit files."
  - "Do not run Godot."
  - "Do not run Git."
  - "Do not inspect TacticalChessPureLab contents unless this is the explicitly approved PureLab slice."
  - "Do not run training, benchmarks, dataset generation, model creation, checkpoint creation, latest.json creation, or lab/runs creation."
validation:
  expected_level: DOCUMENTED_ONLY
  readback_required: true
```

The future audit should produce a docs-only evidence table and final executor report. It must not execute candidate actions.

## Future Godot truth reflection

Godot should reflect inventory results only after the read-only truth audit.

Architecture/roadmap layer overlays happen after truth return.

Any future Godot reflection must be candidate-only unless a separate HumanGate task promotes it. The Godot garden may later show Studio Garden slices, PureLab as one component/tree/massif, and classification overlays, but only after evidence returns from a read-only audit.

This plan does not authorize a Godot patch, .gd edit, .tscn edit, Godot run, viewport claim, or visual-quality claim.

## Architecture / roadmap layers postponed

Architecture and roadmap overlays are postponed until truth returns from the read-only garden inventory.

Correct sequence:

1. preserve root truth that C:/TACTICAL_CHESS_STUDIO is the garden
2. preserve PureLab as one component inside the garden
3. approve one narrow read-only inventory slice
4. collect evidence fields without mutation
5. classify material as candidate-only
6. return evidence to HumanGate
7. only then consider Godot truth reflection
8. only after truth reflection consider architecture and roadmap layer overlays

## Blocked actions

```yaml
file_move: BLOCKED
file_delete: BLOCKED
file_rename: BLOCKED
file_copy: BLOCKED
repo_scan: BLOCKED until separate HumanGate task
runtime_change: BLOCKED
agent_activation: BLOCKED
training: BLOCKED
dataset_generation: BLOCKED
benchmark: BLOCKED
model_promotion: BLOCKED
git_commit_push_branch_pr: BLOCKED
dataset_reset: BLOCKED
latest_manifest_creation: BLOCKED
run_folder_creation: BLOCKED
model_or_checkpoint_creation: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
real_approval_workflow: BLOCKED
decision_persistence: BLOCKED
real_audit_execution: BLOCKED
real_hygiene_scan: BLOCKED
real_truth_agent: BLOCKED
real_build_execution: BLOCKED
real_archive_action: BLOCKED
real_tool_launch: BLOCKED
backend: BLOCKED
network: BLOCKED
telemetry: BLOCKED
godot_patch: BLOCKED
godot_run: BLOCKED
```

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | No latest.json, lab/runs/RUN_*, dataset, model, checkpoint, benchmark, or runtime artifact authorized. |
| canonical_docs | PASSIVE | Source anchors may be read as reference only; no canonical doc change is authorized here. |
| roadmap_docs_only | DOCUMENTED_ONLY | This read-only inventory plan is the routed roadmap-only output. |
| inference | PASSIVE | Future passive prompt/RAG guidance only; no training, promotion, or authority escalation. |

## Software verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

## Evidence verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Evidence for this document is limited to preflight path checks, source readback, target document creation/readback, and required string searches. No runtime, test, Godot, Git, repo, benchmark, training, dataset, model, checkpoint, inventory, or visual evidence is created by this task.

## Claim verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Claim posture remains NO_CLAIM_ALLOWED. This document claims only that a roadmap-only read-only inventory plan exists and that it defines future slices, evidence fields, classification categories, stop conditions, HumanGate questions, and blocked actions.

## No global ready verdict

no_global_ready_verdict: true

No global ready or not-ready verdict is made. Verdicts are split by surface only.

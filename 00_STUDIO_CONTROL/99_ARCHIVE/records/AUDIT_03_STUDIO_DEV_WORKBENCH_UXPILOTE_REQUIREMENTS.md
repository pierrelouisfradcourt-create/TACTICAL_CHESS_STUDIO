# AUDIT-03 Studio Dev Workbench and UxPilote Requirements

record_type: dev_workbench_requirements_audit_report
task_id: AUDIT-03-STUDIO-DEV-WORKBENCH-UXPILOTE-REQUIREMENTS
created_by: codex
created_at: 2026-05-23
status: DOCUMENTED_ONLY
intended_surface: roadmap_docs_only
actual_destination: C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md
generated_report_is_not_canonical_truth: true
claim_posture: NO_CLAIM_ALLOWED
human_gate_required: true
no_global_ready_verdict: true

## 1. Preflight

| Item | Status | Evidence |
| --- | --- | --- |
| Current directory | PASSIVE | `Get-Location` returned `C:\TACTICAL_CHESS_STUDIO`. |
| Branch | PASSIVE | `git status --short --branch` returned `## master...origin/master`. |
| HEAD | PASSIVE | `git rev-parse HEAD` returned `d0ace5ba466ad4e3b07b4cde20dd237ca0a0a248`. |
| Worktree before report creation | PASSIVE | Pre-write status showed two pre-existing untracked files: `AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` and `AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md`. |
| Pre-existing untracked reports | PASSIVE | AUDIT-01 and AUDIT-02 were pre-existing local reports and were read as evidence inputs only. |
| Routed output existed before write | NOT_FOUND | `Test-Path` for this AUDIT-03 target returned `False`. |
| Sandbox state | BLOCKED | Initial sandboxed PowerShell read failed with `windows sandbox: setup refresh failed`; non-mutating reads/inspections were rerun with escalation. |

runtime_gate_result: exact_runtime_claim_blocked_but_passive_docs_workflow_allowed

Exact runtime identifier was not exposed. Per task gate, this blocks exact runtime claims only. This passive docs workflow continued because it is read-only except this single routed report and no runtime, test, training, benchmark, dataset, model, Git, activation, or implementation action was performed.

## 2. Dependency State

| Required dependency | Status | Notes |
| --- | --- | --- |
| `AGENTS.md` | DOCUMENTED_ONLY | Loaded first and enforced for reporting, Git safety, validation, and claim boundary. |
| `README.md` | DOCUMENTED_ONLY | Loaded for doctrine and surface separation. |
| `CURRENT_TRUTH_MAP_V0.md` | DOCUMENTED_ONLY | Loaded; treated as current docs-only truth map, not runtime proof. |
| `AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` | DOCUMENTED_ONLY | Loaded as pre-existing untracked passive audit evidence. |
| `AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md` | DOCUMENTED_ONLY | Loaded as pre-existing untracked passive audit evidence. |
| UxPilote chain/control spec | DOCUMENTED_ONLY | Loaded from `00_STUDIO_CONTROL/01_MAPS`. |
| Output routing policy | DOCUMENTED_ONLY | Loaded and enforced for this route. |
| Source anchoring policy | DOCUMENTED_ONLY | Loaded and enforced for source-state separation. |
| AutoDev I/O contract | DOCUMENTED_ONLY | Loaded for controlled statuses, surfaces, and record flow. |
| Task charter, executor report, analysis-agent templates | DOCUMENTED_ONLY | Loaded as forms; not modified. |
| GPT Navigator prompt gate, repo notice, source index | DOCUMENTED_ONLY | Loaded from root `docs/gpt-navigator`. |

## 3. Source State

Core rule applied:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

| Source | Created | Registered | Loaded | Enforced | Evidenced | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Repository doctrine loaded first. |
| `README.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Read-first repo entrypoint loaded. |
| `CURRENT_TRUTH_MAP_V0.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required dependency loaded. |
| `AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Pre-existing untracked report, not modified. |
| `AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Pre-existing untracked report, not modified. |
| `UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Chain grammar and view model loaded. |
| `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Route authority loaded and enforced. |
| `STUDIO_SOURCE_ANCHORING_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Source-state policy loaded and enforced. |
| `STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Contract vocabulary loaded and enforced. |
| `TASK_CHARTER_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded as read-only form source. |
| `EXECUTOR_REPORT_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded as read-only form source. |
| `ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded as read-only form source. |
| `GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded from current root docs. |
| `GPT_NAVIGATOR_REPO_NOTICE_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded from current root docs. |
| `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded from current root docs. |
| This AUDIT-03 report | IMPLEMENTED | BLOCKED | DOCUMENTED_ONLY after readback | DOCUMENTED_ONLY | DOCUMENTED_ONLY after readback and diff check | Created as one routed roadmap-only candidate; not registered or canonical. |

## 4. Route Check

| Check | Status | Evidence |
| --- | --- | --- |
| Output routing required | DOCUMENTED_ONLY | Task declared one file-producing route. |
| Output routing present | DOCUMENTED_ONLY | Target route declared as `00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md`. |
| Destination allowed | DOCUMENTED_ONLY | Routing policy routes status reports to `00_STUDIO_CONTROL/05_STATUS`; this report is temporary roadmap-only evidence pending HumanGate. |
| Destination existed before write | NOT_FOUND | `Test-Path` returned `False`. |
| Forbidden destinations avoided | IMPLEMENTED | No output was written to root, `00_STUDIO_CONTROL/ROOT`, `12_PIPELINE_OPENING_LEGACY`, `src`, `tests`, `lab`, `latest.json`, `lab/runs/RUN_*`, `secrets`, datasets, models, or checkpoints. |
| Registration required | PASSIVE | Task declared registration not required. |
| Promotion gate | DOCUMENTED_ONLY | HumanGate. |

## 5. Output Routing Result

| Field | Value |
| --- | --- |
| produced_file_type | dev_workbench_requirements_audit_report |
| intended_surface | roadmap_docs_only |
| canonical_destination | NONE - not canonical unless later promoted by HumanGate |
| temporary_destination | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md |
| actual_destination | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md |
| registration_required | false |
| project_source_upload_required | false |
| retention_policy | roadmap-only requirements candidate pending HumanGate |
| promotion_gate | HumanGate |
| output_routing_result | IMPLEMENTED |

## 6. C4 Text Map

### 6.1 Context

| System | Status | Role |
| --- | --- | --- |
| Fused studioV2 root | PASSIVE | Current workspace root at `C:/TACTICAL_CHESS_STUDIO`. |
| Studio Dev Workbench | DOCUMENTED_ONLY | Proposed read-only development cockpit and CLI facade; no implementation in this task. |
| UxPilote | DOCUMENTED_ONLY | Existing bounded chain composition concept; proposed as the visual cockpit layer. |
| Studio Control | DOCUMENTED_ONLY/PASSIVE | Control-room docs, routing, source anchoring, forms, boundaries, status records, and roadmap candidates. |
| Active runtime code | PASSIVE | Rust runtime truth remains in `src`; not changed or executed. |
| Python tooling and ML | PASSIVE | Python remains ML, inference, and tooling; not run. |
| HumanGate | DOCUMENTED_ONLY | Final authority for activation, promotion, claims, Git actions, and bounded next steps. |

### 6.2 Containers

| Container | Status | Workbench treatment |
| --- | --- | --- |
| `00_STUDIO_CONTROL` | DOCUMENTED_ONLY | Primary source for cockpit policy, routing, forms, maps, status, boundaries, and roadmap surfaces. |
| `docs/gpt-navigator` | DOCUMENTED_ONLY | Prompt gate, source index, repo notice, and upload guard inputs. |
| `MASTER_DOCS` | DOCUMENTED_ONLY/PASSIVE | Read-first project state docs; do not outrank current repo inspection. |
| `src` | PASSIVE | Runtime source display only; no mutation or execution by the first workbench. |
| `tests` | PASSIVE | Test surface display only; no test execution by the first workbench. |
| `scripts` | PASSIVE | Existing tooling candidates by path/name only; future reuse requires separate implementation and validation. |
| `schemas` | PASSIVE | Candidate schema sources for future CLI/UI data contracts; not modified. |
| `lab`, `outputs`, `runs` | PASSIVE | Artifact surfaces displayed as passive observations only; no proof or promotion. |
| `datasets`, `models` | PASSIVE | Names-only/passive surfaces unless a future HumanGate data-boundary task authorizes deeper work. |
| `secrets` | BLOCKED | Never listed or inspected by the workbench. |

### 6.3 Components

| Component | Status | Requirement |
| --- | --- | --- |
| `studioctl` CLI | DOCUMENTED_ONLY | First implementation candidate: read-only scanner, classifier, report summarizer, and charter/report skeleton viewer. |
| UxPilote cockpit | DOCUMENTED_ONLY | First interface candidate: views over surfaces, routes, source state, evidence, and chains. |
| Evidence Board | DOCUMENTED_ONLY | Shows surface-level statuses with controlled values only. |
| Source-State panel | DOCUMENTED_ONLY | Shows created, registered, loaded, enforced, evidenced separately per source. |
| Route Check panel | DOCUMENTED_ONLY | Shows route required, present, allowed, actual destination, forbidden destination checks, and promotion gate. |
| Chain Builder | DOCUMENTED_ONLY | Builds UxPilote chain candidates from dependent menus and six-field grammar. |
| Patch Lab | DOCUMENTED_ONLY | Proposal-only generator for task-charter, patch-plan, validation-plan, non-goals, and blocked-actions candidates. |
| Process lanes | DOCUMENTED_ONLY | Hygiene, Truth, and Upgrade lanes shown as passive workflow lanes. |

### 6.4 Code / Files

No runtime code, tests, schemas, scripts, lab outputs, datasets, models, checkpoints, `latest.json`, run folders, branches, commits, pushes, or PRs were created or modified. This report is the only created file.

## 7. Studio Dev Workflow Map

Minimum useful workflow:

```text
scan -> classify -> charter -> report -> evidence -> HumanGate
```

| Step | Status | Workbench function |
| --- | --- | --- |
| scan | DOCUMENTED_ONLY | Read Git state, known source anchors, route policy, status files, and surface inventory without execution. |
| classify | DOCUMENTED_ONLY | Assign controlled surface/status values and separate active code, tests, artifacts, canonical docs, roadmap docs, inference, lab, schemas, tooling, models/datasets, and secrets. |
| charter | DOCUMENTED_ONLY | Prepare task-charter candidates with UxPilote chain fields, non-goals, route, and validation plan. |
| report | DOCUMENTED_ONLY | Show executor report requirements and compare completed reports to expected fields. |
| evidence | DOCUMENTED_ONLY | Assemble readback, commands, route checks, source state, skipped validation, risks, and verdicts. |
| HumanGate | DOCUMENTED_ONLY | Present one bounded next-step decision packet; do not decide, mutate, activate, or claim. |

## 8. Minimum `studioctl` Spec

The first CLI should be read-only by default and should not execute runtime code, tests, benchmarks, training, dataset generation, model actions, Git mutations, or agent activation.

| Command | Status | Output |
| --- | --- | --- |
| `studioctl status` | DOCUMENTED_ONLY | Current cwd, branch, HEAD, dirty files, known pre-existing reports, and runtime-claim gate. |
| `studioctl sources scan` | DOCUMENTED_ONLY | Source-state table for configured anchors: created, registered, loaded, enforced, evidenced. |
| `studioctl routes check --output <path> --surface <surface>` | DOCUMENTED_ONLY | Route required/present/allowed result, forbidden destination hits, registration requirement, promotion gate. |
| `studioctl evidence board` | DOCUMENTED_ONLY | Status by surface using controlled status values; no global verdict. |
| `studioctl chain draft` | DOCUMENTED_ONLY | Interactive or file-based UxPilote chain candidate builder; no execution. |
| `studioctl charter render` | DOCUMENTED_ONLY | Render a task-charter candidate from chain, scope, sources, route, blocked actions, and validation plan. |
| `studioctl report inspect <report>` | DOCUMENTED_ONLY | Check executor report field presence, route evidence, skipped validation, risks, and verdict separation. |
| `studioctl surface map` | DOCUMENTED_ONLY | Map root paths to owners/surfaces with blocked/default status. |
| `studioctl tooling list` | DOCUMENTED_ONLY | Static name/path/status list of reusable scripts and schemas; no script execution. |

Hard requirements:

- Default mode is read-only.
- Any future write mode requires explicit HumanGate, output routing, route check, and executor report.
- CLI records must use English, controlled status values, controlled surface values, and separated verdicts.
- `secrets` must remain blocked; dataset/model content must remain names-only unless separately authorized.

## 9. Minimum UxPilote View Spec

| View | Status | Minimum content |
| --- | --- | --- |
| World Map | DOCUMENTED_ONLY | Root surfaces: Engine/runtime, Rocky/search/neural, Routage, Evidence, Studio Control, Lab, Schemas, Scripts, Models, Datasets, Secrets. |
| Evidence Board | DOCUMENTED_ONLY | Surface cards/table with status, evidence source, last readback, validation state, claim boundary. |
| Source-State Panel | DOCUMENTED_ONLY | Per-source created, registered, loaded, enforced, evidenced fields and missing-state reasons. |
| Route Check Panel | DOCUMENTED_ONLY | Output type, intended surface, temporary/canonical destinations, forbidden destinations, collision state, promotion gate. |
| Chain Builder | DOCUMENTED_ONLY | Dependent menus: chain type, zone, subzone, action mode, authority level, Qui, Quoi, Quand, Comment, Ou, Pourquoi. |
| Patch Lab | DOCUMENTED_ONLY | Proposal-only view for task charter, patch plan, validation plan, non-goals, target files, blocked actions, and HumanGate packet. |
| Process Lanes | DOCUMENTED_ONLY | Hygiene, Truth, Upgrade lanes with stage status from Cartographer to HumanGate. |
| Tooling Registry | DOCUMENTED_ONLY | Static names of candidate scripts/schemas and their current passive status. |
| Report Inspector | DOCUMENTED_ONLY | Executor report completeness, commands, validation, skipped validation, risks, and three verdict groups. |

## 10. Evidence Board Spec

Required fields:

| Field | Requirement |
| --- | --- |
| `surface` | Controlled surface or locally extended display-only surface. |
| `status` | One of IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN. |
| `evidence_source` | Path or command readback used for the status. |
| `evidence_type` | doc, code, test, report, log, command, path, inference, HumanGate. |
| `loaded_state` | created, registered, loaded, enforced, evidenced summary. |
| `route_state` | required, present, allowed, blocked, not applicable. |
| `validation_state` | readback, diff check, targeted test, skipped, blocked, unknown. |
| `claim_boundary` | NO_CLAIM_ALLOWED by default. |
| `risk` | Short bounded risk statement. |

No Evidence Board view may produce a single ready/not-ready result.

## 11. Source-State Panel Spec

Fields:

| Field | Status values |
| --- | --- |
| `source_path` | exact path or NOT_FOUND marker |
| `surface` | controlled surface value |
| `created` | IMPLEMENTED, DOCUMENTED_ONLY, NOT_FOUND, UNKNOWN |
| `registered` | DOCUMENTED_ONLY, NOT_FOUND, UNKNOWN, BLOCKED |
| `loaded` | DOCUMENTED_ONLY, NOT_FOUND, UNKNOWN |
| `enforced` | DOCUMENTED_ONLY, PASSIVE, BLOCKED, UNKNOWN |
| `evidenced` | DOCUMENTED_ONLY, PASSIVE, BLOCKED, UNKNOWN |
| `evidence` | readback command, source index entry, task charter, final report, or explicit caveat |

Rule: a source missing any governing state cannot silently govern a task. It must show BLOCKED or UNKNOWN for the relevant decision.

## 12. Route Check Panel Spec

Fields:

| Field | Requirement |
| --- | --- |
| `produced_file_type` | Required for file-producing work. |
| `intended_surface` | Controlled surface value. |
| `canonical_destination` | Explicit, or NONE with reason for temporary report. |
| `temporary_destination` | Explicit for generated reports or passive artifacts. |
| `actual_destination` | Filled after executor report. |
| `forbidden_destinations` | Evaluated against routing policy. |
| `registration_required` | true/false/UNKNOWN. |
| `project_source_upload_required` | true/false/UNKNOWN. |
| `promotion_gate` | HumanGate. |
| `destination_allowed` | true/false/UNKNOWN. |
| `collision_check` | name/hash/root duplicate status when available. |

## 13. Chain Builder Spec

Minimum fields come directly from the UxPilote grammar:

| Group | Required fields |
| --- | --- |
| Chain header | `chain_id`, `chain_type`, `zone`, `subzone`, `action_mode`, `authority_level` |
| Qui | `actor`, `role`, `authority` |
| Quoi | `target_object`, `task_intent`, `expected_output` |
| Quand | `duration_limit`, `loop_limit`, `retry_limit`, `stop_condition`, `cost_guard` |
| Comment | `allowed_actions`, `blocked_actions`, `validation_mode`, `mutation_policy` |
| Ou | `zone`, `subzone`, `target_path`, `output_route` |
| Pourquoi | `reason`, `implementation_rule`, `success_condition`, `human_gate_required` |
| Pipeline | Cartographer, HygieneAgent, TruthAgent, FusionAuditor, CartographerRedTeam, HumanGate |

Create-chain gate:

- BLOCKED if any mandatory field is missing.
- BLOCKED if a file may be produced and `output_route` is missing.
- BLOCKED if authority or mutation policy conflicts with blocked actions.

## 14. Patch Lab Proposal-Only Spec

Patch Lab may prepare:

- task-charter candidate
- patch-plan candidate
- validation-plan candidate
- non-goals list
- blocked-actions list
- target-file list
- route-check candidate
- HumanGate decision packet candidate

Patch Lab must not:

- edit files by default
- implement frontend, backend, CLI, runtime, tests, schemas, or scripts
- run tests, runtime commands, benchmarks, training, inference, or dataset generation
- create `latest.json`, `lab/runs/RUN_*`, models, or checkpoints
- commit, push, branch, or open PRs
- claim readiness, strength, promotion, runtime activation, or model proof

## 15. Process Lanes

### Hygiene Lane

Purpose: detect drift, routing ambiguity, duplicate outputs, missing fields, invalid statuses, forbidden destinations, and blocked-action conflicts.

Inputs: Git status, route policy, AutoDev contract, templates, source index, report bodies.

Output: hygiene findings and route/source completeness status.

### Truth Lane

Purpose: separate evidence from claim, code from docs, tests from reports, runtime outputs from proof, and unknown from blocked.

Inputs: current truth map, AUDIT-01, AUDIT-02, read-first docs, source-state panel, evidence board.

Output: truth packet with knowns, unknowns, blocked claims, and surface statuses.

### Upgrade Lane

Purpose: prepare bounded improvement proposals only.

Inputs: chain candidate, hygiene findings, truth packet, route check, HumanGate constraints.

Output: patch-plan or task-charter candidate for human decision.

## 16. Data Flow

```text
scan
  -> classify
  -> charter
  -> report
  -> evidence
  -> HumanGate
```

| Data object | Created by | Consumed by | Status |
| --- | --- | --- | --- |
| surface scan | `studioctl` scanner candidate | Evidence Board, World Map | DOCUMENTED_ONLY |
| source-state scan | `studioctl sources scan` candidate | Source-State Panel, Chain Builder | DOCUMENTED_ONLY |
| route check | `studioctl routes check` candidate | Route Check Panel, Patch Lab | DOCUMENTED_ONLY |
| chain candidate | UxPilote Chain Builder | fragmented audit pipeline | DOCUMENTED_ONLY |
| task charter candidate | Patch Lab | HumanGate, Codex only if approved later | DOCUMENTED_ONLY |
| executor report | bounded executor after approved task | Report Inspector, future analysis agent | PASSIVE/DOCUMENTED_ONLY |
| evidence packet | Evidence Board | HumanGate | DOCUMENTED_ONLY |

## 17. Surface To Owner Map

| Surface/path | Owner authority | Default status | Workbench rule |
| --- | --- | --- | --- |
| `src` | Runtime code owners plus HumanGate for activation | PASSIVE | Display only in first cockpit. |
| `tests` | Test owners plus HumanGate for execution/mutation | PASSIVE | Display only; no execution. |
| `00_STUDIO_CONTROL/01_MAPS` | HumanGate | DOCUMENTED_ONLY | Maps/routing/source topology inputs. |
| `00_STUDIO_CONTROL/02_NAVIGATION` | HumanGate | DOCUMENTED_ONLY | Source-state governance inputs. |
| `00_STUDIO_CONTROL/05_STATUS` | HumanGate | DOCUMENTED_ONLY/PASSIVE | Status and temporary report route. |
| `00_STUDIO_CONTROL/07_FORMS` | HumanGate | DOCUMENTED_ONLY | AutoDev form templates. |
| `00_STUDIO_CONTROL/10_ROADMAP` | HumanGate | roadmap_docs_only | Roadmap/prototype candidates only. |
| `docs/gpt-navigator` | GPT Navigator/HumanGate | DOCUMENTED_ONLY | Prompt gate and source index inputs. |
| `scripts` | Tooling owners plus HumanGate for execution | PASSIVE | Static listing only. |
| `schemas` | Tooling/control-plane owners | PASSIVE | Candidate schema reuse; no mutation. |
| `lab`, `outputs`, `runs` | Artifact owners/HumanGate | PASSIVE | Observations only, no proof. |
| `datasets`, `models` | Data/model owners/HumanGate | PASSIVE | Names-only unless authorized. |
| `secrets` | Secret boundary | BLOCKED | Never inspect. |

## 18. Schema Requirements

Minimum future JSON/YAML schemas:

| Schema | Status | Purpose |
| --- | --- | --- |
| `studioctl_status.schema.json` | DOCUMENTED_ONLY | cwd, branch, HEAD, dirty files, runtime gate, pre-existing changes. |
| `studio_surface_scan.schema.json` | DOCUMENTED_ONLY | path, surface, owner, default status, blocked actions, evidence source. |
| `studio_source_state.schema.json` | DOCUMENTED_ONLY | source created/registered/loaded/enforced/evidenced state. |
| `studio_route_check.schema.json` | DOCUMENTED_ONLY | route required/present/allowed, destination, forbidden hits, collision state, promotion gate. |
| `studio_evidence_board.schema.json` | DOCUMENTED_ONLY | surface statuses, evidence type, validation state, claim boundary, risk. |
| `uxpilote_chain_candidate.schema.json` | DOCUMENTED_ONLY | UxPilote header, Qui, Quoi, Quand, Comment, Ou, Pourquoi, pipeline. |
| `patch_lab_candidate.schema.json` | DOCUMENTED_ONLY | task-charter candidate, patch-plan candidate, validation plan, non-goals, blocked actions. |
| `human_gate_packet.schema.json` | DOCUMENTED_ONLY | one bounded next-step proposal, unresolved risks, blocked actions, route decision. |

Existing schemas that may inform this work include `studiopilot_*`, `studio_current_state.schema.json`, `studio_state_snapshot.schema.json`, `studio_state_delta.schema.json`, `task_packet.schema.json`, `humangate_decision_candidate.schema.json`, `tool_permission_matrix.schema.json`, and `forbidden_surfaces.schema.json`. They were listed only; no schema was modified or validated.

## 19. Reusable Existing Tooling Candidates

Static candidates observed by path/name only:

| Candidate | Status | Possible reuse |
| --- | --- | --- |
| `scripts/check_workspace_hygiene.py` | PASSIVE | Hygiene lane input after future authorization. |
| `scripts/control_plane/validate_prompt_report_hygiene.py` | PASSIVE | Prompt/report hygiene checks for Report Inspector. |
| `scripts/studioV2/check_claim_data_gates.py` | PASSIVE | Claim/data gate logic reference. |
| `scripts/studioV2/check_codex_execution_result.py` | PASSIVE | Executor-result inspection reference. |
| `scripts/studioV2/prepare_codex_execution_packet.py` | PASSIVE | Codex handoff/packet candidate reference. |
| `scripts/studioV2/generate_codex_prompt_pack.py` | PASSIVE | Prompt-pack rendering candidate reference. |
| `scripts/studioV2/generate_codex_task_queue.py` | PASSIVE | Task queue candidate reference. |
| `scripts/studioV2/control_plane/render_codex_prompt.py` | PASSIVE | Future charter-to-prompt render reference. |
| `scripts/studioV2/control_plane/prepare_codex_handoff.py` | PASSIVE | Handoff packet reference. |
| `scripts/studioV2/control_plane/validate_execution_report.py` | PASSIVE | Report Inspector validation reference. |
| `scripts/studioV2/control_plane/validate_studiopilot_packets.py` | PASSIVE | Existing schema validation reference. |
| `scripts/studioV2/control_plane/update_studio_current_state.py` | PASSIVE | State update logic reference; not usable in read-only mode without wrapper. |
| `scripts/studioV2/control_plane/render_studio_status_report.py` | PASSIVE | Status report rendering reference. |
| `schemas/*.schema.json` | PASSIVE | Candidate schema vocabulary and packet shapes. |

No candidate was executed.

## 20. Blocked Or Deferred Features

| Feature | Status | Reason |
| --- | --- | --- |
| Frontend implementation | BLOCKED | Explicitly out of scope. |
| Backend implementation | BLOCKED | Explicitly out of scope. |
| CLI implementation | BLOCKED | This task only specifies requirements. |
| Runtime execution | BLOCKED | Explicitly forbidden. |
| Test execution or mutation | BLOCKED | Explicitly forbidden. |
| Schema modification | BLOCKED | Existing schemas were listed only. |
| Source/template modification | BLOCKED | Existing files were read only. |
| Dataset/model inspection beyond names | BLOCKED | Requires separate HumanGate data-boundary task. |
| Secret inspection | BLOCKED | Forbidden. |
| Agent activation | BLOCKED | Forbidden. |
| DecisionController or Chess960 activation | BLOCKED | Forbidden. |
| Git branch, commit, push, PR | BLOCKED | Forbidden. |
| Canonical promotion | BLOCKED | Requires later HumanGate decision. |
| Interface readiness claim | BLOCKED | No interface was built or tested. |

## 21. First Implementation Candidates Ranked

1. `studioctl status` read-only command.
   - Value: gives every task a repeatable preflight surface.
   - Risk: low if it only reads cwd, Git status, HEAD, and known routes.

2. `studioctl routes check` read-only command.
   - Value: blocks ambiguous file creation before it starts.
   - Risk: low to medium because route policy and registry path drift must be handled explicitly.

3. `studioctl sources scan` read-only command.
   - Value: makes created/registered/loaded/enforced/evidenced visible.
   - Risk: medium because registered and loaded states require careful definitions.

4. Evidence Board JSON output.
   - Value: shared data contract for CLI and future UxPilote.
   - Risk: medium due to surface/status vocabulary drift.

5. UxPilote static read-only cockpit.
   - Value: first usable operator interface over routes, sources, evidence, and chains.
   - Risk: medium; must avoid accidental write/execute affordances.

6. Patch Lab task-charter candidate renderer.
   - Value: converts workflow into repeatable bounded Codex tasks.
   - Risk: medium to high; must preserve HumanGate and proposal-only boundaries.

7. Report Inspector against executor report template.
   - Value: improves feedback loop quality.
   - Risk: medium; should not silently score or claim readiness.

## 22. Recommended Next Codex Task

Recommended next task:

```text
Create a docs-only task charter for implementing `studioctl status` and `studioctl routes check` as read-only CLI commands, with exact target files, schema candidates, no runtime/test execution, no Git actions, and HumanGate approval required before any implementation.
```

This next task should remain a charter/proposal unless the human explicitly authorizes implementation.

## 23. Status By Surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not modified, executed, or validated. |
| tests | PASSIVE | Not modified or run. |
| artifacts_runtime_outputs | PASSIVE | No runtime outputs, run folders, manifests, datasets, models, or checkpoints created. |
| canonical_docs | PASSIVE | Existing docs read only; no canonical promotion. |
| roadmap_docs_only | DOCUMENTED_ONLY | This report defines requirements only. |
| inference | PASSIVE | Analysis is passive and non-authoritative. |
| lab | PASSIVE | Not written or inspected as proof. |
| schemas | PASSIVE | Listed only; no schema change or validation. |
| scripts_tooling | PASSIVE | Listed by path/name only; no execution. |
| models_datasets | PASSIVE | No content inspection, generation, reset, or promotion. |
| secrets | BLOCKED | Not inspected. |

## 24. Files Changed

| Path | Surface | Change status | Operation | Summary |
| --- | --- | --- | --- | --- |
| `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md` | roadmap_docs_only | DOCUMENTED_ONLY | create | Created one routed roadmap-only requirements report. |

Files intentionally not modified:

- `AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`
- `AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md`
- all required source docs and templates
- runtime code, tests, scripts, schemas, lab, datasets, models, secrets

## 25. Commands Run

| Command | Purpose | Result |
| --- | --- | --- |
| `Get-Content -LiteralPath C:\TACTICAL_CHESS_STUDIO\AGENTS.md` | Load repository doctrine first. | Initial sandboxed attempt failed; escalated non-mutating read succeeded. |
| `Get-Location` | Report current directory. | PASSIVE: returned `C:\TACTICAL_CHESS_STUDIO`. |
| `git status --short --branch` | Report branch and pre-existing changes. | PASSIVE: returned `## master...origin/master`; pre-existing AUDIT-01 and AUDIT-02 untracked. |
| `git rev-parse HEAD` | Report HEAD. | PASSIVE: returned `d0ace5ba466ad4e3b07b4cde20dd237ca0a0a248`. |
| `Get-Item ... | Select-Object FullName,Length` | Size required sources before reading. | PASSIVE: source metadata observed. |
| `Test-Path ...AUDIT_03...md` | Check target collision before write. | NOT_FOUND: returned `False`. |
| `Get-ChildItem ...00_STUDIO_CONTROL...docs/gpt-navigator...` | List control and Navigator source files. | PASSIVE: topology and source candidates observed. |
| `Get-Content -Raw` for README, truth map, AUDIT-01, AUDIT-02 | Load required dependency sources. | DOCUMENTED_ONLY: readback succeeded. |
| `Get-Content -Raw` for UxPilote, routing, anchoring, AutoDev contract | Load required workflow/control sources. | DOCUMENTED_ONLY: readback succeeded. |
| `Get-Content -Raw` for task charter, executor report, analysis-agent templates | Load required forms. | DOCUMENTED_ONLY: readback succeeded. |
| `Get-Content -Raw` for GPT Navigator prompt gate, repo notice, source index | Load Navigator sources. | DOCUMENTED_ONLY: readback succeeded. |
| `Get-ChildItem -LiteralPath C:\TACTICAL_CHESS_STUDIO -Force -Directory/-File` | Top-level surface inventory. | PASSIVE: root paths listed; secrets not entered. |
| `rg --files scripts schemas .github .cargo` | Static tooling/schema/workflow inventory. | PASSIVE: paths listed only. |
| `rg -n "studioctl|UxPilote|..." scripts schemas 00_STUDIO_CONTROL` | Bounded text search for reusable tooling/schema vocabulary. | PASSIVE: matches observed; no execution. |
| `Get-ChildItem -LiteralPath scripts -Recurse -File` | Static script path listing. | PASSIVE: paths listed only. |
| `Get-Content -Raw ...AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md` | Read back created report. | DOCUMENTED_ONLY: full readback succeeded. |
| `git diff --check` | Docs-only whitespace validation. | DOCUMENTED_ONLY: returned no output. |
| `git status --short --branch` | Final changed-file check. | PASSIVE: final status showed pre-existing AUDIT-01 and AUDIT-02 plus new AUDIT-03 as untracked reports. |

## 26. Validation

Expected level: DOCUMENTED_ONLY.

| Validation item | Status | Evidence |
| --- | --- | --- |
| Report readback | DOCUMENTED_ONLY | `Get-Content -Raw` readback of this report succeeded. |
| Docs-only diff check | DOCUMENTED_ONLY | `git diff --check` returned no output. |
| Final file-change check | PASSIVE | `git status --short --branch` showed `AUDIT_01...`, `AUDIT_02...`, and `AUDIT_03...` as untracked reports; AUDIT-01 and AUDIT-02 were pre-existing. |

Runtime, tests, training, benchmark, dataset, model, agent activation, and Git mutation validation were not applicable and remained blocked.

## 27. Skipped Validation

| Validation item | Surface | Status | Reason |
| --- | --- | --- | --- |
| Runtime execution | active_runtime_code | BLOCKED | Explicitly forbidden. |
| `cargo test` | tests | BLOCKED | Test execution explicitly forbidden. |
| Python tests | tests | BLOCKED | Test execution explicitly forbidden. |
| Frontend/backend build | active_runtime_code | BLOCKED | No implementation authorized. |
| Script execution | scripts_tooling | BLOCKED | Tooling candidates were listed only. |
| Schema validation | schemas | BLOCKED | Schema mutation/validation not authorized. |
| Benchmark | artifacts_runtime_outputs | BLOCKED | Explicitly forbidden and not proof. |
| Training/inference | inference | BLOCKED | Explicitly forbidden. |
| Dataset/model content inspection | models_datasets | BLOCKED | Requires separate HumanGate data-boundary task. |
| Secret inspection | secrets | BLOCKED | Forbidden. |
| Git branch/commit/push/PR | canonical_docs | BLOCKED | Explicitly forbidden. |

## 28. Risks

| Risk | Surface | Status | Mitigation |
| --- | --- | --- | --- |
| Existing path drift between old nested repo references and current fused root | canonical_docs | DOCUMENTED_ONLY/UNKNOWN | CLI/UI must show current root evidence and avoid silently treating stale paths as truth. |
| AUDIT reports mistaken for canonical truth | roadmap_docs_only | BLOCKED | Mark generated reports as passive/roadmap-only unless HumanGate promotes them. |
| Read-only UI accidentally becomes execution surface | active_runtime_code | BLOCKED | First cockpit must have no execute, write, run, commit, push, or activation controls. |
| Surface/status vocabulary drift | schemas | UNKNOWN | Introduce shared schemas before implementation. |
| Registered vs loaded confusion | canonical_docs | BLOCKED | Source-State panel must show all five states separately. |
| Scripts with active behavior reused unsafely | scripts_tooling | BLOCKED | First reuse is static listing only; execution requires a separate task. |
| Model/dataset presence misread as quality evidence | models_datasets | BLOCKED | Names-only/passive display unless HumanGate authorizes content audit. |

## 29. Verdicts

software_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | PASSIVE |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| lab | PASSIVE |
| schemas | PASSIVE |
| scripts_tooling | PASSIVE |
| models_datasets | PASSIVE |
| secrets | BLOCKED |

evidence_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| lab | PASSIVE |
| schemas | PASSIVE |
| scripts_tooling | PASSIVE |
| models_datasets | PASSIVE |
| secrets | BLOCKED |

claim_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | NO_CLAIM_ALLOWED |
| tests | NO_CLAIM_ALLOWED |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | NO_CLAIM_ALLOWED |
| roadmap_docs_only | NO_CLAIM_ALLOWED |
| inference | NO_CLAIM_ALLOWED |
| lab | NO_CLAIM_ALLOWED |
| schemas | NO_CLAIM_ALLOWED |
| scripts_tooling | NO_CLAIM_ALLOWED |
| models_datasets | NO_CLAIM_ALLOWED |
| secrets | NO_CLAIM_ALLOWED |

No global ready or not-ready verdict is made.

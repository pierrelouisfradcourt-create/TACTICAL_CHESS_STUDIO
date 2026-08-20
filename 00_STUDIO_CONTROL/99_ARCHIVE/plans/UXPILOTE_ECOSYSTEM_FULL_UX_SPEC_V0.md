# UxPilote Ecosystem Full UX Specification V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Agent activation: BLOCKED
Prototype implementation: BLOCKED
Frontend/backend code: BLOCKED
Hardware/power control: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation/reset: BLOCKED
Model/checkpoint creation or promotion: BLOCKED
Chess960 activation: BLOCKED
DecisionController activation: BLOCKED
Commit/push/branch/PR: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Header

```yaml
title: "UxPilote Ecosystem Full UX Specification V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
frontend_backend_code: BLOCKED
hardware_power_control: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation_reset: BLOCKED
model_checkpoint_creation_or_promotion: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
commit_push_branch_pr: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

This specification is a roadmap-only UX record. It has no runtime authority and does not create implementation permission.

## 2. Purpose

This document finishes the UX design for UxPilote ecosystem mode end to end.

It defines product intent, user mental model, ecosystem metaphor, screens, panels, states, interactions, chain builder flow, evidence board flow, Patch Lab flow, HumanGate flow, cost/heat/energy overlay, LLM Link Layer boundaries, read-only data sources, permissions, blocked actions, and acceptance criteria.

It is not implementation authorization. It does not authorize frontend code, backend code, prototype code, runtime execution, test execution, hardware control, agent activation, training, benchmarks, datasets, model work, Git actions, or claims.

## 3. UX Doctrine

UxPilote is a framing cockpit for controlled work:

- UxPilote frames.
- Cartographer maps.
- HygieneAgent checks.
- TruthAgent qualifies.
- FusionAuditor merges.
- CartographerRedTeam challenges.
- HumanGate authorizes.
- Codex executes only after explicit bounded authorization.
- No autonomous execution.

HumanGate remains final.

## 4. Ecosystem Metaphor

The primary mental model is a cyber-living ecosystem:

| Role | UX metaphor | Meaning |
| --- | --- | --- |
| Human | water / care / intention | The operator supplies direction, restraint, validation, and refusal. |
| Code | soil / roots / trunks | Source files and executable structures hold the living body of the project. |
| Docs | genetic memory / seeds | Policies, plans, and records preserve origin, intent, and future growth paths. |
| Tests | immune system / immunity | Validation detects regression and protects boundaries. |
| Artifacts/logs | dead leaves / compost / traces | Outputs may inform future work but are not proof or authority by themselves. |
| Runtime | metabolism | Execution consumes inputs and energy, but remains blocked in this UX spec. |
| Machine | climate / heat / energy | Hardware and process conditions are passive environmental signals. |
| AI | mycelium / pollinators / scouts | LLMs and assistants connect, suggest, scout, and rerank without final authority. |
| HumanGate | sovereign gardener | The human decides mutation, activation, promotion, claims, cost, and Git actions. |

This metaphor is a navigation and comprehension layer only. It is not runtime truth, source truth, implementation evidence, or activation authority.

## 5. Primary User Loop

The default user loop is:

1. Observe ecosystem.
2. Select zone.
3. Inspect health.
4. Compose chain.
5. Validate Qui / Quoi / Quand / Comment / Où / Pourquoi.
6. Run fragmented audit pipeline as a design flow, not autonomous execution.
7. Review evidence.
8. Decide via HumanGate.
9. Produce task charter candidate only.

The loop must end at a task charter candidate unless a later separate HumanGate task authorizes one bounded next step.

## 6. Global Layout

The global interface is a stable cockpit:

- Top bar: workspace, repo, active chain, source-state, HumanGate, evidence, cost, runtime, and agent status.
- Left navigation: screen switching with no hidden execution.
- Center ecosystem canvas: read-only map and overlays.
- Right inspector: selected entity details, source-state, evidence, risks, and actions.
- Bottom event/evidence tray: recent readback, validation, routing, and conflict signals.
- HumanGate action strip: approve one bounded next step, block, request revision, defer, or deny activation.
- Status and cost badges: textual and visual state indicators.

No layout region may contain an unbounded run action or hidden mutation.

## 7. Top Bar Specification

The top bar must display:

- workspace.
- target repo.
- active chain id.
- source-state indicator.
- HumanGate status.
- evidence level.
- cost guard.
- runtime authority status.
- agent activation status.

Required top bar statuses:

```yaml
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
hardware_power_control: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

The top bar must keep blocked authority visible at all times.

## 8. Left Navigation

Navigation items:

- Ecosystem Map.
- Chain Builder.
- Zone Inspector.
- Evidence Board.
- Patch Lab.
- Cost / Heat / Energy.
- Source Registry.
- HumanGate.

Navigation changes the visible screen only. It must not execute chains, mutate files, run tests, start runtime commands, or activate agents.

## 9. Ecosystem Map

The Ecosystem Map is the primary orientation screen.

Visual nodes:

- file node: individual source, doc, template, report, or artifact reference.
- directory node: cluster of related files.
- chain node: task intent candidate.
- evidence node: validation, readback, or reported signal.
- route node: declared output destination or routing policy reference.
- HumanGate node: decision boundary.

Zones:

- Engine.
- Rocky.
- Routage.
- Evidence.
- Studio Control.
- Runtime Outputs.
- Models/Datasets.
- Archives.

Biome types:

- soil: active source/code surface.
- roots: dependencies and cross-file relationships.
- trunks: active runtime structures, displayed read-only.
- seeds: docs and roadmap candidates.
- immune tissue: tests and validation references.
- compost: passive artifacts, logs, and traces.
- fog: unknown or unread source state.
- heat: cost, time, CPU/GPU, or memory pressure signal.

Map overlays:

- file clusters.
- docs clusters.
- runtime clusters.
- passive outputs.
- archives.
- fog/unknown zones.
- danger zones.
- blocked zones.
- evidence overlays.
- heat overlays.
- ownership overlays.
- route overlays.

Danger and blocked zones must be textual, not color-only.

## 10. Zone Taxonomy

Each zone includes visible meaning, allowed read-only inputs, blocked actions, status badges, and HumanGate conditions.

| Zone | Visible meaning | Allowed read-only inputs | Blocked actions | Status badges | HumanGate conditions |
| --- | --- | --- | --- | --- | --- |
| Engine | Playable world, rules, simulation, actions, state. | File tree, source index, docs, static references. | Runtime execution, gameplay changes, tests, activation. | `PASSIVE`, `UNKNOWN`, `BLOCKED`. | Required for any mutation or runtime claim. |
| Rocky | Neural, Search, fusion, observability. | Source references, docs, prior reports. | Neural/Search authority change, DecisionController activation, benchmarks. | `PASSIVE`, `BLOCKED`, `UNKNOWN`. | Required for authority, model, or search changes. |
| Routage | Output routing, file registry, reports, archives, quarantine. | Routing policy, source anchoring, registry references. | Ambiguous output, root Markdown creation, forbidden destination writes. | `DOCUMENTED_ONLY`, `PASSIVE`, `BLOCKED`. | Required when a route is missing or risky. |
| Evidence | Evidence packets, claims, validation, status by surface. | Executor reports, analysis records, readback, diff checks. | Global ready verdict, claim promotion, benchmark proof. | `TESTED`, `DOCUMENTED_ONLY`, `UNKNOWN`. | Required for claim, promotion, or conflict resolution. |
| Studio Control | Control docs, forms, prompt gates, HumanGate records. | Studio Control docs and templates. | Template edits, source index edits, root duplicates without explicit task. | `DOCUMENTED_ONLY`, `PASSIVE`, `BLOCKED`. | Required for canonical docs mutation. |
| Runtime Outputs | Logs, runs, generated traces, runtime folders. | Passive references only. | `latest.json`, `lab/runs/RUN_*`, process execution. | `PASSIVE`, `NOT_FOUND`, `BLOCKED`. | Required for any artifact generation. |
| Models/Datasets | Datasets, checkpoints, models, manifests. | Passive metadata or docs only. | Dataset generation/reset, model/checkpoint creation or promotion. | `PASSIVE`, `BLOCKED`, `UNKNOWN`. | Required for any data/model action. |
| Archives | Historical snapshots and passive records. | Read-only archive references. | Promotion to active truth, mutation, cleanup. | `PASSIVE`, `UNKNOWN`. | Required for restore, deletion, or promotion. |

## 11. Chain Builder Screen

The Chain Builder creates chain candidates only.

Fields:

- chain type: Hygiene, Truth, Upgrade.
- target zone: Engine, Rocky, Routage, Evidence, Studio Control, Runtime Outputs, Models/Datasets, Archives.
- subzone: contextual to the target zone.
- action mode: inspect, compare, diagnose, validate evidence, prepare patch.
- authority level: read-only, docs-only, patch proposal, runtime locked.
- Qui: actor, role, authority.
- Quoi: target object, task intent, expected output.
- Quand: duration limit, loop limit, retry limit, stop condition, cost guard.
- Comment: allowed actions, blocked actions, validation mode, mutation policy.
- Où: zone, subzone, target path, output route.
- Pourquoi: reason, implementation rule, success condition, HumanGate required.
- output routing: produced file type, surface, destination, forbidden destinations, retention, promotion gate.
- blocked actions: explicit list bound to the chain.
- validation plan: readback and targeted checks only unless separately authorized.
- HumanGate required flag: always visible.

Create-chain gate:

- disabled until all required fields are present.
- disabled when source-state is `UNKNOWN` for a required source.
- disabled when output routing is missing for file-producing tasks.
- disabled when a blocked action is detected.
- disabled when cost guard is missing.
- disabled when HumanGate required is absent.

States:

- error state: invalid field, blocked action, bad route, unsupported status, or unknown source.
- incomplete state: required field missing.
- preview state: candidate is complete and ready for fragmented audit review.

## 12. Chain Grammar Validation UX

The UI blocks chain creation when:

- Qui missing: show `Qui is required: actor, role, and authority must be declared.`
- Quoi missing: show `Quoi is required: target object, task intent, and expected output must be declared.`
- Quand missing: show `Quand is required: duration, loop limit, retry limit, stop condition, and cost guard must be declared.`
- Comment missing: show `Comment is required: allowed actions, blocked actions, validation mode, and mutation policy must be declared.`
- Où missing: show `Où is required: zone, subzone, target path, and output route when needed must be declared.`
- Pourquoi missing: show `Pourquoi is required: reason, implementation rule, success condition, and HumanGate requirement must be declared.`
- output routing missing for file-producing tasks: show `Output routing is required before any file-producing task candidate.`
- blocked action detected: show `This chain contains a blocked action and cannot be created.`
- unknown source state: show `Required source state is UNKNOWN; load or inspect source before continuing.`
- cost guard missing: show `Cost guard is required for bounded chain creation.`
- HumanGate required but absent: show `HumanGate is required for this chain.`

The validation UI must explain the block and identify the exact missing field.

## 13. Fragmented Audit Pipeline UX

The pipeline is displayed as a staged review lane:

| Role | Input | Output | Visible status | Blocked actions | Failure state | Evidence required |
| --- | --- | --- | --- | --- | --- | --- |
| Cartographer | chain candidate, source index, routing policy, topology. | chain map, surface map, route need, missing source list. | `PASSIVE` or `BLOCKED`. | execute, mutate, authorize, claim. | missing zone, surface, or route. | source readback and route reference. |
| HygieneAgent | chain map, task candidate, contract, routing policy. | hygiene report, missing fields, invalid values, blocked-action findings. | `PASSIVE` or `BLOCKED`. | decide truth, mutate, self-repair silently. | unsupported status, bad route, blocked action. | allowed statuses and blocked-action evidence. |
| TruthAgent | chain map, hygiene report, source readback, evidence packet. | knowns, unknowns, blocked claims, evidence limits. | `PASSIVE` or `BLOCKED`. | promote docs to implementation, authorize claims. | evidence/claim confusion. | source/evidence separation. |
| FusionAuditor | map, hygiene, truth packet. | fusion packet, risks, proposed next step. | `PASSIVE` or `BLOCKED`. | execute, activate runtime, approve claims. | unresolved contradiction. | merged status by surface. |
| CartographerRedTeam | fusion packet. | objections, missing triggers, blocked escalation notes. | `PASSIVE` or `BLOCKED`. | approve HumanGate, mutate, execute. | hidden activation or bad route found. | objections tied to fields or sources. |
| HumanGate | fusion packet, red-team objections, route, cost guard, evidence. | approve one bounded next step, block, request revision, defer. | `DOCUMENTED_ONLY` or `BLOCKED`. | autonomous execution. | insufficient evidence or unsafe scope. | source-state, route check, blocked actions. |

No stage may self-authorize execution.

## 14. Zone Inspector

The Zone Inspector opens for any selected node or zone.

Panels:

- selected node summary: name, type, surface, path, and owner context.
- surface classification: active_runtime_code, tests, artifacts_runtime_outputs, canonical_docs, roadmap_docs_only, inference.
- source state: created, registered, loaded, enforced, evidenced.
- routing status: intended surface, allowed destination, missing route warnings.
- evidence status: readback, validation, report, claim limits.
- blocked actions: actions forbidden for the selected entity.
- related files: read-only references only.
- related reports: executor and analysis records if loaded.
- risks: unknowns, drift, hidden activation, bad route, unsupported claim.
- suggested chains: passive chain candidates only.
- HumanGate requirement: when mutation, activation, cost, claim, or Git action would be needed.

The inspector must never offer direct mutation.

## 15. Evidence Board

The Evidence Board displays evidence by surface:

- active_runtime_code.
- tests.
- artifacts_runtime_outputs.
- canonical_docs.
- roadmap_docs_only.
- inference.

Allowed statuses:

- IMPLEMENTED.
- TESTED.
- DOCUMENTED_ONLY.
- PASSIVE.
- BLOCKED.
- NOT_FOUND.
- UNKNOWN.

It must show separate software, evidence, and claim verdicts by surface. It must not show a global ready/not-ready verdict.

Evidence Board flow:

1. Select surface.
2. Inspect loaded evidence.
3. Separate observed facts from claims.
4. Show blocked or unknown items.
5. Show required HumanGate decision if claims exceed evidence.
6. Export or pass a task charter candidate only when authorized by a docs-only task.

## 16. Patch Lab

Patch Lab is candidate-only.

It defines:

- task charter candidate preview.
- target files.
- non-goals.
- allowed actions.
- blocked actions.
- validation plan.
- output routing.
- source-state requirements.
- HumanGate decision.
- executor report requirements.

Patch Lab must not mutate files. It must not generate implementation files, UI prototype files, runtime code, tests, datasets, models, lab runs, latest manifests, branches, commits, pushes, or pull requests.

Patch Lab flow:

1. Import chain candidate.
2. Display target files and non-goals.
3. Require output routing for any file-producing task.
4. Display blocked actions and locked actions.
5. Require validation plan and executor report expectations.
6. Produce a task charter candidate only.
7. Stop at HumanGate.

## 17. Cost / Heat / Energy Overlay

The Cost / Heat / Energy overlay is observation only.

It may display:

- observed cost.
- estimated cost.
- CPU/GPU pressure.
- memory pressure.
- time cost.
- validation cost.
- risk of runaway loops.
- cost guard states.

Cost guard states:

- low: readback, static inspection, small docs-only validation.
- medium: bounded repo audit or targeted docs validation.
- high: requires explicit HumanGate.
- blocked: not allowed in this chain.

It must state and enforce:

- observation only.
- no hardware control.
- no power control.
- no process termination.
- no system settings changes.

Cost records are not proof, claim validation, benchmark validation, model evidence, or runtime authorization.

## 18. LLM Link Layer

The LLM Link Layer is passive only.

It may provide:

- passive suggestions.
- label generation.
- summarization.
- reranking UI options.
- ambiguity detection.
- chain draft assistance.

It must state:

- no final authority.
- no mutation.
- no execution.
- no claims.
- no activation.
- repo inspection remains factual authority.
- HumanGate remains final.

LLM output must be labeled as suggestion, draft, or explanation. It must not override source readback, Git status, routing policy, evidence records, or HumanGate.

## 19. HumanGate Panel

HumanGate decisions:

- approve one bounded next step.
- block.
- request revision.
- authorize docs-only task.
- authorize patch proposal.
- deny activation.
- defer.

The panel must display:

- source-state.
- route check.
- evidence packet.
- red-team objections.
- cost guard.
- blocked actions.
- exact files.
- expiry / one-step boundary.

The one-step boundary must state what expires, what remains blocked, and what cannot be inferred as authorized.

## 20. State Model

UI states:

- empty: no workspace, repo, or chain selected.
- loading/readback: source or evidence read is in progress.
- source_unknown: required source state is `UNKNOWN`.
- chain_incomplete: required chain grammar fields are missing.
- chain_blocked: blocked action, bad route, unsafe cost, or invalid status exists.
- ready_for_humangate: chain candidate is complete and audit packet is ready for human decision.
- humangate_blocked: HumanGate blocked or refused the next step.
- task_charter_candidate_created: candidate exists, but no execution authority exists.
- executor_report_loaded: report is available for read-only inspection.
- analysis_record_loaded: analysis record is available for passive review.
- evidence_conflict: evidence and claim do not align.
- route_conflict: output route is missing, ambiguous, or forbidden.
- runtime_locked: runtime authority remains `NONE`.
- agent_locked: agent activation remains `BLOCKED`.

Every state must preserve blocked actions and show the next allowed user choice.

## 21. Data Model

Read-only objects:

- ecosystem_node: id, label, node_type, zone_id, surface, path, status, evidence_refs, route_refs, risk_refs.
- zone: id, name, visible_meaning, allowed_inputs, blocked_actions, status_badges, humangate_conditions.
- surface: name, status, software_verdict, evidence_verdict, claim_verdict.
- source_state: created, registered, loaded, enforced, evidenced.
- chain_candidate: chain_id, chain_type, zone, subzone, action_mode, authority_level, qui, quoi, quand, comment, ou, pourquoi.
- output_route: produced_file_type, intended_surface, canonical_destination, forbidden_destinations, registration_required, promotion_gate.
- evidence_packet: source_refs, command_refs, readback_refs, validation_refs, claim_limits, unknowns.
- patch_plan_candidate: target_files, non_goals, allowed_actions, blocked_actions, validation_plan, output_routing.
- human_gate_decision: decision, exact_scope, expiry, one_step_boundary, blocked_actions_preserved.
- cost_signal: observed_cost, estimated_cost, cpu_gpu_pressure, memory_pressure, time_cost, validation_cost, guard_state.
- blocked_action: action, surface, reason, required_humangate_condition.
- uxpilote_view_state: active_view, selected_node, chain_state, evidence_state, route_state, runtime_lock, agent_lock.

These objects are design targets only and do not define executable schemas.

## 22. Read-Only Adapters

Adapters:

- file_tree_adapter.
- git_status_adapter.
- source_index_adapter.
- source_anchoring_adapter.
- output_routing_adapter.
- autodev_template_adapter.
- executor_report_adapter.
- analysis_record_adapter.
- cost_signal_adapter.
- llm_link_adapter.

All adapters are read-only by default. They must not write files, patch code, run runtime commands, run tests, invoke CI, control hardware, terminate processes, change system settings, generate datasets, create models/checkpoints, activate agents, or perform Git actions.

## 23. Permission Model

Permission levels:

- read-only: inspect, summarize, classify, display.
- docs-only: prepare routed documentation or task charter candidates when explicitly authorized.
- patch proposal: prepare task-charter or patch-plan candidate only.
- runtime locked: runtime change is explicitly out of scope.
- HumanGate required: one bounded human decision is required before any next step.
- forbidden: action is blocked in this UX spec.

Screen/action matrix:

| Screen | Inspect | Create candidate | Mutate files | Execute runtime | Activate agents | Git action | Hardware/power/process control |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ecosystem Map | read-only | forbidden | forbidden | forbidden | forbidden | forbidden | forbidden |
| Chain Builder | read-only | patch proposal | forbidden | forbidden | forbidden | forbidden | forbidden |
| Zone Inspector | read-only | patch proposal | forbidden | forbidden | forbidden | forbidden | forbidden |
| Evidence Board | read-only | docs-only candidate | forbidden | forbidden | forbidden | forbidden | forbidden |
| Patch Lab | read-only | patch proposal | forbidden | forbidden | forbidden | forbidden | forbidden |
| Cost / Heat / Energy | read-only | forbidden | forbidden | forbidden | forbidden | forbidden | forbidden |
| Source Registry | read-only | docs-only candidate | forbidden | forbidden | forbidden | forbidden | forbidden |
| HumanGate | read-only | authorize one bounded candidate | forbidden by this spec | forbidden by this spec | forbidden by this spec | forbidden by this spec | forbidden |

## 24. Error And Blocking Messages

User-facing messages:

- source missing: `Required source is missing. Load or provide source readback before continuing.`
- output routing missing: `Output routing is required for file-producing work.`
- unsupported status value: `Unsupported status value. Use IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, or UNKNOWN.`
- attempted runtime action: `Runtime action is blocked. Runtime authority is NONE.`
- attempted agent activation: `Agent activation is blocked. HumanGate cannot be bypassed.`
- attempted training/benchmark/dataset/model action: `Training, benchmark, dataset, and model actions are blocked in this UX spec.`
- attempted Git action: `Git commit, push, branch, and pull request actions are blocked.`
- unknown source state: `Source state is UNKNOWN. This chain cannot proceed until source readback is evidenced.`
- HumanGate missing: `HumanGate is required before this next step can be considered.`

Blocking messages must name the field, action, or source that caused the block.

## 25. Accessibility And Clarity

Accessibility and clarity requirements:

- Color is not the only status channel.
- Status labels must be textual.
- Dangerous actions must be explicit.
- No hidden mutation.
- No ambiguous button labels.
- No "run all" action.
- No auto-loop by default.
- Disabled actions must explain why they are disabled.
- Icons must have labels or tooltips.
- Evidence and claim language must be separated.
- Every HumanGate decision must show exact scope and expiry.

The UX must make refusal and defer states normal, visible outcomes.

## 26. Acceptance Criteria

The UX design is acceptable only if:

- all main screens are specified.
- chain grammar is complete.
- output routing is mandatory for file-producing tasks.
- evidence is by surface.
- no global ready verdict exists.
- HumanGate is final.
- runtime and agents remain blocked.
- Patch Lab creates candidates only.
- LLM Link Layer is passive.
- cost/heat/energy is observation only.
- no implementation is authorized.
- hardware, power, process, and system settings control remain blocked.
- Git actions remain blocked.
- claims remain bounded by evidence.

## 27. Non-Authorization

This document does not authorize:

- implementation.
- prototype.
- runtime.
- tests.
- CI.
- agents.
- training.
- benchmarks.
- datasets.
- models.
- hardware control.
- power control.
- process termination.
- system settings changes.
- Git actions.
- claims.

Any such action requires a separate explicit HumanGate-approved task with exact scope, route, validation, executor reporting, and non-authorization boundaries.

## 28. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## 29. Verdicts

```yaml
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

no_global_ready_verdict: true
```


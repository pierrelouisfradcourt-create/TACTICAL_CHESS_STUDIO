# UxPilote Ecosystem Screen Inventory V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Agent activation: BLOCKED
Prototype implementation: BLOCKED
Frontend/backend code: BLOCKED
Hardware/power control: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Header

```yaml
title: "UxPilote Ecosystem Screen Inventory V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
frontend_backend_code: BLOCKED
hardware_power_control: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

This inventory is a roadmap-only design record. It does not authorize implementation, prototype work, runtime execution, agent activation, hardware control, Git actions, or claims.

## 2. Purpose

This document turns the full UxPilote ecosystem UX specification into a concrete screen-by-screen inventory.

It defines each screen's purpose, visible components, inputs, outputs, UI states, blocked actions, read-only data sources, HumanGate conditions, and acceptance criteria.

This is not implementation authorization. It does not define frontend code, backend code, UI prototype files, runtime behavior, tests, CI, training, benchmarks, datasets, models, hardware control, process control, Git actions, or claims.

## 3. Global Shell

The global shell is shared across all screens:

- top bar: workspace, target repo, active chain id, source-state indicator, HumanGate status, evidence level, cost guard, runtime authority, and agent activation status.
- left navigation: Ecosystem Map, Chain Builder, Zone Inspector, Evidence Board, Patch Lab, Cost / Heat / Energy, Source Registry, HumanGate, LLM Link Layer, and Event / Evidence Tray.
- ecosystem canvas: read-only visual map or selected screen workspace.
- right inspector: selected node, source state, routing, evidence, risks, blocked actions, and HumanGate requirement.
- bottom evidence/event tray: latest readback, validation, blocked action, source-state change, route check, HumanGate decision, and report links.
- HumanGate action strip: approve one bounded next step, block, request revision, authorize docs-only task, authorize patch proposal, deny activation, or defer.

Shared shell constraints:

- no hidden mutation.
- no run-all control.
- no runtime command control.
- no agent activation control.
- no hardware, power, process, or system settings control.
- no Git action control.

## 4. Screen Inventory Table

| Screen | Purpose | Primary user question | Visible components | Read-only inputs | Produced outputs | UI states | Blocked actions | HumanGate conditions | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ecosystem Map | Orient the operator across ecosystem zones. | What exists, what is known, and what is blocked? | biome nodes, zone clusters, overlays, badges. | file tree, source index, routing policy, UX specs, reports. | selected node, passive map view. | empty, loading/readback, source_unknown, runtime_locked, agent_locked. | mutation, runtime, agent activation, run-all. | required for any mutation, activation, claim, or costly run. | all zones visible; no mutation controls. |
| Chain Builder | Compose bounded chain candidates. | Is this chain complete and bounded? | chain fields, grammar validator, route panel, preview. | UxPilote chain spec, AutoDev contract, routing policy, source state. | chain candidate only. | chain_incomplete, chain_blocked, ready_for_humangate, candidate_created. | execution, file mutation, tests, Git actions. | required before candidate can become a task charter. | Qui/Quoi/Quand/Comment/Ou/Pourquoi complete; route required when file-producing. |
| Zone Inspector | Inspect one node or zone. | What is this entity, and what evidence supports it? | selected node, surface, source state, related files, risks. | file tree, source anchors, reports, route records. | suggested chains only. | source_unknown, evidence_conflict, route_conflict. | direct mutation, runtime, activation. | required for changes, claims, cost, and Git actions. | source/evidence/risk panels visible. |
| Evidence Board | Compare evidence by surface. | What is evidence, what is claim, and what is unknown? | surface rows, verdict columns, evidence packets, conflicts. | executor reports, analysis records, readback, validation records. | evidence packet summary only. | executor_report_loaded, analysis_record_loaded, evidence_conflict. | global ready verdict, claim promotion, benchmark proof. | required when claims exceed evidence. | all surfaces use allowed statuses; no global ready/not-ready. |
| Patch Lab | Prepare task-charter candidates. | What bounded task could be proposed safely? | candidate preview, targets, non-goals, actions, route, validation. | chain candidate, routing policy, AutoDev contract, source state. | task-charter candidate only. | chain_blocked, ready_for_humangate, candidate_created. | mutation, implementation files, UI prototype files, Git actions. | required before any candidate can be executed elsewhere. | candidate-only and no mutation stated. |
| Cost / Heat / Energy | Display passive cost signals. | What cost or pressure is visible or estimated? | observed cost, estimated cost, CPU/GPU, memory, time, guard. | passive telemetry records, validation estimates, cost guard fields. | cost signal display only. | loading/readback, source_unknown, runtime_locked. | hardware control, power control, process termination, system changes. | required for high or unknown cost. | observation-only stated. |
| Source Registry | Show source-state posture. | Which sources are created, registered, loaded, enforced, evidenced? | source rows, status badges, stale/unknown flags, refresh-needed indicator. | source index, source anchoring doc, routing policy, readback records. | source-state summary only. | source_unknown, loading/readback, route_conflict. | auto-promotion, source index mutation, template mutation. | required when source state blocks work. | no auto-promote sources. |
| HumanGate | Present human decision packet. | Can one bounded next step be approved, blocked, revised, or deferred? | decision options, evidence, route, cost, objections, exact files, expiry. | fusion packet, red-team objections, route check, evidence packet. | human decision record candidate only. | ready_for_humangate, humangate_blocked, candidate_created. | autonomous execution, hidden mutation, global claim approval. | final authority for mutation, activation, promotion, claim, cost, Git. | exact one-step boundary visible. |
| LLM Link Layer | Offer passive language/navigation assistance. | What labels, summaries, or ambiguity flags help the operator? | suggestions, summaries, labels, reranked options, ambiguity flags. | loaded docs, source readback, selected UI context. | suggestions only. | loading/readback, source_unknown, evidence_conflict. | final authority, mutation, execution, activation, claims. | required when suggestion would affect a decision. | passive-only and no authority stated. |
| Event / Evidence Tray | Show latest passive evidence events. | What just happened, and what does it prove or not prove? | readback event, validation event, blocked action, source-state, route, HumanGate, links. | readback records, validation records, route checks, reports. | event list only. | empty, loading/readback, evidence_conflict, route_conflict. | treating logs as proof, hidden execution. | required when events imply action or claim. | logs are not proof by default. |

## 5. Ecosystem Map Screen

Purpose: provide a read-only ecosystem overview.

Visible components:

- biome nodes.
- zone clusters.
- fog / unknown zones.
- danger zones.
- blocked zones.
- evidence overlay.
- route overlay.
- heat overlay.
- source-state badges.
- no mutation controls.

Read-only inputs:

- file tree references.
- source index.
- output routing policy.
- source anchoring records.
- UxPilote UX docs.
- passive report links.

Produced outputs:

- selected node context.
- passive map orientation.
- suggested chain entry point only.

UI states:

- empty.
- loading/readback.
- source_unknown.
- evidence_conflict.
- route_conflict.
- runtime_locked.
- agent_locked.

Blocked actions:

- file mutation.
- runtime commands.
- tests or CI.
- agent activation.
- hardware/power/process/system control.
- run-all.
- Git actions.

HumanGate conditions:

- required for any proposed mutation, activation, claim, costly run, Git action, or route exception.

Acceptance criteria:

- all primary zones are visible.
- unknown areas are labeled as fog/unknown.
- danger and blocked zones are textual, not color-only.
- no screen control mutates files or executes commands.

## 6. Chain Builder Screen

Purpose: compose a bounded chain candidate.

Visible components:

- chain type.
- zone.
- subzone.
- action mode.
- authority level.
- Qui.
- Quoi.
- Quand.
- Comment.
- Ou.
- Pourquoi.
- output routing.
- blocked actions.
- validation plan.
- HumanGate flag.
- create-chain blocked states.

Read-only inputs:

- UxPilote chain spec.
- AutoDev I/O contract.
- output routing policy.
- source-state records.
- full UX spec.

Produced outputs:

- chain candidate only.
- validation error list.
- preview packet for fragmented audit pipeline.

UI states:

- chain_incomplete.
- chain_blocked.
- source_unknown.
- route_conflict.
- ready_for_humangate.
- candidate_created.

Blocked actions:

- autonomous chain execution.
- file mutation.
- implementation creation.
- runtime execution.
- tests or CI.
- training, benchmark, dataset, model actions.
- Git actions.

HumanGate conditions:

- required before any chain candidate becomes a bounded task charter.
- required when output routing, source state, cost guard, or blocked actions are unresolved.

Acceptance criteria:

- create-chain remains blocked until Qui, Quoi, Quand, Comment, Ou, Pourquoi, cost guard, and HumanGate flag are complete.
- file-producing candidates require output routing.
- blocked actions are visible before preview.

## 7. Zone Inspector Screen

Purpose: inspect one selected ecosystem node or zone.

Visible components:

- selected node.
- surface classification.
- source state.
- related files.
- related reports.
- evidence status.
- routing status.
- risks.
- suggested chains.
- blocked actions.

Read-only inputs:

- selected map node.
- source anchoring records.
- file tree references.
- routing policy.
- executor and analysis report references.

Produced outputs:

- passive node summary.
- suggested chain candidate entry point.
- risk list.

UI states:

- empty.
- loading/readback.
- source_unknown.
- evidence_conflict.
- route_conflict.
- runtime_locked.
- agent_locked.

Blocked actions:

- direct mutation.
- direct report creation.
- runtime execution.
- agent activation.
- Git action.
- hidden claim promotion.

HumanGate conditions:

- required if the selected node implies mutation, activation, claim, data/model action, route exception, or Git action.

Acceptance criteria:

- every selected node shows surface, source state, evidence status, route status, and blocked actions.
- suggested chains remain passive candidates.

## 8. Evidence Board Screen

Purpose: separate evidence, claims, unknowns, and blocked surfaces.

Required surfaces:

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

Visible components:

- surface table.
- software verdict by surface.
- evidence verdict by surface.
- claim verdict by surface.
- evidence packet links.
- unknowns and blocked claims.
- conflict flags.

Read-only inputs:

- executor report references.
- analysis record references.
- readback evidence.
- validation evidence.
- source-state records.

Produced outputs:

- passive evidence summary.
- conflict list.
- HumanGate escalation prompt when claims exceed evidence.

UI states:

- empty.
- executor_report_loaded.
- analysis_record_loaded.
- evidence_conflict.
- source_unknown.
- runtime_locked.
- agent_locked.

Blocked actions:

- global ready/not-ready verdict.
- claim promotion.
- benchmark proof.
- runtime activation claim.
- model promotion claim.

HumanGate conditions:

- required for claim, promotion, activation, or evidence conflict resolution.

Acceptance criteria:

- must not show global ready/not-ready.
- must use only allowed statuses.
- must split software, evidence, and claim verdicts by surface.

## 9. Patch Lab Screen

Purpose: prepare task-charter candidates from bounded chain candidates.

Visible components:

- task charter candidate preview.
- target files.
- non-goals.
- allowed actions.
- blocked actions.
- validation plan.
- output routing.
- source-state requirements.
- HumanGate required.
- executor report requirements.

Read-only inputs:

- chain candidate.
- AutoDev contract.
- output routing policy.
- source-state records.
- evidence board summary.

Produced outputs:

- task-charter candidate only.
- patch-plan candidate only.
- validation-plan candidate only.

UI states:

- chain_incomplete.
- chain_blocked.
- source_unknown.
- route_conflict.
- ready_for_humangate.
- candidate_created.

Blocked actions:

- mutation.
- implementation file creation.
- UI prototype file creation.
- runtime code edits.
- tests or CI.
- latest.json.
- lab/runs/RUN_*.
- model/checkpoint files.
- Git actions.

HumanGate conditions:

- required before a candidate can be used by an executor.
- required for any docs-only task authorization or patch proposal authorization.

Acceptance criteria:

- Patch Lab is candidate-only.
- Patch Lab must state no mutation.
- output routing and executor report requirements are visible.

## 10. Cost / Heat / Energy Screen

Purpose: show passive cost and pressure signals.

Visible components:

- observed cost.
- estimated cost.
- CPU/GPU pressure.
- memory pressure.
- time cost.
- validation cost.
- runaway-loop risk.
- cost guard.

Read-only inputs:

- reported cost signals.
- validation estimates.
- chain cost guard fields.
- passive system observations when separately available.

Produced outputs:

- cost signal display only.
- cost guard warning only.

UI states:

- empty.
- loading/readback.
- source_unknown.
- runtime_locked.
- chain_blocked.

Blocked actions:

- hardware control.
- power control.
- process termination.
- system settings changes.
- runtime execution.
- benchmark.
- training.

HumanGate conditions:

- required for high cost, missing cost guard, costly run, benchmark, training, or any system-level action.

Acceptance criteria:

- Cost / Heat / Energy is observation-only.
- no hardware/power/process/system control is present.
- cost records are not treated as proof.

## 11. Source Registry Screen

Purpose: make source-state visible and prevent unregistered or unloaded source assumptions.

Visible components:

- created.
- registered.
- loaded.
- enforced.
- evidenced.
- source class.
- source path.
- stale/unknown state.
- refresh needed.

Read-only inputs:

- GPT Navigator source index.
- Studio source anchoring.
- output routing policy.
- source readback evidence.
- report references.

Produced outputs:

- passive source-state summary.
- missing source warning.
- refresh-needed marker.

UI states:

- loading/readback.
- source_unknown.
- route_conflict.
- evidence_conflict.

Blocked actions:

- auto-promote sources.
- edit source index.
- edit templates.
- treat roadmap docs as active truth.
- infer loaded state from memory.

HumanGate conditions:

- required for source registration, source promotion, source-index mutation, or canonical docs mutation.

Acceptance criteria:

- created, registered, loaded, enforced, and evidenced are shown separately.
- stale or unknown sources block chain creation when required.
- sources are not auto-promoted.

## 12. HumanGate Screen

Purpose: present the final human decision surface for one bounded next step.

Visible components:

- decision options.
- approve one bounded next step.
- block.
- request revision.
- authorize docs-only task.
- authorize patch proposal.
- deny activation.
- defer.
- expiry / one-step boundary.
- visible evidence packet.
- red-team objections.
- exact files.
- cost guard.

Read-only inputs:

- chain candidate.
- fragmented audit packet.
- evidence board summary.
- route check.
- red-team objections.
- cost guard.

Produced outputs:

- human decision record candidate only.
- accepted or blocked next-step scope statement.

UI states:

- ready_for_humangate.
- humangate_blocked.
- candidate_created.
- evidence_conflict.
- route_conflict.
- runtime_locked.
- agent_locked.

Blocked actions:

- autonomous execution.
- hidden mutation.
- broad authorization.
- agent activation by default.
- runtime activation by default.
- Git action by default.

HumanGate conditions:

- HumanGate is final for mutation, activation, promotion, claims, costly runs, runtime authority, model/dataset work, and Git actions.

Acceptance criteria:

- decision options are explicit.
- exact files and expiry are visible.
- one-step boundary is visible.
- denied activation and defer are valid outcomes.

## 13. LLM Link Layer Screen

Purpose: show passive LLM-assisted language and navigation support.

Visible components:

- suggestion panel.
- summarization.
- label generation.
- ambiguity detection.
- passive reranking.
- no authority banner.
- no mutation banner.
- no execution banner.
- no claims banner.

Read-only inputs:

- selected screen context.
- loaded docs.
- source readback.
- evidence packet summaries.
- route summaries.

Produced outputs:

- suggestions only.
- draft labels only.
- summaries only.
- ambiguity flags only.

UI states:

- empty.
- loading/readback.
- source_unknown.
- evidence_conflict.
- route_conflict.

Blocked actions:

- final authority.
- mutation.
- execution.
- claims.
- activation.
- source override.
- HumanGate bypass.

HumanGate conditions:

- required when an LLM suggestion would become a task, claim, route change, mutation, activation, or promotion.

Acceptance criteria:

- LLM Link Layer is passive-only.
- repo inspection remains factual authority.
- HumanGate remains final.

## 14. Event / Evidence Tray

Purpose: show recent passive events and prevent logs from becoming proof by default.

Visible components:

- latest readback event.
- latest validation event.
- latest blocked action.
- latest source-state change.
- latest route check.
- latest HumanGate decision.
- report links.

Read-only inputs:

- readback events.
- validation events.
- blocked-action records.
- source-state records.
- route checks.
- HumanGate decision records.
- executor and analysis report references.

Produced outputs:

- event list only.
- report link list only.
- passive conflict marker.

UI states:

- empty.
- loading/readback.
- evidence_conflict.
- route_conflict.
- source_unknown.

Blocked actions:

- treating logs as proof by default.
- hidden runtime execution.
- auto-claiming evidence.
- auto-promoting artifacts.

HumanGate conditions:

- required when an event implies a claim, mutation, promotion, activation, route exception, or costly run.

Acceptance criteria:

- latest events are visible.
- logs and reports remain observation unless promoted by separate HumanGate authority.
- no event row can execute or mutate.

## 15. Shared UI States

Shared UI states:

- empty: no selected workspace, repo, screen item, or chain.
- loading/readback: source or evidence readback is in progress.
- source_unknown: required source state is `UNKNOWN`.
- chain_incomplete: required grammar fields are missing.
- chain_blocked: blocked action, missing route, invalid source state, or missing cost guard exists.
- ready_for_humangate: candidate and evidence packet are complete enough for human review.
- humangate_blocked: HumanGate blocked, refused, or deferred.
- candidate_created: task-charter or patch-plan candidate exists without execution authority.
- executor_report_loaded: executor report reference is available for read-only inspection.
- analysis_record_loaded: analysis record reference is available for passive inspection.
- evidence_conflict: evidence and claim do not align.
- route_conflict: route is missing, ambiguous, or forbidden.
- runtime_locked: runtime authority remains `NONE`.
- agent_locked: agent activation remains `BLOCKED`.

All states preserve blocked actions and no global ready/not-ready verdict.

## 16. Permission Matrix

| Permission level | view | inspect | draft chain | create task-charter candidate | mutate file | run command | activate agent | approve claim |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| read_only | allowed | allowed | blocked | blocked | blocked | blocked | blocked | blocked |
| docs_only | allowed | allowed | allowed | allowed when routed | blocked by default | blocked | blocked | blocked |
| patch_proposal | allowed | allowed | allowed | candidate-only | blocked | blocked | blocked | blocked |
| runtime_locked | allowed | allowed | allowed as blocked context | blocked | blocked | blocked | blocked | blocked |
| HumanGate | allowed | allowed | allowed | may authorize one bounded candidate | requires separate explicit task | requires separate explicit task | requires separate explicit task | requires separate explicit evidence and task |

Rules:

- no screen may bypass the matrix.
- HumanGate is a decision boundary, not automatic execution.
- file mutation, command execution, agent activation, and claim approval remain blocked in this document.

## 17. Acceptance Criteria

The screen inventory is acceptable only if:

- every screen has purpose/components/states/blocked actions.
- no screen includes hidden mutation.
- no screen has run-all.
- no screen authorizes runtime.
- no screen authorizes agent activation.
- no global ready/not-ready exists.
- HumanGate remains final.
- Patch Lab is candidate-only.
- LLM Link Layer is passive-only.
- Cost / Heat / Energy is observation-only.
- Source Registry does not auto-promote sources.
- Event / Evidence Tray does not treat logs as proof by default.
- only allowed status values are used in status fields.

## 18. Non-Authorization

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
- latest.json.
- lab/runs/RUN_*.
- model/checkpoint files.
- Git commit.
- Git push.
- branch creation.
- pull request creation.
- claims.

Any such action requires a separate explicit HumanGate-approved task with exact scope, output routing, validation, executor reporting, and non-authorization boundaries.

## 19. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## 20. Verdicts

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


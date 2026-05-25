# UxPilote Ecosystem Interaction Flow Specification V0

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
title: "UxPilote Ecosystem Interaction Flow Specification V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
frontend_backend_code: BLOCKED
hardware_power_control: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

This document is a roadmap-only interaction flow specification. It has no runtime authority and does not authorize implementation, prototype files, frontend code, backend code, agent activation, hardware control, process control, Git actions, or claims.

## 2. Purpose

This specification defines concrete user journeys across the planned UxPilote ecosystem screens:

- Ecosystem Map.
- Chain Builder.
- Zone Inspector.
- Evidence Board.
- Patch Lab.
- Cost / Heat / Energy.
- Source Registry.
- HumanGate.
- LLM Link Layer.
- Event / Evidence Tray.

It describes screen transitions, blocking states, HumanGate checkpoints, and possible outputs. It is not an implementation plan, executable schema, prototype authorization, runtime workflow, or agent activation record.

## 3. Flow Principles

- User intention first: every flow begins from a human question, selection, or bounded task intent.
- Source-state before claims: created, registered, loaded, enforced, and evidenced remain separate.
- Output routing before file-producing task: a candidate that may produce or update a file is blocked until route, surface, destination, retention, and promotion gate are explicit.
- HumanGate before mutation: mutation, activation, promotion, claims, costly runs, and Git actions require a separate bounded HumanGate decision.
- Evidence by surface: active_runtime_code, tests, artifacts_runtime_outputs, canonical_docs, roadmap_docs_only, and inference stay separated.
- No global ready/not-ready: verdicts are per surface only.
- No hidden mutation: navigation, previews, suggestions, and evidence views must not write files or execute commands.
- No run-all action: no screen offers unbounded execution, chain execution, tests, CI, training, benchmark, dataset generation, model work, or agent activation.

## 4. Primary Flow: Observe Ecosystem

Goal: orient the human across visible ecosystem zones without execution.

1. Open Ecosystem Map from the left navigation.
2. Inspect visible zones: Engine, Rocky, Routage, Evidence, Studio Control, Runtime Outputs, Models/Datasets, and Archives when present.
3. Inspect overlays for source-state, route, evidence, blocked zones, unknown zones, and cost pressure.
4. Select one node or zone.
5. Transition to Zone Inspector with selected node context preserved.
6. Inspect source-state, evidence, routing, surface classification, blocked actions, and risks.
7. Choose a suggested chain candidate, open Evidence Board for supporting evidence, open Source Registry for source-state gaps, or return to Ecosystem Map.

Blocking states:

- If source-state is UNKNOWN, display: `Required source state is UNKNOWN; inspect or load source readback before continuing.`
- If the selected node implies mutation, activation, claim, costly run, or Git action, display HumanGate required and keep the action blocked.
- If route information is missing for a possible file-producing path, route-dependent next steps remain blocked.

Outputs:

- no output.
- selected node context.
- suggested chain candidate entry point only.

## 5. Primary Flow: Create Chain Candidate

Goal: create a bounded chain candidate, not an executable chain.

1. Open Chain Builder.
2. Choose chain type: Hygiene, Truth, or Upgrade.
3. Choose zone and subzone.
4. Fill Qui: actor, role, and authority.
5. Fill Quoi: target object, task intent, and expected output.
6. Fill Quand: duration limit, loop limit, retry limit, stop condition, and cost guard.
7. Fill Comment: allowed actions, blocked actions, validation mode, and mutation policy.
8. Fill Ou: zone, subzone, target path, and output route when file-producing work is possible.
9. Fill Pourquoi: reason, implementation rule, success condition, and HumanGate requirement.
10. Validate output routing when any file may be created, updated, moved, renamed, archived, deleted, or generated.
11. Check blocked actions against runtime, tests, CI, training, benchmark, dataset, model, hardware/power/process, agent, and Git locks.
12. Preview chain candidate.
13. Send the candidate to the fragmented audit pipeline for staged review.

Blocking states:

- CREATE_CHAIN remains BLOCKED until every required grammar field is complete.
- File-producing candidates remain BLOCKED until output routing is explicit and allowed.
- Any blocked action keeps the candidate in chain_blocked.

Outputs:

- chain candidate.
- validation error list.
- fragmented audit pipeline input packet.

## 6. Flow: Chain Incomplete

CREATE_CHAIN remains BLOCKED when any required field, guard, source state, route, or HumanGate condition is missing.

| Blocking condition | Displayed message | Allowed next action | Forbidden next action |
| --- | --- | --- | --- |
| missing Qui | `Qui is required: actor, role, and authority must be declared.` | Fill Qui. | Create chain. |
| missing Quoi | `Quoi is required: target object, task intent, and expected output must be declared.` | Fill Quoi. | Create chain. |
| missing Quand | `Quand is required: duration, loop limit, retry limit, stop condition, and cost guard must be declared.` | Fill Quand. | Create chain. |
| missing Comment | `Comment is required: allowed actions, blocked actions, validation mode, and mutation policy must be declared.` | Fill Comment. | Create chain. |
| missing Ou | `Ou is required: zone, subzone, target path, and output route when needed must be declared.` | Fill Ou. | Create chain. |
| missing Pourquoi | `Pourquoi is required: reason, implementation rule, success condition, and HumanGate requirement must be declared.` | Fill Pourquoi. | Create chain. |
| missing output routing | `Output routing is required before any file-producing task candidate.` | Open routing panel or Source Registry. | Create file-producing candidate. |
| missing cost guard | `Cost guard is required for bounded chain creation.` | Open Cost / Heat / Energy or set guard. | Create chain. |
| unknown source state | `Required source state is UNKNOWN; load or inspect source before continuing.` | Open Source Registry or Zone Inspector. | Treat source as evidence. |
| HumanGate required but absent | `HumanGate is required for this chain.` | Add HumanGate requirement. | Continue as authorized. |

Result: CREATE_CHAIN remains BLOCKED.

## 7. Flow: Fragmented Audit Pipeline

Goal: convert a chain candidate into a reviewed decision packet without execution.

1. Cartographer maps the candidate to one primary zone, one primary surface, secondary surfaces, target path, output route, and missing source anchors.
2. HygieneAgent checks required fields, allowed status values, allowed surface values, blocked actions, route presence, duplicate-root risk, and ambiguous destinations.
3. TruthAgent qualifies evidence, claims, unknowns, blocked surfaces, and document drift risk.
4. FusionAuditor merges map, hygiene, and truth outputs into one fusion packet with unresolved risks and a bounded next-step candidate.
5. CartographerRedTeam challenges the fusion packet for missing surfaces, hidden activation, bad routing, unsupported claims, unbounded loops, and Neural/Search authority drift.
6. HumanGate reviews the fusion packet and red-team objections.

Pipeline outcomes:

| Outcome | Meaning | Canonical status posture | Next action |
| --- | --- | --- | --- |
| success outcome | Candidate is complete enough for HumanGate review. | DOCUMENTED_ONLY for decision packet; PASSIVE for audit roles. | Open HumanGate. |
| warning outcome | A caution exists but no blocked action was detected. | UNKNOWN or DOCUMENTED_ONLY by surface, never a new status value. | Review warning, revise, or proceed to HumanGate. |
| blocked outcome | Missing field, route conflict, source gap, blocked action, or evidence conflict exists. | BLOCKED. | Revise chain or source-state evidence. |
| revision outcome | HumanGate or audit stage requests narrower scope or corrected evidence. | DOCUMENTED_ONLY. | Return to Chain Builder or Zone Inspector. |

No pipeline stage may execute, mutate, activate, approve claims, or self-authorize.

## 8. Flow: Evidence Board Review

Goal: compare evidence, claims, and unknowns by surface.

1. Open Evidence Board from navigation, Zone Inspector, HumanGate, or Event / Evidence Tray.
2. Inspect surfaces: active_runtime_code, tests, artifacts_runtime_outputs, canonical_docs, roadmap_docs_only, and inference.
3. Compare software_verdict, evidence_verdict, and claim_verdict for each surface.
4. Open supporting readback, executor report, analysis record, route check, or source-state reference when linked.
5. Mark unknowns as UNKNOWN when evidence is absent or not loaded.
6. Flag evidence conflicts when claims exceed source readback or validation evidence.
7. Keep global ready/not-ready absent.

Outputs:

- evidence packet view.
- unknown list.
- conflict list.
- HumanGate escalation prompt when claims exceed evidence.

Blocked actions:

- global ready/not-ready verdict.
- claim promotion.
- benchmark proof.
- runtime activation claim.
- model or checkpoint promotion claim.

## 9. Flow: Patch Lab Candidate

Goal: prepare a task-charter candidate only.

1. Open Patch Lab from an approved chain candidate or HumanGate-reviewed candidate.
2. Display target files.
3. Display non-goals.
4. Display allowed actions.
5. Display blocked actions.
6. Display validation plan.
7. Display output routing.
8. Generate task-charter candidate only.
9. Require HumanGate before any Codex prompt or executor task.

Patch Lab must not mutate files. It must not create implementation files, UI prototype files, backend code, frontend code, runtime code, test files, lab outputs, latest.json, run folders, datasets, models, checkpoints, branches, commits, pushes, or pull requests.

Outputs:

- task-charter candidate.
- patch-plan candidate.
- validation-plan candidate.

No flow in Patch Lab produces runtime output.

## 10. Flow: HumanGate Decision

Goal: make one bounded human decision without automatic execution.

1. Review source-state: created, registered, loaded, enforced, evidenced.
2. Review route_check: output routing required, present, destination allowed, and evidence.
3. Review evidence packet by surface.
4. Review red-team objections.
5. Review cost guard.
6. Review exact files.
7. Choose one decision:
   - approve one bounded next step.
   - block.
   - request revision.
   - deny activation.
   - defer.
8. Record one-step boundary and expiry.

Decision rules:

- Approval is bounded to the exact next step only.
- Approval does not authorize hidden mutation, run-all, runtime, tests, CI, agent activation, training, benchmark, dataset/model work, hardware/power/process control, Git action, or claim promotion unless a later separate task explicitly authorizes that exact action.
- Defer and deny activation are valid outcomes.

Outputs:

- HumanGate decision.
- revision request.
- one-step boundary statement.

## 11. Flow: Source Registry Refresh

Goal: expose source-state without auto-promotion.

1. Open Source Registry.
2. Inspect created, registered, loaded, enforced, and evidenced separately.
3. Detect stale, missing, unknown, or unregistered source.
4. Request manual refresh or source readback if needed.
5. Keep source promotion blocked unless a separate HumanGate task authorizes it.

Blocking states:

- Source missing: `Required source is missing. Load or provide source readback before continuing.`
- Source UNKNOWN: `Source state is UNKNOWN. This chain cannot proceed until source readback is evidenced.`
- Stale source: `Source may be stale. Refresh readback before using it as evidence.`

Outputs:

- source-state summary only.
- missing source warning.
- refresh-needed marker.

The Source Registry must not edit the source index, mutate templates, auto-promote roadmap docs, or infer loaded state from memory.

## 12. Flow: Cost / Heat / Energy Review

Goal: inspect passive cost and pressure signals.

1. Open Cost / Heat / Energy screen.
2. Inspect observed or estimated cost.
3. Inspect CPU/GPU pressure, memory pressure, time pressure, validation cost, and runaway-loop risk.
4. Set or confirm the chain cost guard.
5. For high, unknown, or blocked cost, return to HumanGate or Chain Builder for narrowing.

Boundaries:

- no hardware control.
- no power control.
- no process termination.
- no system settings changes.
- no runtime command start.
- no benchmark, training, dataset generation, or model work.

Outputs:

- cost signal display only.
- cost guard warning only.

Cost records are observation-only and not proof, claim validation, benchmark validation, model evidence, or runtime authorization.

## 13. Flow: LLM Link Suggestion

Goal: provide passive language and navigation assistance.

1. User asks for explanation, label, summary, ambiguity scan, or chain draft.
2. LLM Link Layer proposes labels, summaries, options, or a draft chain.
3. UI marks every suggestion as passive.
4. User accepts, edits, or rejects the suggestion.
5. Accepted text becomes a candidate field only.
6. HumanGate remains required for any bounded task, mutation, activation, claim, cost, route change, or Git action.

Boundaries:

- no LLM final authority.
- no mutation.
- no execution.
- no claims.
- no activation.
- no source override.
- no HumanGate bypass.

Outputs:

- suggestion only.
- draft label only.
- summary only.
- ambiguity flag only.

## 14. Flow: Event / Evidence Tray

Goal: show latest passive events and prevent logs from becoming proof by default.

1. View latest readback.
2. View latest validation.
3. View latest blocked action.
4. View latest route check.
5. View latest HumanGate decision.
6. Open linked report, readback, route check, or evidence packet.
7. Treat logs and reports as observation unless promoted by a separate HumanGate record with matching source and evidence.

Outputs:

- event list only.
- report links only.
- passive conflict marker.

Blocked actions:

- treating logs as proof by default.
- hidden runtime execution.
- auto-claiming evidence.
- auto-promoting artifacts.

## 15. Error Flows

| Error flow | Trigger | Displayed message | Allowed next action | Forbidden next action |
| --- | --- | --- | --- | --- |
| source missing | Required source cannot be found. | `Required source is missing. Load or provide source readback before continuing.` | Open Source Registry or provide readback. | Continue as evidenced. |
| output routing missing | File-producing candidate lacks route. | `Output routing is required for file-producing work.` | Open routing panel or request HumanGate route decision. | Create, update, move, rename, archive, delete, or generate a file. |
| unsupported status value | Status outside controlled values appears. | `Unsupported status value. Use IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, or UNKNOWN.` | Correct status value. | Use custom status as canonical. |
| attempted runtime action | UI or candidate implies runtime execution. | `Runtime action is blocked. Runtime authority is NONE.` | Remove action or request separate HumanGate task. | Execute runtime. |
| attempted agent activation | UI or candidate implies agent activation. | `Agent activation is blocked. HumanGate cannot be bypassed.` | Remove action or request separate HumanGate task. | Activate agent. |
| attempted training/benchmark/dataset/model action | Candidate includes training, benchmark, dataset, model, or checkpoint action. | `Training, benchmark, dataset, and model actions are blocked in this UX spec.` | Remove action or defer. | Run or create such assets. |
| attempted Git action | Candidate includes commit, push, branch, or pull request. | `Git commit, push, branch, and pull request actions are blocked.` | Remove action or request separate HumanGate task. | Perform Git action. |
| unknown source state | Source-state cannot be established. | `Source state is UNKNOWN. This chain cannot proceed until source readback is evidenced.` | Load or inspect source. | Treat source as loaded or evidenced. |
| HumanGate missing | Candidate lacks HumanGate requirement. | `HumanGate is required before this next step can be considered.` | Add HumanGate requirement. | Proceed as authorized. |
| route conflict | Route is missing, ambiguous, forbidden, or root-level duplicate risk exists. | `Route conflict: destination is missing, ambiguous, forbidden, or duplicate-prone.` | Revise route or ask HumanGate. | Write to conflicted route. |
| evidence conflict | Evidence and claim do not align. | `Evidence conflict: claim exceeds loaded evidence.` | Open Evidence Board or request revision. | Promote claim. |

## 16. Transition Matrix

| From | Allowed transitions | Blocked transitions |
| --- | --- | --- |
| Ecosystem Map | Zone Inspector, Chain Builder, Evidence Board, Source Registry, Cost / Heat / Energy, Event / Evidence Tray | Runtime execution, mutation, run-all, agent activation |
| Chain Builder | Fragmented audit pipeline, Zone Inspector, Evidence Board, Source Registry, Cost / Heat / Energy, HumanGate when ready_for_humangate | Patch Lab without candidate, runtime execution, file mutation |
| Zone Inspector | Ecosystem Map, Chain Builder, Evidence Board, Source Registry, Patch Lab candidate path when chain is approved, Event / Evidence Tray | Direct mutation, direct activation |
| Evidence Board | Zone Inspector, HumanGate, Source Registry, Event / Evidence Tray, Patch Lab candidate path when approved | Global ready/not-ready, claim promotion |
| Patch Lab | HumanGate, Chain Builder, Evidence Board, Event / Evidence Tray | File mutation, implementation generation, Codex prompt without HumanGate |
| HumanGate | Chain Builder for revision, Patch Lab for candidate refinement, Evidence Board for evidence conflict, Source Registry for source gaps, Event / Evidence Tray for decision trace | Automatic execution, broad authorization, hidden mutation |
| Source Registry | Zone Inspector, Chain Builder, Evidence Board, HumanGate, Event / Evidence Tray | Auto-promotion, source index mutation by this spec |
| Cost / Heat / Energy | Chain Builder, HumanGate, Event / Evidence Tray | Hardware control, power control, process termination |
| LLM Link Layer | Chain Builder, Zone Inspector, Evidence Board, HumanGate as passive suggestion context | Final authority, mutation, execution, activation, claims |
| Event / Evidence Tray | Evidence Board, Zone Inspector, HumanGate, Source Registry | Treating logs as proof, hidden execution |

## 17. Blocking Matrix

| Flow | Blocking condition | Displayed message | Allowed next action | Forbidden next action | Required HumanGate or source-state action |
| --- | --- | --- | --- | --- | --- |
| Observe ecosystem | required source unknown | `Required source state is UNKNOWN; inspect or load source readback before continuing.` | Open Source Registry. | Treat map node as evidenced. | Source readback required. |
| Create chain candidate | missing grammar field | `Required chain field is missing.` | Fill missing field. | Create chain. | None unless route or mutation appears. |
| Create chain candidate | blocked action detected | `This chain contains a blocked action and cannot be created.` | Remove blocked action. | Preview as executable. | HumanGate required for any later bounded exception. |
| Chain incomplete | missing output routing | `Output routing is required before any file-producing task candidate.` | Add route or request route decision. | Produce file. | HumanGate route decision if unclear. |
| Fragmented audit pipeline | hidden activation detected | `Hidden activation risk detected.` | Revise scope. | Continue to execution. | HumanGate may deny activation. |
| Evidence Board review | evidence conflict | `Evidence conflict: claim exceeds loaded evidence.` | Open supporting readback or revise claim. | Promote claim. | HumanGate required for conflict resolution. |
| Patch Lab candidate | no approved chain candidate | `Patch Lab requires an approved chain candidate.` | Return to Chain Builder or HumanGate. | Generate Codex prompt. | HumanGate before Codex prompt. |
| HumanGate decision | exact files missing | `Exact files are required before one bounded next step can be approved.` | Add exact files. | Approve broad scope. | HumanGate reviews corrected packet. |
| Source Registry refresh | source stale | `Source may be stale. Refresh readback before using it as evidence.` | Refresh manually. | Auto-promote source. | Source readback required. |
| Cost / Heat / Energy review | high or unknown cost | `Cost guard requires HumanGate before costly or unknown work.` | Narrow chain or open HumanGate. | Start run, benchmark, or process. | HumanGate required. |
| LLM Link suggestion | suggestion implies authority | `LLM suggestion is passive and cannot authorize action.` | Accept as draft field only. | Execute suggestion. | HumanGate required for bounded task. |
| Event / Evidence Tray | log implies proof | `Logs are observation only unless promoted by HumanGate with evidence.` | Open Evidence Board. | Treat log as proof. | Evidence review required. |

## 18. Outputs By Flow

| Flow | Possible outputs | Runtime output |
| --- | --- | --- |
| Observe ecosystem | no output, selected node context, suggested chain entry point | none |
| Create chain candidate | chain candidate, validation error list | none |
| Chain incomplete | no output, blocker list | none |
| Fragmented audit pipeline | fusion packet, red-team objections, revision request | none |
| Evidence Board review | evidence packet view, unknown list, conflict list | none |
| Patch Lab candidate | task-charter candidate, patch-plan candidate, validation-plan candidate | none |
| HumanGate decision | HumanGate decision, one-step boundary, revision request | none |
| Source Registry refresh | source-state summary, refresh-needed marker | none |
| Cost / Heat / Energy review | cost signal display, cost guard warning | none |
| LLM Link suggestion | passive suggestion, draft label, summary, ambiguity flag | none |
| Event / Evidence Tray | event list, report links, passive conflict marker | none |

No flow produces runtime output. No flow creates lab output, latest.json, run folders, datasets, models, checkpoints, implementation files, tests, commits, pushes, branches, or pull requests.

## 19. Acceptance Criteria

- all primary flows specified.
- all error flows specified.
- transitions specified.
- blocking matrix specified.
- HumanGate appears before mutation.
- Patch Lab is candidate-only.
- LLM Link Layer is passive-only.
- Cost / Heat / Energy is observation-only.
- Source Registry does not auto-promote sources.
- Event / Evidence Tray does not treat logs as proof by default.
- evidence is separated by surface.
- only allowed canonical status values are used in status fields.
- no hidden mutation.
- no run-all.
- no global ready/not-ready.

## 20. Non-Authorization

This specification does not authorize:

- implementation.
- prototype.
- frontend code.
- backend code.
- runtime execution.
- runtime behavior.
- tests.
- CI.
- agent activation.
- training.
- benchmark.
- dataset generation.
- dataset reset.
- latest.json creation.
- lab/runs/RUN_* creation.
- model creation.
- checkpoint creation.
- model or checkpoint promotion.
- hardware control.
- power control.
- process termination.
- system settings changes.
- Chess960 activation.
- DecisionController activation.
- Neural/Search authority change.
- source index mutation.
- template mutation.
- Git commit.
- Git push.
- branch creation.
- pull request creation.
- claims.

Any such action requires a separate explicit HumanGate-approved task with exact scope, route, validation, executor reporting, and non-authorization boundaries.

## 21. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## 22. Verdicts

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

# UxPilote Phase 3 Ecosystem Read-Only Prototype Plan V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Agent activation: BLOCKED
Prototype implementation: BLOCKED
Frontend/backend code: BLOCKED
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

This roadmap replaces the older terrain/kingdom-first metaphor with a cyber-living ecosystem model for future UxPilote planning.

```yaml
title: "UxPilote Phase 3 Ecosystem Read-Only Prototype Plan V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
frontend_backend_code: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation_reset: BLOCKED
model_checkpoint_creation_or_promotion: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
commit_push_branch_pr: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

## 2. Purpose

This document is roadmap-only planning for a future read-only local UxPilote ecosystem prototype.

It converts the human-provided ecosystem UX notes into bounded planning sections classified as `roadmap_docs_only` and `DOCUMENTED_ONLY`.

It does not authorize implementation, frontend code, backend code, runtime behavior, agent activation, data work, model work, tests, CI, Git actions, or claims.

## 3. Source-State Posture

The source-state chain remains separated:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Controlled status posture for this roadmap document:

```yaml
source_state:
  created: DOCUMENTED_ONLY
  registered: PASSIVE
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: DOCUMENTED_ONLY
```

`registered: PASSIVE` means registration is not required by this roadmap task. It is not a promotion signal.

## 4. Ecosystem Model

The Phase 3 mental model is a cyber-living ecosystem:

| Ecosystem role | Planning meaning |
| --- | --- |
| human | water / river / care / intention |
| code | soil / roots / trunks |
| tests | immune system / immunity |
| docs | genetic memory / seeds |
| artifacts | dead leaves / compost / traces |
| runtime | metabolism |
| machine | climate / heat / energy |
| AI | mycelium / pollinators / scouts |
| HumanGate | sovereign gardener |

This model is planning language only. It is not runtime truth, source truth, implementation evidence, or activation authority.

## 5. Human Flow As Water Cycle

Future UxPilote views may represent human flow as a water cycle:

- intention: the source of a bounded task.
- attention: the current flow available for inspection, routing, and decision.
- fatigue: a signal that a chain should narrow, pause, or defer.
- trust: a signal produced by source readback and bounded evidence.
- doubt: a trigger for inspection, red-team review, or refusal.
- validation: evidence that a bounded check completed.
- correction: a proposed change path, not automatic mutation.
- refusal: a valid HumanGate outcome when scope, evidence, route, or authority is unclear.
- care: the human responsibility to avoid unsafe shortcuts.
- HumanGate: the final water lock for mutation, activation, promotion, claims, costly runs, and Git actions.

HumanGate remains final authority.

## 6. Components As Living Organisms

Future read-only UxPilote may display components as organisms without changing their authority:

- files as organisms.
- directories as forests.
- dependencies as roots / mycelium.
- active runtime as living trunk.
- outputs/logs as leaves / traces.
- stale docs as dry branches.
- broken zones as disease.
- unknown zones as fog / unobserved biome.

These labels are UI/navigation aids only. Search, source readback, Git status, and explicit evidence remain factual authority.

## 7. Machine Feedback As Ecosystem Signals

Future UxPilote may display machine feedback as passive ecosystem signals:

- heat.
- energy.
- CPU/GPU cost.
- time cost.
- memory pressure.
- build pressure.
- validation signals.
- error signals.
- drift signals.

Signals are observation only. They do not authorize hardware control, power control, process control, throttling, termination, runtime changes, benchmarks, training, or claims.

## 8. UxPilote Target Views

Future read-only target views:

- Ecosystem Map: read-only orientation across code, docs, tests, artifacts, runtime surfaces, and unknown zones.
- Chain Builder: bounded chain candidate composition using controlled fields.
- Zone Inspector: focused read-only inspection of one zone or subzone.
- Evidence Board: status by surface, evidence, unknowns, blocked actions, and claim posture.
- Patch Lab: task-charter candidate preparation only.
- Cost / Heat / Energy Overlay: passive observation or estimates only.
- HumanGate Garden Panel: final human decision surface for approve, block, revise, or authorize one bounded next step.
- LLM Link Layer: passive labeling, summarization, explanation, and navigation assistance.

## 9. Read-Only Adapters For Future Prototype

Future prototype planning boundary:

| Adapter | Boundary |
| --- | --- |
| file tree adapter | read-only |
| source index adapter | read-only |
| routing policy adapter | read-only |
| Git status adapter | read-only |
| template adapter | read-only |
| evidence adapter | read-only |
| cost telemetry adapter | planning-only, read-only |
| LLM link adapter | passive suggestion only |

Adapters must not write files, patch code, patch tests, run runtime commands, run CI, run training, run benchmarks, generate datasets, create models/checkpoints, activate agents, or perform Git actions.

## 10. UxPilote Chain Integration

Phase 3 planning preserves the Phase 2 record flow:

```text
task_charter_input -> executor_report_output -> analysis_agent_record
uxpilote_chain -> uxpilote_chain_report -> uxpilote_chain_analysis
```

Planned integration:

- `task_charter_input` carries `uxpilote_chain`.
- `executor_report_output` echoes `uxpilote_chain_report`.
- `analysis_agent_record` analyzes `uxpilote_chain_analysis`.
- No autonomous chain execution.
- No agent activation.
- No mutation without a separate explicit HumanGate task.

## 11. LLM Link Layer Boundary

The LLM Link Layer may:

- summarize.
- label.
- suggest.
- explain.
- classify.
- rerank UI/navigation options.

The LLM Link Layer may not:

- decide.
- mutate.
- execute.
- promote.
- activate.
- claim.

Search and repo inspection remain factual authority. HumanGate remains final authority.

## 12. Patch Lab Boundary

Patch Lab generates task-charter candidates only.

It may show:

- target files.
- non-goals.
- allowed actions.
- blocked actions.
- validation.
- output routing.
- HumanGate.

Patch Lab has no mutation authority by default. A generated task-charter candidate is not authorization.

## 13. Cost / Heat / Energy Boundary

A future Cost / Heat / Energy Overlay may display estimated or observed costs only.

It must not throttle hardware, control power, terminate processes, or change system settings.

It must not:

- throttle hardware.
- control power.
- terminate processes.
- change system settings.
- run benchmarks.
- run training.
- start runtime processes.
- alter CPU, GPU, memory, fan, thermal, or power policy.

Any hardware or power control would require a separate security-reviewed HumanGate task with explicit authorization. Cost records are observation, not proof.

## 14. Safety And Blocked Actions

Blocked actions:

- Do not create implementation files.
- Do not edit source index unless strictly required by a separate routed task.
- Do not edit UxPilote spec.
- Do not edit AutoDev templates.
- Do not edit runtime code.
- Do not edit tests.
- Do not run runtime commands.
- Do not run tests or CI.
- Do not run training or benchmarks.
- Do not generate datasets.
- Do not reset datasets.
- Do not create `latest.json`.
- Do not create `lab/runs/RUN_*`.
- Do not create models or checkpoints.
- Do not promote models or checkpoints.
- Do not activate Chess960.
- Do not activate DecisionController.
- Do not change Neural/Search authority.
- Do not activate agents.
- Do not commit.
- Do not push.
- Do not create branches.
- Do not create pull requests.

No runtime. No tests. No training. No benchmark. No dataset/model actions. No agent activation. No Git actions.

## 15. Future Implementation Gate

A later Phase 3 implementation task is BLOCKED until explicit HumanGate authorization.

It would require:

- target files.
- language/framework choice.
- validation plan.
- output routing.
- executor report.
- security boundary.
- non-authorization boundaries.
- explicit blocked actions.
- final status by surface.

This document alone is not authorization.

## 16. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## 17. Verdicts

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

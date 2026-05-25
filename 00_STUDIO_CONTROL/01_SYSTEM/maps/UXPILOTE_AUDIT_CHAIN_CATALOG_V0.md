# UxPilote Audit Chain Catalog V0

Task ID: UXPILOTE_AUDIT_CHAIN_CATALOG_V0

## Status / Non-Authorization

This document is a docs-only catalog candidate for reusable UxPilote audit chains.

It defines which audit chains can be displayed, selected, and prepared by UxPilote. It does not execute audits, modify scripts, modify the dashboard, modify runtime code, modify tests, run `studioctl`, register sources, promote sources, activate agents, create prototypes, run benchmarks, run training, generate datasets, create models, create `latest.json`, create `lab/runs`, or perform Git actions.

```yaml
produced_file_type: uxpilote_audit_chain_catalog
intended_surface: canonical_docs
canonical_destination: C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\UXPILOTE_AUDIT_CHAIN_CATALOG_V0.md
temporary_destination: ""
registration_required: false
project_source_upload_required: false
retention_policy: Docs-only audit chain catalog candidate. Not runtime truth. Not source-promoted.
promotion_gate: HumanGate
catalog_status: DOCUMENTED_ONLY
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

Source-state boundary:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

The existence of this file does not register, load, enforce, evidence, promote, or authorize any audit chain.

## Purpose

The purpose of this catalog is to give the human operator a reusable menu of UxPilote audit chains.

The catalog explains:

- which audit chains exist;
- what each chain is for;
- what each chain reads;
- what packet each chain produces;
- what each chain must not do;
- which dashboard panel should display the chain;
- which HumanGate decision the chain prepares.

This catalog connects existing Studio and UxPilote maps, source docs, audit reports, and future dashboard views so the operator can choose the correct audit path without guessing.

## Audit Chain Principle

UxPilote audit chains are read-only decision-preparation tools.

```text
Audit chains inspect and package context.
Audit chains do not execute, mutate, activate, promote, or decide.
Fusion prepares.
HumanGate decides.
Codex executes only after a separate bounded authorization.
```

Every chain must preserve:

- controlled status values only: `IMPLEMENTED`, `TESTED`, `DOCUMENTED_ONLY`, `PASSIVE`, `BLOCKED`, `NOT_FOUND`, `UNKNOWN`;
- controlled canonical surfaces only: `active_runtime_code`, `tests`, `artifacts_runtime_outputs`, `canonical_docs`, `roadmap_docs_only`, `inference`;
- source-state separation: `created != registered`, `registered != loaded`, `loaded != enforced`, `enforced != evidenced`;
- claim posture: `NO_CLAIM_ALLOWED`;
- no global ready or not-ready verdict.

## Chain Catalog Overview

| Chain ID | Label | Primary purpose | Primary surface | Status | UX target |
| --- | --- | --- | --- | --- | --- |
| `system_truth_chain` | System Truth Chain | Separate real, documented, inferred, unknown, and blocked state. | canonical_docs | DOCUMENTED_ONLY | Preuves & affirmations; Cartes systemes / Vue Preuves |
| `scripts_route_chain` | Scripts Route Chain | Inspect `scripts/studioV2`, `scripts/control_plane`, `operator`, and `uxpilote` path drift. | canonical_docs | DOCUMENTED_ONLY | Chemins casses / chemins candidats; Scripts Control |
| `fusion_matrix_chain` | Fusion Matrix Chain | Merge Cartographer, HygieneAgent, TruthAgent, and RedTeam signals before HumanGate. | canonical_docs | DOCUMENTED_ONLY | Fusion Matrix; A faire maintenant |
| `humangate_queue_chain` | HumanGate Queue Chain | Convert unresolved risks and source-state gaps into explicit decisions. | roadmap_docs_only | DOCUMENTED_ONLY | A faire maintenant; HumanGate Queue |
| `tool_catalog_chain` | Tool Catalog Chain | List safe control tools and what each does without executing them. | canonical_docs | DOCUMENTED_ONLY | Outils de controle disponibles |
| `llm_lora_guard_chain` | LLM / LoRA Guard Chain | Show future LLM/LoRA support posture while blocking training and dataset generation. | inference | DOCUMENTED_ONLY | LLM / LoRA panel |
| `runtime_guard_chain` | Runtime Guard Chain | Prevent hidden runtime activation and forbidden output creation. | active_runtime_code | DOCUMENTED_ONLY | Blocages critiques; Commandes bloquees |

## Chain Input / Output Model

Each chain entry must use this model:

```yaml
chain:
  id: ""
  label: ""
  purpose: ""
  authority: "read_only|docs_only|patch_proposal|runtime_locked"
  primary_surface: ""
  reads:
    - path_or_command: ""
      source_state_required: true
  produces:
    - artifact_type: ""
      surface: ""
      canonical: false
  ux_targets: []
  blocked_actions: []
  humangate_question: ""
  status: ""
```

Chain input rules:

- `reads` may name source files or already-approved read-only commands.
- A command named in `reads` is a display contract, not execution authorization by this catalog.
- If a required source is absent, stale, unregistered, or not loaded for the active task, the chain must display `UNKNOWN` or `BLOCKED`, not infer truth.

Chain output rules:

- Chain outputs are packets for display and HumanGate review.
- Chain outputs are not canonical by default.
- Chain outputs cannot become proof, source truth, or runtime authority by existing.

## Chain To UX Panel Mapping

| UX panel | Chains displayed | Display fields |
| --- | --- | --- |
| `Cartes systemes / Vue Preuves` | System Truth Chain | source status, evidence limits, claim posture, no-global-ready boundary |
| `Preuves & affirmations` | System Truth Chain, Runtime Guard Chain | proved, observed, not proved / claim blocked |
| `Chemins casses / chemins candidats` | Scripts Route Chain | old path, candidate path, status, HumanGate route question |
| `Scripts Control` | Scripts Route Chain, Tool Catalog Chain | family, status, surface, risk, paths, `Sert a`, `Effet` |
| `Fusion Matrix` | Fusion Matrix Chain | Cartographer, HygieneAgent, TruthAgent, FusionAuditor, RedTeam, HumanGate rows |
| `A faire maintenant` | Fusion Matrix Chain, HumanGate Queue Chain | top decision cards, status/evidence, why it matters, allowed decisions |
| `HumanGate Queue` | HumanGate Queue Chain | decision category, default status, evidence, risk, blocked actions |
| `Outils de controle disponibles` | Tool Catalog Chain, Runtime Guard Chain | `Sert a`, `Lit`, `Produit`, `Risque`, `HumanGate requis`, `Statut` |
| `LLM / LoRA panel` | LLM / LoRA Guard Chain | training blocked, dataset generation blocked, checkpoint/model promotion blocked, support passive |
| `Blocages critiques` | Runtime Guard Chain | blocked action class, reason, risk if launched, required authorization |
| `Commandes bloquees` | Runtime Guard Chain, Scripts Route Chain | runner class, status, reason, risk, HumanGate requirement |

The dashboard must not execute chains directly. It may display chain cards and prepared packets only.

## Chain To Source Mapping

| Source | Used by chains | Role |
| --- | --- | --- |
| `AGENTS.md` | System Truth Chain, Runtime Guard Chain, LLM / LoRA Guard Chain | Repository doctrine, verdict separation, blocked actions, claim posture |
| `MASTER_DOCS/DOCS_STATUS.md` | System Truth Chain, LLM / LoRA Guard Chain | Documentation state, drift warnings, runtime activation boundaries |
| `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | System Truth Chain, Runtime Guard Chain | Source-state separation and anchoring |
| `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | System Truth Chain, Runtime Guard Chain | Output routes, forbidden destinations, surface separation |
| `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | System Truth Chain, Fusion Matrix Chain, Runtime Guard Chain | Controlled vocabulary, record model, locked actions |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` | Fusion Matrix Chain, Runtime Guard Chain | Chain grammar and fragmented audit pipeline |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md` | System Truth Chain, Runtime Guard Chain | UxPilote map model, blocked interactions, authority graph |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_READONLY_DATA_CONTRACT_V0.md` | System Truth Chain, Scripts Route Chain, Tool Catalog Chain | Read-only JSON source contract and dashboard panel schema |
| `00_STUDIO_CONTROL/01_MAPS/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md` | Scripts Route Chain | Scripts route posture, path drift, blocked runner policy |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md` | Fusion Matrix Chain | Matrix rows, contradictions, RedTeam, HumanGate payload |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_HUMANGATE_QUEUE_SPEC_V0.md` | HumanGate Queue Chain | Decision item schema and pending HumanGate categories |
| `docs/studioV2/STUDIOCTL_USAGE_V0.md` | Tool Catalog Chain | Read-only `studioctl` command meanings and non-claims |
| `scripts/uxpilote/README.md` | Tool Catalog Chain, Scripts Route Chain | Current read-only dashboard display contract, candidate-only status |
| `00_STUDIO_CONTROL/05_STATUS/SEARCH_003_AUTHORITY_TRACE_SCOPE_CHARTER_V0.yaml` | Runtime Guard Chain | Search authority trace scope, if present |
| `00_STUDIO_CONTROL/05_STATUS/HUMANGATE_DECISION_SEARCH_003_AUTHORITY_TRACE_PATCH_V0.yaml` | Runtime Guard Chain, HumanGate Queue Chain | HumanGate decision record candidate, if present |

## System Truth Chain

```yaml
chain:
  id: "system_truth_chain"
  label: "System Truth Chain"
  purpose: "Determine what is real, documented, inferred, unknown, or blocked."
  authority: "read_only"
  primary_surface: "canonical_docs"
  reads:
    - path_or_command: "MASTER_DOCS/DOCS_STATUS.md"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md"
      source_state_required: true
    - path_or_command: "python scripts/studioV2/studioctl.py status --json"
      source_state_required: true
    - path_or_command: "python scripts/studioV2/studioctl.py evidence board --json"
      source_state_required: true
    - path_or_command: "python scripts/studioV2/studioctl.py surface map --json"
      source_state_required: true
  produces:
    - artifact_type: "truth_packet"
      surface: "canonical_docs"
      canonical: false
  ux_targets:
    - "Preuves & affirmations"
    - "Cartes systemes / Vue Preuves"
  blocked_actions:
    - "claim_validation"
    - "source_promotion"
    - "runtime_activation"
    - "benchmark_as_proof"
  humangate_question: "Which observations are sufficient to prepare a bounded next decision, and which claims remain blocked?"
  status: "DOCUMENTED_ONLY"
```

The truth packet should classify:

- known readbacks;
- observed reports or logs;
- missing or stale sources;
- source-state gaps;
- blocked claims;
- component-level `software_verdict`, `evidence_verdict`, and `claim_verdict`.

It must not convert reports, logs, benchmark output, dashboard output, or command output into proof of activation.

## Scripts Route Chain

```yaml
chain:
  id: "scripts_route_chain"
  label: "Scripts Route Chain"
  purpose: "Resolve scripts/studioV2, scripts/control_plane, operator, and uxpilote path drift."
  authority: "read_only"
  primary_surface: "canonical_docs"
  reads:
    - path_or_command: "00_STUDIO_CONTROL/01_MAPS/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md"
      source_state_required: true
    - path_or_command: "python scripts/studioV2/studioctl.py uxpilote scripts-control --json"
      source_state_required: true
  produces:
    - artifact_type: "route_alignment_packet"
      surface: "canonical_docs"
      canonical: false
  ux_targets:
    - "Chemins casses / chemins candidats"
    - "Scripts Control"
  blocked_actions:
    - "script_execution"
    - "silent_path_substitution"
    - "file_move_or_rename"
    - "CI_mutation"
    - "CODEOWNERS_mutation"
    - "shim_creation"
  humangate_question: "Which scripts path is source truth, and what remains UNKNOWN until HumanGate decides?"
  status: "DOCUMENTED_ONLY"
```

The route alignment packet should display:

- root path;
- candidate `scripts/studioV2` path;
- existence status;
- route role;
- blocked runner classes;
- `scripts/uxpilote` as `UNKNOWN` / candidate-only until HumanGate registration decision.

It must not rewrite docs, CI, CODEOWNERS, or paths.

## Fusion Matrix Chain

```yaml
chain:
  id: "fusion_matrix_chain"
  label: "Fusion Matrix Chain"
  purpose: "Merge Cartographer, HygieneAgent, TruthAgent, and RedTeam signals before HumanGate."
  authority: "read_only"
  primary_surface: "canonical_docs"
  reads:
    - path_or_command: "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md"
      source_state_required: true
  produces:
    - artifact_type: "fusion_packet"
      surface: "canonical_docs"
      canonical: false
  ux_targets:
    - "Fusion Matrix"
    - "A faire maintenant"
  blocked_actions:
    - "approve_execution"
    - "mutate_files"
    - "activate_runtime"
    - "approve_claims"
    - "replace_HumanGate"
  humangate_question: "Should HumanGate approve one bounded next step, block, or request revision?"
  status: "DOCUMENTED_ONLY"
```

The fusion packet should preserve the pipeline order:

```text
Chain Candidate -> Cartographer -> HygieneAgent -> TruthAgent -> FusionAuditor -> CartographerRedTeam -> HumanGate
```

FusionAuditor may synthesize. CartographerRedTeam may object. HumanGate remains the only decision authority.

## HumanGate Queue Chain

```yaml
chain:
  id: "humangate_queue_chain"
  label: "HumanGate Queue Chain"
  purpose: "Convert unresolved risks and source-state gaps into explicit decisions."
  authority: "read_only"
  primary_surface: "roadmap_docs_only"
  reads:
    - path_or_command: "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_HUMANGATE_QUEUE_SPEC_V0.md"
      source_state_required: true
    - path_or_command: "fusion_packet"
      source_state_required: true
  produces:
    - artifact_type: "humangate_decision_queue"
      surface: "roadmap_docs_only"
      canonical: false
  ux_targets:
    - "A faire maintenant"
    - "HumanGate Queue"
  blocked_actions:
    - "make_decision"
    - "record_actual_decision"
    - "execute_decision"
    - "mutate_files"
    - "trigger_tools"
  humangate_question: "Which pending decision should be selected by the human, deferred, blocked, or returned for revision?"
  status: "DOCUMENTED_ONLY"
```

The decision queue should surface:

- source registration decisions;
- route authority decisions;
- prototype authorization decisions;
- blocked runner visibility decisions;
- LLM/LoRA future-charter decisions;
- Git action requests as `BLOCKED`.

The queue displays pending decisions. It does not make or record actual decisions.

## Tool Catalog Chain

```yaml
chain:
  id: "tool_catalog_chain"
  label: "Tool Catalog Chain"
  purpose: "List which control tools can be launched safely and what each one does."
  authority: "read_only"
  primary_surface: "canonical_docs"
  reads:
    - path_or_command: "docs/studioV2/STUDIOCTL_USAGE_V0.md"
      source_state_required: true
    - path_or_command: "studioctl command outputs"
      source_state_required: true
  produces:
    - artifact_type: "tool_catalog_packet"
      surface: "canonical_docs"
      canonical: false
  ux_targets:
    - "Outils de controle disponibles"
  blocked_actions:
    - "execute_tool_from_dashboard"
    - "run_unknown_script"
    - "create_logs"
    - "mutate_files"
    - "claim_tool_output_as_proof"
  humangate_question: "Which tool card is safe to inspect, and which action still requires a separate HumanGate task?"
  status: "DOCUMENTED_ONLY"
```

The dashboard should later show each chain/tool card with:

- `Sert a`;
- `Lit`;
- `Produit`;
- `Risque`;
- `HumanGate requis`;
- `Statut`.

The dashboard must not execute these chains directly.

## LLM / LoRA Guard Chain

```yaml
chain:
  id: "llm_lora_guard_chain"
  label: "LLM / LoRA Guard Chain"
  purpose: "Show future LLM/LoRA support status without allowing training or dataset generation."
  authority: "runtime_locked"
  primary_surface: "inference"
  reads:
    - path_or_command: "AGENTS.md"
      source_state_required: true
    - path_or_command: "MASTER_DOCS/DOCS_STATUS.md"
      source_state_required: true
    - path_or_command: "docs/status/audit files if present"
      source_state_required: true
  produces:
    - artifact_type: "inference_readiness_blocked_packet"
      surface: "inference"
      canonical: false
  ux_targets:
    - "LLM / LoRA panel"
  blocked_actions:
    - "training"
    - "dataset_generation_reset"
    - "model_checkpoint_creation_promotion"
    - "LLM_final_authority"
    - "claim_model_quality"
  humangate_question: "Should a future LLM/LoRA charter remain blocked, be revised, or be approved as docs-only planning?"
  status: "DOCUMENTED_ONLY"
```

Default display:

| Item | Status |
| --- | --- |
| Entrainement | BLOCKED |
| Dataset generation/reset | BLOCKED |
| Checkpoints/model promotion | BLOCKED |
| LLM support | PASSIVE |

The chain must not generate datasets, train, create checkpoints, promote models, or claim model capability.

## Runtime Guard Chain

```yaml
chain:
  id: "runtime_guard_chain"
  label: "Runtime Guard Chain"
  purpose: "Prevent hidden activation of runtime, DecisionController, Chess960, benchmark, latest.json, lab/runs, and model promotion."
  authority: "runtime_locked"
  primary_surface: "active_runtime_code"
  reads:
    - path_or_command: "AGENTS.md"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/05_STATUS/SEARCH_003_AUTHORITY_TRACE_SCOPE_CHARTER_V0.yaml if present"
      source_state_required: true
    - path_or_command: "00_STUDIO_CONTROL/05_STATUS/HUMANGATE_DECISION_SEARCH_003_AUTHORITY_TRACE_PATCH_V0.yaml if present"
      source_state_required: true
  produces:
    - artifact_type: "blocked_action_packet"
      surface: "active_runtime_code"
      canonical: false
  ux_targets:
    - "Blocages critiques"
    - "Commandes bloquees"
  blocked_actions:
    - "runtime_activation"
    - "DecisionController_activation"
    - "Chess960_activation"
    - "benchmark"
    - "gameplay_execution"
    - "latest_json_creation"
    - "lab_runs_creation"
    - "model_checkpoint_creation_promotion"
    - "commit_push_branch_PR"
  humangate_question: "Which blocked action remains locked, and what explicit HumanGate authorization would be required before any future task?"
  status: "DOCUMENTED_ONLY"
```

The blocked action packet should explain:

- why each action is blocked;
- the risk if launched without a bounded task;
- the required HumanGate authorization;
- whether the item is runtime, test, artifact, docs, roadmap, or inference related.

## Chain Output Schema

Every chain output packet should use this shape:

```yaml
chain_output:
  schema_version: "uxpilote_chain_output.v0"
  chain_id: ""
  generated_by: "display_only_chain"
  generated_from:
    - path_or_command: ""
      source_state:
        created: UNKNOWN
        registered: UNKNOWN
        loaded: UNKNOWN
        enforced: UNKNOWN
        evidenced: UNKNOWN
  authority: "read_only|docs_only|patch_proposal|runtime_locked"
  primary_surface: ""
  status: ""
  evidence:
    observations: []
    limits: []
    missing_sources: []
  route:
    output_route_required: true
    destination_allowed: UNKNOWN
    duplicate_risk: UNKNOWN
  source_state_gaps: []
  blocked_actions: []
  claims:
    claim_posture: NO_CLAIM_ALLOWED
    blocked_claims: []
  humangate:
    question: ""
    allowed_decisions:
      - approve_one_bounded_step
      - block
      - request_revision
      - defer
      - register_candidate
      - freeze_candidate
      - discard_candidate
    decision_made_by_chain: false
  no_global_ready_verdict: true
```

Packets are display and decision-preparation artifacts only. They are not canonical by default and do not authorize mutation.

## Dashboard Integration Plan

The dashboard should later show these audit chains as `Outils de controle disponibles`.

Each chain card should display:

| Field | Meaning |
| --- | --- |
| `Sert a` | Human-readable purpose of the chain. |
| `Lit` | Source files or read-only command outputs used as inputs. |
| `Produit` | Packet type prepared for display. |
| `Risque` | Main risk if the chain is misunderstood as authority. |
| `HumanGate requis` | Whether a later decision is required before mutation or execution. |
| `Statut` | Controlled status value. |

Dashboard integration rules:

- Chain cards may be rendered as cards, tabs, or detail panels.
- Chain cards must not be clickable execution controls.
- The dashboard may show chain outputs only after a separate read-only source provides them.
- If a chain source is missing, stale, or not loaded, show `UNKNOWN` or `NOT_FOUND`.
- If a chain implies mutation, activation, or claim authority, show `BLOCKED`.

## HumanGate Decisions Prepared

| Decision | Prepared by chain | Default status | Decision owner |
| --- | --- | --- | --- |
| Decide whether observations are sufficient for a bounded next task. | System Truth Chain | UNKNOWN | HumanGate |
| Decide whether `scripts/studioV2/**` is the registered scripts implementation lane. | Scripts Route Chain | UNKNOWN | HumanGate |
| Decide whether `scripts/control_plane/*` remains compatibility-only, becomes a candidate, or stays unresolved. | Scripts Route Chain | UNKNOWN | HumanGate |
| Decide whether `scripts/operator/*` aligns to `scripts/studioV2/operator/*` or remains blocked. | Scripts Route Chain | UNKNOWN | HumanGate |
| Decide whether `scripts/uxpilote/*` should be registered, frozen, discarded, revised, or kept candidate-only. | Scripts Route Chain, HumanGate Queue Chain | UNKNOWN | HumanGate |
| Decide whether CI/CODEOWNERS alignment can be proposed later. | Scripts Route Chain, HumanGate Queue Chain | BLOCKED | HumanGate |
| Decide whether a fusion packet supports approve-one-step, block, or request-revision. | Fusion Matrix Chain | UNKNOWN | HumanGate |
| Decide whether future LLM/LoRA planning is allowed as docs-only. | LLM / LoRA Guard Chain | BLOCKED | HumanGate |
| Decide whether any runtime/test patch may proceed under a separate bounded task. | Runtime Guard Chain | BLOCKED | HumanGate |
| Decide whether any Git action is allowed. | Runtime Guard Chain, HumanGate Queue Chain | BLOCKED | HumanGate |

No decision is made by this catalog.

## Blocked Actions

The catalog and all chains block:

```yaml
blocked_actions:
  audit_execution: BLOCKED
  runtime_implementation: BLOCKED
  prototype_modification: BLOCKED
  prototype_execution: BLOCKED
  script_modification: BLOCKED
  script_execution: BLOCKED
  src_modification: BLOCKED
  test_modification: BLOCKED
  CI_or_CODEOWNERS_modification: BLOCKED
  registry_or_source_index_modification: BLOCKED
  ROADMAP_INDEX_modification: BLOCKED
  source_registration: BLOCKED
  source_promotion: BLOCKED
  runtime_activation: BLOCKED
  DecisionController_activation: BLOCKED
  Chess960_activation: BLOCKED
  benchmark: BLOCKED
  gameplay_execution: BLOCKED
  training: BLOCKED
  dataset_generation_reset: BLOCKED
  model_checkpoint_creation_promotion: BLOCKED
  lab_runs_creation: BLOCKED
  latest_json_creation: BLOCKED
  cache_cleanup: BLOCKED
  file_delete_move_rename_archive: BLOCKED
  git_add_commit_push_branch_PR: BLOCKED
  readiness_strength_Elo_benchmark_scientific_model_claims: BLOCKED
```

## Future Patch Queue

Future work remains HumanGate-gated:

| Future patch candidate | Surface | Status | Gate |
| --- | --- | --- | --- |
| Add audit-chain cards to the static dashboard. | artifacts_runtime_outputs | DOCUMENTED_ONLY | HumanGate scoped UI patch |
| Add read-only chain output packets to a future `studioctl` JSON command. | artifacts_runtime_outputs | BLOCKED | HumanGate tooling task |
| Add chain schema validation without execution. | tests | BLOCKED | HumanGate test task |
| Add docs-only chain examples for SEARCH-003 or scripts routing. | canonical_docs | DOCUMENTED_ONLY | HumanGate docs task |
| Register this catalog in a source index or upload checklist. | canonical_docs | BLOCKED | HumanGate source-registration task |
| Align CI/CODEOWNERS path references. | canonical_docs | BLOCKED | HumanGate route-authority task |
| Prepare LLM/LoRA docs-only charter. | inference | BLOCKED | HumanGate inference-planning task |

This catalog does not authorize any future patch by itself.

## Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
```

## Software / Evidence / Claim Verdicts

```yaml
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_verdict: NO_CLAIM_ALLOWED
```

## No Global Ready Verdict

```yaml
no_global_ready_verdict: true
```

This catalog intentionally gives no global ready or not-ready verdict. It is a docs-only chain catalog candidate. It preserves component-level status, source-state gaps, blocked actions, and HumanGate decisions separately.

# UxPilote Readonly Prototype Preflight V0

Task ID: UXPILOTE_READONLY_PROTOTYPE_PREFLIGHT_V0

## Status / Non-Authorization

This file is a docs-only preflight for a future UxPilote read-only prototype. It prepares HumanGate questions and minimum verification requirements before any prototype is authorized.

```yaml
produced_file_type: uxpilote_readonly_prototype_preflight
intended_surface: roadmap_docs_only
canonical_destination: C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\10_ROADMAP\UXPILOTE_READONLY_PROTOTYPE_PREFLIGHT_V0.md
temporary_destination: ""
registration_required: false
project_source_upload_required: false
retention_policy: Docs-only prototype preflight. Not implementation authority.
promotion_gate: HumanGate
preflight_status: DOCUMENTED_ONLY
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

Non-authorization:

- This preflight does not implement, execute, launch, run, or create any app.
- This preflight does not authorize terminal/TUI, static HTML, Python viewer, Godot, frontend, server, runtime, gameplay, benchmark, training, dataset, model, checkpoint, lab, latest.json, or Git work.
- This preflight does not modify scripts, source code, tests, CI, CODEOWNERS, MASTER_DOCS, registries, source indexes, ROADMAP_INDEX, or existing UxPilote specs.
- This preflight does not register, promote, approve, freeze, discard, or activate `scripts/uxpilote` or any other candidate source.
- Existing generated cache folders, including `__pycache__`, remain `PASSIVE` artifacts unless a later HumanGate cleanup task explicitly authorizes action.

## Purpose

The purpose is to define what must be verified before a future UxPilote read-only prototype can be authorized.

This document compares candidate prototype forms:

- terminal/TUI
- static HTML
- Python local viewer
- Godot read-only prototype

It also defines required data sources, required views, read-only proof requirements, forbidden paths, blocked prototype behavior, and HumanGate questions. It is not a prototype and is not implementation authority.

## Prototype Preflight Principle

The prototype preflight decides verification requirements, not implementation permission.

```yaml
prototype_preflight_principle:
  decides_prototype_form: false
  authorizes_prototype: false
  executes_prototype: false
  creates_application_files: false
  mutates_repo: false
  reads_existing_specs: true
  prepares_humangate_decision: true
  no_global_ready_verdict: true
```

A future prototype task must start from a new HumanGate decision that names:

- the allowed prototype form
- exact files allowed for readback
- whether any output file may be created
- exact validation commands
- blocked actions that remain blocked

## Candidate Prototype Forms

| Candidate form | Read-only fit | Main risk | Preflight status |
| --- | --- | --- | --- |
| terminal/TUI | Highest fit for first step. It can render existing JSON to stdout or a terminal surface without browser, server, Godot, or graphics runtime. | Still requires executing a viewer command in a later task and proving no writes. | DOCUMENTED_ONLY |
| static HTML | Good fit if HumanGate authorizes one static file and no server. It can show fixed panels and local JSON snapshots only if output creation is explicitly allowed. | Creating an HTML file is an output; browser execution or live adapters can blur the read-only boundary. | DOCUMENTED_ONLY |
| Python local viewer | Medium fit because it can parse JSON and render locally, but it is executable Python and must prove no writes, no cache generation, and no subprocess behavior beyond approved reads. | Python execution can create caches, call scripts, or expand scope unless tightly bounded. | DOCUMENTED_ONLY |
| Godot read-only prototype | Lowest fit for first step. Existing garden material is candidate-only and can create editor/cache state or imply prototype authority. | Godot import/run/editor behavior and visual prototype drift are high-risk before HumanGate. | BLOCKED |

## Recommended First Prototype Form

Recommended lowest-risk first form:

```yaml
recommended_first_prototype_form:
  form: terminal/TUI
  status: DOCUMENTED_ONLY
  reason: It has the smallest surface area for a first read-only display because it can consume approved JSON data and render statuses, HumanGate questions, and blocked actions without Godot, frontend server, static app artifacts, or runtime integration.
  authorization_required: HumanGate
  writes_allowed_by_default: false
```

The recommendation is not approval. It only identifies the safest candidate to ask HumanGate about first.

Static HTML is the second candidate only if HumanGate explicitly allows creation or update of one routed static file and defines whether it may embed JSON snapshots. Python local viewer and Godot should remain behind stricter proof requirements.

## Required Read-Only Data Sources

A future read-only prototype must use only approved `studioctl` JSON output sources unless HumanGate expands the source list.

```yaml
required_read_only_data_sources:
  status:
    command: python scripts\studioV2\studioctl.py status --json
    expected_mutation: false
    status: DOCUMENTED_ONLY
  evidence_board:
    command: python scripts\studioV2\studioctl.py evidence board --json
    expected_mutation: false
    status: DOCUMENTED_ONLY
  surface_map:
    command: python scripts\studioV2\studioctl.py surface map --json
    expected_mutation: false
    status: DOCUMENTED_ONLY
  scripts_control:
    command: python scripts\studioV2\studioctl.py uxpilote scripts-control --json
    expected_mutation: false
    status: DOCUMENTED_ONLY
```

These commands are data-source candidates only. Their presence does not prove schema permanence, source promotion, runtime authority, or claim validity.

## Required Views

A future prototype must display at least these views as read-only panels:

| View | Required source intent | Prototype authority |
| --- | --- | --- |
| Studio Control Map | Workspace status, surface status, source-state and route posture. | display_only |
| Evidence / Claims Map | Evidence board, claim posture, blocked claims, no global ready verdict. | display_only |
| Scripts Control View | Script families, path drift, blocked runners, `scripts/uxpilote` decision boundary. | display_only |
| Fusion Matrix | Fragmented audit synthesis, RedTeam objections, HumanGate input. | display_only |
| HumanGate Queue | Pending decisions before mutation, activation, promotion, cleanup, prototype, training, or Git action. | display_only |

## Read-Only Proof Requirements

Minimum proof required before HumanGate can authorize a future prototype task:

```yaml
read_only_proof_requirements:
  no_file_writes: BLOCKED
  no_cache_cleanup: BLOCKED
  no_lab_runs: BLOCKED
  no_latest_json: BLOCKED
  no_datasets: BLOCKED
  no_models_or_checkpoints: BLOCKED
  no_prototype_execution_unless_separately_authorized: BLOCKED
  no_secret_reads: BLOCKED
  no_runtime_or_gameplay_execution: BLOCKED
  no_git_actions: BLOCKED
```

Required verification posture:

- The prototype must document exactly which existing files and commands it reads.
- The prototype must prove it writes nothing by default.
- The prototype must show generated cache artifacts as `PASSIVE`, not delete them without HumanGate.
- The prototype must not create `lab/runs`, `latest.json`, datasets, models, checkpoints, or reports unless a later HumanGate task explicitly routes an output file.
- The prototype must not use runtime, gameplay, benchmark, training, frontend, Godot, or Git execution as proof of read-only behavior.

## Forbidden Paths

A future prototype must not write to, generate inside, scan deeply, or treat these paths as prototype output destinations:

```yaml
forbidden_paths:
  - src
  - tests
  - lab
  - datasets
  - models
  - checkpoints
  - secrets
  - latest.json
  - .github
  - runtime source directories
```

Path rules:

- `secrets` must never expose secret values.
- `lab`, datasets, models, checkpoints, and `latest.json` must remain blocked for creation or promotion.
- `.github`, CI, CODEOWNERS, registries, source indexes, and ROADMAP_INDEX must not be changed by a prototype task.
- Runtime source directories must not be touched by a prototype task.

## Allowed Later Prototype Behavior

Only a later HumanGate-authorized prototype task may allow these behaviors:

```yaml
allowed_later_prototype_behavior:
  read_json: DOCUMENTED_ONLY
  render_local_view: DOCUMENTED_ONLY
  display_statuses: DOCUMENTED_ONLY
  display_humangate_questions: DOCUMENTED_ONLY
  display_blocked_actions: DOCUMENTED_ONLY
  write_nothing_by_default: DOCUMENTED_ONLY
```

Allowed behavior must remain passive display. It cannot execute scripts beyond explicitly approved read-only data commands, cannot mutate files, and cannot claim implementation readiness.

## Blocked Prototype Behavior

Blocked behavior for this preflight and for any future prototype unless HumanGate explicitly authorizes otherwise:

```yaml
blocked_prototype_behavior:
  execute_scripts: BLOCKED
  run_cargo: BLOCKED
  run_Godot: BLOCKED
  run_frontend_server: BLOCKED
  run_benchmark: BLOCKED
  train: BLOCKED
  generate_datasets: BLOCKED
  create_models_or_checkpoints: BLOCKED
  create_lab_runs: BLOCKED
  create_latest_json: BLOCKED
  commit_push_branch_PR: BLOCKED
  inspect_secrets: BLOCKED
  activate_agents: BLOCKED
  register_or_promote_sources: BLOCKED
```

## HumanGate Questions Before Prototype

HumanGate must answer these questions before any prototype is authorized:

```yaml
humangate_questions_before_prototype:
  - question: Which prototype form is allowed?
    default_status: UNKNOWN
  - question: Which files may be read?
    default_status: UNKNOWN
  - question: Is scripts/uxpilote registered, frozen, discarded, or ignored?
    default_status: UNKNOWN
  - question: Are cache artifacts allowed to remain passive?
    default_status: UNKNOWN
  - question: Is any output file allowed?
    default_status: UNKNOWN
  - question: What validation proves read-only?
    default_status: UNKNOWN
```

Recommended default until answered:

```yaml
recommended_default:
  decision: defer
  status: UNKNOWN
  reason: Prototype authorization requires exact read paths, output policy, validation plan, and scripts/uxpilote posture.
```

## Validation Plan For Future Prototype

A future prototype task should include a validation plan before any implementation begins:

```yaml
future_validation_plan:
  preflight:
    - git status --short --branch
    - git rev-parse HEAD
    - Test-Path for every intended read source
    - Test-Path for every intended output target, if any
  read_only_data_validation:
    - python scripts\studioV2\studioctl.py status --json
    - python scripts\studioV2\studioctl.py evidence board --json
    - python scripts\studioV2\studioctl.py surface map --json
    - python scripts\studioV2\studioctl.py uxpilote scripts-control --json
  mutation_validation:
    - git diff --check
    - git diff --name-only
    - explicit report of any generated cache artifacts as PASSIVE
  blocked_validation:
    - no Godot
    - no frontend server
    - no cargo
    - no tests unless separately authorized
    - no benchmark
    - no training
    - no datasets
    - no models
    - no lab/runs
    - no latest.json
    - no Git action
```

If a future prototype form can generate cache artifacts, HumanGate must decide whether that form is allowed and whether those artifacts remain passive or require a separate cleanup charter.

## Cache Artifact Policy

```yaml
cache_artifact_policy:
  generated_cache_folders: PASSIVE
  pycache: PASSIVE
  pyc_files: PASSIVE
  cleanup_by_default: BLOCKED
  cleanup_requires: HumanGate
```

Do not delete `__pycache__` or generated cache folders as part of prototype preflight or validation. Treat them as passive artifacts unless an explicit cleanup task is authorized by HumanGate.

## scripts/uxpilote Decision Boundary

`scripts/uxpilote` exists as candidate material, but it is not source authority by existence.

```yaml
scripts_uxpilote_decision_boundary:
  path: scripts/uxpilote
  status: UNKNOWN
  route_role: candidate_only
  registered: UNKNOWN
  loaded: UNKNOWN
  enforced: UNKNOWN
  evidenced: UNKNOWN
  execution_authority: BLOCKED
  prototype_authority: BLOCKED
  humangate_required_for:
    - register_candidate
    - freeze_candidate
    - discard_candidate
    - ignore_candidate
    - execute_or_validate_candidate
```

The presence of `scripts/uxpilote/README.md` or `scripts/uxpilote/uxpilote_readonly.py` must be displayed as candidate context only. A future prototype task must not execute `scripts/uxpilote` unless HumanGate explicitly authorizes that exact command and validation boundary.

## Godot Candidate Boundary

The Godot garden candidate remains candidate-only and high-risk for a first read-only prototype.

```yaml
godot_candidate_boundary:
  path: 00_STUDIO_CONTROL\10_ROADMAP\UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY
  status: UNKNOWN
  use_as_visual_reference: DOCUMENTED_ONLY
  run_or_import: BLOCKED
  editor_cache_creation: BLOCKED
  prototype_authority: BLOCKED
  humangate_required: true
```

Godot material may inform visual language only. It must not be treated as live data, source truth, implementation proof, visual-quality proof, runtime proof, or authorization to run Godot.

## Future Patch Queue

Allowed future patch classes after HumanGate review:

```yaml
future_patch_queue:
  terminal_TUI_charter:
    status: DOCUMENTED_ONLY
    requirement: HumanGate chooses terminal/TUI and exact read-only validation.
  static_HTML_charter:
    status: DOCUMENTED_ONLY
    requirement: HumanGate allows a routed output file and no server.
  Python_local_viewer_charter:
    status: DOCUMENTED_ONLY
    requirement: HumanGate allows Python execution and cache artifact posture.
  Godot_read_only_charter:
    status: BLOCKED
    requirement: HumanGate explicitly allows Godot import/run validation.
  scripts_uxpilote_registration_decision:
    status: UNKNOWN
    requirement: HumanGate decides register, freeze, discard, or ignore.
```

Blocked future patch classes unless HumanGate explicitly authorizes:

- prototype implementation
- prototype execution
- Godot import or run
- frontend server
- script execution outside approved read-only data commands
- cache cleanup
- file move, rename, delete, archive, or shim creation
- CI, CODEOWNERS, registry, source-index, ROADMAP_INDEX, or Git mutation

## Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## Software / Evidence / Claim Verdicts

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

claim_verdict: NO_CLAIM_ALLOWED
```

## No Global Ready Verdict

```yaml
no_global_ready_verdict: true
```

This preflight gives no global ready or not-ready verdict. It preserves component-level status, candidate prototype form risk, read-only data boundaries, blocked behavior, and HumanGate questions separately.

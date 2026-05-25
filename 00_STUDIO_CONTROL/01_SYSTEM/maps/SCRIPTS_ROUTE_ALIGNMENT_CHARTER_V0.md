# Scripts Route Alignment Charter V0

Task ID: SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0

## Status / Non-Authorization

This charter is a docs-only route-alignment candidate for the scripts tooling surface.

It decides intended route posture before any docs reference alignment, CI path alignment, CODEOWNERS alignment, compatibility-shim proposal, file move, file rename, physical deletion, cache cleanup, or script execution.

```yaml
produced_file_type: scripts_route_alignment_charter
intended_surface: canonical_docs
canonical_destination: C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
registration_required: false
project_source_upload_required: false
retention_policy: Docs-only route charter candidate. Not runtime truth.
promotion_gate: HumanGate
charter_status: DOCUMENTED_ONLY
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

Non-authorization:

- This charter does not modify scripts, CI, CODEOWNERS, MASTER_DOCS, docs/control-plane, tests, runtime code, lab outputs, datasets, models, or registries.
- This charter does not create shims.
- This charter does not delete, move, rename, archive, or clean any files or caches.
- This charter does not execute scripts, workflows, tests, benchmarks, gameplay, training, dataset generation, model creation, lab runs, latest.json creation, Git actions, or GitHub automation.
- This charter is not final source truth by existence. It remains `DOCUMENTED_ONLY` until HumanGate registration, loading, enforcement, and evidence decisions.

## Purpose

The purpose is to clarify route policy for:

- `scripts/`
- `scripts/studioV2/`
- `scripts/control_plane/`
- `scripts/studioV2/control_plane/`
- `scripts/operator/`
- `scripts/studioV2/operator/`
- `scripts/uxpilote/`
- blocked runner paths
- docs, CI, CODEOWNERS, and MASTER_DOCS references

The charter records what later patches may propose without performing those patches now.

## Active Route Summary

```yaml
active_route_summary:
  active_root: C:\TACTICAL_CHESS_STUDIO
  official_implementation_candidate: scripts/studioV2/**
  root_scripts_role: root compatibility and hygiene surface only
  root_control_plane_role: compatibility copies only until HumanGate decides otherwise
  root_operator_role: NOT_FOUND when absent
  studioV2_operator_role: UNKNOWN until HumanGate route decision
  scripts_uxpilote_role: UNKNOWN / candidate-only until HumanGate registration decision
  blocked_runners_role: visible as BLOCKED controls only
  no_global_ready_verdict: true
```

Observed path state for this task:

| Path | Observed state | Route posture |
| --- | --- | --- |
| `scripts/` | present | Root compatibility and hygiene surface only. |
| `scripts/studioV2/` | present | Official implementation candidate lane. |
| `scripts/control_plane/` | present | Compatibility copies only until HumanGate decides otherwise. |
| `scripts/studioV2/control_plane/` | present | Implementation candidate lane. |
| `scripts/operator/` | absent | `NOT_FOUND` at root. |
| `scripts/studioV2/operator/` | present | `UNKNOWN` until HumanGate decides authority. |
| `scripts/uxpilote/` | present and untracked | `UNKNOWN` / candidate-only until HumanGate registration decision. |

## Official Candidate Path: scripts/studioV2/**

`scripts/studioV2/**` is the official implementation candidate path for Studio V2 tooling.

Policy:

```yaml
scripts_studioV2_policy:
  path: scripts/studioV2/**
  route_role: official_implementation_candidate
  status: DOCUMENTED_ONLY
  source_authority: candidate_only_until_HumanGate
  execution_authority: BLOCKED
  mutation_authority: BLOCKED
```

Rules:

- New route references should prefer `scripts/studioV2/**` after HumanGate approves reference alignment.
- Existing root references must not be silently rewritten by this charter.
- The candidate lane does not become source authority by being present.
- Implementation candidate status does not authorize script execution, CI mutation, CODEOWNERS mutation, Git actions, or runtime claims.

## Compatibility Paths

`scripts/` remains a root compatibility and hygiene surface only.

`scripts/control_plane/*` is a compatibility-copy surface when the files are byte-identical to corresponding `scripts/studioV2/control_plane/*` files. Byte identity is evidence for compatibility posture only; it is not source authority.

Observed byte-identical pairs during this task:

| Root copy | Studio V2 copy | Hash posture |
| --- | --- | --- |
| `scripts/control_plane/smoke_control_plane_integration.py` | `scripts/studioV2/control_plane/smoke_control_plane_integration.py` | matching SHA256 |
| `scripts/control_plane/smoke_passive_control_plane_gates.py` | `scripts/studioV2/control_plane/smoke_passive_control_plane_gates.py` | matching SHA256 |
| `scripts/control_plane/smoke_prompt_report_hygiene.py` | `scripts/studioV2/control_plane/smoke_prompt_report_hygiene.py` | matching SHA256 |
| `scripts/control_plane/validate_prompt_report_hygiene.py` | `scripts/studioV2/control_plane/validate_prompt_report_hygiene.py` | matching SHA256 |

Compatibility rule:

```yaml
compatibility_paths:
  scripts:
    route_role: root_compatibility_and_hygiene_surface_only
    status: PASSIVE
  scripts_control_plane:
    route_role: compatibility_copies_if_byte_identical
    status: DOCUMENTED_ONLY
    source_authority: false
    humangate_required_for_cleanup_or_promotion: true
```

If a compatibility copy drifts from the Studio V2 candidate lane, UxPilote and future charters must report `UNKNOWN` until HumanGate decides whether to keep, align, replace, archive, or delete it.

## Legacy / Stale References

Older docs, CI, CODEOWNERS, and MASTER_DOCS may reference root `scripts/` paths.

Observed reference classes:

- `.github/CODEOWNERS` contains root `scripts/` ownership patterns.
- `.github/workflows/*.yml` contains root `scripts/` command references, including `scripts/operator/*` and `scripts/control_plane/*`.
- `MASTER_DOCS/*.md` contains root `scripts/` references, including benchmark and automation material.
- `docs/control-plane/*.md` contains root `scripts/control_plane/*`, root operator, and other root scripts references.

Policy:

```yaml
legacy_stale_references:
  status: UNKNOWN
  action_now: document_only
  silent_rewrite: BLOCKED
  CI_mutation_now: BLOCKED
  CODEOWNERS_mutation_now: BLOCKED
  MASTER_DOCS_mutation_now: BLOCKED
  docs_control_plane_mutation_now: BLOCKED
  future_alignment_requires: HumanGate
```

Legacy references must be displayed as route drift or stale-reference candidates until a later bounded patch aligns them.

## Missing Referenced Paths

`scripts/operator/` is absent at root in the current readback.

Policy:

```yaml
missing_referenced_paths:
  scripts_operator:
    path: scripts/operator/
    observed_state: NOT_FOUND
    route_role: missing_root_reference
    source_authority: false
    shim_creation: BLOCKED
    silent_substitution_to_studioV2: BLOCKED
```

CI or docs references to absent root paths must not be resolved by creating files, creating shims, moving files, or silently substituting `scripts/studioV2/operator/*` without HumanGate.

## Operator Path Drift

Operator path posture:

| Path | Status | Route posture |
| --- | --- | --- |
| `scripts/operator/` | NOT_FOUND | Root operator path is absent. |
| `scripts/studioV2/operator/` | UNKNOWN | Candidate implementation lane until HumanGate decides authority. |

Policy:

```yaml
operator_path_drift:
  root_path: scripts/operator/
  root_status: NOT_FOUND
  studioV2_path: scripts/studioV2/operator/
  studioV2_status: UNKNOWN
  preferred_candidate_lane: scripts/studioV2/operator/
  source_authority: UNKNOWN
  humangate_required: true
```

Future patches may propose CI/docs/CODEOWNERS alignment to `scripts/studioV2/operator/*`, but may not mutate those surfaces without explicit HumanGate authorization.

## Control Plane Path Drift

Control-plane path posture:

| Path | Status | Route posture |
| --- | --- | --- |
| `scripts/control_plane/` | DOCUMENTED_ONLY | Compatibility-copy surface when byte-identical. |
| `scripts/studioV2/control_plane/` | UNKNOWN | Implementation candidate lane. |

Policy:

```yaml
control_plane_path_drift:
  root_path: scripts/control_plane/
  root_status: DOCUMENTED_ONLY
  studioV2_path: scripts/studioV2/control_plane/
  studioV2_status: UNKNOWN
  preferred_candidate_lane: scripts/studioV2/control_plane/
  compatibility_copy_rule: byte_identical_only
  source_authority: UNKNOWN
  humangate_required: true
```

Root compatibility copies are not source authority alone. Matching hashes support a compatibility-copy display label only.

## UxPilote Prototype Path Posture

`scripts/uxpilote/` exists as local prototype material and remains untracked in the current worktree.

Policy:

```yaml
uxpilote_prototype_path_posture:
  path: scripts/uxpilote/
  status: UNKNOWN
  route_role: candidate_only
  registered: UNKNOWN
  loaded: UNKNOWN
  enforced: UNKNOWN
  evidenced: UNKNOWN
  source_authority: false
  implementation_authority: false
  humangate_required_for_registration: true
```

Rules:

- `scripts/uxpilote/*` must display as `UNKNOWN` / candidate-only until HumanGate decides whether it should be registered, loaded, enforced, evidenced, archived, quarantined, or discarded.
- The presence of `scripts/uxpilote/README.md` and `scripts/uxpilote/uxpilote_readonly.py` does not promote the prototype.
- The UxPilote Scripts Control View may show this path but must not execute it.

## Blocked Runner Path Policy

Blocked runner classes must be visible as `BLOCKED` controls only, not executable controls.

```yaml
blocked_runner_classes:
  benchmark: BLOCKED
  gameplay_execution: BLOCKED
  PR_GitHub_automation: BLOCKED
  auto_merge: BLOCKED
  dataset_generation_reset: BLOCKED
  model_checkpoint_creation_promotion: BLOCKED
  lab_runs_creation: BLOCKED
  latest_json_creation: BLOCKED
  commit_push_branch_PR: BLOCKED
  unknown_script_execution: BLOCKED
```

Policy:

- UxPilote may display blocked runner classes as disabled controls with explanation text.
- UxPilote must not expose blocked runner classes as clickable execution commands.
- Future docs may document blocked posture, but must not run benchmark, gameplay, training, dataset, model, lab, latest.json, Git, GitHub, PR, or auto-merge actions without HumanGate.

## UxPilote Scripts Control Display Rules

UxPilote Scripts Control View should display these route labels:

| Display path | Display status | Display label |
| --- | --- | --- |
| `scripts/studioV2/**` | DOCUMENTED_ONLY | official implementation candidate |
| `scripts/` | PASSIVE | root compatibility and hygiene surface |
| `scripts/control_plane/*` | DOCUMENTED_ONLY | compatibility copies if byte-identical |
| `scripts/studioV2/control_plane/*` | UNKNOWN | implementation candidate lane |
| `scripts/operator/` | NOT_FOUND | missing root operator path |
| `scripts/studioV2/operator/*` | UNKNOWN | candidate operator lane |
| `scripts/uxpilote/*` | UNKNOWN | candidate-only prototype material |
| blocked runner paths | BLOCKED | display-only blocked controls |

Inspector fields:

```yaml
uxpilote_scripts_control_display:
  required_fields:
    - path
    - route_role
    - surface
    - status
    - source_state
    - evidence
    - risk
    - allowed_actions
    - blocked_actions
    - next_humangate_question
  allowed_actions:
    - inspect
    - readback
    - prepare charter
  blocked_actions:
    - execute unknown scripts
    - benchmark
    - gameplay execution
    - PR/GitHub automation
    - auto-merge
    - dataset generation/reset
    - model/checkpoint creation or promotion
    - lab/runs creation
    - latest.json creation
    - commit/push/branch/PR
```

UxPilote must show path drift explicitly and must not silently collapse root paths into `scripts/studioV2/**`.

## Future Patch Queue

Allowed future patch classes:

```yaml
allowed_future_patch_classes:
  docs_only_reference_alignment:
    status: DOCUMENTED_ONLY
    requirement: HumanGate scoped task charter
  CI_path_alignment_proposal:
    status: DOCUMENTED_ONLY
    requirement: HumanGate before workflow mutation
  CODEOWNERS_alignment_proposal:
    status: DOCUMENTED_ONLY
    requirement: HumanGate before CODEOWNERS mutation
  compatibility_shim_proposal_after_HumanGate:
    status: DOCUMENTED_ONLY
    requirement: HumanGate before shim creation
  cleanup_proposal_after_HumanGate:
    status: DOCUMENTED_ONLY
    requirement: HumanGate before deletion, move, rename, or cache cleanup
  UxPilote_display_refinement:
    status: DOCUMENTED_ONLY
    requirement: HumanGate before implementation or prototype execution
```

Sequence recommendation:

1. Docs-only reference alignment proposal.
2. CI path alignment proposal.
3. CODEOWNERS alignment proposal.
4. Compatibility-shim proposal only if HumanGate rejects direct reference alignment.
5. Cleanup proposal only after source authority and compatibility posture are resolved.
6. UxPilote display refinement after path policy is stable enough for a read-only view.

## HumanGate Decisions Required

Required HumanGate decisions:

```yaml
humangate_decisions_required:
  - id: decide_scripts_studioV2_authority
    question: Should scripts/studioV2/** become the registered scripts implementation lane?
    default_status: UNKNOWN

  - id: decide_control_plane_root_compatibility
    question: Should scripts/control_plane/* remain compatibility copies, become shims, be deleted, or be preserved?
    default_status: UNKNOWN

  - id: decide_operator_route
    question: Should references to scripts/operator/* align to scripts/studioV2/operator/*, receive shims, or remain blocked?
    default_status: UNKNOWN

  - id: decide_scripts_uxpilote_registration
    question: Should scripts/uxpilote/* be registered, loaded, enforced, evidenced, archived, quarantined, or discarded?
    default_status: UNKNOWN

  - id: decide_CI_CODEOWNERS_alignment
    question: Should CI and CODEOWNERS references be aligned to scripts/studioV2/**?
    default_status: UNKNOWN

  - id: decide_blocked_runner_visibility
    question: Which blocked runner classes should remain visible as disabled controls in UxPilote?
    default_status: UNKNOWN
```

Until these decisions are made, route authority remains `UNKNOWN` or `DOCUMENTED_ONLY` as stated above.

## Explicitly Blocked Actions

Blocked future patch classes unless HumanGate explicitly authorizes:

```yaml
explicitly_blocked_actions:
  physical_deletion: BLOCKED
  move_rename: BLOCKED
  shim_creation: BLOCKED
  CI_mutation: BLOCKED
  CODEOWNERS_mutation: BLOCKED
  script_execution: BLOCKED
  benchmark_gameplay_training_dataset_model_lab_latest_json: BLOCKED
  Git_actions: BLOCKED
```

Additional blocked actions:

- Do not modify scripts.
- Do not modify `.github/workflows`.
- Do not modify `.github/CODEOWNERS`.
- Do not modify MASTER_DOCS.
- Do not modify docs/control-plane.
- Do not create shims.
- Do not delete files.
- Do not move or rename files.
- Do not clean caches, including `__pycache__`.
- Do not run prototypes, Godot, frontend, cargo, tests, benchmarks, training, datasets, models, lab/runs, or latest.json.
- Do not stage, commit, push, branch, or PR.

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

This charter gives no global ready or not-ready verdict. It records a route policy candidate and preserves component-level status, HumanGate decisions, and blocked actions separately.
